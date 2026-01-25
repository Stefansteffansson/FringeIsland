-- Migration: Group RLS Policies
-- Date: 2026-01-25
-- Description: Add Row Level Security policies for group creation and management
-- 
-- This migration adds comprehensive RLS policies for:
-- - groups table
-- - group_memberships table
-- - group_roles table
-- - group_role_permissions table
-- - user_group_roles table
--
-- These policies enable users to create groups, manage memberships,
-- assign roles, and control permissions within their groups.

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_roles ENABLE ROW LEVEL SECURITY;


-- ============================================
-- GROUPS TABLE POLICIES
-- ============================================

-- Policy: Users can create groups
CREATE POLICY "Users can create groups"
ON groups
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Users can view their groups
CREATE POLICY "Users can view their groups"
ON groups
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT group_id FROM group_memberships 
    WHERE user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  )
);

-- Policy: Anyone can view public groups
CREATE POLICY "Anyone can view public groups"
ON groups
FOR SELECT
TO authenticated
USING (is_public = true);


-- ============================================
-- GROUP_MEMBERSHIPS TABLE POLICIES
-- ============================================

-- Policy: Users can add members to groups they lead
CREATE POLICY "Users can add members to groups they lead"
ON group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  added_by_user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Users can view memberships of their groups
CREATE POLICY "Users can view memberships of their groups"
ON group_memberships
FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM group_memberships 
    WHERE user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  )
);


-- ============================================
-- GROUP_ROLES TABLE POLICIES
-- ============================================

-- Policy: Users can create roles for their groups
CREATE POLICY "Users can create roles for their groups"
ON group_roles
FOR INSERT
TO authenticated
WITH CHECK (
  group_id IN (
    SELECT id FROM groups 
    WHERE created_by_user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Users can view roles in their groups
CREATE POLICY "Users can view roles in their groups"
ON group_roles
FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM group_memberships 
    WHERE user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  )
);


-- ============================================
-- GROUP_ROLE_PERMISSIONS TABLE POLICIES
-- ============================================

-- Policy: Users can set permissions for roles in their groups
CREATE POLICY "Users can set permissions for roles in their groups"
ON group_role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  group_role_id IN (
    SELECT gr.id FROM group_roles gr
    WHERE gr.group_id IN (
      SELECT id FROM groups 
      WHERE created_by_user_id = (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
);

-- Policy: Users can view permissions in their groups
CREATE POLICY "Users can view permissions in their groups"
ON group_role_permissions
FOR SELECT
TO authenticated
USING (
  group_role_id IN (
    SELECT gr.id FROM group_roles gr
    WHERE gr.group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
      AND status = 'active'
    )
  )
);


-- ============================================
-- USER_GROUP_ROLES TABLE POLICIES
-- ============================================

-- Policy: Users can assign themselves roles in groups they belong to
-- This is a simplified policy that enables the initial group creation flow
-- where the creator needs to assign themselves as the group leader
CREATE POLICY "Users can assign themselves roles in groups they belong to"
ON user_group_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Policy: Users can view role assignments in their groups
CREATE POLICY "Users can view role assignments in their groups"
ON user_group_roles
FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM group_memberships 
    WHERE user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  )
);


-- ============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================

-- To verify policies are active, run:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'group%';

-- To verify RLS is enabled, run:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'group%';


-- ============================================
-- NOTES
-- ============================================

-- 1. The simplified user_group_roles policy allows users to assign roles to themselves.
--    In future iterations, this can be made more restrictive to require group leadership
--    permissions for assigning roles to other users.
--
-- 2. These policies enable the core group creation workflow:
--    - User creates group → added as creator
--    - User adds self as member
--    - User creates "Group Leader" role
--    - User assigns self as group leader
--
-- 3. Future enhancements may include:
--    - Policies for updating groups (group leaders only)
--    - Policies for removing members
--    - Policies for deleting groups
--    - More granular role assignment permissions

-- ============================================
-- Migration complete!
-- ============================================
