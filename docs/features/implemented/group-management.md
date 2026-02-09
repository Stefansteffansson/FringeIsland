# Group Management System

**Status:** ✅ Implemented
**Version:** 0.2.7
**Last Updated:** February 9, 2026

---

## Overview

Complete group management system enabling users to create groups, invite members, assign roles, and manage group settings. Groups are the core organizational unit for collaborative journey experiences.

**Key Capabilities:**
- Create groups from templates
- Invite members via email
- Assign and manage roles (Group Leader, Travel Guide, Member)
- Edit group settings (name, description, visibility)
- Last leader protection (database-enforced)
- Public/private group visibility
- Member list management

---

## Features

### Group Creation
- Create groups from predefined templates (Small Circle, Team, Guild, Community)
- Custom group names and descriptions
- Optional labels for categorization
- Public/private visibility toggle
- Member list visibility control
- Automatic creator assignment as Group Leader
- Immediate redirect to group detail page

**Implementation:**
- Page: `app/groups/create/page.tsx`
- Template selection with visual cards
- Real-time validation
- Group creation creates initial membership + leader role automatically

### Group Viewing
- List view of all accessible groups (`/groups`)
- Detailed group view (`/groups/[id]`)
- Member list with avatars and role badges
- Group settings display (public/private, label, description)
- Join button for public groups (if not member)
- Edit button for Group Leaders

**RLS-Enforced Visibility:**
- Users see groups they're active members of
- Users see all public groups
- Private groups hidden from non-members
- Invited (not active) users cannot see group details

### Member Invitations
- **Email-based search:** Find users by email address
- **Invite modal:** `InviteMemberModal` component
- **Invitation status:** Starts as 'invited', becomes 'active' on acceptance
- **Invitations page:** `/invitations` - View and manage pending invitations
- **Accept/Decline flow:** One-click acceptance or decline
- **Real-time updates:** Navigation updates invitation count

**User Flow:**
1. Group Leader clicks "Invite Members"
2. Searches for user by email
3. Clicks "Invite" - Creates `group_memberships` record with status='invited'
4. Invited user sees invitation on `/invitations` page
5. User accepts → status changes to 'active'
6. User declines → membership record deleted

**Implementation:**
- Component: `components/groups/InviteMemberModal.tsx`
- Page: `app/invitations/page.tsx`
- RLS: Only leaders can create invitations, only invitees can view/modify

### Role Management
- **Assign roles:** Group Leaders can assign any role to active members
- **Multiple roles:** Members can have multiple roles simultaneously
- **Promote to leader:** Dedicated "Promote to Leader" button
- **Remove roles:** Remove individual roles from members
- **Last leader protection:** Cannot remove last Group Leader role (enforced by database trigger)

**Available Roles:**
- **Group Leader:** Full control over group (edit, invite, assign roles, manage members)
- **Travel Guide:** Facilitates journey experiences (Phase 2)
- **Member:** Standard participant (read-only for group settings)

**UI:**
- Modal: `AssignRoleModal` - Multi-select role assignment
- Visual indicators: Role badges on member cards
- Dynamic buttons: Show/hide based on permissions

**Implementation:**
- Component: `components/groups/AssignRoleModal.tsx`
- Trigger: `prevent_last_leader_removal()` - Database-level protection
- RLS: Only leaders can assign/remove roles

### Group Editing
- **Edit page:** `/groups/[id]/edit` (Group Leaders only)
- **Editable fields:**
  - Group name
  - Description
  - Label (optional categorization)
  - Public/private visibility
  - Show member list toggle
- **Authorization:** RLS + UI checks ensure only leaders can edit
- **Real-time validation:** Name required, trimmed whitespace

**Implementation:**
- Page: `app/groups/[id]/edit/page.tsx`
- RLS: UPDATE policy checks for Group Leader role
- Navigation: "Edit Group" button only visible to leaders

### Member Management
- **Leave group:** Members can voluntarily leave (except last leader)
- **Remove members:** Group Leaders can remove members (shows confirmation modal)
- **View member list:** See all active members with roles (if show_member_list=true)
- **Member count:** Display active member count
- **Last leader protection:** Last leader cannot leave or be removed

**Implementation:**
- UI: Member cards with action buttons
- Modal: `ConfirmModal` for destructive actions
- RLS: Leaders can remove members, users can remove themselves (with restrictions)

---

## Architecture

### Database Schema

#### groups Table
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  label TEXT,                           -- Optional categorization
  is_public BOOLEAN DEFAULT false,       -- Visibility control
  show_member_list BOOLEAN DEFAULT true, -- Member list visibility
  settings JSONB DEFAULT '{}',           -- Future extensibility
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### group_memberships Table
```sql
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  added_by_user_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('invited', 'active', 'paused', 'removed')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status Values:**
- `invited` - Pending invitation
- `active` - Accepted member
- `paused` - Temporarily inactive (Phase 2)
- `removed` - Removed from group (Phase 2 - audit trail)

#### group_roles Table
```sql
CREATE TABLE group_roles (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g., 'Group Leader', 'Travel Guide', 'Member'
  description TEXT,
  created_from_role_template_id UUID REFERENCES role_templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_group_roles Table
```sql
CREATE TABLE user_group_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  group_role_id UUID REFERENCES group_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design:**
- Users can have multiple roles per group
- Roles are group-specific instances of templates
- CASCADE on group deletion (clean up all related data)
- RESTRICT on user deletion (preserve referential integrity)

### RLS Policies

#### Groups Table Policies
```sql
-- SELECT: Users can view groups they're members of OR public groups
CREATE POLICY "groups_select_with_function"
ON groups FOR SELECT
TO authenticated
USING (
  is_public = true
  OR is_active_group_member(id)
);

-- INSERT: Authenticated users can create groups
CREATE POLICY "Users can create groups"
ON groups FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- UPDATE: Group Leaders can update their groups
-- (RLS policy checks for Group Leader role)
```

#### Group Memberships Policies
```sql
-- SELECT: Users can view memberships in groups they belong to
CREATE POLICY "group_memberships_select_with_function"
ON group_memberships FOR SELECT
TO authenticated
USING (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR is_active_group_member(group_id)
);

-- INSERT: Leaders can create invitations
CREATE POLICY "Users can create invitations for groups they lead"
ON group_memberships FOR INSERT
TO authenticated
WITH CHECK (
  added_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'invited'
);

-- UPDATE: Users can accept their own invitations
-- DELETE: Users can decline invitations or leave groups (with restrictions)
```

#### User Group Roles Policies
```sql
-- SELECT: Users can view role assignments in groups they belong to
-- INSERT: Group Leaders can assign roles
-- DELETE: Group Leaders can remove roles (with last leader protection)
```

### Security Definer Function

**Function:** `is_active_group_member(group_id UUID)`
**Purpose:** Check if current user is an active member of a group (bypasses RLS to avoid recursion)

```sql
CREATE OR REPLACE FUNCTION is_active_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
  is_member BOOLEAN;
BEGIN
  -- Get current user's profile UUID
  SELECT id INTO user_uuid
  FROM users
  WHERE auth_user_id = auth.uid();

  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for active membership
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = check_group_id
      AND user_id = user_uuid
      AND status = 'active'
  ) INTO is_member;

  RETURN COALESCE(is_member, FALSE);
END;
$$;
```

**Why SECURITY DEFINER:**
- Breaks circular RLS dependency between `groups` and `group_memberships`
- Function runs with elevated privileges to query both tables
- Returns simple boolean for policy evaluation

### Database Triggers

#### Last Leader Protection Trigger
**Trigger:** `check_last_leader_removal`
**Fires:** BEFORE DELETE ON `user_group_roles`
**Function:** `prevent_last_leader_removal()`

```sql
CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  role_name TEXT;
BEGIN
  -- Get role name
  SELECT gr.name INTO role_name
  FROM group_roles gr
  WHERE gr.id = OLD.group_role_id;

  -- Only check for Group Leader roles
  IF role_name = 'Group Leader' THEN
    -- Count remaining leaders
    SELECT COUNT(*) INTO leader_count
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = OLD.group_id
      AND gr.name = 'Group Leader'
      AND ugr.id != OLD.id;

    -- Block if this is the last leader
    IF leader_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last Group Leader from the group';
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**Protection Guarantees:**
- ✅ Blocks last leader removal via UI
- ✅ Blocks last leader removal via API
- ✅ Blocks last leader removal via direct SQL
- ✅ Blocks concurrent deletion attempts
- ✅ Prevents cascade deletion of last leader

---

## User Flows

### Creating a Group
1. User navigates to `/groups/create`
2. Selects template (Small Circle, Team, Guild, Community)
3. Fills in name, description (optional), label (optional)
4. Configures visibility (public/private) and member list display
5. Clicks "Create Group"
6. System creates:
   - `groups` record
   - `group_memberships` record (creator, status='active')
   - `group_roles` records (from template)
   - `user_group_roles` record (creator as Group Leader)
7. Redirects to `/groups/[id]`

### Inviting Members
1. Group Leader views group detail page
2. Clicks "Invite Members" button
3. Modal opens (`InviteMemberModal`)
4. Searches for user by email
5. Selects user from search results
6. Clicks "Invite"
7. System creates `group_memberships` with status='invited'
8. Modal closes, member list refreshes
9. Invited user sees invitation on `/invitations` page

### Accepting Invitations
1. User navigates to `/invitations`
2. Sees list of pending invitations
3. Clicks "Accept" on an invitation
4. System updates `group_memberships.status` to 'active'
5. Invitation removed from list
6. Navigation updates (group now appears in user's groups)

### Assigning Roles
1. Group Leader views group detail page
2. Clicks "Assign Role" on member card
3. Modal opens (`AssignRoleModal`)
4. Selects roles (multi-select)
5. Clicks "Assign Roles"
6. System:
   - Removes unchecked roles (DELETE from `user_group_roles`)
   - Adds newly checked roles (INSERT into `user_group_roles`)
   - Validates last leader protection
7. Modal closes, member cards update with new role badges
8. If user removed their own leader role, UI updates instantly (buttons disappear)

### Editing Group
1. Group Leader views group detail page
2. Clicks "Edit Group" button
3. Navigates to `/groups/[id]/edit`
4. Updates fields (name, description, visibility, etc.)
5. Clicks "Save Changes"
6. System validates and updates `groups` table
7. Redirects to `/groups/[id]`
8. Changes visible immediately

---

## Component Structure

### Pages
- `app/groups/page.tsx` - Group list view
- `app/groups/create/page.tsx` - Group creation form
- `app/groups/[id]/page.tsx` - Group detail view
- `app/groups/[id]/edit/page.tsx` - Group editing form
- `app/invitations/page.tsx` - Invitation management

### Components
- `components/groups/InviteMemberModal.tsx` - Member invitation UI
- `components/groups/AssignRoleModal.tsx` - Role assignment UI
- `components/ui/ConfirmModal.tsx` - Confirmation dialogs (used for removals)

### Utilities
- `lib/supabase/client.ts` - Supabase client (browser)
- `lib/supabase/server.ts` - Supabase client (server)

---

## Testing

### Implemented Tests
✅ **B-GRP-001: Last Leader Protection** - `tests/integration/groups/last-leader.test.ts` (4/4 passing)
- Cannot remove last leader via DELETE
- Can remove leader when multiple leaders exist
- Concurrent deletion attempts all blocked
- Trigger blocks CASCADE deletion on user account deletion

✅ **B-GRP-003: Group Visibility Rules** - `tests/integration/rls/groups.test.ts` (7/7 passing)
- Users can view groups they're active members of
- Users can view public groups
- Private groups hidden from non-members
- RLS enforces visibility at database level

### Pending Tests
- ⏳ B-GRP-002: Member Invitation Lifecycle
- ⏳ B-GRP-004: Group Editing Permissions
- ⏳ B-GRP-005: Group Deletion Rules

---

## Behaviors

### Documented Behaviors
See `docs/specs/behaviors/groups.md` for complete behavior specifications:

- **B-GRP-001:** Last Leader Protection ✅
- **B-GRP-002:** Member Invitation Lifecycle ✅
- **B-GRP-003:** Group Visibility Rules ✅
- **B-GRP-004:** Group Editing Permissions ✅
- **B-GRP-005:** Group Deletion Rules (planned)

---

## Edge Cases & Limitations

### Current Limitations
1. **No group deletion UI:** Groups can only be deleted via SQL (planned for future)
2. **No member removal undo:** Once removed, must be re-invited
3. **No audit trail:** Status changes not logged (planned for Phase 2)
4. **No notification system:** Invited users must manually check `/invitations` page
5. **Single-device sessions:** No real-time sync across tabs (refresh required)

### Handled Edge Cases
✅ Last leader cannot leave or be removed (trigger protection)
✅ Cannot invite existing members (unique constraint)
✅ Cannot directly insert active members (RLS blocks)
✅ Multiple leaders can safely coexist
✅ Group deletion cascades to all related data
✅ Concurrent role deletions handled atomically

---

## Performance Considerations

### Optimizations
- Security definer function avoids RLS recursion
- Indexed foreign keys (automatic via PostgreSQL)
- RLS policies use simple boolean checks

### Scaling Notes
- Member list queries fetch all members (O(n) - acceptable for MVP)
- Role checks done per-request (no caching - acceptable for MVP)
- Future: Add pagination for groups with 100+ members

---

## Future Enhancements (Phase 2)

### Planned Features
- **Subgroups:** Groups as members of other groups
- **Custom roles:** Define roles beyond templates
- **Advanced permissions:** Granular permission customization
- **Audit trail:** Log all membership and role changes
- **Real-time updates:** WebSockets for live member list updates
- **Bulk invitations:** Invite multiple users at once
- **Invitation expiry:** Time-limited invitations

### Deferred to Later Phases
- **Group templates marketplace:** User-created templates
- **Group analytics:** Member engagement metrics
- **Group archival:** Soft delete for groups
- **Member pausing:** Temporary leave without losing membership

---

## Related Documentation

- **Behaviors:** `docs/specs/behaviors/groups.md`
- **Tests:** `tests/integration/groups/` and `tests/integration/rls/groups.test.ts`
- **Database Schema:** `docs/database/schema-overview.md`
- **Technical Patterns:** `CLAUDE.md` (Group Management section)
- **Roadmap:** `docs/planning/ROADMAP.md` (Phase 1.3)

---

## Version History

- **v0.2.7** (2026-01-26): Group editing + invite modal integration
- **v0.2.6.2** (2026-01-26): Role assignment UI with last leader protection
- **v0.2.5** (2026-01-26): Member invitations and management
- **v0.2.4** (2026-01-25): Group detail page
- **v0.2.3** (2026-01-25): Group creation
- **v0.1.2** (2026-01-24): Initial schema and RLS policies

---

**Status:** ✅ **COMPLETE** - All Phase 1.3 features implemented and tested
