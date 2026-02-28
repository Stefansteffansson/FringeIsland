# Group Management Behaviors

> **Purpose:** Document the fundamental rules and guarantees for group creation, membership, and role management.
> **Domain Code:** GRP

---

## B-GRP-001: Last Leader Protection ✅

**Rule:** A group MUST always have at least one member with the Group Leader role.

**Why:** Groups become orphaned without leaders. No one can manage membership, assign roles, edit settings, or delete the group. This creates unmaintainable groups and poor user experience.

**Verified by:**
- **Test:** `tests/integration/groups/last-leader.test.ts` ✅ **4/4 PASSING**
- **Code:** `app/groups/[id]/page.tsx` (UI prevents removal when count === 1)
- **Database:** `supabase/migrations/20260125_6_prevent_last_leader_removal.sql` ✅ **APPLIED**
- **Trigger:** `prevent_last_leader_removal()` function (enforces at database level)

**Acceptance Criteria:**
- [x] Cannot remove last leader via UI (× button disabled/hidden)
- [x] Cannot remove last leader via API (trigger blocks transaction) ✅ **TESTED**
- [x] Cannot delete last leader via direct SQL (trigger blocks) ✅ **TESTED**
- [x] Error message is clear to user ("Cannot remove the last Group Leader...")
- [x] Can remove leader role if other leaders exist ✅ **TESTED**
- [x] Can promote another member, then remove original leader
- [x] Concurrent deletion attempts all blocked ✅ **TESTED**

**Examples:**

✅ **Valid:**
- Group has 2 leaders → Remove 1 leader role → Success (1 leader remains)
- Group has 1 leader → Promote another member to leader → Remove original → Success
- Group has 3 leaders → Remove 2 leader roles → Success (1 leader remains)

❌ **Invalid:**
- Group has 1 leader → Attempt to remove leader role → **BLOCKED** (trigger error) ✅
- Group has 1 leader → Multiple simultaneous removal attempts → **ALL BLOCKED** ✅

**Edge Cases:**

- **Scenario:** User deletes their own account (the only leader)
  - **Behavior:** Trigger blocks CASCADE delete - role remains orphaned ✅ **TESTED**
  - **Why:** Prevents groups from becoming completely leaderless; admin must assign new leader before cleanup
  - **Note:** Changed from original design (was going to allow CASCADE) - this is better for data integrity

- **Scenario:** All members attempt to leave simultaneously
  - **Behavior:** Last leader's leave request is blocked
  - **Why:** Transaction isolation prevents race conditions; last leader sees error

- **Scenario:** Group created without any leader
  - **Behavior:** IMPOSSIBLE - group creation assigns creator as leader
  - **Why:** Foreign key constraint + creation logic guarantees leader on insert

- **Scenario:** Last leader tries to demote themselves
  - **Behavior:** Blocked (same as removing role)
  - **Why:** Trigger counts Group Leader roles, prevents when count would become 0

**Related Behaviors:**
- B-GRP-002: Member Invitation Lifecycle (invitations don't affect leader count)
- B-GRP-005: Group Deletion Rules (requires leader permission)
- B-ROL-001: Role Assignment Permissions (only leaders can assign roles)

**History:**
- 2026-01-26: Implemented (v0.2.6.2) - Database trigger + UI safeguard
- 2026-02-07: Documented (restructure to behavior-first approach)
- 2026-02-08: Migration applied to production, all tests passing ✅

---

## B-GRP-002: Member Invitation Lifecycle ✅

**Rule:** Members can only have status='active' if they accepted an invitation or were directly added by a leader.

**Why:** Prevents unauthorized access to private groups. Ensures explicit opt-in for group membership.

**Verified by:**
- **Test:** `tests/integration/groups/invitations.test.ts` ✅ **9 tests**
- **Code:** `components/groups/InviteMemberModal.tsx` (creates invitations)
- **Code:** `app/invitations/page.tsx` (accept/decline flow)
- **Database:** RLS policies on `group_memberships` table
- **Database:** CHECK constraint `status IN ('invited', 'active', 'paused', 'removed')`

**Acceptance Criteria:**
- [x] New invitations start with status='invited'
- [x] Users can only see their own invitations
- [x] Accept changes status to 'active'
- [x] Decline deletes membership record
- [x] Leaders can invite multiple members
- [x] Cannot directly insert status='active' (RLS blocks)

**Examples:**

✅ **Valid:**
- Leader invites user → `INSERT` with status='invited' → Success
- User views `/invitations` page → Sees pending invitation → Success
- User clicks "Accept" → `UPDATE` to status='active' → Success
- User clicks "Decline" → `DELETE` membership record → Success

❌ **Invalid:**
- User directly `INSERT` with status='active' → **BLOCKED** (RLS policy)
- Non-member views invitation → **BLOCKED** (RLS filters by user_id)
- User updates someone else's invitation → **BLOCKED** (RLS filters by user_id)

**Edge Cases:**

- **Scenario:** User already member, invited again
  - **Behavior:** Insert fails (unique constraint on user_id + group_id)
  - **Why:** Prevents duplicate memberships

- **Scenario:** Group deleted while invitation pending
  - **Behavior:** Membership records CASCADE deleted
  - **Why:** No orphaned invitations

- **Scenario:** User declines, then leader re-invites
  - **Behavior:** New invitation created (previous deleted)
  - **Why:** Decline removes record entirely; fresh start

- **Scenario:** Invitation sent to non-existent email
  - **Behavior:** Look up fails, error message shown
  - **Why:** Can only invite existing users (current implementation)

**Related Behaviors:**
- B-GRP-001: Last Leader Protection
- B-GRP-003: Group Visibility Rules
- B-USR-001: User Account Lifecycle

**History:**
- 2026-01-26: Implemented (v0.2.5) - Email-based invitations
- 2026-01-27: Enhanced (v0.2.7) - Connected UI to invitation flow
- 2026-02-07: Documented

---

## B-GRP-003: Group Visibility Rules ✅

**Rule:** Users can only view groups they are active members of, OR public groups.

**Why:** Privacy for private groups. Public groups discoverable for joining.

**Verified by:**
- **Test:** `tests/integration/rls/groups.test.ts` ✅ **7/7 PASSING** 🎉
- **Database:** RLS policy on `groups` table (SELECT)
- **Function:** `is_active_group_member()` security definer function

**Acceptance Criteria:**
- [ ] Users can view groups where they have status='active' membership
- [ ] Users can view groups where is_public=true
- [ ] Users CANNOT view private groups they're not members of
- [ ] Users CANNOT view groups where they have status='invited' (not active yet)
- [ ] Unauthenticated users can only see public groups

**Examples:**

✅ **Valid:**
- User is active member of private group → Can view group
- User queries public groups list → Sees all public groups
- User searches for group by name → Only sees groups they can access

❌ **Invalid:**
- User queries all groups → Only sees authorized subset (not all)
- User tries to view private group they're not in → Returns null/404
- Invited (not active) user tries to view group → Returns null/404

**Edge Cases:**

- **Scenario:** Group changes from public to private
  - **Behavior:** Non-members immediately lose access
  - **Why:** RLS policy re-evaluates on each query

- **Scenario:** User removed from group (status='removed')
  - **Behavior:** Immediately loses access
  - **Why:** RLS filters by status='active'

- **Scenario:** User's membership deleted
  - **Behavior:** Immediately loses access (if private)
  - **Why:** No membership record = RLS blocks

**Related Behaviors:**
- B-GRP-002: Member Invitation Lifecycle
- B-GRP-004: Member List Visibility

**Testing Priority:** 🔴 CRITICAL (security - prevents data leakage)

**History:**
- 2026-01-25: Implemented (v0.2.3) - Initial RLS policies
- 2026-02-07: Documented

---

## B-GRP-004: Group Editing Permissions ✅

**Rule:** Only Group Leaders can edit group settings (name, description, visibility, etc.).

**Why:** Prevents unauthorized modification of group configuration. Maintains leadership control.

**Verified by:**
- **Test:** `tests/integration/groups/edit-permissions.test.ts` ✅ **5 tests**
- **Code:** `app/groups/[id]/edit/page.tsx` (authorization check)
- **Database:** RLS policy on `groups` table (UPDATE)

**Acceptance Criteria:**
- [x] Group Leaders can access `/groups/[id]/edit` page
- [x] Non-leaders get permission denied error
- [x] Group Leaders can update: name, description, label, is_public, show_member_list
- [x] Non-leaders cannot UPDATE even via API
- [ ] Changes are logged (future: audit trail)

**Examples:**

✅ **Valid:**
- Group Leader navigates to edit page → Success
- Group Leader updates group name → Success
- Group Leader toggles visibility → Success

❌ **Invalid:**
- Regular member navigates to edit page → **BLOCKED** (redirected or error)
- Regular member attempts `UPDATE` via API → **BLOCKED** (RLS policy)
- Non-member attempts to edit public group → **BLOCKED** (not leader)

**Edge Cases:**

- **Scenario:** User was leader, then demoted
  - **Behavior:** Immediately loses edit permission
  - **Why:** Permission check happens on each request

- **Scenario:** Multiple leaders editing simultaneously
  - **Behavior:** Last write wins (no conflict resolution)
  - **Why:** No locking mechanism (acceptable for MVP)

**Related Behaviors:**
- B-GRP-001: Last Leader Protection
- B-ROL-001: Role Assignment Permissions

**Testing Priority:** 🟡 HIGH (business logic, security)

**History:**
- 2026-01-26: Implemented (v0.2.7) - Edit group page
- 2026-02-07: Documented

---

## B-GRP-005: Group Deletion Rules 🔄

**Rule:** Only Group Leaders can delete groups, and deletion cascades to all related records.

**Why:** Prevents accidental data loss, ensures only authorized users can delete.

**Verified by:**
- **Test:** `tests/integration/groups/deletion.test.ts` ✅ **5 tests** (cascade + RLS blocking)
- **Code:** `[deletion UI not yet implemented — see Status below]`
- **Database:** CASCADE foreign keys on related tables

**Acceptance Criteria:**
- [ ] Only Group Leaders can delete groups (UI + RLS)
- [ ] Deletion cascades to: memberships, roles, enrollments, forums
- [ ] Confirmation modal warns about data loss
- [ ] Cannot delete group with active journey enrollments (future safeguard?)
- [ ] Deletion is logged (audit trail)

**Examples:**

✅ **Valid:**
- Group Leader clicks "Delete Group" → Confirmation modal → Confirms → Success
- Deletion removes: memberships, user_group_roles, group_roles, enrollments

❌ **Invalid:**
- Regular member attempts delete → **BLOCKED** (no delete button)
- Non-member attempts delete via API → **BLOCKED** (RLS policy)

**Edge Cases:**

- **Scenario:** Group has active journey enrollments
  - **Behavior:** Currently allowed (CASCADE delete)
  - **Future:** May want to prevent or warn

- **Scenario:** Group has 100+ members
  - **Behavior:** Confirmation should warn about impact
  - **Why:** Major action affecting many users

**Related Behaviors:**
- B-GRP-001: Last Leader Protection (doesn't apply to deletion)
- B-ENRL-003: Enrollment Cascade Rules

**Testing Priority:** 🟡 HIGH (data integrity)

**Status:** ✅ IMPLEMENTED (v0.2.12)

**History:**
- 2026-02-07: Documented (planned feature)
- 2026-02-11: Cascade + RLS blocking tests added
- 2026-02-11: DELETE RLS policy added, trigger cascade fix applied, Danger Zone UI added (v0.2.12)

---

## B-GRP-006: User Search Typeahead 🔄

**Rule:** The invite modal MUST provide typeahead search that queries users by name or email, debounced at 300ms, returning max 8 results, excluding current group members and self.

**Why:** Stewards rarely remember exact email addresses. Typeahead reduces friction and errors in the invitation flow.

**Verified by:**
- **Test:** `tests/integration/groups/user-search.test.ts` (~4 tests)
- **Code:** `components/groups/InviteMemberModal.tsx` (typeahead UI)
- **Database:** `users` table SELECT via `.or('full_name.ilike.%q%,email.ilike.%q%')`

**Acceptance Criteria:**
- [ ] Typing 2+ characters triggers search after 300ms debounce
- [ ] Results show avatar, full name, and email
- [ ] Max 8 results returned
- [ ] Current group members excluded from results
- [ ] Current user (self) excluded from results
- [ ] Selecting a result fills the email field
- [ ] Empty/short queries show no dropdown

**Examples:**

- Steward types "jan" → dropdown shows "Jane Smith (jane@example.com)", "Janet Lee (janet@co.com)"
- Steward types "j" → no dropdown (fewer than 2 characters)
- Steward types "existingmember@..." → no results (already a member)

**Related Behaviors:**
- B-GRP-002: Member Invitation Lifecycle
- B-INV-001: Pending Email Invitations

**History:**
- 2026-02-23: Documented

---

## B-GRP-007: Group Status Visibility 🔄

**Rule:** Every group has a `status` column constrained to `active`, `closed`, `archived`, or `suspended`. Non-admin users can ONLY see groups with `status = 'active'`. Platform admins (DeusEx members) can see groups of any status.

**Why:** The leave-group feature (Sprint 2) requires groups to be closeable and archivable. Once a group is closed, it should disappear from non-admin views — members can no longer interact with it, and it doesn't clutter group lists. Admins need visibility into all groups for platform management.

**Verified by:**
- **Test:** `tests/integration/groups/group-status.test.ts`
- **Database:** `groups.status` CHECK constraint
- **Database:** Partial index `idx_groups_status_active` on `groups (id) WHERE status = 'active'`
- **Database:** Updated RLS SELECT policy on `groups` table

**Acceptance Criteria:**
- [ ] `groups.status` column exists with type TEXT, NOT NULL, DEFAULT 'active'
- [ ] CHECK constraint enforces: `status IN ('active', 'closed', 'archived', 'suspended')`
- [ ] All existing groups have `status = 'active'` after migration
- [ ] Non-admin user querying groups sees ONLY `status = 'active'` groups
- [ ] Non-admin user cannot see closed/archived/suspended groups even if they are a member
- [ ] Platform admin (`is_platform_admin()` returns true) sees groups of ALL statuses
- [ ] New groups created via UI default to `status = 'active'`
- [ ] Partial index exists for performance on the common `status = 'active'` query path

**Examples:**

✅ **Valid:**
- Regular user queries `/groups` → Sees only active groups they're a member of (or public active groups)
- Admin queries groups via admin panel → Sees all groups including closed/archived/suspended
- New group created → `status = 'active'` automatically
- Group status set to 'closed' by migration/RPC → Group disappears from non-admin views

❌ **Invalid:**
- Non-admin user queries all groups → Returns closed group in results → **BUG** (RLS should filter)
- Group created with status = 'invalid_value' → **BLOCKED** (CHECK constraint)
- Group created with status = NULL → **BLOCKED** (NOT NULL constraint)

**Edge Cases:**

- **Scenario:** User is an active member of a group that transitions to 'closed'
  - **Behavior:** Group immediately disappears from the user's group list
  - **Why:** Status = 'closed' means the group is no longer active; membership is irrelevant for visibility

- **Scenario:** Group is 'suspended' — user tries to view it via direct URL `/groups/[id]`
  - **Behavior:** Returns 404 / null (RLS filters it out before the app layer)
  - **Why:** Suspended groups are invisible to non-admins; no special "suspended" UI for regular users

- **Scenario:** Admin views a closed group's detail page
  - **Behavior:** Full group details visible, including members and history
  - **Why:** Admins need to manage closed groups (e.g., reopen, audit, delete)

- **Scenario:** Public group with status = 'archived'
  - **Behavior:** NOT visible to non-admin users, even though `is_public = true`
  - **Why:** Status filter takes precedence over public visibility

**Related Behaviors:**
- B-GRP-003: Group Visibility Rules (this behavior EXTENDS B-GRP-003 with status filtering)
- B-GRP-005: Group Deletion Rules (deletion is permanent; status = 'closed'/'archived' is soft)

**Testing Priority:** 🔴 CRITICAL (security — prevents data leakage of non-active groups)

**History:**
- 2026-02-28: Documented (Sprint 1 Foundation Schema)

---

## Notes

**Implemented Behaviors:**
- ✅ B-GRP-001: Last Leader Protection (4 tests ✅)
- ✅ B-GRP-002: Member Invitation Lifecycle (9 tests ✅)
- ✅ B-GRP-003: Group Visibility Rules (7 tests ✅)
- ✅ B-GRP-004: Group Editing Permissions (5 tests ✅)
- ✅ B-GRP-005: Group Deletion Rules (6 tests ✅)
- 🔄 B-GRP-006: User Search Typeahead (4 tests planned)
- 🔄 B-GRP-007: Group Status Visibility (Sprint 1 — tests planned)

**Test Coverage:**
- 5 / 7 behaviors have tests (71%)
- `last-leader.test.ts` — 4 tests (B-GRP-001)
- `invitations.test.ts` — 9 tests (B-GRP-002)
- `rls/groups.test.ts` — 7 tests (B-GRP-003)
- `edit-permissions.test.ts` — 5 tests (B-GRP-004)
- `deletion.test.ts` — 6 tests (B-GRP-005)
- `user-search.test.ts` — 4 tests planned (B-GRP-006)
- `group-status.test.ts` — tests planned (B-GRP-007)
- Total GRP tests: **31 across 5 files** ✅ + planned
- *(Role assignment for group roles is tested in `role-assignment.test.ts` — see roles.md)*
- **Last updated:** 2026-02-28

**Next Behaviors to Document:**
- B-GRP-008: Member Removal Rules (Sprint 2 — leave-group)
- B-GRP-009: Group Template Initialization
- B-GRP-010: Group Label Uniqueness (if enforced)

**Related Behavior Specs:**
- `roles.md` — B-ROL-001: Role Assignment Permissions ✅
- `invitations.md` — B-INV-001: Pending Email Invitations 🔄
- `journeys.md` — B-JRN-008: Platform Journey Ownership 🔄 (Sprint 1)
