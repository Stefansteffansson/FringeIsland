# FEAT-PC023: Group suspension enforcement contracts — the suspended group grows teeth

---
id: FEAT-PC023
title: Group suspension enforcement contracts
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Suspension is marking-only. The walk proved it live (W-3, [findings](../../../planning/hub-v2/2026-08-02-admin-live-walk-findings.md)): the group's steward posted to a suspended group's forum **84 seconds after** suspension, DB-timestamped through the wall. The RB-6 board ruling ([plan §Decision board — ADM-7 + ADM-17](../../../planning/hub-v2/phase-3-platform-ops-completion-plan.md)) defines the matrix; this spec is its platform half. Substrate findings, each disk-anchored (enumeration 2026-08-03, cumulative-forward across 99 migrations + live-DB verification):

1. **Only 8 of ~30 member-facing group-context write doors check group status.** The rest are open under suspension: the whole DS-5 communication family (forum, announcements, conversations, messages), most of the DS-3 journey family (self-enrolment `20260710170000:71`, steps `20260708120000:29,119`, responses `20260718090100:43`, sharing `20260708150000:406`), and most of the PC-3 organisation family (invitations `20260705090321:40,131`, roles `20260704090434:142-546`, settings `20260704075547:216`).
2. **A `groups.status` mention is not a guard.** The near-universal visibility line `or not (v_is_member or (v_group.is_public and v_group.status = 'active'))` short-circuits for any member and never blocks a suspended-group write. ~20 contracts read as covered and are not.
3. **`leave_group` traps members today.** `20260719190205_feat_cor_a_internal_api_inversion.sql:300-302` refuses leaving any non-active group (`P0001 'cannot leave a group that is not active'`). Suspending a group currently imprisons its members — the exact opposite of the ruled matrix ("leaving stays allowed").
4. **Legacy direct-RLS write doors are live.** Verified against the live DB 2026-08-03: 13 write policies for `authenticated` plus INSERT/UPDATE/DELETE grants (including to `anon`) on `group_memberships`, `user_group_roles`, `group_roles`, `group_role_permissions` — all from `20260222000000_rebuild_universal_group_pattern.sql`, never revoked. Any contract-tier freeze is bypassable while these stand.
5. **The groups list cannot render the suspended chip.** `get_member_groups` (`20260702130100:19-28`) returns no `status` column; only `get_group_detail` (`20260706170000:24`) emits it. "Reads stay honest" needs an additive payload change.

### Why Platform Core (PC-3)

`groups` and its lifecycle are PC-3 substrate; the guard predicate is group-lifecycle authority. The doors span owners (DS-5 communication, DS-3 journeys, PC-3 organisation) — schema predates partition; the amendments land in each function's latest definition with ownership unchanged, calling the PC-3 guard (domain → core is the licensed dependency direction, ADR-U047). No `admin_*` function is touched; the admin plane is deliberately out of scope.

## Solution sketch

**One net-new PC-3 guard, one line per door.** `assert_group_writable(p_group_id uuid)` — reads `groups.status` (indexed, `idx_groups_status_active`), raises `P0001` with the canonical message `'group is suspended'` when status = `'suspended'`; silent otherwise. Every frozen door gains one guard call at entry. No trigger-tier enforcement (triggers would blind-fire on admin and system paths; the contract tier is where member-facing intent lives).

**The freeze line is growth-and-activity; reduction-and-exit stays open.** The RB-6 matrix, derived to per-door calls:

| Disposition | Doors |
|---|---|
| **FROZEN** (guard added) | forum: `create_forum_post`, `reply_to_forum_post`, `edit_own_forum_post`, `delete_own_forum_post`, `moderate_forum_post` (Steward included, per the ruling) · announcements: `send_community_announcement`, `retract_announcement` · conversations: `create_group_conversation`, `join_group_conversation`, `send_message`, `get_or_create_dm_conversation` (guard fires only when the bound group is suspended; personal groups are never suspendable — `admin_suspend_group` refuses non-engagement groups) · journeys: `enroll_self_in_journey`, `enter_journey_step`, `complete_journey_step`, `save_step_response`, `set_journey_progress_sharing` · organisation: `invite_member`, `invite_by_email`, `accept_group_invitation`, `respond_to_group_invitation`, `respond_to_acting_invitation`, `assign_member_role`, `remove_member_role`, `create_group_role`, `update_group_role`, `delete_group_role`, `set_group_role_permission`, `update_group_settings`, `activate_member` |
| **OPEN by design** (reduction/exit/safety — proven open by test) | `leave_group` (**amended** — see below), `leave_group_as_group`, `remove_member`, `pause_member`, `withdraw_from_journey`, `decline_group_invitation`, `cancel_member_invitation`, `cancel_email_invitation`, `leave_group_conversation`, `mark_conversation_read` (own read-state), `submit_content_report` (the safety valve must work *especially* in a suspended group) |
| **Already guarded** (no change; asserted in the gate suite) | `enroll_group_in_journey`, `invite_group`, `nominate_steward`, `respond_to_stewardship_nomination`, `hand_stewardship_to_deusex`, `close_group`, `delete_group` |

**The `leave_group` amendment:** the `v_group.status <> 'active'` refusal at `20260719190205:300-302` relaxes to admit `'suspended'` (refusing `closed`/`archived` unchanged — terminal-lifecycle semantics are C-E's, untouched).

**The legacy doors close:** the 13 write policies dropped, write grants revoked from `authenticated`/`anon` on the four tables (the ADM-D client-write-door precedent — the only writers are frozen `hub-legacy` oracle code). **Verify-at-build:** `memberships_insert_bootstrap` and the invite/accept policies must be proven non-load-bearing for the live signup and invitation paths (SECURITY DEFINER contracts bypass RLS, so they should be vestigial — prove, don't assume; the signup + invitation E2E journeys join the post-apply verification set per the Q1 standing rule).

**Reads stay honest:** `get_member_groups` gains `status` (additive).

One schema gate: guard + ~28 function re-issues (one line each, signatures byte-identical) + the `leave_group` amendment + policy/grant closure + the read additive. Red-first; PR held with red evidence + apply commands for named approval.

## Appetite

One small cycle (HYG-A), shared with FEAT-H038. The migration is wide but mechanical; the tests are the bulk.

## Rabbit holes

- **The suspend-mid-flight race is accepted.** A write racing the status flip lands as if pre-suspension (single-statement contracts, one transaction). No `FOR SHARE` on the group row — serialising every group write against suspension is cost without a threat model.
- **No per-door admin configurability.** The matrix is fixed in the contracts; a configurable freeze is ADM-14 territory (deferred, dated).
- **No trigger-tier enforcement** — see Solution sketch.

## No-gos

- No member notifications on suspension — sanction-communication kinds stay the recorded Eid deferral (DB-4, dated pointers in the ADM-C specs).
- No admin-contract changes (`admin_suspend_group`/`admin_reactivate_group` untouched).
- No realtime suspension push — refresh-based staleness is the written H035/H036 no-go; the in-session discovery half is FEAT-H038's (W-7).
- No unsuspend-request or appeal flow.

## Stories

### STORY-1: The guard exists and refuses typed
As the platform, I want one canonical group-writability guard, so that every door refuses suspension identically.

**Acceptance criteria:**
- Given a suspended group, when a frozen door is invoked by any member including the Steward, then it raises `P0001` with message `'group is suspended'` and writes nothing.
- Given an active group, when any door is invoked, then the guard is silent and behavior is byte-identical to before.

### STORY-2: The communication plane freezes
As the platform, I want the DS-5 doors guarded, so that a suspended group's forum, announcements, and conversations refuse writes.

**Acceptance criteria:**
- Given a suspended group, when its Steward posts to the forum (the W-3 reproduction), then the write refuses typed — the +84 s hole is closed.
- Given a suspended group, when a member sends a message in a group-bound conversation, replies, edits, moderates, or sends/retracts an announcement, then each refuses typed.

### STORY-3: The journey plane freezes, but withdrawing stays open
As the platform, I want journey activity in a suspended group held, so that suspension means what it says.

**Acceptance criteria:**
- Given a suspended group, when a member self-enrols, enters/completes a step, saves a response, or toggles sharing, then each refuses typed.
- Given a suspended group, when a member withdraws from its journey, then the withdrawal succeeds.

### STORY-4: The organisation plane freezes on the growth half
As the platform, I want membership growth and capability changes held, so that a suspended group cannot expand or re-arm.

**Acceptance criteria:**
- Given a suspended group, when anyone invites, accepts an invitation, assigns/removes a role, edits role definitions, changes settings, or re-activates a paused membership, then each refuses typed.
- Given a suspended group, when an invitee declines or a Steward cancels a pending invitation, then each succeeds (reduction stays open).

### STORY-5: The exits stay open — the trap is sprung
As a member of a suspended group, I want to leave it, so that suspension is a hold on activity, not imprisonment.

**Acceptance criteria:**
- Given a suspended group, when a member calls `leave_group`, then it succeeds (the `20260719190205:300` refusal admits `'suspended'`).
- Given a closed or archived group, when a member calls `leave_group`, then the existing refusal still fires (terminal semantics unchanged).
- Given a suspended group, when `leave_group_as_group`, `remove_member`, or `pause_member` is invoked, then each succeeds.

### STORY-6: The legacy direct write doors close
As the platform, I want the four legacy RLS write surfaces shut, so that the contract tier is the only member write path and the freeze cannot be bypassed.

**Acceptance criteria:**
- Given the migration applied, when write policies/grants on `group_memberships`, `user_group_roles`, `group_roles`, `group_role_permissions` are enumerated, then no `authenticated`/`anon` write path remains.
- Given the closure, when the signup journey and the invitation accept journey run end-to-end, then both are green (the bootstrap/invite policies proven vestigial — the Q1 post-apply verification set).

### STORY-7: Reads stay honest
As a member, I want to see that my group is suspended wherever the group renders, so that the state is never hidden.

**Acceptance criteria:**
- Given a member of a suspended group, when `get_member_groups` returns, then each row carries `status` and the suspended group says so.
- Given existing consumers of `get_member_groups`, when the payload gains the key, then no existing field changes (additive only).

### STORY-8: Reactivation restores everything
As the platform, I want the freeze fully reversible, so that reactivation is a complete round-trip.

**Acceptance criteria:**
- Given a suspended group reactivated through `admin_reactivate_group`, when each previously-frozen door is invoked, then each succeeds — the full matrix round-trips.

## Decomposition verification walk — payload ↔ consumer (FEAT-H038)

- `get_member_groups.status` → H038 STORY-5 groups-list chip (the one new key; consumer named).
- `P0001` + `'group is suspended'` → the Hub BFF mappers (`hub/lib/forum/http.ts`, `announcements/http.ts`, `messages/http.ts` idiom) → H038 STORY-5 refusal copy. The canonical message string is contract surface — H038 renders member copy keyed on it; changing it is a paired-spec change.
- `get_own_account_state` (PC-2, `20260721161500:561`) → H038 STORY-4 revalidation — existing payload, zero changes; walked for completeness.
- Every H038-rendered field traces to a named key; every new key to a named consumer. No concurrency ACs describe impossible races (the mid-flight race is recorded accepted, not asserted).

## Platform dependencies

PC-3 substrate (groups, status check constraint `20260228111514:23-24`); `admin_suspend_group`/`admin_reactivate_group` (FEAT-PC020) as the sole status writers — consumed, not changed.

## Cross-product impact

The Hub half is FEAT-H038 (paired). The guarded DS-3/DS-5 functions keep their owners; the DS-3 and DS-5 §L4 summaries inherit a dated pointer at build time (the ADM-D cross-owner precedent). The Gimbal inherits the freeze by construction (substrate enforcement, ADR-U038).

## Vertical impact

- **Privacy/GDPR:** No new personal data. Own-content deletion in a suspended group is frozen with the rest of the write plane; account-level erasure is unaffected (CASCADE paths bypass contracts — the Mist rule holds untouched).
- **Notifications:** None — sanction communication stays the dated Eid deferral (DB-4).
- **Administration:** Enforces the meaning of an existing admin ceremony; no new admin surface, no admin-contract change.
- **Observability:** Suspension refusals surface in BFF telemetry as mirror-only read/refusal events per the Q2 standing criteria; no durable adoption (no admin-plane or mutation event is added).
- **Transactions:** None.
- **Extensibility:** The guard keys on the single value `'suspended'`; the status check-constraint set is untouched and remains open to extension. No sealed lists, no new enums, no new permission scopes.

## Performance budget

N/A (no surface). The guard adds one indexed single-row read per write contract (`idx_groups_status_active`) — negligible; the gate's ADR-U043 pass (dual signal) verifies no surface regression.

## Sibling-assertion sweep (mandatory at the gate)

The re-issues touch ~28 functions — sweep sibling suites for assertions pinning current refusal behavior (the four-catches class): the `leave_group` non-active refusal is asserted somewhere with near-certainty; adapt in the gate PR, not at apply.
