import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pauseOwnAccount } from '@/lib/account/lifecycle';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC017 — POST /api/account/pause (IDN-10, C-F).
 *
 * Thin proxy to the owner-gated `pause_own_account()` SECURITY DEFINER
 * contract (ADR-U038: every rule — own-row, Mist wall, admin-hold wall,
 * terminal wall — lives in the substrate; this route is session plumbing +
 * SQLSTATE→HTTP presentation only). Private Hub BFF route: cookie session,
 * unversioned (`/api/v1` + Bearer bind the platform surface, not this path).
 * Mutating verb → `getUser()` (server-verified identity, ADR-U037).
 *
 * A substrate refusal (P0001) maps to 409 carrying the contract's message;
 * a sessionless caller is 401 before the contract is reached.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.pause_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const result = await pauseOwnAccount(supabase);
    emitTelemetry('account.pause', { actor: user.id, idempotent: result.idempotent });
    return NextResponse.json({ result });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001') {
      emitTelemetry('account.pause_refused', { actor: user.id, message: e.message });
      return NextResponse.json({ error: e.message ?? 'Pause refused' }, { status: 409 });
    }
    emitTelemetry('account.pause_failed', { actor: user.id, message: e.message });
    return NextResponse.json({ error: 'Failed to pause your account' }, { status: 500 });
  }
}
