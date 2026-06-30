# Session bridge — Performance investigation: region co-location shipped + the client-render bottleneck found

**Date:** 2026-07-01 (perf investigation; same session as the Cycle C build `2026-06-30_03`, continued past midnight)
**Session type:** Performance investigation + fix (not a normal build/decompose). Measured, root-caused, shipped the cheap fix, parked + refined the rest.
**Status:** **Region mismatch root-caused + FIXED** (ADR-U035, co-location to `dub1`, merged PR #34, confirmed live). **The residual slowness is now isolated to the client-render pattern** — teed up as **Tier 1** for the next session.
**Participants:** Stefan + Claude

---

## What happened

Stefan reported the deployed Hub felt slow on every DB-backed page. Measured investigation:

1. **The DB is fast.** Hottest query (`/groups` membership→groups join over 1,145 rows) = **~3 ms** server-side (indexed). Not the cause.
2. **Region mismatch was the dominant cause.** Vercel functions had no region pinned → default **`iad1` (US-East)**; DB is **`eu-west-1` (Ireland)**. `/groups` makes ~4 sequential **transatlantic** round-trips ≈ **~700 ms**. User is in **Sweden**.
3. **Fixed** — `hub/vercel.json` `{"regions":["dub1"]}` (Dublin = eu-west-1, co-located with the DB). **[ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md)**, merged **PR #34**. **Confirmed live** via the `x-vercel-id: arn1::dub1::…` response header — the function executes in **dub1**. (Root Directory is `hub`, so the file is `hub/vercel.json`.)
4. **Refined diagnosis (the new lever).** After co-location each API call is **~80 ms** (Sweden→Dublin distance); server-side hops are now intra-region (~1–2 ms). The residual slowness is the **client-render pattern**:
   - The root layout wraps **every page** in `AuthProvider → AccountStateProvider → AccountStateGate`.
   - **`AccountStateView` blocks the whole app while account-state loads** — `hub/components/account/AccountStateView.tsx:41` → `if (loading) return <LoadingState label="Checking your account…" />`. So every initial load/refresh waits a **serial ~80 ms** on `/api/account/state` **before** the page renders and starts its own `/api/groups` + `/api/profile/me` fetches. A built-in waterfall.
   - It's a **client-rendered SPA**: the browser fetches all data over the network; sequential ~80 ms hops stack.

## Key reprioritization (important — the perf backlog was refined)

The measurement **changes the priority** of the parked items:
- **P1 (`getUser`→`getClaims`) and P2 (collapse `/groups` into one RPC) are now confirmed LOW latency-impact** — they reduce *server-side* hops, which are intra-region (~2 ms) after co-location. They stay valuable for **Auth-service load + cleanliness at scale**, NOT responsiveness.
- **The real responsiveness levers are the client-render fixes** (new, this session): **Tier 1** (de-block the gate + parallelize) and **Tier 2** (server-render initial data via RSC). Captured in [`../hub-v2/perf-hardening-backlog.md`](../hub-v2/perf-hardening-backlog.md) (refreshed 2026-07-01).

## Architecture-integrity check (Stefan asked explicitly)

**Neither tier breaks the hierarchy.** API-first (ADR-U009) holds, Platform Core still owns the data/contracts, the L1–L5 decomposition is untouched. What changes is **only the Hub's own shell rendering** — which products explicitly own (products-tier CLAUDE.md / ADR-U025).
- **Tier 1** = Hub shell rendering → must go through `feature-development`: **update FEAT-H006's spec** (gate semantics) + **red-first**, not a silent code hack (the gate is a shipped feature, IDN-9).
- **Tier 2** = a product-rendering decision *inside* API-first (server components still call the Platform API; logic stays in API routes) → needs an **ADR** + a `hub/CLAUDE.md` update (it revisits the Hub's CSR lean).

## Resume HERE — next session (Tier 1, a fresh session)

**Tier 1 — make the account-state gate non-blocking (FEAT-H006 / IDN-9).** The disciplined way:
1. **Update FEAT-H006's spec** (`feature-development`, L4): the gate renders the page **optimistically** (treat as active by default) and **intercepts only on confirmed `suspended` / `decommissioned`** — it does **not** block the whole app on the `/api/account/state` round-trip. Keep the suspended/decommissioned standalone surfaces. (The data is RLS-protected regardless, so a brief optimistic render of the chrome for the rare switched-off case is acceptable — state it in the spec.)
2. **Also:** ensure the page's own calls (`/api/groups`, `/api/profile/me`) fire **in parallel**, not chained.
3. **Build red-first:** tests prove (a) an active FIM sees the page with **no** blocking "Checking your account…" gate, (b) a suspended/decommissioned FIM is **still** intercepted (interception preserved). Hub-only → fuller-auto.
4. **Measure** the before/after (Network tab / `x-vercel-id`).
- **Files:** `hub/components/account/AccountStateView.tsx` (the `if (loading)` block, L41), `AccountStateGate.tsx`, `AccountStateContext.tsx`; the FEAT-H006 spec + its §L4 row.

## Carry-forward

- **Tier 2 (the genuine "European-fast" lever):** draft an **ADR** for **server-rendering the initial page with its data** (Next.js RSC, fetched via the Platform API server-side — API-first preserved) + update `hub/CLAUDE.md`'s CSR lean. Collapses the client waterfall to one round-trip.
- **ADR-U035 verification-note correction (small):** the Vercel **Functions dashboard shows its saved default (`iad1`), NOT the `vercel.json` override** — the dashboard is misleading; verify the region via the **`x-vercel-id` response header** instead. Add as an ADR **addendum** (append-only; pauses for the merge nod).
- **Perf backlog** reprioritized: P1/P2/P3/P4/P5 stay (scale/cleanliness/hygiene), but **client-render (Tier 1/Tier 2) is now the top responsiveness work**.
- **Cycle D (IDN-5 Journal)** remains the next *feature* cycle once the responsiveness work is where Stefan wants it.
