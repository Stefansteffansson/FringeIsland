import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handToDeusEx } from '@/lib/groups/leadership';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H017 — POST /api/groups/[id]/hand-to-deusex (MEM-7, STORY-3 —
 * ADR-U019's deliberate last resort).
 *
 * The FEAT-PC014 `hand_stewardship_to_deusex` contract transfers stewardship
 * to FringeIsland-DeusEx and departs the caller. The last-member refusal
 * (409, pointing at Close) passes through verbatim for the Surface to render
 * in place. 42501 → 403, P0002 → 404, else 500 content-free. Telemetry
 * id-only (STORY-6).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('leadership.hand_to_deusex_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await handToDeusEx(supabase, id);
    emitTelemetry('leadership.hand_to_deusex', { actor: user.id, group: id });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('leadership.hand_to_deusex_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('leadership.hand_to_deusex_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The group cannot be handed over yet' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('leadership.hand_to_deusex_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('leadership.hand_to_deusex_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to hand the group over' }, { status: 500 });
  }
}
