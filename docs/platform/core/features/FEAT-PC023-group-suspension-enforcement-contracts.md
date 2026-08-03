# FEAT-PC023: Group availability enforcement contracts — suspended and off-line grow teeth

---
id: FEAT-PC023
title: Group availability enforcement contracts (suspended + off-line)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Suspension is marking-only, and the substrate is the exact *inverse* of the two-mode model Stefan ruled (RB-6/RB-7 amendment, [plan](../../../planning/hub-v2/phase-3-platform-ops-completion-plan.md)): today a non-active group is *hidden* at the row layer for direct readers but its *content stays wide open* through every read door — the model wants findable-and-labeled with writes and (off-line) content quarantined. The walk proved the write half live (W-3: the steward posted to a suspended group's forum **84 seconds after** suspension, DB-timestamped — [findings](../../../planning/hub-v2/2026-08-02-admin-live-walk-findings.md)). Substrate findings, each disk-anchored (two enumeration passes 2026-08-03, cumulative-forward over 99 migrations + live-DB verification):

1. **Only 8 of ~30 member-facing group-context write doors check group status.** The near-universal `groups.status` mention is a visibility gate that short-circuits for members — ~20 contracts read as covered and are not.
2. **`leave_group` traps members today.** `20260719190205:300-302` refuses leaving any non-active group (`P0001 'cannot leave a group that is not active'`) — the opposite of the ruled "exits stay open under suspension."
3. **Legacy direct write doors are live.** 13 write policies for `authenticated` + INSERT/UPDATE/DELETE grants (incl. `anon`) on `group_memberships`, `user_group_roles`, `group_roles`, `group_role_permissions` (`20260222000000`, never revoked; verified live 2026-08-03).
4. **Every content read is group-status-blind.** `get_group_forum` (`20260720120000:100`), `get_group_announcements` (`20260720200000:390`), `get_group_conversations` / `get_my_conversations` (`20260721100000:368,318`), `get_conversation_detail` (`20260720120000:310`), roster `get_group_memberships_of` (`20260706120000:447`), role/invitation reads, journey group reads (`20260708150000:496,331`; `20260708190000:17`; `20260718090200:34`) — all gate on membership or permission, never on group status. Taking a group off-line today changes nothing about content reachability.
5. **Reads are deliberately RLS-backed, and the grants are live.** The C-series left SELECT on RLS by design (its "contracts are the only door" comments scope to *writes* — `20260719230500:157`, `20260720200000:121`); verified live 2026-08-03: `authenticated` **and `anon`** hold SELECT on `groups`, `forum_posts`, `conversations`, `messages`, `announcements`, `group_memberships`, `journey_enrollments`. A direct PostgREST select bypasses every read contract — **content quarantine cannot be contract-only**.
6. **Findability breaks in the wrong direction.** `groups_select` (`20260228111514:44-61`) hides every non-active group from direct readers below platform admin; `search_invitable_groups` (`20260706120000:172`) and `get_acting_contexts` (`20260706150000:25`) hard-drop non-active groups; `get_member_groups` (`20260702130100:19-28`) lists them but carries no `status` to label them; only `get_group_detail` (`20260706170000:24`) surfaces status to a member.
7. **Two edges a group-status predicate cannot reach**, recorded for the verdicts below: DMs are pair-grain, never group-bound (`get_or_create_dm_conversation` inserts `kind='dm'` with no `group_id` — `20260720003000:49-50`), so off-lining a group severs none of its members' existing DM channels; and the own-data export contracts (`get_own_messages_export` / `get_own_data_export`, `20260802120000:439,549`) carry group conversation bodies regardless of status.

### Why Platform Core (PC-3)

`groups` and its lifecycle are PC-3 substrate — this is enforcement of semantics PC-3 already owns (the status column, the ceremonies' meaning), not new Core capability; no Domain modelling could own the group lifecycle without inverting the dependency direction. The doors span owners (DS-5 communication, DS-3 journeys, PC-3 organisation) — schema predates partition; amendments land in each function's latest definition with ownership unchanged, calling the PC-3 guard (domain → core is the licensed direction, ADR-U047).

## Solution sketch

### The two-mode model (RB-6/RB-7 amendment, made contractual here)

| | `suspended` — the visible hold | `offline` — the hard hold |
|---|---|---|
| Findability | unchanged, labeled | **unchanged, labeled "Off-line"** (copy provisional) |
| Content reads | unchanged (read-only in effect) | **quarantined below the admin plane** |
| Member writes | refused typed | refused typed |
| Steward-permission holders | **fully exempt** | refused typed |
| Exits (leave / pause / decline / cancel / withdraw) | **open** | **refused** ("no one acts") |
| Admin plane | fully functional | fully functional |

### The guard and the exemption

`assert_group_writable(p_group_id, p_actor_group_id)` (PC-3, net-new): `active` → silent; `suspended` → silent iff the actor holds **`act_during_suspension`** in the group (a new permission key seeded to the Steward role template — permission-keyed, never role-name-keyed; the registry's migration+seed mutation path, the PC015 `act_as_group` precedent), else `P0001` `'group is suspended'`; `offline` → `P0001` `'group is offline'` for everyone below the admin plane. One guard call per door. The write matrix (door-by-door dispositions from the 2026-08-03 enumeration — ~28 frozen / the exit family open-by-design / seven already guarded) carries over from the single-mode derivation, with the exemption applied inside the guard and the exit family additionally refused under `offline` only.

**The `leave_group` amendment:** `20260719190205:300` admits `'suspended'`; refuses `'offline'` with the canonical message; `closed`/`archived` refusals unchanged (terminal semantics are C-E's, untouched).

### Off-line findability + content quarantine (the read plan)

- `get_member_groups` gains `status` (additive — labels both modes). `get_group_detail` returns a **minimal payload** (id, name, status) below the admin plane when off-line — found, labeled, that's it. `groups_select` RLS gains the labeled-visibility arm (`status IN ('active','suspended','offline')` on its member/public arms) so the row layer agrees with the contracts.
- **Content read contracts refuse or exclude when off-line** (below admin): forum, announcements, group conversations + group-kind conversation detail, roster, role fabric, group invitations, group journey progress/summary, player state for the group's enrollments; `get_my_conversations` omits the group's rows (they return on restore); `get_my_enrollments` rows carry the group status and stop being playable.
- **The RLS read policies gain the not-offline arm** (finding 5 makes this mandatory): `forum_select`, `announcements_select_community`, the `journey_enrollments` group arm — and the conversations family through one chokepoint: `is_conversation_participant()` (`20260719230500:114`) amended to exclude group-kind conversations of off-line groups, which closes `conversations` / `messages` / `conversation_participants` in one place. The C-series read-on-RLS posture is kept — amended, not revoked.
- **Recorded, deliberate:** `search_invitable_groups` and `get_acting_contexts` keep dropping non-active groups (they enumerate *actionable* targets; a held group is not one). An invitation *from* an off-line group still renders the group's name in `get_my_invitations` (identity-level; accepting is refused by the guard).

### The availability ceremonies

`admin_take_group_offline` (new, `admin_* → PC-4` pin, audited `group.offline`); `admin_suspend_group` amended (`active|offline → suspended`); `admin_reactivate_group` amended (`suspended|offline → active`). Every transition audited; refusals follow the admin-plane idiom (42501 existence-hiding / P0002 / 22023 / wrong-state). FEAT-PC020 gains a dated amendment note.

### Two verdicts recorded at decomposition (flagged for Stefan at the nod)

- **DMs stay live across quarantine** — pair-grain channels are structurally out of a group predicate's reach; two members who met in the group keep their DM. Person-level hazards are member-suspension's job (ADM-C, shipped). Accepted scope.
- **Own-data exports are unaffected by any hold** — the Art. 15/20 right over your own data is not suspendable by moderation state. Accepted scope.

One schema gate: the check-constraint change (+`'offline'`), the permission seed, the guard, ~28 guard re-issues + the exit amendment, the read-contract minimalizations, the RLS read-policy amendments, the ceremonies, the legacy write-door closure, the `get_member_groups` additive. Red-first; PR held with red evidence + apply commands for named approval.

## Appetite

The platform half of cycle HYG-A — grown by the two-mode model (the read plan and the ceremonies are new scope); still one cycle. If the gate PR gets unwieldy, split it into two serial gates (write plan, then read plan + ceremonies) rather than cutting scope.

## Rabbit holes

- **The hold-mid-flight race is accepted** (single-statement contracts; a write racing the flip lands as pre-hold). No `FOR SHARE` on the group row.
- **No wholesale SELECT revoke.** The C-series read-on-RLS posture stands; policies are amended, not retired.
- **No per-door configurability** (ADM-14 territory, deferred dated).
- **No trigger-tier enforcement** (blind to admin/system paths; the contract tier is where member-facing intent lives).

## No-gos

- No member notifications on either hold — sanction-communication kinds stay the Eid deferral (DB-4).
- No member-facing reason for a hold (the label states the state, never the why — Eid).
- No DM severing (the recorded verdict above).
- No realtime hold push (the refresh-based no-go stands; in-session discovery is FEAT-H038's W-7).
- No unsuspend-request or appeal flow.

## Stories

### STORY-1: The guard exists and refuses typed, per mode
As the platform, I want one canonical availability guard, so that every door refuses each mode identically.

**Acceptance criteria:**
- Given a suspended group, when a frozen door is invoked by a member without `act_during_suspension`, then it raises `P0001` `'group is suspended'` and writes nothing.
- Given an off-line group, when any member-facing door is invoked by anyone below the admin plane — the Steward included — then it raises `P0001` `'group is offline'` and writes nothing.
- Given an active group, when any door is invoked, then the guard is silent and behavior is byte-identical to before.

### STORY-2: The steward exemption is a permission, seeded and honest
As a steward of a suspended group, I want to keep working, so that I can tend the group through the hold.

**Acceptance criteria:**
- Given the migration applied, when the permission catalog is read, then `act_during_suspension` exists and the Steward role template carries it (seed-verified; the catalogue-equals-manifest pins adapted).
- Given a suspended group, when a holder of `act_during_suspension` posts, moderates, edits settings, or manages roles there, then each succeeds; when the same member acts in a suspended group where they lack the permission, then they are refused like any member (permission-scoped, never identity-scoped).

### STORY-3: The communication plane freezes for the non-exempt (suspended)
**Acceptance criteria:**
- Given a suspended group, when a non-exempt member posts/replies/edits in the forum, sends or retracts an announcement, or creates/joins/sends in a group conversation, then each refuses typed — the W-3 reproduction closes for non-stewards (the steward path is STORY-2's).

### STORY-4: The journey plane freezes; withdrawing stays open (suspended)
**Acceptance criteria:**
- Given a suspended group, when a non-exempt member self-enrols, enters/completes a step, saves a response, or toggles sharing, then each refuses typed; when they withdraw from the group's journey, then it succeeds.

### STORY-5: The organisation plane freezes on the growth half (suspended)
**Acceptance criteria:**
- Given a suspended group, when a non-exempt member invites, accepts an invitation, or changes roles/settings/membership-activation, then each refuses typed; when an invitee declines or a pending invitation is cancelled, then each succeeds (reduction stays open).

### STORY-6: Exits — open under suspension, closed under off-line
**Acceptance criteria:**
- Given a suspended group, when a member calls `leave_group` (or `leave_group_as_group`, `remove_member`, `pause_member`), then each succeeds — the trap is sprung.
- Given an off-line group, when anyone below the admin plane attempts any of those exits, then each refuses `'group is offline'` (memberships stay intact for the restore).
- Given a closed or archived group, when `leave_group` is called, then the existing refusal still fires (terminal semantics untouched).

### STORY-7: Off-line groups are findable, labeled, and that's it
**Acceptance criteria:**
- Given a member of an off-line group, when `get_member_groups` returns, then the group's row is present and carries `status='offline'`.
- Given an off-line group, when a non-admin calls `get_group_detail`, then the minimal payload returns (id, name, status — no roster, capability, or content keys); when a platform admin calls the admin reads, then full detail returns.
- Given the `groups_select` amendment, when a direct row read runs as a member/public viewer, then suspended and off-line rows are visible exactly where active rows would be (labeled visibility at every layer).

### STORY-8: Off-line content is quarantined at every read door
**Acceptance criteria:**
- Given an off-line group, when any content read contract is invoked below the admin plane (forum, announcements, group conversations + group-kind detail, roster, role fabric, group invitations, journey progress/summary, player state), then each refuses typed or returns the group-excluded shape; `get_my_conversations` omits the group's conversations; `get_my_enrollments` rows carry the status and are not playable.
- Given the RLS amendments, when a direct PostgREST SELECT runs as `authenticated` against `forum_posts`, `announcements`, `conversations`, `messages`, or the `journey_enrollments` group arm for an off-line group, then zero content rows return (the `is_conversation_participant` chokepoint proven for the conversations family).
- Given restore to active or suspended, when the same reads run, then content returns whole.

### STORY-9: The availability ceremonies move groups between three states
**Acceptance criteria:**
- Given a platform admin, when they take an active or suspended group off-line, then `status='offline'` lands with audit `group.offline`; when they suspend an active or off-line group, then `'suspended'` lands audited; when they reactivate either hold, then `'active'` lands audited.
- Given a non-admin, when any availability ceremony is invoked, then the admin plane's typed refusal family answers (the 42501 existence-hiding posture preserved).

### STORY-10: The legacy direct write doors close
**Acceptance criteria:**
- Given the migration applied, when write policies/grants on the four membership/role tables are enumerated, then no `authenticated`/`anon` write path remains; the signup and invitation-accept journeys run green post-apply (the Q1 verification set — the bootstrap policies proven vestigial).

### STORY-11: The full round-trip restores everything
**Acceptance criteria:**
- Given active → suspended → off-line → active, when each previously-held door and read is exercised after restore, then all succeed — both modes round-trip completely.

## Decomposition verification walk — payload ↔ consumer (FEAT-H038)

- `get_member_groups.status` (both values) → H038 STORY-5 labels (the one additive key; consumer named).
- The off-line minimal `get_group_detail` payload (id, name, status) → H038's found-but-that's-it shell — every shell-rendered field traces to those three keys.
- Canonical refusal messages `'group is suspended'` / `'group is offline'` → the Hub BFF mappers → H038 refusal copy (contract surface; changing either string is a paired-spec change).
- The availability ceremonies → H038 STORY-6 (mode choice + transitions rendered on the admin surfaces).
- `get_own_account_state` → H038 STORY-4 revalidation — untouched, walked for completeness.
- No concurrency AC describes an impossible race (the hold-mid-flight race is recorded accepted, not asserted).

## Platform dependencies

PC-3 substrate (`groups`, check constraint `20260228111514:23-24` — amended here); the PC-3 permission registry + role templates (the seed path); `admin_suspend_group` / `admin_reactivate_group` (FEAT-PC020 — amended here); `is_platform_admin()` for the admin arms.

## Cross-product impact

The Hub half is FEAT-H038 (paired; carries the ceremony UI with a dated pointer on FEAT-H035). Amended DS-3/DS-5 functions keep their owners; both domain §L4 summaries inherit a dated pointer at build. FEAT-PC020 gains a dated amendment note (ceremony semantics extended). The Gimbal inherits everything by construction (substrate enforcement, ADR-U038).

## Vertical impact

- **Privacy/GDPR:** No new personal data. Own-data exports deliberately unaffected by holds (the recorded Art. 15/20 verdict); erasure cascades untouched (the Mist rule holds); quarantine hides content, destroys nothing.
- **Notifications:** None — the DB-4 Eid deferral stands for both modes.
- **Administration:** One new ceremony + two amendments, all audited (`group.offline` extends the dotted namespace); enforcement gives the existing ceremonies their meaning.
- **Observability:** Hold refusals surface in BFF telemetry mirror-only (the Q2 standing criteria); the ceremony mutations write durable audit rows as all admin mutations do.
- **Transactions:** None.
- **Extensibility:** The status set stays an open check-constraint vocabulary; the exemption is a permission key in the open catalog (grantable beyond Steward later); no sealed lists.

## Performance budget

N/A (no surface). The guard is one indexed row read per write (`idx_groups_status_active`); the read-policy arms add one status predicate per row — the gate's ADR-U043 pass (dual signal) verifies no surface regression.

## Sibling-assertion sweep (mandatory at the gate)

Wide: ~28 write re-issues + the read-policy amendments + `is_conversation_participant` touch the forum, conversation, announcement, journey, and membership suites. The `leave_group` non-active refusal is pinned somewhere with near-certainty; the conversations-family policies are asserted in the C-series suites. Sweep and adapt in the gate PR, not at apply.
