import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { closeGroup } from '@/lib/groups/leadership';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H017 — POST /api/groups/[id]/close (MEM-8, STORY-4).
 *
 * The FEAT-PC014 `close_group` contract is the last active member's terminal
 * act — status `closed`, work frozen and reassigned platform-side. The
 * not-last-member refusal (409) passes through verbatim. 42501 → 403,
 * P0002 → 404, else 500 content-free. Telemetry id-only (STORY-6).
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
    emitTelemetry('groups.close_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await closeGroup(supabase, id);
    emitTelemetry('groups.close', { actor: user.id, group: id });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('groups.close_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      emitTelemetry('groups.close_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The group cannot be closed yet' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('groups.close_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('groups.close_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to close the group' }, { status: 500 });
  }
}
