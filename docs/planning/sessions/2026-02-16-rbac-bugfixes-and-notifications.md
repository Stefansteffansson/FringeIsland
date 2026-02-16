# Session: RBAC Bug Fixes, Bootstrap Patterns, and Notification UX

**Date:** 2026-02-16
**Duration:** ~3 hours
**Version:** 0.2.20
**Focus:** Fix cascading RBAC bugs discovered during real-user testing + group deletion notifications

---

## Summary

This session focused on fixing a series of cascading RBAC bugs discovered when real users (Stefan and Agnes) tested the system after Sub-Sprint 4. The bugs revealed several chicken-and-egg problems in the RLS policy chain during group creation and invitation acceptance. We also added group deletion notifications and refined the notification UX.

---

## Completed

- [x] Fixed AssignRoleModal anti-escalation (Agnes couldn't assign Forum Moderator to Jonathan)
- [x] Replaced pre-RBAC `is_active_group_leader()` with `has_permission('assign_roles')` + `can_assign_role()` in user_group_roles RLS
- [x] Added self-lockout warning in RoleFormModal when removing manage_roles/assign_roles
- [x] Fixed warning visibility (moved from scrollable content to footer)
- [x] Created auto-assign Member role trigger for invitation acceptance
- [x] Backfilled missing Member roles for existing active members
- [x] Fixed group creation bootstrap (chicken-and-egg with group_roles INSERT)
- [x] Made copy_template_permissions trigger SECURITY DEFINER
- [x] Backfilled orphaned groups with no roles
- [x] Added group deletion notification trigger (BEFORE DELETE, excludes deleter)
- [x] Fixed notification 404 on deleted groups
- [x] Changed notifications to not navigate anywhere (mark as read only)
- [x] Fixed notification badge count (unread sorted first in dropdown)

---

## Technical Changes

### Migrations Created (9 total)
1. `20260216181908_add_permissions_select_policy.sql` — SELECT policy for permissions catalog
2. `20260216185921_backfill_member_role_for_existing_groups.sql` — Member role for existing members
3. `20260216192629_rbac_fix_user_group_roles_policies.sql` — `can_assign_role()` + new INSERT/DELETE policies
4. `20260216203354_auto_assign_member_role_on_accept.sql` — Auto-assign trigger on invitation acceptance
5. `20260216203925_backfill_missing_member_role_assignments.sql` — Backfill active members with no roles
6. `20260216204156_fix_group_roles_bootstrap_insert.sql` — `is_group_creator()` + bootstrap INSERT policy
7. `20260216204314_fix_copy_template_permissions_security_definer.sql` — SECURITY DEFINER for template copy
8. `20260216204528_backfill_orphaned_groups_missing_roles.sql` — Fix groups with no roles
9. `20260216211001_notify_group_deleted.sql` — BEFORE DELETE notification trigger

### Files Modified (10 total)
- `components/groups/AssignRoleModal.tsx` — anti-escalation filtering with `userPermissions` prop
- `components/groups/RoleFormModal.tsx` — self-lockout warning in footer, "Go Back" / "Save Anyway" buttons
- `components/groups/RoleManagementSection.tsx` — passes user permissions, improved refresh
- `components/groups/PermissionPicker.tsx` — minor prop changes
- `components/groups/GroupCreateForm.tsx` — improved bootstrap error handling
- `components/notifications/NotificationBell.tsx` — removed navigation, unread-first sorting
- `app/groups/[id]/page.tsx` — passes userPermissions to AssignRoleModal
- `app/groups/page.tsx` — minor fixes
- `app/invitations/page.tsx` — removed client-side role assignment
- `docs/features/planned/dynamic-permissions-system.md` — minor update

### New Files
- `lib/constants/` — constants directory
- `scripts/query-members-no-roles.js` — diagnostic script

---

## Decisions Made

1. **DB trigger over client-side for role assignment on acceptance**: More reliable because the newly-accepted member has no permissions to INSERT into user_group_roles
2. **Bootstrap pattern for group creation**: `is_group_creator() AND NOT group_has_leader()` — only applies during initial setup, not after Steward exists
3. **Notifications are self-contained**: No navigation on click; just mark as read. Prevents 404 when referenced entities are deleted
4. **Unread notifications sorted first**: Ensures badge count matches visible items in the dropdown

---

## Issues Discovered and Fixed

1. **Cascading bootstrap problems**: Group creation involves a 5-step chain (group → membership → roles → role_permissions → user_group_roles), each with RLS that assumes prior steps complete. Required bootstrap cases + SECURITY DEFINER at multiple points.
2. **Pre-RBAC RLS still in production**: `user_group_roles` INSERT/DELETE policies were still using `is_active_group_leader()` instead of permission-based checks from RBAC.
3. **Client-side role assignment is unreliable**: Any operation that requires permissions the user doesn't have yet should be a DB trigger, not client-side code.

---

## Next Steps

- [ ] RBAC is now complete — consider Phase 1.6 Polish and Launch
- [ ] Mobile responsiveness audit
- [ ] User onboarding flow
- [ ] E2E tests (Playwright)
- [ ] Consider notification modal for long notification content (deferred)

---

## Context for Next Session

**What you need to know:**
- RBAC is fully implemented (4 sub-sprints + this bug fix session)
- 9 new migrations were applied this session — all via the standard migration workflow
- The bootstrap pattern (is_group_creator + no leader exists) is used in group_roles INSERT and user_group_roles INSERT policies
- Notifications no longer navigate; they're purely informational
- The `can_assign_role()` function enforces anti-escalation at the DB level

**Useful docs:**
- `docs/features/planned/dynamic-permissions-system.md` — full RBAC design
- `docs/agents/learnings/database.md` — 5 new entries about bootstrap patterns
- `docs/agents/learnings/ui.md` — 4 new entries about notification UX and lockout warnings
