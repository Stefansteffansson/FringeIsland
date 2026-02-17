-- Deusex Last Member Protection
-- Migration C: B-ADMIN-005
--
-- Two triggers prevent removing the last Deusex member:
-- 1. BEFORE DELETE ON user_group_roles — blocks if last Deusex role holder
-- 2. BEFORE DELETE ON group_memberships — blocks if last active Deusex member
--
-- Mirrors the proven prevent_last_leader_removal() pattern.

-- ============================================================================
-- 1. Trigger function: prevent removing last Deusex role assignment
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
  -- Look up the Deusex system group
  SELECT id INTO v_deusex_group_id
  FROM public.groups
  WHERE name = 'Deusex'
    AND group_type = 'system';

  -- If Deusex group doesn't exist, allow deletion (shouldn't happen)
  IF v_deusex_group_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Check if this role assignment is for the Deusex group
  IF OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  -- Check if the role being removed is the Deusex role
  SELECT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND group_id = v_deusex_group_id
      AND name = 'Deusex'
  ) INTO v_is_deusex_role;

  IF NOT v_is_deusex_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Deusex role holders (excluding the one being deleted)
  SELECT COUNT(*)
  INTO v_remaining_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = v_deusex_group_id
    AND gr.name = 'Deusex'
    AND ugr.id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Deusex member. Assign another Deusex member first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- 2. Trigger function: prevent removing last active Deusex membership
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
  -- Look up the Deusex system group
  SELECT id INTO v_deusex_group_id
  FROM public.groups
  WHERE name = 'Deusex'
    AND group_type = 'system';

  -- If Deusex group doesn't exist, allow deletion
  IF v_deusex_group_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Check if this membership is for the Deusex group
  IF OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  -- Count remaining active memberships (excluding the one being deleted)
  SELECT COUNT(*)
  INTO v_remaining_count
  FROM public.group_memberships
  WHERE group_id = v_deusex_group_id
    AND status = 'active'
    AND id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Deusex member. Add another Deusex member first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- 3. Create the triggers
-- ============================================================================

DROP TRIGGER IF EXISTS check_last_deusex_role_removal ON public.user_group_roles;
CREATE TRIGGER check_last_deusex_role_removal
  BEFORE DELETE ON public.user_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_deusex_role_removal();

DROP TRIGGER IF EXISTS check_last_deusex_membership_removal ON public.group_memberships;
CREATE TRIGGER check_last_deusex_membership_removal
  BEFORE DELETE ON public.group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_deusex_membership_removal();
