# Hamn — Requirements

**Version:** 1.0
**Wave:** Hamn (Wave 2)
**Last Updated:** 2026-04-05
**Based on:** Hamn PRODUCT_SPEC v0.2, Ferd deferred items, Journey Designer Session 01

---

## Document Overview

This document defines **all requirements** for Hamn, the Wave 2 full FringeIsland experience. Requirements are organized into three categories:

- Functional Requirements — What the system does (features)
- Non-Functional Requirements — How well it performs (quality attributes)
- Architectural Requirements — Structural compliance

**Numbering:** Hamn requirements use the `HR-` prefix (Hamn Requirement) to distinguish from Ferd's `FR-` prefix. Where a Hamn requirement picks up a Ferd deferred item, the original `FR-` ID is noted.

**Maturity:** Many requirements depend on specification sessions and research outcomes (see [RESEARCH.md](../planning/RESEARCH.md)). Items marked with `[needs spec session]` or `[depends on RQ-H-xxx]` will be refined as those resolve.

---

## Binding Architecture Rule

All Hamn features must follow the architecture anatomy from day one:

1. **API routes for all operations** — full ADR-009 compliance (Ferd refactoring completes this pre-launch)
2. **Proper layer boundaries** — no layer skipping, no direct DB access from frontend
3. **Permission enforcement** — every gated action checked in RLS and frontend
4. **Vertical coverage** — V1 (admin), V2 (privacy), V3 (notifications), V4 (observability) hooks from the start
5. **Multi-frontend ready** — shared API serves web + iOS + Android

---

## Summary Statistics

### By Category

| Category | Total | Planned | Deferred |
|----------|-------|---------|----------|
| **Functional** | 65 | 65 | 0 |
| **Non-Functional** | 14 | 14 | 0 |
| **Architectural** | 3 | 3 | 0 |
| **TOTAL** | **82** | **82** | **0** |

### By Layer/Vertical

| Layer/Vertical | Total | Planned | Notes |
|----------------|-------|---------|-------|
| L0 Infrastructure | 4 | 4 | AI provider, push, payments, feature flags |
| L1 Identity | 3 | 3 | Social login, account deletion, Dreamineer identity |
| L2 Organisation | 2 | 2 | Groups-join-groups, Dreamineer community |
| L3 Experience Engine | 12 | 12 | Journey Designer is the largest area |
| L4 Content | 5 | 5 | Rich text, media, assessments, journal, versioning |
| L5 Communication | 6 | 6 | Enhancements + activity feed + seasonal events |
| L6 Discovery | 4 | 4 | Search, recommendations, marketplace, reviews |
| L7 Intelligence | 5 | 5 | Whisp, NPCs, accumulation, personalization |
| V1 Administration | 6 | 6 | Journey/marketplace/Dreamineer admin + moderation |
| V2 Privacy/GDPR | 6 | 6 | Full GDPR + AI data handling |
| V3 Notifications | 4 | 4 | Push, journey, marketplace, preferences |
| V4 Observability | 3 | 3 | Usage, marketplace, performance analytics |
| V5 Transactions | 5 | 5 | Stripe, ledger, revenue share, payouts, refunds |

---

## Table of Contents

### Functional Requirements
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

### Non-Functional Requirements
1. [Performance](#performance)
2. [Security](#security)
3. [Accessibility](#accessibility)
4. [Usability](#usability)
5. [Reliability](#reliability)
6. [Scalability](#scalability)
7. [Maintainability](#maintainability)

### Architectural Requirements
1. [Compliance](#architectural-compliance)

---

# Functional Requirements

---

## L0: Infrastructure

### HR-L0-001: AI Provider Integration
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L0-011

AI provider integration (LLM API) for Whisp system, NPC behavior, and adaptive personalization.

**Depends on:** RQ-H-001 (AI feasibility validation) — provider selection, cost model, latency requirements.

**Scope:** API key management, rate limiting, response caching, fallback handling, cost monitoring.

---

### HR-L0-002: Feature Flags System
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L0-007

Database-driven feature flags for gradual rollout, A/B testing, and per-environment toggles.

**Scope:** Flag table, admin UI for toggling, per-user/per-group targeting, SDK for frontend and API checks.

---

### HR-L0-003: Push Notification Infrastructure
**Status:** Planned | **Milestone:** M1

APNS (iOS) and FCM (Android) push notification delivery.

**Scope:** Device token registration, notification routing (in-app vs push), delivery confirmation, badge management.

**Dependencies:** HR-V3-001 (Push Notifications vertical requirement).

---

### HR-L0-004: Stripe Connect Integration
**Status:** Planned | **Milestone:** M2

Payment processing for marketplace transactions and Dreamineer payouts.

**Scope:** Stripe Connect onboarding for Dreamineers, payment intent creation, webhook handling, automated splitting.

**Dependencies:** HR-V5-001 (Payment Integration).

---

## L1: Identity & Authentication

### HR-L1-001: Social Login
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L1-003

Google, GitHub, and Apple sign-in alongside existing email/password.

**Scope:** OAuth provider configuration, account linking (social + existing email), profile auto-population.

---

### HR-L1-002: Self-Service Account Deletion
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L1-008, FR-V2-006

Users can delete their own account with full data erasure.

**Dependencies:** HR-V2-001 (Data Export) and HR-V2-002 (Data Erasure) must be implemented first.

**Scope:** Confirmation flow, grace period, data export prompt before deletion, cascade specification.

---

### HR-L1-003: Dreamineer Identity
**Status:** Planned | **Milestone:** M2 | [needs spec session]

Dreamineer designation on profiles — Maker (content creator) and Weaver (experience architect).

**Scope:** Dreamineer application/advancement workflow, profile badge, Dreamineer-specific permissions, studio access grant.

**Depends on:** RQ-H-005 (Dreamineer onboarding path — meritocratic advancement criteria).

---

## L2: Organisation

### HR-L2-001: Groups-Join-Groups UI
**Status:** Planned | **Milestone:** M3

UI for the existing groups-join-groups schema (D11 circularity trigger exists).

**Scope:** Group federation UI, parent/child group navigation, cross-group membership visibility, permission inheritance display.

**Note:** Schema and triggers exist from Ferd. This is a frontend-only requirement.

---

### HR-L2-002: Dreamineer Community Structure
**Status:** Planned | **Milestone:** M2 | [needs spec session]

Organizational structure for the Dreamineer community — Makers and Weavers.

**Scope:** Dreamineer group(s), community forums, mentor matching, quality council representation.

**Depends on:** RQ-H-005 (Dreamineer onboarding).

---

## L3: Experience Engine

### HR-L3-001: Journey Designer Core (Author Mode)
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L3-015

Visual editor for building Type 1 (Fixed) and Type 2 (Hybrid) journeys. The central creative tool for Hamn.

**Foundational concepts (Session 01):**
- Universal step grammar: Present > Ask > Change
- Two-level structure: nodes (major waypoints) + beats (micro-steps within nodes)
- Six content families: Witness, Reflect, Decide, Act, Encounter, Rest

**Scope:** Node editor, beat editor, content family assignment, journey structure visualization, save/load, undo/redo.

**Dependencies:** HR-L4-001 (Rich Text Editor), HR-L3-003 (Step Type Library).

---

### HR-L3-002: Journey Designer Extended (Terrain Builder + World Architect)
**Status:** Planned | **Milestone:** M2 | [needs spec session]

Authoring modes for Type 3 (Traveler-Initiated) and Type 4 (AI-Generative) journeys.

**Scope:** Terrain Builder UI for possibility spaces, World Architect UI for narrative rules. Authoring only — full runtime execution deferred to Wave 3.

**Note:** See Hamn DEFERRED.md — "Type 3 & Type 4 Journey Full Operation" deferred to Wave 3.

---

### HR-L3-003: Step Type Library
**Status:** Planned | **Milestone:** M1 | [needs spec session]
**Picks up:** FR-L3-010, FR-L3-011, FR-L3-012, FR-L3-013

Full step type library implementing the six content families from Session 01.

**Step Types (minimum):**
- Witness (narrative, video, image) — extends existing Content type
- Reflect (reflection prompt, journal entry) — picks up FR-L3-010, FR-L3-012
- Decide (choice/selection, branching point) — picks up FR-L3-011
- Act (activity confirmation, checklist) — extends existing, picks up FR-L3-013
- Encounter (NPC, Whisp, group, inner self)
- Rest (pause, breathing, mindfulness)

**Scope:** Step type registry (replacing hard-coded switch), config JSONB schema per type, renderer per type, editor per type.

---

### HR-L3-004: The Road (Inter-Node Content)
**Status:** Planned | **Milestone:** M1 | [needs spec session]

The Road as a first-class object between journey nodes. Designer sets conditions; universe fills content.

**Session 01 concepts:** Road duration (3 modes), road content (ambient, transitional, preparatory), road as experience space.

**Scope:** Road data model, road editor in Journey Designer, road content rendering, duration configuration.

---

### HR-L3-005: Companion Model
**Status:** Planned | **Milestone:** M1

Traveler + Companionship Record, consistent with Universal Group architecture.

**Session 01 concepts:** Each traveler has a companionship record tracking their relationship with fellow travelers, NPCs, and Whisp throughout a journey.

**Scope:** Companionship record schema, companion state tracking, companion display in journey UI.

---

### HR-L3-006: Pacing System
**Status:** Planned | **Milestone:** M1 | [needs spec session]

Journey timing and completion mechanics.

**Session 01 concepts:** Node duration (4 types), road duration (3 modes), journey completion (4 triggers).

**Scope:** Duration configuration in designer, pacing enforcement in player, completion trigger logic.

---

### HR-L3-007: Journey Preview and Testing
**Status:** Planned | **Milestone:** M1

Dreamineers can preview and test journeys before publishing.

**Scope:** Preview mode (play through as test traveler), test data isolation, step-by-step debugging, content validation.

---

### HR-L3-008: Journey Publishing Workflow
**Status:** Planned | **Milestone:** M1

Workflow for submitting, reviewing, and publishing journeys.

**Scope:** Draft > Submit > Review > Approve/Reject > Published. Visibility options: public, private, unlisted. Version management on publish.

**Dependencies:** HR-V1-002 (Content Moderation Queue).

---

### HR-L3-009: Journey Versioning
**Status:** Planned | **Milestone:** M1

Track changes to journey content over time. Existing enrollments continue on their enrolled version.

**Picks up:** FR-L4-005

**Scope:** Version history, diff view, rollback, enrolled-version pinning, migration path for active enrollments.

---

### HR-L3-010: Journey Zero (Onboarding Journey)
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L3-014

Special first journey auto-enrolled on registration. Introduces the platform, journey metaphor, and Whisp.

**Scope:** Curated onboarding journey, auto-enrollment trigger, completion unlocks full platform, skippable for returning members.

---

### HR-L3-011: Seasons and Episodes
**Status:** Planned | **Milestone:** M2 | [needs spec session]

Temporal rhythm for the platform — seasons provide narrative arcs, episodes provide regular content drops.

**Scope:** Season data model, episode scheduling, season-specific content, episode notifications, season archive.

**Note:** Specification session needed (identified in Session 01 as parked item).

---

### HR-L3-012: Step Extensibility (Registry Pattern)
**Status:** Planned | **Milestone:** M1

Replace hard-coded step type switch statements with a registry/plugin pattern.

**Picks up:** FR-L3-016 (currently 40% in Ferd)

**Scope:** Step type registry, plugin interface, config JSONB validation per type, dynamic renderer loading.

---

## L4: Content

### HR-L4-001: Rich Text Editor
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L4-001

WYSIWYG editor for narrative content, journal entries, and Journey Designer.

**Scope:** Rich text editing (bold, italic, headings, lists, links), image embedding, block-based editor (e.g., Tiptap/ProseMirror).

---

### HR-L4-002: Media Upload (Images/Video/Audio)
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L4-002

Upload and manage media assets for journey content.

**Scope:** Image upload with optimization, video upload/embed, audio upload (for guided exercises), media library per Dreamineer, storage quota management.

---

### HR-L4-003: Assessment Frameworks
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L4-003

Pre-built validated assessment frameworks (Big 5, VIA, etc.).

**Scope:** Framework library, scoring engine, results visualization, results stored in profile_data, framework versioning.

**Dependencies:** FR-L1-005 (profile_data — built in Ferd 1.6).

---

### HR-L4-004: Journal Interface
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L4-004

Dedicated journaling UI beyond the travel log.

**Scope:** Free-form journal entries, prompted journal (tied to journey steps), rich text support, private by default, optional sharing.

---

### HR-L4-005: i18n — Additional Languages
**Status:** Planned | **Milestone:** M3

Add language support beyond English (framework built in Ferd 1.6).

**Scope:** Translation workflow, community translation support, locale-specific content, RTL support.

**Dependencies:** FR-L0-009 (i18n framework — built in Ferd 1.6).

---

## L5: Communication

### HR-L5-001: @Mention Support
**Status:** Planned | **Milestone:** M3
**Picks up:** FR-L5-004

Mention users in messages and forums with @username.

**Scope:** Autocomplete picker, mention rendering, mention notification trigger.

---

### HR-L5-002: Conversation Muting
**Status:** Planned | **Milestone:** M3
**Picks up:** FR-L5-005

Users can mute conversations or forum threads.

**Scope:** Per-conversation mute toggle, muted indicator, muted conversations suppressed from notifications.

---

### HR-L5-003: Activity Feed
**Status:** Planned | **Milestone:** M3
**Picks up:** FR-L5-007

Stream of member activity within groups (enrollments, completions, posts, milestones).

**Scope:** Activity feed table, feed generation from events, feed display in group view, privacy-respecting (only shows what the viewer has permission to see).

---

### HR-L5-004: Forum Enhancements
**Status:** Planned | **Milestone:** M3

Extend existing flat-thread forums with richer features.

**Scope:** Reactions/emoji, search within forum, rich media in posts, pinned posts, threaded replies (nested).

---

### HR-L5-005: DM Enhancements
**Status:** Planned | **Milestone:** M3

Extend existing DM system with power-user features.

**Scope:** Message search, conversation filtering, message editing, message deletion, typing indicators.

---

### HR-L5-006: Online Seasonal Events
**Status:** Planned | **Milestone:** M3 | [needs spec session]

Platform-wide events tied to seasons — collaborative activities, challenges, celebrations.

**Scope:** Event data model, event participation tracking, event-specific UI, event notifications.

**Dependencies:** HR-L3-011 (Seasons and Episodes).

---

## L6: Discovery

### HR-L6-001: Journey Search
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L6-001

Full-text search on journey titles, descriptions, tags, and Dreamineer names.

**Scope:** PostgreSQL full-text search or external search service, faceted filtering (difficulty, duration, category, rating), search results ranking.

---

### HR-L6-002: Journey Recommendations
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L6-002

Personalized journey suggestions based on profile_data, completion history, and group context.

**Scope:** Recommendation algorithm (content-based initially, collaborative filtering later), "recommended for you" section, group-aware recommendations.

**Dependencies:** FR-L1-005 (profile_data), HR-L7-002 (Profile Accumulation).

---

### HR-L6-003: Marketplace Browsing
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L6-003

Browse Dreamineer-created journeys in the marketplace.

**Scope:** Marketplace landing page, category browsing, featured/trending sections, Dreamineer profiles, journey preview cards.

---

### HR-L6-004: Ratings and Reviews
**Status:** Planned | **Milestone:** M2

Members can rate and review completed journeys.

**Scope:** Star rating (1-5), written review, review moderation, aggregate ratings on journey cards, Dreamineer review dashboard.

---

## L7: Intelligence

### HR-L7-001: The Whisp (AI Companion)
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L7-001

Each member's personal future self — dual nature: Encounter (structured meeting) + Companion (ambient presence).

**Scope:** Whisp initialization on registration, encounter dialogue system, ambient companion UI, personality boundaries, safety guardrails.

**Depends on:** RQ-H-001 (AI feasibility), RQ-H-003 (Whisp encounter phenomenology).

---

### HR-L7-002: Profile Accumulation and Insights
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-L7-002

Generate insights from accumulated profile_data across journey engagement.

**Scope:** Insight generation pipeline, insight display on profile, growth trajectory visualization, privacy controls on insights.

**Dependencies:** FR-L1-005 (profile_data), HR-L0-001 (AI Provider).

---

### HR-L7-003: Whisp Fidelity/Fullness Model
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-L7-003

Whisp richness increases with member engagement depth. Begins empty, fills with self-knowledge.

**Scope:** Fullness calculation algorithm, fidelity stages (visual + behavioral), engagement metrics that drive fullness, Whisp growth signals in UI.

**Depends on:** RQ-H-003 (Whisp encounter phenomenology at different fullness stages).

---

### HR-L7-004: NPC System
**Status:** Planned | **Milestone:** M2 | [needs spec session]

Non-player characters in journeys — Encounter family with origin and other dimensions.

**Session 01 concepts:** Origin (planned/emergent/triggered) x Other (NPC/FIM/group/inner self/Whisp).

**Scope:** NPC definition in Journey Designer, NPC behavior authoring, NPC encounter rendering, NPC personality and response calibration.

**Depends on:** RQ-H-001 (AI feasibility), RQ-H-004 (NPC behavior authoring specification session).

---

### HR-L7-005: Adaptive Personalization
**Status:** Planned | **Milestone:** M3 | [needs spec session]

Platform adapts content presentation and recommendations based on member profile and behavior.

**Scope:** Personalization signals, adaptive UI elements, personalized journey suggestions, adaptive pacing hints.

**Note:** Basic personalization in Hamn. Full ML-powered recommendation engine deferred to Wave 3.

---

## V1: Administration

### HR-V1-001: Journey Management (Admin)
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-V1-011

Admin can view, edit, unpublish, and delete any journey.

**Scope:** Journey list with filters (status, Dreamineer, date), journey detail view, edit override, unpublish action, delete with enrollment handling.

---

### HR-V1-002: Content Moderation Queue
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V1-016

Admin reviews flagged and submitted content in a moderation queue.

**Scope:** Queue UI, review workflow (approve/reject/escalate), moderation history, priority ranking, bulk actions.

---

### HR-V1-003: Content Flagging System
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V1-017

Members can flag inappropriate content (forum posts, messages, journey content, reviews).

**Scope:** Flag button on all content types, reason categories (harassment, spam, inappropriate, misinformation), anonymous reporting, flags feed into moderation queue.

---

### HR-V1-004: User Warnings and Bans
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V1-018

Admin can issue warnings and temporary/permanent bans.

**Scope:** Warning system (stored in user record), temporary bans (1/7/30 days), permanent ban, ban appeal process, ban reason recorded, user notified.

---

### HR-V1-005: Dreamineer Management
**Status:** Planned | **Milestone:** M2

Admin manages Dreamineer applications, status, and quality compliance.

**Scope:** Dreamineer application queue, approve/reject workflow, Dreamineer status management, quality standard enforcement, Dreamineer analytics.

---

### HR-V1-006: Marketplace Administration
**Status:** Planned | **Milestone:** M2

Admin oversees marketplace health — listings, transactions, disputes.

**Scope:** Marketplace dashboard, listing management, transaction monitoring, dispute resolution, revenue reporting.

---

## V2: Privacy & GDPR

### HR-V2-001: Data Export (GDPR Right of Access)
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V2-001

Users can export all their personal data in machine-readable format.

**Scope:** Export all profile data, messages, forum posts, journey progress, assessments, Whisp interaction history. JSON format. Downloadable archive.

---

### HR-V2-002: Data Erasure (Right to be Forgotten)
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V2-002

Users can request complete data deletion.

**Scope:** Delete all personal data, anonymize forum posts/messages (replace with [Deleted User]), preserve aggregate data, irreversible confirmation.

---

### HR-V2-003: Consent Tracking
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V2-003

Track user consent for data processing activities.

**Scope:** ToS acceptance, privacy policy acceptance, marketing opt-in, AI data processing consent, timestamp all consents, consent withdrawal.

---

### HR-V2-004: Privacy Policy and ToS
**Status:** Planned | **Milestone:** M1
**Picks up:** FR-V2-004

Users must accept privacy policy and terms of service.

**Scope:** Legal document display, acceptance gate on registration, version tracking, re-acceptance on policy updates.

---

### HR-V2-005: Cookie Consent
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V2-005

Cookie banner with granular consent options.

**Scope:** Cookie categories (essential, analytics, marketing), granular consent, consent persistence, consent withdrawal.

---

### HR-V2-006: AI Data Handling Policies
**Status:** Planned | **Milestone:** M1 | [needs spec session]

Policies governing how member data is used by AI systems (Whisp, NPCs, personalization).

**Scope:** Data retention for AI training, opt-out mechanisms, transparency about AI data usage, AI-specific consent, data minimization.

**Depends on:** RQ-H-001 (AI feasibility — provider-specific data policies vary).

---

## V3: Notifications

### HR-V3-001: Push Notifications (Mobile)
**Status:** Planned | **Milestone:** M1

Native push notifications for iOS (APNS) and Android (FCM).

**Scope:** Device token registration, notification routing (in-app vs push vs both), delivery tracking, badge management, quiet hours.

**Dependencies:** HR-L0-003 (Push Infrastructure).

---

### HR-V3-002: Journey and Episode Notifications
**Status:** Planned | **Milestone:** M1

Notifications for journey events: enrollment, step completion, journey completion, new episode available.

**Scope:** Notification types for all journey lifecycle events, episode drop alerts, Dreamineer notifications (new enrollment, review).

---

### HR-V3-003: Marketplace Notifications
**Status:** Planned | **Milestone:** M2

Notifications for marketplace events: new review, sale, payout, moderation result.

**Scope:** Notification types for all marketplace events, Dreamineer sales dashboard integration.

---

### HR-V3-004: Notification Preferences (Full)
**Status:** Planned | **Milestone:** M2

Full notification preferences with per-type and per-channel control.

**Scope:** Preferences UI, per-notification-type toggle, per-channel control (in-app, push, email), digest options (immediate, daily, weekly), quiet hours.

---

## V4: Observability

### HR-V4-001: Usage Analytics
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V4-004

Track user behavior and feature usage for product decisions.

**Scope:** Event tracking, funnel analysis, retention metrics, feature usage heatmaps, privacy-respecting analytics (no PII in analytics).

---

### HR-V4-002: Marketplace Analytics
**Status:** Planned | **Milestone:** M2

Track marketplace health: transactions, Dreamineer performance, content quality.

**Scope:** Revenue dashboards, Dreamineer earnings reports, top journeys, conversion funnels, moderation metrics.

---

### HR-V4-003: Full Performance Monitoring
**Status:** Planned | **Milestone:** M1

Real-time performance monitoring across web and native.

**Scope:** Web Vitals tracking, API response time monitoring, native app performance (launch time, crash rate), alerting on degradation, performance budgets.

---

## V5: Transactions

### HR-V5-001: Payment Integration (Stripe Connect)
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V5-001

Stripe Connect for marketplace payments with automated splitting.

**Scope:** Stripe Connect onboarding for Dreamineers, payment processing, webhook handling, PCI compliance, currency support.

---

### HR-V5-002: Transaction Ledger
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V5-002

Complete record of all financial transactions.

**Scope:** Transaction table, transaction types (purchase, refund, payout, fee), transaction history for members and Dreamineers, admin transaction view.

---

### HR-V5-003: Revenue Share
**Status:** Planned | **Milestone:** M2
**Picks up:** FR-V5-003

Revenue sharing between Dreamineer creators and FringeIsland Foundation.

**Scope:** Configurable split ratio (e.g., 70/30), automatic calculation on each transaction, Dreamineer earnings dashboard, Foundation revenue tracking.

---

### HR-V5-004: Dreamineer Payouts
**Status:** Planned | **Milestone:** M2

Automated payout processing to Dreamineers.

**Scope:** Payout scheduling (monthly/threshold-based), payout history, tax reporting support, payout method management.

---

### HR-V5-005: Refunds
**Status:** Planned | **Milestone:** M3
**Picks up:** FR-V5-005

Process refunds for paid journey content.

**Scope:** Refund policy configuration, refund request flow, partial/full refunds, refund approval workflow, refund impact on Dreamineer earnings.

---

# Non-Functional Requirements

---

## Performance

### NFR-HP-001: Native App Performance
**Status:** Planned

- App launch: < 3 seconds (cold start)
- Screen transitions: < 300ms
- Offline capability: cached content accessible without network

---

### NFR-HP-002: API Response Performance
**Status:** Planned

- All API endpoints: < 500ms (p95)
- Search queries: < 1s
- Journey Designer save: < 2s

---

### NFR-HP-003: AI Response Latency
**Status:** Planned

- Whisp encounter responses: < 2s (feel conversational)
- NPC responses: < 3s
- Streaming supported for longer responses

**Depends on:** RQ-H-001 (AI feasibility — latency varies by provider and model).

---

## Security

### NFR-HS-001: Multi-Factor Authentication
**Status:** Planned

MFA available for all accounts. TOTP and/or passkey support.

---

### NFR-HS-002: Single Sign-On (SSO)
**Status:** Planned

SAML and OIDC support for organizational use.

**Scope:** SSO configuration per organization, JIT provisioning, SSO-enforced groups.

---

### NFR-HS-003: AI Security and Safety
**Status:** Planned | [needs spec session]

AI systems operate within defined safety boundaries.

**Scope:** Whisp personality boundaries, NPC behavior guardrails, prompt injection protection, output filtering, abuse detection.

**Depends on:** RQ-H-001 (AI feasibility).

---

## Accessibility

### NFR-HA-001: WCAG 2.1 AA Full Compliance
**Status:** Planned

Complete WCAG 2.1 AA audit and remediation across web and native apps.

**Scope:** Keyboard navigation, screen reader support, color contrast, focus management, ARIA attributes, no keyboard traps, skip links, accessible Journey Designer.

---

## Usability

### NFR-HU-001: Native App UX Standards
**Status:** Planned

Native apps follow platform conventions (iOS Human Interface Guidelines, Material Design).

**Scope:** Platform-native navigation, gestures, animations, system integration (share sheet, notifications, deep links).

---

### NFR-HU-002: Journey Designer Learnability
**Status:** Planned

Journey Designer learnable by non-technical Dreamineers in < 1 hour.

**Scope:** Guided onboarding, contextual help, templates, progressive complexity disclosure.

---

## Reliability

### NFR-HR-001: Multi-Platform Consistency
**Status:** Planned

Feature parity and data consistency across web, iOS, and Android.

**Scope:** Shared API ensures data consistency, feature flags for platform-specific rollouts, cross-platform testing.

---

## Scalability

### NFR-HSC-001: User Scale
**Status:** Planned

Support 500+ concurrent users, 10,000+ registered users.

---

### NFR-HSC-002: Marketplace Scale
**Status:** Planned

Marketplace scales to 1,000+ published journeys with performant search and browsing.

---

## Maintainability

### NFR-HM-001: API Documentation
**Status:** Planned

Complete API documentation for native app development.

**Scope:** OpenAPI/Swagger spec, endpoint reference, authentication guide, rate limit documentation.

---

### NFR-HM-002: Multi-Frontend Architecture
**Status:** Planned

Shared API codebase serves web, iOS, and Android without frontend-specific hacks.

**Scope:** API versioning strategy, breaking change policy, client SDK generation.

---

# Architectural Requirements

---

## Architectural Compliance

### HAR-001: Full ADR-009 Compliance (Inherited)
**Status:** Planned

All Hamn features must go through API routes. Ferd's refactoring (AR-001) establishes full compliance before Hamn begins.

**Scope:** Maintain 100% API route coverage, no regression to direct Supabase writes.

---

### HAR-002: Multi-Frontend Architecture
**Status:** Planned

Shared API serving web + iOS + Android. No frontend-specific business logic.

**Scope:** API design supports all clients, client-agnostic authentication, platform-specific behavior via feature flags not code branches.

---

### HAR-003: AI Integration Layer
**Status:** Planned

L7 Intelligence services behind API routes with provider abstraction.

**Scope:** Provider-agnostic interface (swap LLM providers without frontend changes), response caching, cost tracking, fallback handling, rate limiting per user.

**Depends on:** RQ-H-001 (AI feasibility — provider selection).

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Ferd Requirements](../../ferd/specification/REQUIREMENTS.md) | Wave 1 requirements (reference and inheritance) |
| [Product Spec](./PRODUCT_SPEC.md) | Hamn product scope |
| [Architecture Anatomy](../../../universe/architecture/ARCHITECTURE_ANATOMY.md) | L0-L7 layers, verticals |
| [Products & Platform](../../../universe/strategy/PRODUCTS_AND_PLATFORM.md) | Wave model and product strategy |
| [Roadmap](../../ferd/planning/ROADMAP.md) | Wave progress and milestones |
| [Hamn Deferred](../planning/DEFERRED.md) | Items deferred from Hamn to Wave 3+ |
| [Hamn Research](../planning/RESEARCH.md) | Open investigations (8 items) |
| [Ferd Deferred](../../ferd/planning/DEFERRED.md) | Ferd deferrals accepted by Hamn |
| [Vision](../../../universe/vision/VISION.md) | Why FringeIsland exists |
| [Journey Designer Session 01](../../ferd/sessions/2026-03-20-SESSION-01-journey-designer.md) | Foundational vocabulary and concepts |

---

**Document Version:** 1.0
**Last Updated:** 2026-04-05
**Total Requirements:** 82 (65 Functional, 14 Non-Functional, 3 Architectural)
**Next Review:** After first Hamn specification session
