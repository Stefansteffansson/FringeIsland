# Communication Behaviors

> **Purpose:** Document the fundamental rules and guarantees for in-app notifications and group forums.
> **Domain Code:** COMM
> **Phase:** Ferd 1.5-A

---

## B-COMM-001: Notification Delivery

**Rule:** When a group membership event occurs (invitation, acceptance, decline, removal, or leaving), the notification system MUST create an in-app notification for the appropriate recipient(s) within the same database transaction.

**Why:** Members need timely awareness of membership changes. Without guaranteed notification delivery, users miss invitations, Stewards are unaware when members accept or leave, and the platform lacks a reliable communication channel.

**Verified by:**
- **Test:** `tests/integration/communication/notifications.test.ts` (B-COMM-001 cases)
- **Database:** `supabase/migrations/20260214161709_notification_system.sql`
- **Triggers:**
  - `trg_notify_invitation_received` — fires AFTER INSERT on `group_memberships` WHERE status='invited'
  - `trg_notify_invitation_accepted` — fires AFTER UPDATE on `group_memberships` WHERE status transitions 'invited' → 'active'
  - `trg_notify_membership_deleted` — fires AFTER DELETE on `group_memberships` (all status values)
  - `trg_notify_role_assigned` — fires AFTER INSERT on `user_group_roles`
  - `trg_notify_role_removed` — fires AFTER DELETE on `user_group_roles`

**Acceptance Criteria:**
- [x] Inviting a user creates a `group_invitation` notification for the invited user ✅ TESTED
- [x] Invitation notification has correct title ("New Group Invitation"), body, and payload (group_id, group_name, inviter_id, inviter_name, membership_id) ✅ TESTED
- [x] Accepting an invitation creates an `invitation_accepted` notification for all Stewards ✅ TESTED
- [ ] Declining an invitation creates an `invitation_declined` notification for all Stewards
- [x] Notification payload contains accurate group_id, group_name, and actor information ✅ TESTED

**Examples:**

✅ **Valid:**
- Steward invites User B → `group_invitation` notification created for User B with type='group_invitation'
- User B accepts invitation → `invitation_accepted` notification created for every Steward in the group
- User B declines invitation → `invitation_declined` notification created for every Steward in the group

❌ **Invalid:**
- An invitation INSERT with status='active' (bypassing flow) → trigger does NOT fire (WHEN condition requires status='invited')
- Membership changes for status='paused' or status='removed' → DELETE trigger fires but handles only 'invited' and 'active' status values

**Edge Cases:**

- **Scenario:** Group has multiple Stewards
  - **Behavior:** `invitation_accepted` creates one notification per Steward
  - **Why:** Each Steward needs independent awareness of group activity

- **Scenario:** Invited user's record is deleted by admin (service role, no auth.uid())
  - **Behavior:** `invitation_declined` trigger fires; Stewards are notified
  - **Why:** auth.uid() is NULL in service role context; the trigger handles this gracefully

- **Scenario:** Group is deleted while invitation is pending
  - **Behavior:** CASCADE deletes the membership; trigger fires; notification body uses NULL group_name (COALESCE to 'a group')
  - **Why:** group_id FK in notifications is SET NULL, notification remains readable but unlinked

**Related Behaviors:**
- B-COMM-002: Notification Privacy (who can read notifications)
- B-COMM-003: Notification Read Status (marking notifications as read)
- B-GRP-002: Member Invitation Lifecycle

**Testing Priority:** 🔴 CRITICAL (core communication infrastructure)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A) — notification system migration applied

---

## B-COMM-002: Notification Privacy

**Rule:** Users MUST only be able to read, update, or delete their own notifications. No user may access another user's notification records.

**Why:** Notifications can contain sensitive information (e.g., group membership actions, role changes). Cross-user access would expose private group membership data.

**Verified by:**
- **Test:** `tests/integration/communication/notifications.test.ts` (B-COMM-002 cases)
- **Database:** `supabase/migrations/20260214161709_notification_system.sql`
- **RLS Policies:**
  - `"Users can read own notifications"` — SELECT USING recipient_user_id = get_current_user_profile_id()
  - `"Users can update own notifications"` — UPDATE with same USING + WITH CHECK
  - `"Users can delete own notifications"` — DELETE USING same condition
- **No INSERT policy for authenticated role** — notifications can only be created by SECURITY DEFINER trigger functions

**Acceptance Criteria:**
- [x] User A can query their own notifications and get results ✅ TESTED
- [x] User B querying User A's notification IDs returns empty result (RLS silent filter) ✅ TESTED
- [x] Users cannot INSERT notifications directly (no INSERT RLS policy = RLS blocks) ✅ TESTED
- [ ] Users can DELETE their own notifications
- [x] Users cannot UPDATE notifications belonging to others ✅ TESTED

**Examples:**

✅ **Valid:**
- User A signs in → queries `notifications` → sees only their own records
- User A marks their notification as read → succeeds
- User A deletes (dismisses) their notification → succeeds

❌ **Invalid:**
- User B queries `notifications WHERE id = <user_A_notification_id>` → **returns empty** (RLS silently filters)
- Any authenticated user attempts `INSERT INTO notifications` → **BLOCKED** (no INSERT policy for authenticated role)
- User B attempts `UPDATE notifications SET is_read=true WHERE id = <user_A_notification_id>` → **blocked by USING clause** (no rows matched, silent no-op)

**Edge Cases:**

- **Scenario:** User has no notifications
  - **Behavior:** SELECT returns empty array, no error
  - **Why:** RLS filters to own records; zero matching rows is valid

- **Scenario:** User is deleted (CASCADE)
  - **Behavior:** All their notifications are CASCADE deleted
  - **Why:** recipient_user_id has ON DELETE CASCADE on users table

**Related Behaviors:**
- B-COMM-001: Notification Delivery
- B-COMM-003: Notification Read Status

**Testing Priority:** 🔴 CRITICAL (privacy, security)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A)

---

## B-COMM-003: Notification Read Status

**Rule:** Users MUST be able to mark their own notifications as read by setting is_read=true and read_at=NOW(); unread count MUST accurately reflect notifications where is_read=false.

**Why:** The notification bell badge shows unread count. If users cannot reliably mark notifications read, the badge never clears, creating notification fatigue and an unusable UX.

**Verified by:**
- **Test:** `tests/integration/communication/notifications.test.ts` (B-COMM-003 cases)
- **Database:** `supabase/migrations/20260214161709_notification_system.sql`
- **RLS Policy:** `"Users can update own notifications"` — allows UPDATE on own notifications
- **Schema:** `is_read BOOLEAN NOT NULL DEFAULT false`, `read_at TIMESTAMPTZ` (nullable)

**Acceptance Criteria:**
- [x] Newly created notification has is_read=false and read_at=NULL ✅ TESTED
- [x] User can UPDATE their own notification to set is_read=true and read_at=timestamp ✅ TESTED
- [x] After marking as read, querying for is_read=false no longer returns that notification ✅ TESTED
- [x] Unread count (COUNT WHERE is_read=false) decrements correctly after mark-as-read ✅ TESTED

**Examples:**

✅ **Valid:**
- Trigger creates notification with is_read=false, read_at=NULL
- User marks notification read: `UPDATE SET is_read=true, read_at=NOW()` → succeeds
- Querying `WHERE is_read=false` no longer includes the marked notification

❌ **Invalid:**
- User tries to set is_read on another user's notification → **no rows updated** (USING clause filters by recipient_user_id)

**Edge Cases:**

- **Scenario:** User marks already-read notification as read again
  - **Behavior:** UPDATE succeeds (idempotent), read_at is overwritten to current time
  - **Why:** No constraint prevents re-setting is_read=true

- **Scenario:** read_at timestamp format
  - **Behavior:** Supabase returns timezone as `+00:00`, JS/Date uses `Z`. Compare as `new Date(ts).getTime()`
  - **Why:** Known Supabase/JS timezone format difference (see MEMORY.md)

**Related Behaviors:**
- B-COMM-001: Notification Delivery
- B-COMM-002: Notification Privacy

**Testing Priority:** 🟡 HIGH (core UX feature)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A)

---

## B-COMM-004: Forum Post Creation

**Rule:** Active group members with the 'Member', 'Guide', or 'Steward' role MUST be able to create top-level forum posts in their group's forum; non-members MUST NOT.

**Why:** Forums are the primary discussion channel within a group. Only members with active participation roles can post — observers can only read (per D18a permission grid).

**Verified by:**
- **Test:** `tests/integration/communication/forum.test.ts` (B-COMM-004 cases)
- **Database:** `supabase/migrations/20260214161716_add_group_forum_posts.sql`
- **RLS Policy:** `"forum_posts_insert_permission"` — WITH CHECK uses has_forum_permission(group_id, 'post_forum_messages')
- **Function:** `has_forum_permission()` — maps 'post_forum_messages' to Steward, Guide, and Member roles
- **Constraint:** `chk_content_not_empty` — prevents blank posts

**Acceptance Criteria:**
- [x] Active member with Member role can INSERT a top-level forum post ✅ TESTED
- [x] Post is created with correct group_id, author_user_id, content ✅ TESTED
- [x] Non-member cannot INSERT into a group's forum (RLS blocks) ✅ TESTED
- [ ] Empty content (or whitespace-only) is rejected by CHECK constraint

**Examples:**

✅ **Valid:**
- Active member with Member role creates post: `INSERT INTO forum_posts { group_id, author_user_id, content }` → succeeds
- Steward creates a top-level post → succeeds

❌ **Invalid:**
- Non-member inserts post → **BLOCKED** (has_forum_permission returns false; RLS INSERT WITH CHECK fails)
- Member tries to insert a post with content = '   ' → **BLOCKED** (chk_content_not_empty constraint)
- Member inserts post setting author_user_id = some_other_user_id → **BLOCKED** (RLS checks author_user_id = get_current_user_profile_id())

**Edge Cases:**

- **Scenario:** User is invited but not yet active
  - **Behavior:** BLOCKED (has_forum_permission checks status='active' in group_memberships)
  - **Why:** Membership must be accepted before forum participation

- **Scenario:** User has no role assigned yet (active member but no role entry)
  - **Behavior:** BLOCKED for post_forum_messages (function checks role names against array; NULL array && ARRAY returns false)
  - **Why:** Permission requires explicit role assignment

**Related Behaviors:**
- B-COMM-005: Forum Reply Threading
- B-COMM-006: Forum Moderation
- B-COMM-007: Forum Access Control

**Testing Priority:** 🔴 CRITICAL (core forum functionality)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A)

---

## B-COMM-005: Forum Reply Threading

**Rule:** Members can reply only to top-level posts (depth=1); replies to replies (depth=2+) MUST be blocked at the database level.

**Why:** Flat two-level threading keeps discussions readable and manageable. Deep nesting creates complex UI requirements and cognitive load. The design explicitly caps threading at two levels.

**Verified by:**
- **Test:** `tests/integration/communication/forum.test.ts` (B-COMM-005 cases)
- **Database:** `supabase/migrations/20260214161716_add_group_forum_posts.sql`
- **Trigger:** `trg_enforce_flat_threading` — BEFORE INSERT, calls `enforce_flat_threading()`
- **Function:** `enforce_flat_threading()` — checks parent_post_id is a top-level post (no parent itself)
- **Error message:** "Replies to replies are not allowed. You can only reply to top-level posts."

**Acceptance Criteria:**
- [x] Active member can create a reply (parent_post_id = top-level post ID) ✅ TESTED
- [x] Reply is created with correct parent_post_id pointing to a top-level post ✅ TESTED
- [x] Attempting to reply to a reply raises an exception with the expected error message ✅ TESTED
- [ ] Attempting to reply to a post in a different group raises an exception

**Examples:**

✅ **Valid:**
- Top-level post exists with id=P1 (parent_post_id IS NULL)
- Member creates reply: `INSERT { parent_post_id: P1, ... }` → succeeds
- Reply is stored with parent_post_id=P1

❌ **Invalid:**
- Reply R1 exists with parent_post_id=P1
- Member tries: `INSERT { parent_post_id: R1, ... }` → **BLOCKED** (trigger raises exception: "Replies to replies are not allowed")
- Member tries to reply to a post from a different group → **BLOCKED** (trigger raises exception: "Reply must belong to the same group")

**Edge Cases:**

- **Scenario:** Parent post is soft-deleted (is_deleted=true)
  - **Behavior:** Reply can still be created (trigger does not check is_deleted)
  - **Why:** Soft-delete hides content but the post still exists as a structural anchor

- **Scenario:** parent_post_id references a non-existent post
  - **Behavior:** INSERT fails with foreign key violation (before trigger checks)
  - **Why:** parent_post_id has FK REFERENCES forum_posts(id)

**Related Behaviors:**
- B-COMM-004: Forum Post Creation
- B-COMM-006: Forum Moderation (soft-delete of thread parent)

**Testing Priority:** 🔴 CRITICAL (data integrity, threading constraint)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A)

---

## B-COMM-006: Forum Moderation

**Rule:** Stewards MUST be able to soft-delete any post in their group's forum by setting is_deleted=true; non-Stewards MUST NOT be able to soft-delete posts authored by others.

**Why:** Moderation is essential for group health. Only Stewards have the trust and responsibility to remove content. Non-leaders can only edit their own posts. Soft-delete preserves content for audit/appeal.

**Verified by:**
- **Test:** `tests/integration/communication/forum.test.ts` (B-COMM-006 cases)
- **Database:** `supabase/migrations/20260214161716_add_group_forum_posts.sql`
- **RLS Policy:** `"forum_posts_moderate_permission"` — UPDATE USING has_forum_permission(group_id, 'moderate_forum')
- **RLS Policy:** `"forum_posts_update_own"` — UPDATE USING author_user_id = current_user AND is_deleted = false
- **Function:** `has_forum_permission()` — 'moderate_forum' maps only to 'Steward'

**Acceptance Criteria:**
- [x] Steward can UPDATE any post in their group to set is_deleted=true ✅ TESTED
- [x] Post is NOT hard-deleted (record remains in database with is_deleted=true) ✅ TESTED
- [x] Regular member (non-Steward) cannot set is_deleted=true on another member's post ✅ TESTED
- [x] Author can edit their own post content (via `forum_posts_update_own` policy) while post is not deleted ✅ TESTED
- [ ] Author cannot edit their own post content after it is soft-deleted (UPDATE own blocked when is_deleted=true)

**Examples:**

✅ **Valid:**
- Steward issues `UPDATE forum_posts SET is_deleted=true WHERE id=<any_post_in_group>` → succeeds
- Author issues `UPDATE forum_posts SET content='edited content' WHERE id=<own_post>` (not deleted) → succeeds

❌ **Invalid:**
- Regular member issues `UPDATE forum_posts SET is_deleted=true WHERE id=<another_members_post>` → **blocked** (only own non-deleted posts allowed via `forum_posts_update_own`; `forum_posts_moderate_permission` requires Steward)
- Author issues `UPDATE forum_posts SET content='new content' WHERE id=<own_deleted_post>` → **blocked** (UPDATE own policy requires is_deleted=false)

**Edge Cases:**

- **Scenario:** Steward moderates their own post
  - **Behavior:** Allowed (moderate_forum permission applies to ALL posts including own)
  - **Why:** Moderation is a group-level permission, not restricted to others' posts

- **Scenario:** Regular member tries to SET is_deleted=false on a deleted post
  - **Behavior:** BLOCKED (update_own requires is_deleted=false in USING; moderate_forum required for any update of deleted posts)
  - **Why:** Reversing deletion is a moderation action

**Related Behaviors:**
- B-COMM-004: Forum Post Creation
- B-COMM-007: Forum Access Control

**Testing Priority:** 🟡 HIGH (moderation, security boundary)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A)

---

## B-COMM-007: Forum Access Control

**Rule:** Non-members of a private group MUST NOT be able to view or create posts in that group's forum; only active group members with the appropriate permission can access forum content.

**Why:** Group forums contain private discussions intended only for group members. Exposing forum content to non-members would violate group privacy and undermine the trust model.

**Verified by:**
- **Test:** `tests/integration/communication/forum.test.ts` (B-COMM-007 cases)
- **Database:** `supabase/migrations/20260214161716_add_group_forum_posts.sql`
- **RLS Policy:** `"forum_posts_select_permission"` — SELECT USING has_forum_permission(group_id, 'view_forum')
- **RLS Policy:** `"forum_posts_insert_permission"` — INSERT WITH CHECK includes has_forum_permission check
- **Function:** `has_forum_permission()` — first checks active membership; returns FALSE if not active member

**Acceptance Criteria:**
- [x] Non-member querying forum_posts for a private group returns empty result (RLS silent filter) ✅ TESTED
- [x] Non-member attempting INSERT into a group's forum is blocked by RLS ✅ TESTED
- [x] Active member with appropriate role can SELECT and see forum posts ✅ TESTED
- [ ] User with only 'invited' status (not yet accepted) cannot view or post

**Examples:**

✅ **Valid:**
- Active member with Member role queries `SELECT * FROM forum_posts WHERE group_id = <their_group>` → returns posts
- Active member inserts a new post → succeeds

❌ **Invalid:**
- Non-member queries `SELECT * FROM forum_posts WHERE group_id = <group_they_dont_belong_to>` → **returns empty** (RLS silent filter, no error)
- Non-member tries `INSERT INTO forum_posts { group_id: <target_group>, ... }` → **BLOCKED** (RLS WITH CHECK fails)
- User with status='invited' (not active) queries forum → **returns empty** (has_forum_permission checks status='active')

**Edge Cases:**

- **Scenario:** User is removed from the group (membership deleted)
  - **Behavior:** Immediately loses forum access (RLS re-evaluates per query)
  - **Why:** No caching of membership state; each query checks current database state

- **Scenario:** Member's role is removed but they remain an active member
  - **Behavior:** With view_forum (any active member), they can still read. For post_forum_messages, they would be blocked if they have no qualifying role.
  - **Why:** 'view_forum' returns TRUE for any active member regardless of role; other permissions require specific roles

**Related Behaviors:**
- B-COMM-004: Forum Post Creation
- B-COMM-005: Forum Reply Threading
- B-GRP-003: Group Visibility Rules

**Testing Priority:** 🔴 CRITICAL (privacy, security — prevents data leakage)

**History:**
- 2026-02-14: Implemented (Ferd 1.5-A)

---

## Notes

**Implemented Behaviors:**
- ✅ B-COMM-001: Notification Delivery (trigger-based)
- ✅ B-COMM-002: Notification Privacy (RLS)
- ✅ B-COMM-003: Notification Read Status (RLS UPDATE)
- ✅ B-COMM-004: Forum Post Creation (RLS INSERT + has_forum_permission)
- ✅ B-COMM-005: Forum Reply Threading (trigger + RLS)
- ✅ B-COMM-006: Forum Moderation (dual UPDATE RLS policies)
- ✅ B-COMM-007: Forum Access Control (RLS SELECT + INSERT)

**Test Coverage:**
- 7 / 7 behaviors have tests (100%)
- `communication/notifications.test.ts` — 10 tests, 10/10 PASSING ✅
  - B-COMM-001: 2 tests (invitation delivery, acceptance delivery)
  - B-COMM-002: 4 tests (own read, cross-user RLS, no INSERT, no cross-UPDATE)
  - B-COMM-003: 4 tests (initial state, mark as read, unread query, unread count)
- `communication/forum.test.ts` — 10 tests, 10/10 PASSING ✅
  - B-COMM-004: 2 tests (member post, Steward post)
  - B-COMM-005: 2 tests (valid reply, reply-to-reply blocked)
  - B-COMM-006: 3 tests (leader soft-delete, non-Steward blocked, author edit own)
  - B-COMM-007: 3 tests (non-member no view, non-member no post, member can view)
- **Total: 20 new tests, all passing**
- **Last updated:** 2026-02-14

**Known Bug Discovered (not in our tests):**
- `B-COMM-001` / `B-GRP-005` interaction: When a group is deleted via CASCADE, the
  `notify_invitation_declined_or_member_change()` trigger fires on the cascaded
  `group_memberships DELETE`, but attempts to INSERT into `notifications` with
  `group_id = OLD.group_id`. Since the parent group is already deleted, the
  `notifications_group_id_fkey` FK constraint rejects the insert, causing the entire
  group DELETE to fail.
  - **Affected test:** `deletion.test.ts` — "should cascade delete memberships when group is deleted (admin)" (pre-existing test, was passing before notification system deployed)
  - **Root cause:** Missing "IF group still exists" guard in `notify_invitation_declined_or_member_change()`, similar to the guard already present in `notify_role_removed()`
  - **Fix required:** Database Agent should add `IF v_group_name IS NOT NULL THEN` guards around all INSERT blocks in `notify_invitation_declined_or_member_change()`, mirroring the pattern in `notify_role_removed()`
  - **Also affects:** `cleanupTestGroup()` in multiple other test files (console.error logged but tests still pass because cleanupTestGroup logs the error without failing)
