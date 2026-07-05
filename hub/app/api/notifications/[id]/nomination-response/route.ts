import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondToNomination } from '@/lib/groups/leadership';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H017 — POST /api/notifications/[id]/nomination-response (MEM-7,
 * STORY-2).
 *
 * The FEAT-PC014 `respond_to_stewardship_nomination` contract resolves the
 * offer: accept → the nominee becomes Steward and the nominator departs;
 * decline → the contract routes the offer on (next nominee or DeusEx — its
 * decision, relayed never predicted). Expired/answered refuse as P0001 → 409
 * with the message through; ownership refusals 42501 → 403; P0002 → 404.
 * Telemetry id-only (STORY-6).
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
    emitTelemetry('leadership.respond_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { accept?: unknown };

  if (typeof body.accept !== 'boolean') {
    emitTelemetry('leadership.respond_invalid', { actor: user.id, notification: id });
    return NextResponse.json(
      { error: 'Answer the nomination with accept or decline' },
      { status: 400 },
    );
  }

  try {
    const result = await respondToNomination(supabase, id, body.accept);
    emitTelemetry('leadership.respond', {
      actor: user.id,
      notification: id,
      accepted: body.accept,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('leadership.respond_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('leadership.respond_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This nomination can no longer be answered' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('leadership.respond_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('leadership.respond_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to answer the nomination' }, { status: 500 });
  }
}
