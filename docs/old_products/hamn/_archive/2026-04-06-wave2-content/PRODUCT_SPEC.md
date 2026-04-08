# Hamn — Product Specification

**Version:** 0.2
**Last Updated:** April 5, 2026
**Status:** Scaffold — themes placed, details pending specification sessions and RESEARCH.md resolution
**Links:** [Vision](../../../universe/vision/VISION.md) | [Roadmap](../../ferd/planning/ROADMAP.md) | [Features](../development/features/)

---

## Document Purpose

This document defines **what we're building** for Hamn (Wave 2). It translates the [vision](../../../universe/vision/VISION.md) into concrete features, user stories, and acceptance criteria.

**Hierarchy:**
```
Vision (Why) > Product Spec (What) > Roadmap (When) > Features (How) > Behaviors (Rules)
```

---

## Product Overview

**Hamn** (Harbour) is the full FringeIsland member experience — where the island comes alive. Journey Designer, Whisps, Dreamineers, marketplace, narrative. Discord is retired. The community lives fully on its own platform. Native iOS and Android apps launch alongside Hamn.

### Core Value Proposition

_"The island comes alive — where personal growth becomes narrative adventure, creative expression, and living community."_

### What Makes This Different

- **Narrative-first experience** — Three Worlds (Ordinary World, Safe Harbour, The Other Side) with seasons, episodes, and living story
- **The Whisp** — Your personal future self as instrument and companion, growing in fidelity with your engagement
- **Dreamineer ecosystem** — Members become creators (Makers and Weavers), building journeys and experiences for others
- **Native mobile experience** — iOS and Android as primary platforms, not afterthoughts
- **AI-powered depth** — NPCs, adaptive personalization, and an Intelligence layer that grows with the community

---

## User Personas

### Primary Persona: Dreamineer (Astrid)
**"I want to create journeys and experiences that help others grow."**
- Age: 25-50
- Context: Creative professional, coach, educator, or passionate community member
- Pain: Has wisdom and content to share but no platform that combines narrative, structure, and community
- Goal: Build journeys using the Journey Designer, publish to marketplace, earn recognition and revenue
- Success: Published journeys with active enrollments, positive reviews, sustainable creative income

### Secondary Persona: Explorer (David)
**"I want to dive deep into the world and let the story carry me."**
- Age: 18-40
- Context: Seeks meaning, adventure, and connection through structured experiences
- Pain: Existing platforms are either too clinical (LMS) or too shallow (social media)
- Goal: Engage with seasonal episodes, narrative arcs, group quests, and Whisp encounters
- Success: Sustained engagement across seasons, deepening Whisp relationship, community belonging

### Tertiary Persona: Homebody (Elena)
**"I want to tend my inner garden and grow quietly at my own pace."**
- Age: 30-60
- Context: Reflective, introspective, values depth over breadth
- Pain: Group-heavy platforms feel overwhelming; solo apps lack community warmth
- Goal: Solo journeys, personal reflection, quiet garden cultivation, optional community participation
- Success: Rich travel log, growing Whisp, feels at home without pressure to perform

---

## User Experience Principles

### 1. Three Worlds, Felt Transitions
- UI reflects which world the member inhabits: Ordinary World, Safe Harbour, The Other Side
- Transitions between worlds are felt (color, typography, ambient elements), not just navigated
- Each world has its own aesthetic language and emotional register

### 2. The Whisp as Constant Companion
- The Whisp is always present — ambient when quiet, active during encounters
- Whisp fidelity grows visibly with member engagement
- Encounters with the Whisp feel personal, warm, and non-prescriptive

### 3. Stories First, Themes Underneath
- Learning emerges implicitly from narrative, never as lectures
- Seasons and episodes provide temporal rhythm
- A-plot, B-stories, and sub-plots create layered engagement

### 4. Creator-Friendly by Default
- Journey Designer is the central creative tool — intuitive for Makers, powerful for Weavers
- Publishing workflow supports quality without gatekeeping
- Revenue sharing is transparent and fair (Blender Market model)

---

## Feature Scope

### In Scope - Must Have

#### 1. Journey Designer
Three authoring modes for three creative roles:
- **Author** — building specific routes (Type 1 Fixed + Type 2 Hybrid journeys)
- **Terrain Builder** — creating possibility spaces for traveler-initiated journeys (Type 3)
- **World Architect** — defining narrative rules for AI-generative journeys (Type 4)

Foundational concepts from [Session 01](../../ferd/sessions/2026-03-20-SESSION-01-journey-designer.md): universal step grammar (Present > Ask > Change), six content families (Witness, Reflect, Decide, Act, Encounter, Rest), The Road as first-class object, companion model, pacing system.

#### 2. Whisp System
- Whisp as instrument — member's agency projected into the world, begins empty, fills with self-knowledge
- Dual nature: Encounter (structured meeting with future self) + Companion (permanent ambient presence)
- Fullness model — fidelity of response determined by engagement depth
- Whisp practical UI — visibility, interaction, growth signals
- Whisp encounter phenomenology — what encounters look/feel like at different fullness stages

#### 3. Dreamineer Ecosystem
- Dreamineer community: Makers (content creators) + Weavers (experience architects)
- Studio tools — web/desktop content creation suite
- Meritocratic advancement — member-to-Dreamineer path through demonstrated contribution
- Content moderation workflow — review, approve, reject Dreamineer-created content
- Quality standards — Council-defined standards for published content

#### 4. Native Apps (iOS + Android)
- Primary mobile experience for both platforms
- Push notifications (APNS + FCM)
- Quick engagement — episode notifications, journey activities, community moments
- Full feature parity with web experience
- Requires complete ADR-009 API-first compliance

#### 5. Marketplace
- Dreamineer marketplace — journeys, experiences, content, physical products
- Revenue sharing — Foundation platform %, creators keep rest
- Stripe Connect integration — automated payment splitting
- Browse, search, rate, and review
- Publishing workflow (public/private/unlisted)

### Delivered from Ferd (Inherited)

_Features inherited from Ferd (Wave 1) that carry forward into Hamn._

- Authentication & Profiles
- Group Management
- Journey Catalog & Enrollment
- Journey Content Delivery
- Communication (Forums, DM, Notifications)
- RBAC System
- Admin Foundation (DeusEx)
- Lifecycle Flows

### Out of Scope

**Wave 3+ Features:**
- Full AR/mixed reality layer (Hamn has basic experiments only)
- Type 3 and Type 4 journey full operation (Designer supports authoring, full execution is Wave 3)
- Physical game (Unreal Engine)
- FringeIsland Foundation formal establishment
- Annual Summit
- Regional gatherings
- Advanced analytics and recommendation engine at scale

**See:** [DEFERRED.md](../../ferd/planning/DEFERRED.md) for rationale

---

## Feature > Milestone > Roadmap Mapping

### Hamn M1: Journey Creation Tools
**Milestone:** Journey Designer operational for Type 1 and Type 2 journeys
- Journey Designer core (Author mode)
- Step type library (six content families)
- Journey preview and testing
- Journey publishing workflow
- Journey versioning

### Hamn M2: Journey Marketplace
**Milestone:** Dreamineers can publish and members can discover journeys
- Marketplace browsing and search
- Ratings and reviews
- Stripe Connect integration
- Revenue sharing implementation
- Content moderation workflow

### Hamn M3: Enhanced Collaboration
**Milestone:** Full community experience, Discord retired
- Groups-join-groups UI
- Activity feed
- Forum enhancements (reactions, search, rich media, pinned posts)
- DM enhancements (message search, filtering)
- Online seasonal events
- Discord retirement

---

## Technical Specifications

### Tech Stack
Inherits from Ferd unless otherwise specified:
- **Frontend:** Next.js (web, evolved from Ferd), React Native or similar (iOS + Android)
- **Backend:** Supabase (PostgreSQL + Auth + Storage), extended with AI provider integration
- **AI:** LLM integration for Whisp, NPCs, adaptive personalization (provider TBD after RQ-H-001)
- **Payments:** Stripe Connect for marketplace and subscriptions
- **Deployment:** Vercel (web), App Store + Google Play (native)

### Database
Extends Ferd schema:
- profile_data table (inherited from Ferd, extended for Whisp and accumulation)
- Journey Designer tables (steps, content families, roads, pacing)
- Marketplace tables (listings, transactions, reviews, revenue shares)
- Content moderation tables

### Architecture Patterns
Inherits Ferd patterns, adds:
- **Full ADR-009 compliance** — all features API-first for native app support
- **AI integration layer** — L7 Intelligence services behind API routes
- **Multi-frontend architecture** — shared API serving web + iOS + Android

See [Architecture Anatomy](../../../universe/architecture/ARCHITECTURE_ANATOMY.md) for platform-level patterns.

---

## User Flows

### Flow 1: Creating a Journey (Dreamineer)
1. Dreamineer opens Journey Designer
2. Selects authoring mode (Author for Type 1/2)
3. Builds journey structure: nodes + roads + beats
4. Assigns content families to each node
5. Previews and tests the journey
6. Submits for moderation review
7. Published to marketplace

### Flow 2: Whisp Encounter
1. Member reaches an Encounter node in a journey
2. Whisp appears based on current fullness level
3. Structured dialogue: Present > Ask > Change
4. Member's response feeds back into Whisp fidelity
5. Encounter summary added to travel log

### Flow 3: Discovering and Enrolling via Marketplace
1. Member browses marketplace (search, filter, recommendations)
2. Views journey details (overview, reviews, Dreamineer profile)
3. Enrolls individually or with group
4. Journey appears in My Journeys
5. Dreamineer receives enrollment notification

---

## Acceptance Criteria (Overall Product)

### Usability
- Journey Designer learnable by non-technical Dreamineers in < 1 hour
- Native apps feel native (platform conventions, gestures, performance)
- World transitions feel smooth and meaningful, not jarring

### Performance
- Native app launch in < 3 seconds
- API response times < 500ms for all endpoints
- Whisp responses feel conversational (< 2s latency)

### Security
- MFA available for all accounts
- SSO for organizational use (SAML, OIDC)
- Full GDPR compliance (access, erasure, portability)
- AI data handling policies enforced

### Quality
- Integration test coverage extends to all new Hamn features
- E2E tests cover critical paths on web and native
- Content moderation catches policy violations before publication

### Documentation
- Journey Designer user guide
- Dreamineer onboarding documentation
- API documentation for native app developers

---

## Success Metrics

### Adoption Metrics
- 500+ registered users within 6 months of Hamn launch
- 50+ active groups
- 100+ Dreamineer-created journeys published
- Native app installs: 300+ (iOS + Android combined)

### Engagement Metrics
- 50%+ weekly active users
- 5+ sessions per user per week (including mobile)
- Seasonal episode engagement: 60%+ of active users
- Whisp encounter completion: 70%+

### Quality Metrics
- < 3% error rate
- 4.5+ star average app store rating
- < 5 content moderation escalations per week
- Native app crash rate < 1%

### Validation Metrics
- Do Dreamineers create and publish journeys? (Marketplace activity)
- Does the Whisp deepen engagement? (Retention: Whisp users vs non-Whisp)
- Do seasonal episodes create sustained engagement? (Month-over-month retention)
- Does the marketplace generate revenue? (Transaction volume + Dreamineer earnings)

---

## Non-Goals (What We're NOT Building)

### Not a Game Engine (Yet)
- No Unreal Engine integration (Wave 3+)
- No VR/AR headset support (Wave 3+)
- No full 3D world rendering

### Not Fully Autonomous AI
- NPCs are calibrated, not free-form (safety first)
- AI-generative journeys (Type 4) are authored at meta-level, not fully autonomous
- Whisp operates within defined personality boundaries

### Not a General Social Network
- No public profiles browsable by non-members
- No algorithmic feed
- No advertising model

---

## Iteration Plan

### How We'll Evolve This Spec
1. Hamn specification sessions resolve RESEARCH.md open questions
2. AI feasibility validation (RQ-H-001) determines L7 scope
3. Hamn MVP definition (RQ-H-002) scopes the first milestone
4. Beta feedback from Ferd informs Hamn priorities
5. Each Hamn milestone updates this spec

### Key Questions to Answer
- Does the Journey Designer enable non-technical creators? (Dreamineer usability)
- Does the Whisp create meaningful engagement? (Retention data)
- Is the marketplace viable? (Transaction volume, Dreamineer satisfaction)
- Do native apps drive mobile engagement? (DAU mobile vs web)
- Does the seasonal model create sustained engagement? (Churn analysis)

---

## Related Documents

- **[Vision](../../../universe/vision/VISION.md)** - Why FringeIsland exists
- **[Roadmap](../../ferd/planning/ROADMAP.md)** - When features are being built
- **[Deferred Decisions](../../ferd/planning/DEFERRED.md)** - What we're NOT building (and why)
- **[Feature Docs](../development/features/)** - Detailed feature specifications
- **[Behavior Specs](../development/specs/)** - Rules that govern features
- **[Architecture Anatomy](../../../universe/architecture/ARCHITECTURE_ANATOMY.md)** - Layered platform anatomy (L0-L7)
- **[Architecture Decisions](../../../universe/decisions/INDEX.md)** - ADRs with full reasoning
- **[Products & Platform](../../../universe/strategy/PRODUCTS_AND_PLATFORM.md)** - Product strategy and wave model
- **[Ferd Product Spec](../../ferd/specification/PRODUCT_SPEC.md)** - Wave 1 product specification
- **[Research](../planning/RESEARCH.md)** - Open investigations for Hamn
- **[Community](../../../universe/community/)** - Community and organizational questions
- **[Processes](../../../universe/processes/)** - Cross-product workflows (deferral, planning)
- **[Hamn Requirements](./REQUIREMENTS.md)** - Detailed requirements (TBD)
- **[Vision-to-Spec Mapping](../VISION_TO_SPEC_MAPPING.md)** - Analysis that informed this spec

---

## Document Maintenance

**Update this spec when:**
- Major features added/removed from scope
- User personas evolve based on data
- Success metrics need adjustment
- Technical constraints change scope
- Vision shifts direction

**Owner:** Product team (currently: Stefan + AI assistant)
**Review Cadence:** After each specification session
**Version History:**
- v0.2 (Apr 5, 2026): Themes placed — personas, UX principles, feature scope, milestones, technical specs, acceptance criteria, success metrics, non-goals, iteration plan
- v0.1 (Apr 5, 2026): Initial scaffold — structure mirrors Ferd, content TBD

---

**Remember:** This spec defines WHAT we're building. The Vision defines WHY. The Roadmap defines WHEN. Features define HOW.
