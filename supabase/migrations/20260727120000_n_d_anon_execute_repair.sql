-- ============================================================================
-- A-NTF gate repair — close the anon EXECUTE surface N-D left open.
--
-- Found by the W12 per-RPC gate-verification roll-up (A-NTF area gate,
-- 2026-07-27). PURE REVOKE: no function body, signature, table, policy or
-- behaviour changes. Nothing a member or operator can do changes.
--
-- WHAT WENT WRONG
-- The 2026-07-06 anon-execute lockdown removed `anon` from the DEFAULT
-- PRIVILEGES for functions in `public`. It did not — and could not — remove
-- Postgres's *built-in* default, which grants `EXECUTE TO PUBLIC` on every new
-- function; `anon` inherits PUBLIC. So each migration must revoke PUBLIC
-- explicitly. A-NTF cycles N-A, N-B and N-C all wrote `REVOKE ... FROM PUBLIC,
-- anon`. **N-D wrote `FROM anon` alone on all seven of its contracts**, and
-- `REVOKE ... FROM anon` is a no-op against a privilege held via PUBLIC.
--
-- BLAST RADIUS, MEASURED AT THE GATE
-- Of 181 functions in `public`, exactly these 7 were anon-executable — the
-- lockdown holds everywhere else. Every one still refused anon *in its body*
-- (42501 for the admin-gated operator contracts, 28000 for the member
-- preference contracts; all seven probed live). So nothing was exploitable.
-- The defect is that the grant layer — which ADR-U038 L27 names as an
-- enforcement surface in its own right, because PostgREST is directly reachable
-- with the public anon key — was wider than every one of those bodies intended.
--
-- SIBLING ASSERTIONS THIS MIGRATION AFFECTS (platform-tier rule)
--   hub/tests/integration/platform/anon-execute-lockdown.test.ts — three cases
--   ADAPTED-TO-RED and shipped with this migration; they go green on apply:
--     · "no function in schema public is executable by anon" (the new invariant)
--     · "the notification trigger functions are closed to authenticated too"
--     · "a member preference contract refuses anon at the GRANT layer, not
--        merely in the body" — 28000 (body) becomes 42501 (grant)
--   No other suite asserts these grants. The seven contracts' own behavioural
--   tests (preference-and-dispatcher-contracts.test.ts) call them as an
--   authenticated FIM or as service_role and are unaffected — `authenticated`
--   keeps its explicit grant throughout; only PUBLIC is withdrawn.
--
-- APPLY (dev DB):
--   node scripts/apply-migration-temp.js 20260727120000_n_d_anon_execute_repair.sql
--   bash supabase-cli.sh migration repair --status applied 20260727120000
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The seven N-D contracts — withdraw PUBLIC (and anon, belt-and-braces).
--    `authenticated` retains the explicit GRANT issued by N-D; these members
--    and operators are unaffected.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_own_notification_preferences()                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_own_notification_preference(TEXT, TEXT, BOOLEAN)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_own_notification_preferences_export()                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_notification_nudge_policy()                            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_notification_nudge_policy(TEXT, TEXT)                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_notification_category_nudge(TEXT, BOOLEAN)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_announcement_reach()                          FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 2. notify_invitation_received() — a trigger function that has never carried a
--    GRANT or REVOKE line in any migration, back to its creation in February.
--    It retains `authenticated` EXECUTE from the default privileges. A direct
--    call is inert (Postgres raises 0A000, "trigger functions can only be
--    called as triggers" — probed live), so this is consistency, not exposure:
--    its two A-NTF siblings, notify_notification_hint() and
--    ds5_apply_notification_preference(), are both explicitly closed.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.notify_invitation_received() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. THE PREVENTION — stop the next migration inheriting the same trap.
--    Without this, every future function created by `postgres` in `public`
--    starts anon-reachable until its migration remembers to revoke PUBLIC, and
--    the omission is invisible unless someone re-runs the roll-up. Safe by
--    measurement: after §1 no function in `public` relies on the PUBLIC grant
--    (the other 174 were already explicitly granted to `authenticated`).
--    Scope note: this binds objects created by `postgres`. Supabase's own
--    `supabase_admin` default ACL still grants anon on functions IT creates —
--    that is Supabase's extension surface, not ours, and is deliberately left.
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- 4. Verification — fail the migration rather than report a false green.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_leaked TEXT;
  v_trig   TEXT;
BEGIN
  SELECT string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
    INTO v_leaked
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_leaked IS NOT NULL THEN
    RAISE EXCEPTION 'anon EXECUTE still open on: %', v_leaked;
  END IF;

  SELECT string_agg(p.proname, ', ')
    INTO v_trig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prorettype = 'trigger'::regtype
     AND p.proname IN ('notify_invitation_received','notify_notification_hint',
                       'ds5_apply_notification_preference')
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');

  IF v_trig IS NOT NULL THEN
    RAISE EXCEPTION 'trigger function still executable by authenticated: %', v_trig;
  END IF;

  -- The sweep must not over-revoke: the member and operator doors stay open.
  IF NOT has_function_privilege('authenticated', 'public.get_own_notification_preferences()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_notification_nudge_policy()', 'EXECUTE') THEN
    RAISE EXCEPTION 'over-revoked: authenticated lost a contract it must keep';
  END IF;

  RAISE NOTICE 'anon EXECUTE repair verified: 0 anon-executable functions in public';
END $$;
