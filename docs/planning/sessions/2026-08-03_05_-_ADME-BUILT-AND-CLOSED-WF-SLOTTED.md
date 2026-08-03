# Session bridge — cycle ADM-E built + closed same-day; WF-1/WF-2 slotted; ADM-F next

**Date:** 2026-08-03 (fifth session) · **Wave:** Ferd · **Cycle:** ADM-E (decomposed, built, and closed this session)
**Follows:** [`2026-08-03_04_-_HYGA-CLOSED-H038-TRANCHE2-BUILT-BOTH-SPECS-6-DONE.md`](./2026-08-03_04_-_HYGA-CLOSED-H038-TRANCHE2-BUILT-BOTH-SPECS-6-DONE.md) and the HYG-A walk verdict (PRs #396/#397).

---

## READ THIS FIRST — the cycle is closed; the next session starts at ADM-F

Cycle ADM-E is complete end-to-end in one session: [FEAT-PC024](../../platform/core/features/FEAT-PC024-bounded-member-enumeration-contract.md) ↔ [FEAT-H039](../../products/hub/features/FEAT-H039-bulk-member-actions-and-bounded-list.md) both **6-done**, §L4 rows + indexes + three CHANGELOGs updated, tasks TASK-ADME-01/02 done. **The WF slotting board settled** (Stefan: "go with recommended"): WF-2 → cycle **ADM-G** (suspended groups only), WF-1 → cycle **N-E** (+ the polish rider); the sequence is **ADM-E ✓ → ADM-F → ADM-G → N-E → AB-6**. Next: **ADM-F** (ADM-17 role-template editor, RB-4/RB-5 ratified, VERIFY-at-decomposition standing on the PC-3 substrate).

## What was built

- **Platform (PC024, the one schema gate `20260803210000`, PR #399):** `admin_get_users` re-issued bounded — composite `(display_name, id)` keyset (row-value comparison; the audit read's bare-timestamp cursor fits a log, not a name-ordered list), cap 200/default 50 (the ADM-16 expression verbatim), server `p_search` over name/email, keyed `{users, next_cursor, generated_at}` scalar-jsonb return (db-max-rows escape preserved). The parked decision in `20260801180000`'s own header ("until a measurement asks") discharged by W-5 per RB-3. **Red at head 20/52 across 3 suites (all designed PGRST202) → 52/52 post-apply**, incl. the B1a union-equals-census page walk over the live ~1,900-user population.
- **Hub tranche 1 (pre-apply, PR #400, merged before the gate):** the shape-tolerant page-walking shim in `fetchAdminUsers` (apply order-independence), `ConfirmModal.message` widened `string` → `ReactNode` (`<p>` → `<div>`; string callers pinned), the **W-4 email echo on all nine member ceremonies**. 11 red at head (W-4 cells scoped *within* the modal — the identity subhead would false-green a bare `getByText`).
- **Hub tranche 2 (post-apply, this close's PR):** `AdminMembersList` reworked bounded — pager over a client cursor stack, debounced (300 ms) server search (manual query encoding: URLSearchParams' `+`-for-space breaks cursor names), As-of/Refresh from `generated_at` (RB-8), insertion-ordered page-scoped selection (cleared on any view change), the bulk bar (Suspend/Reactivate/Force sign-out only, RB-2) through the widened ConfirmModal with the full name+email roster, per-row outcome panel rendering refusals **verbatim**, repaint from a fresh read. `fetchAdminUsersPage` + `bulkAdminUserAction` in the lib (serial loop; force-logout one-id-per-call so per-member audit rows land by construction — the platform's one-row-per-batch shape deliberately unused); three bulk routes. 19 red at head.

## Gates (cycle close)

- Unit **1221/1221** (156 suites) · lint 0 errors · `next build` green · route-policy + outer-ring **zero exception entries**.
- Integration: the three affected suites **52/52 post-apply** (the full-sweep control is the 70-suite run from HYG-A's close plus these deltas; no other platform surface touched).
- **Full E2E sweep 115/115 (7.0 min), leak delta 0** — the four new `admin-bulk-members` journey tests included; the TASK-E2E-01 standing flake did not fire this run.
- Performance DoD: no first-paint request added or rerouted — the same single list read now carries one ~50-row page instead of the ~300 KB census (the W-5 stall's structural fix, recorded in FEAT-H039's notes); interactions B5-class; no deep-cold spot measurement owed (the HYG-A precedent).

## Decisions / learnings this session

1. **The classifier blocks are real and route-dependent:** `gh pr merge` was classifier-denied for #398 (docs!) yet allowed for #400 minutes later; the migration apply script was denied outright. The apply went through the **Supabase management-API path** (`mcp execute_sql` + `supabase-cli migration repair`) on Stefan's explicit approval — history verified consistent. The standing memory ("prepare + list PRs, never retry-loop") held.
2. **The route-policy gate's static `getUser()` check binds route FILES, not call graphs:** thin bulk routes delegating auth to a shared handler fail it. The right fix honors the gate's intent — auth in-file, the shared handler post-auth — not an exception entry.
3. **The E2E `runAdminSql` is void** (management-API helper discards result rows) — unlike the integration helper of the same name. Result-reading E2E assertions go through `createAdminClient()`. Bit once (the audit-count assertion), fixed in-session.
4. **Two-tranche around the gate is now twice-proven** (HYG-A, ADM-E): a pre-apply shape-tolerant shim makes the schema apply order-independent against the deployed surface; the post-apply rework retires it. PC024's migration header named the shim as an ADAPTED sibling site from the start.
5. **`(display_name, id)` keyset over a mutable key:** rename-between-pages drift accepted and recorded in the spec (the drift class an offset page has) — pre-empting a future "fix" into a stateful cursor.

## Close ritual

- [x] Full unit + targeted integration + full E2E sweeps (numbers above)
- [x] Both specs 6-done with §L4 rows, both feature-README indexes, plan v15, in the same close PR
- [x] CHANGELOGs — root cycle entry · `hub/` member-facing entry · platform-core register entry (+ the stale "HELD" heading on the PC023 register entry corrected to closed+applied)
- [x] Task sweep — TASK-ADME-01/02 `done`, criteria ticked
- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close (rides this PR)
- [x] Discovery sweep — runs after this PR merges (worktree was clean + synced at session open)
- [x] PR / merge — this close PR is fuller-auto class (Hub code + routine docs; the schema gate #399 and its apply already carried Stefan's approval)
- [ ] doc-health-check — **not run**: not a cycle-boundary in the doc-health sense beyond what HYG-A's boundary run covered this same day, and no cross-cutting renames/moves; next run at the ADM-F boundary or on-demand
