# FEAT-PC023: Group availability enforcement contracts — Resting and Suspended grow teeth

---
id: FEAT-PC023
title: Group availability enforcement contracts (resting + suspended)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Group holds are marking-only, and the substrate is the exact *inverse* of the two-mode model Stefan ruled (RB-6/RB-7 amendment + the naming settle, [plan](../../../planning/hub-v2/phase-3-platform-ops-completion-plan.md)): today a non-active group is *hidden* at the row layer for direct readers while its *content stays wide open* through every read door — the model wants findable-and-labeled, with writes held and (under Suspended) content quarantined. The walk proved the write half live (W-3: the steward posted to a suspended group's forum **84 seconds after** suspension, DB-timestamped — [findings](../../../planning/hub-v2/2026-08-02-admin-live-walk-findings.md); under the settled model that group was in the *hard* state, so the post was a true violation — the walk's instinct was right). Substrate findings, each disk-anchored (two enumeration passes 2026-08-03, cumulative-forward over 99 migrations + live-DB verification):

1. **Only 8 of ~30 member-facing group-context write doors check group status.** The near-universal `groups.status` mention is a visibility gate that short-circuits for members — ~20 contracts read as covered and are not.
2. **`leave_group` traps members today.** `20260719190205:300-302` refuses leaving any non-active group (`P0001 'cannot leave a group that is not active'`) — under the model, leaving a *resting* group must succeed.
3. **Legacy direct write doors are live.** 13 write policies for `authenticated` + INSERT/UPDATE/DELETE grants (incl. `anon`) on `group_memberships`, `user_group_roles`, `group_roles`, `group_role_permissions` (`20260222000000`, never revoked; verified live 2026-08-03).
4. **Every content read is group-status-blind.** `get_group_forum` (`20260720120000:100`), `get_group_announcements` (`20260720200000:390`), `get_group_conversations` / `get_my_conversations` (`20260721100000:368,318`), `get_conversation_detail` (`20260720120000:310`), roster `get_group_memberships_of` (`20260706120000:447`), role/invitation reads, journey group reads (`20260708150000:496,331`; `20260708190000:17`; `20260718090200:34`) — all gate on membership or permission, never on group status. Suspending a group today changes nothing about content reachability.
5. **Reads are deliberately RLS-backed, and the grants are live.** The C-series left SELECT on RLS by design (its "contracts are the only door" comments scope to *writes* — `20260719230500:157`, `20260720200000:121`); verified live 2026-08-03: `authenticated` **and `anon`** hold SELECT on `groups`, `forum_posts`, `conversations`, `messages`, `announcements`, `group_memberships`, `journey_enrollments`. A direct PostgREST select bypasses every read contract — **content quarantine cannot be contract-only**.
6. **Findability breaks in the wrong direction.** `groups_select` (`20260228111514:44-61`) hides every non-active group from direct readers below platform admin; `search_invitable_groups` (`20260706120000:172`) and `get_acting_contexts` (`20260706150000:25`) hard-drop non-active groups; `get_member_groups` (`20260702130100:19-28`) lists them but carries no `status` to label them; only `get_group_detail` (`20260706170000:24`) surfaces status to a member.
7. **Two edges a group-status predicate cannot reach**, recorded for the verdicts below: DMs are pair-grain, never group-bound (`get_or_create_dm_conversation` inserts `kind='dm'` with no `group_id` — `20260720003000:49-50`), so suspending a group severs none of its members' existing DM channels; and the own-data export contracts (`get_own_messages_export` / `get_own_data_export`, `20260802120000:439,549`) carry group conversation bodies regardless of status.

### Why Platform Core (PC-3)

`groups` and its lifecycle are PC-3 substrate — this is enforcement of semantics PC-3 already owns (the status column, the ceremonies' meaning), not new Core capability; no Domain modelling could own the group lifecycle without inverting the dependency direction. The doors span owners (DS-5 communication, DS-3 journeys, PC-3 organisation) — schema predates partition; amendments land in each function's latest definition with ownership unchanged, calling the PC-3 guard (domain → core is the licensed direction, ADR-U047).

## Solution sketch

### The two-mode model (RB-6/RB-7 amendment + the 2026-08-03 naming settle, made contractual here)

Vocabulary: the Social Gathering family — **Active / Resting / Suspended** (vetted: `active` and `suspended` are the shipped values and `suspended` keeps its account-plane meaning of "an admin acted, this is grave"; `resting` is the one new value, in the village's own voice). The draft value `offline` never ships; the hard semantics land on the existing `suspended` value.

| | `resting` — the visible hold (steward fix) | `suspended` — the hard hold (hazards) |
|---|---|---|
| Findability | unchanged, labeled "Resting" | **unchanged, labeled "Suspended"** |
| Content reads | unchanged (read-only in effect) | **quarantined below the admin plane** |
| Member writes | refused typed | refused typed |
| `rest_group` permission holders | **fully exempt + control the state** | refused typed |
| Exits (leave / pause / decline / cancel / withdraw) | **open** | **refused** ("no one acts") |
| Admin plane | fully functional | fully functional |

### The `rest_group` permission (one key, both abilities)

New permission **`rest_group`**, seeded to the **Steward role template** and reaching platform admins through the live `auto_grant_permission_to_deusex` mechanism. One key deliberately covers both abilities — *setting/unsetting* the resting state and *acting inside* a resting group — because the toggle strictly dominates the exemption (a holder could always wake, act, re-rest; splitting protects nothing today). If a role ever needs act-without-toggle (a Guide facilitating through a rest), the open catalog admits a second key then — recorded, not built. Permission-keyed, never role-name-keyed (the products-tier rule); the registry's migration+seed mutation path (the PC015 `act_as_group` precedent).

### The guard

`assert_group_writable(p_group_id, p_actor_group_id)` (PC-3, net-new): `active` → silent; `resting` → silent iff the actor holds `rest_group` in the group, else `P0001` `'group is resting'`; `suspended` → `P0001` `'group is suspended'` for everyone below the admin plane. One guard call per door. The write matrix (door-by-door dispositions from the 2026-08-03 enumeration — ~28 frozen / the exit family open-by-design / seven already guarded) carries over, with the exemption applied inside the guard and the exit family additionally refused under `suspended` only.

**The `leave_group` amendment:** `20260719190205:300` admits `'resting'`; refuses `'suspended'` with the canonical message; `closed`/`archived` refusals unchanged (terminal semantics are C-E's, untouched).

### The state-transition contracts

- **Member plane (permission-gated by `rest_group`):** `rest_group(p_group_id)` (`active → resting`) and `wake_group(p_group_id)` (`resting → active`) — symmetric; a steward who rested their group wakes it. Member-plane actions: telemetry mirror, no admin-audit row (the close/delete precedent). The permission key and the rest contract share a name deliberately — the ability and its door.
- **Admin plane (audited, `admin_* → PC-4` pin):** `admin_suspend_group` amended (`active|resting → suspended`); `admin_reactivate_group` (`suspended → active`, unchanged direction); thin `admin_rest_group` / `admin_wake_group` wrappers composing the member contracts and adding audit rows `group.rest` / `group.wake` (the ADM-18 compose-through-the-walls idiom). **Every transition touching `suspended` is admin-only** — a steward can never wake a suspended group; there is no direct `suspended → resting` move (reactivate first, then rest). FEAT-PC020 gains a dated amendment note.

### Findability + content quarantine (the read plan)

- `get_member_groups` gains `status` (additive — labels both holds). `get_group_detail` returns a **minimal payload** (id, name, status) below the admin plane when suspended — found, labeled, that's it. `groups_select` RLS gains the labeled-visibility arm (`status IN ('active','resting','suspended')` on its member/public arms) so the row layer agrees with the contracts.
- **Content read contracts refuse or exclude when suspended** (below admin): forum, announcements, group conversations + group-kind conversation detail, roster, role fabric, group invitations, group journey progress/summary, player state for the group's enrollments; `get_my_conversations` omits the group's rows (they return on restore); `get_my_enrollments` rows carry the group status and stop being playable. Resting-group reads are untouched.
- **The RLS read policies gain the not-suspended arm** (finding 5 makes this mandatory): `forum_select`, `announcements_select_community`, the `journey_enrollments` group arm — and the conversations family through one chokepoint: `is_conversation_participant()` (`20260719230500:114`) amended to exclude group-kind conversations of suspended groups, closing `conversations` / `messages` / `conversation_participants` in one place. The C-series read-on-RLS posture is kept — amended, not revoked.
- **Recorded, deliberate:** `search_invitable_groups` and `get_acting_contexts` keep dropping non-active groups (they enumerate *actionable* targets; a held group is not one). An invitation *from* a held group still renders the group's name in `get_my_invitations` (identity-level; accepting is refused by the guard).

### Verdicts recorded at decomposition (confirmed with Stefan 2026-08-03)

- **DMs stay live across a suspension** — pair-grain channels are structurally out of a group predicate's reach; person-level hazards are member-suspension's job (ADM-C, shipped). Accepted scope.
- **Own-data exports are unaffected by any hold** — the Art. 15/20 right over your own data is not suspendable by moderation state. Accepted scope.
- **Vocabulary near-miss recorded:** `resting` (imposed on the group by a permission holder) is distinct from `paused` (chosen by a member for their own account/membership) — placed vs. chosen, stated once here so the two never blur. The ceremony verb is "rest", never "put to rest".

One schema gate: the check-constraint change (+`'resting'`), the `rest_group` permission seed, the guard, ~28 guard re-issues + the exit amendment, the four transition contracts + two ceremony amendments, the read-contract minimalizations, the RLS read-policy amendments, the legacy write-door closure, the `get_member_groups` additive. Red-first; PR held with red evidence + apply commands for named approval. At apply, verify zero relic held groups (the walk reactivated its practice pair; confirm before the hard semantics land on `suspended`).

## Appetite

The platform half of cycle HYG-A — grown by the two-mode model and the rest contracts; still one cycle. If the gate PR gets unwieldy, split it into two serial gates (write plan + transitions, then read plan) rather than cutting scope.

## Rabbit holes

- **The hold-mid-flight race is accepted** (single-statement contracts; a write racing the flip lands as pre-hold). No `FOR SHARE` on the group row.
- **No wholesale SELECT revoke.** The C-series read-on-RLS posture stands; policies are amended, not retired.
- **No per-door configurability** (ADM-14 territory, deferred dated).
- **No trigger-tier enforcement** (blind to admin/system paths; the contract tier is where member-facing intent lives).
- **No `act_while_resting` split** — one key now; the catalog stays open for it (recorded above).

## No-gos

- ~~No member notifications on any transition — sanction-communication kinds stay the Eid deferral (DB-4).~~ **Ruled into Ferd 2026-09-03 (Stefan, the leftovers pass — TASK-DB4-01):** the notices and the reason are [FEAT-PC030](./FEAT-PC030-sanction-communication-contracts.md) (this feature's transition contracts re-issued with `p_reason`) over [FEAT-PD021](../../domain/features/FEAT-PD021-sanction-notification-kinds.md); this spec's law is otherwise unchanged.
- ~~No member-facing reason for a hold (the label states the state, never the why — Eid).~~ **Superseded by the same ruling** — `groups.hold_reason`, served to members by `get_group_detail` (FEAT-PC030 STORY-4).
- No DM severing (the recorded verdict above).
- No realtime hold push (the refresh-based no-go stands; in-session discovery is FEAT-H038's W-7).
- No unsuspend-request or appeal flow; no steward path out of `suspended`.

## Stories

### STORY-1: The guard exists and refuses typed, per mode
As the platform, I want one canonical availability guard, so that every door refuses each mode identically.

**Acceptance criteria:**
- Given a resting group, when a frozen door is invoked by a member without `rest_group`, then it raises `P0001` `'group is resting'` and writes nothing.
- Given a suspended group, when any member-facing door is invoked by anyone below the admin plane — `rest_group` holders included — then it raises `P0001` `'group is suspended'` and writes nothing.
- Given an active group, when any door is invoked, then the guard is silent and behavior is byte-identical to before.

### STORY-2: The `rest_group` permission — seeded, symmetric, honest
As a steward, I want to rest and wake my group and keep working while it rests, so that I can tend it through a fix.

**Acceptance criteria:**
- Given the migration applied, when the permission catalog is read, then `rest_group` exists, the Steward role template carries it, and platform admins hold it through the auto-grant mechanism (seed-verified; the catalogue-equals-manifest pins adapted).
- Given an active group, when a `rest_group` holder calls `rest_group()`, then the group is resting; when they call `wake_group()` on it, then it is active again — and a member without the permission is refused typed on both.
- Given a resting group, when a `rest_group` holder posts, moderates, edits settings, or manages roles there, then each succeeds; when the same member acts in a resting group where they lack the permission, then they are refused like any member (permission-scoped, never identity-scoped).
- Given a suspended group, when a `rest_group` holder calls `wake_group()` or `rest_group()`, then each refuses — no steward path out of or into the hard state.

### STORY-3: The communication plane freezes for the non-exempt (resting)
**Acceptance criteria:**
- Given a resting group, when a non-exempt member posts/replies/edits in the forum, sends or retracts an announcement, or creates/joins/sends in a group conversation, then each refuses typed — the W-3 class closes for non-holders (the holder path is STORY-2's).

### STORY-4: The journey plane freezes; withdrawing stays open (resting)
**Acceptance criteria:**
- Given a resting group, when a non-exempt member self-enrols, enters/completes a step, saves a response, or toggles sharing, then each refuses typed; when they withdraw from the group's journey, then it succeeds.

### STORY-5: The organisation plane freezes on the growth half (resting)
**Acceptance criteria:**
- Given a resting group, when a non-exempt member invites, accepts an invitation, or changes roles/settings/membership-activation, then each refuses typed; when an invitee declines or a pending invitation is cancelled, then each succeeds (reduction stays open).

### STORY-6: Exits — open under resting, closed under suspension
**Acceptance criteria:**
- Given a resting group, when a member calls `leave_group` (or `leave_group_as_group`, `remove_member`, `pause_member`), then each succeeds — the trap is sprung.
- Given a suspended group, when anyone below the admin plane attempts any of those exits, then each refuses `'group is suspended'` (memberships stay intact for the restore).
- Given a closed or archived group, when `leave_group` is called, then the existing refusal still fires (terminal semantics untouched).

### STORY-7: Held groups are findable, labeled, and (suspended) that's it
**Acceptance criteria:**
- Given a member of a resting or suspended group, when `get_member_groups` returns, then the group's row is present and carries its status.
- Given a suspended group, when a non-admin calls `get_group_detail`, then the minimal payload returns (id, name, status — no roster, capability, or content keys); when a platform admin calls the admin reads, then full detail returns. Given a resting group, when `get_group_detail` is called, then the full payload returns as today.
- Given the `groups_select` amendment, when a direct row read runs as a member/public viewer, then resting and suspended rows are visible exactly where active rows would be (labeled visibility at every layer).

### STORY-8: Suspended content is quarantined at every read door
**Acceptance criteria:**
- Given a suspended group, when any content read contract is invoked below the admin plane (forum, announcements, group conversations + group-kind detail, roster, role fabric, group invitations, journey progress/summary, player state), then each refuses typed or returns the group-excluded shape; `get_my_conversations` omits the group's conversations; `get_my_enrollments` rows carry the status and are not playable.
- Given the RLS amendments, when a direct PostgREST SELECT runs as `authenticated` against `forum_posts`, `announcements`, `conversations`, `messages`, or the `journey_enrollments` group arm for a suspended group, then zero content rows return (the `is_conversation_participant` chokepoint proven for the conversations family).
- Given restore to active (or a resting group generally), when the same reads run, then content returns whole.

### STORY-9: The transitions — permissioned rest, admin-only suspension
**Acceptance criteria:**
- Given a platform admin, when they suspend an active or resting group, then `status='suspended'` lands with its audit row; when they reactivate a suspended group, then `'active'` lands audited; when they rest or wake through the admin ceremonies, then the member contract composes and `group.rest` / `group.wake` audit rows land.
- Given a non-admin without `rest_group`, when any transition contract is invoked, then the typed refusal answers (the admin family keeps its 42501 existence-hiding posture).
- Given steward-initiated rest/wake, then no admin-audit row is written (member-plane action — telemetry mirror only, the close/delete precedent).

### STORY-10: The legacy direct write doors close
**Acceptance criteria:**
- Given the migration applied, when write policies/grants on the four membership/role tables are enumerated, then no `authenticated`/`anon` write path remains; the signup and invitation-accept journeys run green post-apply (the Q1 verification set — the bootstrap policies proven vestigial).

### STORY-11: The full round-trip restores everything
**Acceptance criteria:**
- Given active → resting → (admin) suspended → active → resting → active, when each previously-held door and read is exercised after each restore, then all succeed — both modes and both transition planes round-trip completely.

## Decomposition verification walk — payload ↔ consumer (FEAT-H038)

- `get_member_groups.status` (`'resting'` / `'suspended'`) → H038 STORY-5 labels (the one additive key; consumer named).
- The suspended minimal `get_group_detail` payload (id, name, status) → H038's found-but-that's-it shell — every shell-rendered field traces to those three keys.
- Canonical refusal messages `'group is resting'` / `'group is suspended'` → the Hub BFF mappers → H038 refusal copy (contract surface; changing either string is a paired-spec change).
- `rest_group()` / `wake_group()` + the capability flag for holding `rest_group` → H038 STORY-6 (the settings-page Rest/Wake control renders by permission flag; the flag rides the existing capability-flag idiom on the group detail payload — the PC010/PC011 precedent).
- The admin ceremonies → H038 STORY-6 (mode choice + transitions rendered on the admin surfaces).
- `get_own_account_state` → H038 STORY-4 revalidation — untouched, walked for completeness.
- No concurrency AC describes an impossible race (the hold-mid-flight race is recorded accepted, not asserted).

## Platform dependencies

PC-3 substrate (`groups`, check constraint `20260228111514:23-24` — amended here); the PC-3 permission registry + role templates (the seed path) and the `auto_grant_permission_to_deusex` mechanism; `admin_suspend_group` / `admin_reactivate_group` (FEAT-PC020 — amended here); `is_platform_admin()` for the admin arms; `has_permission()` for the guard's exemption arm.

## Cross-product impact

The Hub half is FEAT-H038 (paired; carries the steward Rest/Wake control and the admin ceremony UI, with a dated pointer on FEAT-H035). Amended DS-3/DS-5 functions keep their owners; both domain §L4 summaries inherit a dated pointer at build. FEAT-PC020 gains a dated amendment note (ceremony semantics extended). The Gimbal inherits everything by construction (substrate enforcement, ADR-U038).

## Vertical impact

- **Privacy/GDPR:** No new personal data. Own-data exports deliberately unaffected by holds (the recorded Art. 15/20 verdict); erasure cascades untouched (the Mist rule holds); quarantine hides content, destroys nothing.
- **Notifications:** None — the DB-4 Eid deferral stands for all transitions.
- **Administration:** `admin_suspend_group` amended + `admin_rest_group`/`admin_wake_group` wrappers, all audited (`group.rest`/`group.wake` extend the dotted namespace); steward rest/wake is member-plane by design (recorded).
- **Observability:** Hold refusals and steward rest/wake surface in BFF telemetry mirror-only (the Q2 standing criteria); the admin ceremony mutations write durable audit rows as all admin mutations do.
- **Transactions:** None.
- **Extensibility:** The status set stays an open check-constraint vocabulary; `rest_group` is a permission key in the open catalog (grantable beyond Steward; a future `act_while_resting` split stays available); no sealed lists.

## Performance budget

N/A (no surface). The guard is one indexed row read plus, on the resting arm only, one `has_permission()` call per write (`idx_groups_status_active`); the read-policy arms add one status predicate per row — the gate's ADR-U043 pass (dual signal) verifies no surface regression.

## Implementation notes (platform half built 2026-08-03, Cycle HYG-A — held at the schema gate)

- **Red-first:** gate suite `hub/tests/integration/groups/group-availability-enforcement.test.ts` (117 cells), demonstrated at head 2026-08-03: **100 failed / 17 passed** — the 17 greens are exactly the labelled set: the already-guarded seven (`close_group`, `delete_group`, `hand_stewardship_to_deusex`, `invite_group`, `enroll_group_in_journey`, `nominate_steward`, `respond_to_stewardship_nomination`) + the invariant pins (DM-stays-live ×2, admin full-detail read, anon zero-rows ×2, active-control ×2, the grp_insert continuity pin, bootstrap-accept). The W-3 class demonstrated live at head: every frozen door **succeeded** against a suspended group.
- **The enumeration settled at build (the spec's ~28 resolves):** 26 guard-frozen doors · 10 exit-family amendments (suspended-refusal only) · 12 read-door amendments · the seven already guarded · `leave_group` the 8th status-checker (the trap, amended). Door-by-door dispositions with anchors are in the migration header (`20260803190000`).
- **Contract surface recorded for FEAT-H038:** refusal strings `'group is resting'` / `'group is suspended'` (P0001); `get_member_groups.status` (additive column, `RETURNS TABLE` forced drop+recreate+re-grant); `get_my_enrollments` group-arm rows carry **`group_status`** (key name fixed here); the suspended `get_group_detail` minimal payload is exactly `{id, name, status}`.
- **Build resolutions (judgment calls the spec left open, each recorded):** `enroll_self_in_journey` anchors on `v_journey.created_by_group_id` with the Mist-onboarding designation branch left unwalled (ADR-U045 Amendment 1); step doors anchor on `v_enr.group_id` unconditionally (personal walks anchor on a personal group — never suspendable, `admin_suspend_group` is engagement-only); `send_message` guards only group-kind conversations via a new `v_hold_group` lookup (DMs pair-grain, the recorded verdict); `retract_announcement` guards its community branch only (the platform branch is the admin plane); exits carry an `is_platform_admin` bypass arm matching the guard's; `mark_conversation_read`-class bookkeeping left unguarded (the `is_conversation_participant` chokepoint already closes suspended conversations); `get_group_memberships_of` left untouched (it lists the acting group's own contexts — a listing, not content; the roster quarantine lands via the minimal payload, verified: no standalone Hub members route exists).
- **Ownership manifest untouched-correctly:** the five new functions (`assert_group_writable`, `rest_group`, `wake_group`, `admin_rest_group`, `admin_wake_group`) resolve to CORE via `functionOwner()`'s fail-closed default; every re-issued DS-3/DS-5 function keeps its explicit owner; signatures byte-identical (COR-A pattern).
- **Live-DB facts at authoring (2026-08-03):** 14 write policies live on the four legacy tables (the dossier's "13" was one under — `gm_delete_admin`/`ugr_delete_admin`/`ugr_insert_admin` vestigial admin-plane rows included in the drop; STORY-10's "zero write paths" is the binding claim); full INSERT/UPDATE/DELETE grants live for authenticated AND anon (revoked); zero relic held groups (the apply precondition already holds).
- **Sibling-assertion sweep:** run pre-gate, zero invalidated; the deliberately-left set is named in the migration header.

## Sibling-assertion sweep (mandatory at the gate)

Wide: ~28 write re-issues + the read-policy amendments + `is_conversation_participant` touch the forum, conversation, announcement, journey, and membership suites. The `leave_group` non-active refusal is pinned somewhere with near-certainty; the conversations-family policies are asserted in the C-series suites; the B-RBAC catalogue-count pins move by one with the `rest_group` seed. Sweep and adapt in the gate PR, not at apply.

## Gate close (applied 2026-08-03 on Stefan's named approval, PR #390)

- **Apply:** `20260803190000` applied + history repaired (local = remote). Pre-apply precondition re-verified and REPAIRED: three relic held groups found (this cycle's own red-run fixtures — `cleanupTestGroup`'s bare DELETE hits the last-leader wall, which bypasses only on `closed`) — cleaned via journeys → close → delete before the apply; zero held groups at apply.
- **Gate suite: 117/117 green** (was 100 red / 17 labelled-green at head — the full red→green arc across the apply).
- **Full integration:** 70-suite sweep post-apply surfaced 9 failures, each diagnosed, fixed, and its suite re-run green (134/134 across the six re-run suites; the other 65 passed in the sweep itself):
  - **Six labelled sibling adaptations** (the sweep-miss class, 4th instance — the pre-gate grep missed multi-line `.from(...).update()` chains): PC012's direct self-accept cell pinned the OPEN door (now refused 42501, row stays invited); PC013 ×3 refusal cells sharpened from RLS-zero-rows to the 42501 grant refusal; PC013 + PC014 admin direct-DELETE cells — **the closure deliberately covers the admin RLS write policies too**; the admin plane acts via the audited ADM-C contracts (`admin_remove_member_from_group`), and both cells now pin the closed door.
  - **The classification-completeness gate** caught the five new functions live-but-undeclared (the fail-closed `functionOwner()` default does NOT satisfy GC-1's by-declaration rule): registered `assert_group_writable`/`rest_group`/`wake_group` → PC-3, `admin_rest_group`/`admin_wake_group` → PC-4 (the admin_*-is-PC-4 pin honoured).
  - **Found-not-caused (fenced, fixed at source):** seven zero-step `PC021ops hild journey` relics (accreting one per `member-administration-operations` run since 2026-08-01 — the fixture is owned by the target's PERSONAL group, outside `cleanupTestGroup`'s sweep) tripped PD003's global step invariant at the first full sweep since; relics deleted, and the ops suite's `afterAll` now cleans its journey.
- **Q1 bootstrap-vestigial proof:** signup (`entry.spec.ts` 3/3) + invitation-accept (`invitations.spec.ts`) E2E green against the live server (one transient management-API cleanup-hook timeout on the first combined run, refuted by an immediate control re-run — the `isManagementApiTransient` class).
- **Live re-query at close:** 0 write policies and 0 authenticated/anon write grants on the four legacy tables; `rest_group` seeded; the constraint admits `resting`.
