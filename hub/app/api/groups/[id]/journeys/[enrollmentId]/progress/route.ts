import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchGroupJourneyProgress } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): the group progress panel is an expand-on-demand hot read —
// Edge runtime, pinned to `dub1` (ADR-U035). Imports must stay Edge-safe.
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H022 — GET /api/groups/[id]/journeys/[enrollmentId]/progress (JRN-16/17).
 *
 * The FEAT-PD005 `get_group_journey_progress()` contract decides everything
 * (active-membership standing, view_group_progress for the window,
 * view_others_progress for per-member marks, the consent-shaped derivation that
 * excludes non-sharers from every aggregate); this route is presentation only.
 * One round trip fills the panel. SQLSTATE → HTTP: P0002 → 404 (non-member and
 * absent indistinguishable); 42501 → 403 (permission refused); else 500
 * content-free. Read → getVerifiedUserId (ADR-U037). Telemetry ids only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('group.progress_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, enrollmentId } = await params;

  try {
    const progress = await fetchGroupJourneyProgress(supabase, enrollmentId);
    emitTelemetry('group.progress_loaded', { actor: userId, group: id, enrollment: enrollmentId });
    return NextResponse.json({ progress });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('group.progress_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('group.progress_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('group.progress_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
