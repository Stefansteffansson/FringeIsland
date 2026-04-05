# Session: RBAC Sub-Sprint 1 — Schema Foundation

**Date:** 2026-02-16
**Duration:** ~3 hours
**Version:** 0.2.16

## Summary

Implemented RBAC Sub-Sprint 1 using the full TDD workflow: behavior specs → failing tests (RED) → design review → implement (GREEN) → verify. This sub-sprint establishes the database foundation for the RBAC system: group types, personal groups, system groups, role template permissions, role renaming, and auto-copy triggers.

Design review caught two counting errors in the RBAC design doc (D22 and D18a) that would have caused incorrect test assertions.

## Test Results
- Tests added: 57 (7 new test suites)
- Tests passing: 218/218 (100%)
- Tests updated: 9 existing test files (role rename + notification fix)
- Bugs found: notification test regression (handle_new_user creates role_assigned notifications)

## Behaviors Documented
- B-RBAC-001: Permission Catalog (41 permissions)
- B-RBAC-002: Group Type Classification
- B-RBAC-003: Personal Group Creation on Signup
- B-RBAC-004: Role Template Permission Mapping
- B-RBAC-005: Group Role Permission Initialization
- B-RBAC-006: System Groups Exist
- B-RBAC-007: Role Renaming (Steward/Guide Terminology)

## Decisions Made
1. **Keep `view_platform_analytics`** — D22 omitted it but no reason to remove. Final count: 41 permissions.
2. **Guide template = 14 perms** (not 15 as D18a stated). Math error in design doc.
3. **D22 correction:** 40 actual permissions in DB, not 30. Final after changes: 41.
4. **`handle_new_user()` extended** — now creates personal group + FI Members enrollment on signup. Accepted trade-off: generates role_assigned notifications (fixed test to account for this).

## Files Changed

### Created
- `docs/specs/behaviors/rbac.md` — 7 behavior specs
- `tests/integration/rbac/permission-catalog.test.ts` (12 tests)
- `tests/integration/rbac/group-types.test.ts` (6 tests)
- `tests/integration/rbac/personal-groups.test.ts` (6 tests)
- `tests/integration/rbac/role-templates.test.ts` (13 tests)
- `tests/integration/rbac/role-permissions.test.ts` (5 tests)
- `tests/integration/rbac/system-groups.test.ts` (10 tests)
- `tests/integration/rbac/role-renaming.test.ts` (5 tests)
- `supabase/migrations/20260216063246_rbac_schema_and_permissions.sql`
- `supabase/migrations/20260216071649_rbac_system_groups.sql`
- `supabase/migrations/20260216072212_rbac_personal_groups_and_role_renaming.sql`
- `supabase/migrations/20260216073824_rbac_rename_group_leader_references.sql`
- `docs/design-reviews/rbac-sprint1-migration-plan.md`

### Modified
- `tests/integration/groups/role-assignment.test.ts` (Group Leader→Steward, Travel Guide→Guide)
- `tests/integration/groups/last-leader.test.ts` (Group Leader→Steward, error msg updated)
- `tests/integration/groups/deletion.test.ts` (role names updated)
- `tests/integration/groups/edit-permissions.test.ts` (role name updated)
- `tests/integration/groups/invitations.test.ts` (role name updated)
- `tests/integration/communication/forum.test.ts` (role name updated)
- `tests/integration/communication/notifications.test.ts` (role name + unread count fix)
- `tests/integration/journeys/enrollment.test.ts` (role name updated)
- `docs/features/planned/dynamic-permissions-system.md` (D22 correction note)

## Next Steps
- [ ] RBAC Sub-Sprint 2: `has_permission()` SQL function + `usePermissions()` React hook
- [ ] RBAC Sub-Sprint 3: UI migration (isLeader → hasPermission)
- [ ] RBAC Sub-Sprint 4: Role management UI

## Context for Next Session

**Key insights for Sub-Sprint 2:**
- `group_role_permissions` has composite PK `(group_role_id, permission_id)`, no `id` column
- `role_template_permissions` also composite PK `(role_template_id, permission_id)`
- `group_roles` has no `description` column
- The `has_forum_permission()` function is a stub that will be replaced by `has_permission()`
- The `is_active_group_leader()` function now checks for 'Steward' — will eventually be replaced by `has_permission(group_id, 'assign_roles')`
- `handle_new_user()` now creates: user profile + personal group + FI Members enrollment (generates 2 role_assigned notifications)
- `copy_template_permissions` trigger auto-populates `group_role_permissions` when a `group_roles` row with `created_from_role_template_id` is inserted
