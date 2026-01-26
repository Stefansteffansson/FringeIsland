# Database Schema

This document defines the complete PostgreSQL database schema for FringeIsland, including all tables, relationships, indexes, and Row Level Security (RLS) policies for Supabase.

**IMPORTANT:** Tables must be created in the order specified in the "Table Creation Order" section to avoid dependency errors.

## Schema Overview

```
Core Tables:
├── users                      # User accounts and profiles
├── permissions                # Atomic capabilities (system-defined)
├── role_templates             # System-level role blueprints
├── group_templates            # Group creation blueprints
├── groups                     # Flexible organizational units
├── group_memberships          # Users and groups belonging to groups
├── journeys                   # Learning experience templates
├── journey_enrollments        # User/group enrollment in journeys
├── role_template_permissions  # Permissions assigned to role templates
├── group_template_roles       # Roles included in group templates
├── group_roles                # Role instances within specific groups
├── group_role_permissions     # Permissions for group role instances
└── user_group_roles           # User role assignments in groups

Future Tables (Phase 2+):
├── forum_posts
├── messages
├── journey_progress
├── feedback
└── (additional tables as features expand)
```

## Table Creation Order

**CRITICAL:** Create tables in this exact order to avoid foreign key dependency errors:

### Phase 1: Utility Functions
1. `update_updated_at_column()` - Trigger function for timestamp updates

### Phase 2: Base Tables (No Foreign Key Dependencies)
2. `users` - User accounts (references auth.users from Supabase Auth)
3. `permissions` - System-defined capabilities
4. `role_templates` - Role blueprints
5. `group_templates` - Group blueprints

### Phase 3: Core Tables (With Foreign Key Dependencies)
6. `groups` - Organizational units (depends on: users, group_templates)
7. `group_memberships` - Membership tracking (depends on: users, groups)
8. `journeys` - Learning experiences (depends on: users)
9. `journey_enrollments` - Journey participation (depends on: journeys, users, groups)

### Phase 4: Authorization Junction Tables
10. `role_template_permissions` - Role-permission mappings (depends on: role_templates, permissions)
11. `group_template_roles` - Template-role mappings (depends on: group_templates, role_templates)
12. `group_roles` - Group-specific roles (depends on: groups, role_templates)
13. `group_role_permissions` - Group role permissions (depends on: group_roles, permissions)
14. `user_group_roles` - User role assignments (depends on: users, groups, group_roles)

### Phase 5: Seed Data
15. Insert default permissions
16. Insert default role templates
17. Insert default group templates

### Phase 6: Row Level Security
18. Enable RLS on all tables
19. Create RLS policies for each table

---

## Utility Functions

### update_updated_at_column()

Generic trigger function for updating `updated_at` timestamps.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Core Tables

### users

User accounts and profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Supabase Auth integration
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

### permissions

System-defined atomic capabilities.

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,  -- e.g., 'invite_members', 'view_journey_content'
  description TEXT NOT NULL,
  category TEXT NOT NULL,      -- e.g., 'group_management', 'journey_management'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_category ON permissions(category);
```

**Seed Data:**

```sql
INSERT INTO permissions (name, description, category) VALUES
-- Group Management
('create_group', 'Create new groups', 'group_management'),
('edit_group_settings', 'Edit group name, description, settings', 'group_management'),
('delete_group', 'Delete groups', 'group_management'),
('invite_members', 'Invite new members to groups', 'group_management'),
('remove_members', 'Remove members from groups', 'group_management'),
('activate_members', 'Activate paused members', 'group_management'),
('pause_members', 'Pause member accounts', 'group_management'),
('assign_roles', 'Assign roles to members', 'group_management'),
('remove_roles', 'Remove roles from members', 'group_management'),
('view_member_list', 'View list of group members', 'group_management'),
('view_member_profiles', 'View detailed member profiles', 'group_management'),
('set_group_visibility', 'Change group public/private settings', 'group_management'),
('control_member_list_visibility', 'Control member list visibility', 'group_management'),

-- Journey Management
('enroll_group_in_journey', 'Enroll entire group in journeys', 'journey_management'),
('enroll_self_in_journey', 'Enroll self in journeys', 'journey_management'),
('unenroll_from_journey', 'Unenroll from journeys', 'journey_management'),
('freeze_journey', 'Freeze journey progress', 'journey_management'),
('create_journey', 'Create new journeys', 'journey_management'),
('edit_journey', 'Edit journey content', 'journey_management'),
('publish_journey', 'Publish journeys to marketplace', 'journey_management'),
('unpublish_journey', 'Remove journeys from marketplace', 'journey_management'),
('delete_journey', 'Delete journeys', 'journey_management'),

-- Journey Participation
('view_journey_content', 'Access journey materials', 'journey_participation'),
('complete_journey_activities', 'Complete journey activities', 'journey_participation'),
('view_own_progress', 'View own journey progress', 'journey_participation'),
('view_others_progress', 'View other members progress', 'journey_participation'),
('track_group_progress', 'View group-wide progress overview', 'journey_participation'),

-- Communication
('post_forum_messages', 'Post messages in forums', 'communication'),
('send_direct_messages', 'Send direct messages', 'communication'),
('moderate_forum', 'Moderate forum (delete/edit messages)', 'communication'),
('view_forum', 'View forum content', 'communication'),
('reply_to_messages', 'Reply to messages', 'communication'),

-- Feedback
('provide_feedback_to_members', 'Give feedback to members', 'feedback'),
('receive_feedback', 'Receive feedback', 'feedback'),
('view_member_feedback', 'View feedback given to others', 'feedback'),

-- Platform Administration
('manage_platform_settings', 'Manage platform-wide settings', 'platform_admin'),
('manage_all_groups', 'Manage all groups on platform', 'platform_admin'),
('manage_role_templates', 'Create/edit role templates', 'platform_admin'),
('manage_group_templates', 'Create/edit group templates', 'platform_admin'),
('view_platform_analytics', 'View platform-wide analytics', 'platform_admin');
```

---

### role_templates

System-level role blueprints.

```sql
CREATE TABLE role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,  -- e.g., 'Admin Role Template'
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,  -- System vs user-created templates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_role_templates_name ON role_templates(name);
```

**Seed Data:**

```sql
INSERT INTO role_templates (name, description) VALUES
('Platform Admin Role Template', 'Full platform administration capabilities'),
('Group Leader Role Template', 'Manage and lead a specific group'),
('Travel Guide Role Template', 'Facilitate journeys and provide guidance'),
('Member Role Template', 'Standard participant in groups and journeys'),
('Observer Role Template', 'View-only access to group activities');
```

---

### group_templates

Blueprints for creating groups with predefined role sets.

```sql
CREATE TABLE group_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,  -- e.g., 'Small Team Template'
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_group_templates_name ON group_templates(name);
```

**Seed Data:**

```sql
INSERT INTO group_templates (name, description) VALUES
('Small Team Template', 'For teams of 2-10 people'),
('Large Group Template', 'For groups of 10+ people'),
('Organization Template', 'For companies and institutions'),
('Learning Cohort Template', 'For learning groups going through journeys together');
```

---

### groups

Flexible organizational units (teams, organizations, cohorts, etc.).

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  label TEXT,  -- Optional user-defined label (e.g., "Team", "Organization")
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_from_group_template_id UUID REFERENCES group_templates(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  show_member_list BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',  -- Extensible settings (inheritance rules, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_groups_created_by ON groups(created_by_user_id);
CREATE INDEX idx_groups_template ON groups(created_from_group_template_id);
CREATE INDEX idx_groups_public ON groups(is_public) WHERE is_public = true;

-- Triggers
CREATE TRIGGER update_groups_updated_at 
  BEFORE UPDATE ON groups 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

### group_memberships

Tracks membership relationships (User→Group and Group→Group).

**⚠️ UPDATED in v0.2.5:** Status constraint now includes 'invited' for member invitation workflow.

```sql
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  
  -- Either user_id OR member_group_id will be set (not both)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  
  added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Membership status
  -- v0.2.5: Added 'invited' status for invitation workflow
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'paused', 'removed')),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: exactly one of user_id or member_group_id must be set
  CONSTRAINT check_member_type CHECK (
    (user_id IS NOT NULL AND member_group_id IS NULL) OR 
    (user_id IS NULL AND member_group_id IS NOT NULL)
  ),
  
  -- Prevent duplicate memberships
  UNIQUE NULLS NOT DISTINCT (group_id, user_id, member_group_id)
);

-- Indexes
CREATE INDEX idx_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_memberships_member_group ON group_memberships(member_group_id);
CREATE INDEX idx_memberships_status ON group_memberships(status);
CREATE INDEX idx_memberships_active ON group_memberships(group_id, status) WHERE status = 'active';
```

**Status Values (v0.2.5):**
- `'active'` - Member is an active participant in the group
- `'invited'` - User has been invited but has not yet accepted (NEW in v0.2.5)
- `'paused'` - Member account temporarily suspended
- `'removed'` - Member has been removed from group

---

## 🆕 v0.2.5: Database Trigger for Last Leader Protection

### prevent_last_leader_removal()

**NEW in v0.2.5:** Ensures every group always has at least one Group Leader.

```sql
CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader BOOLEAN;
BEGIN
  -- Check if the member being removed is a leader
  SELECT EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE ugr.user_id = OLD.user_id
    AND ugr.group_id = OLD.group_id
    AND gr.name = 'Group Leader'
  ) INTO is_leader;

  -- If not a leader, allow deletion
  IF NOT is_leader THEN
    RETURN OLD;
  END IF;

  -- Count remaining leaders in the group
  SELECT COUNT(DISTINCT ugr.user_id)
  INTO leader_count
  FROM user_group_roles ugr
  JOIN group_roles gr ON gr.id = ugr.group_role_id
  JOIN group_memberships gm ON gm.user_id = ugr.user_id AND gm.group_id = ugr.group_id
  WHERE ugr.group_id = OLD.group_id
  AND gr.name = 'Group Leader'
  AND gm.status = 'active'
  AND ugr.user_id != OLD.user_id;

  -- If this is the last leader, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last leader from the group. Promote another member to leader first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check Last Leader Removal
CREATE TRIGGER check_last_leader_removal
BEFORE DELETE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_last_leader_removal();
```

**Purpose:** Prevents both self-removal (leaving) and leader-removal (kicking) if the user is the last Group Leader.

**Behavior:**
- Fires before any DELETE operation on `group_memberships`
- Checks if user being removed has "Group Leader" role
- If leader, counts remaining active leaders
- If last leader, raises exception and blocks the deletion
- Otherwise, allows deletion to proceed normally

---

### journeys

Learning experience templates that users/groups can enroll in.

```sql
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  journey_type TEXT NOT NULL DEFAULT 'predefined' CHECK (journey_type IN ('predefined', 'user_created', 'dynamic')),
  
  -- Content structure (can be JSON for flexibility)
  content JSONB DEFAULT '{}',
  
  -- Metadata
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_journeys_created_by ON journeys(created_by_user_id);
CREATE INDEX idx_journeys_published ON journeys(is_published) WHERE is_published = true;
CREATE INDEX idx_journeys_public ON journeys(is_public) WHERE is_public = true;
CREATE INDEX idx_journeys_type ON journeys(journey_type);
CREATE INDEX idx_journeys_tags ON journeys USING GIN(tags);

-- Triggers
CREATE TRIGGER update_journeys_updated_at 
  BEFORE UPDATE ON journeys 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

### journey_enrollments

Tracks user and group enrollments in journeys.

```sql
CREATE TABLE journey_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  
  -- Either user_id OR group_id will be set (not both)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  
  enrolled_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'frozen')),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Progress tracking (extensible)
  progress_data JSONB DEFAULT '{}',
  
  -- Constraint: exactly one of user_id or group_id must be set
  CONSTRAINT check_enrollment_type CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR 
    (user_id IS NULL AND group_id IS NOT NULL)
  ),
  
  -- Prevent duplicate enrollments
  UNIQUE NULLS NOT DISTINCT (journey_id, user_id, group_id)
);

-- Indexes
CREATE INDEX idx_enrollments_journey ON journey_enrollments(journey_id);
CREATE INDEX idx_enrollments_user ON journey_enrollments(user_id);
CREATE INDEX idx_enrollments_group ON journey_enrollments(group_id);
CREATE INDEX idx_enrollments_status ON journey_enrollments(status);
CREATE INDEX idx_enrollments_active ON journey_enrollments(journey_id, status) WHERE status = 'active';
```

---

## Authorization Tables

### role_template_permissions

Defines which permissions each role template has.

```sql
CREATE TABLE role_template_permissions (
  role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role_template_id, permission_id)
);

-- Indexes
CREATE INDEX idx_rtp_template ON role_template_permissions(role_template_id);
CREATE INDEX idx_rtp_permission ON role_template_permissions(permission_id);
```

---

### group_template_roles

Defines which role templates are included in each group template.

```sql
CREATE TABLE group_template_roles (
  group_template_id UUID NOT NULL REFERENCES group_templates(id) ON DELETE CASCADE,
  role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,  -- Auto-assigned to group creator
  PRIMARY KEY (group_template_id, role_template_id)
);

-- Indexes
CREATE INDEX idx_gtr_group_template ON group_template_roles(group_template_id);
CREATE INDEX idx_gtr_role_template ON group_template_roles(role_template_id);
```

---

### group_roles

Role instances within specific groups (copied from role templates, customizable).

```sql
CREATE TABLE group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g., 'Admin', 'Travel Guide' (editable)
  created_from_role_template_id UUID REFERENCES role_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, name)  -- Unique role names within a group
);

-- Indexes
CREATE INDEX idx_group_roles_group ON group_roles(group_id);
CREATE INDEX idx_group_roles_template ON group_roles(created_from_role_template_id);

-- Triggers
CREATE TRIGGER update_group_roles_updated_at 
  BEFORE UPDATE ON group_roles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

### group_role_permissions

Permissions assigned to group role instances (customizable per group).

```sql
CREATE TABLE group_role_permissions (
  group_role_id UUID NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (group_role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_grp_role ON group_role_permissions(group_role_id);
CREATE INDEX idx_grp_permission ON group_role_permissions(permission_id);
CREATE INDEX idx_grp_granted ON group_role_permissions(granted) WHERE granted = true;
```

---

### user_group_roles

Assigns users to roles within groups.

```sql
CREATE TABLE user_group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_role_id UUID NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure role belongs to the specified group
  CONSTRAINT check_role_group_match CHECK (
    group_role_id IN (SELECT id FROM group_roles WHERE group_id = user_group_roles.group_id)
  ),
  
  -- Allow multiple roles per user per group, but prevent duplicate role assignments
  UNIQUE (user_id, group_id, group_role_id)
);

-- Indexes
CREATE INDEX idx_ugr_user ON user_group_roles(user_id);
CREATE INDEX idx_ugr_group ON user_group_roles(group_id);
CREATE INDEX idx_ugr_role ON user_group_roles(group_role_id);
CREATE INDEX idx_ugr_user_group ON user_group_roles(user_id, group_id);
```

---

## Row Level Security (RLS) Policies

### users

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Platform admins can view all users
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND p.name = 'manage_all_groups'
        AND grp.granted = true
    )
  );

-- 🆕 v0.2.5: Users can search other users by email (for invitations)
CREATE POLICY "Users can search other users by email for invitations"
  ON users FOR SELECT
  TO authenticated
  USING (true);
```

---

### groups

```sql
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Users can view groups they're members of
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
    OR is_public = true
  );

-- Users with create_group permission can create groups
CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND p.name = 'create_group'
        AND grp.granted = true
    )
  );

-- Group Leaders can update their groups
CREATE POLICY "Group leaders can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ugr.group_id = groups.id
        AND p.name = 'edit_group_settings'
        AND grp.granted = true
    )
  );
```

---

### group_memberships

**🆕 v0.2.5:** Added 6 new RLS policies for member management

```sql
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view memberships of groups they belong to
CREATE POLICY "Users can view group memberships"
  ON group_memberships FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND status = 'active'
    )
  );

-- Group leaders can manage memberships
CREATE POLICY "Group leaders can manage memberships"
  ON group_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ugr.group_id = group_memberships.group_id
        AND p.name IN ('invite_members', 'remove_members', 'activate_members', 'pause_members')
        AND grp.granted = true
    )
  );

-- 🆕 v0.2.5: Leaders can create invitations (status='invited')
CREATE POLICY "Users can create invitations for groups they lead"
  ON group_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'invited'
    AND EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON gr.id = ugr.group_role_id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND ugr.group_id = group_memberships.group_id
      AND gr.name = 'Group Leader'
    )
  );

-- 🆕 v0.2.5: Users can accept their own invitations
CREATE POLICY "Users can accept their own invitations"
  ON group_memberships FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND status = 'invited'
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND status = 'active'
  );

-- 🆕 v0.2.5: Users can decline their own invitations
CREATE POLICY "Users can decline their own invitations"
  ON group_memberships FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND status = 'invited'
  );

-- 🆕 v0.2.5: Members can leave groups (status='active')
CREATE POLICY "Members can leave groups"
  ON group_memberships FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND status = 'active'
  );

-- 🆕 v0.2.5: Leaders can remove members from their groups
CREATE POLICY "Leaders can remove members from their groups"
  ON group_memberships FOR DELETE
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM group_memberships gm
      JOIN user_group_roles ugr ON ugr.user_id = gm.user_id AND ugr.group_id = gm.group_id
      JOIN group_roles gr ON gr.id = ugr.group_role_id
      WHERE gm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND gm.status = 'active'
      AND gr.name = 'Group Leader'
    )
    AND status = 'active'
  );
```

---

### journeys

```sql
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

-- Everyone can view published public journeys
CREATE POLICY "Anyone can view published public journeys"
  ON journeys FOR SELECT
  USING (is_published = true AND is_public = true);

-- Users can view journeys they're enrolled in
CREATE POLICY "Users can view enrolled journeys"
  ON journeys FOR SELECT
  USING (
    id IN (
      SELECT journey_id FROM journey_enrollments 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Users can view their own created journeys
CREATE POLICY "Users can view own journeys"
  ON journeys FOR SELECT
  USING (created_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Users with create_journey permission can create journeys
CREATE POLICY "Users can create journeys"
  ON journeys FOR INSERT
  WITH CHECK (
    created_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = created_by_user_id
        AND p.name = 'create_journey'
        AND grp.granted = true
    )
  );
```

---

### journey_enrollments

```sql
ALTER TABLE journey_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON journey_enrollments FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Users can view enrollments of groups they belong to
CREATE POLICY "Users can view group enrollments"
  ON journey_enrollments FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND status = 'active'
    )
  );

-- Users can enroll themselves in journeys
CREATE POLICY "Users can enroll in journeys"
  ON journey_enrollments FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = user_id
        AND p.name = 'enroll_self_in_journey'
        AND grp.granted = true
    )
  );

-- Group leaders can enroll groups in journeys
CREATE POLICY "Group leaders can enroll groups"
  ON journey_enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ugr.group_id = journey_enrollments.group_id
        AND p.name = 'enroll_group_in_journey'
        AND grp.granted = true
    )
  );
```

---

### permissions

```sql
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view permissions (read-only reference data)
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);
```

---

### role_templates

```sql
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view role templates
CREATE POLICY "Anyone can view role templates"
  ON role_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only platform admins can modify role templates
CREATE POLICY "Platform admins can manage role templates"
  ON role_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND p.name = 'manage_role_templates'
        AND grp.granted = true
    )
  );
```

---

### role_template_permissions

```sql
ALTER TABLE role_template_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view role template permissions
CREATE POLICY "Anyone can view role template permissions"
  ON role_template_permissions FOR SELECT
  TO authenticated
  USING (true);
```

---

### group_templates

```sql
ALTER TABLE group_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group templates"
  ON group_templates FOR SELECT
  TO authenticated
  USING (true);
```

---

### group_template_roles

```sql
ALTER TABLE group_template_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group template roles"
  ON group_template_roles FOR SELECT
  TO authenticated
  USING (true);
```

---

### group_roles

```sql
ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;

-- Users can view roles in groups they belong to
CREATE POLICY "Users can view group roles"
  ON group_roles FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND status = 'active'
    )
  );

-- Group leaders can manage roles
CREATE POLICY "Group leaders can manage roles"
  ON group_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ugr.group_id = group_roles.group_id
        AND p.name = 'assign_roles'
        AND grp.granted = true
    )
  );
```

---

### group_role_permissions

```sql
ALTER TABLE group_role_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view permissions for roles in their groups
CREATE POLICY "Users can view group role permissions"
  ON group_role_permissions FOR SELECT
  USING (
    group_role_id IN (
      SELECT id FROM group_roles 
      WHERE group_id IN (
        SELECT group_id FROM group_memberships 
        WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
          AND status = 'active'
      )
    )
  );
```

---

### user_group_roles

```sql
ALTER TABLE user_group_roles ENABLE ROW LEVEL SECURITY;

-- Users can view role assignments in groups they belong to
CREATE POLICY "Users can view group role assignments"
  ON user_group_roles FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND status = 'active'
    )
  );

-- Group leaders can assign/remove roles
CREATE POLICY "Group leaders can manage role assignments"
  ON user_group_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      JOIN group_role_permissions grp ON gr.id = grp.group_role_id
      JOIN permissions p ON grp.permission_id = p.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ugr.group_id = user_group_roles.group_id
        AND p.name = 'assign_roles'
        AND grp.granted = true
    )
  );
```

---

## 🆕 v0.2.5: Member Management Workflows

### Invitation Workflow

**1. Leader Invites User**
```sql
INSERT INTO group_memberships (group_id, user_id, added_by_user_id, status)
VALUES ('group-uuid', 'user-uuid', 'leader-uuid', 'invited');
```
- Status: `'invited'`
- RLS: Only leaders can create invitations

**2. User Accepts Invitation**
```sql
UPDATE group_memberships 
SET status = 'active' 
WHERE id = 'invitation-uuid' AND status = 'invited';
```
- Status changes: `'invited'` → `'active'`
- RLS: Only the invited user can accept

**3. User Declines Invitation**
```sql
DELETE FROM group_memberships 
WHERE id = 'invitation-uuid' AND status = 'invited';
```
- Record is deleted
- RLS: Only the invited user can decline

### Leave/Remove Workflow

**4. Member Leaves Group**
```sql
DELETE FROM group_memberships 
WHERE group_id = 'group-uuid' AND user_id = 'user-uuid' AND status = 'active';
```
- RLS: User can delete their own membership
- Trigger: Blocks if user is last leader

**5. Leader Removes Member**
```sql
DELETE FROM group_memberships 
WHERE id = 'membership-uuid' AND status = 'active';
```
- RLS: Only leaders can remove others
- Trigger: Blocks if removing last leader

---

## Migration Strategy

### Recommended Approach

Use the provided `fringeisland_migration.sql` file which contains all tables, indexes, triggers, seed data, and RLS policies in the correct order.

### Manual Migration Order

If migrating manually, follow this sequence:

1. **Phase 1:** Utility functions
2. **Phase 2:** Base tables (users, permissions, role_templates, group_templates)
3. **Phase 3:** Core tables with dependencies (groups, group_memberships, journeys, journey_enrollments)
4. **Phase 4:** Authorization junction tables
5. **Phase 5:** Seed data (permissions, role templates, group templates)
6. **Phase 6:** Enable RLS and create policies
7. **🆕 Phase 7 (v0.2.5):** Create last leader protection trigger

---

## Performance Considerations

### Critical Indexes

- User lookups: `idx_users_email`, `idx_users_auth_user_id`
- Group memberships: `idx_memberships_user`, `idx_memberships_group`
- Permission checks: `idx_grp_role`, `idx_grp_granted`
- Journey enrollments: `idx_enrollments_user`, `idx_enrollments_group`

### Query Optimization

- Use `EXISTS` instead of `IN` for RLS policies where possible
- Denormalize frequently accessed data if needed (e.g., cache user's groups)
- Consider materialized views for complex permission checks

### Future Optimizations

- Add Redis caching for permission lookups
- Create database functions for complex permission checks
- Monitor slow query log and optimize

---

## Backup and Recovery

- Supabase handles automated backups
- Point-in-time recovery available
- Export critical data regularly
- Document restore procedures

---

## 🆕 v0.2.5 Changes Summary

### Schema Changes
1. **group_memberships.status** - Added `'invited'` to CHECK constraint
2. **New Trigger Function** - `prevent_last_leader_removal()`
3. **New Trigger** - `check_last_leader_removal` on `group_memberships`

### New RLS Policies (6 total)
1. Users can search other users by email (users table)
2. Users can create invitations for groups they lead (group_memberships)
3. Users can accept their own invitations (group_memberships)
4. Users can decline their own invitations (group_memberships)
5. Members can leave groups (group_memberships)
6. Leaders can remove members from their groups (group_memberships)

### Migration Files
- `20260125_enable_member_invitations.sql`
- `20260125_enable_accept_decline_invitations.sql`
- `20260125_enable_leave_remove_members.sql`

---

**Document Version**: 2.1  
**Last Updated**: January 26, 2026 (v0.2.5)  
**Changes from v2.0**: Added v0.2.5 member management features (status constraint, trigger, 6 RLS policies, workflows)  
**Next Review**: After completing Phase 1.4 (Journey System)
