# Ferd — Requirements

This document defines all functional and non-functional requirements for Ferd, the Wave 1 web platform.

**Status Legend:**
- ✅ **Done** — Implemented, tested, shipped
- 🔄 **In Progress** — Currently being built
- 📋 **Planned** — In backlog, not yet started
- ⏸️ **Deferred** — Deliberately postponed (see ADR or DEFERRED.md)
- ❌ **Rejected** — Decided not to implement (see ADR)

---

## Table of Contents

1. [Functional Requirements](#functional-requirements)
   - [Identity & Authentication](#identity--authentication)
   - [Groups & Organization](#groups--organization)
   - [Journeys & Experience](#journeys--experience)
   - [Content & Communication](#content--communication)
   - [Discovery & Marketplace](#discovery--marketplace)
2. [Non-Functional Requirements](#non-functional-requirements)
   - [Performance](#performance)
   - [Security](#security)
   - [Accessibility](#accessibility)
   - [Internationalization](#internationalization)

---

## Functional Requirements

### Identity & Authentication

#### FR-001: User Registration
**Status:** ✅ Done (v0.2.0)  
**Owner:** Stefan  
**Completed:** 2026-02-15  
**Test Coverage:** ✅ BDD scenarios passing

**Description:**  
Users must be able to register for a FringeIsland account using email and password.

**Acceptance Criteria:**
- User can enter email, password, full name
- Email validation (format, uniqueness)
- Password requirements (min 8 chars, complexity)
- Email verification sent on registration
- User profile created automatically
- Personal group created automatically

**Technical Notes:**  
Uses Supabase Auth. See [ADR-F001](../architecture/DECISIONS.md#ADR-F001).

**BDD Scenarios:**  
See [authentication.feature](../../old_implementation/ferd/testing/bdd-scenarios/authentication.feature)

---

#### FR-002: Anonymous Visitor Access
**Status:** 📋 Planned (v0.3.0)  
**Owner:** Stefan  
**Target:** 2026-04-20  
**Dependencies:** None

**Description:**  
Visitors must be able to access FringeIsland anonymously with a temporary profile that converts to permanent on registration.

**Acceptance Criteria:**
- Anonymous session created on first visit (Supabase anonymous auth)
- Temporary profile flagged `is_temporary: true`
- Visitor can preview taster journeys
- Visitor can glimpse their garden door (but cannot enter)
- Registration converts anonymous → permanent
- All temporary data transferred to permanent profile
- Cleanup job removes abandoned temporary profiles after 30 days

**Technical Notes:**  
Implements the "shadow experience" from Universe vision. See [ADR-F004](../architecture/DECISIONS.md#ADR-F004).

**BDD Scenarios:**  
To be written in [visitor-experience.feature](../../old_implementation/ferd/testing/bdd-scenarios/visitor-experience.feature)

---

#### FR-003: Social Login
**Status:** ⏸️ Deferred  
**Reason:** See [ADR-F042](../architecture/DECISIONS.md#ADR-F042)

**Description:**  
Users should be able to register/login using Google, GitHub, or other OAuth providers.

**Why Deferred:**  
Email/password authentication is sufficient for Wave 1. Social login adds complexity without significant value for initial user base. Revisit in Hamn (Wave 2).

---

### Groups & Organization

#### FR-004: Group Creation
**Status:** ✅ Done (v0.2.5)  
**Owner:** Stefan  
**Completed:** 2026-03-18  
**Test Coverage:** ✅ BDD scenarios passing

**Description:**  
Users must be able to create groups for organizing collective journeys.

**Acceptance Criteria:**
- User can create a group with name, description, avatar
- Creator becomes Steward (leader) automatically
- Group has customizable roles (copied from templates)
- Group can be public, private, or invite-only
- Creator's personal group can join the new group

**Technical Notes:**  
Implements Universal Group Pattern. See [ADR-F006](../architecture/DECISIONS.md#ADR-F006).

**BDD Scenarios:**  
See [groups.feature](../../old_implementation/ferd/testing/bdd-scenarios/groups.feature)

---

#### FR-005: Group Invitations
**Status:** 🔄 In Progress (v0.3.0)  
**Owner:** Stefan  
**Started:** 2026-04-01  
**Target:** 2026-04-12  
**Dependencies:** FR-004

**Description:**  
Stewards must be able to invite members to their groups.

**Acceptance Criteria:**
- Steward can generate invite link
- Invite link expires after configurable period
- Invite link can be single-use or multi-use
- Invitee receives email notification
- Invitee can accept/decline invitation
- On accept, invitee's personal group joins the group
- On accept, invitee receives default Member role

**Technical Notes:**  
Uses token-based invite system. See [WIP: ADR-F018](../architecture/DECISIONS.md).

**BDD Scenarios:**  
In progress: [group-invitations.feature](../../old_implementation/ferd/testing/bdd-scenarios/group-invitations.feature)

**Current Blockers:**  
None

---

#### FR-006: Role Management
**Status:** ✅ Done (v0.2.6)  
**Owner:** Stefan  
**Completed:** 2026-03-22  
**Test Coverage:** ✅ BDD scenarios passing

**Description:**  
Stewards must be able to assign and customize roles within their groups.

**Acceptance Criteria:**
- Four role templates: Steward, Guide, Member, Observer
- Steward can assign roles to members
- Steward can customize role permissions
- Roles are group-scoped (different per group)
- Permission system enforced via `has_permission()` function
- Changes to roles update member capabilities immediately

**Technical Notes:**  
Three-layer permission model. See [ADR-F007](../architecture/DECISIONS.md#ADR-F007).

**BDD Scenarios:**  
See [roles-and-permissions.feature](../../old_implementation/ferd/testing/bdd-scenarios/roles-and-permissions.feature)

---

### Journeys & Experience

#### FR-007: Journey Catalog
**Status:** 🔄 In Progress (v0.3.0)  
**Owner:** Stefan  
**Started:** 2026-04-03  
**Target:** 2026-04-18  
**Dependencies:** None

**Description:**  
Users must be able to browse available journeys in a catalog.

**Acceptance Criteria:**
- Display journeys with title, description, thumbnail, duration
- Filter by category, difficulty, duration
- Search by keyword
- Preview journey structure (steps overview)
- See enrollment count and ratings
- Clear call-to-action to enroll

**Technical Notes:**  
Uses journey metadata from L4 Content layer. See [ANATOMY.md L3](../architecture/ANATOMY.md#L3-experience-engine).

**BDD Scenarios:**  
In progress: [journey-catalog.feature](../../old_implementation/ferd/testing/bdd-scenarios/journey-catalog.feature)

**Current Blockers:**  
None

---

#### FR-008: Journey Enrollment
**Status:** 📋 Planned (v0.3.0)  
**Owner:** Stefan  
**Target:** 2026-04-25  
**Dependencies:** FR-007

**Description:**  
Users must be able to enroll in journeys (individual or group enrollment).

**Acceptance Criteria:**
- User can enroll as individual
- Steward can enroll entire group
- Enrollment creates progress tracking record
- User sees enrolled journeys in "My Journeys"
- Group members see group journeys separately
- Enrollment triggers Journey Zero if first-time user

**Technical Notes:**  
L3 Experience Engine. Step type framework must be defined first. See [Sessions 01-03](../sessions/INDEX.md).

**BDD Scenarios:**  
To be written: [journey-enrollment.feature](../../old_implementation/ferd/testing/bdd-scenarios/journey-enrollment.feature)

---

#### FR-009: Journey Progress Tracking
**Status:** 📋 Planned (v0.3.0)  
**Owner:** Stefan  
**Target:** 2026-05-05  
**Dependencies:** FR-008

**Description:**  
System must track user progress through enrolled journeys.

**Acceptance Criteria:**
- Track which steps are completed
- Save user responses to reflection/assessment steps
- Calculate completion percentage
- Allow resuming from last position
- Support multiple simultaneous journeys
- Sync progress across devices (via backend)

**Technical Notes:**  
Progress data writes to `profile_data` table with `source: 'journey_step'`. See [ANATOMY.md L3](../architecture/ANATOMY.md#L3-experience-engine).

**BDD Scenarios:**  
To be written

---

### Content & Communication

#### FR-010: Profile Editing
**Status:** ✅ Done (v0.2.3)  
**Owner:** Stefan  
**Completed:** 2026-03-05  
**Test Coverage:** ✅ BDD scenarios passing

**Description:**  
Users must be able to edit their profile information.

**Acceptance Criteria:**
- Edit full name, bio, avatar
- Upload avatar image (max 2MB, jpg/png)
- Avatar stored in Supabase Storage
- Changes saved immediately
- Avatar displayed in navigation and group member lists

**Technical Notes:**  
Uses Supabase Storage with RLS policies. See [ADR-F005](../architecture/DECISIONS.md#ADR-F005).

**BDD Scenarios:**  
See [profile-management.feature](../../old_implementation/ferd/testing/bdd-scenarios/profile-management.feature)

---

#### FR-011: Group Forums
**Status:** 📋 Planned (v0.4.0)  
**Owner:** TBD  
**Target:** Q3 2026  
**Dependencies:** FR-004

**Description:**  
Groups must have discussion forums for async communication.

**Acceptance Criteria:**
- Create forum threads
- Reply to threads
- Edit/delete own posts
- Steward can moderate (delete any post)
- Notifications for replies
- Former members show as "Former Member" (soft anonymization)

**Technical Notes:**  
Deferred to Phase 1.5+. See [DEFERRED.md](../planning/DEFERRED.md).

**BDD Scenarios:**  
Not yet written

---

### Discovery & Marketplace

#### FR-012: Journey Search
**Status:** 📋 Planned (v0.5.0)  
**Owner:** TBD  
**Target:** Q4 2026  
**Dependencies:** FR-007

**Description:**  
Users must be able to search journeys by keyword, tag, or category.

**Acceptance Criteria:**
- Full-text search across journey titles and descriptions
- Filter by tags
- Sort by relevance, popularity, recency
- Search suggestions/autocomplete
- Save search filters

**Technical Notes:**  
L6 Discovery layer. See [ANATOMY.md L6](../architecture/ANATOMY.md#L6-discovery).

**BDD Scenarios:**  
Not yet written

---

## Non-Functional Requirements

### Performance

#### NFR-001: Page Load Performance
**Status:** 🔄 In Progress  
**Owner:** Stefan  
**Target:** Ongoing optimization

**Description:**  
Pages must load within acceptable time limits to ensure good user experience.

**Acceptance Criteria:**
- Initial page load: < 3s (3G connection)
- Time to Interactive: < 5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

**Measurement:**  
Using Lighthouse CI in deployment pipeline.

**Current Status:**  
Most pages meet criteria. Journey catalog needs optimization (tracked in [TECHNICAL_DEBT.md](../../old_implementation/ferd/handover/TECHNICAL_DEBT.md)).

---

#### NFR-002: Database Query Performance
**Status:** ✅ Done  
**Owner:** Stefan  
**Completed:** 2026-03-10

**Description:**  
Database queries must execute within acceptable time limits.

**Acceptance Criteria:**
- Simple queries (single table): < 50ms
- Complex queries (joins): < 200ms
- Full-text search: < 300ms
- All tables have appropriate indexes
- RLS policies optimized to avoid sequential scans

**Measurement:**  
Using Supabase Dashboard query analytics.

**Current Status:**  
All queries meet criteria. Indexes documented in [DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md).

---

### Security

#### NFR-003: Data Access Control
**Status:** ✅ Done  
**Owner:** Stefan  
**Completed:** 2026-02-20

**Description:**  
All data access must be controlled by Row Level Security (RLS) policies.

**Acceptance Criteria:**
- Every table has RLS enabled
- No application code bypasses RLS (except SECURITY DEFINER functions)
- Users can only access their own data or group data they're members of
- API routes enforce authentication
- JWT tokens validated on every request

**Technical Notes:**  
See [AUTHORIZATION_MODEL.md](../architecture/AUTHORIZATION_MODEL.md) for complete RLS policy documentation.

**Current Status:**  
All tables protected. Regular security audits in [Sessions](../sessions/INDEX.md).

---

### Accessibility

#### NFR-004: WCAG 2.1 AA Compliance
**Status:** 📋 Planned  
**Owner:** TBD  
**Target:** v1.0.0

**Description:**  
Ferd must meet WCAG 2.1 Level AA accessibility standards.

**Acceptance Criteria:**
- All interactive elements keyboard accessible
- Proper heading hierarchy (h1 → h2 → h3)
- Sufficient color contrast (4.5:1 for text)
- Form labels and error messages
- Alt text for images
- Screen reader compatible
- Focus indicators visible
- No keyboard traps

**Measurement:**  
Using axe DevTools and manual testing with screen readers.

**Current Status:**  
Partial compliance. Full audit needed. See [BACKLOG.md](../planning/BACKLOG.md).

---

### Internationalization

#### NFR-005: Multi-Language Support
**Status:** 📋 Planned  
**Owner:** TBD  
**Target:** v1.0.0

**Description:**  
Ferd must support multiple languages (initially English and Swedish).

**Acceptance Criteria:**
- All user-facing strings externalized to translation files
- Language switcher in navigation
- Locale-aware date/time formatting
- Locale-aware number formatting
- RTL support (for future Arabic, Hebrew)
- URL structure supports locale (e.g., /en/, /sv/)

**Technical Notes:**  
Using next-intl library. See [ADR-F013](../architecture/DECISIONS.md#ADR-F013).

**Current Status:**  
Architecture in place (i18n config in L0). Translation files not yet created.

---

## Requirements Summary

### By Status

**✅ Done:** 6 requirements  
**🔄 In Progress:** 3 requirements  
**📋 Planned:** 8 requirements  
**⏸️ Deferred:** 1 requirement  
**❌ Rejected:** 0 requirements

**Total:** 18 requirements documented

### By Priority (Phase 1)

**Critical (Must Have):**
- FR-001, FR-004, FR-006, NFR-003

**High (Should Have):**
- FR-002, FR-007, FR-008, FR-009, NFR-001, NFR-002

**Medium (Nice to Have):**
- FR-005, FR-010, NFR-004, NFR-005

**Low (Future):**
- FR-011, FR-012

---

## Requirement Template

Use this template when adding new requirements:

```markdown
#### FR-XXX: [Requirement Title]
**Status:** [📋 Planned | 🔄 In Progress | ✅ Done | ⏸️ Deferred | ❌ Rejected]  
**Owner:** [Name]  
**[Started | Completed | Target]:** [Date]  
**Dependencies:** [FR-XXX, FR-YYY]

**Description:**  
[1-2 sentence description]

**Acceptance Criteria:**
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

**Technical Notes:**  
[Links to architecture docs, ADRs, etc.]

**BDD Scenarios:**  
[Link to .feature file]
```

---

## Related Documents

**Architecture:**
- [ANATOMY.md](../architecture/ANATOMY.md) — Technical architecture
- [DECISIONS.md](../architecture/DECISIONS.md) — Why requirements are implemented this way

**Planning:**
- [ROADMAP.md](../planning/ROADMAP.md) — When requirements will be built
- [CURRENT_PHASE.md](../planning/CURRENT_PHASE.md) — Current development focus
- [BACKLOG.md](../planning/BACKLOG.md) — Prioritized upcoming work

**Implementation:**
- [KANBAN.md](../../old_implementation/ferd/status/KANBAN.md) — Visual status board
- [BDD Scenarios](../../old_implementation/ferd/testing/bdd-scenarios/) — Executable specifications

---

**Last Updated:** 2026-04-04  
**Maintained By:** Stefan Stefansson
