-- Migration: Fix user_group_roles INSERT policy + add missing DELETE policy
-- Date: 2026-02-11
--
-- Problem 1: INSERT policy "Users can assign themselves roles in groups they
--   belong to" only allows inserting when user_id = current user. The app
--   inserts with user_id = memberId (another user), so ALL role assignments
--   via the authenticated client fail with 403 / 42501.
--
-- Problem 2: No DELETE policy exists on user_group_roles. Group Leaders
--   cannot remove roles from members via the authenticated client.
--
-- Fix: Replace the placeholder INSERT policy with one that:
--   a) Allows Group Leaders to assign any role to members of their group
--   b) Allows bootstrapping: the group creator self-assigns the first
--      leader role (only when no leader exists yet in the group)
--
--   Add a DELETE policy that allows Group Leaders to remove roles.
--   The last-leader protection trigger still enforces the business rule.

-- ============================================
-- HELPER: check if a group already has a leader
-- (SECURITY DEFINER avoids self-referential RLS on user_group_roles)
-- ============================================

CREATE OR REPLACE FUNCTION public.group_has_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = p_group_id
      AND gr.name = 'Group Leader'
  );
$$;

GRANT EXECUTE ON FUNCTION public.group_has_leader(UUID) TO authenticated;

COMMENT ON FUNCTION public.group_has_leader IS
'Returns true if the given group already has at least one Group Leader role
assigned. SECURITY DEFINER avoids self-referential RLS recursion when called
from user_group_roles INSERT policy.';

-- ============================================
-- FIX 1: Replace INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Users can assign themselves roles in groups they belong to" ON user_group_roles;

CREATE POLICY "Group Leaders can assign roles in their groups"
ON user_group_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Case A: Group Leaders can assign any role to any member of their group
  (
    is_active_group_leader(group_id)
    AND assigned_by_user_id = get_current_user_profile_id()
  )
  OR
  -- Case B: Bootstrap - creator self-assigns the first leader role.
  -- Only permitted when no Group Leader exists yet in the group
  -- (prevents non-leaders from granting themselves roles after setup).
  (
    user_id = get_current_user_profile_id()
    AND assigned_by_user_id = get_current_user_profile_id()
    AND NOT group_has_leader(group_id)
  )
);

COMMENT ON POLICY "Group Leaders can assign roles in their groups" ON user_group_roles IS
'Allows Group Leaders to assign any role to members of their group.
Also allows bootstrapping: the creator can self-assign the first Group Leader
role when no leader exists yet. Uses SECURITY DEFINER helpers to avoid RLS
recursion.';

-- ============================================
-- FIX 2: Add missing DELETE policy
-- ============================================

DROP POLICY IF EXISTS "Group Leaders can remove roles in their groups" ON user_group_roles;

CREATE POLICY "Group Leaders can remove roles in their groups"
ON user_group_roles
FOR DELETE
TO authenticated
USING (
  is_active_group_leader(group_id)
);

COMMENT ON POLICY "Group Leaders can remove roles in their groups" ON user_group_roles IS
'Allows Group Leaders to remove role assignments in their group.
The check_last_leader_removal trigger enforces the last-leader business rule
independently of this RLS policy.';

-- ============================================
-- VERIFY
-- ============================================

DO $$
DECLARE
  insert_policy_count INTEGER;
  delete_policy_count INTEGER;
  helper_func_exists  BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_group_roles'
    AND cmd = 'INSERT'
    AND policyname = 'Group Leaders can assign roles in their groups';

  SELECT COUNT(*) INTO delete_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_group_roles'
    AND cmd = 'DELETE'
    AND policyname = 'Group Leaders can remove roles in their groups';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'group_has_leader'
      AND pronamespace = 'public'::regnamespace
  ) INTO helper_func_exists;

  IF insert_policy_count = 0 THEN
    RAISE EXCEPTION 'INSERT policy for user_group_roles was not created!';
  END IF;

  IF delete_policy_count = 0 THEN
    RAISE EXCEPTION 'DELETE policy for user_group_roles was not created!';
  END IF;

  IF NOT helper_func_exists THEN
    RAISE EXCEPTION 'group_has_leader() function was not created!';
  END IF;

  RAISE NOTICE 'FIX 1: INSERT policy "Group Leaders can assign roles in their groups" created';
  RAISE NOTICE 'FIX 2: DELETE policy "Group Leaders can remove roles in their groups" created';
  RAISE NOTICE 'HELPER: group_has_leader() SECURITY DEFINER function created';
  RAISE NOTICE 'Migration completed successfully!';
END $$;
