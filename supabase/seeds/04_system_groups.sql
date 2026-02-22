-- ==========================================================================
-- Seed 04: System Groups + Roles + Permissions
-- ==========================================================================
-- Depends on: 01_permissions.sql, 02_role_templates.sql
-- Creates 4 system groups: FringeIsland Members, Visitor, DeusEx, [Deleted User]
-- Each gets appropriate roles and permission sets.
-- ==========================================================================

DO $$
DECLARE
  v_fi_members_id UUID;
  v_visitor_id UUID;
  v_deusex_id UUID;
  v_deleted_user_id UUID;
  v_fi_member_role_id UUID;
  v_visitor_guest_role_id UUID;
  v_deusex_role_id UUID;
  v_member_template_id UUID;
BEGIN
  -- Get Member template ID for FI Members role
  SELECT id INTO v_member_template_id
  FROM public.role_templates WHERE name = 'Member Role Template';

  -- ========================================================================
  -- 1. FringeIsland Members — all registered users belong here
  -- ========================================================================
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, description)
  VALUES ('FringeIsland Members', 'system', false, false,
    'All registered FringeIsland users. Provides base platform permissions.')
  RETURNING id INTO v_fi_members_id;

  -- FI Members "Member" role (from template — trigger copies permissions)
  INSERT INTO public.group_roles (group_id, name, description, created_from_role_template_id)
  VALUES (v_fi_members_id, 'Member', 'Base platform member permissions', v_member_template_id)
  RETURNING id INTO v_fi_member_role_id;

  -- Override: FI Members gets a curated subset (8 permissions), not the full Member template.
  -- Delete auto-copied permissions from template trigger, then insert the curated set.
  DELETE FROM public.group_role_permissions WHERE group_role_id = v_fi_member_role_id;

  INSERT INTO public.group_role_permissions (group_role_id, permission_id)
  SELECT v_fi_member_role_id, p.id
  FROM public.permissions p
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

  -- ========================================================================
  -- 2. Visitor — anonymous/unauthenticated baseline
  -- ========================================================================
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, description)
  VALUES ('Visitor', 'system', false, false,
    'Baseline permissions for visitors and try-it experiences.')
  RETURNING id INTO v_visitor_id;

  INSERT INTO public.group_roles (group_id, name, description)
  VALUES (v_visitor_id, 'Guest', 'Visitor role with minimal permissions')
  RETURNING id INTO v_visitor_guest_role_id;

  INSERT INTO public.group_role_permissions (group_role_id, permission_id)
  SELECT v_visitor_guest_role_id, p.id
  FROM public.permissions p
  WHERE p.name IN (
    'browse_journey_catalog',
    'browse_public_groups',
    'view_journey_content',
    'complete_journey_activities',
    'view_own_progress'
  );

  -- ========================================================================
  -- 3. DeusEx — platform administrators
  -- ========================================================================
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, description)
  VALUES ('DeusEx', 'system', false, false,
    'Platform administrators with full system access.')
  RETURNING id INTO v_deusex_id;

  INSERT INTO public.group_roles (group_id, name, description)
  VALUES (v_deusex_id, 'DeusEx', 'Full platform admin role — all permissions')
  RETURNING id INTO v_deusex_role_id;

  -- DeusEx gets ALL permissions
  INSERT INTO public.group_role_permissions (group_role_id, permission_id)
  SELECT v_deusex_role_id, p.id
  FROM public.permissions p;

  -- ========================================================================
  -- 4. [Deleted User] — sentinel for anonymized content
  -- ========================================================================
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, description)
  VALUES ('[Deleted User]', 'system', false, false,
    'Sentinel group for content previously owned by deleted users.')
  RETURNING id INTO v_deleted_user_id;

  RAISE NOTICE 'System groups created: FI Members=%, Visitor=%, DeusEx=%, [Deleted User]=%',
    v_fi_members_id, v_visitor_id, v_deusex_id, v_deleted_user_id;
END;
$$;
