# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FringeIsland is an educational and training platform for personal development, leadership training, and team/organizational development. Users embark on "journeys" - structured learning experiences that can be taken solo, in pairs, or in groups.

**Current Status**: Architecture & Planning phase (no code implemented yet)

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, React
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Real-time)
- **Styling**: TBD (Tailwind CSS recommended)
- **Hosting**: Vercel (frontend) + Supabase (backend)

## Architecture Overview

The platform is built on three foundational concepts:

### Core Entities

1. **Journeys** - Structured learning experiences (content templates, NOT organizational units)
   - Users/groups enroll in journeys
   - Types: predefined (Phase 1), user-created (Phase 2), dynamic/adaptive (Phase 3)

2. **Groups** - Flexible organizational units
   - NO hard-coded group types (Team, Organization, etc.) - all are just "Groups" with optional labels
   - Groups can contain users AND other groups (network-based, not just hierarchical)
   - Multi-parent membership allowed

3. **Authorization** - Three-layer permission model:
   - Permissions (atomic capabilities like `invite_members`, `view_journey_content`)
   - Role Templates (system-level blueprints: Platform Admin, Group Leader, Travel Guide, Member, Observer)
   - Group Roles (instances per group, customizable)

### Key Architectural Decisions

- **ADR-001**: Journeys are content templates, not nodes in organizational hierarchy
- **ADR-002**: Flexible group model with no hard-coded types
- **ADR-003**: Two-tier role system (templates + group instances)
- **ADR-004**: Permission inheritance is configurable per relationship (deferred to Phase 2)
- **ADR-005**: Every group must have at least one Group Leader
- **ADR-006**: Pairs are just 2-member groups (no special entity)

### Authorization Rules

- Users can have multiple roles in the same group (permissions are additive/union)
- Each group's roles are customizable independently
- Group creator auto-assigned Group Leader role
- Platform Admin is fallback if group has no leader

## Database Schema

See `docs/architecture/DATABASE_SCHEMA.md` for complete schema including:

**Core Tables**: users, groups, group_memberships, journeys, journey_enrollments

**Authorization Tables**: permissions, role_templates, role_template_permissions, group_templates, group_template_roles, group_roles, group_role_permissions, user_group_roles

All tables use Row Level Security (RLS) policies for authorization enforcement.

## Development Commands

*Commands will be added once implementation begins.*

Planned setup (Next.js 14+ with Supabase):
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Database migrations (Supabase)
npx supabase db push
npx supabase db reset
```

## Project Documentation

- `docs/architecture/ARCHITECTURE.md` - System design and core concepts
- `docs/architecture/DATABASE_SCHEMA.md` - Complete Supabase schema with RLS policies
- `docs/architecture/AUTHORIZATION.md` - Permission system details
- `docs/architecture/DOMAIN_ENTITIES.md` - Core business entities
- `docs/planning/ROADMAP.md` - Implementation phases (4 phases)
- `docs/planning/DEFERRED_DECISIONS.md` - Design decisions deferred to later phases

## Implementation Phases

1. **Phase 1 (MVP)**: Core platform with predefined journeys, groups, roles, basic forum/messaging
2. **Phase 2**: User-created journeys, marketplace, enhanced collaboration
3. **Phase 3**: Dynamic/adaptive journey paths
4. **Phase 4**: Developer API and SDK

## Key Implementation Notes

- Permission checks must happen at API route level AND be enforced via RLS policies (defense in depth)
- Never rely only on frontend validation
- Group memberships track both users AND groups as members (polymorphic via check constraint)
- Journey enrollments are either for a user OR a group (never both)
- JSONB fields used for extensible settings and journey content structure
