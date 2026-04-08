# Ferd — Requirements

**Version:** v0.2.37  
**Wave:** Ferd 1.6 (Polish & Launch)  
**Last Updated:** 2026-04-05  
**Based on:** ACTUAL_STATE.md analysis + PRODUCT_SPEC v2.0 alignment

---

## Document Overview

This document defines **all requirements** for Ferd, the Wave 1 web platform. Requirements are organized into three categories:

- 📋 **Functional Requirements** — What the system does (features)
- ⚙️ **Non-Functional Requirements** — How well it performs (quality attributes)
- 🏗️ **Architectural Requirements** — Technical debt and compliance

---

## Binding Architecture Rule (Ferd 1.6+)

**All new features must follow the architecture anatomy.** Decided 2026-04-05.

Every new Ferd 1.6 feature (FR-L1-004, FR-L1-005, FR-L1-010, FR-L5-006, FR-L5-009, FR-L5-010, and any future additions) must be built with:

1. **API routes for all write operations** — ADR-009 compliance. No direct Supabase writes from .tsx files.
2. **Proper layer boundaries** — L0 (infra) < L1 (identity) < L2 (organisation) < L3 (experience). No layer skipping.
3. **Permission enforcement** — every gated action must check permissions in both RLS and frontend.
4. **Vertical coverage** — V1 (admin), V3 (notifications) hooks included from the start, not bolted on later.

Existing code with ADR-009 violations must be refactored pre-launch (see AR-001). New code must not add to the debt. The codebase must follow the architecture anatomy before Ferd ships.

---

## Status Legend

- ✅ **Done** — Implemented, tested, functional
- 🔄 **In Progress** — Partially implemented or being refined
- 📋 **Planned** — In backlog for Ferd (Wave 1)
- ⏸️ **Deferred** — Postponed to Wave TBD — pending work package redistribution (see WAVE_REDISTRIBUTION.md)
- 🚨 **Broken** — Exists but not functional (needs immediate fix)
- ❌ **Rejected** — Decided not to implement

---

## Summary Statistics

### By Category

| Category | Total | ✅ Done | 🔄 In Progress | 📋 Planned | ⏸️ Deferred | 🚨 Broken |
|----------|-------|---------|----------------|------------|-------------|-----------|
| **📋 Functional** | 77 | 33 (43%) | 14 (18%) | 12 (16%) | 18 (23%) | 0 |
| **⚙️ Non-Functional** | 18 | 8 (44%) | 6 (33%) | 2 (11%) | 2 (11%) | 0 |
| **🏗️ Architectural** | 5 | 0 | 3 (60%) | 2 (40%) | 0 | 0 |
| **TOTAL** | **100** | **41** | **23** | **16** | **20** | **0** |

### By Layer/Vertical

| Layer/Vertical | Total | ✅ Done | 🔄 In Progress | 📋 Planned | ⏸️ Deferred |
|----------------|-------|---------|----------------|------------|-------------|
| L0 Infrastructure | 7 | 4 | 1 | 1 | 1 |
| L1 Identity | 10 | 4 | 1 | 3 | 2 |
| L2 Organisation | 15 | 9 | 4 | 0 | 2 |
| L3 Experience Engine | 12 | 4 | 4 | 0 | 4 |
| L4 Content | 5 | 0 | 0 | 0 | 5 |
| L5 Communication | 10 | 4 | 1 | 3 | 2 |
| L6 Discovery | 3 | 0 | 0 | 0 | 3 |
| L7 Intelligence | 3 | 0 | 0 | 0 | 3 |
| V1 Administration | 18 | 6 | 4 | 0 | 8 |
| V2 Privacy/GDPR | 6 | 0 | 1 | 0 | 5 |
| V3 Notifications | 5 | 2 | 1 | 1 | 1 |
| V4 Observability | 4 | 1 | 2 | 0 | 1 |
| V5 Transactions | 5 | 0 | 0 | 0 | 5 |

### Critical Issues

| Severity | Count | Items |
|----------|-------|-------|
| 🚨 **CRITICAL** | 3 | Email delivery broken (FR-L0-008), ADR-009 violations (40+), Accessibility gaps |
| ⚠️ **HIGH** | 6 | Permission enforcement shallow (21%), API surface 15%, No audit log viewer, Browser alert() calls, Admin god-file, Block/report users missing (safety) |
| 📋 **MEDIUM** | 8 | Group deletion cascade, GDPR compliance, Group DMs, Announcements, i18n framework, etc. |

---

## Table of Contents

### 📋 Functional Requirements
1. [L0: Infrastructure](#l0-infrastructure)
2. [L1: Identity & Authentication](#l1-identity--authentication)
3. [L2: Organisation](#l2-organisation)
4. [L3: Experience Engine](#l3-experience-engine)
5. [L4: Content](#l4-content)
6. [L5: Communication](#l5-communication)
7. [L6: Discovery](#l6-discovery)
8. [L7: Intelligence](#l7-intelligence)
9. [V1: Administration](#v1-administration)
10. [V2: Privacy & GDPR](#v2-privacy--gdpr)
11. [V3: Notifications](#v3-notifications)
12. [V4: Observability](#v4-observability)
13. [V5: Transactions](#v5-transactions)

### ⚙️ Non-Functional Requirements
1. [Performance](#performance)
2. [Security](#security)
3. [Accessibility](#accessibility)
4. [Usability](#usability)
5. [Reliability](#reliability)
6. [Scalability](#scalability)
7. [Maintainability](#maintainability)

### 🏗️ Architectural Requirements
1. [Compliance & Debt](#architectural-compliance--debt)

---

# 📋 Functional Requirements

---

## L0: Infrastructure

### FR-L0-001: Supabase Backend Platform
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Managed backend platform (Supabase) provides database, auth, storage, and real-time.

**Evidence:**
- Supabase project: `https://jveybknjawtvosnahebd.supabase.co`
- 19 tables, all with RLS
- Storage buckets configured

---

### FR-L0-002: PostgreSQL Database
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** PostgreSQL 15 database for all persistent data.

**Evidence:**
- 19 tables created
- Indexes on all FK relationships
- Triggers for automation

---

### FR-L0-003: Row Level Security (RLS)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** RLS enabled on all tables, enforced at database level.

**Evidence:**
- All 19 tables have RLS enabled
- No bypass paths found (verified by Claude Code)
- `has_permission()` SECURITY DEFINER function
- `is_platform_admin()` SECURITY DEFINER function

---

### FR-L0-004: Supabase Auth System
**Status:** ✅ Done  
**Completeness:** 95%

**Description:** Authentication via Supabase Auth (JWT, sessions).

**What Works:**
- ✅ Email/password auth
- ✅ Session management
- ✅ JWT tokens
- ✅ Protected routes

**What's Missing:**
- ⏸️ Anonymous sign-in (configured but not used)
- ⏸️ Social login (not configured)

---

### FR-L0-005: Supabase Storage
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Object storage for user uploads and media assets.

**Buckets:**
- `avatars` — User and group avatars
- RLS policies on buckets

---

### FR-L0-006: pg_cron Scheduled Jobs
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Database-level scheduled jobs for maintenance.

**Planned Jobs:**
- Temporary profile cleanup (delete abandoned visitors after 30 days)
- Data retention enforcement
- Audit log archival

**Why Not Done:**
- No visitor profiles yet (job not needed)
- Can launch without this

**Priority:** LOW (add when visitor profiles built)

---

### FR-L0-007: Feature Flags System
**Status:** ⏸️ Deferred  
**Layer:** L0  
**Reason:** Not needed for Ferd

**Description:** Database table for enabling/disabling features per environment or user segment.

**Why Deferred:**
- Needed for Ferd → Hamn transition
- Useful for testing in production
- Not critical for Ferd launch

**Revisit:** Hamn M1

---

### FR-L0-008: Email Service Integration
**Status:** 🚨 Broken  
**Completeness:** 10% (stub only)

**Description:** Transactional email service for auth emails, invitations, notifications.

**Current State:**
- 🚨 **Email delivery is `console.log` only**
- ❌ No email templates (only console.log stub in `lib/email/send.ts`)
- ❌ Resend not wired up
- ❌ SMTP not configured

**Impact:** Group invitations silently fail!

**Fix Required:**
1. Configure Resend API key
2. Wire up `lib/email/send.ts`
3. Test invitation flow

**Effort:** 2-4 hours  
**Priority:** 🔥 CRITICAL (launch blocker)

**See:** ACTUAL_STATE.md — "Email delivery is a stub"

---

### FR-L0-009: Internationalization (i18n) Framework
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** i18n library integration with Next.js 16 App Router, string externalization, locale file structure. English as default locale; additional languages added in Hamn.

**Current:**
- ❌ No `next.config.js` i18n
- ❌ No translation files
- ❌ Strings not externalized

**Scope (Ferd):**
- i18n library integration (e.g., next-intl)
- All user-facing strings extracted to locale files
- English locale complete
- Language switching infrastructure in place (even if only English available)

**Note:** Retrofitting i18n is 3-5x more expensive than building from start. Doing the framework now (Ferd 1.6) avoids that cost for Hamn.

**Priority:** MEDIUM (Ferd 1.6)

---

### FR-L0-010: Backup & Disaster Recovery
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Automated database backups via Supabase.

**Evidence:**
- Supabase provides automatic backups
- Point-in-time recovery available

---

### FR-L0-011: AI Provider Integration
**Status:** ⏸️ Deferred  
**Reason:** L7 Intelligence (Wave 2)

**Description:** Anthropic API integration for AI Mentor.

**Current:**
- ❌ Not configured
- ❌ Not used anywhere

**Revisit:** Hamn (L7 Intelligence)

---

## L1: Identity & Authentication

### FR-L1-001: User Registration (Email/Password)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can register with email + password.

**Acceptance Criteria:**
- ✅ Registration form
- ✅ Email validation
- ✅ Password requirements
- ✅ Email verification flow
- ✅ Profile auto-created (`on_auth_user_created` trigger)
- ✅ Personal group auto-created

**Evidence:**
- 5 auth test files
- 659 tests passing
- API routes for auth

**Compliance:** ✅ ADR-009 (auth handled by Supabase)

---

### FR-L1-002: User Login/Logout
**Status:** ✅ Done  
**Completeness:** 100%

**Acceptance Criteria:**
- ✅ Email/password login
- ✅ JWT session management
- ✅ Logout clears session
- ✅ Session persistence
- ✅ Protected routes

---

### FR-L1-003: Social Login (Google/GitHub/etc.)
**Status:** ⏸️ Deferred  
**Reason:** Not needed for Ferd

Email/password sufficient. Social login adds complexity without clear value for initial users.

**Revisit:** Hamn M2

---

### FR-L1-004: Visitor/Shadow Experience
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Anonymous browsing and taster journeys without account creation. Visitors get temporary sessions/profiles, can try curated taster journeys, and convert to full accounts with all progress carried forward.

**Current:**
- ❌ No anonymous sign-in flow
- ❌ No temporary profiles
- ❌ No taster journeys defined
- ✅ Supabase anonymous sign-in configured (not wired up)

**Acceptance Criteria:**
- Visitors can browse journey catalog without signup
- Taster journeys (curated subset) playable without account
- Temporary profile data persists across session
- On registration, all visitor data carries forward (no data loss)
- RLS policies handle anonymous/temporary sessions securely
- Clear conversion prompts at natural engagement points

**Dependencies:**
- FR-L0-006 (pg_cron) — cleanup job for abandoned temporary profiles

**Priority:** HIGH (Ferd 1.6 — key differentiator for user acquisition)

---

### FR-L1-005: profile_data Table (Dynamic Profile Data)
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Flexible data storage for journey engagement, reflections, assessments, and insights. Foundation for travel log, L7 Intelligence, and Whisp fidelity model.

**Schema (defined in ADR-U005):**
```sql
profile_data (
  user_id, bucket, source, source_id, content jsonb, visibility
)
```

**Acceptance Criteria:**
- Schema implemented per ADR-U005
- RLS policies tested (private by default, owner-read, admin-read)
- Admin actions (decommission, hard delete) cascade correctly
- Basic data population from journey engagement validated
- Integration with travel log (FR-L1-010)

**Dependencies:**
- Required by: FR-L1-010 (Travel Log), FR-L3-009 (Assessment step type)
- Foundation for: L7 Intelligence (Hamn)

**Priority:** HIGH (Ferd 1.6 — enables travel log and reflection features)

---

### FR-L1-006: Profile Viewing
**Status:** ✅ Done  
**Completeness:** 100%

**Acceptance Criteria:**
- ✅ User can view own profile
- ✅ Display name shown
- ✅ Avatar displayed
- ✅ Profile page exists

---

### FR-L1-007: Profile Editing
**Status:** 🔄 In Progress  
**Completeness:** 80%

**What Works:**
- ✅ Edit full name (synced to personal group via trigger)
- ✅ Avatar upload to Supabase Storage
- ✅ Profile edit form component

**What's Missing:**
- ❌ Bio field (planned but not verified — may or may not exist in current schema)
- ❌ User preferences/settings

**Next Steps:**
- Verify bio field in profiles table; add if missing
- Add preferences table

**Compliance:** ❌ ADR-009 violation — direct Supabase write from `ProfileEditForm.tsx`

---

### FR-L1-008: Account Deletion (Self-Service)
**Status:** ⏸️ Deferred  
**Reason:** GDPR/Privacy (V2) feature

**Description:** User can delete their own account.

**Current:**
- ❌ No self-service deletion
- ✅ Admin can decommission/hard-delete users

**Why Deferred:**
- Requires GDPR compliance work (data export first)
- Needs cascade specification
- Not critical for launch

**Revisit:** When implementing V2 Privacy features

---

### FR-L1-009: Display Name / Nickname System
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can set a nickname and choose whether to display their real name or nickname throughout the platform.

**What Works:**
- ✅ Nickname field on profiles table
- ✅ Display preference toggle (real name vs nickname)
- ✅ `display_name` computed column
- ✅ Real name visibility control
- ✅ Profile edit form supports nickname + preference
- ✅ Platform-wide display name resolution

**Evidence:**
- 28 dedicated tests
- Implemented in v0.2.30
- Full TDD sprint documented

**See:** `docs/products/ferd/development/features/FR-display-name-system.md`

---

### FR-L1-010: Travel Log / Journal
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Personal record of journey progress, completions, and reflections. Members can view their growth over time through a chronological log of their journey history.

**Acceptance Criteria:**
- Members can view their complete journey history (enrollments, progress, completions)
- Reflection entries tied to journey steps (stored in profile_data)
- Private by default (viewable only by the member unless explicitly shared)
- Chronological and journey-grouped views available
- Travel log accessible from profile page

**Dependencies:**
- FR-L1-005 (profile_data table) — reflections stored in profile_data
- FR-L3-006 (Journey Progress Tracking) — sources progress data

**Priority:** MEDIUM (Ferd 1.6)

---

## L2: Organisation

### FR-L2-001: Group Creation
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can create groups for organizing collective journeys.

**Acceptance Criteria:**
- ✅ Create group with name, description, avatar
- ✅ Creator becomes Steward automatically
- ✅ Universal Group Pattern (D15) implemented
- ✅ Privacy settings (public/private/invite-only)
- ✅ Personal groups auto-created on registration

**Evidence:**
- 10 group test files
- Universal Group Pattern verified

**Compliance:** ❌ ADR-009 violation — direct Supabase writes

**See:** ACTUAL_STATE.md — "No API routes for groups"

---

### FR-L2-002: Group Editing
**Status:** ✅ Done  
**Completeness:** 90%

**What Works:**
- ✅ Steward can edit group name, description, avatar
- ✅ Permission gated (`edit_group_settings`)
- ✅ Changes saved to database

**What's Missing:**
- ⚠️ No admin override (admin can't edit any group)
- ⚠️ Limited audit trail

**Compliance:** ❌ ADR-009 violation

---

### FR-L2-003: Group Deletion
**Status:** 🔄 In Progress  
**Completeness:** 85%

**What Works:**
- ✅ Steward can delete own group
- ✅ Soft-delete (mark inactive, preserve data)
- ✅ Members notified via `group_deleted` notification
- ✅ Cascade behavior works (memberships cleaned up)
- ✅ Admin hard-delete available (via DeusEx admin panel)

**What's Missing:**
- ⚠️ Orphan group recovery (groups lose last Steward — known issue)
- ❌ Self-serve hard-delete not available (admin-only)

**Next Steps:**
- Complete cascade specification
- Verify enrollment cleanup
- Add admin delete capability

**See:** ACTUAL_STATE.md — "Admin capability matrix"

---

### FR-L2-004: Group Membership — Join
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can join groups (via invitation or public groups).

**What Works:**
- ✅ Accept invitation flow
- ✅ User's personal group joins the group
- ✅ Role assigned automatically (Member by default)

---

### FR-L2-005: Group Membership — Leave
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Members can voluntarily leave groups.

**What Works:**
- ✅ Leave group button
- ✅ Confirmation dialog
- ✅ Steward notified via `member_left` notification
- ✅ Can't leave if you're the only Steward (protected)

**Evidence:**
- Leave group tests passing

---

### FR-L2-006: Group Membership — Remove
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Stewards can remove members from groups.

**What Works:**
- ✅ Remove member action
- ✅ Permission gated (`remove_members`)
- ✅ Member notified via `member_removed` notification
- ✅ RLS enforced

---

### FR-L2-007: Group Invitations
**Status:** 🔄 In Progress  
**Completeness:** 75% (UI + notifications work, email delivery broken)

**What Works:**
- ✅ Steward can generate invite
- ✅ Invite link creation
- ✅ Accept/decline flow
- ✅ Smart notifications (invitation, accepted, declined)
- ✅ Permission gated (`invite`)

**What's Broken:**
- 🚨 **Email delivery is `console.log` only** — invites silently fail!

**Critical Fix:** Wire up Resend email service

**See:** FR-L0-008 (Email Service Integration)

**Compliance:** ❌ ADR-009 violation

---

### FR-L2-008: Role Templates
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Four system-defined role templates.

**Templates:**
1. **Steward** — Full group management
2. **Guide** — Journey facilitation
3. **Member** — Standard participation
4. **Observer** — Read-only

**Evidence:**
- Templates seeded in database
- 13 RBAC test files

---

### FR-L2-009: Permission System
**Status:** ✅ Done  
**Completeness:** 100% (schema), 21% (enforcement)

**Description:** 39 system-defined permissions across 6 categories.

**Schema Complete:**
- ✅ 39 permissions defined
- ✅ Permission categories: Group Management (15), Journey Management (10), Journey Participation (6), Communication (5), Feedback (3), Platform Admin (5)
- ✅ `has_permission()` SECURITY DEFINER function exists

**Enforcement Incomplete:**
- ✅ 8/39 permissions fully enforced (RLS + frontend)
- ⚠️ 5/39 partial (RLS only)
- ❌ 26/39 defined but never checked

**See:** FR-L2-010 (Permission Enforcement) and ACTUAL_STATE.md permission table

---

### FR-L2-010: Permission Enforcement
**Status:** 🔄 In Progress  
**Completeness:** 21% (8/39 enforced)

**Description:** Permissions checked in RLS policies AND frontend UI.

**Fully Enforced (8):**
- `invite`, `assign_roles`, `manage_roles`, `edit_group_settings`, `delete_group`
- `enroll_group_in_journey`
- `moderate_forum`
- `manage_all_groups` (admin)

**Partial (5):**
- `view_member_list`, `remove_members` (RLS only or frontend only)
- `view_forum`, `post_forum_messages`, `reply_to_messages` (RLS only)

**Not Checked (26):**
- All Journey Management authoring permissions (9)
- All Journey Participation permissions (6)
- Most Group Management permissions (8)
- Platform Admin permissions (4)

**Next Steps:**
1. Add frontend checks using `usePermissions` hook
2. Verify RLS policies enforce all permissions
3. Priority: Journey + Communication permissions

**See:** ACTUAL_STATE.md — Permission enforcement table

---

### FR-L2-011: Role Assignment
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Stewards can assign/remove roles from members.

**What Works:**
- ✅ Assign role to member
- ✅ Remove role from member
- ✅ Permission gated (`assign_roles`)
- ✅ Member notified via `role_assigned` notification
- ✅ One role per member per group (enforced by UNIQUE constraint)

---

### FR-L2-012: Role Customization
**Status:** ✅ Done  
**Completeness:** 90%

**Description:** Stewards can customize roles within their groups.

**What Works:**
- ✅ Customize role permissions
- ✅ Roles are group-scoped
- ✅ Permission array stored as JSONB
- ✅ Changes apply immediately

**What's Missing:**
- ⚠️ No role template management UI for admins

---

### FR-L2-013: DeusEx Platform Admin Group
**Status:** ✅ Done  
**Completeness:** 85%

**Description:** Platform super-admin group for lifecycle edge cases.

**What Works:**
- ✅ DeusEx group exists in database
- ✅ `is_platform_admin()` SECURITY DEFINER function
- ✅ Admin dashboard
- ✅ User activation/deactivation
- ✅ Soft-delete (decommission)
- ✅ Force logout
- ✅ Platform exit
- ✅ Fix orphaned groups
- ✅ Audit log (16 action types)
- ✅ DeusEx member management

**What's Missing:**
- ❌ No group CRUD for admin
- ❌ No journey management for admin
- ❌ No audit log viewer (data exists, no UI)

**See:** V1-001 through V1-012 (Administration requirements)

---

### FR-L2-014: Stewardship Transfer
**Status:** 🔄 In Progress  
**Completeness:** 70%

**Description:** Stewards can nominate successors and transfer stewardship.

**What Works:**
- ✅ Steward can nominate successor
- ✅ Transfer on exit (basic)

**What's Missing:**
- ⚠️ No admin override for transfer
- ⚠️ Orphaned group handling relies on admin manual fix

**See:** V1-006 (Fix Orphaned Groups)

---

### FR-L2-015: Group Privacy Settings
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Groups can be public, private, or invite-only.

**What Works:**
- ✅ Privacy setting on group creation
- ✅ RLS enforces privacy
- ✅ Public groups browsable by all
- ✅ Private/invite-only hidden from non-members

---

## L3: Experience Engine

### FR-L3-001: Journey Catalog
**Status:** ✅ Done  
**Completeness:** 90%

**Description:** Browsable collection of available journeys.

**What Works:**
- ✅ 8 pre-authored journeys seeded
- ✅ Browse catalog page
- ✅ Journey cards with title, description, thumbnail
- ✅ Difficulty, category, duration metadata
- ✅ Published/unpublished flag

**What's Missing:**
- ⚠️ No filtering UI (category, difficulty)
- ⚠️ No search
- ❌ No pagination (fine for 8 journeys, will need for more)

**Evidence:**
- 8 journey test files
- Journey catalog page functional

**Compliance:** ✅ Read-only queries (ADR-009 OK)

---

### FR-L3-002: Journey Detail View
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can view journey details before enrolling.

**What Works:**
- ✅ Journey detail page
- ✅ Step outline/preview
- ✅ Enrollment button
- ✅ Already enrolled indicator

---

### FR-L3-003: Journey Enrollment (Individual)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can enroll in journeys individually.

**What Works:**
- ✅ Enroll via personal group
- ✅ POST `/api/v1/journeys/[id]/enroll`
- ✅ Enrollment record created
- ✅ Progress tracking initialized

**Evidence:**
- API route exists
- Integration tests passing

**Compliance:** ✅ ADR-009 (API route)

---

### FR-L3-004: Journey Enrollment (Group)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Stewards can enroll entire groups in journeys.

**What Works:**
- ✅ Group enrollment flow
- ✅ Permission gated (`enroll_group_in_journey`)
- ✅ All group members enrolled automatically
- ✅ Uses same API route as individual

**Compliance:** ✅ ADR-009

---

### FR-L3-005: Un-Enrollment
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Users can un-enroll from journeys.

**What Works:**
- ✅ DELETE `/api/v1/journeys/[id]/enroll`
- ✅ Enrollment soft-deleted
- ✅ Progress preserved

**Compliance:** ✅ ADR-009

---

### FR-L3-006: Journey Progress Tracking
**Status:** 🔄 In Progress  
**Completeness:** 70%

**What Works:**
- ✅ `journey_enrollments.progress_data` JSONB field
- ✅ Tracks `current_step_id`, `completed_steps[]`, `step_progress{}`
- ✅ Journey player component renders progress

**What's Broken:**
- ❌ Progress updates are direct Supabase writes from `JourneyPlayer.tsx`
- ⚠️ No progress sync across devices (client-side state)

**Next Steps:**
- Create POST `/api/v1/journeys/progress` route
- Move writes to API layer
- Add real-time sync

**Compliance:** ❌ ADR-009 violation

**See:** ACTUAL_STATE.md — "Progress tracking: Client-side direct Supabase writes"

---

### FR-L3-007: Step Type — Content (Narrative)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Rich text/story content step.

**What Works:**
- ✅ Renders narrative text
- ✅ No profile data written

**Evidence:**
- StepContent.tsx handles `content` type
- Used in seeded journeys

---

### FR-L3-008: Step Type — Activity Confirmation
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Member confirms real-world action.

**What Works:**
- ✅ Activity prompt
- ✅ Confirmation checkbox
- ✅ Optional notes
- ✅ Optional profile data write

---

### FR-L3-009: Step Type — Assessment
**Status:** 🔄 In Progress  
**Completeness:** 30%

**Description:** Structured questions (Big 5, VIA, etc.).

**What Works:**
- ✅ Basic assessment rendering
- ✅ Multiple choice questions

**What's Missing:**
- ❌ No validated frameworks (Big 5, VIA) yet
- ❌ No scoring/results
- ❌ No results visualization or feedback
- ⏸️ No profile_data write (table doesn't exist yet)

**Next Steps:**
- Add assessment frameworks
- Wire to profile_data when table exists

---

### FR-L3-010: Step Type — Reflection Prompt
**Status:** ⏸️ Deferred  
**Completeness:** 0%

**Description:** Open question, free-form response.

**Why Deferred:**
- Not critical for Ferd launch
- Can use Activity type for basic reflection
- Full reflection needs profile_data table

**Revisit:** After profile_data implemented

---

### FR-L3-011: Step Type — Choice/Selection
**Status:** ⏸️ Deferred  
**Completeness:** 0%

**Description:** Member picks from options, can shape journey direction.

**Why Deferred:**
- Requires branching journey logic
- Complex UX
- Better in Hamn

**Revisit:** Hamn M1

---

### FR-L3-012: Step Type — Journal Entry
**Status:** ⏸️ Deferred  
**Completeness:** 0%

**Description:** Free writing attached to journey moment.

**Why Deferred:**
- Needs rich text editor (L4 Content)
- Needs profile_data table
- Not critical for Ferd

**Revisit:** When L4 Content layer built

---

### FR-L3-013: Step Type — Checklist
**Status:** ⏸️ Deferred  
**Completeness:** 0%

**Description:** Small action items to complete.

**Why Deferred:**
- Can use Activity type for similar purpose
- Lower priority

**Revisit:** Hamn

---

### FR-L3-014: Journey Zero (Onboarding)
**Status:** ⏸️ Deferred  
**Reason:** Not critical for Ferd

**Description:** Special first journey auto-enrolled on registration.

**Why Deferred:**
- Can onboard via email/docs
- Better with full step type library
- Hamn differentiator

**Revisit:** Hamn M1

---

### FR-L3-015: Journey Designer
**Status:** ⏸️ Deferred  
**Reason:** Hamn M1 feature

**Description:** Dreamineer-facing tool for creating/editing journeys.

**Current:**
- ❌ No create/edit UI
- ✅ 8 journeys seeded via SQL

**Why Deferred:**
- Ferd can launch with pre-authored content
- Requires L4 Content (rich text editor)
- Complex UX

**Revisit:** Hamn M1

---

### FR-L3-016: Step Extensibility
**Status:** 🔄 In Progress  
**Completeness:** 40%

**Description:** Ability to add new step types without rebuilding core.

**Current:**
- ❌ Hard-coded `switch` statements in `StepContent.tsx`
- ❌ No registry/plugin pattern
- ⚠️ Adding type requires editing 4 functions

**Future:**
- 📋 Step type registry
- 📋 Plugin architecture
- 📋 `config` JSONB validation per type

**See:** ACTUAL_STATE.md — "Low extensibility"

---

## L4: Content

### FR-L4-001: Rich Text Editor
**Status:** ⏸️ Deferred  
**Reason:** L4 not built in Ferd

**Description:** WYSIWYG editor for narrative content, journal entries.

**Why Deferred:**
- Not needed for pre-authored journeys
- Needed for Journey Designer
- Hamn feature

**Revisit:** Hamn M1

---

### FR-L4-002: Media Upload (Images/Video)
**Status:** ⏸️ Deferred  
**Reason:** L4 not built

**Description:** Upload images/video to journey content.

**Current:**
- ✅ Avatar upload works (different use case)
- ❌ No journey content media upload

**Revisit:** Hamn

---

### FR-L4-003: Assessment Frameworks (Big 5, VIA)
**Status:** ⏸️ Deferred  
**Reason:** L4 not built

**Description:** Pre-built validated assessment frameworks.

**Revisit:** When building full assessment step type

---

### FR-L4-004: Journal Interface
**Status:** ⏸️ Deferred  
**Reason:** L4 not built

**Description:** Dedicated journaling UI.

**Revisit:** Hamn

---

### FR-L4-005: Content Versioning
**Status:** ⏸️ Deferred  
**Reason:** L4 not built

**Description:** Track changes to journey content over time.

**Revisit:** Hamn (when Journey Designer exists)

---

## L5: Communication

### FR-L5-001: Direct Messaging (1-on-1)
**Status:** ✅ Done  
**Completeness:** 90%

**Description:** Members can send direct messages to each other.

**What Works:**
- ✅ `conversations` + `direct_messages` tables
- ✅ Conversation list with unread indicator
- ✅ Last message preview
- ✅ Avatar display
- ✅ Realtime updates via Supabase subscriptions
- ✅ Send/receive messages

**What's Missing:**
- ⚠️ No @mention support
- ⚠️ No conversation muting
- ❌ No notification preferences

**Evidence:**
- 4 communication test files
- Messaging functional in production

**Compliance:** ❌ ADR-009 violation — all operations direct Supabase from page components

**See:** ACTUAL_STATE.md — "All message operations direct Supabase calls"

---

### FR-L5-002: Group Forum (Discussions)
**Status:** ✅ Done  
**Completeness:** 85%

**Description:** Group members can post and reply in forums.

**What Works:**
- ✅ `forum_posts` table
- ✅ Flat threading (post + replies)
- ✅ Post, reply, edit own post
- ✅ Soft-delete (hide, preserve data)
- ✅ `moderate_forum` permission gated
- ✅ Steward moderation (delete any post)

**What's Missing:**
- ⚠️ No nested threading (flat only)
- ⚠️ No @mention
- ❌ No content flagging/reporting

**Compliance:** ❌ ADR-009 violation — all operations direct Supabase from `ForumSection.tsx`

---

### FR-L5-003: Notifications System
**Status:** ✅ Done  
**Completeness:** 90%

**Description:** Real-time notifications for group events.

**What Works:**
- ✅ 7 notification types
- ✅ Smart notifications (accept/decline actions)
- ✅ Realtime push via Supabase subscriptions
- ✅ Unread badge
- ✅ Notification bell component
- ✅ 6 database triggers generate notifications

**Notification Types:**
1. `group_invitation`
2. `invitation_accepted`
3. `invitation_declined`
4. `member_removed`
5. `member_left`
6. `role_assigned`
7. `group_deleted`

**What's Missing:**
- ❌ No journey notifications (enrollment, completion)
- ❌ No message/forum notifications
- ❌ No preferences (can't mute)

**Architectural Debt:**
- ⚠️ 6 triggers implement app logic in database

**See:** V3-001, V3-002, V3-003 (Notification requirements)

---

### FR-L5-004: @Mention Support
**Status:** ⏸️ Deferred  
**Reason:** Not critical for Ferd

**Description:** Mention users in messages/forums with @username.

**Revisit:** Hamn

---

### FR-L5-005: Conversation Muting
**Status:** ⏸️ Deferred  
**Reason:** Not critical for Ferd

**Description:** Users can mute conversations or forum threads.

**Revisit:** Hamn

---

### FR-L5-006: Basic Announcements
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Stewards can send one-to-many announcements within their group. Announcements are distinct from forum posts — visually distinguished, notification-generating, and browsable.

**Current Workaround:**
- Can use forum for announcements (no visual distinction, no guaranteed notification)

**Acceptance Criteria:**
- Only Stewards can create announcements (permission gated)
- All group members receive notification on new announcement
- Announcements persist and are browsable in group view
- Visually distinguished from regular forum posts
- Announcements appear in group tab or dedicated section

**Priority:** MEDIUM (Ferd 1.6)

---

### FR-L5-007: Activity Feed
**Status:** ⏸️ Deferred  
**Reason:** Hamn feature

**Description:** Stream of member activity (enrollments, completions, posts).

**Why Deferred:**
- Requires `activity_feed` table (not built)
- Complex UX
- Better in Hamn

**Revisit:** Hamn M2

---

### FR-L5-008: Content Moderation/Flagging
**Status:** ⏸️ Deferred  
**Reason:** V1 Administration work

**Description:** Members can flag inappropriate content.

**Current:**
- ✅ Stewards can moderate (delete posts)
- ❌ No flagging system
- ❌ No moderation queue

**Revisit:** When building V1 moderation features

---

### FR-L5-009: Group DMs (Multi-Party Messaging)
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Multi-party direct message conversations. Extends the existing 1:1 DM system to support 2+ participants.

**Current:**
- ✅ 1:1 DM system fully functional (FR-L5-001)
- ❌ No multi-party conversations
- ❌ No participant management for conversations

**Acceptance Criteria:**
- Create group DM with 2+ members
- Add/remove participants (creator or any participant)
- Same features as 1:1 DM (read tracking, Realtime push)
- Group DMs appear in inbox alongside 1:1 conversations
- Members can leave group DMs
- Maximum participant limit defined (e.g., 20)

**Dependencies:**
- FR-L5-001 (Direct Messaging) — extends existing DM infrastructure

**Priority:** MEDIUM (Ferd 1.6)

---

### FR-L5-010: Block/Report Users
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Members can block other users (hiding their content) and report users for admin review. Core safety feature.

**Current:**
- ❌ No blocking capability
- ❌ No reporting capability
- ✅ Stewards can moderate forum posts (partial workaround)
- ✅ Admin can deactivate users (after-the-fact remedy)

**Acceptance Criteria:**
- Block a user: hides their DMs, forum posts, and member list entries from the blocker
- Blocked users cannot send DMs to the blocker
- Report a user: flags for admin review with context
- Report categories: harassment, spam, inappropriate content, other
- Reports reach admin dashboard (ties into V1 admin features)
- No notification sent to the reported/blocked user
- Report includes context (which interaction triggered it)

**Dependencies:**
- FR-V1-016 (Content Moderation Queue) — reports feed into moderation (can launch blocking without full queue)

**Priority:** HIGH (Ferd 1.6 — safety feature for launch)

---

## L6: Discovery

### FR-L6-001: Journey Search
**Status:** ⏸️ Deferred  
**Reason:** Hamn feature

**Description:** Full-text search on journey titles, descriptions, tags.

**Current:**
- ❌ No search implemented
- ✅ Can browse all journeys (only 8 exist)

**Revisit:** When catalog has 50+ journeys (Hamn)

---

### FR-L6-002: Journey Recommendations
**Status:** ⏸️ Deferred  
**Reason:** Hamn feature

**Description:** Personalized journey suggestions based on profile data.

**Dependencies:**
- Requires profile_data table
- Requires L7 Intelligence

**Revisit:** Hamn M2

---

### FR-L6-003: Marketplace Browsing
**Status:** ⏸️ Deferred  
**Reason:** Post-Hamn

**Description:** Browse contributed journeys in marketplace.

**Revisit:** Wave TBD — pending work package redistribution

---

## L7: Intelligence

### FR-L7-001: AI Mentor (Whisp)
**Status:** ⏸️ Deferred  
**Reason:** Hamn core feature

**Description:** Anthropic API integration for companion voice.

**Revisit:** Hamn M1

---

### FR-L7-002: Profile Accumulation & Insights
**Status:** ⏸️ Deferred  
**Reason:** Hamn feature

**Description:** Generate insights from profile_data.

**Dependencies:**
- Requires profile_data table
- Requires AI integration

**Revisit:** Hamn M2

---

### FR-L7-003: Whisp Fidelity/Fullness Model
**Status:** ⏸️ Deferred  
**Reason:** Hamn core feature

**Description:** Whisp richness increases with engagement.

**Revisit:** Hamn M1

---

## V1: Administration

> **Note:** Many capabilities have both a self-serve path (user does it themselves) and an admin path (DeusEx admin does it). See ACTUAL_STATE.md "Self-Serve vs Admin Capability Matrix" for the full comparison. Key gaps: users cannot delete their own account (admin-only), users cannot hard-delete groups (admin-only), no self-serve role management beyond what Stewards can do within their groups.

### FR-V1-001: User Management — View All Users
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** DeusEx admin can view all users with filters.

**What Works:**
- ✅ User list page
- ✅ Filters (active, inactive, decommissioned)
- ✅ Search by name/email
- ✅ Pagination

**Evidence:**
- Admin dashboard functional
- 16-18 admin test files

---

### FR-V1-002: User Management — Activate/Deactivate
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can activate or deactivate user accounts.

**What Works:**
- ✅ Activate inactive user
- ✅ Deactivate active user
- ✅ RPC function `admin_activate_user()`, `admin_deactivate_user()`
- ✅ Audit logged

---

### FR-V1-003: User Management — Soft Delete (Decommission)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can soft-delete (decommission) users.

**What Works:**
- ✅ Mark user as decommissioned
- ✅ Preserve all data
- ✅ User cannot login
- ✅ Audit logged

---

### FR-V1-004: User Management — Hard Delete
**Status:** 🔄 In Progress  
**Completeness:** 60%

**Description:** Admin can permanently delete user and all data.

**What Works:**
- ✅ Hard delete action exists
- ⚠️ Cascade behavior incomplete

**What's Missing:**
- ⚠️ Cascade specification incomplete
- ⚠️ Not clear what gets deleted vs orphaned

**Next Steps:**
- Complete cascade spec
- Verify data cleanup

---

### FR-V1-005: User Management — Force Logout
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can force-logout a user.

**What Works:**
- ✅ RPC function `admin_force_logout()`
- ✅ Invalidates user sessions
- ✅ Audit logged

---

### FR-V1-006: Group Management — Fix Orphaned Groups
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can reassign Steward to orphaned groups.

**What Works:**
- ✅ Detect orphaned groups (no Steward)
- ✅ Reassign Steward
- ✅ Admin can pick new Steward from members
- ✅ Audit logged

**Evidence:**
- `/app/admin/fix-orphans/page.tsx`

---

### FR-V1-007: Group Management — View All Groups
**Status:** 🔄 In Progress  
**Completeness:** 30%

**Description:** Admin can view all groups.

**Current:**
- ✅ Can see group stats (count)
- ❌ No full group list
- ❌ No group search/filter

**Next Steps:**
- Build group list view for admin
- Add filters (privacy, active/inactive)

---

### FR-V1-008: Group Management — Edit Any Group
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Admin can edit any group (override Steward permissions).

**Current:**
- ❌ Admin cannot edit groups
- ✅ Only Stewards can edit their groups

**Priority:** MEDIUM

---

### FR-V1-009: Group Management — Delete Any Group
**Status:** 📋 Planned  
**Completeness:** 0%

**Description:** Admin can delete any group.

**Current:**
- ❌ Admin cannot delete groups
- ✅ Only Stewards can delete their groups

**Priority:** MEDIUM

---

### FR-V1-010: Journey Management — View All Journeys
**Status:** 🔄 In Progress  
**Completeness:** 20%

**Description:** Admin can view all journeys.

**Current:**
- ✅ Can see enrollment counts
- ❌ No journey list for admin
- ❌ No journey search/filter

**Next Steps:**
- Build journey list view
- Show publish status, enrollment count

---

### FR-V1-011: Journey Management — Create/Edit/Publish
**Status:** ⏸️ Deferred  
**Reason:** Requires Journey Designer (Hamn)

**Description:** Admin can create, edit, and publish journeys.

**Current:**
- ❌ No journey creation UI
- ✅ Journeys seeded via SQL

**Revisit:** After Journey Designer built (Hamn M1)

---

### FR-V1-012: Audit Log Viewer
**Status:** 🔄 In Progress  
**Completeness:** 50%

**Description:** Admin can view audit log of all platform actions.

**Current:**
- ✅ Audit log table exists (`admin_audit_log`)
- ✅ 16 action types logged
- ❌ No viewer UI (data exists, no interface)

**Next Steps:**
- Build audit log viewer page
- Add filters (action type, date, user)
- Add search

**Priority:** HIGH

---

### FR-V1-013: Platform Exit
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can exit platform (mark as inactive permanently).

**What Works:**
- ✅ Platform exit action
- ✅ All data preserved
- ✅ Account marked inactive
- ✅ Audit logged

---

### FR-V1-014: Message/Notify User
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can send message or notification to any user.

**What Works:**
- ✅ MessageModal component
- ✅ NotifyModal component
- ✅ Can target specific user

---

### FR-V1-015: DeusEx Member Management
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Admin can manage DeusEx group membership.

**What Works:**
- ✅ Invite to DeusEx
- ✅ Remove from DeusEx
- ✅ View current DeusEx members

**Evidence:**
- `/app/admin/deusex/page.tsx`

---

### FR-V1-016: Content Moderation Queue
**Status:** ⏸️ Deferred  
**Reason:** Not critical for Ferd launch

**Description:** Admin can review flagged content in moderation queue.

**Requirements:**
- View flagged content (forum posts, messages)
- See flag reason and reporter
- Approve (remove flag)
- Delete content
- Issue warning to author
- Ban user

**Current:**
- ✅ Stewards can delete forum posts
- ❌ No flagging system
- ❌ No moderation queue
- ❌ No admin content review

**Why Deferred:**
- Small initial user base (manual moderation acceptable)
- Steward moderation sufficient for Ferd
- Full moderation system better in Hamn

**Revisit:** When community grows or abuse increases

---

### FR-V1-017: Content Flagging System
**Status:** ⏸️ Deferred  
**Reason:** Depends on FR-V1-016

**Description:** Members can flag inappropriate content.

**Requirements:**
- Flag forum posts
- Flag messages
- Flag journey content (reviews/comments)
- Reason categories: spam, harassment, inappropriate, misinformation
- Reporter remains anonymous
- Flagged content goes to moderation queue

**Current:**
- ❌ No flagging capability
- ✅ Members can report via DM to Stewards/admin (workaround)

**Why Deferred:**
- Requires moderation queue first
- Small community doesn't need formal system
- Manual reporting acceptable for Ferd

**Revisit:** With FR-V1-016 (Moderation Queue)

---

### FR-V1-018: User Warnings & Bans
**Status:** ⏸️ Deferred  
**Reason:** Not critical for Ferd

**Description:** Admin can issue warnings and ban users.

**Requirements:**
- Issue warning (stored in user record)
- Temporary ban (1 day, 7 days, 30 days)
- Permanent ban
- Ban appeal process
- Ban reason recorded
- User notified of warning/ban

**Current:**
- ✅ Admin can deactivate users (similar to ban)
- ❌ No warning system
- ❌ No temporary bans
- ❌ No appeal process

**Why Deferred:**
- Deactivation serves similar purpose for Ferd
- Formal warning/ban system better in Hamn
- Small community unlikely to need this

**Revisit:** Hamn M2

---

## V2: Privacy & GDPR

### FR-V2-001: Data Export (GDPR)
**Status:** ⏸️ Deferred  
**Reason:** Not required for initial launch

**Description:** Users can export all their data.

**Requirements:**
- All profile data
- All messages sent/received
- All forum posts
- All journey progress
- Machine-readable format (JSON)

**Priority:** HIGH (before EU launch)  
**Revisit:** Before marketing to EU users

---

### FR-V2-002: Data Erasure (Right to be Forgotten)
**Status:** ⏸️ Deferred  
**Reason:** Not required for initial launch

**Description:** Users can request complete data deletion.

**Requirements:**
- Delete all personal data
- Anonymize forum posts/messages
- Preserve aggregate data
- Cannot undo

**Priority:** HIGH (before EU launch)  
**Revisit:** Before marketing to EU users

---

### FR-V2-003: Consent Tracking
**Status:** ⏸️ Deferred  
**Reason:** Not required for initial launch

**Description:** Track user consent for data processing.

**Requirements:**
- Terms of Service acceptance
- Privacy Policy acceptance
- Marketing communications opt-in
- Timestamp all consents

**Revisit:** Before EU launch

---

### FR-V2-004: Privacy Policy Acceptance
**Status:** ⏸️ Deferred  
**Reason:** Not required for initial launch

**Description:** Users must accept privacy policy before using platform.

**Current:**
- ❌ No privacy policy
- ❌ No acceptance required

**Revisit:** Before public launch

---

### FR-V2-005: Cookie Consent
**Status:** ⏸️ Deferred  
**Reason:** Not required for initial launch

**Description:** Cookie banner with granular consent options.

**Current:**
- ❌ No cookie banner
- ❌ No consent tracking

**Revisit:** Before EU launch

---

### FR-V2-006: Self-Service Account Deletion
**Status:** ⏸️ Deferred  
**Reason:** GDPR dependency

**Description:** Users can delete their own accounts.

**Current:**
- ❌ No self-service deletion
- ✅ Admin can delete

**Dependency:** Requires FR-V2-002 (Data Erasure) first

**Revisit:** With GDPR compliance work

---

## V3: Notifications

### FR-V3-001: Notification Generation (Group Events)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** System generates notifications for group-related events.

**What Works:**
- ✅ 7 notification types
- ✅ 6 database triggers auto-generate notifications
- ✅ Smart notifications with actions

**See:** FR-L5-003 (Notifications System)

---

### FR-V3-002: Notification Delivery (Realtime Push)
**Status:** ✅ Done  
**Completeness:** 100%

**Description:** Notifications delivered in real-time via Supabase subscriptions.

**What Works:**
- ✅ Realtime push
- ✅ Unread badge updates immediately
- ✅ Bell icon with dropdown

---

### FR-V3-003: Notification Preferences
**Status:** 🔄 In Progress  
**Completeness:** 10%

**Description:** Users can control which notifications they receive.

**Current:**
- ❌ No preferences UI
- ❌ No muting
- ❌ No notification channels (email, push, SMS)

**Next Steps:**
- Build preferences page
- Add per-type muting
- Add email notification delivery

**Priority:** MEDIUM

---

### FR-V3-004: Email Notification Templates
**Status:** 📋 Planned  
**Completeness:** 10%

**Description:** Email templates for all notification types.

**Templates Needed:**
1. Welcome email (new registration)
2. Group invitation email
3. Invitation accepted/declined
4. Password reset
5. Journey enrollment confirmation
6. Journey completion
7. Weekly digest
8. Role assigned
9. Member removed

**Current:**
- ❌ No email templates exist (email is console.log stub only)
- 🚨 Email delivery broken (console.log only)
- ❌ No template library configured (no React Email or similar)
- ❌ No notification types have email templates

**Next Steps:**
- Fix email delivery (FR-L0-008)
- Complete missing templates
- Test all email flows

**Priority:** HIGH (once email delivery fixed)

**See:** FR-L0-008 (Email Service Integration)

---

### FR-V3-005: Notification Channels
**Status:** 🔄 In Progress  
**Completeness:** 25%

**Description:** Support multiple notification delivery channels.

**Channels:**
- ✅ **In-app:** Real-time via Supabase subscriptions (DONE)
- 🚨 **Email:** No templates, delivery is console.log stub (NOT STARTED)
- ⏸️ **Push (mobile):** Native app push notifications (DEFERRED to Wave TBD — pending redistribution)
- ⏸️ **SMS:** SMS notifications (DEFERRED to wave TBD)

**Current:**
- ✅ In-app notifications work perfectly
- 🚨 Email broken (console.log only)
- ❌ No push notifications (no mobile app yet)
- ❌ No SMS (not planned for Ferd)

**Next Steps:**
1. Fix email delivery (immediate)
2. Add push when iOS/Android apps built (Hamn)
3. SMS can wait

**Priority:** HIGH (email), MEDIUM (push), LOW (SMS)

---

## V4: Observability

### FR-V4-001: Audit Logging
**Status:** ✅ Done  
**Completeness:** 80%

**Description:** Log all significant platform actions.

**What Works:**
- ✅ `admin_audit_log` table exists
- ✅ 16 action types logged
- ✅ Captures: actor, action, target, metadata, timestamp

**What's Missing:**
- ❌ No viewer UI (see FR-V1-012)

**Action Types Logged:**
1. activate_user
2. deactivate_user
3. decommission_user
4. hard_delete_user
5. force_logout_user
6. platform_exit_user
7. notify_user
8. message_user
9. fix_orphaned_group
10. invite_to_deusex
11. remove_from_deusex
12. admin_join_group
13. admin_remove_from_group
14. (+ 2 more)

---

### FR-V4-002: Error Tracking
**Status:** 🔄 In Progress  
**Completeness:** 30%

**Description:** Capture and track application errors.

**Current:**
- ✅ `ErrorBoundary` component exists
- ✅ `console.error()` used throughout
- ❌ No Sentry integration
- ❌ No error aggregation
- ❌ No alerting

**Next Steps:**
- Integrate Sentry
- Add error tracking dashboard

**Priority:** HIGH (for production)

---

### FR-V4-003: Performance Monitoring
**Status:** 🔄 In Progress  
**Completeness:** 15%

**Description:** Monitor application performance.

**Current:**
- ✅ Lighthouse manual audits
- ✅ Supabase dashboard (query performance)
- ❌ No real-time performance monitoring
- ❌ No Web Vitals tracking
- ❌ No performance budgets

**Next Steps:**
- Add Web Vitals reporting
- Set performance budgets
- Monitor Core Web Vitals in production

**Priority:** MEDIUM

---

### FR-V4-004: Usage Analytics
**Status:** ⏸️ Deferred  
**Reason:** Not critical for Ferd

**Description:** Track user behavior and feature usage.

**Current:**
- ❌ No analytics integration
- ❌ No event tracking

**Revisit:** Before scaling (need data for product decisions)

---

## V5: Transactions

### FR-V5-001: Payment Integration
**Status:** ⏸️ Deferred  
**Reason:** Hamn feature

**Description:** Stripe integration for marketplace transactions.

**Why Deferred:**
- No marketplace in Ferd
- No paid content
- Hamn feature

**Revisit:** Hamn M3

---

### FR-V5-002: Transaction Ledger
**Status:** ⏸️ Deferred  
**Reason:** Hamn feature

**Description:** Track all financial transactions.

**Revisit:** Hamn M3

---

### FR-V5-003: Revenue Share
**Status:** ⏸️ Deferred  
**Reason:** Hamn marketplace feature

**Description:** Revenue sharing between Dreamineer creators and FringeIsland Foundation.

**Requirements:**
- Calculate revenue split (e.g., 70/30)
- Track creator earnings
- Automatic payouts
- Creator dashboard

**Why Deferred:**
- No marketplace in Ferd
- No paid content
- Requires payment integration first

**Revisit:** Hamn M3 (after marketplace)

---

### FR-V5-004: Escrow System
**Status:** ⏸️ Deferred  
**Reason:** Hamn marketplace feature

**Description:** Hold funds in escrow for journey completion/satisfaction.

**Requirements:**
- Hold payment until journey completed
- Refund if unsatisfied
- Release to creator on completion
- Dispute resolution

**Why Deferred:**
- Complex financial infrastructure
- Not needed without marketplace
- Legal/regulatory considerations

**Revisit:** Hamn M4 (advanced marketplace features)

---

### FR-V5-005: Refunds
**Status:** ⏸️ Deferred  
**Reason:** Hamn marketplace feature

**Description:** Process refunds for paid content.

**Requirements:**
- Refund within X days of purchase
- Partial refunds
- Refund approval workflow
- Refund tracking

**Why Deferred:**
- No paid content in Ferd
- Requires payment integration

**Revisit:** Hamn M3 (with marketplace)

---

# ⚙️ Non-Functional Requirements

---

## Performance

### NFR-P-001: Page Load Performance
**Status:** ✅ Done  
**Completeness:** 90%

**Requirements:**
- Initial load: < 3s (3G connection)
- Time to Interactive: < 5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

**Current Performance:**
- ✅ Most pages meet targets
- ⚠️ Admin page slower (god-file, many queries)
- ✅ Journey player meets targets

**Monitoring:** Lighthouse (manual audits)

**Next Steps:**
- Optimize admin page
- Set up automated performance testing

---

### NFR-P-002: Database Query Performance
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- Simple queries (single table): < 50ms
- Complex joins: < 200ms
- Full-text search: < 300ms

**Current:**
- ✅ All queries meet targets
- ✅ Indexes on all FK relationships
- ✅ RLS policies optimized (no sequential scans)

**Monitoring:** Supabase Dashboard query analytics

---

### NFR-P-003: Real-time Latency
**Status:** ✅ Done  
**Completeness:** 95%

**Requirements:**
- Message delivery: < 500ms
- Notification push: < 1s
- Presence updates: < 2s

**Current:**
- ✅ Messages delivered in < 500ms
- ✅ Notifications pushed in < 1s
- ⚠️ No presence tracking yet

---

## Security

### NFR-S-001: Row Level Security (RLS) Enforcement
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- RLS enabled on all tables
- No bypass paths (except SECURITY DEFINER functions)
- Policies enforce least privilege

**Current:**
- ✅ RLS on all 19 tables
- ✅ No bypass paths found (verified by Claude Code)
- ✅ `has_permission()` SECURITY DEFINER
- ✅ `is_platform_admin()` SECURITY DEFINER

**Evidence:** ACTUAL_STATE.md — "No bypass paths found"

---

### NFR-S-002: Authentication Security
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- Strong password requirements
- JWT token security
- Session timeout
- HTTPS only

**Current:**
- ✅ Password requirements enforced (min 8 chars)
- ✅ JWT via Supabase Auth
- ✅ Session timeout configurable
- ✅ HTTPS enforced in production

---

### NFR-S-003: Permission Enforcement
**Status:** 🔄 In Progress  
**Completeness:** 21%

**Requirements:**
- All protected actions check permissions
- RLS enforces at database level
- Frontend hides unavailable actions

**Current:**
- ✅ 8/39 fully enforced (RLS + frontend)
- ⚠️ 5/39 partial (RLS only)
- ❌ 26/39 not checked

**See:** FR-L2-010 (Permission Enforcement)

---

### NFR-S-004: SQL Injection Protection
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- All queries use parameterized statements
- No string concatenation in SQL

**Current:**
- ✅ Supabase client handles parameterization
- ✅ No raw SQL in frontend
- ✅ RPC functions use proper params

---

### NFR-S-005: XSS Protection
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- All user input escaped
- Content Security Policy headers
- React auto-escapes by default

**Current:**
- ✅ React escapes all rendered content
- ✅ No `dangerouslySetInnerHTML` usage
- ⚠️ CSP headers not explicitly configured (Next.js defaults)

---

### NFR-S-006: Rate Limiting
**Status:** 📋 Planned  
**Completeness:** 0%

**Requirements:**
- API routes rate limited
- Prevent brute force attacks
- Prevent spam

**Current:**
- ❌ No rate limiting on any route

**Priority:** MEDIUM (before public launch)

**Next Steps:**
- Add Upstash/Redis rate limiting
- Start with auth routes
- Expand to all API routes

---

## Accessibility

### NFR-A-001: WCAG 2.1 AA Compliance
**Status:** 🔄 In Progress  
**Completeness:** 15%

**Requirements:**
- Keyboard navigation
- Screen reader support
- Sufficient color contrast (4.5:1)
- Focus indicators
- ARIA attributes
- No keyboard traps

**Current:**
- 🚨 **Only 8 ARIA attributes total**
- ❌ No focus traps in modals
- ❌ No skip links
- ❌ No `role="dialog"` on ConfirmModal
- ⚠️ Only 1 keyboard handler (Escape in ConfirmModal)
- 🚨 7 browser `alert()` calls (accessibility fail)

**Critical Fixes Needed:**
1. Replace 7 `alert()` calls with ConfirmModal (IMMEDIATE)
2. Add focus traps to modals
3. Add ARIA labels to interactive elements
4. Add skip links
5. Full keyboard navigation audit

**Effort:** 1 week  
**Priority:** 🔥 HIGH (launch blocker)

**See:** ACTUAL_STATE.md — "8 ARIA attributes across all .tsx"

---

### NFR-A-002: Semantic HTML
**Status:** 🔄 In Progress  
**Completeness:** 60%

**Requirements:**
- Proper heading hierarchy (h1 → h2 → h3)
- Semantic elements (`<nav>`, `<main>`, `<article>`)
- Form labels

**Current:**
- ✅ Most components use semantic HTML
- ⚠️ Some divs where semantic elements better
- ✅ Form labels present

**Next Steps:**
- Audit heading hierarchy
- Replace non-semantic divs

---

### NFR-A-003: Alternative Text
**Status:** 🔄 In Progress  
**Completeness:** 70%

**Requirements:**
- All images have alt text
- Decorative images alt=""

**Current:**
- ✅ Avatars have alt text (user names)
- ⚠️ Some decorative images missing alt=""

---

## Usability

### NFR-U-001: Mobile Responsive Design
**Status:** ✅ Done  
**Completeness:** 90%

**Requirements:**
- Works on mobile devices (320px+)
- Touch-friendly targets (44x44px minimum)
- No horizontal scroll

**Current:**
- ✅ Tailwind responsive classes throughout
- ✅ Most pages mobile-optimized
- ⚠️ Admin page less optimized (desktop-first)

---

### NFR-U-002: Browser Compatibility
**Status:** ✅ Done  
**Completeness:** 95%

**Requirements:**
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

**Current:**
- ✅ Works in all major browsers
- ⚠️ Not tested in older browsers

---

### NFR-U-003: Error Messages
**Status:** 🔄 In Progress  
**Completeness:** 70%

**Requirements:**
- Clear, actionable error messages
- No technical jargon
- Suggest next steps

**Current:**
- ✅ Most API errors have clear messages
- ⚠️ Some errors too technical
- 🚨 7 browser `alert()` calls (poor UX)

**Next Steps:**
- Replace all `alert()` calls
- Audit error messages for clarity

---

### NFR-U-004: Internationalization (i18n)
**Status:** 📋 Planned (framework only)  
**Completeness:** 0%

**Requirements (Ferd — framework):**
- i18n library integrated with Next.js 16 App Router
- All user-facing strings externalized to locale files
- English locale complete
- Locale-aware date/number formatting infrastructure

**Requirements (Hamn — full):**
- Multiple language support (additional locales)
- RTL support
- Translation management workflow

**Current:**
- ❌ No i18n configuration
- ❌ Strings not externalized

**See:** FR-L0-009 (i18n Framework)

---

## Reliability

### NFR-R-001: Email Delivery
**Status:** 🚨 Broken  
**Completeness:** 10%

**Requirements:**
- Emails delivered reliably
- Retry on failure
- Delivery confirmation

**Current:**
- 🚨 **Email is `console.log` only** — no actual delivery!

**Fix:** Wire up Resend

**See:** FR-L0-008 (Email Service Integration)

---

### NFR-R-002: Error Handling
**Status:** 🔄 In Progress  
**Completeness:** 70%

**Requirements:**
- Graceful error handling
- User-friendly error messages
- Error logging

**Current:**
- ✅ ErrorBoundary component
- ✅ Try-catch in critical paths
- ⚠️ Some errors not caught
- ❌ No centralized error tracking (Sentry)

---

### NFR-R-003: Data Backup
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- Automated backups
- Point-in-time recovery
- Tested restore process

**Current:**
- ✅ Supabase automatic backups
- ✅ Point-in-time recovery available

---

### NFR-R-004: Uptime Target
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- 99.9% uptime (< 43 minutes downtime/month)

**Current:**
- ✅ Supabase provides 99.9% SLA
- ✅ No custom infrastructure to maintain

---

## Scalability

### NFR-SC-001: Concurrent Users
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- Support 1,000 concurrent users
- Support 10,000 registered users

**Current:**
- ✅ Supabase handles this scale easily
- ✅ No custom scaling needed

---

### NFR-SC-002: Database Scaling
**Status:** ✅ Done  
**Completeness:** 100%

**Requirements:**
- Database can scale to 100k+ records per table
- Query performance maintained at scale

**Current:**
- ✅ PostgreSQL scales well
- ✅ Indexes in place
- ✅ RLS policies optimized

---

## Maintainability

### NFR-M-001: Code Quality
**Status:** ✅ Done  
**Completeness:** 85%

**Requirements:**
- TypeScript for type safety
- ESLint for code quality
- Consistent code style

**Current:**
- ✅ TypeScript throughout
- ✅ ESLint configured
- ⚠️ Some `any` types (technical debt)

---

### NFR-M-002: Test Coverage
**Status:** ✅ Done  
**Completeness:** 85%

**Requirements:**
- 80%+ coverage on critical paths
- Integration tests for workflows
- E2E tests for user journeys

**Current:**
- ✅ 659 tests (550 integration, 99 unit, 4 setup, 7 E2E)
- ✅ Critical paths covered
- ⚠️ RLS coverage thin (1 file)
- ⚠️ No API route tests
- ⚠️ Limited E2E coverage

**See:** ACTUAL_STATE.md — Test coverage section

---

### NFR-M-003: Documentation
**Status:** 🔄 In Progress  
**Completeness:** 60%

**Requirements:**
- Architecture documented
- API documented
- Setup instructions

**Current:**
- ✅ ARCHITECTURE_ANATOMY.md (excellent)
- ✅ ARCHITECTURE_DECISIONS.md (24 ADRs)
- ⚠️ API not formally documented
- ⚠️ Setup docs minimal

**Next Steps:**
- Document API routes
- Improve onboarding docs

---

### NFR-M-004: ADR-009 Compliance (API Layer)
**Status:** ❌ Violated  
**Completeness:** 15%

**Requirements:**
- All write operations go through API routes
- Database accessed via API, not directly from frontend
- Multi-platform ready

**Current:**
- ❌ ~40+ direct Supabase writes in .tsx files
- ✅ Only 4 API routes exist
- ❌ Coverage: ~15%

**See:** AR-001 (ADR-009 Compliance)

---

# 🏗️ Architectural Requirements

---

## Architectural Compliance & Debt

### AR-001: ADR-009 Compliance (API Route Layer)
**Status:** ❌ Violated  
**Severity:** 🔥 CRITICAL

**Requirement:** All write operations must go through API routes (Platform API ring).

**Current State:**
- ❌ ~40+ direct Supabase write operations in .tsx files
- ✅ Only 4 API routes exist
- ❌ Coverage: ~15% of operations

**Violations by Domain:**

| Domain | API Route Exists? | Violations |
|--------|-------------------|------------|
| Admin | ⚠️ Partial (1 route) | All mutations in `app/admin/page.tsx` |
| Groups | ❌ No | All CRUD direct Supabase |
| Profile | ❌ No | Edit is direct Supabase |
| Messages | ❌ No | All operations direct Supabase |
| Forum | ❌ No | All operations direct Supabase |
| Progress | ❌ No | Journey progress direct Supabase |
| Invitations | ⚠️ Partial (email stub) | Send invitation direct Supabase |

**Impact:**
- 🔥 **Cannot build iOS/Android apps** (no API to call)
- 🔥 **Security risk** (admin mutations client-side)
- ❌ Cannot add rate limiting
- ❌ Cannot version API
- ❌ Multi-platform readiness: 15%

**Remediation Plan:**

**Phase 1 (Week 1) — Security Priority:**
- Admin routes (user management, audit log, DeusEx)
- Effort: 2-3 days

**Ferd implementation phase 2 (Week 2) — Core Features:**
- Groups (CRUD, invitations)
- Profile (edit, avatar upload)
- Effort: 3-4 days

**Phase 3 (Week 3) — Communication:**
- Messages (send, list conversations)
- Forum (post, reply, moderate)
- Progress (update journey progress)
- Effort: 3-4 days

**Total Effort:** 2-3 weeks  
**Priority:** 🔥 LAUNCH BLOCKER — must be completed before Ferd ships (decided 2026-04-05)

**See:** ACTUAL_STATE.md — "ADR-009 massively violated"

---

### AR-002: Permission Enforcement Completeness
**Status:** ⚠️ Partial  
**Severity:** ⚠️ HIGH

**Requirement:** All 39 permissions must be enforced in RLS AND frontend.

**Current State:**
- Defined: 39 permissions
- Fully enforced (RLS + frontend): 8 (21%)
- Partial (RLS only): 5 (13%)
- Not checked: 26 (67%)

**Enforcement Gaps:**

| Category | Total | Enforced | Not Checked |
|----------|-------|----------|-------------|
| Group Management | 15 | 5 | 8 |
| Journey Management | 10 | 1 | 9 |
| Journey Participation | 6 | 0 | 6 |
| Communication | 5 | 1 | 1 |
| Feedback | 3 | 0 | 3 |
| Platform Admin | 5 | 1 | 4 |

**Impact:**
- Features gated by unchecked permissions are under-protected at app level
- RLS still enforces some protection
- Customizable roles partially broken (permissions defined but not used)

**Remediation:**
1. Add frontend checks using `usePermissions` hook
2. Verify RLS policies enforce all permissions
3. Priority: Journey + Communication permissions

**Effort:** 1-2 weeks  
**Priority:** 🔥 LAUNCH BLOCKER — must be completed before Ferd ships (decided 2026-04-05)

**See:** ACTUAL_STATE.md — Permission enforcement table

---

### AR-003: Database Trigger Logic Extraction
**Status:** 🔄 In Progress  
**Severity:** 📋 MEDIUM

**Requirement:** Application logic belongs in application layer, not database triggers (per ADR-009).

**Current State:**
- 6 notification triggers implement application logic
- 3 "borderline acceptable" triggers (user creation, display name sync)

**Triggers with App Logic:**
1. `notify_group_invitation_created`
2. `notify_group_invitation_accepted`
3. `notify_group_invitation_declined`
4. `notify_member_removed`
5. `notify_member_left_group`
6. `notify_group_role_assigned`

**Why This Matters:**
- Business logic in database is hard to test
- Triggers hard to debug
- Violates ADR-009 (API layer principle)

**Recommendation:**
- Refactor notification creation to API routes when building those routes
- Keep triggers simple (insert only, no complex logic)
- Move logic to application layer

**Priority:** 🔥 LAUNCH BLOCKER — refactor during API route creation (AR-001) (decided 2026-04-05)

---

### AR-004: Admin God-File Refactoring
**Status:** 🔄 In Progress  
**Severity:** ⚠️ HIGH

**Requirement:** Admin functionality should be modular, not a single god-file.

**Current State:**
- `app/admin/page.tsx` contains ALL admin mutations client-side
- 500+ lines of code
- Violates ADR-009
- Hard to maintain

**Recommendations:**
1. Extract to API routes (part of AR-001)
2. Split admin UI into separate pages
3. Move business logic to lib functions

**Effort:** 1 week (part of AR-001 work)  
**Priority:** 🔥 LAUNCH BLOCKER — part of AR-001 (decided 2026-04-05)

---

### AR-005: Design System Creation
**Status:** 📋 Planned  
**Severity:** 📋 MEDIUM

**Requirement:** Shared component library with design tokens.

**Current State:**
- `components/ui/` has only 2 files (ConfirmModal, ErrorBoundary)
- No design system primitives (Button, Input, Card, etc.)
- UI assembled ad-hoc with Tailwind utility classes
- No custom design tokens in Tailwind config

**Impact:**
- Inconsistent UI
- Hard to maintain
- No reusable components

**Recommendations:**
1. Add shadcn/ui or similar component library
2. Define design tokens (colors, spacing, typography)
3. Build component library incrementally

**Priority:** 📋 LOW (Ferd can ship without this)  
**Revisit:** Hamn M1

---

## Related Documents

**Analysis:**
- [ACTUAL_STATE.md](../../../implementation/ferd/baseline/ACTUAL_STATE.md) — Claude Code analysis (source of truth)

**Architecture:**
- [ARCHITECTURE_ANATOMY.md](../../../universe/architecture/ARCHITECTURE_ANATOMY.md) — Layered model (L0-L7, V1-V5)
- [Architecture Decisions](../../../universe/decisions/INDEX.md) — 24 locked ADRs
- [ARCHITECTURE_BASELINE.md](../../../implementation/ferd/baseline/BASELINE.md) — Live implementation state

**Planning:**
- [ROADMAP.md](../planning/ROADMAP.md) — Wave roadmap and milestones
- [SPRINT.md](../../../../SPRINT.md) — Active sprint tracker
- [DEFERRED.md](../planning/DEFERRED.md) — What we're NOT building yet

**Implementation:**
- [PROJECT_STATUS.md](../../../../PROJECT_STATUS.md) — Current project state
- [CHANGELOG.md](../../../../CHANGELOG.md) — Version history

---

**Last Updated:** 2026-04-05  
**Maintained By:** Stefan Stefansson  
**Source:** ACTUAL_STATE.md analysis by Claude Code (Opus 4.6), updated with PRODUCT_SPEC v2.0 alignment  
**Total Requirements:** 100 (77 Functional, 18 Non-Functional, 5 Architectural)  
**Vertical Requirements:** 38 (V1: 18, V2: 6, V3: 5, V4: 4, V5: 5)
