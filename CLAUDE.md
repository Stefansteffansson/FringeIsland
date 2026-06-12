# CLAUDE.md — AI Context for FringeIsland

**Last updated:** 2026-06-10 (reconciliation Session B).
**Reflects:** Model A (feature specs with embedded stories in the ecosystem tree; no PRDs); four skills as the execution layer; the reconciled entity model — products as equipment profiles with the Game as depth (ADR-U025), studios nested under Universe Studio with World Studio added (ADR-U026), the Shadow lifecycle (ADR-U027), governance by scope (ADR-U028) — and the canonical cosmology and roles cores under `docs/ecosystem/universe/`.

This file is the project's entry point for AI agents. It tells you WHERE to look and WHICH skill to load — it does not try to describe every mechanic.

---

## Project overview

FringeIsland is an edutainment platform for group-based personal development built around three questions: **Who am I? What do I want? How do I get there?** Users travel solo or in groups on structured journeys, guided by role-based experiences (Stewards lead, Guides facilitate, Participants take part, Observers watch).

**Stack:** Next.js 16.1 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL).
**Testing:** Jest (integration + unit) + Playwright (E2E).
**Repo:** https://github.com/Stefansteffansson/FringeIsland

The canonical source for current test counts, table counts, and wave progress is the codebase itself — migrations in `supabase/migrations/`, tests under `tests/`, and wave status in `docs/planning/waves/ferd.md`. Don't infer those numbers from this file.

---

## How to start any task

The way of working is not described in this file. It lives in one canonical document and four skills:

- **Way of working:** [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) — pipeline, cadence, DoR/DoD, tagging, how the process evolves.
- **Execution layer (skills):** [`.claude/skills/`](.claude/skills/) — the four skills below are where operational mechanics actually live. See PROCESS.md §6.5 for the canonical description of why skills are separated from PROCESS.md.

### The four skills — load the one that matches the work

| Skill | Load when the task is… | Path |
|-------|------------------------|------|
| `ecosystem-decomposition` | Decomposing vision → product → feature → story → task. Writing or updating a DESCRIPTION, SPECIFICATION, feature spec, or capability map. Scoping a wave. | [`.claude/skills/ecosystem-decomposition/SKILL.md`](.claude/skills/ecosystem-decomposition/SKILL.md) |
| `feature-development` | Implementing a feature at maturity 4-ready or higher. Generating tasks from stories. Writing code against a spec. Updating feature maturity to `6-done`. | [`.claude/skills/feature-development/SKILL.md`](.claude/skills/feature-development/SKILL.md) |
| `wave-planning` | Scoping, tracking, or completing a wave. Asking "what's left in Ferd?" Checking wave DoD. | [`.claude/skills/wave-planning/SKILL.md`](.claude/skills/wave-planning/SKILL.md) |
| `doc-health-check` | Cycle-boundary audit; on-demand after cross-cutting changes (renames, deletions, schema migrations, folder restructures). | [`.claude/skills/doc-health-check/SKILL.md`](.claude/skills/doc-health-check/SKILL.md) |

**The right skill is the first thing to load** after this file and AGENTS.md. Don't try to execute from PROCESS.md alone — PROCESS.md tells you *what* and *when*; the skill tells you *how*.

### Context loading order

1. This file — project orientation + navigation.
2. [`AGENTS.md`](AGENTS.md) — boundaries (always-do / ask-first / never-do).
3. [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) — way of working (skim once; return as needed).
4. The skill that matches the task (see table above).
5. The **tier-level `CLAUDE.md`** for where the work lives — [`docs/products/CLAUDE.md`](docs/products/CLAUDE.md), [`docs/platform/CLAUDE.md`](docs/platform/CLAUDE.md), [`docs/studios/CLAUDE.md`](docs/studios/CLAUDE.md), [`docs/design-system/CLAUDE.md`](docs/design-system/CLAUDE.md), or [`docs/verticals/CLAUDE.md`](docs/verticals/CLAUDE.md), plus any sub-tier and entity `CLAUDE.md` files in the cascade. See "Agent context cascade" below for the structure. Each tier file is a delta from this file: it contains the tier-specific rules, verticals obligations, and gotchas that only matter when working in that subtree.
6. The owner's `README.md` — the specific product / service / studio / vertical.
7. The specific feature spec (if one is already in play).
8. The task file (if assigned a specific TASK-*.md).

Load progressively. Never load all features at once — pull only what the task actually needs.

---

## Agent context cascade

Each `CLAUDE.md` in the cascade adds only the rules specific to its level. No level repeats what an upper level covers; no level holds rules that belong deeper. The cascade mirrors the architectural decomposition (root → tier → sub-tier where applicable → entity → sub-entity where divergence is sharp). Full mechanism in [`ecosystem-decomposition`](.claude/skills/ecosystem-decomposition/SKILL.md); the five-row content policy below is canonical.

| Level | Must contain | May contain | Must not contain |
|---|---|---|---|
| **Root** (`./CLAUDE.md`) | Universal rules; routing pointers (load order, doc map, skill table); the cascade policy below | Stack-wide "current state" descriptions where one entity dominates today | Entity-specific gotchas; tier-specific rules that have a downstream home |
| **Tier** (`docs/{tier}/CLAUDE.md`) | Rules applying to every entity in the tier; how the five verticals apply at this tier; cross-tier relationships | Current-only generalisations when only one entity is active | Entity-specific stack details, URLs, key formats, gotchas, single-entity configurations |
| **Sub-tier** (`docs/platform/{sub-tier}/CLAUDE.md`, only at platform) | Rules distinguishing the sub-tier from sibling sub-tiers (e.g., Core's stability-zone rules vs Domain's iteration-zone rules); contracts bounding the sub-tier | Rules shared by all entities under the sub-tier | Rules that apply equally to sibling sub-tiers (those are tier); single-entity rules |
| **Entity** (`docs/{tier}/{entity}/CLAUDE.md`) | Rules specific to this entity (gotchas, technical stack, tooling instantiations, single-entity configurations); load-order line | Sub-entity hints when divergence isn't sharp enough to warrant a sub-entity file | Tier-applicable rules (move up); sharply-diverging sub-entity rules (move down) |
| **Sub-entity** (`docs/{tier}/{entity}/{sub-entity}/CLAUDE.md`, opt-in by divergence) | Rules specific to this sub-entity that genuinely diverge from siblings or the parent (canonical case: `universe-studio`'s children `world-studio` / `arc-studio` / `journey-studio`, ADR-U026) | Toolchain or platform-runtime particulars | Rules already in the parent entity (they're inherited) |

The `doc-health-check` skill verifies cascade integrity at cycle boundaries (Section 9): presence, content categorisation, load-order pointer integrity. Soft flags drive review; hard fails are critical findings.

---

## Document map

Start at [`docs/README.md`](docs/README.md) for the full navigation map. Everything below links to entry points; deeper structure lives in each area's README.

| What | Where |
|------|-------|
| **Way of working (read first)** | [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) |
| **Ecosystem (what we're building)** | |
| Vision (constitutional) | [`docs/ecosystem/VISION.md`](docs/ecosystem/VISION.md) |
| Manifesto | [`docs/ecosystem/MANIFESTO.md`](docs/ecosystem/MANIFESTO.md) |
| Universe design (cosmology, beings, narrative, …) | [`docs/ecosystem/universe/`](docs/ecosystem/universe/) |
| Worlds topology (canonical core) | [`docs/ecosystem/universe/cosmology/`](docs/ecosystem/universe/cosmology/) |
| Role taxonomy (canonical core) | [`docs/ecosystem/universe/roles/`](docs/ecosystem/universe/roles/) |
| AI principles (constitutional) | [`docs/ecosystem/PRINCIPLES-AI.md`](docs/ecosystem/PRINCIPLES-AI.md) |
| Products & platform strategy | [`docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md`](docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md) |
| Open questions | [`docs/ecosystem/thinking/OPEN_QUESTIONS.md`](docs/ecosystem/thinking/OPEN_QUESTIONS.md) |
| **Products, platform, studios** | |
| The Hub (canvas surface — equipment profile, ADR-U025) | [`docs/products/hub/`](docs/products/hub/) |
| The Gimbal (senses surface — equipment profile, ADR-U025) | [`docs/products/gimbal/`](docs/products/gimbal/) |
| Platform Core (Infrastructure / Identity / Organisation / Governance) | [`docs/platform/core/`](docs/platform/core/) |
| Platform Domain Services (World Model, Narrative, Experience, …) | [`docs/platform/domain/`](docs/platform/domain/) |
| Studios (World, Arc, Journey under Universe Studio) | [`docs/studios/`](docs/studios/) |
| Design system | [`docs/design-system/`](docs/design-system/) |
| Cross-cutting verticals | [`docs/verticals/`](docs/verticals/) |
| **Architecture** | |
| Architecture anatomy (v1 reference) | [`docs/architecture/ARCHITECTURE_ANATOMY_V1.md`](docs/architecture/ARCHITECTURE_ANATOMY_V1.md) |
| Domain entities | [`docs/architecture/DOMAIN_ENTITIES.md`](docs/architecture/DOMAIN_ENTITIES.md) |
| ADRs (U001–U024, all migrated) | [`docs/architecture/decisions/`](docs/architecture/decisions/) |
| **Planning** | |
| Current wave (Ferd) | [`docs/planning/waves/ferd.md`](docs/planning/waves/ferd.md) |
| Ferd capability map | [`docs/planning/waves/FERD-CAPABILITY-MAP.md`](docs/planning/waves/FERD-CAPABILITY-MAP.md) |
| Active cycle (when one exists) | `docs/planning/cycles/cycle-current.md` |
| Tasks in motion | [`docs/planning/backlog/tasks/`](docs/planning/backlog/) |
| Retrospectives (weekly / cycle / wave / quarterly) | [`docs/planning/retrospectives/`](docs/planning/retrospectives/) |
| Session bridges | [`docs/planning/sessions/`](docs/planning/sessions/) |
| Reference snapshots | [`docs/planning/reference/`](docs/planning/reference/) |
| **Templates** (canonical shapes) | [`docs/templates/`](docs/templates/) |
| **Research reports** | [`docs/research/`](docs/research/) |

---

## Architecture (patterns, not code)

The codebase already reflects these patterns — this list is orientation for agents new to the repo, not a re-specification.

- **Two trees, never mixed:** `docs/ecosystem/`, `docs/products/`, `docs/platform/`, `docs/studios/`, `docs/design-system/`, `docs/verticals/`, `docs/architecture/` (the ecosystem tree — WHAT) versus `docs/planning/` (the planning tree — HOW). Features live in the ecosystem tree under their owner; tasks and cycles live in the planning tree.
- **Wave model (not phases):** Six named waves — **Ferd** → **Eid** → **Hamn** → **Heim** → **Brim** → **Urd**. Thematic focus buckets, not sequential gates (see ADR-U022 naming, ADR-U024 operational semantics).
- **Five verticals (obligations on every tier):** Administration · Privacy/GDPR · Notifications · Observability · Transactions (ADR-U002). Verticals are not services — they are cross-cutting obligations that every platform service, product, studio, and design-system component must fulfil. Every feature spec has a mandatory Vertical Impact section (see AGENTS.md). The tier-level `CLAUDE.md` files describe how each vertical applies to their tier specifically.
- **API-first (ADR-U009):** Build every feature as if every other client surface already exists (the Gimbal shell as much as the Hub shell): `Database → API route → Frontend component`. Never `Database → Frontend component directly`.
- **Auth:** Each product wires its own client-side auth context backed by Supabase Auth. Product-specific details live in the product's `CLAUDE.md` — for the Hub, see [`docs/products/hub/CLAUDE.md`](docs/products/hub/CLAUDE.md).
- **State:** Each product uses stack-appropriate primitives for local and shared state; cross-component coordination uses the product's canonical mechanism. For the Hub, see [`docs/products/hub/CLAUDE.md`](docs/products/hub/CLAUDE.md).

---

## Development workflow

TDD is mandatory. The day-to-day mechanics — how to read a feature spec, generate tasks from stories, write failing tests, implement, and mark maturity `6-done` — live in the [`feature-development`](.claude/skills/feature-development/SKILL.md) skill. Load it when you're about to build.

---

## Critical gotchas

Tier-specific gotchas live with the tier they apply to — see [`docs/platform/CLAUDE.md`](docs/platform/CLAUDE.md) for platform-tier (Postgres, RLS, migrations) and [`docs/products/hub/CLAUDE.md`](docs/products/hub/CLAUDE.md) for Hub-stack.

---

**This file is a routing document — WHERE to look, not HOW to code.** Code patterns live in the codebase. Operational mechanics live in the skills. Strategic rhythm lives in PROCESS.md.

*Tooling note: the context-mode plugin's routing rules live in `CLAUDE.local.md` (private, not checked in) and are injected per-session by its hooks. This mention of context-mode is deliberate — the plugin's launcher appends its rules block to any project `CLAUDE.md` that doesn't contain the string "context-mode"; this line keeps this tracked file stable.*
