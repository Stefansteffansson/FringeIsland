-- FEAT-PC009: Session inventory & targeted revocation (IDN-11 platform half, Cycle E)
-- ADR-U039 first tenant: the server-originated revocation hint on a private channel.
--
-- Two own-subject SECURITY DEFINER contracts over auth.sessions. No new table.
-- Mechanics precedent: admin_force_logout (20260222000000, deletes from
-- auth.sessions / auth.refresh_tokens). refresh_tokens.session_id is
-- ON DELETE CASCADE, so deleting one session row kills that device's refresh chain.
--
-- SECURITY DEFINER justification (privilege-escalation surfaces, documented per
-- platform CLAUDE.md):
--   * get_own_sessions  — reads the caller's OWN rows in auth.sessions (the auth
--     schema is not PostgREST-exposed; there is no client path around this function).
--   * revoke_own_session — deletes the caller's OWN row in auth.sessions, writes the
--     caller's own audit row, and emits the ADR-U039 hint via realtime.send()
--     (INSERT into realtime.messages requires elevation; clients have no send policy).
-- Both resolve the caller via auth.uid() DIRECTLY (not get_current_personal_group_id(),
-- which is is_active-gated) so a SUSPENDED member keeps session control — the same
-- deliberate choice as get_own_data_export() (FEAT-PC008). FIM-only: an anonymous
-- Mist (users.is_temporary = true) gets 42501 — Mist sessions are unlinkable across
-- devices by design; there is no coherent cross-device inventory for a Mist.

-- ── get_own_sessions() ───────────────────────────────────────────────────────
-- The caller's active sessions, newest-last-active first. last_active is
-- auth.sessions.updated_at (refreshed_at is unreliably populated — feasibility-gate
-- finding, 2026-07-03). is_current correlates the JWT session_id claim with the
-- row PK (documented Supabase contract).

CREATE OR REPLACE FUNCTION public.get_own_sessions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid UUID;
  v_is_temporary BOOLEAN;
  v_current_session_id UUID;
  v_result JSONB;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated caller' USING ERRCODE = '42501';
  END IF;

  SELECT u.is_temporary INTO v_is_temporary
  FROM public.users u WHERE u.auth_user_id = v_auth_uid;
  IF v_is_temporary IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'Unauthorized: FIM-only contract' USING ERRCODE = '42501';
  END IF;

  v_current_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'created_at', s.created_at,
        'last_active', s.updated_at,
        'user_agent', s.user_agent,
        'ip', host(s.ip),
        'is_current', (s.id = v_current_session_id)
      )
      ORDER BY s.updated_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM auth.sessions s
  WHERE s.user_id = v_auth_uid;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_own_sessions() IS
  'FEAT-PC009: caller''s own active sessions (per-device inventory), newest-last-active first. auth.uid()-direct (survives suspension); FIM-only (42501 for a Mist).';

-- ── revoke_own_session(p_session_id) ─────────────────────────────────────────
-- Deletes ONE of the caller's own sessions. Foreign-or-nonexistent -> P0002 (no
-- existence leak). Writes the durable session_revoked audit row (FEAT-PC008
-- inline-INSERT precedent), then emits the ADR-U039 hint. The hint is an
-- accelerant, never the contract (spec open Q2): its emission is exception-guarded
-- so a Realtime failure can never roll back the revocation.

CREATE OR REPLACE FUNCTION public.revoke_own_session(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid UUID;
  v_is_temporary BOOLEAN;
  v_caller_group_id UUID;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated caller' USING ERRCODE = '42501';
  END IF;

  SELECT u.is_temporary, u.personal_group_id INTO v_is_temporary, v_caller_group_id
  FROM public.users u WHERE u.auth_user_id = v_auth_uid;
  IF v_is_temporary IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'Unauthorized: FIM-only contract' USING ERRCODE = '42501';
  END IF;

  -- Own-row delete; refresh tokens die by FK cascade (refresh_tokens.session_id).
  DELETE FROM auth.sessions s
  WHERE s.id = p_session_id AND s.user_id = v_auth_uid;
  IF NOT FOUND THEN
    -- Same error for "not yours" and "doesn't exist" — no existence leak.
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0002';
  END IF;

  -- Durable accountability trail (STORY-5; substrate default per spec open Q1).
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'session_revoked',
    'auth.sessions',
    jsonb_build_object('session_id', p_session_id)
  );

  -- ADR-U039 hint: server-originated, content-free (event + id), private topic.
  -- Exception-guarded: a hint failure must never fail the revocation — the
  -- Surface's fallback validation covers a missed hint (doctrine rules 5/6).
  BEGIN
    PERFORM realtime.send(
      jsonb_build_object('session_id', p_session_id),
      'session_revoked',
      'account:' || v_auth_uid::text || ':sessions',
      TRUE
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', TRUE, 'session_id', p_session_id);
END;
$$;

COMMENT ON FUNCTION public.revoke_own_session(UUID) IS
  'FEAT-PC009: revoke ONE of the caller''s own sessions (targeted remote sign-out). P0002 on foreign/nonexistent (no existence leak); emits the ADR-U039 session_revoked hint (exception-guarded); writes the durable audit row.';

-- ── Grants: the contracts are the only client path to auth.sessions ─────────
REVOKE ALL ON FUNCTION public.get_own_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_own_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_own_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_own_session(UUID) TO service_role;

-- ── Realtime authorization (ADR-U039 rules 2–3) ──────────────────────────────
-- Private-channel RECEIVE on the member's own session topic only. NO client send
-- policy exists: signals originate in the substrate (revoke_own_session's definer
-- elevation performs the INSERT via realtime.send()); a peer client cannot spoof
-- a hint onto any session topic. RLS is already enabled on realtime.messages.

DROP POLICY IF EXISTS "session_signal_receive_own" ON realtime.messages;
CREATE POLICY "session_signal_receive_own"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() = 'account:' || (SELECT auth.uid()::text) || ':sessions'
);
