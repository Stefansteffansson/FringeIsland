# DeusEx Admin Foundation

**Status:** Active
**Phase:** 1.6 — Admin Foundation
**Last Updated:** February 18, 2026

---

## Overview

The DeusEx system group exists with all 42 permissions (Tier 1 resolution). This feature builds the admin system in three sub-sprints: database foundation, admin panel UI, and the Users panel with interactive management actions.

**Key Capabilities:**
- Bootstrap `deusex@fringeisland.com` as first DeusEx member
- Auto-grant new permissions to DeusEx role via DB trigger
- Last-member protection (same pattern as Steward)
- Immutable admin audit log
- Admin panel with platform stats dashboard
- DeusEx member management (add/remove by email)
- Route protection for `/admin/*`
- **Users panel with selection, action bar, and 10 management actions** (Sub-Sprint 3)

---

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Auto-grant new permissions to DeusEx | DB trigger on `INSERT INTO permissions` | DeusEx must always have ALL permissions — manual adds are error-prone |
| 2 | Bootstrap first member | `deusex@fringeisland.com` via migration | Deterministic, auditable, no manual SQL |
| 3 | Last-member protection | DB trigger (same pattern as Steward) | Proven pattern, consistent enforcement |
| 4 | Admin panel | Minimal `/admin` now (Phase 1.6) | Enough to manage the platform; grows later |
| 5 | DeusEx member management | In the admin panel | Self-service for DeusEx members |
| 6 | Tiered admin access | Deferred to Phase 2+ | One tier (DeusEx = full access) is sufficient now |
| 7 | Users panel rename | "Active Users" → "Users" | Shows all users, not just active. Count reflects current filter state. |
| 8 | Default user visibility | Active + inactive visible, decommissioned hidden | Admins should see inactive accounts. Decommissioned are permanently removed — hidden by default with toggle to show. |
| 9 | Selection model | Toggle-click + Shift+range, cross-page persistence | Simple interaction: click toggles, Shift for range. Selection survives page navigation. |
| 10 | Action bar grouping | Communication / Account / Group | 10 actions organized into 3 categories for clarity |
| 11 | Context-sensitive actions | Disable irrelevant actions based on selection state | Prevents mistakes — e.g., "Activate" disabled if all selected are already active |
| 12 | Selection persistence after actions | NOT cleared for non-destructive, cleared for destructive | Admin may want to take multiple actions on same selection (Notify then Message). Destructive actions (delete, deactivate) clear selection since user state changed. |
| 13 | Group picker for Remove action | Intersection of ALL selected users' engagement groups | Only shows groups all selected users share — prevents confusion |
| 14 | Force logout implementation | Supabase Auth Admin API (global sign-out) | Invalidates all sessions. User redirected to login on next request. |

---

## Behaviors

### Sub-Sprint 1 (DB Foundation) — COMPLETE v0.2.21

| Code | Name | Status |
|------|------|--------|
| B-ADMIN-004 | Auto-Grant Permissions | ✅ Implemented + Tested |
| B-ADMIN-005 | Last DeusEx Member Protection | ✅ Implemented + Tested |
| B-ADMIN-006 | DeusEx Bootstrap | ✅ Implemented + Tested |
| B-ADMIN-007 | Admin Audit Log | ✅ Implemented + Tested |

### Sub-Sprint 2 (Admin Panel UI) — COMPLETE v0.2.21

| Code | Name | Status |
|------|------|--------|
| B-ADMIN-001 | Admin Route Protection | ✅ Implemented + Tested |
| B-ADMIN-002 | Admin Dashboard | ✅ Implemented (to be revised in Sub-Sprint 3) |
| B-ADMIN-003 | DeusEx Member Management | ✅ Implemented + Tested |

### Sub-Sprint 3A (DB Foundation for User Actions) — COMPLETE v0.2.22

| Code | Name | Status |
|------|------|--------|
| B-ADMIN-008 | User Decommission (soft delete) | ✅ Implemented + Tested |
| B-ADMIN-009 | User Hard Delete | ✅ Implemented + Tested |
| B-ADMIN-010 | Admin User Management (activate/deactivate) | ✅ Implemented + Tested |
| B-ADMIN-011 | Admin Notification Send | ✅ Implemented + Tested |
| B-ADMIN-012 | Admin Group Visibility | ✅ Implemented + Tested |

### Sub-Sprint 3B (UI Foundation — Panel + Selection + Action Bar) — COMPLETE v0.2.23

| Code | Name | Status |
|------|------|--------|
| B-ADMIN-002 | Admin Dashboard (REVISED — rename, toggle, count) | ✅ Implemented + Tested |
| B-ADMIN-013 | Users Panel Selection | ✅ Implemented + Tested |
| B-ADMIN-014 | Users Panel Action Bar | ✅ Implemented + Tested |

### Sub-Sprint 3C (Wire Actions) — NOT STARTED

| Code | Name | Status |
|------|------|--------|
| B-ADMIN-015 | Admin Message (DM) | ⏳ Specced |
| B-ADMIN-016 | Admin Invite to Group | ⏳ Specced |
| B-ADMIN-017 | Admin Join Group (direct add) | ⏳ Specced |
| B-ADMIN-018 | Admin Remove from Group | ⏳ Specced |
| B-ADMIN-019 | Admin Force Logout | ⏳ Specced |

Full specs: `docs/specs/behaviors/admin.md`

---

## Sub-Sprints

### Sub-Sprint 1: DeusEx Foundation (DB Only) — COMPLETE

**Migrations:**
- A: `auto_grant_permissions_to_deusex` — trigger on `permissions` INSERT
- B: `deusex_bootstrap` — add `deusex@fringeisland.com` to DeusEx group
- C: `deusex_last_member_protection` — triggers on role/membership DELETE
- D: `admin_audit_log` — table + RLS policies

**Tests:** `tests/integration/admin/`
- `deusex-auto-grant.test.ts`
- `deusex-last-member.test.ts`
- `deusex-bootstrap.test.ts`
- `admin-audit-log.test.ts`

### Sub-Sprint 2: Admin Panel (UI) — COMPLETE

**New Files:**
- `app/admin/layout.tsx` — permission gate
- `app/admin/page.tsx` — dashboard with stats
- `app/admin/deusex/page.tsx` — member management
- `components/admin/AdminStatCard.tsx`
- `components/admin/AdminDataPanel.tsx`
- `components/admin/DeusexMemberList.tsx`

**Modified Files:**
- `components/Navigation.tsx` — conditional Admin link

**Tests:** `tests/integration/admin/`
- `admin-route-access.test.ts`
- `deusex-member-management.test.ts`

### Sub-Sprint 3A: DB Foundation for User Actions — NOT STARTED

**DB changes needed:**
- Add `is_decommissioned BOOLEAN NOT NULL DEFAULT false` to `users` table
- Admin UPDATE policy on `users` (for `is_active`, `is_decommissioned`)
- `admin_hard_delete_user(target_user_id UUID)` RPC (SECURITY DEFINER, FK-safe cascade)
- `admin_send_notification(target_user_ids UUID[], title TEXT, message TEXT)` RPC
- Updated SELECT policy on `groups` for admin group visibility

**Tests:** `tests/integration/admin/`
- `user-decommission.test.ts`
- `user-hard-delete.test.ts`
- `admin-user-management.test.ts`
- `admin-notification-send.test.ts`
- `admin-group-visibility.test.ts`

### Sub-Sprint 3B: UI Foundation (Panel + Selection + Action Bar) — NOT STARTED

**Modified Files:**
- `app/admin/page.tsx` — rename stat card, update count logic, add toggle
- `components/admin/AdminDataPanel.tsx` — add selection (checkboxes, toggle-click, Shift+range, cross-page persistence, counter)

**New Files:**
- `components/admin/UserActionBar.tsx` — action bar with 3 groups, 10 buttons, context-sensitive disabling

**Selection Model:**
- Click row → toggle selection
- Shift+click → range select
- Header checkbox → select/deselect all visible
- Cross-page persistence (selected IDs in state)
- Counter: "X users selected"
- Mobile: tap to toggle, press+drag for range

### Sub-Sprint 3C: Wire Actions — NOT STARTED

**Action buttons to wire (3 groups):**

| Group | Action | UI | DB |
|-------|--------|----|----|
| Communication | Message | Compose modal → create/reuse DMs | Existing DM tables |
| Communication | Notify | Title+message modal → RPC | `admin_send_notification` RPC (3A) |
| Account | Deactivate | ConfirmModal → update `is_active` | Admin UPDATE policy (3A) |
| Account | Activate | Direct → update `is_active` | Admin UPDATE policy (3A) |
| Account | Delete (soft) | ConfirmModal → update `is_decommissioned` | Admin UPDATE policy (3A) |
| Account | Delete (hard) | Strong ConfirmModal → RPC per user | `admin_hard_delete_user` RPC (3A) |
| Account | Logout | ConfirmModal → Auth Admin API | Supabase Auth Admin |
| Group | Invite | Group picker → insert memberships (invited) | B-ADMIN-012 policy (3A) |
| Group | Join | Group picker + ConfirmModal → insert memberships (active) | B-ADMIN-012 policy (3A) |
| Group | Remove | Intersection group picker + ConfirmModal → delete memberships | B-ADMIN-012 policy (3A) |

**New Files:**
- `components/admin/NotifyModal.tsx` — title + message input
- `components/admin/MessageModal.tsx` — message input
- `components/admin/GroupPickerModal.tsx` — group search + select (reused for Invite/Join/Remove)

---

## Key Patterns

| Pattern | Source |
|---------|--------|
| Last-leader protection trigger | `supabase/migrations/20260216140506_rbac_role_management.sql` |
| Adding user to DeusEx | `tests/integration/rbac/deusex-permissions.test.ts:30-65` |
| `has_permission()` RPC call | `lib/hooks/usePermissions.ts` |
| `ConfirmModal` for destructive actions | `components/ui/ConfirmModal.tsx` |
| Navigation conditional links | `components/Navigation.tsx` |
| AdminDataPanel (paginated table) | `components/admin/AdminDataPanel.tsx` |
| AdminStatCard (expandable stat) | `components/admin/AdminStatCard.tsx` |
| DM conversation creation | `app/messages/page.tsx` (existing DM flow) |
| Group invitation creation | `components/groups/InviteMemberModal.tsx` |

---

## Verification Checklist

### Sub-Sprints 1+2 (COMPLETE)
- [x] `deusex@fringeisland.com` is active DeusEx member after bootstrap migration
- [x] INSERT new permission → DeusEx role auto-receives it
- [x] Remove last DeusEx member → blocked by trigger
- [x] Log in as `deusex@fringeisland.com` → can access `/admin`
- [x] Log in as normal user → `/admin` shows "Access Denied"
- [x] Dashboard shows accurate platform stats
- [x] Add user to DeusEx by email → appears in member list
- [x] Remove a DeusEx member (when not last) → success, audit log entry
- [x] All integration tests pass (349/349)

### Sub-Sprint 3A (DB) — VERIFIED v0.2.22
- [x] `is_decommissioned` column exists on users table
- [x] Admin can decommission a user (sets both flags)
- [x] Admin can hard-delete a user (all records removed, audit entry preserved)
- [x] Admin can activate/deactivate users
- [x] Admin can send notifications to any users
- [x] Admin can see all groups (including private)
- [x] Non-admin cannot perform any of the above

### Sub-Sprint 3B (UI) — VERIFIED v0.2.23
- [x] Stat card labeled "Users" (not "Active Users")
- [x] Count reflects current filter (active + inactive by default)
- [x] Toggle shows/hides decommissioned users
- [x] Rows have checkboxes, click toggles, Shift+click ranges
- [x] Selection persists across pages
- [x] "X users selected" counter visible
- [x] Action bar appears with 10 grouped buttons
- [x] Context-sensitive disabling works

### Sub-Sprint 3C (Actions)
- [ ] Message → individual DMs to each selected user
- [ ] Notify → admin notification to each selected user
- [ ] Deactivate → `is_active = false` with ConfirmModal
- [ ] Activate → `is_active = true` (no confirm needed)
- [ ] Delete (soft) → decommission with ConfirmModal
- [ ] Delete (hard) → cascade delete with strong ConfirmModal
- [ ] Invite → group picker, sends invitations
- [ ] Join → group picker + ConfirmModal, direct add
- [ ] Remove → intersection group picker + ConfirmModal
- [ ] Logout → force sign-out with ConfirmModal
- [ ] All audit-logged
