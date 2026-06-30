-- ============================================================
-- FEAT-PC007 — consent decision write (grant / withdraw)  [IDN-7 consent half]
-- ============================================================
-- The platform half of IDN-7's consent half: an own-subject, append-only,
-- withdrawability-gated write that lets a FIM grant an optional purpose or
-- withdraw a withdrawable one. Consumed API-first by the Hub (FEAT-H009) at
-- POST /api/account/consent. Builds directly on the FEAT-PC006 substrate (the
-- `decision` column + the `consent_purposes` catalog).
--
-- Schema change — rides the FEAT-PC006 schema-review nod (Cycle B, the consent
-- schema family). No new table, column, RLS, or trigger: this adds ONE
-- SECURITY DEFINER write function. The append-only guarantee
-- (enforce_consent_append_only) and consent_records_select_own RLS are inherited
-- unchanged. Re-runnable.
--
-- WHY SECURITY DEFINER (privilege-escalation surface — documented per
-- docs/platform/CLAUDE.md "SECURITY DEFINER discipline"):
--   public.consent_records has NO client INSERT policy by design (ADR-U034:
--   writes flow only through controlled SECURITY DEFINER paths — transcendence
--   finalisation, erasure). A member-facing grant/withdraw therefore needs its
--   own definer path. The elevation is bounded to EXACTLY: appending ONE
--   own-subject consent row, under the withdrawability gate, stamping
--   policy_version server-side from the catalog. It resolves the subject via
--   auth.uid() (no target parameter — can never write another member's consent),
--   never mutates/deletes a row (a withdrawal is a NEW appended row, ADR-U034
--   §2), and never opens a client INSERT policy (which would bypass the gate +
--   the server-side policy_version stamp).
--
-- ERROR CONTRACT (the route maps SQLSTATE -> HTTP):
--   28000 invalid_authorization_specification -> 403  (no active subject)
--   22023 invalid_parameter_value             -> 422  (unknown purpose)
--   42501 insufficient_privilege              -> 409  (refused withdrawal of a
--                                                        non-withdrawable purpose)
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_consent_decision(
  p_purpose text,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_id  uuid;
  v_user_id   uuid;
  v_purpose   public.consent_purposes%ROWTYPE;
  v_current   text;
  v_entry     jsonb;
BEGIN
  -- 1. Resolve the caller to their OWN personal-group subject + users.id, the
  --    same actor chain as consent_records_select_own. is_active = true matches
  --    get_current_personal_group_id(); a switched-off caller resolves nothing.
  SELECT u.personal_group_id, u.id
    INTO v_group_id, v_user_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'record_consent_decision: no active subject for caller'
      USING ERRCODE = '28000';
  END IF;

  -- 2. The purpose must be catalogued (the ledger stays meaningful).
  SELECT * INTO v_purpose
  FROM public.consent_purposes
  WHERE key = p_purpose;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'record_consent_decision: unknown consent purpose %', p_purpose
      USING ERRCODE = '22023';
  END IF;

  -- 3. Withdrawability gate (policy-as-data, not a sealed type): any non-'granted'
  --    decision on a non-withdrawable purpose is refused. 'granted' is always
  --    permitted for a catalogued purpose.
  IF p_decision IS DISTINCT FROM 'granted' AND v_purpose.withdrawable = false THEN
    RAISE EXCEPTION 'record_consent_decision: purpose % is not withdrawable', p_purpose
      USING ERRCODE = '42501';
  END IF;

  -- 4. Effective-state idempotency: if the caller's current latest decision for
  --    the purpose already equals the requested one, this is a no-op (a double-
  --    submit must not spam the append-only GDPR history). Falls through to the
  --    shared effective-entry projection below.
  SELECT cr.decision
    INTO v_current
  FROM public.consent_records cr
  WHERE cr.subject_group_id = v_group_id
    AND cr.purpose = p_purpose
  ORDER BY cr.captured_at DESC
  LIMIT 1;

  IF v_current IS DISTINCT FROM p_decision THEN
    -- 5. Append one row. policy_version is stamped SERVER-SIDE from the catalog
    --    (never client-supplied — a client could lie about which policy it
    --    consented under). capture_context is descriptive metadata.
    INSERT INTO public.consent_records
      (subject_user_id, subject_group_id, purpose, decision, policy_version, capture_context)
    VALUES
      (v_user_id, v_group_id, p_purpose, p_decision, v_purpose.current_policy_version,
       jsonb_build_object('surface', 'self_service', 'path', '/api/account/consent'));
  END IF;

  -- 6. Return the updated effective entry for the purpose (recomputed from the
  --    ledger, so the grant/append and the idempotent no-op share one path and
  --    the caller need not immediately re-read). Same shape as one element of
  --    get_own_consent_state().effective.
  SELECT jsonb_build_object(
    'purpose', cp.key,
    'label', cp.label,
    'description', cp.description,
    'decision', l.decision,
    'policy_version', l.policy_version,
    'decided_at', l.captured_at,
    'withdrawable', cp.withdrawable,
    'current_policy_version', cp.current_policy_version,
    'needs_reconsent',
      COALESCE(l.decision = 'granted'
               AND l.policy_version IS DISTINCT FROM cp.current_policy_version,
               false)
  )
    INTO v_entry
  FROM public.consent_purposes cp
  LEFT JOIN LATERAL (
    SELECT cr.decision, cr.policy_version, cr.captured_at
    FROM public.consent_records cr
    WHERE cr.subject_group_id = v_group_id
      AND cr.purpose = cp.key
    ORDER BY cr.captured_at DESC
    LIMIT 1
  ) l ON true
  WHERE cp.key = p_purpose;

  RETURN v_entry;
END;
$$;

COMMENT ON FUNCTION public.record_consent_decision(text, text) IS
  'FEAT-PC007 / IDN-7: SECURITY DEFINER own-subject consent grant/withdraw. '
  'Appends one consent_records row (never mutates) for the caller''s own subject '
  '(auth.uid()-resolved, no target param), gated so a non-''granted'' decision on '
  'a withdrawable=false purpose is refused (42501); unknown purpose 22023; no '
  'active subject 28000. policy_version stamped server-side from the catalog. '
  'Effective-state idempotent (equal-to-current = no-op). Returns the updated '
  'effective entry for the purpose.';

-- authenticated only (a write requires a real/anon session); service_role for
-- server/admin. NOT anon (no-JWT) — the route gates sessionless with 401 first.
REVOKE ALL ON FUNCTION public.record_consent_decision(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_consent_decision(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_consent_decision(text, text) TO service_role;
