import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyInvitations } from '@/lib/groups/invitations';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): rides the /groups page load — Edge runtime, pinned to
// `dub1` (ADR-U035).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H015 — GET /api/me/invitations (STORY-4 read).
 *
 * The FEAT-PC012 `get_my_invitations()` contract returns the caller's own
 * pending invitations — the invitation context only, never group detail (the
 * only window onto invited memberships; get_member_groups filters them out by
 * design). ADR-U037 read identity; telemetry id-only.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('invitations.mine_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const invitations = await fetchMyInvitations(supabase);
    emitTelemetry('invitations.mine', { actor: userId, count: invitations.length });
    return NextResponse.json(invitations);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('invitations.mine_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Invitations are for members' }, { status: 403 });
    }
    emitTelemetry('invitations.mine_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }
}
