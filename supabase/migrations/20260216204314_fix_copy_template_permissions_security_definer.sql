-- Migration: Make copy_template_permissions trigger SECURITY DEFINER
-- Date: 2026-02-16
--
-- Problem: The copy_template_permissions_on_role_create() trigger function
--   runs with the caller's privileges. During group creation, the creator
--   doesn't have manage_roles permission yet, so the trigger's INSERT into
--   group_role_permissions is blocked by RLS.
--
-- Fix: Make the function SECURITY DEFINER so it bypasses RLS. This is a
--   system operation (copying template permissions), not a user action.

CREATE OR REPLACE FUNCTION public.copy_template_permissions_on_role_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only copy if this role was created from a template
  IF NEW.created_from_role_template_id IS NOT NULL THEN
    INSERT INTO public.group_role_permissions (group_role_id, permission_id)
    SELECT NEW.id, rtp.permission_id
    FROM public.role_template_permissions rtp
    WHERE rtp.role_template_id = NEW.created_from_role_template_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.copy_template_permissions_on_role_create IS
'Copies permissions from a role template to a newly created group role.
SECURITY DEFINER to bypass RLS — this is a system operation that must
work during group creation before the creator has any permissions.';
