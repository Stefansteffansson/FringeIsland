-- ============================================================================
-- C-F (IDN-10) — FEAT-PC017 + FEAT-PC005 STORY-6: account lifecycle self-service
-- ADR-U050 (four states split by deactivation_origin — promotes the 2026-06-29
-- account-lifecycle decision record). C-F board 2026-07-21: F-1 full slice ·
-- F-2 private-erase + communal-tombstone · F-3 immediate + confirm.
--
-- Contents:
--   1. users.deactivation_origin (open namespace) + 'admin' backfill — the
--      backfill ships in the SAME migration as the CASE split so no existing
--      off row can ever misread as 'paused'.
--   2. Two new ADR-U047 lifecycle-fact handlers for the F-2 erasure legs
--      (Core never touches domain tables — the COR-A posture):
--        ds3_lifecycle_account_deleted  — erases the lived journey record
--        ds7_lifecycle_account_deleted  — erases the private journal
--   3. pause_own_account()       — active -> paused, cascade-free, audited
--   4. reactivate_own_account()  — member-origin paused -> active (PC005,
--      fresh CREATE — PC005 was parked pre-build; STORY-6 origin gate)
--   5. delete_own_account()      — terminal: the retired admin path's proven
--      three-scenario membership walk (byte-stable scenario vocabulary) PLUS
--      the C-E ds5 seal on closure; F-2 erasure facts; sentinel reassignment;
--      decommission + display scrub; sessions ended; audited
--   6. get_own_account_state() re-issue — the origin split + the
--      deactivation_origin payload key (latest on-disk body: PC004; the PC006/
--      PC003 hits are comments only — verified cumulative-forward)
--   7. DROP admin_exit_user_from_platform — the retirement (area-gate due)
--
-- Direct-caller question (ADR-U038): every rule lives in this substrate.
--   - The three self-service RPCs: SECURITY DEFINER, own-row only (no target
--     parameter), GRANTed to authenticated only (anon -> 42501), Mist and
--     session-less callers refused in-body (P0001), admin holds un-escapable
--     in-body. Each is a privilege-escalation surface, bounded as documented
--     on its COMMENT.
--   - deactivation_origin has no client write path (users column privileges
--     unchanged); only the definer bodies below write it.
--   - The two new handlers are definer-internal (REVOKEd from all client
--     roles), callable only from Core definer context — the U047 contract.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The origin column (ADR-U050) + safe backfill
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN deactivation_origin TEXT;

COMMENT ON COLUMN public.users.deactivation_origin IS
  'ADR-U050: who switched this account off — ''member'' (self-pause / '
  'self-delete; self-reversible while not decommissioned) or ''admin'' (a '
  'hold; admin-lift-only). Open namespace — future producers add values '
  'without schema change. NULL while active (cleared on reactivation). '
  'Written only by the definer-owned lifecycle RPCs; no client write path.';

UPDATE public.users
   SET deactivation_origin = 'admin'
 WHERE is_active = false;

-- ----------------------------------------------------------------------------
-- 2. The account_deleted lifecycle-fact handlers (ADR-U047; F-2 erasure legs)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds3_lifecycle_account_deleted(
  p_personal_group_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enrollments integer;
BEGIN
  -- F-2 private-erase: the member's own lived record. journey_step_instances
  -- (and the ADR-U046 responses they carry) follow by FK CASCADE
  -- (enrollment_id ON DELETE CASCADE — verified). Departure freezes stamped
  -- earlier in the same transaction are superseded here by design
  -- (FEAT-PC017 STORY-4/5).
  DELETE FROM public.journey_enrollments
   WHERE group_id = p_personal_group_id;
  GET DIAGNOSTICS v_enrollments = ROW_COUNT;

  RETURN jsonb_build_object('enrollments_erased', v_enrollments);
END;
$$;

COMMENT ON FUNCTION public.ds3_lifecycle_account_deleted(uuid) IS
  'ADR-U047 DS-3 lifecycle-fact handler (C-F): on self-service account '
  'deletion, erases the member''s own lived journey record (enrollments; '
  'step instances + responses via FK CASCADE) — F-2 private-erase. '
  'SECURITY DEFINER, core-internal (no client execute).';

CREATE OR REPLACE FUNCTION public.ds7_lifecycle_account_deleted(
  p_personal_group_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entries integer;
BEGIN
  -- F-2 private-erase: the private journal (FEAT-PD001, DS-7-owned).
  DELETE FROM public.journal_entries
   WHERE owner_group_id = p_personal_group_id;
  GET DIAGNOSTICS v_entries = ROW_COUNT;

  RETURN jsonb_build_object('journal_entries_erased', v_entries);
END;
$$;

COMMENT ON FUNCTION public.ds7_lifecycle_account_deleted(uuid) IS
  'ADR-U047 DS-7 lifecycle-fact handler (C-F, the first ds7_ handler): on '
  'self-service account deletion, erases the member''s private journal — '
  'F-2 private-erase. SECURITY DEFINER, core-internal (no client execute).';

REVOKE ALL ON FUNCTION public.ds3_lifecycle_account_deleted(uuid)
  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ds7_lifecycle_account_deleted(uuid)
  FROM public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. pause_own_account() — the reversible absence (FEAT-PC017 STORY-1/2/9)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pause_own_account()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT id, personal_group_id, is_temporary, is_active,
         is_decommissioned, deactivation_origin
    INTO v_user
    FROM public.users
   WHERE auth_user_id = auth.uid()
     FOR UPDATE;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'pause_own_account: no session actor';
  END IF;
  IF v_user.is_temporary THEN
    RAISE EXCEPTION 'pause_own_account: a Mist has no account lifecycle — transcend first';
  END IF;
  IF v_user.is_decommissioned THEN
    RAISE EXCEPTION 'pause_own_account: this account is terminally closed';
  END IF;
  IF NOT v_user.is_active
     AND v_user.deactivation_origin IS DISTINCT FROM 'member' THEN
    RAISE EXCEPTION 'pause_own_account: this account is under an admin hold — contact an admin';
  END IF;

  -- Idempotent: already member-paused is a success, not an error, and writes
  -- no duplicate audit row (STORY-1).
  IF NOT v_user.is_active THEN
    RETURN jsonb_build_object('state', 'paused', 'idempotent', true);
  END IF;

  -- The pause itself. Deliberately cascade-free: memberships, roles,
  -- enrolments, conversations untouched (a reversible absence, not a
  -- departure) — which is what keeps reactivation cascade-free (FEAT-PC005).
  UPDATE public.users
     SET is_active = false,
         deactivation_origin = 'member'
   WHERE id = v_user.id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_user.personal_group_id,
    'self_pause_account',
    v_user.id::text,
    jsonb_build_object('before', 'active', 'after', 'paused')
  );

  RETURN jsonb_build_object('state', 'paused', 'idempotent', false);
END;
$$;

COMMENT ON FUNCTION public.pause_own_account() IS
  'FEAT-PC017 / IDN-10 (C-F): owner-gated self-pause — active -> paused with '
  'deactivation_origin=''member''. Privilege escalation bounded to: the '
  'caller''s OWN row, this one transition, plus the definer audit INSERT. '
  'No target parameter. Mist/session-less refused; decommissioned terminal; '
  'an admin hold (origin<>''member'') is not convertible. Cascade-free by '
  'design (ADR-U050).';

-- ----------------------------------------------------------------------------
-- 4. reactivate_own_account() — the return path (FEAT-PC005, fresh CREATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivate_own_account()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT id, personal_group_id, is_temporary, is_active,
         is_decommissioned, deactivation_origin
    INTO v_user
    FROM public.users
   WHERE auth_user_id = auth.uid()
     FOR UPDATE;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'reactivate_own_account: no session actor';
  END IF;
  IF v_user.is_temporary THEN
    RAISE EXCEPTION 'reactivate_own_account: a Mist has no account lifecycle';
  END IF;
  -- Decommissioned is terminal — never reversed here (PC005 STORY-2;
  -- enforce_decommission_invariant() stands).
  IF v_user.is_decommissioned THEN
    RAISE EXCEPTION 'reactivate_own_account: this account is terminally closed';
  END IF;

  -- Idempotent: already active is a success, no duplicate audit (STORY-3).
  IF v_user.is_active THEN
    RETURN jsonb_build_object('state', 'active', 'idempotent', true);
  END IF;

  -- The origin gate (STORY-6, C-F): only a member''s own pause flips back.
  IF v_user.deactivation_origin IS DISTINCT FROM 'member' THEN
    RAISE EXCEPTION 'reactivate_own_account: this account is under an admin hold — contact an admin';
  END IF;

  UPDATE public.users
     SET is_active = true,
         deactivation_origin = NULL
   WHERE id = v_user.id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_user.personal_group_id,
    'self_reactivate_account',
    v_user.id::text,
    jsonb_build_object('before', 'paused', 'after', 'active')
  );

  RETURN jsonb_build_object('state', 'active', 'idempotent', false);
END;
$$;

COMMENT ON FUNCTION public.reactivate_own_account() IS
  'FEAT-PC005 / IDN-12 (built at C-F): owner-gated self-service reactivation '
  '— member-origin paused -> active only; origin cleared on success. '
  'Privilege escalation bounded to: the caller''s OWN row, this one '
  'transition (decommissioned rejected as terminal; admin holds rejected — '
  'STORY-6 origin gate), plus the definer audit INSERT. No target parameter.';

-- ----------------------------------------------------------------------------
-- 5. delete_own_account() — the terminal departure (FEAT-PC017 STORY-4..9)
-- ----------------------------------------------------------------------------
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
  -- An admin hold is not escapable by deletion (STORY-2). The member''s
  -- right of access (export) is untouched by this refusal (CB-6).
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

  -- ─── 2. The membership walk — ported from admin_exit_user_from_platform
  --        (retired below; scenario vocabulary kept byte-stable), PLUS the
  --        C-E ds5 seal on the closure branch (the admin path predated DS-5).
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

      -- The C-E preserve-and-seal due the admin path predated: the group''s
      -- conversations seal in the same transaction (FEAT-PC017 STORY-4c).
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

  -- ─── 3. F-2 private-erase — via the U047 facts, never raw Core reads of
  --        domain tables (the COR-A posture; conformance-gate enforced).
  v_ds3_erased := public.ds3_lifecycle_account_deleted(v_pgid);
  v_ds7_erased := public.ds7_lifecycle_account_deleted(v_pgid);

  -- ─── 4. Owned-journey attribution -> the [Deleted User] sentinel (the
  --        existing hard-delete fact; F-2 communal retention with honest
  --        attribution — content itself untouched, ADR-U021 read-time).
  PERFORM public.ds3_lifecycle_user_hard_deleted(v_pgid, v_sentinel_group_id);

  -- ─── 5. Decommission + display scrub. v1 retains the users row and the
  --        personal group as FK targets (the retained-closed record; full
  --        erasure stays the admin erase_fim_account / A-ADM-queue path).
  --        The display-name sync trigger propagates the scrub to the
  --        personal group''s name — read-time attribution follows. Email is
  --        retained on the closed record (legitimate-interest account record;
  --        physical scrub inherits to A-ADM).
  UPDATE public.users
     SET is_active = false,
         is_decommissioned = true,
         deactivation_origin = 'member',
         nickname = NULL,
         bio = NULL,
         avatar_url = NULL,
         full_name = '[Deleted User]',
         updated_at = now()
   WHERE id = v_user.id;

  -- ─── 6. Sessions die (the retired path''s proven force-logout shape) ────
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
  'FEAT-PC017 / IDN-10 (C-F): owner-gated terminal self-deletion. Privilege '
  'escalation bounded to: the caller''s OWN account — the three-scenario '
  'membership walk ported from the retired admin_exit_user_from_platform '
  '(regular_leave / steward_handover / group_closure) + the C-E ds5 seal, '
  'the F-2 erasure facts (ds3/ds7 account_deleted), sentinel reassignment '
  '(user_hard_deleted), decommission + display scrub, session deletion, and '
  'the definer audit INSERT. No target parameter. Mist/session-less refused; '
  'admin holds not escapable; decommissioned idempotently terminal.';

-- ----------------------------------------------------------------------------
-- 6. get_own_account_state() — the origin split (FEAT-PC004, additive re-issue)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_own_account_state()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'is_active', u.is_active,
    'is_decommissioned', u.is_decommissioned,
    'deactivation_origin', u.deactivation_origin,
    'state', CASE
      WHEN u.is_decommissioned THEN 'decommissioned'
      WHEN NOT u.is_active AND u.deactivation_origin = 'member' THEN 'paused'
      WHEN NOT u.is_active THEN 'suspended'
      ELSE 'active'
    END
  )
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_own_account_state() IS
  'FEAT-PC004 / IDN-9 (+ C-F origin split, ADR-U050): SECURITY DEFINER '
  'own-row read of the caller''s account lifecycle state '
  '(active/paused/suspended/decommissioned — paused only when '
  'deactivation_origin=''member''; an off row with any other origin reads '
  'suspended), bypassing the users_select_active visibility filter for the '
  'caller''s OWN row only. Carries the deactivation_origin key (additive). '
  'No target parameter; never reads another member''s row. Returns NULL '
  'when the caller has no users row.';

-- ----------------------------------------------------------------------------
-- 7. Grants: the three self-service doors are authenticated-only (S9a: anon
--    answers 42501 at the grant wall; the in-body walls carry the rest).
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.pause_own_account()      FROM public, anon;
REVOKE ALL ON FUNCTION public.reactivate_own_account() FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_own_account()     FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pause_own_account()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account()     TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. The retirement (area-gate due): the admin exit path''s scenarios live on
--    in delete_own_account(); admin lifecycle control continues via
--    admin_update_user_status / admin_decommission_user /
--    admin_hard_delete_user / erase_fim_account (all untouched — suite S8b).
-- ----------------------------------------------------------------------------
DROP FUNCTION public.admin_exit_user_from_platform(uuid);
