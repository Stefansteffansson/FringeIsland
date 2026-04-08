# Platform

The shared foundation that all products consume. Two tiers separated by an Internal API contract:

- **Core** — domain-agnostic infrastructure (Identity, Organisation, Governance, Infrastructure)
- **Domain** — FringeIsland-specific services (DS-1..DS-7) and the Extension System

## Layout
- `core/` — Platform Core specification + roadmap
- `domain/` — Domain Services (one file per service) + overview spec + roadmap
- `extensions/` — Extension System contracts and patterns
- `DEPENDENCIES.md` — cross-product dependency table
