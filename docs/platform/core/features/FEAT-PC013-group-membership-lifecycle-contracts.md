# FEAT-PC013: Group membership lifecycle contracts — pause/activate, removal, and the regular leave

---
id: FEAT-PC013
title: Group membership lifecycle contracts — pause and reactivate a member's participation, remove a member with its cascade, and the member's own regular leave with its cascade; the G-E exits refused honestly (Groups Cycle G-D platform half)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Cycles G-A/G-B/G-C gave a group its container, its role fabric, and its way in — but **no way out and no way to rest**. Hub §L3 **MEM-4** (pause or activate a member's participation), **MEM-5** (remove a member — Steward action), and **MEM-6** (voluntary regular leave) all name **PC-3** as the platform dependency, and the exit substrate is uneven (verified on disk, 2026-07-04):

- **Leave exists — as a pre-partition monolith.** `leave_group(p_group_id)` (`20260228120745_sprint2_leave_group_core.sql`, granted to `authenticated`) executes **three** scenarios by automatic routing: regular leave (freeze own non-public enrolments → delete roles → delete membership), sole-Steward → DeusEx handover, and last-member group closure. The last two are **G-E capabilities (MEM-7/MEM-8)** — live today on the direct PostgREST path, unspecced, with legacy-style refusals (`P0001` free-text; a non-member learns group existence from the error string, against the G-A no-leak rule).
- **Removal has no cascade.** `memberships_delete_remove` (RLS, `remove_members`-gated, `status='active'` only) deletes the membership row and nothing else: **no enrolment freeze, and the target's `user_group_roles` rows orphan** (no FK ties roles to memberships — `leave_group` deletes roles explicitly; the RLS path can't).
- **Pause is a CHECK value with no path.** `group_memberships.status` already admits `'paused'` (rebuild migration line 111), and the catalog already seeds **`pause_members` + `activate_members`** on the Steward template (`supabase/seeds/01_permissions.sql:12-13`) — but no policy or function writes the transition (the only UPDATE policy is `memberships_update_accept`, `invited→active` self-only). The semantics, however, are already substrate-enforced: **`has_permission()` and `get_user_permissions()` resolve only `status='active'`** (oracled — B-RBAC: "false for invited/removed/paused"), so a paused membership goes permission-dark with zero changes to the resolution primitive, and roles rows survive for reactivation.
- **The invariant walls have a blind spot.** `check_last_leader_removal` fires on **role deletion** and counts raw role rows — it neither fires on a status flip (pausing the last Steward is unguarded) nor distinguishes a paused Steward from an active one (removing the last *active* Steward passes if a paused one still holds the role row).

Legacy oracle: leave/removal cascades are STRONG (behaviour inventory §A-GRP); **pause has no flow oracle** ("pause/leave have no dedicated lifecycle tests") — MEM-4 is specced fresh from canon over the seeded substrate.

### Why Platform Core (Organisation), not a Domain Service

These operations mutate `group_memberships` — the table PC-3's Membership-lifecycle capability owns and every `has_permission()` resolution reads — and they carry the ADR-U016 cascade (roles + enrolment freeze + notification rows) as one composed invariant. Modelling exits anywhere else inverts the one-way Domain→Core rule. The enrolment-freeze steps touch DS-3's future territory exactly as the Conformant legacy cascade already does — carried forward as the satisfied-now disposition, re-verified at the Journeys gate (Groups plan D2).

## Solution sketch

Contracts over existing substrate (**no new table, no trigger changes; one deliberate policy narrowing** — see Open Q2), PostgREST RPC per PC-3 §3, actor via `get_current_personal_group_id()` (P-O1). All writes FIM-only + active-account-only; group resolution per the G-A visibility rule (member-or-public+active, else **P0002** — no leak); refusals are SQLSTATEs surfaced verbatim (house map). Targets are membership rows, treated uniformly whether the member is a FIM's personal group or a group-as-member row (ADR-U006/U020 — no special-casing).

- **`pause_member(p_group_id, p_member_group_id)`** (MEM-4) — `pause_members`-gated. Target must be an `'active'` membership (ghost/non-member → `P0002`, no leak; already-paused → `P0001` conflict). Self-target refused (`P0001` — leave is the self-path; Open Q4). **Last-active-Steward guard:** refuses if the target is the only Steward-role holder whose membership is active (closes the trigger's status-flip blind spot contract-side). Flips `active→paused` + `status_changed_at`; **roles rows untouched** — permissions go dark via `has_permission()`'s existing status filter and return on reactivation; writes a durable `participation_paused` notification row to the target. **No enrolment touch** (§L3: MEM-4 carries no DS-3 dependency — pause rests participation, it doesn't exit it).
- **`activate_member(p_group_id, p_member_group_id)`** (MEM-4) — `activate_members`-gated (the catalog's own verb split). Target must be `'paused'` (`P0001` if active, `P0002` if no row). Flips `paused→active` + `status_changed_at`; the preserved roles resume; writes `participation_activated`. The `invited→active` triggers (`auto_assign_member_role_on_accept`, `notify_invitation_accepted`) guard on `OLD.status='invited'` and stay silent — verified, asserted, not assumed.
- **`remove_member(p_group_id, p_member_group_id)`** (MEM-5) — `remove_members`-gated. Target must be `'active'` **or `'paused'`** (a paused member is removable — the RLS path never allowed this; the contract does). Self-target refused (use leave). Last-active-Steward guard (a paused target passes trivially). Cascade in `leave_group`'s proven order: **freeze the target's active enrolments in this group's non-public journeys** (`frozen_reason: 'removed_from_group'` — the removal twin of the legacy `'left_group'` shape) → delete the target's `user_group_roles` rows (the existing trigger walls fire beneath our guard) → delete the membership (the existing `notify_invitation_declined_or_member_change` trigger writes the durable `member_removed` row to the target — exercised, not duplicated).
- **`leave_group(p_group_id)`** (MEM-6) — **replaced in place** (same name + signature; Open Q1): the regular-leave scenario only, with house semantics. Caller must be an active member (else `P0002` — the legacy `'Group not found'` / `'not an active member'` string distinction collapses into no-leak); engagement groups only, group `'active'` (`P0001` — no leak concern, the caller is a member). **The two G-E exits are refused honestly instead of executed:** last remaining active member → `P0001` ("closure arrives with MEM-8"); sole active Steward → `P0001` ("leadership transfer arrives with MEM-7") — both counting **active-membership** Stewards, not raw role rows. Cascade: freeze own non-public enrolments (`'left_group'`, the legacy shape verbatim) → delete own roles → delete membership (the existing trigger notifies Stewards `member_left`). **The DS-5 former-member-attribution disposition is `pending-DS-5`, not built (D2)** — the exit leaves no authorship attribution layer; that is MEM-9's forward-seam, re-entered at the Communication gate.
- **`get_group_detail` amendment (additive)** — member rows gain `membership_status`; **paused rows are included only for viewers holding any of `pause_members` / `activate_members` / `remove_members`** (Open Q3 — membership state is FIM data, org-spec Privacy note; every other viewer sees the active-only list unchanged). `member_count` stays active-only. (PC011 already added `member_group_id` + `roles[]`; this rides the same payload.)
- **Policy narrowing (Open Q2)** — drop **`memberships_delete_leave`** and **`memberships_delete_remove`**: after this feature the contracts are the only client-role exit paths, so the raw DELETEs (which bypass freeze, role cleanup, and the Steward guards, and today let a sole Steward strand a group headless) close. The admin policies (`memberships_delete_admin` / `memberships_insert_admin`) are untouched — A-ADM territory. The G-A `groups` narrowing (PC010) is the precedent; the gate reviews the drop.

## Appetite

Medium-plus — one migration (3 new functions + the `leave_group` replacement + the `get_group_detail` amendment + 2 policy drops + grants; **no new table, no trigger changes**), integration tests for the three lifecycle matrices, both cascade arcs, the paused-permission round-trip, and the adversarial direct paths. If it swells: the **pause/activate pair (MEM-4) is the first cut** to a fast-follow — the exits (MEM-5/6) are the cycle's core and the pair is additive over the same substrate (its Hub half cuts with it).

## Rabbit holes

- **Don't build G-E.** No nomination, no handover, no DeusEx succession, no closure, no content reassignment — `leave_group` *refuses* the sole-Steward and last-member scenarios; it does not route them. G-E rebuilds those flows deliberately from the sprint2/3 oracle (git history + `migrations/archive/` + the behaviour inventory).
- **Don't edit the trigger walls.** `check_last_leader_removal` and siblings keep their raw-role-count bodies; the active-counting guards live contract-side, ahead of them. Amending triggers that four cycles of substrate rely on is G-E-scale work with no G-D payoff.
- **Don't invent pause semantics.** Paused = membership row with `status='paused'`. Permission darkness is `has_permission()`'s existing filter; list disappearance is the existing `status='active'` read filters. No new columns (no `paused_by`, no `paused_reason`), no expiry, no auto-reactivation.
- **Don't reap `'removed'`.** The CHECK value is vestigial (v2 exits delete rows; the notify trigger keys on `OLD.status`) — it stays, documented honestly, like PC012's `'expired'`. No migration to prune the enum, no rows ever written to it here.
- **Don't touch account-level pause.** IDN-12 self-pause (parked, Identity) is account lifecycle; MEM-4 is group-scoped participation. No `users` mutation of any kind.
- **Mind the notification fabric.** `member_left` / `member_removed` come from the existing AFTER DELETE trigger; `participation_paused` / `participation_activated` are written in-contract (no new triggers). `notify_role_removed` also fires per role row during exits — substrate behaviour, expected, not suppressed.

## No-gos

- No leadership transfer, nominated succession, or group closure (MEM-7/MEM-8 — G-E); no group deletion (GRP-9 — G-E).
- No former-member attribution (MEM-9 — forward-seam on DS-5; this feature only tags the disposition).
- No admin overrides (ADM-6 sweep / ADM-18 targeted removal — A-ADM; `admin_exit_user_from_platform` is untouched and self-contained).
- No bulk operations (pause-all, remove-many) — single-membership contracts only.
- No new table, no trigger changes, no realtime (ADR-U039 — durable rows; push rides A-NTF).
- No enrolment *un*freeze — freezing is one-way here; thaw semantics belong to DS-3 when Journeys activates.

## Stories

### STORY-1: Pause a member's participation (MEM-4)
As a `pause_members` holder, I want to pause a member's participation, so a member who needs to step back rests without being expelled.

**Acceptance criteria:**
- Given a `pause_members` holder and an active member, when they call `pause_member`, then the membership is `'paused'` with `status_changed_at` bumped, the target's `user_group_roles` rows still exist, and a durable `participation_paused` notification row addressed to the target exists.
- Given a paused membership, when `has_permission(target, group, <any held permission>)` is checked, then it resolves **false** while paused (the substrate filter, asserted red-first against a live grant).
- Given the target is the only Steward-role holder with an active membership, then `P0001` — the group is never left effectively headless (the trigger cannot catch a status flip; the contract does).
- Given a self-target, an already-paused target, a ghost/non-member target, or a caller without `pause_members`, then `P0001` / `P0001` / `P0002` / `42501` respectively — `P0002` indistinguishable from absence (no leak).

### STORY-2: Reactivate a paused member (MEM-4)
As an `activate_members` holder, I want to reactivate a paused member, so stepping back is reversible.

**Acceptance criteria:**
- Given an `activate_members` holder and a paused member, when they call `activate_member`, then the membership is `'active'` again, `has_permission` resolves the member's preserved roles **true** again (round-trip asserted), and a durable `participation_activated` row addressed to the target exists.
- Given the flip, then no invitation-era trigger fires: no duplicate Member-role binding, no `invitation_accepted` notification (both guard on `OLD.status='invited'` — asserted, not assumed).
- Given an active (not paused) target, a ghost, or a caller without `activate_members`, then `P0001` / `P0002` / `42501`.

### STORY-3: Paused state is honest in every read (MEM-4)
As the platform, I want reads to tell one consistent story about a paused membership, so surfaces render state instead of inferring it.

**Acceptance criteria:**
- Given a viewer holding any of `pause_members` / `activate_members` / `remove_members`, when they call `get_group_detail`, then paused members appear in the members payload with `membership_status: 'paused'` (active rows carry `'active'`); given any other viewer with member-list access, then the members payload is the active-only list unchanged (Open Q3).
- Given a paused member, then `member_count` does not include them; `get_member_groups()` omits the group from their own list; `get_group_detail` on a **private** group refuses them `P0002` and on a **public** group serves the non-member view; `get_user_permissions` resolves nothing for the group — all existing filters, asserted as the paused experience, not modified.
- Given `search_invitable_members` (PC012), when a paused member matches, then their `membership_status` reflects the existing row (the Surface's invite affordance stays disabled — no re-invite path around a pause).

### STORY-4: Remove a member, with the cascade (MEM-5)
As a `remove_members` holder, I want removal to be one composed operation, so no exit leaves frozen work undone or role rows orphaned.

**Acceptance criteria:**
- Given a `remove_members` holder and an active member, when they call `remove_member`, then in one transaction: the target's active enrolments in this group's non-public journeys are `'frozen'` (`frozen_reason: 'removed_from_group'`), the target's `user_group_roles` rows in this group are deleted, the membership row is deleted, and the existing trigger has written the durable `member_removed` row to the target.
- Given a **paused** target, when removed, then the same cascade applies (the legacy RLS path never allowed this; the contract does).
- Given the target is the last Steward-role holder with an active membership, then `P0001` (counting **active** Stewards — a paused Steward does not count as cover; the raw-role-count trigger blind spot is closed ahead of the walls).
- Given a self-target, a ghost/non-member, or a caller without `remove_members`, then `P0001` (leave is the self-path) / `P0002` / `42501`.

### STORY-5: Leave a group — the regular exit (MEM-6)
As an active member, I want to leave a group by my own decision, with my non-public journey work frozen — and the exits that carry G-E weight refused honestly rather than half-executed.

**Acceptance criteria:**
- Given an active member (not sole Steward, not last member), when they call `leave_group`, then in one transaction: their active enrolments in this group's non-public journeys are `'frozen'` (`frozen_reason: 'left_group'` — the legacy shape verbatim), their roles in this group are deleted, the membership is deleted, and Stewards receive the durable `member_left` row (existing trigger).
- Given the caller is the **sole active Steward** (other members remain), then `P0001` with the leadership-transfer refusal — MEM-7 arrives with G-E; nothing is mutated.
- Given the caller is the **last remaining active member**, then `P0001` with the closure refusal — MEM-8 arrives with G-E; nothing is mutated.
- Given a non-member, an invisible private group, or a ghost id, then `P0002` indistinguishably (the legacy `'Group not found'` / `'not an active member'` string leak closes); given a personal/system group or a non-active group, then `P0001`; given a Mist, then `42501`.
- The **DS-5 attribution disposition is `pending-DS-5`, not built (D2):** the exit writes no former-member attribution — MEM-9's forward-seam, re-entered at the Communication gate.

### STORY-6: No path around the contracts (ADR-U038)
As the platform, I want the direct PostgREST surface to agree with the contracts, so the composed cascades cannot be skipped.

**Acceptance criteria:**
- Given the policy narrowing (Open Q2), when a member direct-DELETEs their own active membership, or a `remove_members` holder direct-DELETEs another's, then RLS refuses — the contracts are the only client-role exit paths (the pre-narrowing bypass — no freeze, orphaned roles, headless-group stranding — is demonstrated red-first before the drop).
- Given a direct UPDATE attempting `status='paused'` (or any transition other than the self `invited→active` accept), then RLS refuses — no client-role write path to pause exists (verified, not assumed).
- Given the admin policies (`memberships_delete_admin` / `memberships_insert_admin`) and `admin_exit_user_from_platform`, then they are untouched and still function (asserted — A-ADM inherits them intact).
- Given `TRUNCATE` on `group_memberships` from a client role, then the privilege still does not exist (PC012's revoke, re-asserted).

## Platform dependencies

- **PC-3 substrate (existing, Conformant):** `group_memberships` + its status CHECK (`'paused'` already admitted), `has_permission()` / `get_user_permissions()` status filtering (the pause-semantics primitive — untouched), the invariant triggers (`check_last_leader_removal` + DeusEx siblings — untouched, guarded ahead of), the `notify_invitation_declined_or_member_change` leave/removal branches, the seeded `pause_members` / `activate_members` / `remove_members` catalog keys (Steward-template-held).
- **FEAT-PC010:** the G-A visibility rule; `get_group_detail` (amended additively here — PC011 precedent).
- **FEAT-PC011:** `get_user_permissions` as the Surface's gating read; role contracts unaffected.
- **FEAT-PC012:** invite/decline contracts unaffected (decline is SECURITY DEFINER — the `memberships_delete_leave` drop does not touch it); TRUNCATE already revoked.
- **DS-3 seam (D2):** the enrolment freezes are the satisfied-now cascade dispositions carried from the Conformant substrate — **re-verified at the Journeys gate**; thaw/reassignment semantics stay DS-3's.
- **Schema gate.** New SECURITY DEFINER functions + the `leave_group` replacement + the read amendment + the two policy drops + grants → task status `review`, explicit nod; the gate asks the direct-caller question per ADR-U038 and rules on Open Q1–Q4.

## Cross-product impact

Consumed by **Hub [FEAT-H016](../../../products/hub/features/FEAT-H016-group-membership-lifecycle.md)** (Cycle G-D Surface half); the Gimbal inherits the same contracts and refusal semantics. The two honest refusals in `leave_group` are **G-E's re-entry points** (MEM-7 leadership transfer, MEM-8 closure — both re-derived there from the legacy oracle); the `pending-DS-5` attribution tag is **MEM-9's** (Communication gate). ADM-6/ADM-18 later wrap these same exit semantics at platform scope (A-ADM).

## Stability posture (Platform Core §7)

Mostly additive: 3 new functions, 1 replacement-in-place (`leave_group` — same name and signature, semantics **narrowed** to the regular scenario; the G-E scenarios move from silently-executed to refused until G-E re-lands them deliberately), 1 additive payload amendment (`get_group_detail`), 2 policy drops (narrowing only — no policy gains breadth), grants. No new table, no trigger changes, no signature changes. Each SECURITY DEFINER function documents its elevation; bodies minimal per the PG17 ceiling.

## Vertical impact

- **Administration:** pause/activate/remove are permission-gated Steward-scope operations in-place per ADR-U028; each exit is a complete ADR-U016 composed cascade (freeze + roles + membership + durable notification in one transaction); reversibility is explicit (pause↔activate; removal is re-invitable); DeusEx overrides untouched, arriving with A-ADM.
- **Privacy/GDPR:** membership state is FIM data (org-spec §L3) — paused state is readable only by management-permission holders (Open Q3) and never in a public member list; notification rows are content-minimal (ids + group name); no new PII, no new columns; erasure/exit cascades (PC002, `admin_exit_user_from_platform`) unaffected.
- **Notifications:** all four operations leave durable rows (leave/removal via the existing trigger — exercised, not duplicated; pause/activate written in-contract); **no dispatch, no push** — ADR-U039 ping-then-fetch arrives with A-NTF (D8).
- **Observability:** refusals are SQLSTATEs surfaced verbatim; every transition carries provenance (`status_changed_at`; `frozen_reason`/`frozen_at` in enrolment `progress_data`); consuming routes emit id-only telemetry (FEAT-H016).
- **Transactions:** None.
- **Extensibility:** the membership `status` CHECK is the permitted state-attribute pattern (ADR-U018) — new lifecycle states extend the CHECK, not an enum type; gating rides the open permission catalog (three distinct seeded verbs — no role-name checks, ADR-U007); contracts are uniform over group-as-member rows (ADR-U006/U020), so MEM-10 inherits them; `membership_status` extends the detail payload additively.

## Open spec questions

1. **`leave_group` replaced in place.** Default: same name + signature, body narrowed to regular leave with house refusals; the sole-Steward and last-member scenarios are **refused** (with honest copy) until G-E re-lands them as specced contracts. The alternative — leaving the legacy three-scenario body callable — keeps unspecced DeusEx-handover and closure flows live on the direct path with leaking refusal strings. Nothing in v2 calls the legacy body (`admin_exit_user_from_platform` is self-contained; hub-legacy is the frozen oracle). Confirm at the gate.
2. **Drop the two member-exit DELETE policies** (`memberships_delete_leave`, `memberships_delete_remove`). Default: drop — the raw paths bypass freeze/role-cleanup/Steward-guards (a sole Steward can strand a group headless today); the contracts become the only client-role exits (G-A `groups`-narrowing precedent). Admin policies untouched. Cost: hub-legacy's leave/remove UI stops working against the dev DB (acceptable — frozen oracle, Phase-4 deletion). Alternative: keep as defense-in-depth (the G-B posture) and accept the bypass residue. Confirm at the gate.
3. **Paused-row visibility: management-permission holders only.** Default: paused rows (with `membership_status`) render in `get_group_detail` only for holders of `pause_members` / `activate_members` / `remove_members`; all other viewers see the active-only list unchanged. Alternative: any `view_member_list` holder sees paused rows flagged (simpler, but exposes participation state — FIM data — to the whole list audience, including public-list viewers). Confirm at the gate.
4. **Self-target refused on pause and remove.** Default: `P0001` — leave is the self-exit path (one flow per intent: a permitted self-remove would either dodge leave's sole-Steward/last-member refusals or have to duplicate them); self-pause at group scope has no §L3 story and adjoins parked IDN-12 at account scope. Alternative: permit self-remove as leave-with-another-name. Confirm at the gate.
