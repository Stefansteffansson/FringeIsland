import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOwnAccountState } from '@/lib/account/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC004 — GET /api/account/state (IDN-9).
 *
 * Returns the authenticated caller's own account lifecycle state
 * (active / suspended / decommissioned) via the SECURITY DEFINER contract,
 * including the suspended/decommissioned cases that ordinary RLS hides. Additive
 * route (ADR-U015) — no existing route changes, no version bump. Auth is the
 * `@supabase/ssr` cookie session (the shipped Hub house style). Per ADR-U038 this
 * is a private Hub BFF route, so `/api/v1` + Bearer bind the platform surface
 * (PostgREST RPC), not this BFF path — cookie-session + unversioned is conformant.
 *
 * STORY-5: a sessionless caller is gated here with 401 before the contract is
 * reached; a caller with no mapped account row gets 404 (the contract returns
 * null). Failures are surfaced (500), never silently swallowed.
 */
export async function GET() {
  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip on the hot path.
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('account.state_read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const state = await fetchOwnAccountState(supabase);
    if (!state) {
      emitTelemetry('account.state_read_not_found', { actor: userId });
      return NextResponse.json({ error: 'No account state' }, { status: 404 });
    }
    emitTelemetry('account.state_read', { actor: userId, state: state.state });
    return NextResponse.json({ state });
  } catch (err) {
    emitTelemetry('account.state_read_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load account state' }, { status: 500 });
  }
}
