import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  fetchMemberGroups,
  createEngagementGroup,
  type CreateGroupInput,
} from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): run on the Edge runtime (V8 isolate, ~0ms cold start), pinned to
// `dub1` so co-location with the Ireland DB (ADR-U035) is preserved. Keep this route's
// imports Edge-safe (no Node-only APIs) — @supabase/ssr + next/headers cookies + fetch.
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * GET /api/groups — the API-first read path for the member's group list
 * (ADR-U009: DB → API → frontend; the frontend never touches a table directly).
 * V2: RLS scopes the read to the viewer. V4: telemetry on success AND failure.
 */
export async function GET() {
  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip on the hot path.
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('groups.load_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const groups = await fetchMemberGroups(supabase);
    emitTelemetry('groups.loaded', { actor: userId, count: groups.length });
    return NextResponse.json({ groups });
  } catch (err) {
    emitTelemetry('groups.load_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 });
  }
}

/**
 * FEAT-H013 — POST /api/groups (GRP-1, STORY-1).
 *
 * Creates an engagement group via the FEAT-PC010 `create_engagement_group()`
 * contract — the substrate self-gates (FIM-only, active-account-only) and
 * bootstraps atomically (group + roles + creator membership + Steward
 * binding). SQLSTATE → HTTP: 42501 → 403; 22023 → 400; P0002 → 404; else 500.
 * Telemetry carries only the actor + new group id — group content never
 * enters events (V2/V4 discipline).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('groups.create_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateGroupInput;

  try {
    const id = await createEngagementGroup(supabase, body);
    emitTelemetry('groups.create', { actor: user.id, group: id });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('groups.create_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Group creation is for active members' }, { status: 403 });
    }
    if (code === '22023') {
      emitTelemetry('groups.create_invalid', { actor: user.id, code });
      return NextResponse.json({ error: 'A group needs a name' }, { status: 400 });
    }
    if (code === 'P0002') {
      emitTelemetry('groups.create_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Unknown group template' }, { status: 404 });
    }
    emitTelemetry('groups.create_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to create the group' }, { status: 500 });
  }
}
