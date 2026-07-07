# J-O3 waterfall — Journeys Cycle J-A pages on production (2026-07-07)

**Protocol:** production stable domain (`fringe-island.vercel.app`), Stefan's real signed-in account (authenticated real path, ADR-U037), cold + warm, ≥3 runs per scenario, lab-strict reading (every run within budget), measured via the browser's own performance timeline during Stefan's live walk (the felt half of the gate). First measurement under the ADR-U043 budgets; run ~30 minutes after the J-A deploy.

## Results

| Scenario | Budget (ADR-U043) | Runs | Verdict |
|---|---|---|---|
| S1 `/journeys` cold full load (B2) | ≤ 2.5 s, target 2.0 s | content-ready **~500 / 490 / 600 ms** (TTFB 6–7 ms; both page reads parallel, slowest API 319–454 ms) | **PASS**, ~4x headroom |
| S2 card → detail soft-nav (B4/B3) | no visible loading state | **1 API call** total; header painted instantly from the card-cache seed; catalogue from session cache, zero duplicate fetches | **PASS** |
| S3 `/journeys/[id]` cold full load (B2) | ≤ 2.5 s | content-ready **940 / 573 / 459 ms** (detail read warmed 960 → 643 → 376 → 251 ms — once-per-deploy warm-up curve; steady state 250–380 ms) | **PASS** |
| S4 interactions (B5), Stefan's live walk | busy ≤ 100 ms felt; honest settle | enrol **937 ms** first hit (Node lambda cold) → **325 ms** warm; withdraw **336 / 291 ms**; re-reads 193–277 ms; busy feedback instant (unit-asserted + felt) | **PASS** — felt verdict: "feels pretty okay" |
| S5 J-O5 first-ever-cold sign-in | < 2 s click → content; app share ≤ ~1.0 s over the auth floor | click → groups content **1 375 ms** = auth exchange **507 ms** (vendor floor) + app share **868 ms** (dominated by `/api/me/overview` at **866 ms**, parallel audit 261 ms) | **PASS** |

Notes: request-count row (first paint = exactly 2 page reads + the shell's account/profile boot, zero duplicates across auth churn) confirmed live, matching the unit-tier DoD asserts. Stefan's walk enrolled + withdrew on two journeys (account left clean); the withdraw handles rendered per the amended payload.

## What the waterfall says about the boundary bet (J-O3: measure first, then choose)

The journeys pages are healthy — nothing in J-A's own surface approaches its budget, and the DB-layer candidate (P3b's duplicate-permissive-policy consolidation on `journey_enrollments`) has **no measured justification** (steady-state journey reads 250–450 ms; PD002 Open Q4's "only if J-O3 points at the DB layer" condition is NOT met — stays parked).

The single largest app-side item measured anywhere on the walk is the **sign-in landing's `/api/me/overview` bundle at ~870 ms** — the first-load residual (P1-residual territory). The once-per-deploy warm-up spikes (detail read 960 ms, first mutation 937 ms) are the only other >500 ms items; both are cold-start-class, not steady-state.

**Boundary bet: DECIDED — P1-residual** (Stefan, 2026-07-07, same session as the measurement): the sign-in landing's `/api/me/overview` bundle (~870 ms of the 1 375 ms click-to-content) is the target. P3b stays parked (its DB-layer condition not met); P4 unargued-for by the data. Ships within the Journeys area; verified-or-explicitly-re-parked at the area gate per the exit checklist.

## P1-residual — first investigation (same session, Stefan's authenticated tab, 3 runs each)

The bundle vs its own slices, measured standalone on production:

| Read | Run 1 (first hit) | Runs 2–3 (warm) |
|---|---|---|
| `/api/me/overview` (the bundle) | **1 374 ms** | 435 / 367 ms |
| `/api/groups` | 446 ms | 146 / 153 ms |
| `/api/profile/me` | 265 ms | 161 / 147 ms |
| `/api/account/state` | 253 ms | 156 / 152 ms |
| `/api/account/consent` | 278 ms | 143 / 314 ms |
| `/api/me/invitations` | 233 ms | 144 / 152 ms |
| `/api/me/nominations` | 244 ms | ~170 ms |

Two facts: (1) **warm**, the bundle costs ~2.5x a single slice (~400 ms vs ~150 ms) even though its five reads run in parallel — the overhead lives in the one Edge invocation making five separate Edge→Supabase round-trips (per-call connection/TLS/auth costs that the parallelism doesn't hide); (2) the **first invocation** pays ~1.4 s — exactly what the sign-in landing eats (the 866 ms observed at J-O5 was a partially-warm case). The slices themselves are uniformly healthy.

**Fix directions (open):** (a) collapse the five substrate round-trips into one `get_own_overview()` RPC — but ADR-U042 guardrail 4 explicitly defers substrate-side composition until a second surface wants the bundle, so this route needs an ADR-U042 amendment decision, not a patch; (b) connection reuse / keep-alive tuning inside the Edge invocation — experiment-shaped; (c) pre-warming is NOT a shortcut — a 401 warmup ping exercises only the isolate, not the real Edge→Supabase path (the measured-path-not-proxy lesson). Next concrete step: per-slice server-side timing via a custom response header (Vercel drops `Server-Timing` on Edge responses) to pin exactly where the ~250 ms warm overhead and the ~1 s cold penalty sit.

## Gate status

J-A's pages join the area-gate protocol **measured and passing**; the J-O5 first-ever-cold scenario is measured and passing. The area gate itself (before the area retro, after J-E) re-runs this protocol across the whole area.
