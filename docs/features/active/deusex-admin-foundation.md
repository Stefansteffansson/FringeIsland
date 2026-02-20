# DeusEx Admin Foundation

**Status:** Active
**Phase:** 1.6 — Admin Foundation
**Last Updated:** February 20, 2026

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

### Sub-Sprint 3C (Wire Actions — DB Layer) — COMPLETE v0.2.24

| Code | Name | Status |
|------|------|--------|
| B-ADMIN-015 | Admin Message (DM) | ✅ DB + Tests (4 tests) |
| B-ADMIN-016 | Admin Invite to Group | ✅ DB + Tests (6 tests) |
| B-ADMIN-017 | Admin Join Group (direct add) | ✅ DB + Tests (5 tests) |
| B-ADMIN-018 | Admin Remove from Group | ✅ DB + Tests (5 tests) |
| B-ADMIN-019 | Admin Force Logout | ✅ DB + Tests (6 tests) |

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

### Sub-Sprint 3A: DB Foundation for User Actions — COMPLETE v0.2.22

**Migration:** `20260219153530_admin_user_actions_foundation.sql`
- `is_decommissioned BOOLEAN NOT NULL DEFAULT false` on `users` table
- Admin UPDATE policy on `users` (for `is_active`, `is_decommissioned`)
- `admin_hard_delete_user(target_user_id UUID)` RPC (SECURITY DEFINER, FK-safe cascade)
- `admin_send_notification(target_user_ids UUID[], title TEXT, message TEXT)` RPC
- Admin SELECT policy on `groups` for group visibility

**Tests:** `tests/integration/admin/` (28 tests)
- `user-decommission.test.ts`
- `user-hard-delete.test.ts`
- `admin-user-management.test.ts`
- `admin-notification-send.test.ts`
- `admin-group-visibility.test.ts`

### Sub-Sprint 3B: UI Foundation (Panel + Selection + Action Bar) — COMPLETE v0.2.23

**Modified Files:**
- `app/admin/page.tsx` — "Active Users" → "Users", decommissioned toggle, status badges
- `components/admin/AdminDataPanel.tsx` — checkboxes, toggle-click, Shift+range, cross-page persistence, counter

**New Files:**
- `components/admin/UserActionBar.tsx` — 3 groups, 10 buttons, context-sensitive disabling
- `lib/admin/selectionUtils.ts` — pure selection logic
- `lib/admin/actionBarUtils.ts` — pure action enablement logic
- `lib/admin/userFilterUtils.ts` — pure user filter logic

**Tests:** 99 unit tests across 3 files
- `tests/unit/admin/selectionUtils.test.ts`
- `tests/unit/admin/actionBarUtils.test.ts`
- `tests/unit/admin/userFilterUtils.test.ts`

### Sub-Sprint 3C: Wire Actions — COMPLETE v0.2.25

**DB Layer (COMPLETE v0.2.24):**

**Migrations:**
- `20260220082034_admin_group_action_policies.sql` — 5 RLS policies (admin SELECT/INSERT on group_memberships, admin SELECT/INSERT/DELETE on user_group_roles)
- `20260220082112_admin_action_rpcs_and_audit_triggers.sql` — `admin_force_logout` RPC + audit triggers on group_memberships and direct_messages
- `20260220082527_fix_admin_action_triggers_and_rpc.sql` — type cast fix, SECURITY DEFINER on `validate_user_group_role` + `prevent_last_leader_removal`, admin SELECT on group_roles

**Key Findings:**
- PostgREST DELETE...RETURNING requires rows visible under SELECT policy
- Trigger functions querying RLS-protected tables need SECURITY DEFINER
- `auth.refresh_tokens.user_id` is varchar, not UUID — needs explicit `::text` cast

**Tests:** `tests/integration/admin/` (26 tests)
- `admin-message-send.test.ts` — 4 tests (DM creation, reuse, individual convos, audit)
- `admin-invite-to-group.test.ts` — 6 tests (invite, batch, skip existing, engagement filter, non-admin blocked, audit)
- `admin-join-group.test.ts` — 5 tests (direct add, Member role, skip existing, group filter, audit)
- `admin-remove-from-group.test.ts` — 5 tests (remove, role cleanup, Steward protection, intersection, audit)
- `admin-force-logout.test.ts` — 6 tests (RPC, session invalidation, inactive users, batch, non-admin blocked, audit)

**UI Layer (COMPLETE v0.2.25):**

| Group | Action | UI | Status |
|-------|--------|----|----|
| Communication | Message | MessageModal → create/reuse DMs | ✅ Wired |
| Communication | Notify | NotifyModal → `admin_send_notification` RPC | ✅ Wired |
| Account | Deactivate | ConfirmModal → update `is_active` | ✅ Wired |
| Account | Activate | Direct → update `is_active` | ✅ Wired |
| Account | Delete (soft) | ConfirmModal → update `is_decommissioned` | ✅ Wired |
| Account | Delete (hard) | Strong ConfirmModal → `admin_hard_delete_user` RPC | ✅ Wired |
| Account | Logout | ConfirmModal → `admin_force_logout` RPC | ✅ Wired |
| Group | Invite | GroupPickerModal → insert memberships (invited) | ✅ Wired |
| Group | Join | GroupPickerModal + ConfirmModal → insert memberships (active) + Member role | ✅ Wired |
| Group | Remove | GroupPickerModal (intersection) + ConfirmModal → delete roles + memberships | ✅ Wired |

**New Files (UI):**
- `components/admin/NotifyModal.tsx` — title + message form
- `components/admin/MessageModal.tsx` — DM compose form
- `components/admin/GroupPickerModal.tsx` — searchable group picker (3 modes: invite/join/remove)

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

### Sub-Sprint 3C — DB Layer (VERIFIED v0.2.24)
- [x] Admin can create DM conversations with any user (RLS policies)
- [x] Admin can insert group memberships (invite/join) into any engagement group
- [x] Admin can remove group memberships from any engagement group
- [x] Admin can assign/remove roles in any group
- [x] Steward last-leader protection works for admin operations
- [x] `admin_force_logout` RPC revokes sessions + refresh tokens
- [x] Non-admin blocked from all admin operations
- [x] Audit triggers auto-log admin group/message operations
- [x] All 26 integration tests passing, 506/506 full suite passing

### Sub-Sprint 3C — UI Wiring (COMPLETE v0.2.25)
- [x] Message → MessageModal + create/reuse DMs per user
- [x] Notify → NotifyModal + `admin_send_notification` RPC
- [x] Deactivate → ConfirmModal + `is_active = false`
- [x] Activate → direct `is_active = true`
- [x] Delete (soft) → ConfirmModal + decommission
- [x] Delete (hard) → strong ConfirmModal + `admin_hard_delete_user` RPC per user
- [x] Invite → GroupPickerModal + insert memberships (invited)
- [x] Join → GroupPickerModal + ConfirmModal + insert memberships (active) + Member role
- [x] Remove → GroupPickerModal (intersection) + ConfirmModal + delete roles + memberships
- [x] Logout → ConfirmModal + `admin_force_logout` RPC
