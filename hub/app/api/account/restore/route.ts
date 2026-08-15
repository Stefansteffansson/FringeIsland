import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { restoreOwnAccount } from '@/lib/account/lifecycle';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * TASK-IDN-01 — POST /api/account/restore.
 *
 * Thin proxy to the owner-gated `restore_own_account()` SECURITY DEFINER
 * contract (ADR-U038: the member-origin gate, the window check, the identity
 * unstash, and the audit write all live in the substrate — this route is
 * session plumbing + SQLSTATE→HTTP presentation only). Private Hub BFF route:
 * cookie session, unversioned. Mutating verb → `getUser()` (server-verified
 * identity, ADR-U037) — a decommissioned member's fresh sign-in is a real
 * session (credentials survive the grace window by design).
 *
 * A substrate refusal (P0001 — nothing to restore / window closed) maps to
 * 409 with the contract's message; sessionless is 401.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.restore_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await restoreOwnAccount(supabase);
    emitTelemetry('account.restore', { actor: user.id });
    return NextResponse.json({ result: { success: true } });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001') {
      emitTelemetry('account.restore_refused', { actor: user.id, message: e.message });
      return NextResponse.json({ error: e.message ?? 'Restore refused' }, { status: 409 });
    }
    emitTelemetry('account.restore_failed', { actor: user.id, message: e.message });
    return NextResponse.json({ error: 'Failed to restore your account' }, { status: 500 });
  }
}
