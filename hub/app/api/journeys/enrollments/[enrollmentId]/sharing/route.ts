import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setJourneyProgressSharing } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Mutation-only route — Node runtime (route-policy: mutations ride getUser and
// stay off Edge).

/**
 * FEAT-H022 — POST /api/journeys/enrollments/[enrollmentId]/sharing (JRN-17,
 * traveller side). Grant/withdraw progress sharing for THIS via-group enrolment.
 * Body `{ share: boolean }`. The FEAT-PD005 `set_journey_progress_sharing`
 * contract self-gates (self-only subject, append-only consent write, solo-walk
 * refusal, latest-wins) — this route is presentation only. SQLSTATE → HTTP:
 * 42501 → 403; P0002 → 404 (non-traveller/absent indistinguishable); P0001 → 422
 * (sharing on a solo walk — the walker IS the party); else 500 content-free.
 * Mutation → per-request getUser. Telemetry ids only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('player.sharing_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { enrollmentId } = await params;
  const body = (await request.json().catch(() => ({}))) as { share?: boolean };
  const share = body.share === true;

  try {
    const result = await setJourneyProgressSharing(supabase, enrollmentId, share);
    emitTelemetry('player.sharing_set', { actor: user.id, enrollment: enrollmentId, sharing: share });
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('player.sharing_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('player.sharing_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('player.sharing_solo', { actor: user.id, code });
      return NextResponse.json({ error: 'Sharing applies to group walks only' }, { status: 422 });
    }
    emitTelemetry('player.sharing_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 });
  }
}
