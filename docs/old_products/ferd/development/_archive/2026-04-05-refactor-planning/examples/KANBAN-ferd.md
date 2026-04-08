# Ferd — Development Status Board

**Last Updated:** 2026-04-04 14:30 UTC  
**Current Phase:** 1.4 — Journey System  
**Sprint:** Week of 2026-04-01

---

## 🔄 In Progress (3)

### FR-005: Group Invitations
**Started:** 2026-04-01  
**Owner:** Stefan  
**Target:** 2026-04-12  
**Progress:** 60%

**What's being built:**
- Token-based invite link generation
- Email notification system
- Accept/decline flow

**Blockers:** None  
**Next Steps:** Complete accept flow, write tests

**BDD Status:** Scenarios written, implementation in progress  
**Files Changed:** `src/app/api/groups/invite/`, `src/components/GroupInviteModal.tsx`

---

### FR-007: Journey Catalog
**Started:** 2026-04-03  
**Owner:** Stefan  
**Target:** 2026-04-18  
**Progress:** 30%

**What's being built:**
- Journey listing page with cards
- Filter by category, difficulty
- Search functionality

**Blockers:** None  
**Next Steps:** Implement filters, add pagination

**BDD Status:** Scenarios 80% complete  
**Files Changed:** `src/app/journeys/page.tsx`, `src/components/JourneyCatalog.tsx`

---

### NFR-001: Page Load Performance
**Started:** 2026-03-25  
**Owner:** Stefan  
**Target:** Ongoing  
**Progress:** 75%

**What's being optimized:**
- Image optimization with Next.js Image
- Code splitting on journey pages
- Database query optimization

**Blockers:** Journey catalog needs dynamic imports  
**Next Steps:** Implement lazy loading for journey cards

**Measurement:** Lighthouse scores improving (75 → 85)  
**Files Changed:** Various optimization across codebase

---

## 📋 Planned — This Phase (5)

### FR-008: Journey Enrollment
**Priority:** High  
**Target:** 2026-04-25  
**Dependencies:** FR-007 (Journey Catalog)

**Why it's next:**  
Core journey functionality. Needed before progress tracking.

**Acceptance Criteria:**
- Individual enrollment
- Group enrollment (Steward-initiated)
- Enrollment confirmation flow
- "My Journeys" page updates

**BDD Status:** Scenarios to be written  
**Estimated Effort:** 3-4 days

---

### FR-009: Journey Progress Tracking
**Priority:** High  
**Target:** 2026-05-05  
**Dependencies:** FR-008 (Journey Enrollment)

**Why it's next:**  
Enables users to actually take journeys. Critical path feature.

**Acceptance Criteria:**
- Track step completion
- Save user responses to `profile_data`
- Resume from last position
- Progress percentage calculation

**BDD Status:** Not started  
**Estimated Effort:** 5-6 days

---

### FR-002: Anonymous Visitor Access
**Priority:** Medium  
**Target:** 2026-04-20  
**Dependencies:** None

**Why it's next:**  
Enables the "shadow experience" from vision. Important for user acquisition.

**Acceptance Criteria:**
- Anonymous Supabase session
- Temporary profile (`is_temporary: true`)
- Conversion flow on registration
- Cleanup job for abandoned profiles

**BDD Status:** Not started  
**Estimated Effort:** 2-3 days

---

### NFR-004: WCAG 2.1 AA Compliance Audit
**Priority:** Medium  
**Target:** 2026-05-15  
**Dependencies:** None

**Why it's next:**  
Required for v1.0. Better to fix incrementally than at the end.

**Acceptance Criteria:**
- Full accessibility audit
- Fix critical issues (keyboard nav, color contrast)
- Document compliance status
- Automated testing setup

**BDD Status:** Not applicable (audit task)  
**Estimated Effort:** 4-5 days

---

### FR-010: Enhanced Profile Editing
**Priority:** Low  
**Target:** 2026-05-20  
**Dependencies:** None

**Why it's planned:**  
Nice-to-have improvements. Not blocking other features.

**Acceptance Criteria:**
- Add bio formatting (basic markdown)
- Add social links (optional)
- Add timezone selection
- Add notification preferences

**BDD Status:** Not started  
**Estimated Effort:** 2 days

---

## ✅ Recently Completed (Last 30 Days)

### FR-006: Role Management
**Completed:** 2026-03-22  
**Owner:** Stefan  
**Duration:** 4 days

**What shipped:**
- Role assignment interface for Stewards
- Permission customization per group
- `has_permission()` enforcement throughout app
- Role templates (Steward, Guide, Member, Observer)

**BDD Status:** ✅ All scenarios passing  
**Released:** v0.2.6

---

### FR-004: Group Creation
**Completed:** 2026-03-18  
**Owner:** Stefan  
**Duration:** 3 days

**What shipped:**
- Group creation modal
- Avatar upload for groups
- Privacy settings (public/private/invite-only)
- Universal Group Pattern implementation

**BDD Status:** ✅ All scenarios passing  
**Released:** v0.2.5

---

### NFR-003: Data Access Control
**Completed:** 2026-02-20  
**Owner:** Stefan  
**Duration:** 5 days (spread over 2 weeks)

**What shipped:**
- RLS policies on all tables
- Security audit of bypass paths
- Authorization model documentation
- `has_permission()` helper function

**BDD Status:** Security tests passing  
**Released:** v0.2.1

---

### FR-010: Profile Editing
**Completed:** 2026-03-05  
**Owner:** Stefan  
**Duration:** 2 days

**What shipped:**
- Profile edit modal
- Avatar upload with Supabase Storage
- Real-time preview
- RLS policies for avatars

**BDD Status:** ✅ All scenarios passing  
**Released:** v0.2.3

---

### FR-001: User Registration
**Completed:** 2026-02-15  
**Owner:** Stefan  
**Duration:** 3 days

**What shipped:**
- Registration form with validation
- Email verification flow
- Automatic profile creation
- Automatic personal group creation

**BDD Status:** ✅ All scenarios passing  
**Released:** v0.2.0

---

### NFR-002: Database Query Performance
**Completed:** 2026-03-10  
**Owner:** Stefan  
**Duration:** 2 days

**What shipped:**
- Index optimization on all tables
- Query performance monitoring
- RLS policy optimization
- Documentation in DATABASE_SCHEMA.md

**Performance:** All queries < 200ms  
**Released:** v0.2.4

---

## ⏸️ Deferred (1)

### FR-003: Social Login
**Deferred Date:** 2026-02-10  
**Reason:** See [ADR-F042](../architecture/DECISIONS.md#ADR-F042)

**Why deferred:**  
Email/password sufficient for Wave 1. Social login adds complexity without clear value for initial users. Revisit for Hamn (Wave 2).

**Revisit Trigger:**  
When user feedback indicates strong demand, or when targeting specific user segments that expect social login.

---

## ❌ Rejected (0)

No requirements rejected yet.

---

## 🚧 Blocked (0)

No items currently blocked.

---

## Summary Statistics

### Completion Metrics

**Overall Phase 1 Progress:**
- Total Requirements: 18
- Completed: 6 (33%)
- In Progress: 3 (17%)
- Planned: 8 (44%)
- Deferred: 1 (6%)
- Rejected: 0 (0%)

**Phase 1.4 Specific (Journey System):**
- Total: 5 requirements
- Completed: 0
- In Progress: 2 (FR-007, FR-008 pending)
- Planned: 3 (FR-008, FR-009, FR-002)

### Velocity (Last 30 Days)

**Completed:** 6 requirements  
**Average Time:** 3.2 days per requirement  
**Estimated Velocity:** ~1.8 requirements/week

**Burn-down Projection:**  
At current velocity, Phase 1 completion: ~6-7 weeks (mid-May 2026)

### Quality Metrics

**BDD Coverage:** 85% (6/7 completed features have BDD scenarios)  
**Test Pass Rate:** 100% (all implemented scenarios passing)  
**Technical Debt Items:** 3 (tracked in [TECHNICAL_DEBT.md](../handover/TECHNICAL_DEBT.md))

---

## Phase Breakdown

### Phase 1.1: Foundation ✅ COMPLETE
- FR-001: User Registration ✅
- NFR-003: Data Access Control ✅
- NFR-002: Database Query Performance ✅

**Completed:** 2026-03-10

---

### Phase 1.2: Groups ✅ COMPLETE
- FR-004: Group Creation ✅
- FR-006: Role Management ✅
- FR-010: Profile Editing ✅

**Completed:** 2026-03-22

---

### Phase 1.3: Invitations 🔄 IN PROGRESS
- FR-005: Group Invitations 🔄

**Target:** 2026-04-12  
**Status:** 60% complete

---

### Phase 1.4: Journey System 🔄 IN PROGRESS
- FR-007: Journey Catalog 🔄
- FR-008: Journey Enrollment 📋
- FR-009: Journey Progress Tracking 📋
- FR-002: Anonymous Visitor Access 📋

**Target:** 2026-05-05  
**Status:** 15% complete (1 of 4 in progress)

---

### Phase 1.5: Enhancements 📋 PLANNED
- FR-011: Group Forums 📋
- NFR-004: WCAG Compliance 📋
- NFR-005: Multi-Language Support 📋

**Target:** Q3 2026  
**Status:** Not started

---

## Sprint Planning

### Current Sprint (Week of 2026-04-01)

**Goal:** Complete Group Invitations, advance Journey Catalog

**Committed:**
- FR-005: Complete invite accept/decline flow
- FR-007: Add filters and search
- NFR-001: Optimize journey catalog performance

**Stretch:**
- FR-008: Start enrollment flow design

**Daily Updates:**
- Monday: Invite email system wired up
- Tuesday: Accept flow 70% complete
- Wednesday: Journey filters working
- Thursday: [Today] Working on search functionality

---

### Next Sprint (Week of 2026-04-08)

**Proposed Goal:** Ship Journey Catalog, start Journey Enrollment

**Proposed Commitments:**
- FR-007: Complete and ship Journey Catalog
- FR-008: Design and start enrollment flow
- FR-002: Start anonymous visitor implementation

**Dependencies:**
- FR-007 must ship before FR-008 can be meaningful

---

## Related Documents

**Requirements:** [REQUIREMENTS.md](../../old_products/ferd/specification/REQUIREMENTS.md)  
**Roadmap:** [ROADMAP.md](../../old_products/ferd/planning/ROADMAP.md)  
**Current Phase:** [CURRENT_PHASE.md](../../old_products/ferd/planning/CURRENT_PHASE.md)  
**Backlog:** [BACKLOG.md](../../old_products/ferd/planning/BACKLOG.md)  
**Technical Debt:** [TECHNICAL_DEBT.md](../handover/TECHNICAL_DEBT.md)  
**BDD Scenarios:** [testing/bdd-scenarios/](../testing/bdd-scenarios/)

---

**Maintained by:** Stefan Stefansson  
**Update Frequency:** Daily during active development  
**Review Schedule:** Weekly on Fridays
