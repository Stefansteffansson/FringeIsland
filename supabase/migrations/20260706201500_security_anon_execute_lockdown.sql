-- Security lockdown (2026-07-06 compliance audit): anon EXECUTE sweep.
--
-- Root cause: Supabase's default privileges (pg_default_acl) grant EXECUTE to
-- `anon` (and PUBLIC) on every function created in `public`, silently defeating
-- the per-function `REVOKE ... FROM PUBLIC` discipline this repo has applied
-- since FEAT-PC002 (the pattern is documented at FEAT-PC014). The database
-- linter flags it as anon_security_definer_function_executable (x77); live
-- ACLs confirmed `anon=X` on `_erase_mist(uuid)` — the UNGATED erasure
-- primitive whose wrapper (`explicit_erase_mist`) authorizes but whose body
-- does not — making /rest/v1/rpc/_erase_mist an unauthenticated
-- arbitrary-account erasure path. Demonstrated red by
-- hub/tests/integration/platform/anon-execute-lockdown.test.ts before this
-- migration; green after.
--
-- Per ADR-U038 L27 PostgREST is directly reachable with the public anon key —
-- the grant layer IS an enforcement surface. Supabase anonymous *users* (the
-- Mist lifecycle, ADR-U031) authenticate with the `authenticated` role
-- (is_anonymous claim), so NO contract legitimately needs the `anon` role.
--
-- Three moves:
--   1. DEFAULT PRIVILEGES — future public functions stop inheriting
--      anon/PUBLIC EXECUTE (fixes the class, not just the instances).
--   2. Sweep — revoke anon + PUBLIC EXECUTE from every existing public
--      function/procedure. `authenticated` grants are untouched.
--   3. Internal primitives — `_erase_mist(uuid)` and `reap_expired_mists()`
--      are called only definer-to-definer (explicit_erase_mist; the pg_cron
--      reaper job runs as postgres) — drop `authenticated` from them too.

-- 1. Future functions: no more inherited EXECUTE for anon / PUBLIC.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- 2. Existing functions: sweep anon + PUBLIC EXECUTE off everything in public.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema,
           p.proname  AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', fn.schema, fn.name, fn.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',   fn.schema, fn.name, fn.args);
  END LOOP;
END $$;

-- 3. Internal primitives are not client contracts: close them to clients
--    entirely. Definer-to-definer callers (explicit_erase_mist, pg_cron as
--    postgres) are unaffected — they execute with the owner's privileges.
REVOKE EXECUTE ON FUNCTION public._erase_mist(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reap_expired_mists() FROM authenticated;
