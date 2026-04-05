# Session: RBAC Sub-Sprint 4 — Role Management

**Date:** 2026-02-16
**Version:** 0.2.19
**Focus:** Role management — manage_roles permission, RLS policies, trigger fix, UI components

---

## Summary

Completed the fourth and final RBAC sub-sprint: Role Management. Stewards (and anyone with `manage_roles` permission) can now create, edit, and delete custom roles with configurable permissions. Anti-escalation is enforced at both the RLS level and the UI level — users cannot grant permissions they don't hold.

Full TDD cycle: 8 behavior specs, 47 tests (15 RED initially), 2 database migrations, 3 UI components. Nested RLS was discovered and fixed mid-implementation. All 319 tests pass across 2x QA runs.

---

## Test Results
- Tests added: 47 (role-management.test.ts)
- Tests passing: 319/319 (zero regressions)
- QA runs: 2x (both clean)
- Tests updated: 8 older tests updated for new permission counts (41->42, 24->25, etc.)

## Behaviors Documented
- B-RBAC-018: manage_roles permission exists and gates role CRUD
- B-RBAC-019: View group roles (all members can see)
- B-RBAC-020: Create custom role with name and permissions
- B-RBAC-021: Edit role name, description, and permissions
- B-RBAC-022: Delete custom roles (template roles protected)
- B-RBAC-023: Permission picker with anti-escalation
- B-RBAC-024: Anti-escalation — can only grant permissions you hold
- B-RBAC-025: RLS policies enforce manage_roles + anti-escalation

## Decisions Made
1. **Single `manage_roles` permission** (not 3 fine-grained): simpler, sufficient for MVP
2. **Anti-escalation at RLS level**: RLS policy checks `has_permission(user, group, permission_name)` for EACH permission being granted
3. **Template roles cannot be deleted**: `created_from_role_template_id IS NULL` check in DELETE policy
4. **Trigger checks template ID, not name**: Robust against role renaming

## Files Changed

### Created
- `components/groups/PermissionPicker.tsx` — category-grouped checkbox UI
- `components/groups/RoleFormModal.tsx` — create/edit role modal
- `components/groups/RoleManagementSection.tsx` — role list + CRUD buttons
- `supabase/migrations/20260216140506_rbac_role_management.sql` — main migration
- `supabase/migrations/20260216140740_rbac_role_management_fix_nested_rls.sql` — nested RLS fix
- `tests/integration/rbac/role-management.test.ts` — 47 test cases

### Modified
- `app/groups/[id]/page.tsx` — integrated RoleManagementSection, added `permissions` from hook
- `docs/specs/behaviors/rbac.md` — added B-RBAC-018 through B-RBAC-025
- `tests/integration/rbac/permission-catalog.test.ts` — count bumps (41->42, 14->15)
- `tests/integration/rbac/role-permissions.test.ts` — count bumps (24->25)
- `tests/integration/rbac/role-templates.test.ts` — count bumps (57->58, 24->25)
- `tests/integration/rbac/system-groups.test.ts` — count bump (41->42)
- `tests/integration/rbac/deusex-permissions.test.ts` — count bump (41->42)
- `tests/integration/groups/last-leader.test.ts` — added `created_from_role_template_id`
- `tests/integration/rbac/role-renaming.test.ts` — added `created_from_role_template_id`
- `CHANGELOG.md` — v0.2.19 entry
- `PROJECT_STATUS.md` — updated to reflect RBAC completion

## Issues Discovered
- **Nested RLS in anti-escalation policies**: Subqueries on `group_roles` and `permissions` tables were blocked by RLS on those tables. Fixed with SECURITY DEFINER helpers.
- **13 test failures from permission count changes**: Adding `manage_roles` bumped counts across 8 test suites. Fixed by updating hardcoded expectations.
- **Last-leader trigger fragile to renaming**: Trigger checked role name 'Steward' — broke if renamed. Fixed to check `created_from_role_template_id`.

## Next Steps
- [ ] Phase 1.6: Polish and Launch
- [ ] Mobile responsiveness audit
- [ ] User onboarding flow
- [ ] E2E tests (Playwright)

## Context for Next Session
- **RBAC is FULLY COMPLETE** — all 4 sub-sprints done, 25 behaviors, ~110 tests
- The `manage_roles` permission is now the 42nd permission in the catalog
- Steward template has 25 permissions (was 24)
- UI components follow existing modal patterns (backdrop blur, escape key, body scroll lock)
- Consider making permission count tests dynamic rather than hardcoded to avoid future breakage
