# FringeIsland — Ecosystem Architecture Session Bridge

**Date:** April 8, 2026  
**Session type:** Ecosystem anatomy & architecture design  
**Status:** Anatomy v2 PROPOSED — ready for piece-by-piece locking  
**Participants:** Stefan (Product Owner) + Claude (Architectural Advisor)

---

## Session summary

This session evolved from a request to research systematic web development workflows into a deep architectural redesign of the FringeIsland ecosystem. The conversation spanned three phases: (1) process methodology research, (2) multi-product ecosystem management research, and (3) a ground-up challenge of the existing architecture anatomy to prepare for open-source extensibility and parallel contribution.

The session produced a proposed **Ecosystem Anatomy v2** — a three-tier architecture designed for 50+ contributors working in parallel, with plugin extensibility as a first-class concern.

---

## Research produced (two companion reports)

### Report 1: The Solo Developer's Complete Guide to Systematic Web Development
- Requirements engineering hierarchy (Theme → Epic → Story → Task)
- Maturity pipeline: Concept → Study → Specify → Build
- "Shaped Personal Kanban" methodology (Personal Kanban + Shape Up hybrid)
- NOW/NEXT/LATER roadmapping
- Definition of Ready / Definition of Done
- BDD/TDD placement in the workflow
- Markdown-in-git project management
- Testing trophy for Next.js + Supabase
- Process maturity phases (start minimal, add when you feel pain)

### Report 2: Multi-Product Ecosystem Management for Solo Developers
- Document hierarchy: Ecosystem Vision → Product Description → Product Specification → Feature PRDs → Work Items
- Product Description (outward-facing, vision-level) vs. Product Specification (inward-facing, build-level)
- Platform vs. Product split — shared infrastructure vs. client-specific features
- Three-roadmap model (Ecosystem, Product, Platform)
- Cross-product dependency tracking table
- Recommended folder structure for docs/ecosystem, docs/old_products, docs/platform

Both reports delivered as downloadable files (.md artifact + .docx with embedded diagrams).

---

## Ecosystem items identified

The following items were identified as the ecosystem taxonomy (discussed with Claude Code in parallel):

- **Platform Core** — domain-agnostic foundation
- **Domain Services** — 7 FringeIsland-specific modules
- **Extension System** — plugin contracts and registry
- **Products** — Web (Ferd→Hamn), iOS (Hamn+), Android (Hamn+), Game
- **Studios** — Journey Designer, Universe Designer, Arc Designer
- **Design System** — shared visual language across all surfaces
- **Cross-cutting verticals** — 5 concerns touching every layer

Community was discussed and resolved as a Domain Service (Communication module), not a separate ecosystem item.

---

## Proposed ecosystem anatomy v2

### Design principles

- **Designed for 50+ contributors** working in parallel, not optimized for solo convenience
- **Plugin extensibility** as a first-class architectural concern
- **Three tiers with two contract boundaries** — changes at lower tiers are rare and heavily reviewed; changes at higher tiers are frequent and independently deployable
- **Dependency rules are strict** — lower never depends on higher; siblings at the same level have explicit, documented dependency directions
- **Stålenhag-inspired World Model** — the universe is a rich multimedia knowledge base (art, lore, rules, atmospheres), not a code module

### The three tiers

```
SURFACES (above Platform API)
├── Products: Web (Ferd→Hamn) · iOS · Android · Game
├── Studios: Journey Designer · Universe Designer · Arc Designer
└── Design System: shared visual language, i18n, a11y

═══ Platform API (external contract boundary) ═══════════════

DOMAIN SERVICES (FringeIsland-specific, modular, extensible)
├── DS-1: World Model         — Universe, Three Worlds, Whisp, lore, cosmological constraints
├── DS-2: Narrative Engine    — Seasons, episodes, story beats, arc delivery
├── DS-3: Experience Engine   — Journey runtime: catalogue, enrolments, step execution, progress
├── DS-4: Content             — Media, assets, narrative blocks, reflections, assessments, journal
├── DS-5: Communication       — DM, forums, announcements, activity feed
├── DS-6: Discovery           — Search, recommendations, marketplace
├── DS-7: Intelligence        — AI mentor, profile accumulation, insights
└── Extension System          — Plugin contracts, registry, lifecycle, sandboxing

═══ Internal API (domain-to-core contract boundary) ═════════

PLATFORM CORE (domain-agnostic foundation)
├── PC-1: Infrastructure      — Supabase, PostgreSQL, RLS, Storage, pg_cron, feature flags, email, backup
├── PC-2: Identity            — Auth (login, sessions, tokens, MFA) + Profile (user data, extensible profile_data)
├── PC-3: Organisation        — Groups, memberships, roles, permissions
└── PC-4: Governance          — DeusEx policies, platform rules, tenant configuration

CROSS-CUTTING VERTICALS
├── V1: Administration & Moderation
├── V2: Privacy, GDPR & AI Consent
├── V3: Notifications (email, push, in-app)
├── V4: Observability (audit, errors, metrics)
└── V5: Transactions (Stripe, billing)
```

### Domain service dependency rules

- **World Model** sits at the top — constrains everything, consumed by all services. Universe Studio writes to it. Changes here require heavy review (cosmological constitution).
- **Narrative Engine** reads from World Model and Content. Arc Studio writes to it. Does not depend on Experience Engine — narrative decorates journeys but doesn't define them.
- **Experience Engine** reads from World Model, Content, and Narrative Engine. Journey Studio writes journey definitions to it. The Step Type Registry lives here — primary plugin extension point.
- **Content** is a shared resource pool consumed by DS-2, DS-3, DS-5, DS-6, DS-7. It depends on none of them. Different lifecycle (draft/published/archived), own storage concerns (CDN, optimization).
- **Communication, Discovery, Intelligence** are leaf services — depend on services above but nothing depends on them. Can be developed, deployed, and extended independently.
- **Extension System** sits at the bottom of Domain Services, manages how all services above expose extension points.

### Key changes from anatomy v1

| Change | Rationale |
|--------|-----------|
| Split into 3 tiers (was monolithic "platform") | Enables different change cadences, review processes, and contributor types per tier |
| World Model introduced as DS-1 | The universe is a Stålenhag-inspired multimedia knowledge base that constrains all domain logic |
| Narrative Engine introduced as DS-2 | Serialized storytelling (seasons, episodes, arcs) is architecturally distinct from journey execution |
| Experience Engine is now runtime-only (DS-3) | Authoring extracted to Studios; runtime and authoring serve different users with different code |
| Content repositioned as sibling service (DS-4) | Content is consumed by multiple services independently; it's not "above" or "below" the Experience Engine |
| Communication + Discovery repositioned as siblings | They're peer leaf services, not stacked layers |
| Governance separated from Organisation | Organisation is domain-agnostic (groups/roles/perms); Governance holds FringeIsland-specific policies (DeusEx) |
| Identity conceptually split: Auth + Profile | Auth is security-critical (rarely touched); Profile is feature surface (frequently extended) |
| Extension System as first-class component | Not a vertical — too important for open-source future to be a cross-cutting concern nobody owns |
| Two explicit API boundaries | Platform API (external) and Internal API (domain-to-core) are real contracts, not conceptual labels |
| Studios as separate surface category | Serve creators (Dreamineers/Weavers), not consumers (FIMs); different personas, permissions, UI |

### Studios and what they author

| Studio | Writes to | Content types |
|--------|-----------|---------------|
| **Universe Designer** | World Model (DS-1) | 2D/3D concept art, environment illustrations, mood boards, location maps, lore documents, background stories, world rules, entity sketches, atmospheric references, sensory descriptions |
| **Arc Designer** | Narrative Engine (DS-2) | Season structures, episode definitions, story beats, narrative threads, character arcs, timeline/chronology |
| **Journey Designer** | Experience Engine (DS-3) | Journey definitions, node placement (GPS), beat sequences, step types, preview configurations |

The Universe Designer vision was informed by studying Simon Stålenhag's worldbuilding method — starting from real places and layering speculative elements, building through multiple media types (visual, written, structural, reference), creating atmosphere and emotional texture rather than technical specification.

---

## Decision: do not start from scratch

**Rationale:**

The existing codebase (v0.2.8) is architecturally *incomplete*, not architecturally *broken*:

- Database schema (users, groups, memberships, roles, permissions, journeys, enrollments) maps cleanly to Platform Core + Experience Engine beginnings
- Auth system = Platform Core Identity (correct and working)
- Group management = Platform Core Organisation (solid implementation)
- Journey catalogue = Experience Engine v0 (functional)
- ~16,000+ lines of tested, working code covering auth, profiles, groups, roles, permissions, journey browsing, navigation, modals, avatar uploads, email invitations

**Incremental migration approach:**

1. Build the *next* domain service module according to the new anatomy from day one (proper API routes, defined contracts, consume Platform Core through interfaces)
2. Create a `MIGRATION_PLAN.md` documenting which existing code maps to which tier and what refactoring is needed
3. Treat existing code as "Platform Core v0 + Experience Engine v0" — separation becomes a refactoring track alongside feature development

---

## Non-obvious insights (meta-analysis of this session)

### 1. The World Model is not software — it's a creative canon

Throughout the session, the World Model kept resisting classification as a "service" or "module." That resistance is the insight. The World Model is closer to a wiki, an asset library, and a constraint system simultaneously. It's the kind of thing Stålenhag builds through paintings, not through database schemas. This means the World Model's "API" is probably more like a content query language than REST endpoints — "give me the atmosphere rules for Safe Harbour at twilight" is a fundamentally different query than "get user by ID." The architectural implication: the World Model may need its own storage paradigm (graph database? document store? multimedia CMS?) rather than fitting into PostgreSQL tables.

### 2. The Extension System is what makes this an ecosystem rather than an application

The conversation kept circling back to extensibility — plugins, step types, content renderers, AI providers. This isn't a nice-to-have feature; it's the architectural decision that determines whether FringeIsland becomes a platform that attracts contributors or remains a product that needs maintainers. The Extension System isn't just a registry — it's the social contract between core and community. Getting this wrong means either a locked-down system nobody extends, or an unstable system where plugins break on every update.

### 3. Studios are the silent architectural forcing function

The decision to have three Studios (Journey, Universe, Arc) that write to three different Domain Services created a natural module boundary that no amount of theoretical layering would have produced. The insight: authoring tools are the best test of whether your service boundaries are correct. If a Studio needs to write to two services simultaneously for a single user action, those services are probably too tightly coupled or incorrectly split.

### 4. The "don't start from scratch" decision is really about preserving validated learning

The 16,000 lines of working code aren't just code — they're encoded decisions about how Supabase RLS actually works, how Next.js 16 proxy routing behaves, how group membership state management plays out in React. Starting over would mean re-learning all of those lessons. The code is a knowledge artifact, not just a functional artifact.

### 5. The three-tier split mirrors contributor identity, not just technical concern

Platform Core attracts infrastructure engineers who value stability. Domain Services attract product engineers who value features. Extensions attract community developers who value creativity. Studios attract designers and content creators. The architecture isn't just about code organisation — it's about creating spaces where different kinds of people can contribute without colliding.

---

## Tensions and contradictions

### 1. "Design for 50 contributors" vs. "solo developer building it all"

The architecture is designed for a future that may be years away. Every abstraction, every contract boundary, every API layer adds overhead for the solo developer who has to build and maintain all of it today. The tension is real: over-engineering now slows delivery; under-engineering now creates migration debt. The resolution proposed (incremental migration) is pragmatic but untested — will a solo developer actually maintain two architectural styles (old monolithic + new modular) in the same codebase without it becoming confusing?

### 2. World Model as "constrains everything" vs. World Model as "Dreamineers paint freely"

If the World Model constrains all domain services, it needs formal rules that code can evaluate. But if Dreamineers author it Stålenhag-style through art and prose, it's inherently informal and interpretive. How does a constraint system built from mood boards and background stories actually govern journey logic or Whisp behaviour? This tension between creative freedom and architectural constraint is unresolved.

### 3. Extension System as first-class citizen vs. nothing to extend yet

The Extension System was promoted from a vertical to a component because "it's too important for the open-source future." But there are currently zero extension points, zero plugins, and zero third-party contributors. Designing extension contracts before having real-world usage risks building the wrong abstractions. The counter-argument (you can't retrofit extensibility) is valid but creates a chicken-and-egg problem.

### 4. Content as "sibling service" vs. Content as "everyone's dependency"

Content was repositioned as a sibling (not stacked above or below other services) because "it doesn't depend on any of them." But if 5 out of 7 domain services read from Content, it's functionally a foundational service. Calling it a "sibling" may understate its criticality and the review gravity its changes should carry.

---

## The "so what" — one actionable implication

**Write the World Model's constraint contract before building any new Domain Service.**

Everything in this architecture flows from the World Model. If the World Model is vague, every service interprets "cosmological coherence" differently, and you get architectural drift that no amount of API boundaries can fix. If the World Model is concrete — even in its first, simplest form — it becomes the acceptance test for everything else: "does this journey respect the World Model? Does this episode? Does this Whisp behaviour?"

The practical action: before building Content, Narrative Engine, or any new Domain Service module, spend one session with Claude defining what the World Model's queryable contract looks like. Not the full Stålenhag corpus — just the minimum viable constraint set that other services can validate against. Everything else follows from that.

---

## What's missing — questions this session raises but doesn't answer

1. **What does the World Model's queryable API actually look like?** We know it contains art, lore, rules, and atmospheres. We don't know how another service asks it "what are the constraints for this location?" or "is this Whisp behaviour valid in the Ordinary World?" The storage paradigm and query interface are completely undefined.

2. **What are the Extension System's actual contracts?** We named extension points (step types, content renderers, AI providers, integrations) but never defined what a StepType interface looks like, how plugins are sandboxed, how they're distributed, or how breaking changes are managed across plugin boundaries.

3. **How do the two API boundaries work in Next.js?** The Platform API and Internal API are conceptual contracts. In a monorepo Next.js app, what do these actually look like? API route groups? Separate packages? Barrel exports with access rules? The implementation pattern hasn't been designed.

4. **Where does the Whisp live architecturally?** The Whisp manifests across all three Worlds and all products. Its state accumulates over time. Is it a Platform Core entity (like a user profile extension), a World Model concept, an Experience Engine runtime concern, or its own cross-cutting service? This was discussed but never resolved.

5. **How does the Design System relate to the Three Worlds visually?** If Safe Harbour looks and feels different from the Ordinary World, the Design System needs to support multiple visual modes. Is this theming? Multiple design systems? Dynamic style injection based on World Model context? Completely unexplored.

6. **What's the governance model for the open-source project?** The architecture assumes 50+ contributors, but the contribution governance (who approves PRs to Platform Core vs. Domain Services vs. Extensions, how ADRs work in open-source, how the Dreamineer community relates to the developer community) is undefined.

---

## Open items for next sessions

### Immediate (before building new features)
- [ ] Lock the anatomy v2 piece by piece (this session proposed; next session locks)
- [ ] Define World Model's minimum viable constraint contract
- [ ] Create `MIGRATION_PLAN.md` mapping existing code to the new anatomy
- [ ] Update `ARCHITECTURE_ANATOMY_DIAGRAM.svg` to reflect v2

### Near-term (during next development cycle)
- [ ] Design the two API boundary patterns in Next.js
- [ ] Define first Extension System contract (likely StepType)
- [ ] Create ecosystem document structure (docs/ecosystem/, docs/old_products/, docs/platform/)
- [ ] Write `VISION.md` (ecosystem constitutional document)
- [ ] Write `docs/old_products/ferd/DESCRIPTION.md`

### Deferred (when relevant)
- [ ] Extension System sandboxing and distribution model
- [ ] Open-source governance model
- [ ] World Model storage paradigm (PostgreSQL vs. graph/document store)
- [ ] Whisp architectural placement resolution
- [ ] Design System multi-world theming

---

## For the next Claude session

1. Read this bridge document first
2. The anatomy v2 is PROPOSED, not LOCKED — next session should walk through each component and lock decisions one at a time
3. The "don't start from scratch" decision IS locked — incremental migration approach confirmed
4. The two research reports exist as downloadable files but their recommendations should be understood as feeding into the new anatomy, not as standalone process prescriptions
5. Stefan's explicit instruction: "do not take decisions just to make life easy now but it might hinder us later" — always design for the 50-contributor open-source future
6. The Stålenhag reference is important for understanding Universe Studio — the World Model is creative/multimedia, not just structured data

---

**Session complete. Ecosystem anatomy v2 proposed. Ready for piece-by-piece locking.**
