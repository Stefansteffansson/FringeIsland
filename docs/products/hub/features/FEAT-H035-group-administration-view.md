# FEAT-H035: Group administration view — caretaker groups become visible and actionable

---
id: FEAT-H035
title: Group administration view — /admin/groups list with the Platform-stewarded tab, group detail, suspend/reactivate, and stewardship reassignment out of caretakership
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

RW-05, from the operator's chair: a group handed to FringeIsland vanishes — no surface lists what the platform stewards, so the caretaker of last resort cannot see its wards, let alone hand one back. ADM-8 (Hub §L3) is the cross-platform group administration view, ADM-9 its actions; board AB-5 put them immediately after the foundation cycle. This is cycle ADM-B's surface half, consuming FEAT-PC020 API-first on the FEAT-H034 shell.

## Solution sketch

- **`/admin/groups`** (list) + **`/admin/groups/[id]`** (detail) under the H034 admin section; the `/admin` dashboard gains a "Groups" navigation card. Same gate shape as H034: the platform's own refusal → 404 shape; no admin chrome for non-admins.
- **List:** filter tabs — All · Engagement · **Platform-stewarded** (the RW-05 headline, `deusex_stewarded`) · Suspended — rendering exactly the walked FEAT-PC020 payload (status badge reuses the GRP-5 vocabulary; the count pair renders Gracy-honest: total vs non-system).
- **Detail:** group row, counts, steward list, caretaker banner when `deusex_stewarded`; actions per state: **Suspend** / **Reactivate** (danger-styled, ConfirmModal with consequence copy), **Reassign stewardship** — a picker of the group's active human members (from the detail read's `members` array — adjudicated 2026-08-01 after the PC020 build finding; the originally-walked `get_group_memberships_of` reads the wrong direction and is `act_as_group`-gated) plus the current-steward context; confirm names exactly what changes hands.
- **BFF routes** (presentation-only per ADR-U038, `42501`→404): `GET /api/admin/groups?filter=`, `GET /api/admin/groups/[id]`, `POST /api/admin/groups/[id]/suspend|reactivate|reassign`. Reads on the ADR-U037 claims path; mutations on `getUser`; all emitting durable telemetry (the H034 leg).
- Born under the COR-C lattice: tokens, jest-axe, outer-ring (lib wrapper `lib/admin/groups.ts`, `import type` only), red-first unit + E2E.

## Appetite

Moderate — two pages + one picker flow + three mutation routes over proven patterns (H034's gate shape, the house ConfirmModal ceremonies). The picker's honesty (only actual members, current state visible) is the design-care point.

## Rabbit holes

- **Don't build member management here.** The detail shows counts and stewards; member rows, removal, and sweeps are ADM-C/ADM-18. A "remove member" button here is scope creep.
- **Don't cache admin group lists in the session cache.** Admin reads are fresh-per-mount (the H034 rule: stale admin state is a correctness bug).
- **Don't soften the confirm ceremonies.** Suspend and reassign are outward-facing acts on other people's group; both get the full danger ceremony with named consequences.

## No-gos

No bulk actions (ADM-7 deferred). No group deletion. No moderation affordances (ADM-D). No new realtime channel; refresh-based like every admin surface this wave.

## Stories

### STORY-1: The list, with the caretaker tab
- Given a platform admin on `/admin/groups`, when the page loads, then the All tab renders the walked rows with status badges and the honest count pair; switching to Platform-stewarded shows exactly the DeusEx-stewarded groups (the RW-05 fixture visible at last); Suspended shows exactly suspended ones; skeleton per B6 while loading; a failed load is a visible error with Retry.
- Given a non-admin navigating directly, then the 404 shape (list and detail both).

### STORY-2: Detail with state-appropriate actions
- Given an active engagement group, then Suspend and Reassign render; given a suspended one, Reactivate renders and Suspend does not; given a closed/archived one, no lifecycle actions render (state honesty — the platform refuses anyway; the surface never offers what the contract will refuse).
- Given `deusex_stewarded`, then the caretaker banner renders and Reassign is presented as "hand back to a member".

### STORY-3: Suspend / reactivate through the ceremony
- Given Suspend confirmed via ConfirmModal (consequence copy named), when the contract succeeds, then the row/detail repaint from the fresh read (status badge flips) — never optimistic-only; on refusal, the typed reason surfaces visibly and state repaints honestly.

### STORY-4: Reassign out of caretakership
- Given the picker open on a caretaker group, then it offers exactly the group's active human members; when one is confirmed, the detail repaints with the new steward listed and the caretaker banner gone; the Platform-stewarded tab no longer lists the group.
- Given a group whose only members are non-eligible, then the picker states that honestly instead of offering an empty dropdown mystery.

### STORY-5: Wired, gated, and observable
- E2E: elevate → a real hand-to-FringeIsland group appears under Platform-stewarded → reassign it to a member → it leaves the tab; suspend/reactivate round-trip; demoted member gets the 404 shape. Unit: axe-clean on list + detail loaded states; route-policy + outer-ring gates green.

## Platform dependencies

FEAT-PC020 (all five contracts, incl. the `20260801130000` `members` array on detail) API-first — **no migration of its own**; the picker candidates ride the detail read's `members` key (the TASK-ADMB-02 adjudication — see PC020 Implementation notes for why the originally-walked `get_group_memberships_of` cannot serve). Gating derives from the platform's refusal, never computed Hub-side.

## Cross-product impact

Gimbal inherits the contracts, not the shell. The member-facing group pages are untouched.

## Vertical impact

- **Privacy/GDPR:** renders group metadata + steward/member display identity already visible in shared contexts; nothing new collected.
- **Notifications:** none in this slice; the notify-affected-members question is recorded at the ADM-C board (per PC020).
- **Administration:** ADM-8/9 realized; every action audited platform-side; ceremonies reversible where the state machine is.
- **Observability:** durable telemetry on reads and mutations (the H034 leg); refusals and failures render visibly, never swallowed.
- **Transactions:** none.
- **Extensibility:** filter tabs render from a local list that maps 1:1 to the contract's open filter namespace — adding a platform-side filter is a one-line tab addition, no contract change; status badges reuse the open GRP-5 vocabulary.

## Performance budget

- **First-paint class:** B2/B3 for `/admin/groups` and detail; **justified standalone reads** (admin-only surfaces, outside the overview bundle — ADR-U042 guardrail 3).
- **Interaction class:** tab switches and action buttons give feedback within 100 ms (B5); mutations disable-with-progress during the round trip.
- **Loading states:** skeleton rows/blocks (B6); >3 s is a platform-side defect, not a spinner occasion.

## Implementation notes (built 2026-08-01, Cycle ADM-B)

- **Shape:** `lib/admin/groups.ts` (outer-ring wrapper, `import type` only, client injected) · five BFF routes (`GET /api/admin/groups?filter=`, `GET/POST /api/admin/groups/[id]{,/suspend,/reactivate,/reassign}`) · `AdminGroupsList` + `AdminGroupDetail` under `components/admin/` · two `'use client'` route pages · the "Group administration" card on the `/admin` dashboard. Reads on `getVerifiedUserId` (ADR-U037 claims path), mutations on `getUser`; every success writes durable telemetry, every refusal a local emit.
- **Red → green:** the three unit suites were demonstrated red pre-implementation (both new components module-absent; the dashboard-card test failing) and closed green 26/26; full unit 1088/1088; the route-policy and outer-ring conformance gates accepted all five routes and the wrapper with **zero exception entries**; `next build` green. The E2E journey spec (`admin-groups.spec.ts`, 4 scenarios) is **labelled test-after** — integrative journey coverage written after implementation; the behaviour-level red-first lives at the unit tier and in the paired PC020 integration suite. 4/4 green, caretaker-leak instrument delta 0.
- **SQLSTATE → HTTP (admin plane):** `42501` and `P0002` → 404 (existence-hiding, the H034 shape); `P0001`/`23505` → 409 and `22023` → 400 with the platform's message **verbatim**; unknown → 500. The list route maps the open filter namespace's `22023` to 400 so a stale tab in an old client degrades loudly, not silently.
- **State-honesty resolution (recorded):** Reassign renders **only** on caretaker groups — STORY-2's "active groups show Suspend and Reassign" line resolved against the contract (non-caretaker reassignment refuses `P0001`) per the same story's own "never offer what the contract will refuse" rule. Lifecycle actions render by state: active → Suspend (+Reassign iff caretaker), suspended → Reactivate, closed/archived/system → none.
- **Picker:** candidates = the detail read's `members[]` (the TASK-ADMB-02 adjudication) filtered to non-steward active humans; the all-ineligible case renders an honest empty state, never an empty dropdown. Confirm copy names the group and the receiving member.
- **RW-05 validated in the wild:** the moment the Platform-stewarded tab existed it surfaced three pre-existing caretaker groups on the dev DB that no surface could list before — the exact blindness the feature was specified to end.
- **Environment note (found, not caused):** the first E2E runs hung because the session's dev server had been launched through an output-truncating pipe (`| head`), which wedged the server mid-run when the pipe closed; restarting the server with unbounded logging cleared it. No product defect involved.
- **ADR-U043 numbers:** the `/admin/groups` measurements ride the registered area-gate perf pass (the standing owed item), per the task's Verification clause.
- **2026-08-03 (Cycle HYG-A, FEAT-H038 STORY-6) — the hold ceremony became a MODE CHOICE:** with FEAT-PC023's two-mode model (`resting` the visible steward-fix hold, `suspended` the hard hazard hold), this surface's actions grew: an active group offers **Rest | Suspend**, a resting one **Wake | Suspend** (the escalation), a suspended one Reactivate (unchanged). Two new BFF routes (`POST /api/admin/groups/[id]/rest|wake` → `admin_rest_group`/`admin_wake_group`, audited substrate-side) follow this spec's mapping shape verbatim; `resting` joined the status-badge vocabulary on list + detail. The behaviour and its red-first pins live with [FEAT-H038](./FEAT-H038-suspension-integrity-and-state-honesty.md).
