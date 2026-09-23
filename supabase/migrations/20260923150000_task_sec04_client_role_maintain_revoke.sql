-- TASK-SEC-04 — MAINTAIN off the client roles: the last default-ACL residue.
--
-- OWNERSHIP: Platform Core / Infrastructure substrate (a grant on every public
-- table; no owner boundary crossed). Authority: Stefan's ruling of 2026-09-23
-- on TASK-SEC-03's deferred item 1 — "revoke MAINTAIN then, same gate shape".
--
-- WHAT WAS MEASURED (2026-09-23, read-only, BOTH projects identical, PG 17.6):
--   * `anon` holds MAINTAIN on 37 public tables, `authenticated` on 39 — the
--     `m` in the default ACL's `anon=rm, authenticated=rm`; `service_role` and
--     `postgres` hold it on 42/42.
--   * TASK-SEC-02 (20260902210000) revoked INSERT / UPDATE / DELETE / TRUNCATE /
--     REFERENCES / TRIGGER from the client roles. MAINTAIN — new in PG17:
--     VACUUM, ANALYZE, CLUSTER, REINDEX, REFRESH MATERIALIZED VIEW, LOCK TABLE —
--     was not in that list. The `REVOKE SELECT` on `users` / `groups` / the
--     contract-only tables took the `r` and left the `m`, which is why
--     `authenticated` holds it on 39 tables while reading only 37 table-level.
--   * `information_schema.role_table_grants` does not expose MAINTAIN, so no
--     existing cell saw it; the gate cell for it reads `pg_class.relacl`
--     through `aclexplode`.
--
-- NOT A LIVE EXPLOIT. PostgREST exposes none of those verbs, and no SECURITY
-- INVOKER function executable by a client role issues one. Defense in depth:
-- a client role has no business locking or vacuuming a table, and a future
-- invoker-mode helper would inherit the ability. The SEC-03 backfill
-- (20260923120000) states SELECT only, so a project replayed from the chain
-- already lacks the `m` — this migration makes the live projects equal to the
-- chain, closing the one bit SEC-03 recorded as open.
--
-- WHAT IT DOES: revoke MAINTAIN from `anon` and `authenticated` on every public
-- table (a DO loop — the SEC-02 shape), and from the `postgres` default ACL so
-- a table created before 2026-10-30 inherits none. `service_role` keeps ALL
-- (RLS does not apply to it; its grant is its only key; admin tooling may
-- legitimately ANALYZE).
--
-- SIBLING ASSERTIONS: none read MAINTAIN (the information_schema views hide
-- it). Adapted in the same PR: `table-grant-lockdown.test.ts` — a new cell
-- (no client-role MAINTAIN on any public table, via aclexplode) and the `m`
-- letter added to the default-ACL cell; `migration-table-grants.ts` — MAINTAIN
-- joins the words the static gate refuses to a client role. Both RED before
-- this migration (37 + 39 live rows; the default ACL's `rm`); GREEN after.

-- 1. Every public table: MAINTAIN off the client roles.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('REVOKE MAINTAIN ON TABLE public.%I FROM anon, authenticated', t.relname);
  END LOOP;
END $$;

-- 2. Future tables (until Supabase removes the row on 2026-10-30): the default
--    ACL hands the client roles no MAINTAIN either. SELECT stays as it is —
--    SEC-03's rule says the creating migration states it explicitly anyway.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;

-- 3. Self-verification (migration checklist row 2): abort loudly if any
--    client-role MAINTAIN survives, live or in the default ACL.
DO $$
DECLARE
  v_live integer;
  v_defacl text;
BEGIN
  SELECT count(*) INTO v_live
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace,
  LATERAL aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND a.privilege_type = 'MAINTAIN'
    AND pg_get_userbyid(a.grantee) IN ('anon', 'authenticated');
  IF v_live <> 0 THEN
    RAISE EXCEPTION 'TASK-SEC-04: % client-role MAINTAIN grants remain on public tables', v_live;
  END IF;

  SELECT d.defaclacl::text INTO v_defacl
  FROM pg_default_acl d
  JOIN pg_namespace n ON n.oid = d.defaclnamespace
  WHERE n.nspname = 'public' AND d.defaclobjtype = 'r'
    AND pg_get_userbyid(d.defaclrole) = 'postgres';
  -- A missing row (after 2026-10-30) is fine: NULL ~ pattern is not true.
  IF v_defacl ~ '(anon|authenticated)=[^/]*m' THEN
    RAISE EXCEPTION 'TASK-SEC-04: the postgres default ACL still hands MAINTAIN to a client role: %', v_defacl;
  END IF;
END $$;
