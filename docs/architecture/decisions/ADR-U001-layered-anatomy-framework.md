# ADR-U001: Layered anatomy as the architectural framework

**Status:** Superseded by ADR-U023
**Date:** 2026-03 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

FringeIsland is a complex platform with many interdependent capabilities. Development was experiencing a recurring problem: implementing features that required rebuilding foundational elements that hadn't been designed to support them. Features were discovered to have incomplete foundations mid-implementation. The question was how to organise the architectural thinking to prevent this.

## Decision

Adopt a layered anatomy model as the primary architectural framework. Eight horizontal layers (L0–L7), each depending on all layers below it. Nothing at a higher layer can exist without everything below it being solid. The anatomy is the primary reference for all development work.

## Why this approach

The layered model makes dependency order explicit and visible. It transforms the question "what should I build next?" into "what is the lowest incomplete layer?" It prevents the pattern of building features on foundations that weren't designed to support them. It also makes it obvious when a feature crosses layer boundaries in a way that signals an architectural concern.

## Alternatives considered

- *Feature-based organisation* — organise around features (auth, groups, journeys, forums). Rejected because it obscures cross-feature dependencies and makes build order ambiguous.
- *Domain-driven design with bounded contexts* — a valid approach but adds significant complexity that isn't warranted at FringeIsland's current scale and with a solo developer.
- *No explicit framework* — continue building without a formal model. Rejected because the recurring rebuild problem was caused precisely by this approach.

## Consequences

- All development work must identify which layers a feature touches before implementation begins
- L3 Experience engine is identified as the linchpin — the most critical layer to specify correctly before building above it
- The anatomy becomes a living document that evolves as the platform grows

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Superseded by: [ADR-U023 — Platform Core / Domain Services decomposition](ADR-U023-platform-core-domain-services-decomposition.md)
- Related: [ARCHITECTURE_ANATOMY_V1.md](../ARCHITECTURE_ANATOMY_V1.md) (archived reference of the L0-L7 model)
