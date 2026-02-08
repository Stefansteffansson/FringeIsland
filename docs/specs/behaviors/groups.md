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

## B-GRP-002: Member Invitation Lifecycle

**Rule:** Members can only have status='active' if they accepted an invitation or were directly added by a leader.

**Why:** Prevents unauthorized access to private groups. Ensures explicit opt-in for group membership.

**Verified by:**
- **Test:** `tests/integration/groups/invitations.test.ts` (TODO)
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

## B-GRP-003: Group Visibility Rules

**Rule:** Users can only view groups they are active members of, OR public groups.

**Why:** Privacy for private groups. Public groups discoverable for joining.

**Verified by:**
- **Test:** `tests/integration/rls/groups.test.ts` (TODO - HIGH PRIORITY)
- **Database:** RLS policy on `groups` table (SELECT)

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

## B-GRP-004: Group Editing Permissions

**Rule:** Only Group Leaders can edit group settings (name, description, visibility, etc.).

**Why:** Prevents unauthorized modification of group configuration. Maintains leadership control.

**Verified by:**
- **Test:** `tests/integration/groups/edit-permissions.test.ts` (TODO)
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

## B-GRP-005: Group Deletion Rules

**Rule:** Only Group Leaders can delete groups, and deletion cascades to all related records.

**Why:** Prevents accidental data loss, ensures only authorized users can delete.

**Verified by:**
- **Test:** `tests/integration/groups/deletion.test.ts` (TODO)
- **Code:** `[deletion UI not yet implemented]`
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

**Status:** 🔴 NOT YET IMPLEMENTED

**History:**
- 2026-02-07: Documented (planned feature)

---

## Notes

**Implemented Behaviors:**
- ✅ B-GRP-001: Last Leader Protection (4/4 tests passing ✅)
- ✅ B-GRP-002: Member Invitation Lifecycle
- ✅ B-GRP-003: Group Visibility Rules
- ✅ B-GRP-004: Group Editing Permissions
- 🔴 B-GRP-005: Group Deletion Rules (planned)

**Test Coverage:**
- 1 / 5 behaviors have tests (20%)
- **Next Priority:** Write tests for B-GRP-003 (RLS visibility - CRITICAL for security)

**Next Behaviors to Document:**
- B-GRP-006: Member Removal Rules
- B-GRP-007: Group Template Initialization
- B-GRP-008: Group Label Uniqueness (if enforced)
