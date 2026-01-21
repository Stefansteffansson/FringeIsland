# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Set up Supabase authentication integration
- Create initial UI components for user registration and login
- Implement journey browsing and enrollment flows
- Build group creation and management interfaces

---

## [0.1.2] - 2026-01-21

### Added
- **Next.js Project Setup**: Complete Next.js 14+ initialization with App Router
  - TypeScript configuration with strict mode
  - Tailwind CSS for styling
  - ESLint for code quality
  - Project structure organized in repository root
- **Supabase Integration**: Full client/server integration
  - Client-side Supabase client (`lib/supabase/client.ts`)
  - Server-side Supabase client with cookie handling (`lib/supabase/server.ts`)
  - Proxy middleware for session management (`proxy.ts`)
  - Environment variables configured (`.env.local`)
- **Database Connection**: Verified and tested
  - Successfully fetching data from Supabase
  - RLS policies working correctly
  - Test page displaying permissions from database

### Changed
- Updated `.gitignore` with Next.js-specific entries
  - Added `.next`, `out`, `build` directories
  - Added environment variable files
  - Added TypeScript build info
- Migrated from `middleware.ts` to `proxy.ts` (Next.js 16 convention)
- Updated home page (`app/page.tsx`) with database connection test

### Technical Details
- Next.js: 16.1.4 with Turbopack
- Supabase packages: `@supabase/supabase-js`, `@supabase/ssr`
- Development server: Running on http://localhost:3000
- **Phase 1: Foundation** ✅ **COMPLETE**

---

## [0.1.1] - 2026-01-20

### Added
- **Database Implementation**: Successfully deployed complete database schema to Supabase
  - 13 tables created (all core and authorization tables)
  - 40 permissions seeded into database
  - 5 role templates seeded (Platform Admin, Group Leader, Travel Guide, Member, Observer)
  - 4 group templates seeded (Small Team, Large Group, Organization, Learning Cohort)
  - All indexes, triggers, and RLS policies successfully deployed
  - Validation trigger added for user_group_roles to ensure role-group consistency

### Fixed
- Replaced CHECK constraint with trigger in `user_group_roles` table (PostgreSQL doesn't support subqueries in CHECK constraints)
- Updated migration script with corrected user_group_roles validation approach

### Technical Details
- Database: Fully operational with 13 tables, RLS enabled on all tables
- Seed Data: 40 permissions, 5 role templates, 4 group templates
- Phase: Database Implementation ✅ Complete

---

## [0.1.0] - 2026-01-20

### Added
- **Database Schema v2.0**: Complete PostgreSQL schema with proper dependency ordering
  - Core tables: users, groups, group_memberships, journeys, journey_enrollments
  - Authorization tables: permissions, role_templates, group_templates, role_template_permissions, group_template_roles, group_roles, group_role_permissions, user_group_roles
  - Row Level Security (RLS) policies for all tables
  - Comprehensive indexes for performance optimization
  - Seed data for permissions, role templates, and group templates
- **Migration Script**: `fringeisland_migration.sql` for automated database setup
- **Architecture Documentation**:
  - `ARCHITECTURE.md`: Overall system design and core concepts
  - `DATABASE_SCHEMA.md`: Complete database schema with RLS policies
  - `AUTHORIZATION.md`: Detailed permission system design
  - `DOMAIN_ENTITIES.md`: Core business entities and relationships
  - `ROADMAP.md`: Implementation phases and milestones
  - `DEFERRED_DECISIONS.md`: Architectural decisions postponed to later phases
- **Project Documentation**:
  - `README.md`: Project overview, vision, and current status
  - `CHANGELOG.md`: Version history and changes tracking
  - `.gitignore`: Git ignore rules for Node.js and common editor files
- **Supabase Project**: Created FringeIslandDB database instance

### Changed
- Reorganized database table creation order to resolve foreign key dependency issues
  - Moved `permissions`, `role_templates`, and `group_templates` before `groups`
  - Ensured all referenced tables are created before tables that reference them
- Updated documentation structure for better clarity and navigation

### Technical Details
- Stack: Next.js 14+, TypeScript, React, Supabase (PostgreSQL)
- Database: PostgreSQL with Row Level Security
- Authorization: Flexible node/group-based permission system
- Phase: Architecture & Planning → Database Implementation

---

## Project Phases

### Phase 1: Foundation ✅ COMPLETE
**Status**: Complete  
**Timeline**: January 2026

- [x] Complete architecture planning
- [x] Design database schema
- [x] Document authorization system
- [x] Create comprehensive roadmap
- [x] Set up Supabase project
- [x] Implement database schema
- [x] Verify RLS policies
- [x] Set up development environment
- [x] Initialize Next.js project
- [x] Configure Supabase integration
- [x] Test database connection

### Phase 2: Core Platform (Planned)
**Timeline**: February - March 2026

- [ ] Implement authentication system
- [ ] Build user profile management
- [ ] Create group creation and management
- [ ] Develop journey browsing and enrollment
- [ ] Implement basic permissions and roles

### Phase 3: Journey Experience (Planned)
**Timeline**: April - May 2026

- [ ] Build journey content delivery system
- [ ] Implement progress tracking
- [ ] Create facilitator tools
- [ ] Add group journey features
- [ ] Develop basic analytics

### Phase 4: Enhanced Features (Planned)
**Timeline**: June - August 2026

- [ ] Add user-created journeys
- [ ] Implement journey marketplace
- [ ] Build communication features (forums, messaging)
- [ ] Add feedback and review systems
- [ ] Enhance analytics and reporting

---

## Version History Summary

- **v0.1.2** (2026-01-21): Phase 1 complete - Next.js setup and Supabase integration working
- **v0.1.1** (2026-01-20): Database successfully implemented and deployed to Supabase
- **v0.1.0** (2026-01-20): Initial architecture and database schema design
- More versions to come as development progresses...

---

## Notes

### Versioning Strategy
- **0.x.x**: Pre-release development versions
- **1.0.0**: First production-ready release with core features
- **x.y.z**: Major.Minor.Patch following semantic versioning

### Contributing
Currently in early development phase. Contribution guidelines will be added when the project reaches a stable state.

### Database Migrations
- Each database schema change will be documented with migration scripts
- Migration files are located in `supabase/migrations/` directory
- ✅ **Current migration**: `20260120_initial_schema.sql` (deployed successfully)

---

**Project**: FringeIsland  
**Repository**: https://github.com/Stefansteffansson/FringeIsland  
**Maintainer**: Stefan Steffansson  
**License**: TBD
