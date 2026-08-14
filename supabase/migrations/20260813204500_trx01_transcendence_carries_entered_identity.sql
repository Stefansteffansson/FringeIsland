-- TASK-TRX-01 — finalise_transcendence carries the entered identity into the
-- profile substrate (post-6-done fix to FEAT-PC002 STORY-3; found 2026-08-13,
-- live walk: a Mist transcending as "Erik Hopper" / erik.hopper@test.com kept
-- full_name/nickname='Mist', email=NULL, and a personal group named 'Mist').
--
-- Schema change — schema-review gate: lands on a NAMED approval. Re-runnable
-- (CREATE OR REPLACE + idempotent backfill). No table/RLS/grant-shape changes —
-- one function body + a one-shot data repair.
--
-- THE FINDING: the entered identity lives only in auth.users after the Hub's
-- client-side anon->permanent conversion (updateUser: email, password,
-- display_name metadata — AuthContext.tsx:184-188). handle_new_user stamps the
-- profile at INSERT only ('Mist' fallback for an anonymous entrant); nothing
-- fires again at transcendence, so the FIM keeps the Mist's name and — the
-- sharp half — a NULL public.users.email: email-addressed invitations and any
-- users.email lookup never match the member. ADR-U038: the carry belongs to
-- the substrate (the same atomic txn as the identity flip), not to BFF plumbing.
--
-- THE FIX, inside the existing single txn (order preserved, guards unchanged):
--   1. Read auth.users.email + raw_user_meta_data->>'display_name' for the
--      caller (SECURITY DEFINER already reads the caller's own auth row via
--      auth.uid(); no new privilege surface — same-subject data only).
--   2. The identity-flip UPDATE also sets
--        full_name = COALESCE(display_name, auth_email, current full_name),
--        nickname  = split_part(new_full_name, ' ', 1)   -- house first-token rule
--        email     = COALESCE(auth_email, email).
--      A still-anonymous caller (both NULL) keeps 'Mist' / NULL email — the
--      substrate-direct path is unchanged for the nameless.
--   3. The proto personal group is renamed to the new nickname — the mirror of
--      handle_new_user step 2 (group name = nickname at creation).
--   4. One-shot idempotent backfill repairs rows already stranded
--      (is_temporary=false AND email IS NULL joined to a credentialed auth
--      user): recomputes the three columns and renames the personal group only
--      where it is still named 'Mist'. Exactly one row matches on the dev DB
--      (the live-walk account) — verified before authoring.
--
-- FAILURE SEMANTICS unchanged: any error aborts the whole txn (no half-FIM).
-- A users.email UNIQUE collision aborts finalisation atomically (cannot
-- normally arise — auth.users uniqueness gates first at conversion).
--
-- SIBLING-ASSERTION SWEEP (tier rule — enumerated, each marked):
--   - mist-transcendence.test.ts: happy-path / rollback / vFAKE-version /
--     already-FIM / reaper-survivor cells all finalise as STILL-ANONYMOUS
--     callers -> COALESCE keeps 'Mist' + NULL email -> green, LEFT.
--     New TRX-01 cells (this change's own coverage): RED before, green after.
--   - transcendence.test.ts (Hub layer): converts with email, no display_name;
--     asserts only is_temporary/personal_group_id continuity -> full_name
--     becomes the email post-fix, asserted nowhere -> green, LEFT.
--   - mist-continuity.test.ts:82, mist-substrate.test.ts:61+70: assert the
--     'Mist' default at ENTRY (handle_new_user, pre-transcendence) — this
--     migration does not touch handle_new_user -> LEFT.
--   - api-boundary-hardening.test.ts nickname cells: createTestUser FIMs, no
--     transcendence involved -> LEFT.
--   - Teardowns/suite-setup/helpers: no name-keyed ('Mist') sweeps (grepped,
--     control-verified) -> unaffected.

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
  v_current_full_name text;
  v_auth_email text;
  v_display_name text;
  v_new_full_name text;
  v_new_nickname text;
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
  SELECT id, personal_group_id, is_temporary, full_name
    INTO v_user_id, v_personal_group_id, v_is_temporary, v_current_full_name
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

  -- [TRX-01] The entered identity lives in auth.users after the Hub's SDK
  -- conversion — carry it into the profile in the SAME atomic txn. Caller's
  -- own auth row only (auth.uid()); a still-anonymous caller resolves NULLs
  -- and the COALESCE chain preserves today's values.
  SELECT a.email, a.raw_user_meta_data->>'display_name'
    INTO v_auth_email, v_display_name
    FROM auth.users a
    WHERE a.id = v_auth_uid;

  v_new_full_name := COALESCE(v_display_name, v_auth_email, v_current_full_name);
  v_new_nickname  := split_part(v_new_full_name, ' ', 1);

  -- 1. Persistence: flip the identity-state flag AND carry the identity
  --    (continuity — same row, same personal_group_id; personal_group_id is
  --    untouched).
  UPDATE public.users
     SET is_temporary = false,
         full_name    = v_new_full_name,
         nickname     = v_new_nickname,
         email        = COALESCE(v_auth_email, email)
   WHERE id = v_user_id;

  -- [TRX-01] Mirror of handle_new_user step 2: personal group name = nickname.
  UPDATE public.groups
     SET name = v_new_nickname
   WHERE id = v_personal_group_id;

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
  --    caller (p_policy_version is ignored; see 20260811090000). policy_version
  --    NOT NULL remains the structural "no persistence without consent"
  --    guarantee: a missing catalog row resolves NULL and aborts the txn.
  SELECT current_policy_version INTO v_policy_version
    FROM public.consent_purposes
    WHERE key = 'transcendence';

  INSERT INTO public.consent_records (subject_user_id, subject_group_id, purpose, policy_version, capture_context)
  VALUES (v_user_id, v_personal_group_id, 'transcendence', v_policy_version, p_capture_context)
  RETURNING id INTO v_consent_id;

  -- 4. Outcome for the caller to emit (V4 event + welcome trigger; Hub-side).
  --    Shape unchanged (no consumer reads the carried name from the outcome).
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
  'FEAT-PC002 STORY-3 (ADR-U031 stage 4 / ADR-U034): atomic Mist->FIM finalisation. One txn: lock profile (race guard), is_temporary=>false, carry the entered identity from auth.users (TRX-01: full_name/nickname/email + personal-group rename; COALESCE preserves the Mist defaults for a still-anonymous caller), enrol FringeIsland Members, write transcendence consent. COR-D W3 (AC4-1): policy_version stamped server-side from consent_purposes.current_policy_version — p_policy_version is IGNORED (kept only for call compatibility); a missing catalog row aborts the txn. Continuity: same personal_group_id. Persistence-and-consent threshold only; the completion gate (ball/Beyond) is a forward seam.';

-- House pairing (platform CLAUDE.md §Rules): explicit revoke incl. anon, then
-- the narrow grant — never rely on default ACLs.
REVOKE ALL ON FUNCTION public.finalise_transcendence(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalise_transcendence(text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- One-shot backfill: repair rows already stranded by the pre-fix function.
-- Idempotent (a repaired row no longer matches: email is set). The personal-
-- group rename is guarded on the proto name 'Mist' so a legitimately renamed
-- group is never clobbered.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT u.id AS user_id,
           u.personal_group_id,
           COALESCE(a.raw_user_meta_data->>'display_name', a.email) AS new_full_name,
           a.email AS auth_email
      FROM public.users u
      JOIN auth.users a ON a.id = u.auth_user_id
     WHERE u.is_temporary = false
       AND u.email IS NULL
       AND a.is_anonymous = false
       AND a.email IS NOT NULL
  LOOP
    UPDATE public.users
       SET full_name = r.new_full_name,
           nickname  = split_part(r.new_full_name, ' ', 1),
           email     = r.auth_email
     WHERE id = r.user_id;

    UPDATE public.groups
       SET name = split_part(r.new_full_name, ' ', 1)
     WHERE id = r.personal_group_id
       AND name = 'Mist';
  END LOOP;
END $$;
