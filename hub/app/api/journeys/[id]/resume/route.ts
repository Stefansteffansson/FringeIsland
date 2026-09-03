import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resumeJourneyEnrollment } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

/**
 * FEAT-H019 STORY-8 — POST /api/journeys/[id]/resume (TASK-JRN-PAUSE-01).
 *
 * The pause route's mirror over `resume_journey_enrollment` (paused → active
 * at the held position; the contract owns every rule). Same SQLSTATE → HTTP
 * map, same identity discipline (getUser), same durable success event.
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
    emitTelemetry('journey.resume_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { enrollment_id?: string };
  if (typeof body.enrollment_id !== 'string' || !body.enrollment_id) {
    emitTelemetry('journey.resume_invalid', { actor: user.id, journey: id });
    return NextResponse.json({ error: 'enrollment_id required' }, { status: 400 });
  }

  try {
    const result = await resumeJourneyEnrollment(supabase, body.enrollment_id);
    await emitDurableTelemetry(supabase, 'journey.resumed', {
      actor: user.id,
      journey: id,
      enrollment: body.enrollment_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('journey.resume_refused', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('journey.resume_missing', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('journey.resume_conflict', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: message ?? 'The resume was refused' }, { status: 409 });
    }
    emitTelemetry('journey.resume_failed', { actor: user.id, journey: id, code });
    return NextResponse.json({ error: 'Failed to resume' }, { status: 500 });
  }
}
