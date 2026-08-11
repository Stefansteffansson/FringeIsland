-- COR-D W3 (Audit IV AC4-1) — finalise_transcendence stamps policy_version
-- SERVER-SIDE from the governance catalog; the caller's parameter is ignored.
--
-- Schema change — schema-review gate: lands on a NAMED approval. Re-runnable
-- (CREATE OR REPLACE). No table/RLS/grant changes — one function body.
--
-- THE FINDING (AC4-1, Major; Critical at first policy bump): the live shape
-- (20260626205932:106-108) inserts p_policy_version VERBATIM into
-- public.consent_records, with EXECUTE granted to `authenticated`. The Hub
-- passes a hardcoded 'v1' (hub/lib/auth/transcendence-policy.ts) — but any
-- authenticated Mist calling the RPC directly over PostgREST could stamp an
-- arbitrary version. policy_version is the sole input to the re-consent drift
-- predicate (get_own_consent_state: `l.policy_version IS DISTINCT FROM
-- cp.current_policy_version`), so a forged stamp self-suppresses (or forces) a
-- future re-consent prompt. Every OTHER consent writer already stamps
-- server-side from public.consent_purposes.current_policy_version
-- (handle_new_user 20260702120100:135 — the ADR-U038 S3 relocation — plus
-- record_consent_decision, PD005, HYG-A). This migration closes the last door:
-- same S3 pattern, one door further in.
--
-- DELIBERATE DIVERGENCE from handle_new_user: NO COALESCE fallback. The
-- original function's header names consent_records.policy_version NOT NULL as
-- the structural "no persistence without consent" guarantee. A missing
-- 'transcendence' catalog row therefore resolves NULL and ABORTS the whole
-- transaction (flip + enrolment roll back) — the guarantee holds structurally
-- instead of being papered over with a literal. The seed (20260629211504:94)
-- guarantees the row exists in every reachable state.
--
-- SIGNATURE: p_policy_version is KEPT (identity unchanged — no B8 signature
-- change) but gains DEFAULT NULL and is IGNORED. Callers may stop passing it;
-- the Hub does so in this same cycle (the lib wrapper drops the parameter).
-- The outcome jsonb gains 'policy_version' so callers log the stamped truth
-- instead of asserting their own.
--
-- SIBLING-ASSERTION SWEEP (the RDC-03 tier rule — enumerated here, then run):
--   - mist-transcendence.test.ts happy path passes 'v1' and asserts stamped
--     'v1' — catalog seeds 'v1', stays green (param now ignored).
--   - mist-transcendence.test.ts STORY-5 atomicity cell forced rollback via
--     p_policy_version:null (23502). That lever is REMOVED by design — the
--     cell is rewritten (both suites) to rename the catalog row away for the
--     call, so THIS function's server-side resolve returns NULL and the
--     consent NOT NULL aborts the txn: same 23502, same structural guarantee,
--     now server-owned. RED before this migration (the old function ignores
--     the catalog and succeeds), green after. Data-only lever — a first
--     attempt used an injected trigger, and mid-suite DDL reproducibly reset
--     the shared pooler's data plane (cached-plan invalidation).
--   - transcendence.test.ts (Hub layer) asserted stamped == Hub constant —
--     rewritten to assert stamped == catalog current_policy_version.
--   - NEW red-first cell: a direct call passing 'vFAKE-ac4-1' must stamp the
--     catalog version. RED before this migration (stamps the fake), green
--     after.
--   - already-FIM guard cells (42501 before any consent logic): unaffected.

CREATE OR REPLACE FUNCTION public.finalise_transcendence(
  p_policy_version text DEFAULT NULL,
  p_capture_context jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_user_id uuid;
  v_personal_group_id uuid;
  v_is_temporary boolean;
  v_fi_members_group_id uuid;
  v_fi_member_role_id uuid;
  v_consent_id uuid;
  v_policy_version text;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'finalise_transcendence: no authenticated caller'
      USING ERRCODE = '42501';
  END IF;

  -- Lock the caller's profile for the txn (race guard vs. the reaper sweep).
  SELECT id, personal_group_id, is_temporary
    INTO v_user_id, v_personal_group_id, v_is_temporary
    FROM public.users
    WHERE auth_user_id = v_auth_uid
    FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'finalise_transcendence: caller has no profile'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_temporary THEN
    RAISE EXCEPTION 'finalise_transcendence: caller is already a FIM (already transcended)'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Persistence: flip the identity-state flag (continuity — same row, same
  --    personal_group_id; personal_group_id is untouched).
  UPDATE public.users SET is_temporary = false WHERE id = v_user_id;

  -- 2. Enrol the personal group in "FringeIsland Members" (mirrors handle_new_user).
  SELECT id INTO v_fi_members_group_id
    FROM public.groups
    WHERE name = 'FringeIsland Members' AND group_type = 'system';

  IF v_fi_members_group_id IS NOT NULL THEN
    INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
    VALUES (v_fi_members_group_id, v_personal_group_id, v_personal_group_id, 'active')
    ON CONFLICT (group_id, member_group_id) DO NOTHING;

    SELECT id INTO v_fi_member_role_id
      FROM public.group_roles
      WHERE group_id = v_fi_members_group_id AND name = 'Member';

    IF v_fi_member_role_id IS NOT NULL THEN
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      VALUES (v_personal_group_id, v_fi_members_group_id, v_fi_member_role_id, v_personal_group_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 3. Consent captured atomically (ADR-U034). [COR-D W3 / AC4-1] The version
  --    is resolved HERE from the governance catalog — never taken from the
  --    caller (p_policy_version is ignored; see header). policy_version
  --    NOT NULL remains the structural "no persistence without consent"
  --    guarantee: a missing catalog row resolves NULL and aborts the txn.
  SELECT current_policy_version INTO v_policy_version
    FROM public.consent_purposes
    WHERE key = 'transcendence';

  INSERT INTO public.consent_records (subject_user_id, subject_group_id, purpose, policy_version, capture_context)
  VALUES (v_user_id, v_personal_group_id, 'transcendence', v_policy_version, p_capture_context)
  RETURNING id INTO v_consent_id;

  -- 4. Outcome for the caller to emit (V4 event + welcome trigger; Hub-side).
  --    policy_version included so callers log the stamped truth (COR-D W3).
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'personal_group_id', v_personal_group_id,
    'consent_id', v_consent_id,
    'policy_version', v_policy_version,
    'transcended', true
  );
END;
$$;

COMMENT ON FUNCTION public.finalise_transcendence(text, jsonb) IS
  'FEAT-PC002 STORY-3 (ADR-U031 stage 4 / ADR-U034): atomic Mist->FIM finalisation. One txn: lock profile (race guard), is_temporary=>false, enrol FringeIsland Members, write transcendence consent. COR-D W3 (Audit IV AC4-1): policy_version is stamped server-side from consent_purposes.current_policy_version — p_policy_version is IGNORED (kept only for call compatibility); a missing catalog row aborts the txn (policy_version NOT NULL = no persistence without consent, now structurally server-owned). Continuity: same personal_group_id. Persistence-and-consent threshold only; the completion gate (ball/Beyond) is a forward seam.';

REVOKE ALL ON FUNCTION public.finalise_transcendence(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalise_transcendence(text, jsonb) TO authenticated;
