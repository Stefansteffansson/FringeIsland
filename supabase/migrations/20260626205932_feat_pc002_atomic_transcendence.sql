-- FEAT-PC002 (IDN-2) — atomic persistence-and-consent transcendence, STORY-3
-- (ADR-U031 stage 4) + the transcendence-event half of STORY-4 + the atomic-write
-- half of STORY-5 (ADR-U034). The single moment a Mist's data binds durably.
--
-- Schema change — schema-review gate: lands at task status `review`, not `done`.
-- Additive (one new function + grant). Re-runnable (CREATE OR REPLACE).
--
-- public.finalise_transcendence(p_policy_version text, p_capture_context jsonb) is
-- invoked AFTER the Supabase anonymous->permanent conversion (which preserves the
-- same auth.users.id, so every FK-linked row carries over with CONTINUITY —
-- nothing restarts, no cross-account copy). In ONE transaction it:
--   1. locks the caller's profile row (FOR UPDATE) — the race guard: a concurrent
--      reaper's FOR UPDATE SKIP LOCKED skips a row this finalisation holds
--      (ADR-U031 "no erase mid-migration");
--   2. flips public.users.is_temporary => false (finalise-in-place — same row,
--      same personal_group_id);
--   3. enrols the personal group in "FringeIsland Members" (the FIM baseline a Mist
--      is denied — mirrors handle_new_user step 7, gated off for a Mist in PC001);
--   4. writes the transcendence consent record (ADR-U034) — atomically. The
--      consent_records.policy_version NOT NULL constraint is the structural
--      "no persistence without consent" guarantee: a missing policy aborts the
--      whole txn, rolling back the flip + enrolment (no half-FIM state).
--   5. returns the outcome (actor + ids) for the caller to emit as the V4
--      transcendence event + the Notifications welcome/onboarding trigger
--      (Hub-side, FEAT-H004 — same telemetry seam as mist.entered).
--
-- PRIVILEGE (platform gotcha): SECURITY DEFINER + search_path = '' — it mutates the
-- identity/organisation substrate the caller cannot touch directly; authorizes by
-- auth.uid() + is_temporary BEFORE mutating. GRANTed to `authenticated` (the
-- converting user holds an authenticated JWT).
--
-- SCOPE: the persistence-and-consent threshold ONLY. The metamorphosis-at-
-- completion gate (ball / Beyond unlock, gated on "all founding questions
-- answered") is forward-looking — the assessment is unbuilt — so it is NOT wired
-- here (named as a seam, ADR-U031). Continuity across the auth-layer conversion is
-- a Supabase SDK property exercised at the Hub (FEAT-H004 E2E); this function
-- preserves personal_group_id (never recreates it).

CREATE OR REPLACE FUNCTION public.finalise_transcendence(
  p_policy_version text,
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

  -- 3. Consent captured atomically (ADR-U034). policy_version NOT NULL is the
  --    structural "no persistence without consent" guarantee — a null aborts the txn.
  INSERT INTO public.consent_records (subject_user_id, subject_group_id, purpose, policy_version, capture_context)
  VALUES (v_user_id, v_personal_group_id, 'transcendence', p_policy_version, p_capture_context)
  RETURNING id INTO v_consent_id;

  -- 4. Outcome for the caller to emit (V4 event + welcome trigger; Hub-side).
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'personal_group_id', v_personal_group_id,
    'consent_id', v_consent_id,
    'transcended', true
  );
END;
$$;

COMMENT ON FUNCTION public.finalise_transcendence(text, jsonb) IS
  'FEAT-PC002 STORY-3 (ADR-U031 stage 4 / ADR-U034): atomic Mist->FIM finalisation. One txn: lock profile (race guard), is_temporary=>false, enrol FringeIsland Members, write transcendence consent (policy_version NOT NULL = no persistence without consent). Continuity: same personal_group_id. Persistence-and-consent threshold only; the completion gate (ball/Beyond) is a forward seam.';

REVOKE ALL ON FUNCTION public.finalise_transcendence(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalise_transcendence(text, jsonb) TO authenticated;
