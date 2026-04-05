# FringeIsland Documentation

**Version:** 0.2.37 | **Updated:** April 2026

Three-tier documentation architecture: Universe (shared foundations) > Products (product-specific) > Implementation (live code state).

---

## Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| See active sprint + what's next | [SPRINT.md](../SPRINT.md) |
| See current state & blockers | [PROJECT_STATUS.md](../PROJECT_STATUS.md) |
| Understand WHY we're building this | [universe/vision/VISION.md](universe/vision/VISION.md) |
| See WHAT we're building (Ferd) | [products/ferd/specification/PRODUCT_SPEC.md](products/ferd/specification/PRODUCT_SPEC.md) |
| Understand the architecture | [universe/architecture/ARCHITECTURE_ANATOMY.md](universe/architecture/ARCHITECTURE_ANATOMY.md) |
| See architecture decisions (ADRs) | [universe/decisions/](universe/decisions/) (22 universe) + [products/ferd/architecture/decisions/](products/ferd/architecture/decisions/) (1 Ferd) |
| See the roadmap | [products/ferd/planning/ROADMAP.md](products/ferd/planning/ROADMAP.md) |
| Work on database | [implementation/shared/SCHEMA_OVERVIEW.md](implementation/shared/SCHEMA_OVERVIEW.md) |
| Build a feature (TDD) | [products/ferd/development/WORKFLOW.md](products/ferd/development/WORKFLOW.md) |
| See feature docs | [products/ferd/development/features/](products/ferd/development/features/) |
| See behavior specs | [products/ferd/development/specs/](products/ferd/development/specs/) |
| Start a work session | [products/ferd/development/BOOT_UP.md](products/ferd/development/BOOT_UP.md) |
| End a work session | [products/ferd/development/CLOSE_DOWN.md](products/ferd/development/CLOSE_DOWN.md) |
| Set up the project | [implementation/ferd/baseline/INSTALLATION.md](implementation/ferd/baseline/INSTALLATION.md) |
| See what changed | [CHANGELOG.md](../CHANGELOG.md) |
| Understand technical patterns | [CLAUDE.md](../CLAUDE.md) |

---

## Tier 1: Universe — Shared Foundations

Product-agnostic vision, strategy, architecture, research, and binding decisions.

| Folder | Purpose |
|--------|---------|
| [universe/vision/](universe/vision/) | Core vision, manifesto, locked decisions |
| [universe/strategy/](universe/strategy/) | Multi-product wave model, contribution architecture |
| [universe/architecture/](universe/architecture/) | L0-L7 layered anatomy, domain entities |
| [universe/research/](universe/research/) | Human flourishing, Theory U, adult development |
| [universe/decisions/](universe/decisions/) | 22 universe-level ADRs |

---

## Tier 2: Products — Product-Specific

Each product has its own specification, architecture, planning, sessions, and development docs.

### Ferd (Wave 1 — 95% complete)

| Folder | Purpose |
|--------|---------|
| [products/ferd/specification/](products/ferd/specification/) | Product spec, requirements (97), activity catalog |
| [products/ferd/architecture/](products/ferd/architecture/) | Lifecycle flows, design reviews, Ferd ADRs |
| [products/ferd/planning/](products/ferd/planning/) | Roadmap, deferred decisions, lifecycle decisions |
| [products/ferd/sessions/](products/ferd/sessions/) | Session logs (vision, design, sprint, journey designer) |
| [products/ferd/development/](products/ferd/development/) | Workflows, agents, behavior specs, feature docs |

---

## Tier 3: Implementation — Live Code State

Shared infrastructure and product-specific implementation details.

| Folder | Purpose |
|--------|---------|
| [implementation/shared/](implementation/shared/) | Database schema, RLS, auth, migrations |
| [implementation/ferd/](implementation/ferd/) | Baseline, status tracking, testing |

---

## Learning Paths

### New Developer Onboarding
1. [PROJECT_STATUS.md](../PROJECT_STATUS.md) — Current state
2. [universe/vision/VISION.md](universe/vision/VISION.md) — Why FringeIsland exists
3. [products/ferd/specification/PRODUCT_SPEC.md](products/ferd/specification/PRODUCT_SPEC.md) — What we're building
4. [universe/architecture/ARCHITECTURE_ANATOMY.md](universe/architecture/ARCHITECTURE_ANATOMY.md) — Architecture
5. [implementation/shared/SCHEMA_OVERVIEW.md](implementation/shared/SCHEMA_OVERVIEW.md) — Data model
6. [products/ferd/development/WORKFLOW.md](products/ferd/development/WORKFLOW.md) — How we develop (TDD)
7. [implementation/ferd/baseline/INSTALLATION.md](implementation/ferd/baseline/INSTALLATION.md) — Setup

### New AI Agent Onboarding
1. [CLAUDE.md](../CLAUDE.md) — Technical patterns (auto-loaded)
2. [products/ferd/development/BOOT_UP.md](products/ferd/development/BOOT_UP.md) — Session start
3. [products/ferd/development/agents/contexts/](products/ferd/development/agents/contexts/) — Your agent playbook
4. [products/ferd/development/WORKFLOW.md](products/ferd/development/WORKFLOW.md) — TDD workflow
5. [products/ferd/development/specs/](products/ferd/development/specs/) — Behavior specs
6. [products/ferd/development/features/](products/ferd/development/features/) — Feature docs

---

**This is the documentation hub. For current state: [PROJECT_STATUS.md](../PROJECT_STATUS.md). For AI routing: [CLAUDE.md](../CLAUDE.md).**
