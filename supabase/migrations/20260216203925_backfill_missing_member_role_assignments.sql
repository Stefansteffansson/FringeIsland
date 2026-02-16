-- Migration: Backfill missing Member role assignments
-- Date: 2026-02-16
--
-- Problem: Some active members accepted invitations before the
--   auto_assign_member_role_on_accept trigger existed, so they
--   have no Member role assignment.
--
-- Fix: For every active member in an engagement group who has no
--   roles at all, assign the group's Member role.

DO $$
DECLARE
  v_member RECORD;
  v_member_role_id UUID;
  v_assignments_created INT := 0;
BEGIN
  FOR v_member IN
    SELECT gm.user_id, gm.group_id
    FROM group_memberships gm
    JOIN groups g ON g.id = gm.group_id
    LEFT JOIN user_group_roles ugr
      ON ugr.user_id = gm.user_id AND ugr.group_id = gm.group_id
    WHERE gm.status = 'active'
      AND g.group_type = 'engagement'
      AND ugr.id IS NULL
  LOOP
    -- Find the Member role for this group
    SELECT id INTO v_member_role_id
    FROM group_roles
    WHERE group_id = v_member.group_id
      AND name = 'Member'
    LIMIT 1;

    IF v_member_role_id IS NOT NULL THEN
      INSERT INTO user_group_roles (user_id, group_id, group_role_id, assigned_by_user_id)
      VALUES (v_member.user_id, v_member.group_id, v_member_role_id, v_member.user_id)
      ON CONFLICT DO NOTHING;

      v_assignments_created := v_assignments_created + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % Member role assignments created', v_assignments_created;
END $$;
