import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchOwnConsentState } from '@/lib/consent/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC006 — GET /api/account/consent (IDN-6).
 *
 * Returns the authenticated caller's own consent projections — `effective`
 * (latest decision per catalogued purpose, with re-consent drift) + `history`
 * (the full append-only ledger) — via the `get_own_consent_state()` SECURITY
 * DEFINER contract. Additive route (ADR-U015) — no existing route changes, no
 * version bump. Auth is the `@supabase/ssr` cookie session (the shipped Hub
 * house style, per FEAT-PC003/PC004; the spec's `/api/v1/` + Bearer is
 * directional and not yet realised — see FEAT-PC006 Open spec questions).
 *
 * A sessionless caller is gated here with 401 before the contract is reached
 * (the read RPC is not granted to anon). Failures are surfaced (500), never
 * silently swallowed. There is no 404: the contract always returns an object
 * (catalogued purposes appear undecided when the member has no rows).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.consent_read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const consent = await fetchOwnConsentState(supabase);
    emitTelemetry('account.consent_read', {
      actor: user.id,
      purposes: consent.effective.length,
      events: consent.history.length,
    });
    return NextResponse.json({ consent });
  } catch (err) {
    emitTelemetry('account.consent_read_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load consent state' }, { status: 500 });
  }
}
