import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelEmailInvitation } from '@/lib/groups/invitations';
import { availabilityRefusal } from '@/lib/groups/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H015 — DELETE /api/groups/[id]/invitations/email/[invitationId]
 * (STORY-3 cancel, email-invitation shape). The FEAT-PC012 contract's every
 * refusal path is P0002 (an invitation id never oracles visibility or
 * permission state) → 404; 42501 covers the FIM/suspended caller gates.
 * Telemetry id-only — the invitation id, never the address.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('invitations.cancel_email_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, invitationId } = await params;

  try {
    await cancelEmailInvitation(supabase, invitationId);
    emitTelemetry('invitations.cancel_email', {
      actor: user.id,
      group: id,
      invitation: invitationId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    // FEAT-H038 STORY-5: a held group's frozen cancel door speaks verbatim.
    const availability = availabilityRefusal(err);
    if (availability) {
      emitTelemetry('invitations.cancel_email_refused', { actor: user.id, code });
      return availability;
    }
    if (code === 'P0002') {
      emitTelemetry('invitations.cancel_email_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('invitations.cancel_email_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('invitations.cancel_email_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
