import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pauseMember } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H016 — POST /api/groups/[id]/members/[memberGroupId]/pause
 * (MEM-4 pause, STORY-1).
 *
 * The FEAT-PC013 contract self-gates (pause_members key, self-target and
 * last-active-Steward refusals). 42501 → 403; P0001 → 409 with the refusal's
 * message passed through (the Surface shows it in place); P0002 → 404
 * (ghost/non-member, no leak). Telemetry id-only — member display data never
 * in events (STORY-5).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberGroupId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('membership.pause_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, memberGroupId } = await params;

  try {
    await pauseMember(supabase, id, memberGroupId);
    emitTelemetry('membership.pause', { actor: user.id, group: id, member: memberGroupId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('membership.pause_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('membership.pause_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This member cannot be paused' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('membership.pause_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('membership.pause_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to pause the member' }, { status: 500 });
  }
}
