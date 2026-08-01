-- adm_c_pc021_member_operations_family — FEAT-PC021 gate 2 (Cycle ADM-C, TASK-ADMC-01)
-- ----------------------------------------------------------------------------
-- The member administration operations family (ADM-3/4/5/6/12/18): four
-- re-issues + four new contracts. Closes walk findings 2 (the sanction pair
-- writes no audit rows), 3 (the legacy write family refuses untyped), 4 (no
-- admin platform exit exists — DROPped at C-F 20260721161500:611), and 5
-- (ADM-12 has no contract substrate; DeusEx membership was RLS-only writes).
--
-- RE-ISSUES (same signatures; deltas named, everything else byte-stable):
--   1. admin_update_user_status  — gate has_permission(manage_all_groups) ->
--      is_platform_admin() typed 42501; not-found typed P0002; NEW no-op guard
--      (STORY-3: re-running the same transition refuses P0001 and writes
--      nothing — the guard compares BOTH is_active and the would-be origin, so
--      the COR-C W1 pause->hold CONVERSION on an already-off row proceeds);
--      audit writes member.suspend / member.reactivate (the missing V1
--      obligation). ADR-U050 origin CASE + FOR UPDATE unchanged.
--   2. admin_decommission_user   — same gate + P0002 deltas; audit
--      member.decommission; target read gains FOR UPDATE (the PC021 rider
--      settles what W1 deliberately left flagged); memberships remain
--      untouched (B-ADMIN-008 — history intact).
--   3. admin_hard_delete_user    — same gate + P0002 deltas; audit action
--      renamed admin_hard_delete_user -> member.hard_delete (existing rows
--      keep their old string — append-only); FOR UPDATE on the target read;
--      audit-before-delete ordering and the full sentinel cascade unchanged
--      (erase_fim_account composes this function — its anonymise-then-delegate
--      path rides the re-issue unchanged, same JWT actor passes the new gate).
--   4. admin_force_logout        — same gate delta; audit action renamed
--      admin_force_logout -> member.force_logout; mechanism unchanged (the
--      auth.refresh_tokens + auth.sessions DELETE pair per target; absent
--      targets skipped, count returned). Honesty note carried to the surface:
--      revocation acts at the refresh/session layer; an already-issued access
--      JWT lives until its own expiry.
--
-- NEW CONTRACTS:
--   5. admin_exit_user_from_platform(p_target_user_id) — the ADM-6 full exit,
--      re-derived from delete_own_account's walk (20260721170000:87-246): the
--      same three-scenario classification over the target's active engagement
--      memberships (regular_leave / steward_handover / group_closure), the
--      same composed legs (ds3_lifecycle_member_departed,
--      ds3/ds5_lifecycle_group_closed, the existing notification kinds with
--      the walk's own copy), then terminal decommission with
--      deactivation_origin='admin', session revocation, audit
--      member.platform_exit. Deliberately NOT composed: the F-2 erasure legs
--      (ds3/ds7_lifecycle_account_deleted), the sentinel attribution
--      reassignment, and the profile scrub — the sweep ends participation;
--      erasure remains the member's own right or hard-delete's cascade.
--      An admin hold does NOT block (the self walk's hold guard stops the
--      member; here the admin is the actor).
--   6. admin_remove_member_from_group(p_group_id, p_target_user_id) — ADM-18:
--      the same classifier applied to exactly one active engagement
--      membership, same composed legs, notification copy names the admin
--      removal (exit_reason 'admin_removal'); audit member.remove_from_group
--      with group + scenario.
--   7. admin_grant_platform_admin(p_target_user_id) — ADM-12 over what was
--      RLS-only substrate: upserts an ACTIVE DeusEx membership AND inserts the
--      DeusEx role row EXPLICITLY — auto_assign_deusex_role fires only on the
--      invited->active UPDATE flip (20260222000000:1363), verified at build:
--      a direct active INSERT must not rely on it. The role INSERT fires
--      notify_role_assigned (AFTER INSERT) — the new admin's durable
--      role_assigned notification, composed for free. Audit
--      platform_admin.grant. Targets are existing ACTIVE members (P0001
--      otherwise); no email-invite flow.
--   8. admin_revoke_platform_admin(p_target_user_id) — deletes role row then
--      membership; the two last-admin floor triggers
--      (prevent_last_deusex_role_removal / prevent_last_deusex_membership_
--      removal, BEFORE DELETE) refuse VERBATIM on the final admin and the
--      whole call aborts — nothing written. The role DELETE fires
--      notify_role_removed (existing kind, composed). Audit
--      platform_admin.revoke.
--
-- Riders: every mutation writes admin_audit_log pattern (a) (actor_group_id =
-- the caller's personal group via get_current_personal_group_id()) with FOR
-- UPDATE on the target users row. All functions SECURITY DEFINER,
-- SET search_path = '', REVOKE anon. No new tables — no export-classification
-- change. The pre-existing trigger-bypass asymmetry (the membership floor
-- trigger never gained the app.hard_delete_in_progress bypass the role
-- trigger got at 20260224205639:78) is recorded, out of scope — it binds
-- hard-deleting the last DeusEx member, which no contract here performs.
-- Dotted action vocabulary extended per the PC020 ruling: member.*,
-- platform_admin.* — namespaced, never enumerated in a consumer.
--
-- SIBLING-ASSERTION SWEEP (platform CLAUDE.md rule; repo-wide grep 2026-08-01
-- over every suite naming the four re-issued functions, the retired exit
-- function, or the legacy audit action strings):
--   ADAPTED (ride this PR; red until this migration applies):
--   - tests/integration/account/account-lifecycle-admin-producer.test.ts:298
--     (W1f) pinned the producer's refusal as /manage_all_groups|Unauthorized/i;
--     the re-issued gate answers 42501 'platform administrator required'.
--     Adapted to pin the typed code + message.
--   - tests/integration/account/account-lifecycle-self-service.test.ts:543
--     (S8a) pinned admin_exit_user_from_platform's NON-existence (the C-F
--     retirement). This migration deliberately re-derives the contract
--     (ADM-6/CB-3); adapted to pin count = 1 with the supersession noted.
--   DELIBERATELY LEFT (each verified against this diff):
--   - account-lifecycle-admin-producer.test.ts (all other cells),
--     account-lifecycle-self-service.test.ts setAdminHold (:112), and
--     member-administration-contracts.test.ts:198,205 (gate-1 fixtures):
--     producers invoked as an authenticated DeusEx actor — a DeusEx caller
--     passes is_platform_admin(); the W1b/W1d pause->hold conversion is
--     honoured by the no-op guard's origin-delta clause; every sibling call is
--     a first-time transition, never a no-op.
--   - account-lifecycle-self-service.test.ts:553 (S8b): the three admin RPCs
--     stand — CREATE OR REPLACE keeps them.
--   - tests/unit/platform/ownership-direction-rule.test.ts:80:
--     functionOwner('admin_hard_delete_user') = PC-4 — name + owner unchanged.
--   - tests/integration/platform/internal-api-conformance.test.ts:65-76: the
--     COR_A_W4_RELOCATION_TARGETS set is annotation-only; the re-created
--     admin_exit_user_from_platform references no DS-owned table
--     (notifications is vertical:notifications by declaration — obligation
--     writes are never crossings; the DS legs are ds{N}_lifecycle_ contract
--     calls, auto-allowed by prefix).
--   - tests/integration/auth/fim-account-erasure.test.ts:228,286: hard-delete
--     driven by an authenticated DeusEx caller; pins the consent-FK 23503
--     surface and the Mist-target success path — mechanism unchanged, both
--     hold (no Mist guard is added to the re-issues for exactly this reason).
--   - tests/integration/communication/forum-contracts.test.ts:531 and
--     tests/integration/journal/journal-erasure-export.test.ts:90: comments
--     naming the function inside erase_fim_account-driven guards — behaviour
--     unchanged.
--   - E2E: no spec names the four functions; audit-action pins there are
--     auth.sign_in / session_revoked / data_export only. No test anywhere
--     pins the legacy strings 'admin_hard_delete_user' / 'admin_force_logout'
--     as audit actions.
--
-- Red demonstrated 2026-08-01 pre-apply
-- (member-administration-operations.test.ts): 26 failed / 2 passed / 28 —
-- the audit cells on zero dotted-name rows, the typed-refusal cells on legacy
-- P0001 prose, the no-op cells on head's silent success, the four new
-- contracts PGRST202, S7e on 'does not exist' instead of the verbatim floor
-- message. The two greens are exactly the labelled-green invariants (S3g,
-- S8c).
--
-- SECURITY DEFINER rationale: admin-plane mutations over identity/membership
-- substrate cross RLS by design; every function gates on is_platform_admin()
-- with typed 42501 before touching any row, REVOKE anon removes the
-- unauthenticated path, and escalation is bounded to the named target's rows
-- plus the composed lifecycle legs the self walk already performs.

-- ----------------------------------------------------------------------------
-- 1. admin_update_user_status() — re-issue (typed + audited + no-op guard)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
  target_user_id UUID,
  new_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
  v_new_origin TEXT;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  -- FOR UPDATE serialises against the self-service contracts' own-row locks
  -- (AC3-14, unchanged from the W1 re-issue).
  SELECT id, is_active, is_decommissioned, deactivation_origin
  INTO v_target
  FROM public.users WHERE id = target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- Decommission invariant: cannot reactivate a decommissioned user
  IF v_target.is_decommissioned = true AND new_is_active = true THEN
    RAISE EXCEPTION 'Cannot reactivate a decommissioned user';
  END IF;

  -- ADR-U050: 'admin' on hold (a member pause converts to an un-escapable
  -- hold), NULL on release (no stale residue), a decommissioned row keeps its
  -- terminal origin. Unchanged from the W1 re-issue.
  v_new_origin := CASE
    WHEN v_target.is_decommissioned THEN v_target.deactivation_origin
    WHEN new_is_active THEN NULL
    ELSE 'admin'
  END;

  -- No-op guard (PC021 STORY-3): a transition that would change neither the
  -- flag nor the origin refuses and writes nothing — row, audit trail, or
  -- otherwise. The origin clause is load-bearing: a hold on a member-paused
  -- row changes only the origin (the W1b conversion) and must proceed.
  IF v_target.is_active = new_is_active
     AND v_target.deactivation_origin IS NOT DISTINCT FROM v_new_origin THEN
    RAISE EXCEPTION 'User is already in the requested state';
  END IF;

  UPDATE public.users
  SET is_active = new_is_active,
      deactivation_origin = v_new_origin,
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    CASE WHEN new_is_active THEN 'member.reactivate' ELSE 'member.suspend' END,
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'previous_origin', v_target.deactivation_origin));

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.admin_update_user_status(UUID, BOOLEAN) IS
  'PC-4 admin lifecycle (RC7; COR-C W1 ADR-U050; re-issued FEAT-PC021 gate 2): '
  'platform-admin-gated (42501) activate/deactivate. Writes '
  'deactivation_origin=''admin'' on hold (a member pause converts), NULL on '
  'release; terminal origins preserved. Typed refusals: 42501 / P0002 '
  'not-found; state refusals P0001 incl. the no-op guard (same transition '
  'refuses, writes nothing). Audits member.suspend / member.reactivate. '
  'Target read FOR UPDATE. SECURITY DEFINER; escalation bounded to the one '
  'target row''s lifecycle flags + the audit INSERT.';

-- ----------------------------------------------------------------------------
-- 2. admin_decommission_user() — re-issue (typed + audited + FOR UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_decommission_user(
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  -- FOR UPDATE: the PC021 rider settles what the W1 header left flagged.
  SELECT id, is_decommissioned, deactivation_origin
  INTO v_target
  FROM public.users WHERE id = target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_target.is_decommissioned = true THEN
    RAISE EXCEPTION 'User is already decommissioned';
  END IF;

  -- Decommission: set both flags (trigger also enforces is_active=false).
  -- Memberships are deliberately untouched (B-ADMIN-008 — history intact).
  UPDATE public.users
  SET is_decommissioned = true,
      is_active = false,
      deactivation_origin = 'admin',
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'member.decommission',
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'previous_origin', v_target.deactivation_origin));

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.admin_decommission_user(UUID) IS
  'PC-4 admin lifecycle (RC7; COR-C W1 ADR-U050; re-issued FEAT-PC021 gate '
  '2): platform-admin-gated (42501) terminal decommission, origin ''admin''. '
  'Typed refusals: 42501 / P0002 not-found; re-decommission refuses P0001 (a '
  'terminal origin is never rewritten). Memberships preserved (B-ADMIN-008). '
  'Audits member.decommission. Target read FOR UPDATE. SECURITY DEFINER; '
  'escalation bounded to the one target row''s lifecycle flags + the audit '
  'INSERT.';

-- ----------------------------------------------------------------------------
-- 3. admin_hard_delete_user() — re-issue (typed + dotted action; cascade unchanged)
-- ----------------------------------------------------------------------------
-- Byte-stable to 20260720120000:437-525 except: the typed gate, the typed
-- not-found, FOR UPDATE on the target read, and the audit action rename.
create or replace function public.admin_hard_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_group_id uuid;
  v_target_personal_group_id uuid;
  v_target_auth_user_id uuid;
  v_deleted_user_group_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_caller_group_id := public.get_current_personal_group_id();

  -- Get target's personal group and auth user ID
  select personal_group_id, auth_user_id
  into v_target_personal_group_id, v_target_auth_user_id
  from public.users where id = target_user_id
  for update;

  if v_target_personal_group_id is null then
    raise exception 'User not found or has no personal group' using errcode = 'P0002';
  end if;

  -- Get [Deleted User] sentinel group
  select id into v_deleted_user_group_id
  from public.groups where name = '[Deleted User]' and group_type = 'system';

  -- Write audit log BEFORE deletion (existing rows keep the legacy
  -- 'admin_hard_delete_user' string — the log is append-only).
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_caller_group_id, 'member.hard_delete', target_user_id::text,
    jsonb_build_object('target_user_id', target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- Reassign the target's DS-5 forum authorship -> the sentinel.
  -- DS-5's own disposition now (ADR-U047 Amendment 3): Core resolves the
  -- target (COALESCE keeps the fallback the inline UPDATE had) and passes it;
  -- DS-5 owns the reassignment. Same transaction, before the group delete.
  perform public.ds5_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  -- Reassign the target's DS-3 journeys + enrolment attributions -> the sentinel.
  -- DS-3's own disposition now (ADR-U047 Amendment 1): Core resolves the target
  -- (COALESCE keeps journeys.created_by_group_id NOT NULL) and passes it; DS-3
  -- owns the reassignment. Runs before the group delete (RESTRICT), same as the
  -- inline journeys reassignment it replaces.
  perform public.ds3_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  update public.groups
  set created_by_group_id = coalesce(v_deleted_user_group_id, v_caller_group_id)
  where created_by_group_id = v_target_personal_group_id
    and id != v_target_personal_group_id;

  update public.admin_audit_log
  set actor_group_id = v_deleted_user_group_id
  where actor_group_id = v_target_personal_group_id;

  -- Reassign actor FKs in membership/role tables
  update public.group_memberships
  set added_by_group_id = v_deleted_user_group_id
  where added_by_group_id = v_target_personal_group_id;

  update public.user_group_roles
  set assigned_by_group_id = v_deleted_user_group_id
  where assigned_by_group_id = v_target_personal_group_id;

  -- Enable bypass for immutability trigger and notification triggers (transaction-local)
  perform set_config('app.bypass_personal_group_id_immutability', 'true', true);
  perform set_config('app.hard_delete_in_progress', 'true', true);

  -- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)
  delete from public.groups where id = v_target_personal_group_id;

  -- Delete user record
  delete from public.users where id = target_user_id;

  -- Delete auth user
  if v_target_auth_user_id is not null then
    delete from auth.users where id = v_target_auth_user_id;
  end if;

  return jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
end;
$$;

COMMENT ON FUNCTION public.admin_hard_delete_user(UUID) IS
  'PC-4 admin lifecycle (re-issued FEAT-PC021 gate 2): platform-admin-gated '
  '(42501) hard delete. Typed P0002 not-found. Audit member.hard_delete '
  'written BEFORE deletion; sentinel reassignment cascade (forum via '
  'ds5_lifecycle_user_hard_deleted, journeys via '
  'ds3_lifecycle_user_hard_deleted, groups + actor FKs inline), then personal '
  'group CASCADE, users row, auth.users row. Composed by erase_fim_account '
  '(anonymise-then-delegate). SECURITY DEFINER; the privilege the cascade '
  'requires.';

-- ----------------------------------------------------------------------------
-- 4. admin_force_logout() — re-issue (typed + dotted action; mechanism unchanged)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_force_logout(target_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_count INTEGER := 0;
  v_target_id UUID;
  v_target_auth_id UUID;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  FOREACH v_target_id IN ARRAY target_user_ids
  LOOP
    SELECT auth_user_id INTO v_target_auth_id
    FROM public.users WHERE id = v_target_id
    FOR UPDATE;

    IF v_target_auth_id IS NOT NULL THEN
      -- The same two-table pair delete_own_account uses (20260721170000:272-273).
      -- Refresh/session-layer revocation: an already-issued access JWT lives
      -- until its own expiry (B-ADMIN-019 honesty note).
      DELETE FROM auth.refresh_tokens WHERE user_id = v_target_auth_id::text;
      DELETE FROM auth.sessions WHERE user_id = v_target_auth_id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_caller_group_id, 'member.force_logout', 'users',
    jsonb_build_object('count', v_count, 'target_user_ids', to_jsonb(target_user_ids)));

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

COMMENT ON FUNCTION public.admin_force_logout(UUID[]) IS
  'PC-4 admin session control (re-issued FEAT-PC021 gate 2): '
  'platform-admin-gated (42501) session revocation for the named targets — '
  'the auth.refresh_tokens + auth.sessions DELETE pair per target; inactive '
  'targets valid; absent targets skipped (count returned). Audits '
  'member.force_logout. Revocation is refresh/session-layer: issued access '
  'JWTs live to their own expiry.';

-- ----------------------------------------------------------------------------
-- 5. admin_exit_user_from_platform() — NEW (the ADM-6 full-exit walk)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_exit_user_from_platform(
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target record;
  v_pgid uuid;
  v_deusex_group_id uuid;
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
BEGIN
  -- ─── 1. Gate + resolve target ───────────────────────────────────────────
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  SELECT id, personal_group_id, auth_user_id, is_temporary, is_decommissioned
    INTO v_target
    FROM public.users
   WHERE id = p_target_user_id
     FOR UPDATE;

  -- Unknown AND temporary targets alike: existence-hidden (Mist lifecycle is
  -- the reaper's, ADR-U033).
  IF v_target.id IS NULL OR v_target.is_temporary THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_target.is_decommissioned THEN
    RAISE EXCEPTION 'this account is already terminally closed';
  END IF;
  -- Deliberately NO admin-hold guard: the self walk's hold guard exists to
  -- stop the MEMBER; here the admin is the actor — a held account is a valid
  -- exit target.

  v_pgid := v_target.personal_group_id;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'admin_exit_user_from_platform: DeusEx system group not found';
  END IF;

  SELECT id INTO v_steward_template_id
    FROM public.role_templates
   WHERE name = 'Steward Role Template';

  -- ─── 2. The membership walk — re-derived from delete_own_account
  --        (20260721170000:87-246), composed leg-for-leg ───────────────────
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

  -- ─── 3. Terminal decommission — flags only. Deliberately NOT composed:
  --        the F-2 erasure legs, the sentinel attribution reassignment, and
  --        the profile scrub (the sweep ends participation; erasure remains
  --        the member's own right or hard-delete's cascade) ────────────────
  UPDATE public.users
     SET is_active = false,
         is_decommissioned = true,
         deactivation_origin = 'admin',
         updated_at = now()
   WHERE id = v_target.id;

  -- ─── 4. Sessions die (the same two-table pair) ──────────────────────────
  DELETE FROM auth.refresh_tokens WHERE user_id = v_target.auth_user_id::text;
  DELETE FROM auth.sessions       WHERE user_id = v_target.auth_user_id;

  -- ─── 5. Audit ───────────────────────────────────────────────────────────
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'member.platform_exit',
    v_target.id::text,
    jsonb_build_object(
      'target_user_id', v_target.id,
      'groups_exited', v_groups_exited,
      'group_details', v_results
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

COMMENT ON FUNCTION public.admin_exit_user_from_platform(UUID) IS
  'FEAT-PC021 gate 2 (ADM-6, board CB-3): platform-admin-gated (42501) full '
  'platform exit — the delete_own_account membership walk re-derived '
  '(regular_leave / steward_handover / group_closure, composed legs + '
  'existing notification kinds), then terminal decommission with '
  'deactivation_origin=''admin'' and session revocation. Deliberately NO F-2 '
  'erasure legs and NO profile scrub — the sweep ends participation; erasure '
  'stays member-initiated or hard-delete''s. Unknown/Mist targets P0002 '
  '(existence-hidden); already-terminal P0001; an admin hold does NOT block. '
  'Audits member.platform_exit with per-group scenarios. SECURITY DEFINER; '
  'escalation bounded to the target''s membership fabric + lifecycle flags.';

-- ----------------------------------------------------------------------------
-- 6. admin_remove_member_from_group() — NEW (ADM-18, the classifier on one group)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_member_from_group(
  p_group_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target record;
  v_group record;
  v_pgid uuid;
  v_deusex_group_id uuid;
  v_steward_template_id uuid;
  v_member_count integer;
  v_steward_role_id uuid;
  v_is_steward boolean;
  v_steward_count integer;
  v_scenario text;
  v_non_public_journey_count integer;
  v_member record;
BEGIN
  -- ─── Gate + resolve ─────────────────────────────────────────────────────
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  SELECT id, personal_group_id, is_temporary
    INTO v_target
    FROM public.users
   WHERE id = p_target_user_id
     FOR UPDATE;
  IF v_target.id IS NULL OR v_target.is_temporary THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  v_pgid := v_target.personal_group_id;

  SELECT g.id, g.name, g.status
    INTO v_group
    FROM public.groups g
   WHERE g.id = p_group_id AND g.group_type = 'engagement';
  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'group not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is not an active member of this group' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.status <> 'active' THEN
    RAISE EXCEPTION 'group is not active';
  END IF;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'admin_remove_member_from_group: DeusEx system group not found';
  END IF;

  SELECT id INTO v_steward_template_id
    FROM public.role_templates
   WHERE name = 'Steward Role Template';

  -- ─── Classify — the same classifier the walk and the detail read use ────
  SELECT count(*) INTO v_member_count
    FROM public.group_memberships
   WHERE group_id = p_group_id AND status = 'active';

  SELECT gr.id INTO v_steward_role_id
    FROM public.group_roles gr
   WHERE gr.group_id = p_group_id
     AND (gr.created_from_role_template_id = v_steward_template_id
          OR gr.name = 'Steward')
   LIMIT 1;

  v_is_steward := false;
  v_steward_count := 0;
  IF v_steward_role_id IS NOT NULL THEN
    SELECT count(*) INTO v_steward_count
      FROM public.user_group_roles
     WHERE group_id = p_group_id
       AND group_role_id = v_steward_role_id;
    v_is_steward := EXISTS (
      SELECT 1 FROM public.user_group_roles
       WHERE group_id = p_group_id
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

  -- ─── Execute the one leg — same composition, admin-removal copy ─────────
  IF v_scenario = 'group_closure' THEN
    UPDATE public.groups SET status = 'closed'
     WHERE id = p_group_id;

    v_non_public_journey_count :=
      (public.ds3_lifecycle_group_closed(p_group_id, 'group_closed') ->> 'journey_count')::integer;

    PERFORM public.ds5_lifecycle_group_closed(p_group_id, 'group_closed');

    IF v_non_public_journey_count > 0 THEN
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_deusex_group_id,
        'group_closed',
        'Group Closed — Member Removal',
        v_group.name || ' has been closed (admin removal of its last member). ' ||
          v_non_public_journey_count || ' non-public journey(s) require review.',
        jsonb_build_object(
          'group_id', p_group_id,
          'journey_count', v_non_public_journey_count,
          'exit_reason', 'admin_removal'
        ),
        p_group_id
      );
    END IF;

    DELETE FROM public.user_group_roles
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
    DELETE FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid;

  ELSIF v_scenario = 'steward_handover' THEN
    INSERT INTO public.group_memberships
      (group_id, member_group_id, added_by_group_id, status)
    VALUES
      (p_group_id, v_deusex_group_id, v_pgid, 'active')
    ON CONFLICT (group_id, member_group_id)
      DO UPDATE SET status = 'active', status_changed_at = now();

    INSERT INTO public.user_group_roles
      (member_group_id, group_id, group_role_id, assigned_by_group_id)
    VALUES
      (v_deusex_group_id, p_group_id, v_steward_role_id, v_pgid)
    ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

    UPDATE public.group_memberships
       SET added_by_group_id = v_deusex_group_id
     WHERE group_id = p_group_id
       AND status = 'invited'
       AND added_by_group_id = v_pgid;

    UPDATE public.pending_email_invitations
       SET invited_by_group_id = v_deusex_group_id
     WHERE group_id = p_group_id
       AND invited_by_group_id = v_pgid
       AND status = 'pending';

    PERFORM public.ds3_lifecycle_member_departed(p_group_id, v_pgid, 'left_group');

    DELETE FROM public.user_group_roles
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
    DELETE FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid;

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
        'FringeIsland has temporarily assumed stewardship of ' || v_group.name || '.',
        jsonb_build_object(
          'group_id', p_group_id,
          'exit_reason', 'admin_removal'
        ),
        p_group_id
      );
    END LOOP;

    INSERT INTO public.notifications
      (recipient_group_id, type, title, body, payload, group_id)
    VALUES (
      v_deusex_group_id,
      'stewardship_required',
      'Stewardship Required',
      v_group.name || ' requires a permanent Steward. The previous Steward was removed by an administrator.',
      jsonb_build_object(
        'group_id', p_group_id,
        'exit_reason', 'admin_removal'
      ),
      p_group_id
    );

  ELSE -- regular_leave
    PERFORM public.ds3_lifecycle_member_departed(p_group_id, v_pgid, 'left_group');

    DELETE FROM public.user_group_roles
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
    DELETE FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
  END IF;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'member.remove_from_group',
    v_target.id::text,
    jsonb_build_object(
      'target_user_id', v_target.id,
      'group_id', p_group_id,
      'group_name', v_group.name,
      'scenario', v_scenario
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'group_name', v_group.name,
    'scenario', v_scenario
  );
END;
$$;

COMMENT ON FUNCTION public.admin_remove_member_from_group(UUID, UUID) IS
  'FEAT-PC021 gate 2 (ADM-18): platform-admin-gated (42501) targeted removal '
  '— the walk classifier applied to exactly one active engagement membership '
  '(regular_leave / steward_handover / group_closure), same composed legs, '
  'notification copy naming the admin removal. Unknown user/group or '
  'non-member P0002; non-active group P0001. Audits member.remove_from_group '
  'with group + scenario. SECURITY DEFINER; escalation bounded to the one '
  'membership''s fabric.';

-- ----------------------------------------------------------------------------
-- 7. admin_grant_platform_admin() — NEW (ADM-12 grant; explicit role insert)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_platform_admin(
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target record;
  v_deusex_group_id uuid;
  v_deusex_role_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  SELECT id, personal_group_id, is_temporary, is_active, is_decommissioned
    INTO v_target
    FROM public.users
   WHERE id = p_target_user_id
     FOR UPDATE;
  IF v_target.id IS NULL OR v_target.is_temporary THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT v_target.is_active OR v_target.is_decommissioned THEN
    RAISE EXCEPTION 'target must be an active member';
  END IF;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  SELECT id INTO v_deusex_role_id
    FROM public.group_roles
   WHERE group_id = v_deusex_group_id AND name = 'DeusEx';
  IF v_deusex_group_id IS NULL OR v_deusex_role_id IS NULL THEN
    RAISE EXCEPTION 'admin_grant_platform_admin: DeusEx group/role not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_memberships
     WHERE group_id = v_deusex_group_id
       AND member_group_id = v_target.personal_group_id
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is already a platform administrator';
  END IF;

  -- Upsert the ACTIVE membership (a stale invited row is converted).
  INSERT INTO public.group_memberships
    (group_id, member_group_id, added_by_group_id, status)
  VALUES
    (v_deusex_group_id, v_target.personal_group_id, v_caller_group_id, 'active')
  ON CONFLICT (group_id, member_group_id)
    DO UPDATE SET status = 'active', status_changed_at = now();

  -- EXPLICIT role insert: auto_assign_deusex_role fires only on the
  -- invited->active UPDATE flip — a direct active INSERT must not rely on it.
  -- This INSERT fires notify_role_assigned (AFTER INSERT): the new admin's
  -- durable role_assigned notification, composed for free.
  INSERT INTO public.user_group_roles
    (member_group_id, group_id, group_role_id, assigned_by_group_id)
  VALUES
    (v_target.personal_group_id, v_deusex_group_id, v_deusex_role_id, v_caller_group_id)
  ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'platform_admin.grant',
    v_target.id::text,
    jsonb_build_object('target_user_id', v_target.id)
  );

  RETURN jsonb_build_object('success', true, 'target_user_id', v_target.id);
END;
$$;

COMMENT ON FUNCTION public.admin_grant_platform_admin(UUID) IS
  'FEAT-PC021 gate 2 (ADM-12): platform-admin-gated (42501) grant of '
  'platform administration — upserts the ACTIVE DeusEx membership AND inserts '
  'the DeusEx role row explicitly (the invited->active trigger does not fire '
  'on a direct active INSERT); the role INSERT fires notify_role_assigned. '
  'Unknown/Mist targets P0002; non-active targets and existing admins P0001. '
  'Audits platform_admin.grant. Targets are existing active members — no '
  'email-invite flow. SECURITY DEFINER; escalation bounded to the target''s '
  'DeusEx membership + role rows.';

-- ----------------------------------------------------------------------------
-- 8. admin_revoke_platform_admin() — NEW (ADM-12 revoke; floor refuses verbatim)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_platform_admin(
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target record;
  v_deusex_group_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  SELECT id, personal_group_id, is_temporary
    INTO v_target
    FROM public.users
   WHERE id = p_target_user_id
     FOR UPDATE;
  IF v_target.id IS NULL OR v_target.is_temporary THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'admin_revoke_platform_admin: DeusEx system group not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
     WHERE group_id = v_deusex_group_id
       AND member_group_id = v_target.personal_group_id
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is not a platform administrator';
  END IF;

  -- Role row first, then membership. The two last-admin floor triggers
  -- (BEFORE DELETE) refuse VERBATIM on the final admin — the raise aborts the
  -- whole call, so nothing is written. The role DELETE fires
  -- notify_role_removed (existing kind, composed).
  DELETE FROM public.user_group_roles
   WHERE group_id = v_deusex_group_id
     AND member_group_id = v_target.personal_group_id;
  DELETE FROM public.group_memberships
   WHERE group_id = v_deusex_group_id
     AND member_group_id = v_target.personal_group_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'platform_admin.revoke',
    v_target.id::text,
    jsonb_build_object('target_user_id', v_target.id)
  );

  RETURN jsonb_build_object('success', true, 'target_user_id', v_target.id);
END;
$$;

COMMENT ON FUNCTION public.admin_revoke_platform_admin(UUID) IS
  'FEAT-PC021 gate 2 (ADM-12): platform-admin-gated (42501) revocation of '
  'platform administration — deletes the DeusEx role row then the membership; '
  'the last-admin floor triggers refuse verbatim and abort the call (nothing '
  'written). Unknown/Mist targets P0002; non-admin targets P0001. Audits '
  'platform_admin.revoke. SECURITY DEFINER; escalation bounded to the '
  'target''s DeusEx membership + role rows.';

-- ----------------------------------------------------------------------------
-- Grants — re-issues keep their ACLs (CREATE OR REPLACE preserves them); the
-- four new contracts get the house shape: no anon path, authenticated +
-- service_role EXECUTE (the gate refuses inside).
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_exit_user_from_platform(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_exit_user_from_platform(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_remove_member_from_group(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_member_from_group(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_grant_platform_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_platform_admin(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_revoke_platform_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_platform_admin(UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verification block
-- ----------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'admin_update_user_status', 'admin_decommission_user',
    'admin_hard_delete_user', 'admin_force_logout',
    'admin_exit_user_from_platform', 'admin_remove_member_from_group',
    'admin_grant_platform_admin', 'admin_revoke_platform_admin'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_fn
    ) then
      raise exception '% not present after gate 2', v_fn;
    end if;
  end loop;
  raise notice 'PC021 gate 2: member operations family in place (4 re-issues + 4 new contracts)';
end;
$$;
