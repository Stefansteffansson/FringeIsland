import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchPendingNominations } from '@/lib/groups/leadership';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): rides the /groups page load — Edge runtime, pinned to
// `dub1` (ADR-U035).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H017 — GET /api/me/nominations (MEM-7, STORY-2 read).
 *
 * The scoped pending-nomination read: the caller's own unanswered, unexpired
 * `stewardship_nomination` rows — notifications RLS scopes the rows; the
 * fetcher scopes the type. This is the A-NTF re-home seam (D8), deliberately
 * NOT an inbox. ADR-U037 read identity; telemetry id-only.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('nominations.mine_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const nominations = await fetchPendingNominations(supabase);
    emitTelemetry('nominations.mine', { actor: userId, count: nominations.length });
    return NextResponse.json(nominations);
  } catch (err) {
    const code = (err as { code?: string }).code;
    emitTelemetry('nominations.mine_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load nominations' }, { status: 500 });
  }
}
