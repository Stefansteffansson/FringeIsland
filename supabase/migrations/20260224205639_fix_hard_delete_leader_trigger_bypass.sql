-- Fix: prevent_last_leader_removal() and prevent_last_deusex_role_removal()
-- block admin_hard_delete_user() CASCADE.
--
-- When hard-deleting a user, the personal group is deleted and CASCADE removes
-- user_group_roles entries. If the user is the last Steward of an engagement
-- group, prevent_last_leader_removal() raises an exception and aborts the
-- entire hard delete.
--
-- Fix: check app.hard_delete_in_progress session variable (same pattern used
-- by notification triggers in 20260223171200_fix_rc7_admin_user_ops.sql).

-- 1. prevent_last_leader_removal — add hard_delete bypass
CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_leader_count INTEGER;
  v_is_leader_role BOOLEAN;
  v_steward_template_id UUID;
BEGIN
  -- Skip during hard-delete cascade
  IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- If parent group is gone (CASCADE), allow deletion
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  -- Get the Steward template ID
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  -- Check if the role being removed is based on the Steward template (or named Steward)
  SELECT EXISTS (
    SELECT 1 FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND (created_from_role_template_id = v_steward_template_id OR name = 'Steward')
  ) INTO v_is_leader_role;

  IF NOT v_is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Steward-template role holders (excluding the one being removed)
  SELECT COUNT(*) INTO v_leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND (gr.created_from_role_template_id = v_steward_template_id OR gr.name = 'Steward')
    AND ugr.id != OLD.id;

  IF v_leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Assign another Steward first.';
  END IF;

  RETURN OLD;
END;
$$;

-- 2. prevent_last_deusex_role_removal — add hard_delete bypass
CREATE OR REPLACE FUNCTION public.prevent_last_deusex_role_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_deusex_role_id UUID;
  v_remaining_count INTEGER;
BEGIN
  -- Skip during hard-delete cascade
  IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN
    RETURN OLD;
  END IF;

  SELECT id INTO v_deusex_group_id
  FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';

  IF v_deusex_group_id IS NULL OR OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  SELECT id INTO v_deusex_role_id
  FROM public.group_roles WHERE group_id = v_deusex_group_id AND name = 'DeusEx';

  IF v_deusex_role_id IS NULL OR OLD.group_role_id != v_deusex_role_id THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*) INTO v_remaining_count
  FROM public.user_group_roles
  WHERE group_id = v_deusex_group_id
    AND group_role_id = v_deusex_role_id
    AND id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last DeusEx member. Assign another DeusEx member first.';
  END IF;

  RETURN OLD;
END;
$$;
