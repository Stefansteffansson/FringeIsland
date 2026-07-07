import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeJourneyStep } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Mutation-only route — Node runtime (route-policy: mutations ride getUser and
// stay off Edge).

/**
 * FEAT-H020 — POST /api/journeys/enrollments/[enrollmentId]/steps/[stepId]/complete
 * (JRN-8, STORY-3). Stamps passage (idempotent platform-side). The FEAT-PD003
 * `complete_journey_step()` contract self-gates (traveller standing, active
 * enrolment, Q7 via-group `complete_journey_activities` — an Observer watches,
 * never completes — and the required-predecessor gate). SQLSTATE → HTTP:
 * 42501 → 403 (not permitted to complete in this group's journey); P0002 → 404;
 * P0001 → 409 with the reason through (the gate reason the Surface renders as
 * the honest locked state); else 500 content-free. Mutation → per-request
 * getUser. Telemetry ids only.
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
    emitTelemetry('player.complete_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { enrollmentId, stepId } = await params;

  try {
    const instance = await completeJourneyStep(supabase, enrollmentId, stepId);
    emitTelemetry('player.step_completed', {
      actor: user.id,
      enrollment: enrollmentId,
      step: stepId,
    });
    return NextResponse.json(instance);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('player.complete_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('player.complete_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('player.complete_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The step could not be completed' },
        { status: 409 },
      );
    }
    emitTelemetry('player.complete_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to complete the step' }, { status: 500 });
  }
}
