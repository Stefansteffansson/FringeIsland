-- Migration: Fix RLS Infinite Recursion (v2)
-- Date: 2026-02-08
-- Issue: Still getting infinite recursion even after first fix
--
-- Root Cause:
-- - group_memberships policy was still doing a self-join on group_memberships
-- - Even with an alias, Postgres evaluates RLS on the aliased table
-- - This creates infinite recursion
--
-- Solution:
-- - Make group_memberships policy SIMPLE - only check user_id and group's public status
-- - Don't query group_memberships within group_memberships policy
-- - This breaks the circular dependency

-- ============================================
-- FIX GROUP_MEMBERSHIPS SELECT POLICY (V2)
-- ============================================

-- Drop the still-recursive policy
DROP POLICY IF EXISTS "group_memberships_select_policy" ON group_memberships;

-- Create a truly non-recursive policy
-- Users can see:
-- 1. Their own memberships (any status)
-- 2. Memberships in PUBLIC groups (anyone can see public group members)
CREATE POLICY "group_memberships_select_simple"
ON group_memberships
FOR SELECT
TO authenticated
USING (
  -- Allow users to see their own memberships
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  OR
  -- Allow anyone to see memberships in public groups
  -- This checks groups table but groups doesn't check memberships for public groups
  group_id IN (
    SELECT id FROM groups WHERE is_public = true
  )
);

-- ============================================
-- VERIFY NO RECURSION
-- ============================================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE 'Testing for infinite recursion...';

  -- This would fail if there's still recursion
  SELECT COUNT(*) as cnt INTO test_result
  FROM group_memberships
  LIMIT 1;

  RAISE NOTICE 'SUCCESS: No recursion detected';
  RAISE NOTICE 'Query executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Recursion detected: %', SQLERRM;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "group_memberships_select_simple" ON group_memberships IS
'Simple non-recursive policy. Users can view:
1. Their own memberships (all statuses)
2. Memberships in public groups (since anyone can view public groups)

Note: For private groups, only the user''s own membership is visible.
This is by design to break circular dependency with groups table.';

-- ============================================
-- NOTES
-- ============================================

-- This policy is intentionally simple to avoid recursion.
-- Users can only see OTHER members if:
--   - The group is public, OR
--   - They query via application layer after verifying group access
--
-- This means in private groups, users won't see other members via this policy alone.
-- The application should query memberships AFTER verifying the user can see the group.
