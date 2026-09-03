# FEAT-PC030: Sanction communication contracts — a member-facing reason on every hold transition, carried to the affected as locked-on notices

---
id: FEAT-PC030
title: Sanction communication contracts — the seven hold-family transitions gain a reason (required on the admin sanctions, optional on the Steward's rest/wake), record it on the current hold (`groups.hold_reason`, `users.suspension_reason`) and in the audit row, and write a locked-on notice to every affected member; the current-hold reads carry the reason; the groups SELECT grant becomes column-scoped so the reason reaches members only — the platform half of DB-4 (Hub GRP-10 / IDN-13)
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The hold family exists and is contractual — `rest_group` / `wake_group` (Steward, key `rest_group`), `admin_rest_group` / `admin_wake_group` / `admin_suspend_group` ([FEAT-PC023](./FEAT-PC023-group-suspension-enforcement-contracts.md), migration `20260803190000:4191-4440`), `admin_reactivate_group` ([FEAT-PC020](./FEAT-PC020-group-administration-contracts.md), `20260801120000:280`), and `admin_update_user_status(target_user_id, new_is_active)` ([FEAT-PC021](./FEAT-PC021-member-administration-contracts.md), `20260801190000:142`). Each lands its state and (the admin ones) an audit row. **None takes a reason, and none tells anyone.** The member-facing surfaces say the state, never the why (`SuspendedGroupShell.tsx:8` — "no why"; `AccountStateView.tsx:88` — "contact support"). FEAT-PC023 and FEAT-H038 filed exactly this as the Eid deferral (DB-4); Stefan ruled it into Ferd on 2026-09-03 ([TASK-DB4-01](../../../planning/backlog/tasks/TASK-DB4-01-sanction-communication-pulled-into-ferd.md)). The decision board's eight rulings (bridge `2026-09-03_04`) are this spec's defaults.

### Why Platform Core (PC-4, with PC-3's two contracts in the same gate)

The sanctions are PC-4 admin operations and their audit is PC-4's; the reason is part of the act, so it is written where the act is. The Steward's rest/wake are PC-3's contracts (FEAT-PC023) — they gain the *optional* note in the same migration because the freeze-and-notify shape is one shape, and splitting it across two gates would leave the member hearing about admin holds but not their own Steward's. The notice rows are written as obligation-fulfilment into the Notifications vertical substrate (`public.notifications` — written by every tier, never a crossing; ADR-U047 rule 5, manifest note), against the kinds [FEAT-PD021](../../domain/features/FEAT-PD021-sanction-notification-kinds.md) registers. Not modellable in a Domain Service: the transitions are Core's, and a DS-5 hook on Core's state change would invert the one-way rule.

## Solution sketch

### Part 1 — the reason, recorded where the act is

- **`groups.hold_reason text null`** (PC-3's table; written by the hold contracts; set on rest/suspend, **cleared** on wake/reactivate) and **`users.suspension_reason text null`** (PC-2's table; set on suspend, cleared on reinstate). The *current* hold's reason lives on the row so the current-hold reads can serve it without reading the audit log across areas; the *history* lives in `admin_audit_log.metadata.reason` on the admin rows as today's rows carry `previous_status` (`20260803190000:4427-4430`).
- **The seven contracts re-issued with `p_reason text default null`** (DROP + CREATE — an added defaulted parameter is a new overload, and PostgREST refuses an ambiguous name; grants re-issued per migration-README row 4; names unchanged, so the manifest is untouched):
  - `admin_suspend_group`, `admin_reactivate_group`, `admin_rest_group`, `admin_wake_group`, `admin_update_user_status`: **reason required** — `22023 'Reason required'` when null or blank, the FEAT-PC026 ceremony shape (`admin_moderate_group_forum_post`, `20260804230000:600-602`).
  - `rest_group`, `wake_group`: reason **optional** — the Steward's note to their members.
  - Every other rule byte-identical (the PC023 guard, the admin wall, the status transitions, the existing audit actions `group.rest` / `group.wake` / `group.suspend` / `group.reactivate` / `member.suspend` / `member.reactivate`). The audit metadata gains `reason`.
- **The current-hold reads carry the reason:** `get_group_detail` (PC-3, `20260803190000` re-issue) gains `hold_reason` for **active members** (null for non-members and on an active group); `get_account_state` ([FEAT-PC004](./FEAT-PC004-account-state-read.md)) gains `suspension_reason` on the caller's own row. Additive keys; payloads jsonb-additive.

### Part 2 — the notice, to everyone affected

- On each transition the contract writes the notice rows itself, **one per active member** (FIM, `is_active`), kind per transition (PD021), title = the kind's label, body = the reason verbatim (or the kind's label when the Steward gave none), `group_id` = the group. **Not** a group-addressed row: FEAT-PD020's expansion reaches `act_as_group` holders ∪ Stewards only (`20260815223000`, read at decomposition), which is the wrong audience for a hold; the per-member insert-select is the FEAT-PD011 announcements precedent (`20260720200000:237-248`). For the account holds: one row to the sanctioned member's personal group. The actor is never a recipient of their own act.
- The dispatcher decides delivery as it does for every row (`ds5_apply_notification_preference`, PD016); `sanctions` and `account` are locked on, so the rows land. The notices carry no `action_type` — plain notices, nothing to answer.

### Part 3 — the reason reaches members only (the direct-caller answer)

`public.groups` carries a table-level SELECT grant (Supabase's default — no migration ever scoped it; SEC-02 narrowed DML only), and a public group's row is visible to every authenticated session through RLS. A reason that "can name a third party" must not be readable by a stranger who happens to look at a public suspended group directly through PostgREST. The migration therefore converts the groups SELECT grant to **column-level for `authenticated` and `anon` — every current column except `hold_reason`**, enumerated from the catalog at the gate (the FEAT-PC003 S2 pattern on `users`, `20260702120000:40-48`). `users.suspension_reason` needs nothing: `users` is already column-scoped and a new column is not in the list. Sweep at decomposition: **zero** client-role `select('*')` on `groups` anywhere in `hub/tests/integration` (39 client selects, all column-named); the Hub reads `groups` only through contracts (API-first).

## Appetite

Medium-plus — one migration (two columns, seven DROP + CREATE re-issues with grants, two read re-issues, the column-scoped SELECT grant, the PD021 rows), a large sibling sweep, one integration suite. One schema gate, held for the named approval. Cut line if it swells: the Steward's optional note on rest/wake ships last (the admin sanctions are the ruling's core).

## Rabbit holes

- **Don't build a taxonomy of reasons.** One free-text field, member-facing; no category enum (Ferd non-closure); an internal admin-only note is Eid's if ever.
- **Don't re-implement the fan-out as a trigger.** A status trigger on `groups` would also fire on close/delete/exit; the contracts know the reason and already write the audit — one home.
- **Don't touch the announcements or the bell.** The kinds are plain notices; FEAT-H031's typed actions are for answers, and there is nothing to answer.
- **Don't widen the hold family.** Closure, deletion, member removal and platform exit have their own notices and paths; DB-4 is rest / wake / suspend / reactivate / account suspend / reinstate.
- **Don't let the reason leak by omission.** The column-scoped SELECT is part of the same migration as the column, never a follow-up.

## No-gos

- No member notification on closure/deletion/removal changes (existing kinds stand).
- No Steward-side suspension (suspend stays admin-only, PC023 STORY-9).
- No reason edit after the fact — a changed reason is a new transition.
- No push, email or realtime for these notices beyond what every notification row already gets (the bell's hint).

## Stories

### STORY-1: The admin sanctions require a reason and record it
As the platform, I want every admin hold transition to carry a member-facing reason, so the act is complete and auditable in one call.

**Acceptance criteria:**
- Given a platform admin, when they call `admin_suspend_group(group, reason)` with a non-blank reason, then `status = 'suspended'`, `groups.hold_reason = reason`, and the audit row's metadata carries `reason` alongside `previous_status`; when they call it with a null or blank reason, then `22023 'Reason required'` and nothing changes.
- Given `admin_reactivate_group(group, reason)`, then `status = 'active'`, `hold_reason` is cleared to null, the audit metadata carries the reason; blank → `22023`.
- Given `admin_rest_group` / `admin_wake_group`, the same shape on `resting` ↔ `active`.
- Given `admin_update_user_status(user, false, reason)`, then `is_active = false`, `users.suspension_reason = reason`, audit metadata carries it; `(user, true, reason)` clears it; blank → `22023` either way.
- Given a non-admin, when they call any admin contract with a reason, then the existing refusal (42501) answers unchanged — the reason never widens the wall.

### STORY-2: The Steward's rest/wake carry an optional note
As a Steward, I want to leave a note when I rest or wake my group, so my members hear why from me.

**Acceptance criteria:**
- Given a `rest_group` holder, when they call `rest_group(group, note)`, then `resting` lands with `hold_reason = note`; when they call `rest_group(group)` (no note), then `resting` lands with `hold_reason` null — never refused for the missing note.
- Given `wake_group`, then `active` lands and `hold_reason` is cleared regardless of the note.
- Given the PC023 refusals (suspended group, not active, no key), then they answer byte-identically with or without a note.

### STORY-3: Every affected member hears, and cannot be spared
As a member, I want a notice on every hold transition of my group or my account, so I never discover a hold by bumping into a wall.

**Acceptance criteria:**
- Given a group with three active members and the acting Steward, when the group is rested with a note, then exactly the three members receive a `group_rested` row (title = the kind's label, body = the note, `group_id` = the group) and the actor receives none; a paused-membership or non-FIM member receives none.
- Given an admin suspension of that group, then each active member receives `group_suspended` with the reason as body; reactivation → `group_reactivated`; admin rest/wake → `group_rested` / `group_woken`.
- Given a member who muted every suppressible category, then the row still lands (`sanctions` is locked on — FEAT-PD021 STORY-1).
- Given `admin_update_user_status(user, false, reason)`, then exactly one `account_suspended` row lands on the member's personal group with the reason as body; reinstatement → `account_reinstated`.
- Given a Steward rest with no note, then the body is the kind's label — never an empty body.

### STORY-4: The current-hold reads say why — to the right people
As a surface, I want the current hold's reason on the reads I already consume, so the wall and the label can say why without a second read.

**Acceptance criteria:**
- Given an active member of a resting or suspended group, when they call `get_group_detail(group)`, then the payload carries `hold_reason` (the current hold's reason, or null when the actor gave none); given a non-member on a public held group, then `hold_reason` is null; given an active group, then null.
- Given a suspended member, when they call `get_account_state()`, then the payload carries `suspension_reason`; given an active member, then null.
- Given a direct PostgREST caller (`authenticated`, a Mist included), when they `SELECT hold_reason FROM groups`, then `42501 permission denied` (the column-scoped grant); every other column still reads under RLS as before. Given a direct `SELECT suspension_reason FROM users`, then `42501` (the existing S2 column list does not include it).
- Given the groups SELECT grant is column-scoped, when the existing suites' client reads run (39 column-named selects), then nothing else changes — pinned by the sibling sweep.

### STORY-5: The family's law is unchanged
As the platform, I want the re-issues to change nothing but the reason and the notice, so the sibling suites stay green as pins, not adaptations.

**Acceptance criteria:**
- Given the FEAT-PC023 availability gate suite (117 cells) and the PC020/PC021 admin suites, when run after apply with no reason passed by the old callers, then every refusal, transition and audit action is byte-identical (the defaulted parameter; the admin contracts' `22023` fires only on the new admin paths the Hub now always sends a reason on — the suites' existing admin cells are ADAPTED to pass a reason, labelled).
- Given the migration header, then it names every suite that references any of the seven contracts (17 files at decomposition: `grep -rlE "rest_group|wake_group|admin_suspend_group|admin_reactivate_group|admin_update_user_status" hub/tests`), each marked adapted (a reason added) or left.

## Platform dependencies

**Existing, Conformant:** the hold family (PC023/PC020/PC021), the audit log (PC-4), the notifications vertical substrate + PD013/PD016 (kinds, dispatcher), `get_group_detail` (PC010/PC023), `get_account_state` (PC004). **New in the same gate:** the FEAT-PD021 registry rows. **Schema gate:** two columns, seven DROP + CREATE re-issues, two read re-issues, one column-scoped SELECT grant → `review`, the named approval. The reviewer reads every re-issued function's ACL (a DROP loses it) and the applied `groups` column grants.

## Cross-product impact

The **Hub** ([FEAT-H049](../../../products/hub/features/FEAT-H049-sanction-communication-surfaces.md)) collects the reason in the ceremonies and renders it on the wall, the label and the account surface; the **Gimbal** inherits everything by calling the same contracts. FEAT-PC023 and FEAT-H038 No-gos amended with the dated ruling.

## Vertical impact

- **Privacy/GDPR:** the load-bearing one. A reason can name a third party; the ceremony labels the field *"shown to the group's members"* (FEAT-H049) and the reason travels only to the affected members' own notification rows and to the reads those members already have; the column-scoped SELECT keeps a public group's reason off the direct-caller path; the audit copy is PC-4-private. Basis: the hold itself is a platform act under legitimate interest (ADR-U052 §4 posture for the admin plane); telling the affected member why is a fairness obligation, not a new processing purpose. The reason is not exported to third parties; it appears in the member's own data export only as their own notification rows (FEAT-PC008's existing shape).
- **Notifications:** is the feature's second half — six kinds, locked on (PD021); one row per affected member; no push beyond the row.
- **Administration:** the reason becomes part of every admin hold act (required), audited; the Steward's note is optional and member-plane (no admin audit, the PC023 STORY-9 posture).
- **Observability:** audit metadata carries the reason; refusals are typed (`22023` reason-required, the existing 42501/P0001 family); the notice rows are traceable to the transition by `group_id` + kind + `created_at`.
- **Transactions:** None.
- **Extensibility:** the reason is free text (no category enum); the kinds are registry rows; the added parameter is defaulted (old callers keep working); no CHECK list extended.

## Performance budget

N/A (no surface). One insert-select per group transition (bounded by active membership); the reads gain one column each.

## Open spec questions

None open. The DB-4 board rulings 2, 3, 4, 5 and 7 (bridge `2026-09-03_04`) are adopted as this spec's defaults; reversing any reopens the affected story. Two decomposition findings changed the shape relative to the board: the PD020 expansion audience (Part 2) and the table-level `groups` SELECT grant (Part 3) — both are mechanism reads, not new decisions.

## Implementation notes

**Built 2026-09-03 (TASK-DB4-01), migration `20260903120000_db4_pc030_pd021_sanction_communication.sql` §2–§7 — applied 2026-09-03 on Stefan's named approval ("you have my blessing to do the migration (ref. Migration (one schema gate, held for your named approval))"), repaired to `applied`.** One gate for the three specs; the Hub half is FEAT-H049.

- **What landed, as specified:** `groups.hold_reason` and `users.suspension_reason` (both `text null`, commented with the ADR-U038 posture); the seven contracts DROPPED and re-CREATED with `p_reason text default null` (one overload each — asserted at apply), the five admin sanctions refusing `22023 'Reason required'` on null/blank *after* the admin wall (a non-admin's 42501 is unchanged), the Steward's `rest_group` / `wake_group` taking the note optionally (blank is none); the audit metadata gains `reason`; `get_group_detail` gains `hold_reason` (active members only, only while resting/suspended — on the full payload **and** the PC023 STORY-7 minimal suspended payload the member's wall reads); `get_own_account_state` gains `suspension_reason` (null while active); the `groups` SELECT grant converted from table-level to **column-level for `authenticated` and `anon`** — the 14 catalog columns minus `hold_reason`, self-checked at apply (no client-role SELECT on `hold_reason`; no table-level `r` survives).
- **The notice, as built:** each transition writes one row per **active FIM member** — `group_memberships.status = 'active'` joined to `users` on `personal_group_id` with `is_temporary = false` and `is_active = true` — **the actor excluded**; a paused membership, a sub-group member (an engagement group as member), a Mist, and a suspended account receive nothing. `title` = the kind's registry label read at write time; `body` = the reason verbatim (the label when the Steward gave none — `body` is NOT NULL); `payload` = `{group_id, group_name}` and `group_id` = the group (the `pause_member` precedent), so the bell can link; the account holds write one row to the member's personal group with `group_id` null and an empty payload. `admin_rest_group` / `admin_wake_group` delegate to `rest_group` / `wake_group` with the reason, so the fan-out has one home per transition and the admin's rest is a `group_rested` like the Steward's. No new function — the manifest is untouched.
- **Test-first (integration, `hub/tests/integration/admin/sanction-communication-contracts.test.ts`, 19 cells over STORY-1..4, STORY-5 as labelled pins):** RED at HEAD 19/19 — PGRST202 on every `p_reason` call (12 "could not find the function" signatures), 42703 on `hold_reason`, no notice rows, the direct-caller cells unable to name the column. Post-apply the first run was 19/23 across both suites: one **test-expectation** bug — in the admin-transition cell the admin is the actor, so the *Steward* (an active member) rightly receives the notice too, four recipients not three — and three cells that cascaded from it because the group was left suspended. Fixed as a test correction (four recipients; an `afterEach` recovery that puts the group back to active; the reactivate cell made self-contained). Second run 22/23 (the recovery hook had broken a cross-cell dependency — the same self-containment fix); third run 23/23, and 24/24 with the cross-check cell after the corrective (post-corrective set: internal-api-conformance + anon-execute-lockdown + the two new suites + the PC023 gate suite, 152/152).
- **Gate reads on the APPLIED objects (2026-09-03, catalog):** all nine functions carry `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` — no `=X/` (PUBLIC), no `anon=X`; `groups` relacl `anon=m, authenticated=m` (no table-level `r`); the column SELECT lists for both client roles are the 14 columns without `hold_reason`; `users.suspension_reason` has no client-role grant; the registry holds the six kinds and `sanctions` is non-suppressible. The direct-caller question (ADR-U038) is answered in the suite: a member's and a Mist's `select hold_reason from groups` are `42501`; a member's `select suspension_reason from users` is `42501`; every other `groups` column still reads under RLS.
- **Sibling sweep (the migration header names all 17 files):** ten suites ADAPTED with a labelled reason on the admin calls (33 lines: `account-lifecycle-admin-producer`, `account-lifecycle-self-service`, `group-administration-contracts` ×10, `member-administration-contracts`, `member-administration-operations` ×8, `member-enumeration-bounded`, `moderation-and-audit-contracts` ×2, `role-template-editing` ×2, `group-availability-enforcement` ×7, and the unit `users-page-and-bulk` pin with the Hub lib change); six LEFT (they name the `rest_group` *permission* seed or a fixture); the two E2E specs join the Q1 post-apply set with the ceremony's reason filled. Sweep result: 408/410 on the first pass — the PC023 STORY-7 minimal-payload key pin (adapted, labelled: it gains `hold_reason`) and the invocation-axis gate (the corrective above); both green on re-run. Non-admin wall cells were deliberately left without a reason — the wall answers before the reason check, which is exactly STORY-1's last criterion.
- **A finding the gate made, not the grep (2026-09-03, same session):** the first issue's five fan-out bodies read the notice *title* from `notification_kinds` (DS-5) at write time — a core-to-domain crossing that `internal-api-conformance.test.ts` refused in the post-apply platform slice ([core-to-domain] on all five). ADR-U047 holds: Core never depends upward on Domain, and the registry label is DS-5's console vocabulary while the notice copy is the writing contract's own (`pause_member`'s 'Participation Paused' is a PC-3 literal). Corrective migration `20260903130000_db4_pc030_notice_titles_are_core_literals.sql` (CREATE OR REPLACE, ACLs preserved and re-asserted, self-checked: no fan-out body names the registry) makes the six titles Core literals equal to the FEAT-PD021 labels, and a labelled cross-check cell in the PC030 suite keeps the two vocabularies equal (drift in either fails red). The spec's Part 2 "title = the kind's label" is honoured in value, not by a read.
