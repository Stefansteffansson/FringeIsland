-- RBAC Sub-Sprint 1, Migration 2: System Groups
--
-- Creates the three system groups (FringeIsland Members, Visitor, Deusex)
-- with their roles and permission sets. Enrolls all existing users in
-- FringeIsland Members.
--
-- Depends on: Migration 1 (group_type column, permissions, templates)
-- Addresses: B-RBAC-006

DO $$
DECLARE
  v_system_user_id UUID;
  v_fi_members_group_id UUID;
  v_visitor_group_id UUID;
  v_deusex_group_id UUID;
  v_fi_member_role_id UUID;
  v_guest_role_id UUID;
  v_deusex_role_id UUID;
BEGIN
  -- Use the first user as the system creator (platform creator)
  SELECT id INTO v_system_user_id FROM users ORDER BY created_at ASC LIMIT 1;

  -- If no users exist yet, we'll need a placeholder approach
  -- For now, this migration assumes at least one user exists
  IF v_system_user_id IS NULL THEN
    RAISE EXCEPTION 'No users exist — cannot create system groups without a created_by_user_id';
  END IF;

  -- ============================================================
  -- 1. Create system groups
  -- ============================================================

  INSERT INTO groups (name, description, group_type, is_public, show_member_list, created_by_user_id)
  VALUES (
    'FringeIsland Members',
    'All authenticated platform users. Provides platform-wide capabilities.',
    'system', false, false, v_system_user_id
  )
  RETURNING id INTO v_fi_members_group_id;

  INSERT INTO groups (name, description, group_type, is_public, show_member_list, created_by_user_id)
  VALUES (
    'Visitor',
    'Implicit group for non-logged-in users. Provides minimal public access.',
    'system', false, false, v_system_user_id
  )
  RETURNING id INTO v_visitor_group_id;

  INSERT INTO groups (name, description, group_type, is_public, show_member_list, created_by_user_id)
  VALUES (
    'Deusex',
    'Superuser group. All permissions granted. Goes through the same permission checks as everyone else.',
    'system', false, false, v_system_user_id
  )
  RETURNING id INTO v_deusex_group_id;

  -- ============================================================
  -- 2. Create roles in system groups
  -- ============================================================

  -- FringeIsland Members → "Member" role
  INSERT INTO group_roles (group_id, name)
  VALUES (v_fi_members_group_id, 'Member')
  RETURNING id INTO v_fi_member_role_id;

  -- Visitor → "Guest" role
  INSERT INTO group_roles (group_id, name)
  VALUES (v_visitor_group_id, 'Guest')
  RETURNING id INTO v_guest_role_id;

  -- Deusex → "Deusex" role
  INSERT INTO group_roles (group_id, name)
  VALUES (v_deusex_group_id, 'Deusex')
  RETURNING id INTO v_deusex_role_id;

  -- ============================================================
  -- 3. Populate group_role_permissions for system group roles
  -- ============================================================

  -- FI Members / Member: 8 permissions (D20)
  INSERT INTO group_role_permissions (group_role_id, permission_id)
  SELECT v_fi_member_role_id, p.id
  FROM permissions p
  WHERE p.name IN (
    'browse_journey_catalog',
    'browse_public_groups',
    'create_group',
    'enroll_self_in_journey',
    'send_direct_messages',
    'view_journey_content',
    'complete_journey_activities',
    'view_own_progress'
  );

  -- Visitor / Guest: 5 permissions (D20)
  INSERT INTO group_role_permissions (group_role_id, permission_id)
  SELECT v_guest_role_id, p.id
  FROM permissions p
  WHERE p.name IN (
    'browse_journey_catalog',
    'browse_public_groups',
    'view_journey_content',
    'complete_journey_activities',
    'view_own_progress'
  );

  -- Deusex / Deusex: ALL permissions (D3)
  INSERT INTO group_role_permissions (group_role_id, permission_id)
  SELECT v_deusex_role_id, p.id
  FROM permissions p;

  -- ============================================================
  -- 4. Enroll all existing active users in FringeIsland Members
  -- ============================================================

  INSERT INTO group_memberships (group_id, user_id, added_by_user_id, status)
  SELECT v_fi_members_group_id, u.id, u.id, 'active'
  FROM users u
  WHERE u.is_active = true;

  -- Assign the Member role to all enrolled users
  INSERT INTO user_group_roles (group_id, user_id, group_role_id, assigned_by_user_id)
  SELECT v_fi_members_group_id, u.id, v_fi_member_role_id, u.id
  FROM users u
  WHERE u.is_active = true;

END $$;
