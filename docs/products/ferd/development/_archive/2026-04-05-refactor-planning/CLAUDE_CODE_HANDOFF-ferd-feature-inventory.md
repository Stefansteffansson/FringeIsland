# Claude Code Session: Ferd Feature Inventory & Gap Analysis

**Session Date:** 2026-04-04  
**Repository:** `Stefansteffansson/FringeIsland`  
**Current Version:** v0.2.37  
**Wave:** Ferd 1.6 (Polish & Launch)

---

## Session Objectives

1. **Analyze Ferd codebase** — focus on layers with real code (L2, L3, L5) and all 5 verticals
2. **Map implementation to Architecture Anatomy layers** (L0-L7)
3. **Generate ACTUAL_STATE.md** showing current state vs intended architecture
4. **"Builds up" foundation check** — are lower layers solid enough to support what's above them?
5. **Vertical analysis with cross-layer tracing** — do verticals cut through every active layer? (merged: entity CRUD + moderation + layer reach)
6. **Layer alignment & ADR-009 compliance** — does code respect layer boundaries? Do mutations go through API routes? (merged: structural integrity)
7. **Permission enforcement audit** — which of 39 permissions are actually checked?
8. **Self-serve vs Admin capability matrix** — what can users do themselves vs what requires admin?
9. **Platform API & Design System assessment** — API completeness, versioning, a11y
10. **Test coverage alignment** — do tests cover the architecture proportionally? (note: full test review deferred to post-refactoring)
11. **Connect findings to documentation restructuring** (Step 2)

---

## Context: Why This Matters

**Problem:** Ferd's architecture anatomy was created late in development (March 2026). Many features were built before the layered architecture existed. The documentation has become ambiguous and needs restructuring. This feature inventory is **Step 1** — establishing ground truth about what's actually built, so the documentation restructuring (Step 2) is grounded in reality.

**Step 1 (this session):** Feature inventory & gap analysis -> produces ACTUAL_STATE.md
**Step 2 (next):** Documentation restructuring plan informed by ACTUAL_STATE.md

**Critical findings from pre-analysis:**
- **DeusEx group** — Admin dashboard exists but lacks full CRUD for users, groups, journeys, and roles
- **Roles & permissions** — 39 permissions defined but enforcement depth unknown
- **Visitor/temporary profiles** — Confirmed NOT IMPLEMENTED
- **i18n** — Confirmed NOT IMPLEMENTED
- **L4, L6, L7** — Confirmed EMPTY (Content, Discovery, Intelligence layers unbuilt)

---

## Repo Structure

**No `src/` wrapper.** All paths are from repo root:

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js 16.1 App Router pages & API routes |
| `components/` | React components (admin, auth, dashboard, groups, journeys, notifications, profile, ui) |
| `lib/` | Shared utilities, types, Supabase clients, hooks |
| `supabase/` | Migrations, seeds, config |
| `tests/` | Jest integration + Playwright E2E |
| `scripts/` | CLI utilities (migration apply, cleanup, etc.) |
| `docs/` | All project documentation |
| `public/` | Static assets |

**Key file paths:**
- Supabase browser client: `lib/supabase/client.ts`
- Supabase server client: `lib/supabase/server.ts`
- Supabase middleware client: `lib/supabase/middleware.ts`
- Auth proxy: `proxy.ts` (Next.js 16, not middleware.ts)
- Email (stub): `lib/email/send.ts` (console.log only)

---

## Required Reading

Before starting code analysis, read these documents:

1. **ARCHITECTURE_ANATOMY.md** (`docs/architecture/ARCHITECTURE_ANATOMY.md`) — The layered architecture model
   - 8 layers (L0 Infrastructure -> L7 Intelligence)
   - 5 verticals (Administration, Privacy, Notifications, Observability, Transactions)
   - Platform API ring
   - Design system

2. **ARCHITECTURE_ANATOMY_DIAGRAM.svg** (`docs/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg`) — Visual representation

**Key architectural principles:**
- Nothing at a higher layer exists without everything below it being solid
- L3 (Experience Engine) is the architectural linchpin
- RLS enforces all data access at database level
- Platform API ring is the contract between backend and frontends
- ADR-009: API-first — Database -> API route -> Frontend component (never Database -> Frontend directly)

---

## Known Database Tables (19 total, all with RLS)

From `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` and subsequent migrations:

| Table | Layer | Purpose |
|-------|-------|---------|
| `users` | L1 | User profiles (nickname, display_preference, show_real_name) |
| `permissions` | L2 | 39 system-defined permissions |
| `role_templates` | L2 | Steward, Guide, Member, Observer templates |
| `group_templates` | L2 | Group type templates |
| `groups` | L2 | Universal group pattern (personal + regular groups) |
| `group_memberships` | L2 | User-to-group and group-to-group membership |
| `group_roles` | L2 | Group-scoped role instances |
| `group_role_permissions` | L2 | Permission assignments per group role |
| `user_group_roles` | L2 | User role assignments within groups |
| `role_template_permissions` | L2 | Default permissions per role template |
| `group_template_roles` | L2 | Default roles per group template |
| `journeys` | L3 | Journey catalogue (8 predefined journeys) |
| `journey_enrollments` | L3 | Individual + group enrollment |
| `notifications` | V3 | 7 notification types with Realtime push |
| `forum_posts` | L5 | Group forum with flat threading |
| `conversations` | L5 | DM conversation containers |
| `direct_messages` | L5 | 1:1 messages within conversations |
| `admin_audit_log` | V4 | Admin action audit trail |
| `pending_email_invitations` | L2 | Email-based group invitations |

**Tables that DO NOT exist (referenced in anatomy but not built):**
- `profile_data` — No profile accumulation layer
- `activity_feed` — No activity stream
- `feature_flags` — No feature flag system
- `journey_steps` — Steps are embedded in journey config, not a separate table
- `journey_progress` — Progress tracking approach TBD

---

## Known Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| `has_permission(uuid, uuid, text)` | SECURITY DEFINER | Core RBAC check — used extensively in RLS policies |
| `is_platform_admin(uuid)` | SECURITY DEFINER (simple SQL) | Checks DeusEx group membership — used in admin RLS policies |
| `handle_new_user()` | Trigger | Creates personal group, sets nickname from full_name |
| `sync_display_name_to_personal_group()` | Trigger | Syncs nickname/display changes to personal group name |
| `handle_notification_action()` | RPC | Processes smart notification accept/decline actions |
| `get_user_permissions()` | RPC | Returns user's permissions for a group (used by frontend hook) |

**NOT present:** `pg_cron` jobs, cleanup schedulers, temporary profile reaping.

---

## Analysis Plan (Trimmed)

### What to SKIP (already confirmed)

These items are confirmed and don't need re-verification:
- **L0 Infrastructure:** Supabase is configured and working (19 tables, 659 tests pass, app runs)
- **L1 Visitor support:** NOT implemented (no `is_temporary`, no anonymous sessions)
- **L1 i18n:** NOT configured (no translation files, no locale routing)
- **L4 Content:** NOT implemented (no rich text editor, no media uploads, no assessment frameworks)
- **L6 Discovery:** NOT implemented (no search, no recommendations, no marketplace)
- **L7 Intelligence:** NOT implemented (no AI mentor, no profile accumulation, no Whisp)
- **V5 Transactions:** NOT implemented (correctly locked for Ferd)

### What to FOCUS ON (deep investigation needed)

---

## Focus Area 0: "Builds Up" Foundation Check (FIRST PASS)

**Principle:** The anatomy's core rule — "nothing above exists without everything below being solid." Before deep-diving any layer, quickly assess whether lower layers are solid enough to support what's built above them.

**Quick assessment:**

| Layer | Solid? | What's Missing That Affects Higher Layers? |
|-------|--------|-------------------------------------------|
| L0 Infrastructure | Mostly | No pg_cron (affects cleanup), no feature flags, no email delivery (affects V3 at every layer), no i18n |
| L1 Identity | Partial | No visitor profiles (does L3 enrollment assume permanent users?), no profile_data (does L7 depend on this?) |
| L2 Organisation | Check | Permissions defined but enforcement unknown — if L2 permission checks are hollow, L3/L5 features gated by them are unprotected |
| L3 Experience Engine | Check | Only 3 step types — does the content model support what L4 would need? |

**Key questions:**
- Does any L3 code assume visitor/temporary profiles exist?
- Does any L5 code assume profile_data or activity_feed tables exist?
- Are L3 enrollment flows gated by permissions that aren't actually enforced?
- Does the email stub break any L2 invitation flows in production?

---

## Focus Area 1: L2 -- Organisation (Deep Dive)

**What to verify:**

| Element | Known Status | Investigate |
|---------|-------------|-------------|
| Universal group pattern | Implemented (D15, v0.2.29) | Verify completeness |
| Group CRUD | Partial? | **Can admin create/edit/delete ANY group?** |
| Group-scoped roles | `group_roles` + `user_group_roles` | **Can admin manage roles for any group?** |
| Permissions | 39 defined | **Which are actually checked in RLS + frontend?** |
| has_permission() | Used in RLS | **How many RLS policies actually call it?** |
| DeusEx admin | Dashboard exists | **What admin operations are actually available?** |
| Member management | Admin can view members | **Can admin add/remove/change role of any member?** |

**Key question:** The admin interface exists but is known to lack full administration of users, groups, journeys, and roles. Map exactly what admin CAN vs CANNOT do.

**Files to check:**
- `app/admin/` — all admin pages and routes
- `app/admin/deusex/` — DeusEx management
- `app/admin/fix-orphans/` — orphan group handling
- `components/admin/` — AdminDataPanel, DeusexMemberList, GroupPickerModal, MessageModal, NotifyModal, UserActionBar
- `lib/admin/` — action-bar-logic.ts, admin-users-query.ts, selection-model.ts, user-filter.ts
- `app/api/admin/` — admin API routes
- `supabase/seeds/01_permissions.sql` — all 39 permission definitions
- `lib/hooks/usePermissions.ts` — frontend permission hook
- `lib/constants/permissions.ts` — permission constants

**Permission enforcement audit:**
1. List all 39 permissions from seed file
2. For each, grep for usage in: RLS policies (migrations), frontend components (.tsx), API routes
3. Classify as: ENFORCED (RLS + frontend), PARTIAL (one or the other), DEFINED ONLY (never checked)

---

## Focus Area 2: L3 -- Experience Engine (Deep Dive)

**What to verify:**

| Element | Known Status | Investigate |
|---------|-------------|-------------|
| Journeys table | 8 predefined | **Can admin create/edit/delete journeys?** |
| Journey steps | Embedded in config | **What's the actual data structure?** |
| Step types | 3 (content, activity, assessment) | **How extensible is the renderer?** |
| Enrollments | API routes exist (v0.2.37) | **Does enrollment UI work end-to-end?** |
| Progress tracking | Basic | **What exactly is tracked? Where stored?** |
| Journey designer | Unknown | **Any journey creation/editing UI?** |

**Key question:** Journeys are read-only (pre-authored). There is no journey creation or editing interface. Confirm this and assess what would be needed.

**Files to check:**
- `app/journeys/` — catalogue and detail pages
- `app/journeys/[id]/play/page.tsx` — journey player
- `components/journeys/` — JourneyPlayer, StepContent, StepSidebar, ProgressBar
- `lib/types/journey.ts` — type definitions (StepType = 'content' | 'activity' | 'assessment')
- `app/api/v1/journeys/` — enrollment API routes

---

## Focus Area 3: L5 -- Communication (Deep Dive)

**What to verify:**

| Element | Known Status | Investigate |
|---------|-------------|-------------|
| Direct messages | Implemented (v0.2.15) | **ADR-009 compliant? Or direct DB calls?** |
| Group forums | Implemented (v0.2.14) | **ADR-009 compliant? Moderation working?** |
| Notifications | 7 types, Realtime | **Which events actually trigger notifications?** |
| Smart notifications | Accept/decline | **All notification types actionable?** |
| Announcements | Unknown | **Can Stewards broadcast to group?** |
| Activity feed | NOT implemented | Confirmed gap |

**Files to check:**
- `app/messages/` — DM pages
- `lib/messaging/MessagingContext.tsx` — messaging state
- `components/groups/forum/` — forum components
- `components/notifications/NotificationBell.tsx` — notification UI
- `lib/notifications/NotificationContext.tsx` — notification state

---

## Focus Area 4: Verticals with Cross-Layer Tracing (MERGED — HIGH PRIORITY)

**Principle:** Verticals are NOT standalone features — they cut through every active layer simultaneously. A vertical that only touches one or two layers is incomplete. For each vertical below, we investigate BOTH the feature checklist AND which layers it actually reaches.

### V1 — Administration / Moderation

**Known:** Admin dashboard exists at `/admin/` but LACKS full CRUD for core entities.

**Self-serve vs Admin capability matrix:**

| Entity | Operation | Self-Serve (user) | Admin (DeusEx) | Neither |
|--------|-----------|-------------------|----------------|---------|
| **Users** | View own profile | Check | — | |
| | Edit own profile | Check | — | |
| | Delete own account | Check | Check | |
| | View all users | — | Check | |
| | Edit any user's profile | — | Check | |
| | Deactivate/suspend a user | — | Check | |
| | Reset a user's password | — | Check | |
| **Groups** | Create a group | Check | Check | |
| | Edit own group (as Steward) | Check | — | |
| | Delete own group (as Steward) | Check | — | |
| | View all groups | — | Check | |
| | Edit any group's settings | — | Check | |
| | Delete any group | — | Check | |
| | Transfer stewardship | Check (nomination) | Check (override) | |
| | Leave a group | Check | — | |
| **Journeys** | Browse catalogue | Check | — | |
| | Enroll in journey | Check | — | |
| | View all journeys | — | Check | |
| | Create a journey | — | Check | |
| | Edit journey content/steps | — | Check | |
| | Publish/unpublish a journey | — | Check | |
| | Delete a journey | — | Check | |
| **Roles** | View own role in group | Check | — | |
| | Assign/change user roles (as Steward) | Check | Check | |
| | View roles for any group | — | Check | |
| | Create custom roles | — | Check | |
| | Edit role permissions | — | Check | |
| **Forum** | Create post | Check | — | |
| | Edit own post | Check | — | |
| | Delete own post | Check | — | |
| | Delete any post (moderation) | — | Check | |
| | Ban a user from posting | — | Check | |
| | View flagged content | — | Check | |
| **Messages** | Send DM | Check | — | |
| | Delete own messages | Check | — | |
| | Review any messages | — | Check | |

**Cross-layer trace — V1 Administration:**

| Layer | Admin Should Touch | Actually Touches? |
|-------|-------------------|-------------------|
| L0 | Feature flags, config management | Check |
| L1 | User account management (create, suspend, delete, password reset) | Check |
| L2 | Group management (create, edit, delete, transfer ownership), role management | Check |
| L3 | Journey management (create, edit, publish, unpublish, delete), enrollment overrides | Check |
| L5 | Content moderation (forum post removal, message review, user warnings/bans) | Check |

**Moderation sub-vertical (distinct from administration):**

| Element | Check |
|---------|-------|
| Content flagging system | Any "report post" or "flag content" UI? |
| Moderation queue | Any admin view of flagged content? |
| User warnings | Any warning/strike system? |
| User bans/suspensions | Any account restriction mechanism? |
| Moderation audit trail | Are moderation actions logged? |

**Files to check:**
- `app/admin/` — all admin pages
- `components/admin/` — all admin components (AdminDataPanel, UserActionBar, etc.)
- `lib/admin/` — admin business logic
- `app/api/admin/` — admin API routes

### V2 — Privacy / GDPR / AI Consent

**Investigate:**

| Element | Check |
|---------|-------|
| Data export (GDPR Art. 20) | Any "download my data" feature? |
| Data erasure (GDPR Art. 17) | Any "delete my account" feature? |
| Consent tracking | Any consent table or checkbox? |
| Privacy policy | Any privacy policy page or acceptance flow? |
| Cookie consent | Any cookie banner? |
| AI consent | Any opt-in for AI features? (prep for L7) |
| `show_real_name` toggle | Exists in users table — verify UI |

**Cross-layer trace — V2 Privacy:**

| Layer | Privacy Should Touch | Actually Touches? |
|-------|---------------------|-------------------|
| L0 | Data retention policies, backup encryption | Check |
| L1 | Profile visibility controls, data export, account deletion | Check |
| L2 | Group membership visibility, who-can-see-who | Check |
| L3 | Journey progress privacy (who sees my progress?) | Check |
| L5 | Message privacy (E2E?), forum post visibility, DM data retention | Check |

**Files to check:**
- `app/profile/` — profile pages (delete account option?)
- `components/auth/` — registration flow (consent checkbox?)
- `app/privacy/` or similar — privacy policy page?

### V3 — Notifications / Email / Push

**Investigate:**

| Element | Known Status | Check |
|---------|-------------|-------|
| Email delivery | STUB (`lib/email/send.ts` = console.log) | Confirm no real delivery |
| Email templates | Unknown | Any HTML templates? |
| Notification preferences | Unknown | Can user mute notification types? |
| Notification triggers | 7 types exist | Which events actually create notifications? |
| Push notifications | NOT implemented | No mobile push |
| Realtime subscriptions | Implemented | Verify reconnect handling |

**Cross-layer trace — V3 Notifications:**

| Layer | Notifications Should Touch | Actually Touches? |
|-------|---------------------------|-------------------|
| L1 | Account events (password change, email verification) | Check |
| L2 | Group events (invited, role changed, member joined/left, group deleted) | Check |
| L3 | Journey events (enrolled, step completed, journey completed, new journey available) | Check |
| L5 | Communication events (new DM, new forum post, forum reply, @mention) | Check |

**For each notification type, verify the full chain:**
1. Event occurs (DB change)
2. Trigger fires (migration-defined)
3. Notification row created
4. Realtime pushes to frontend
5. Bell UI displays it
6. User can act on it (if smart notification)

**Files to check:**
- `lib/email/send.ts` — email stub
- `lib/notifications/NotificationContext.tsx` — notification logic
- Migration files — notification trigger functions
- Any notification preferences UI

### V4 — Observability / Audit / Errors

**Investigate:**

| Element | Known Status | Check |
|---------|-------------|-------|
| `admin_audit_log` table | EXISTS | What actions are logged? |
| Audit log UI | Unknown | Can admin view the log? |
| Error tracking (Sentry) | NOT configured | Sprint plan step 6 |
| Structured logging | Unknown | Any logging beyond console.log? |
| Health checks | Unknown | Any monitoring endpoints? |

**Cross-layer trace — V4 Observability:**

| Layer | Observability Should Touch | Actually Touches? |
|-------|---------------------------|-------------------|
| L0 | Infrastructure health, DB connection monitoring | Check |
| L1 | Auth events (login, logout, failed attempts) | Check |
| L2 | Group lifecycle events (created, deleted, membership changes) | Check |
| L3 | Journey events (enrollment, completion, step failures) | Check |
| L5 | Communication events (message delivery failures) | Check |
| V1 | Admin actions (all admin operations) | Check |

**Files to check:**
- Migration files — audit log triggers/writes
- `app/admin/` — audit log viewer?
- Any Sentry or error boundary setup

---

## Focus Area 5: Layer Alignment & ADR-009 Compliance (MERGED)

**Two related concerns combined:**
1. **Layer alignment:** Is code in the correct layer? Does it reach across boundaries?
2. **ADR-009:** Do data mutations go through API routes, or does the frontend call Supabase directly?

### Layer Alignment Checks

| Check | What to Look For |
|-------|-----------------|
| **Components containing business logic** | Frontend components (`.tsx`) that do more than render — e.g., computing permissions, transforming data, orchestrating multi-step operations. Business logic belongs in API routes or lib functions, not components. |
| **API routes reaching into wrong layers** | An API route for L3 (journeys) that directly manages L2 (group memberships) or L5 (notifications) instead of calling those layers' own functions. |
| **Database triggers doing application work** | Triggers that send notifications, manage memberships, or orchestrate workflows. Triggers should enforce data integrity, not implement features. |
| **Cross-layer coupling** | Components that import from multiple unrelated layers (e.g., a journey component importing admin logic). |

### ADR-009 Compliance Checks

**Audit method:**
1. Grep all `.tsx` files in `app/` and `components/` for direct Supabase mutation calls:
   - `.insert(`, `.update(`, `.delete(`, `.upsert(`
   - `.rpc(` (some RPCs may be acceptable)
2. For each hit, determine if it should go through an API route instead
3. Map which feature areas have API routes vs direct calls

**Known compliant:** Journey enrollment (3 API routes under `/api/v1/journeys/`)
**Suspected non-compliant:** Group management, messaging, forum posts, notifications, profile updates

**API routes inventory:**
- `app/api/admin/` — admin routes
- `app/api/invitations/` — invitation routes
- `app/api/v1/` — versioned API routes
- **Check:** Are there routes for groups, messages, forum, profile, notifications?

### Combined Audit Per Feature

| Feature | DB Layer | API Route? | ADR-009? | Component Layer | Business Logic Placement | Violations |
|---------|----------|-----------|----------|----------------|-------------------------|------------|
| Auth/Registration | L1 | Check | Check | Check | Check | |
| Group management | L2 | Check | Check | Check | Check | |
| RBAC/Permissions | L2 | Check | Check | Check | Check | |
| Journey catalogue | L3 | Check | Check | Check | Check | |
| Journey player | L3 | Check | Check | Check | Check | |
| Enrollment | L3 | Yes (3 routes) | Compliant | Check | Check | |
| Direct messaging | L5 | Check | Check | Check | Check | |
| Forum | L5 | Check | Check | Check | Check | |
| Notifications | V3 | Check | Check | Check | Check | |
| Admin/DeusEx | V1 | Check | Check | Check | Check | |

---

## Focus Area 6: Test Coverage Alignment (Lightweight)

**Purpose:** Understand whether the test suite covers the architecture proportionally. This is a quick assessment, NOT a full test review — the thorough test review is deferred to after refactoring.

**What to check:**

| Question | How to Check |
|----------|-------------|
| Which layers have the most tests? | Count test files per domain (auth, groups, journeys, rls, rbac, admin, communication, security) |
| Which layers have NO tests? | Cross-reference test domains against anatomy layers |
| Are verticals tested? | Any tests for admin CRUD, notification triggers, audit logging, privacy controls? |
| Are RLS policies tested? | Dedicated RLS test suite exists — how comprehensive? |
| Are permissions tested? | RBAC test suite — does it cover all 39 permissions? |
| What's the E2E coverage? | 7 Playwright tests — which user flows do they cover? |

**Test commands for reference:**
- Domain scripts: `:auth`, `:groups`, `:journeys`, `:rls`, `:rbac`, `:admin`, `:communication`, `:security`
- `npm run test:integration` — full suite (~8 min)

**Note:** This focus area produces a coverage MAP, not a quality assessment. The goal is to identify blind spots in test coverage relative to the architecture. A full test quality review will happen after the refactoring work.

---

## Focus Area 7: Platform API & Design System

### Platform API Ring

The anatomy defines a Platform API ring as the contract between backend and frontends. This is more than just ADR-009 — it's about whether the API surface is designed for multi-platform consumption.

| Element | Check |
|---------|-------|
| API versioning | Is `/api/v1/` used consistently? Any unversioned routes? |
| API completeness | Could an iOS/Android app be built using only the current API routes? |
| API documentation | Any OpenAPI/Swagger spec? Any route documentation? |
| Rate limiting | Any rate limiting on API routes? |
| Error response format | Consistent error response structure across routes? |
| Authentication pattern | Consistent JWT/Bearer token handling across routes? |

### Design System

| Element | Check |
|---------|-------|
| Component library | Is `components/ui/` a coherent design system or ad-hoc components? |
| Accessibility (a11y) | ARIA labels, keyboard navigation, focus management, screen reader support? |
| Responsive design | Mobile-first? Breakpoints consistent? |
| Visual consistency | Consistent spacing, typography, color usage? |
| Loading/error states | Consistent patterns for loading spinners, error messages, empty states? |

**Files to check:**
- `components/ui/` — all shared UI components
- Any `.css` or Tailwind config for design tokens
- Page components for a11y attributes

---

## Output Format

Generate **ACTUAL_STATE.md** in `docs/planning/` with this structure:

```markdown
# Ferd Actual State Analysis
**Version:** v0.2.37
**Analysis Date:** 2026-04-04
**Analyst:** Claude Code

---

## Executive Summary

**Overall completion:** X% of intended architecture implemented

**Strengths:**
- [List well-implemented areas]

**Critical gaps:**
- [List missing foundations]

**Architectural debt:**
- [List misalignments]

---

## "Builds Up" Foundation Assessment

| Layer | Solid? | Gaps Affecting Higher Layers |
|-------|--------|------------------------------|
| L0 | Mostly | [findings] |
| L1 | Partial | [findings] |
| L2 | Check | [findings] |
| L3 | Check | [findings] |

---

## Layer-by-Layer Status

### Confirmed Layers (no deep verification)

| Layer | Status | Summary |
|-------|--------|---------|
| L0 Infrastructure | WORKING | 19 tables, RLS on all, Supabase configured. Gaps: no pg_cron, no feature flags, email stub, no i18n |
| L1 Identity | PARTIAL | Auth + profiles + display names work. Missing: visitor profiles, profile_data |
| L4 Content | NOT BUILT | No rich text editor, no media uploads, no assessment frameworks |
| L6 Discovery | NOT BUILT | No search, no recommendations |
| L7 Intelligence | NOT BUILT | No AI, no profile accumulation |

### L2 -- Organisation (DEEP DIVE)
[Detailed findings — permission enforcement, admin capabilities]

### L3 -- Experience Engine (DEEP DIVE)
[Detailed findings — journey system completeness, step types]

### L5 -- Communication (DEEP DIVE)
[Detailed findings — DMs, forums, notifications, ADR-009 compliance]

---

## Vertical Status (with Cross-Layer Coverage)

### V1 -- Administration / Moderation

**Self-Serve vs Admin Capability Matrix:**
| Entity | Operation | Self-Serve | Admin | Neither |
|--------|-----------|-----------|-------|---------|
| Users | [operations] | ? | ? | ? |
| Groups | [operations] | ? | ? | ? |
| Journeys | [operations] | ? | ? | ? |
| Roles | [operations] | ? | ? | ? |
| Forum | [operations] | ? | ? | ? |

**Cross-Layer Coverage:**
| L0 | L1 | L2 | L3 | L5 | Coverage |
|----|----|----|----|----|----------|
| ? | ? | ? | ? | ? | ?/5 |

**Moderation Sub-Vertical:**
[Findings — flagging, warnings, bans, moderation queue]

### V2 -- Privacy / GDPR
[Findings + cross-layer coverage]

### V3 -- Notifications / Email
[Findings — trigger inventory per layer, delivery chain status]

### V4 -- Observability / Audit
[Findings — what's logged per layer, what's not]

### V5 -- Transactions
Locked — not for Ferd.

---

## Permission Enforcement Audit

| Permission | Defined | RLS Enforced | Frontend Checked | Status |
|------------|---------|-------------|-----------------|--------|
| view_member_list | Yes | ? | ? | ? |
| invite_members | Yes | ? | ? | ? |
[... all 39 permissions ...]

---

## Layer Alignment & ADR-009 Compliance

| Feature | DB Layer | API Route? | ADR-009 | Business Logic In... | Correct Layer? | Violations |
|---------|----------|-----------|---------|---------------------|---------------|------------|
| [feature] | L? | Yes/No | Compliant/Violation | Component/API/Trigger | Yes/No | [description] |

---

## Platform API & Design System

### API Surface Completeness
| Entity | List | Get | Create | Update | Delete | Coverage |
|--------|------|-----|--------|--------|--------|----------|
| Users | ? | ? | ? | ? | ? | |
| Groups | ? | ? | ? | ? | ? | |
| Journeys | ? | ? | ? | ? | ? | |
| Messages | ? | ? | ? | ? | ? | |
| Forum | ? | ? | ? | ? | ? | |

### Design System & a11y
[Findings]

---

## Test Coverage Alignment

| Domain | Test Count | Layer(s) Covered | Gaps |
|--------|-----------|-----------------|------|
| auth | ? | L1 | |
| groups | ? | L2 | |
| journeys | ? | L3 | |
| rls | ? | L0/L2 | |
| rbac | ? | L2 | |
| admin | ? | V1 | |
| communication | ? | L5 | |
| security | ? | L0 | |
| E2E (Playwright) | 7 | ? | |

**Note:** This is a coverage map, not a quality review. Full test review deferred to post-refactoring.

---

## Recommendations

### Immediate (Ferd Launch Blockers)
1. [Items that must be fixed before launch]

### Short-term (Ferd Polish)
1. [Items that improve quality but don't block launch]

### Deferred (Hamn or later)
1. [Features not needed for Ferd]

---

## Step 2: Documentation Restructuring

Based on ACTUAL_STATE findings:
1. Which docs describe features that don't exist? (remove/archive)
2. Which implemented features lack documentation? (create)
3. Where does doc structure not match architecture layers? (reorganize)
4. Which docs have stale information? (update)
5. Proposed new documentation structure aligned with anatomy
```

---

## Success Criteria

This session is successful if it produces:

1. **"Builds up" foundation assessment** — are lower layers solid enough to support what's above?
2. **Self-serve vs Admin capability matrix** — what can users do vs what requires admin, per entity
3. **Permission enforcement audit** — all 39 permissions classified as enforced/partial/unused
4. **Layer alignment & ADR-009 compliance** — is code in the right layer? Do mutations use API routes?
5. **Vertical cross-layer coverage** — do verticals actually cut through all active layers?
6. **Moderation assessment** — flagging, warnings, bans — distinct from admin CRUD
7. **Platform API surface assessment** — is the API complete enough for multi-platform?
8. **Design system & a11y assessment** — component consistency, accessibility
9. **Test coverage map** — which layers/verticals are tested, which are blind spots?
10. **Clear bridge to Step 2** — how findings inform documentation restructuring

---

## Notes for Claude Code

- **Start with "builds up" check** -- assess foundation solidity before deep-diving higher layers
- **Be thorough on verticals** -- trace each through every active layer; they are the biggest unknowns
- **Separate admin from moderation** -- admin is CRUD on entities; moderation is content/user policing
- **Distinguish self-serve from admin** -- what can users do themselves vs what requires DeusEx?
- **Be specific** -- cite file paths, line numbers, table names
- **Be honest** -- if something is half-done, say so
- **Skip confirmed items** -- don't re-verify L0, L4, L6, L7, visitor support, i18n
- **Focus on admin gaps** -- Stefan confirmed admin lacks full CRUD for users, groups, journeys, roles
- **Check layer alignment + ADR-009 together** -- trace each feature's full stack in one pass
- **Check permission enforcement** -- which of 39 permissions are actually checked?
- **Check a11y** -- ARIA labels, keyboard navigation, focus management in key components
- **Trace notification chains** -- event -> trigger -> notification row -> realtime -> bell UI -> action
- **Map test coverage to layers** -- lightweight count, not quality review (full review post-refactoring)
- **No `src/` prefix** -- all paths are from repo root: `app/`, `lib/`, `components/`
- **Use `bash supabase-cli.sh`** -- never `.bat` for Supabase CLI commands

---

## Questions to Answer

1. **Are lower layers solid enough?** (does L1 missing visitor profiles break anything in L3?)
2. **What can users do themselves vs what requires admin?** (self-serve vs admin per entity)
3. **What can admin actually do?** (CRUD matrix for each entity type)
4. **Which of 39 permissions are enforced?** (RLS + frontend)
5. **Which features violate ADR-009?** (direct DB calls from frontend)
6. **Is code in the right layer?** (business logic placement, cross-layer coupling)
7. **Do verticals cut through all layers?** (or do they only touch 1-2 layers?)
8. **Is moderation distinct from admin?** (flagging, warnings, bans — separate from CRUD)
9. **What GDPR/privacy features exist?** (data export, erasure, consent)
10. **Which notification events have working triggers?** (trace: event -> trigger -> row -> realtime -> UI)
11. **What admin actions are audit-logged?**
12. **Is the API surface multi-platform ready?** (versioning, completeness, error format)
13. **Is the UI accessible?** (a11y: ARIA, keyboard nav, screen readers)
14. **Which layers/verticals have test coverage?** (map, not review)
15. **What's blocking Ferd launch?** (vs nice-to-have vs deferred-to-Hamn)
16. **How should docs be restructured** based on what's actually built?

---

**Ready to begin analysis. Start with Focus Area 0 ("Builds Up" foundation check), then work through Focus Areas 1-7.**
