-- Migration: Add last leader protection trigger
-- Date: 2026-01-25
-- Version: v0.2.5
-- Description: Prevents removal of the last Group Leader from a group

-- ============================================================================
-- LAST LEADER PROTECTION TRIGGER
-- ============================================================================

-- Create function to prevent last leader removal
CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader_role BOOLEAN;
BEGIN
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

  -- Count remaining Group Leaders in the group
  SELECT COUNT(*)
  INTO leader_count
  FROM user_group_roles ugr
  JOIN group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND gr.name = 'Group Leader'
    AND ugr.id != OLD.id;  -- Exclude the role being deleted

  -- If this is the last leader, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Group Leader from the group. Assign another leader first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_group_roles
DROP TRIGGER IF EXISTS check_last_leader_removal ON user_group_roles;

CREATE TRIGGER check_last_leader_removal
  BEFORE DELETE ON user_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_leader_removal();

-- Add comment for documentation
COMMENT ON FUNCTION prevent_last_leader_removal() IS 'Prevents deletion of the last Group Leader role from a group. Ensures every group always has at least one leader.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  -- Check if trigger was created
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'check_last_leader_removal'
  ) INTO trigger_exists;

  IF trigger_exists THEN
    RAISE NOTICE 'SUCCESS: Last leader protection trigger created';
  ELSE
    RAISE WARNING 'WARNING: Trigger creation failed';
  END IF;
END $$;
