import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchPlayerState } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H020 — GET /api/journeys/enrollments/[enrollmentId]/player (JRN-6/10, STORY-1/5).
 *
 * The FEAT-PD003 `get_player_state()` contract decides everything (traveller
 * standing, the ordered steps WITH content payloads, the caller's own instances,
 * the Q6 resume pointer, the enrolment status); this route is presentation only.
 * One round trip boots the player. SQLSTATE → HTTP: 42501 → 403 (no session
 * actor); P0002 → 404 (non-traveller and absent indistinguishable — the withdraw
 * mirror); else 500 content-free. Telemetry ids only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('player.state_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { enrollmentId } = await params;

  try {
    const player = await fetchPlayerState(supabase, enrollmentId);
    emitTelemetry('player.state_loaded', { actor: userId, enrollment: enrollmentId });
    return NextResponse.json({ player });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('player.state_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('player.state_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('player.state_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load the player' }, { status: 500 });
  }
}
