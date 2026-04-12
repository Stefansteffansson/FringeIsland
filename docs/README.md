# FringeIsland Documentation

**Navigation map for the docs/ directory.**

---

## Structure

```
docs/
├── README.md                              ← you are here
│
│   ── Tree 1: Ecosystem — What We're Building ──
│
├── ecosystem/                             ← vision, values, strategy, explorations
│   ├── VISION.md                          ← constitutional — the north star
│   ├── MANIFESTO.md                       ← constitutional — founding principles
│   ├── strategy/                          ← stable directional documents
│   └── thinking/                          ← open questions, explorations, legacy mining
│
├── products/                              ← product surfaces FIMs touch
│   ├── hub/                               ← The Hub (web) — active in Ferd
│   ├── gimbal/                            ← The Gimbal (mobile) — planned
│   └── game/                              ← The Game — scope TBD
│
├── platform/                              ← shared infrastructure
│   ├── core/                              ← Platform Core (Infrastructure, Identity, Organisation, Governance)
│   ├── domain/                            ← Domain Services (7 services + Extension System)
│   └── extensions/                        ← Extension System contracts
│
├── studios/                               ← creator tools for Dreamineers
│   ├── journey-studio/                    ← journey authoring + lifecycle
│   ├── universe-studio/                   ← world-building
│   └── arc-studio/                        ← seasons + episodes
│
├── design-system/                         ← shared UI components, tokens, patterns
│
├── verticals/                             ← cross-cutting concerns
│   ├── (admin, notifications, observability, privacy, transactions)
│
├── architecture/                          ← structural models + binding decisions
│   ├── ARCHITECTURE_ANATOMY_V1.md         ← L0-L7 anatomy (archived reference)
│   ├── DOMAIN_ENTITIES.md                 ← core domain model
│   ├── ECOSYSTEM_ANATOMY_V3.svg           ← current anatomy diagram
│   ├── DOMAIN_SERVICE_DEPENDENCIES.svg    ← dependency flow
│   └── decisions/                         ← ADRs (24 — U001-U024)
│
├── research/                              ← all research reports (domain + methodology)
│
│   ── Tree 2: Planning — How We're Building It ──
│
├── planning/
│   ├── PROCESS.md                         ← canonical way of working
│   ├── DEFERRAL_PROTOCOL.md               ← cross-wave deferrals (under review)
│   ├── PLANNING_PROTOCOL.md               ← research-first sequence (under review)
│   ├── waves/                             ← strategic focus periods (Ferd → Urd)
│   ├── cycles/                            ← Shape Up betting cycles
│   ├── backlog/                           ← work items + ephemeral tasks
│   ├── sessions/                          ← session bridge documents
│   ├── retrospectives/                    ← cycle + wave retrospectives
│   └── reference/                         ← point-in-time snapshots (gap analyses, etc.)
│
│   ── Shared ──
│
├── templates/                             ← file templates for features, tasks, waves, ADRs
│
│   ── Legacy (source of truth until migrated) ──
│
├── old_universe/                          ← decommissioned — delete pending (ADRs migrated)
├── old_products/                          ← not yet migrated
├── old_implementation/                    ← not yet migrated
└── old_INDEX.md                           ← legacy navigation
```

---

## Directory Purpose Guide

| Directory | What belongs here | What does NOT belong here |
|-----------|-------------------|--------------------------|
| `ecosystem/` | Strategic, philosophical, cross-product — "what is FringeIsland?" | Technical architecture, service specs, planning artifacts |
| `ecosystem/strategy/` | Stable directional documents — product family, contributor model | Open questions, exploratory thinking (→ ecosystem/thinking/) |
| `ecosystem/thinking/` | Open questions, explorations, legacy content being mined | Stable strategy (→ ecosystem/strategy/), research (→ research/) |
| `architecture/` | Structural models, binding decisions (ADRs), dependency diagrams | Service descriptions, feature specs, planning snapshots |
| `platform/` | Service descriptions, feature specs, API contracts | Binding decisions (→ architecture), ecosystem strategy (→ ecosystem) |
| `planning/reference/` | Point-in-time snapshots that inform planning cycles | Permanent structural models (→ architecture), ecosystem strategy (→ ecosystem) |
| `research/` | Research reports and studies, regardless of topic | Strategy documents (→ ecosystem), decisions (→ architecture) |

---

## Progressive Context Loading (for agents)

1. Read `CLAUDE.md` (root) — project overview + navigation
2. Read this file (`docs/README.md`) — documentation map
3. Read the specific product/service `README.md` — area overview
4. Read the feature spec — full spec for the task at hand
5. Read the task file — specific implementation work

Never load all features at once — load only what you're working on.

---

## Key Entry Points

- **Ecosystem vision:** `ecosystem/VISION.md`
- **Products & platform strategy:** `ecosystem/strategy/PRODUCTS_AND_PLATFORM.md`
- **Hub description:** `products/hub/DESCRIPTION.md`
- **Way of working:** `planning/PROCESS.md`
- **Current wave:** `planning/waves/ferd.md`
- **Ferd capability map:** `planning/waves/FERD-CAPABILITY-MAP.md`
- **Architecture decisions:** `architecture/decisions/`
- **Domain entity model:** `architecture/DOMAIN_ENTITIES.md`

---

## Legacy Documentation (old_*/)

The `old_products/` and `old_implementation/` directories contain the previous documentation structure. These remain the source of truth for content not yet migrated.

The `old_universe/` directory is fully decommissioned (April 2026). All 22 ADRs have been migrated to `architecture/decisions/`. The directory and its contents can be deleted.

Do NOT delete `old_products/` or `old_implementation/` — they contain authoritative content awaiting migration.
