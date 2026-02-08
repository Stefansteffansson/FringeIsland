-- Migration: Fix Groups RLS Visibility Policy
-- Date: 2026-02-08
-- Issue: B-GRP-003 failing - non-members can see private groups
-- Root Cause: RLS policy may not be properly filtering by membership status
--
-- This migration ensures the groups SELECT policy correctly enforces:
-- 1. Public groups visible to all authenticated users
-- 2. Private groups ONLY visible§ to users with status='active' membership
-- 3. Users with status='invited', 'removed', or 'paused' cannot see private groups
-- 4. Non-members cannot see private groups

-- ============================================
-- DROP EXISTING SELECT POLICIES
-- ============================================

-- Drop all existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Anyone can view public groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they belong to or public groups" ON groups;

-- ============================================
-- CREATE NEW COMPREHENSIVE SELECT POLICY
-- ============================================

-- This single policy handles both public and private group visibility
CREATE POLICY "groups_select_policy"
ON groups
FOR SELECT
TO authenticated
USING (
  -- Allow if group is public
  is_public = true
  OR
  -- Allow if user is an ACTIVE member of the private group
  EXISTS (
    SELECT 1
    FROM group_memberships gm
    INNER JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = groups.id
      AND u.auth_user_id = auth.uid()
      AND gm.status = 'active'
  )
);

-- ============================================
-- VERIFY THE POLICY
-- ============================================

-- Check that the policy was created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'groups'
    AND cmd = 'SELECT'
    AND policyname = 'groups_select_policy';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create groups_select_policy';
  ELSE
    RAISE NOTICE 'Successfully created groups_select_policy';
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "groups_select_policy" ON groups IS
'Allows authenticated users to view:
1. All public groups (is_public = true)
2. Private groups where they have status=active membership
Users with invited/paused/removed status cannot view private groups.';

-- ============================================
-- TESTING NOTES
-- ============================================

-- To test this policy:
-- 1. Create a private group
-- 2. Add user A with status='active'
-- 3. Add user B with status='invited'
-- 4. User A should see the group
-- 5. User B should NOT see the group
-- 6. Non-members should NOT see the group
-- 7. Everyone should see public groups
