-- Sprint 4: Platform Exit (Admin-Assisted)
--
-- Implements admin_exit_user_from_platform(p_target_user_id) RPC.
-- Exits a user from ALL engagement groups in a single transaction,
-- applying the appropriate leave track per group:
--   L1: Regular member leaves (roles + membership deleted, enrollments frozen)
--   L2: Sole Steward → DeusEx handover (stewardship transferred, then L1)
--   L3: Group closure (last member → group closed, content transferred)
--
-- After all groups are processed:
--   - User is decommissioned (is_decommissioned = true, is_active = false)
--   - Auth sessions and refresh tokens are deleted (force logout)
--   - Action is logged to admin_audit_log
--
-- Safety guards:
--   - Cannot exit yourself
--   - Cannot exit already-decommissioned users
--   - Cannot exit DeusEx members (platform admins)
--   - Non-admins cannot call this function
--
-- Decision reference: D-R3 (admin-assisted, NOT self-service)
-- Depends on: Sprint 2 (leave_group core), Sprint 3 (smart notifications)

-- ═══════════════════════════════════════════════════════════════════
-- admin_exit_user_from_platform RPC
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_exit_user_from_platform(
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_pgid UUID;
  v_target_pgid UUID;
  v_target_auth_id UUID;
  v_deusex_group_id UUID;
  v_steward_template_id UUID;
  v_membership RECORD;
  v_member_count INTEGER;
  v_steward_role_id UUID;
  v_is_steward BOOLEAN;
  v_steward_count INTEGER;
  v_scenario TEXT;
  v_non_public_journey_count INTEGER;
  v_results JSONB := '[]'::JSONB;
  v_groups_exited INTEGER := 0;
  v_member RECORD;
BEGIN
  -- ─── 1. Authorization ──────────────────────────────────────────
  v_caller_pgid := public.get_current_personal_group_id();
  IF v_caller_pgid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not authenticated';
  END IF;

  IF NOT public.has_permission(v_caller_pgid, NULL, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: platform admin required';
  END IF;

  -- ─── 2. Look up target user ────────────────────────────────────
  SELECT personal_group_id, auth_user_id
  INTO v_target_pgid, v_target_auth_id
  FROM public.users
  WHERE id = p_target_user_id;

  IF v_target_pgid IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- ─── 3. Safety guards ──────────────────────────────────────────

  -- Cannot exit yourself
  IF v_target_pgid = v_caller_pgid THEN
    RAISE EXCEPTION 'Cannot exit yourself from the platform';
  END IF;

  -- Cannot exit already-decommissioned user
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_target_user_id AND is_decommissioned = true
  ) THEN
    RAISE EXCEPTION 'User is already decommissioned';
  END IF;

  -- Look up DeusEx group
  SELECT id INTO v_deusex_group_id
  FROM public.groups
  WHERE name = 'DeusEx' AND group_type = 'system';

  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'DeusEx system group not found';
  END IF;

  -- Cannot exit a DeusEx member (platform admin)
  IF EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = v_deusex_group_id
      AND member_group_id = v_target_pgid
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot exit a platform admin. Remove from DeusEx first.';
  END IF;

  -- ─── 4. Look up Steward template ──────────────────────────────
  SELECT id INTO v_steward_template_id
  FROM public.role_templates
  WHERE name = 'Steward Role Template';

  -- ─── 5. Iterate all active engagement group memberships ────────
  FOR v_membership IN
    SELECT gm.group_id, g.name AS group_name
    FROM public.group_memberships gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.member_group_id = v_target_pgid
      AND gm.status = 'active'
      AND g.group_type = 'engagement'
      AND g.status = 'active'
    ORDER BY g.name
  LOOP
    -- Count active members in this group
    SELECT COUNT(*) INTO v_member_count
    FROM public.group_memberships
    WHERE group_id = v_membership.group_id AND status = 'active';

    -- Get Steward role for this group
    SELECT gr.id INTO v_steward_role_id
    FROM public.group_roles gr
    WHERE gr.group_id = v_membership.group_id
      AND (gr.created_from_role_template_id = v_steward_template_id OR gr.name = 'Steward')
    LIMIT 1;

    -- Check if target is a Steward and count Stewards
    v_is_steward := false;
    v_steward_count := 0;

    IF v_steward_role_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_steward_count
      FROM public.user_group_roles
      WHERE group_id = v_membership.group_id
        AND group_role_id = v_steward_role_id;

      v_is_steward := EXISTS (
        SELECT 1 FROM public.user_group_roles
        WHERE group_id = v_membership.group_id
          AND member_group_id = v_target_pgid
          AND group_role_id = v_steward_role_id
      );
    END IF;

    -- Determine scenario
    IF v_member_count = 1 THEN
      v_scenario := 'group_closure';
    ELSIF v_is_steward AND v_steward_count = 1 THEN
      v_scenario := 'steward_handover';
    ELSE
      v_scenario := 'regular_leave';
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- SCENARIO: GROUP CLOSURE (L3 — last member)
    -- ═══════════════════════════════════════════════════════════
    IF v_scenario = 'group_closure' THEN

      -- A. Set group status to 'closed' (allows trigger bypass)
      UPDATE public.groups SET status = 'closed' WHERE id = v_membership.group_id;

      -- B. Freeze enrollments in non-public journeys owned by this group
      UPDATE public.journey_enrollments je
      SET status = 'frozen',
          progress_data = je.progress_data || jsonb_build_object(
            'frozen_reason', 'group_closed',
            'frozen_at', NOW()::TEXT
          ),
          status_changed_at = NOW()
      FROM public.journeys j
      WHERE je.journey_id = j.id
        AND j.created_by_group_id = v_membership.group_id
        AND j.is_public = false
        AND je.status = 'active';

      -- Also freeze group-level enrollments
      UPDATE public.journey_enrollments
      SET status = 'frozen',
          progress_data = progress_data || jsonb_build_object(
            'frozen_reason', 'group_closed',
            'frozen_at', NOW()::TEXT
          ),
          status_changed_at = NOW()
      WHERE group_id = v_membership.group_id
        AND status = 'active';

      -- C. Transfer non-public journeys to DeusEx
      SELECT COUNT(*) INTO v_non_public_journey_count
      FROM public.journeys
      WHERE created_by_group_id = v_membership.group_id AND is_public = false;

      IF v_non_public_journey_count > 0 THEN
        UPDATE public.journeys
        SET created_by_group_id = v_deusex_group_id
        WHERE created_by_group_id = v_membership.group_id AND is_public = false;

        INSERT INTO public.notifications
          (recipient_group_id, type, title, body, payload, group_id)
        VALUES (
          v_deusex_group_id,
          'group_closed',
          'Group Closed — Platform Exit',
          v_membership.group_name || ' has been closed (platform exit). ' ||
            v_non_public_journey_count || ' non-public journey(s) require review.',
          jsonb_build_object(
            'group_id', v_membership.group_id,
            'journey_count', v_non_public_journey_count,
            'exit_reason', 'platform_exit'
          ),
          v_membership.group_id
        );
      END IF;

      -- D. Delete roles + membership
      DELETE FROM public.user_group_roles
      WHERE group_id = v_membership.group_id AND member_group_id = v_target_pgid;

      DELETE FROM public.group_memberships
      WHERE group_id = v_membership.group_id AND member_group_id = v_target_pgid;

    -- ═══════════════════════════════════════════════════════════
    -- SCENARIO: STEWARD HANDOVER (L2 — sole Steward → DeusEx)
    -- ═══════════════════════════════════════════════════════════
    ELSIF v_scenario = 'steward_handover' THEN

      -- A. Add DeusEx as member of group (idempotent)
      INSERT INTO public.group_memberships
        (group_id, member_group_id, added_by_group_id, status)
      VALUES
        (v_membership.group_id, v_deusex_group_id, v_caller_pgid, 'active')
      ON CONFLICT (group_id, member_group_id)
        DO UPDATE SET status = 'active', status_changed_at = NOW();

      -- B. Assign Steward role to DeusEx (idempotent)
      INSERT INTO public.user_group_roles
        (member_group_id, group_id, group_role_id, assigned_by_group_id)
      VALUES
        (v_deusex_group_id, v_membership.group_id, v_steward_role_id, v_caller_pgid)
      ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

      -- C. Transfer pending invitations to DeusEx
      UPDATE public.group_memberships
      SET added_by_group_id = v_deusex_group_id
      WHERE group_id = v_membership.group_id
        AND status = 'invited'
        AND added_by_group_id = v_target_pgid;

      UPDATE public.pending_email_invitations
      SET invited_by_group_id = v_deusex_group_id
      WHERE group_id = v_membership.group_id
        AND invited_by_group_id = v_target_pgid
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
        AND je.group_id = v_target_pgid
        AND j.created_by_group_id = v_membership.group_id
        AND j.is_public = false
        AND je.status = 'active';

      -- E. Delete target's roles + membership
      DELETE FROM public.user_group_roles
      WHERE group_id = v_membership.group_id AND member_group_id = v_target_pgid;

      DELETE FROM public.group_memberships
      WHERE group_id = v_membership.group_id AND member_group_id = v_target_pgid;

      -- F. Notify remaining members about stewardship change
      FOR v_member IN
        SELECT gm.member_group_id
        FROM public.group_memberships gm
        WHERE gm.group_id = v_membership.group_id
          AND gm.status = 'active'
          AND gm.member_group_id != v_deusex_group_id
      LOOP
        INSERT INTO public.notifications
          (recipient_group_id, type, title, body, payload, group_id)
        VALUES (
          v_member.member_group_id,
          'stewardship_transferred',
          'Stewardship Change — Platform Exit',
          'FringeIsland has temporarily assumed stewardship of ' || v_membership.group_name || '.',
          jsonb_build_object(
            'group_id', v_membership.group_id,
            'exit_reason', 'platform_exit'
          ),
          v_membership.group_id
        );
      END LOOP;

      -- Notify DeusEx about stewardship assignment
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_deusex_group_id,
        'stewardship_required',
        'Stewardship Required — Platform Exit',
        v_membership.group_name || ' requires a permanent Steward. Previous Steward exited the platform.',
        jsonb_build_object(
          'group_id', v_membership.group_id,
          'exit_reason', 'platform_exit'
        ),
        v_membership.group_id
      );

    -- ═══════════════════════════════════════════════════════════
    -- SCENARIO: REGULAR LEAVE (L1 — member leaves, group stays)
    -- ═══════════════════════════════════════════════════════════
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
        AND je.group_id = v_target_pgid
        AND j.created_by_group_id = v_membership.group_id
        AND j.is_public = false
        AND je.status = 'active';

      -- B. Delete target's roles + membership
      DELETE FROM public.user_group_roles
      WHERE group_id = v_membership.group_id AND member_group_id = v_target_pgid;

      DELETE FROM public.group_memberships
      WHERE group_id = v_membership.group_id AND member_group_id = v_target_pgid;

    END IF;

    -- Record result for this group
    v_results := v_results || jsonb_build_object(
      'group_id', v_membership.group_id,
      'group_name', v_membership.group_name,
      'scenario', v_scenario
    );
    v_groups_exited := v_groups_exited + 1;

  END LOOP;

  -- ─── 6. Decommission the user ─────────────────────────────────
  UPDATE public.users
  SET is_decommissioned = true,
      is_active = false,
      updated_at = NOW()
  WHERE id = p_target_user_id;

  -- ─── 7. Force logout (delete auth sessions) ───────────────────
  DELETE FROM auth.refresh_tokens WHERE user_id = v_target_auth_id::text;
  DELETE FROM auth.sessions WHERE user_id = v_target_auth_id;

  -- ─── 8. Audit log ─────────────────────────────────────────────
  INSERT INTO public.admin_audit_log
    (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_pgid,
    'admin_exit_user_from_platform',
    p_target_user_id::text,
    jsonb_build_object(
      'groups_exited', v_groups_exited,
      'group_details', v_results,
      'target_personal_group_id', v_target_pgid
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'groups_exited', v_groups_exited,
    'group_details', v_results,
    'decommissioned', true
  );
END;
$$;

-- Grant execute to authenticated users (RPC checks admin permission internally)
GRANT EXECUTE ON FUNCTION public.admin_exit_user_from_platform(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'admin_exit_user_from_platform'
  ) THEN
    RAISE EXCEPTION 'admin_exit_user_from_platform function not created';
  END IF;

  RAISE NOTICE '✅ Sprint 4 Platform Exit migration applied successfully';
  RAISE NOTICE '   - admin_exit_user_from_platform() RPC created';
END;
$$;
