import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchGroupMembershipsOf } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): loads with the wielded group's page — a member-facing hot
// read. Edge runtime, pinned to `dub1` (ADR-U035).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H018 — GET /api/groups/[id]/acting/memberships (STORY-3 read).
 *
 * [id] is the ACTING group. The FEAT-PC015 `get_group_memberships_of()`
 * contract gates on the caller's own act_as_group key in it (ADR-U041 §1 —
 * wielding precedes existence; a keyless caller learns nothing). Rows are
 * where the group belongs plus its pending invitations.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('acting.memberships_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const rows = await fetchGroupMembershipsOf(supabase, id);
    emitTelemetry('acting.memberships', { actor: userId, acting: id, count: rows.length });
    return NextResponse.json(rows);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === '42501') {
      emitTelemetry('acting.memberships_refused', { actor: userId, acting: id, code: e.code });
      return NextResponse.json(
        { error: e.message ?? 'You do not have permission to act as this group' },
        { status: 403 },
      );
    }
    emitTelemetry('acting.memberships_failed', { actor: userId, acting: id, code: e.code });
    return NextResponse.json({ error: 'Failed to load memberships' }, { status: 500 });
  }
}
