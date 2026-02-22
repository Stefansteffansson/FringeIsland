-- Migration: Enable Leave and Remove Members
-- Date: 2026-01-25
-- Description: Add RLS policies to allow members to leave groups and leaders to remove members
--
-- This migration adds:
-- 1. Policy to allow members to leave groups (delete their own membership)
-- 2. Policy to allow leaders to remove other members
-- 3. Trigger to prevent removing the last leader

-- ============================================
-- STEP 1: Allow members to leave groups
-- Members can delete their own active membership
-- ============================================

CREATE POLICY "Members can leave groups"
ON group_memberships
FOR DELETE
TO authenticated
USING (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
  AND status = 'active'
);

-- ============================================
-- STEP 2: Allow leaders to remove members
-- Leaders can delete other members' active memberships in groups they lead
-- ============================================

CREATE POLICY "Leaders can remove members from their groups"
ON group_memberships
FOR DELETE
TO authenticated
USING (
  -- The membership being deleted is in a group where the current user is a leader
  group_id IN (
    SELECT gm.group_id
    FROM group_memberships gm
    JOIN user_group_roles ugr ON ugr.user_id = gm.user_id AND ugr.group_id = gm.group_id
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE gm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND gm.status = 'active'
    AND gr.name = 'Group Leader'
  )
  AND status = 'active'
);

-- ============================================
-- STEP 3: Trigger to prevent removing the last leader
-- This ensures every group always has at least one leader
-- ============================================

CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader BOOLEAN;
BEGIN
  -- Check if the member being removed is a leader
  SELECT EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE ugr.user_id = OLD.user_id
    AND ugr.group_id = OLD.group_id
    AND gr.name = 'Group Leader'
  ) INTO is_leader;

  -- If not a leader, allow deletion
  IF NOT is_leader THEN
    RETURN OLD;
  END IF;

  -- Count remaining leaders in the group
  SELECT COUNT(DISTINCT ugr.user_id)
  INTO leader_count
  FROM user_group_roles ugr
  JOIN group_roles gr ON gr.id = ugr.group_role_id
  JOIN group_memberships gm ON gm.user_id = ugr.user_id AND gm.group_id = ugr.group_id
  WHERE ugr.group_id = OLD.group_id
  AND gr.name = 'Group Leader'
  AND gm.status = 'active'
  AND ugr.user_id != OLD.user_id;  -- Exclude the user being removed

  -- If this is the last leader, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last leader from the group. Promote another member to leader first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_last_leader_removal ON group_memberships;
CREATE TRIGGER check_last_leader_removal
BEFORE DELETE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_last_leader_removal();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the policies were created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'group_memberships'
AND policyname IN ('Members can leave groups', 'Leaders can remove members from their groups');

-- Verify the trigger was created
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'check_last_leader_removal';

-- ============================================
-- NOTES
-- ============================================

-- 1. The "Members can leave groups" policy allows:
--    - Users to delete their own active memberships
--    - This is separate from declining invitations (which has status='invited')
--
-- 2. The "Leaders can remove members" policy allows:
--    - Group leaders to remove other members from groups they lead
--    - Only works on active memberships
--    - Leaders can also remove other leaders (if not the last one)
--
-- 3. The trigger ensures:
--    - Every group always has at least one leader
--    - Prevents both self-removal and leader-removal of the last leader
--    - Returns a clear error message to the user
--
-- 4. Security considerations:
--    - Members can only delete their own memberships
--    - Leaders can only remove members from groups they lead
--    - The trigger runs before deletion, preventing data inconsistency
--
-- 5. Future enhancements:
--    - Add notification when removed from a group
--    - Add audit log for member removals
--    - Add "transfer leadership" feature before leaving

-- ============================================
-- Migration complete!
-- ============================================
