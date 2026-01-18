# Domain Entities

This document defines the core business entities in FringeIsland, their properties, relationships, and business logic.

## Overview

FringeIsland is built around six core domain entities:

1. **User** - Individual people using the platform
2. **Group** - Flexible organizational units
3. **Journey** - Structured learning experiences
4. **Role** - Collections of permissions (templates and instances)
5. **Permission** - Atomic capabilities
6. **Enrollment** - Relationship between users/groups and journeys

## Entity Diagrams

### High-Level Entity Relationships

```
┌─────────┐         member of        ┌─────────┐
│  User   │◆────────────────────────▷│  Group  │
└─────────┘                          └─────────┘
     │                                    │
     │ has roles                          │ has roles
     │                                    │
     ▽                                    ▽
┌─────────────┐                    ┌─────────────┐
│  User       │                    │  Group      │
│  Group      │                    │  Roles      │
│  Roles      │                    └─────────────┘
└─────────────┘                          │
     │                                    │
     │ references                         │ references
     │                                    │
     ▽                                    ▽
┌──────────────┐                   ┌──────────────┐
│  Role        │────has──────────▷ │  Permission  │
│  Templates   │                   └──────────────┘
└──────────────┘

┌─────────┐      enrolled in       ┌─────────┐
│  User   │◆────────────────────▷  │ Journey │
└─────────┘                        └─────────┘
     ▴                                  ▴
     │                                  │
     │                                  │
┌─────────┐      enrolled in           │
│  Group  │◆─────────────────────────┘
└─────────┘
```

## Core Entities

### 1. User

**Description**: Individual person with an account on FringeIsland.

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| email | String | Yes | Email address (unique) |
| full_name | String | No | User's full name |
| avatar_url | String | No | Profile picture URL |
| bio | Text | No | User bio/description |
| is_active | Boolean | Yes | Account active status (default: true) |
| auth_user_id | UUID | Yes | Link to Supabase Auth user |
| created_at | Timestamp | Yes | Account creation date |
| updated_at | Timestamp | Yes | Last profile update |
| last_sign_in_at | Timestamp | No | Last sign-in timestamp |

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| member_of | Group | Many-to-Many | Groups user belongs to (via group_memberships) |
| has_roles | Group Role | Many-to-Many | Roles user has in groups (via user_group_roles) |
| enrolled_in | Journey | Many-to-Many | Journeys user is taking (via journey_enrollments) |
| created_groups | Group | One-to-Many | Groups created by this user |
| created_journeys | Journey | One-to-Many | Journeys created by this user |

**Business Rules:**

1. **Unique Email**: Each email can only be associated with one account
2. **Active Status**: Inactive users cannot access platform features
3. **Auth Integration**: Every user must have a corresponding Supabase Auth record
4. **Multi-Group Membership**: Users can belong to unlimited groups
5. **Multi-Role Assignment**: Users can have multiple roles in the same group

**State Transitions:**

```
[New] ──register──> [Active] ──pause──> [Paused] ──activate──> [Active]
                       │
                       └──delete──> [Deleted]
```

**Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "stefan@example.com",
  "full_name": "Stefan Stefansson",
  "avatar_url": "https://storage.supabase.co/avatars/stefan.jpg",
  "bio": "Leadership coach and organizational developer",
  "is_active": true,
  "auth_user_id": "auth_123456",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-18T14:30:00Z",
  "last_sign_in_at": "2025-01-18T09:00:00Z"
}
```

---

### 2. Group

**Description**: Flexible organizational unit containing users and/or other groups.

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| name | String | Yes | Group name |
| description | Text | No | Group description/purpose |
| label | String | No | Optional user-defined label (e.g., "Team", "Organization") |
| created_by_user_id | UUID | Yes | User who created the group |
| created_from_group_template_id | UUID | No | Template used to create group |
| is_public | Boolean | Yes | Public visibility (default: false) |
| show_member_list | Boolean | Yes | Show member list publicly (default: true) |
| settings | JSONB | No | Extensible settings (inheritance rules, etc.) |
| created_at | Timestamp | Yes | Creation date |
| updated_at | Timestamp | Yes | Last update |

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| has_members | User | Many-to-Many | Users who are members (via group_memberships) |
| has_subgroups | Group | Many-to-Many | Groups that are members (via group_memberships) |
| member_of_groups | Group | Many-to-Many | Parent groups this group belongs to |
| has_roles | Group Role | One-to-Many | Roles defined within this group |
| enrolled_in | Journey | Many-to-Many | Journeys group is taking (via journey_enrollments) |
| created_by | User | Many-to-One | User who created this group |

**Business Rules:**

1. **Flexible Structure**: Groups can contain users, other groups, or both
2. **No Hard-coded Types**: All groups are simply "Groups" with optional labels
3. **Multi-parent Membership**: Groups can belong to multiple parent groups
4. **Creator Auto-Leadership**: Group creator automatically gets Group Leader role
5. **Must Have Leader**: Every group must have at least one Group Leader
6. **Visibility Control**: Groups can be public/private with configurable member list visibility
7. **Network-based**: Not limited to hierarchical trees (supports network structures)

**State Transitions:**

```
[New] ──create──> [Active] ──archive──> [Archived] ──restore──> [Active]
                     │
                     └──delete──> [Deleted]
```

**Settings Schema (JSONB):**

```json
{
  "inheritance": "isolated" | "parent_to_child" | "child_to_parent",
  "default_member_role": "role_id",
  "auto_enroll_members_in_journeys": false,
  "custom_fields": {}
}
```

**Example:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Marketing Team",
  "description": "Cross-functional marketing team focused on digital channels",
  "label": "Team",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_from_group_template_id": "template_small_team",
  "is_public": false,
  "show_member_list": true,
  "settings": {
    "inheritance": "isolated",
    "default_member_role": "role_member_id"
  },
  "created_at": "2025-01-16T10:00:00Z",
  "updated_at": "2025-01-18T11:00:00Z"
}
```

---

### 3. Journey

**Description**: Structured learning experience that users/groups can enroll in.

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| title | String | Yes | Journey title/name |
| description | Text | No | Journey description |
| created_by_user_id | UUID | Yes | User who created the journey |
| is_published | Boolean | Yes | Published to catalog (default: false) |
| is_public | Boolean | Yes | Publicly visible (default: false) |
| journey_type | String | Yes | Type: predefined, user_created, dynamic |
| content | JSONB | No | Journey structure and materials |
| estimated_duration_minutes | Integer | No | Estimated completion time |
| difficulty_level | String | No | beginner, intermediate, advanced |
| tags | String[] | No | Searchable tags |
| created_at | Timestamp | Yes | Creation date |
| updated_at | Timestamp | Yes | Last update |
| published_at | Timestamp | No | Publication date |

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| enrolled_users | User | Many-to-Many | Users enrolled (via journey_enrollments) |
| enrolled_groups | Group | Many-to-Many | Groups enrolled (via journey_enrollments) |
| created_by | User | Many-to-One | Journey creator |

**Business Rules:**

1. **Content Template**: Journeys are content, not organizational units
2. **Reusable**: Same journey can be used by multiple users/groups
3. **Solo and Collaborative**: Supports both individual and group enrollment
4. **Publication Workflow**: Draft → Published → (Optional) Unpublished
5. **Type Evolution**: Predefined (Phase 1) → User-created (Phase 2) → Dynamic (Phase 3)
6. **Creator Permissions**: Only creator (or platform admin) can edit journey
7. **Freezing**: Journeys can be frozen to prevent changes during active use

**Journey Types:**

| Type | Phase | Description |
|------|-------|-------------|
| predefined | 1 | Platform-created, static A→B paths |
| user_created | 2 | User-created, published to marketplace |
| dynamic | 3 | Adaptive paths based on user actions |

**Content Structure (JSONB Schema):**

```json
{
  "version": "1.0",
  "structure": "linear" | "branching" | "adaptive",
  "steps": [
    {
      "id": "step_1",
      "title": "Introduction to Leadership",
      "type": "content" | "activity" | "assessment",
      "content": {},
      "duration_minutes": 30,
      "required": true
    }
  ],
  "resources": [],
  "metadata": {}
}
```

**State Transitions:**

```
[Draft] ──publish──> [Published] ──unpublish──> [Unpublished] ──publish──> [Published]
   │                      │
   └──delete──> [Deleted] └──freeze──> [Frozen] ──unfreeze──> [Published]
```

**Example:**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "title": "Leadership Fundamentals",
  "description": "Core leadership skills for emerging leaders",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_published": true,
  "is_public": true,
  "journey_type": "predefined",
  "content": {
    "version": "1.0",
    "structure": "linear",
    "steps": [...]
  },
  "estimated_duration_minutes": 180,
  "difficulty_level": "beginner",
  "tags": ["leadership", "fundamentals", "team-building"],
  "created_at": "2025-01-10T10:00:00Z",
  "updated_at": "2025-01-15T14:00:00Z",
  "published_at": "2025-01-15T14:00:00Z"
}
```

---

### 4. Role (Templates and Instances)

**Description**: Collection of permissions; exists as system templates and group-specific instances.

#### 4a. Role Template

**Description**: System-level blueprint for roles.

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| name | String | Yes | Template name (unique) |
| description | Text | No | Template description |
| is_system | Boolean | Yes | System vs user-created (default: true) |
| created_at | Timestamp | Yes | Creation date |
| updated_at | Timestamp | Yes | Last update |

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| has_permissions | Permission | Many-to-Many | Permissions in this template (via role_template_permissions) |
| used_in_groups | Group Role | One-to-Many | Group roles created from this template |

**Business Rules:**

1. **Blueprint Pattern**: Templates serve as starting points for group roles
2. **System vs Custom**: Core templates are system-defined, users can create custom ones (future)
3. **Non-destructive Updates**: Updating template doesn't change existing group roles
4. **Platform Admin Only**: Only platform admins can modify system templates

**Core System Templates:**
- Platform Admin Role Template
- Group Leader Role Template
- Travel Guide Role Template
- Member Role Template
- Observer Role Template

---

#### 4b. Group Role

**Description**: Instance of a role within a specific group (customizable).

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| group_id | UUID | Yes | Group this role belongs to |
| name | String | Yes | Role name (unique within group) |
| created_from_role_template_id | UUID | No | Source template (for reference) |
| created_at | Timestamp | Yes | Creation date |
| updated_at | Timestamp | Yes | Last update |

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| belongs_to | Group | Many-to-One | Group this role is defined in |
| has_permissions | Permission | Many-to-Many | Permissions granted (via group_role_permissions) |
| assigned_to | User | Many-to-Many | Users with this role (via user_group_roles) |
| created_from | Role Template | Many-to-One | Source template |

**Business Rules:**

1. **Group-scoped**: Each group has its own set of role instances
2. **Customizable**: Permissions can be modified per group
3. **Multi-assignment**: Multiple users can have the same role
4. **Unique Names**: Role names must be unique within a group
5. **Template Independence**: Changes to group role don't affect template or other groups

---

### 5. Permission

**Description**: Atomic capability (smallest unit of authorization).

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| name | String | Yes | Permission name (unique, e.g., 'invite_members') |
| description | Text | Yes | What this permission allows |
| category | String | Yes | Permission category |
| created_at | Timestamp | Yes | Creation date |

**Categories:**
- `group_management` - Group administration
- `journey_management` - Journey creation/editing
- `journey_participation` - Journey access/progress
- `communication` - Forum/messaging
- `feedback` - Giving/receiving feedback
- `platform_admin` - Platform-wide administration

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| in_role_templates | Role Template | Many-to-Many | Templates containing this permission |
| in_group_roles | Group Role | Many-to-Many | Group roles with this permission |

**Business Rules:**

1. **System-defined**: Permissions are created by platform (not user-editable)
2. **Immutable**: Permission names/categories don't change (only add new ones)
3. **Atomic**: Each permission represents one specific capability
4. **Additive**: Having multiple roles = union of all permissions

**Example:**

```json
{
  "id": "perm_invite_members",
  "name": "invite_members",
  "description": "Invite new members to groups",
  "category": "group_management",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### 6. Enrollment

**Description**: Relationship between user/group and journey.

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | UUID | Yes | Unique identifier |
| journey_id | UUID | Yes | Journey being taken |
| user_id | UUID | No | Enrolled user (if solo) |
| group_id | UUID | No | Enrolled group (if collaborative) |
| enrolled_by_user_id | UUID | Yes | Who created the enrollment |
| enrolled_at | Timestamp | Yes | Enrollment date |
| status | String | Yes | active, completed, paused, frozen |
| status_changed_at | Timestamp | Yes | Last status change |
| completed_at | Timestamp | No | Completion date (if applicable) |
| progress_data | JSONB | No | Progress tracking data |

**Relationships:**

| Relationship | Target Entity | Type | Description |
|--------------|---------------|------|-------------|
| for_journey | Journey | Many-to-One | Journey being taken |
| by_user | User | Many-to-One | User enrolled (if solo) |
| by_group | Group | Many-to-One | Group enrolled (if collaborative) |

**Business Rules:**

1. **Exclusive Type**: Either user_id OR group_id is set (never both)
2. **No Duplicates**: Same user/group cannot enroll in same journey twice
3. **Status Lifecycle**: active → completed OR paused → active OR frozen
4. **Group Enrollment**: All active group members have access to journey content
5. **Progress Tracking**: Each enrollment has independent progress data
6. **Freezing**: Travel guides can freeze journeys to prevent accidental changes

**Status Definitions:**

| Status | Description |
|--------|-------------|
| active | Currently in progress |
| completed | Journey finished |
| paused | Temporarily halted by user/group |
| frozen | Administratively frozen (by travel guide) |

**Progress Data Schema (JSONB):**

```json
{
  "current_step": "step_3",
  "completed_steps": ["step_1", "step_2"],
  "started_at": "2025-01-16T10:00:00Z",
  "last_activity_at": "2025-01-18T14:00:00Z",
  "custom_data": {}
}
```

**Example:**

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "journey_id": "770e8400-e29b-41d4-a716-446655440002",
  "group_id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": null,
  "enrolled_by_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "enrolled_at": "2025-01-16T12:00:00Z",
  "status": "active",
  "status_changed_at": "2025-01-16T12:00:00Z",
  "completed_at": null,
  "progress_data": {
    "current_step": "step_2",
    "completed_steps": ["step_1"],
    "started_at": "2025-01-16T12:00:00Z",
    "last_activity_at": "2025-01-18T10:30:00Z"
  }
}
```

---

## Entity Lifecycle Examples

### Example 1: User Creates Group and Enrolls in Journey

```
1. User "Stefan" registers
   └─> User entity created
   └─> Supabase Auth user created

2. Stefan creates "Marketing Team" group
   └─> Group entity created
   └─> Group roles created (Admin, Travel Guide, Member)
   └─> Stefan assigned Group Leader role

3. Stefan invites Alice to Marketing Team
   └─> Group membership created (Alice → Marketing Team)
   └─> Alice assigned Member role

4. Stefan enrolls Marketing Team in "Leadership Fundamentals" journey
   └─> Enrollment entity created (group enrollment)
   └─> All Marketing Team members gain access to journey

5. Alice completes journey
   └─> Enrollment status updated to 'completed'
   └─> Progress data updated
```

### Example 2: Group Hierarchy with Subgroups

```
1. Stefan creates "Acme Corporation" group
   └─> Group entity created
   └─> Stefan assigned Group Leader

2. Stefan creates "Marketing Team" group
   └─> Group entity created
   └─> Stefan assigned Group Leader

3. Stefan adds "Marketing Team" as member of "Acme Corporation"
   └─> Group membership created (Marketing Team → Acme Corporation)
   └─> Creates parent-child relationship

4. Alice is member of "Marketing Team"
   └─> Alice indirectly connected to "Acme Corporation"
   └─> (Inheritance rules determine Alice's permissions in parent)
```

---

## Domain Validation Rules

### User Validation

```typescript
interface UserValidation {
  email: Email (valid format, unique)
  full_name: String (1-100 chars)
  bio: String (max 500 chars)
  is_active: Boolean (required)
}
```

### Group Validation

```typescript
interface GroupValidation {
  name: String (3-100 chars, required)
  description: String (max 1000 chars)
  label: String (max 50 chars)
  is_public: Boolean (required)
  show_member_list: Boolean (required)
}
```

### Journey Validation

```typescript
interface JourneyValidation {
  title: String (3-200 chars, required)
  description: String (max 2000 chars)
  journey_type: Enum (predefined, user_created, dynamic)
  difficulty_level: Enum (beginner, intermediate, advanced)
  estimated_duration_minutes: Integer (min: 1, max: 10000)
}
```

---

## Domain Events (Future)

These events could be published for real-time updates, notifications, and analytics:

### User Events
- `user.registered`
- `user.activated`
- `user.paused`

### Group Events
- `group.created`
- `group.member_added`
- `group.member_removed`
- `group.role_assigned`
- `group.deleted`

### Journey Events
- `journey.created`
- `journey.published`
- `journey.unpublished`
- `journey.enrolled`
- `journey.completed`
- `journey.frozen`

### Authorization Events
- `role.created`
- `role.permissions_changed`
- `permission.granted`
- `permission.revoked`

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next Review**: After initial entity implementation