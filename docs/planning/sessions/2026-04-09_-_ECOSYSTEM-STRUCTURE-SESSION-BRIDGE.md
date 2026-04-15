# FringeIsland — Ecosystem Structure Session Bridge

**Date:** 2026-04-09
**Session type:** Ecosystem structure design + way of working
**Status:** 10 decisions LOCKED — ready for Claude Code scaffolding execution
**Participants:** Stefan (Product Owner) + Claude (Architectural Advisor)

---

## Session summary

This session redesigned the FringeIsland documentation and project management structure from the ground up. Starting from a research phase (two extended reports on multi-product ecosystem management and AI-native development workflows), we established a clear separation between "what we're building" (ecosystem) and "how we're building it" (planning), defined feature specs as first-class entities owned by products/services/studios, and designed a multi-agent-ready workflow with progressive context loading.

The session also resolved the sprint vs. Kanban question: we use Shape Up-style betting cycles (2-3 weeks + cooldown) for strategic planning, with continuous Kanban execution inside cycles. WIP limits apply at the review stage, not the generation stage.

---

## Research produced (two reports)

### Report 1: Structuring a Multi-Product Ecosystem for AI-Native Development
- Progressive disclosure through README cascades
- Six-level work decomposition (Vision → Product → Feature → Story → Task)
- AGENTS.md + CLAUDE.md as the agent documentation standard
- Wave-level Definition of Done frameworks
- Markdown-in-git project management with YAML frontmatter
- Backlog.md tool analysis (5,300+ stars, MCP integration)

### Report 2: AI Agents Broke the Sprint — What Replaces It
- Why traditional sprints crack under AI speed
- Two-layer model: strategic cadence + continuous Kanban execution
- Shape Up appetite concept gains relevance when estimation is impossible
- WIP limits must move to the review bottleneck
- Decoupled cadences for planning, building, and reflection
- Evidence from Anthropic, Shopify, Cursor, and practitioner reports

---

## 10 locked decisions

| # | Decision | Detail |
|---|----------|--------|
| 1 | **Two-tree separation** | Ecosystem (what) vs. planning (how) — physically separate in file structure |
| 2 | **Features belong to products/services/studios** | Not to planning, not to waves. Each owner gets a `features/` directory |
| 3 | **Waves are planning instruments** | They reference features across the ecosystem, they don't contain them |
| 4 | **Feature spec format** | Shape Up pitch + BDD stories + YAML frontmatter. Prefix IDs: H=Hub, G=Gimbal, P=Platform Core, D=Domain, JD=Journey Designer, UD=Universe Designer, AD=Arc Designer, DS=Design System, V=Verticals |
| 5 | **Task file format** | Individual .md files with YAML frontmatter in `planning/backlog/tasks/`. Lifecycle: active → done → survives cooldown/retro → deleted after retrospective committed |
| 6 | **AGENTS.md at root** | Cross-tool agent instructions (universal, works with Claude Code, Cursor, Copilot, etc.) |
| 7 | **Subdirectory CLAUDE.md** | Progressive context loading + tier-specific constraints. Platform = strict, Products = flexible |
| 8 | **Three new skills** | ecosystem-decomposition, feature-development, wave-planning in `.claude/skills/` |
| 9 | **Three new templates** | feature-spec.md, task.md, wave-spec.md added to `docs/templates/` |
| 10 | **PRDs folder removed** | `docs/planning/prds/` replaced by `features/` directories under owning product/service/studio |

---

## Key conceptual clarifications

### Two trees, not one hierarchy

```
docs/
├── [TREE 1: WHAT — permanent, structural]
│   ecosystem/, products/, platform/, studios/, design-system/, verticals/, architecture/
│
├── [TREE 2: HOW — temporal, operational]
│   planning/ (waves, cycles, backlog, sessions, retrospectives)
│
├── [SHARED — serves both trees]
│   research/, templates/
```

### Features belong to their owner, waves point to them

- Feature file: `docs/products/hub/features/FEAT-H001-authentication.md` (owned by Hub)
- Wave file: `docs/planning/waves/ferd.md` (links to FEAT-H001 and other features across products/services)
- Task file: `docs/planning/backlog/tasks/TASK-001.md` (points back to FEAT-H001)

### Cycles are not sprints

Cycles are Shape Up betting periods (2-3 weeks + 1 week cooldown). Strategic planning happens at cycle boundaries. Execution inside cycles is continuous Kanban flow. Agents pull tasks and work in parallel. WIP limits apply at the human review stage.

---

## PROCESS.md updates needed (DO NOT EXECUTE YET — future session)

These updates are noted for a future session. Do NOT modify PROCESS.md during scaffolding.

1. Redefine cycles — not sprints, not pure Kanban. Shape Up betting cycles with continuous Kanban execution inside.
2. Add Shape Up mechanisms — appetite, betting table, cooldown, circuit breaker clearly described.
3. WIP limits at review stage — not generation stage. Reflect multi-agent reality.
4. Task lifecycle — created → done → survives cooldown/retro → deleted after retrospective committed.

---

## Claude Code instructions — scaffolding restructure

### Scope

Restructure the `docs/` scaffolding to match the locked decisions. This means:
- Adding new directories and files
- Removing one directory (`prds/`)
- Adding root-level `AGENTS.md`
- NOT populating content (feature specs, wave files, etc. — just create the structure)
- NOT modifying PROCESS.md
- NOT writing the skills (ecosystem-decomposition, feature-development, wave-planning)

### ⛔ STOP MARKER — DO NOT GO BEYOND SCAFFOLDING

After completing the scaffolding restructure below, STOP. Do not populate content files, do not write skills, do not migrate old_*/ files. Report the result and wait for Stefan to confirm before any further work.

### Step-by-step instructions

#### 1. Add `features/` directories (with README.md) under each product/service/studio

Create `features/` subdirectory with a README.md in each of these locations:
- `docs/products/hub/features/README.md`
- `docs/products/gimbal/features/README.md`
- `docs/products/game/features/README.md`
- `docs/platform/core/features/README.md`
- `docs/platform/domain/features/README.md`
- `docs/studios/journey-designer/features/README.md`
- `docs/studios/universe-designer/features/README.md`
- `docs/studios/arc-designer/features/README.md`

Each README.md should contain:
```markdown
# Features — {Owner Name}

Feature specifications for {owner description}. Each feature uses the Shape Up pitch format with BDD stories.

**Template:** `../../templates/feature-spec.md` (adjust relative path as needed)
**Naming:** `FEAT-{PREFIX}{NNN}-{slug}.md` (e.g., FEAT-H001-authentication.md)

## Feature index

_No features specified yet._
```

#### 2. Add `waves/` directory under planning

Create `docs/planning/waves/` with:

**README.md:**
```markdown
# Waves — Strategic Focus Periods

Waves are thematic focus buckets that define what the ecosystem prioritises during a period. They are NOT sequential gates — work from any wave can be in any maturity state at any time. Waves overlap naturally.

Each wave file defines: thematic focus, features in scope (linking to feature specs in the ecosystem tree), and wave-level Definition of Done.

**Template:** `../../templates/wave-spec.md`

## Waves

| Wave | Name | Meaning | Status |
|------|------|---------|--------|
| 1 | Ferd | Voyage / departure — foundation | Active |
| 2 | Eid | Narrow passage — design tools + narrative | Planned |
| 3 | Hamn | Harbour — mobile + polish | Planned |
| 4 | Heim | Home — community + world | Planned |
| 5 | Brim | Horizon — discovery + growth | Planned |
| 6 | Urd | The deep well — AI + depth | Planned |
```

Create placeholder wave files (content to be populated later):
- `docs/planning/waves/ferd.md` — just a header: `# Wave 1: Ferd — Voyage / Departure` + `_Content to be populated._`
- `docs/planning/waves/eid.md` — same pattern
- `docs/planning/waves/hamn.md`
- `docs/planning/waves/heim.md`
- `docs/planning/waves/brim.md`
- `docs/planning/waves/urd.md`

#### 3. Add `tasks/` directory under backlog

Create `docs/planning/backlog/tasks/` with:

**README.md:**
```markdown
# Tasks

Individual task files with YAML frontmatter. Each task is a standalone work instruction assigned to a person or agent.

**Template:** `../../../templates/task.md`
**Naming:** `TASK-{NNN}.md` (e.g., TASK-001.md)
**Lifecycle:** created → in_progress → done → survives cooldown/retro → deleted after retrospective committed

_No active tasks._
```

#### 4. Add `retrospectives/` directory under planning

Create `docs/planning/retrospectives/` with:

**README.md:**
```markdown
# Retrospectives

Cycle retrospectives and wave retrospectives. The permanent learning artifacts — tasks get deleted after the retro is committed, but the retro itself stays forever.

**Template:** `../../templates/retrospective.md`
**Naming:** `retro-YYYY-MM-DD.md` for cycle retros, `retro-wave-{name}.md` for wave retros

_No retrospectives yet._
```

#### 5. Remove `docs/planning/prds/`

Delete the directory `docs/planning/prds/` and its README.md. Features specs under their owning product/service/studio replace PRDs.

#### 6. Add three new templates

Create these files in `docs/templates/`:

**feature-spec.md:**
```markdown
# FEAT-{PREFIX}{NNN}: {Title}

---
id: FEAT-{PREFIX}{NNN}
title: {Feature title}
product: {hub | gimbal | game}
service: {core | world-model | narrative-engine | experience-engine | content | communication | discovery | intelligence | extensions}
studio: {journey-designer | universe-designer | arc-designer}
wave: {ferd | eid | hamn | heim | brim | urd}
maturity: {0-raw | 1-concept | 2-explored | 3-specified | 4-ready | 5-in-cycle | 6-done}
---

## Problem
What pain or gap does this address? Who feels it?

## Appetite
How much time is this worth? (Fixed time, variable scope.)

## Solution sketch
Rough approach — breadboards, fat-marker sketches, not wireframes.

## Rabbit holes
Known complexities to avoid or timebox.

## No-gos
What this feature explicitly does NOT include (v1 boundaries).

## Stories

### STORY-1: {Story title}
As a {role}, I want {capability}, so that {benefit}.

**Acceptance criteria:**
- Given {context}, when {action}, then {outcome}
- Given {context}, when {action}, then {outcome}

### STORY-2: {Story title}
...

## Platform dependencies
Which platform core or domain service capabilities does this require?

## Cross-product impact
Does this affect sibling products? If yes, how?
```

**task.md:**
```markdown
# {Task title}

---
id: TASK-{NNN}
title: {Task title}
status: {todo | in_progress | review | done | blocked}
assigned_to: {person or agent name}
priority: {low | medium | high | critical}
feature: {FEAT-ID}
product: {hub | gimbal | game | platform-core | platform-domain | journey-designer | universe-designer | arc-designer | design-system}
tier: {products/hub | platform/core | platform/domain | studios/journey-designer | ...}
wave: {ferd | eid | hamn | heim | brim | urd}
depends_on: [{TASK-IDs}]
estimated_hours: {number}
---

## Description
What needs to be done, concretely.

## Acceptance criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## Technical notes
Implementation hints, relevant files, patterns to follow.

## Verification
How to verify this is done (manual steps or test commands).
```

**wave-spec.md:**
```markdown
# Wave {N}: {Name} — {Meaning}

---
status: {planned | active | cooldown | completed}
started: {date or TBD}
target_completion: {date or TBD}
---

## Theme
What is this wave about? One paragraph.

## Features in scope

### Products
- [ ] [FEAT-{ID}: {title}](link-to-feature-spec) — {product name}

### Platform
- [ ] [FEAT-{ID}: {title}](link-to-feature-spec) — {platform component}

### Studios
- [ ] [FEAT-{ID}: {title}](link-to-feature-spec) — {studio name}

## Wave completion criteria (Definition of Done)

### Feature completeness
- [ ] All listed features have maturity = 6-done
- [ ] End-to-end user journey verified: {describe the critical path}

### Quality gates
- [ ] All tests pass (unit, integration, e2e)
- [ ] No critical/high security vulnerabilities
- [ ] RLS policies applied to all new tables

### Documentation
- [ ] All ADRs written for decisions made during this wave
- [ ] Platform API contracts documented for all shipped endpoints
- [ ] Product specifications updated to reflect shipped features

### Retrospective
- [ ] Wave retrospective completed (`../retrospectives/retro-wave-{name}.md`)
- [ ] Ecosystem roadmap updated
```

#### 7. Create root AGENTS.md

Create `AGENTS.md` at project root:

```markdown
# AGENTS.md — FringeIsland

## Project
FringeIsland is an edutainment platform built around three questions:
Who am I? What do I want? How do I get there?

## Stack
Next.js 16.1 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL

## Build & test
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx supabase test db` — database/RLS tests

## Project structure
- `docs/` — all documentation, split into ecosystem (what) and planning (how)
- `docs/products/hub/` — The Hub (web platform) specs and features
- `docs/platform/` — shared platform infrastructure
- `docs/planning/` — waves, cycles, backlog, sessions
- `app/`, `components/`, `lib/` — application source code
- `supabase/migrations/` — database migrations

## Documentation navigation
Start at `docs/README.md` for the full map. Key entry points:
- Ecosystem vision: `docs/ecosystem/VISION.md`
- Products: `docs/products/README.md`
- Platform: `docs/platform/README.md`
- Current wave: `docs/planning/waves/ferd.md`
- Way of working: `docs/planning/PROCESS.md`

## Conventions
- Use `proxy.ts` not `middleware.ts` (Next.js 16)
- `users.full_name` not `display_name`
- Use ConfirmModal, never browser alerts
- Conventional commits: `feat(hub): ...`, `fix(platform): ...`
- Feature IDs: FEAT-H=Hub, G=Gimbal, P=Platform, D=Domain, JD/UD/AD=Studios

## Boundaries

### Always do
- Run lint and type-check before committing
- Check the relevant feature spec in the ecosystem tree before implementing
- Follow API-first principle (ADR-U009)
- Update CHANGELOG.md for user-visible changes
- Read the product/service CLAUDE.md before touching that area

### Ask first
- Database schema changes (new tables, columns, RLS)
- Changes to `docs/platform/core/` code
- Adding new npm dependencies
- Modifying or superseding ADRs

### Never do
- Delete migration files
- Modify production environment variables
- Change API contracts without updating dependent feature specs
- Skip RLS policies on new tables
- Populate content in ecosystem tree without a locked feature spec
```

#### 8. Add subdirectory CLAUDE.md files

Create `docs/products/CLAUDE.md`:
```markdown
# Products — Agent Context

## Scope
You are working on a product surface (The Hub, The Gimbal, or The Game). Products consume the Platform API — they never access the database directly.

## Constraints
- Follow API-first principle — all data access through platform API routes
- Check `features/` for the relevant feature spec before implementing
- UI changes must be mobile-responsive
- Use the Design System components where available

## Context loading
1. Read this file
2. Read the specific product's README.md (e.g., `hub/README.md`)
3. Read the feature spec you're working on
4. Load only what you need — don't read all features at once
```

Create `docs/platform/CLAUDE.md`:
```markdown
# Platform — Agent Context

## Scope
You are working on shared platform infrastructure. Changes here affect ALL products and services. Extra caution required.

## Constraints — STRICT
- Every new table MUST have RLS policies
- Every API change MUST be documented in the relevant service spec
- Database schema changes require explicit human approval
- Changes to Platform Core (core/) are rare and heavily reviewed
- Changes to Domain Services (domain/) require dependency impact check
- Check `docs/platform/domain/DEPENDENCIES.md` before modifying service boundaries

## Context loading
1. Read this file
2. Read `core/README.md` or `domain/README.md` depending on scope
3. Read the specific feature spec
4. Check ADRs in `docs/architecture/decisions/` for relevant prior decisions
```

#### 9. Create skill directory placeholders (DO NOT write skill content)

Create these empty placeholder files:
- `.claude/skills/ecosystem-decomposition/SKILL.md` — content: `# Ecosystem Decomposition Skill\n\n_To be written in next session._`
- `.claude/skills/feature-development/SKILL.md` — content: `# Feature Development Skill\n\n_To be written in next session._`
- `.claude/skills/wave-planning/SKILL.md` — content: `# Wave Planning Skill\n\n_To be written in next session._`

#### 10. Update docs/README.md

Replace the current `docs/README.md` with an updated navigation map reflecting the two-tree structure. The README should:
- Explain the two-tree concept (ecosystem vs. planning)
- List all directories with one-line descriptions
- Show the progressive disclosure path for agents
- Link to PROCESS.md for way of working
- Note that `old_*/` directories are legacy files awaiting migration

#### 11. Update root CLAUDE.md

Add the following section to the existing root CLAUDE.md (append, don't replace):

```markdown
## Documentation structure (updated 2026-04-09)
- `docs/` has two trees: ecosystem (what we're building) and planning (how we're building it)
- Features live under their product: `docs/products/hub/features/FEAT-H001-*.md`
- Tasks live in backlog: `docs/planning/backlog/tasks/TASK-NNN.md`
- Waves define strategic focus: `docs/planning/waves/ferd.md`
- Start at `docs/README.md` for navigation

## Skills (updated 2026-04-09)
- `ecosystem-decomposition` — decompose vision → product → feature → story → task
- `feature-development` — take a feature spec and implement it
- `wave-planning` — define wave scope and verify completion

## Context loading order
1. Read CLAUDE.md (this file) — project overview + nav
2. Read docs/README.md — documentation map
3. Read the specific product/service README.md — area overview
4. Read the feature spec — full spec for the task
5. Read the task file — specific implementation work
Never load all features at once — load only what you're working on.
```

#### 12. Replace .gitkeep files with README.md files

For all product/studio directories that currently only have `.gitkeep`:
- `docs/products/hub/.gitkeep` → replace with `docs/products/hub/README.md`
- `docs/products/gimbal/.gitkeep` → replace with `docs/products/gimbal/README.md` (keep ios/ and android/ subdirs)
- `docs/products/gimbal/ios/.gitkeep` → replace with README.md
- `docs/products/gimbal/android/.gitkeep` → replace with README.md
- `docs/products/game/.gitkeep` → replace with `docs/products/game/README.md`
- `docs/studios/journey-designer/.gitkeep` → replace with README.md
- `docs/studios/universe-designer/.gitkeep` → replace with README.md
- `docs/studios/arc-designer/.gitkeep` → replace with README.md

Each README.md should contain a brief description of that product/studio and placeholder sections for DESCRIPTION.md, SPECIFICATION.md, ROADMAP.md, and features/. Use the product descriptions from `docs/products/README.md` as source content for the product README files.

---

## What NOT to do

- ❌ Do NOT populate feature specs (that's step B, after skill is written)
- ❌ Do NOT write skill content (that's step C, next session)
- ❌ Do NOT modify PROCESS.md (future session)
- ❌ Do NOT migrate old_*/ files (future session)
- ❌ Do NOT populate wave files with features (needs feature specs first)
- ❌ Do NOT populate product DESCRIPTION.md, SPECIFICATION.md, or ROADMAP.md files

---

## Companion documents

- **ECOSYSTEM_STRUCTURE_PROPOSAL.md** — full proposed structure with rationale (produced this session, available in docs/TMP/ or as download)
- **Research Report 1:** Structuring a Multi-Product Ecosystem for AI-Native Development
- **Research Report 2:** AI Agents Broke the Sprint — What Replaces It
- **Updated ECOSYSTEM_ANATOMY_V2.svg** — corrected product names (The Hub, The Gimbal, The Game)

---

## For the next Claude session

1. Stefan confirms CC scaffolding is correct
2. Write the **ecosystem-decomposition skill** (C) — the methodology for decomposing vision → product → feature → story → task
3. HOLD before populating Hub/Ferd content (B) — skill needs to be written and reviewed first
4. After skill is locked: populate Hub/Ferd features using the skill as the methodology
5. After population: delta check against old_*/ files to identify what's already built

---

**Session complete. 10 decisions locked. Scaffolding instructions ready for Claude Code.**
