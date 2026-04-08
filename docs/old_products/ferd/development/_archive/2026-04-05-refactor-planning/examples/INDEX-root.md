# FringeIsland Documentation

Welcome to the FringeIsland documentation. Everything you need to understand, build, and contribute to the FringeIsland ecosystem lives here.

---

## Overview

FringeIsland is a multi-product ecosystem for personal development — built around three core questions: *Who am I? What do I want? How do I get there?*

This documentation is organized in **three tiers**:

1. **Universe** — Vision, strategy, worldbuilding (ecosystem-wide)
2. **Products** — Individual product specifications (Ferd, Hamn, iOS, etc.)
3. **Implementation** — Current state, status tracking, handover

---

## Quick Navigation

### For Newcomers
- [What is FringeIsland? →](./universe/vision/VISION.md)
- [The Manifesto →](./universe/vision/MANIFESTO.md)
- [Product Family Overview →](./universe/strategy/PRODUCTS_AND_PLATFORM.md)

### For Contributors
- [How to Contribute →](./universe/strategy/CONTRIBUTION_ARCHITECTURE.md)
- [Current Development Focus →](./implementation/cross-product/PRIORITIES.md)
- [Ferd Development Guide →](./products/ferd/development/CONTRIBUTION_GUIDE.md)

### For Developers
- [Ferd Architecture →](./products/ferd/architecture/ANATOMY.md)
- [Ferd Requirements →](./products/ferd/specification/REQUIREMENTS.md)
- [Current State →](./implementation/ferd/status/KANBAN.md)

### For Product Team
- [Ferd Roadmap →](./products/ferd/planning/ROADMAP.md)
- [Current Phase →](./products/ferd/planning/CURRENT_PHASE.md)
- [All Products Status →](./implementation/cross-product/CURRENT_STATE.md)

---

## The Three Tiers

### [Universe Documentation →](./universe/INDEX.md)
The ecosystem-wide vision, strategy, and worldbuilding. Applies to all products.

**What's inside:**
- Vision — Why FringeIsland exists
- Strategy — Products, governance, business model
- Worldbuilding — Three realms, Whisp, narrative structure
- Brand — Identity, visual language, messaging
- Legal — IP model, licensing, privacy
- Decisions — Universe-level ADRs

### [Product Documentation →](./products/INDEX.md)
Individual product specifications, architecture, and planning.

**Current Products:**
- **Ferd** — Wave 1 web platform
- **Hamn** — Wave 2 evolved platform (planning)
- **iOS App** — Wave 2 native mobile (planned)
- **Android App** — Wave 2 native mobile (planned)
- **Game** — Wave 3+ immersive experience (planned)

### [Implementation Documentation →](./implementation/INDEX.md)
Current state tracking, development status, and session handover.

**What's inside:**
- Status tracking (KANBAN, in-progress, completed)
- Technical baselines (Claude Code generated)
- Handover docs (bridge between sessions)
- Testing artifacts (BDD scenarios, coverage)
- Changelog and migrations

---

## Documentation Principles

### Single Source of Truth
Every piece of information has one canonical location. Files reference each other rather than duplicating content.

### Progressive Disclosure
Start with INDEX files, drill down to detail only when needed. Optimized for both humans and AI agents.

### Status Visibility
Every requirement has visible status (📋 Planned, 🔄 In Progress, ✅ Done). No external tracker needed.

### Three-Tier Separation
- **Universe** → Product-agnostic (applies even if products change)
- **Products** → Self-contained (understand one product without others)
- **Implementation** → Current state (what exists NOW)

---

## Finding What You Need

### By Role

**Founder / Leadership**
- Start: [Universe Documentation →](./universe/INDEX.md)
- Focus: Vision, strategy, governance

**Product Manager**
- Start: [Product Documentation →](./products/INDEX.md)
- Focus: Requirements, roadmap, current phase

**Developer**
- Start: [Ferd Architecture →](./products/ferd/architecture/ANATOMY.md)
- Then: [Current State →](./implementation/ferd/status/KANBAN.md)

**Designer**
- Start: [Design System →](./products/ferd/architecture/DESIGN_SYSTEM.md)
- Also: [Brand Identity →](./universe/brand/BRAND_IDENTITY.md)

**Content Creator / Dreamineer**
- Start: [Worldbuilding →](./universe/worldbuilding/INDEX.md)
- Also: [Contribution Model →](./universe/strategy/CONTRIBUTION_ARCHITECTURE.md)

**AI Agent / Claude Code**
- Start: [Implementation Handover →](./implementation/ferd/handover/CONTEXT_FOR_AGENTS.md)
- Then: Load specific sections as needed

### By Question

**"What is FringeIsland trying to be?"**
→ [VISION.md](./universe/vision/VISION.md)

**"What products exist?"**
→ [PRODUCTS_AND_PLATFORM.md](./universe/strategy/PRODUCTS_AND_PLATFORM.md)

**"What's being built right now?"**
→ [PRIORITIES.md](./implementation/cross-product/PRIORITIES.md)

**"How does Ferd work technically?"**
→ [ANATOMY.md](./products/ferd/architecture/ANATOMY.md)

**"What features does Ferd have?"**
→ [REQUIREMENTS.md](./products/ferd/specification/REQUIREMENTS.md)

**"What's the plan for next quarter?"**
→ [ROADMAP.md](./products/ferd/planning/ROADMAP.md)

**"Why was this decision made?"**
→ Search ADRs in [Universe Decisions](./universe/decisions/INDEX.md) or [Ferd Decisions](./products/ferd/architecture/DECISIONS.md)

---

## Document Types

### Strategic Documents
- VISION.md — Aspirational north star
- MANIFESTO.md — Values and principles
- PRODUCTS_AND_PLATFORM.md — Ecosystem strategy

### Technical Documents
- ANATOMY.md — System architecture
- DATABASE_SCHEMA.md — Database design
- API_CONTRACT.md — API specifications

### Planning Documents
- ROADMAP.md — Phases and milestones
- REQUIREMENTS.md — Feature specifications
- BACKLOG.md — Planned work

### Tracking Documents
- KANBAN.md — Visual status board
- CURRENT_STATE.md — Implementation snapshot
- BASELINE.md — Technical baseline (generated)

### Session Documents
- SESSION-NN-{topic}.md — Planning session records
- NEXT_SESSION_PLAN.md — Bridge to next session

### Decision Documents
- ADR-{SCOPE}{N}-{slug}.md — Architecture decisions

---

## How to Navigate

### Every folder has an INDEX.md
Use INDEX files as navigation hubs. They provide:
- Overview of the folder's purpose
- Links to key files
- Links to child folders
- Quick links to related content

### Follow the breadcrumb trail
```
docs/old_INDEX.md
  → universe/INDEX.md
    → vision/INDEX.md
      → VISION.md
```

### Use cross-references
Files link to each other. Follow references to explore related content.

---

## For AI Agents

### Context Loading Pattern
1. Load relevant INDEX.md (overview)
2. Load CURRENT_PHASE.md or NEXT_SESSION_PLAN.md (focus)
3. Load specific sections as needed (requirements, architecture)

### Example: "Implement Journey Enrollment"
```
1. /docs/old_products/ferd/INDEX.md                         (~500 tokens)
2. /docs/old_products/ferd/planning/CURRENT_PHASE.md        (~800 tokens)
3. /docs/old_implementation/ferd/handover/NEXT_SESSION_PLAN.md (~1000 tokens)
4. /docs/old_products/ferd/specification/REQUIREMENTS.md#FR-002 (~400 tokens)
5. /docs/old_products/ferd/architecture/ANATOMY.md#L3       (~600 tokens)

Total: ~3,300 tokens (instead of 80,000+)
```

### Generated vs Human-Written
- **Generated** (by Claude Code): BASELINE.md, DATABASE_CURRENT.md, API_CURRENT.md
- **Human-written**: Everything else (vision, requirements, planning, architecture)

---

## Version History

**Current Version:** Post-restructuring (April 2026)

**Major Changes:**
- April 2026: Three-tier documentation architecture implemented
- March 2026: Universe/Products/Implementation separation introduced

See [CHANGELOG.md](../CHANGELOG.md) for detailed version history.

---

## Meta

**Maintained by:** Stefan Stefansson (Founder)

**Last updated:** 2026-04-04

**Status:** Living documentation — updated continuously as FringeIsland evolves

**Questions or suggestions?** 
- For documentation structure: Review and suggest improvements
- For content: Navigate to specific section and propose changes

---

*Welcome to FringeIsland. Let's build something meaningful together.*
