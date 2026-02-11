-- Migration: Add Group Leader DELETE policy + fix cascade trigger
-- Date: 2026-02-11
--
-- Part 1: Fix prevent_last_leader_removal() trigger so it does NOT block
--   cascade deletions that happen when the parent group is being deleted.
--   Within a PostgreSQL transaction, after the groups row is deleted the
--   cascade triggers on user_group_roles can no longer see the group row.
--   We use this to detect a cascade-delete and allow the role deletion.
--
-- Part 2: Add DELETE RLS policy on groups so Group Leaders can delete
--   their own groups (using the existing is_active_group_leader() helper).

-- ============================================
-- FIX 1: Update trigger to allow cascade delete
-- ============================================

CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader_role BOOLEAN;
BEGIN
  -- Allow deletion when the parent group itself is being deleted (CASCADE).
  -- Within the same transaction the groups row is already gone by the time
  -- this trigger fires, so this SELECT returns no rows during a group delete.
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  -- Check if the role being removed is "Group Leader"
  SELECT EXISTS (
    SELECT 1
    FROM group_roles
    WHERE id = OLD.group_role_id
      AND name = 'Group Leader'
  ) INTO is_leader_role;

  -- If not a leader role, allow deletion
  IF NOT is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Group Leaders in the group (excluding the row being deleted)
  SELECT COUNT(*)
  INTO leader_count
  FROM user_group_roles ugr
  JOIN group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND gr.name = 'Group Leader'
    AND ugr.id != OLD.id;

  -- If this is the last leader, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Group Leader from the group. Assign another leader first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_last_leader_removal() IS
'Prevents deletion of the last Group Leader role from a group.
Allows cascade deletion when the parent group is being deleted (group row is gone from the transaction).';

-- ============================================
-- FIX 2: Add DELETE RLS policy for Group Leaders
-- ============================================

DROP POLICY IF EXISTS "Group Leaders can delete their groups" ON groups;

CREATE POLICY "Group Leaders can delete their groups"
ON groups
FOR DELETE
TO authenticated
USING (
  is_active_group_leader(id)
);

COMMENT ON POLICY "Group Leaders can delete their groups" ON groups IS
'Allows Group Leaders to delete groups they lead. Deletion cascades to
group_memberships, group_roles, user_group_roles, and journey_enrollments.
Uses is_active_group_leader() SECURITY DEFINER function to avoid RLS recursion.';

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
    AND cmd = 'DELETE'
    AND policyname = 'Group Leaders can delete their groups';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'DELETE policy for Group Leaders was not created!';
  ELSE
    RAISE NOTICE 'FIX 1: prevent_last_leader_removal() updated to allow cascade delete';
    RAISE NOTICE 'FIX 2: DELETE policy for Group Leaders created successfully';
    RAISE NOTICE 'Migration completed successfully!';
  END IF;
END $$;
