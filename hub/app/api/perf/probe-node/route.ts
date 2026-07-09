import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOwnAccountState } from '@/lib/account/queries';

// PERF-PROBE (temporary, 2026-07-09) — the Node half of the cold-boot A/B.
// Identical twin of /api/perf/probe-edge except the declared runtime (the
// handler is deliberately inlined in both twins so the route-policy
// conformance guard can verify each file; the unit suite pins the twins to
// identical behavior). Runs on Fluid compute (enabled 2026-07-06); region
// comes from vercel.json `regions: ["dub1"]` (ADR-U035), which governs Node
// functions — no preferredRegion export here. Classified in
// NODE_GETS_REVIEWED (deliberately-Node GET — the whole point of the A/B).
// Remove both twins at the ADR-U036 revisit close-out
// (docs/planning/hub-v2/2026-07-09-cold-load-regression-analysis.md L1).
export const runtime = 'nodejs';

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
      runtime: 'nodejs',
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
      { ok: true, runtime: 'nodejs', n, instanceAgeMs: Date.now() - bootedAt },
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
