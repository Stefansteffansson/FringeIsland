# ADR-U023: Platform Core / Domain Services decomposition

**Status:** Accepted
**Date:** 2026-04-12
**Deciders:** Stefan
**Tags:** scope:platform-core · scope:domain-service · wave:ferd

> Supersedes [ADR-U001 — Layered anatomy framework](ADR-U001-layered-anatomy-framework.md)

---

## Context and problem statement

ADR-U001 established an eight-layer horizontal anatomy (L0–L7) as the primary architectural framework. This model served its purpose — it made dependency order explicit and prevented building features on incomplete foundations. However, as the ecosystem matured to include multiple products (The Hub, The Gimbal, The Game), studios (Journey Studio, Universe Studio, Arc Studio), and a design system, the flat L0-L7 model became insufficient. It couldn't cleanly express the distinction between foundational infrastructure, domain-specific services, and the contract boundaries between them. *"How should we decompose the platform architecture to support multiple products, studios, and 50+ contributors working in parallel?"*

## Decision drivers

- Must preserve the core principle from ADR-U001: dependency order is explicit, nothing builds on incomplete foundations
- Must support multiple products and studios connecting through stable contract boundaries
- Must make domain service boundaries clear enough for independent teams/contributors to own services
- Must distinguish between foundational infrastructure (changes rarely, high blast radius) and domain logic (changes often, scoped blast radius)
- Must accommodate the Extension System for Dreamineer plugins

## Considered options

- **Option A** — Keep L0-L7 layers, add product/studio overlays
- **Option B** — Platform Core / Domain Services / Products decomposition with two contract boundaries
- **Option C** — Full domain-driven design with bounded contexts

## Decision outcome

**Chosen option:** Option B — Platform Core / Domain Services / Products decomposition, because it preserves ADR-U001's dependency discipline while adding the structural clarity needed for multi-product, multi-contributor development.

### The decomposition

```
Products (Hub, Gimbal, Game) / Studios (Journey, Universe, Arc) / Design System
    │
    ├── Platform API (external contract boundary)
    │
Domain Services (7 services + Extension System)
    │   World Model · Narrative Engine · Experience Engine
    │   Content · Communication · Discovery · Intelligence
    │   + Extension System
    │
    ├── Internal API (internal contract boundary)
    │
Platform Core
    Infrastructure · Identity · Organisation · Governance
```

**Platform Core** — foundational capabilities that every service and product depends on. Changes here have the highest blast radius. Equivalent to the former L0-L2 + governance aspects of the permission model.

**Domain Services** — seven services that implement the platform's domain logic, plus an Extension System for Dreamineer plugins. Each service has clear boundaries, owns its data, and communicates through the Internal API. Equivalent to the former L3-L7, but with explicit service boundaries rather than monolithic layers.

**Two contract boundaries:**
- **Internal API** — contract between Platform Core and Domain Services. Stable, versioned, high trust.
- **Platform API** — contract between Domain Services and Products/Studios/Extensions. Public-facing, versioned, lower trust.

**Five cross-cutting verticals** remain unchanged: Administration, Privacy, Notifications, Observability, Transactions (see ADR-U002).

### Consequences

- **Positive:** Domain services can be developed and evolved independently. Contract boundaries make it safe for multiple contributors to work in parallel. The decomposition maps cleanly to the documentation hierarchy (`docs/platform/core/`, `docs/platform/domain/`).
- **Positive:** The principle from ADR-U001 — "what is the lowest incomplete layer?" — still applies within Platform Core and as a dependency check between Core → Domain Services → Products.
- **Negative:** More architectural concepts to understand than the simple L0-L7 numbering. New contributors need to learn the decomposition before contributing.
- **Neutral:** The seven domain services and their boundaries are proposed but not yet locked piece-by-piece. Individual service boundaries may shift as features are specified.

## Pros and cons of each option

### Option A — Keep L0-L7, add overlays
- Pros: No conceptual migration. Familiar.
- Cons: Doesn't express service boundaries. Doesn't distinguish contract surfaces. Doesn't map to multi-contributor ownership. The L3-L7 monolith becomes a bottleneck as the codebase grows.

### Option B — Platform Core / Domain Services / Products (chosen)
- Pros: Clean separation of stability zones (Core = slow change, Domain = medium change, Products = fast change). Two explicit contract boundaries. Maps to documentation and team structure. Preserves dependency discipline.
- Cons: More concepts. Seven domain services need individual specification.

### Option C — Full DDD with bounded contexts
- Pros: Most rigorous. Industry-standard for complex domains.
- Cons: Significant overhead for current team size. Premature — the domain model isn't mature enough to draw final context boundaries. Can adopt later within the Domain Services tier as the team grows.

## Links

- Supersedes: [ADR-U001 — Layered anatomy framework](ADR-U001-layered-anatomy-framework.md)
- Related: [ADR-U002 — Five cross-cutting verticals](ADR-U002-five-cross-cutting-verticals.md) (unchanged)
- Related: [ARCHITECTURE_ANATOMY_V1.md](../ARCHITECTURE_ANATOMY_V1.md) (archived L0-L7 reference)
- Related: [ECOSYSTEM_ANATOMY_V4.svg](../ECOSYSTEM_ANATOMY_V4.svg) (current visual)
- Related: [ADR-U009 — API-first, frontend-agnostic](ADR-U009-api-first-frontend-agnostic.md) (contract boundaries build on this)
