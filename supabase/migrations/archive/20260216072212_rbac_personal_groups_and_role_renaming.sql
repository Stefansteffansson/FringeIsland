-- RBAC Sub-Sprint 1, Migration 3: Personal Groups + Role Renaming + Backfill
--
-- Changes:
-- 1. Rename existing group_roles: "Group Leader" → "Steward", "Travel Guide" → "Guide"
-- 2. Update prevent_last_leader_removal trigger → check 'Steward'
-- 3. Update is_active_group_leader() function → check 'Steward'
-- 4. Update group_has_leader() function → check 'Steward'
-- 5. Create personal groups for all existing users
-- 6. Extend handle_new_user() trigger → create personal group + FI Members enrollment
-- 7. Backfill group_role_permissions for existing template-based roles
-- 8. Add trigger to auto-copy template permissions on role creation
--
-- Depends on: Migration 1 (group_type), Migration 2 (system groups)
-- Addresses: B-RBAC-003, B-RBAC-005, B-RBAC-007

-- ============================================================
-- 1. Rename existing group_roles in all groups
-- ============================================================

UPDATE public.group_roles SET name = 'Steward' WHERE name = 'Group Leader';
UPDATE public.group_roles SET name = 'Guide' WHERE name = 'Travel Guide';

-- ============================================================
-- 2. Update prevent_last_leader_removal trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader_role BOOLEAN;
BEGIN
  -- Check if the role being removed is "Steward" (was "Group Leader")
  SELECT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND name = 'Steward'
  ) INTO is_leader_role;

  -- If not a steward role, allow deletion
  IF NOT is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Stewards in the group
  SELECT COUNT(*)
  INTO leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND gr.name = 'Steward'
    AND ugr.id != OLD.id;

  -- If this is the last steward, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Assign another Steward first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================================
-- 3. Update is_active_group_leader() → check 'Steward'
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_group_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.user_id = public.get_current_user_profile_id()
      AND ugr.group_id = p_group_id
      AND gr.name = 'Steward'
  );
$$;

-- ============================================================
-- 4. Update group_has_leader() → check 'Steward'
-- ============================================================

CREATE OR REPLACE FUNCTION public.group_has_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = p_group_id
      AND gr.name = 'Steward'
  );
$$;

-- ============================================================
-- 5. Create personal groups for all existing users
-- ============================================================

DO $$
DECLARE
  v_user RECORD;
  v_personal_group_id UUID;
  v_myself_role_id UUID;
BEGIN
  FOR v_user IN
    SELECT id, full_name FROM public.users WHERE is_active = true
  LOOP
    -- Skip if user already has a personal group
    IF EXISTS (
      SELECT 1 FROM public.groups
      WHERE group_type = 'personal'
        AND created_by_user_id = v_user.id
    ) THEN
      CONTINUE;
    END IF;

    -- Create personal group
    INSERT INTO public.groups (name, group_type, is_public, show_member_list, created_by_user_id)
    VALUES (v_user.full_name, 'personal', false, false, v_user.id)
    RETURNING id INTO v_personal_group_id;

    -- Create membership
    INSERT INTO public.group_memberships (group_id, user_id, added_by_user_id, status)
    VALUES (v_personal_group_id, v_user.id, v_user.id, 'active');

    -- Create "Myself" role
    INSERT INTO public.group_roles (group_id, name)
    VALUES (v_personal_group_id, 'Myself')
    RETURNING id INTO v_myself_role_id;

    -- Assign "Myself" role to user
    INSERT INTO public.user_group_roles (group_id, user_id, group_role_id, assigned_by_user_id)
    VALUES (v_personal_group_id, v_user.id, v_myself_role_id, v_user.id);
  END LOOP;
END $$;

-- ============================================================
-- 6. Extend handle_new_user() trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_display_name TEXT;
  v_personal_group_id UUID;
  v_myself_role_id UUID;
  v_fi_members_group_id UUID;
  v_fi_member_role_id UUID;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', '');

  -- Create user profile
  INSERT INTO public.users (id, email, full_name, created_at, updated_at, is_active, auth_user_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_display_name,
    NOW(),
    NOW(),
    true,
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_user_id;

  -- If user was created (not a conflict), set up RBAC
  IF v_user_id IS NOT NULL THEN
    -- Create personal group
    INSERT INTO public.groups (name, group_type, is_public, show_member_list, created_by_user_id)
    VALUES (v_display_name, 'personal', false, false, v_user_id)
    RETURNING id INTO v_personal_group_id;

    -- Create membership in personal group
    INSERT INTO public.group_memberships (group_id, user_id, added_by_user_id, status)
    VALUES (v_personal_group_id, v_user_id, v_user_id, 'active');

    -- Create "Myself" role in personal group
    INSERT INTO public.group_roles (group_id, name)
    VALUES (v_personal_group_id, 'Myself')
    RETURNING id INTO v_myself_role_id;

    -- Assign "Myself" role
    INSERT INTO public.user_group_roles (group_id, user_id, group_role_id, assigned_by_user_id)
    VALUES (v_personal_group_id, v_user_id, v_myself_role_id, v_user_id);

    -- Enroll in FringeIsland Members system group
    SELECT id INTO v_fi_members_group_id
    FROM public.groups
    WHERE name = 'FringeIsland Members' AND group_type = 'system';

    IF v_fi_members_group_id IS NOT NULL THEN
      INSERT INTO public.group_memberships (group_id, user_id, added_by_user_id, status)
      VALUES (v_fi_members_group_id, v_user_id, v_user_id, 'active');

      -- Find and assign the Member role
      SELECT id INTO v_fi_member_role_id
      FROM public.group_roles
      WHERE group_id = v_fi_members_group_id AND name = 'Member';

      IF v_fi_member_role_id IS NOT NULL THEN
        INSERT INTO public.user_group_roles (group_id, user_id, group_role_id, assigned_by_user_id)
        VALUES (v_fi_members_group_id, v_user_id, v_fi_member_role_id, v_user_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Backfill group_role_permissions for existing template-based roles
-- ============================================================

-- Copy permissions from role_template_permissions to group_role_permissions
-- for any group_role that has created_from_role_template_id set
INSERT INTO public.group_role_permissions (group_role_id, permission_id)
SELECT gr.id, rtp.permission_id
FROM public.group_roles gr
JOIN public.role_template_permissions rtp
  ON gr.created_from_role_template_id = rtp.role_template_id
WHERE gr.created_from_role_template_id IS NOT NULL
ON CONFLICT (group_role_id, permission_id) DO NOTHING;

-- ============================================================
-- 8. Trigger: auto-copy template permissions on role creation
-- ============================================================

CREATE OR REPLACE FUNCTION public.copy_template_permissions_on_role_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Only copy if this role was created from a template
  IF NEW.created_from_role_template_id IS NOT NULL THEN
    INSERT INTO public.group_role_permissions (group_role_id, permission_id)
    SELECT NEW.id, rtp.permission_id
    FROM public.role_template_permissions rtp
    WHERE rtp.role_template_id = NEW.created_from_role_template_id
    ON CONFLICT (group_role_id, permission_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS copy_template_permissions ON public.group_roles;

CREATE TRIGGER copy_template_permissions
  AFTER INSERT ON public.group_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_template_permissions_on_role_create();
