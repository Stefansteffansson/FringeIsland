-- Migration: Fix RLS with Security Definer Functions
-- Date: 2026-02-08
-- Issue: Circular dependency between groups and group_memberships policies
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS for checking membership
-- This breaks the circular dependency by having a trusted function do the check

-- ============================================
-- CREATE SECURITY DEFINER FUNCTION
-- ============================================

-- Function to check if current user is an active member of a group
-- SECURITY DEFINER means it runs with the privileges of the function owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_active_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  is_member BOOLEAN;
BEGIN
  -- Get the current user's UUID from users table
  SELECT id INTO user_uuid
  FROM users
  WHERE auth_user_id = auth.uid();

  -- If user not found, return false
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has active membership (bypass RLS with SECURITY DEFINER)
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = check_group_id
      AND user_id = user_uuid
      AND status = 'active'
  ) INTO is_member;

  RETURN COALESCE(is_member, FALSE);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_active_group_member(UUID) TO authenticated;

-- ============================================
-- UPDATE GROUPS SELECT POLICY
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "groups_select_policy" ON groups;

-- Create new policy using the security definer function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY "groups_select_with_function"
ON groups
FOR SELECT
TO authenticated
USING (
  -- Allow if group is public
  is_public = true
  OR
  -- Allow if user is an active member (using security definer function)
  is_active_group_member(id)
);

-- ============================================
-- UPDATE GROUP_MEMBERSHIPS SELECT POLICY
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "group_memberships_select_simple" ON group_memberships;

-- Create simple policy that doesn't cause recursion
CREATE POLICY "group_memberships_select_with_function"
ON group_memberships
FOR SELECT
TO authenticated
USING (
  -- Allow users to see their own memberships
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  OR
  -- Allow users to see memberships in groups where they are active members
  -- Using the security definer function avoids recursion
  is_active_group_member(group_id)
);

-- ============================================
-- VERIFY NO RECURSION
-- ============================================

DO $$
DECLARE
  test_count INTEGER;
BEGIN
  RAISE NOTICE 'Testing for infinite recursion...';

  -- Test querying groups (this would fail with recursion)
  SELECT COUNT(*) INTO test_count FROM groups LIMIT 1;
  RAISE NOTICE 'groups query: OK';

  -- Test querying group_memberships (this would fail with recursion)
  SELECT COUNT(*) INTO test_count FROM group_memberships LIMIT 1;
  RAISE NOTICE 'group_memberships query: OK';

  RAISE NOTICE 'SUCCESS: No recursion detected!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Recursion or error detected: %', SQLERRM;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION is_active_group_member(UUID) IS
'Security definer function to check if current user is an active member of a group.
Bypasses RLS to avoid circular dependencies in RLS policies.
Returns TRUE if user has status=active membership, FALSE otherwise.';

COMMENT ON POLICY "groups_select_with_function" ON groups IS
'Uses security definer function to avoid RLS recursion.
Users can view: (1) public groups, (2) groups they are active members of.';

COMMENT ON POLICY "group_memberships_select_with_function" ON group_memberships IS
'Uses security definer function to avoid RLS recursion.
Users can view: (1) their own memberships, (2) memberships in groups they belong to.';
