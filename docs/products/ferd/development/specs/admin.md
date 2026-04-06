# Admin (DeusEx Admin Foundation) Behaviors

> **Purpose:** Document the rules and guarantees for the admin foundation system.
> **Domain Code:** ADMIN
> **Design Reference:** `docs/products/ferd/development/features/AR-deusex-admin-foundation.md`
> **Sub-Sprint:** 1 — DB Foundation, 2 — Admin Panel UI, 3 — Users Panel & Actions

---

## B-ADMIN-001: Admin Route Protection

**Rule:** All routes under `/admin/*` require `manage_all_groups` permission (platform_admin category, DeusEx-exclusive). Unauthenticated users are redirected to `/login`. Authenticated users without the permission see an "Access Denied" screen.

**Why:** The admin panel provides platform-wide management capabilities. Only DeusEx members should see or interact with it. Using `manage_all_groups` as the gate permission is consistent with the RBAC design — no special-case "isAdmin" checks.

**Verified by:**
- **Test:** `tests/integration/admin/admin-route-access.test.ts`
- **UI:** `app/admin/layout.tsx` (client-side permission gate)

**Acceptance Criteria:**
- [ ] Unauthenticated request to `/admin` → redirect to `/login`
- [ ] Authenticated non-admin at `/admin` → "Access Denied" component
- [ ] DeusEx member at `/admin` → sees dashboard
- [ ] Permission check uses `has_permission()` RPC, not special-case code
- [ ] All sub-routes (`/admin/deusex`) inherit the layout gate

**Examples:**

✅ **Valid:**
- DeusEx member navigates to `/admin` → Dashboard loads
- DeusEx member navigates to `/admin/deusex` → Member management loads

❌ **Invalid:**
- Normal user accesses `/admin` → sees dashboard → VIOLATED
- Admin check uses `user.email === 'deusex@...'` → VIOLATED (must use `has_permission`)

**Testing Priority:** 🔴 CRITICAL (security gate for all admin functionality)

**History:**
- 2026-02-17: Created (Sub-Sprint 2)

---

## B-ADMIN-002: Admin Dashboard (REVISED)

**Rule:** The admin dashboard at `/admin` displays 4 platform-wide statistics: Users, Groups (engagement only), Journeys, and Enrollments. The Users stat card is labeled "Users" (not "Active Users") and its count reflects the currently visible users based on filter state. By default, active + inactive users are visible and decommissioned users are hidden. A toggle switch controls decommissioned user visibility.

**Why:** DeusEx members need a quick overview of platform health. The Users panel is the hub for user management actions (B-ADMIN-013 through B-ADMIN-019). Showing inactive users by default ensures admins are aware of deactivated accounts. Hiding decommissioned users by default keeps the view clean since those accounts are permanently removed.

**Verified by:**
- **UI:** `app/admin/page.tsx`
- **Manual:** Stats match Supabase dashboard counts

**Acceptance Criteria:**
- [ ] Dashboard shows "Users" stat card (NOT "Active Users")
- [ ] Users count = number of currently visible users based on filter state
- [ ] Default filter: active + inactive visible, decommissioned hidden
- [ ] Toggle switch in Users panel: "Show decommissioned" (default: off)
- [ ] Toggle on → decommissioned users appear in table with visual indicator
- [ ] Toggle off → decommissioned users hidden from table and count
- [ ] Inactive users show visual distinction from active users (e.g., muted row, status badge)
- [ ] Dashboard shows "Groups" count (from `groups` table, `group_type = 'engagement'`)
- [ ] Dashboard shows "Journeys" count (from `journeys` table)
- [ ] Dashboard shows "Enrollments" count (from `journey_enrollments` table)
- [ ] Stats update on page load (not cached)
- [ ] Loading state shown while fetching

**Examples:**

✅ **Valid:**
- 15 active + 3 inactive users → stat card shows "Users: 18"
- Toggle decommissioned on (2 decommissioned) → stat card shows "Users: 20"
- Dashboard shows "Groups: 3" (excludes system and personal groups)

❌ **Invalid:**
- Stat card still labeled "Active Users" → VIOLATED
- Decommissioned users visible with toggle off → VIOLATED
- Inactive users hidden by default → VIOLATED (should be visible)
- Stats are hardcoded → VIOLATED

**Testing Priority:** 🟡 MEDIUM (informational, no security impact)

**History:**
- 2026-02-17: Created (Sub-Sprint 2)
- 2026-02-18: Revised — renamed to "Users", added toggle, count reflects filter (Sub-Sprint 3)

---

## B-ADMIN-003: DeusEx Member Management

**Rule:** DeusEx members can view the current DeusEx member list, add new members by email, and remove members (with last-member protection). All changes are recorded in the audit log.

**Why:** The DeusEx group needs self-service management. Email-based lookup reuses the pattern from group invitations. Audit logging ensures accountability.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-member-management.test.ts`
- **UI:** `app/admin/deusex/page.tsx`

**Acceptance Criteria:**
- [ ] Page lists all active DeusEx members (name, email, join date)
- [ ] "Add Member" accepts an email, looks up user, adds membership + role
- [ ] Unknown email → user-friendly error ("User not found")
- [ ] Already-a-member email → user-friendly error ("Already a DeusEx member")
- [ ] "Remove Member" shows ConfirmModal before removing
- [ ] Removing last member → blocked by trigger, shows user-friendly message
- [ ] Every add/remove writes to `admin_audit_log`
- [ ] Member list refreshes immediately after add/remove (no stale state)

**Examples:**

✅ **Valid:**
- Enter `alice@example.com` → Alice appears in DeusEx member list
- Remove Bob (2 members remain) → Bob removed, audit log entry created
- Try to remove last member → Error: "Cannot remove the last DeusEx member"

❌ **Invalid:**
- Add member with no audit log entry → VIOLATED
- Remove member and list doesn't update → VIOLATED (stale state)

**Testing Priority:** 🔴 CRITICAL (core admin functionality)

**History:**
- 2026-02-17: Created (Sub-Sprint 2)

---

## B-ADMIN-004: Auto-Grant Permissions to DeusEx

**Rule:** When a new permission is inserted into the `permissions` table, a database trigger automatically grants it to the DeusEx role. This ensures DeusEx always has ALL permissions without manual intervention.

**Why:** The DeusEx group must have every permission in the system. Before this trigger existed, new permissions had to be manually added to DeusEx in each migration — error-prone and easy to forget. The trigger makes DeusEx's "all permissions" guarantee self-maintaining.

**Note:** This supersedes the earlier B-RBAC-006 edge case that required explicit manual adds. Decision 1 of the admin foundation reversed that choice.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-auto-grant.test.ts`
- **Database:** Trigger on `permissions` table

**Acceptance Criteria:**
- [ ] INSERT into `permissions` → new row in `group_role_permissions` for DeusEx role
- [ ] Trigger uses `ON CONFLICT DO NOTHING` (safe for re-runs and existing permissions)
- [ ] Trigger is `SECURITY DEFINER` with `search_path = ''`
- [ ] Trigger finds DeusEx role by group name + group_type + role name (not hardcoded IDs)
- [ ] Duplicate permission insertion does not create duplicate role-permission mappings

**Examples:**

✅ **Valid:**
- `INSERT INTO permissions (name, description, category) VALUES ('new_perm', '...', 'platform_admin')` → DeusEx role now has `new_perm`
- Same INSERT again → no duplicate in `group_role_permissions` (ON CONFLICT)

❌ **Invalid:**
- New permission added but DeusEx doesn't have it → VIOLATED
- Trigger crashes on duplicate → VIOLATED (must be idempotent)

**Edge Cases:**
- **Scenario:** Permission inserted while DeusEx group doesn't exist yet (bootstrap ordering)
  - **Behavior:** Trigger silently succeeds (no DeusEx role found = no insert, no error)
  - **Why:** Allows migrations to run in any order during initial setup

**Testing Priority:** 🔴 CRITICAL (maintains DeusEx's "all permissions" invariant)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-005: Last DeusEx Member Protection

**Rule:** The database prevents removing the last member from the DeusEx system group. Two triggers enforce this: one on `user_group_roles` (role removal) and one on `group_memberships` (membership removal).

**Why:** If all DeusEx members are removed, no one can access the admin panel to add new ones — a lockout scenario. This mirrors the proven "last Steward" protection pattern.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-last-member.test.ts`
- **Database:** Triggers on `user_group_roles` and `group_memberships`

**Acceptance Criteria:**
- [ ] 2+ DeusEx members → can remove one (role + membership)
- [ ] 1 DeusEx member → DELETE on `user_group_roles` raises exception
- [ ] 1 DeusEx member → DELETE on `group_memberships` raises exception
- [ ] Exception message is user-friendly: "Cannot remove the last DeusEx member"
- [ ] Trigger checks DeusEx group specifically (by `group_type = 'system'` + `name = 'DeusEx'`)
- [ ] Non-DeusEx role/membership deletions are unaffected

**Examples:**

✅ **Valid:**
- Remove DeusEx role from user A (user B still has it) → Allowed
- Remove membership for user A (user B still active) → Allowed

❌ **Invalid:**
- Remove last DeusEx role → should raise exception → If allowed, VIOLATED
- Remove last active DeusEx membership → should raise exception → If allowed, VIOLATED

**Edge Cases:**
- **Scenario:** User has DeusEx role removed but membership stays (or vice versa)
  - **Behavior:** Both triggers check independently — last role removal blocked, last membership removal blocked
  - **Why:** Either path leads to lockout, so both must be guarded

**Testing Priority:** 🔴 CRITICAL (prevents admin lockout)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-006: DeusEx Bootstrap

**Rule:** A migration bootstraps `deusex@fringeisland.com` as the first DeusEx member with an active group membership and the DeusEx role assigned.

**Why:** The DeusEx group needs at least one member to be functional. Using a migration makes this deterministic and auditable. The user must already exist in the system (created via normal signup).

**Verified by:**
- **Test:** `tests/integration/admin/deusex-bootstrap.test.ts`
- **Database:** Migration that inserts membership + role assignment

**Acceptance Criteria:**
- [ ] `deusex@fringeisland.com` has active membership in DeusEx group (`status = 'active'`)
- [ ] `deusex@fringeisland.com` has the "DeusEx" role assigned
- [ ] `has_permission('manage_all_groups')` returns true for this user in any context
- [ ] Migration is idempotent (`ON CONFLICT DO NOTHING`)
- [ ] Migration fails loudly if `deusex@fringeisland.com` user does not exist

**Examples:**

✅ **Valid:**
- Run migration → `deusex@fringeisland.com` is DeusEx member with all permissions
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

**Rule:** An immutable `admin_audit_log` table records admin actions. DeusEx members can SELECT and INSERT. No one can UPDATE or DELETE rows. Non-admin users cannot access the table at all.

**Why:** Admin actions (adding/removing DeusEx members, future content moderation) need an accountability trail. Immutability ensures the log is trustworthy. This table will grow to cover more admin actions in future phases.

**Verified by:**
- **Test:** `tests/integration/admin/admin-audit-log.test.ts`
- **Database:** Table + RLS policies

**Acceptance Criteria:**
- [ ] Table `admin_audit_log` exists with columns: `id`, `actor_group_id`, `action`, `target`, `metadata` (JSONB), `created_at`
- [ ] RLS is enabled on the table
- [ ] DeusEx members can SELECT all rows
- [ ] DeusEx members can INSERT new rows
- [ ] No UPDATE policy exists (immutable)
- [ ] No DELETE policy exists (immutable)
- [ ] Non-admin authenticated users cannot SELECT, INSERT, UPDATE, or DELETE
- [ ] `actor_group_id` references `groups(id)`
- [ ] `created_at` defaults to `NOW()`

**Examples:**

✅ **Valid:**
- DeusEx member inserts audit log entry → succeeds
- DeusEx member reads audit log → sees all entries
- Non-admin tries to read audit log → empty result (RLS blocks)

❌ **Invalid:**
- DeusEx member updates an audit entry → should be blocked → If allowed, VIOLATED
- DeusEx member deletes an audit entry → should be blocked → If allowed, VIOLATED
- Non-admin inserts audit entry → should be blocked → If allowed, VIOLATED

**Testing Priority:** 🟠 HIGH (accountability for admin actions)

**History:**
- 2026-02-17: Created (Sub-Sprint 1)

---

## B-ADMIN-008: User Decommission — Soft Delete (REVISED)

**Rule:** DeusEx admins can decommission users via the "Delete (soft)" action bar button. Sets `is_decommissioned = true` and `is_active = false`. Supports batch operation (multiple selected users). All records preserved. One-way — decommissioned users cannot be reactivated. Requires ConfirmModal. Audit-logged per user.

**Why:** Decommissioning is a "soft permanent removal" — the user's data is preserved for audit and historical purposes, but they are effectively removed from the platform. Unlike deactivation (which is reversible), decommission signals the user should never return.

**Verified by:**
- **Test:** `tests/integration/admin/user-decommission.test.ts`
- **Database:** `is_decommissioned` column on `users` table + updated RLS policies
- **UI:** Action bar "Delete (soft)" button in Users panel

**Acceptance Criteria:**
- [ ] `users` table has `is_decommissioned BOOLEAN NOT NULL DEFAULT false` column
- [ ] Action sets `is_decommissioned = true` AND `is_active = false` for each selected user
- [ ] Supports batch: works on 1 or many selected users
- [ ] ConfirmModal: "Decommission X user(s)? This is permanent and cannot be undone."
- [ ] Decommissioned users hidden by default (visible only with "Show decommissioned" toggle on)
- [ ] Admin can see decommissioned users via toggle
- [ ] Decommissioned user's group memberships, enrollments, messages preserved (not deleted)
- [ ] Decommissioned users cannot be reactivated ("Activate" action disabled for them)
- [ ] Audit log entry per user: action `user_decommissioned`, target = user ID, metadata includes email and name
- [ ] After action: selection cleared, table refreshed, count updated
- [ ] "Delete (soft)" disabled in action bar if all selected users are already decommissioned
- [ ] Non-admin cannot set `is_decommissioned` on any user

**Examples:**

✅ **Valid:**
- Admin selects 3 users, clicks "Delete (soft)" → ConfirmModal → all 3 decommissioned, 3 audit entries
- Decommissioned user not visible with toggle off
- Toggle on → decommissioned user visible with indicator

❌ **Invalid:**
- Decommissioned user's memberships are deleted → VIOLATED (preserve all records)
- Non-admin can decommission a user → VIOLATED (admin-only)
- No ConfirmModal shown → VIOLATED (destructive action)

**Testing Priority:** 🔴 CRITICAL (user lifecycle management)

**History:**
- 2026-02-17: Created (Bulk User Actions)
- 2026-02-18: Revised — action bar integration, batch support, ConfirmModal, audit per user (Sub-Sprint 3)

---

## B-ADMIN-009: User Hard Delete (REVISED)

**Rule:** DeusEx admins can hard-delete users via the "Delete (hard)" action bar button. Calls an RPC that cascading-removes all related records in FK-safe order. Supports batch (executes per user sequentially). Audit log entry created before each deletion. Requires ConfirmModal with strong warning. Non-admins cannot call the RPC.

**Why:** Hard delete is the nuclear option — completely removes the user and all their data. This is irreversible and should only be used when legally required (GDPR right to erasure) or for test data cleanup. The cascade order prevents FK constraint violations.

**Verified by:**
- **Test:** `tests/integration/admin/user-hard-delete.test.ts`
- **Database:** `admin_hard_delete_user()` RPC (SECURITY DEFINER)
- **UI:** Action bar "Delete (hard)" button in Users panel

**Acceptance Criteria:**
- [ ] RPC `admin_hard_delete_user(target_user_id UUID)` exists
- [ ] RPC validates caller has `manage_all_groups` permission
- [ ] RPC deletes all child records in FK-safe order: `notifications` → `direct_messages` → `conversations` → `journey_enrollments` → `user_group_roles` → `group_memberships` → `users` row → `auth.users`
- [ ] RPC creates audit log entry BEFORE deletion (captures email, name)
- [ ] After RPC: user gone from `users` and `auth.users`
- [ ] Supports batch: called per user sequentially (transaction safety)
- [ ] ConfirmModal with strong warning: "Permanently delete X user(s)? ALL data will be destroyed. This cannot be undone."
- [ ] Non-admin calling RPC gets permission error
- [ ] RPC raises error if target user doesn't exist
- [ ] After action: selection cleared, table refreshed, count updated
- [ ] Works for active, inactive, and decommissioned users

**Examples:**

✅ **Valid:**
- Admin selects 2 users, clicks "Delete (hard)" → strong ConfirmModal → all records removed, 2 audit entries
- Admin hard-deletes a decommissioned user → works (all states accepted)

❌ **Invalid:**
- Non-admin calls RPC → should be rejected → If succeeds, VIOLATED
- Hard delete leaves orphaned records → VIOLATED (must cascade properly)
- No ConfirmModal shown → VIOLATED (irreversible action)

**Testing Priority:** 🔴 CRITICAL (irreversible data destruction)

**History:**
- 2026-02-17: Created (Bulk User Actions)
- 2026-02-18: Revised — action bar integration, batch support, strong ConfirmModal (Sub-Sprint 3)

---

## B-ADMIN-010: Admin User Management — Activate/Deactivate (REVISED)

**Rule:** DeusEx admins can activate or deactivate users via two separate action bar buttons. "Deactivate" sets `is_active = false` (reversible, requires ConfirmModal). "Activate" sets `is_active = true` (no ConfirmModal needed). Both support batch. Activate is blocked for decommissioned users. Actions are context-sensitive — disabled when irrelevant. Audit-logged per user.

**Why:** Admins need to deactivate/activate users for moderation purposes. Deactivation is temporary and reversible (unlike decommission). Splitting into two buttons with context-sensitivity prevents mistakes.

**Verified by:**
- **Test:** `tests/integration/admin/admin-user-management.test.ts`
- **Database:** UPDATE policy on `users` table for admins
- **UI:** Action bar "Deactivate" and "Activate" buttons in Users panel

**Acceptance Criteria:**
- [ ] **Deactivate:** Sets `is_active = false` for each selected user
- [ ] **Activate:** Sets `is_active = true` for each selected user
- [ ] Supports batch: works on 1 or many selected users
- [ ] Deactivate requires ConfirmModal: "Deactivate X user(s)?"
- [ ] Activate does NOT require ConfirmModal (reversible, non-destructive)
- [ ] Activate blocked for decommissioned users (`is_decommissioned = true`)
- [ ] Admin UPDATE policy on `users` table allows setting `is_active` and `is_decommissioned`
- [ ] Non-admin cannot update another user's `is_active` or `is_decommissioned`
- [ ] Existing self-update policy unchanged (users can edit own profile)
- [ ] Audit log entry per user: action `user_deactivated` or `user_activated`
- [ ] After action: table refreshed, status indicators updated
- [ ] "Deactivate" disabled if all selected users are already inactive
- [ ] "Activate" disabled if all selected users are already active OR any selected user is decommissioned

**Examples:**

✅ **Valid:**
- 3 active users selected → "Activate" disabled, "Deactivate" enabled
- 2 inactive users selected → "Deactivate" disabled, "Activate" enabled
- Mix of active + inactive → both enabled
- Admin deactivates 5 users → ConfirmModal → 5 users set inactive, 5 audit entries

❌ **Invalid:**
- Normal user deactivates another user → VIOLATED (admin-only)
- Admin activates a decommissioned user → VIOLATED (decommission is permanent)
- Deactivate executes without ConfirmModal → VIOLATED

**Testing Priority:** 🔴 CRITICAL (user management security)

**History:**
- 2026-02-17: Created (Bulk User Actions)
- 2026-02-18: Revised — split into Activate/Deactivate, context-sensitive, batch, audit per user (Sub-Sprint 3)

---

## B-ADMIN-011: Admin Notification Send (REVISED)

**Rule:** DeusEx admins can send notifications to selected user(s) via the "Notify" action bar button. Opens a modal for title + message input. Calls an RPC that inserts one notification per user with type `admin_notification`. Selection is NOT cleared after sending (admin may want to take further actions).

**Why:** Admins need to communicate important information to users (policy changes, maintenance windows, account issues). Using the existing notification infrastructure ensures consistent delivery.

**Verified by:**
- **Test:** `tests/integration/admin/admin-notification-send.test.ts`
- **Database:** `admin_send_notification()` RPC (SECURITY DEFINER)
- **UI:** Action bar "Notify" button in Users panel + notification compose modal

**Acceptance Criteria:**
- [ ] Clicking "Notify" opens a modal with Title and Message text fields
- [ ] On submit: calls RPC `admin_send_notification(target_user_ids UUID[], title TEXT, message TEXT)`
- [ ] RPC validates caller has `manage_all_groups` permission
- [ ] RPC inserts one `notifications` row per target user, type `admin_notification`
- [ ] RPC returns count of notifications sent
- [ ] Non-admin calling RPC gets permission error
- [ ] Empty title or empty message → validation error in modal (submit disabled)
- [ ] After send: success toast ("Notification sent to X users")
- [ ] Selection NOT cleared after notify (user may want to take further actions)
- [ ] Audit log entry: action `admin_notification_sent`, metadata includes title + user count

**Examples:**

✅ **Valid:**
- 3 users selected, type title + message, submit → 3 notification rows created, toast: "Notification sent to 3 users"
- After send, users still selected → admin clicks "Deactivate" next

❌ **Invalid:**
- Non-admin calls RPC → should be rejected → If succeeds, VIOLATED
- Submit with empty title → should show validation error → If sends, VIOLATED
- Selection cleared after notify → VIOLATED (should persist)

**Testing Priority:** 🟠 HIGH (admin communication tool)

**History:**
- 2026-02-17: Created (Bulk User Actions)
- 2026-02-18: Revised — modal UI, selection persistence, audit log, toast feedback (Sub-Sprint 3)

---

## B-ADMIN-012: Admin Group Visibility

**Rule:** DeusEx admins can see ALL groups (public, private, system, personal, engagement) via the groups SELECT policy. Normal users only see public groups and groups they're members of (existing policy). This enables group picker modals for Invite/Join/Remove actions (B-ADMIN-016, B-ADMIN-017, B-ADMIN-018).

**Why:** When managing users across groups, admins need to see all available groups — not just the ones they personally belong to. This enables platform-wide user management.

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

---

## B-ADMIN-013: Users Panel Selection (NEW)

**Rule:** Rows in the Users data panel are selectable via checkboxes. Clicking a row toggles its selection state. Shift+click selects a contiguous range. A header checkbox selects/deselects all visible rows. Selection persists across pages. A visible counter shows the total number of selected users across all pages.

**Why:** Selection is the prerequisite for all user management actions. The action bar (B-ADMIN-014) activates only when 1+ users are selected. Cross-page persistence ensures admins can build up a selection set across paginated results.

**Verified by:**
- **UI:** `components/admin/AdminDataPanel.tsx` (enhanced with selection)
- **Manual:** Selection behavior across pages

**Acceptance Criteria:**
- [ ] Checkbox column on the left of every row
- [ ] Click unselected row → add to selection (checkbox checked)
- [ ] Click selected row → remove from selection (checkbox unchecked)
- [ ] Shift+click → select all rows between last clicked row and current row (inclusive range)
- [ ] Header checkbox → select all visible rows on current page
- [ ] Header checkbox when all visible are selected → deselect all on current page
- [ ] Selection persists when navigating between pages (page change does NOT clear selection)
- [ ] Counter visible when 1+ selected: "X users selected" (total across all pages)
- [ ] Mobile: tap to toggle selection, press+drag for range
- [ ] Search/filter does NOT clear selection (selected users that become hidden remain selected)
- [ ] Decommissioned toggle does NOT clear selection
- [ ] Selected user IDs stored in component state (not just visual checkboxes)

**Examples:**

✅ **Valid:**
- Click user A → "1 user selected", checkbox checked
- Click user B → "2 users selected", both checked
- Click user A again → "1 user selected", A unchecked, B still checked
- Shift+click from row 2 to row 6 → rows 2–6 all selected
- Page 1: select 3, navigate to page 2, select 2 → "5 users selected"
- Search filters list → selection preserved, counter unchanged

❌ **Invalid:**
- Selection clears on page change → VIOLATED (must persist)
- No visible count of selected users → VIOLATED
- Clicking a row navigates away instead of toggling → VIOLATED

**Testing Priority:** 🟠 HIGH (prerequisite for all actions)

**History:**
- 2026-02-18: Created (Sub-Sprint 3)

---

## B-ADMIN-014: Users Panel Action Bar (NEW)

**Rule:** When 1+ users are selected in the Users panel, a fixed action bar appears at the bottom of the panel. Actions are grouped into 3 categories: Communication (Message, Notify), Account (Deactivate, Activate, Delete soft, Delete hard, Logout), and Group (Invite to group, Join to group, Remove from group). Actions are context-sensitive — they disable when irrelevant to the current selection state.

**Why:** The action bar is the single interface for all user management operations. Grouping by category organizes 10 actions clearly. Context-sensitive disabling prevents mistakes and guides admins toward valid operations.

**Verified by:**
- **UI:** `components/admin/UserActionBar.tsx` (new component)
- **Manual:** Action bar visibility and context-sensitivity

**Acceptance Criteria:**
- [ ] Action bar hidden when 0 users selected
- [ ] Action bar appears at bottom of Users panel when 1+ users selected
- [ ] Action bar shows selected count: "X users selected"
- [ ] 3 visually grouped sections: Communication | Account | Group
- [ ] Communication group: Message, Notify
- [ ] Account group: Deactivate, Activate, Delete (soft), Delete (hard), Logout
- [ ] Group group: Invite (to group), Join (to group), Remove (from group)
- [ ] Context-sensitive disabling rules:
  - "Activate" disabled if all selected are already active
  - "Activate" disabled if any selected user is decommissioned
  - "Deactivate" disabled if all selected are already inactive
  - "Delete (soft)" disabled if all selected are already decommissioned
  - "Remove (from group)" disabled if selected users share no common engagement groups
- [ ] All destructive actions require ConfirmModal: Deactivate, Delete (soft), Delete (hard), Remove (from group), Logout
- [ ] Non-destructive actions do NOT require ConfirmModal: Activate
- [ ] Actions that need input open a modal: Message, Notify, Invite, Join, Remove

**Examples:**

✅ **Valid:**
- 0 selected → action bar hidden
- 3 active users selected → action bar visible, "Activate" disabled, rest enabled
- 2 inactive users selected → "Deactivate" disabled, "Activate" enabled
- 1 decommissioned user selected → "Activate" disabled, "Deactivate" disabled, "Delete (soft)" disabled

❌ **Invalid:**
- Action bar visible with 0 selected → VIOLATED
- Destructive action executes without ConfirmModal → VIOLATED
- All actions always enabled regardless of state → VIOLATED (must be context-sensitive)

**Testing Priority:** 🟠 HIGH (core admin interaction pattern)

**History:**
- 2026-02-18: Created (Sub-Sprint 3)

---

## B-ADMIN-015: Admin Message — DM to Selected Users (NEW)

**Rule:** DeusEx admins can send a direct message to selected user(s) via the "Message" action bar button. Opens a modal for message text input. Creates or reuses an individual DM conversation with each selected user. The admin is the sender. Selection is NOT cleared after sending.

**Why:** Admins need to reach out to specific users for account issues, welcome messages, or support. Using the existing DM infrastructure keeps communication in one place. Individual DMs (not group chat) ensure privacy.

**Verified by:**
- **Test:** `tests/integration/admin/admin-message-send.test.ts`
- **UI:** Action bar "Message" button + message compose modal

**Acceptance Criteria:**
- [ ] Clicking "Message" opens a modal with a Message text field
- [ ] On submit: creates or reuses a DM conversation with each selected user
- [ ] One DM conversation per user (NOT a group chat)
- [ ] Message sent as the admin user (uses existing DM send flow)
- [ ] If DM conversation already exists with a user → message added to existing conversation
- [ ] If no conversation exists → new conversation created, then message sent
- [ ] After send: success toast ("Message sent to X users")
- [ ] Selection NOT cleared after message (user may want to take further actions)
- [ ] Empty message → validation error in modal (submit disabled)
- [ ] Non-admin cannot bypass — permission check on the action

**Examples:**

✅ **Valid:**
- 3 users selected, type message, submit → 3 individual DM conversations with message in each, toast: "Message sent to 3 users"
- Message user who admin already has a DM with → message appended to existing conversation

❌ **Invalid:**
- Creates one group chat for 3 users → VIOLATED (must be individual DMs)
- Submit with empty message → should show validation error → If sends, VIOLATED
- Selection cleared after message → VIOLATED (should persist)

**Testing Priority:** 🟡 MEDIUM (uses existing DM infrastructure)

**History:**
- 2026-02-18: Created (Sub-Sprint 3)

---

## B-ADMIN-016: Admin Invite to Group (NEW)

**Rule:** DeusEx admins can send group invitations to selected user(s) via the "Invite" action bar button. Opens a group picker modal showing all engagement groups (excludes personal and system groups, per B-ADMIN-012). Each selected user receives an invitation (`status='invited'`) to the chosen group. Users must accept to become active members. Audit-logged.

**Why:** Admins need to onboard users into groups without being a member themselves. Uses the existing invitation flow — users still choose to accept or decline.

**Verified by:**
- **Test:** `tests/integration/admin/admin-invite-to-group.test.ts`
- **UI:** Action bar "Invite" button + group picker modal

**Acceptance Criteria:**
- [ ] Clicking "Invite" opens a group picker modal
- [ ] Group picker shows all engagement groups (excludes personal and system groups)
- [ ] Admin can search/filter groups in the picker
- [ ] On select group + confirm: inserts `group_memberships` row per user with `status = 'invited'`
- [ ] `added_by_group_id` = admin's personal group ID
- [ ] Users already in the group (any status) are skipped with a note
- [ ] After invite: success toast ("X users invited to [Group Name]")
- [ ] If some skipped: toast includes note ("Y already in group, X invited")
- [ ] Audit log entry: action `admin_invite_to_group`, metadata includes group name + user count
- [ ] Selection NOT cleared after invite
- [ ] Non-admin cannot bypass — permission check on the action

**Examples:**

✅ **Valid:**
- 3 users selected, pick "Leadership Team" → 3 invitations created, toast: "3 users invited to Leadership Team"
- 1 of 3 already a member → 2 invitations created, toast: "2 users invited to Leadership Team (1 already in group)"

❌ **Invalid:**
- Group picker shows personal groups → VIOLATED (engagement only)
- Group picker shows system groups → VIOLATED (engagement only)
- Invitation created for user already in group → VIOLATED (skip with note)

**Testing Priority:** 🟡 MEDIUM

**History:**
- 2026-02-18: Created (Sub-Sprint 3)

---

## B-ADMIN-017: Admin Join Group — Direct Add (NEW)

**Rule:** DeusEx admins can directly add selected user(s) to a group via the "Join" action bar button, bypassing the invitation flow. Opens a group picker modal showing all engagement groups. Users get active membership immediately (`status='active'`). Requires ConfirmModal. Audit-logged.

**Why:** Sometimes admins need to place users in groups immediately (mandatory training, organizational restructuring). Skipping the accept/decline step ensures immediate effect.

**Verified by:**
- **Test:** `tests/integration/admin/admin-join-group.test.ts`
- **UI:** Action bar "Join" button + group picker modal

**Acceptance Criteria:**
- [ ] Clicking "Join" opens a group picker modal
- [ ] Group picker shows all engagement groups (excludes personal and system groups)
- [ ] Admin can search/filter groups in the picker
- [ ] ConfirmModal after group selection: "Directly add X users to [Group Name]? They will not need to accept an invitation."
- [ ] On confirm: inserts `group_memberships` row per user with `status = 'active'`
- [ ] `added_by_group_id` = admin's personal group ID
- [ ] Default "Member" role assigned automatically
- [ ] Users already active in the group are skipped with a note
- [ ] After join: success toast ("X users added to [Group Name]")
- [ ] Audit log entry: action `admin_join_group`, metadata includes group name + user count
- [ ] Selection NOT cleared after join
- [ ] Non-admin cannot bypass — permission check on the action

**Examples:**

✅ **Valid:**
- 5 users selected, pick "Mandatory Safety Training" → 5 active memberships + Member role assigned, toast: "5 users added to Mandatory Safety Training"
- 1 of 5 already active → 4 added, toast: "4 users added (1 already in group)"

❌ **Invalid:**
- Users added without ConfirmModal → VIOLATED (bypasses invitation flow, needs confirmation)
- Group picker shows system groups → VIOLATED (engagement only)
- No default role assigned → VIOLATED (Member role required)

**Testing Priority:** 🟡 MEDIUM

**History:**
- 2026-02-18: Created (Sub-Sprint 3)

---

## B-ADMIN-018: Admin Remove from Group (NEW)

**Rule:** DeusEx admins can remove selected user(s) from a group via the "Remove" action bar button. Opens a group picker that shows only engagement groups that ALL selected users have in common (intersection). Excludes personal and system groups. Removal deletes the membership and associated role assignments. Last-Steward protection still enforced. Requires ConfirmModal. Audit-logged.

**Why:** Admins may need to remove users from groups for moderation, restructuring, or cleanup. Showing only shared groups prevents confusion when multiple users are selected — you can only remove users from groups they all belong to.

**Verified by:**
- **Test:** `tests/integration/admin/admin-remove-from-group.test.ts`
- **UI:** Action bar "Remove" button + group picker modal

**Acceptance Criteria:**
- [ ] Clicking "Remove" opens a group picker modal
- [ ] Group picker shows only engagement groups where ALL selected users are active members (intersection)
- [ ] Excludes personal groups and system groups
- [ ] If no common groups → modal shows "Selected users share no common groups" (no groups to pick)
- [ ] "Remove (from group)" action disabled in action bar if no common engagement groups exist
- [ ] On select group + confirm: deletes `group_memberships` row per user for that group
- [ ] Also removes associated `user_group_roles` entries for that group
- [ ] ConfirmModal: "Remove X users from [Group Name]?"
- [ ] Last-Steward protection enforced — trigger blocks removal of last Steward
- [ ] If some removals blocked (e.g., last Steward): partial success with note
- [ ] After removal: success toast ("X users removed from [Group Name]")
- [ ] Audit log entry: action `admin_remove_from_group`, metadata includes group name + user count
- [ ] Selection NOT cleared after removal

**Examples:**

✅ **Valid:**
- 3 users selected, all in "Team Alpha" → picker shows "Team Alpha", confirm → 3 memberships + roles deleted
- User A in groups 1+2, User B in groups 2+3 → picker shows only group 2 (intersection)
- Remove would leave group with no Steward → trigger blocks, partial success note

❌ **Invalid:**
- Picker shows groups only one user belongs to → VIOLATED (must be intersection of ALL)
- Personal group appears in picker → VIOLATED (engagement only)
- Last Steward removed without trigger catching it → VIOLATED
- No ConfirmModal → VIOLATED (destructive)

**Testing Priority:** 🟠 HIGH (destructive, must respect Steward protection)

**History:**
- 2026-02-18: Created (Sub-Sprint 3)

---

## B-ADMIN-019: Admin Force Logout (NEW)

**Rule:** DeusEx admins can force-logout selected user(s) via the "Logout" action bar button. Terminates all active sessions for each selected user using the Supabase Auth Admin API. Affected users lose access immediately and are redirected to the login page on their next request. Requires ConfirmModal. Audit-logged.

**Why:** Needed for security incidents (compromised accounts), after deactivation, or when revoking access urgently. Ensures the user can't continue using the platform after an admin action.

**Verified by:**
- **Test:** `tests/integration/admin/admin-force-logout.test.ts`
- **Database/API:** Supabase Auth Admin `signOut` (global scope — all sessions)
- **UI:** Action bar "Logout" button in Users panel

**Acceptance Criteria:**
- [ ] Clicking "Logout" triggers session invalidation for each selected user
- [ ] Uses Supabase Auth Admin API to sign out user globally (all sessions)
- [ ] ConfirmModal: "Force logout X user(s)? They will be signed out immediately."
- [ ] Affected users redirected to login page on next navigation or API call
- [ ] Supports batch: works on 1 or many selected users
- [ ] Audit log entry per user: action `admin_force_logout`, target = user IDs
- [ ] After action: success toast ("X users logged out")
- [ ] Selection NOT cleared after logout
- [ ] Non-admin cannot call the underlying function
- [ ] Works regardless of user status (active, inactive, decommissioned)

**Examples:**

✅ **Valid:**
- Admin force-logs out compromised account → user's sessions invalidated, next page load redirects to login
- Admin deactivates 3 users then force-logs them out → both actions succeed

❌ **Invalid:**
- User retains session after force logout → VIOLATED
- Non-admin can force logout others → VIOLATED
- No ConfirmModal → VIOLATED (disruptive action)

**Testing Priority:** 🟠 HIGH (security-critical)

**History:**
- 2026-02-18: Created (Sub-Sprint 3)
