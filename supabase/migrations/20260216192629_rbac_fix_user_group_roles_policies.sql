-- Migration: Update user_group_roles RLS policies for RBAC
-- Date: 2026-02-16
--
-- Problem: The INSERT/DELETE policies on user_group_roles still use the
--   pre-RBAC is_active_group_leader() check, which requires the 'Steward' role.
--   Users with assign_roles permission via other roles (e.g., Forum moderator)
--   cannot assign roles because the policy only checks for Steward.
--
-- Fix:
--   1. Create a SECURITY DEFINER helper can_assign_role() that checks:
--      a) User has 'assign_roles' permission in the group
--      b) Anti-escalation: user holds ALL permissions of the target role
--   2. Replace INSERT policy to use can_assign_role()
--   3. Replace DELETE policy to use has_permission('assign_roles')

-- ============================================================================
-- 1. Create can_assign_role() helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_assign_role(
  p_user_id UUID,
  p_group_id UUID,
  p_group_role_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    -- Check 1: user has assign_roles permission
    public.has_permission(p_user_id, p_group_id, 'assign_roles')
    -- Check 2: anti-escalation — no permission in the target role
    -- that the user doesn't also hold
    AND NOT EXISTS (
      SELECT 1
      FROM public.group_role_permissions grp
      JOIN public.permissions p ON p.id = grp.permission_id
      WHERE grp.group_role_id = p_group_role_id
        AND grp.granted = true
        AND NOT public.has_permission(p_user_id, p_group_id, p.name)
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_assign_role(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.can_assign_role IS
'Checks whether a user can assign a specific role in a group.
Requires assign_roles permission AND anti-escalation: the user must hold
every permission that the target role grants. SECURITY DEFINER to bypass
RLS on group_role_permissions and permissions tables.';

-- ============================================================================
-- 2. Replace INSERT policy on user_group_roles
-- ============================================================================

DROP POLICY IF EXISTS "Group Leaders can assign roles in their groups" ON public.user_group_roles;

CREATE POLICY "Users with assign_roles can assign roles"
ON public.user_group_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Case A: Users with assign_roles permission + anti-escalation
  (
    public.can_assign_role(
      public.get_current_user_profile_id(),
      group_id,
      group_role_id
    )
    AND assigned_by_user_id = public.get_current_user_profile_id()
  )
  OR
  -- Case B: Bootstrap — creator self-assigns roles when no Steward exists yet.
  -- This allows GroupCreateForm and invitation acceptance to work.
  (
    user_id = public.get_current_user_profile_id()
    AND assigned_by_user_id = public.get_current_user_profile_id()
    AND NOT public.group_has_leader(group_id)
  )
);

COMMENT ON POLICY "Users with assign_roles can assign roles" ON public.user_group_roles IS
'Allows users with assign_roles permission to assign roles, with anti-escalation:
they can only assign roles whose permissions they also hold.
Bootstrap case allows self-assignment when no Steward exists yet.';

-- ============================================================================
-- 3. Replace DELETE policy on user_group_roles
-- ============================================================================

DROP POLICY IF EXISTS "Group Leaders can remove roles in their groups" ON public.user_group_roles;

CREATE POLICY "Users with assign_roles can remove roles"
ON public.user_group_roles
FOR DELETE
TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    group_id,
    'assign_roles'
  )
);

COMMENT ON POLICY "Users with assign_roles can remove roles" ON public.user_group_roles IS
'Allows users with assign_roles permission to remove role assignments.
The check_last_leader_removal trigger independently enforces the last-Steward rule.';

-- ============================================================================
-- 4. Verify
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_insert_policy_exists BOOLEAN;
  v_delete_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'can_assign_role'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_group_roles'
      AND policyname = 'Users with assign_roles can assign roles'
  ) INTO v_insert_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_group_roles'
      AND policyname = 'Users with assign_roles can remove roles'
  ) INTO v_delete_policy_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'can_assign_role function not created!';
  END IF;

  IF NOT v_insert_policy_exists THEN
    RAISE EXCEPTION 'INSERT policy not created!';
  END IF;

  IF NOT v_delete_policy_exists THEN
    RAISE EXCEPTION 'DELETE policy not created!';
  END IF;

  RAISE NOTICE 'All user_group_roles policies updated successfully';
END $$;
