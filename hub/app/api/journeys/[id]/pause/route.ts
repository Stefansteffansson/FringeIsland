import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pauseJourneyEnrollment } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

/**
 * FEAT-H019 STORY-8 — POST /api/journeys/[id]/pause (TASK-JRN-PAUSE-01).
 *
 * Body `{ enrollment_id }` (shape-checked here as presentation only — the
 * FEAT-PD002 STORY-8 `pause_journey_enrollment` contract owns every rule:
 * own row only, the typed state refusals, P0002 no-leak). SQLSTATE → HTTP:
 * 42501 → 403; P0002 → 404; P0001 → 409 with the message through (the state
 * named); else 500 content-free. Mutation → per-request getUser. The success
 * adopts the durable leg (Q2 — a mutation); telemetry ids only.
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
    emitTelemetry('journey.pause_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { enrollment_id?: string };
  if (typeof body.enrollment_id !== 'string' || !body.enrollment_id) {
    emitTelemetry('journey.pause_invalid', { actor: user.id, journey: id });
    return NextResponse.json({ error: 'enrollment_id required' }, { status: 400 });
  }

  try {
    const result = await pauseJourneyEnrollment(supabase, body.enrollment_id);
    await emitDurableTelemetry(supabase, 'journey.paused', {
      actor: user.id,
      journey: id,
      enrollment: body.enrollment_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('journey.pause_refused', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('journey.pause_missing', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('journey.pause_conflict', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: message ?? 'The pause was refused' }, { status: 409 });
    }
    emitTelemetry('journey.pause_failed', { actor: user.id, journey: id, code });
    return NextResponse.json({ error: 'Failed to pause' }, { status: 500 });
  }
}
