# FringeIsland Documentation Index

**Version:** 0.2.10
**Last Updated:** February 4, 2026

**Quick Start:** New to the project? Start with `PROJECT_STATUS.md` in the root directory.

---

## 📖 How to Use This Index

This is your **master navigation** for all FringeIsland documentation. Documents are organized by purpose to help you find what you need quickly.

**For AI Assistants:** Use the agent-specific contexts in `/docs/agents/contexts/` to load only relevant information for your task.

---

## 🎯 Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| Get project overview | `../PROJECT_STATUS.md` |
| Understand current technical patterns | `../CLAUDE.md` |
| Set up the project | `implementation/INSTALLATION.md` |
| See what changed | `../CHANGELOG.md` |
| Understand the architecture | `architecture/ARCHITECTURE.md` |
| Work on database | `database/schema-overview.md` + `agents/contexts/database-agent.md` |
| Build a feature | `features/` + `agents/contexts/feature-agent.md` |
| See the roadmap | `planning/ROADMAP.md` |
| Start a work session | `workflows/boot-up.md` |
| End a work session | `workflows/close-down.md` |

---

## 📚 Documentation Structure

### 🏗️ Architecture (`/docs/architecture/`)
System design, patterns, and technical decisions

- **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** - Overall system architecture and design patterns
- **[AUTHORIZATION.md](architecture/AUTHORIZATION.md)** - Authorization model and RLS policies
- **[DOMAIN_ENTITIES.md](architecture/DOMAIN_ENTITIES.md)** - Domain model and entity relationships
- **[decisions/](architecture/decisions/)** - Architecture Decision Records (ADRs)

### 🗄️ Database (`/docs/database/`)
Database schema, migrations, and policies

- **[schema-overview.md](database/schema-overview.md)** - Complete database schema reference
- **[migrations-log.md](database/migrations-log.md)** - Migration history with notes
- **[rls-policies.md](database/rls-policies.md)** - Row Level Security documentation

### 🔧 Implementation (`/docs/implementation/`)
Setup guides and technical implementation details

- **[INSTALLATION.md](implementation/INSTALLATION.md)** - Project setup and installation
- **[AUTH_IMPLEMENTATION.md](implementation/AUTH_IMPLEMENTATION.md)** - Authentication system details

### ✨ Features (`/docs/features/`)
Feature specifications, use cases, and test plans

- **[implemented/](features/implemented/)** - Completed features with documentation
- **[in-progress/](features/in-progress/)** - Features currently under development
- **[planned/](features/planned/)** - Future features and specifications

### 📋 Planning (`/docs/planning/`)
Project planning, roadmaps, and session notes

- **[ROADMAP.md](planning/ROADMAP.md)** - Feature roadmap and development phases
- **[DEFERRED_DECISIONS.md](planning/DEFERRED_DECISIONS.md)** - Decisions postponed to future phases
- **[journey-system/](planning/journey-system/)** - Journey system design documents
- **[sessions/](planning/sessions/)** - Session bridges and development notes

### 🤖 Agent Contexts (`/docs/agents/`)
Specialized contexts for AI agents working on specific domains

- **[contexts/database-agent.md](agents/contexts/database-agent.md)** - Database work context
- **[contexts/ui-agent.md](agents/contexts/ui-agent.md)** - UI/component work context
- **[contexts/feature-agent.md](agents/contexts/feature-agent.md)** - Feature development context
- **[README.md](agents/README.md)** - How to use agent contexts

### 🔄 Workflows (`/docs/workflows/`)
Standard workflows for common development tasks

- **[boot-up.md](workflows/boot-up.md)** - How to start a work session
- **[close-down.md](workflows/close-down.md)** - How to end a session and create handoffs

---

## 🎓 Learning Paths

### New Developer Onboarding
Read in this order:
1. `../PROJECT_STATUS.md` - Current state
2. `../README.md` - Project overview
3. `architecture/ARCHITECTURE.md` - System design
4. `database/schema-overview.md` - Data model
5. `implementation/INSTALLATION.md` - Setup environment
6. `planning/ROADMAP.md` - What's next

### New AI Agent Onboarding
Read in this order:
1. `../PROJECT_STATUS.md` - Current state
2. `../CLAUDE.md` - Technical patterns (auto-loaded)
3. `agents/contexts/[your-domain]-agent.md` - Your focused context
4. Relevant feature docs from `features/implemented/`

### Understanding a Specific Feature
1. Check `features/implemented/[feature-name].md` for overview
2. Read `../CLAUDE.md` for implementation patterns
3. Check `database/schema-overview.md` for data model
4. See `../CHANGELOG.md` for when it was added

---

## 📊 Current Project Status

**Version:** 0.2.10
**Phase:** 1.4 - Journey System (85% complete)

**Recent Additions:**
- Journey enrollment (individual + group)
- My Journeys page
- Error handling system
- 8 predefined journeys

**Next Up:**
- Journey content delivery
- Progress tracking
- Communication system (Phase 1.5)

See `../PROJECT_STATUS.md` for detailed current state.

---

## 🔄 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| PROJECT_STATUS.md | ✅ Current | 2026-02-04 |
| CLAUDE.md | ✅ Current | v0.2.10 |
| README.md | ⚠️ Needs update | v0.2.9 |
| CHANGELOG.md | ✅ Current | v0.2.10 |
| Architecture docs | ✅ Current | v0.2.0 |
| Database docs | 🆕 Being created | 2026-02-04 |
| Feature docs | 🆕 Being created | 2026-02-04 |
| Agent contexts | 🆕 Being created | 2026-02-04 |
| Workflows | 🆕 Being created | 2026-02-04 |

---

## 💡 Tips for AI Assistants

**Starting a task?**
1. Read `../PROJECT_STATUS.md` first
2. Load your relevant agent context from `agents/contexts/`
3. Check feature docs for context
4. Review recent session notes in `planning/sessions/`

**Context too large?**
- Use agent-specific contexts (they're focused and minimal)
- Read only relevant feature docs
- Skip historical session bridges unless investigating past decisions

**Making significant changes?**
- Update relevant feature docs
- Update `../CHANGELOG.md` if version changes
- Update `../CLAUDE.md` if patterns change
- Create session bridge in `planning/sessions/`

---

## 📝 Contributing to Documentation

When adding features or making changes:

1. **Update PROJECT_STATUS.md** - Current state and active tasks
2. **Update CHANGELOG.md** - Version history
3. **Update relevant feature docs** - In `features/`
4. **Update CLAUDE.md if needed** - Only for pattern changes
5. **Create session bridge** - Document your work in `planning/sessions/`

---

## 🔍 Finding Information

**Can't find what you need?**

1. Check this INDEX.md (you are here)
2. Search `../CLAUDE.md` for technical patterns
3. Look in `features/` for feature-specific info
4. Check `planning/sessions/` for historical context
5. Query the features database: `dev_databases/featuresDB.db`

---

## 📞 Help & Support

**For technical questions:** Review `../CLAUDE.md` and feature documentation
**For architecture questions:** See `architecture/ARCHITECTURE.md`
**For database questions:** See `database/schema-overview.md`
**For setup issues:** See `implementation/INSTALLATION.md`

---

**This index is maintained with each major release. Last updated for v0.2.10 restructuring (Feb 4, 2026).**
