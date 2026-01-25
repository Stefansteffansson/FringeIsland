# FringeIsland Documentation

Welcome to the FringeIsland documentation. This directory contains comprehensive technical and planning documentation for the platform.

## 📁 Documentation Structure

### Architecture Documentation (`architecture/`)

Technical design and system architecture documents:

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)**  
  Overall system design, core concepts, architectural decisions, and system diagrams

- **[DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)**  
  Complete Supabase database schema including tables, relationships, indexes, and Row Level Security (RLS) policies

- **[AUTHORIZATION.md](./architecture/AUTHORIZATION.md)**  
  Detailed permission system design including role templates, group roles, permission inheritance, and access control rules

- **[DOMAIN_ENTITIES.md](./architecture/DOMAIN_ENTITIES.md)**  
  Core business entities (Users, Groups, Journeys, Roles, Permissions) with properties and relationships

### Planning Documentation (`planning/`)

Project management and roadmap documents:

- **[ROADMAP.md](./planning/ROADMAP.md)**  
  Implementation phases, milestones, and development priorities from Phase 1 (Foundation) through Phase 4 (Developer Platform)

- **[DEFERRED_DECISIONS.md](./planning/DEFERRED_DECISIONS.md)**  
  Design decisions and features deferred to later phases with context for future implementation

### Implementation Documentation (`implementation/`)

Guides for implementing specific features:

- **AUTH_IMPLEMENTATION_SUMMARY.md**  
  Complete authentication implementation (v0.2.0 - January 23, 2026)

## 🎯 Quick Start Guide

### For Developers
1. Start with [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) to understand system design
2. Review [DOMAIN_ENTITIES.md](./architecture/DOMAIN_ENTITIES.md) for business logic
3. Study [DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md) before database work
4. Read [AUTHORIZATION.md](./architecture/AUTHORIZATION.md) before implementing permissions

### For Project Planning
1. Review [ROADMAP.md](./planning/ROADMAP.md) for implementation phases
2. Check [DEFERRED_DECISIONS.md](./planning/DEFERRED_DECISIONS.md) for future considerations

## 📊 Implementation Status

### ✅ Phase 1: Foundation (Complete)
- Database schema with 13 tables
- Row Level Security framework
- Supabase integration
- Next.js 16.1 setup

### 🔄 Phase 2: Core Platform (In Progress - 45%)

**Completed Features:**
- ✅ **Authentication** (v0.2.0 - Jan 23, 2026)
  - User signup, login, logout
  - Session management
  - Protected routes
  - Soft delete user lifecycle
  
- ✅ **Profile Management** (v0.2.1 - Jan 24, 2026)
  - Profile editing (name, bio)
  - Form validation
  
- ✅ **Avatar Upload** (v0.2.2 - Jan 24, 2026)
  - Supabase Storage integration
  - Image upload/delete
  - Avatar display throughout app
  
- ✅ **Group Creation** (v0.2.3 - Jan 25, 2026)
  - Create groups from templates
  - Group visibility settings
  - Automatic leader assignment
  - My Groups list page
  - Complete RLS policies

**In Progress:**
- 🔄 Group detail page
- 🔄 Member management
- 🔄 Role assignment

**Planned:**
- ⏳ Journey browsing
- ⏳ Journey enrollment
- ⏳ Basic permissions UI

## 🗄️ Database Migrations

Migration files are located in `/supabase/migrations/`:

1. **`20260120_initial_schema.sql`**  
   Initial database setup with 13 tables, indexes, triggers, and seed data
   - Core tables: users, groups, journeys, etc.
   - Authorization tables: permissions, roles, templates
   - 40 permissions seeded
   - 5 role templates seeded
   - 4 group templates seeded

2. **`20260123_fix_user_trigger_and_rls.sql`**  
   User lifecycle management and authentication RLS policies
   - Automatic user profile creation trigger
   - Soft delete trigger
   - User table RLS policies

3. **`20260125_group_rls_policies.sql`**  
   Group creation and management RLS policies
   - Groups table policies (create, view own, view public)
   - Group memberships policies
   - Group roles policies
   - Group role permissions policies
   - User group roles policies
   - Enables complete group creation workflow

### Applying Migrations

**For new projects:**
```sql
-- Run migrations in order:
\i supabase/migrations/20260120_initial_schema.sql
\i supabase/migrations/20260123_fix_user_trigger_and_rls.sql
\i supabase/migrations/20260125_group_rls_policies.sql
```

**For existing projects:**
```sql
-- Apply only new migrations you haven't run yet
\i supabase/migrations/20260125_group_rls_policies.sql
```

## 🔄 Documentation Updates

These documents are living artifacts that evolve with the project. When making significant architectural or design changes:

1. Update relevant documentation files
2. Add notes to DEFERRED_DECISIONS.md for future work
3. Keep ROADMAP.md aligned with current priorities
4. Create new migration files for database changes
5. Update this README with implementation status

## 📝 Document Conventions

- **File naming**: UPPERCASE_WITH_UNDERSCORES.md
- **Headers**: Use descriptive, hierarchical headers
- **Code blocks**: Include language hints for syntax highlighting
- **Examples**: Provide concrete examples where helpful
- **Cross-references**: Link between related documents
- **Migration files**: Format as `YYYYMMDD_description.sql`

## 🤔 Questions or Clarifications?

If documentation is unclear or incomplete, please flag for improvement. Good documentation is critical to project success.

---

**Last Updated**: January 25, 2026  
**Current Version**: 0.2.3  
**Phase**: 2 (Core Platform) - 45% Complete
