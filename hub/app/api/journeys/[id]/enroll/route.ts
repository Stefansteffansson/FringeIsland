import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrollSelfInJourney, enrollGroupInJourney } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Mutation-only route — Node runtime (route-policy: mutations ride getUser
// and stay off Edge).

/**
 * FEAT-H019 — POST /api/journeys/[id]/enroll (JRN-3 + JRN-4, STORY-3/4).
 *
 * Body `{ group_id? }` — absent = self-enrolment (the personal group as
 * party, ADR-U020); present = the wielding walk via the FEAT-PD002
 * `enroll_group_in_journey` contract (permission gate, duplicate and
 * non-active refusals, durable member notifications all platform-side).
 * SQLSTATE → HTTP: 42501 → 403; P0002 → 404 (invisible and absent
 * indistinguishable); P0001 → 409 with the refusal's message through (the
 * honest outcome copy the Surface renders); else 500 content-free.
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
    emitTelemetry('journey.enroll_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { group_id?: string };
  const groupId = typeof body.group_id === 'string' && body.group_id ? body.group_id : null;

  try {
    const enrollment = groupId
      ? await enrollGroupInJourney(supabase, groupId, id)
      : await enrollSelfInJourney(supabase, id);
    emitTelemetry(groupId ? 'journey.enrolled_group' : 'journey.enrolled_self', {
      actor: user.id,
      journey: id,
      ...(groupId ? { group: groupId } : {}),
    });
    return NextResponse.json(enrollment);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('journey.enroll_refused', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('journey.enroll_missing', { actor: user.id, journey: id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('journey.enroll_conflict', { actor: user.id, journey: id, code });
      return NextResponse.json(
        { error: message ?? 'The enrolment was refused' },
        { status: 409 },
      );
    }
    emitTelemetry('journey.enroll_failed', { actor: user.id, journey: id, code });
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}
