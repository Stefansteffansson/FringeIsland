# FringeIsland Architecture

## Overview

FringeIsland is an educational platform built on three foundational concepts:

1. **Journeys** - Structured learning experiences (content templates)
2. **Groups** - Flexible organizational units with dynamic membership
3. **Authorization** - Customizable role-based permission system

This document outlines the overall system architecture, core design principles, and key architectural decisions.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14+)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Journey    │  │    Group     │  │    User      │    │
│  │  Management  │  │  Management  │  │  Management  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Forum     │  │  Messaging   │  │   Progress   │    │
│  │    System    │  │    System    │  │   Tracking   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Layer
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                      │  │
│  │  - Users, Groups, Journeys, Roles, Permissions       │  │
│  │  - Row Level Security (RLS) policies                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │     Auth     │  │   Real-time  │  │   Storage    │    │
│  │   (Built-in) │  │ Subscriptions│  │ (For assets) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: TBD (Tailwind CSS recommended)

**Backend**
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Real-time subscriptions
- **Storage**: Supabase Storage (for journey assets, user uploads)

**Infrastructure**
- **Hosting**: Vercel (frontend) + Supabase (backend)
- **Repository**: GitHub

## Core Concepts

### 1. Journeys (Content Templates)

**What are Journeys?**
Journeys are structured learning experiences—like guided tours through personal development territory. Users embark on journeys either solo or collaboratively.

**Journey Characteristics:**
- **Content-based**: Journeys are templates/curriculum, not organizational units
- **Enrollable**: Users and groups sign up for journeys
- **Flexible paths**: From linear (A→B) to dynamic/adaptive
- **User-generated**: Users can create and publish journeys (Phase 2+)

**Journey Types (by Phase):**
- **Phase 1**: Predefined A→B journeys (static paths)
- **Phase 2**: User-created journeys (marketplace)
- **Phase 3**: Dynamic/adaptive journeys (path changes based on actions)
- **Phase 4**: API-integrated journeys (custom components)

**Journey Enrollment Types:**
- Individual user → Journey (solo)
- Group → Journey (collaborative)

### 2. Groups (Flexible Organizational Units)

**What are Groups?**
Groups are flexible containers for organizing people. Unlike rigid organizational hierarchies, FringeIsland groups are network-based with "member of" relationships.

**Key Design Principle: NO HARD-CODED GROUP TYPES**

Groups are NOT categorized as "Team", "Organization", or "Cohort" in the database. Instead:
- All groups are simply **Groups**
- Groups can have custom labels/names (user-defined)
- System provides example templates, but users can rename/customize

**Group Capabilities:**
- **User membership**: Users can belong to groups
- **Group membership**: Groups can belong to other groups (subgroups)
- **Multi-membership**: Users and groups can belong to multiple parent groups
- **Flexible structure**: Network-based (not just hierarchical trees)

**Group Relationships:**

```
Example 1: Organizational Hierarchy
┌─────────────────────┐
│  Acme Corporation   │  (Group)
└──────────┬──────────┘
           │ members
           ├─→ Stefan (User)
           ├─→ Alice (User)
           └─→ ┌──────────────────┐
               │  Marketing Team  │ (Group)
               └────────┬─────────┘
                        │ members
                        ├─→ Bob (User)
                        └─→ Carol (User)

Example 2: Multi-parent Membership
┌─────────────────┐       ┌──────────────────┐
│  Acme Corp      │       │ Leadership 2025  │
│  (Group)        │       │ (Group)          │
└────────┬────────┘       └────────┬─────────┘
         │                         │
         └────────┬────────────────┘
                  │ both members
                  ▼
            ┌──────────┐
            │  Stefan  │ (User)
            └──────────┘
```

### 3. Authorization System

**Three-Layer Permission Model:**

```
1. PERMISSIONS (Atomic capabilities)
   └─ view_journey_content
   └─ invite_members
   └─ assign_roles
   └─ etc.

2. ROLE TEMPLATES (System-level blueprints)
   └─ Admin Role Template → [set of permissions]
   └─ Group Leader Role Template → [set of permissions]
   └─ Travel Guide Role Template → [set of permissions]
   └─ Member Role Template → [set of permissions]
   └─ Observer Role Template → [set of permissions]

3. GROUP ROLES (Instance per group)
   └─ "Marketing Team" has:
       ├─ Admin (copied from Admin Role Template, customizable)
       ├─ Travel Guide (copied from Travel Guide Role Template)
       └─ Member (copied from Member Role Template)
```

**Key Authorization Principles:**

1. **Context-based**: Permissions are scoped to specific groups
   - Stefan is "Admin" in Group A, "Member" in Group B

2. **Multi-role**: Users can have multiple roles in the same group
   - Stefan is both "Group Leader" AND "Travel Guide" in same group

3. **Customizable**: Each group can customize its role permissions
   - "Admin" role in Group A may have different permissions than in Group B

4. **Inheritable**: Permission inheritance between parent/child groups is configurable
   - Can flow parent→child, child→parent, or neither
   - Configured per relationship

5. **Template-based**: Starting points provided, but fully flexible
   - System provides Role Templates as blueprints
   - Groups copy and customize as needed

## Architectural Decisions

### ADR-001: Journeys as Content, Not Nodes

**Decision**: Journeys are content templates, not group/organizational nodes.

**Rationale**:
- Clearer separation of concerns (content vs. organization)
- Groups can enroll in the same journey template
- Supports both solo and collaborative enrollment
- Allows journey reuse across different organizational contexts

**Alternative Considered**: Making journeys a type of group (rejected due to confusion between organizational structure and learning content)

### ADR-002: Flexible Group Model (No Hard-coded Types)

**Decision**: No hard-coded group types. All groups are simply "Groups" with optional user-defined labels.

**Rationale**:
- Maximum flexibility for diverse use cases
- Users aren't constrained by platform assumptions
- Simpler database schema (single groups table)
- Easier to evolve system without breaking changes
- Network-based relationships vs. rigid hierarchies

**Alternative Considered**: Hard-coded types (Team, Organization, Cohort) - rejected due to inflexibility

### ADR-003: Role Templates + Group Role Instances

**Decision**: Two-tier role system: system-level templates and group-level instances.

**Rationale**:
- Consistency: Templates provide common starting points
- Flexibility: Each group can customize its roles
- Maintainability: Template updates don't break existing groups
- Scalability: New templates can be added without migration

**Alternative Considered**: Global roles only (rejected - too inflexible) or completely free-form roles (rejected - no consistency)

### ADR-004: Customizable Permission Inheritance

**Decision**: Permission inheritance rules are configurable per parent-child relationship.

**Rationale**:
- Different organizational patterns need different inheritance
- Some contexts need parent→child flow, others child→parent, others isolated
- Future-proofs against unforeseen use cases
- Complex but necessary for true flexibility

**Alternative Considered**: Fixed inheritance rules (rejected - too restrictive)

### ADR-005: Group Leader Safeguard

**Decision**: Every group must have at least one Group Leader. If last Group Leader is removed, role defaults to Platform Admin.

**Rationale**:
- Prevents "orphaned" groups without management capability
- Platform Admin acts as safety net
- Group Leader can be reassigned to recover control
- Balances flexibility with stability

**Alternative Considered**: Allow groups without leaders (rejected - too risky)

### ADR-006: Pairs are Just Small Groups

**Decision**: No special "pair" entity. Pairs are groups with 2 members.

**Rationale**:
- Simpler data model (one less entity type)
- No arbitrary distinction between 2-person and 3-person groups
- All group features work for pairs automatically
- Can still add pair-specific UI/features later if needed

**Alternative Considered**: Separate "pair" entity (rejected - unnecessary complexity)

## Data Flow Examples

### Example 1: User Creates a Group

```
1. User clicks "Create Group"
2. System presents Group Template options:
   - Small Team Template
   - Large Group Template
   - Organization Template
   - Learning Cohort Template
3. User selects "Small Team Template" and names group "Marketing Team"
4. System creates:
   - Group record: "Marketing Team"
   - Group Roles (copied from template):
     ├─ Admin (from Admin Role Template)
     ├─ Travel Guide (from Travel Guide Role Template)
     └─ Member (from Member Role Template)
   - User Group Role: assigns creator as "Group Leader"
5. User can now:
   - Invite members
   - Customize role permissions
   - Enroll group in journeys
```

### Example 2: User Enrolls in Journey

```
Solo Enrollment:
1. User browses journey catalog
2. User clicks "Start Journey" on "Leadership Fundamentals"
3. System creates journey_enrollment record
4. User begins journey with full access to content

Group Enrollment:
1. Group Leader browses journey catalog
2. Group Leader clicks "Enroll Group" on "Team Building Journey"
3. System creates journey_enrollment for entire group
4. All group members gain access to journey content
5. Group progresses through journey together
```

### Example 3: Permission Check Flow

```
Question: Can Stefan invite new members to Marketing Team?

1. System identifies Stefan's roles in Marketing Team:
   → Stefan has "Group Leader" role
2. System retrieves "Group Leader" role's permissions:
   → "Group Leader" role has permission: invite_members = true
3. Action allowed ✓

Question: Can Stefan view Alice's progress in a journey?

1. System identifies Stefan's roles in the relevant group:
   → Stefan has "Travel Guide" role
2. System retrieves "Travel Guide" role's permissions:
   → "Travel Guide" role has permission: view_others_progress = true
3. Action allowed ✓
```

## Security Considerations

### Row Level Security (RLS)

All database tables use Supabase Row Level Security policies to enforce authorization at the database level.

**Key RLS Patterns:**

1. **User Data**: Users can only access their own user record
2. **Group Data**: Users can access groups they're members of (directly or through parent groups)
3. **Journey Data**: Users can access journeys they're enrolled in
4. **Permission-based**: Actions checked against user's group roles

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed RLS policies.

### Authentication

- Supabase Auth handles user authentication
- Support for email/password, OAuth providers
- Session management via JWT tokens
- Secure by default

### Data Privacy

- User profile visibility controlled by permissions
- Group visibility settings (public/private)
- Member list visibility configurable per group
- Journey progress privacy settings

## Scalability Considerations

### Database Indexing

Critical indexes for performance:
- User lookups by email/id
- Group membership queries (user_id, group_id)
- Role permission checks (group_id, user_id)
- Journey enrollments (user_id, journey_id, group_id)

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete index strategy.

### Caching Strategy

Future optimization opportunities:
- Cache role permissions per user-group pair
- Cache group membership hierarchies
- Redis for session data and frequently accessed lookups

### Real-time Features

Supabase Real-time subscriptions for:
- Live chat/messaging
- Journey progress updates
- Group member presence
- Forum activity

## Future Architecture Considerations

### Phase 2: Journey Marketplace
- Journey publishing workflow
- Journey ratings/reviews
- Journey versioning
- Revenue sharing (if monetized)

### Phase 3: Dynamic Journeys
- Journey path branching logic
- User action tracking for adaptation
- Journey state machine
- Context-aware content delivery

### Phase 4: Developer API
- REST API for journey integrations
- Webhook system for external tools
- SDK for journey component development
- API rate limiting and quotas

## Glossary

- **Journey**: A structured learning experience (content template)
- **Group**: A flexible organizational unit containing users and/or other groups
- **Permission**: An atomic capability (e.g., `invite_members`)
- **Role Template**: System-level blueprint for a role with default permissions
- **Group Role**: Instance of a role within a specific group (customizable)
- **Group Leader**: Role responsible for managing a specific group
- **Travel Guide**: Role responsible for facilitating journeys
- **Platform Admin**: System-level administrator role
- **Enrollment**: Relationship between user/group and journey
- **Member of**: Relationship indicating user belongs to group or group belongs to parent group

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next Review**: After Phase 1 implementation begins