-- FEAT-PC019 (Cycle ADM-A, board AB-2) — durable auth-event audit binding:
-- record_auth_event(), the SECURITY DEFINER audit-write primitive for the four
-- member-auth moments (sign-up, sign-in, transcendence, farewell). The AC-6 /
-- AC3-O6 discharge; fills the Q6-latent abstraction the governance spec's
-- "Audit access policies" row prescribes ("INSERT permitted only via SECURITY
-- DEFINER audit-write primitive").
--
-- Schema change — schema-review gate: lands at task status `review`, not
-- `done`. STRICTLY ADDITIVE: one function + ACL. No table change, no policy
-- change, no existing-writer change (audit patterns (a)/(b)/(c) untouched;
-- append-only invariant untouched — no UPDATE/DELETE policies exist and none
-- are added).
--
-- Sibling-assertion grep (the three-strikes rule): record_auth_event swept
-- across hub/tests, hub/lib, hub/app 2026-07-31 — zero pre-existing
-- references; the only referencing file is this feature's own red-first suite
-- (tests/integration/auth/auth-event-audit-contracts.test.ts). Existing
-- admin_audit_log assertions (B-ADMIN-007 shape, export/data-export suites)
-- are unaffected: no behaviour they pin changes. Nothing adapted, nothing
-- deliberately left.
--
-- Direct-caller question (ADR-U038): an authenticated PostgREST caller can
-- write only a SELF-targeted, self-attributed row with a caller-chosen action
-- string and content-free metadata — it cannot write rows about others
-- (actor is platform-resolved), cannot read the log (SELECT stays
-- admin-gated), and cannot mutate it (no UPDATE/DELETE policies). Noise is
-- possible, forgery of actor/target is not.

CREATE OR REPLACE FUNCTION public.record_auth_event(
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := public.get_current_personal_group_id();
  IF v_actor IS NULL THEN
    -- No resolvable actor (pre-session caller): typed refusal. The BFF treats
    -- this as non-fatal and keeps its console + telemetry mirror (FEAT-H034
    -- STORY-3); whether pre-session/failed-auth moments deserve durable
    -- security logging is an ADM-D question, recorded not smuggled in.
    RAISE EXCEPTION 'no authenticated actor for auth-event audit'
      USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_actor, p_action, 'self', COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

COMMENT ON FUNCTION public.record_auth_event(text, jsonb) IS
  'FEAT-PC019 (ADM-A, AC-6/AC3-O6 discharge): the SECURITY DEFINER audit-write primitive for member-auth moments (auth.sign_up / auth.sign_in / mist.transcend / mist.explicit_erase — the namespace is open TEXT, no enum). Actor platform-resolved, target always ''self'', metadata content-free by discipline. SECURITY DEFINER because admin_audit_log INSERT is admin-gated by policy; this is the prescribed non-admin door. Erasure interplay: actor_group_id ON DELETE SET NULL leaves the row actor-less and PII-free after the subject''s erasure.';

REVOKE ALL ON FUNCTION public.record_auth_event(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_auth_event(text, jsonb) TO authenticated;
