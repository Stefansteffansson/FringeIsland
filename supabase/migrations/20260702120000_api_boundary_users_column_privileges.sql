-- ADR-U038 tranche 1 (S1 + S2) — column-level privilege hardening on public.users.
--
-- The API-boundary audit (docs/planning/hub-v2/api-conformance-register.md) proved a
-- Surface BFF cannot be the enforcement layer: rules the Hub gates in TypeScript were
-- reachable un-gated via direct PostgREST with the public anon key. Two confirmed holes:
--
--   S1 — users_update_own is ROW-scoped only (auth_user_id = auth.uid()); it does NOT
--        restrict WHICH columns. A Mist (anonymous sessions hold the `authenticated`
--        role) could UPDATE public.users SET is_temporary = false on its own row,
--        self-promoting to a persistent FIM with NO consent record and NO FringeIsland-
--        Members enrolment — bypassing the guarded finalise_transcendence() RPC. The
--        same hole allowed self-writes to email / is_active / auth_user_id / etc.
--   S2 — users_select_active (USING is_active = true, all columns) let ANY authenticated
--        session (incl. any anonymous Mist) read `email` for EVERY active user.
--
-- Fix: RLS is row-aware but not column-aware; column-level GRANTs are the right tool.
--   * UPDATE is narrowed to the FEAT-PC003 identity-scope set (the only columns the
--     self-service profile contract writes). Identity-state / ownership columns
--     (is_temporary, is_active, is_decommissioned, email, auth_user_id, personal_group_id,
--     created_at/updated_at) are no longer client-writable at all.
--   * SELECT is narrowed to every column EXCEPT email. Own email still reaches the client
--     via the auth session (auth.users), never via public.users.
--
-- Not affected: all privileged mutations go through SECURITY DEFINER RPCs
-- (finalise_transcendence, explicit_erase_mist, admin_update_user_status,
-- admin_decommission_user, admin_exit_user_from_platform, admin_hard_delete_user,
-- erase_fim_account) which run as the table owner and bypass these column grants.
-- service_role (setup/teardown, exports' definer context) keeps full table privileges.
--
-- Schema/RLS change — schema-review gate: lands at task status `review`, not `done`.
-- Idempotent (REVOKE/GRANT are declarative and re-runnable).

-- ---- S1: UPDATE limited to the identity-scope column set ----
REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;

GRANT UPDATE (full_name, nickname, display_preference, show_real_name, bio, avatar_url)
  ON public.users TO authenticated;

-- ---- S2: SELECT limited to non-sensitive columns (email revoked from client roles) ----
REVOKE SELECT ON public.users FROM authenticated;
REVOKE SELECT ON public.users FROM anon;

GRANT SELECT (
  id, auth_user_id, full_name, avatar_url, bio,
  is_active, is_decommissioned, personal_group_id,
  created_at, updated_at, nickname, display_preference, show_real_name, is_temporary
) ON public.users TO authenticated;

COMMENT ON COLUMN public.users.email IS
  'FIM email. Client roles have NO column privilege on this column (ADR-U038 S2): '
  'own email reaches the client via the auth session; cross-user email requires a '
  'SECURITY DEFINER contract. Do not GRANT SELECT(email) to authenticated/anon.';
