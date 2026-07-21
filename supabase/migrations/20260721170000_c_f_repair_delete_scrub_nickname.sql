-- ============================================================================
-- C-F repair — delete_own_account() scrub vs users.nickname NOT NULL
--
-- Found at flip-green (TASK-CF-03): the gated migration's display scrub set
-- nickname = NULL, but the display-name system (20260227095615) declares
-- users.nickname NOT NULL — 23502, rolling back the whole delete transaction.
-- Fix: scrub-by-tombstone-string ('[Deleted User]', matching full_name), which
-- is the same semantic (no PII survives on the retained row; the display-name
-- sync trigger propagates the tombstone to the personal group's name for
-- ADR-U021 read-time attribution) and constraint-compatible.
--
-- Scope: re-issues delete_own_account() with ONLY the scrub UPDATE changed
-- (nickname NULL -> '[Deleted User]'). No contract, guard, walk, or grant
-- change — rides the PR #233 named nod (the C-E repair precedent). The
-- applied 20260721161500 is never rewritten (migration-order rule).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user record;
  v_pgid uuid;
  v_deusex_group_id uuid;
  v_sentinel_group_id uuid;
  v_steward_template_id uuid;
  v_membership record;
  v_member_count integer;
  v_steward_role_id uuid;
  v_is_steward boolean;
  v_steward_count integer;
  v_scenario text;
  v_non_public_journey_count integer;
  v_results jsonb := '[]'::jsonb;
  v_groups_exited integer := 0;
  v_member record;
  v_ds3_erased jsonb;
  v_ds7_erased jsonb;
BEGIN
  -- ─── 1. Resolve + guard the actor (own row only — no parameter) ─────────
  SELECT id, personal_group_id, auth_user_id, is_temporary, is_active,
         is_decommissioned, deactivation_origin
    INTO v_user
    FROM public.users
   WHERE auth_user_id = auth.uid()
     FOR UPDATE;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'delete_own_account: no session actor';
  END IF;
  IF v_user.is_temporary THEN
    RAISE EXCEPTION 'delete_own_account: a Mist is the reaper''s / explicit-erase path''s, not account deletion''s';
  END IF;
  IF v_user.is_decommissioned THEN
    RAISE EXCEPTION 'delete_own_account: this account is already terminally closed';
  END IF;
  IF NOT v_user.is_active
     AND v_user.deactivation_origin IS DISTINCT FROM 'member' THEN
    RAISE EXCEPTION 'delete_own_account: this account is under an admin hold — contact an admin';
  END IF;

  v_pgid := v_user.personal_group_id;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'delete_own_account: DeusEx system group not found';
  END IF;

  SELECT id INTO v_sentinel_group_id
    FROM public.groups
   WHERE name = '[Deleted User]' AND group_type = 'system';
  IF v_sentinel_group_id IS NULL THEN
    RAISE EXCEPTION 'delete_own_account: [Deleted User] sentinel group not found';
  END IF;

  SELECT id INTO v_steward_template_id
    FROM public.role_templates
   WHERE name = 'Steward Role Template';

  -- ─── 2. The membership walk (ported byte-stable + the C-E ds5 seal) ─────
  FOR v_membership IN
    SELECT gm.group_id, g.name AS group_name
      FROM public.group_memberships gm
      JOIN public.groups g ON g.id = gm.group_id
     WHERE gm.member_group_id = v_pgid
       AND gm.status = 'active'
       AND g.group_type = 'engagement'
       AND g.status = 'active'
     ORDER BY g.name
  LOOP
    SELECT count(*) INTO v_member_count
      FROM public.group_memberships
     WHERE group_id = v_membership.group_id AND status = 'active';

    SELECT gr.id INTO v_steward_role_id
      FROM public.group_roles gr
     WHERE gr.group_id = v_membership.group_id
       AND (gr.created_from_role_template_id = v_steward_template_id
            OR gr.name = 'Steward')
     LIMIT 1;

    v_is_steward := false;
    v_steward_count := 0;
    IF v_steward_role_id IS NOT NULL THEN
      SELECT count(*) INTO v_steward_count
        FROM public.user_group_roles
       WHERE group_id = v_membership.group_id
         AND group_role_id = v_steward_role_id;
      v_is_steward := EXISTS (
        SELECT 1 FROM public.user_group_roles
         WHERE group_id = v_membership.group_id
           AND member_group_id = v_pgid
           AND group_role_id = v_steward_role_id
      );
    END IF;

    IF v_member_count = 1 THEN
      v_scenario := 'group_closure';
    ELSIF v_is_steward AND v_steward_count = 1 THEN
      v_scenario := 'steward_handover';
    ELSE
      v_scenario := 'regular_leave';
    END IF;

    IF v_scenario = 'group_closure' THEN
      UPDATE public.groups SET status = 'closed'
       WHERE id = v_membership.group_id;

      v_non_public_journey_count :=
        (public.ds3_lifecycle_group_closed(v_membership.group_id, 'group_closed') ->> 'journey_count')::integer;

      PERFORM public.ds5_lifecycle_group_closed(v_membership.group_id, 'group_closed');

      IF v_non_public_journey_count > 0 THEN
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

      DELETE FROM public.user_group_roles
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
      DELETE FROM public.group_memberships
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;

    ELSIF v_scenario = 'steward_handover' THEN
      INSERT INTO public.group_memberships
        (group_id, member_group_id, added_by_group_id, status)
      VALUES
        (v_membership.group_id, v_deusex_group_id, v_pgid, 'active')
      ON CONFLICT (group_id, member_group_id)
        DO UPDATE SET status = 'active', status_changed_at = now();

      INSERT INTO public.user_group_roles
        (member_group_id, group_id, group_role_id, assigned_by_group_id)
      VALUES
        (v_deusex_group_id, v_membership.group_id, v_steward_role_id, v_pgid)
      ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

      UPDATE public.group_memberships
         SET added_by_group_id = v_deusex_group_id
       WHERE group_id = v_membership.group_id
         AND status = 'invited'
         AND added_by_group_id = v_pgid;

      UPDATE public.pending_email_invitations
         SET invited_by_group_id = v_deusex_group_id
       WHERE group_id = v_membership.group_id
         AND invited_by_group_id = v_pgid
         AND status = 'pending';

      PERFORM public.ds3_lifecycle_member_departed(v_membership.group_id, v_pgid, 'left_group');

      DELETE FROM public.user_group_roles
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
      DELETE FROM public.group_memberships
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;

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

    ELSE -- regular_leave
      PERFORM public.ds3_lifecycle_member_departed(v_membership.group_id, v_pgid, 'left_group');

      DELETE FROM public.user_group_roles
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
      DELETE FROM public.group_memberships
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
    END IF;

    v_results := v_results || jsonb_build_object(
      'group_id', v_membership.group_id,
      'group_name', v_membership.group_name,
      'scenario', v_scenario
    );
    v_groups_exited := v_groups_exited + 1;
  END LOOP;

  -- ─── 3. F-2 private-erase via the U047 facts ────────────────────────────
  v_ds3_erased := public.ds3_lifecycle_account_deleted(v_pgid);
  v_ds7_erased := public.ds7_lifecycle_account_deleted(v_pgid);

  -- ─── 4. Owned-journey attribution -> the sentinel ───────────────────────
  PERFORM public.ds3_lifecycle_user_hard_deleted(v_pgid, v_sentinel_group_id);

  -- ─── 5. Decommission + display scrub — THE REPAIRED LINE: nickname is
  --        NOT NULL (display-name system), so the scrub is the tombstone
  --        string, not NULL. Same semantic: no PII survives; the sync
  --        trigger propagates '[Deleted User]' to the personal group name.
  UPDATE public.users
     SET is_active = false,
         is_decommissioned = true,
         deactivation_origin = 'member',
         nickname = '[Deleted User]',
         bio = NULL,
         avatar_url = NULL,
         full_name = '[Deleted User]',
         updated_at = now()
   WHERE id = v_user.id;

  -- ─── 6. Sessions die ────────────────────────────────────────────────────
  DELETE FROM auth.refresh_tokens WHERE user_id = v_user.auth_user_id::text;
  DELETE FROM auth.sessions       WHERE user_id = v_user.auth_user_id;

  -- ─── 7. Audit ───────────────────────────────────────────────────────────
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_pgid,
    'self_delete_account',
    v_user.id::text,
    jsonb_build_object(
      'groups_exited', v_groups_exited,
      'group_details', v_results,
      'erased', v_ds3_erased || v_ds7_erased
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

COMMENT ON FUNCTION public.delete_own_account() IS
  'FEAT-PC017 / IDN-10 (C-F; scrub repaired 20260721170000 — tombstone '
  'string, nickname NOT NULL): owner-gated terminal self-deletion. Privilege '
  'escalation bounded to: the caller''s OWN account — the three-scenario '
  'membership walk ported from the retired admin_exit_user_from_platform '
  '(regular_leave / steward_handover / group_closure) + the C-E ds5 seal, '
  'the F-2 erasure facts (ds3/ds7 account_deleted), sentinel reassignment '
  '(user_hard_deleted), decommission + display scrub, session deletion, and '
  'the definer audit INSERT. No target parameter. Mist/session-less refused; '
  'admin holds not escapable; decommissioned idempotently terminal.';
