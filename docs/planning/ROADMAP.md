# FringeIsland Roadmap

**Version:** 2.0
**Last Updated:** February 28, 2026
**Links:** [Vision](../vision/VISION.md) | [Product Spec](PRODUCT_SPEC.md) | [Features](../features/) | [Sprint Tracker](../../SPRINT.md)

This document defines **WHEN** features are built. See [Product Spec](PRODUCT_SPEC.md) for **WHAT** and [Vision](../vision/VISION.md) for **WHY**. For current status, see [PROJECT_STATUS.md](../../PROJECT_STATUS.md). For version history, see [CHANGELOG.md](../../CHANGELOG.md).

---

## Overview

FringeIsland development is organized into four major phases:

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| **1** | Foundation (MVP) | Core platform with predefined journeys | **95%** — Phase 1.6 (Polish & Launch) remaining |
| **2** | User-Generated Content | Journey marketplace and customization | Not started |
| **3** | Dynamic Journeys | Adaptive learning paths | Not started |
| **4** | Developer Platform | API and integrations | Not started |

## Development Principles

1. **Ship Early, Ship Often**: Release Phase 1 as MVP, iterate based on feedback
2. **User-Centric**: Validate features with real users before building
3. **Technical Excellence**: Clean architecture, comprehensive tests, good documentation
4. **Flexible Foundation**: Build systems that can evolve (avoid rigid assumptions)
5. **TDD Mandatory**: Behaviors → Failing tests (RED) → Implement (GREEN). See `docs/workflows/feature-development.md`

---

## Phase 1: Foundation (MVP) — 95% Complete

**Goal**: Launch a working platform where groups can embark on predefined journeys together.

### Completed Sub-Phases

| Sub-Phase | Scope | Version | Status |
|-----------|-------|---------|--------|
| **1.1** Core Infrastructure | Next.js, Supabase, Auth, Schema, RLS | v0.1.0–v0.2.1 | DONE |
| **1.2** User Management | Profiles, avatar upload, bio | v0.2.2 | DONE |
| **1.3** Group Management | Create, edit, invite, roles, last-leader protection | v0.2.3–v0.2.7 | DONE |
| **1.4** Journey System | Catalog, enrollment, content delivery, progress | v0.2.8–v0.2.11 | DONE |
| **1.5** Communication | Forums, DM, notifications, Realtime | v0.2.14–v0.2.15 | DONE |
| **1.5b** RBAC System | 22-decision permission system, 4 roles, 31 permissions | v0.2.16–v0.2.20 | DONE |
| **1.5c** Admin Foundation | DeusEx dashboard, user management, 10 admin actions | v0.2.21–v0.2.25 | DONE |
| **1.5d** Performance | 8-tier optimization (indexes, batching, caching) | v0.2.26–v0.2.28 | DONE |
| **1.5e** Lifecycle | 5 sprints: security, schema, leave-group, notifications, exit | v0.2.32–v0.2.36 | DONE |

See `docs/features/implemented/` for detailed feature documentation.
See `docs/planning/lifecycle-roadmap-decisions.md` for lifecycle sprint details and binding decisions.

### Phase 1.6: Polish and Launch — IN PROGRESS

**Goal**: Prepare platform for public launch with a small beta group.

**Remaining deliverables:**

1. **UI/UX Refinement**
   - Mobile responsiveness audit
   - Accessibility improvements (WCAG 2.1 AA)
   - User onboarding flow

2. **Testing**
   - Expand E2E test coverage (7 Playwright tests exist)
   - Performance testing
   - Security audit

3. **Documentation**
   - User guide
   - Help center articles

4. **Beta Testing**
   - Invite 10-20 beta users
   - Collect feedback, fix critical bugs, iterate on UX

5. **Launch**
   - Public launch announcement
   - Error monitoring (Sentry)
   - Rapid bug fixing

**Acceptance Criteria:**
- All critical bugs fixed
- Performance acceptable (< 2s page loads)
- Beta users satisfied
- Public launch successful

**Known Issues:**
- Orphan groups after hard delete (needs stewardship transfer UI)
- `app/admin/fix-orphans/page.tsx` uses `alert()` (should use ConfirmModal)
- Hydration mismatch warning in AuthForm.tsx (cosmetic)

---

## Phase 2: User-Generated Content

**Goal**: Enable users to create, customize, and share journeys in a marketplace.
**Timeline**: 2-3 months (after Phase 1 launch)
**Status**: Not started
**Design docs**: `docs/planning/archive/phase-2-designs/` (journey builder and journal system — need terminology update before use)

### 2.1: Journey Creation Tools (Weeks 1-3)
- Visual journey editor (drag-and-drop step ordering)
- Step types: content, activity, assessment
- Rich text editor, media upload
- Journey templates and duplication

### 2.2: Journey Marketplace (Weeks 4-6)
- Publishing workflow (public/private/unlisted)
- Browse, search, filter published journeys
- Ratings and reviews (1-5 stars)
- Basic analytics (views, enrollments, completion rate)

### 2.3: Enhanced Collaboration (Weeks 7-8)
- Journey co-creation (invite collaborators)
- Groups-join-groups UI (schema ready, D11 circularity trigger needed)
- Enhanced forums (rich media, polls, search)

**Success Criteria:**
- Users can create and publish journeys
- 100+ user-created journeys published
- 4.0+ average journey rating

---

## Phase 3: Dynamic Journeys

**Goal**: Enable adaptive journey paths that respond to user actions and progress.
**Timeline**: 3-4 months (after Phase 2)
**Status**: Not started

### 3.1: Journey Logic Engine (Weeks 1-4)
- Branching logic (conditional steps, choice points)
- User action tracking and context data
- Performance-based adaptation

### 3.2: Dynamic Content Delivery (Weeks 5-7)
- Personalized content selection
- Smart checkpoints and skill gap identification
- Advanced analytics (path visualization, drop-off analysis, A/B testing)

### 3.3: AI Integration (Weeks 8-10)
- AI-powered journey and content recommendations
- Automated feedback on activities
- AI-assisted journey creation (experimental)

**Success Criteria:**
- Journeys can branch based on user choices
- 30%+ improvement in completion rates
- 10+ dynamic journeys published

---

## Phase 4: Developer Platform

**Goal**: Provide API and SDK for third-party integrations.
**Timeline**: 2-3 months (after Phase 3)
**Status**: Not started

### 4.1: REST API (Weeks 1-3)
- RESTful endpoints with API key auth and rate limiting
- OpenAPI/Swagger documentation
- Developer portal

### 4.2: SDK and Integrations (Weeks 4-6)
- JavaScript/TypeScript SDK (NPM package)
- Webhook system (event notifications, retry logic)
- Integration examples (Slack, Calendar, Notion, Zapier)

### 4.3: Advanced Features (Weeks 7-8)
- Custom journey components (component SDK + marketplace)
- Bulk data export API
- Developer community

**Success Criteria:**
- REST API documented and stable
- SDK published to NPM
- 5+ third-party integrations

---

## Success Metrics by Phase

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Users | 100+ | 500+ | 1000+ | 1000+ |
| Groups | 10+ | 50+ | 100+ | 100+ |
| Journeys | 8 predefined | 100+ user-created | 10+ dynamic | — |
| Retention | 70%+ (week 2) | 75%+ | 80%+ | — |
| Integrations | — | — | — | 5+ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Supabase limitations | Migration plan to self-hosted PostgreSQL |
| Performance issues | Caching early, monitoring closely |
| Complex authorization | Comprehensive tests, code reviews |
| Users don't create journeys | Excellent templates and examples |
| Feature creep | Strict scope discipline — see [DEFERRED_DECISIONS.md](DEFERRED_DECISIONS.md) |

---

## Post-Launch Priorities (Phase 1)

**First 30 Days:** Monitor errors, rapid bug fixes, onboarding improvements
**First 90 Days:** Feature refinements, 5+ new journeys, case studies, plan Phase 2
**First Year:** Complete Phase 2, begin Phase 3, 1000+ active users

---

**Document Version**: 2.0
**Next Review**: After Phase 1.6 launch or March 2026
