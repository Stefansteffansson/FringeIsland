import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchJourneyCatalog } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H019 — GET /api/journeys (JRN-1, STORY-1).
 *
 * The FEAT-PD002 `get_journey_catalog()` contract decides everything
 * (published visibility mirror, no traveller counts, stable order); this
 * route is presentation only. ADR-U037: read-path identity via local JWT
 * verification. Telemetry carries the actor id only — never journey content.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('journey.catalog_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const journeys = await fetchJourneyCatalog(supabase);
    emitTelemetry('journey.catalog_loaded', { actor: userId, count: journeys.length });
    return NextResponse.json({ journeys });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('journey.catalog_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('journey.catalog_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load the journeys' }, { status: 500 });
  }
}
