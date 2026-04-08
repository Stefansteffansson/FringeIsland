# Group Management Behaviors

> **Purpose:** Document the fundamental rules and guarantees for group creation, membership, and role management.
> **Domain Code:** GRP

---

## B-GRP-001: Last Steward Protection ✅

**Rule:** A group MUST always have at least one member with the Steward role.

**Why:** Groups become orphaned without Stewards. No one can manage membership, assign roles, edit settings, or delete the group. This creates unmaintainable groups and poor user experience.

**Verified by:**
- **Test:** `tests/integration/groups/last-leader.test.ts` ✅ **4/4 PASSING**
- **Code:** `app/groups/[id]/page.tsx` (UI prevents removal when count === 1)
- **Database:** `supabase/migrations/20260125_6_prevent_last_leader_removal.sql` ✅ **APPLIED**
- **Trigger:** `prevent_last_leader_removal()` function (enforces at database level)

**Acceptance Criteria:**
- [x] Cannot remove last Steward via UI (× button disabled/hidden)
- [x] Cannot remove last Steward via API (trigger blocks transaction) ✅ **TESTED**
- [x] Cannot delete last Steward via direct SQL (trigger blocks) ✅ **TESTED**
- [x] Error message is clear to user ("Cannot remove the last Steward...")
- [x] Can remove Steward role if other leaders exist ✅ **TESTED**
- [x] Can promote another member, then remove original leader
- [x] Concurrent deletion attempts all blocked ✅ **TESTED**

**Examples:**

✅ **Valid:**
- Group has 2 Stewards → Remove 1 Steward role → Success (1 Steward remains)
- Group has 1 Steward → Promote another member to Steward → Remove original → Success
- Group has 3 Stewards → Remove 2 Steward roles → Success (1 Steward remains)

❌ **Invalid:**
- Group has 1 Steward → Attempt to remove Steward role → **BLOCKED** (trigger error) ✅
- Group has 1 Steward → Multiple simultaneous removal attempts → **ALL BLOCKED** ✅

**Edge Cases:**

- **Scenario:** User deletes their own account (the only leader)
  - **Behavior:** Trigger blocks CASCADE delete - role remains orphaned ✅ **TESTED**
  - **Why:** Prevents groups from becoming completely leaderless; admin must assign new leader before cleanup
  - **Note:** Changed from original design (was going to allow CASCADE) - this is better for data integrity

- **Scenario:** All members attempt to leave simultaneously
  - **Behavior:** Last leader's leave request is blocked
  - **Why:** Transaction isolation prevents race conditions; last Steward sees error

- **Scenario:** Group created without any leader
  - **Behavior:** IMPOSSIBLE - group creation assigns creator as Steward
  - **Why:** Foreign key constraint + creation logic guarantees leader on insert

- **Scenario:** Last Steward tries to demote themselves
  - **Behavior:** Blocked (same as removing role)
  - **Why:** Trigger counts Steward roles; prevents removal when count would become 0

**Related Behaviors:**
- B-GRP-002: Member Invitation Lifecycle (invitations don't affect Steward count)
- B-GRP-005: Group Deletion Rules (requires Steward permission)
- B-ROL-001: Role Assignment Permissions (only Stewards can assign roles)

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
- [x] Stewards can invite multiple members
- [x] Cannot directly insert status='active' (RLS blocks)

**Examples:**

✅ **Valid:**
- Steward invites user → `INSERT` with status='invited' → Success
- User views `/invitations` page → Sees pending invitation → Success
- User clicks "Accept" → `UPDATE` to status='active' → Success
- User clicks "Decline" → `DELETE` membership record → Success

❌ **Invalid:**
- User directly `INSERT` with status='active' → **BLOCKED** (RLS policy)
- Non-member views invitation → **BLOCKED** (RLS filters by member_group_id)
- User updates someone else's invitation → **BLOCKED** (RLS filters by member_group_id)

**Edge Cases:**

- **Scenario:** User already member, invited again
  - **Behavior:** Insert fails (unique constraint on member_group_id + group_id)
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
- B-GRP-001: Last Steward Protection
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
- [x] Users can view groups where they have status='active' membership ✅ TESTED
- [x] Users can view groups where is_public=true ✅ TESTED
- [x] Users CANNOT view private groups they're not members of ✅ TESTED
- [x] Users CANNOT view groups where they have status='invited' (not active yet) ✅ TESTED
- [x] Unauthenticated users can only see public groups ✅ TESTED

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

**Rule:** Only Stewards can edit group settings (name, description, visibility, etc.).

**Why:** Prevents unauthorized modification of group configuration. Maintains leadership control.

**Verified by:**
- **Test:** `tests/integration/groups/edit-permissions.test.ts` ✅ **5 tests**
- **Code:** `app/groups/[id]/edit/page.tsx` (authorization check)
- **Database:** RLS policy on `groups` table (UPDATE)

**Acceptance Criteria:**
- [x] Stewards can access `/groups/[id]/edit` page
- [x] Non-Stewards get permission denied error
- [x] Stewards can update: name, description, label, is_public, show_member_list
- [x] Non-Stewards cannot UPDATE even via API
- [ ] Changes are logged (deferred — audit trail, Wave TBD — pending redistribution (see WAVE_REDISTRIBUTION.md))

**Examples:**

✅ **Valid:**
- Steward navigates to edit page → Success
- Steward updates group name → Success
- Steward toggles visibility → Success

❌ **Invalid:**
- Regular member navigates to edit page → **BLOCKED** (redirected or error)
- Regular member attempts `UPDATE` via API → **BLOCKED** (RLS policy)
- Non-member attempts to edit public group → **BLOCKED** (not leader)

**Edge Cases:**

- **Scenario:** User was Steward, then demoted
  - **Behavior:** Immediately loses edit permission
  - **Why:** Permission check happens on each request

- **Scenario:** Multiple Stewards editing simultaneously
  - **Behavior:** Last write wins (no conflict resolution)
  - **Why:** No locking mechanism (acceptable for MVP)

**Related Behaviors:**
- B-GRP-001: Last Steward Protection
- B-ROL-001: Role Assignment Permissions

**Testing Priority:** 🟡 HIGH (business logic, security)

**History:**
- 2026-01-26: Implemented (v0.2.7) - Edit group page
- 2026-02-07: Documented

---

## B-GRP-005: Group Deletion Rules 🔄

**Rule:** Only Stewards can delete groups, and deletion cascades to all related records.

**Why:** Prevents accidental data loss, ensures only authorized users can delete.

**Verified by:**
- **Test:** `tests/integration/groups/deletion.test.ts` ✅ **5 tests** (cascade + RLS blocking)
- **Code:** `[deletion UI not yet implemented — see Status below]`
- **Database:** CASCADE foreign keys on related tables

**Acceptance Criteria:**
- [x] Only Stewards can delete groups (UI + RLS) ✅ TESTED
- [x] Deletion cascades to: memberships, roles, enrollments, forums ✅ TESTED
- [ ] Confirmation modal warns about data loss (deferred — Danger Zone UI exists but no confirmation modal yet)
- [ ] Cannot delete group with active journey enrollments (deferred — future safeguard)
- [ ] Deletion is logged (deferred — audit trail, Wave TBD — pending redistribution (see WAVE_REDISTRIBUTION.md))

**Examples:**

✅ **Valid:**
- Steward clicks "Delete Group" → Confirmation modal → Confirms → Success
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
- B-GRP-001: Last Steward Protection (doesn't apply to deletion)
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

## B-GRP-008: Regular Member Leave Group 🔄

**Rule:** An active member of an engagement group can leave the group. Leaving deletes the membership, cascades role removal, freezes non-public journey enrollments, and triggers "Former Member" display in forums.

**Why:** Members must be able to disengage from groups they no longer wish to participate in. Their contributions (forum posts) are preserved but anonymised. Non-public journey progress is preserved in read-only mode to respect the group's intellectual property while retaining the member's work.

**Verified by:**
- **Test:** `tests/integration/groups/leave-group.test.ts` (Sprint 2)
- **RPC:** `leave_group(p_group_id UUID)` SECURITY DEFINER function
- **Database:** CASCADE on `member_group_id` for roles

**Acceptance Criteria:**
- [ ] Active member can call `leave_group(group_id)` and their membership is deleted
- [ ] Roles are cascade-deleted when membership is removed
- [ ] Non-public journey enrollments are set to `status='frozen'` with `progress_data.frozen_reason='left_group'`
- [ ] Public/platform journey enrollments are NOT affected
- [ ] Steward(s) receive standard notification ("X has left the group")
- [ ] Cannot leave a personal group or system group (only engagement groups)
- [ ] Cannot leave a group you're not an active member of
- [ ] Forum posts by the leaving member remain but display "Former Member" (query-time)
- [ ] If member rejoins, "Former Member" reverts to their display name automatically
- [ ] If member rejoins, frozen enrollments are restored to `status='active'`

**Examples:**

✅ **Valid:**
- Regular member leaves group → Membership deleted, roles removed, non-public enrollments frozen
- Member with multiple roles leaves → All roles cascade-deleted
- Member enrolled in platform journey leaves → Platform journey enrollment unchanged
- Member with no non-public enrollments leaves → Clean exit, no enrollment changes

❌ **Invalid:**
- Member tries to leave personal group → **BLOCKED** (only engagement groups)
- Non-member tries to leave group → **BLOCKED** (not an active member)
- Sole Steward tries regular leave → **BLOCKED** (must use handover flow — B-GRP-009)

**Edge Cases:**

- **Scenario:** Member is enrolled in both public and non-public journeys via the group
  - **Behavior:** Only non-public enrollments frozen; public enrollments unaffected
  - **Why:** Public journeys are accessible to all — group membership is irrelevant

- **Scenario:** Member has individual enrollment in a non-public journey (enrolled personally, not via group)
  - **Behavior:** Individual enrollment frozen if the journey is owned by the group being left
  - **Why:** Access to non-public content is tied to group membership, regardless of enrollment type

- **Scenario:** Member is last member but has non-Steward roles only
  - **Behavior:** Triggers L3 group closure flow (B-GRP-010), NOT regular leave
  - **Why:** Last member leaving closes the group

**Testing Priority:** 🔴 CRITICAL (core lifecycle feature)

**History:**
- 2026-02-28: Documented (Sprint 2 — Leave Group Core)

---

## B-GRP-009: Sole Steward DeusEx Handover 🔄

**Rule:** When the sole Steward of an engagement group wants to leave and other members exist, stewardship MUST be transferred to DeusEx before exit. Pending invitations are reassigned to DeusEx. All group members are notified.

**Why:** Groups must always have a Steward to function. When the sole Steward leaves, DeusEx (the platform system group) assumes temporary stewardship until a permanent replacement is assigned. This prevents groups from becoming orphaned.

**Verified by:**
- **Test:** `tests/integration/groups/leave-group.test.ts` (Sprint 2)
- **RPC:** `leave_group(p_group_id UUID)` — detects sole Steward scenario
- **Database:** `prevent_last_leader_removal` trigger bypassed via RPC logic

**Acceptance Criteria:**
- [ ] Sole Steward calling `leave_group()` triggers DeusEx handover automatically
- [ ] DeusEx is added as member of the group with Steward role
- [ ] Leaving Steward's membership is then deleted (roles cascade)
- [ ] Pending invitations (`group_memberships` with `status='invited'`) have `added_by_group_id` updated to DeusEx
- [ ] Pending email invitations have `invited_by_group_id` updated to DeusEx
- [ ] All group members receive notification: "FringeIsland has temporarily assumed stewardship"
- [ ] DeusEx receives notification: "[Group] requires a permanent Steward"
- [ ] Non-public journey enrollments frozen (same as L1)
- [ ] Steward with co-Stewards uses regular leave (B-GRP-008), NOT this flow

**Examples:**

✅ **Valid:**
- Sole Steward of 5-member group leaves → DeusEx gets Steward role → Steward exits → 4 members + DeusEx remain
- Sole Steward leaves group with pending invitations → Invitations now show "invited by FringeIsland"

❌ **Invalid:**
- Sole Steward tries to leave without handover → **BLOCKED** (RPC enforces handover)
- Non-Steward triggers handover flow → **BLOCKED** (only sole Steward scenario)

**Edge Cases:**

- **Scenario:** DeusEx is already a member of the group (rare)
  - **Behavior:** DeusEx gets Steward role added (not duplicate membership)
  - **Why:** Idempotent — DeusEx may have been added by admin previously

- **Scenario:** Group has 2 Stewards, one leaves
  - **Behavior:** Regular leave (B-GRP-008) — no DeusEx handover needed
  - **Why:** Other Steward(s) can manage the group

- **Scenario:** Sole Steward is also the last member
  - **Behavior:** Triggers group closure (B-GRP-010) instead
  - **Why:** No remaining members to manage — group should close

**Testing Priority:** 🔴 CRITICAL (prevents orphaned groups)

**History:**
- 2026-02-28: Documented (Sprint 2 — Leave Group Core)

---

## B-GRP-010: Group Closure on Last Member Leave 🔄

**Rule:** When the last active member of an engagement group leaves, the group status is set to `'closed'`, all group journey enrollments are frozen, and non-public journeys created by the group are transferred to DeusEx.

**Why:** Empty groups serve no purpose and should be hidden from non-admin views. Content (journeys, forum posts) is preserved for potential admin review or reactivation. Non-public journeys need a custodian (DeusEx) to prevent orphaned content.

**Verified by:**
- **Test:** `tests/integration/groups/leave-group.test.ts` (Sprint 2)
- **RPC:** `leave_group(p_group_id UUID)` — detects last member scenario
- **Database:** `groups.status` column (Sprint 1 — B-GRP-007)

**Acceptance Criteria:**
- [ ] Last member calling `leave_group()` sets `groups.status = 'closed'`
- [ ] ALL journey enrollments where `group_id` = closed group are set to `status='frozen'` with `frozen_reason='group_closed'`
- [ ] Non-public journeys (`is_public = false`) with `created_by_group_id` = closed group are transferred to DeusEx (`created_by_group_id` → DeusEx)
- [ ] Public journeys created by the group are NOT transferred (they remain accessible)
- [ ] DeusEx notified if non-public journeys were transferred: "[Group] has been closed. X Non-Public Journey(s) require review."
- [ ] No DeusEx notification if no non-public journeys exist
- [ ] Closed group is invisible to non-admin users (B-GRP-007 already enforces this)
- [ ] Membership is deleted after closure actions complete
- [ ] Platform admins can still see the closed group

**Examples:**

✅ **Valid:**
- Last member (regular) leaves → Group closed, enrollments frozen, non-public journeys to DeusEx
- Last member (Steward) leaves → Group closed (no handover needed — no remaining members)
- Group has no non-public journeys → Group closed, no DeusEx journey notification
- Group has only public journeys → Journeys NOT transferred, group closed

❌ **Invalid:**
- Group with 2 members, one leaves → Group stays active (not last member)
- System group (DeusEx) closure → **BLOCKED** (only engagement groups)

**Edge Cases:**

- **Scenario:** Last member is sole Steward — is this L2 or L3?
  - **Behavior:** L3 (group closure) — no DeusEx handover because there are no remaining members to manage
  - **Why:** Handover is pointless for an empty group. DeusEx only needs to manage orphaned content, not the group itself.

- **Scenario:** Group has members with `status='invited'` but no `status='active'`
  - **Behavior:** Last ACTIVE member leaving triggers closure. Pending invitations are deleted (CASCADE on group closure is fine since group is being closed).
  - **Why:** Invited members haven't joined yet — they shouldn't prevent closure.

- **Scenario:** Group has journey enrollments from both individual and group enrollment paths
  - **Behavior:** All enrollments are frozen regardless of enrollment path
  - **Why:** The group is closed — all associated enrollments should be frozen

**Testing Priority:** 🔴 CRITICAL (group lifecycle, data integrity)

**History:**
- 2026-02-28: Documented (Sprint 2 — Leave Group Core)

---

## B-GRP-011: Stewardship Nomination (Track 1) 🔄

**Rule:** When the sole Steward of an engagement group wants to leave and other members exist, the Steward MAY nominate successors from the active members. The system sends sequential smart notifications to nominees in ranked order. If a nominee accepts, they become Steward and the original Steward exits. If all nominees decline or time out, the system falls back to DeusEx handover (B-GRP-009).

**Why:** Track 2 (immediate DeusEx handover) is a safety net, not the ideal path. Groups function better with a human Steward chosen by the departing leader. Track 1 gives the Steward control over succession while providing automatic fallback if no nominee accepts.

**Verified by:**
- **Test:** `tests/integration/groups/stewardship-nomination.test.ts`
- **RPC:** `nominate_steward(p_group_id UUID, p_nominee_ids UUID[])` SECURITY DEFINER
- **RPC:** `handle_notification_action(p_notification_id UUID, p_action TEXT)` SECURITY DEFINER
- **Feature:** [Smart Notifications](../features/AR-smart-notifications.md)

**Acceptance Criteria:**
- [ ] Sole Steward can call `nominate_steward(group_id, [nominee1_id, nominee2_id, ...])` with 1+ nominees
- [ ] Nominees must be active members of the group (not the caller)
- [ ] First nominee receives `stewardship_nomination` smart notification with `action_type = 'accept_decline'`
- [ ] Notification includes `expires_at` = NOW() + 7 days
- [ ] Nominee can accept via `handle_notification_action(notification_id, 'accepted')`
- [ ] On accept: nominee gets Steward role, original Steward executes regular leave (B-GRP-008 flow)
- [ ] Nominee can decline via `handle_notification_action(notification_id, 'declined')`
- [ ] On decline: next nominee in rank order receives nomination notification
- [ ] If notification expires (7 days), it is treated as decline — next nominee notified
- [ ] If ALL nominees decline/expire: automatic DeusEx fallback (B-GRP-009 flow)
- [ ] Original Steward remains in group until a nominee accepts or DeusEx fallback completes
- [ ] Only the sole Steward of the group can initiate nomination (not co-Stewards, not regular members)
- [ ] Cannot nominate while another nomination is already in progress for the same group
- [ ] Nomination state tracked in `action_data` JSONB on the notification

**Examples:**

✅ **Valid:**
- Sole Steward nominates [Alice, Bob] → Alice gets notification → Alice accepts → Alice is Steward, original Steward leaves
- Sole Steward nominates [Alice, Bob] → Alice declines → Bob gets notification → Bob accepts → Bob is Steward
- Sole Steward nominates [Alice] → Alice doesn't respond for 7 days → auto-decline → DeusEx fallback

❌ **Invalid:**
- Regular member tries to nominate → **BLOCKED** ("Only the sole Steward can nominate")
- Sole Steward nominates non-member → **BLOCKED** ("Nominee must be an active member")
- Sole Steward nominates themselves → **BLOCKED** ("Cannot nominate yourself")
- Nomination while another is in progress → **BLOCKED** ("Nomination already in progress")

**Edge Cases:**

- **Scenario:** Nominee leaves the group before responding
  - **Behavior:** Notification expires naturally (they can't action it after leaving). Lazy check on next view moves to next nominee.
  - **Why:** Membership check is implicit — if they left, their notification is orphaned but the expiry mechanism handles it.

- **Scenario:** Group has only 1 other member — they decline
  - **Behavior:** DeusEx fallback immediately (no more nominees)
  - **Why:** Same as all-nominees-exhausted flow

- **Scenario:** Steward tries to leave while nomination is in progress
  - **Behavior:** `leave_group()` detects pending nomination → raises error ("Nomination in progress, please wait or cancel")
  - **Why:** The Steward must stay until succession is resolved

**Testing Priority:** 🔴 CRITICAL (core lifecycle feature, builds on smart notifications)

**History:**
- 2026-02-28: Documented (Sprint 3)

---

## Notes

**Implemented Behaviors:**
- ✅ B-GRP-001: Last Steward Protection (4 tests ✅)
- ✅ B-GRP-002: Member Invitation Lifecycle (9 tests ✅)
- ✅ B-GRP-003: Group Visibility Rules (7 tests ✅)
- ✅ B-GRP-004: Group Editing Permissions (5 tests ✅)
- ✅ B-GRP-005: Group Deletion Rules (6 tests ✅)
- 🔄 B-GRP-006: User Search Typeahead (4 tests planned)
- 🔄 B-GRP-007: Group Status Visibility (9 tests ✅ — Sprint 1)
- 🔄 B-GRP-008: Regular Member Leave Group (17 tests ✅ — Sprint 2)
- 🔄 B-GRP-009: Sole Steward DeusEx Handover (17 tests ✅ — Sprint 2)
- 🔄 B-GRP-010: Group Closure on Last Member Leave (17 tests ✅ — Sprint 2)
- 🔄 B-GRP-011: Stewardship Nomination Track 1 (Sprint 3 — tests planned)

**Test Coverage:**
- 8 / 11 behaviors have tests (73%)
- `last-leader.test.ts` — 4 tests (B-GRP-001)
- `invitations.test.ts` — 9 tests (B-GRP-002)
- `rls/groups.test.ts` — 7 tests (B-GRP-003)
- `edit-permissions.test.ts` — 5 tests (B-GRP-004)
- `deletion.test.ts` — 6 tests (B-GRP-005)
- `user-search.test.ts` — 4 tests planned (B-GRP-006)
- `group-status.test.ts` — 9 tests (B-GRP-007)
- `leave-group.test.ts` — 17 tests (B-GRP-008 + B-GRP-009 + B-GRP-010)
- `stewardship-nomination.test.ts` — tests planned (B-GRP-011)
- Total GRP tests: **57 across 8 files** ✅ + planned
- *(Role assignment for group roles is tested in `role-assignment.test.ts` — see roles.md)*
- **Last updated:** 2026-02-28

**Next Behaviors to Document:**
- B-GRP-012: Group Template Initialization
- B-GRP-013: Group Label Uniqueness (if enforced)

**Related Behavior Specs:**
- `roles.md` — B-ROL-001: Role Assignment Permissions ✅
- `invitations.md` — B-INV-001: Pending Email Invitations 🔄
- `journeys.md` — B-JRN-008: Platform Journey Ownership ✅ (Sprint 1)
- `notifications.md` — B-NOTIF-001 to B-NOTIF-003 (Sprint 3)
