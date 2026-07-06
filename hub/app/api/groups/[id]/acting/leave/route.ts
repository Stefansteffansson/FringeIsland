import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { leaveGroupAsGroup } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H018 — POST /api/groups/[id]/acting/leave (STORY-3, the wielded exit).
 * [id] is the ACTING group; the body names the context group to withdraw
 * from. The FEAT-PC015 contract gates on act_as_group (wielding precedes
 * existence) and refuses last-active-Steward / last-member honestly — that
 * P0001 copy passes through VERBATIM for the Surface to render in place.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('acting.leave_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { context_group_id?: string }
    | null;
  if (!body?.context_group_id) {
    emitTelemetry('acting.leave_bad_body', { actor: userId, acting: id });
    return NextResponse.json({ error: 'context_group_id is required' }, { status: 400 });
  }

  try {
    const result = await leaveGroupAsGroup(supabase, body.context_group_id, id);
    emitTelemetry('acting.leave', {
      actor: userId,
      acting: id,
      context: body.context_group_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001') {
      emitTelemetry('acting.leave_refused', { actor: userId, acting: id, code: e.code });
      return NextResponse.json({ error: e.message ?? 'Withdrawal refused' }, { status: 409 });
    }
    if (e.code === '42501') {
      emitTelemetry('acting.leave_forbidden', { actor: userId, acting: id, code: e.code });
      return NextResponse.json(
        { error: e.message ?? 'You do not have permission to act as this group' },
        { status: 403 },
      );
    }
    if (e.code === 'P0002') {
      emitTelemetry('acting.leave_missing', { actor: userId, acting: id, code: e.code });
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    emitTelemetry('acting.leave_failed', { actor: userId, acting: id, code: e.code });
    return NextResponse.json({ error: 'Failed to withdraw' }, { status: 500 });
  }
}
