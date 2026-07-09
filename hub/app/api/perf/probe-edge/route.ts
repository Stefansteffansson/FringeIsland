import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOwnAccountState } from '@/lib/account/queries';

// PERF-PROBE (temporary, 2026-07-09) — the Edge half of the cold-boot A/B.
// Identical twin of /api/perf/probe-node except the declared runtime (the
// handler is deliberately inlined in both twins so the route-policy
// conformance guard can verify each file; the unit suite pins the twins to
// identical behavior). One ADR-U037 identity verification, one cheap
// substrate read, and a content-free `x-probe-timing` header (runtime label +
// per-instance invocation counter + in-function ms + instance age) so a live
// cold pass can split browser TTFB into middleware / provisioning /
// in-function terms. Remove both twins at the ADR-U036 revisit close-out
// (docs/planning/hub-v2/2026-07-09-cold-load-regression-analysis.md L1).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

// Per-instance by construction: a fresh boot resets both, so `n: 1` plus a
// small `age` marks the request that paid the cold start.
const bootedAt = Date.now();
let invocationN = 0;

export async function GET() {
  const n = ++invocationN;
  const t0 = performance.now();
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  const tAuth = performance.now();

  const timingHeaders = (readMs: number | null) => ({
    'x-probe-timing': JSON.stringify({
      runtime: 'edge',
      n,
      auth: Math.round(tAuth - t0),
      read: readMs === null ? -1 : Math.round(readMs),
      total: Math.round(performance.now() - t0),
      age: Date.now() - bootedAt,
    }),
  });

  if (!userId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: timingHeaders(null) },
    );
  }

  try {
    const tRead = performance.now();
    await fetchOwnAccountState(supabase);
    const readMs = performance.now() - tRead;
    return NextResponse.json(
      { ok: true, runtime: 'edge', n, instanceAgeMs: Date.now() - bootedAt },
      { headers: timingHeaders(readMs) },
    );
  } catch {
    // Surfaced, never swallowed — but content-free (it's a probe).
    return NextResponse.json(
      { error: 'Probe read failed' },
      { status: 500, headers: timingHeaders(null) },
    );
  }
}
