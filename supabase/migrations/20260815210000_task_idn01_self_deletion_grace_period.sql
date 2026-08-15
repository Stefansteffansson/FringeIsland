-- ============================================================================
-- TASK-IDN-01 — self-deletion completes the standard pattern: a 30-day grace
-- window, a restore door, and a scheduled final wipe
--
-- Found 2026-08-15 (live walk): "Delete my account for good" scrubbed and
-- deactivated, but public.users.email and the auth.users credential row
-- persisted INDEFINITELY — no restore door, no scheduled erasure. The button's
-- copy promised more than the door delivered, and indefinite retention with no
-- schedule is the one shape GDPR's "without undue delay" does not tolerate.
--
-- RULED (Stefan, 2026-08-15) + board settled same day (second session):
--   1. Click keeps today's behaviour exactly (membership walk exits groups,
--      DS-3/5/7 dispositions fire, display scrub, sessions die) — that click
--      now STARTS a grace window (default 30 days, pc2_config-driven).
--   2. Identity is STASHED at the scrub moment (full_name, nickname, bio,
--      avatar_url — the fields the scrub destroys) so restore returns the
--      identity whole. Groups and content are NOT restored — they were left
--      and dispositioned at click (today's behaviour, kept by ruling 1); the
--      restore door's copy is honest about exactly that.
--   3. Login within the window may call restore_own_account(): unstash,
--      reactivate, clear the schedule. AMENDS the PC005 STORY-2 "decommission
--      is terminal" doctrine for deactivation_origin='member' WITHIN the
--      window only; admin-origin decommission stays terminal, and
--      reactivate_own_account's refusal ("terminally closed") stands — the
--      restore door is a different, narrower door.
--   4. Past the window, a scheduled reaper (the Mist-reaper pattern,
--      pg_cron) hard-erases via the admin_hard_delete_user mechanics —
--      credentials, email, PII actually go, with the full disposition chain
--      (consent anonymise, DS-5/DS-3 reassign + DM disposition, cascade).
--   5. No suppression record — the wipe is total (board ruling 4).
--
-- Mechanism inventory (walked before drafting):
--   - Scrub site + fields:            20260812120000:442-455 (delete_own_account §5)
--   - Membership walk exits at click: 20260812120000:268-430 (§2, groups_exited)
--   - Wipe mechanics:                 20260812120000:485-600 (admin_hard_delete_user)
--   - Reaper pattern:                 20260626204102:79-133 (reap_expired_mists)
--   - pc2_config shape:               20260626204102:40-45 (key PK, value text)
--   - reaper_runs sink:               20260626204102:62-77
--   - Decommission invariant:         20260222000000 (forces is_active=false when
--                                     decommissioned; does NOT forbid reversal —
--                                     the restore UPDATE needs no bypass)
--
-- Design choices that keep the blast radius small:
--   - delete_own_account is NOT re-issued. The stash + timestamp land via a
--     BEFORE UPDATE trigger on public.users that captures OLD (pre-scrub)
--     values at the exact member-origin decommission moment — any future
--     member-origin decommission path inherits the stash by construction.
--   - admin_hard_delete_user IS re-issued, as a thin gate over the extracted
--     primitive _pc2_hard_erase_user (the reaper cannot call the admin door:
--     is_platform_admin() reads a JWT pg_cron does not have). Behaviour and
--     return shape are byte-preserved; the audit row's actor/action become
--     parameters (admin path passes exactly what it wrote before).
--
-- Sibling-assertion sweep (grepped 2026-08-15, listed per the tier rule):
--   - account-lifecycle-self-service.test.ts:471 (nickname scrub literal) —
--     deliberately left: the scrub is unchanged; the stash rides beside it.
--   - reactivate_own_account "terminally closed" refusal cells — deliberately
--     left: that door still refuses; restore is a new door.
--   - member-administration-operations / fim-account-erasure hard-delete cells
--     — deliberately left: wrapper preserves gate, audit row, effects, return.
--   - mist reaper cells — untouched (separate function, separate cron job).
--
-- Conformance: restore_own_account, get_own_restore_state,
-- _pc2_hard_erase_user, reap_expired_member_deletions, and
-- pc2_stash_identity_on_member_decommission register under PC-2 in
-- supabase/ownership.manifest.json IN THIS SAME PR (the twice-dropped act).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The schedule facts
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS decommissioned_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pre_deletion_identity jsonb;

COMMENT ON COLUMN public.users.decommissioned_at IS
  'TASK-IDN-01: when the member-origin decommission happened — the grace clock. Set by the stash trigger; cleared by restore_own_account(); the reaper erases past decommissioned_at + member_deletion_grace_period.';
COMMENT ON COLUMN public.users.pre_deletion_identity IS
  'TASK-IDN-01: the identity the display scrub destroys (full_name, nickname, bio, avatar_url), captured from the OLD row at decommission so restore returns it whole. Erased with the row by the reaper; cleared on restore.';

INSERT INTO public.pc2_config (key, value, description)
VALUES ('member_deletion_grace_period', '30 days',
        'TASK-IDN-01: interval between member self-deletion and the reaper''s permanent erasure. Restore is offered inside this window.')
ON CONFLICT (key) DO NOTHING;

-- Backfill: any member-origin decommissioned row that predates the schedule
-- starts its clock now — no date was ever promised to it, and an unscheduled
-- indefinite hold is exactly what this task retires.
UPDATE public.users
   SET decommissioned_at = now()
 WHERE is_decommissioned = true
   AND deactivation_origin = 'member'
   AND decommissioned_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. The stash trigger — identity captured at the scrub moment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pc2_stash_identity_on_member_decommission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Fires exactly on the member-origin decommission transition. OLD carries
  -- the pre-scrub values because delete_own_account scrubs and decommissions
  -- in one UPDATE (20260812120000:446-455). Admin holds (origin 'admin') and
  -- re-saves of already-decommissioned rows never enter.
  IF NEW.is_decommissioned = true AND OLD.is_decommissioned = false
     AND NEW.deactivation_origin = 'member' THEN
    NEW.decommissioned_at := now();
    NEW.pre_deletion_identity := jsonb_build_object(
      'full_name',  OLD.full_name,
      'nickname',   OLD.nickname,
      'bio',        OLD.bio,
      'avatar_url', OLD.avatar_url
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.pc2_stash_identity_on_member_decommission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pc2_stash_identity_on_member_decommission ON public.users;
CREATE TRIGGER pc2_stash_identity_on_member_decommission
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.pc2_stash_identity_on_member_decommission();

-- ----------------------------------------------------------------------------
-- 3. The restore-state read — the interstitial's one honest source
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_own_restore_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user record;
  v_grace interval;
BEGIN
  SELECT id, is_decommissioned, deactivation_origin, decommissioned_at
    INTO v_user
    FROM public.users
   WHERE auth_user_id = (SELECT auth.uid());
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'get_own_restore_state: no session actor' USING ERRCODE = '28000';
  END IF;

  SELECT (value)::interval INTO v_grace
  FROM public.pc2_config WHERE key = 'member_deletion_grace_period';
  IF v_grace IS NULL THEN
    v_grace := interval '30 days';  -- the reaper's fallback, mirrored
  END IF;

  IF v_user.is_decommissioned = false
     OR v_user.deactivation_origin IS DISTINCT FROM 'member' THEN
    RETURN jsonb_build_object('restorable', false, 'scheduled_deletion_at', NULL);
  END IF;

  RETURN jsonb_build_object(
    'restorable', (v_user.decommissioned_at IS NOT NULL
                   AND now() < v_user.decommissioned_at + v_grace),
    'decommissioned_at', v_user.decommissioned_at,
    'scheduled_deletion_at', v_user.decommissioned_at + v_grace
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_own_restore_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_restore_state() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. The restore door
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user record;
  v_grace interval;
BEGIN
  SELECT id, personal_group_id, is_temporary, is_decommissioned,
         deactivation_origin, decommissioned_at, pre_deletion_identity
    INTO v_user
    FROM public.users
   WHERE auth_user_id = (SELECT auth.uid())
     FOR UPDATE;
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'restore_own_account: no session actor' USING ERRCODE = '28000';
  END IF;
  IF v_user.is_temporary THEN
    RAISE EXCEPTION 'restore_own_account: a Mist has no account lifecycle' USING ERRCODE = '42501';
  END IF;

  -- The narrow door: member-origin decommission only. Admin-origin stays
  -- terminal (PC005 STORY-2 stands there); an active account has nothing
  -- to restore.
  IF v_user.is_decommissioned = false
     OR v_user.deactivation_origin IS DISTINCT FROM 'member' THEN
    RAISE EXCEPTION 'restore_own_account: nothing to restore' USING ERRCODE = 'P0001';
  END IF;

  SELECT (value)::interval INTO v_grace
  FROM public.pc2_config WHERE key = 'member_deletion_grace_period';
  IF v_grace IS NULL THEN
    v_grace := interval '30 days';
  END IF;

  IF v_user.decommissioned_at IS NULL
     OR now() >= v_user.decommissioned_at + v_grace THEN
    RAISE EXCEPTION 'restore_own_account: the grace window has closed — this account is scheduled for permanent deletion'
      USING ERRCODE = 'P0001';
  END IF;

  -- Unstash. COALESCE guards the NOT NULL display columns; the
  -- sync_personal_group_display_name trigger propagates the name back to the
  -- personal group (the same channel that propagated the scrub).
  UPDATE public.users
     SET is_active = true,
         is_decommissioned = false,
         deactivation_origin = NULL,
         full_name  = COALESCE(v_user.pre_deletion_identity->>'full_name',  full_name),
         nickname   = COALESCE(v_user.pre_deletion_identity->>'nickname',   nickname),
         bio        = v_user.pre_deletion_identity->>'bio',
         avatar_url = v_user.pre_deletion_identity->>'avatar_url',
         decommissioned_at = NULL,
         pre_deletion_identity = NULL,
         updated_at = now()
   WHERE id = v_user.id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_user.personal_group_id, 'self_restore_account', v_user.id::text,
          jsonb_build_object('was_decommissioned_at', v_user.decommissioned_at));

  RETURN jsonb_build_object('success', true, 'restored', true);
END;
$$;
REVOKE ALL ON FUNCTION public.restore_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_own_account() TO authenticated, service_role;

COMMENT ON FUNCTION public.restore_own_account() IS
  'TASK-IDN-01: the grace-window restore door. Reverses a MEMBER-origin decommission within pc2_config.member_deletion_grace_period: unstash identity, reactivate, clear the schedule. Restores identity only — groups were left and content dispositioned at click, by ruling. Admin-origin decommission stays terminal.';

-- ----------------------------------------------------------------------------
-- 5. The wipe primitive — extracted verbatim from admin_hard_delete_user
--    (20260812120000:485-600) with actor/action as parameters
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._pc2_hard_erase_user(
  p_target_user_id uuid,
  p_actor_group_id uuid,
  p_audit_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_target_personal_group_id uuid;
  v_target_auth_user_id uuid;
  v_deleted_user_group_id uuid;
begin
  -- Get target's personal group and auth user ID
  select personal_group_id, auth_user_id
  into v_target_personal_group_id, v_target_auth_user_id
  from public.users where id = p_target_user_id
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
  values (p_actor_group_id, p_audit_action, p_target_user_id::text,
    jsonb_build_object('target_user_id', p_target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- WA-3 (FEAT-PC025): consent-subject anonymise — erase_fim_account's leg
  -- (20260627120000:83-91) copied verbatim, idempotent under that composition
  -- (the outer anonymise leaves zero matching rows for this inner pass).
  -- ADR-U034 §5 anonymise-then-retain: NULL the subject link (clears the FK
  -- RESTRICT), keep the consent event as GDPR proof. The bypass is the only
  -- sanctioned way past enforce_consent_append_only.
  perform set_config('app.consent_erasure_in_progress', 'true', true);
  update public.consent_records
    set subject_user_id = null, subject_group_id = null
    where subject_user_id = p_target_user_id
       or subject_group_id = v_target_personal_group_id;

  -- Reassign the target's DS-5 forum authorship -> the sentinel.
  -- DS-5's own disposition now (ADR-U047 Amendment 3): Core resolves the
  -- target (COALESCE keeps the fallback the inline UPDATE had) and passes it;
  -- DS-5 owns the reassignment. Same transaction, before the group delete.
  perform public.ds5_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, p_actor_group_id));

  -- FEAT-PD018: the DM disposition. Forum authorship reassigns (above); DM
  -- message bodies are content-level tombstoned and participant-less threads
  -- deleted. Must run BEFORE the group delete: the handler reads the
  -- departing member's own participant row, which that delete CASCADEs away.
  perform public.ds5_lifecycle_account_deleted(v_target_personal_group_id);

  -- Reassign the target's DS-3 journeys + enrolment attributions -> the sentinel.
  -- DS-3's own disposition now (ADR-U047 Amendment 1): Core resolves the target
  -- (COALESCE keeps journeys.created_by_group_id NOT NULL) and passes it; DS-3
  -- owns the reassignment. Runs before the group delete (RESTRICT), same as the
  -- inline journeys reassignment it replaces.
  perform public.ds3_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, p_actor_group_id));

  update public.groups
  set created_by_group_id = coalesce(v_deleted_user_group_id, p_actor_group_id)
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

  -- Delete personal group (CASCADE: memberships, roles, notifications,
  -- enrollments). NOT conversations: a dm-kind conversation has group_id NULL
  -- (…c_a…:59), so conversations.group_id's CASCADE never fires for it — the
  -- claim this comment used to make was false, and left 557 threads standing
  -- through the 2026-08-12 reset. DM disposition is ds5_lifecycle_account_deleted
  -- above; group-kind conversations cascade here as the comment always implied.
  delete from public.groups where id = v_target_personal_group_id;

  -- Delete user record
  delete from public.users where id = p_target_user_id;

  -- Delete auth user
  if v_target_auth_user_id is not null then
    delete from auth.users where id = v_target_auth_user_id;
  end if;

  return jsonb_build_object('success', true, 'deleted_user_id', p_target_user_id);
end;
$function$;
REVOKE ALL ON FUNCTION public._pc2_hard_erase_user(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._pc2_hard_erase_user(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public._pc2_hard_erase_user(uuid, uuid, text) IS
  'TASK-IDN-01: the hard-erase primitive, extracted verbatim from admin_hard_delete_user (20260812120000) so the grace reaper can erase without the admin JWT gate. Ungated by design — REVOKEd from every client role; reachable only through admin_hard_delete_user (gated) and reap_expired_member_deletions (scheduled). SECURITY DEFINER: the full cross-schema erasure chain.';

-- ----------------------------------------------------------------------------
-- 6. admin_hard_delete_user — re-issued as the gate over the primitive
--    (signature, gate, audit row, effects, and return byte-preserved)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_group_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_caller_group_id := public.get_current_personal_group_id();

  return public._pc2_hard_erase_user(target_user_id, v_caller_group_id, 'member.hard_delete');
end;
$function$;

-- ----------------------------------------------------------------------------
-- 7. The grace reaper — the Mist-reaper pattern over the member schedule
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reap_expired_member_deletions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_grace interval;
  v_deusex uuid;
  v_swept integer := 0;
  v_erased integer := 0;
  v_skipped integer := 0;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  SELECT (value)::interval INTO v_grace
  FROM public.pc2_config WHERE key = 'member_deletion_grace_period';
  IF v_grace IS NULL THEN
    v_grace := interval '30 days';  -- safe fallback if the config row is missing
  END IF;

  SELECT id INTO v_deusex
  FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';

  -- Member-origin decommissioned accounts whose grace window has closed.
  -- SKIP LOCKED skips any row a concurrent restore holds FOR UPDATE — a
  -- member clicking restore at the boundary wins or loses atomically, never
  -- half-erased.
  FOR v_user_id IN
    SELECT u.id
    FROM public.users u
    WHERE u.is_decommissioned = true
      AND u.deactivation_origin = 'member'
      AND u.is_temporary = false
      AND u.decommissioned_at IS NOT NULL
      AND u.decommissioned_at < (now() - v_grace)
    FOR UPDATE OF u SKIP LOCKED
  LOOP
    v_swept := v_swept + 1;
    BEGIN
      PERFORM public._pc2_hard_erase_user(v_user_id, v_deusex, 'member.grace_expiry_erase');
      v_erased := v_erased + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;  -- one failure must not abort the whole sweep
    END;
  END LOOP;

  INSERT INTO public.reaper_runs (swept_count, erased_count, skipped_count, outcome)
  VALUES (v_swept, v_erased, v_skipped, 'success')
  RETURNING jsonb_build_object(
    'swept', swept_count, 'erased', erased_count, 'skipped', skipped_count
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.reaper_runs (swept_count, erased_count, skipped_count, outcome, error_detail)
  VALUES (v_swept, v_erased, v_skipped, 'error', SQLERRM);
  RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.reap_expired_member_deletions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_expired_member_deletions() TO service_role;

COMMENT ON FUNCTION public.reap_expired_member_deletions() IS
  'TASK-IDN-01: scheduled SECURITY DEFINER reaper. Hard-erases member-origin decommissioned accounts past pc2_config.member_deletion_grace_period via _pc2_hard_erase_user (actor: DeusEx; action: member.grace_expiry_erase — the full disposition chain incl. DM tombstone). FOR UPDATE SKIP LOCKED makes restore-vs-reap atomic at the boundary; logs a reaper_runs event. Invoked by pg_cron; callable by service_role for ops.';

-- Cadence: hourly (<< 30 days), offset from the 15-minute Mist reaper's
-- schedule points. pg_cron is already enabled (20260626204102:141).
SELECT cron.schedule('member-deletion-reaper', '37 * * * *',
                     'SELECT public.reap_expired_member_deletions();');
