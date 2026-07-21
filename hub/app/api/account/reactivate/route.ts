import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reactivateOwnAccount } from '@/lib/account/lifecycle';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC005 — POST /api/account/reactivate (IDN-12, built at C-F).
 *
 * Thin proxy to the owner-gated `reactivate_own_account()` SECURITY DEFINER
 * contract (ADR-U038/U050: the origin gate — only a member-origin pause flips
 * back — the terminal wall, and the audit write live in the substrate; this
 * route is session plumbing + SQLSTATE→HTTP presentation only). Private Hub
 * BFF route: cookie session, unversioned. Mutating verb → `getUser()`
 * (server-verified identity, ADR-U037) — a paused member's session is still a
 * session (pause never ends sessions), so the cookie path works here.
 *
 * A substrate refusal (P0001 — admin hold, terminal) maps to 409 with the
 * contract's message; sessionless is 401.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.reactivate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const result = await reactivateOwnAccount(supabase);
    emitTelemetry('account.reactivate', { actor: user.id, idempotent: result.idempotent });
    return NextResponse.json({ result });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001') {
      emitTelemetry('account.reactivate_refused', { actor: user.id, message: e.message });
      return NextResponse.json({ error: e.message ?? 'Reactivation refused' }, { status: 409 });
    }
    emitTelemetry('account.reactivate_failed', { actor: user.id, message: e.message });
    return NextResponse.json({ error: 'Failed to reactivate your account' }, { status: 500 });
  }
}
