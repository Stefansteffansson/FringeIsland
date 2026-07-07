import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withdrawFromJourney } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Mutation-only route — Node runtime (route-policy: mutations ride getUser
// and stay off Edge).

/**
 * FEAT-H019 — POST /api/journeys/[id]/withdraw (STORY-5).
 *
 * Body `{ enrollment_id }` (shape-checked here as presentation only — the
 * FEAT-PD002 `withdraw_from_journey` contract owns every rule: own vs
 * group-key-gated withdrawal, the frozen refusal, P0002 no-leak).
 * SQLSTATE → HTTP: 42501 → 403; P0002 → 404; P0001 → 409 with the message
 * through (frozen carries its honest copy); else 500 content-free.
 * Mutation → per-request getUser. Telemetry ids only (STORY-7).
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
    emitTelemetry('journey.withdraw_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { enrollment_id?: string };
  if (typeof body.enrollment_id !== 'string' || !body.enrollment_id) {
    emitTelemetry('journey.withdraw_invalid', { actor: user.id, journey: id });
    return NextResponse.json({ error: 'enrollment_id required' }, { status: 400 });
  }

  try {
    const result = await withdrawFromJourney(supabase, body.enrollment_id);
    emitTelemetry('journey.withdrawn', { actor: user.id, journey: id });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('journey.withdraw_refused', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('journey.withdraw_missing', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('journey.withdraw_conflict', { actor: user.id, journey: id, code });
      return NextResponse.json(
        { error: message ?? 'The withdrawal was refused' },
        { status: 409 },
      );
    }
    emitTelemetry('journey.withdraw_failed', { actor: user.id, journey: id, code });
    return NextResponse.json({ error: 'Failed to withdraw' }, { status: 500 });
  }
}
