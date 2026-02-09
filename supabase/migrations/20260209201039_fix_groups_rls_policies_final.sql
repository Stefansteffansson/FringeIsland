-- ============================================
-- Migration: Fix Groups RLS Policies (Final Solution)
-- Date: 2026-02-09
-- Issue: Groups INSERT was failing due to SELECT policy blocking RETURNING clause
-- ============================================

-- Root Cause:
--   PostgREST does INSERT...RETURNING which triggers SELECT RLS policy.
--   The SELECT policy only allowed seeing groups if:
--     1. Group is public, OR
--     2. User is an active member
--   When creating a new group:
--     - Group is private (is_public = false by default)
--     - Creator is not yet a member (membership created separately)
--     - Result: SELECT fails, INSERT appears to fail
--
-- Solution:
--   Add third condition to SELECT policy: creator can see their own group

-- ============================================
-- STEP 1: Ensure Helper Function Exists
-- ============================================

-- This function returns the current user's profile ID
-- Uses SECURITY DEFINER to bypass users table RLS
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_profile_id() TO authenticated;

COMMENT ON FUNCTION public.get_current_user_profile_id() IS
'Returns the profile ID (users.id) for the currently authenticated user.
Only returns ID if user is active (is_active=true).
Uses SECURITY DEFINER to bypass RLS on users table.';

-- ============================================
-- STEP 2: Fix SELECT Policy
-- ============================================

-- Drop old SELECT policy
DROP POLICY IF EXISTS "groups_select_with_function" ON groups;
DROP POLICY IF EXISTS "groups_select_by_creator_or_member" ON groups;

-- Create new SELECT policy with creator check
CREATE POLICY "groups_select_by_creator_or_member"
ON groups
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR is_active_group_member(id)
  OR created_by_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "groups_select_by_creator_or_member" ON groups IS
'Allows users to see groups if:
1. Group is public, OR
2. User is an active member, OR
3. User is the creator (allows seeing newly created groups before membership exists)';

-- ============================================
-- STEP 3: Fix INSERT Policy
-- ============================================

-- Drop old INSERT policies
DROP POLICY IF EXISTS "groups_insert_test" ON groups;
DROP POLICY IF EXISTS "groups_insert_all_roles" ON groups;
DROP POLICY IF EXISTS "groups_insert_with_function" ON groups;
DROP POLICY IF EXISTS "groups_insert_authenticated_users" ON groups;
DROP POLICY IF EXISTS "groups_insert_by_active_users" ON groups;

-- Create new INSERT policy
CREATE POLICY "groups_insert_by_active_users"
ON groups
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "groups_insert_by_active_users" ON groups IS
'Allows authenticated active users to create groups.
User can only set created_by_user_id to their own profile ID.
Uses get_current_user_profile_id() which checks is_active = true.';

-- ============================================
-- STEP 4: Ensure RLS is Enabled
-- ============================================

-- Re-enable RLS if it was disabled during testing
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  select_policy_count INTEGER;
  insert_policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check SELECT policy exists
  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'groups'
    AND cmd = 'SELECT'
    AND policyname = 'groups_select_by_creator_or_member';

  -- Check INSERT policy exists
  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'groups'
    AND cmd = 'INSERT'
    AND policyname = 'groups_insert_by_active_users';

  -- Check RLS is enabled
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'groups';

  -- Verify all conditions
  IF select_policy_count = 0 THEN
    RAISE EXCEPTION 'SELECT policy groups_select_by_creator_or_member not found!';
  END IF;

  IF insert_policy_count = 0 THEN
    RAISE EXCEPTION 'INSERT policy groups_insert_by_active_users not found!';
  END IF;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS is not enabled on groups table!';
  END IF;

  RAISE NOTICE '✓ SELECT policy groups_select_by_creator_or_member exists';
  RAISE NOTICE '✓ INSERT policy groups_insert_by_active_users exists';
  RAISE NOTICE '✓ RLS is enabled on groups table';
  RAISE NOTICE '✓ Migration completed successfully!';
END $$;
