-- ADR-U038 tranche 2 (F1) — relocate the self-service profile contract into the
-- platform substrate as named RPCs, so a sibling Surface (the Gimbal) inherits the
-- read shape + the write validation/gating without reimplementing it in client code.
--
-- Before: hub/lib/profile/queries.ts held the identity-scope column gating + field
-- validation in TypeScript over a direct .from('users') read/write. Tranche 1's column
-- privileges already constrain WHICH columns a client may touch; this tranche adds the
-- named contract + the value validation (e.g. full_name min length) at the substrate so
-- the whole FEAT-PC003 contract is platform-side and uniform with its Identity siblings
-- (get_own_account_state / get_own_consent_state / get_own_data_export / record_consent_decision).
--
--   get_own_profile()      — SECURITY DEFINER own-read (self-scoped by auth.uid()), returns
--                            ONLY the six identity-scope fields; NEVER email (tranche-1 S2).
--                            Granted to anon too so a sessionless caller reads back empty
--                            (auth.uid() IS NULL → no rows), matching the sibling reads and
--                            the lib's "null when no session" contract.
--   update_own_profile()   — SECURITY INVOKER (runs as the caller, honoring FEAT-PC003's
--                            "never definer for the write" intent): own-row RLS + tranche-1
--                            column privileges still apply as belt-and-suspenders, and this
--                            function is the AUTHORITATIVE validation home. Rejects non-
--                            identity-scope keys and invalid values with ERRCODE 22023.
--                            The display-name cascade fires via the existing
--                            sync_display_name_to_personal_group trigger (unchanged).
--
-- Schema change (new Core RPCs, PC-2 Identity) — schema-review gate + platform/core
-- carve-out: lands at status `review`, pauses for the merge nod. CREATE OR REPLACE,
-- re-runnable. Additive — no table/column change; the Hub lib is repointed to these RPCs.

-- ---- get_own_profile(): own-read, identity-scope only ----
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS TABLE (
  full_name text,
  nickname text,
  display_preference text,
  show_real_name boolean,
  bio text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.full_name, u.nickname, u.display_preference, u.show_real_name, u.bio, u.avatar_url
  FROM public.users u
  WHERE u.auth_user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_own_profile() IS
  'FEAT-PC003 / ADR-U038 F1: own-profile read contract (identity-scope fields only, never '
  'email). Self-scoped by auth.uid(); sessionless callers read back empty. SECURITY DEFINER.';

REVOKE ALL ON FUNCTION public.get_own_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated, anon;

-- ---- update_own_profile(p_patch jsonb): own-write, authoritative validation ----
CREATE OR REPLACE FUNCTION public.update_own_profile(p_patch jsonb)
RETURNS TABLE (
  full_name text,
  nickname text,
  display_preference text,
  show_real_name boolean,
  bio text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_bad text[];
  v_full_name text;
  v_nickname text;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Invalid profile payload.' USING ERRCODE = '22023';
  END IF;
  IF p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'No identity-scope fields to update.' USING ERRCODE = '22023';
  END IF;

  -- Gate: only identity-scope keys are writable through this contract.
  SELECT array_agg(k) INTO v_bad
  FROM jsonb_object_keys(p_patch) AS k
  WHERE k NOT IN ('full_name', 'nickname', 'display_preference', 'show_real_name', 'bio', 'avatar_url');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update non-identity-scope field(s): %', array_to_string(v_bad, ', ')
      USING ERRCODE = '22023';
  END IF;

  -- Field validation (authoritative; the client-side pre-check mirrors this).
  IF p_patch ? 'full_name' THEN
    v_full_name := trim(p_patch ->> 'full_name');
    IF v_full_name IS NULL OR char_length(v_full_name) < 2 THEN
      RAISE EXCEPTION 'Full name must be at least 2 characters.' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_patch ? 'nickname' THEN
    v_nickname := trim(p_patch ->> 'nickname');
    IF v_nickname IS NULL OR char_length(v_nickname) < 1 THEN
      RAISE EXCEPTION 'Nickname cannot be empty.' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_patch ? 'display_preference'
     AND (p_patch ->> 'display_preference') NOT IN ('real_name', 'nickname') THEN
    RAISE EXCEPTION 'Display preference must be real_name or nickname.' USING ERRCODE = '22023';
  END IF;
  IF p_patch ? 'show_real_name'
     AND jsonb_typeof(p_patch -> 'show_real_name') <> 'boolean' THEN
    RAISE EXCEPTION 'show_real_name must be a boolean.' USING ERRCODE = '22023';
  END IF;
  IF p_patch ? 'bio' THEN
    IF jsonb_typeof(p_patch -> 'bio') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'Bio must be text or null.' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_patch -> 'bio') = 'string' AND char_length(p_patch ->> 'bio') > 500 THEN
      RAISE EXCEPTION 'Bio must be at most 500 characters.' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_patch ? 'avatar_url'
     AND jsonb_typeof(p_patch -> 'avatar_url') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Avatar URL must be text or null.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  UPDATE public.users u SET
    full_name          = CASE WHEN p_patch ? 'full_name'          THEN trim(p_patch ->> 'full_name')        ELSE u.full_name END,
    nickname           = CASE WHEN p_patch ? 'nickname'           THEN trim(p_patch ->> 'nickname')         ELSE u.nickname END,
    display_preference = CASE WHEN p_patch ? 'display_preference' THEN p_patch ->> 'display_preference'     ELSE u.display_preference END,
    show_real_name     = CASE WHEN p_patch ? 'show_real_name'     THEN (p_patch ->> 'show_real_name')::boolean ELSE u.show_real_name END,
    bio                = CASE WHEN p_patch ? 'bio'                THEN p_patch ->> 'bio'                    ELSE u.bio END,
    avatar_url         = CASE WHEN p_patch ? 'avatar_url'         THEN p_patch ->> 'avatar_url'             ELSE u.avatar_url END
  WHERE u.auth_user_id = auth.uid()
  RETURNING u.full_name, u.nickname, u.display_preference, u.show_real_name, u.bio, u.avatar_url;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_own_profile(jsonb) IS
  'FEAT-PC003 / ADR-U038 F1: own-profile write contract. Authoritative identity-scope '
  'gating + field validation (22023 on bad key/value). SECURITY INVOKER — own-row RLS + '
  'tranche-1 column privileges also apply; display-name cascade via the existing trigger.';

REVOKE ALL ON FUNCTION public.update_own_profile(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_profile(jsonb) TO authenticated;
