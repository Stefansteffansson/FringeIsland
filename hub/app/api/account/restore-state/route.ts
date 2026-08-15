import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { getOwnRestoreState } from '@/lib/account/lifecycle';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * TASK-IDN-01 — GET /api/account/restore-state.
 *
 * The restore door's one honest source: whether the caller's own account is a
 * member-origin decommission inside its grace window, and the scheduled
 * deletion date. Thin proxy to the owner-gated `get_own_restore_state()`
 * SECURITY DEFINER contract (ADR-U038: the window arithmetic and the origin
 * gate live in the substrate). Private Hub BFF route: cookie session,
 * unversioned. Read path → `getVerifiedUserId()` (ADR-U037 — local JWT
 * verification, no Auth-server round-trip).
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('account.restore_state_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const state = await getOwnRestoreState(supabase);
    emitTelemetry('account.restore_state_read', { actor: userId, restorable: state.restorable });
    return NextResponse.json({ state });
  } catch (err) {
    emitTelemetry('account.restore_state_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load restore state' }, { status: 500 });
  }
}
