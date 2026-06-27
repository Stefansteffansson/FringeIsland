-- FEAT-PC002 (IDN-2) — Mist explicit-erase ("say goodbye"), STORY-2, plus the
-- shared erasure-cascade PRIMITIVE the scheduled reaper (STORY-1) will reuse.
-- Departure slice of the §9 Mist lifecycle (ADR-U031 stage 3 / ADR-U033).
--
-- Schema change — schema-review gate: this lands at task status `review`, not
-- `done`. Additive only (two new functions + grants); no existing signature
-- changes, no table/column changes, no ADR-U015 version bump.
--
-- Adds:
--   1. public._erase_mist(uuid) — SECURITY DEFINER erasure-cascade primitive.
--      Runs the full Mist GDPR-erasure cascade with no orphaned child rows.
--      INTERNAL: REVOKEd from PUBLIC; only definer-context callers invoke it
--      (explicit_erase_mist now; the pg_cron sweep in STORY-1). It does NOT
--      authorize the caller — the wrapper does.
--   2. public.explicit_erase_mist() — the owner-invoked RPC. Derives the caller
--      from auth.uid(), enforces the temporary-only rule (a FIM may NOT self-erase
--      via the ephemerality path -> ERRCODE 42501 insufficient_privilege), then
--      delegates to _erase_mist. GRANTed to `authenticated` (a Mist holds an
--      authenticated JWT with is_anonymous = true).
--
-- PRIVILEGE-ESCALATION NOTE (platform gotcha): both functions are SECURITY DEFINER
-- and run as the owner, bypassing RLS by design — they must mutate auth.users +
-- the proto group, which the calling Mist cannot touch directly. Bodies are kept
-- narrow; SET search_path = '' guards against search-path injection.
-- explicit_erase_mist authorizes (auth.uid() + is_temporary) BEFORE delegating;
-- _erase_mist is REVOKEd from PUBLIC so no client can erase an arbitrary user by id.
--
-- CASCADE ORDER (ADR-U016; mirrors admin_hard_delete_user's proven technique):
--   * journeys.created_by_group_id -> groups ON DELETE RESTRICT — delete journeys
--     before the proto group.
--   * users.auth_user_id -> auth.users ON DELETE CASCADE — delete auth.users
--     BEFORE the proto group, so the profile is already gone and the
--     users.personal_group_id -> groups ON DELETE SET NULL never fires the
--     enforce_personal_group_id_immutability BEFORE-UPDATE guard on a live row.
--   * the now-orphaned proto group -> ON DELETE CASCADE clears its memberships,
--     roles, and role-permissions.
--   The hard-delete bypass session vars are set defensively to match the
--   established idiom (leader/DeusEx delete-guards + the immutability guard).
--
-- OUT OF SCOPE (later FEAT-PC002 tasks): the pg_cron scheduled sweep + inactivity
-- TTL config (STORY-1), the consent substrate (STORY-5), atomic transcendence
-- (STORY-3), FIM account-erasure anonymise-vs-retain (STORY-5 crit-4).
-- OBSERVABILITY: the explicit-erase V4 event is emitted Hub-side over the existing
-- telemetry seam (no DB event sink exists today); the reaper-run event lands with
-- STORY-1, flipping the `reaperRealised` signal true.

-- 1. Erasure-cascade primitive (internal; reused by the future reaper sweep).
CREATE OR REPLACE FUNCTION public._erase_mist(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id uuid;
  v_personal_group_id uuid;
BEGIN
  SELECT auth_user_id, personal_group_id
    INTO v_auth_user_id, v_personal_group_id
    FROM public.users
    WHERE id = p_user_id;

  IF v_auth_user_id IS NULL THEN
    RETURN;  -- already gone / nothing to erase (idempotent)
  END IF;

  -- Bypass the hard-delete guard triggers for this transaction only.
  PERFORM set_config('app.bypass_personal_group_id_immutability', 'true', true);
  PERFORM set_config('app.hard_delete_in_progress', 'true', true);

  -- journeys first (created_by_group_id -> groups ON DELETE RESTRICT).
  IF v_personal_group_id IS NOT NULL THEN
    DELETE FROM public.journeys WHERE created_by_group_id = v_personal_group_id;
  END IF;

  -- auth.users -> CASCADE removes the public.users profile (before the group, so
  -- the personal_group_id SET-NULL immutability guard never fires on a live row).
  DELETE FROM auth.users WHERE id = v_auth_user_id;

  -- the now-orphaned proto group -> CASCADE clears memberships/roles/role-perms.
  IF v_personal_group_id IS NOT NULL THEN
    DELETE FROM public.groups WHERE id = v_personal_group_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public._erase_mist(uuid) IS
  'FEAT-PC002 (ADR-U033): SECURITY DEFINER Mist erasure-cascade primitive. Internal — REVOKEd from PUBLIC; invoked only by explicit_erase_mist and the pg_cron reaper sweep. Does NOT authorize the caller.';

-- Internal primitive: no client may call it directly (it would erase an arbitrary
-- user by id). Definer-context callers (the wrappers, owned by the same role) are
-- unaffected by the revoke.
REVOKE ALL ON FUNCTION public._erase_mist(uuid) FROM PUBLIC;

-- 2. Owner-invoked explicit-erase RPC ("say goodbye"). Temporary-only.
CREATE OR REPLACE FUNCTION public.explicit_erase_mist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_user_id uuid;
  v_is_temporary boolean;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'explicit_erase_mist: no authenticated caller'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;

  SELECT id, is_temporary
    INTO v_user_id, v_is_temporary
    FROM public.users
    WHERE auth_user_id = v_auth_uid;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'explicit_erase_mist: caller has no profile'
      USING ERRCODE = '42501';
  END IF;

  -- Temporary-only: a FIM may not self-erase via the Mist ephemerality path.
  IF NOT v_is_temporary THEN
    RAISE EXCEPTION 'explicit_erase_mist: caller is not a Mist (temporary-only path)'
      USING ERRCODE = '42501';
  END IF;

  PERFORM public._erase_mist(v_user_id);
END;
$$;

COMMENT ON FUNCTION public.explicit_erase_mist() IS
  'FEAT-PC002 STORY-2 (ADR-U033): owner-invoked Mist explicit-erase ("say goodbye"). Erases the calling Mist (auth.uid()) immediately; rejects non-temporary callers with ERRCODE 42501. SECURITY DEFINER — authorizes by auth.uid() + is_temporary before delegating to _erase_mist.';

-- A Mist holds an authenticated (anonymous) JWT — expose the RPC to it.
GRANT EXECUTE ON FUNCTION public.explicit_erase_mist() TO authenticated;
