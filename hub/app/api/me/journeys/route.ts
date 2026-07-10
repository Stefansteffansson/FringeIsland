import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyEnrollments } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H019 — GET /api/me/journeys (STORY-1's "my journeys" read).
 *
 * The FEAT-PD002 `get_my_enrollments()` contract self-scopes to the caller
 * (individual + via-group, kind-marked); this route is presentation only.
 * Telemetry carries the actor id and a count — never journey titles.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('journey.my_enrollments_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const enrollments = await fetchMyEnrollments(supabase);
    emitTelemetry('journey.my_enrollments_loaded', { actor: userId, count: enrollments.length });
    return NextResponse.json({ enrollments });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('journey.my_enrollments_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('journey.my_enrollments_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load your journeys' }, { status: 500 });
  }
}
