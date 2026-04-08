# Ferd — Product Specification

**Version:** 2.0
**Last Updated:** April 5, 2026
**Status:** Wave 1 — 95% complete (Ferd 1.6 Polish & Launch remaining)
**Links:** [Vision](../../../old_universe/vision/VISION.md) | [Requirements](./REQUIREMENTS.md) | [Roadmap](../planning/ROADMAP.md) | [Architecture](../../../old_universe/architecture/ARCHITECTURE_ANATOMY.md)

---

## What This Document Is

This document defines **what Ferd is and why it exists**. It is the product-level view — personas, principles, feature scope, success criteria.

For detailed per-feature requirements, status, and compliance tracking, see [REQUIREMENTS.md](./REQUIREMENTS.md).
For technical architecture, see [ARCHITECTURE_ANATOMY.md](../../../old_universe/architecture/ARCHITECTURE_ANATOMY.md).
For implementation state, see [ACTUAL_STATE.md](../../../old_implementation/ferd/baseline/ACTUAL_STATE.md).

**Hierarchy:**
```
Vision (Why) > Product Spec (What) > Requirements (Detail) > Features (How) > Behaviors (Rules)
```

---

## Product Overview

**Ferd** (Old Norse: journey, passage) is the Wave 1 web platform for FringeIsland — an edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences.

Ferd proves the ground is solid: the journey metaphor works, groups form and travel together, roles shape experience, and the platform is safe, functional, and ready for real users.

### Core Value Proposition

**Travel alone or together on structured learning journeys — where education meets entertainment.**

### What Makes This Different

- **Journey metaphor** — learning feels like adventure, not coursework
- **Group-first design** — solo is supported, but groups are the default assumption
- **Role-based experiences** — Stewards, Guides, Members, Observers each see and do different things
- **Edutainment focus** — engaging, reflective, and developmental simultaneously

---

## User Personas

### Primary: Individual Learner (Sarah)
*"I want to grow, but I need structure and accountability."*

Age 28-45. Professional seeking personal development. Frustrated by scattered learning with no clear path. Needs structured journeys with group support. Success = completes journeys, feels genuine growth, stays engaged.

### Secondary: Steward (Marcus)
*"I want to develop my team together."*

Age 30-50. Team lead or informal leader. Generic training programs don't fit. Needs to guide groups through relevant development journeys. Success = team completes journeys together, improves cohesion.

### Tertiary: Guide (Astrid)
*"I want to facilitate group learning experiences."*

Age 25-55. Coach, facilitator, or experienced practitioner. Limited tools for guiding group journeys. Needs to co-facilitate journeys alongside Stewards. Success = groups complete journeys with meaningful guidance. Guide role is implemented in RBAC but full facilitation tools are Wave TBD — pending work package redistribution (see WAVE_REDISTRIBUTION.md).

### Emerging: Visitor (unnamed)
*"I'm curious but not ready to commit."*

Browsing anonymously. Wants to taste the experience before creating an account. Needs taster journeys and a glimpse of what awaits. Success = tries a taster journey, converts to full member with all progress carried forward.

---

## User Experience Principles

### 1. Journey Metaphor Throughout
Language: "journeys" not "courses", "travelers" not "students", "arrival" not "completion". Navigation uses maps, paths, exploration. Progress shows milestones, not percentages.

### 2. Group-First, Solo-Supported
Default UX assumes group context. Solo enrollment available but not the primary path. Group features visible and accessible. Social elements integrated into the core experience.

### 3. Roles Drive Capabilities
- **Steward** — manages group, invites members, assigns roles, enrolls group in journeys
- **Guide** — co-facilitates, mentors, supports (full tools in Wave 3 — Hamn)
- **Member** — participates, completes content, communicates
- **Observer** — views content without active participation

### 4. Simplicity Over Features
Clear navigation, minimal clicks, essential features only. Progressive disclosure of complexity. Mobile-responsive, clean design. No feature is added without serving a clear user need.

### 5. Three Void Dimensions as Design Lens
Every feature is evaluated against three dimensions of human growth:
- **Individual void (1)** — gap between who I am and who I know myself to be. Served by solo journeys, reflections, travel log.
- **Relational void (1+1)** — gap between how I relate and how I could relate. Served by DMs, pair activities, group journeys.
- **Communal void (1+community)** — gap between how I belong and how I could belong. Served by group membership, forums, announcements.

### 6. Safety and Trust
The platform must feel safe. Members can control their visibility (display names), block unwanted contact, and report harmful behavior. Stewards moderate their spaces. Admins have lifecycle tools for edge cases.

---

## Feature Scope

### Delivered (Ferd 1.0-1.5e)

These features are implemented, tested, and functional:

**Identity & Access**
- Email/password authentication with session management
- Profile management with avatar upload
- Display name / nickname system with privacy controls
- RBAC: 4 roles (Steward, Guide, Member, Observer), permission system
- Universal Group Pattern (every entity is a group)

**Groups**
- Create, edit, delete groups with privacy settings (public/private/invite-only)
- Member management: invite, join, leave, remove
- Role assignment and customization per group
- Stewardship transfer and nomination
- Leave group with handover flows, group closure

**Journeys**
- Journey catalog with 8 predefined journeys
- Individual and group enrollment (via API routes)
- Journey content delivery (JourneyPlayer)
- Step types: narrative content, activity confirmation, basic assessment
- Progress tracking per enrollment

**Communication**
- Group forums with flat threading and Steward moderation
- Direct messaging (1:1) with Realtime updates and read tracking
- Notification system: 7 types, smart actions (accept/decline), Realtime push, bell UI

**Administration (DeusEx)**
- Admin dashboard with user management (activate, deactivate, decommission, hard delete, force logout)
- Platform exit (admin-assisted cascade exit)
- Orphaned group detection and fix
- Audit log (16 action types)
- DeusEx member management
- Development dashboard

See [REQUIREMENTS.md](./REQUIREMENTS.md) for per-feature status, completeness percentages, and compliance tracking.

### Remaining (Ferd 1.6 — Polish & Launch)

These features complete the Ferd experience before public launch:

**New Features**
- **Visitor/shadow experience** — anonymous browsing, taster journeys, seamless conversion to full account
- **profile_data table** — flexible data storage for journey engagement, reflections, assessments (per ADR-U005)
- **Travel log / journal** — personal record of journey history, reflections, growth over time
- **i18n framework** — string externalization, locale file structure, English default (additional languages in Wave 3 — Hamn)
- **Block/report users** — block unwanted contact, report users for admin review
- **Group DMs** — multi-party direct message conversations
- **Basic announcements** — Steward-to-group one-to-many messaging

**Quality & Infrastructure**
- Email delivery (currently broken — console.log stub only)
- Mobile responsiveness audit
- Accessibility improvements (WCAG 2.1 AA)
- User onboarding flow
- E2E test expansion
- Error monitoring (Sentry integration)
- ADR-009 compliance (API routes for all write operations)
- Permission enforcement completion (8/39 enforced, needs full coverage)
- Beta testing with 10-20 users

### Out of Scope (Wave 2+ — see WAVE_REDISTRIBUTION.md)

These are explicitly **not** part of Ferd. See [DEFERRED.md](../planning/DEFERRED.md) for rationale.

- User-created journeys and Journey Designer
- Journey marketplace and Dreamineer ecosystem
- Whisp / AI companion
- Native iOS/Android apps
- Advanced group features (groups-join-groups UI)
- Completion certificates
- Activity feeds
- Dynamic/adaptive journeys and AI recommendations
- Payment integration and monetization
- Social login (Google, GitHub, etc.)

---

## Key User Flows

### Flow 1: Visitor Discovers FringeIsland
Visitor lands on site > browses journey catalog > tries a taster journey (no signup required) > reaches natural engagement point > prompted to create account > signs up > all progress carries forward > lands in "My Journeys" with taster visible.

### Flow 2: New Member Joins and Finds a Journey
Member signs up > profile created automatically > browses journey catalog > views journey detail (overview, steps, difficulty) > enrolls individually > journey appears in "My Journeys" > starts first step.

### Flow 3: Steward Builds a Group
Member creates group (name, description, privacy) > becomes Steward > invites members by email > members receive invitation notification > accept/decline > Steward assigns roles > group is ready for journeys.

### Flow 4: Group Embarks on a Journey Together
Steward browses catalog > views journey detail > enrolls group > all members see journey in "My Journeys" under group tab > members progress through steps independently > forum available for group discussion during journey.

### Flow 5: Member Manages Their Experience
Member views notifications (bell icon, real-time) > accepts group invitation > sends DM to another member > views travel log > edits profile (nickname, avatar) > blocks an unwanted contact > leaves a group when done.

### Flow 6: Admin Handles Edge Cases
Admin accesses DeusEx dashboard > views user list > deactivates problematic user > fixes orphaned group (reassigns Steward) > reviews audit log > manages DeusEx membership.

---

## Non-Goals

### Not a Traditional LMS
No grade tracking, no instructor dashboards, no certificates (Ferd), no advanced analytics. Learning is experiential and reflective, not measured and scored.

### Not a Social Network
No news feed, no likes/reactions, no friend connections. Social interaction happens within groups and through journeys — it is purposeful, not performative.

### Not a Marketplace (Yet)
No paid journeys, no user-created content, no creator tools, no revenue features. Ferd is free. The marketplace is Hamn's domain.

### Not Fully Adaptive (Yet)
No AI personalization, no dynamic content adjustment, no recommendation engine. Journeys are predefined and static. AI capabilities arrive with the Whisp in Hamn.

---

## Success Metrics

### Adoption (first 3 months)
- 100+ registered users
- 10+ active groups
- 50+ journey enrollments
- 30%+ of users create or join a group
- 50%+ of enrollments are group-based

### Engagement
- 40%+ weekly active users
- 3+ sessions per user per week
- 10+ minutes average session time
- 20%+ journey completion rate

### Quality
- < 5% user-facing error rate
- 4+ star average satisfaction
- < 10 bug reports per month
- < 24 hour response for critical bugs

### Validation Questions
These are the questions Ferd exists to answer:
- Does the journey metaphor resonate with users?
- Is group learning more effective than solo? (completion rate comparison)
- Do groups stay together? (retention rates)
- Is edutainment engaging? (satisfaction + session time)
- What is the #1 feature users request? (informs Hamn priorities)

---

## Iteration Plan

### After Ferd Launch
1. Gather feedback (surveys, interviews, usage data)
2. Validate core assumptions (journey metaphor, group learning)
3. Identify top-requested features
4. Prioritize Hamn features based on data
5. Begin Hamn specification sessions

### Key Decision Points
- If journey metaphor doesn't resonate: pivot UX language before Hamn
- If groups don't form naturally: improve onboarding and discovery
- If solo dominates group: investigate friction in group creation
- If completion rates are low: examine journey length and step design

---

## Related Documents

| Document | Role |
|----------|------|
| [Vision](../../../old_universe/vision/VISION.md) | Why FringeIsland exists |
| [Manifesto](../../../old_universe/vision/MANIFESTO.md) | Core values and principles |
| [Products & Platform](../../../old_universe/strategy/PRODUCTS_AND_PLATFORM.md) | Wave model, product family, device strategy |
| [Requirements](./REQUIREMENTS.md) | Detailed per-feature requirements, status, compliance |
| [Roadmap](../planning/ROADMAP.md) | When features are built |
| [Deferred Decisions](../planning/DEFERRED.md) | What we chose not to build and why |
| [Architecture Anatomy](../../../old_universe/architecture/ARCHITECTURE_ANATOMY.md) | L0-L7 layers, verticals, Platform API ring |
| [Actual State](../../../old_implementation/ferd/baseline/ACTUAL_STATE.md) | Live implementation analysis |
| [Research](../planning/RESEARCH.md) | Open investigations for Ferd |

---

**Version History:**
- v2.0 (Apr 5, 2026): Full rewrite — clarified role vs REQUIREMENTS.md, removed duplicative acceptance criteria and technical specs, fixed terminology, updated personas (added Visitor, updated Guide), rewrote user flows, added safety principle and void dimensions
- v1.2 (Apr 5, 2026): Expanded scope — visitor experience, profile_data, travel log, i18n, block/report, group DMs, announcements; added three void dimensions
- v1.1 (Feb 28, 2026): Updated status — Wave 1 phases 1.4-1.5e complete, technical specs updated
- v1.0 (Feb 9, 2026): Initial product spec for v1.0 MVP
