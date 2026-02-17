-- Migration: Fix groups visibility for invited users + rename Deusex → DeusEx
-- Date: 2026-02-17
--
-- Problem 1: Users who are invited to a private group cannot see the group name
--   because the groups SELECT policy only checks is_active_group_member() (status='active').
--   This causes "Unknown Group" on the invitations page.
--
-- Problem 2: The Deusex system group has no display-friendly name.
--   Rename to "DeusEx" for proper casing.
--
-- Fix: Add is_invited_group_member() function and update the groups SELECT policy
--   to also allow invited users to see the group they've been invited to.

-- ============================================================================
-- 1. Create is_invited_group_member() helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_invited_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_is_invited BOOLEAN;
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE group_id = check_group_id
      AND user_id = v_user_id
      AND status = 'invited'
  ) INTO v_is_invited;

  RETURN COALESCE(v_is_invited, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_invited_group_member(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_invited_group_member IS
'Returns true if the current user has a pending invitation (status=invited) to the given group.
SECURITY DEFINER to bypass RLS on group_memberships. Used in groups SELECT policy
so invited users can see the group name on the invitations page.';

-- ============================================================================
-- 2. Update groups SELECT policy to include invited members
-- ============================================================================

DROP POLICY IF EXISTS "groups_select_by_creator_or_member" ON groups;

CREATE POLICY "groups_select_by_creator_or_member"
ON groups
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR public.is_active_group_member(id)
  OR public.is_invited_group_member(id)
  OR created_by_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "groups_select_by_creator_or_member" ON groups IS
'Allows users to see groups if:
1. Group is public, OR
2. User is an active member, OR
3. User has been invited (can see group name on invitations page), OR
4. User is the creator (allows seeing newly created groups before membership exists)';

-- ============================================================================
-- 3. Rename Deusex → DeusEx
-- ============================================================================

UPDATE groups
SET name = 'DeusEx'
WHERE name = 'Deusex'
  AND group_type = 'system';

-- ============================================================================
-- 4. Verify
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_policy_exists BOOLEAN;
  v_group_name TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_invited_group_member'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'groups'
      AND policyname = 'groups_select_by_creator_or_member'
  ) INTO v_policy_exists;

  SELECT name INTO v_group_name
  FROM public.groups
  WHERE group_type = 'system'
    AND name = 'DeusEx';

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'is_invited_group_member function not created!';
  END IF;

  IF NOT v_policy_exists THEN
    RAISE EXCEPTION 'groups SELECT policy not recreated!';
  END IF;

  IF v_group_name IS NULL THEN
    RAISE EXCEPTION 'DeusEx group not renamed!';
  END IF;

  RAISE NOTICE 'Groups visibility for invited users fixed, DeusEx renamed';
END $$;
