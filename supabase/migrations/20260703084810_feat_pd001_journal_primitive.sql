-- FEAT-PD001 / IDN-5 — the personal Journal primitive (DS-7 Intelligence).
-- The first Domain-tier substrate: a private, own-subject entry store with
-- ALL access flowing through SECURITY DEFINER RPCs (ADR-U038: platform
-- contracts platform-side; table grants revoked from client roles so a direct
-- PostgREST caller — including an anonymous-session Mist holding the
-- `authenticated` role — gets 42501 on every verb).
--
-- Ownership: `owner_group_id` → public.groups(id) ON DELETE CASCADE (the
-- P-O1 actor primitive). Account-erasure teardown (`erase_fim_account` →
-- `admin_hard_delete_user`) hard-deletes the personal group; the FK rides
-- that delete. journal_entries is deliberately ABSENT from the teardown's
-- sentinel-reassignment UPDATE list — private entries are hard-deleted,
-- never reassigned to [Deleted User] (FEAT-PD001 No-go).
--
-- Privacy posture: no admin/DeusEx read path to content exists (no policy, no
-- RPC). Reads resolve the caller's own row without an is_active filter (a
-- suspended member keeps read/export access — the PC008 right-of-access
-- precedent); writes require an active account. Writes are FIM-only
-- (`is_temporary` refusal, 42501) keeping ADR-U031 Mist ephemerality out of
-- v1. No content-bearing logging: error messages never echo `body`.
--
-- Privilege-escalation surface: every function below is SECURITY DEFINER with
-- SET search_path = ''. The elevation is bounded to the caller's OWN rows —
-- resolution starts from auth.uid() in every function; no target parameters.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title text CHECK (title IS NULL OR char_length(title) <= 300),
  body text NOT NULL CHECK (btrim(body) <> '' AND char_length(body) <= 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.journal_entries IS
  'FEAT-PD001 (IDN-5): private personal Journal entries, owned by the member''s personal group. No client-role table grants — access only via the journal RPCs. Hard-delete on erasure (FK CASCADE), never sentinel-reassigned.';

CREATE INDEX journal_entries_owner_created_idx
  ON public.journal_entries (owner_group_id, created_at DESC);

-- RLS: enabled with own-rows policies as defense-in-depth. Client roles hold
-- NO table privileges (revoked below), so these policies only matter if a
-- grant ever reappears — belt and braces per the platform-tier RLS rule.
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY journal_entries_select_own ON public.journal_entries
  FOR SELECT TO authenticated
  USING (owner_group_id = public.get_current_personal_group_id());

CREATE POLICY journal_entries_insert_own ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (owner_group_id = public.get_current_personal_group_id());

CREATE POLICY journal_entries_update_own ON public.journal_entries
  FOR UPDATE TO authenticated
  USING (owner_group_id = public.get_current_personal_group_id())
  WITH CHECK (owner_group_id = public.get_current_personal_group_id());

CREATE POLICY journal_entries_delete_own ON public.journal_entries
  FOR DELETE TO authenticated
  USING (owner_group_id = public.get_current_personal_group_id());

-- No direct PostgREST table surface: revoke the Supabase default grants from
-- client roles (service_role keeps its access for admin/test tooling).
REVOKE ALL ON TABLE public.journal_entries FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Write contracts (FIM-only, active account)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_journal_entry(p_title text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group uuid;
  v_is_temporary boolean;
  v_row public.journal_entries%ROWTYPE;
BEGIN
  SELECT u.personal_group_id, u.is_temporary
    INTO v_group, v_is_temporary
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid())
    AND u.is_active = true;

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'journal access requires an active account'
      USING ERRCODE = '42501';
  END IF;
  IF v_is_temporary THEN
    RAISE EXCEPTION 'the journal is FIM-only'
      USING ERRCODE = '42501';
  END IF;
  IF p_body IS NULL OR btrim(p_body) = '' THEN
    RAISE EXCEPTION 'a journal entry needs a body'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.journal_entries (owner_group_id, title, body)
  VALUES (v_group, p_title, p_body)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'body', v_row.body,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

COMMENT ON FUNCTION public.create_journal_entry(text, text) IS
  'FEAT-PD001 STORY-1: create an own journal entry. FIM-only (42501 for Mists), active account required, body mandatory (22023). SECURITY DEFINER bounded to the caller''s own personal group.';

CREATE OR REPLACE FUNCTION public.update_journal_entry(p_entry_id uuid, p_title text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group uuid;
  v_row public.journal_entries%ROWTYPE;
BEGIN
  SELECT u.personal_group_id INTO v_group
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid())
    AND u.is_active = true;

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'journal access requires an active account'
      USING ERRCODE = '42501';
  END IF;
  IF p_body IS NULL OR btrim(p_body) = '' THEN
    RAISE EXCEPTION 'a journal entry needs a body'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.journal_entries
     SET title = p_title,
         body = p_body,
         updated_at = now()
   WHERE id = p_entry_id
     AND owner_group_id = v_group
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    -- Same refusal for foreign and nonexistent ids: no existence leak.
    RAISE EXCEPTION 'journal entry not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'body', v_row.body,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

COMMENT ON FUNCTION public.update_journal_entry(uuid, text, text) IS
  'FEAT-PD001 STORY-3: update an own journal entry. Own rows only; foreign/nonexistent id => P0002 (no existence leak).';

CREATE OR REPLACE FUNCTION public.delete_journal_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group uuid;
BEGIN
  SELECT u.personal_group_id INTO v_group
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid())
    AND u.is_active = true;

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'journal access requires an active account'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.journal_entries
   WHERE id = p_entry_id
     AND owner_group_id = v_group;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal entry not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_journal_entry(uuid) IS
  'FEAT-PD001 STORY-3: delete an own journal entry. Own rows only; foreign/nonexistent id => P0002 (no existence leak).';

-- ---------------------------------------------------------------------------
-- Read contracts (own rows; no is_active gate — reads survive suspension)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_own_journal_entries(
  p_limit integer DEFAULT 50,
  p_before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group uuid;
  v_entries jsonb;
BEGIN
  SELECT u.personal_group_id INTO v_group
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid());

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'journal access requires an account'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', e.id,
           'title', e.title,
           'body', e.body,
           'created_at', e.created_at,
           'updated_at', e.updated_at
         ) ORDER BY e.created_at DESC), '[]'::jsonb)
    INTO v_entries
  FROM (
    SELECT id, title, body, created_at, updated_at
    FROM public.journal_entries
    WHERE owner_group_id = v_group
      AND (p_before IS NULL OR created_at < p_before)
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  ) e;

  RETURN v_entries;
END;
$$;

COMMENT ON FUNCTION public.get_own_journal_entries(integer, timestamptz) IS
  'FEAT-PD001 STORY-2/3: the caller''s own entries, newest-first, keyset-paginated (created_at < p_before), limit clamped to [1,200]. Own rows only by construction.';

CREATE OR REPLACE FUNCTION public.get_own_journal_export()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group uuid;
  v_entries jsonb;
BEGIN
  -- auth.uid() -> users directly, NO is_active filter: a SUSPENDED member
  -- keeps their right of access (Art. 15/20 — the PC008 precedent).
  SELECT u.personal_group_id INTO v_group
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid());

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'journal export requires an account'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', e.id,
           'title', e.title,
           'body', e.body,
           'created_at', e.created_at,
           'updated_at', e.updated_at
         ) ORDER BY e.created_at DESC), '[]'::jsonb)
    INTO v_entries
  FROM public.journal_entries e
  WHERE e.owner_group_id = v_group;

  RETURN jsonb_build_object(
    'schema_version', 1,
    'exported_at', now(),
    'entries', v_entries
  );
END;
$$;

COMMENT ON FUNCTION public.get_own_journal_export() IS
  'FEAT-PD001 STORY-5: versioned own-subject journal export — all and only the caller''s entries; `entries` is present-and-empty, never absent. Composed with get_own_data_export() at the surface (one-way Core->Domain boundary: PC-4 never reads this). The durable export-event is written by the PC008 call in the same composed download.';

-- ---------------------------------------------------------------------------
-- Function grants: authenticated only (the Mist gate is in-function — an
-- anonymous-session Mist holds `authenticated`, so role grants can't carry it)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.create_journal_entry(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_journal_entry(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_journal_entry(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_own_journal_entries(integer, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_own_journal_export() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_journal_entry(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_journal_entry(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_journal_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_journal_entries(integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_journal_export() TO authenticated;
