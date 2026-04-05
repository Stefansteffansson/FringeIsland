# FringeIsland Roadmap

**Version:** 3.0
**Last Updated:** March 20, 2026
**Links:** [Vision](../../../universe/vision/VISION.md) | [Products & Platform](../../../universe/strategy/PRODUCTS_AND_PLATFORM.md) | [Product Spec](../specification/PRODUCT_SPEC.md) | [Sprint Tracker](../../../../SPRINT.md)

This document defines **WHEN** features are built and how the platform evolves. See [Products & Platform](../../../universe/strategy/PRODUCTS_AND_PLATFORM.md) for the authoritative product strategy and wave model. See [Product Spec](../specification/PRODUCT_SPEC.md) for **WHAT** and [Vision](../../../universe/vision/VISION.md) for **WHY**. For current status, see [PROJECT_STATUS.md](../../../../PROJECT_STATUS.md). For version history, see [CHANGELOG.md](../../../../CHANGELOG.md).

---

## The Wave Model

FringeIsland evolves in overlapping waves — each beginning before the previous is complete, building on what came before. The platform is not a sequence of discrete phases; it is a living system that grows organically.

| Wave | Name | Goal | Status |
|------|------|------|--------|
| **1** | **Ferd** (Departure) | Prove the ground is solid — journey foundation, groups, roles, core platform | **95%** — Ferd 1.6 (Polish & Launch) remaining |
| **2** | **Hamn** (Harbour) | The island comes alive — Journey Designer, Whisps, Dreamineers, marketplace, native apps | Not started — conceptual foundation established (Session 01) |
| **3** | The World Expands | AR/mixed reality, physical products, regional gatherings, Summit, Foundation | Not started |
| **3+** | The Game | Full-fidelity Unreal Engine experience across desktop, console, mobile, VR/AR | Not started |

See [Products & Platform](../../../universe/strategy/PRODUCTS_AND_PLATFORM.md) for full wave definitions, device strategy, and product family details.

---

## Development Principles

1. **Ship Early, Ship Often**: Release Ferd as MVP, iterate based on feedback
2. **User-Centric**: Validate features with real users before building
3. **Technical Excellence**: Clean architecture, comprehensive tests, good documentation
4. **Flexible Foundation**: Build systems that can evolve (avoid rigid assumptions)
5. **TDD Mandatory**: Behaviors > Failing tests (RED) > Implement (GREEN). See `docs/workflows/feature-development.md`
6. **Lock the Pattern, Not the Content**: Extensibility patterns are stable; specific content types are data inserts, not schema migrations (Session 01 principle)

---

## Wave 1: Ferd — 95% Complete

**Goal**: Launch a working platform where groups can embark on predefined journeys together. Prove the builder can build and the journey metaphor is real.

**Tech stack**: Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL

### Completed Milestones

| Milestone | Scope | Version | Status |
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

### Ferd 1.6: Polish and Launch — IN PROGRESS

**Goal**: Prepare platform for public launch with a small beta group.

**Remaining deliverables:**

1. **UI/UX Refinement** — Mobile responsiveness audit, accessibility improvements (WCAG 2.1 AA), user onboarding flow
2. **Testing** — Expand E2E test coverage (7 Playwright tests exist), performance testing, security audit
3. **Documentation** — User guide, help center articles
4. **Beta Testing** — Invite 10-20 beta users, collect feedback, fix critical bugs, iterate on UX
5. **Launch** — Public launch announcement, error monitoring (Sentry), rapid bug fixing

**Acceptance Criteria:**
- All critical bugs fixed
- Performance acceptable (< 2s page loads)
- Beta users satisfied
- Public launch successful

**Known Issues:**
- Orphan groups after hard delete (needs stewardship transfer UI)
- `app/admin/fix-orphans/page.tsx` uses `alert()` (should use ConfirmModal)
- Hydration mismatch warning in AuthForm.tsx (cosmetic)

See `SPRINT.md` for the active sprint plan and step-by-step status.

---

## Wave 2: Hamn — Conceptual Foundation Established

**Goal**: The island comes alive. The full FringeIsland member experience takes shape — Journey Designer, Whisps, Dreamineers, marketplace, narrative. Discord is retired. The community lives fully on its own platform. Native iOS and Android apps launch alongside Hamn.

**Conceptual foundation**: [Journey Designer Session 01](../sessions/2026-03-20-SESSION-01-journey-designer.md) established the vocabulary, cosmology, and foundational data model concepts for the journey system. This is the prerequisite for all Hamn specification and implementation work.

### Journey Designer

The central creative tool for Hamn. Three authoring modes for three creative roles:

- **Author** — building specific routes (Type 1 Fixed + Type 2 Hybrid journeys)
- **Terrain Builder** — creating possibility spaces for traveler-initiated journeys (Type 3)
- **World Architect** — defining narrative rules and cosmological structure for AI-generative journeys (Type 4)

**Foundational concepts established in Session 01:**
- Universal step grammar: Present > Ask > Change (two-level: nodes + beats)
- Six content families: Witness, Reflect, Decide, Act, Encounter, Rest
- The Road as first-class object between nodes (designer sets conditions, universe fills content)
- Encounter family with two dimensions: Origin (planned/emergent/triggered) x Other (NPC/FIM/group/inner self/Whisp)
- Companion model: Traveler + Companionship Record (consistent with Universal Group architecture)
- Pacing system: node duration (4 types), road duration (3 modes), journey completion (4 triggers)
- Journey states: active, paused, complete, integrated

**Specification sessions needed before implementation:**
- Session 02+: Seasons and Episodes, Whisp practical UX, Three Worlds UI design, NPC behaviour authoring
- Step type specification (required before L3 Experience Engine work)
- Journey Designer data model (builds on Session 01 vocabulary)

### The Whisp and Whisperers

Each member's personal future self — the Whisp — inhabiting the Other Side. Dual nature: Encounter (active structured meeting with future self) and Companion (permanent silent presence). Whisperers are the collective — all Whisps walking the Other Side together.

**Prerequisite**: L1 `profile_data` table, AI provider integration (L0), Whisp practical UX specification session.

### Three Worlds

The platform manifests across three worlds: the Ordinary World (everyday life), the Safe Harbour (FringeIsland — reflection, safety, becoming), and the Other Side (deeper water — narrative, challenge, Whisperers). UI design session needed to determine how world transitions are experienced.

### Dreamineer Ecosystem

- Dreamineer marketplace — journeys, experiences, content, physical products
- Dreamineer studio tools — web/desktop content creation
- Journey publishing workflow (public/private/unlisted)
- Ratings and reviews

### Native Apps

- iOS native app — primary mobile experience
- Android native app — primary mobile experience
- Requires API-first refactoring (ADR-009 compliance across all features)

### Additional Hamn Deliverables

- Visitor/shadow experience (L1 — anonymous entry, garden door metaphor)
- Journey Zero (onboarding journey)
- Content moderation (required for Dreamineer-created content)
- Email delivery service (replacing simulated stubs)
- Groups-join-groups UI (requires D11 circularity trigger first)
- Online seasonal events
- Basic AR experiments

**Success Criteria:**
- Journey Designer operational for Type 1 and Type 2 journeys
- Dreamineer marketplace live with user-created journeys
- Native apps launched
- Discord retired — community fully on-platform
- Whisp system functional at minimum viable depth

---

## Wave 3: The World Expands

**Goal**: The world extends beyond the screen into physical space. AI-powered journey types become operational.

- Full AR/mixed reality layer
- Physical products — world artefacts, printed materials, merchandise
- Regional gatherings growing organically
- Training camps and getaways
- Annual FringeIsland Summit — first edition
- FringeIsland Foundation formally established
- Type 3 (Traveler-Initiated) and Type 4 (AI-Generative) journeys fully operational
- AI Mentor (L7 Intelligence layer)
- Dynamic journey paths — branching logic engine
- Advanced analytics and recommendations

**Success Criteria:**
- AR layer functional
- Physical products available through marketplace
- First Summit held
- AI-Generative journeys live
- Foundation established

---

## Wave 3+: The Game

**Goal**: The most immersive digital expression of the FringeIsland world.

- FringeIsland Game — Unreal Engine, three worlds rendered in full fidelity
- Runs across: desktop, console, mobile, VR/AR headsets
- Dreamineer game tools — world-building within the game engine
- Physical game expressions
- The line between platform, game and physical world begins to dissolve

**Success Criteria:**
- Game launched on at least two platforms
- Three worlds navigable
- Dreamineer game tools available

---

## Cross-Wave Concerns

These capabilities evolve continuously across waves rather than belonging to a single wave:

| Concern | Ferd (current) | Hamn | Wave 3+ |
|---------|---------------|------|---------|
| **API-first (ADR-009)** | 5 API routes, mostly direct Supabase | Full API coverage | Public developer API |
| **Accessibility** | Basic semantic HTML | WCAG 2.1 AA audit | Ongoing improvement |
| **i18n** | English only | String externalization | Multi-language |
| **Privacy/GDPR** | RLS + display names | Full rights (access, erasure, portability) | Consent management, AI data handling |
| **Security** | Auth + RLS + RBAC | MFA, SSO, security audit | SOC 2, compliance certifications |
| **Performance** | 8-tier optimization | Monitoring, CDN | Horizontal scaling |
| **Monetization** | Free | First paid tiers + Dreamineer marketplace | Organizational licensing |

See [DEFERRED.md](./DEFERRED.md) for detailed rationale on what was deliberately deferred and when to revisit.

---

## Success Metrics by Wave

| Metric | Ferd | Hamn | Wave 3+ |
|--------|------|------|---------|
| Users | 100+ | 500+ | 1000+ |
| Groups | 10+ | 50+ | 100+ |
| Journeys | 8 predefined | 100+ Dreamineer-created | 10+ AI-generative |
| Retention | 70%+ (week 2) | 75%+ | 80%+ |
| Native apps | — | iOS + Android | + Game |
| Integrations | — | Marketplace | 5+ third-party |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Supabase limitations | Migration plan to self-hosted PostgreSQL |
| Performance issues | Caching early, monitoring closely |
| Complex authorization | Comprehensive tests, code reviews |
| Users don't create journeys | Excellent templates, Dreamineer onboarding |
| Feature creep | Strict scope discipline — see [DEFERRED.md](./DEFERRED.md) |
| Journey Designer over-specification | Lock extensibility patterns, not content inventory (Session 01 principle) |
| AI calibration of NPCs | Dedicated specification session before implementation |

---

## Post-Launch Priorities (Ferd)

**First 30 Days:** Monitor errors, rapid bug fixes, onboarding improvements
**First 90 Days:** Feature refinements, 5+ new journeys, case studies, plan Hamn
**First Year:** Complete Hamn foundation, 500+ active users, Dreamineer program launched

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Products & Platform](../../../universe/strategy/PRODUCTS_AND_PLATFORM.md) | Authoritative product strategy and wave model |
| [Vision](../../../universe/vision/VISION.md) | Why FringeIsland exists |
| [Manifesto](../../../universe/vision/MANIFESTO.md) | Core values and principles |
| [Product Spec](../specification/PRODUCT_SPEC.md) | What we're building |
| [Architecture Anatomy](../../../universe/architecture/ARCHITECTURE_ANATOMY.md) | L0-L7 layers, verticals, Platform API ring |
| [Architecture Baseline](../../../implementation/ferd/baseline/BASELINE.md) | Live implementation state mapped to anatomy |
| [Deferred Decisions](./DEFERRED.md) | What we chose not to build yet and why |
| [Journey Designer Session 01](../sessions/2026-03-20-SESSION-01-journey-designer.md) | Foundational vocabulary and concepts for Hamn journey system |
| [Sprint Tracker](../../../../SPRINT.md) | Active sprint status |
| [Lifecycle Decisions](./LIFECYCLE_DECISIONS.md) | Binding decisions from lifecycle sprints |

---

**Document Version**: 3.0
**Next Review**: After Ferd 1.6 launch or when Hamn specification sessions begin
