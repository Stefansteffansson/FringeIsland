import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enterJourneyStep } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H020 — POST /api/journeys/enrollments/[enrollmentId]/steps/[stepId]/enter
 * (JRN-9, STORY-2/4). The auto-save write — records engagement (the open
 * instance IS the engagement, never duplicated). The FEAT-PD003
 * `enter_journey_step()` contract self-gates (traveller standing, active
 * enrolment, step-in-journey). SQLSTATE → HTTP: 42501 → 403; P0002 → 404;
 * P0001 → 409 with the refusal's message through (e.g. a frozen enrolment);
 * else 500 content-free. Mutation → per-request getUser. Telemetry ids only.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ enrollmentId: string; stepId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('player.enter_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { enrollmentId, stepId } = await params;

  try {
    const instance = await enterJourneyStep(supabase, enrollmentId, stepId);
    emitTelemetry('player.step_entered', { actor: user.id, enrollment: enrollmentId, step: stepId });
    return NextResponse.json(instance);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('player.enter_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('player.enter_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('player.enter_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The step could not be entered' },
        { status: 409 },
      );
    }
    emitTelemetry('player.enter_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to enter the step' }, { status: 500 });
  }
}
