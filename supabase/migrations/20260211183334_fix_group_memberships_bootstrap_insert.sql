-- Migration: Fix group_memberships INSERT policy for group creation bootstrap
-- Date: 2026-02-11
--
-- Problem: The "Users can add members to groups they lead" INSERT policy was
--   removed in 20260211174452 because it allowed any status without restriction
--   (too permissive). However this broke group creation entirely:
--   GroupCreateForm.tsx step 2 inserts the creator as an active member
--   (status='active') before they hold a Group Leader role.
--   Without ANY policy allowing this, PostgREST returns 403/42501.
--
-- Current INSERT policies on group_memberships AFTER that removal:
--   1. "Users can create invitations for groups they lead" — status='invited' only
--   No policy allows the creator to self-add with status='active'.
--
-- Fix: Add a bootstrap INSERT policy that allows group creators to add
--   themselves as an active member in their own group.
--   Safe because:
--     - user_id must equal the current authenticated user (self-join only)
--     - added_by_user_id must also equal the current user (no impersonation)
--     - status is restricted to 'active' (no bypass to other statuses)
--     - group must have been created by the current user (own group only)
--     - reads from groups table (not group_memberships) — no RLS recursion
--

-- ============================================
-- FIX: Add bootstrap INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Group creator can join their own group" ON group_memberships;

CREATE POLICY "Group creator can join their own group"
ON group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  -- Creator adds themselves as active member in their own group
  user_id = get_current_user_profile_id()
  AND added_by_user_id = get_current_user_profile_id()
  AND status = 'active'
  AND (SELECT created_by_user_id FROM groups WHERE id = group_id) = get_current_user_profile_id()
);

COMMENT ON POLICY "Group creator can join their own group" ON group_memberships IS
'Allows group creators to add themselves as an active member in their own group.
Required for the group creation bootstrap flow (GroupCreateForm.tsx step 2).
Reads from groups table (not group_memberships) to avoid RLS recursion.
Uses get_current_user_profile_id() to safely look up the current user.';

-- ============================================
-- VERIFY
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'group_memberships'
    AND cmd = 'INSERT'
    AND policyname = 'Group creator can join their own group';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Bootstrap INSERT policy for group_memberships was not created!';
  END IF;

  RAISE NOTICE 'FIX: "Group creator can join their own group" INSERT policy created';
  RAISE NOTICE 'Migration completed successfully!';
END $$;
