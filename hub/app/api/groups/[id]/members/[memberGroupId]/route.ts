import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeGroupMember } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H016 — DELETE /api/groups/[id]/members/[memberGroupId]
 * (MEM-5 remove, STORY-2).
 *
 * The FEAT-PC013 contract carries the composed cascade (enrolment freeze +
 * role cleanup + membership delete) and self-gates (remove_members key,
 * self-target and last-active-Steward refusals — a paused Steward is not
 * cover). 42501 → 403; P0001 → 409 with the refusal's message passed through;
 * P0002 → 404 (ghost/non-member/invited — invitation cancels live under
 * /invitations/, never here). Telemetry id-only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberGroupId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('membership.remove_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, memberGroupId } = await params;

  try {
    await removeGroupMember(supabase, id, memberGroupId);
    emitTelemetry('membership.remove', { actor: user.id, group: id, member: memberGroupId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('membership.remove_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('membership.remove_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This member cannot be removed' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('membership.remove_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('membership.remove_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to remove the member' }, { status: 500 });
  }
}
