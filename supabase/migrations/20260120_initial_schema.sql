-- ============================================
-- FringeIsland Database Migration Script
-- Properly ordered to avoid dependency issues
-- ============================================

-- ============================================
-- PHASE 1: Utility Functions
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- PHASE 2: Core Tables (Base - No Dependencies)
-- ============================================

-- Table: users
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
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- Table: permissions (system-defined, no dependencies)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_category ON permissions(category);


-- Table: role_templates (no dependencies)
CREATE TABLE role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_role_templates_name ON role_templates(name);


-- Table: group_templates (no dependencies)
CREATE TABLE group_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_templates_name ON group_templates(name);


-- ============================================
-- PHASE 3: Core Tables (With Dependencies)
-- ============================================

-- Table: groups (depends on users and group_templates)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  label TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_from_group_template_id UUID REFERENCES group_templates(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  show_member_list BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_created_by ON groups(created_by_user_id);
CREATE INDEX idx_groups_template ON groups(created_from_group_template_id);
CREATE INDEX idx_groups_public ON groups(is_public) WHERE is_public = true;

CREATE TRIGGER update_groups_updated_at 
  BEFORE UPDATE ON groups 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- Table: group_memberships (depends on users and groups)
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_member_type CHECK (
    (user_id IS NOT NULL AND member_group_id IS NULL) OR 
    (user_id IS NULL AND member_group_id IS NOT NULL)
  ),
  UNIQUE NULLS NOT DISTINCT (group_id, user_id, member_group_id)
);

CREATE INDEX idx_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_memberships_member_group ON group_memberships(member_group_id);
CREATE INDEX idx_memberships_status ON group_memberships(status);
CREATE INDEX idx_memberships_active ON group_memberships(group_id, status) WHERE status = 'active';


-- Table: journeys (depends on users)
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  journey_type TEXT NOT NULL DEFAULT 'predefined' CHECK (journey_type IN ('predefined', 'user_created', 'dynamic')),
  content JSONB DEFAULT '{}',
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_journeys_created_by ON journeys(created_by_user_id);
CREATE INDEX idx_journeys_published ON journeys(is_published) WHERE is_published = true;
CREATE INDEX idx_journeys_public ON journeys(is_public) WHERE is_public = true;
CREATE INDEX idx_journeys_type ON journeys(journey_type);
CREATE INDEX idx_journeys_tags ON journeys USING GIN(tags);

CREATE TRIGGER update_journeys_updated_at 
  BEFORE UPDATE ON journeys 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- Table: journey_enrollments (depends on journeys, users, and groups)
CREATE TABLE journey_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  enrolled_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'frozen')),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress_data JSONB DEFAULT '{}',
  CONSTRAINT check_enrollment_type CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR 
    (user_id IS NULL AND group_id IS NOT NULL)
  ),
  UNIQUE NULLS NOT DISTINCT (journey_id, user_id, group_id)
);

CREATE INDEX idx_enrollments_journey ON journey_enrollments(journey_id);
CREATE INDEX idx_enrollments_user ON journey_enrollments(user_id);
CREATE INDEX idx_enrollments_group ON journey_enrollments(group_id);
CREATE INDEX idx_enrollments_status ON journey_enrollments(status);
CREATE INDEX idx_enrollments_active ON journey_enrollments(journey_id, status) WHERE status = 'active';


-- ============================================
-- PHASE 4: Authorization Tables
-- ============================================

-- Table: role_template_permissions (junction table)
CREATE TABLE role_template_permissions (
  role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role_template_id, permission_id)
);

CREATE INDEX idx_rtp_template ON role_template_permissions(role_template_id);
CREATE INDEX idx_rtp_permission ON role_template_permissions(permission_id);


-- Table: group_template_roles (junction table)
CREATE TABLE group_template_roles (
  group_template_id UUID NOT NULL REFERENCES group_templates(id) ON DELETE CASCADE,
  role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (group_template_id, role_template_id)
);

CREATE INDEX idx_gtr_group_template ON group_template_roles(group_template_id);
CREATE INDEX idx_gtr_role_template ON group_template_roles(role_template_id);


-- Table: group_roles (depends on groups and role_templates)
CREATE TABLE group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_from_role_template_id UUID REFERENCES role_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, name)
);

CREATE INDEX idx_group_roles_group ON group_roles(group_id);
CREATE INDEX idx_group_roles_template ON group_roles(created_from_role_template_id);

CREATE TRIGGER update_group_roles_updated_at 
  BEFORE UPDATE ON group_roles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- Table: group_role_permissions (junction table)
CREATE TABLE group_role_permissions (
  group_role_id UUID NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (group_role_id, permission_id)
);

CREATE INDEX idx_grp_role ON group_role_permissions(group_role_id);
CREATE INDEX idx_grp_permission ON group_role_permissions(permission_id);
CREATE INDEX idx_grp_granted ON group_role_permissions(granted) WHERE granted = true;


-- Table: user_group_roles (junction table)
CREATE TABLE user_group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_role_id UUID NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id, group_role_id)
);

CREATE INDEX idx_ugr_user ON user_group_roles(user_id);
CREATE INDEX idx_ugr_group ON user_group_roles(group_id);
CREATE INDEX idx_ugr_role ON user_group_roles(group_role_id);
CREATE INDEX idx_ugr_user_group ON user_group_roles(user_id, group_id);

-- Add a trigger to validate that the role belongs to the correct group
CREATE OR REPLACE FUNCTION validate_user_group_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_roles 
    WHERE id = NEW.group_role_id 
    AND group_id = NEW.group_id
  ) THEN
    RAISE EXCEPTION 'Role % does not belong to group %', NEW.group_role_id, NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_user_group_role_match
  BEFORE INSERT OR UPDATE ON user_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_group_role();


-- ============================================
-- PHASE 5: Seed Data - Permissions
-- ============================================

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


-- ============================================
-- PHASE 6: Seed Data - Role Templates
-- ============================================

INSERT INTO role_templates (name, description) VALUES
('Platform Admin Role Template', 'Full platform administration capabilities'),
('Group Leader Role Template', 'Manage and lead a specific group'),
('Travel Guide Role Template', 'Facilitate journeys and provide guidance'),
('Member Role Template', 'Standard participant in groups and journeys'),
('Observer Role Template', 'View-only access to group activities');


-- ============================================
-- PHASE 7: Seed Data - Group Templates
-- ============================================

INSERT INTO group_templates (name, description) VALUES
('Small Team Template', 'For teams of 2-10 people'),
('Large Group Template', 'For groups of 10+ people'),
('Organization Template', 'For companies and institutions'),
('Learning Cohort Template', 'For learning groups going through journeys together');


-- ============================================
-- Migration complete!
-- Next step: Enable RLS and create policies
-- ============================================
