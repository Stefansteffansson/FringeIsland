# Session: RBAC Sub-Sprint 2 — Permission Resolution

**Date:** 2026-02-16
**Duration:** ~2 hours
**Version:** 0.2.17

## Summary

Implemented RBAC Sub-Sprint 2 using the full TDD workflow: behavior specs → failing tests (RED) → design → implement (GREEN) → QA → document. This sub-sprint creates the permission resolution infrastructure: `has_permission()` SQL function for database-level checks, `get_user_permissions()` for batch fetching, and `usePermissions()` React hook for UI-level permission gating.

## Test Results
- Tests added: 24 (2 new test suites)
- Tests passing: 238/238 (100%)
- Zero regressions on existing 214 tests

## Behaviors Documented
- B-RBAC-008: Engagement Group Permission Resolution (Tier 2)
- B-RBAC-009: System Group Permission Resolution (Tier 1, additive)
- B-RBAC-010: Permission Check Edge Cases (fail closed)
- B-RBAC-011: usePermissions() Hook (React, not unit-tested yet)
- B-RBAC-012: Deusex Has All Permissions (41/41, no bypass)

## Decisions Made
1. **Two SQL functions:** `has_permission()` (boolean, short-circuit on Tier 1) and `get_user_permissions()` (TEXT[], combines both tiers in one query)
2. **SECURITY DEFINER with search_path='':** Both functions bypass RLS for permission lookups (project convention)
3. **Fail closed:** NULL inputs return FALSE/empty array, never throw errors
4. **React hook resolves auth→public user ID:** `usePermissions()` handles the auth_user_id→users.id lookup internally
5. **B-RBAC-011 not unit-tested:** React Testing Library needed for hook tests; deferred to when UI integration happens in Sub-Sprint 3

## Files Changed

### Created
- `docs/specs/behaviors/rbac.md` — appended B-RBAC-008 through B-RBAC-012
- `tests/integration/rbac/permission-resolution.test.ts` (18 tests)
- `tests/integration/rbac/deusex-permissions.test.ts` (6 tests)
- `supabase/migrations/20260216111905_rbac_permission_resolution.sql`
- `lib/hooks/usePermissions.ts`
- `docs/planning/sessions/2026-02-16-rbac-sub-sprint-2.md` (this file)

### Modified
- `docs/specs/behaviors/rbac.md` — updated TBD migration refs, fixed 31→41 permission counts
- `PROJECT_STATUS.md` — updated to v0.2.17, Sub-Sprint 2 complete

## SQL Functions Created

### has_permission(p_user_id UUID, p_group_id UUID, p_permission_name TEXT) → BOOLEAN
- Tier 1: Checks ALL system groups (group_type='system') for the permission
- Short-circuit: returns TRUE immediately if found in system groups
- Tier 2: Checks the specific context group for the permission
- Requires `status = 'active'` in group_memberships
- NULL inputs → FALSE

### get_user_permissions(p_user_id UUID, p_group_id UUID) → TEXT[]
- Single query combining Tier 1 (system) + Tier 2 (context) with OR
- Returns ARRAY_AGG(DISTINCT permission_name)
- COALESCE to empty array if NULL

## Next Steps
- [ ] RBAC Sub-Sprint 3: UI migration (isLeader → hasPermission)
- [ ] RBAC Sub-Sprint 4: Role management UI

## Context for Next Session

**Key insights for Sub-Sprint 3:**
- `has_permission()` and `get_user_permissions()` are live in the database
- `usePermissions(groupId)` hook is ready at `lib/hooks/usePermissions.ts`
- Hook returns `{ permissions, loading, error, hasPermission, refetch }`
- `hasPermission('invite_members')` is synchronous (checks cached array)
- The `is_active_group_leader()` function still exists — will be replaced by `has_permission(user_id, group_id, 'assign_roles')`
- The `has_forum_permission()` stub still exists — will be replaced by `has_permission()`
- UI components currently use `isLeader` boolean state — migrate to `usePermissions()` hook
- `usePermissions()` hook needs the public `users.id` (not auth user ID) — it resolves this internally via `auth_user_id` lookup
