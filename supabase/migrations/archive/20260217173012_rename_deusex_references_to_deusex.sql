-- Migration: Update all Deusex references to DeusEx in DB objects
-- Date: 2026-02-17
--
-- The previous migration renamed the groups.name from 'Deusex' to 'DeusEx'.
-- This migration updates:
--   1. group_roles.name from 'Deusex' to 'DeusEx'
--   2. All 4 trigger functions that hardcode the name

-- ============================================================================
-- 1. Rename group_role
-- ============================================================================

UPDATE group_roles
SET name = 'DeusEx'
WHERE name = 'Deusex'
  AND group_id = (SELECT id FROM groups WHERE name = 'DeusEx' AND group_type = 'system');

-- ============================================================================
-- 2. Recreate auto_grant_permission_to_deusex()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_grant_permission_to_deusex()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_role_id UUID;
BEGIN
  SELECT gr.id INTO v_deusex_role_id
  FROM public.group_roles gr
  JOIN public.groups g ON gr.group_id = g.id
  WHERE g.name = 'DeusEx'
    AND g.group_type = 'system'
    AND gr.name = 'DeusEx';

  IF v_deusex_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.group_role_permissions (group_role_id, permission_id)
  VALUES (v_deusex_role_id, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Recreate prevent_last_deusex_role_removal()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_deusex_role_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_is_deusex_role BOOLEAN;
  v_remaining_count INTEGER;
BEGIN
  SELECT id INTO v_deusex_group_id
  FROM public.groups
  WHERE name = 'DeusEx'
    AND group_type = 'system';

  IF v_deusex_group_id IS NULL THEN
    RETURN OLD;
  END IF;

  IF OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND group_id = v_deusex_group_id
      AND name = 'DeusEx'
  ) INTO v_is_deusex_role;

  IF NOT v_is_deusex_role THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*)
  INTO v_remaining_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = v_deusex_group_id
    AND gr.name = 'DeusEx'
    AND ugr.id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last DeusEx member. Assign another DeusEx member first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- 4. Recreate prevent_last_deusex_membership_removal()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_deusex_membership_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_remaining_count INTEGER;
BEGIN
  SELECT id INTO v_deusex_group_id
  FROM public.groups
  WHERE name = 'DeusEx'
    AND group_type = 'system';

  IF v_deusex_group_id IS NULL THEN
    RETURN OLD;
  END IF;

  IF OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*)
  INTO v_remaining_count
  FROM public.group_memberships
  WHERE group_id = v_deusex_group_id
    AND status = 'active'
    AND id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last DeusEx member. Add another DeusEx member first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- 5. Recreate auto_assign_deusex_role_on_accept()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_deusex_role_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_deusex_role_id UUID;
BEGIN
  IF OLD.status = 'invited' AND NEW.status = 'active' THEN
    SELECT id INTO v_deusex_group_id
    FROM public.groups
    WHERE name = 'DeusEx'
      AND group_type = 'system'
    LIMIT 1;

    IF NEW.group_id = v_deusex_group_id THEN
      SELECT id INTO v_deusex_role_id
      FROM public.group_roles
      WHERE group_id = v_deusex_group_id
        AND name = 'DeusEx'
      LIMIT 1;

      IF v_deusex_role_id IS NOT NULL THEN
        INSERT INTO public.user_group_roles (
          user_id,
          group_id,
          group_role_id,
          assigned_by_user_id
        )
        VALUES (
          NEW.user_id,
          NEW.group_id,
          v_deusex_role_id,
          NEW.user_id
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. Verify
-- ============================================================================

DO $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT name INTO v_role_name
  FROM public.group_roles
  WHERE group_id = (SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system')
    AND name = 'DeusEx';

  IF v_role_name IS NULL THEN
    RAISE EXCEPTION 'DeusEx role not renamed!';
  END IF;

  RAISE NOTICE 'All Deusex references updated to DeusEx';
END $$;
