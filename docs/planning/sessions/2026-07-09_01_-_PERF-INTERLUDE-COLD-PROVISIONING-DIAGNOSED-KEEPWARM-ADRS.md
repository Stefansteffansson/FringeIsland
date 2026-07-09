# Session bridge — 2026-07-09_01 — Perf interlude: cold-provisioning diagnosed, keep-warm shipped, ADR decisions

**Session class:** development paused for a performance interlude (Stefan's call after feeling the cold-load regression return). Hub v2 Phase 3 state unchanged: Journeys area J-A..J-D `6-done`, **J-E remains**, J-O3 area gate after J-E.

## What happened

1. **Diagnosis** — live measured (ADR-U043 protocol + enforced-idle extension): the felt 4–7 s cold loads are a **runtime-agnostic environment-provisioning wave** (~2.5–4.7 s before any function code runs) paid by the first request(s) after ≥15–20 min of zero traffic, bimodal under concurrent fan-out. Route code, DB, region, and all 07-06/07-07 fixes verified intact. Full analysis: [`../hub-v2/2026-07-09-cold-load-regression-analysis.md`](../hub-v2/2026-07-09-cold-load-regression-analysis.md) (§1–§5 diagnosis, §6 A/B + validation).
2. **PR #148 (merged)** — probe twins `/api/perf/probe-edge|node` + `x-proxy-timing` middleware header; red-first, 668/668 unit, build green. The A/B **acquitted the runtime class** (Edge vs Node identical shallow-cold; deep-cold spread is lottery variance) and localized the cost pre-function.
3. **Keep-warm validated** — an unauthenticated ping provisions the heavy path itself (3 735 ms, in-function 4 ms); authenticated requests 20 s later: ~1.2 s worst-case. The 07-06 Phase-3.5 "fast cold 401s" reinterpreted (they hit still-warm infra).
4. **PR #149 (created, merge pending)** — `.github/workflows/keep-warm.yml`: GitHub Actions `*/5` ping to `/api/me/overview` (Hobby crons daily-only; public repo → free minutes) + analysis doc §6.
5. **PR #150 (created, merge pending)** — **ADR-U036 addendum** (premise revised, Edge decision stands, no perf-forced migration; edge→Node deferred to Vercel's deprecation clock) + **ADR-U043 Amendment 1** (cold = ≥20 min enforced idle with depth recorded; 2× tail rule; per-cycle deep-cold spot check on first-paint route changes). Both nodded by Stefan.

## Decisions (all Stefan's, this session)

- Perf interlude before J-E (board sequencing 1→2→3: keep-warm, vendor A/B, protocol amendment).
- Keep-warm as a standing automation (board item 1). ADR-U036 addendum + ADR-U043 Amendment 1 (board items 2+3).
- L3 (OverviewBoot on all authed paths) **parked** — cheap fan-out once the environment stays warm.
- L4 (Journal retrofit: session cache + skeleton — B4/B6 conformance) — **next-cycle rider**, done properly as a FEAT-H011 revision.
- Probe twins stay ~2 weeks as instrumented canaries, then removed with their `NODE_GETS_REVIEWED` entry (tied to the U036-addendum close-out).

## Open items / next session

- **Merge state:** #149/#150/#151 (this bridge) pending Stefan's merge nods at session close — verify keep-warm's first runs after merge (`gh run list --workflow=keep-warm`; expect 401 + `x-proxy-timing` in the step log).
- **B1 confirmation walk:** Stefan's live morning sign-in after keep-warm has run overnight — expect the ~1.5–2.5 s class (auth exchange ~1.0 s vendor floor dominates).
- **Enforcement homes for Amendment 1:** `feature-development` skill Performance DoD rows (skill edit — carve-out, needs its own nod) + hub-v2 area-gate checklist tail rule.
- **Cold measurements from now on must pause the pinger** (Amendment 1 wording covers this — disable the workflow or wait out a gap).
- **J-O3 area gate** (after J-E) runs under the amended protocol.
- Memory updated: `measure-real-path-not-proxy` extended with the shallow-cold trap (idle depth must be stated for any cold number).

## Key numbers (for the retro)

Deep-cold before: overview 4 690 ms TTFB (614 ms in-function); journeys pair 4 162/423 ms. Post-provisioning: fresh instances ~34 ms; warm 159–280 ms. After keep-warm: worst-case ~1.2 s, typical warm class. Fresh-deploy shallow-cold: ~2.2 s both runtimes.
