# Ferd Actual State Analysis

**Version:** v0.2.37  
**Analysis Date:** 2026-04-04  
**Analyst:** Claude Code (Opus 4.6)

---

## Executive Summary

**Overall completion:** ~45% of intended Ferd architecture implemented

**Strengths:**
- L2 Organisation is the most mature layer — universal group pattern, RBAC schema, 39 permissions defined, DeusEx admin group
- L5 Communication core is functional — DMs, forums, 7 notification types with Realtime push
- RLS enforced on all 19 tables — no bypass paths found
- Foundation is clean — no premature assumptions about unbuilt features (visitor profiles, profile_data, activity_feed, feature flags)
- 659 tests (550 integration + 99 unit + 4 setup + 7 E2E) provide meaningful coverage

**Critical gaps:**
- **ADR-009 massively violated** — ~40+ direct Supabase write operations in .tsx files; only 4 API routes exist covering ~15% of operations
- **Permission enforcement shallow** — only 8 of 39 permissions are fully enforced (RLS + frontend); 24 are defined but never checked
- **Admin is incomplete** — no journey management, no group CRUD from admin, no audit log viewer, no platform-level moderation
- **No GDPR/privacy infrastructure** — no account deletion, data export, consent tracking, or privacy policy
- **Email delivery is a stub** — `console.log` only; invitation emails silently dropped

**Architectural debt:**
- 6 notification triggers implement application logic inside database triggers
- `app/admin/page.tsx` is a god-file containing all admin mutations client-side
- No design system — `components/ui/` has only 2 files
- Only 8 ARIA attributes across the entire frontend — a11y is critically thin

---

## "Builds Up" Foundation Assessment

| Layer | Solid? | Gaps Affecting Higher Layers |
|-------|--------|------------------------------|
| L0 | Mostly | No pg_cron, no feature flags, email stub (silently drops invitations), no i18n |
| L1 | Partial | No visitor profiles, no profile_data — but no code assumes these exist (PASS) |
| L2 | Schema solid, enforcement shallow | 24 of 39 permissions never checked — L3/L5 features gated by these are unprotected at the application level (RLS still enforces some) |
| L3 | Functional but rigid | Only 3 step types, no journey designer, steps embedded in JSONB (not extensible) |

**Verdict:** Lower layers do NOT have forward-dependency violations — no code assumes unbuilt features exist. However, L2 permission enforcement is shallow enough that features at L3/L5 that should be permission-gated may be under-protected.

---

## Layer-by-Layer Status

### Confirmed Layers (no deep verification)

| Layer | Status | Summary |
|-------|--------|---------|
| L0 Infrastructure | WORKING | 19 tables, RLS on all, Supabase configured. Gaps: no pg_cron, no feature flags, email stub, no i18n |
| L1 Identity | PARTIAL | Auth + profiles + display names work. Missing: visitor profiles, profile_data, anonymous sessions |
| L4 Content | NOT BUILT | No rich text editor, no media uploads, no assessment frameworks, no journal UI |
| L6 Discovery | NOT BUILT | No search, no recommendations, no marketplace |
| L7 Intelligence | NOT BUILT | No AI mentor, no profile accumulation, no Whisp |

### L2 -- Organisation (DEEP DIVE)

**Schema: Solid.** Universal group pattern (D15), 4 role templates (Steward/Guide/Member/Observer), 39 permissions across 6 categories, `has_permission()` SECURITY DEFINER function, `is_platform_admin()` for admin RLS.

**Permission enforcement: Shallow.**

| Category | Total | Enforced (RLS+FE) | Partial | Defined Only |
|----------|-------|-------------------|---------|-------------|
| Group Management | 15 | 5 (invite, assign_roles, manage_roles, edit_group_settings, delete_group) | 2 (view_member_list FE-only, remove_members RLS-only) | 8 (view_member_profiles, activate/pause_members, set_group_visibility, control_member_list_visibility, browse_public_groups, create_group) |
| Journey Management | 10 | 1 (enroll_group_in_journey) | 0 | 9 (all authoring + browse permissions) |
| Journey Participation | 6 | 0 | 0 | 6 (all) |
| Communication | 5 | 1 (moderate_forum) | 3 (view_forum, post_forum_messages, reply_to_messages — RLS only) | 1 (send_direct_messages) |
| Feedback | 3 | 0 | 0 | 3 (all) |
| Platform Admin | 5 | 1 (manage_all_groups) | 0 | 4 (manage_platform_settings, manage_role/group_templates, view_platform_analytics) |
| **TOTAL** | **39** | **8** | **5** | **26** |

### L3 -- Experience Engine (DEEP DIVE)

**Journey data model:**
- 8 predefined journeys seeded in DB
- Steps embedded in `journeys.content` JSONB (no separate `journey_steps` table)
- Step types: `content`, `activity`, `assessment` (3 of 7 anatomy-planned types)
- Progress stored in `journey_enrollments.progress_data` JSONB (`current_step_id`, `completed_steps[]`, `step_progress{}`)
- Enrollment is group-based (personal_group_id for individual enrollment)

**Journey Designer:** Does NOT exist. No create/edit UI. Journeys are read-only pre-authored content.

**Step renderer extensibility:** Low. Hard-coded `switch` statements in `StepContent.tsx` — no registry/plugin pattern. Adding a type requires editing 4 functions. Rich content is a placeholder ("coming soon").

**Enrollment flow:** Complete end-to-end via API routes (ADR-009 compliant). POST/DELETE `/api/v1/journeys/[id]/enroll`, GET `/api/v1/journeys/enrollments`.

**Progress tracking:** Client-side direct Supabase writes in `JourneyPlayer.tsx` — ADR-009 violation.

### L5 -- Communication (DEEP DIVE)

**Direct Messaging:** Functional. `conversations` + `direct_messages` tables. Full conversation list with unread dot, avatar, last message preview. ADR-009 violation — all message operations are direct Supabase calls from page components.

**Group Forum:** Functional. `forum_posts` table with flat threading, soft-delete, edit own post. `moderate_forum` permission gated (RLS + frontend). ADR-009 violation — all forum operations are direct Supabase calls from `ForumSection.tsx`.

**Notifications (7 types):**
1. `group_invitation` — user invited to group
2. `invitation_accepted` — Steward notified of acceptance
3. `invitation_declined` — Steward notified of decline
4. `member_removed` — user notified of removal
5. `member_left` — Steward notified of voluntary leave
6. `role_assigned` — user notified of role assignment
7. `group_deleted` — members notified of group deletion

Smart notifications with accept/decline actions (Sprint 3). Realtime push via Supabase subscriptions.

**NOT implemented:** Steward broadcast/announcements, @mention, notification preferences/muting, activity feed.

---

## Vertical Status (with Cross-Layer Coverage)

### V1 -- Administration / Moderation

**Self-Serve vs Admin Capability Matrix:**

| Entity | Operation | Self-Serve | Admin (DeusEx) | Neither |
|--------|-----------|-----------|----------------|---------|
| **Users** | View own profile | YES | — | |
| | Edit own profile | YES | — | |
| | Delete own account | — | — | NEITHER — no self-service deletion |
| | View all users | — | YES (with filters) | |
| | Edit any user's profile | — | — | NEITHER |
| | Activate/deactivate user | — | YES (RPC) | |
| | Soft-delete (decommission) | — | YES (RPC) | |
| | Hard-delete user | — | YES (action defined) | |
| | Force logout | — | YES (RPC) | |
| | Exit platform | — | YES (RPC) | |
| | Message/notify user | — | YES (MessageModal, NotifyModal) | |
| **Groups** | Create group | YES | — | |
| | Edit own group (Steward) | YES | — | |
| | Delete own group (Steward) | YES | — | |
| | View all groups | — | Stats only | No full group list for admin |
| | Edit any group | — | — | NEITHER |
| | Delete any group | — | — | NEITHER (owner-only) |
| | Transfer stewardship | YES (nomination) | — | No admin override |
| | Fix orphaned groups | — | YES (reassign Steward) | |
| | Invite/join/remove from group | — | YES (GroupPickerModal) | |
| **Journeys** | Browse catalogue | YES | — | |
| | Enroll in journey | YES | — | |
| | View all journeys | — | Enrollment count only | No journey list for admin |
| | Create/edit/publish journey | — | — | NEITHER — no journey designer |
| | Delete journey | — | — | NEITHER |
| **Roles** | Manage roles (Steward) | YES | — | |
| | Assign/remove roles | YES (with permission) | — | |
| | Manage DeusEx members | — | YES (invite/remove) | |
| | Manage role templates | — | — | NEITHER |
| **Forum** | Post/reply | YES (RLS gated) | — | |
| | Edit own post | YES | — | |
| | Delete post (moderate) | YES (with `moderate_forum`) | — | No platform-level moderation |
| **Messages** | Send DM | YES | YES (MessageModal) | |

**Cross-Layer Coverage:**

| L0 | L1 | L2 | L3 | L5 | Coverage |
|----|----|----|----|----|----------|
| NONE | FULL (user lifecycle) | PARTIAL (fix-orphans, invite/join/remove, no group CRUD) | NONE (stats only) | NONE (no platform moderation) | 1.5/5 layers |

**Moderation Sub-Vertical:**
- Content flagging: NOT IMPLEMENTED (no report/flag UI or table)
- Moderation queue: NOT IMPLEMENTED
- User warnings/strikes: NOT IMPLEMENTED
- User bans/suspensions: NOT IMPLEMENTED (only full decommission)
- Moderation audit trail: NOT IMPLEMENTED (forum deletions not logged)
- `moderate_forum` permission: ENFORCED but group-scoped only — no platform-level moderation

### V2 -- Privacy / GDPR

| Element | Status |
|---------|--------|
| Data export (GDPR Art. 20) | NOT IMPLEMENTED |
| Data erasure (GDPR Art. 17) | NOT IMPLEMENTED (admin-only decommission exists, not self-service) |
| Consent tracking | NOT IMPLEMENTED (no consent table, no registration checkbox) |
| Privacy policy page | NOT IMPLEMENTED (no `/privacy` route) |
| Cookie consent banner | NOT IMPLEMENTED |
| AI consent | NOT IMPLEMENTED (future — L7) |
| `show_real_name` toggle | IMPLEMENTED — DB column + profile edit UI + conditional display |

**Cross-Layer Coverage:**

| L0 | L1 | L2 | L3 | L5 | Coverage |
|----|----|----|----|----|----------|
| NONE | PARTIAL (show_real_name only) | NONE | NONE | NONE | 0.5/5 layers |

### V3 -- Notifications / Email

**Notification trigger coverage by layer:**

| Layer | Events Covered | Events Missing |
|-------|---------------|----------------|
| L1 | NONE | Password change, email verification |
| L2 | Group invitation, invitation accepted/declined, member removed/left, role assigned/removed, group deleted | Direct member add (no trigger) |
| L3 | NONE | Journey enrollment, step completion, journey completion |
| L5 | NONE (DM trigger was explicitly removed) | New DM, new forum post, forum reply, @mention |

**Notification chain:** All 7 types follow the complete chain: DB trigger -> INSERT notification row -> Supabase Realtime -> `NotificationContext.tsx` subscription -> Bell UI update. Smart notifications (accept/decline) work via `handle_notification_action` RPC.

**Email:** STUB only (`lib/email/send.ts` = `console.log`). Called from one place: `app/api/invitations/send-email/route.ts`. Will silently drop emails in production.

**Notification preferences:** NOT IMPLEMENTED — no mute/filter UI, no preferences table.

**Cross-Layer Coverage:**

| L0 | L1 | L2 | L3 | L5 | Coverage |
|----|----|----|----|----|----------|
| — | NONE | FULL | NONE | NONE | 1/4 layers |

### V4 -- Observability / Audit

**What's logged to `admin_audit_log`:**
- User lifecycle: activate, deactivate, decommission, hard-delete, exit-platform
- Admin notifications sent
- Group membership changes (invite, join, remove) via admin
- DeusEx member add/remove
- Group deletion

**What's NOT logged:**
- Forum moderation actions (post deletions)
- Role changes
- Journey enrollment/unenrollment
- Auth events (login, logout, failed attempts)
- Any self-serve user actions

**Audit log viewer:** NOT IMPLEMENTED — table has data but no admin UI to read it.

**Error tracking:** ErrorBoundary exists in `components/ui/ErrorBoundary.tsx` wrapping the app, but only `console.error`s — Sentry integration is a TODO comment.

**Health checks, monitoring, metrics:** NONE.

**Cross-Layer Coverage:**

| L0 | L1 | L2 | L3 | L5 | V1 | Coverage |
|----|----|----|----|----|-----|----------|
| NONE | NONE | PARTIAL (group delete only) | NONE | NONE | PARTIAL (admin user actions) | 1/5 layers |

### V5 -- Transactions

Locked — not for Ferd. No payment integration. Correct.

---

## Permission Enforcement Audit

| # | Permission | RLS | Frontend | Status |
|---|-----------|-----|----------|--------|
| 1 | view_member_list | — | YES | PARTIAL (FE only) |
| 2 | view_member_profiles | — | — | DEFINED ONLY |
| 3 | invite_members | YES | YES | ENFORCED |
| 4 | activate_members | — | — | DEFINED ONLY |
| 5 | pause_members | — | — | DEFINED ONLY |
| 6 | remove_members | YES | — | PARTIAL (RLS only) |
| 7 | assign_roles | YES | YES | ENFORCED |
| 8 | remove_roles | Mismatch | YES | PARTIAL (FE checks remove_roles, RLS uses assign_roles) |
| 9 | manage_roles | YES | YES | ENFORCED |
| 10 | edit_group_settings | YES | YES | ENFORCED |
| 11 | set_group_visibility | — | — | DEFINED ONLY |
| 12 | control_member_list_visibility | — | — | DEFINED ONLY |
| 13 | delete_group | YES | YES | ENFORCED |
| 14 | browse_public_groups | — | — | DEFINED ONLY |
| 15 | create_group | — | — | DEFINED ONLY |
| 16 | enroll_self_in_journey | — | — | DEFINED ONLY |
| 17 | enroll_group_in_journey | YES | YES | ENFORCED |
| 18 | unenroll_from_journey | — | — | DEFINED ONLY |
| 19 | freeze_journey | — | — | DEFINED ONLY |
| 20 | create_journey | — | — | DEFINED ONLY |
| 21 | edit_journey | — | — | DEFINED ONLY |
| 22 | publish_journey | — | — | DEFINED ONLY |
| 23 | unpublish_journey | — | — | DEFINED ONLY |
| 24 | delete_journey | — | — | DEFINED ONLY |
| 25 | browse_journey_catalog | — | — | DEFINED ONLY |
| 26 | view_journey_content | — | — | DEFINED ONLY |
| 27 | complete_journey_activities | — | — | DEFINED ONLY |
| 28 | view_own_progress | — | — | DEFINED ONLY |
| 29 | view_others_progress | — | — | DEFINED ONLY |
| 30 | view_group_progress | — | — | DEFINED ONLY |
| 31 | track_group_progress | — | — | DEFINED ONLY |
| 32 | view_forum | YES | — | PARTIAL (RLS only) |
| 33 | post_forum_messages | YES | — | PARTIAL (RLS only) |
| 34 | reply_to_messages | YES | — | PARTIAL (RLS only) |
| 35 | moderate_forum | YES | YES | ENFORCED |
| 36 | send_direct_messages | — | — | DEFINED ONLY |
| 37 | provide_feedback_to_members | — | — | DEFINED ONLY |
| 38 | receive_feedback | — | — | DEFINED ONLY |
| 39 | view_member_feedback | — | — | DEFINED ONLY |

**Summary:** 8 ENFORCED | 5 PARTIAL | 26 DEFINED ONLY

---

## Layer Alignment & ADR-009 Compliance

### ADR-009 Violation Summary

| Feature Area | Direct DB Writes in .tsx | API Routes | Status |
|-------------|------------------------|------------|--------|
| Journey enrollment | 0 | 3 (POST/DELETE/GET) | COMPLIANT |
| Journey progress | 3 (`JourneyPlayer.tsx`) | 0 | VIOLATION |
| Group management | 10+ (`GroupCreateForm`, `edit/page`, `RoleFormModal`, `RoleManagementSection`, `AssignRoleModal`) | 0 | VIOLATION |
| Group invitations | 5+ (`InviteMemberModal`, `invitations/page`) | 1 (send-email) | MOSTLY VIOLATION |
| Messaging | 5+ (`messages/[id]/page`) | 0 | VIOLATION |
| Forum | 4 (`ForumSection.tsx`) | 0 | VIOLATION |
| Profile | 3 (`ProfileEditForm`, `AvatarUpload`) | 0 | VIOLATION |
| Admin | 15+ mutations + 9 write RPCs (`admin/page.tsx`, `deusex/page.tsx`, `fix-orphans/page.tsx`) | 1 (GET users) | SEVERE VIOLATION |
| Notifications | 0 (triggers handle creation) | 0 | N/A (DB triggers) |

**Total: ~40+ direct write operations across .tsx files. Only 4 API routes exist.**

### Layer Alignment Violations

| Violation | Location | Impact |
|-----------|----------|--------|
| All admin mutations run client-side | `app/admin/page.tsx` (~700 lines of business logic) | Security risk — admin operations should be server-side |
| 6 notification triggers do application work in DB | Migrations (notify_invitation_*, notify_role_*, notify_group_deleted) | Tight coupling — notification logic should be in application layer |
| Forum CRUD in component | `components/groups/forum/ForumSection.tsx` | Business logic in presentation layer |
| Message send/read in page | `app/messages/[conversationId]/page.tsx` | Business logic in page component |
| Group create logic in component | `components/groups/GroupCreateForm.tsx` (5 chained inserts) | Multi-step transaction in frontend |
| Progress writes in component | `components/journeys/JourneyPlayer.tsx` | Data mutation in presentation layer |

### Database Trigger Classification

**Data integrity (correct):** 9 triggers — timestamp updates, invariant enforcement, validation, immutability, flat threading
**Application logic (violation):** 6 notification triggers + 2 auto-assignment triggers + 2 audit triggers = 10 triggers doing application work
**Borderline (pragmatically acceptable):** 3 triggers — `on_auth_user_created`, `update_conversation_last_message`, `sync_display_name_to_personal_group`

---

## Platform API & Design System

### API Surface Completeness

| Entity | List | Get | Create | Update | Delete | Coverage |
|--------|------|-----|--------|--------|--------|----------|
| Users | Admin only (unversioned) | — | — | — | — | 1/5 |
| Groups | — | — | — | — | — | 0/5 |
| Journeys | — | — | — | — | — | 0/5 |
| Enrollments | YES (v1) | — | YES (v1) | — | YES (v1) | 3/5 |
| Messages | — | — | — | — | — | 0/5 |
| Forum | — | — | — | — | — | 0/5 |
| Invitations | — | — | — | — | — | 0/5 (send-email only) |

**API versioning:** Inconsistent — 2 routes under `/api/v1/`, 2 routes unversioned (`/api/admin/users`, `/api/invitations/send-email`)

**Error response format:** Consistent `{ error: string }` with appropriate HTTP status codes.

**Auth pattern:** JWT/Bearer in v1 routes. Admin route adds cookie fallback — minor inconsistency.

**Rate limiting:** NONE on any route.

**Multi-platform readiness:** NOT READY. An iOS/Android app cannot be built using the current API surface — it covers ~15% of needed operations.

### Design System & a11y

**Component library:** `components/ui/` contains only 2 files (ConfirmModal, ErrorBoundary). No design system primitives (Button, Input, Card, Badge, Toast, Spinner). UI is assembled ad-hoc with Tailwind utility classes.

**Accessibility:**
- Total `aria-` attributes across all .tsx: **8 occurrences in 3 files**
- `NotificationBell.tsx`: 6 aria attributes (best covered)
- No focus traps in modals
- No skip links
- No `role="dialog"` on ConfirmModal
- Only keyboard handler: Escape key in ConfirmModal

**Browser `alert()` calls (should use ConfirmModal):** 7 occurrences in 3 files:
- `app/admin/fix-orphans/page.tsx` (3 calls)
- `app/groups/[id]/page.tsx` (2 calls)
- `components/groups/RoleManagementSection.tsx` (2 calls)

**Tailwind config:** No custom design tokens. Vanilla Tailwind utility classes throughout.

---

## Test Coverage Alignment

| Domain | Test Files | Layer(s) | Notes |
|--------|-----------|----------|-------|
| auth | 5 | L1 | Sign in/up/out, protected routes, session persistence |
| groups | 10 | L2 | Deletion, invitations, leave, role assignment, stewardship |
| journeys | 8 | L3 | Catalog, enrollment, progress, completion, step navigation |
| rbac | 13 | L2 | Permissions, roles, templates, D15, DeusEx |
| admin | 16-18 | V1 | User management, audit log, DeusEx, platform exit |
| communication | 4 | L5 | Forum, messaging, notifications, smart notifications |
| rls | 1 | L0/L2 | Groups RLS only — thin coverage |
| security | 2 | L0 | Frozen enrollment, journey access |
| users | 2 | L1 | Display name system |
| unit | 3 | V1 | Admin action-bar, selection, filter |
| E2E | 2 specs | L1, L3 | Auth flows, journey browsing/enrollment |

**Gaps:**
- No E2E tests for groups, messaging, forum, admin, profile
- RLS coverage very thin (1 file for groups only — no messaging, forum, journey RLS tests)
- No API route tests for the 4 existing routes
- No unit tests for non-admin components
- Verticals V2-V4 have minimal dedicated testing

**Note:** Full test quality review deferred to post-refactoring.

---

## Recommendations

### Immediate (Ferd Launch Blockers)

1. **Create API routes for all write operations** — the ADR-009 violations are the #1 architectural debt. Start with admin (security risk), then groups, messaging, forum, profile.
2. **Replace 7 browser `alert()` calls** with ConfirmModal — quick win, already in known issue list.
3. **Wire up real email delivery** — invitation emails silently fail in production. Integrate Resend or similar.

### Short-term (Ferd Polish)

4. **Build audit log viewer** — data exists in `admin_audit_log` but no admin can see it.
5. **Enforce remaining permissions** — 26 of 39 permissions are defined but never checked. Prioritize journey and communication permissions.
6. **Add notification triggers for L3/L5** — no notifications for journey events, DMs, or forum posts.
7. **Add admin group management** — admin can't view/edit/delete groups (only fix orphans).
8. **Add admin journey management** — admin can't create/edit/publish journeys (stats only).
9. **Standardize API versioning** — move admin and invitation routes under `/api/v1/`.
10. **Add basic a11y** — focus traps in modals, ARIA attributes on interactive elements, skip links.

### Deferred (Hamn or later)

11. **Visitor/temporary profiles** (L1) — no code depends on this
12. **i18n** (L0) — no code depends on this
13. **Journey designer** (L3/L4) — Hamn M1
14. **Additional step types** (L3) — Narrative, Reflection, Choice, Journal, Checklist
15. **Content layer** (L4) — rich text, media, assessments
16. **Discovery layer** (L6) — search, recommendations
17. **Intelligence layer** (L7) — AI mentor, profile accumulation
18. **GDPR compliance** (V2) — data export, erasure, consent tracking, privacy policy
19. **Moderation system** (V1) — content flagging, moderation queue, user warnings/bans
20. **Design system** — shared component primitives, design tokens
21. **Sentry integration** (V4) — error tracking beyond console.error
22. **Rate limiting** — API route protection
23. **Notification preferences** — user muting/filtering

---

## Step 2: Documentation Restructuring

Based on ACTUAL_STATE findings:

1. **Docs describing features that don't exist:** Check if any docs reference visitor profiles, profile_data, activity_feed, Journey Zero, AI mentor, or the full 7 step types as if implemented
2. **Implemented features lacking documentation:** Admin CRUD capabilities (what admin can/cannot do), notification trigger inventory, permission enforcement status
3. **Doc structure vs architecture:** Current docs are organized by feature/sprint history — could be reorganized by architecture layer for clearer navigation
4. **Stale information:** Permission count (docs may say 31, actual is 39), step types (anatomy says 7, actual is 3), feature status in various docs
5. **Proposed restructuring:** Align docs with L0-L7 layers + V1-V5 verticals structure from the anatomy

---

## Appendix: Key File Paths Referenced

| Area | Path |
|------|------|
| Admin dashboard | `app/admin/page.tsx` |
| Admin DeusEx | `app/admin/deusex/page.tsx` |
| Admin fix-orphans | `app/admin/fix-orphans/page.tsx` |
| Admin API | `app/api/admin/users/route.ts` |
| Admin components | `components/admin/` |
| Admin lib | `lib/admin/` |
| Journey player | `components/journeys/JourneyPlayer.tsx` |
| Step renderer | `components/journeys/StepContent.tsx` |
| Journey types | `lib/types/journey.ts` |
| Enrollment API | `app/api/v1/journeys/[id]/enroll/route.ts` |
| Forum components | `components/groups/forum/` |
| Notification bell | `components/notifications/NotificationBell.tsx` |
| Notification context | `lib/notifications/NotificationContext.tsx` |
| Messaging context | `lib/messaging/MessagingContext.tsx` |
| Profile edit | `components/profile/ProfileEditForm.tsx` |
| Permissions seed | `supabase/seeds/01_permissions.sql` |
| Permission constants | `lib/constants/permissions.ts` |
| Permission hook | `lib/hooks/usePermissions.ts` |
| Core migration | `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` |
| Email stub | `lib/email/send.ts` |
| Error boundary | `components/ui/ErrorBoundary.tsx` |
| ConfirmModal | `components/ui/ConfirmModal.tsx` |
