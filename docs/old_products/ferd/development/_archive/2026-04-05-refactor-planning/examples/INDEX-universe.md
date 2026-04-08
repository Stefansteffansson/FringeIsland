# Universe Documentation

This is the ecosystem-wide documentation for FringeIsland — the vision, strategy, and worldbuilding that applies to all products.

---

## What's in Universe Documentation

Universe docs are **product-agnostic**. They define what FringeIsland is as an ecosystem, independent of any specific product implementation. Even if we deleted Ferd tomorrow and rebuilt from scratch, these documents would remain valid.

**Characteristics:**
- Strategic and aspirational
- Slowly changing (updates in months/years)
- Human-readable first
- Applies to entire ecosystem

---

## Sections

### [Vision →](./vision/INDEX.md)
**Why FringeIsland exists**

The north star. The problem worth solving. The three questions (*Who am I? What do I want? How do I get there?*) and why they matter.

**Key files:**
- [VISION.md](./vision/VISION.md) — The foundational document
- [MANIFESTO.md](./vision/MANIFESTO.md) — Values and principles
- [THREE_QUESTIONS.md](./vision/THREE_QUESTIONS.md) — Framework deep dive

### [Strategy →](./strategy/INDEX.md)
**How the ecosystem works**

Products, governance, business model, phases. The strategic framework for building and sustaining FringeIsland.

**Key files:**
- [PRODUCTS_AND_PLATFORM.md](./strategy/PRODUCTS_AND_PLATFORM.md) — Product family
- [CONTRIBUTION_ARCHITECTURE.md](./strategy/CONTRIBUTION_ARCHITECTURE.md) — Who builds what
- [GOVERNANCE.md](./strategy/GOVERNANCE.md) — Foundation/Council/Community
- [BUSINESS_MODEL.md](./strategy/BUSINESS_MODEL.md) — Revenue and sustainability
- [PHASES.md](./strategy/PHASES.md) — Wave 1/2/3+ timeline

### [Worldbuilding →](./worldbuilding/INDEX.md)
**The fictional world**

Three realms, Whisps, seasons, narrative structure. The immersive edutainment world that all products inhabit.

**Key files:**
- [THREE_REALMS.md](./worldbuilding/THREE_REALMS.md) — Earth, FringeIsland, The Other Side
- [WHISP_MODEL.md](./worldbuilding/WHISP_MODEL.md) — Whisp mechanics, fidelity
- [SEASONS_AND_EPISODES.md](./worldbuilding/SEASONS_AND_EPISODES.md) — Narrative structure
- [COSMOLOGY.md](./worldbuilding/COSMOLOGY.md) — Three-Dimensional Void model

### [Brand →](./brand/INDEX.md)
**Identity and voice**

How FringeIsland looks, sounds, and presents itself to the world.

**Key files:**
- [BRAND_IDENTITY.md](./brand/BRAND_IDENTITY.md) — Visual identity, tone, voice
- [VISUAL_LANGUAGE.md](./brand/VISUAL_LANGUAGE.md) — Colors, typography, imagery
- [MESSAGING_FRAMEWORK.md](./brand/MESSAGING_FRAMEWORK.md) — How we talk about FI

### [Legal →](./legal/INDEX.md)
**IP and privacy framework**

Open source licensing, contributor agreements, trademark policy, privacy principles.

**Key files:**
- [IP_MODEL.md](./legal/IP_MODEL.md) — MIT/Apache + CC BY-SA licensing
- [CLA.md](./legal/CLA.md) — Contributor License Agreement
- [PRIVACY_PRINCIPLES.md](./legal/PRIVACY_PRINCIPLES.md) — Data sovereignty

### [Decisions →](./decisions/INDEX.md)
**Universe-level ADRs**

Architectural decisions that apply to the entire ecosystem, not just one product.

**Examples:**
- ADR-U001: No venture capital
- ADR-U002: Open source licensing model
- ADR-U003: Kickstarter as founding moment

---

## Universe vs Product Decisions

### Universe-Level Decision (ADR-U00X)
Applies to the **entire ecosystem**, regardless of which product you're building.

**Examples:**
- "FringeIsland will never take venture capital" → Universe decision
- "All products use CC BY-SA for content licensing" → Universe decision
- "The Foundation owns the FringeIsland trademark" → Universe decision

**Location:** `/docs/old_universe/decisions/`

### Product-Level Decision (ADR-F00X, ADR-H00X, etc.)
Applies to **one specific product** only.

**Examples:**
- "Ferd uses Supabase for backend" → Ferd decision (ADR-F00X)
- "iOS app uses SwiftUI framework" → iOS decision (ADR-I00X)
- "Hamn implements native push notifications" → Hamn decision (ADR-H00X)

**Location:** `/docs/old_products/{product}/architecture/DECISIONS.md`

---

## Who Reads Universe Docs?

**Everyone** should understand the universe-level vision and strategy:
- Founders and leadership
- Product teams
- Developers and designers
- Content creators (Dreamineers)
- Community members
- Investors and partners

Universe docs provide shared context for everyone working on or contributing to FringeIsland.

---

## Quick Links

**Start Here:**
- [What is FringeIsland? →](./vision/VISION.md)
- [The Manifesto →](./vision/MANIFESTO.md)

**Understand the Strategy:**
- [Product Family →](./strategy/PRODUCTS_AND_PLATFORM.md)
- [Governance Model →](./strategy/GOVERNANCE.md)
- [Business Model →](./strategy/BUSINESS_MODEL.md)

**Explore the World:**
- [Three Realms →](./worldbuilding/THREE_REALMS.md)
- [Whisp Model →](./worldbuilding/WHISP_MODEL.md)

**See Decisions:**
- [All Universe ADRs →](./decisions/INDEX.md)

**Go to Products:**
- [Ferd (Web App) →](../old_products/ferd/INDEX.md)
- [All Products →](../old_products/INDEX.md)

**See Current State:**
- [What's Being Built Now →](../old_implementation/cross-product/PRIORITIES.md)

---

*This is the foundation. Everything else builds on this.*
