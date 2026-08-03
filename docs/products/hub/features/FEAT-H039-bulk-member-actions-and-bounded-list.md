# FEAT-H039: Bulk member actions and the bounded list — the console learns to act on many, honestly

---
id: FEAT-H039
title: Bulk member actions and the bounded list — server-paged + server-searched `/admin/members` with explicit page-scoped selection, the safe bulk subset (suspend / reactivate / force sign-out) as BFF-looped singles with per-row outcomes, and the W-4 email-echo rider on every member ceremony
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

ADM-7 (Hub §L3: "Bulk-action selected members (within a safe action subset)") re-scoped into Ferd at the area-gate close (2026-08-02) and shaped by the settled RB board (RB-2/RB-3/RB-8, 2026-08-03). The decomposition walk (2026-08-03, Hub tree at HEAD) confirmed every premise:

1. **The list is unbounded:** one full fetch per filter into state (`AdminMembersList.tsx:52,59-60` — 1,918 non-Mist rows on dev), search is a client-side substring over the fetched set (`:85-94`), no pagination of any kind. W-5 (the walk finding) named this; RB-3 ruled the fix.
2. **No selection model exists** — no checkbox, no selected-state, no bulk affordance anywhere in the component (full-file verification).
3. **No ceremony echoes the member's email** (the W-4 doppelganger class): every confirm in `AdminMemberDetail.tsx` (`:365-481`) and the hard-delete panel (`:332-363`) interpolates `display_name` only; email renders solely in the identity subhead (`:206`) and the list column.
4. **As-of/Refresh exists only on the dashboard** (`AdminDashboard.tsx:131-141`, a local pattern, not a shared component); the list has only the error-branch Retry (`AdminMembersList.tsx:140-148`) — the RB-8 parity gap, verified.
5. **`ConfirmModal.message` is typed `string`** (`components/ui/ConfirmModal.tsx:15-25`) — a bulk confirm that lists the selected members needs the additive `ReactNode` widening (chosen below) to stay inside the house confirmation primitive.
6. **The auth split on admin routes is the ADR-U037 identity split, not drift** (reads on `getVerifiedUserId`, mutations on `getUser`) — the new bulk routes are mutations and take `getUser()`.

## Solution sketch

Surface half of cycle ADM-E, consuming the re-issued [FEAT-PC024](../../../platform/core/features/FEAT-PC024-bounded-member-enumeration-contract.md) read API-first; **no migration of its own**.

- **The bounded list.** `/admin/members` moves to server paging: fixed page size 50, Next driven by the payload's `next_cursor`, Prev by a client-held cursor stack; the search input becomes a debounced (~300 ms) **server** search (`p_search`), replacing the client-side filter of the fetched set; the six filter tabs stay, unchanged semantics; page, filter, and search compose. The list gains the dashboard's **"As of + Refresh"** affordance (RB-8), rendering the payload's `generated_at` — the H034 idiom, server clock, "Refreshing…" busy state.
- **Selection, explicit and page-scoped (RB-3).** A checkbox per row + a select-page header checkbox; a visible count ("N selected"); selection **clears on any page, filter, search, or refresh change** — the safe-subset instinct applied to selection, stated in the UI by construction (no cross-page select-all exists to misuse).
- **The bulk bar (RB-2's safe subset, nothing more):** with ≥1 selected, exactly three actions render — **Suspend**, **Reactivate**, **Force sign-out**. The confirm is the house `ConfirmModal` (danger variant) whose `message` prop **widens additively to `ReactNode`** (`string` callers unchanged — the recorded shape for the DS-adjacent edit): it names the action, the count, and **every selected member by display name + email** (W-4 applied at bulk birth; scrollable past ~8 rows).
- **Mechanics — the BFF loops the proven singles (RB-2, verbatim).** Three new routes, `POST /api/admin/users/bulk/{suspend|reactivate|force-logout}`, body `{user_ids: uuid[]}` (bounded to the page size, 50 — an over-cap request is a 400; BFF plumbing, not a platform rule). Each route runs the ids **serially in selection order** through the existing single contracts — `admin_update_user_status(id, false|true)`; `admin_force_logout([id])` one-id-per-call, so its per-call audit row becomes a **per-member row** (deliberately not the array contract's one-row-per-batch shape — RB-2's per-member audit mechanics; the platform's batch shape at `20260801190000:432-434` is left unused, recorded). Per id it records `{id, ok, error?}` with the platform's refusal message **verbatim** (the canonical map: `42501`/`P0002`→404-class, `P0001`→the message, else failure); refusals and errors never abort the loop. The response is 200 with the per-row results — **partial success is honest and reported per member**. Mutations on `getUser` (ADR-U037); durable telemetry per bulk call (action, requested count, succeeded count — content-free).
- **Outcome rendering.** A per-row outcome panel after the run — each member by display name + email with "done" or the platform's words — then the list repaints from a fresh read (the H035 rule: never optimistic).
- **The W-4 rider on the singles.** Every member-ceremony confirm on the detail page — suspend, reactivate, decommission, force sign-out, platform exit, remove-from-group, grant/revoke admin, and the hard-delete type-to-confirm panel — gains the member's **email** beside the display name (the unique identifier, killing the doppelganger mis-grant class).
- Born under the COR-C lattice: tokens, jest-axe on the new states, route-policy + outer-ring (the three routes; `lib/admin/users.ts` stays `import type` only client-side), red-first unit.

## Appetite

Small cycle (the RB-1 sizing): one page reworked, one modal widening, three looping routes, one rider sweep over existing ceremony copy. Every pattern is proven (H034 refresh idiom, H036 ceremony shape, the PC022→H037 keyset consumption). The care points are selection-clearing honesty and per-row outcome copy, not volume.

## Rabbit holes

- **Don't recompute eligibility client-side for bulk.** A mixed selection is legal by design; the per-row outcome is the honesty mechanism (RB-2). No pre-filtering "already suspended" rows, no self-exclusion rule the platform doesn't have — the singles' law is the law, refusals render verbatim.
- **Don't parallelise the loop.** Serial preserves `FOR UPDATE` calm, deterministic outcome order, and bounded DB pressure; 50 sequential RPCs is the accepted worst case (disable-with-progress covers the wait).
- **Don't grow the subset.** Decommission, hard delete, platform exit, remove-from-group, grant/revoke stay singles (destructive, irreversible, or high-privilege — and the last-DeusEx floor is a **trigger with whole-call rollback**, exactly the wrong substrate under a loop that promises partial success).
- **Don't build a stateful or cross-page selection.** Current page only; cleared on any view change. "Select all matching" is ADM-7's Eid-shaped temptation.
- **Don't fork the confirmation primitive.** The `ReactNode` widening is additive; a bespoke bulk-modal component is drift.

## No-gos

No cross-page select-all. No bulk decommission / hard-delete / platform-exit / remove-from-group / grant / revoke. No group-plane bulk (groups stay singles). No set-based platform mutation primitives (RB-2). No CSV export. No search ranking (DS-6 stays unconsumed). No new realtime; refresh-based like every admin surface this wave. No member-facing surface changes.

## Stories

### STORY-1: The bounded list
- Given a platform admin on `/admin/members`, when the page loads, then the first 50 rows render (same columns and badges as today), Next appears iff `next_cursor` is non-null, Prev walks back through visited pages, the filter tabs and the search input compose with paging (any change resets to page one), search hits the server debounced (no full-set fetch remains anywhere), the "As of" line renders the payload's `generated_at` beside a Refresh with a busy state, skeleton per B6, and a failed load is a visible error with Retry.
- Given a non-admin navigating directly, then the 404 shape — including on the three new routes.

### STORY-2: Selection, explicit and page-scoped
- Given rendered rows, when the admin checks rows or the select-page header box, then the count reads "N selected" and only current-page rows are selectable; when the page, filter, search, or refresh changes, then the selection clears; no cross-page select-all affordance exists.

### STORY-3: The bulk ceremony
- Given N selected members and a chosen action, when the bulk bar's action is clicked, then the danger ConfirmModal names the action and the count and lists **every** selected member by display name + email; Cancel is inert; while running, the ceremony is busy-locked with progress feedback.

### STORY-4: Partial success, honestly reported
- Given a mixed selection (e.g. one already-suspended member among active ones), when bulk Suspend runs, then the outcome panel reports each member by name + email with "done" or the platform's refusal **verbatim** (e.g. "User is already in the requested state"), the run never aborts mid-loop, the list repaints from a fresh read, and platform-side one audit row per acted-on member exists (`member.suspend` / `member.reactivate` / `member.force_logout` — asserted in the paired suite against the real contracts).

### STORY-5: The safe subset is the whole subset
- Given any selection, then exactly Suspend, Reactivate, and Force sign-out render as bulk actions — no other ceremony anywhere offers a multi-member form.

### STORY-6: Every ceremony names its member (W-4)
- Given each single member ceremony on the detail page (all eight confirms + the hard-delete panel), then the confirm copy carries the member's email beside the display name; given the bulk ceremony, the listing does the same per row.

### STORY-7: Wired, gated, observable
- E2E journey: elevate → server-search a fixture → page forward and back → select two → bulk suspend with one designed refusal (partial success rendered) → bulk reactivate → bulk force sign-out → non-admin gets the 404 shape on a bulk route. Unit: axe-clean list states incl. selection and outcome panel; the ConfirmModal widening pinned (string callers unchanged); route-policy + outer-ring gates green with zero exception entries; durable telemetry asserted on bulk success paths.

## Platform dependencies

FEAT-PC024 (the re-issued bounded read) API-first — the pager, search, and As-of all ride its walked keys; the bulk routes consume the **existing** FEAT-PC021 single contracts (`admin_update_user_status`, `admin_force_logout`) unchanged — no new mutation contract, no migration of its own.

## Cross-product impact

Gimbal inherits the contracts, not the shell. Member-facing surfaces untouched — a bulk-suspended member experiences exactly what a singly-suspended member does (IDN-9 render; the H038 in-session revalidation walls them at their next write).

## Vertical impact

- **Privacy/GDPR:** the same admin-tier fields behind the same wall; paging moves **less** personal data per request; the bulk confirm's email listing shows admins data they already see in the list column, for the W-4 identification purpose.
- **Notifications:** none new — sanction communication stays the recorded Eid deferral (DB-4); bulk fires no kinds the singles don't.
- **Administration:** ADM-7 realized within the RB-2 safe subset; per-member audit rows by construction; ceremony weight preserved (bulk carries the danger variant and full member enumeration).
- **Observability:** durable telemetry on every bulk call (requested vs succeeded counts); per-row refusals rendered verbatim, never swallowed; the As-of line makes staleness visible instead of implicit.
- **Transactions:** none.
- **Extensibility:** the bulk bar derives from a declared action list keyed to routes (adding a future safe action is one entry, not a redesign); the outcome panel renders any platform message; selection/paging make no assumption about total size.

## Performance budget

- **First-paint class:** B2/B3 for `/admin/members` — justified standalone read (admin-only, ADR-U042 guardrail 3); the page-one payload replaces the ~300 KB full census.
- **Interaction class:** checkbox/select-page/pager/search feedback within 100 ms (B5); search debounced ~300 ms then server round-trip with busy state; bulk runs disable-with-progress for the loop's duration (up to 50 serial RPCs — progress feedback, never a frozen UI).
- **Loading states:** skeleton rows on page loads (B6); the outcome panel renders incrementally-complete results, not a spinner.

## Implementation notes (built 2026-08-03, Cycle ADM-E)

- **Closed 6-done 2026-08-03, built in two tranches around the PC024 schema gate:**
  - **Tranche 1 (pre-apply, PR #400):** the shape-tolerant page-walking shim in `fetchAdminUsers` (making the apply order-independent), `ConfirmModal.message` widened `string` → `ReactNode` (message container `<p>` → `<div>` so block content is legal; string callers pinned unchanged), and the W-4 email echo across all nine member ceremonies via one `who` helper in `AdminMemberDetail`. Red-first: **11 red at head** (9 W-4 cells scoped *within* the modal — a bare `getByText` would false-green on the identity subhead — plus 2 keyed-shim cells); the ReactNode render cells labelled designed-green (ts-jest doesn't type-check; `next build` is the type gate and gates the widening).
  - **Tranche 2 (post-apply):** `AdminMembersList` reworked to the bounded shape — `fetchAdminUsersPage` (Hub-fixed page size 50) + `bulkAdminUserAction` in `lib/admin/users.ts` (the shim retired with its suite, replaced by `users-page-and-bulk.test.ts`), the manual-encoded query string (URLSearchParams' `+`-for-space breaks cursor names), a debounced (300 ms) server search applied through a ref (pure updaters — StrictMode double-invoke discipline), Prev via a client cursor stack, As-of/Refresh from `generated_at`, selection as an insertion-ordered array (the confirm roster and POST body preserve click order), and the three bulk routes. Red-first: **19 red at head** across the reworked list suite + the lib suite.
- **The route-policy gate caught the thin-delegate shape at first contact:** the conformance test statically requires `getUser()` visible in each mutating route file — the bulk routes restructured to authenticate in-file and hand the verified actor to the shared `handleBulkAuthed` (`lib/admin/bulk-route.ts`); zero exception entries, the gate's intent honored rather than excepted.
- **Gates at close:** unit **1221/1221** (156 suites) · lint 0 errors · `next build` green · route-policy + outer-ring zero exceptions · E2E journey `admin-bulk-members.spec.ts` **4/4** (server search isolates fixtures → bulk suspend with the designed already-suspended refusal rendered verbatim + per-member audit rows asserted through the service-role client (the E2E `runAdminSql` helper is void — result-reading assertions go through `createAdminClient`, a harness lesson) → bulk reactivate → bulk force sign-out with per-member `metadata.target_user_ids` containment proofs).
- **Performance:** no first-paint request added or rerouted — the same single list read now carries one bounded page (~50 rows) instead of the ~300 KB census, the W-5 stall's structural fix; interactions stay B5-class; no deep-cold spot measurement owed (the HYG-A precedent), the payload reduction recorded here as the measured win.
