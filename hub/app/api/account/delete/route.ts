import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteOwnAccount } from '@/lib/account/lifecycle';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC017 — POST /api/account/delete (IDN-10, C-F).
 *
 * Thin proxy to the owner-gated terminal `delete_own_account()` SECURITY
 * DEFINER contract (ADR-U038/U050: the walk, the F-2 split, decommission,
 * scrub, and session deletion are all one substrate transaction — this route
 * is session plumbing + SQLSTATE→HTTP presentation only). Private Hub BFF
 * route: cookie session, unversioned. Mutating verb → `getUser()`
 * (server-verified identity, ADR-U037).
 *
 * On success the caller's sessions are already dead platform-side; the Hub
 * clears its local state and shows the farewell (FEAT-H029 STORY-3). A
 * substrate refusal (P0001 — admin hold, Mist, already closed) maps to 409
 * with the contract's message; sessionless is 401.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.delete_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const result = await deleteOwnAccount(supabase);
    emitTelemetry('account.delete', { actor: user.id, groups_exited: result.groups_exited });
    return NextResponse.json({ result });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001') {
      emitTelemetry('account.delete_refused', { actor: user.id, message: e.message });
      return NextResponse.json({ error: e.message ?? 'Deletion refused' }, { status: 409 });
    }
    emitTelemetry('account.delete_failed', { actor: user.id, message: e.message });
    return NextResponse.json({ error: 'Failed to delete your account' }, { status: 500 });
  }
}
