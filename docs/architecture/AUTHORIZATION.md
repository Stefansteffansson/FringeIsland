# Authorization System

This document defines the FringeIsland authorization system, including roles, permissions, inheritance rules, and access control patterns.

## Overview

FringeIsland uses a **flexible, context-based authorization system** built on three core layers:

1. **Permissions** - Atomic capabilities (e.g., `invite_members`)
2. **Role Templates** - System-level blueprints for roles
3. **Group Roles** - Role instances within specific groups (customizable)

This enables:
- ✅ Different permissions in different contexts (Stefan is Admin in Group A, Member in Group B)
- ✅ Multiple roles per user per group (Stefan is both Group Leader AND Travel Guide)
- ✅ Customizable permissions per group (Admin role in Group A ≠ Admin role in Group B)
- ✅ Template-based consistency with full flexibility

## Core Authorization Concepts

### Permissions (Atomic Capabilities)

**Permissions** are the smallest unit of authorization - specific actions a user can perform.

**Examples:**
- `invite_members` - Can invite new members to a group
- `view_journey_content` - Can access journey materials
- `assign_roles` - Can assign roles to members
- `edit_group_settings` - Can modify group name, description, settings

**Permission Categories:**
- `group_management` - Group administration
- `journey_management` - Journey creation/editing
- `journey_participation` - Journey access/progress
- `communication` - Forum/messaging
- `feedback` - Giving/receiving feedback
- `platform_admin` - Platform-wide administration

**See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete permission list.**

### Role Templates (System Blueprints)

**Role Templates** are predefined collections of permissions that serve as starting points for groups.

**Core Role Templates:**

#### 1. Platform Admin Role Template
**Purpose**: Platform-wide administration (for FringeIsland staff)

**Key Permissions:**
- `manage_platform_settings`
- `manage_all_groups`
- `manage_role_templates`
- `manage_group_templates`
- `view_platform_analytics`

**Typical Use**: Assigned to FringeIsland core team members

---

#### 2. Group Leader Role Template
**Purpose**: Manage and lead a specific group (people-focused)

**Key Permissions:**
- `edit_group_settings`
- `invite_members`
- `remove_members`
- `activate_members`
- `pause_members`
- `assign_roles`
- `remove_roles`
- `view_member_list`
- `view_member_profiles`
- `set_group_visibility`
- `control_member_list_visibility`
- `enroll_group_in_journey`
- `view_others_progress`
- `track_group_progress`

**Typical Use**: Auto-assigned to group creator, transferable to other members

**Special Rules:**
- Every group must have at least one Group Leader
- If last Group Leader is removed, role defaults to Platform Admin
- Group Leader can assign any role (including Group Leader) to members

---

#### 3. Travel Guide Role Template
**Purpose**: Facilitate journeys and provide guidance to members

**Key Permissions:**
- `view_journey_content`
- `view_others_progress`
- `track_group_progress`
- `provide_feedback_to_members`
- `view_member_feedback`
- `post_forum_messages`
- `send_direct_messages`
- `view_forum`
- `reply_to_messages`

**Typical Use**: Assigned to facilitators/instructors within groups

**Note**: Does NOT include group management permissions (invite/remove members, etc.)

---

#### 4. Member Role Template
**Purpose**: Standard participant in groups and journeys

**Key Permissions:**
- `enroll_self_in_journey`
- `view_journey_content`
- `complete_journey_activities`
- `view_own_progress`
- `receive_feedback`
- `post_forum_messages`
- `send_direct_messages`
- `view_forum`
- `reply_to_messages`

**Typical Use**: Default role for most group members

---

#### 5. Observer Role Template
**Purpose**: View-only access (for stakeholders, parents, managers)

**Key Permissions:**
- `view_journey_content`
- `view_others_progress` (if granted)
- `view_forum`

**Typical Use**: External stakeholders who need visibility but not participation

---

### Group Roles (Instances)

**Group Roles** are instances of roles within specific groups, copied from Role Templates but customizable.

**Example:**

```
"Marketing Team" Group has:
├─ Admin (Group Role) 
│  ├─ Created from: Group Leader Role Template
│  ├─ Permissions: [customized for Marketing Team]
│  └─ Assigned to: Stefan
│
├─ Travel Guide (Group Role)
│  ├─ Created from: Travel Guide Role Template
│  ├─ Permissions: [default from template]
│  └─ Assigned to: Stefan, Alice
│
└─ Member (Group Role)
   ├─ Created from: Member Role Template
   ├─ Permissions: [default from template]
   └─ Assigned to: Bob, Carol, David
```

**Key Points:**
- Group Roles are **specific to each group**
- Multiple users can have the same Group Role
- Same user can have multiple Group Roles in the same group
- Permissions can be customized per Group Role per group

## Authorization Flows

### Group Creation Flow

```
1. User clicks "Create Group"
   └─> System checks: Does user have 'create_group' permission?
       (In any group they belong to)

2. User selects "Small Team Template"
   └─> System creates:
       ├─ Group record: "Marketing Team"
       ├─ Group Roles (copied from template):
       │   ├─ Admin (from Group Leader Role Template)
       │   ├─ Travel Guide (from Travel Guide Role Template)
       │   └─ Member (from Member Role Template)
       └─ User Group Role: assigns creator as "Admin"

3. User can now customize:
   ├─ Role names (rename "Admin" to "Team Lead")
   ├─ Role permissions (add/remove specific permissions)
   └─ Assign roles to other members
```

### Permission Check Flow

**Question**: Can Stefan invite Alice to Marketing Team?

```
1. Identify context: Marketing Team
2. Get Stefan's roles in Marketing Team:
   └─> Stefan has: ["Admin", "Travel Guide"]
3. For each role, check permissions:
   └─> Admin role permissions:
       └─> invite_members: ✓ GRANTED
4. Result: ✓ ALLOWED
```

**Question**: Can Bob (Member) assign roles in Marketing Team?

```
1. Identify context: Marketing Team
2. Get Bob's roles in Marketing Team:
   └─> Bob has: ["Member"]
3. For each role, check permissions:
   └─> Member role permissions:
       └─> assign_roles: ✗ NOT GRANTED
4. Result: ✗ DENIED
```

### Multi-Role Example

**Stefan's roles in Marketing Team:**
- Group Leader (manage people, settings)
- Travel Guide (facilitate journeys, provide feedback)

**Stefan's combined permissions:**
```
From Group Leader:
├─ invite_members ✓
├─ remove_members ✓
├─ assign_roles ✓
└─ edit_group_settings ✓

From Travel Guide:
├─ provide_feedback_to_members ✓
├─ view_others_progress ✓
└─ track_group_progress ✓

Combined: Stefan has ALL permissions from BOTH roles
```

## Permission Inheritance (Deferred)

**Current Status**: Permission inheritance between parent and child groups is **deferred to later phases**.

**Design Notes for Future Implementation:**

Permission inheritance will be **configurable per relationship**, not globally enforced.

**Potential Inheritance Patterns:**

### Pattern 1: Parent → Child (Cascade Down)
```
Acme Corp (Parent)
├─ Stefan is Admin
└─ Marketing Team (Child)
    └─> Stefan automatically has Admin in Marketing Team
```

**Use Case**: Organizational hierarchies where parent admins need control over child groups

### Pattern 2: Child → Parent (Bubble Up)
```
Marketing Team (Child)
├─ Stefan is Admin
└─ Acme Corp (Parent)
    └─> Stefan automatically has Observer in Acme Corp
```

**Use Case**: Visibility/reporting where child leaders need access to parent context

### Pattern 3: Isolated (No Inheritance)
```
Acme Corp (Parent)
├─ Stefan is Admin
└─ Marketing Team (Child)
    └─> Stefan has NO automatic roles in Marketing Team
```

**Use Case**: Groups that want full isolation/autonomy

**Configuration**: 
- Stored in `groups.settings` JSONB field
- Example: `{"inheritance": "parent_to_child"}` or `{"inheritance": "isolated"}`

**See [DEFERRED_DECISIONS.md](../planning/DEFERRED_DECISIONS.md) for details.**

## Access Control Patterns

### Pattern 1: Direct Permission Check

**Use Case**: Simple actions (view content, post message)

```typescript
async function canUserPerformAction(
  userId: string,
  groupId: string,
  permissionName: string
): Promise<boolean> {
  // Query: Does user have a role in this group with this permission?
  const result = await db
    .from('user_group_roles')
    .select(`
      group_role_id,
      group_roles!inner (
        group_role_permissions!inner (
          permission_id,
          granted,
          permissions!inner (name)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('group_roles.group_role_permissions.permissions.name', permissionName)
    .eq('group_roles.group_role_permissions.granted', true);
  
  return result.data.length > 0;
}
```

### Pattern 2: Bulk Permission Load

**Use Case**: Loading user's full permission set for a group (cache for session)

```typescript
async function getUserPermissionsInGroup(
  userId: string,
  groupId: string
): Promise<string[]> {
  const result = await db
    .from('user_group_roles')
    .select(`
      group_roles!inner (
        group_role_permissions!inner (
          granted,
          permissions!inner (name)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('group_roles.group_role_permissions.granted', true);
  
  const permissions = new Set<string>();
  result.data.forEach(ugr => {
    ugr.group_roles.group_role_permissions.forEach(grp => {
      permissions.add(grp.permissions.name);
    });
  });
  
  return Array.from(permissions);
}
```

### Pattern 3: Row Level Security (Database-enforced)

**Use Case**: Automatic permission enforcement at database level

```sql
-- Example: Users can only view groups they're members of
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND status = 'active'
    )
  );
```

**See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete RLS policies.**

## Special Authorization Rules

### Rule 1: Group Leader Safeguard

**Requirement**: Every group must have at least one Group Leader.

**Enforcement:**
```
When removing a Group Leader role from a user:
1. Check: Are there other Group Leaders in this group?
   ├─ YES → Allow removal
   └─ NO  → Block removal OR default to Platform Admin

When deleting a group:
1. Group Leader role can delete group
2. Cascading delete removes all members, roles, enrollments
```

### Rule 2: Platform Admin Fallback

**Scenario**: Group has no Group Leader (edge case)

**Behavior**:
- Platform Admin automatically inherits Group Leader capabilities for that group
- Platform Admin can assign new Group Leader from existing members
- Acts as safety net for orphaned groups

### Rule 3: Creator Auto-Assignment

**Behavior**: When user creates a group:
```
1. User creates "Marketing Team"
2. System automatically assigns creator:
   └─> Group Leader role in "Marketing Team"
3. Creator can later:
   ├─ Assign Group Leader to another member
   └─> Remove Group Leader from themselves (if another exists)
```

### Rule 4: Multi-Role Permissions are Additive

**Scenario**: User has multiple roles in the same group

**Behavior**:
```
Stefan has:
├─ Group Leader: [invite_members, edit_group_settings]
└─ Travel Guide: [provide_feedback, view_progress]

Stefan's effective permissions:
└─> UNION of all role permissions
    = [invite_members, edit_group_settings, provide_feedback, view_progress]
```

## Customization Workflows

### Customizing Role Permissions in a Group

**Scenario**: Marketing Team wants to allow Members to invite new members (unusual)

```
1. Group Leader goes to Group Settings → Roles
2. Selects "Member" role
3. Views current permissions:
   ├─ view_journey_content ✓
   ├─ complete_journey_activities ✓
   ├─ invite_members ✗  <-- Currently disabled
   └─ ...
4. Enables "invite_members" permission
5. System updates group_role_permissions table
6. All users with "Member" role now have invite_members permission
```

### Creating Custom Role in a Group

**Scenario**: Marketing Team needs a "Content Creator" role

```
1. Group Leader goes to Group Settings → Roles
2. Clicks "Create Custom Role"
3. Names role: "Content Creator"
4. Selects base template: "Member Role Template" (starting point)
5. Customizes permissions:
   ├─ Add: create_journey ✓
   ├─ Add: edit_journey ✓
   └─ Keep: Standard member permissions
6. System creates new group_role record
7. Group Leader can now assign "Content Creator" to members
```

## Security Considerations

### Defense in Depth

FringeIsland uses multiple layers of authorization:

1. **Frontend Validation** (UX only, not security)
   - Hide/show UI elements based on permissions
   - Prevent accidental errors

2. **API Route Checks** (Primary enforcement)
   - Every API endpoint checks permissions
   - Rejects unauthorized requests

3. **Row Level Security** (Database enforcement)
   - Supabase RLS policies enforce at DB level
   - Prevents direct database access bypasses

4. **Audit Logging** (Planned - Phase 2+)
   - Log all permission-sensitive actions
   - Track who did what, when

### Permission Check Best Practices

**DO:**
✅ Check permissions at API route level before any action
✅ Use RLS policies as backup enforcement
✅ Cache permission lookups for performance (session-scoped)
✅ Validate group_id matches role's group_id before permission checks

**DON'T:**
❌ Rely only on frontend validation (easily bypassed)
❌ Skip permission checks for "admin" users (check explicitly)
❌ Hard-code permission logic (use database-driven checks)
❌ Cache permissions across sessions (stale data risk)

## Performance Optimization

### Caching Strategy

**Session-scoped Permission Cache:**
```typescript
// Cache user's permissions per group for session duration
const sessionCache = new Map<string, Set<string>>();

async function getCachedPermissions(
  userId: string,
  groupId: string
): Promise<Set<string>> {
  const cacheKey = `${userId}:${groupId}`;
  
  if (!sessionCache.has(cacheKey)) {
    const permissions = await getUserPermissionsInGroup(userId, groupId);
    sessionCache.set(cacheKey, new Set(permissions));
  }
  
  return sessionCache.get(cacheKey)!;
}
```

**Cache Invalidation:**
- Invalidate when user's roles change
- Invalidate when role permissions change
- Clear on session end

### Database Optimization

**Critical Indexes** (see DATABASE_SCHEMA.md):
- `idx_ugr_user_group` - Fast user+group lookup
- `idx_grp_granted` - Fast permission checks
- `idx_memberships_active` - Fast active member queries

**Query Optimization:**
- Use `EXISTS` instead of `IN` for RLS policies
- Preload user's groups on session start
- Consider materialized views for complex permission checks

## Testing Authorization

### Unit Tests

```typescript
describe('Authorization', () => {
  test('Group Leader can invite members', async () => {
    const canInvite = await canUserPerformAction(
      stefanId,
      marketingTeamId,
      'invite_members'
    );
    expect(canInvite).toBe(true);
  });
  
  test('Member cannot assign roles', async () => {
    const canAssign = await canUserPerformAction(
      bobId,
      marketingTeamId,
      'assign_roles'
    );
    expect(canAssign).toBe(false);
  });
  
  test('Multi-role user has combined permissions', async () => {
    const permissions = await getUserPermissionsInGroup(
      stefanId,
      marketingTeamId
    );
    expect(permissions).toContain('invite_members'); // From Group Leader
    expect(permissions).toContain('provide_feedback'); // From Travel Guide
  });
});
```

### Integration Tests

```typescript
describe('Group Creation Authorization', () => {
  test('Creator automatically gets Group Leader role', async () => {
    const group = await createGroup(stefanId, 'New Team');
    const roles = await getUserRolesInGroup(stefanId, group.id);
    
    expect(roles).toContainEqual(
      expect.objectContaining({ name: 'Group Leader' })
    );
  });
  
  test('Cannot remove last Group Leader', async () => {
    await expect(
      removeUserRole(stefanId, groupId, groupLeaderRoleId)
    ).rejects.toThrow('Cannot remove last Group Leader');
  });
});
```

## Future Enhancements

### Phase 2: Advanced Features

- **Temporary Role Assignments**: Time-limited roles (e.g., "Guest Speaker" for 1 week)
- **Conditional Permissions**: Permissions based on context (e.g., can only edit own content)
- **Permission Delegation**: Users can delegate specific permissions temporarily

### Phase 3: Analytics

- **Permission Usage Tracking**: Which permissions are used most
- **Role Effectiveness**: Are custom roles actually needed or just noise?
- **Access Patterns**: Optimize based on real usage

### Phase 4: Advanced Inheritance

- **Inheritance Rules Engine**: More sophisticated parent-child permission flows
- **Role Templates Marketplace**: Share role templates between organizations
- **Dynamic Role Creation**: AI-suggested roles based on group needs

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next Review**: After Phase 1 authorization implementation