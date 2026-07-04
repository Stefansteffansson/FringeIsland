# Membership lifecycle contracts: pause/activate, remove, regular leave + the read amendment + red-first contract tests

---
id: TASK-PC013-01
title: Lifecycle contracts — pause_member / activate_member / remove_member / leave_group (replaced in place) + the get_group_detail membership_status amendment + red-first integration tests
status: review
assigned_to: claude
priority: high
feature: FEAT-PC013
owner: platform/core/organisation
wave: ferd
cycle: Groups G-D
depends_on: []
estimated_hours: 5
---

## Description

Three new SECURITY DEFINER contracts + one replacement-in-place over the existing PC-3 membership substrate (**no new table, no trigger changes**), red-first: integration tests demonstrating RED (functions absent, PGRST202; `leave_group` red on its *changed* semantics — the legacy body exists, so its asserts go red against legacy behaviour, honestly labelled) before the migration lands. Actor = `get_current_personal_group_id()` (P-O1). All writes FIM-only + active-account-only (the PC012 gate verbatim: `is_temporary is distinct from false` → 42501, `is_active is distinct from true` → 42501 'account is suspended'); group resolution per the G-A visibility rule (member-or-public+active, else P0002 — no leak).

**Substrate facts verified on disk (2026-07-04, decompose session):**
- `group_memberships.status` CHECK already admits `'paused'` (rebuild:111); `status_changed_at` column exists; `UNIQUE(group_id, member_group_id)`.
- `has_permission()` and `get_user_permissions()` resolve **only `status='active'`** (rebuild:447-500) — pause darkness is substrate-given; roles rows survive a pause (no role writes).
- `pause_members` / `activate_members` / `remove_members` are seeded catalog keys, Steward-template-held (`seeds/01_permissions.sql:12-14`).
- The only UPDATE policy is `memberships_update_accept` (self `invited→active`) — no client-role path to `'paused'` exists or is added.
- `auto_assign_member_role_on_accept` (trigger WHEN clause) and `notify_invitation_accepted` / `auto_assign_deusex_role_on_accept` (body guards) all key on `OLD.status='invited' AND NEW.status='active'` — a `paused↔active` flip fires none of them.
- `notify_invitation_declined_or_member_change` (AFTER DELETE) branches: `OLD.status='active'` + actor=member → `member_left` to Stewards; + actor≠member → `member_removed` to the removed member. Consumed, never duplicated.
- `check_last_leader_removal` (BEFORE DELETE on `user_group_roles`) counts **raw role rows** — blind to status flips and paused Stewards. The contracts guard **last-active-Steward** ahead of it (Steward resolution: `created_from_role_template_id` = the `'Steward Role Template'` template id, with the `name='Steward'` legacy fallback — the leave_group/sprint2 pattern).
- Legacy `leave_group` (sprint2) freezes `journey_enrollments` via `je.group_id = <leaver's personal group>` + journeys `created_by_group_id = p_group_id` + `is_public=false` + `status='active'`, setting `status='frozen'`, `progress_data || {frozen_reason, frozen_at}`, `status_changed_at` — `remove_member` mirrors this shape with `frozen_reason='removed_from_group'`; the new `leave_group` keeps `'left_group'` verbatim.
- Nothing in v2 calls legacy `leave_group` (`admin_exit_user_from_platform` inlines its own tracks; hub-legacy is the frozen oracle).

## Acceptance criteria

- [ ] `pause_member(p_group_id, p_member_group_id)` — `pause_members`-gated (42501 without; P0002 non-member no-leak); target must be an `'active'` membership (ghost/non-member P0002; already-paused P0001); self-target P0001 (Open Q4 default); last-active-Steward target P0001; flips to `'paused'` + `status_changed_at`; roles rows untouched; durable `participation_paused` notification row to the target; **no enrolment touch**
- [ ] Paused darkness asserted red-first against a live grant: `has_permission(target, group, <held permission>)` true before pause, **false while paused**, true again after activate
- [ ] `activate_member(p_group_id, p_member_group_id)` — `activate_members`-gated; target must be `'paused'` (P0001 if active, P0002 if no row); flips to `'active'` + `status_changed_at`; durable `participation_activated` row; **no invitation-era trigger fires** (no duplicate role binding, no accepted-notification — asserted)
- [ ] `remove_member(p_group_id, p_member_group_id)` — `remove_members`-gated; target `'active'` **or `'paused'`**; self-target P0001; last-active-Steward P0001 (paused Steward is not cover); cascade in one transaction: freeze target's active non-public-journey enrolments (`'removed_from_group'`) → delete target's roles in group → delete membership; existing trigger writes `member_removed` to the target (asserted, not duplicated)
- [ ] `leave_group(p_group_id)` **replaced in place** (Open Q1 default) — active-member callers only (else P0002, the legacy string-leak collapses); engagement-only + group-active (P0001); **sole-active-Steward → P0001** (MEM-7/G-E refusal), **last-member → P0001** (MEM-8/G-E refusal), nothing mutated on refusal; regular path: freeze own non-public enrolments (`'left_group'`) → delete own roles → delete membership; Stewards get `member_left` (existing trigger); returns jsonb `{group_id, group_name}`
- [ ] `get_group_detail` amended additively: member rows gain `membership_status`; **paused rows included only for viewers holding any of `pause_members`/`activate_members`/`remove_members`** (Open Q3 default); all other viewers see the active-only list unchanged; `member_count` stays active-only; existing keys byte-compatible
- [ ] Paused member's own reads asserted as substrate truth: group absent from `get_member_groups()`; `get_group_detail` on the private group P0002; `get_user_permissions` resolves nothing
- [ ] Mist callers 42501 on every contract; suspended callers 42501 on every write; group-as-member target rows behave identically (ADR-U006 uniformity — one assert)
- [ ] All new-contract tests demonstrated RED → GREEN post-migration, migration untouched between runs; `leave_group` semantic-change asserts labelled red-against-legacy

## Technical notes

Test file `hub/tests/integration/groups/membership-lifecycle.test.ts` on the `invitation-contracts.test.ts` harness (createTestUser/createAdminClient/signInWithRetry/cleanup*/runAdminSql; single-token display names — the nickname rule). Personas: steward, a `pause_members`-only holder, an `activate_members`-only holder, a `remove_members`-only holder (three minimal-permission custom roles — proves the three keys gate independently), plainMember, target(s), outsider, a suspended holder, a second Steward (for last-active-Steward matrices: pause Steward A then attempt remove/leave of Steward B). One migration (with TASK-PC013-02's items): 3 functions + `leave_group` replacement + `get_group_detail` replacement + grants (revoke all from public; grant execute to authenticated, service_role). SQLSTATEs per house pattern: 42501 FIM-only/suspended/not-permitted, P0002 no-leak, P0001 state-conflict refusals (self-target, already-paused/active, sole-Steward, last-member, non-engagement, non-active group). Notification rows inserted in-contract for pause/activate (`recipient_group_id` = target, `type` = 'participation_paused'/'participation_activated', payload ids + group name — the existing trigger insert shape). Steward-role resolution and enrolment-freeze SQL follow the sprint2 shapes verbatim (see Description). Each SECURITY DEFINER function documents its elevation; bodies minimal per the PG17 ceiling; no role-name strings in gates (ADR-U007) — the Steward-template linkage is invariant plumbing, not a permission gate.

## Verification

`npm run test:integration:groups` red before migration, green after; full `npm run test:integration` green (`--runInBand`).
