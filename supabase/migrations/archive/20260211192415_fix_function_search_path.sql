-- Migration: Fix mutable search_path on all public functions
-- Date: 2026-02-11
--
-- Supabase Security Advisor: "Function Search Path Mutable" (9 warnings)
--
-- A function without SET search_path is vulnerable to search_path injection:
-- an attacker who can create objects in a schema that appears earlier in the
-- search_path could shadow tables/functions used by a SECURITY DEFINER function.
--
-- Fix: Add SET search_path = '' to every function and ensure all table/schema
-- references inside the body are fully qualified (public.tablename, auth.uid()).
--
-- Functions fixed:
--   1. get_current_user_profile_id   (SECURITY DEFINER)
--   2. get_current_role              (no SECURITY DEFINER, but flagged)
--   3. is_group_leader               (SECURITY DEFINER)
--   4. is_active_group_leader        (SECURITY DEFINER)
--   5. is_active_group_member_for_enrollment (SECURITY DEFINER)
--   6. group_has_leader              (SECURITY DEFINER)
--   7. update_updated_at_column      (trigger, no SECURITY DEFINER)
--   8. validate_user_group_role      (trigger, no SECURITY DEFINER)
--   9. prevent_last_leader_removal   (trigger, no SECURITY DEFINER)
--
-- Note: SET search_path = '' means pg_catalog is still implicitly available
-- (built-ins like NOW(), EXISTS(), COUNT(), RAISE still work without prefix).
-- All public schema tables must use the public. prefix.

-- ============================================================
-- 1. get_current_user_profile_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_profile_id() IS
'Returns the public.users.id for the currently authenticated user.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 2. get_current_role
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT current_user::text;
$$;

COMMENT ON FUNCTION public.get_current_role() IS
'Returns the current database role name.
SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 3. is_group_leader
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_group_leader(p_group_id UUID)
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
      AND ugr.user_id = public.get_current_user_profile_id()
      AND gr.name = 'Group Leader'
  );
$$;

COMMENT ON FUNCTION public.is_group_leader(UUID) IS
'Returns true if the current user is a Group Leader of the given group.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 4. is_active_group_leader
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
      AND gr.name = 'Group Leader'
  );
$$;

COMMENT ON FUNCTION public.is_active_group_leader(UUID) IS
'Returns true if the current user is an active Group Leader of the given group.
Used in RLS policies for group editing, deletion, and role management.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 5. is_active_group_member_for_enrollment
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_group_member_for_enrollment(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = public.get_current_user_profile_id()
      AND gm.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_active_group_member_for_enrollment(UUID) IS
'Returns true if the current user is an active member of the given group.
Used in journey_enrollments RLS policies.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 6. group_has_leader
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
      AND gr.name = 'Group Leader'
  );
$$;

COMMENT ON FUNCTION public.group_has_leader(UUID) IS
'Returns true if the given group already has at least one Group Leader role assigned.
Used in the user_group_roles INSERT policy bootstrap check.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 7. update_updated_at_column
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS
'Trigger function: automatically sets updated_at = NOW() on UPDATE.
SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 8. validate_user_group_role
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_user_group_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = NEW.group_role_id
      AND group_id = NEW.group_id
  ) THEN
    RAISE EXCEPTION 'Role % does not belong to group %', NEW.group_role_id, NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_user_group_role() IS
'Trigger function: validates that the assigned role belongs to the same group
as the user_group_roles record being inserted/updated.
SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 9. prevent_last_leader_removal
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  leader_count INTEGER;
  is_leader_role BOOLEAN;
BEGIN
  -- Allow deletion when the parent group itself is being deleted (CASCADE).
  -- Within the same transaction the groups row is already gone by the time
  -- this trigger fires, so this SELECT returns no rows during a group delete.
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  -- Check if the role being removed is "Group Leader"
  SELECT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND name = 'Group Leader'
  ) INTO is_leader_role;

  -- If not a leader role, allow deletion
  IF NOT is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Group Leaders in the group (excluding the row being deleted)
  SELECT COUNT(*)
  INTO leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND gr.name = 'Group Leader'
    AND ugr.id != OLD.id;

  -- If this is the last leader, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Group Leader from the group. Assign another leader first.';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.prevent_last_leader_removal() IS
'Trigger function: prevents deletion of the last Group Leader role from a group.
Allows cascade deletion when the parent group is being deleted (group row is gone).
SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- VERIFY: all 9 functions now have proconfig set
-- ============================================================

DO $$
DECLARE
  funcs_without_path INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO funcs_without_path
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN (
      'get_current_user_profile_id',
      'get_current_role',
      'is_group_leader',
      'is_active_group_leader',
      'is_active_group_member_for_enrollment',
      'group_has_leader',
      'update_updated_at_column',
      'validate_user_group_role',
      'prevent_last_leader_removal'
    )
    AND NOT (
      -- proconfig is an array of 'key=value' strings; check for search_path entry
      p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
      )
    );

  IF funcs_without_path > 0 THEN
    RAISE EXCEPTION '% function(s) still missing search_path setting!', funcs_without_path;
  END IF;

  RAISE NOTICE 'All 9 functions now have SET search_path = '''' applied.';
  RAISE NOTICE 'Migration completed successfully!';
END $$;
