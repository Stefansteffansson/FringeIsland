# Admin (Deusex Admin Foundation) Behaviors

> **Purpose:** Document the rules and guarantees for the admin foundation system.
> **Domain Code:** ADMIN
> **Design Reference:** `docs/features/active/deusex-admin-foundation.md`
> **Sub-Sprint:** 1 — DB Foundation, 2 — Admin Panel UI

---

## B-ADMIN-001: Admin Route Protection

**Rule:** All routes under `/admin/*` require `manage_all_groups` permission (platform_admin category, Deusex-exclusive). Unauthenticated users are redirected to `/login`. Authenticated users without the permission see an "Access Denied" screen.

**Why:** The admin panel provides platform-wide management capabilities. Only Deusex members should see or interact with it. Using `manage_all_groups` as the gate permission is consistent with the RBAC design — no special-case "isAdmin" checks.

**Verified by:**
- **Test:** `tests/integration/admin/admin-route-access.test.ts`
- **UI:** `app/admin/layout.tsx` (client-side permission gate)

**Acceptance Criteria:**
- [ ] Unauthenticated request to `/admin` → redirect to `/login`
- [ ] Authenticated non-admin at `/admin` → "Access Denied" component
- [ ] Deusex member at `/admin` → sees dashboard
- [ ] Permission check uses `has_permission()` RPC, not special-case code
- [ ] All sub-routes (`/admin/deusex`) inherit the layout gate

**Examples:**

✅ **Valid:**
- Deusex member navigates to `/admin` → Dashboard loads
- Deusex member navigates to `/admin/deusex` → Member management loads

❌ **Invalid:**
- Normal user accesses `/admin` → sees dashboard → VIOLATED
- Admin check uses `user.email === 'deusex@...'` → VIOLATED (must use `has_permission`)

**Testing Priority:** 🔴 CRITICAL (security gate for all admin functionality)

**History:**
- 2026-02-17: Created (Sub-Sprint 2)

---

## B-ADMIN-002: Admin Dashboard

**Rule:** The admin dashboard at `/admin` displays 4 platform-wide statistics: total users, total groups (engagement only), total journeys, and total enrollments.

**Why:** Deusex members need a quick overview of platform health. Stats count real entities, not system infrastructure.

**Verified by:**
- **UI:** `app/admin/page.tsx`
- **Manual:** Stats match Supabase dashboard counts

**Acceptance Criteria:**
- [ ] Dashboard shows "Users" count (from `users` table, `is_active = true`)
- [ ] Dashboard shows "Groups" count (from `groups` table, `group_type = 'engagement'`)
- [ ] Dashboard shows "Journeys" count (from `journeys` table)
- [ ] Dashboard shows "Enrollments" count (from `journey_enrollments` table)
- [ ] Stats update on page load (not cached)
- [ ] Loading state shown while fetching

**Examples:**

✅ **Valid:**
- Dashboard shows "Users: 15" when 15 active users exist
- Dashboard shows "Groups: 3" (excludes system and personal groups)

❌ **Invalid:**
- "Groups" count includes system groups → VIOLATED
- Stats are hardcoded → VIOLATED

**Testing Priority:** 🟡 MEDIUM (informational, no security impact)

**History:**
- 2026-02-17: Created (Sub-Sprint 2)

---

## B-ADMIN-003: Deusex Member Management

**Rule:** Deusex members can view the current Deusex member list, add new members by email, and remove members (with last-member protection). All changes are recorded in the audit log.

**Why:** The Deusex group needs self-service management. Email-based lookup reuses the pattern from group invitations. Audit logging ensures accountability.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-member-management.test.ts`
- **UI:** `app/admin/deusex/page.tsx`

**Acceptance Criteria:**
- [ ] Page lists all active Deusex members (name, email, join date)
- [ ] "Add Member" accepts an email, looks up user, adds membership + role
- [ ] Unknown email → user-friendly error ("User not found")
- [ ] Already-a-member email → user-friendly error ("Already a Deusex member")
- [ ] "Remove Member" shows ConfirmModal before removing
- [ ] Removing last member → blocked by trigger, shows user-friendly message
- [ ] Every add/remove writes to `admin_audit_log`
- [ ] Member list refreshes immediately after add/remove (no stale state)

**Examples:**

✅ **Valid:**
- Enter `alice@example.com` → Alice appears in Deusex member list
- Remove Bob (2 members remain) → Bob removed, audit log entry created
- Try to remove last member → Error: "Cannot remove the last Deusex member"

❌ **Invalid:**
- Add member with no audit log entry → VIOLATED
- Remove member and list doesn't update → VIOLATED (stale state)

**Testing Priority:** 🔴 CRITICAL (core admin functionality)

**History:**
- 2026-02-17: Created (Sub-Sprint 2)

---

## B-ADMIN-004: Auto-Grant Permissions to Deusex

**Rule:** When a new permission is inserted into the `permissions` table, a database trigger automatically grants it to the Deusex role. This ensures Deusex always has ALL permissions without manual intervention.

**Why:** The Deusex group must have every permission in the system. Before this trigger existed, new permissions had to be manually added to Deusex in each migration — error-prone and easy to forget. The trigger makes Deusex's "all permissions" guarantee self-maintaining.

**Note:** This supersedes the earlier B-RBAC-006 edge case that required explicit manual adds. Decision 1 of the admin foundation reversed that choice.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-auto-grant.test.ts`
- **Database:** Trigger on `permissions` table

**Acceptance Criteria:**
- [ ] INSERT into `permissions` → new row in `group_role_permissions` for Deusex role
- [ ] Trigger uses `ON CONFLICT DO NOTHING` (safe for re-runs and existing permissions)
- [ ] Trigger is `SECURITY DEFINER` with `search_path = ''`
- [ ] Trigger finds Deusex role by group name + group_type + role name (not hardcoded IDs)
- [ ] Duplicate permission insertion does not create duplicate role-permission mappings

**Examples:**

✅ **Valid:**
- `INSERT INTO permissions (name, description, category) VALUES ('new_perm', '...', 'platform_admin')` → Deusex role now has `new_perm`
- Same INSERT again → no duplicate in `group_role_permissions` (ON CONFLICT)

❌ **Invalid:**
- New permission added but Deusex doesn't have it → VIOLATED
- Trigger crashes on duplicate → VIOLATED (must be idempotent)

**Edge Cases:**
- **Scenario:** Permission inserted while Deusex group doesn't exist yet (bootstrap ordering)
  - **Behavior:** Trigger silently succeeds (no Deusex role found = no insert, no error)
  - **Why:** Allows migrations to run in any order during initial setup

**Testing Priority:** 🔴 CRITICAL (maintains Deusex's "all permissions" invariant)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-005: Last Deusex Member Protection

**Rule:** The database prevents removing the last member from the Deusex system group. Two triggers enforce this: one on `user_group_roles` (role removal) and one on `group_memberships` (membership removal).

**Why:** If all Deusex members are removed, no one can access the admin panel to add new ones — a lockout scenario. This mirrors the proven "last Steward" protection pattern.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-last-member.test.ts`
- **Database:** Triggers on `user_group_roles` and `group_memberships`

**Acceptance Criteria:**
- [ ] 2+ Deusex members → can remove one (role + membership)
- [ ] 1 Deusex member → DELETE on `user_group_roles` raises exception
- [ ] 1 Deusex member → DELETE on `group_memberships` raises exception
- [ ] Exception message is user-friendly: "Cannot remove the last Deusex member"
- [ ] Trigger checks Deusex group specifically (by `group_type = 'system'` + `name = 'Deusex'`)
- [ ] Non-Deusex role/membership deletions are unaffected

**Examples:**

✅ **Valid:**
- Remove Deusex role from user A (user B still has it) → Allowed
- Remove membership for user A (user B still active) → Allowed

❌ **Invalid:**
- Remove last Deusex role → should raise exception → If allowed, VIOLATED
- Remove last active Deusex membership → should raise exception → If allowed, VIOLATED

**Edge Cases:**
- **Scenario:** User has Deusex role removed but membership stays (or vice versa)
  - **Behavior:** Both triggers check independently — last role removal blocked, last membership removal blocked
  - **Why:** Either path leads to lockout, so both must be guarded

**Testing Priority:** 🔴 CRITICAL (prevents admin lockout)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-006: Deusex Bootstrap

**Rule:** A migration bootstraps `deusex@fringeisland.com` as the first Deusex member with an active group membership and the Deusex role assigned.

**Why:** The Deusex group needs at least one member to be functional. Using a migration makes this deterministic and auditable. The user must already exist in the system (created via normal signup).

**Verified by:**
- **Test:** `tests/integration/admin/deusex-bootstrap.test.ts`
- **Database:** Migration that inserts membership + role assignment

**Acceptance Criteria:**
- [ ] `deusex@fringeisland.com` has active membership in Deusex group (`status = 'active'`)
- [ ] `deusex@fringeisland.com` has the "Deusex" role assigned
- [ ] `has_permission('manage_all_groups')` returns true for this user in any context
- [ ] Migration is idempotent (`ON CONFLICT DO NOTHING`)
- [ ] Migration fails loudly if `deusex@fringeisland.com` user does not exist

**Examples:**

✅ **Valid:**
- Run migration → `deusex@fringeisland.com` is Deusex member with all permissions
- Run migration again → no error, no duplicate rows

❌ **Invalid:**
- Migration creates a new user (should only reference existing user) → VIOLATED
- Migration succeeds silently when user doesn't exist → VIOLATED (should fail loudly)

**Edge Cases:**
- **Scenario:** `deusex@fringeisland.com` hasn't signed up yet
  - **Behavior:** Migration raises an exception with clear message
  - **Why:** The bootstrap migration is a configuration step — the user must exist first

**Testing Priority:** 🔴 CRITICAL (foundation — no admin access without this)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-007: Admin Audit Log

**Rule:** An immutable `admin_audit_log` table records admin actions. Deusex members can SELECT and INSERT. No one can UPDATE or DELETE rows. Non-admin users cannot access the table at all.

**Why:** Admin actions (adding/removing Deusex members, future content moderation) need an accountability trail. Immutability ensures the log is trustworthy. This table will grow to cover more admin actions in future phases.

**Verified by:**
- **Test:** `tests/integration/admin/admin-audit-log.test.ts`
- **Database:** Table + RLS policies

**Acceptance Criteria:**
- [ ] Table `admin_audit_log` exists with columns: `id`, `actor_user_id`, `action`, `target`, `metadata` (JSONB), `created_at`
- [ ] RLS is enabled on the table
- [ ] Deusex members can SELECT all rows
- [ ] Deusex members can INSERT new rows
- [ ] No UPDATE policy exists (immutable)
- [ ] No DELETE policy exists (immutable)
- [ ] Non-admin authenticated users cannot SELECT, INSERT, UPDATE, or DELETE
- [ ] `actor_user_id` references `users(id)`
- [ ] `created_at` defaults to `NOW()`

**Examples:**

✅ **Valid:**
- Deusex member inserts audit log entry → succeeds
- Deusex member reads audit log → sees all entries
- Non-admin tries to read audit log → empty result (RLS blocks)

❌ **Invalid:**
- Deusex member updates an audit entry → should be blocked → If allowed, VIOLATED
- Deusex member deletes an audit entry → should be blocked → If allowed, VIOLATED
- Non-admin inserts audit entry → should be blocked → If allowed, VIOLATED

**Testing Priority:** 🟠 HIGH (accountability for admin actions)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-008: User Decommission

**Rule:** DeusEx admins can decommission users by setting `is_decommissioned = true` and `is_active = false`. Decommissioned users are hidden from normal queries but all their records (memberships, enrollments, roles) are preserved. This is a one-way operation — decommissioned users cannot be reactivated from the UI.

**Why:** Decommissioning is a "soft permanent removal" — the user's data is preserved for audit and historical purposes, but they are effectively removed from the platform. Unlike deactivation (which is reversible), decommission signals the user should never return.

**Verified by:**
- **Test:** `tests/integration/admin/user-decommission.test.ts`
- **Database:** `is_decommissioned` column on `users` table + updated RLS policies

**Acceptance Criteria:**
- [ ] `users` table has `is_decommissioned BOOLEAN NOT NULL DEFAULT false` column
- [ ] Admin can set `is_decommissioned = true` (also sets `is_active = false`)
- [ ] Decommissioned user is hidden from normal user SELECT queries
- [ ] Admin can see decommissioned users via filter (has `manage_all_groups` permission)
- [ ] Decommissioned user's group memberships and enrollments are preserved (not deleted)
- [ ] Decommissioned users cannot be reactivated (activate action filters them out)

**Examples:**

✅ **Valid:**
- Admin decommissions user → `is_decommissioned = true`, `is_active = false`
- Normal user queries users table → decommissioned user not visible
- Admin queries with filter → decommissioned user visible

❌ **Invalid:**
- Decommissioned user's memberships are deleted → VIOLATED (preserve all records)
- Non-admin can decommission a user → VIOLATED (admin-only)

**Testing Priority:** 🔴 CRITICAL (user lifecycle management)

**History:**
- 2026-02-17: Created (Bulk User Actions)

---

## B-ADMIN-009: User Hard Delete

**Rule:** DeusEx admins can hard-delete users via an RPC that cascading-removes all related records in the correct order: `notifications` → `direct_messages` → `conversations` → `journey_enrollments` → `user_group_roles` → `group_memberships` → `users` row → `auth.users`. An audit log entry is created before deletion (capturing user info). Non-admins cannot call this RPC.

**Why:** Hard delete is the nuclear option — completely removes the user and all their data. This is irreversible and should only be used when legally required (GDPR right to erasure) or for test data cleanup. The cascade order prevents FK constraint violations.

**Verified by:**
- **Test:** `tests/integration/admin/user-hard-delete.test.ts`
- **Database:** `admin_hard_delete_user()` RPC (SECURITY DEFINER)

**Acceptance Criteria:**
- [ ] RPC `admin_hard_delete_user(target_user_id UUID)` exists
- [ ] RPC validates caller has `manage_all_groups` permission
- [ ] RPC deletes all child records in FK-safe order
- [ ] RPC creates audit log entry before deletion (captures user email, name)
- [ ] After RPC, user row is gone from `users` table
- [ ] After RPC, auth user is gone from `auth.users`
- [ ] Non-admin calling RPC gets permission error
- [ ] RPC raises error if target user doesn't exist

**Examples:**

✅ **Valid:**
- Admin calls RPC for user → all records removed, audit entry exists
- Admin calls RPC for non-existent user → error: "User not found"

❌ **Invalid:**
- Non-admin calls RPC → should be rejected → If succeeds, VIOLATED
- Hard delete leaves orphaned records → VIOLATED (must cascade properly)

**Testing Priority:** 🔴 CRITICAL (irreversible data destruction)

**History:**
- 2026-02-17: Created (Bulk User Actions)

---

## B-ADMIN-010: Admin User Management

**Rule:** DeusEx admins can UPDATE users' `is_active` and `is_decommissioned` columns. Non-admins cannot update other users' records (existing self-update policy unchanged).

**Why:** Admins need to deactivate/activate users for moderation purposes. This is a separate capability from decommission — deactivation is temporary and reversible, decommission is permanent.

**Verified by:**
- **Test:** `tests/integration/admin/admin-user-management.test.ts`
- **Database:** UPDATE policy on `users` table for admins

**Acceptance Criteria:**
- [ ] Admin can set `is_active = false` on any user (deactivate)
- [ ] Admin can set `is_active = true` on a deactivated user (activate)
- [ ] Admin can set `is_decommissioned = true` on any user
- [ ] Non-admin cannot update another user's `is_active` or `is_decommissioned`
- [ ] Existing self-update policy still works (users can edit own profile)
- [ ] Activating a decommissioned user is blocked (admin should not activate `is_decommissioned = true` users)

**Examples:**

✅ **Valid:**
- Admin sets `is_active = false` for user → user deactivated
- Admin sets `is_active = true` for deactivated user → user reactivated
- User updates own `full_name` → still works (self-update policy)

❌ **Invalid:**
- Normal user sets `is_active = false` on another user → VIOLATED (admin-only)
- Admin activates a decommissioned user → VIOLATED (decommission is permanent)

**Testing Priority:** 🔴 CRITICAL (user management security)

**History:**
- 2026-02-17: Created (Bulk User Actions)

---

## B-ADMIN-011: Admin Notification Send

**Rule:** DeusEx admins can send notifications to any user(s) via the `admin_send_notification` RPC. The RPC inserts one notification row per target user with type `admin_notification`. Non-admins cannot call this RPC.

**Why:** Admins need to communicate important information to users (policy changes, maintenance windows, account issues). Using the existing notification infrastructure ensures consistent delivery.

**Verified by:**
- **Test:** `tests/integration/admin/admin-notification-send.test.ts`
- **Database:** `admin_send_notification()` RPC (SECURITY DEFINER)

**Acceptance Criteria:**
- [ ] RPC `admin_send_notification(target_user_ids UUID[], title TEXT, message TEXT)` exists
- [ ] RPC validates caller has `manage_all_groups` permission
- [ ] RPC inserts one `notifications` row per target user
- [ ] Notification type is `admin_notification`
- [ ] RPC returns count of notifications sent
- [ ] Non-admin calling RPC gets permission error
- [ ] Empty target list returns 0 (no error)

**Examples:**

✅ **Valid:**
- Admin sends notification to 3 users → 3 notification rows created, returns 3
- Admin sends to empty list → returns 0

❌ **Invalid:**
- Non-admin calls RPC → should be rejected → If succeeds, VIOLATED
- RPC sends notification without title → VIOLATED (title required)

**Testing Priority:** 🟠 HIGH (admin communication tool)

**History:**
- 2026-02-17: Created (Bulk User Actions)

---

## B-ADMIN-012: Admin Group Visibility

**Rule:** DeusEx admins can see ALL groups (public, private, system, personal, engagement) for the group picker in the invite-to-group action. Normal users only see public groups and groups they're members of (existing policy).

**Why:** When inviting users to groups, admins need to see all available groups — not just the ones they personally belong to. This enables platform-wide user management.

**Verified by:**
- **Test:** `tests/integration/admin/admin-group-visibility.test.ts`
- **Database:** Updated SELECT policy on `groups` table

**Acceptance Criteria:**
- [ ] Admin with `manage_all_groups` can SELECT all groups regardless of membership or visibility
- [ ] Normal user can only SELECT public groups + groups they're a member of (unchanged)
- [ ] Admin sees all group types (system, personal, engagement)
- [ ] No changes to INSERT/UPDATE/DELETE policies on groups

**Examples:**

✅ **Valid:**
- Admin queries groups → sees all groups including private ones they're not in
- Normal user queries groups → only sees public + own groups (existing behavior)

❌ **Invalid:**
- Normal user sees all private groups → VIOLATED (existing policy must hold)
- Admin cannot see a private group → VIOLATED (admin sees everything)

**Testing Priority:** 🟡 MEDIUM (enables admin group picker)

**History:**
- 2026-02-17: Created (Bulk User Actions)
