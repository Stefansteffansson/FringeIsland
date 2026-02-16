# RBAC Sub-Sprint 3: UI Migration — Session Bridge

**Date:** 2026-02-16
**Version:** v0.2.18
**Sprint:** RBAC Sub-Sprint 3 (UI migration: isLeader → hasPermission)

---

## What Was Done

### TDD Workflow Executed
1. **Phase 0 (Feature Context):** Verified RBAC design doc covers UI migration, updated 6 stale entries in DEFERRED_DECISIONS.md
2. **Phase 1 (Behaviors):** Wrote B-RBAC-013 through B-RBAC-017 (5 behaviors covering group detail, edit page, forum moderation, enrollment, and definition-of-done)
3. **Phase 2 (Write Tests):** Created `tests/integration/rbac/ui-permission-gating.test.ts` with 34 tests
4. **Phase 3 (Run Tests):** All 34 passed immediately (GREEN) — expected since permission infrastructure exists from Sub-Sprints 1+2
5. **Phase 4 (Design):** Mapped each isLeader check → specific hasPermission call per component
6. **Phase 5 (Implement):** Modified 6 files (see below)
7. **Phase 6 (Verify):** Full suite 272/272 GREEN on 2 consecutive runs, security review completed
8. **Phase 7 (Document):** This session bridge, PROJECT_STATUS.md, CHANGELOG.md updated

### Workflow Improvement
- Split old Phase 2 ("Tests RED") into Phase 2 ("Write Tests") and Phase 3 ("Run Tests — RED") in `docs/workflows/feature-development.md` and `docs/agents/contexts/sprint-agent.md`

### Files Modified

**UI Components (6 files):**
- `app/groups/[id]/page.tsx` — Removed `isLeader` state, added `usePermissions(groupId)`, 6 permission gates
- `app/groups/[id]/edit/page.tsx` — Removed `isLeader` state + role query, added `usePermissions(groupId)`, `edit_group_settings` + `delete_group` gates
- `components/groups/forum/ForumSection.tsx` — Removed `isLeader` prop, added internal `usePermissions`, passes `canModerate`
- `components/groups/forum/ForumPost.tsx` — Renamed `isLeader` prop → `canModerate`
- `components/groups/forum/ForumReplyList.tsx` — Renamed `isLeader` prop → `canModerate`
- `components/journeys/EnrollmentModal.tsx` — Replaced role-name query with `has_permission` RPC

**Documentation (4 files):**
- `docs/workflows/feature-development.md` — Split Phase 2 into Write Tests + Run Tests RED
- `docs/agents/contexts/sprint-agent.md` — Same split applied
- `docs/planning/DEFERRED_DECISIONS.md` — 6 entries resolved/updated
- `docs/specs/behaviors/rbac.md` — Added B-RBAC-013 through B-RBAC-017

**Tests (1 new file):**
- `tests/integration/rbac/ui-permission-gating.test.ts` — 34 tests

### Permission Mapping (isLeader → hasPermission)

| UI Action | Old Gate | New Gate |
|-----------|----------|----------|
| Edit Group button | `isLeader` | `hasPermission('edit_group_settings')` |
| Member list visibility | `isLeader` | `hasPermission('view_member_list')` |
| Remove role (×) button | `isLeader` | `hasPermission('remove_roles')` |
| Promote/Assign buttons | `isLeader` | `hasPermission('assign_roles')` |
| Quick Actions (Invite) | `isLeader` | `hasPermission('invite_members')` |
| Edit page access | `isLeader` | `hasPermission('edit_group_settings')` |
| Delete group (Danger Zone) | (any edit page user) | `hasPermission('delete_group')` |
| Forum moderation (Remove) | `isLeader` prop | `hasPermission('moderate_forum')` |
| Group enrollment | `group_roles.name = 'Group Leader'` | `has_permission(..., 'enroll_group_in_journey')` RPC |

---

## Security Review Findings

- **Fail-closed:** `usePermissions` returns empty array on error — no unauthorized access
- **Loading gates:** All pages show spinner until permissions load — no flash of unauthorized content
- **Known remaining:** `handlePromoteToLeader` and last-leader check still reference `'Group Leader'` role name — these are *data operations*, not access control, and will be addressed in role renaming cleanup
- **RLS is primary defense:** UI permission checks are defense-in-depth; RLS policies enforce access at database level

---

## What's Next

**RBAC Sub-Sprint 4: Role Management UI**
- Stewards can create/edit custom roles
- Permission set management (assign permissions to roles)
- Role assignment modal updated for new role types
- Behaviors → Tests → Design → Implement workflow

---

## Test Summary

- **Before:** 238 tests
- **After:** 272 tests (+34 UI permission gating tests)
- **Status:** 272/272 passing, zero flakiness (verified 2x)
