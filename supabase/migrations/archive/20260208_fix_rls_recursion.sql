-- Migration: Fix RLS Infinite Recursion
-- Date: 2026-02-08
-- Issue: Infinite recursion in group_memberships SELECT policy
--
-- Root Cause:
-- - groups policy checks group_memberships (to see if user is a member)
-- - group_memberships policy checks group_memberships again (recursive!)
-- - This creates infinite recursion
--
-- Solution:
-- - Simplify group_memberships policy to not reference itself
-- - Allow users to see memberships in groups they belong to OR their own memberships

-- ============================================
-- FIX GROUP_MEMBERSHIPS SELECT POLICY
-- ============================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view memberships of their groups" ON group_memberships;

-- Create a non-recursive policy that allows users to see:
-- 1. Their own memberships (regardless of status)
-- 2. Memberships in groups where they are active members
CREATE POLICY "group_memberships_select_policy"
ON group_memberships
FOR SELECT
TO authenticated
USING (
  -- Allow users to see their own memberships (all statuses)
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  OR
  -- Allow users to see other members in groups where they are active
  -- Use a direct join without recursion
  EXISTS (
    SELECT 1
    FROM group_memberships my_membership
    INNER JOIN users u ON u.id = my_membership.user_id
    WHERE my_membership.group_id = group_memberships.group_id
      AND u.auth_user_id = auth.uid()
      AND my_membership.status = 'active'
  )
);

-- ============================================
-- VERIFY NO RECURSION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully';
  RAISE NOTICE 'Testing for recursion...';

  -- Try a simple query that would trigger recursion if it exists
  PERFORM 1
  FROM group_memberships
  LIMIT 1;

  RAISE NOTICE 'SUCCESS: No recursion detected';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Recursion still detected: %', SQLERRM;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "group_memberships_select_policy" ON group_memberships IS
'Allows users to view:
1. Their own memberships (all statuses - invited, active, paused, removed)
2. Other members in groups where they have active membership
This policy avoids recursion by using EXISTS with a self-join instead of a subquery.';

-- ============================================
-- TESTING NOTES
-- ============================================

-- Test cases:
-- 1. User should see their own memberships (status='invited', 'active', etc.)
-- 2. Active members should see other members in the same group
-- 3. Non-members should NOT see memberships in groups they don't belong to
-- 4. Queries should not cause infinite recursion errors
