-- Migration: Add UPDATE RLS Policy for Groups
-- Date: 2026-02-11
-- Issue: No UPDATE policy existed on the groups table, so Group Leaders could
--        not update group settings (name, description, visibility, etc.) via
--        the authenticated client. The edit group page (/groups/[id]/edit)
--        was silently failing.
--
-- Fix: Add UPDATE policy that allows Group Leaders to update their groups.

-- ============================================
-- ADD UPDATE POLICY
-- ============================================

-- Drop old policy if it somehow exists
DROP POLICY IF EXISTS "groups_update_by_leader" ON groups;

-- Create UPDATE policy: only Group Leaders can update their groups
CREATE POLICY "groups_update_by_leader"
ON groups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.user_id = public.get_current_user_profile_id()
      AND ugr.group_id = groups.id
      AND gr.name = 'Group Leader'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.user_id = public.get_current_user_profile_id()
      AND ugr.group_id = groups.id
      AND gr.name = 'Group Leader'
  )
);

COMMENT ON POLICY "groups_update_by_leader" ON groups IS
'Allows authenticated Group Leaders to update their group settings
(name, description, label, is_public, show_member_list, etc.).
Uses get_current_user_profile_id() to map auth.uid() → users.id.
Requires user_group_roles entry with group_roles.name = ''Group Leader''.';

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
    AND tablename = 'groups'
    AND cmd = 'UPDATE'
    AND policyname = 'groups_update_by_leader';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'UPDATE policy groups_update_by_leader was not created!';
  ELSE
    RAISE NOTICE '✓ UPDATE policy groups_update_by_leader created successfully';
  END IF;
END $$;
