# Retrospective — the Platform-Ops area (A-ADM): built, gated, walked, CLOSED

**Date:** 2026-08-03 · **Scope:** the whole area (cycles ADM-A → ADM-D) + the gate-close session. Folds the ADM-C and ADM-D cycle retros per the standing decision (cycle retros fold into the area retro). Companion: the [area gate record](../hub-v2/2026-08-02-platform-ops-area-gate.md) (CLOSED) and the [walk findings](../hub-v2/2026-08-02-admin-live-walk-findings.md).

## What the area shipped

Phase 3's sixth and last area, gate-to-gate: the observability foundation (PC018 telemetry store + statistics, PC019 durable auth-event audit — "emits well, stores nowhere" ended) · group administration (PC020/H035 — enumeration incl. the caretaker subset, suspend/reactivate, reassignment out of caretakership) · member administration (PC021/H036 — the full lifecycle rail: suspend, decommission, hard-delete, force-logout, platform exit, grant/revoke platform admin, the last-DeusEx floor) · moderation + audit surfaces (PC022/H037 — the report store's admin plane, resolve ceremony with reporter notification, the audit log read). Twenty-seven area-born or re-issued functions, all manifest-classified at birth, all composed into named consumers (W12+GC-14 roll-up). Ten feature specs `6-done`. The area gate CLOSED 2026-08-03 with all four legs executed.

## What went well

1. **The gates caught real things at first contact, twice** — the trigger-function EXECUTE leak and the core-to-domain edges (ADR-U047 rule 3) both stopped at the conformance wall, and the relocation pattern (sealed DS primitive under a thin PC wrapper) came out of the refusal, not out of design foresight.
2. **The live walk earned its place in the gate.** Twelve findings (W-1..W-12), several invisible to every automated tier: the suspended-group toothlessness (W-3), the members-list input stall at real-world scale (W-5), the admin-entry cache bleeding across users bidirectionally (W-9), the doppelganger mis-grant (W-4 — caught and corrected through the audit trail + revoke ceremony within minutes, which is itself the system working). The walk also left production cleaner: admin roster 7 → 2, nine relic reports resolved.
3. **The measurement discipline paid compound interest.** The ADR-U043 pass flagged detail-page crossings; the commissioned investigation refuted the "bundle + hydration" framing by waterfall (the A-NTF template's lesson holding a second time) and attributed the crossings to the harness's own completion waiter — producing Amendment 2 (dual signal) and un-carrying the finding in the same stroke.
4. **Honest copy held everywhere it was checked**: the suspend ConfirmModal promises exactly what suspension does; the resolve panel states the reporter-privacy contract at the point of action; the drift-honesty render tells the truth about vanished content; the duplicate-report refusal says why.

## What to learn (carried forward)

1. **"Status already flows through member-facing reads" was an assumption, not a fact** — PC020 wrote the escape clause ("if a read turns out status-blind, record it as a finding") and the walk cashed it. Lesson: when a spec's enforcement story is "the existing paths pick it up," name ONE path and prove it in the gate suite; the refusal matrix for a state must be written down before the state ships.
2. **Session-scoped client caches must be user-scoped** — `hub.adminEntry` (W-9) is the type specimen: cached per tab, inherited across sign-in boundaries, never invalidated on grant/revoke. Rule of thumb going forward: any client cache keyed by nothing is keyed by the wrong thing.
3. **A list without a bound is a latent stall** — 1 900 rendered rows turned field-focus into a ~10 s system-affecting freeze on real-world Windows (OS-side input/accessibility consumers walk the DOM; clean-renderer cost was ~50 ms). The B-PERF "pagination when a measurement asks" clause has been answered by a felt measurement. Bounded rendering is the default from here; unbounded needs the justification.
4. **The elevation-fixture leak class survived its own fix** — TASK-INT-05 closed the group-leak variant in the ADM-B opener; the walk found four leaked DeusEx *memberships* from suites (2026-07-06..08-01). Fixture teardown that grants standing must revoke it in the same teardown, and the conformance idea "no fixture holds admin at rest" is worth a gate check.
5. **ADM-C's watch-items stand confirmed in anger** (folded per the standing decision): the sibling-assertion sweep went four-for-four on catches its authors' tests missed; the rolled-back forged-claims technique is the reusable shape for floor/last-row proofs; `ConfirmModal` carries no children — type-to-confirm stays bespoke; test FIMs are consented and the 23503 RESTRICT is doing its job.
6. **ADM-D's watch-items stand confirmed** (folded): the ADR-U047 relocation pattern; trigger functions leak EXECUTE by default — revoke in the same migration; the admin contracts' id-space is `public.users.id`, never the auth id; a state-conditional testid is not a completion selector; MSYS eats leading-slash args and silent pipelines eat exit codes (paid again TWICE this session — the probe-round grep and the findings-commit cwd).
7. **The harness is part of the measurement** — the locator waiter added ~300–470 ms bimodal past paint and produced every "ceiling-hugging" number of the last three gates. Amendment 2 (verdicts read the box signal) is the fix; the meta-lesson: when a number surprises, suspect the stopwatch before the runner.

## Decisions recorded at the gate close

Carried finding CLOSED harness-attributed (B3 PASS on true completion) · ADR-U043 Amendment 2 ADOPTED (#384) · deferred five CALLED: ADM-13 activates with G-29, ADM-14 dated trigger, ADM-15 Phase-4 planning, **ADM-7 and ADM-17 re-scoped INTO Ferd** (post-walk, one shared decomposition board; ADM-17 skeleton recorded in the gate record) · both process questions ADOPTED (E2E-joins-post-apply; mutations-durable/reads-mirror-only) · **Stefan's fix directive (2026-08-03): the stall/cache family W-5/W-7/W-8/W-9/W-10 is committed fix work** — placement at the ADM-7/17 board (admin-plane rows) and the Identity/account area (member-side rows) · W-3 needs the suspended-refusal matrix defined before enforcement · W-11/W-12 join the moderation family's Eid pile.

## Task sweep (executed at this retro)

Deleted as `done`: TASK-ADMA-01..05, TASK-ADMB-01/02, TASK-ADMC-00/01/02, TASK-ADMD-01/02, TASK-OBS-01, TASK-INT-05, TASK-DOC-007/008 (16 files). Open and carried, unchanged: TASK-DBT-01 (Eid), TASK-DBT-02 (COR-C E2E adjudications — no state change observed this area), TASK-INT-01..04, TASK-E2E-01, TASK-FORUM-01, TASK-H017-01, TASK-I18N-01 (Eid), TASK-MIST-01, TASK-DOC-003/004/005.

## What's next (the queue as it stands)

1. **The ADM-7 + ADM-17 decomposition board** — bulk actions + role-template editing, absorbing the fix-directive rows that live on the admin plane (W-5 bounded list is ADM-7's selection substrate) and the W-3 refusal-matrix decision.
2. The member-side fixes (W-7 revalidation, W-8 typed-refusal surfacing, W-9 cache scoping, W-10 wall exit) — placed at the board, likely a small Hub hygiene cycle.
3. **AB-6 FULL anatomy audit** (carrying the ADR-U052 absorption) — the Phase-4 cutover's entry condition, after the re-scoped builds.
4. Fixture-hygiene planning (the W-2 pile: ~2 015 test users / 3 612 groups / relic reports / doppelgangers / stale invitations) — pre-launch data hygiene, scheduled by the phase-3 platform-ops plan's owner.

## Doc health (cycle-boundary audit, run 2026-08-03 — all 11 sections)

Delta audited: ADM-C, ADM-D, the gate + its five records (baseline: 2026-08-01). **Two criticals, both introduced by this cycle's own documents — BOTH FIXED in the gate-close PR:**

1. `phase-3-platform-ops-completion-plan.md` still presented ADM-7/ADM-17 as deferred-to-Eid in five places (capability table, deferred register, exit checklist, Phase-4 handoff) — superseded by the gate's re-scope and load-bearing for the upcoming board. Fixed with dated supersession notes; the gate record §The deferred five is canonical.
2. Three `../../hub/scripts/…` links in the two 2026-08-02 measurement docs resolved one level short (citation-by-inference — the A-NTF sibling had the correct depth). Fixed.

**Soft flags (one class — index/snapshot lag; all fixed):** hub-v2 README indexed none of the five new gate documents (now indexed, and the stale "Platform-Ops next" phase row updated to the close); reference README omitted `ANATOMY-CONFORMANCE-AUDIT-3.md` + `PERF-MEASUREMENT-LEDGER.md` (added); `FOLDER_STRUCTURE.md` carried 322 retired-tree paths with no staleness banner (banner added; the snapshot stays historical-only).

**Re-find (escalated, second consecutive boundary, carried by the registered AB-6 FULL audit):** the anatomy stamp remains at U048A1/U051A1 — ADR-U052 (anatomy-relevant) still unabsorbed, now joined by ADR-U043 Amendment 2 (measurement-method only, no anatomy impact). AB-6 carries both.

Everything else clean: terminology/architectural drift 0 active directives · schema drift 0 (5 migrations, each spec-cited) · 75 `6-done` specs with 0 empty Implementation notes · feature inventories 37/22/16 all matching · CLAUDE.md cascade 28 files, 0 broken load-order pointers · graduation tracker complete · 0 parked items.
