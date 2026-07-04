import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchGroupDetail, updateGroupSettings, type UpdateGroupSettingsInput } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): the detail read is a member-facing hot path — Edge runtime,
// pinned to `dub1` for DB co-location (ADR-U035). Everything imported here must
// stay Edge-safe. PATCH rides the same file (single RPC, Edge-safe).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H013 — GET /api/groups/[id] (GRP-4 detail · GRP-5, STORY-2).
 *
 * The FEAT-PC010 `get_group_detail()` contract decides everything (visibility,
 * member-list inclusion, capability flags); this route is presentation only.
 * ADR-U037: read-path identity via local JWT verification. SQLSTATE → HTTP:
 * P0002 → 404 (private and absent indistinguishable); 42501 → 403; else 500.
 * Telemetry carries actor + group id only — never group content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('groups.detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const group = await fetchGroupDetail(supabase, id);
    emitTelemetry('groups.detail', { actor: userId, group: id });
    return NextResponse.json({ group });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('groups.detail_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('groups.detail_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Groups are for members' }, { status: 403 });
    }
    emitTelemetry('groups.detail_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load the group' }, { status: 500 });
  }
}

/**
 * FEAT-H013 — PATCH /api/groups/[id] (GRP-2 · GRP-3, STORY-3/4).
 *
 * Partial settings update via the FEAT-PC010 `update_group_settings()`
 * contract — per-field permission keys live substrate-side; the route maps
 * refusals honestly (42501 → 403, P0002 → 404, 22023 → 400, else 500) and
 * returns the contract's fresh detail. Mutation → per-request getUser.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('groups.update_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateGroupSettingsInput;

  try {
    const group = await updateGroupSettings(supabase, id, body);
    emitTelemetry('groups.update', { actor: user.id, group: id });
    return NextResponse.json({ group });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('groups.update_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('groups.update_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === '22023') {
      emitTelemetry('groups.update_invalid', { actor: user.id, code });
      return NextResponse.json({ error: 'A group needs a name' }, { status: 400 });
    }
    emitTelemetry('groups.update_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to update the group' }, { status: 500 });
  }
}
