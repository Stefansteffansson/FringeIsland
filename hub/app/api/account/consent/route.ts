import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOwnConsentState, recordConsentDecision } from '@/lib/consent/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC006 — GET /api/account/consent (IDN-6).
 *
 * Returns the authenticated caller's own consent projections — `effective`
 * (latest decision per catalogued purpose, with re-consent drift) + `history`
 * (the full append-only ledger) — via the `get_own_consent_state()` SECURITY
 * DEFINER contract. Additive route (ADR-U015) — no existing route changes, no
 * version bump. Auth is the `@supabase/ssr` cookie session (the shipped Hub
 * house style, per FEAT-PC003/PC004). Per ADR-U038 this is a private Hub BFF
 * route, so `/api/v1` + Bearer bind the platform surface (PostgREST RPC), not
 * this BFF path — cookie-session + unversioned is conformant.
 *
 * A sessionless caller is gated here with 401 before the contract is reached
 * (the read RPC is not granted to anon). Failures are surfaced (500), never
 * silently swallowed. There is no 404: the contract always returns an object
 * (catalogued purposes appear undecided when the member has no rows).
 */
export async function GET() {
  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip. Server-Timing instruments the auth/query split for the Network
  // tab (this route is on the measured hot navigation path).
  const t0 = Date.now();
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  const tAuth = Date.now();

  if (!userId) {
    emitTelemetry('account.consent_read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const consent = await fetchOwnConsentState(supabase);
    const tQuery = Date.now();
    emitTelemetry('account.consent_read', {
      actor: userId,
      purposes: consent.effective.length,
      events: consent.history.length,
    });
    return NextResponse.json(
      { consent },
      { headers: { 'Server-Timing': `auth;dur=${tAuth - t0}, query;dur=${tQuery - tAuth}` } },
    );
  } catch (err) {
    emitTelemetry('account.consent_read_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load consent state' }, { status: 500 });
  }
}

/**
 * FEAT-PC007 — POST /api/account/consent (IDN-7 consent half).
 *
 * Records the caller's own grant/withdraw decision via the
 * `record_consent_decision()` SECURITY DEFINER write contract (own-subject,
 * append-only, withdrawability-gated; `policy_version` stamped server-side).
 * Returns the updated effective entry for the purpose. Additive route
 * (ADR-U015) — same path, new method, no version bump.
 *
 * Gating + typed-refusal mapping (the contract raises SQLSTATEs; the route maps
 * them so the Hub can surface an honest message):
 *   sessionless           → 401 (before the contract)
 *   missing purpose/decision → 400
 *   22023 unknown purpose → 422
 *   42501 refused withdrawal of a non-withdrawable purpose → 409
 *   28000 no active subject → 403
 *   anything else         → 500 (surfaced, never swallowed)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.consent_write_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { purpose?: unknown; decision?: unknown }
    | null;
  const purpose = body?.purpose;
  const decision = body?.decision;

  if (typeof purpose !== 'string' || !purpose || typeof decision !== 'string' || !decision) {
    emitTelemetry('account.consent_write_invalid', { actor: user.id });
    return NextResponse.json({ error: 'purpose and decision are required' }, { status: 400 });
  }

  try {
    const entry = await recordConsentDecision(supabase, purpose, decision);
    emitTelemetry('account.consent_write', { actor: user.id, purpose, decision });
    return NextResponse.json({ entry });
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Typed governance refusals — recorded (V4), not silently swallowed.
    if (code === '22023' || code === '42501' || code === '28000') {
      const status = code === '22023' ? 422 : code === '42501' ? 409 : 403;
      emitTelemetry('account.consent_write_refused', { actor: user.id, purpose, code, status });
      const message =
        code === '22023'
          ? 'Unknown consent purpose'
          : code === '42501'
            ? 'This consent cannot be withdrawn'
            : 'No active account for this request';
      return NextResponse.json({ error: message }, { status });
    }
    emitTelemetry('account.consent_write_failed', {
      actor: user.id,
      purpose,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to record consent decision' }, { status: 500 });
  }
}
