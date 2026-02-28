# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Sprint 4 — Platform Exit (v0.2.36)** — Admin-assisted cascade exit from all engagement groups + decommission.
  - **`admin_exit_user_from_platform(p_target_user_id)` RPC** — SECURITY DEFINER function iterates all active engagement group memberships for target user. Applies per-group logic: L1 (regular leave) for regular members, L2 (sole Steward → DeusEx handover) for sole Stewards, L3 (group closure) for last member. L4 nomination explicitly skipped (admin exit always uses L2). After all groups processed: user decommissioned (`is_decommissioned=true`, `is_active=false`), auth sessions deleted, audit log entry created.
  - **Safety guards:** Self-exit blocked, already-decommissioned users rejected, DeusEx members (platform admins) rejected, non-admin callers rejected.
  - **Admin UI:** "Exit Platform" button added to UserActionBar in the Account category. ConfirmModal with danger variant explains the cascade. `executeExitPlatform` handler processes per-user with error collection, broadcasts force-logout to connected clients.
  - **Migration:** `20260228144747_sprint4_platform_exit.sql`
  - **Behaviors:** B-EXIT-001 (Group Cascade), B-EXIT-002 (Decommission After Exit), B-EXIT-003 (Safety Guards), B-EXIT-004 (Audit Trail)
  - **Tests:** 10 new integration tests (4 safety guards + 1 no-groups + 3 single-group scenarios + 1 multi-group + 1 audit log)
  - **Full admin suite:** 106/106 tests passing, zero regressions
  - **ALL 5 LIFECYCLE SPRINTS COMPLETE** (S0→S1→S2→S3→S4)

- **Sprint 3 — Smart Notifications + Steward Nomination (v0.2.35)** — Actionable notification infrastructure and Track 1 stewardship nomination flow.
  - **F3: Smart notification schema** — 5 new columns on `notifications`: `action_type` (TEXT), `action_data` (JSONB), `action_taken` (TEXT), `action_taken_at` (TIMESTAMPTZ), `expires_at` (TIMESTAMPTZ). Consistency constraint: `action_taken` requires `action_type` to be set. Index on pending actions for efficient queries.
  - **F3-UI: Actionable notification UI** — `NotificationContext` updated with `handleAction()` method that calls `handle_notification_action` RPC. `NotificationBell` renders Accept/Decline buttons for smart notifications, shows loading spinners during action, displays "Accepted"/"Declined" badges for actioned notifications, and "Expired" badge for timed-out notifications. Auto-marks as read on action.
  - **F3-Handler: `handle_notification_action` RPC** — SECURITY DEFINER function validates ownership (recipient must match caller's personal group), actionability (must have `action_type`, no prior action), expiry check, and action validity per type. Dispatches type-specific side effects for `stewardship_nomination` type.
  - **L4: Stewardship nomination (Track 1)** — `nominate_steward(p_group_id, p_nominee_ids)` RPC allows sole Steward to nominate ranked successors. Sends smart notification to first nominee with 7-day expiry. On accept: nominee gets Steward role, original Steward removed from group (L1 flow). On decline: next nominee notified. If all decline: DeusEx fallback (L2 flow). Prevents self-nomination, non-member nomination, duplicate in-progress nominations.
  - **Internal helper:** `_handle_stewardship_nomination_action()` — handles accept (grant Steward, remove original member, freeze enrollments, notify group) and decline (advance to next nominee or DeusEx fallback).
  - **Migration:** `20260228125730_sprint3_smart_notifications.sql`
  - **Behaviors:** B-NOTIF-001 (Smart Notification Schema), B-NOTIF-002 (Actionable Notification UI), B-NOTIF-003 (Notification Action Handler), B-GRP-011 (Stewardship Nomination Track 1)
  - **Tests:** 19 new integration tests (11 smart-notifications + 8 stewardship-nomination)

- **Sprint 2 — Leave Group Core (v0.2.34)** — Three leave-group scenarios implemented as a single `leave_group(p_group_id)` SECURITY DEFINER RPC.
  - **L1: Regular member leave** — Membership deleted, roles cascade-removed, non-public journey enrollments frozen (`status='frozen'`, `frozen_reason='left_group'` in progress_data), Steward(s) notified via existing `member_left` trigger. Public/platform journey enrollments unaffected. Forum posts show "Former Member" at query time (no data mutation).
  - **L2: Sole Steward → DeusEx handover** — DeusEx added as group member with Steward role (idempotent), pending invitations (`added_by_group_id`, `invited_by_group_id`) transferred to DeusEx, then L1 flow executes. Custom notifications: all members get `stewardship_transferred`, DeusEx gets `stewardship_required`.
  - **L3: Group closure (last member leaves)** — `groups.status` set to `'closed'`, all non-public journey enrollments frozen (`frozen_reason='group_closed'`), non-public journeys `created_by_group_id` transferred to DeusEx, DeusEx notified (`group_closed`) if orphaned journeys exist. Public journeys NOT transferred.
  - **Updated trigger:** `prevent_last_leader_removal()` now bypasses when `groups.status = 'closed'` (allows role cleanup on group closure).
  - **Validation:** Rejects non-engagement groups (personal/system), non-active groups, non-members.
  - **Migration:** `20260228120745_sprint2_leave_group_core.sql`
  - **Behaviors:** B-GRP-008 (Regular Member Leave), B-GRP-009 (Sole Steward DeusEx Handover), B-GRP-010 (Group Closure)
  - **Tests:** 17 new integration tests (7 L1 + 4 L2 + 6 L3)
  - **Full suite:** 630/630 tests passing, zero regressions

- **Sprint 1 — Foundation Schema (v0.2.33)** — Two infrastructure changes that enable leave-group lifecycle features (Sprint 2).
  - **F1: `groups.status` column** — New TEXT column with CHECK constraint (`active`, `closed`, `archived`, `suspended`). Default: `active`. Partial index `idx_groups_status_active` for common query path. Updated `groups_select` RLS policy: non-admin users only see `status = 'active'` groups, personal groups always visible, platform admins see all.
  - **F2: "FringeIsland Journeys" engagement group** — Created platform-owned engagement group. DeusEx added as member with Steward role. Re-seeded all 8 predefined journeys with `created_by_group_id` pointing to FI Journeys group (journeys were lost during D15 rebuild). `created_by_group_id` set to DeusEx to prevent globalTeardown orphan sweep.
  - **Migration:** `20260228111514_sprint1_foundation_schema.sql`
  - **Behaviors:** B-GRP-007 (Group Status Visibility), B-JRN-008 (Platform Journey Ownership)
  - **Tests:** 19 new integration tests (9 group-status + 10 platform-ownership)
  - **Full suite:** 504/504 tests passing, zero regressions

### Fixed
- **Sprint 0 — Security Fixes (v0.2.32)** — Fixed 4 security gaps identified in lifecycle roadmap analysis. Defense-in-depth: both RLS and UI enforcement for all fixes.
  - **S1: Non-public journey visibility (RLS)** — `journeys_select_published` now enforces `is_public`. Non-public journeys visible only to owning group members, enrolled users, or platform admins. New SECURITY DEFINER helper: `is_enrolled_in_journey()`.
  - **S2: Non-public journey enrollment gating (RLS)** — INSERT policies on `journey_enrollments` now validate `is_journey_enrollable()`. Non-members cannot enroll in non-public journeys via direct API. New SECURITY DEFINER helper: `is_journey_enrollable()`.
  - **S3: Frozen enrollment UI enforcement** — JourneyPlayer now detects `status = 'frozen'`, shows amber banner, blocks step completion, blocks navigation to unvisited steps, skips all progress writes. My Journeys shows "Review Steps" label and grey progress bar for frozen enrollments.
  - **S4: Frozen enrollment RLS enforcement** — `enrollment_update_own` and `enrollment_update_group` policies now include `AND status != 'frozen'` in USING clause. Only service_role (admin) can modify frozen enrollments.
  - **Migration:** `20260228102720_sprint0_security_fixes.sql`
  - **Behaviors:** B-SEC-001, B-SEC-002, B-SEC-003, B-SEC-004 (all verified)
  - **Tests:** 19 new security integration tests (10 journey-access + 9 frozen-enrollment)
  - **Full suite:** 485/485 tests passing, zero regressions

- **Personal group RLS visibility** — Other users' personal groups were invisible under the `groups_select` RLS policy, causing display names to show as "Unknown" across 6 surfaces (forum posts, DM list, conversation headers, group member list, invite modal). Added `group_type = 'personal'` condition to `groups_select` policy. Personal groups are identity containers (name + avatar) and are safe to expose to all authenticated users. Zero application code changes needed.
  - **Migration:** `20260227110556_fix_personal_group_rls_visibility.sql`
  - **Surfaces fixed:** ForumSection/ForumPost, messages page, conversation page, group detail member list, InviteMemberModal

### Added
- **Display Name / Nickname System** — Users can set a nickname and toggle between displaying their real name or nickname platform-wide. Personal group `name` is the single source of truth for display identity across all social surfaces (forums, messages, navigation, member lists). Real name visibility is opt-in (off by default). Admins always see real names.
  - **New columns on `users`:** `nickname` (TEXT NOT NULL), `display_preference` ('real_name' | 'nickname'), `show_real_name` (BOOLEAN, default false)
  - **New trigger:** `sync_personal_group_display_name()` — AFTER UPDATE on `users` keeps personal group name in sync with display preference
  - **Updated `handle_new_user()` trigger** — Sets nickname to first name, creates personal group with nickname (not full name)
  - **AuthContext expanded** — `UserProfile` now includes `nickname`, `display_preference`, `show_real_name`, `display_name` (resolved via personal group JOIN)
  - **All social surfaces migrated** — Navigation, Messages, Conversations, InviteMemberModal now resolve display names from personal group `name`
  - **InviteMemberModal search** now matches `nickname` + `full_name` + `email`; shows `full_name` only if `show_real_name = true`
  - **Profile edit page** — New fields: nickname, display preference radio buttons, show real name toggle, live preview
  - **28 new integration tests** — `display-name.test.ts` (16 tests) + `display-name-rls.test.ts` (12 tests) covering B-DISP-001 through B-DISP-011
  - **11 behavior specs** in `docs/specs/behaviors/display-name.md`
  - **Migration:** `20260227095615_add_display_name_system.sql`

### Added
- **Enhanced Member Invitations: User Search Typeahead** — InviteMemberModal now includes debounced typeahead search (300ms) that queries users by name or email, shows avatar + name + email in dropdown, and excludes current group members and self. Max 8 results.
- **Enhanced Member Invitations: Pending Email Invitations** — Stewards can now invite non-users by email. Creates `pending_email_invitations` record with 30-day expiration and UUID token. When the person signs up, `handle_new_user()` trigger auto-claims the invitation and creates a `group_memberships` row with `status='invited'`. Simulated email service (`lib/email/send.ts`) logs to console — swap one file for Resend/SendGrid later.
- **New table: `pending_email_invitations`** — Stores pending invitations for non-users with RLS policies using `has_permission('invite_members')`.
- **New API route: `/api/invitations/send-email`** — POST endpoint for sending simulated invitation emails, with JWT auth and permission validation.
- **14 new integration tests** — `pending-invitations.test.ts` (10 tests: RLS, storage, trigger auto-claim, expiration, case-insensitive matching) + `user-search.test.ts` (4 tests: name/email search, limit, no results).
- **2 new behavior specs** — B-GRP-006 (User Search Typeahead) in `groups.md`, B-INV-001 (Pending Email Invitations) in new `invitations.md`.

### Changed
- **InviteMemberModal refactored** — Two-flow modal: existing user (typeahead select → standard invite) vs non-user (email → pending invitation + simulated email). New `existingMemberGroupIds` prop for client-side member filtering.
- **`handle_new_user()` trigger updated** — Added Step 8: claims all non-expired pending email invitations matching the new user's email, creating `group_memberships` rows with `status='invited'`.

### Technical Details
- **Migration:** `20260223140126_enhanced_member_invitations.sql`
- **New files:** `lib/email/send.ts`, `app/api/invitations/send-email/route.ts`, `docs/specs/behaviors/invitations.md`, `docs/features/active/enhanced-member-invitations.md`
- **Modified:** `components/groups/InviteMemberModal.tsx`, `app/groups/[id]/page.tsx`

---

### Added
- **D15 Hardening: `personal_group_id` immutability trigger** — New `enforce_personal_group_id_immutability` trigger on `public.users` prevents UPDATE from changing or NULLing `personal_group_id` after it's set. Security invariant: personal group is the user's identity in the universal group pattern.
- **D15 Hardening: 10 new integration tests** — `personal_group_id` non-null after signup (1), immutability trigger protection (3), groups-join-groups with engagement group actors (4), Myself role zero permissions (2). Total RBAC tests: 162 → 171.
- **D15 Hardening: 5 behavior specs** — B-D15-001 through B-D15-005 documenting immutability, groups-join-groups, engagement group actors, Myself role permissions, and admin auth resolution chain.

### Changed
- **D15 Universal Group Pattern — Schema Rebuild** — Consolidated 71 incremental migrations into 5 clean migrations. Core change: `group_memberships.user_id` → `member_group_id` (group-to-group only). Every user represented by a personal group. Column renames across 10+ tables (`added_by_user_id` → `added_by_group_id`, `created_by_user_id` → `created_by_group_id`, etc.). Old migrations archived to `supabase/migrations/archive/`.
- **D15 Frontend Migration (28 steps)** — All 26 production files migrated to new column names and Universal Group Pattern. 36 files total including tests and types. "Group Leader" → "Steward" terminology throughout.
- **D15 Residual Fixes** — Fixed broken enrollment query in `AdminDataPanel.tsx` (dead `users!journey_enrollments_user_id_fkey` → `groups!journey_enrollments_group_id_fkey`). Fixed last-Steward UI protection in group detail page (`'Group Leader'` → `'Steward'`). Fixed stale UI text and comments.

### Fixed
- **Stale comments in test files** — Updated 7 comment locations across 4 test files to reflect D15 column renames (`user_id` → `member_group_id`, `added_by_user_id` → `added_by_group_id`, `author_user_id` → `author_group_id`) and terminology ("Group Leader" → "Steward", "Travel Guide" → "Guide"). Renamed `travelGuideRole` → `guideRole` variable in deletion tests.
- **Performance Tier 2A: Parallelized group detail page queries** — Refactored `fetchGroupData` in `app/groups/[id]/page.tsx`: eliminated 3 redundant queries (membership check, member count, current user roles — all derived from existing query results), parallelized remaining 4 queries into 2 `Promise.all` steps. Also parallelized `refetchMembers` (member profiles + roles fetched in parallel). Expected improvement: ~1.2s → ~300-400ms.
- **Performance Tier 2B: Fixed N+1 on My Groups page** — Created `get_group_member_counts` RPC function (SECURITY DEFINER, batch UUID array input). Refactored `app/groups/page.tsx`: replaced N individual count queries with single RPC call, parallelized group data + counts into one `Promise.all`. For 10 groups: 12 HTTP requests → 3 (2 parallel steps).
- **Performance Tier 3A: Debounced commonGroupCount** — Admin panel's common group count computation now uses 300ms debounce with proper cleanup, preventing rapid-fire queries during quick user selections.
- **Performance Tier 3B: Deduplicated admin stats** — Filter changes now only re-fetch users count (the only filter-dependent stat). Static stats (groups, journeys, enrollments) are cached after first load. Full refresh triggered only after admin actions.

### Planned
- Phase 1.6: Polish and Launch

---

## [0.2.28] - 2026-02-20

### Fixed
- **Realtime notification/messaging errors** — Added `notifications` table to `supabase_realtime` publication (was missing, causing CHANNEL_ERROR). Fixed unstable supabase client references in NotificationContext, MessagingContext, and ConversationPage using `useMemo`.
- **MessagingContext self-message recount** — Added sender_id check to skip recounting unread messages for the sender's own messages.
- **ConversationPage missing error callback** — Added error status handler to Realtime subscription.

### Added
- **Admin user filter toggles** — Three-toggle pill UI (Active, Inactive, Decommissioned) replacing single "Show decommissioned" checkbox. Default: Active + Inactive ON, Decommissioned OFF. Server-side PostgREST `.or()` filters with `and()` sub-conditions for accurate filtering.
- **Admin Select All / Select Page / Deselect All** — "Select All" fetches all matching user IDs via paginated API endpoint (`idsOnly=true`), batching in groups of 1000 to overcome Supabase row limit.
- **Auto force-logout on deactivate/decommission** — Both admin actions now call `admin_force_logout` RPC to invalidate existing JWT sessions immediately, closing the session continuity gap.

### Technical Details
- **Migration:** `20260220161033_add_notifications_to_realtime_publication.sql`
- **New exports:** `UserFilters`, `DEFAULT_USER_FILTERS`, `buildStatusFilterString()` in `lib/admin/user-filter.ts`
- **New API params:** `showActive`, `showInactive`, `idsOnly` on `/api/admin/users`
- **New function:** `queryAdminUserIds()` with batch pagination (1000/batch)
- **Unit tests:** 19 passing for user filter logic

---

## [0.2.27] - 2026-02-20

### Fixed
- **CRITICAL: Auth deadlock in Supabase SSR client** — Restructured AuthContext to resolve user profile in a separate `useEffect` instead of inside `onAuthStateChange`. The `@supabase/ssr` `createBrowserClient` holds an internal lock during auth state callbacks; making DB queries inside the callback caused the query to hang indefinitely, leaving `userProfile` null and all pages stuck on loading spinners.
- **Navigation null safety** — Added optional chaining for `full_name` access (`full_name?.charAt(0)`) and safe `alt` attribute on avatar Image component.
- **Admin API 401 on cookie-based auth** — AdminDataPanel now passes JWT via `Authorization: Bearer` header instead of relying on `@supabase/ssr` chunked cookie parsing, which the API route couldn't decode.

### Changed
- **Dropped admin SELECT RLS policies (Tier 2C)** — Removed `has_permission()` from SELECT policies on `users`, `group_memberships`, `user_group_roles`, and `groups` tables. Admin queries already use `service_role` API route (Tier 1B), so these policies were unnecessary and added latency to ALL authenticated queries. This is a hotfix that also completes Performance Tier 2C.
- **Simplified groups SELECT policy** — Reduced from 5 OR branches to 4 (removed `has_permission()` branch).

### Technical Details
- **Migration:** `20260220120833_hotfix_drop_admin_select_policies.sql`
- **Modified Files:** `AuthContext.tsx`, `Navigation.tsx`, `AdminDataPanel.tsx`
- **Root Cause:** `@supabase/ssr` `createBrowserClient` deadlocks when DB queries are made inside `onAuthStateChange` callbacks

---

## [0.2.26] - 2026-02-20

### Added
- **Performance Tier 1: Quick Wins** — system-wide responsiveness improvements
  - **Tier 1A: Database indexes** — 3 composite indexes for `has_permission()` and RLS optimization (`groups.group_type`, `group_memberships(group_id, user_id, status)`, `user_group_roles(user_id, group_id)`)
  - **Tier 1B: Admin service_role API route** — `/api/admin/users` bypasses RLS entirely using service_role key; JWT validation + admin authorization at route level; 11 TDD integration tests
  - **Tier 1C: Shared UserProfile context** — AuthContext resolves `auth_user_id → users.id` once after login; 20+ files refactored to use shared `userProfile` context; eliminates 4-6 duplicate HTTP requests per page load

### Changed
- **AuthContext** (`lib/auth/AuthContext.tsx`) — added `userProfile` state, `resolveProfile` callback, `refreshProfile` function
- **AdminDataPanel** — users panel now fetches via `/api/admin/users` API route instead of client-side Supabase query
- **20+ page/component files** — migrated from per-component `userData` resolution to shared `userProfile` from `useAuth()`

### Technical Details
- **New Files:** 4 (`admin-users-query.ts`, `app/api/admin/users/route.ts`, `admin-users-api.test.ts`, `add_performance_indexes.sql`)
- **Modified Files:** 25 (AuthContext, Navigation, 15+ pages, 5+ components)
- **Test Coverage:** 517 total (414 integration + 99 unit + 4 setup), all passing
- **Migration:** `20260220103052_add_performance_indexes.sql`

---

## [0.2.25] - 2026-02-20

### Added
- **Admin Sub-Sprint 3C: Wire Actions (UI)** — all 10 admin action buttons fully functional
  - **NotifyModal** (`components/admin/NotifyModal.tsx`) — title + message form, calls `admin_send_notification` RPC
  - **MessageModal** (`components/admin/MessageModal.tsx`) — DM compose form, find-or-create conversation per user, audit log with `user_count`
  - **GroupPickerModal** (`components/admin/GroupPickerModal.tsx`) — searchable engagement group picker with 3 modes (invite/join/remove), intersection filtering for remove mode
  - **ConfirmModal integration** — deactivate (warning), decommission (danger), hard delete (danger), force logout (warning), join group (warning), remove from group (danger)
  - **Status message banner** — auto-clearing success/error messages (5s timeout, dismiss button)
  - **Action-in-progress overlay** — prevents double-clicks during async operations
  - **Data refresh pattern** — `refreshTrigger` prop on AdminDataPanel forces re-fetch after mutations
  - **Common group count computation** — real-time intersection query for Remove button enablement

### Changed
- **Admin page** (`app/admin/page.tsx`) — fully wired `handleAction` with all 10 action cases; added `useAuth`, modals, execute functions, audit logging
- **AdminDataPanel** — added `refreshTrigger` prop for parent-triggered re-fetch

### Technical Details
- **New Files:** 3 (`NotifyModal.tsx`, `MessageModal.tsx`, `GroupPickerModal.tsx`)
- **Modified Files:** 2 (`app/admin/page.tsx`, `components/admin/AdminDataPanel.tsx`)
- **Test Coverage:** 506 total (403 integration + 99 unit + 4 setup), all passing (1 pre-existing flaky timeout)
- **No new migrations** — all DB layer was completed in v0.2.24

---

## [0.2.23] - 2026-02-20

### Added
- **Admin Sub-Sprint 3B: UI Foundation** (selection model, action bar, dashboard refinements)
  - **Users Panel Selection** (B-ADMIN-013) — checkbox column, click-to-toggle, Shift+click range select, header checkbox, cross-page persistence, selection counter
  - **UserActionBar component** (B-ADMIN-014) — 10 action buttons in 3 groups (Communication/Account/Group), context-sensitive disabling with reasons, destructive action styling
  - **Pure function modules** in `lib/admin/`:
    - `user-filter.ts` — AdminUser type, filterUsers, computeUserCount, getUserStatLabel
    - `selection-model.ts` — toggleSelection, rangeSelect, selectAllVisible, deselectAllVisible, isAllVisibleSelected
    - `action-bar-logic.ts` — computeActionStates, isDestructiveAction, clearsSelectionAfterAction, ACTION_CATEGORIES
  - **99 unit tests** across 3 test suites in `tests/unit/admin/`

### Changed
- **Admin Dashboard** (B-ADMIN-002 revised) — stat card renamed "Active Users" to "Users"; count reflects filter state (active + inactive by default, decommissioned on toggle)
- **AdminDataPanel** — users panel shows `is_active`/`is_decommissioned` status badges (Active/Inactive/Decommissioned); "Show decommissioned" toggle; selected row highlighting; decommissioned rows visually muted

### Technical Details
- **New Files:** 4 (`lib/admin/user-filter.ts`, `lib/admin/selection-model.ts`, `lib/admin/action-bar-logic.ts`, `components/admin/UserActionBar.tsx`)
- **New Test Files:** 3 (`tests/unit/admin/user-filter.test.ts`, `tests/unit/admin/selection-model.test.ts`, `tests/unit/admin/action-bar-logic.test.ts`)
- **Modified Files:** 2 (`app/admin/page.tsx`, `components/admin/AdminDataPanel.tsx`)
- **Test Coverage:** 480 total (377 integration + 99 unit + 4 setup), all passing

---

## [0.2.20] - 2026-02-16

### Added
- **Group deletion notifications** — BEFORE DELETE trigger on `groups` notifies all active members (except the deleter) with group name pre-rendered in body
- **Auto-assign Member role on invitation acceptance** — AFTER UPDATE trigger on `group_memberships` automatically assigns Member role when status changes from 'invited' to 'active'
- **`can_assign_role()` DB function** — anti-escalation enforcement at RLS level; user must hold `assign_roles` permission AND every permission on the target role
- **`is_group_creator()` SECURITY DEFINER helper** — avoids nested RLS when checking group creator in policies
- **Bootstrap case for group_roles INSERT** — group creator can create roles when no Steward exists yet (chicken-and-egg fix)
- **Permissions SELECT policy** — authenticated users can now read the `permissions` catalog table
- **Backfill Member role for existing groups** — ensures all active engagement group members have the Member role

### Changed
- **`user_group_roles` RLS policies** — replaced `is_active_group_leader()` with `has_permission('assign_roles')` + `can_assign_role()` anti-escalation
- **`copy_template_permissions_on_role_create()` trigger** — now SECURITY DEFINER to bypass RLS during group creation bootstrap
- **AssignRoleModal** — added `userPermissions` prop; filters out roles the user can't assign (anti-escalation at UI level)
- **RoleFormModal** — added self-lockout warning when removing `manage_roles`/`assign_roles` from own role; warning in footer area (always visible)
- **NotificationBell** — notifications no longer navigate anywhere; clicks only mark as read; unread notifications sorted first in dropdown
- **GroupCreateForm** — improved error handling and retry logic for role creation during bootstrap
- **RoleManagementSection** — passes user permissions to AssignRoleModal; improved refresh after role changes
- **Invitations page** — removed client-side Member role assignment (now handled by DB trigger)

### Fixed
- **Agnes 403 on role assignment** — RLS INSERT policy on `user_group_roles` was using pre-RBAC `is_active_group_leader()` check
- **New members missing roles after invitation acceptance** — client-side role assignment blocked by RLS; moved to DB trigger
- **Group creation 403 on group_roles** — bootstrap chicken-and-egg: creator had no `manage_roles` permission during initial setup
- **Template permission copy failing during bootstrap** — trigger function was not SECURITY DEFINER
- **Orphaned groups with no roles** — groups created before bootstrap fix had no Steward/Member roles; backfilled
- **Notification 404 on deleted groups** — clicking "Group Deleted" notification navigated to non-existent group page
- **Notification badge count mismatch** — unread notifications hidden below dropdown fold; fixed by sorting unread first

### Technical Details
- **New Migrations:** 9 (permissions SELECT policy, member role backfill, user_group_roles RLS, auto-assign trigger, missing member roles backfill, bootstrap INSERT fix, template permissions SECURITY DEFINER, orphaned groups backfill, group deletion notifications)
- **Modified Components:** 9 (AssignRoleModal, RoleFormModal, RoleManagementSection, PermissionPicker, NotificationBell, GroupCreateForm, group detail page, groups page, invitations page)
- **New DB Functions:** 3 (`can_assign_role`, `is_group_creator`, `notify_group_deleted`)
- **New DB Triggers:** 2 (`assign_member_role_on_accept`, `notify_group_deleted`)

---

## [0.2.19] - 2026-02-16

### Added
- **RBAC Sub-Sprint 4: Role Management** (manage_roles permission, RLS policies, UI components)
  - `manage_roles` permission added to catalog (total now 42 permissions)
  - `description` column on `group_roles` table
  - `manage_roles` backfilled to Steward role template (now 25 permissions) and all existing Steward instances
  - `manage_roles` added to Deusex system role (now 42 permissions)
  - Two SECURITY DEFINER helpers: `get_group_id_for_role()`, `get_permission_name()` (bypass nested RLS)
  - `RoleManagementSection` component — lists group roles with create/edit/delete buttons
  - `RoleFormModal` component — create/edit role modal with name, description, and permission picker
  - `PermissionPicker` component — category-grouped checkbox UI with anti-escalation enforcement
  - **B-RBAC-018 through B-RBAC-025 behavior specs** — role management behaviors
  - **47 integration tests** for role management (`tests/integration/rbac/role-management.test.ts`)

### Changed
- `prevent_last_leader_removal` trigger — now checks `created_from_role_template_id` instead of role name (safe against role renaming)
- RLS policies on `group_roles` — replaced `created_by_user_id` checks with `has_permission('manage_roles')`
- RLS policies on `group_role_permissions` — `manage_roles` + anti-escalation (must hold permission being granted)
- Group detail page — added Roles section (gated by `manage_roles` permission)

### Technical Details
- **New Migrations:** 2 (`20260216140506_rbac_role_management.sql`, `20260216140740_rbac_role_management_fix_nested_rls.sql`)
- **New Components:** 3 (`RoleManagementSection`, `RoleFormModal`, `PermissionPicker`)
- **Test Status:** 319/319 passing (47 new + 272 existing, zero regressions, 2x QA runs)
- **Security Review:** Anti-escalation enforced at RLS level; template roles cannot be deleted; nested RLS solved with SECURITY DEFINER helpers

---

## [0.2.18] - 2026-02-16

### Changed
- **RBAC Sub-Sprint 3: UI Migration** (isLeader → hasPermission across all components)
  - `app/groups/[id]/page.tsx` — replaced `isLeader` boolean with `usePermissions(groupId)` hook; 6 UI gates now use specific permissions (`edit_group_settings`, `view_member_list`, `remove_roles`, `assign_roles`, `invite_members`)
  - `app/groups/[id]/edit/page.tsx` — replaced `isLeader` with `hasPermission('edit_group_settings')`; added `hasPermission('delete_group')` gate on Danger Zone
  - `ForumSection.tsx` — removed `isLeader` prop, added internal `usePermissions(groupId)` hook, passes `hasPermission('moderate_forum')` as `canModerate`
  - `ForumPost.tsx` + `ForumReplyList.tsx` — renamed `isLeader` prop to `canModerate`
  - `EnrollmentModal.tsx` — replaced `group_roles.name = 'Group Leader'` query with `has_permission` RPC checking `enroll_group_in_journey`

### Added
- **B-RBAC-013 through B-RBAC-017 behavior specs** — UI permission gating behaviors
- **34 integration tests** for UI permission gating (`tests/integration/rbac/ui-permission-gating.test.ts`)
- **Updated DEFERRED_DECISIONS.md** — resolved 6 stale entries (Permission Inheritance, Group-to-Group, Subgroups, Notifications, Forum, DM)

### Technical Details
- **Files Modified:** 6 UI components (no database changes)
- **Test Status:** 272/272 passing (34 new + 238 existing, zero regressions)
- **Security Review:** Fail-closed behavior confirmed; loading states prevent unauthorized content flash

---

## [0.2.17] - 2026-02-16

### Added
- **RBAC Sub-Sprint 2: Permission Resolution** (has_permission + usePermissions hook)
  - `has_permission(p_user_id, p_group_id, p_permission_name)` SQL function — two-tier resolution (system groups always active + context group scoped)
  - `get_user_permissions(p_user_id, p_group_id)` SQL function — batch fetch returning deduplicated TEXT[] array
  - `usePermissions(groupId)` React hook — fetches permission set, provides synchronous `hasPermission()` lookup
  - Both SQL functions: SECURITY DEFINER, search_path='', fail closed (NULL→false)
  - Short-circuit optimization: system group match returns immediately without checking context group
- **B-RBAC-008 through B-RBAC-012 behavior specs** — `docs/specs/behaviors/rbac.md`
- **24 integration tests** for permission resolution (engagement group, system group, edge cases, Deusex all-permissions)

### Technical Details
- **New Migration:** 1 (`20260216111905_rbac_permission_resolution.sql`)
- **New Functions:** 2 (`has_permission`, `get_user_permissions`)
- **New Files:** 4 (migration, usePermissions hook, 2 test suites, session log)
- **Test Status:** 238/238 passing (24 new + 214 existing, zero regressions)

---

## [0.2.16] - 2026-02-16

### Added
- **RBAC Sub-Sprint 1: Schema Foundation**
  - `group_type` column on groups (system/personal/engagement)
  - Personal group creation on signup (handle_new_user extended)
  - 3 system groups: FI Members, Visitor, Deusex (with roles and permissions)
  - Role template permissions (57 rows across 4 templates)
  - `copy_template_permissions` trigger for automatic permission initialization
  - Role renaming: Group Leader→Steward, Travel Guide→Guide
- **B-RBAC-001 through B-RBAC-007 behavior specs**
- **57 integration tests** for RBAC schema foundation

### Technical Details
- **New Migrations:** 4 (schema+permissions, system groups, personal groups+rename, reference rename)
- **Test Status:** 218/218 passing (57 new + 161 existing)

---

## [0.2.15] - 2026-02-15

### Added
- **Direct Messaging System** (Phase 1.5-B complete)
  - `conversations` table: 1:1 user pairs with sorted participant IDs, unique constraint, per-participant read tracking
  - `direct_messages` table: immutable messages with content validation, sender enforcement via RLS
  - `is_conversation_participant()` SECURITY DEFINER helper for RLS policies
  - `can_update_conversation()` SECURITY DEFINER helper enforcing column-level update restrictions (own `last_read_at` only)
  - `update_conversation_last_message_at()` trigger keeps inbox sorted by most recent message
  - `notify_new_direct_message()` trigger creates notification for recipient (not sender) with message preview
  - 5 RLS policies: conversations SELECT/INSERT/UPDATE, direct_messages SELECT/INSERT
  - Realtime publication for both tables (live message delivery)
- **Messages Inbox** (`/messages`) — conversation list with unread indicators, last message preview, time formatting
- **Conversation View** (`/messages/[conversationId]`) — real-time chat with auto-read marking, optimistic message display
- **MessagingContext** — global provider for unread conversation count, Realtime subscription, visibility change refresh
- **"Message" button** on group member list — find-or-create conversation, navigate to chat
- **Notification routing** — `new_direct_message` notifications route to `/messages/{conversationId}`
- **B-MSG-001 through B-MSG-006 behavior specs** — `docs/specs/behaviors/messaging.md`
- **19 integration tests** for direct messaging (send, privacy/RLS, uniqueness, inbox, notifications, read tracking)

### Technical Details
- **New Migration:** 1 (`20260215134017_add_direct_messaging.sql`)
- **New Tables:** 2 (`conversations`, `direct_messages`)
- **New Functions:** 4 (`is_conversation_participant`, `can_update_conversation`, `update_conversation_last_message_at`, `notify_new_direct_message`)
- **New Files:** 5 (migration, MessagingContext, messages page, conversation page, messaging behavior specs)
- **Modified Files:** 4 (layout.tsx, Navigation.tsx, NotificationBell.tsx, group detail page)
- **Test Status:** 157/157 passing (19 new messaging tests + 138 existing)

---

## [0.2.14] - 2026-02-14

### Added
- **Notification System + Group Forum** (Phase 1.5-A complete)
- See commit `ec4bd66` for full details

---

## [0.2.13] - 2026-02-11

### Added
- **B-ROL-001, B-ROL-002, B-ROL-003 behavior specs** — `docs/specs/behaviors/roles.md` fully documented
  - B-ROL-001: Role Assignment Permissions (INSERT/DELETE RLS, bootstrap, helpers)
  - B-ROL-002: Role Template Initialization (group creation flow, partial-impl note)
  - B-ROL-003: Role Visibility Rules (SELECT policy on `user_group_roles`)
- **`role-assignment.test.ts`** — 8 integration tests covering B-ROL-001 (INSERT side) and B-ROL-003 (SELECT side) with authenticated clients; previously these were untested
- **`scripts/delete-groups-admin.js`** — admin utility to safely delete groups by owner email (dry-run + delete modes)

### Fixed
- **Dev dashboard: Phase timeline** — Phase 1.4 was missing; Phase 1.5 was falsely shown as complete. Root cause: regex patterns in `roadmap-parser.ts` weren't anchored to `### Phase X.Y:` headings. Fixed with a 300-char headed window approach.
- **Dev dashboard: Test stats** — Tests showed 0% (0:0). Root cause: regex expected `tests (N passing` format but `PROJECT_STATUS.md` uses `tests, **N/N passing**`. Fixed with dual-format regex.
- **Documentation count errors** — Corrected behavior count (21→20), migration count (29→33 files), test count (110→118) in `PROJECT_STATUS.md` and `groups.md`

### Security
- **`SET search_path = ''` applied to all 9 public functions** — resolves all 9 Supabase Security Advisor "Function Search Path Mutable" warnings
  - `get_current_user_profile_id`, `get_current_role`, `is_group_leader`, `is_active_group_leader`, `is_active_group_member_for_enrollment`, `group_has_leader`, `update_updated_at_column`, `validate_user_group_role`, `prevent_last_leader_removal`
  - All table references fully qualified with `public.` prefix inside function bodies

### Technical Details
- **New Migration:** 1 (`20260211192415_fix_function_search_path.sql`)
- **New Files:** 4 (migration, roles.md, role-assignment.test.ts, delete-groups-admin.js)
- **Modified Files:** 4 (roadmap-parser.ts, parsers.ts, PROJECT_STATUS.md, groups.md)
- **Test Status:** 118/118 passing ✅

---

## [0.2.12] - 2026-02-11

### Added
- **Group Deletion** (B-GRP-005 complete)
  - "Danger Zone" section in `/groups/[id]/edit` with confirmation modal
  - DELETE RLS policy on `groups` table: Group Leaders can delete their groups
  - Cascade deletes: memberships, roles, role assignments, enrollments all removed
- **Catalog Table RLS Policies** — `group_templates`, `role_templates`, `role_template_permissions`, `group_template_roles` now have SELECT policies for authenticated users (were silently blocking all reads)
- `scripts/apply-migration-temp.js` — reliable migration application via Supabase management API (bypasses CLI tracking issues)

### Fixed
- **Group creation end-to-end** — Three cascading RLS gaps that prevented group creation:
  1. `group_memberships`: no INSERT policy allowed `status='active'` (bootstrap case missing) → added "Group creator can join their own group"
  2. `role_templates`: 406 Not Acceptable — no SELECT policy → added USING(true) policy
  3. `group_templates`: empty dropdown — same missing SELECT policy → fixed
- **Role assignment 403** — `user_group_roles` INSERT policy was a placeholder (self-assign only since Jan 25); replaced with proper Group Leaders policy + bootstrap self-assign when no leader exists yet
- **Role removal silently failing** — no DELETE policy existed on `user_group_roles`; added Group Leaders can remove roles
- **Group cascade delete blocked** — `prevent_last_leader_removal` trigger fired during CASCADE delete of a group, blocking it; fixed with early return when group no longer exists
- **B-AUTH-002 inactive user blocking** — `AuthContext.signIn()` now queries `users.is_active` after successful auth; auto signs out and throws if profile is inactive/blocked
- **Migration tracking** — `scripts/apply-migration-temp.js` established as canonical approach for applying migrations when `db push` fails due to date-only version conflicts

### Security
- `group_has_leader()` SECURITY DEFINER helper — avoids self-referential RLS recursion when checking if a group has a leader from inside an INSERT policy
- Bootstrap INSERT policies now properly scoped: only the group creator can self-add, only when preconditions are met

### Technical Details
- **New Migrations:** 4 (`20260211181225`, `20260211182333`, `20260211183334`, `20260211183842`)
- **New Files:** 5 (4 migrations + apply-migration-temp.js)
- **Modified Files:** 4 (edit page, deletion test, AuthContext, signin test)
- **Test Status:** 110/110 passing ✅

---

## [0.2.11] - 2026-02-10

### Added
- **Journey Player** — Full step-by-step content delivery system at `/journeys/[id]/play`
  - `ProgressBar` component: reusable progress indicator (blue → green at 100%)
  - `StepSidebar` component: step list with ✅/⬤/○ indicators, locked future steps, progress summary
  - `StepContent` component: renders step description, instructions, and type-aware action button
  - `JourneyPlayer` component: orchestrates navigation, progress saving, completion detection, review mode
  - Step navigation with Previous / Next buttons and sticky footer
  - Required-step completion gating (can't advance past required step without completing)
  - Progress saved to `journey_enrollments.progress_data` JSONB on every action
  - Resume from last position (`current_step_id` in progress_data)
  - Completion detection: marks enrollment `status: 'completed'` when all required steps done
  - Review mode for completed journeys (free navigation, no gating)
  - Unenrolled users redirected back to journey detail page
- **My Journeys Improvements**
  - "Continue" button now navigates to `/journeys/[id]/play` (was `/my-journeys`)
  - Smart button labels: Start / Continue / Review based on progress state
  - In-progress bar showing completed steps vs. total steps
- **Testing Infrastructure Improvements**
  - `tests/integration/suite-setup.ts`: global delay injection (`beforeAll` 2s + `beforeEach` 800ms)
  - `signInWithRetry` helper in `tests/helpers/supabase.ts` with exponential backoff
  - 4 domain-split test scripts: `test:integration:auth`, `test:integration:groups`, `test:integration:journeys`, `test:integration:rls`

### Changed
- `lib/types/journey.ts`: Added `JourneyProgressData`, `StepProgressEntry`, `PlayerEnrollment` interfaces; extended `JourneyStep` with `description`/`instructions` fields; `JourneyEnrollment.progress_data` now typed as `JourneyProgressData`
- `app/journeys/[id]/page.tsx`: Enrolled button now links to `/play` with label "Start Journey"
- `jest.config.js`: Added `suite-setup.ts` to integration project's `setupFilesAfterEnv`
- `package.json`: Added 4 domain-split `test:integration:*` scripts

### Fixed
- Integration test flakiness: 12/90 tests were failing randomly due to Supabase auth rate limiting causing silent sign-in failures → unauthenticated queries → RLS blocks → cascading null results. Fixed with inter-test delays.
- My Journeys group name display bug (`enrollment.group.name` was `(enrollment as any).groups.name`)

### Technical Details
- **Phase 1.4 Progress**: 85% → 100% complete ✅
- **New Files**: 6 (4 components, 1 page, 1 test setup)
- **Modified Files**: 6 (types, 2 pages, jest config, package.json, test helpers)
- **Test Status**: 90/90 passing (stable, verified on multiple consecutive runs)

---

## [0.2.10] - 2026-01-31

### Added
- **Journey Enrollment System** (Phase 1.4 Part 2 - Complete)
  - EnrollmentModal component (`components/journeys/EnrollmentModal.tsx`)
    - Two enrollment types: Individual or Group
    - Group enrollment restricted to Group Leaders
    - Fetches user's leader groups dynamically
    - Validates existing enrollments before submission
    - Beautiful modal UI with success state
  - My Journeys page (`/my-journeys`)
    - Two tabs: "Individual Journeys" and "Group Journeys"
    - Journey cards with status badges (active, completed, paused, frozen)
    - Difficulty badges and duration display
    - Empty states with "Browse Catalog" CTAs
    - Continue/Review buttons for each journey
  - Journey Detail Page Updates
    - Checks enrollment status (individual OR group)
    - Dynamic enrollment buttons based on status:
      - Not enrolled: "Enroll in Journey" (opens modal)
      - Enrolled individually: "View My Journeys" (green button)
      - Enrolled via group: "Enrolled via [Group Name]" (info badge)
    - Login redirect preserves journey URL
  - Navigation Updates
    - Added "My Journeys" link (📚) to global navigation
    - Active state handling for `/my-journeys` route
- **Database Migration** (`20260131_fix_journey_enrollment_rls.sql`)
  - Fixed infinite recursion in RLS policy
  - Removed nested enrollment check from database level
  - Dual enrollment prevention handled in application layer
- **TypeScript Types**
  - Added `EnrollmentWithJourney` interface for My Journeys page

### Changed
- Supabase query patterns updated to avoid `.in()` subquery issues
  - Fetch group IDs first, then use array in `.in()` method
  - Works around browser client limitations
- Data mapping for Supabase foreign key returns
  - Transforms plural (`journeys`, `groups`) to singular (`journey`, `group`)
  - Ensures component data structure consistency

### Fixed
- RLS policy infinite recursion error for journey enrollments
- Supabase query compatibility with browser client
- Navigation avatar image warning (added `sizes` prop)
- Journey data structure mismatch in My Journeys page

### Technical Details
- **Phase 1.4 Progress**: 75% → 85% complete
- **New Files**: 3 (EnrollmentModal, My Journeys page, RLS fix migration)
- **Modified Files**: 4 (Journey Detail page, Navigation, Journey types, My Journeys)
- **Business Rules Enforced**:
  - No dual enrollment (individual + group for same journey)
  - Only Group Leaders can enroll groups
  - Unlimited journey enrollments allowed
  - Enrollment status: active, completed, paused, frozen

---

## [0.2.9] - 2026-01-27

### Added
- **Error Handling System** (Complete implementation)
  - ErrorBoundary component (`components/ui/ErrorBoundary.tsx`)
  - Route error page (`app/error.tsx`) with "Try Again" functionality
  - Global error handler (`app/global-error.tsx`) for critical errors
  - Custom 404 page (`app/not-found.tsx`) with branded messaging
  - Integrated ErrorBoundary into root layout
  - Development mode shows detailed error information
  - Production mode shows user-friendly messages
  - Recovery options: "Try Again", "Go Home", "Reload App"

### Changed
- **Navigation Component** - Now displays for logged-out users
  - Shows "Sign In" and "Get Started" buttons on homepage
  - Consistent navigation UI across entire application
- **Homepage** - Removed duplicate navigation component
  - Cleaner code structure
  - Relies on global Navigation component

### Fixed
- Duplicate navigation code eliminated
- Improved error resilience across the app
- Better user experience when errors occur

### Technical Details
- Error boundaries catch component-level errors
- Next.js error pages handle route and global errors
- All error pages are client components
- Ready for error tracking service integration (Sentry, LogRocket, etc.)

---

## [0.2.8] - 2026-01-27

### Added
- **Journey System - Catalog & Browsing** (Phase 1.4 Part 1)
  - Journey catalog page (`/journeys`) with grid layout
  - Search functionality (title and description)
  - Filter by difficulty level (beginner, intermediate, advanced)
  - Filter by topic/tags
  - Results counter and clear filters option
  - Journey detail page (`/journeys/[id]`) with comprehensive layout:
    - Hero section with gradient background
    - Breadcrumb navigation
    - Two-tab interface (Overview and Curriculum)
    - Expandable step list with step details
    - Sticky sidebar with journey metadata
    - "Enroll in Journey" CTA button (placeholder)
- **Database Migration #9**: Seed 8 predefined journeys
  - Leadership Fundamentals (180 min, Beginner)
  - Effective Communication Skills (240 min, Beginner)
  - Building High-Performance Teams (300 min, Intermediate)
  - Personal Development Kickstart (150 min, Beginner)
  - Strategic Decision Making (270 min, Advanced)
  - Emotional Intelligence at Work (210 min, Intermediate)
  - Agile Team Collaboration (200 min, Intermediate)
  - Resilience and Stress Management (180 min, Beginner)
- **TypeScript Types**: Complete journey type definitions (`lib/types/journey.ts`)
  - Journey, JourneyContent, JourneyStep interfaces
  - JourneyEnrollment, JourneyFilters types
  - Type guards and utility types
- **Navigation Update**: Added "Journeys" link (🗺️) to global navigation bar

### Technical Details
- Migration file: `20260127_seed_predefined_journeys.sql` (uses first active user as creator)
- Journey content stored as JSONB with structured steps
- All journeys marked as published and public
- Responsive design works on mobile, tablet, and desktop
- Error handling for missing or unpublished journeys
- Loading states for async data fetching

### Implementation Stats
- **New Files**: 4 (migration, types, 2 pages)
- **Modified Files**: 1 (Navigation.tsx)
- **Lines of Code**: ~1200
- **Database Records**: 8 journeys with complete metadata and content

---

## [0.2.7] - 2026-01-26

### Added
- **Edit Group Page** (`/groups/[id]/edit`)
  - Edit group name, description, label
  - Toggle public/private visibility
  - Toggle show member list setting
  - Authorization check (Group Leaders only)
  - Responsive form with validation
- **Invite Member Modal Integration**
  - Connected InviteMemberModal to Edit Group page
  - "Invite Members" button on edit page
  - Modal shows member invitation form
  - Real-time invitation count updates

### Changed
- **Navigation Component**: Added invitation badge refresh on custom events
- **Edit Group Page**: Full implementation with all group settings

### Fixed
- Invitation count now updates when members are invited
- Navigation refreshes automatically after group changes

### Technical Details
- Phase 1.3 Group Management: 100% COMPLETE
- All core group management features implemented
- Ready for Phase 1.4: Journey System

---

## [0.2.6.2] - 2026-01-26

### Added
- **Role Assignment UI** (Complete implementation)
  - Promote member to Group Leader button
  - Assign/remove role modal (AssignRoleModal component)
  - Role badge display on member list
  - Multiple roles per member support
  - Last leader protection (cannot remove last leader)

### Changed
- Member list shows role badges for all assigned roles
- Role management integrated into group detail page
- State updates properly after role changes

### Fixed
- Last leader × button now completely hidden (not just disabled)
- Role state synchronization after changes
- isLeader state properly updated after role assignments

### Technical Details
- New component: `components/groups/AssignRoleModal.tsx`
- Updated: Group detail page with role management
- Full integration of role assignment with existing permissions

---

## [0.2.6.1] - 2026-01-26

### Fixed
- **AssignRoleModal**: Fixed role assignment logic
  - Now correctly checks for existing roles before adding
  - Prevents duplicate role assignments
  - Improved state management after role changes

---

## [0.2.6] - 2026-01-26

### Added
- **Role Assignment Modal** (Initial implementation)
  - Modal component for assigning/removing roles
  - Displays available roles for the group
  - Shows which roles member currently has
  - Assign/remove functionality
  - Database integration with user_group_roles table

### Changed
- Group detail page now includes "Assign Role" button for leaders
- Member state updates after role changes

### Technical Details
- New component: `components/groups/AssignRoleModal.tsx`
- Uses Supabase RPC or direct queries for role management

---

## [0.2.5] - 2026-01-26

### Added
- **Member Management System**
  - Invite members by email (stores as 'invited' status)
  - Accept/decline invitations (dedicated `/invitations` page)
  - Leave groups (with last leader protection)
  - Remove members (Group Leaders only)
  - InviteMemberModal component for email invitations
- **Global Navigation Bar**
  - `components/Navigation.tsx` with sticky header
  - Real-time invitation count badge
  - User avatar dropdown menu
  - Active route highlighting
  - Responsive design
- **Confirmation Modal System**
  - Reusable `ConfirmModal` component
  - Replaced all browser `alert()` and `confirm()` calls
  - Consistent UX for destructive actions
  - Custom titles and messages
- **Database Trigger**: Last leader protection
  - Prevents removing last Group Leader from a group
  - Migration #8: `20260126_last_leader_protection.sql`
  - Automatically reverts changes that would leave group without leader
- **New RLS Policies** (6 total):
  - View invitations policy
  - Accept invitations policy
  - Decline invitations policy
  - Leave groups policy
  - Remove members policy
  - Invite members policy

### Changed
- Replaced all `window.alert()` with ConfirmModal
- Replaced all `window.confirm()` with ConfirmModal
- Member status now includes 'invited' state
- Group detail page shows invitation status
- Invitation page shows pending invitations with accept/decline buttons

### Fixed
- Last leader can no longer be removed from group
- Member status transitions properly enforced
- Authorization checks for member management actions

### Technical Details
- Migration #8 added to prevent last leader removal
- Navigation uses Next.js Image component for avatars
- Real-time invitation count using Supabase count queries
- Modal system uses React portals for proper rendering

---

## [0.2.4] - 2026-01-25

### Added
- **Group Detail Page** (`/groups/[id]`)
  - Dynamic route for viewing individual group details
  - Shows group name, description, label, visibility settings
  - Member list with user avatars and names
  - Role display for each member
  - Group metadata (created date, member count)
  - Breadcrumb navigation (Groups > Group Name)
  - Responsive card-based layout

### Changed
- Groups page now links to individual group detail pages
- Improved group card UI with hover effects

### Technical Details
- Fetches group data with member information from Supabase
- Uses Next.js dynamic routing with `[id]` parameter
- Displays user avatars from Supabase Storage
- Shows role information from user_group_roles junction table

---

## [0.2.3] - 2026-01-25

### Added
- **Group Creation Page** (`/groups/create`)
  - Form to create new groups
  - Select from group templates
  - Set group name, description, and label
  - Configure visibility (public/private)
  - Configure member list visibility
  - Automatic Group Leader role assignment
- **Groups List Page** (`/groups`)
  - View all groups user belongs to
  - Filter by user's groups
  - Create new group button
  - Group cards with metadata
- **RLS Policies**: Group creation and viewing
  - Users can create groups
  - Users can view groups they belong to
  - Group creators automatically get Group Leader role

### Changed
- Default landing page after login: `/groups` (not `/profile`)
- Navigation structure updated to prioritize groups

### Technical Details
- Creates group with selected template
- Automatically creates default roles from template
- Assigns creator as Group Leader
- Uses Supabase RLS for authorization
- Responsive design with Tailwind CSS

---

## [0.2.2] - 2026-01-25

### Added
- **User Profile Editing** (`/profile/edit`)
  - Edit full name
  - Edit bio
  - Update profile data
  - Validation and error handling
- **Avatar Upload**
  - Upload profile pictures to Supabase Storage
  - Image preview before upload
  - Automatic resize/optimization
  - Stored in `avatars` bucket
  - URL saved in `users.avatar_url`
- **Enhanced Profile Page** (`/profile`)
  - Display avatar (or initials if no avatar)
  - Show full name and bio
  - Edit profile button
  - User metadata display
  - Improved layout and styling

### Technical Details
- Supabase Storage bucket: `avatars` (public, 2MB limit)
- Avatar upload uses `createClient` from client-side
- Image handling with browser FileReader API
- Profile updates use optimistic UI patterns
- Soft delete preserves avatar URLs

---

## [0.2.1] - 2026-01-24

### Fixed
- **Supabase Integration**: Verified database connection working
- **Environment Variables**: Confirmed `.env.local` properly configured
- **Build Process**: Ensured Next.js builds successfully
- **TypeScript**: Resolved any type errors

### Technical Details
- Database connection tested and verified
- All Supabase client/server utilities working correctly
- Ready for feature development

---

## [0.2.0] - 2026-01-23

### Added
- **Complete Authentication System**: Full Supabase Auth integration
  - User registration (signup) with email, password, and display name
  - User login with email/password authentication
  - User logout functionality
  - Session management with automatic persistence
  - Protected routes (profile page with redirect logic)
  - Auth context (`AuthContext`) for global state management
  - `useAuth()` hook for accessing auth state in components
- **Auth UI Components**:
  - Reusable `AuthForm` component for login and signup
  - Login page at `/login` route
  - Signup page at `/signup` route
  - Profile page at `/profile` route (protected)
  - Updated homepage with auth-aware navigation
- **Database Triggers for User Lifecycle**:
  - Automatic user profile creation trigger on signup
  - Soft delete trigger when user account is deleted
  - Users marked as `is_active = false` instead of hard deletion
- **Database Schema Fixes**:
  - Fixed user creation trigger to use `full_name` column (not `display_name`)
  - Changed `users.auth_user_id` constraint from CASCADE to SET NULL
  - Changed related table constraints to RESTRICT for data integrity
- **Security Enhancements**:
  - Enabled Row Level Security (RLS) on users table
  - Added RLS policies for user data access (view and update own profile)
  - Users can only access their own profile data
- **Documentation**:
  - Complete authentication implementation guide
  - Migration file: `20260123_fix_user_trigger_and_rls.sql`

### Changed
- Updated `app/layout.tsx` to wrap app with AuthProvider
- Modified homepage to show different content for logged-in vs logged-out users
- Profile page now fetches and displays user data from database

### Fixed
- User creation trigger now correctly handles `full_name` field
- Soft delete properly preserves user data instead of deleting records
- Auth state management prevents race conditions during page loads

### Technical Details
- Authentication: Supabase Auth with email/password
- Session: Stored in browser, auto-refreshes on page load
- Database: PostgreSQL with RLS policies enforced
- Phase: Authentication ✅ Complete (Phase 2 - 20%)

---

## [0.1.2] - 2026-01-21

### Added
- **Next.js Project Setup**:
  - Initialized Next.js 16.1 with App Router
  - Configured TypeScript
  - Set up Tailwind CSS
  - Created basic project structure
- **Supabase Integration**:
  - Created Supabase client utilities (`lib/supabase/client.ts` and `lib/supabase/server.ts`)
  - Configured environment variables
  - Tested database connection
- **.gitignore**: Comprehensive ignore rules for Node.js, Next.js, and common editors

### Changed
- Project moved from planning phase to implementation phase
- Updated README with current status

### Technical Details
- Next.js 16.1 with App Router
- TypeScript strict mode enabled
- Tailwind CSS configured
- Supabase connection working
- Phase: Foundation ✅ Complete

---

## [0.1.1] - 2026-01-20

### Added
- **Complete Database Schema Deployment**:
  - Successfully deployed complete database schema to Supabase
  - 13 tables created (all core and authorization tables)
  - 40 permissions seeded into database
  - 5 role templates seeded (Platform Admin, Group Leader, Travel Guide, Member, Observer)
  - 4 group templates seeded (Small Team, Large Group, Organization, Learning Cohort)
  - All indexes, triggers, and RLS policies successfully deployed
  - Validation trigger added for user_group_roles to ensure role-group consistency

### Fixed
- Replaced CHECK constraint with trigger in `user_group_roles` table (PostgreSQL doesn't support subqueries in CHECK constraints)
- Updated migration script with corrected user_group_roles validation approach

### Technical Details
- Database: Fully operational with 13 tables, RLS enabled on all tables
- Seed Data: 40 permissions, 5 role templates, 4 group templates
- Phase: Database Implementation ✅ Complete

---

## [0.1.0] - 2026-01-20

### Added
- **Database Schema v2.0**: Complete PostgreSQL schema with proper dependency ordering
  - Core tables: users, groups, group_memberships, journeys, journey_enrollments
  - Authorization tables: permissions, role_templates, group_templates, role_template_permissions, group_template_roles, group_roles, group_role_permissions, user_group_roles
  - Row Level Security (RLS) policies for all tables
  - Comprehensive indexes for performance optimization
  - Seed data for permissions, role templates, and group templates
- **Migration Script**: `fringeisland_migration.sql` for automated database setup
- **Architecture Documentation**:
  - `ARCHITECTURE.md`: Overall system design and core concepts
  - `DATABASE_SCHEMA.md`: Complete database schema with RLS policies
  - `AUTHORIZATION.md`: Detailed permission system design
  - `DOMAIN_ENTITIES.md`: Core business entities and relationships
  - `ROADMAP.md`: Implementation phases and milestones
  - `DEFERRED_DECISIONS.md`: Architectural decisions postponed to later phases
- **Project Documentation**:
  - `README.md`: Project overview, vision, and current status
  - `CHANGELOG.md`: Version history and changes tracking
  - `.gitignore`: Git ignore rules
- **Supabase Project**: Created FringeIslandDB database instance

### Changed
- Reorganized database table creation order to resolve foreign key dependency issues
- Updated documentation structure for better clarity and navigation

### Technical Details
- Stack: Next.js 16.1, TypeScript, React, Supabase (PostgreSQL)
- Database: PostgreSQL with Row Level Security
- Authorization: Flexible node/group-based permission system
- Phase: Architecture & Planning → Database Implementation

---

## Project Phases

### Phase 1: Foundation ✅ 75% COMPLETE
**Timeline**: January 2026

- [x] Complete architecture planning
- [x] Design database schema
- [x] Implement database
- [x] Set up development environment
- [x] Initialize Next.js project
- [x] Implement authentication system
- [x] User profile management
- [x] Group management (create, edit, members, roles)
- [x] **Journey catalog and browsing** ✅ NEW (v0.2.8)
- [ ] Journey enrollment and content delivery
- [ ] Communication features

### Phase 2: User-Generated Content 
**Timeline**: Q2 2026
- User-created journeys
- Journey marketplace
- Advanced customization

### Phase 3: Dynamic Journeys
**Timeline**: Q3 2026
- Adaptive learning paths
- AI-powered recommendations

### Phase 4: Developer Platform
**Timeline**: Q4 2026
- Public API
- SDK and integrations

---

## Notes

### Versioning Strategy
- **0.x.x**: Pre-release development versions
- **1.0.0**: First production-ready release with core features
- **x.y.z**: Major.Minor.Patch following semantic versioning

### Contributing
Currently in early development phase. Contribution guidelines will be added when the project reaches a stable state.

### Database Migrations
- Each database schema change documented with migration scripts
- Migration files located in `supabase/migrations/` directory
- **Migrations**:
  - ✅ `20260120_initial_schema.sql` - Initial database setup
  - ✅ `20260123_fix_user_trigger_and_rls.sql` - User lifecycle and RLS
  - ✅ `20260126_group_rls_policies.sql` - Group viewing and creation
  - ✅ `20260126_member_invitation_rls.sql` - Member invitation system
  - ✅ `20260126_member_management_rls.sql` - Accept/decline/leave/remove
  - ✅ `20260126_last_leader_protection.sql` - Last leader protection trigger
  - ✅ `20260127_seed_predefined_journeys.sql` - 8 predefined journeys (v0.2.8)

---

**Project**: FringeIsland  
**Repository**: https://github.com/Stefansteffansson/FringeIsland  
**Maintainer**: Stefan Steffansson  
**License**: TBD
