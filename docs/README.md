# FringeIsland Documentation

**Version:** 0.2.10
**Last Updated:** February 4, 2026

This folder contains comprehensive documentation for the FringeIsland platform.

**🎯 START HERE:** See [INDEX.md](./INDEX.md) for master navigation and quick links.

---

## 📚 Documentation Structure

### 🏗️ Architecture
Technical architecture and design decisions

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - Overall system architecture and design patterns
- **[AUTHORIZATION.md](./architecture/AUTHORIZATION.md)** - Authorization model and RLS policies
- **[DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)** - Complete database schema documentation
- **[DOMAIN_ENTITIES.md](./architecture/DOMAIN_ENTITIES.md)** - Domain model and entity relationships

### 🔧 Implementation
Implementation guides and technical details

- **[AUTH_IMPLEMENTATION.md](./implementation/AUTH_IMPLEMENTATION.md)** - Authentication system implementation
- **[AUTH_IMPLEMENTATION_SUMMARY.md](./implementation/AUTH_IMPLEMENTATION_SUMMARY.md)** - Auth implementation quick reference
- **[INSTALLATION.md](./implementation/INSTALLATION.md)** - Setup and installation guide

### 🗄️ Database (NEW - v0.2.10 restructuring)
Database schema, migrations, and RLS policies

- **[schema-overview.md](./database/schema-overview.md)** - Complete database schema
- **[migrations-log.md](./database/migrations-log.md)** - Migration history
- **[rls-policies.md](./database/rls-policies.md)** - Row Level Security documentation

### ✨ Features (NEW - v0.2.10 restructuring)
Feature specifications and documentation

- **[implemented/](./features/implemented/)** - Completed features
- **[in-progress/](./features/in-progress/)** - Features under development
- **[planned/](./features/planned/)** - Future features

### 📋 Planning
Project planning and roadmap

- **[ROADMAP.md](./planning/ROADMAP.md)** - Feature roadmap and development phases
- **[DEFERRED_DECISIONS.md](./planning/DEFERRED_DECISIONS.md)** - Decisions postponed to future phases
- **[journey-system/](./planning/journey-system/)** - Journey system design documents
- **[sessions/](./planning/sessions/)** - Session bridges and development notes

### 🤖 Agent Contexts (NEW - v0.2.10 restructuring)
Focused contexts for AI agents

- **[contexts/database-agent.md](./agents/contexts/database-agent.md)** - Database work
- **[contexts/ui-agent.md](./agents/contexts/ui-agent.md)** - UI/component work
- **[contexts/feature-agent.md](./agents/contexts/feature-agent.md)** - Feature development

### 🔄 Workflows (NEW - v0.2.10 restructuring)
Development workflows and processes

- **[boot-up.md](./workflows/boot-up.md)** - Starting a work session
- **[close-down.md](./workflows/close-down.md)** - Ending a session

---

## 🚀 Current Status (v0.2.10)

### Completed Features
- ✅ Authentication system with AuthContext
- ✅ Profile management with avatar upload
- ✅ Group creation, editing, and viewing
- ✅ Member management (invite, accept, leave, remove)
- ✅ Role management (assign, promote, remove)
- ✅ **Journey catalog with 8 predefined journeys** ← v0.2.8
- ✅ **Journey enrollment (individual + group)** ← v0.2.10
- ✅ **My Journeys page** ← v0.2.10
- ✅ **Error handling system** ← v0.2.9
- ✅ Global navigation with real-time updates
- ✅ Last leader protection

### Recent Changes (v0.2.10)
See [../CHANGELOG.md](../CHANGELOG.md) for complete history:
- Journey enrollment system (individual and group)
- My Journeys page with tabs
- Enrollment status checking
- Documentation restructuring

---

## 🎯 Quick Links

### Essential Starting Points
- **[INDEX.md](./INDEX.md)** - Master navigation (START HERE)
- **[../PROJECT_STATUS.md](../PROJECT_STATUS.md)** - Current project state
- **[../CLAUDE.md](../CLAUDE.md)** - Technical patterns (for AI assistants)

### For Developers
- [Installation Guide](./implementation/INSTALLATION.md) - Get started
- [Database Schema](./database/schema-overview.md) - DB structure
- [Authorization](./architecture/AUTHORIZATION.md) - RLS policies

### For Project Planning
- [Roadmap](./planning/ROADMAP.md) - Future features
- [Architecture](./architecture/ARCHITECTURE.md) - System design

### For AI Assistants
- [Agent Contexts](./agents/README.md) - Focused contexts for specific work
- [Boot-up Workflow](./workflows/boot-up.md) - Starting a session
- [Close-down Workflow](./workflows/close-down.md) - Ending a session

---

## 📖 Reading Order for New Developers

If you're new to the project, read in this order:

1. **[INDEX.md](./INDEX.md)** - Master navigation
2. **[../PROJECT_STATUS.md](../PROJECT_STATUS.md)** - Current state
3. **[../README.md](../README.md)** - Project overview
4. **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - System design
5. **[database/schema-overview.md](./database/schema-overview.md)** - Data model
6. **[INSTALLATION.md](./implementation/INSTALLATION.md)** - Setup
7. **[ROADMAP.md](./planning/ROADMAP.md)** - What's next

---

## 🔄 Documentation Updates

This documentation is updated with each major release:

- **v0.2.10** (Feb 4, 2026) - Complete documentation restructuring
  - Created INDEX.md master navigation
  - Organized session bridges in planning/sessions/
  - Created database/ directory for DB docs
  - Created features/ directory for feature specs
  - Created agents/ directory for AI agent contexts
  - Created workflows/ directory for development processes
- **v0.2.8** (Jan 27, 2026) - Added journey system documentation
- **v0.2.7** (Jan 26, 2026) - Added group editing and member invitation
- **v0.2.6.2** (Jan 26, 2026) - Added role management documentation
- **v0.2.5** (Jan 26, 2026) - Added member management documentation

---

## 📝 Contributing to Documentation

When adding features, update these files:

1. **PROJECT_STATUS.md** - Current state and active tasks
2. **CHANGELOG.md** - Version history
3. **README.md** - Project overview (if major change)
4. **CLAUDE.md** - Technical patterns (if patterns change)
5. **docs/features/** - Feature-specific documentation
6. **docs/database/** - If DB schema or RLS changes
7. **docs/planning/sessions/** - Create session bridge for significant work

---

## 🏷️ Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| INDEX.md | ✅ Current | v0.2.10 (Feb 4, 2026) |
| PROJECT_STATUS.md | ✅ Current | v0.2.10 (Feb 4, 2026) |
| ARCHITECTURE.md | ✅ Current | v0.2.0 |
| AUTHORIZATION.md | ⚠️ Needs review | v0.2.4 |
| DATABASE_SCHEMA.md | 🔄 Being migrated | Moving to database/ directory |
| DOMAIN_ENTITIES.md | ✅ Current | v0.2.0 |
| AUTH_IMPLEMENTATION.md | ✅ Current | v0.2.1 |
| INSTALLATION.md | ✅ Current | v0.2.0 |
| ROADMAP.md | ⚠️ Needs update | Missing v0.2.8-0.2.10 |
| database/* | 🆕 In progress | v0.2.10 restructuring |
| features/* | 🆕 In progress | v0.2.10 restructuring |
| agents/* | 🆕 In progress | v0.2.10 restructuring |
| workflows/* | 🆕 In progress | v0.2.10 restructuring |

---

## 🎯 What's New in v0.2.10

### Documentation Restructuring
Complete documentation reorganization for better AI agent context management:
- Created `INDEX.md` for master navigation
- Organized session bridges in `planning/sessions/`
- Created `database/` directory for DB documentation
- Created `features/` directory for feature specifications
- Created `agents/` directory for AI agent contexts
- Created `workflows/` directory for development processes
- Added `PROJECT_STATUS.md` for quick current state reference

### Journey Enrollment System (v0.2.10)
Full enrollment system with individual and group support:
- EnrollmentModal component
- My Journeys page with tabs
- Enrollment status checking
- Group leader restrictions

### Journey Catalog (v0.2.8)
Journey browsing and discovery:
- Journey catalog with search and filters
- Journey detail pages
- 8 predefined journeys
- Curriculum expansion

---

**For questions or clarifications, see [../CLAUDE.md](../CLAUDE.md) for technical context.**
