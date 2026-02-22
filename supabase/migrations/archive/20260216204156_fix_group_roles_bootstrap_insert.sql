-- Migration: Fix group_roles INSERT policy for group creation bootstrap
-- Date: 2026-02-16
--
-- Problem: The group_roles INSERT policy requires manage_roles permission.
--   During group creation, the creator has no roles yet (roles are being
--   created), so they don't have manage_roles. This causes a 403 error.
--
-- Fix: Add a bootstrap case — the group creator can create roles when
--   no Steward exists yet (i.e., during initial group setup).

-- ============================================================================
-- 1. Create helper to check group creator (SECURITY DEFINER avoids nested RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id
      AND created_by_user_id = public.get_current_user_profile_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_creator(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_group_creator IS
'Returns true if the current user created the given group.
SECURITY DEFINER to bypass RLS on the groups table when called
from other RLS policies.';

-- ============================================================================
-- 2. Replace INSERT policy on group_roles with bootstrap case
-- ============================================================================

DROP POLICY IF EXISTS "manage_roles_insert" ON public.group_roles;

CREATE POLICY "manage_roles_insert"
ON public.group_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Normal case: user has manage_roles permission
  public.has_permission(
    public.get_current_user_profile_id(),
    group_id,
    'manage_roles'
  )
  OR
  -- Bootstrap case: group creator when no Steward exists yet
  (
    public.is_group_creator(group_id)
    AND NOT public.group_has_leader(group_id)
  )
);

-- ============================================================================
-- 3. Verify
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_group_creator'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'group_roles'
      AND policyname = 'manage_roles_insert'
  ) INTO v_policy_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'is_group_creator function not created!';
  END IF;

  IF NOT v_policy_exists THEN
    RAISE EXCEPTION 'manage_roles_insert policy not created!';
  END IF;

  RAISE NOTICE 'group_roles INSERT policy updated with bootstrap case';
END $$;
