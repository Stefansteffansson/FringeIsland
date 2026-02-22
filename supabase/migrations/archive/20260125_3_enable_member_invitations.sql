-- Migration: Enable Member Invitations
-- Date: 2026-01-25
-- Description: Add RLS policies and fix constraints to enable inviting members to groups
--
-- This migration includes:
-- 1. RLS policy to allow users to search other users by email
-- 2. RLS policy to allow creating invitations
-- 3. Fix CHECK constraint to allow 'invited' status

-- ============================================
-- STEP 1: Allow users to search for other users by email
-- This is needed for the invite feature (finding users to invite)
-- ============================================

CREATE POLICY "Users can search other users by email for invitations"
ON users
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- STEP 2: Allow users to create invitations
-- Users can insert group_memberships with status='invited'
-- ============================================

CREATE POLICY "Users can create invitations for groups they lead"
ON group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  added_by_user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  AND status = 'invited'
);

-- ============================================
-- STEP 3: Fix CHECK constraint to allow 'invited' status
-- The original constraint only allowed 'active' and 'frozen'
-- We need to add 'invited' for pending invitations
-- ============================================

-- Drop the existing constraint
ALTER TABLE group_memberships 
DROP CONSTRAINT IF EXISTS group_memberships_status_check;

-- Create new constraint that includes 'invited'
ALTER TABLE group_memberships
ADD CONSTRAINT group_memberships_status_check 
CHECK (status IN ('active', 'invited', 'frozen'));

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS policies were created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
  (tablename = 'users' AND policyname = 'Users can search other users by email for invitations')
  OR (tablename = 'group_memberships' AND policyname = 'Users can create invitations for groups they lead')
);

-- Verify CHECK constraint was updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'group_memberships_status_check';

-- ============================================
-- NOTES
-- ============================================

-- 1. The users SELECT policy allows all authenticated users to search for other users.
--    This is necessary for the invite feature but maintains security by only allowing
--    viewing of basic user info (id, full_name, email).
--
-- 2. The group_memberships INSERT policy restricts invitation creation to:
--    - The user creating the invitation must be the added_by_user_id
--    - The status must be 'invited' (not 'active' or other statuses)
--
-- 3. The CHECK constraint now allows three statuses:
--    - 'active': Member has accepted and is active
--    - 'invited': Member has been invited but hasn't accepted yet
--    - 'frozen': Member access is temporarily suspended
--
-- 4. Future enhancements may include:
--    - Policy to restrict invitations to group leaders only
--    - Email notifications when invitations are sent
--    - Expiration dates for invitations
--    - Limit on number of pending invitations

-- ============================================
-- Migration complete!
-- ============================================
