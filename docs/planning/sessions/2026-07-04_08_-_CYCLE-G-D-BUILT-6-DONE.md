# Session bridge — Cycle G-D built and closed (FEAT-PC013 + FEAT-H016 `6-done`)

**Date:** 2026-07-04
**Session type:** Build session (`feature-development`) — same session as the G-D decompose (bridge `2026-07-04_07`; its PR #70 merged on Stefan's nod). Platform-first through the schema gate (PR #71, nodded + merged), then the Hub half to `6-done`.
**Status:** **Cycle G-D complete.** MEM-4/5/6 live end-to-end.
**Participants:** Stefan (two merge nods: PR #70 decompose batch, PR #71 schema gate) + Claude

---

## Gate resolution (Stefan, this session)

PR #71 accepted with the nod: Open Q1 (`leave_group` replaced in place — G-E exits refused honestly), Q2 (the two member-exit DELETE policies dropped; admin pair untouched), Q3 (paused rows for management-key holders only), Q4 (self-targets refused — leave is the self-exit); plus the two build amendments (management keys imply member-list visibility; the non-engagement refusal reordered to `P0002` — visibility precedes type, ids stay unenumerable) and the `leave_group` EXECUTE-to-PUBLIC hygiene revoke (grant-audit finding, standing since sprint2).

## What was built

- **Platform (FEAT-PC013, migration `20260704192549`):** `pause_member` / `activate_member` / `remove_member` + the internal-only `active_steward_count()`; `leave_group` **replaced in place** (regular exit, house no-leak refusals; sole-active-Steward and last-member refused with actionable copy — the G-E re-entry points); `get_group_detail` additively amended (`membership_status`; paused rows gated); the policy narrowing behind a `pg_policies` name-guard. **No new table, no trigger changes.** Pause semantics cost zero resolution changes — `has_permission()` already filters `status='active'` (oracled); roles survive a pause and simply resolve again on reactivation.
- **Hub (FEAT-H016, no migration):** member-row **Pause / Reactivate / Remove** (three independently-gated keys off the my-permissions read; Paused badge from the payload; one lifecycle ConfirmModal, Remove destructive) and **Leave group** for every member — never hidden client-side; the 409 message passes through verbatim so the Surface renders the honest G-E copy in place. No new page, no new read; mutations ride the existing four-read refresh path.

## Findings worth carrying

1. **The plan's premise held for leave only** (carried from the decompose, confirmed at build): removal had **no cascade** (raw RLS DELETE — no freeze, orphaned role rows) and pause had **no write path**. The decompose-session substrate audit is earning its keep — this is the second cycle running where the audit corrected a plan-level assumption.
2. **The last-leader trigger counts raw role rows** — blind to status flips and paused Stewards. PC013 guards last-*active*-Steward contract-side ahead of the untouched walls; a **paused Steward is not cover** (asserted for pause, remove, and leave). G-E's transfer flows must keep this counting discipline.
3. **Legacy `leave_group` executed G-E scenarios on the direct path** until today — the red run *demonstrated* it (the suite's own fixtures went through DeusEx handover and closure). Replaced-in-place; the legacy oracle for G-E lives in git history + `migrations/archive/` + the behaviour inventory.
4. **Grant hygiene:** functions created pre-G-A can carry EXECUTE-to-PUBLIC (Postgres default) — `leave_group` did since sprint2. Worth a one-time sweep of other pre-partition SECURITY DEFINER functions at a cooldown (candidates: the sprint3/sprint4 bodies).
5. One in-flight test-expectation correction, labelled: Tier-1 platform-baseline permissions (FringeIsland Members) are **context-free** and survive a group pause — the group-scoped grant is what goes dark.

## Evidence & gates

PC013: 24 integration, **21 demonstrated RED** (PGRST202 + genuine semantic reds against the legacy body) → GREEN, 3 labelled verified-not-assumed. H016: 13 route-units + 10 panel units red-first (15 prior panel cases green throughout); 5 E2E journeys on dedicated spec-created FIMs (pause round-trip incl. the paused member's honest absence + return; both G-E refusal copies live; removal; regular leave). **Full unit 341/341 (52 suites) · integration 210/210 (29 suites) · E2E 48/48 · `next build` clean · lint 0 errors** (one pre-existing warning).

## Next steps

1. **Cycle G-E (leadership transfer & closure, MEM-7/8 + GRP-9)** — decompose session next, per the Groups plan. Heaviest cycle; legacy proves the flows (sprint2/3 handover + nomination + closure, ADR-U019); DS-4/DS-5 dispositions build as tagged cascade layers (D2). **Note:** the G-E → G-F boundary carries the group-as-actor design session (PC011 Open Q1 / G-29).
2. **Area-gate lines kept warm:** DS-3 freeze dispositions re-verify at the Journeys gate (now incl. `removed_from_group`); MEM-6's `pending-DS-5` tag re-enters at the Communication gate with MEM-9; G-D's exit machinery is the substrate IDN-10's group-membership cascade routes through (Identity-plan carry — exercised, no IDN-10 close yet).
3. Standing: G-36/IDN-10 parked specs by next cooldown; org-spec §5 seeding-sites doc-health finding queued; IDN-12 + perf T2 parked; P3b/P4/P1-residual parked; `test:integration:rbac` legacy-script cleanup at cooldown; the PC002 cross-reference line (G-C finding 4); **new:** the pre-partition SECURITY DEFINER grant sweep (finding 4).
