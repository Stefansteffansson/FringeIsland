# ADR-U043: Performance budgets for user-facing surfaces

**Status:** Accepted
**Date:** 2026-07-07
**Deciders:** Stefan (budget lock) + Claude (vetting + proposal)
**Tags:** scope:product · wave:ferd

---

## Context and problem statement

Twice in Phase 3 — Identity, then Groups — an area was built to full functional DoD (red-first TDD, adversarial API-boundary tests, schema gates, `next build` clean) and still shipped a first-load experience Stefan had to push back on after the fact (3–7 s spinners; see [`2026-07-06-groups-first-load-perf.md`](../../planning/hub-v2/2026-07-06-groups-first-load-perf.md)). The root cause was structural, not negligence: performance appeared nowhere in the pipeline's language — not one of the five verticals (ADR-U002), not a spec section, not a story acceptance criterion, not a DoD row — so the TDD machine never received latency as an input, and aggregate first-paint cost grew one locally-reasonable fetch at a time with no step ever measuring the sum ([`retro-2026-07-06.md`](../../planning/retrospectives/retro-2026-07-06.md)).

How should felt performance become a first-class, enforceable property of every surface build, and what budget is defensible against common practice and real user tolerance?

## Decision drivers

- Budgets must anchor to external standards and measured user tolerance, not invented numbers — vetted 2026-07-07 against Core Web Vitals, RAIL, Nielsen's response-time limits, MDN guidance, and SaaS benchmarks ([`Performance_Budget_Research_Report.md`](../../research/Performance_Budget_Research_Report.md)).
- Enforceable at build time and at the area gate — prose-only rules demonstrably drift within a cycle (the route-policy lesson, retro 2026-07-06 §1), while DoD rows hold.
- Must not lock the project to costs it doesn't control — the Supabase token exchange (~1.0 s) is a vendor floor inside the sign-in flow.
- With no real-user monitoring yet, lab measurements must map honestly onto the industry's percentile-based thresholds (CWV "good" = 75th percentile of field data).

## Considered options

- **Option A** — No numeric budgets; rely on the pattern ADRs (U035–U037, U042) and vigilance.
- **Option B** — One flat aggressive number (< 2 s for everything).
- **Option C** — Tiered, CWV-anchored budgets per scenario class, with an explicit measurement protocol.

## Decision outcome

**Chosen option:** Option C — tiered budgets match how users actually experience the app (a sign-in flow, a warm navigation, and a revisit are different tolerance classes), anchor to defensible external standards, and separate the vendor floor from the app's own responsibility. Option A is the status quo that failed twice; Option B locks a number the app can miss without doing anything wrong (the auth exchange alone is half of it).

### The budgets (binding for all user-facing surface work from the Journeys area onward)

| # | Scenario | Budget | Anchor |
|---|---|---|---|
| **B1** | Sign-in flow: click → primary content painted | **target 2.0 s, ceiling 2.5 s**; app-controlled share ≤ 1.5 s (auth exchange ~1.0 s is the vendor floor) | CWV LCP-good; login-flow tolerance |
| **B2** | Cold authenticated navigation (idle functions, first page of a session) | **≤ 2.5 s**, target 2.0 s | CWV LCP-good (p75) |
| **B3** | Warm navigation / warm first load | **≤ 1.0 s** | Nielsen 1 s flow-of-thought; SaaS best-in-class (0.8–1.1 s) |
| **B4** | Revisit / in-session soft-nav | **no visible loading state** (cached paint + background revalidate) | Nielsen 0.1 s "instant" class |
| **B5** | Any interaction | **≤ 200 ms to next paint; visible feedback within 100 ms** | CWV INP-good; RAIL |
| **B6** | Loading-state rule | < 1 s: no indicator needed · 1–3 s: **skeleton, not spinner** · > 3 s: treat as a defect | MDN/NN-g feedback guidance; skeleton ≈ 30 % perceived gain |

"Painted" means primary content rendered — a cleared spinner over an empty shell does not count.

### Measurement protocol

Measured at the **area gate**, before the area retro: production stable domain (`fringe-island.vercel.app`, never the SSO-walled per-deploy URLs), authenticated real path (the ADR-U037 rule), cold + warm scenarios, **≥ 3 runs per scenario, every run within budget** — the lab-strict reading of the p75 field thresholds, since no RUM exists yet. When real-user traffic exists, adopt RUM and restate at p75; the numbers themselves stand.

Enforcement homes: the feature-spec **Performance budget** section (template + AGENTS.md), the `feature-development` skill's **Performance DoD** rows, and the **per-area performance gate** (hub-v2 plan Phase 3), which also formalizes Stefan's manual live walk.

### Consequences

- **Positive:** budgets are citable the way ADR-U036/U037 rows are; regressions surface at build time or the area gate instead of via Stefan's post-close pushback; the vendor floor is explicit so the app-side budget is always actionable.
- **Negative:** each area gate gains measurement work (~30 min); B6 implies a spinner→skeleton design-system work item; first-paint reads are constrained to the ADR-U042 bundle/cache patterns or must justify a standalone read.
- **Neutral:** mobile/3G budgets (the RAIL/MDN 5 s class) are deferred until the Gimbal / Hamn-wave work; CLS stays unbudgeted until skeletons land (skeletons are also the standard CLS mitigation).

## Pros and cons of each option

### Option A — pattern ADRs + vigilance
- Pros: zero process weight.
- Cons: failed twice; prose drifts within a cycle; aggregate cost invisible until a human feels it.

### Option B — one flat number
- Pros: simple to state and test.
- Cons: conflates vendor floor with app responsibility; either too loose for warm paths or unachievable for the sign-in flow.

### Option C — tiered CWV-anchored budgets (chosen)
- Pros: matches user tolerance classes; externally defensible; separates target from ceiling and vendor from app.
- Cons: six rows to learn; needs a protocol to be meaningful.

## Links

- Vetting: [`docs/research/Performance_Budget_Research_Report.md`](../../research/Performance_Budget_Research_Report.md) (Core Web Vitals, RAIL, Nielsen, MDN, Catchpoint SaaS benchmarks — external sources cited there)
- Related ADRs: [ADR-U035](ADR-U035-compute-datastore-colocation.md) (co-location), [ADR-U036](ADR-U036-edge-runtime-hot-read-routes.md) (runtime/region), [ADR-U037](ADR-U037-local-jwt-verification-hot-path.md) (auth verbs + measure-the-real-path), [ADR-U042](ADR-U042-first-paint-bootstrap-read-bff-bundle.md) (bootstrap bundle — the B1–B4 delivery pattern)
- Origin: [`retro-2026-07-06.md`](../../planning/retrospectives/retro-2026-07-06.md) §4; [`2026-07-06-groups-first-load-perf.md`](../../planning/hub-v2/2026-07-06-groups-first-load-perf.md) §5.3

## Amendment 1 — cold operationalized, tail rule, per-cycle spot check

**Status:** Accepted
**Date:** 2026-07-09

The 2026-07-09 cold-load regression analysis ([`2026-07-09-cold-load-regression-analysis.md`](../../planning/hub-v2/2026-07-09-cold-load-regression-analysis.md)) exposed a measurement gap: the protocol required "cold + warm scenarios" without defining cold. The J-A area waterfall (2026-07-07) passed its cold scenario on samples taken ~30 minutes after deploy during an active session (~1.4 s); a timer-enforced 22.5-minute-idle pass on the same route measured **4 690 ms TTFB with 614 ms in-function** — a shallow-cold false pass. Deep-cold measured 3–5 s in every ≥15-minute-idle sample on record.

Three protocol changes:

1. **Cold is defined.** A cold-scenario run requires **≥ 20 minutes of zero traffic** on the production deployment (timer-enforced; the Hub's own pages and API both count as traffic, and no synthetic warm-up traffic may run in the window — the keep-warm pinger this clause originally required pausing was retired 2026-07-10, ADR-U036 Amendment 2). Every recorded cold number states its idle depth. Fresh-deploy and active-day samples are *shallow-cold* — reportable as their own labelled class, but they do not satisfy B1/B2 cold scenarios.
2. **Tail rule.** Cold costs are bimodal under concurrent fan-out (one request rides the fresh instance; another can draw a second multi-second boot — measured 4 162 ms vs 423 ms fired concurrently). In addition to "every run within budget": **no single request in any cold run may exceed 2× its scenario budget.** A tail draw is a failure, not noise.
3. **Per-cycle spot check.** Any cycle that adds or reroutes a request on a user-facing first paint runs **one deep-cold spot measurement** of the touched page before `6-done` (one scenario, one page — not the full gate; the area gate remains the full pass). This closes the window where an area ships user-visible for days before its gate.

Enforcement-home updates required (tracked, separate nods where carved out): the `feature-development` skill's Performance DoD rows gain the idle-depth + spot-check lines; the hub-v2 per-area gate checklist gains the tail rule.
