import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelMemberInvitation } from '@/lib/groups/invitations';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H015 — DELETE /api/groups/[id]/invitations/members/[memberGroupId]
 * (STORY-3 cancel, membership-invitation shape — never conflated with the
 * email shape). The FEAT-PC012 contract self-gates (invite_members); answered
 * or absent invitations are P0002 → 404. Telemetry id-only.
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
    emitTelemetry('invitations.cancel_member_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, memberGroupId } = await params;

  try {
    await cancelMemberInvitation(supabase, id, memberGroupId);
    emitTelemetry('invitations.cancel_member', {
      actor: user.id,
      group: id,
      member: memberGroupId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === 'P0002') {
      emitTelemetry('invitations.cancel_member_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('invitations.cancel_member_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('invitations.cancel_member_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
