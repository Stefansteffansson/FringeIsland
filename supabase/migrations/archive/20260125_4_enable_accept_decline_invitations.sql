-- Migration: Enable Accepting and Declining Invitations
-- Date: 2026-01-25
-- Description: Add RLS policies to allow users to accept or decline their invitations
--
-- This migration adds:
-- 1. Policy to allow users to update their own invitations (accept)
-- 2. Policy to allow users to delete their own invitations (decline)

-- ============================================
-- STEP 1: Allow users to accept invitations
-- Users can update group_memberships where they are the invited user
-- and the status is 'invited' (changing it to 'active')
-- ============================================

CREATE POLICY "Users can accept their own invitations"
ON group_memberships
FOR UPDATE
TO authenticated
USING (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  AND status = 'invited'
)
WITH CHECK (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  AND status = 'active'  -- Can only change to 'active'
);

-- ============================================
-- STEP 2: Allow users to decline invitations
-- Users can delete group_memberships where they are the invited user
-- and the status is 'invited'
-- ============================================

CREATE POLICY "Users can decline their own invitations"
ON group_memberships
FOR DELETE
TO authenticated
USING (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  AND status = 'invited'
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the policies were created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'group_memberships'
AND cmd IN ('UPDATE', 'DELETE');

-- ============================================
-- NOTES
-- ============================================

-- 1. The UPDATE policy ensures users can only:
--    - Update invitations where they are the invited user
--    - Only update invitations with status='invited'
--    - Only change the status to 'active' (accepting)
--
-- 2. The DELETE policy ensures users can only:
--    - Delete invitations where they are the invited user
--    - Only delete invitations with status='invited'
--    - This implements the "decline" functionality
--
-- 3. These policies maintain security by:
--    - Users can't modify other people's memberships
--    - Users can't change status to anything other than 'active' when accepting
--    - Users can't delete active memberships (only pending invitations)

-- ============================================
-- Migration complete!
-- ============================================
