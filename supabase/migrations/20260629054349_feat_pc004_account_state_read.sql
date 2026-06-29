-- ============================================================
-- FEAT-PC004 — account-state read (TASK-PC004-01)  [IDN-9]
-- ============================================================
-- The member-facing read of their OWN account lifecycle state
-- (active / suspended / decommissioned), consumed API-first by the Hub
-- (FEAT-H006) at GET /api/account/state. Net-new: no member-facing contract
-- returns this state today, and the existing visibility filter actively hides
-- it from the member themselves.
--
-- WHY SECURITY DEFINER (privilege-escalation surface — documented per
-- docs/platform/CLAUDE.md "SECURITY DEFINER discipline"):
--   The RLS policy `users_select_active` is `USING (is_active = true)`, so a
--   member whose account is switched OFF (suspended or decommissioned) cannot
--   SELECT their own row — it is invisible to everyone, including themselves
--   (and `get_current_user_profile_id()` filters `is_active = true`, returning
--   NULL for them). This function runs as the definer to read the caller's OWN
--   row past that filter. Its elevation is bounded to exactly: the caller's own
--   two lifecycle booleans + a derived label, resolved via auth.uid(). It takes
--   NO target parameter and can never read another member's row
--   (`auth_user_id = auth.uid()` pins it to the caller). It does NOT relax
--   `users_select_active` — every other surface still cannot see a switched-off
--   member's row. Read-only: no table mutation, no new columns.
--
-- STATE VOCABULARY (2026-06-29 decision — see the account-lifecycle decision
-- record under docs/planning/hub-v2/): the off-but-not-closed state is reported
-- as 'suspended'. Today the only producer of that state is an admin hold
-- (`admin_update_user_status(target, false)`); there is no self-pause yet, so
-- the member-initiated 'paused' variant and its self-reactivation (IDN-12) are
-- deferred until a deactivation-origin field + self-pause exist. The `state`
-- label is an OPEN string (extensibility, ADR-U018 spirit) — consumers switch on
-- it and render an unknown/future state (e.g. a later 'paused') as a safe
-- default, so adding a label is never a breaking change.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_own_account_state()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'is_active', u.is_active,
    'is_decommissioned', u.is_decommissioned,
    'state', CASE
      WHEN u.is_decommissioned THEN 'decommissioned'
      WHEN NOT u.is_active THEN 'suspended'
      ELSE 'active'
    END
  )
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_own_account_state() IS
  'FEAT-PC004 / IDN-9: SECURITY DEFINER own-row read of the caller''s account '
  'lifecycle state (active/suspended/decommissioned), bypassing the '
  'users_select_active visibility filter for the caller''s OWN row only. No '
  'target parameter; never reads another member''s row. Returns NULL when the '
  'caller resolves to no mapped public.users row (clean empty case, no error).';

-- authenticated: real + anonymous (Mist) sessions. service_role: server/admin.
-- NOT granted to anon (no-JWT) — the contract gates sessionless callers with a
-- 401 at the route before the function is ever reached. Mirrors the grant
-- posture of get_current_user_profile_id().
GRANT EXECUTE ON FUNCTION public.get_own_account_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_account_state() TO service_role;
