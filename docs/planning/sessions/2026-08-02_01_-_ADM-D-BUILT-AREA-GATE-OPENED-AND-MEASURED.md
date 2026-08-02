# Session bridge — ADM-D built + closed; the A-ADM area gate OPENED, measured, and HELD on four ordered legs

**Date:** 2026-08-02 · **Wave:** Ferd · **Area:** A-ADM (Platform-Ops) — **all four cycles closed; the area's BUILD SCOPE IS COMPLETE; the gate is OPEN and HELD**
**Follows:** [`2026-08-01_04_-_ADM-C-BUILT-AND-CLOSED.md`](./2026-08-01_04_-_ADM-C-BUILT-AND-CLOSED.md)

---

## READ THIS FIRST — the next session is the GATE-CLOSE session, four legs in this order

The canonical gate state lives in the [area-gate record](../hub-v2/2026-08-02-platform-ops-area-gate.md) (checklist sweep, W12+GC-14 roll-up over all 27 area functions, B-ADMIN-001..019 disposition — all executed; measurements executed with one carried finding). The gate closes on, **in this order (Stefan's sequencing, 2026-08-02)**:

1. **The commissioned warm investigation** (Stefan's call, recorded in the gate record §Measurements): the two admin *detail* pages' fresh-context full loads cross the 1.0 s B3 ceiling in 3 of 5 runs (member detail 1 127/1 060 ms, report detail 1 036 ms). The API reads are already fast (2 reads, slowest 231–302 ms warm); the wall lives in bundle + hydration + an "unaccounted" slice up to ~500 ms. Template: the [A-NTF 937 ms investigation](../hub-v2/2026-07-28-antf-warm-ceiling-investigation.md) — that one REFUTED its suspected lever by measurement; start from the waterfall, not a hypothesis. Full numbers: [measurement record](../hub-v2/2026-08-02-adm-gate-measurements.md).
2. **The deferred-five per-row calls** (gate record §The deferred five, plain language ready): ADM-7 → Eid? · ADM-13 → when G-29 closes? · ADM-14 → dated trigger, no entry? · ADM-15 → Phase-4 planning? · ADM-17 → Eid? Each row: Eid backlog entry as proposed, or re-scope.
3. **The two process-question verdicts** (gate record §The two process questions, recommendations in place): E2E-joins-post-apply-verification; the mutations-durable/reads-mirror-only telemetry criteria.
4. **Stefan's live walk** (production is clear — the measurement fixture is fully torn down; write the walk script on request; eight surfaces: `/admin`, groups+detail, members+detail, moderation+detail, audit).

**Then the gate-close tail:** area retro (ADM-C + ADM-D retros fold in — standing decision) · task sweep (the `done` set enumerated in the gate record) · **doc-health-check OWED** (ADM-D close is the cycle boundary the ADM-C bridge deferred to) · then the **AB-6 FULL anatomy audit** (carrying the ADR-U052 absorption) opens as the Phase-4 cutover's entry condition.

## One-paragraph state

ADM-D ran gate-to-gate in one arc: decomposition (board DB-1..DB-8 "go with recommended", PR #375) → PC022 red 27/29 → gate #376 applied (`20260802120000`) → **the platform conformance gates caught two real things at first post-apply contact** (the trigger-function EXECUTE leak; five core-to-domain edges under ADR-U047 rule 3) → rider #377 (`20260802170000`: sealed DS-5 `ds5_moderation_*` primitives under thin PC-4 wrappers — the COR-A relocation pattern; signatures byte-identical) → post-rider admin+platform **9/9 suites 124/124**, account 83/83 (AB-4 export live at schema_version 2), notifications 106/106, communication 107/107 → H037 red-first at the unit tier (4 suites red → 85/85; full unit 1147/1147; gates zero-exception; `next build` green; E2E 6/6 labelled test-after, leak delta 0) → docs close (#378: both specs 6-done, plan v8, changelogs). The **area gate opened** (#379: checklist sweep, W12+GC-14 over 27 functions, B-ADMIN disposition) and the **ADR-U043 pass executed** (#380): cold 3 638/4 395 ms across two 22.5-min enforced-idle windows (provisioning-dominated; extends the standing exception; better than the ~5.5 s A-NTF era), warm 415–964 ms PASS everywhere except the detail-page carried finding above. NTF-6's moderation-decision leg closed; the audit client-write door dropped; sanction-communication kinds → Eid (DB-4, dated pointers in both ADM-C specs).

## Watch-items (hard-won this session, new)

1. **ADR-U047 rule 3 has no core-to-domain license — the relocation pattern is the fix.** A PC-4 contract touching a DS table gets split: sealed DS-owned primitive (explicit manifest entry — the `ds{N}_lifecycle_` auto-prefix is reserved for lifecycle handlers, don't borrow it) under a thin PC wrapper (wall + vocabulary + audit). EXECUTE revoked from all client roles on the primitive; the wrapper's owner execution is the only door.
2. **Trigger functions leak EXECUTE by default** — CREATE FUNCTION grants PUBLIC; the anon-execute-lockdown gate catches it, but write the `REVOKE ... FROM PUBLIC, anon, authenticated` in the same migration (the notify_* class precedent, `20260725120000:156`).
3. **The admin contracts' target id-space is `public.users.id`** — `TestUser.user.id` is the AUTH id and they differ; fixtures resolve profile ids explicitly (four suite cells failed on this).
4. **A state-conditional testid is not a completion selector** — `state-badge` renders only for non-active members; the perf harness watched a fully-loaded page time out ×3. Data-derived AND unconditional (`membership-row-*`).
5. **A long-running dev server can hold a poisoned compile-worker pool** ("Jest worker encountered 2 child process exceptions") — every NEW route 500s while old routes serve fine; reads as a code fault until the overlay is read. Restart fixes it in one run.
6. **MSYS eats leading-slash args and silent pipelines eat exit codes**: `/admin` → `C:/Program Files/Git/admin` without `MSYS_NO_PATHCONV=1`; `PERF_ENV` is the env-FILE path; and `cmd | grep | tail` returns tail's 0 — three dead measurement runs before the first number landed. Run the control before believing a silent run.
7. **Append-only + fixture cleanup = null-actor rows accumulate**: cleaned-up operators SET-NULL their audit rows' actors; platform-wide "no null-actor" pins are cross-run-hostile — scope such pins to the run's own targets.

## Decisions made this session

1. ADM-D board DB-1..DB-8 settled ("go with recommended"); DB-4 resolved CB-1's activation clause — sanction-communication kinds → Eid.
2. Named approvals honoured: #376 ("merge 375, go on with ADMD-01" preceded it; gate applied on "please merge, apply, verify…"), #377 ("merge 377 + apply the rider"). Fuller-auto for #378/#379/#380.
3. Two AC topology corrections to PC022 at build prep (the J-C class): erased-reporter row-CASCADE; tombstone-keeps-author.
4. **The warm investigation is COMMISSIONED** (Stefan, 2026-08-02) — gate leg 1, next session.
5. Gate-leg ORDER fixed by Stefan: investigation → deferred-five → process questions → live walk.

## PR ledger

#375 decomposition (held → named merge) · #376 PC022 gate (held → named approval → applied `20260802120000`) · #377 rider (held → named approval → applied `20260802170000`) · #378 H037 build + docs close · #379 area-gate record · #380 measurement pass (all fuller-auto post-approval).

## Verification at close

PC022 gate suite 29/29 · admin domain 101/101 · platform conformance 23/23 · account 83/83 · notifications 106/106 · communication 107/107 · full unit 1147/1147 · `next build` green · E2E admin-moderation 6/6 (leak delta 0) · migrations `20260802120000` + `20260802170000` applied + repaired · FEAT-PC022 + FEAT-H037 `6-done` (frontmatter + both §L4s + both READMEs in sync) · TASK-ADMD-01/02 `done` · perf fixture torn down (report deleted, FIM de-elevated + erased) · ledger row appended.

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [ ] doc-health-check — **OWED, deliberately deferred to the gate-close session** (it belongs with the retro + task sweep; recorded in READ THIS FIRST)
- [x] Discovery sweep — run at close
- [ ] ADM-C + ADM-D retros — fold into the area retro at the gate close (standing decision)
