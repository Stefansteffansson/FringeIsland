import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchJourneyDetail } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H019 — GET /api/journeys/[id] (JRN-2, STORY-2).
 *
 * The FEAT-PD002 `get_journey_detail()` contract decides everything
 * (visibility, steps overview, the viewer block incl. `enrollable_groups` —
 * the JRN-4 picker's only source); this route is presentation only.
 * SQLSTATE → HTTP: P0002 → 404 (unpublished and absent indistinguishable);
 * 42501 → 403; else 500 content-free. Telemetry ids only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('journey.detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const journey = await fetchJourneyDetail(supabase, id);
    emitTelemetry('journey.detail_loaded', { actor: userId, journey: id });
    return NextResponse.json({ journey });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('journey.detail_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('journey.detail_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('journey.detail_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load the journey' }, { status: 500 });
  }
}
