# Ferd Capability Map — Final (Codebase-Verified)

**Wave:** Ferd (foundation)
**Scope:** Everything needed for the first usable version of FringeIsland
**Date:** 2026-04-10
**Verified against:** Codebase at commit `6bbc0d5` (main branch)

---

## Design constraint

> All Ferd platform capabilities must be designed with extension points in mind. No hardcoded enums, no closed type systems, no sealed permission sets. The Extension System is a future wave, but Ferd must not close it off.

---

## Capability Map

### Platform Core -- Infrastructure (PC-1)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 1 | PostgreSQL database with RLS | Done | 100 | -- | 19 tables, all with RLS enabled. Rebuild migration `20260222000000`. |
| 2 | Supabase project setup | Done | 100 | -- | Project active, CLI via `supabase-cli.sh`, 20+ migrations applied. |
| 3 | Storage (avatars, media) | Done | 100 | -- | `users.avatar_url`, `groups.avatar_url`. `AvatarUpload.tsx` component. Storage bucket policy exists. |
| 4 | Feature flags infrastructure | Not started | 0 | -- | Zero references to feature flags anywhere in codebase. Confirmed Ferd scope per session decision #22. |
| 5 | Real-time subscriptions (Supabase Realtime) | Partial | 40 | -- | Used in 5 places: `AuthContext`, `NotificationContext`, `MessagingContext`, `app/admin/page.tsx`, `app/messages/[conversationId]/page.tsx`. Scoped to auth state, notifications, DMs, admin refresh. Ferd scope: DMs + notification bell (session decision #23). |

### Platform Core -- Identity (PC-2)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 6 | User authentication (email/password) | Done | 100 | PC-1 | Supabase Auth, `AuthContext.tsx`, `useAuth()` hook, `proxy.ts` route protection. |
| 7 | Session management | Done | 100 | PC-1 | `proxy.ts` (not middleware.ts per Next.js 16), refresh token handling, `admin_force_logout()` RPC. |
| 8 | Visitor anonymous sessions (ADR-U004) | Not started | 0 | PC-1 | No visitor system group. No anonymous session logic. Session decision #5: visitors are a real user type. |
| 9 | Visitor-to-member state transfer | Not started | 0 | 8 | Depends on visitor sessions. Activity accumulation + soft transition on signup. |
| 10 | User profiles (CRUD, avatar) | Done | 100 | PC-1 | `app/profile/page.tsx`, `app/profile/edit/page.tsx`, `ProfileEditForm.tsx`, `AvatarUpload.tsx`. |
| 11 | Profile data flexible table (ADR-U005) | Partial | 30 | PC-1 | `users` table has `full_name`, `bio`, `avatar_url` columns but NO separate `profile_data` JSONB or flexible attributes table. The ADR design is not fully implemented. |
| 12 | Personal Journal (simple CRUD) | Not started | 0 | 6, PC-1 | No `journal` table. No journal-related code. Confirmed Ferd scope per session decision #14. Belongs to Platform Core -- Identity (session decision #8). |
| 13 | Display name privacy | Done | 100 | 10 | Personal groups default `is_public=false`, `show_member_list=false`. |
| 14 | Self-service platform exit ("Delete my account") | Not started | 0 | 6 | No self-service exit flow. No `/settings` or `/account` page. Deferred to admin-assisted per D-R3, but session decision #17 makes this Ferd scope. |
| 15 | PII scrubbing on decommission | Not started | 0 | 14 | `admin_exit_user_from_platform()` sets `is_decommissioned=true` but does NOT scrub `email`, `full_name`, `bio`, `avatar_url`, or personal group `name`. GDPR gap. |
| 16 | Auth record cleanup on decommission | Not started | 0 | 14 | Decommission deletes `auth.refresh_tokens` and `auth.sessions` but `auth.users` record (email, encrypted_password) survives. Decommissioned users can still obtain JWTs. |
| 17 | Data export (FIM downloads their data) | Not started | 0 | 6 | No export function, API route, or UI. Required by GDPR Art. 15/20. Session decision #21. |
| 18 | GDPR consent store | Not started | 0 | PC-1 | No `consents` table. No consent tracking. No consent withdrawal mechanism. Session decision #20. |

### Platform Core -- Organisation (PC-3)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 19 | Group CRUD | Done | 100 | 6 | `GroupCreateForm.tsx` (7-step flow), group detail page, group edit page, group list page, group deletion (Danger Zone). |
| 20 | Group types (Individual, Engagement, System) | Done | 100 | 19 | CHECK constraint `('system', 'personal', 'engagement')` on `groups.group_type`. All three types functional. Verified in migration `20260222000000` line 86. |
| 21 | Universal group pattern (ADR-U006) | Done | 100 | 19 | `member_group_id` only (no `user_id`). D15 migration completed. `UNIQUE(group_id, member_group_id)`. |
| 22 | Membership management (invite, accept, leave, remove) | Done | 100 | 19, 6 | `InviteMemberModal.tsx`, `/invitations` page, `leave_group()` RPC, `nominate_steward()` RPC, `pending_email_invitations` table. Full lifecycle: invite, accept, decline, leave (L1/L2/L3), remove. |
| 23 | Role templates and assignment | Done | 100 | 19 | 4 templates (Steward/Guide/Member/Observer), `copy_template_permissions_on_role_create()` trigger, `AssignRoleModal.tsx`, `RoleManagementSection.tsx`. |
| 24 | Permission sets | Done | 100 | 23 | 31 permissions across 6 categories. `permissions` table seeded. `PermissionPicker.tsx` component. |
| 25 | Three-layer permission model (ADR-U007) | Done | 100 | 23, 24 | `has_permission()` two-tier check (system groups + context group). `usePermissions` hook + `hasPermission()` frontend. `can_assign_role()` anti-escalation. |
| 26 | Last leader protection | Done | 100 | 22, 23 | `prevent_last_leader_removal()` trigger + UI guard. Also: `prevent_last_deusex_role_removal()`, `prevent_last_deusex_membership_removal()`. |
| 27 | Personal group (auto-created per FIM) | Done | 100 | 19, 6 | `handle_new_user()` trigger Steps 1-3. `users.personal_group_id` FK. `personal_group_id` immutability trigger. |
| 28 | DeusEx system group | Done | 100 | 20 | Seeded with DeusEx role (all permissions). `auto_grant_permission_to_deusex()` trigger on permissions INSERT. `auto_assign_deusex_role_on_accept()` trigger. `is_platform_admin()` PG17-safe SQL SECURITY DEFINER check. DeusEx member management page at `/admin/deusex`. |
| 29 | Group-in-group: engagement group joins engagement group | Partial | 20 | 19, 21 | **Schema supports it** (`member_group_id` FK allows any group UUID). **NOT functional**: no UI, no transitive permission resolution, no circularity prevention. Session decision #16: full system is Ferd scope. |
| 30 | Circularity prevention trigger (D11) | Not started | 0 | 29 | Designed as BEFORE INSERT trigger with recursive CTE. No trigger exists in any migration. Circular membership is possible at DB level. |
| 31 | Transitive permission resolution in `has_permission()` | Not started | 0 | 29 | `has_permission()` only checks direct membership (depth 1). No recursive CTE walks the membership chain. |
| 32 | Max membership depth setting | Not started | 0 | 29 | D10 design: configurable depth limit, default unlimited. Not implemented. |
| 33 | Subgroup browsing/management UI | Not started | 0 | 29 | No UI for viewing or managing nested group memberships. `InviteMemberModal` only searches users. |
| 34 | Attribution chains for nested membership display | Not started | 0 | 29, 31 | "Mogwai in 'Alpha' in 'Beta'" display pattern. Not implemented. |
| 35 | Group status lifecycle | Partial | 50 | 19 | `groups.status` column exists (active/closed/archived/suspended). RLS filters non-active from non-admins. `leave_group()` sets to 'closed'. But no admin UI to archive, suspend, or reactivate. |

### Platform Core -- Governance (PC-4)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 36 | DeusEx member management | Done | 100 | 28 | `/admin/deusex` page. `DeusexMemberList.tsx`. Add/remove by email. Audit-logged. |
| 37 | DeusEx user management (admin panel) | Partial | 70 | 28 | Admin dashboard with 4 stat cards, paginated user table, 11 context-sensitive action buttons (notify, DM, activate/deactivate, decommission, exit platform, hard delete, force logout, invite/join/remove group). Missing: user detail view, advanced filters. |
| 38 | DeusEx group management | Not started | 0 | 28 | Admin can see all groups via RLS but no dedicated group admin panel. No archive/suspend/reactivate UI. |
| 39 | DeusEx journey management | Not started | 0 | 28, 53 | No admin journey controls. Cannot unpublish, remove, or reassign journeys from admin UI. `is_published` column exists but no toggle. |
| 40 | DeusEx role/permission oversight | Not started | 0 | 28, 23, 24 | No admin view of roles/permissions across all groups. |
| 41 | Audit log table + triggers | Done | 100 | PC-1 | `admin_audit_log` table (immutable). Triggers on group membership changes, DM operations. Indexes on actor, action, created_at. |
| 42 | Audit log viewer UI | Not started | 0 | 41 | Data exists and is populated but **no UI to view it**. Admins must query DB directly. Session decision #18. |
| 43 | Group status management UI (archive, suspend, reactivate) | Not started | 0 | 35 | Column + RLS exist. No admin controls. |
| 44 | Journey admin controls (unpublish, remove) | Not started | 0 | 39 | No admin UI to toggle `is_published` or remove journeys. |
| 45 | Content reporting system (report button + reports table) | Not started | 0 | PC-1 | No `reports` table. No reporting mechanism. Session decision #19. |
| 46 | Content moderation queue (admin review + act on reports) | Not started | 0 | 45 | Depends on reporting system. |
| 47 | Hard delete guard (must call exit_platform first) | Not started | 0 | 37 | `admin_hard_delete_user()` does NOT call `admin_exit_user_from_platform()` first. CASCADE bypasses L2 handover logic. Can leave groups without Steward. |
| 48 | System group management (view FI Members, [Deleted User]) | Not started | 0 | 28 | No admin view for FI Members or [Deleted User] system groups. Only DeusEx is manageable. |
| 49 | Login/session audit trail | Not started | 0 | PC-1 | No record of login events, IP addresses, device info, or failed login attempts. |
| 50 | Fix orphaned groups utility | Done | 100 | 28 | `/admin/fix-orphans` page. Finds/fixes groups without a Steward. |

### Domain Services -- Experience Engine (DS-3)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 51 | Journey data model | Done | 100 | PC-1 | `journeys` table with `title`, `description`, `steps` (JSONB), `is_public`, `is_published`, `created_by_group_id`. |
| 52 | Step type system (extensible, ADR-U008) | Partial | 30 | 51 | Steps are JSONB array inside `journeys.steps`. No separate `journey_steps` table. No `step_type` table or content block model. `StepContent.tsx` and `StepSidebar.tsx` components exist, suggesting some rendering logic. Extension points unclear. |
| 53 | Journey catalog (browse, filter, search) | Done | 100 | 51 | `app/journeys/page.tsx` with published journey listing. |
| 54 | Predefined seed journeys | Done | 100 | 51, 52 | Seeded in migration `20260228111514`. |
| 55 | Individual journey enrollment | Partial | 60 | 51, 6 | `journey_enrollments` table exists. API routes: `/api/v1/journeys/[id]/enroll`, `/api/v1/journeys/enrollments`. `EnrollmentModal.tsx` exists. RLS policies gate non-public journeys. Enrollment works but flow may be incomplete. |
| 56 | Group journey enrollment | Not started | 0 | 51, 19 | Schema has `group_id` on `journey_enrollments` but no group enrollment flow or UI. |
| 57 | Journey content delivery (step-by-step) | Partial | 40 | 52, 55 | `app/journeys/[id]/play/page.tsx` exists. `JourneyPlayer.tsx`, `StepContent.tsx`, `StepSidebar.tsx`, `ProgressBar.tsx` components exist. Basic player structure built, but content rendering completeness unclear. |
| 58 | Journey progress tracking | Partial | 30 | 55, 57 | `journey_enrollments.progress_data` (JSONB). `ProgressBar.tsx` component exists. Progress persistence logic may be incomplete. |
| 59 | Journey pause | Not started | 0 | 58 | `leave_group()` freezes enrollments (status='frozen'). No user-initiated journey pause. |
| 60 | Journey leave (with progress persisted) | Partial | 40 | 58 | `leave_group()` and `admin_exit_user_from_platform()` freeze non-public enrollments with `frozen_reason` + `frozen_at`. Progress is preserved. But no user-initiated "leave this journey" action. |
| 61 | Journey resume (continue where left off) | Not started | 0 | 59, 60 | No resume logic. Frozen enrollments stay frozen. |
| 62 | Journey completion | Not started | 0 | 58 | No completion detection or status transition. |

### Domain Services -- Content (DS-4)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 63 | Content block model (text, media) | Not started | 0 | PC-1 | No `content_blocks` table. Journey steps use inline JSONB. |
| 64 | Media asset storage and delivery | Partial | 40 | PC-1 | Avatar storage works. No general media asset management for journey content or forum posts. |
| 65 | Step content rendering | Partial | 30 | 63, 52 | `StepContent.tsx` component exists. Renders from JSONB steps data. No formal content block system. |

### Domain Services -- Communication (DS-5)

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 66 | Group forum (simple: post, reply) | Partial | 70 | 19, 6 | `forum_posts` table exists (CREATE TABLE in rebuild migration). `ForumSection.tsx`, `ForumComposer.tsx`, `ForumPost.tsx`, `ForumReplyList.tsx` components exist. Rendered within group detail page. Permission-gated via `usePermissions`. Direct Supabase writes (ADR-009 violation). |
| 67 | Forum moderation (Steward) | Partial | 30 | 66, 23 | `forum_posts.is_deleted` soft-delete column exists. Permission checks in `ForumSection.tsx`. No dedicated moderation UI. |
| 68 | Direct messages (1-1) | Partial | 60 | 6 | `conversations` table + `direct_messages` table exist. `app/messages/page.tsx` (conversation list) + `app/messages/[conversationId]/page.tsx` (conversation view). `MessagingContext.tsx` with real-time. `admin_send_notification()` + `MessageModal.tsx` (admin DM). Direct Supabase writes (ADR-009 violation). |
| 69 | Group messages (1-many) | Not started | 0 | 6, 19 | `conversations` table has `participant_1`/`participant_2` (1-1 only). No group messaging schema or UI. |
| 70 | Add/remove member from message group | Not started | 0 | 69 | Depends on group messaging. |
| 71 | Leave message group | Not started | 0 | 69 | Depends on group messaging. |
| 72 | Notification bell (in-app) | Done | 100 | 5 | `NotificationBell` component imported in `Navigation.tsx`. `NotificationContext.tsx` with real-time subscriptions. `notifications` table with 7 trigger-generated types. Badges for messages and invitations in nav. |
| 73 | DM handling on platform exit | Not started | 0 | 68, 14 | No "[Former Member]" display logic for DMs. Hard delete destroys other party's conversation history via CASCADE. No decision documented. |
| 74 | Forum post handling on exit (ADR-U021) | Partial | 70 | 66 | ADR-U021 designed: "Former Member" display based on membership status. `[Deleted User]` sentinel for hard delete. Implementation needs verification of display logic completeness. |

### The Hub -- UI Surface

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 75 | Auth UI (signup, login, logout) | Done | 100 | 6, 7 | Login/signup pages. Auth state management via `AuthContext`. |
| 76 | Visitor browsing experience | Not started | 0 | 8 | No anonymous browsing. Requires visitor sessions. |
| 77 | Profile UI (view, edit, avatar) | Done | 100 | 10 | `app/profile/page.tsx`, `app/profile/edit/page.tsx`, `ProfileEditForm.tsx`, `AvatarUpload.tsx`. |
| 78 | Group management UI | Done | 100 | 19, 22, 23 | Group list, detail, edit, create pages. `GroupCreateForm.tsx` (7-step), `InviteMemberModal.tsx`, `AssignRoleModal.tsx`, `RoleFormModal.tsx`, `RoleManagementSection.tsx`, `PermissionPicker.tsx`. |
| 79 | Group settings UI | Done | 100 | 19 | `app/groups/[id]/edit/page.tsx` with Danger Zone for group deletion. |
| 80 | Navigation bar with real-time updates | Done | 100 | 72 | `Navigation.tsx` with NotificationBell, badge counts for messages and invitations, admin link for DeusEx members. |
| 81 | Confirmation modals | Done | 100 | -- | `components/ui/ConfirmModal.tsx`. Used throughout (never browser `alert()`/`confirm()`). |
| 82 | Error boundaries and error pages | Done | 100 | -- | `components/ui/ErrorBoundary.tsx`. `app/error.tsx`, `app/not-found.tsx` exist. |
| 83 | Journey catalog UI | Done | 100 | 53 | `app/journeys/page.tsx`. Published journey listing. |
| 84 | Journey detail UI | Done | 100 | 53 | `app/journeys/[id]/page.tsx`. Individual journey view. |
| 85 | Journey enrollment UI | Partial | 50 | 55, 56 | `EnrollmentModal.tsx` exists. Individual enrollment via API route. Group enrollment not built. |
| 86 | Journey content delivery UI | Partial | 40 | 57, 65 | `app/journeys/[id]/play/page.tsx` + `JourneyPlayer.tsx`, `StepContent.tsx`, `StepSidebar.tsx`, `ProgressBar.tsx`. Basic player exists but completeness unclear. |
| 87 | Journey progress UI | Partial | 30 | 58 | `ProgressBar.tsx` exists. Progress display may be incomplete. |
| 88 | Journey pause/leave/resume UI | Not started | 0 | 59, 60, 61 | No user-facing journey lifecycle controls. |
| 89 | Forum UI | Partial | 70 | 66, 67 | `ForumSection.tsx`, `ForumComposer.tsx`, `ForumPost.tsx`, `ForumReplyList.tsx`. Embedded in group detail page. Permission-gated. |
| 90 | Direct messaging UI | Partial | 60 | 68 | `app/messages/page.tsx` (list), `app/messages/[conversationId]/page.tsx` (thread). Real-time via MessagingContext. |
| 91 | Group messaging UI | Not started | 0 | 69, 70, 71 | Depends on group messaging backend. |
| 92 | Journal UI (simple CRUD) | Not started | 0 | 12 | Depends on Journal backend. |
| 93 | DeusEx admin dashboard | Partial | 50 | 36, 37 | `app/admin/page.tsx` with user panel + stat cards. `app/admin/deusex/page.tsx` for member management. `app/admin/fix-orphans/page.tsx`. Missing: audit log viewer, group admin, journey admin, moderation queue. |
| 94 | Platform exit UI (settings/account "Leave FringeIsland") | Not started | 0 | 14 | No `/settings` or `/account` page. No "Delete my account" flow. |
| 95 | Data export UI | Not started | 0 | 17 | No data export UI. |
| 96 | Consent management UI | Not started | 0 | 18 | No consent UI. |
| 97 | Content report button (on forum posts, messages, profiles) | Not started | 0 | 45 | No report mechanism. |
| 98 | Audit log viewer page | Not started | 0 | 42 | No audit log viewer. Data exists in DB. |
| 99 | Group status management in admin dashboard | Not started | 0 | 43 | No group admin controls. |
| 100 | Journey admin controls in admin dashboard | Not started | 0 | 44 | No journey admin controls. |
| 101 | Moderation queue page | Not started | 0 | 46 | No moderation queue. |
| 102 | Group-in-group management UI (add group to group, view nested) | Not started | 0 | 29, 33 | No group-in-group UI. InviteMemberModal only searches users. |
| 103 | Invitations page | Done | 100 | 22 | `app/invitations/page.tsx`. View and respond to group invitations. Badge count in navigation. |

### Design System

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 104 | Base component library (buttons, inputs, cards) | Partial | 50 | -- | `AdminStatCard.tsx` for cards. Tailwind utility classes used throughout. No formal `Button`, `Input`, `Card` primitives in `components/ui/`. |
| 105 | Modal system | Done | 100 | -- | `ConfirmModal.tsx` in `components/ui/`. Multiple domain-specific modals (GroupPickerModal, NotifyModal, MessageModal, EnrollmentModal, etc.). |
| 106 | Navigation components | Done | 100 | -- | `Navigation.tsx` with responsive design, permission-based visibility, badge counts, admin link. |
| 107 | Form components | Partial | 40 | -- | `GroupCreateForm.tsx` (7-step), `ProfileEditForm.tsx`, `RoleFormModal.tsx`. No shared form primitives. |

### Cross-cutting / Verticals

| ID | Capability | Status | % | Depends on | Notes |
|----|-----------|--------|---|------------|-------|
| 108 | Privacy / GDPR compliance | Partial | 15 | 14-18 | `docs/verticals/privacy.md` scaffold exists (wave Ferd). No consent store, no data export, no PII scrubbing, no self-service exit. Hard delete exists for right-to-erasure (admin-initiated only). Forum anonymisation via ADR-U021. |
| 109 | Observability | Partial | 30 | 41, 49 | Audit log table + triggers exist. No audit log viewer. No login audit trail. No system health dashboard. No error tracking integration. |
| 110 | Administration | Partial | 50 | 36-50 | User management panel functional. DeusEx member management done. Fix-orphans utility done. Missing: group admin, journey admin, audit viewer, moderation, system group views. |

---

## Launch Blockers

| # | Blocker | Severity | Capability IDs | Notes |
|---|---------|----------|---------------|-------|
| 1 | **No self-service platform exit** | CRITICAL | 14, 94 | GDPR Art. 17: erasure must be as easy as consent. Sign-up is self-service; deletion requires contacting an admin. |
| 2 | **PII survives decommission** | CRITICAL | 15, 16 | `email`, `full_name`, `bio`, `avatar_url`, personal group `name`, `auth.users` record all survive. Direct GDPR violation. |
| 3 | **No GDPR consent store** | HIGH | 18, 96 | No record of what users consented to or when. No withdrawal mechanism. GDPR Art. 7. |
| 4 | **No data export** | HIGH | 17, 95 | No user data portability. GDPR Art. 15/20. |
| 5 | **Hard delete bypasses group unwinding** | HIGH | 47 | `admin_hard_delete_user()` does not call `admin_exit_user_from_platform()`. CASCADE bypasses L2 Steward handover. Groups left without Steward. |
| 6 | **Journey lifecycle incomplete** | HIGH | 55-62, 85-88 | Enrollment partially works but pause, resume, completion are missing. Cannot deliver core promise: "experience a journey step by step." |
| 7 | **No content reporting/moderation** | HIGH | 45, 46, 97, 101 | Forum and DM exist with no mechanism to report or moderate content. Safety risk for user-generated content platform. |
| 8 | **ADR-009 violations (28 files)** | MEDIUM | -- | 28 frontend files make direct `.from()` Supabase calls. Only 4 API routes exist. Binding rule (2026-04-05): all new Ferd 1.6 features must follow architecture anatomy. Existing violations must be refactored pre-launch. |
| 9 | **Group-in-group functionally inert** | MEDIUM | 29-34, 102 | Schema allows it. Permission system, safety mechanisms, and UI do not support it. Session decision #16 makes this Ferd scope. Largest architectural debt. |
| 10 | **Audit log has no viewer** | MEDIUM | 42, 98 | Data collected but invisible to admins. |

---

## Key Dependency Chains

```
PC-1 (Infrastructure)
 |
 +-> PC-2 (Identity)
 |    |
 |    +-> 14 (Self-service exit) --> 15 (PII scrub) --> 16 (Auth cleanup)
 |    +-> 17 (Data export) --> 95 (Export UI)
 |    +-> 18 (Consent store) --> 96 (Consent UI)
 |    +-> 12 (Journal) --> 92 (Journal UI)
 |    +-> 8 (Visitor sessions) --> 9 (State transfer) --> 76 (Visitor UI)
 |
 +-> PC-3 (Organisation)
 |    |
 |    +-> 29 (Group-in-group) --> 30 (Circularity) --> 31 (Transitive perms)
 |    |                        --> 33 (Subgroup UI) --> 34 (Attribution)
 |    |
 |    +-> 35 (Group status) --> 43 (Status mgmt UI)
 |
 +-> PC-4 (Governance)
 |    |
 |    +-> 42 (Audit viewer) --> 98 (Audit UI page)
 |    +-> 45 (Reporting) --> 46 (Mod queue) --> 101 (Mod UI)
 |    +-> 47 (Hard delete guard)
 |    +-> 49 (Login audit trail)
 |
 +-> DS-3 (Experience Engine)
 |    |
 |    +-> 55 (Individual enroll) --> 57 (Content delivery) --> 58 (Progress)
 |    |                          --> 62 (Completion)
 |    +-> 58 --> 59 (Pause) --> 61 (Resume)
 |    +-> 58 --> 60 (Leave)
 |    +-> 56 (Group enroll) --> 85 (Enroll UI)
 |
 +-> DS-4 (Content)
 |    +-> 63 (Content blocks) --> 65 (Step rendering) --> 57
 |
 +-> DS-5 (Communication)
      +-> 66 (Forum) --> 67 (Moderation) --> 74 (Exit handling)
      +-> 68 (DM 1-1) --> 69 (Group msg) --> 70/71 (Add/remove/leave)
      +-> 73 (DM exit handling)

CRITICAL PATH:
  PC-1 --> PC-2 --> PC-3 --> DS-3 (enroll/deliver/progress/complete)
  --> Hub journey UI (85-88)

GDPR PATH (parallel, mandatory before launch):
  PC-2 --> 14 (self-service exit) + 15 (PII scrub) + 17 (data export) + 18 (consent)
```

---

## Architecture Compliance Issues

### ADR-009 Violations (API-first pattern)

28 frontend files make direct Supabase `.from()` calls instead of going through API routes. Only 4 API routes exist:

**API routes that DO exist (compliant):**
- `GET /api/admin/users` -- server-side paginated user listing
- `POST /api/invitations/send-email` -- email invitation sending
- `POST /api/v1/journeys/[id]/enroll` -- journey enrollment
- `GET /api/v1/journeys/enrollments` -- enrollment listing

**Major violators (direct DB access from frontend):**
- `components/groups/GroupCreateForm.tsx` -- 7-step group creation with direct inserts
- `components/groups/InviteMemberModal.tsx` -- user search + membership insert
- `components/groups/forum/ForumSection.tsx` -- forum CRUD
- `app/messages/[conversationId]/page.tsx` -- DM read/write
- `components/profile/ProfileEditForm.tsx` -- profile updates
- `app/admin/page.tsx` -- admin operations (RPC calls)
- All journey pages -- catalog, detail, play

**Binding rule (REQUIREMENTS.md, 2026-04-05):** All new Ferd 1.6 features must follow architecture anatomy. Existing violations must be refactored pre-launch.

### Permission Enforcement

**Where `has_permission` / `usePermissions` is used (10 files):**
- `app/admin/layout.tsx` -- admin gate
- `app/api/invitations/send-email/route.ts` -- invitation permission check
- `app/api/v1/journeys/[id]/enroll/route.ts` -- enrollment permission check
- `app/groups/[id]/edit/page.tsx` -- group edit permission
- `app/groups/[id]/page.tsx` -- group detail permissions
- `components/groups/forum/ForumSection.tsx` -- forum posting permissions
- `components/journeys/EnrollmentModal.tsx` -- enrollment permissions
- `components/Navigation.tsx` -- admin link visibility
- `lib/admin/admin-users-query.ts` -- admin query authorization
- `lib/hooks/usePermissions.ts` -- hook definition

**Gap:** Permission checks rely on direct `has_permission()` RPC calls from the frontend in several cases. These should be server-side checks in API routes per ADR-009.

### Platform Exit Integrity

`admin_exit_user_from_platform()` verified in migration `20260228144747`:
- **Handles:** L1 (regular leave), L2 (sole Steward handover to DeusEx), L3 (last member, group closure)
- **Handles:** Enrollment freezing, session/token deletion, audit logging
- **Does NOT handle:** System group cleanup (FI Members membership survives), PII scrubbing, auth.users record deletion, public journey enrollment freezing, Storage file deletion

---

## Gap Analysis

### Missing Platform Capabilities (need feature specs)

| Category | Capabilities | IDs |
|----------|-------------|-----|
| GDPR/Privacy | Self-service exit, PII scrubbing, auth cleanup, data export, consent store | 14-18 |
| Group-in-group | Circularity prevention, transitive permissions, depth setting, subgroup UI, attribution | 29-34 |
| Governance | Audit viewer, group status UI, journey admin, content reporting, moderation queue, hard delete guard, system group mgmt, login audit | 42-49 |
| Journey lifecycle | Group enrollment, pause, resume, completion | 56, 59, 61, 62 |
| Content | Content block model | 63 |
| Communication | Group messaging (1-many), DM exit handling | 69-71, 73 |
| Visitor | Anonymous sessions, state transfer | 8-9 |
| Journal | Simple CRUD | 12 |
| Feature flags | Infrastructure | 4 |

### Missing Product Features (need feature specs)

All Hub UI for the above platform capabilities: IDs 76, 88, 91-92, 94-102.

### Missing Specs for Already-Built Work (retroactive documentation)

These features are built and working but have no feature specification:
- Auth UI (signup, login, logout)
- User profiles (CRUD, avatar)
- Group management (CRUD, invite, accept, leave, remove, roles, permissions)
- Journey catalog + detail pages
- Forum (post, reply) within groups
- Direct messaging (1-1)
- Navigation with notification bell
- Confirmation modals and error boundaries
- Admin dashboard + DeusEx member management
- Invitations page

---

## Built vs Designed Summary

| Category | Done | Partial | Not started | Total |
|----------|------|---------|-------------|-------|
| Platform Core -- Infrastructure (PC-1) | 3 | 1 | 1 | **5** |
| Platform Core -- Identity (PC-2) | 4 | 1 | 4 | **9** |
| Platform Core -- Organisation (PC-3) | 9 | 2 | 6 | **17** |
| Platform Core -- Governance (PC-4) | 3 | 1 | 11 | **15** |
| Domain Services -- Experience Engine (DS-3) | 3 | 4 | 5 | **12** |
| Domain Services -- Content (DS-4) | 0 | 2 | 1 | **3** |
| Domain Services -- Communication (DS-5) | 1 | 3 | 5 | **9** |
| Hub UI | 8 | 5 | 14 | **27** |
| Design System | 2 | 2 | 0 | **4** |
| Cross-cutting / Verticals | 0 | 3 | 0 | **3** |
| **Total** | **33** | **24** | **47** | **104** |

**Ferd needs 104 capabilities. 33 are done (32%), 24 are partial (23%), 47 are not started (45%).**

**Effective completion (Done + weighted Partial):** 33 + (sum of partial percentages / 100) = approximately **43 capability-equivalents out of 104 = ~41% complete.**

---

## Appendix: File Reference Index

### Key Migrations
| Migration | Purpose |
|-----------|---------|
| `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` | Core schema: all 19 tables, RPCs, triggers, RLS, seeds |
| `supabase/migrations/20260222131712_add_avatar_url_to_groups.sql` | Avatar URL on groups |
| `supabase/migrations/20260223075926_*.sql` | Personal group immutability |
| `supabase/migrations/20260223140126_enhanced_member_invitations.sql` | Pending email invitations |
| `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql` | Admin RPCs, `is_platform_admin()` |
| `supabase/migrations/20260224205639_fix_hard_delete_leader_trigger_bypass.sql` | Hard delete fixes |
| `supabase/migrations/20260227120843_seed_deleted_user_sentinel_group.sql` | [Deleted User] sentinel |
| `supabase/migrations/20260228102720_sprint0_security_fixes.sql` | Enrollment RLS |
| `supabase/migrations/20260228111514_sprint1_foundation_schema.sql` | Group status, seed journeys |
| `supabase/migrations/20260228120745_sprint2_leave_group_core.sql` | `leave_group()` RPC |
| `supabase/migrations/20260228125730_sprint3_smart_notifications.sql` | `nominate_steward()`, notification enhancements |
| `supabase/migrations/20260228144747_sprint4_platform_exit.sql` | `admin_exit_user_from_platform()` |

### Application Code
| Path | Purpose |
|------|---------|
| `app/admin/` | 4 admin pages (layout, dashboard, deusex, fix-orphans) |
| `app/api/` | 4 API routes (admin/users, invitations/send-email, journeys/enroll, journeys/enrollments) |
| `app/groups/` | 4 pages (list, detail, edit, create) |
| `app/journeys/` | 3 pages (catalog, detail, play) |
| `app/messages/` | 2 pages (list, conversation) |
| `app/profile/` | 2 pages (view, edit) |
| `app/invitations/` | 1 page (invitation list) |
| `components/admin/` | 7 admin components |
| `components/groups/` | 6 group components + 4 forum components |
| `components/journeys/` | 5 journey components |
| `components/profile/` | 2 profile components |
| `components/notifications/` | NotificationBell |
| `components/ui/` | ConfirmModal, ErrorBoundary |
| `lib/admin/` | 4 admin utility modules |
| `lib/auth/` | AuthContext |
| `lib/hooks/` | usePermissions |
| `lib/messaging/` | MessagingContext |
| `lib/notifications/` | NotificationContext |
| `lib/supabase/` | client.ts, server.ts |

### Key Functions
| Function | Location | Purpose |
|----------|----------|---------|
| `has_permission()` | Migration `20260222000000` | Two-tier RBAC check (SECURITY DEFINER) |
| `is_platform_admin()` | Migration `20260223171200` | PG17-safe admin check (SQL SECURITY DEFINER) |
| `can_assign_role()` | Migration `20260222000000` | Anti-escalation check |
| `leave_group()` | Migration `20260228120745` | Self-service group leave (L1/L2/L3) |
| `nominate_steward()` | Migration `20260228125730` | Stewardship handover |
| `admin_exit_user_from_platform()` | Migration `20260228144747` | Admin-initiated platform exit |
| `admin_hard_delete_user()` | Migration `20260223171200` | Hard delete with content reassignment |
| `handle_new_user()` | Migration `20260222000000` | Personal group creation, FI Members enrollment, pending invitation claim |
