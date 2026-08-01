# FEAT-H036: Member administration view — the member console joins the admin home

---
id: FEAT-H036
title: Member administration view — /admin/members list with honest lifecycle filters, member detail with the state-honest action rail (suspend/reactivate/decommission, force sign-out, hard delete, platform exit, targeted group removal), and platform-administrator grant/revoke
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Operators can now administer groups (H035) but not the members in them: no surface lists members at platform scope, and every lifecycle contract — suspend, decommission, hard-delete, force-logout — has existed for months with no v2 door. ADM-2/3/4/5/6/12/18 (Hub §L3) are cycle ADM-C's surface rows; this is the surface half, consuming FEAT-PC021 API-first on the H034 shell, keeping every admin task in the one `/admin` home (the AB-7 shape — Stefan's console-consolidation preference confirmed at the ADM-C board settle).

## Solution sketch

- **`/admin/members`** (list) + **`/admin/members/[id]`** (detail) under the H034 admin section; the `/admin` dashboard gains a "Member administration" card. The H035 gate shape: the platform's refusal → 404, no admin chrome for non-admins.
- **List:** lifecycle filter toggles rendering the contract's open filter namespace (default hides decommissioned — B-ADMIN-002's rule carried through the contract, not recomputed), a client-side name/email search over the fetched set (DS-6 ranking recorded unconsumed; platform counts are small), state badges from the open `account_state` vocabulary (an unknown value renders a neutral badge, never a crash), the platform-admin chip, joined dates.
- **Detail:** identity header (display name, email, joined), state badge, the memberships panel (group name + status badge + per-row **Remove** — ADM-18), and the **state-honest action rail** — the surface never offers what the contract refuses: Suspend (active only) · Reactivate (paused/suspended only — ceremony copy names what it lifts, a self-pause vs an admin hold, from `deactivation_origin`) · Decommission (non-terminal only) · Force sign-out (any non-terminal state; B-ADMIN-019 works on inactive members) · Platform exit (non-terminal) · Hard delete (any — the last resort) · Grant/Revoke platform administrator per `is_platform_admin`.
- **Ceremonies (all house ConfirmModal, danger-styled, consequences named):** removal names the platform-computed `removal_scenario` ("this closes the group" / "stewardship hands to FringeIsland"); platform exit aggregates the same array ("exits N groups, M close, K hand to FringeIsland") and states what it does *not* do (no erasure — the profile remains); hard delete gets the H029-class deliberate ceremony (type-to-confirm, sentinel consequence named: content reattributes to "[Deleted User]"); force sign-out states the refresh-layer honesty (existing sessions end; an open tab may coast minutes on its current token); revoke-admin on yourself names the self-demotion ("you will lose these pages immediately").
- **BFF routes** (presentation-only per ADR-U038): `GET /api/admin/users?filter=`, `GET /api/admin/users/[id]`, `POST /api/admin/users/[id]/suspend|reactivate|decommission|force-logout|hard-delete|platform-exit|remove-from-group|grant-admin|revoke-admin` (remove-from-group takes `group_id` in the body). SQLSTATE→HTTP per the H035 admin shape — `42501`/`P0002`→404, P0001→409 with the platform's message **verbatim** (the last-admin floor refusal renders as the platform wrote it), `22023`→400, unknown→500 — now uniform because PC021 typed the whole family. Reads on the ADR-U037 claims path; mutations on `getUser`; durable telemetry throughout.
- Born under the COR-C lattice: tokens, jest-axe, outer-ring (`lib/admin/users.ts` wrapper, `import type` only), red-first unit, route-policy gate; fresh-per-mount reads (the H034 rule — stale admin state is a correctness bug).

## Appetite

Generous for a surface cycle — two pages, seven ceremony flows, nine mutation routes — but every pattern is proven (H034 gate shape, H035 repaint discipline, H029 delete ceremony). The design-care point is the action rail's state honesty and the consequence copy; the code is composition.

## Rabbit holes

- **Don't recompute lifecycle rules client-side.** The action rail derives from `account_state` + `is_platform_admin` payload facts; eligibility, floors, and refusals are the platform's. A refusal reaching the surface is rendered honestly, not pre-empted by duplicated logic.
- **Don't soften the escalation ladder.** Suspend is reversible; decommission, exit, and hard delete are not. Ceremony weight must escalate accordingly — hard delete is never one click lighter than H029's self-delete.
- **Don't cache, don't get optimistic.** Fresh-per-mount reads; every mutation repaints from the fresh read, never optimistic-only (the H035 rule).
- **Don't build moderation or bulk affordances.** Selection checkboxes, multi-member actions (ADM-7, deferred), and report queues (ADM-D) are out.

## No-gos

No bulk actions. No Mist rows (the contract excludes them; the reaper's business). No email-invite admin flow (grant targets existing members via this console). No audit-log surface (ADM-16, ADM-D). No new realtime channel; refresh-based like every admin surface this wave. No member-facing surface changes.

## Stories

### STORY-1: The list, honestly filtered
- Given a platform admin on `/admin/members`, when the page loads, then the default view renders active + inactive members with state badges and the admin chip, decommissioned members appear only under their filter, Mists never appear, search narrows by name/email client-side, skeleton per B6, and a failed load is a visible error with Retry.
- Given a non-admin navigating directly to list or detail, then the 404 shape.

### STORY-2: Detail with the state-honest action rail
- Given an active member, then Suspend, Decommission, Force sign-out, Platform exit, Hard delete render and Reactivate does not; given a paused/suspended member, Reactivate renders with origin-honest copy; given a decommissioned member, only Hard delete remains; given a platform admin, the rail carries Revoke (or Grant when not) — the surface never offers what the contract will refuse.
- Given the memberships panel, then each active engagement group renders with its status badge and Remove.

### STORY-3: Sanction ceremonies
- Given Suspend confirmed through the ceremony, then the detail and list repaint from the fresh read (badge flips), and the refusal path (e.g. re-suspending from a stale tab) surfaces the platform's message visibly; same shape for Reactivate and Decommission; Decommission's ceremony names its irreversibility.

### STORY-4: Force sign-out and hard delete
- Given Force sign-out confirmed, then success reports the platform's count and the ceremony copy carried the refresh-layer honesty; given Hard delete, then the type-to-confirm ceremony names the sentinel consequence, and on success the member is gone from the list and the detail route 404s.

### STORY-5: Platform exit and targeted removal
- Given Remove on a membership row, then the ceremony names that row's `removal_scenario` consequence, and on success the memberships panel repaints without the group; given Platform exit, then the ceremony aggregates the scenarios and states the no-erasure boundary, and on success the member reads decommissioned with an empty memberships panel.

### STORY-6: Platform-administrator management
- Given Grant confirmed on an active member, then the admin chip appears on repaint (and the platform's `role_assigned` notification reached the new admin — asserted platform-side); given Revoke on a non-last admin, the chip clears; given the **last** admin, the floor refusal renders verbatim; given self-revoke, the ceremony names the self-demotion and the demoted operator loses `/admin` immediately (the H035 demotion shape).

### STORY-7: Wired, gated, observable
- E2E journey: elevate → find a fixture member → suspend/reactivate round-trip → remove from one group (scenario-named) → platform-exit a second fixture → grant + revoke admin on a third → demoted operator gets the 404 shape. Unit: axe-clean list + detail loaded states; route-policy + outer-ring gates green with zero exception entries. Every mutation's audit row asserted in the paired PC021 suite.

## Platform dependencies

FEAT-PC021 (both gates: the read family + the operations family) API-first — **no migration of its own**; the removal picker and every ceremony's consequence copy ride the detail read's walked keys (`memberships[].removal_scenario`, `deactivation_origin`, `account_state`); gating derives from the platform's refusal, never computed Hub-side.

## Cross-product impact

Gimbal inherits the contracts, not the shell. Member-facing surfaces untouched — a suspended member sees the existing IDN-9 render; a removed member's group list simply no longer carries the group (existing reads).

## Vertical impact

- **Privacy/GDPR:** renders admin-tier member identity (display name, email, state) behind the platform's admin wall; only walked payload keys reach the client; nothing new collected.
- **Notifications:** none new in this slice — the affected-member communication question is the recorded CB-1 deferral (per PC021); the kinds the walks fire are existing platform behavior, not surface work. *(CB-1 resolved at the ADM-D board, DB-4, 2026-08-01: ADM-D ships only the `report_resolved` resolution kind — FEAT-PC022; sanction-communication kinds are deferred to Eid.)*
- **Administration:** ADM-2/3/4/5/6/12/18 realized at the surface; every action audited platform-side; ceremony weight escalates with irreversibility.
- **Observability:** durable telemetry on reads and mutations (the H034 leg); refusals render the platform's words visibly, never swallowed.
- **Transactions:** none.
- **Extensibility:** filter toggles map 1:1 to the contract's open filter namespace; state badges render the open `account_state` vocabulary with a neutral unknown fallback; the action rail derives from payload facts, so a new platform state degrades to honest render, never a crash.

## Performance budget

- **First-paint class:** B2/B3 for `/admin/members` and detail; **justified standalone reads** (admin-only, outside the overview bundle — ADR-U042 guardrail 3).
- **Interaction class:** filter/search and rail buttons feed back within 100 ms (B5); mutations disable-with-progress during the round trip.
- **Loading states:** skeleton rows/blocks (B6); >3 s is a platform-side defect.

## Implementation notes (built 2026-08-01, Cycle ADM-C)

- **Shape:** `lib/admin/users.ts` (outer-ring wrapper, `import type` only, client injected) · eleven BFF routes (`GET /api/admin/users?filter=`, `GET /api/admin/users/[id]`, and nine `POST /api/admin/users/[id]/{suspend,reactivate,decommission,force-logout,hard-delete,platform-exit,remove-from-group,grant-admin,revoke-admin}`) · `AdminMembersList` + `AdminMemberDetail` under `components/admin/` · two `'use client'` route pages · the "Member administration" card on the `/admin` dashboard. Reads on `getVerifiedUserId` (ADR-U037 claims path), mutations on `getUser`; every success writes durable telemetry, every refusal a local emit.
- **Red → green:** the three unit suites were demonstrated red pre-implementation (both new components module-absent; the dashboard-card cell failing — 3 failed suites) and closed green (admin component suites 55/55); full unit **1117/1117**; the route-policy and outer-ring conformance gates accepted all eleven routes and the wrapper with **zero exception entries**; `next build` green. The E2E journey (`admin-members.spec.ts`, 6 scenarios) is **labelled test-after** per the ADM-B precedent — behaviour-level red-first lives at the unit tier and in the paired PC021 gate-2 integration suite. 6/6 green, DeusEx leak instrument delta 0, row-scoped locators throughout.
- **SQLSTATE → HTTP:** the H035 admin-plane mapping, now uniform because PC021 typed the whole family — `42501`/`P0002` → 404 (existence-hiding), `P0001` → 409 with the platform's message **verbatim** (the last-admin floor refusal renders as the platform wrote it), `22023` → 400, unknown → 500.
- **`viewer_is_self` (BFF shaping, recorded):** the detail route computes it via `get_current_user_profile_id()` for the self-revoke ceremony copy — presentation-only per ADR-U038; the platform enforces nothing about self-revocation beyond the floor trigger, which is its own wall.
- **Hard-delete ceremony (recorded):** the H029-class weight realized as an inline type-the-display-name panel rather than `ConfirmModal` (the modal carries no children; `DeleteAccountCeremony` is the house type-to-confirm precedent) — the sentinel consequence named, confirm disabled until the name matches; never one click lighter than self-delete.
- **State-honesty derivations (payload facts only):** Suspend = `active` · Reactivate = `paused`/`suspended` (ceremony copy names the origin: self-pause vs admin hold) · Decommission / Force sign-out / Platform exit = non-terminal · Grant = active non-admin · Revoke = admin non-terminal · Hard delete = always · a terminal member keeps only Hard delete (STORY-2's rule); membership Remove rows render only while non-terminal.
- **ADR-U043 numbers:** `/admin/members` + detail ride the registered area-gate perf pass (the standing owed item).
