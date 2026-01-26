# FringeIsland Documentation

**Version:** 0.2.5  
**Last Updated:** January 26, 2026

This folder contains comprehensive documentation for the FringeIsland platform.

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

### 📋 Planning
Project planning and roadmap

- **[ROADMAP.md](./planning/ROADMAP.md)** - Feature roadmap and development phases
- **[DEFERRED_DECISIONS.md](./planning/DEFERRED_DECISIONS.md)** - Decisions postponed to future phases

---

## 🚀 Current Status (v0.2.5)

### Completed Features
- ✅ Authentication system with AuthContext
- ✅ Profile management with avatar upload
- ✅ Group creation and viewing
- ✅ **Member management (invite, accept, leave, remove)** ← NEW
- ✅ **Global navigation with real-time updates** ← NEW
- ✅ **Beautiful modal system (no browser alerts)** ← NEW
- ✅ Last leader protection at database level

### Recent Changes
See [../CHANGELOG.md](../CHANGELOG.md) for detailed v0.2.5 changes:
- Member invitation system
- Accept/decline invitations
- Leave groups and remove members
- Navigation bar with invitation badges
- Confirmation modal system
- Real-time navigation updates

---

## 🎯 Quick Links

### For Developers
- [Installation Guide](./implementation/INSTALLATION.md) - Get started
- [Database Schema](./architecture/DATABASE_SCHEMA.md) - DB structure
- [Authorization](./architecture/AUTHORIZATION.md) - RLS policies

### For Project Planning
- [Roadmap](./planning/ROADMAP.md) - Future features
- [Architecture](./architecture/ARCHITECTURE.md) - System design

### For AI Assistants
- [../CLAUDE.md](../CLAUDE.md) - Technical context and patterns

---

## 📖 Reading Order for New Developers

If you're new to the project, read in this order:

1. **This README** - Overview and structure
2. **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - Understand the system design
3. **[DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)** - Learn the data model
4. **[AUTHORIZATION.md](./architecture/AUTHORIZATION.md)** - Understand security model
5. **[INSTALLATION.md](./implementation/INSTALLATION.md)** - Set up your environment
6. **[ROADMAP.md](./planning/ROADMAP.md)** - See what's next

---

## 🔄 Documentation Updates

This documentation is updated with each major release:

- **v0.2.5** (Jan 26, 2026) - Added member management documentation
- **v0.2.4** (Jan 25, 2026) - Added group detail page documentation
- **v0.2.3** (Jan 25, 2026) - Added group creation documentation
- **v0.2.2** (Jan 25, 2026) - Added profile management documentation

---

## 📝 Contributing to Documentation

When adding features, update these files:

1. **CHANGELOG.md** - Version history
2. **README.md** - Project overview
3. **CLAUDE.md** - AI context
4. **docs/ROADMAP.md** - Remove completed items
5. **docs/DATABASE_SCHEMA.md** - If DB changes
6. **docs/AUTHORIZATION.md** - If RLS changes

---

## 🏷️ Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| ARCHITECTURE.md | ✅ Current | v0.2.0 |
| AUTHORIZATION.md | ⚠️ Needs update | v0.2.4 (missing v0.2.5 policies) |
| DATABASE_SCHEMA.md | ⚠️ Needs update | v0.2.4 (missing status constraint) |
| DOMAIN_ENTITIES.md | ✅ Current | v0.2.0 |
| AUTH_IMPLEMENTATION.md | ✅ Current | v0.2.1 |
| INSTALLATION.md | ✅ Current | v0.2.0 |
| ROADMAP.md | ⚠️ Needs update | v0.2.4 (mark v0.2.5 complete) |

**Note:** Documents marked ⚠️ should be updated to include v0.2.5 changes.

---

## 🎯 What's New in v0.2.5

### Member Management System
Complete member management with invite, accept/decline, leave, and remove functionality. See implementation details in:
- Database changes: [DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)
- Security policies: [AUTHORIZATION.md](./architecture/AUTHORIZATION.md)
- Feature roadmap: [ROADMAP.md](./planning/ROADMAP.md)

### Navigation System
Global navigation bar with real-time updates. Covered in:
- Architecture patterns: [ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
- Component structure: See code in `/components/Navigation.tsx`

---

**For questions or clarifications, see [../CLAUDE.md](../CLAUDE.md) for technical context.**
