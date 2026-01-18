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

## 🎯 Quick Start Guide

### For Developers
1. Start with [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) to understand system design
2. Review [DOMAIN_ENTITIES.md](./architecture/DOMAIN_ENTITIES.md) for business logic
3. Study [DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md) before database work
4. Read [AUTHORIZATION.md](./architecture/AUTHORIZATION.md) before implementing permissions

### For Project Planning
1. Review [ROADMAP.md](./planning/ROADMAP.md) for implementation phases
2. Check [DEFERRED_DECISIONS.md](./planning/DEFERRED_DECISIONS.md) for future considerations

## 🔄 Documentation Updates

These documents are living artifacts that evolve with the project. When making significant architectural or design changes:

1. Update relevant documentation files
2. Add notes to DEFERRED_DECISIONS.md for future work
3. Keep ROADMAP.md aligned with current priorities

## 📝 Document Conventions

- **File naming**: UPPERCASE_WITH_UNDERSCORES.md
- **Headers**: Use descriptive, hierarchical headers
- **Code blocks**: Include language hints for syntax highlighting
- **Examples**: Provide concrete examples where helpful
- **Cross-references**: Link between related documents

## 🤔 Questions or Clarifications?

If documentation is unclear or incomplete, please flag for improvement. Good documentation is critical to project success.

---

**Last Updated**: January 2026