# FringeIsland Documentation Index

**Version:** 0.2.36 | **Updated:** March 2026

Master navigation for all FringeIsland documentation. For current project state, see [PROJECT_STATUS.md](../PROJECT_STATUS.md).

---

## 🎯 Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| See active sprint + what's next | [SPRINT.md](../SPRINT.md) |
| See current state & blockers | [PROJECT_STATUS.md](../PROJECT_STATUS.md) |
| Understand WHY we're building this | [VISION.md](VISION.md) |
| See WHAT we're building | [planning/PRODUCT_SPEC.md](planning/PRODUCT_SPEC.md) |
| Understand technical patterns | [CLAUDE.md](../CLAUDE.md) |
| Set up the project | [implementation/INSTALLATION.md](implementation/INSTALLATION.md) |
| See what changed | [CHANGELOG.md](../CHANGELOG.md) |
| Understand the architecture | [architecture/ARCHITECTURE_OVERVIEW.md](architecture/ARCHITECTURE_OVERVIEW.md) |
| See architecture baseline (live-validated) | [architecture/ARCHITECTURE_BASELINE.md](architecture/ARCHITECTURE_BASELINE.md) |
| Work on database | [database/schema-overview.md](database/schema-overview.md) + [agents/contexts/database-agent.md](agents/contexts/database-agent.md) |
| Build a feature (TDD) | [workflows/feature-development.md](workflows/feature-development.md) + [features/](features/) + [specs/behaviors/](specs/behaviors/) |
| See the roadmap | [planning/ROADMAP.md](planning/ROADMAP.md) |
| See lifecycle sprint decisions | [planning/lifecycle-roadmap-decisions.md](planning/lifecycle-roadmap-decisions.md) |
| Start a work session | [workflows/boot-up.md](workflows/boot-up.md) |
| End a work session | [workflows/close-down.md](workflows/close-down.md) |

---

## 📚 Documentation Structure

### 🎯 Vision & Planning (`/docs/`)

- **[VISION.md](VISION.md)** — Vision, intent, and core beliefs
- **[planning/PRODUCT_SPEC.md](planning/PRODUCT_SPEC.md)** — Product specification for v1.0
- **[planning/ROADMAP.md](planning/ROADMAP.md)** — Development phases and timeline
- **[SPRINT.md](../SPRINT.md)** — Active sprint tracker, TDD phase, next sprint backlog
- **[planning/DEFERRED_DECISIONS.md](planning/DEFERRED_DECISIONS.md)** — What we're NOT building yet
- **[planning/lifecycle-roadmap-decisions.md](planning/lifecycle-roadmap-decisions.md)** — Lifecycle sprint structure and decisions

### 🏗️ Architecture (`/docs/architecture/`)

- **[ARCHITECTURE_OVERVIEW.md](architecture/ARCHITECTURE_OVERVIEW.md)** — System design and patterns
- **[ARCHITECTURE_BASELINE.md](architecture/ARCHITECTURE_BASELINE.md)** — 6-phase analysis, live-validated against Supabase
- **[AUTHORIZATION.md](architecture/AUTHORIZATION.md)** — Authorization model and RLS policies
- **[DOMAIN_ENTITIES.md](architecture/DOMAIN_ENTITIES.md)** — Domain model and entity relationships

### 🗄️ Database (`/docs/database/`)

- **[schema-overview.md](database/schema-overview.md)** — Complete database schema reference
- **[migrations-log.md](database/migrations-log.md)** — Migration history with notes
- **[rls-policies.md](database/rls-policies.md)** — Row Level Security documentation

### 🔧 Implementation (`/docs/implementation/`)

- **[INSTALLATION.md](implementation/INSTALLATION.md)** — Project setup and installation
- **[AUTH_IMPLEMENTATION.md](implementation/AUTH_IMPLEMENTATION.md)** — Authentication system details

### ✨ Features (`/docs/features/`)

- **[implemented/](features/implemented/)** — Completed features with documentation
- **[in-progress/](features/in-progress/)** — Features currently under development
- **[planned/](features/planned/)** — Future features and specifications

### 📋 Specifications (`/docs/specs/`)

- **[behaviors/](specs/behaviors/)** — 105 documented behaviors (rules & constraints)
- See: [feature-development.md](workflows/feature-development.md) for how behavior specs fit into the TDD workflow

### 📝 Planning & History (`/docs/planning/`)

- **[PRODUCT_SPEC.md](planning/PRODUCT_SPEC.md)** — Product specification
- **[ROADMAP.md](planning/ROADMAP.md)** — Feature roadmap and development phases
- **[DEFERRED_DECISIONS.md](planning/DEFERRED_DECISIONS.md)** — What we're NOT building yet
- **[sessions/](planning/sessions/)** — Session bridges and development notes
- **[archive/](planning/archive/)** — Historical/meta documentation

### 🤖 Agent System (`/docs/agents/`)

Two-tier agent structure with continuous learning (7 agents).

**Tier 1 — Domain Agents:**
- **[database-agent.md](agents/contexts/database-agent.md)** — Schema, migrations, RLS, triggers
- **[ui-agent.md](agents/contexts/ui-agent.md)** — Components, styling, UX patterns
- **[integration-agent.md](agents/contexts/integration-agent.md)** — Data flow, queries, state management
- **[test-agent.md](agents/contexts/test-agent.md)** — Behavior specs, test writing, coverage

**Tier 2 — Process Agents:**
- **[architect-agent.md](agents/contexts/architect-agent.md)** — System design, technical decisions
- **[qa-agent.md](agents/contexts/qa-agent.md)** — Code review, security audit, pattern compliance
- **[sprint-agent.md](agents/contexts/sprint-agent.md)** — Planning, retrospectives, knowledge curation

**Overview:** [agents/README.md](agents/README.md) | **Journals:** [agents/learnings/](agents/learnings/)

### 🔄 Workflows (`/docs/workflows/`)

- **[boot-up.md](workflows/boot-up.md)** — How to start a work session
- **[close-down.md](workflows/close-down.md)** — How to end a session and create handoffs
- **[feature-development.md](workflows/feature-development.md)** — TDD feature workflow (8 phases, 0-7)

---

## 🎓 Learning Paths

### New Developer Onboarding
1. [PROJECT_STATUS.md](../PROJECT_STATUS.md) — Current state
2. [VISION.md](VISION.md) — Why FringeIsland exists
3. [planning/PRODUCT_SPEC.md](planning/PRODUCT_SPEC.md) — What we're building
4. [README.md](../README.md) — Project overview and setup
5. [architecture/ARCHITECTURE_OVERVIEW.md](architecture/ARCHITECTURE_OVERVIEW.md) — System design
6. [database/schema-overview.md](database/schema-overview.md) — Data model
7. [workflows/feature-development.md](workflows/feature-development.md) — How we develop (TDD)
8. [implementation/INSTALLATION.md](implementation/INSTALLATION.md) — Setup environment
9. [planning/ROADMAP.md](planning/ROADMAP.md) — What's next

### New AI Agent Onboarding
1. [PROJECT_STATUS.md](../PROJECT_STATUS.md) — Current state
2. [VISION.md](VISION.md) — Why we're building this
3. [CLAUDE.md](../CLAUDE.md) — Technical patterns (auto-loaded)
4. [workflows/feature-development.md](workflows/feature-development.md) — Development process
5. [agents/contexts/\[your-domain\]-agent.md](agents/contexts/) — Your focused context
6. Relevant feature docs from [features/implemented/](features/implemented/)
7. Behavior specs from [specs/behaviors/](specs/behaviors/)

### Understanding a Specific Feature
1. Check [features/implemented/\[feature-name\].md](features/implemented/) for overview
2. Read [CLAUDE.md](../CLAUDE.md) for implementation patterns
3. Check [database/schema-overview.md](database/schema-overview.md) for data model
4. See [CHANGELOG.md](../CHANGELOG.md) for when it was added

---

**This index is the doc navigation hub — it tells you WHERE to look. For current state, see [PROJECT_STATUS.md](../PROJECT_STATUS.md). For AI routing, see [CLAUDE.md](../CLAUDE.md).**
