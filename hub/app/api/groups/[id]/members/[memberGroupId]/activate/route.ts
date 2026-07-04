import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activateMember } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H016 — POST /api/groups/[id]/members/[memberGroupId]/activate
 * (MEM-4 reactivate, STORY-1).
 *
 * The FEAT-PC013 contract self-gates (activate_members key — the catalog's
 * own verb split; paused targets only). Same mapping as pause: 42501 → 403,
 * P0001 → 409 (message through), P0002 → 404. Telemetry id-only.
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
    emitTelemetry('membership.activate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, memberGroupId } = await params;

  try {
    await activateMember(supabase, id, memberGroupId);
    emitTelemetry('membership.activate', { actor: user.id, group: id, member: memberGroupId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('membership.activate_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('membership.activate_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This member cannot be reactivated' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('membership.activate_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('membership.activate_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to reactivate the member' }, { status: 500 });
  }
}
