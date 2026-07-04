# Role & permission contracts: fabric read, definition, assignment RPCs + red-first contract tests

---
id: TASK-PC011-01
title: Role contracts — get_group_roles / create_group_role / update_group_role / set_group_role_permission / delete_group_role / assign_member_role / remove_member_role + get_group_detail additive extension + red-first integration tests
status: review
assigned_to: claude
priority: high
feature: FEAT-PC011
owner: platform/core/organisation
wave: ferd
cycle: Groups G-B
depends_on: []
estimated_hours: 5
---

## Description

Six SECURITY DEFINER contracts over the existing PC-3 role substrate (**no new table, no policy changes**), red-first: integration tests demonstrating RED (functions absent, PGRST202) before the migration lands them. Actor = `get_current_personal_group_id()` (P-O1). All writes FIM-only + active-account-only; group resolution follows the G-A visibility rule (member-or-public+active, else P0002 — no leak). `get_group_detail` members payload extends **additively** (`member_group_id`, `roles[]`).

**Substrate facts verified on dev (2026-07-04, this session):**
- **Open Q4 answered:** `grp_insert` with_check = `manage_roles AND has_permission(actor, group, get_permission_name(permission_id))` — the definition-time wall is "author must themselves hold each permission they grant". The contract's check must be at least as strict (it is: same predicate, applied per requested grant).
- **Auto-link trap:** the `copy_template_permissions` trigger auto-links a role whose name matches `'<name> Role Template'` in `role_templates` and copies that template's grants — a "custom" role named e.g. `Steward` would silently become a fully-granted leader role, defeating definition-time anti-escalation. `create_group_role`'s custom path must **refuse names that would auto-link** (22023).
- Uniques: `group_roles(group_id, name)` → duplicate name surfaces 23505; `user_group_roles(member_group_id, group_id, group_role_id)` → double-assign 23505; `group_role_permissions(group_role_id, permission_id)` → upsert target.
- `group_role_permissions` has **no UPDATE policy** — the substrate's grant model is row-presence (insert = grant, delete = revoke); `set_group_role_permission` follows it (granted=true → upsert, granted=false → delete).
- Last-Steward / last-DeusEx triggers raise plain P0001 exceptions on DELETE of `user_group_roles` — surfaced verbatim, never pre-checked-and-hidden.
- `notify_role_assigned` / `notify_role_removed` write durable `notifications` rows on binding changes — expected, not duplicated.
- Templates on dev: Steward / Guide / **Member** / Observer Role Template (not "Participant").

## Acceptance criteria

- [ ] `get_group_roles(p_group_id)` — role instances (`id, name, description, created_from_role_template_id, holder_count, permissions[]`), viewer capability flags (`can_manage_roles` / `can_assign_roles` / `can_remove_roles`), `available_permissions[]` (44-key catalog: name + category); G-A visibility (member-or-public+active, else P0002); Mist 42501
- [ ] `create_group_role()` — template path (grants trigger-copied, `p_permissions` must be null) and custom path (explicit grants validated against catalog, definition-time anti-escalation 42501, auto-link-colliding names refused 22023); `manage_roles`-gated; duplicate name 23505
- [ ] `update_group_role()` — partial rename/describe (null = leave unchanged), `manage_roles`-gated, works on template-derived instances too (Open Q2 default)
- [ ] `set_group_role_permission()` — grant/revoke single key incl. on template-derived instances; anti-escalation on grant; returns updated role entry
- [ ] `delete_group_role()` — custom + unheld only (`manage_roles`-gated); template-derived refused; held refused (P0001, unbind first — Open Q3 default)
- [ ] `assign_member_role()` / `remove_member_role()` — `assign_roles` / `remove_roles`-gated (42501); assignment through `can_assign_role()` (anti-escalation 42501); target must be active member; foreign/ghost groups + roles P0002 no-leak; last-Steward refusal surfaced verbatim; notification rows written by existing triggers
- [ ] `get_group_detail` members entries additively carry `member_group_id` + `roles[]` (names); existing keys unchanged
- [ ] STORY-5: `get_user_permissions(personal, group)` asserted as the GRP-8 read (no new function); non-member → empty array, never a distinguishing error
- [ ] All contract tests demonstrated RED (functions absent) → GREEN post-migration

## Technical notes

Test file `hub/tests/integration/groups/role-permission-contracts.test.ts` on the `group-crud-contracts.test.ts` harness (createTestUser/createAdminClient/signInWithRetry/cleanup*). One migration (with TASK-PC011-02's hygiene): six functions + `get_group_detail` replacement + grants. SQLSTATEs per house pattern: 42501 insufficient-privilege/FIM-only, P0002 no-leak, 22023 invalid parameter, 23505 surfaced from uniques, P0001 invariant refusals. Each SECURITY DEFINER function documents its elevation; bodies minimal per the PG17 ceiling; no role-name strings (permission-derived everywhere — ADR-U007).

## Verification

`npm run test:integration:groups` red before migration, green after; `npm run test:integration:rbac` green (existing substrate untouched); full `npm run test:integration` green.
