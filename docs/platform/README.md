# Platform

The shared foundation that all products and studios consume. Two tiers separated by an **Internal API** contract; the platform as a whole is exposed to products and studios via the **Platform API**.

```
              ┌────────────────────────────────────────┐
              │     Products + Studios (consumers)     │
              └──────────────────┬─────────────────────┘
                       Platform API (contract)
              ┌──────────────────┴─────────────────────┐
              │           Platform Domain (PD)         │
              │   World Model · Narrative Engine ·     │
              │   Experience Engine · Content ·        │
              │   Communication · Discovery ·          │
              │   Intelligence · Extension System      │
              └──────────────────┬─────────────────────┘
                      Internal API (contract)
              ┌──────────────────┴─────────────────────┐
              │            Platform Core (PC)          │
              │   Infrastructure · Identity ·          │
              │   Organisation · Governance            │
              └────────────────────────────────────────┘
```

## Two-tier structure

- **Platform Core (PC)** — domain-agnostic foundation. Four areas: Infrastructure (PC-1: Supabase, PostgreSQL, RLS, Storage, feature flags), Identity (PC-2: Auth, profiles, sessions, Journal), Organisation (PC-3: Groups, memberships, roles, permissions), Governance (PC-4: DeusEx, audit, moderation, platform rules).
- **Platform Domain (PD)** — FringeIsland-specific services. Seven services (DS-1 World Model, DS-2 Narrative Engine, DS-3 Experience Engine, DS-4 Content, DS-5 Communication, DS-6 Discovery, DS-7 Intelligence) plus the Extension System.

## Boundaries

- **Internal API** — between Platform Core and Platform Domain. Domain services consume Core via this contract; Core never depends upward on Domain.
- **Platform API** — between Platform (as a whole) and Products + Studios. Products and studios never bypass it to talk to the database directly. See ADR-U009 (API-first frontend-agnostic).

## Layout

- [`core/`](./core/) — Platform Core (PC-1 to PC-4)
- [`domain/`](./domain/) — Platform Domain Services (DS-1 to DS-7) + overview spec + roadmap
- [`extensions/`](./extensions/) — Extension System contracts and patterns
- [`CLAUDE.md`](./CLAUDE.md) — agent context for platform work
- `DEPENDENCIES.md` — cross-product dependency table _(to be written)_
