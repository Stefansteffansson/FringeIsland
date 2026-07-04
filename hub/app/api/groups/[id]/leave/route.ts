import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leaveGroup } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H016 — POST /api/groups/[id]/leave (MEM-6, STORY-3).
 *
 * The FEAT-PC013 contract executes the regular exit (freeze own non-public
 * enrolments + roles + membership) and refuses the two G-E scenarios with
 * honest copy — sole active Steward (MEM-7) and last member (MEM-8) — which
 * this route passes through verbatim as 409 for the Surface to render in
 * place. 42501 → 403 (Mist/suspended); P0002 → 404 (non-member/invisible,
 * no leak). Telemetry id-only — the payload's group name never in events.
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
    emitTelemetry('membership.leave_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await leaveGroup(supabase, id);
    emitTelemetry('membership.leave', { actor: user.id, group: id });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('membership.leave_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('membership.leave_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'You cannot leave this group yet' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('membership.leave_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('membership.leave_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to leave the group' }, { status: 500 });
  }
}
