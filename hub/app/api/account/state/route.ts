import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchOwnAccountState } from '@/lib/account/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): run on the Edge runtime (V8 isolate, ~0ms cold start — the Node
// lambda cold start was ~740-790ms on first hit after idle), pinned to `dub1` so
// co-location with the Ireland DB (ADR-U035) is preserved. Keep this route's imports
// Edge-safe (no Node-only APIs) — @supabase/ssr + next/headers cookies + fetch only.
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-PC004 — GET /api/account/state (IDN-9).
 *
 * Returns the authenticated caller's own account lifecycle state
 * (active / suspended / decommissioned) via the SECURITY DEFINER contract,
 * including the suspended/decommissioned cases that ordinary RLS hides. Additive
 * route (ADR-U015) — no existing route changes, no version bump. Auth is the
 * `@supabase/ssr` cookie session (the shipped Hub house style; the spec's
 * `/api/v1/` + Bearer is directional and not yet realised — see TASK-PC003-01).
 *
 * STORY-5: a sessionless caller is gated here with 401 before the contract is
 * reached; a caller with no mapped account row gets 404 (the contract returns
 * null). Failures are surfaced (500), never silently swallowed.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.state_read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const state = await fetchOwnAccountState(supabase);
    if (!state) {
      emitTelemetry('account.state_read_not_found', { actor: user.id });
      return NextResponse.json({ error: 'No account state' }, { status: 404 });
    }
    emitTelemetry('account.state_read', { actor: user.id, state: state.state });
    return NextResponse.json({ state });
  } catch (err) {
    emitTelemetry('account.state_read_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load account state' }, { status: 500 });
  }
}
