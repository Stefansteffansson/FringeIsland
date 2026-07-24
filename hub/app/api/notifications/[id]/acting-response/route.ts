import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondToActingInvitationRpc } from '@/lib/notifications/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H031 (N-B) — POST /api/notifications/[id]/acting-response.
 *
 * The typed-action dispatch for an acting-invitation notification. Thin
 * authenticated pass-through to the DS-5 `respond_to_acting_invitation`
 * contract (FEAT-PD014), which calls the untouched Core handler and converges
 * the fan-out (first-answer-wins). Mirrors the nomination-response route:
 * ownership refusals 42501 → 403; a not-active context P0001 → 409; a not-yours
 * / not-found notification P0002 → 404. Mutation → getUser() (ADR-U037).
 * Telemetry id-only.
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
    emitTelemetry('notifications.acting_respond_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { accept?: unknown };

  if (typeof body.accept !== 'boolean') {
    emitTelemetry('notifications.acting_respond_invalid', { actor: user.id, notification: id });
    return NextResponse.json(
      { error: 'Answer the invitation with accept or decline' },
      { status: 400 },
    );
  }

  try {
    const result = await respondToActingInvitationRpc(supabase, id, body.accept);
    emitTelemetry('notifications.acting_respond', {
      actor: user.id,
      notification: id,
      accepted: body.accept,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('notifications.acting_respond_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('notifications.acting_respond_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This invitation can no longer be answered' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('notifications.acting_respond_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('notifications.acting_respond_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to answer the invitation' }, { status: 500 });
  }
}
