-- Migration: Backfill orphaned groups where creator has no roles
-- Date: 2026-02-16
--
-- Problem: Group creation failed at the "create roles" step (RLS blocked it),
--   so some groups exist with the creator as a member but no roles created
--   and no role assignments. The creator can't edit or delete these groups.
--
-- Fix: For each engagement group that has NO group_roles at all:
--   1. Create Steward + Member roles from templates
--   2. Assign both to the group creator
--   3. Also assign Member to any other active members

DO $$
DECLARE
  v_steward_template_id UUID;
  v_member_template_id UUID;
  v_group RECORD;
  v_steward_role_id UUID;
  v_member_role_id UUID;
  v_other_member RECORD;
  v_groups_fixed INT := 0;
BEGIN
  -- Get role template IDs
  SELECT id INTO v_steward_template_id
  FROM role_templates WHERE name = 'Steward Role Template';

  SELECT id INTO v_member_template_id
  FROM role_templates WHERE name = 'Member Role Template';

  IF v_steward_template_id IS NULL OR v_member_template_id IS NULL THEN
    RAISE EXCEPTION 'Role templates not found';
  END IF;

  -- Find engagement groups with NO roles at all
  FOR v_group IN
    SELECT g.id, g.created_by_user_id
    FROM groups g
    WHERE g.group_type = 'engagement'
      AND NOT EXISTS (
        SELECT 1 FROM group_roles gr WHERE gr.group_id = g.id
      )
  LOOP
    -- Create Steward role (trigger copies permissions from template)
    INSERT INTO group_roles (group_id, name, created_from_role_template_id)
    VALUES (v_group.id, 'Steward', v_steward_template_id)
    RETURNING id INTO v_steward_role_id;

    -- Create Member role (trigger copies permissions from template)
    INSERT INTO group_roles (group_id, name, created_from_role_template_id)
    VALUES (v_group.id, 'Member', v_member_template_id)
    RETURNING id INTO v_member_role_id;

    -- Assign Steward + Member to the group creator
    INSERT INTO user_group_roles (user_id, group_id, group_role_id, assigned_by_user_id)
    VALUES
      (v_group.created_by_user_id, v_group.id, v_steward_role_id, v_group.created_by_user_id),
      (v_group.created_by_user_id, v_group.id, v_member_role_id, v_group.created_by_user_id)
    ON CONFLICT DO NOTHING;

    -- Assign Member to any other active members
    FOR v_other_member IN
      SELECT gm.user_id
      FROM group_memberships gm
      WHERE gm.group_id = v_group.id
        AND gm.status = 'active'
        AND gm.user_id != v_group.created_by_user_id
    LOOP
      INSERT INTO user_group_roles (user_id, group_id, group_role_id, assigned_by_user_id)
      VALUES (v_other_member.user_id, v_group.id, v_member_role_id, v_other_member.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;

    v_groups_fixed := v_groups_fixed + 1;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % orphaned groups fixed', v_groups_fixed;
END $$;
