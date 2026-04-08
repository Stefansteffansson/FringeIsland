# Ferd — Web Platform Documentation

Ferd is the Wave 1 web platform for FringeIsland — the departure point where the journey begins.

---

## What is Ferd?

**Ferd** (from Swedish "färd" — journey, voyage) is the foundational web platform that proves:
1. The builder can build (technical foundation is solid)
2. The journey metaphor is real (groups can travel together)

**Current Status:**
- **Version:** v0.2.7
- **Phase:** 1.4 (Journey System)
- **Completion:** 70% of Phase 1
- **Active Development:** Yes

**Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL

---

## What's in This Section

### [Specification →](./specification/INDEX.md)
**What Ferd is and what it does**

Defines the product, requirements, user personas, scope, and success metrics.

**Key files:**
- [PRODUCT_SPEC.md](./specification/PRODUCT_SPEC.md) — Core product definition
- [REQUIREMENTS.md](./specification/REQUIREMENTS.md) — Functional + non-functional requirements
- [USER_PERSONAS.md](./specification/USER_PERSONAS.md) — Target users and needs
- [SCOPE.md](./specification/SCOPE.md) — In scope / out of scope boundaries

### [Architecture →](./architecture/INDEX.md)
**How Ferd is built and why**

Technical architecture, design decisions, database schema, API contracts, authorization model.

**Key files:**
- [ANATOMY.md](./architecture/ANATOMY.md) — Layered architecture model (L0-L7)
- [DECISIONS.md](./architecture/DECISIONS.md) — Product-specific ADRs (ADR-F00X)
- [DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md) — Tables, relationships, rationale
- [API_CONTRACT.md](./architecture/API_CONTRACT.md) — Platform API ring specification
- [DESIGN_SYSTEM.md](./architecture/DESIGN_SYSTEM.md) — Visual language, components

### [Planning →](./planning/INDEX.md)
**What's being built and when**

Roadmap, current phase focus, backlog, deferred decisions.

**Key files:**
- [ROADMAP.md](./planning/ROADMAP.md) — Phases, milestones, releases
- [CURRENT_PHASE.md](./planning/CURRENT_PHASE.md) — Active development focus (Phase 1.4)
- [BACKLOG.md](./planning/BACKLOG.md) — Planned features (prioritized)
- [DEFERRED.md](./planning/DEFERRED.md) — Explicitly postponed features

### [Development →](./development/INDEX.md)
**How we develop Ferd**

Workflow, BDD/TDD practices, coding standards, contribution guide.

**Key files:**
- [WORKFLOW.md](./development/WORKFLOW.md) — Vision→Spec→BDD→TDD→Baseline flow
- [BDD_APPROACH.md](./development/BDD_APPROACH.md) — Behavior-driven development
- [TDD_APPROACH.md](./development/TDD_APPROACH.md) — Test-driven development
- [CONTRIBUTION_GUIDE.md](./development/CONTRIBUTION_GUIDE.md) — How to contribute

### [Sessions →](./sessions/INDEX.md)
**Planning session records**

Historical record of planning sessions, journey designer explorations, architectural decisions.

**Recent sessions:**
- [2026-03-29 — Session 03: World-Building](./sessions/2026-03-29-SESSION-03-world-building.md)
- [2026-03-22 — Session 02: Journey Designer](./sessions/2026-03-22-SESSION-02-journey-designer.md)
- [2026-03-15 — Session 01: Journey Designer](./sessions/2026-03-15-SESSION-01-journey-designer.md)

---

## Current Development Focus

**Phase 1.4: Journey System**

**In Progress:**
- Journey catalog and browsing
- Journey enrollment flow
- Step type framework

**See:** [CURRENT_PHASE.md](./planning/CURRENT_PHASE.md) for details

**Status:** [KANBAN →](../../implementation/ferd/status/KANBAN.md)

---

## Quick Navigation

### For New Developers
**Start here:**
1. [Product Spec](./specification/PRODUCT_SPEC.md) — Understand what Ferd is
2. [Architecture Anatomy](./architecture/ANATOMY.md) — Understand how it's built
3. [Current Phase](./planning/CURRENT_PHASE.md) — Understand current focus
4. [Contribution Guide](./development/CONTRIBUTION_GUIDE.md) — Learn how to contribute

### For Product Work
- [Requirements](./specification/REQUIREMENTS.md) — All features with status
- [Roadmap](./planning/ROADMAP.md) — Phases and milestones
- [Backlog](./planning/BACKLOG.md) — What's coming next

### For Architecture Work
- [Anatomy](./architecture/ANATOMY.md) — System structure
- [Decisions](./architecture/DECISIONS.md) — Why things are built this way
- [Database Schema](./architecture/DATABASE_SCHEMA.md) — Data model

### For Implementation
- [Current State](../../implementation/ferd/status/KANBAN.md) — What's done/in-progress
- [Baseline](../../implementation/ferd/baseline/BASELINE.md) — Technical snapshot
- [Next Session](../../implementation/ferd/handover/NEXT_SESSION_PLAN.md) — What's next

---

## Ferd vs The Universe

### What's Ferd-Specific
These decisions/docs apply **only to Ferd**, not to other products:

**Examples:**
- Using Supabase for backend (Hamn might use different backend)
- Using Next.js 16.1 (iOS app uses Swift)
- Eight-layer architecture model (other products have different architectures)
- Specific feature requirements (FR-001, FR-002, etc.)

**Location:** This folder (`/docs/products/ferd/`)

### What's Universe-Level
These apply to **all products** including Ferd:

**Examples:**
- Three Questions framework (Who/What/How)
- FringeIsland brand identity
- Open source licensing model
- Governance structure (Foundation/Council/Community)

**Location:** [Universe docs](../../universe/INDEX.md)

---

## Ferd's Evolution

### Wave 1 — Ferd (Current)
Web platform proving the foundation. Groups, journeys, profiles, Stewards.

**Status:** In development (Phase 1.4)

### Wave 2 — Hamn
Ferd evolves into Hamn — full FringeIsland member experience with avatar, garden, narrative.

**Status:** Planning only (see [/docs/products/hamn/](../hamn/INDEX.md))

### Wave 3+
Native apps, AR layer, game, physical products extend the ecosystem.

**See:** [Universe Product Strategy](../../universe/strategy/PRODUCTS_AND_PLATFORM.md)

---

## Related Documentation

### Universe Context
- [FringeIsland Vision](../../universe/vision/VISION.md)
- [Product Family Strategy](../../universe/strategy/PRODUCTS_AND_PLATFORM.md)
- [Three Questions Framework](../../universe/vision/THREE_QUESTIONS.md)

### Other Products
- [Hamn (Wave 2)](../hamn/INDEX.md)
- [iOS App (Wave 2)](../ios-app/INDEX.md)
- [All Products](../INDEX.md)

### Implementation Tracking
- [Ferd Status (KANBAN)](../../implementation/ferd/status/KANBAN.md)
- [Ferd Baseline](../../implementation/ferd/baseline/BASELINE.md)
- [Cross-Product Status](../../implementation/cross-product/CURRENT_STATE.md)

---

## Contributing to Ferd

**Before contributing:**
1. Read [PRODUCT_SPEC.md](./specification/PRODUCT_SPEC.md)
2. Review [REQUIREMENTS.md](./specification/REQUIREMENTS.md) 
3. Check [CURRENT_PHASE.md](./planning/CURRENT_PHASE.md)
4. Follow [CONTRIBUTION_GUIDE.md](./development/CONTRIBUTION_GUIDE.md)

**Development workflow:**
Vision → Requirements → BDD Scenarios → Implementation → TDD → Baseline Update

**See:** [WORKFLOW.md](./development/WORKFLOW.md)

---

## Meta

**Product Owner:** Stefan Stefansson

**Current Version:** v0.2.7

**Repository:** `Stefansteffansson/FringeIsland`

**Tech Stack:** Next.js 16.1 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL

**Last Updated:** 2026-04-04

---

*Ferd is the beginning. The foundation that everything else builds on.*
