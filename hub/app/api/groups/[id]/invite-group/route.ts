import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { inviteGroup } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H018 — POST /api/groups/[id]/invite-group (STORY-2, MEM-10 admission).
 *
 * The FEAT-PC015 `invite_group()` contract decides everything (invite_members
 * gate, public-active-engagement targets with P0002 no-enumeration, the
 * self/duplicate/direct-cycle 22023 refusals — Open Q2). This route validates
 * body shape and maps SQLSTATE → HTTP; the 22023/P0001 refusal copy passes
 * through VERBATIM — it is the honest reason the Surface renders in place.
 * Group names never enter telemetry (id-only).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('acting.invite_group_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { invited_group_id?: string }
    | null;
  if (!body?.invited_group_id) {
    emitTelemetry('acting.invite_group_bad_body', { actor: userId, group: id });
    return NextResponse.json({ error: 'invited_group_id is required' }, { status: 400 });
  }

  try {
    const result = await inviteGroup(supabase, id, body.invited_group_id);
    emitTelemetry('acting.invite_group', {
      actor: userId,
      group: id,
      invited: body.invited_group_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === '22023' || e.code === 'P0001') {
      emitTelemetry('acting.invite_group_refused', { actor: userId, group: id, code: e.code });
      return NextResponse.json({ error: e.message ?? 'Invitation refused' }, { status: 409 });
    }
    if (e.code === '42501') {
      emitTelemetry('acting.invite_group_forbidden', { actor: userId, group: id, code: e.code });
      return NextResponse.json({ error: 'Inviting groups is for inviters' }, { status: 403 });
    }
    if (e.code === 'P0002') {
      emitTelemetry('acting.invite_group_missing', { actor: userId, group: id, code: e.code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    emitTelemetry('acting.invite_group_failed', { actor: userId, group: id, code: e.code });
    return NextResponse.json({ error: 'Failed to invite the group' }, { status: 500 });
  }
}
