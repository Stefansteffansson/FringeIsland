# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Implement Next.js 14+ frontend with App Router
- Set up Supabase authentication integration
- Create initial UI components for user registration and login
- Implement journey browsing and enrollment flows
- Build group creation and management interfaces

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

### Phase 1: Foundation (Current)
**Status**: In Progress  
**Timeline**: January 2026

- [x] Complete architecture planning
- [x] Design database schema
- [x] Document authorization system
- [x] Create comprehensive roadmap
- [x] Set up Supabase project
- [ ] Implement database schema
- [ ] Verify RLS policies
- [ ] Set up development environment
- [ ] Initialize Next.js project

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

- **v0.1.0** (2026-01-20): Initial architecture and database schema
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
- Migration files are located in `/migrations` directory (to be created)
- Current migration: `fringeisland_migration.sql` (initial schema)

---

**Project**: FringeIsland  
**Repository**: https://github.com/Stefansteffansson/FringeIsland  
**Maintainer**: Stefan Steffansson  
**License**: TBD
