-- Deusex Bootstrap
-- Migration B: B-ADMIN-006
--
-- Bootstraps deusex@fringeisland.com as the first Deusex member.
-- The user must already exist (created via normal signup).
-- Inserts group_membership (active) + user_group_roles (Deusex role).
-- Idempotent via ON CONFLICT DO NOTHING.

DO $$
DECLARE
  v_deusex_user_id UUID;
  v_deusex_group_id UUID;
  v_deusex_role_id UUID;
BEGIN
  -- Look up deusex@fringeisland.com in the users table
  SELECT u.id INTO v_deusex_user_id
  FROM public.users u
  WHERE u.email = 'deusex@fringeisland.com'
    AND u.is_active = true;

  IF v_deusex_user_id IS NULL THEN
    RAISE EXCEPTION 'User deusex@fringeisland.com not found. This user must sign up before running the bootstrap migration.';
  END IF;

  -- Look up the Deusex system group
  SELECT id INTO v_deusex_group_id
  FROM public.groups
  WHERE name = 'Deusex'
    AND group_type = 'system';

  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'Deusex system group not found. Run RBAC system groups migration first.';
  END IF;

  -- Look up the Deusex role
  SELECT id INTO v_deusex_role_id
  FROM public.group_roles
  WHERE group_id = v_deusex_group_id
    AND name = 'Deusex';

  IF v_deusex_role_id IS NULL THEN
    RAISE EXCEPTION 'Deusex role not found in Deusex system group.';
  END IF;

  -- Insert active membership (idempotent)
  INSERT INTO public.group_memberships (group_id, user_id, added_by_user_id, status)
  VALUES (v_deusex_group_id, v_deusex_user_id, v_deusex_user_id, 'active')
  ON CONFLICT (group_id, user_id, member_group_id) DO NOTHING;

  -- Assign the Deusex role (idempotent)
  INSERT INTO public.user_group_roles (user_id, group_id, group_role_id, assigned_by_user_id)
  VALUES (v_deusex_user_id, v_deusex_group_id, v_deusex_role_id, v_deusex_user_id)
  ON CONFLICT (user_id, group_id, group_role_id) DO NOTHING;

  RAISE NOTICE 'Deusex bootstrap complete: % is now a Deusex member', 'deusex@fringeisland.com';
END;
$$;
