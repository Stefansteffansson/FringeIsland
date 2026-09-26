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
├── ecosystem/                             ← vision, values, strategy, the way of working
│   ├── VISION.md                          ← constitutional — the north star
│   ├── MANIFESTO.md                       ← constitutional — founding principles
│   ├── PRINCIPLES-AI.md                   ← constitutional — how FringeIsland creates with AI
│   └── strategy/                          ← stable directional documents
│
├── fringeisland-thinking/                 ← the universe, the discovery work, the research — one flat folder, the filename carries the register
│   ├── README.md                          ← the index: how to read a filename, one table per register
│   ├── bible--*                           ← the Universe Bible: the single truth about the world — nine chapters, one file
│   ├── discovery--*                       ← the universe-discovery sessions and where discovery stands (one file)
│   ├── research--*                        ← reports: growth, worlds, method, engineering
│   ├── record--*                          ← design records
│   ├── questions--*                       ← the open-questions (CQ) register
│   └── quotes--*                          ← quotes kept for later
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
│   ├── ARCHITECTURE_ANATOMY.md            ← living anatomy overview (canon wins)
│   ├── ARCHITECTURE_ANATOMY_V1.md         ← L0-L7 anatomy (archived reference)
│   ├── DOMAIN_ENTITIES.md                 ← core domain model
│   ├── ECOSYSTEM_ANATOMY_V6.svg           ← current anatomy diagram
│   ├── DOMAIN_SERVICE_DEPENDENCIES.svg    ← dependency flow
│   └── decisions/                         ← ADRs (the index README is the canonical list)
│
├── novel/                                 ← fiction layer — thriller set in the universe (not a canon source)
│   ├── STORY-BIBLE.md                     ← premise, cast, canon-conformance register, chapter outline
│   ├── the-seam.pdf                       ← a short story set in the universe (2026-09-11; non-canon)
│   └── chapters/                          ← one file per chapter
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
├── templates/                             ← file templates for features, tasks, waves, ADRs
│
├── dashboard/                             ← generated status overview (`npm run dashboard`, then `dashboard:serve`)
│
└── tooling/                               ← notes on the repo's supporting tooling
```

---

## Directory Purpose Guide

| Directory | What belongs here | What does NOT belong here |
|-----------|-------------------|--------------------------|
| `ecosystem/` | Strategic, philosophical, cross-product — "what is FringeIsland?" | Technical architecture, service specs, planning artifacts |
| `fringeisland-thinking/` | The Universe Bible (`bible--`, one file), the discovery work (`discovery--`, one file), research reports (`research--`), design records (`record--`), the open-questions register (`questions--`), the quotes collection (`quotes--`) — one flat folder, the filename prefix is the register | Constitutional docs and strategy (→ ecosystem/), technical service specs (→ platform/), decisions (→ architecture/) |
| `ecosystem/strategy/` | Stable directional documents — product family, contributor model | Open questions, exploratory thinking (→ fringeisland-thinking/) |
| `architecture/` | Structural models, binding decisions (ADRs), dependency diagrams | Service descriptions, feature specs, planning snapshots |
| `platform/` | Service descriptions, feature specs, API contracts | Binding decisions (→ architecture), ecosystem strategy (→ ecosystem) |
| `planning/reference/` | Point-in-time snapshots that inform planning cycles | Permanent structural models (→ architecture), ecosystem strategy (→ ecosystem) |
| `novel/` | Fiction layer — narrative work set in the universe; canon-conformant but never canon-defining | Universe truth (→ fringeisland-thinking/ bible-- + discovery--), specs, planning artifacts |

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
- **Universe design:** `fringeisland-thinking/bible--fringeisland-universe.md` (index: `fringeisland-thinking/README.md`)
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

- `old_universe/` — deleted April 2026. All 24 ADRs (U001–U024) migrated to `architecture/decisions/`; universe design content migrated to `ecosystem/universe/` (flattened into `fringeisland-thinking/canon--*` on 2026-09-15; replaced by the one Universe Bible on 2026-09-26).
- `old_products/` — deleted April 2026 (legacy-migration session). Product scope, requirements, roadmap, and feature docs migrated into `products/hub/` and associated planning/backlog/reference files.
- `old_implementation/` — deleted April 2026. Implementation state is now read directly from the codebase (migrations, schema, code) rather than from snapshot files; reference snapshots that still matter live under `planning/reference/`.

Historical references to `old_products/` or `old_implementation/` paths in current docs are drift — flag them or fix them. The `doc-health-check` skill (Sections 3.5 and 3.6) catches this automatically at cycle boundaries.
