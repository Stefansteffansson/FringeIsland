-- Sprint 2: Leave Group Core
-- Implements leave_group(p_group_id) RPC for:
--   L1: Regular member leaves engagement group
--   L2: Sole Steward → DeusEx handover (Track 2)
--   L3: Group closure (last member leaves)
--
-- Also updates prevent_last_leader_removal trigger to allow
-- role deletion when group status is 'closed' (L3 scenario).

-- ═══════════════════════════════════════════════════════════════════
-- 1. Update prevent_last_leader_removal to allow closed group cleanup
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_leader_count INTEGER;
  v_is_leader_role BOOLEAN;
  v_steward_template_id UUID;
  v_group_status TEXT;
BEGIN
  -- Skip during hard-delete cascade
  IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- If parent group is gone (CASCADE), allow deletion
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  -- If group is closed (last member leaving via leave_group), allow deletion
  SELECT status INTO v_group_status FROM public.groups WHERE id = OLD.group_id;
  IF v_group_status = 'closed' THEN
    RETURN OLD;
  END IF;

  -- Get the Steward template ID
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  -- Check if the role being removed is based on the Steward template (or named Steward)
  SELECT EXISTS (
    SELECT 1 FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND (created_from_role_template_id = v_steward_template_id OR name = 'Steward')
  ) INTO v_is_leader_role;

  IF NOT v_is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Steward-template role holders (excluding the one being removed)
  SELECT COUNT(*) INTO v_leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND (gr.created_from_role_template_id = v_steward_template_id OR gr.name = 'Steward')
    AND ugr.id != OLD.id;

  IF v_leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Assign another Steward first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. leave_group RPC
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_group_type TEXT;
  v_group_name TEXT;
  v_group_status TEXT;
  v_caller_name TEXT;
  v_active_member_count INTEGER;
  v_steward_count INTEGER;
  v_caller_is_steward BOOLEAN;
  v_is_sole_steward BOOLEAN;
  v_steward_template_id UUID;
  v_steward_role_id UUID;
  v_deusex_group_id UUID;
  v_non_public_journey_count INTEGER;
  v_scenario TEXT;
  v_member RECORD;
BEGIN
  -- ─── 1. Authentication & Validation ──────────────────────────────

  v_caller_group_id := public.get_current_personal_group_id();
  IF v_caller_group_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate group exists, is engagement type, and is active
  SELECT group_type, name, status
  INTO v_group_type, v_group_name, v_group_status
  FROM public.groups WHERE id = p_group_id;

  IF v_group_type IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_group_type != 'engagement' THEN
    RAISE EXCEPTION 'Can only leave engagement groups';
  END IF;

  IF v_group_status != 'active' THEN
    RAISE EXCEPTION 'Cannot leave a group that is not active';
  END IF;

  -- Validate caller is an active member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id
      AND member_group_id = v_caller_group_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are not an active member of this group';
  END IF;

  -- ─── 2. Determine Scenario ──────────────────────────────────────

  -- Count active members
  SELECT COUNT(*) INTO v_active_member_count
  FROM public.group_memberships
  WHERE group_id = p_group_id AND status = 'active';

  -- Look up Steward template and role for this group
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  SELECT gr.id INTO v_steward_role_id
  FROM public.group_roles gr
  WHERE gr.group_id = p_group_id
    AND (gr.created_from_role_template_id = v_steward_template_id OR gr.name = 'Steward')
  LIMIT 1;

  -- Count Stewards and check caller's role
  v_steward_count := 0;
  v_caller_is_steward := false;
  v_is_sole_steward := false;

  IF v_steward_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_steward_count
    FROM public.user_group_roles
    WHERE group_id = p_group_id
      AND group_role_id = v_steward_role_id;

    v_caller_is_steward := EXISTS (
      SELECT 1 FROM public.user_group_roles
      WHERE group_id = p_group_id
        AND member_group_id = v_caller_group_id
        AND group_role_id = v_steward_role_id
    );

    v_is_sole_steward := v_caller_is_steward AND v_steward_count = 1;
  END IF;

  -- Determine scenario
  IF v_active_member_count = 1 THEN
    v_scenario := 'group_closure';
  ELSIF v_is_sole_steward THEN
    v_scenario := 'steward_handover';
  ELSE
    v_scenario := 'regular_leave';
  END IF;

  -- Get caller's display name and DeusEx group ID
  SELECT name INTO v_caller_name FROM public.groups WHERE id = v_caller_group_id;

  SELECT id INTO v_deusex_group_id
  FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';

  -- ═══════════════════════════════════════════════════════════════
  -- SCENARIO: GROUP CLOSURE (L3 — last member leaves)
  -- ═══════════════════════════════════════════════════════════════
  IF v_scenario = 'group_closure' THEN

    -- A. Set group status to 'closed' FIRST
    --    (allows prevent_last_leader_removal trigger to bypass)
    UPDATE public.groups SET status = 'closed' WHERE id = p_group_id;

    -- B. Freeze all enrollments in non-public journeys owned by this group
    UPDATE public.journey_enrollments je
    SET status = 'frozen',
        progress_data = je.progress_data || jsonb_build_object(
          'frozen_reason', 'group_closed',
          'frozen_at', NOW()::TEXT
        ),
        status_changed_at = NOW()
    FROM public.journeys j
    WHERE je.journey_id = j.id
      AND j.created_by_group_id = p_group_id
      AND j.is_public = false
      AND je.status = 'active';

    -- Also freeze group-level enrollments (group_id = this engagement group)
    UPDATE public.journey_enrollments
    SET status = 'frozen',
        progress_data = progress_data || jsonb_build_object(
          'frozen_reason', 'group_closed',
          'frozen_at', NOW()::TEXT
        ),
        status_changed_at = NOW()
    WHERE group_id = p_group_id
      AND status = 'active';

    -- C. Transfer non-public journeys to DeusEx
    SELECT COUNT(*) INTO v_non_public_journey_count
    FROM public.journeys
    WHERE created_by_group_id = p_group_id AND is_public = false;

    IF v_non_public_journey_count > 0 THEN
      UPDATE public.journeys
      SET created_by_group_id = v_deusex_group_id
      WHERE created_by_group_id = p_group_id AND is_public = false;

      -- Notify DeusEx about orphaned non-public journeys
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_deusex_group_id,
        'group_closed',
        'Group Closed',
        v_group_name || ' has been closed. ' || v_non_public_journey_count ||
          ' Non-Public Journey(s) require review.',
        jsonb_build_object(
          'group_id', p_group_id,
          'journey_count', v_non_public_journey_count
        ),
        p_group_id
      );
    END IF;

    -- D. Delete roles (trigger bypassed because group is 'closed')
    DELETE FROM public.user_group_roles
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id;

    -- E. Delete membership
    DELETE FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id;

    RETURN jsonb_build_object(
      'scenario', 'group_closure',
      'group_id', p_group_id,
      'group_name', v_group_name,
      'non_public_journeys_transferred', v_non_public_journey_count
    );

  -- ═══════════════════════════════════════════════════════════════
  -- SCENARIO: STEWARD HANDOVER (L2 — sole Steward → DeusEx)
  -- ═══════════════════════════════════════════════════════════════
  ELSIF v_scenario = 'steward_handover' THEN

    -- A. Add DeusEx as member of group (idempotent)
    INSERT INTO public.group_memberships
      (group_id, member_group_id, added_by_group_id, status)
    VALUES
      (p_group_id, v_deusex_group_id, v_caller_group_id, 'active')
    ON CONFLICT (group_id, member_group_id)
      DO UPDATE SET status = 'active', status_changed_at = NOW();

    -- B. Assign Steward role to DeusEx in this group (idempotent)
    INSERT INTO public.user_group_roles
      (member_group_id, group_id, group_role_id, assigned_by_group_id)
    VALUES
      (v_deusex_group_id, p_group_id, v_steward_role_id, v_caller_group_id)
    ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

    -- C. Transfer pending invitations to DeusEx
    UPDATE public.group_memberships
    SET added_by_group_id = v_deusex_group_id
    WHERE group_id = p_group_id
      AND status = 'invited'
      AND added_by_group_id = v_caller_group_id;

    UPDATE public.pending_email_invitations
    SET invited_by_group_id = v_deusex_group_id
    WHERE group_id = p_group_id
      AND invited_by_group_id = v_caller_group_id
      AND status = 'pending';

    -- D. Freeze non-public journey enrollments for the leaving member
    UPDATE public.journey_enrollments je
    SET status = 'frozen',
        progress_data = je.progress_data || jsonb_build_object(
          'frozen_reason', 'left_group',
          'frozen_at', NOW()::TEXT
        ),
        status_changed_at = NOW()
    FROM public.journeys j
    WHERE je.journey_id = j.id
      AND je.group_id = v_caller_group_id
      AND j.created_by_group_id = p_group_id
      AND j.is_public = false
      AND je.status = 'active';

    -- E. Delete roles (safe — DeusEx is now a Steward, so trigger allows)
    DELETE FROM public.user_group_roles
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id;

    -- F. Delete membership (triggers member_left notification to DeusEx)
    DELETE FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id;

    -- G. Notify all remaining members about stewardship change
    FOR v_member IN
      SELECT gm.member_group_id
      FROM public.group_memberships gm
      WHERE gm.group_id = p_group_id
        AND gm.status = 'active'
        AND gm.member_group_id != v_deusex_group_id
    LOOP
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_member.member_group_id,
        'stewardship_transferred',
        'Stewardship Change',
        'FringeIsland has temporarily assumed stewardship of ' || v_group_name || '.',
        jsonb_build_object(
          'group_id', p_group_id,
          'previous_steward', v_caller_name
        ),
        p_group_id
      );
    END LOOP;

    -- Notify DeusEx
    INSERT INTO public.notifications
      (recipient_group_id, type, title, body, payload, group_id)
    VALUES (
      v_deusex_group_id,
      'stewardship_required',
      'Stewardship Required',
      v_group_name || ' requires a permanent Steward. Please review and assign.',
      jsonb_build_object(
        'group_id', p_group_id,
        'previous_steward', v_caller_name
      ),
      p_group_id
    );

    RETURN jsonb_build_object(
      'scenario', 'steward_handover',
      'group_id', p_group_id,
      'group_name', v_group_name,
      'deusex_assigned', true
    );

  -- ═══════════════════════════════════════════════════════════════
  -- SCENARIO: REGULAR LEAVE (L1 — member leaves, group stays)
  -- ═══════════════════════════════════════════════════════════════
  ELSE

    -- A. Freeze non-public journey enrollments for the leaving member
    UPDATE public.journey_enrollments je
    SET status = 'frozen',
        progress_data = je.progress_data || jsonb_build_object(
          'frozen_reason', 'left_group',
          'frozen_at', NOW()::TEXT
        ),
        status_changed_at = NOW()
    FROM public.journeys j
    WHERE je.journey_id = j.id
      AND je.group_id = v_caller_group_id
      AND j.created_by_group_id = p_group_id
      AND j.is_public = false
      AND je.status = 'active';

    -- B. Delete roles
    DELETE FROM public.user_group_roles
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id;

    -- C. Delete membership (triggers member_left notification to Stewards)
    DELETE FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id;

    RETURN jsonb_build_object(
      'scenario', 'regular_leave',
      'group_id', p_group_id,
      'group_name', v_group_name
    );

  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;
