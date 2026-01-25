-- Fix for Group Detail Page: Update Groups RLS Policy
-- Issue: 406 error when trying to view groups
-- Cause: RLS policy blocks all queries unless user is a member
-- Solution: Combine the two SELECT policies into one with OR logic

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Anyone can view public groups" ON groups;

-- Create combined policy that allows:
-- 1. Users to view groups they're members of
-- 2. Anyone to view public groups
CREATE POLICY "Users can view groups they belong to or public groups"
ON groups
FOR SELECT
TO authenticated
USING (
  -- Allow if group is public
  is_public = true
  OR
  -- Allow if user is a member of the group
  id IN (
    SELECT group_id FROM group_memberships 
    WHERE user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  )
);

-- Verify the policy was created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'groups'
AND cmd = 'SELECT';
