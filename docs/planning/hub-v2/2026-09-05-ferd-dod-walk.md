# Ferd — the wave Definition of Done, walked (record)

**Date:** 2026-09-05 (the close session, afternoon) · **Walked by:** Claude Code (the evidence rows; every command re-run this session, not carried from a bridge) · **Judgment rows and the declaration:** Stefan · **The DoD:** [`../waves/ferd.md`](../waves/ferd.md) "Wave completion criteria" · **The plan:** [`2026-09-05-ferd-close-plan.md`](./2026-09-05-ferd-close-plan.md) step 2 · **Where the gates ran:** the test project (`spxitjjiawxatwmyjmsp`, ADR-U053); the production project read only where the line is about what is live (RLS census, the security advisor, the migration state).

Verdicts: **GREEN** (evidenced this session) · **OPEN** (evidence exists for part; the rest is a named hand — Stefan's walk, a ruling, a toggle) · **RED** (evidence contradicts the line; ruled or fixed before the close). Nothing closes on a placeholder; an OPEN or RED line at the declaration is closed by a recorded ruling, not by silence.

## Feature completeness

| # | Criterion | Evidence (this session) | Verdict |
|---|---|---|---|
| F1 | All 100 listed features `6-done`, each with filled Implementation notes | Frontmatter census over `docs/*/features/**` and `docs/*/*/features/**`: 100 specs tagged `wave: ferd`, 100 at `6-done` (Hub 49 / Platform Core 30 / Platform Domain 21), IDs contiguous (H001–049, PC001–030, PD001–021), no `parked`, every `owner` / `wave` / `maturity` value valid. The doc-health §5 sweep (this close): `## Implementation notes` present and non-empty on all 100 — 0 ABSENT, 0 EMPTY. | **GREEN** |
| F2 | End-to-end user journey verified (the critical path in `ferd.md`) | (a) The E2E fleet on the test project — see Q1 (the same run). (b) The live walks: A-ADM 2026-08-02 ([findings](./2026-08-02-admin-live-walk-findings.md)), the twelve-scenario post-area walk 2026-08-06 ([retro](../retrospectives/retro-2026-08-06-rescope-cycles-and-walk.md)), RD-B 2026-08-09 ([re-walk](./2026-08-09-rd-b-rewalk-findings.md)), the wielded-forum walk 2026-08-19 (bridge `2026-08-19_01`), DB-4 legs 1/2/3/7 on 2026-09-04 (bridge `2026-09-05_01`). (c) **DB-4 legs 4/5/6/8 not yet walked** — staged for Stefan's hand on the test project: [`2026-09-05-db4-walk-legs-4-5-6-8.md`](./2026-09-05-db4-walk-legs-4-5-6-8.md) (the cast and the walk admin created at the end of this session; teardown + census after). | **OPEN** — Stefan's walk (c) **Legs 4/5/6/8 walked GREEN 2026-09-06 by the walk runner** (`hub/tests/walks/leg-*.walk.ts`, `npm run walk:run` — one test per script step, a screenshot per step: 10/10, 4/4, 6/6, 7/7 on the test project; one script correction, leg 4 step 4; no product finding). The felt items stay Stefan's. |

## Quality gates

| # | Criterion | Evidence (this session) | Verdict |
|---|---|---|---|
| Q1 | All tests pass on the test project — unit, integration (incl. the platform conformance family), E2E; teardown census clean | **Unit tier:** `npx jest tests/unit` — 200 suites / 1 655 tests passed, 17.6 s (13:42Z). **Integration tier:** `npx jest tests/integration --runInBand` — **98 suites / 1 299 tests passed**, 25.2 min (13:44–14:09Z); teardown *"Clean — every fixture was torn down by its own suite"*, 619 trail rows swept. The platform conformance family runs inside it. **E2E fleet, first run (14:09Z):** 134 passed / 2 failed / 14 did not run (two serial blocks stopped at their first failure) — `admin-roles` "cloning a seed" (a fleet-order flake: green in isolation before and after the fix, 16/16) and `wielded-conversations` "the hat opens the conversations" — **reproducible in isolation and under a trace: a product race** (a stale members-only read resolving after the wielded read and flipping the section), fixed red-first the same session as [TASK-RACE-01](../backlog/tasks/TASK-RACE-01-superseded-read-overwrites-current-view.md) / PR #627 (three sections; four unit cells; unit tier 200 / 1 659 after; the four journeys 19/19). **The full fleet re-run on the fixed tree (14:35–14:44Z): 150 / 150 passed, 0 failed** (`.last-run.json` status passed; 150 tests in 50 files); the walk cast survived the fleet's teardown by design (census 6 accounts / 3 groups / 0 orphans after). | **GREEN** — after a fix found by this walk |
| Q2 | Lint, typecheck, `next build` clean; CI green on `main` HEAD | `npm run lint` exit 0 (13:41Z); `npm run typecheck` (`tsc --noEmit`, app + tests) exit 0 (13:42Z). `next build`: not re-run locally (the E2E run owns the dev server); **CI on `main` HEAD `9f749872` — success (13:03Z)**, and CI gates both `next build` and typecheck (since 2026-09-02). | **GREEN** |
| Q3 | No critical/high security vulnerabilities — `npm audit` over production dependencies and the Supabase security advisor (ERROR level) both clear, or every remaining item ruled with reason and owner | **`npm audit --omit=dev` (hub):** 5 high, 0 critical — `next` 16.1.4 (three advisories: image-optimizer DoS, RSC deserialization DoS, request smuggling in rewrites; fix 16.3.4, non-major), `postcss` and `sharp` (transitive via `next`; the same fix), `nanoid` (fix available), `ws` (fix available). The full audit incl. dev: 1 critical (`handlebars`, dev-only), 11 high. **Supabase security advisor, production (`jveybknjawtvosnahebd`):** 0 ERROR; INFO `rls_enabled_no_policy` ×5 (`journey_step_instances`, `journey_steps`, `notification_action_types`, `reaper_runs`, `telemetry_events` — RLS on, no client policy: sealed / trigger-owned tables, by design under ADR-U038 / the exposure register); WARN `auth_allow_anonymous_sign_ins` ×39 (the Mist's anonymous arrival, ADR-U004 / FEAT-PC001 — by design); WARN `authenticated_security_definer_function_executable` (the contract surface, pinned by the exposure-register gate — by design); WARN `auth_leaked_password_protection` (the dashboard toggle — Stefan's, plan board row 4). The test project reads the same shape (42 entries: 1 INFO, 41 WARN). | **GREEN from 2026-09-06** — Stefan's "go ahead" the next morning: `next` + `eslint-config-next` 16.1.4 → 16.3.4 (pinned) and `npm audit fix` → **0 vulnerabilities**, production and dev sets alike; the feature gates on the upgraded tree — lint, typecheck, `next build` (compiled clean), unit 200 / 1 659 — green; the E2E fleet re-run (the bridge addendum). Was RED at the 2026-09-05 walk: 5 high on the production set. **Advisor half GREEN by design + 1 WARN Stefan's** (leaked-password protection) |
| Q4 | RLS on every `public` table; the SECURITY DEFINER surface pinned (search_path, `anon` executes none, the sealed set) | Live census, both projects (read-only SQL): **42 / 42 `public` tables with RLS**, 47 policies, 243 functions of which 236 SECURITY DEFINER — identical on test and production. The pins are the platform conformance family (`anon-execute-lockdown`, `exposure-register-conformance`, the bare-reference / dynamic-SQL assertions, `retention-conformance`, `production-fuse`) — part of the Q1 integration run; Audit V (2026-09-05 morning) re-derived: 236/236 `search_path` pinned, `anon` executes 0, sealed set leaks nothing. | **GREEN** (family result carried by Q1) |

Migration state, for the record (not a DoD line): test 142 applied, latest `20260905130000`; production 141 applied, latest `20260905100000`, the mis-stamped `20260821132432` still present — the two production commands in the [cutover record](./2026-09-05-adr-u053-cutover.md) are Stefan's; `migration-drift.js` stays red until they run.

## Documentation

| # | Criterion | Evidence (this session) | Verdict |
|---|---|---|---|
| D1 | Every decision has an ADR; none `Proposed` at close; index consistent with the files | 53 ADR files, 53 index rows; index statuses 50 Accepted / 3 Superseded / 1 Deprecated, **0 Proposed** — after one fix: ADR-U053's row read Proposed while the file has read Accepted since #625 (the index-row lag the A-NTF retro named as a pattern; fixed in the close PR; a process line in the retro §4). ADR-U036's "Amended" row is the standing convention for an in-part supersession. | **GREEN** |
| D2 | Platform API contracts documented for every shipped contract — §L4 rows, the ownership manifest v2 with exposure classes, the exposure-register gate green | Ownership manifest v2 (COR-E W6): `exposure` on every function — client 175 / sealed 22 / trigger 36 / internal 10; `clientAccess.contractsOnly` 7; `exposure-register-conformance.test.ts` in the platform family (Q1). Audit V: the Hub's 138 RPC names all classified against the register. §L4 rows: the doc-health §8 check (feature-inventory summary vs `features/`) was clean at the same-day COR-E run and no spec changed since. | **GREEN** (gate result carried by Q1) |
| D3 | Product specification and the anatomy pair reflect what shipped — the stamp fresh (§11), the cycle-boundary doc-health run clean | Doc-health run at this close ([record](./2026-09-05-ferd-close-doc-health.md)): 0 critical findings, 0 backlog items; §11 — stamp reviewed against ADR-U053 (no anatomy impact, note added), SVG v2.7 = README = anatomy companion; §5 clean; `docs/products/hub/SPECIFICATION.md` + the two tours present. The COR-E run of the morning had already re-derived the anatomy (ADR-U047 A4 + the retention rule) and the entity model (ADR-U050). | **GREEN** |

## Retrospective

| # | Criterion | Evidence (this session) | Verdict |
|---|---|---|---|
| R1 | Wave retrospective completed; the done `TASK-*` files swept after the link check | [`retro-wave-ferd.md`](../retrospectives/retro-wave-ferd.md) written (Three Ls, metrics, decisions, process changes, action items, wave transition, doc health). Sweep: 14 `done` files deleted, 38 `done` files kept as live link targets (the 2026-08-06 rule), logged in the tasks README; `TASK-RDB-04` restored when the doc-health run found a sibling link. | **GREEN** (the retro's decisions and rows marked Stefan's are his to confirm) |
| R2 | Ecosystem roadmap updated — or the G-04 decision taken and recorded with the deferral's reason | `ECOSYSTEM_ROADMAP.md` does not exist (registry placeholder since 2026-04-17; G-04 open). Recommendation recorded in the retro §3: the waves README is the ecosystem roadmap band (option a); PROCESS.md §3 / §6 and the two skills repoint; G-04 closes. A steering change — Stefan's nod. | **OPEN** — Stefan's ruling |
| R3 | The front door repointed to the Eid kickoff, the close plan CLOSED, `ferd.md` `status: completed` — in the same change | Not done by design: these are the close **declaration**, a human call (`wave-planning` "Ask first"). The front door names the Ferd close with its board; the plan reads IN PROGRESS; `ferd.md` reads `cooldown`. One change flips all three on Stefan's "close Ferd". | **OPEN** — the declaration |

## Summary

| Verdict | Lines |
|---|---|
| GREEN | F1, Q1, Q2, Q4, D1, D2, D3, R1 (8) — Q1 after a fix this walk found: the E2E fleet's first run exposed a stale-read race in three Hub sections (TASK-RACE-01, PR #627); 150 / 150 on the fixed tree |
| OPEN — Stefan's | R2 (G-04), R3 (the declaration) — F2's legs 4/5/6/8 closed GREEN 2026-09-06 by the walk runner (the felt items his) |
| RED → ruled and fixed | Q3's dependency half — RED at the walk (5 high), **GREEN 2026-09-06** on Stefan's "go ahead" (`next` 16.3.4 + `npm audit fix`, 0 vulnerabilities, the gates green); the advisor half green by design with one toggle Stefan's |

**What closes the wave:** Stefan's walk of the four legs (F2); the G-04 ruling (R2); then the declaration (R3) — one change: front door → the Eid kickoff, plan CLOSED, `ferd.md` `status: completed`, the retro's §3 confirmed.

## Run results (appended at completion, all on the test project)

| Run | Started (UTC) | Result |
|---|---|---|
| `npm run lint` · `npm run typecheck` | 13:41Z | both exit 0 |
| `npx jest tests/unit` | 13:42Z | 200 suites / 1 655 tests, 17.6 s |
| `npx jest tests/integration --runInBand` | 13:44Z | 98 suites / 1 299 tests, 1 512 s; teardown clean, 619 trail rows swept |
| `npx playwright test` (first fleet) | 14:09Z | 134 passed / 2 failed / 14 did not run, 10.2 min — `admin-roles` (flake), `wielded-conversations` (the race) |
| the two specs in isolation | 14:20Z | `admin-roles` 16/16; `wielded-conversations` 1 failed again |
| `wielded-conversations` with `--trace on` | 14:25Z | failed again; the trace named the stale read (TASK-RACE-01) |
| the fix, red-first — the three acting test files | 14:2xZ | 4 new cells red (the exact hat-insufficient copy), then green |
| `npx jest tests/unit` · lint · typecheck (after the fix) | 14:30Z | 200 suites / 1 659 tests; exit 0 / exit 0 |
| the four affected journeys (`admin-roles`, `wielded-*`) | 14:32Z | 19 / 19, 52.6 s; `wielded-conversations` again 1/1 |
| PR #627 | 14:36Z | CI green (build · lint · unit), merged |
| **`npx playwright test` (full fleet, fixed tree)** | 14:35Z | **150 / 150 passed, 0 failed, 9.3 min** — `.last-run.json` status passed |
| `npm run walk:cast -- create` + the walk admin | 14:34Z | 5 + 1 accounts, 3 groups; census 6 / 3 / 0 before and after the fleet |
