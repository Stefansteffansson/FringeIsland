import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveStepResponse } from '@/lib/journeys/queries';
import type { StepResponsePayload } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H024 — POST /api/journeys/enrollments/[enrollmentId]/steps/[stepId]/response
 * (ADR-U046; JRN-9's lived record deepened). The background capture write —
 * optional-always, orthogonal to completion; `response: null` is the explicit
 * retraction. The FEAT-PD007 `save_step_response()` contract self-gates
 * (traveller standing, the enter/complete guard family, the size ceiling, the
 * malformed-payload refusal) — this BFF route only shapes the call (ADR-U038).
 * SQLSTATE → HTTP: 42501 → 403; P0002 → 404; P0001 → 409 with the refusal's
 * message through (frozen/withdrawn/paused); 22001/22023 (size / malformed) →
 * 422; else 500 content-free. Mutation → per-request getUser.
 * Telemetry is CONTENT-FREE by contract (FEAT-PD007 Vertical impact): ids and
 * outcomes only — response content never appears in logs or telemetry.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string; stepId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('player.response_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { enrollmentId, stepId } = await params;

  let response: StepResponsePayload | null = null;
  try {
    const body = (await request.json()) as { response?: StepResponsePayload | null };
    response = body.response ?? null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const confirmed = await saveStepResponse(supabase, enrollmentId, stepId, response);
    emitTelemetry(confirmed.response === null ? 'player.response_cleared' : 'player.response_saved', {
      actor: user.id,
      enrollment: enrollmentId,
      step: stepId,
    });
    return NextResponse.json(confirmed);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('player.response_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('player.response_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('player.response_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The response could not be saved' },
        { status: 409 },
      );
    }
    if (code === '22001' || code === '22023') {
      emitTelemetry('player.response_invalid', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The response could not be saved' },
        { status: 422 },
      );
    }
    emitTelemetry('player.response_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to save the response' }, { status: 500 });
  }
}
