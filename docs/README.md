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
├── ecosystem/                             ← vision, values, strategy, universe, explorations
│   ├── VISION.md                          ← constitutional — the north star
│   ├── MANIFESTO.md                       ← constitutional — founding principles
│   ├── PRINCIPLES-AI.md                   ← constitutional — how FringeIsland creates with AI
│   ├── universe/                          ← what the world is and how it works
│   │   ├── cosmology/                     ← the worlds topology (canonical core)
│   │   ├── personal-growth/               ← red thread, engagement spectrum, privacy model
│   │   ├── beings/                        ← Whisp, NPCs (canonical core)
│   │   ├── roles/                         ← the canonical role taxonomy (the spine)
│   │   ├── narrative/                     ← seasons, episodes, journeys
│   │   ├── community/                     ← community dynamics, roles in practice
│   │   └── kickstarter/                   ← the founding moment: Season Zero
│   ├── strategy/                          ← stable directional documents
│   └── thinking/                          ← open questions, explorations, legacy mining
│       ├── OPEN_QUESTIONS.md               ← ecosystem-level open questions
│
├── products/                              ← equipment profiles of the one experience (ADR-U025)
│   ├── hub/                               ← The Hub — the canvas surface (active in Ferd)
│   └── gimbal/                            ← The Gimbal — the senses surface
│
├── platform/                              ← shared infrastructure
│   ├── core/                              ← Platform Core (Infrastructure, Identity, Organisation, Governance)
│   ├── domain/                            ← Domain Services (7 services + Extension System)
│   └── extensions/                        ← Extension System contracts
│
├── studios/                               ← role-gated authoring mode (ADR-U026)
│   └── universe-studio/                   ← parent: umbrella + binding frame
│       ├── world-studio/                  ← the world: terrain + culture
│       ├── arc-studio/                    ← stories: seasons + episodes
│       └── journey-studio/                ← journeys: alone / pairs / group
│
├── design-system/                         ← shared UI components, tokens, patterns
│
├── verticals/                             ← cross-cutting concerns
│   ├── (admin, notifications, observability, privacy, transactions)
│
├── architecture/                          ← structural models + binding decisions
│   ├── ARCHITECTURE_ANATOMY_V1.md         ← L0-L7 anatomy (archived reference)
│   ├── DOMAIN_ENTITIES.md                 ← core domain model
│   ├── ECOSYSTEM_ANATOMY_V5.svg           ← current anatomy diagram
│   ├── DOMAIN_SERVICE_DEPENDENCIES.svg    ← dependency flow
│   └── decisions/                         ← ADRs (28 — U001-U028)
│
├── research/                              ← all research reports (domain + methodology)
│
│   ── Tree 2: Planning — How We're Building It ──
│
├── planning/
│   ├── PROCESS.md                         ← canonical way of working
│   ├── waves/                             ← strategic focus periods (Ferd → Urd)
│   ├── cycles/                            ← Shape Up betting cycles
│   ├── backlog/                           ← ephemeral TASK-*.md files for the active cycle
│   ├── sessions/                          ← session bridge documents
│   ├── retrospectives/                    ← weekly / cycle / wave / quarterly audit retros
│   └── reference/                         ← point-in-time snapshots (gap analyses, etc.)
│
│   ── Shared ──
│
└── templates/                             ← file templates for features, tasks, waves, ADRs
```

---

## Directory Purpose Guide

| Directory | What belongs here | What does NOT belong here |
|-----------|-------------------|--------------------------|
| `ecosystem/` | Strategic, philosophical, cross-product — "what is FringeIsland?" | Technical architecture, service specs, planning artifacts |
| `ecosystem/universe/` | Universe design — cosmology, developmental mechanics, narrative, beings, community | Technical service specs (→ platform/), open questions (→ thinking/) |
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
- **Universe design:** `ecosystem/universe/`
- **Products & platform strategy:** `ecosystem/strategy/PRODUCTS_AND_PLATFORM.md`
- **Hub description:** `products/hub/DESCRIPTION.md`
- **Way of working:** `planning/PROCESS.md`
- **Current wave:** `planning/waves/ferd.md`
- **Ferd capability map:** `planning/waves/FERD-CAPABILITY-MAP.md`
- **Architecture decisions:** `architecture/decisions/`
- **Domain entity model:** `architecture/DOMAIN_ENTITIES.md`

---

## Legacy Documentation

The `old_universe/`, `old_products/`, and `old_implementation/` directories no longer exist. Their content has been migrated into the active trees above:

- `old_universe/` — deleted April 2026. All 24 ADRs (U001–U024) migrated to `architecture/decisions/`; universe design content migrated to `ecosystem/universe/`.
- `old_products/` — deleted April 2026 (legacy-migration session). Product scope, requirements, roadmap, and feature docs migrated into `products/hub/` and associated planning/backlog/reference files.
- `old_implementation/` — deleted April 2026. Implementation state is now read directly from the codebase (migrations, schema, code) rather than from snapshot files; reference snapshots that still matter live under `planning/reference/`.

Historical references to `old_products/` or `old_implementation/` paths in current docs are drift — flag them or fix them. The `doc-health-check` skill (Sections 3.5 and 3.6) catches this automatically at cycle boundaries.
