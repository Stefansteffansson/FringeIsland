-- Migration: Add group_memberships RLS policies for Deusex admins
-- Date: 2026-02-17
--
-- Problem: Deusex admins cannot add or remove members from the Deusex group
--   because existing INSERT/DELETE policies on group_memberships only cover:
--   - INSERT: group creators (self-join) and invitation creators (status='invited')
--   - DELETE: group leaders via is_active_group_leader()
--   Neither path allows a Deusex admin to add someone else with status='active'
--   or remove an existing member from any group.
--
-- Fix: Add INSERT and DELETE policies that check for manage_all_groups permission
--   (Deusex-exclusive, Tier 1 resolution). This allows Deusex admins to manage
--   memberships in any group, which is the intended platform admin capability.

-- ============================================================================
-- 1. INSERT policy — Deusex admins can add members to any group
-- ============================================================================

CREATE POLICY "Platform admins can add members"
ON group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
  AND added_by_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "Platform admins can add members" ON group_memberships IS
'Allows Deusex admins (with manage_all_groups permission) to add members to any group.
Requires added_by_user_id to match the current user for audit trail integrity.
Uses Tier 1 resolution (dummy group_id) since manage_all_groups is a system-level permission.';

-- ============================================================================
-- 2. DELETE policy — Deusex admins can remove members from any group
-- ============================================================================

CREATE POLICY "Platform admins can remove members"
ON group_memberships
FOR DELETE
TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

COMMENT ON POLICY "Platform admins can remove members" ON group_memberships IS
'Allows Deusex admins (with manage_all_groups permission) to remove members from any group.
The last-Deusex-member trigger independently prevents removing the last admin.';

-- ============================================================================
-- 3. Verify
-- ============================================================================

DO $$
DECLARE
  v_insert_exists BOOLEAN;
  v_delete_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_memberships'
      AND policyname = 'Platform admins can add members'
      AND cmd = 'INSERT'
  ) INTO v_insert_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_memberships'
      AND policyname = 'Platform admins can remove members'
      AND cmd = 'DELETE'
  ) INTO v_delete_exists;

  IF NOT v_insert_exists THEN
    RAISE EXCEPTION 'INSERT policy "Platform admins can add members" was not created!';
  END IF;

  IF NOT v_delete_exists THEN
    RAISE EXCEPTION 'DELETE policy "Platform admins can remove members" was not created!';
  END IF;

  RAISE NOTICE 'Deusex admin membership policies created successfully';
END $$;
