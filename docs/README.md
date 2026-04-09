# FringeIsland Documentation

**Navigation map for the docs/ directory.**

---

## Two-Tree Structure

Documentation is organized into two conceptual trees:

### Tree 1: Ecosystem — What We're Building (permanent, structural)

| Directory | Purpose |
|-----------|---------|
| `ecosystem/` | Ecosystem-level vision, identity, and cross-product narrative |
| `products/` | Product surfaces: The Hub (web), The Gimbal (mobile), The Game |
| `platform/` | Shared infrastructure: Platform Core + Domain Services |
| `studios/` | Creator tools: Journey Designer, Universe Designer, Arc Designer |
| `design-system/` | Shared UI components, tokens, patterns |
| `verticals/` | Cross-cutting concerns: admin, notifications, observability, privacy, transactions |
| `architecture/` | ADRs, architecture decisions, system-wide patterns |

### Tree 2: Planning — How We're Building It (temporal, operational)

| Directory | Purpose |
|-----------|---------|
| `planning/waves/` | Strategic focus periods (Ferd → Eid → Hamn → Heim → Brim → Urd) |
| `planning/cycles/` | Shape Up betting cycles (2-3 weeks + cooldown) |
| `planning/backlog/` | Work items and task files |
| `planning/sessions/` | Design and decision session records |
| `planning/retrospectives/` | Cycle and wave retrospectives |
| `planning/PROCESS.md` | Canonical way of working |

### Shared — Serves Both Trees

| Directory | Purpose |
|-----------|---------|
| `research/` | Research reports, studies, references |
| `templates/` | File templates for features, tasks, waves, ADRs, etc. |

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

- **Way of working:** `planning/PROCESS.md`
- **Current wave:** `planning/waves/ferd.md`
- **Products overview:** `products/README.md`
- **Platform overview:** `platform/README.md`
- **Studios overview:** `studios/README.md`
- **Templates:** `templates/README.md`
- **Architecture decisions:** `architecture/decisions/`

---

## Legacy Documentation (old_*/)

The `old_universe/`, `old_products/`, and `old_implementation/` directories contain the previous documentation structure. These are the **current source of truth** for active Ferd development until content migration (Phase 4) is complete.

- **Boot-up workflow:** `old_products/ferd/development/BOOT_UP.md`
- **Close-down workflow:** `old_products/ferd/development/CLOSE_DOWN.md`
- **Sprint tracker:** see root `SPRINT.md`
- **Full legacy navigation:** `old_INDEX.md`

Do NOT delete old_*/ directories — they contain authoritative content awaiting migration.
