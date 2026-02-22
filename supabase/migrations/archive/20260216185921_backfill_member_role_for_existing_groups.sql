-- Migration: Backfill Member role for existing engagement groups
-- Date: 2026-02-16
--
-- Problem: The original GroupCreateForm (pre-RBAC) only created a single
--   "Group Leader" role per group. The RBAC migration renamed it to "Steward"
--   but never added the Member role. New groups now create both Steward and
--   Member roles, but existing groups are missing Member.
--
-- Fix:
--   1. Create a "Member" role (from template) in every engagement group that
--      doesn't already have one.
--   2. The copy_template_permissions trigger auto-copies permissions.
--   3. Assign the Member role to all active members who don't already have it.

DO $$
DECLARE
  v_member_template_id UUID;
  v_group RECORD;
  v_new_role_id UUID;
  v_member RECORD;
  v_roles_created INT := 0;
  v_assignments_created INT := 0;
BEGIN
  -- Find the Member Role Template
  SELECT id INTO v_member_template_id
  FROM role_templates
  WHERE name = 'Member Role Template';

  IF v_member_template_id IS NULL THEN
    RAISE EXCEPTION 'Member Role Template not found';
  END IF;

  -- Loop through engagement groups that don't have a "Member" role yet
  FOR v_group IN
    SELECT g.id
    FROM groups g
    WHERE g.group_type = 'engagement'
      AND NOT EXISTS (
        SELECT 1 FROM group_roles gr
        WHERE gr.group_id = g.id AND gr.name = 'Member'
      )
  LOOP
    -- Create the Member role (trigger copies permissions from template)
    INSERT INTO group_roles (group_id, name, created_from_role_template_id)
    VALUES (v_group.id, 'Member', v_member_template_id)
    RETURNING id INTO v_new_role_id;

    v_roles_created := v_roles_created + 1;

    -- Assign Member role to all active members who don't already have it
    FOR v_member IN
      SELECT gm.user_id
      FROM group_memberships gm
      WHERE gm.group_id = v_group.id
        AND gm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM user_group_roles ugr
          WHERE ugr.user_id = gm.user_id
            AND ugr.group_id = v_group.id
            AND ugr.group_role_id = v_new_role_id
        )
    LOOP
      INSERT INTO user_group_roles (group_id, user_id, group_role_id, assigned_by_user_id)
      VALUES (v_group.id, v_member.user_id, v_new_role_id, v_member.user_id);

      v_assignments_created := v_assignments_created + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % Member roles created, % role assignments created',
    v_roles_created, v_assignments_created;
END $$;
