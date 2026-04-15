# Ecosystem — Open Questions

**Last Updated:** April 12, 2026

---

## Status Legend

- **Open** — Not yet investigated
- **In Progress** — Active investigation
- **Resolved** — Answer found (see resolution)
- **Parked** — Deprioritized, revisit later

---

## Open — Blocking

### CQ-001: Cold-Start — Community Bootstrapping
**Status:** Open
**Scope:** Ferd, Hamn
**Raised:** 2026-04-05
**Blocks:** Ferd beta evaluation criteria, Hamn community features
**Context:** How do we seed enough human relationships for relational (1+1) and communal (1+community) dimensions to work? With 3 founding members we can pilot both, but scaling strategy needs thought. Minimum viable community size for communal features to feel meaningful?

### CQ-002: Dreamineer Recruitment Before Hamn
**Status:** Open
**Scope:** Ferd, Hamn
**Raised:** 2026-04-05
**Blocks:** Hamn content pipeline, marketplace viability
**Context:** PRODUCTS_AND_PLATFORM.md lists "First Dreamineers recruited" under Ferd. But Ferd has no Dreamineer-facing tools. How are they recruited and what do they do before Hamn ships?

### CQ-003: Content Chicken-and-Egg
**Status:** Open
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Marketplace viability, Dreamineer ecosystem
**Context:** Hamn needs Dreamineer-created content to be alive, but Dreamineers need tools and a community to create content. What is the bootstrap strategy?

### CQ-010: The First Experience — What Happens in the First Hour?
**Status:** Open
**Scope:** Ferd, Hamn
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**Blocks:** Ferd user onboarding flow, Hamn "Journey Zero" onboarding journey, Kickstarter campaign design
**Context:** Four deep design sessions have explored what FringeIsland *is* — none have designed what a new member actually *does* when they arrive. The founding narrative, the story that members first enter, the mystery, the conflict, the world that comes to life for the first time. This is the single highest-risk gap: everything else is irrelevant if the first experience does not work.

### CQ-011: AI Feasibility — What Does the AI Actually Need to Do?
**Status:** Open
**Scope:** Heim, Urd
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**Blocks:** Heim dynamic journey paths, Type 4 (AI-generative) journeys, NPC implementation (Urd), Weaver-AI collaboration tools
**Context:** The vision assumes load-bearing AI capabilities: adaptive season personalisation per member, NPC calibration to growth zones, AI-generative Type 4 journeys, void-responsive content delivery. None of this has been validated against what current or near-future AI can deliver at the quality required. The Experience Engine is the architectural linchpin and remains unbuilt.

---

## Open — Active

### CQ-004: Dreamineer Council Governance Mechanics
**Status:** Open
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Council tooling in Hamn spec
**Context:** How does the Council actually operate? Voting? Consensus? Rotating seats? The vision describes the principle but no spec covers the practice. What platform tools does it need?

### CQ-005: When Must Monetization Work?
**Status:** Open
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Hamn roadmap sequencing
**Context:** Kickstarter funds initial development, but subscriptions and marketplace revenue need to sustain the Foundation. At what point in Hamn must revenue flow?

---

## Open — Parked

### CQ-006: Foundation Formal Establishment
**Status:** Parked
**Scope:** All waves
**Raised:** 2026-04-05
**Blocks:** Kickstarter (legal entity to receive funds), marketplace (payment handling)
**Context:** Listed as Wave 3 in roadmap but referenced as if it exists in governance descriptions. What's the minimum viable legal structure needed before Kickstarter?

### CQ-007: Content Licensing Model
**Status:** Parked
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Dreamineer marketplace terms
**Context:** VISION.md describes CC BY-SA with CLA for community content. No product spec covers how this is surfaced to users or enforced in the marketplace.

### CQ-008: Physical Products Strategy
**Status:** Parked
**Scope:** Hamn, Wave 3
**Raised:** 2026-04-05
**Blocks:** Marketplace product types
**Context:** 3D artefacts, printed materials, merchandise described in PRODUCTS_AND_PLATFORM.md. Who produces them? Fulfillment strategy?

### CQ-009: 50+ Demographic as Mentors
**Status:** Parked
**Scope:** All waves
**Raised:** 2026-04-05
**Blocks:** Nothing immediate
**Context:** VISION.md highlights 50+ as "a particularly important role" for wisdom-sharing. How do we attract and empower them? Is the Guide role sufficient or do we need a Mentor/Elder concept?

### CQ-012: Whisp Representation in Ferd/Eid — Without AR
**Status:** Parked
**Scope:** Ferd, Eid
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**Blocks:** Ferd Whisp representation (if attempted before Eid), Eid Whisp MVP design
**Context:** The Whisp's most vivid expressions — AR overlay (Brim), void visualisation (Brim), fullness-as-fidelity — all depend on technology slated for later waves. Ferd is a web platform; Eid will introduce the first Whisp encounter phenomenology and practical UI specifications. If the Whisp is the emotional core of FringeIsland, its Wave 1/Wave 2 expressions must be compelling even in a browser. That design problem is entirely untouched.

### CQ-013: NPC Behaviour Authoring Mechanism
**Status:** Parked
**Scope:** Hamn, Urd
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**Blocks:** Hamn NPC system, AI-driven seasonal content
**Context:** NPCs are central to the world, but the authoring mechanism is unspecified. Prompt engineering? Behaviour graphs? Learning models? This is prerequisite for any NPC implementation.

### CQ-014: Visitor Experience — What Can Visitors Do?
**Status:** Open
**Scope:** Ferd
**Raised:** 2026-04-14 (extracted from hamn VISION_TO_SPEC_MAPPING.md)
**Blocks:** Ferd visitor implementation, onboarding funnel design
**Context:** ADR-U004 locks the technical approach (anonymous sign-in, temporary profiles, pg_cron cleanup). But the product-level visitor experience is unspecified: what pages/content are visible to non-authenticated visitors? What constitutes a "taster journey"? What is the garden glimpse? What carries forward on registration? This needs a feature spec before implementation.

---

## Resolved

_No resolved items yet._
