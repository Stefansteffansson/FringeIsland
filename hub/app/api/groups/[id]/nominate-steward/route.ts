import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nominateSteward } from '@/lib/groups/leadership';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H017 — POST /api/groups/[id]/nominate-steward (MEM-7, STORY-1).
 *
 * The FEAT-PC014 `nominate_steward` contract sends the durable offer to the
 * first of the ordered nominees; nothing mutates until a nominee responds.
 * This route validates the body shape only — sole-Steward-ness, nominee
 * membership, and one-in-flight all refuse substrate-side. 42501 → 403,
 * P0002 → 404, P0001 → 409 and 22023 → 400 with the refusal message passed
 * through (the Surface renders it in place). Telemetry id-only — nominee id
 * lists and group names never in events (STORY-6).
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
    emitTelemetry('leadership.nominate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    nominee_group_ids?: unknown;
  };
  const nominees = body.nominee_group_ids;

  if (
    !Array.isArray(nominees) ||
    nominees.length === 0 ||
    nominees.some((n) => typeof n !== 'string')
  ) {
    emitTelemetry('leadership.nominate_invalid', { actor: user.id, group: id });
    return NextResponse.json(
      { error: 'Pick at least one member to nominate' },
      { status: 400 },
    );
  }

  try {
    const result = await nominateSteward(supabase, id, nominees as string[]);
    emitTelemetry('leadership.nominate', {
      actor: user.id,
      group: id,
      count: nominees.length,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('leadership.nominate_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('leadership.nominate_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Nomination cannot proceed' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('leadership.nominate_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === '22023') {
      emitTelemetry('leadership.nominate_invalid', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Invalid nominee' },
        { status: 400 },
      );
    }
    emitTelemetry('leadership.nominate_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to send the nomination' }, { status: 500 });
  }
}
