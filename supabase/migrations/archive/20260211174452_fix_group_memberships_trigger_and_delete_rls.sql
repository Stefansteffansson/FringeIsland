-- Migration: Fix group_memberships trigger and DELETE RLS policies
-- Date: 2026-02-11
--
-- Issue 1: check_last_leader_removal trigger is accidentally on group_memberships
-- (should only be on user_group_roles). group_memberships has no group_role_id
-- field, so the trigger crashes with 42703 on any DELETE from this table.
--
-- Issue 2: "Leaders can remove members from their groups" DELETE policy has
-- infinite recursion (42P17) because its USING clause subquery references
-- group_memberships itself, triggering RLS evaluation recursively.
-- This blocks all uses of the Leaders DELETE policy and the invitee decline policy.
--
-- Issue 3: "Users can add members to groups they lead" INSERT policy is too
-- permissive — no status restriction, allowing status='active' bypassing invitations.

-- ============================================
-- FIX 1: Remove trigger from wrong table
-- ============================================

DROP TRIGGER IF EXISTS check_last_leader_removal ON group_memberships;

-- ============================================
-- FIX 2: Create helper function to check leader status
-- (SECURITY DEFINER avoids self-referential RLS subqueries)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_active_group_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.user_id = public.get_current_user_profile_id()
      AND ugr.group_id = p_group_id
      AND gr.name = 'Group Leader'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_group_leader(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_active_group_leader IS
'Returns true if the currently authenticated user is a Group Leader of the given group.
Uses SECURITY DEFINER to avoid infinite recursion in RLS policies on group_memberships.';

-- ============================================
-- FIX 3: Recreate DELETE policies without self-reference
-- ============================================

DROP POLICY IF EXISTS "Leaders can remove members from their groups" ON group_memberships;

CREATE POLICY "Leaders can remove members from their groups"
ON group_memberships
FOR DELETE
TO authenticated
USING (
  is_active_group_leader(group_id)
  AND status = 'active'
);

COMMENT ON POLICY "Leaders can remove members from their groups" ON group_memberships IS
'Allows Group Leaders to remove active members. Uses is_active_group_leader()
to avoid infinite recursion in RLS policy evaluation.';

-- ============================================
-- FIX 4: Remove the overly permissive INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Users can add members to groups they lead" ON group_memberships;

-- ============================================
-- VERIFY
-- ============================================

DO $$
DECLARE
  trigger_on_memberships BOOLEAN;
  leader_func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'check_last_leader_removal'
      AND c.relname = 'group_memberships'
  ) INTO trigger_on_memberships;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_active_group_leader'
      AND pronamespace = 'public'::regnamespace
  ) INTO leader_func_exists;

  IF trigger_on_memberships THEN
    RAISE EXCEPTION 'Trigger check_last_leader_removal still on group_memberships!';
  ELSE
    RAISE NOTICE 'FIX 1: Trigger removed from group_memberships';
  END IF;

  IF NOT leader_func_exists THEN
    RAISE EXCEPTION 'is_active_group_leader function not created!';
  ELSE
    RAISE NOTICE 'FIX 2: is_active_group_leader function created';
  END IF;

  RAISE NOTICE 'FIX 3+4: DELETE/INSERT policies on group_memberships fixed';
  RAISE NOTICE 'Migration completed successfully!';
END $$;
