# Domain Entities

**Status:** Derived inventory — **canon wins.** Where this document and a pointed-at source disagree, the ADR, canonical core, or service specification is authoritative and this file is the thing to fix.
**Reflects decisions through:** [ADR-U050](decisions/ADR-U050-account-lifecycle-state-machine.md) — the four-state account lifecycle, absorbed into the User entity 2026-09-05 (Cycle COR-E W1, Audit V AC5-3 / R-10). Prior: [ADR-U046](decisions/ADR-U046-step-response-capture.md) (2026-07-09) — the Journeys step substrate and response capture, absorbed 2026-07-26. Like the anatomy, this stamp is checked against the ADR index at every doc-health run (Section 11); a review that finds no entity impact still moves it and says so.
**Scope:** the six Ferd-era core entities below are described in depth (properties, relationships, rules, transitions). Every entity realised after that inventory — Communication, Notifications, Governance, Intelligence, Infrastructure — is carried as a **one-line pointer** in the section "Entities realised since the Ferd-era inventory" near the end: what it is, who owns it, where its contract and substrate live. This file is an orientation, **not the schema of record**: the schema of record is `supabase/migrations/` and the owning feature specs, and on any conflict they win.

This document defines the core business entities in FringeIsland, their properties, relationships, and business logic.

## Overview

FringeIsland is built around six core domain entities:

1. **User** - Individual people using the platform. Canonically this entity is the **FIM** (the base identity); "Member" is the platform-technical synonym for FIM and is used for nothing else. The anonymous, ephemeral **Mist** identity state precedes the FIM and transcends (metamorphoses) into it (ADR-U031). Identity-state and role naming follows the roles core: [`../ecosystem/universe/roles/README.md`](../ecosystem/universe/roles/README.md).
2. **Group** - Flexible organizational units
3. **Journey** - Structured learning experiences. Steps are first-class rows (`journey_steps`) over open kind/family registries, with a per-traveller lived record (`journey_step_instances`) — see Step substrate under the Journey entity (ADR-U044, ADR-U046)
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

**Description**: Individual person with an account on FringeIsland — the **FIM** (base identity) record in the canonical identity-state model ("Member" is the platform-technical synonym for FIM). The anonymous **Mist** state (server-issued anonymous identity, ephemeral own-data, unlinkable presence) precedes this record and becomes it at transcendence/metamorphosis (ADR-U031); the Mist lifecycle is specified at PC-2 Identity. See the roles core ([`../ecosystem/universe/roles/README.md`](../ecosystem/universe/roles/README.md)) for the full taxonomy.

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
2. **Account lifecycle (ADR-U050)**: four states derived from `is_active`, the decommission markers and `deactivation_origin` — see the table below. A `paused` member returns to `active` by their own act; a `suspended` member never does (admin hold, PC-4 Governance); `decommissioned` is terminal for everybody; an off row of unknown origin reads `suspended`.
3. **Auth Integration**: Every user must have a corresponding Supabase Auth record
4. **Multi-Group Membership**: Users can belong to unlimited groups
5. **Multi-Role Assignment**: Users can have multiple roles in the same group

**Account lifecycle (ADR-U050 — the four states and who may move between them):**

| State | Meaning | Derived from | Who moves it |
|-------|---------|--------------|--------------|
| `active` | The member is in the world | `is_active = true`, not decommissioned | — |
| `paused` | The member stepped away, reversibly | `is_active = false`, `deactivation_origin = 'member'` | the member (`pause_own_account` / `reactivate_own_account`, own-row `SECURITY DEFINER` contracts — FEAT-PC017, FEAT-PC005) |
| `suspended` | An admin hold; the member cannot lift it | `is_active = false`, `deactivation_origin = 'admin'` — or unknown | PC-4 Governance (`admin_update_user_status`, FEAT-PC021, ADR-U028) |
| `decommissioned` | Terminal; identity stashed, personal group erased on the reaper's schedule | the decommission markers (`enforce_decommission_invariant`) | PC-4 (`admin_decommission_user`, FEAT-PC021) or the member's own erasure path (`delete_own_account` → consent → `erase_fim_account`, FEAT-PC002) |

Read contract: `get_own_account_state()` (FEAT-PC004) returns the derived state; the Hub renders it (FEAT-H006) and never derives it client-side. The **Mist** is not a state of this machine: it is the anonymous identity that precedes the FIM row (ADR-U031; `is_temporary`, reaped by `reap_expired_mists` unless transcended by `finalise_transcendence`).

**State Transitions:**

```
[Mist] ──transcend (consent)──> [Active] ──pause (self)──> [Paused] ──reactivate (self)──> [Active]
                                   │                                                          
                                   ├──suspend (admin)──> [Suspended] ──reactivate (admin)──> [Active]
                                   │
                                   └──decommission (admin) / erase (self, consent)──> [Decommissioned]  (terminal)
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
| created_by_group_id | UUID | Yes | Group that created the group |
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
4. **Creator Auto-Leadership**: Group creator automatically gets Steward role
5. **Must Have Leader**: Every group must have at least one Steward
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
  "created_by_group_id": "550e8400-e29b-41d4-a716-446655440000",
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
| created_by_group_id | UUID | Yes | Group that created the journey |
| is_published | Boolean | Yes | Published to catalog (default: false) |
| is_public | Boolean | Yes | Publicly visible (default: false) |
| journey_type | String | Yes | Type: predefined, user_created, dynamic |
| content | JSONB | No | **Legacy only (pre-ADR-U044).** Structure now lives in `journey_steps` rows; the U044 migration nulls this on conversion. Non-null = unconverted |
| sequencing_mode | String | Yes | How steps are traversed (default `linear`; ADR-U044 — data only, linear exercised) |
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
| steps | JourneyStep | One-to-Many | Ordered step rows (`journey_steps`) — the live structure; see Step substrate below |
| step_instances | JourneyStepInstance | One-to-Many (via steps) | Per-traveller lived records (`journey_step_instances`), grained by enrolment × traveller personal group × step |

**Business Rules:**

1. **Content Template**: Journeys are content, not organizational units
2. **Reusable**: Same journey can be used by multiple users/groups
3. **Solo and Collaborative**: Supports both individual and group enrollment
4. **Publication Workflow**: Draft → Published → (Optional) Unpublished
5. **Type Evolution**: Predefined (Wave 1/Ferd) → User-created (wave TBD — pending redistribution) → Dynamic (wave TBD — pending redistribution)
6. **Creator Permissions**: Only creator (or platform admin) can edit journey
7. **Freezing**: Journeys can be frozen to prevent changes during active use

**Journey Types:**

| Type | Phase | Description |
|------|-------|-------------|
| predefined | 1 | Platform-created, static A→B paths |
| user_created | 2 | User-created, published to marketplace |
| dynamic | 3 | Adaptive paths based on user actions |

**Step substrate** ([ADR-U044](decisions/ADR-U044-journey-step-model.md), [ADR-U046](decisions/ADR-U046-step-response-capture.md); service spec: [DS-3 Journeys](../platform/domain/journeys.md)):

A journey's steps are **rows, not a JSONB blob.** `journeys.content` held a `steps[]` array until the ADR-U044 migration converted it into `journey_steps` rows and **nulled `content` on every converted journey**. A non-null `content` therefore marks an unconverted legacy row — never read it as the live shape. The step vocabulary is likewise **not** the old sealed `content | activity | assessment` union; sealed vocabularies are forbidden by [ADR-U018](decisions/ADR-U018-no-hardcoded-group-types.md).

| Table | Grain | What it is |
|---|---|---|
| `journey_steps` | one row per step, ordered within its journey | The **single-beat node**: title, order, `required`, `repeatable`, an optional `unlocked_by` self-reference for gating, an optional duration, and an inline `content` payload tagged `pending-DS-4` until DS-4 Content gains substrate |
| `step_kinds` · `content_families` | one row per kind / family | **Open registries, not enums.** A step names its kind by key; each kind carries its `ask_verb`, `change_semantic`, and `captures_response`. New kinds are inserted, never coded ([ADR-U008](decisions/ADR-U008-step-type-extensibility.md), ADR-U018) |
| `journey_step_instances` | *(enrolment × traveller personal group × step)* | The per-traveller **lived record** — that this traveller passed through this step. `completed_at` marks finishing. Withdrawal flips enrolment status rather than deleting, so instances survive |

**The response payload is the most personal data in the system.** `journey_step_instances.response` (JSONB, nullable) holds the traveller's own words — `{body}` by convention and deliberately *not* by constraint, so future step kinds may capture structure without a schema change. `response_updated_at` stamps every effective write, the retraction clear included. Its posture is load-bearing, not incidental:

- **Private by default.** DS-3 invariants 4 and 8: reflections are never visible to Steward or Guide, and never comparative. Progress-sharing consent covers completion facts only — *you can share your garden without sharing your journal.*
- **Contract-only.** The table has RLS enabled with **zero policies and zero grants**. A direct PostgREST caller — including a Mist holding `authenticated` — can neither read nor write it around the owning verbs ([ADR-U038](decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md)).
- **Forgotten and disclosed correctly.** Erased with the enrolment cascade ([ADR-U031](decisions/ADR-U031-mist-identity-lifecycle.md)); exported under right-of-access.

**Journey content (legacy JSONB, pre-ADR-U044):**

```json
{
  "version": "1.0",
  "structure": "linear" | "branching" | "adaptive",
  "steps": [ { "id": "step_1", "title": "…", "type": "…", "duration_minutes": 30, "required": true } ],
  "resources": [],
  "metadata": {}
}
```

Retained only so an unconverted row is recognisable. **Do not build against this shape** — `journey_steps` is the live model.

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
  "created_by_group_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_published": true,
  "is_public": true,
  "journey_type": "predefined",
  "content": null,
  "sequencing_mode": "linear",
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
- Steward Role Template
- Guide Role Template
- Participant Role Template *(per-group role renamed from "Member", ratified 2026-06-10 — "Member" remains purely the platform synonym for FIM; see the roles core, [`../ecosystem/universe/roles/README.md`](../ecosystem/universe/roles/README.md). The on-disk `role_templates` TEXT value still says "Member"; the code/data rename is deferred with the code correction target.)*
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
6. **Freezing**: Guides can freeze journeys to prevent accidental changes

**Status Definitions:**

| Status | Description |
|--------|-------------|
| active | Currently in progress |
| completed | Journey finished |
| paused | Temporarily halted by user/group |
| frozen | Administratively frozen (by guide) |

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
   └─> Group roles created (Admin, Guide, Participant)
   └─> Stefan assigned Steward role

3. Stefan invites Alice to Marketing Team
   └─> Group membership created (Alice → Marketing Team)
   └─> Alice assigned Participant role

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
   └─> Stefan assigned Steward

2. Stefan creates "Marketing Team" group
   └─> Group entity created
   └─> Stefan assigned Steward

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

## Entities realised since the Ferd-era inventory

One line each — what it is, who owns it, where to read the contract (the feature spec) and the substrate (the migration that created it; the ownership manifest at `supabase/ownership.manifest.json` is the canonical owner list). None of these is described in depth here by design (R-10, 2026-09-05).

| Entity | Owner | What it is | Contract / substrate |
|--------|-------|------------|----------------------|
| Conversation, Message, Conversation participant | DS-5 Communication | Direct messages and group conversations (`conversation_kinds` is an open registry); sealed on group closure, read by admins only through a declared composition (ADR-U047 A3) | [`../platform/domain/communication.md`](../platform/domain/communication.md) · FEAT-PD008 · FEAT-PD018 · `conversations`, `messages`, `conversation_participants` |
| Forum post | DS-5 Communication | Flat-threaded group forum with wielded (as-the-group) authorship (FEAT-PD019) and moderation | FEAT-PD009 · `forum_posts` |
| Announcement | DS-5 Communication | The durable announcements home, routed onto the delivery substrate (ADR-U049); community and platform scope | FEAT-PD011 · `announcements` |
| Content report | DS-5 Communication (store) · PC-4 Governance (resolution wall) | A member's report on content, resolved by the Console through the declared `admin_resolve_content_report` → `ds5_moderation_resolve_report` composition | FEAT-PD011 · FEAT-PC022 (ADM-D) · `content_reports` |
| Notification | `vertical:notifications` (substrate) · DS-5 (routing above it) | The delivery substrate every tier writes as an obligation (ADR-U048); kinds, categories, channels and action types are open registries; typed responses (ADR-U051) | [`../verticals/notifications/SPECIFICATION.md`](../verticals/notifications/SPECIFICATION.md) · FEAT-PD013/PD014/PD015/PD016/PD017/PD020/PD021 · `notifications`, `notification_kinds`, `notification_categories`, `notification_channels`, `notification_action_types`, `notification_preferences` |
| Consent record, Consent purpose | PC-2 Identity | Append-only consent ledger written at transcendence and credentialed sign-up (ADR-U034); the purpose catalogue | FEAT-PC006/PC007 · `consent_records`, `consent_purposes` |
| Audit row | PC-4 Governance | The append-only `admin_audit_log`: every Console act and the four durable member-auth moments (`record_auth_event`, FEAT-PC019); kept forever by declared retention | FEAT-PC022 · `admin_audit_log` |
| Journal entry | DS-7 Intelligence | The member's private journal — own-row only, "nothing depends on DS-7" | FEAT-PD001 · `journal_entries` |
| Telemetry event | PC-1 Infrastructure | Content-free fire-and-forget events, deny-all RLS, 90-day prune, aggregates computed on read (ADR-U052) | FEAT-PC018 · `telemetry_events` |
| Reaper run | PC-2 Identity | The Mist / member-deletion reaper's run log (ADR-U033), 30-day retention | FEAT-PC002 · `reaper_runs` |
| Role template version, publication | PC-3 Organisation | Versioned role templates with publication reach (where a template is offerable) | FEAT-PC025 · FEAT-PC028 · `role_template_versions`, `role_template_publications` |
| Pending e-mail invitation | PC-3 Organisation | Referral-to-the-platform, never a pre-committed membership (ADR-U040) | FEAT-PC012 · `pending_email_invitations` |
| Journey step, Step instance, Step kind, Content family | DS-3 Journeys | Steps as first-class rows over open registries; the per-traveller lived record (ADR-U044/U046) — described under the Journey entity above | FEAT-PD003/PD007 · `journey_steps`, `journey_step_instances`, `step_kinds`, `content_families` |

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

**Document Version**: 1.1 (2026-09-05 — ADR-U050 absorbed; the entities-since table added; scope re-stated per Audit V R-10)  
**Last Updated**: 2026-09-05  
**Next Review**: After initial entity implementation