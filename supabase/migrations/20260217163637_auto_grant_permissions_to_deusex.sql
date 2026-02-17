-- Auto-Grant Permissions to Deusex
-- Migration A: B-ADMIN-004
--
-- Creates a trigger that automatically grants any new permission to the
-- Deusex system role. This ensures Deusex always has ALL permissions
-- without manual intervention in future migrations.

-- ============================================================================
-- 1. Create the trigger function
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
  -- Look up the Deusex role by group name + type + role name
  SELECT gr.id INTO v_deusex_role_id
  FROM public.group_roles gr
  JOIN public.groups g ON gr.group_id = g.id
  WHERE g.name = 'Deusex'
    AND g.group_type = 'system'
    AND gr.name = 'Deusex';

  -- If Deusex role doesn't exist yet (e.g., during initial bootstrap), skip silently
  IF v_deusex_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Grant the new permission to the Deusex role (idempotent)
  INSERT INTO public.group_role_permissions (group_role_id, permission_id)
  VALUES (v_deusex_role_id, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Create the trigger on the permissions table
-- ============================================================================

DROP TRIGGER IF EXISTS auto_grant_to_deusex ON public.permissions;
CREATE TRIGGER auto_grant_to_deusex
  AFTER INSERT ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_permission_to_deusex();
