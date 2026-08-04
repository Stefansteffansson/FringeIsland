import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondToPersonalInvitationRpc } from '@/lib/notifications/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H042 — POST /api/notifications/[id]/invitation-response (N-E, STORY-1).
 *
 * The FEAT-PD017 `respond_to_personal_invitation` contract answers a personal
 * group invitation from the bell: accept → the membership activates through
 * the untouched Core door; decline → the membership is deleted and the
 * converged record survives (ADR-U051 Option A). A held group's PC023
 * refusal propagates verbatim: 42501 → 403; P0001 (suspended) → 409 with the
 * message through; P0002 → 404. Telemetry id-only (the sibling routes' law).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('invitations.respond_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { accept?: unknown };

  if (typeof body.accept !== 'boolean') {
    emitTelemetry('invitations.respond_invalid', { actor: user.id, notification: id });
    return NextResponse.json(
      { error: 'Answer the invitation with accept or decline' },
      { status: 400 },
    );
  }

  try {
    const result = await respondToPersonalInvitationRpc(supabase, id, body.accept);
    emitTelemetry('invitations.respond', {
      actor: user.id,
      notification: id,
      accepted: body.accept,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('invitations.respond_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('invitations.respond_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This invitation can no longer be answered' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('invitations.respond_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('invitations.respond_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to answer the invitation' }, { status: 500 });
  }
}
