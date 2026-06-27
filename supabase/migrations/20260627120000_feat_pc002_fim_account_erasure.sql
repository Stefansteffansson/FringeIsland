-- FEAT-PC002 (IDN-2) — FIM account-erasure: anonymise the consent subject link,
-- retain the consent event. STORY-5 criterion 4 + the cascade-verify DoR of
-- STORY-4 (ADR-U034 §5). Closes FEAT-PC002.
--
-- Schema change — schema-review gate: lands at task status `review`, not `done`.
-- Additive only (one new function + grants). No existing signature changes, no
-- table/column changes, no ADR-U015 version bump. Re-runnable (CREATE OR REPLACE).
--
-- THE DISTINCT PATH (ADR-U034 §5). The reaper's hard-delete cascade applies ONLY
-- pre-transcendence (un-transcended Mists, which hold no consent rows). A
-- post-transcendence FIM's right-to-erasure (GDPR Art. 17) must reconcile against
-- the legal duty to retain proof-of-consent (ADR-U010): the consent_records FKs
-- are ON DELETE RESTRICT, so a consented FIM cannot be hard-deleted out from under
-- its proof. erase_fim_account resolves this by ANONYMISE-then-RETAIN:
--   1. authorize — platform admin (manage_all_groups), mirroring
--      admin_hard_delete_user. GDPR account-erasure is an admin/ops-executed
--      action; the Hub self-service "delete my account" affordance (if ever) is a
--      later product feature that would route through this same privileged path.
--   2. boundary guard (collision-free reaper<->consent, STORY-5 crit-3): reject a
--      Mist (is_temporary = true). Pre-transcendence rows are the reaper's /
--      explicit_erase_mist's; they carry no consent. Account-erasure is FIM-only,
--      so the two erasure paths can never touch the same row.
--   3. anonymise — under the controlled app.consent_erasure_in_progress bypass
--      (the only sanctioned way past enforce_consent_append_only), NULL the consent
--      SUBJECT LINK (subject_user_id / subject_group_id). The consent EVENT
--      (purpose, policy_version, captured_at, capture_context) is RETAINED, intact,
--      as GDPR proof — a withdrawal/erasure leaves history, never deletes it. This
--      also clears the FK RESTRICT so the teardown below can proceed.
--   4. delegate teardown — admin_hard_delete_user already performs the FIM
--      cascade: reassigns content (forum posts, journeys, owned groups, actor FKs)
--      to the [Deleted User] sentinel, then deletes the personal group (CASCADE),
--      the profile, and the auth.users row. Reused as-is (no Core change).
--
-- PRIVILEGE (platform gotcha): SECURITY DEFINER + search_path = '' — it bypasses
-- the consent append-only RLS/trigger and mutates the identity/organisation
-- substrate. It authorizes by has_permission(manage_all_groups) BEFORE any
-- mutation; the nested admin_hard_delete_user re-authorizes the same caller (the
-- JWT-derived actor is unchanged across the SECURITY DEFINER call). REVOKEd from
-- PUBLIC; GRANTed to authenticated (admins hold an authenticated JWT) + service_role.
--
-- CASCADE (ADR-U016) — verified against the shipped substrate this session; the
-- transcendence cascade's Privacy row ("account-erasure becomes retention-bound")
-- is realised here. Mist erasure (reaper/explicit-erase) and Mist->FIM
-- transcendence cascades match their FEAT-PC002 §"Cascade specification" tables.

CREATE OR REPLACE FUNCTION public.erase_fim_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target_personal_group_id uuid;
  v_target_is_temporary boolean;
  v_anonymised_count integer := 0;
  v_teardown jsonb;
BEGIN
  -- 1. Authorize: platform admin only (mirrors admin_hard_delete_user).
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(
       v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
     ) THEN
    RAISE EXCEPTION 'erase_fim_account: unauthorized — manage_all_groups permission required'
      USING ERRCODE = '42501';
  END IF;

  SELECT personal_group_id, is_temporary
    INTO v_target_personal_group_id, v_target_is_temporary
    FROM public.users WHERE id = p_user_id;

  IF v_target_personal_group_id IS NULL THEN
    RAISE EXCEPTION 'erase_fim_account: user not found or has no personal group';
  END IF;

  -- 2. Boundary guard (collision-free reaper<->consent): a Mist is the reaper's,
  --    not account-erasure's, and holds no consent. Refuse it.
  IF v_target_is_temporary THEN
    RAISE EXCEPTION 'erase_fim_account: target is a Mist (pre-transcendence) — use the ephemerality reaper / explicit-erase path, not account erasure'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Anonymise-then-retain: NULL the subject link (clears the FK RESTRICT),
  --    keep the consent event as GDPR proof. The bypass is the only sanctioned
  --    way past enforce_consent_append_only.
  PERFORM set_config('app.consent_erasure_in_progress', 'true', true);
  UPDATE public.consent_records
    SET subject_user_id = NULL, subject_group_id = NULL
    WHERE subject_user_id = p_user_id
       OR subject_group_id = v_target_personal_group_id;
  GET DIAGNOSTICS v_anonymised_count = ROW_COUNT;

  -- 4. Delegate FIM teardown (sentinel reassignment + cascade). Same JWT actor,
  --    so its manage_all_groups re-check passes.
  v_teardown := public.admin_hard_delete_user(p_user_id);

  RETURN jsonb_build_object(
    'erased_user_id', p_user_id,
    'consent_records_anonymised', v_anonymised_count,
    'consent_retained', true,
    'teardown', v_teardown
  );
END;
$$;

COMMENT ON FUNCTION public.erase_fim_account(uuid) IS
  'FEAT-PC002 STORY-5 crit-4 (ADR-U034 §5): FIM account-erasure (distinct from the pre-transcendence reaper). Admin-gated (manage_all_groups); refuses Mists (collision-free boundary); anonymises the consent subject link (subject_user_id/subject_group_id => NULL) under app.consent_erasure_in_progress while RETAINING the consent event as GDPR proof (FK RESTRICT forces anonymise-first); delegates teardown to admin_hard_delete_user (sentinel reassignment + cascade).';

REVOKE ALL ON FUNCTION public.erase_fim_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erase_fim_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erase_fim_account(uuid) TO service_role;
