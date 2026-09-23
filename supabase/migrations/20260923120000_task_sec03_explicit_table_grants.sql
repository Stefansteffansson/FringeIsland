-- TASK-SEC-03 — every public table's client-role grants, stated explicitly,
-- before Supabase stops granting them by default.
--
-- OWNERSHIP: Platform Core / Infrastructure substrate (grants on every public
-- table, no owner boundary crossed — a grant is not data). Authority: the
-- Supabase notice of 2026-09 ("On October 30, Supabase will stop automatically
-- granting Data API access to new tables in the public schema"), TASK-SEC-03.
--
-- WHAT WAS MEASURED (2026-09-23, read-only, BOTH projects — identical: the
-- md5 over 366 role_table_grants rows is 8ce5c98e89de293de2310a135263b792 on
-- FringeIsland-test and on FringeIslandDB):
--   * 42 public tables; only 2 ever received a table grant from a migration
--     (`pending_email_invitations`, `role_template_publications`).
--   * The other 40 got theirs from Supabase's default ACL for the migration
--     role — `pg_default_acl` for `postgres`/tables reads
--     `anon=rm, authenticated=rm, service_role=arwdDxtm` — at CREATE time.
--   * Effective today: `service_role` holds the full set on 42/42;
--     `authenticated` holds table-level SELECT on 37 (+ column-scoped SELECT
--     on `users` and `groups`, granted explicitly by 20260702120000 and
--     20260903120000); `anon` holds table-level SELECT on 35.
--
-- WHAT CHANGES ON 2026-10-30: that default ACL row is removed. A table created
-- after it, with no GRANT of its own, is unreachable through PostgREST for
-- EVERY role — the Hub's reads, the BFF's service_role client, the test
-- helpers and the walk scripts all get 42501. Existing tables keep their
-- grants; nothing breaks on the day. The exposure is the chain itself: a
-- replay (`scripts/replay-migrations.js`, a preview branch, a local reset)
-- onto a fresh project would come up with ~40 dead tables, because their
-- grants were never IN the migrations.
--
-- WHAT THIS MIGRATION DOES: states the current effective table-level grants
-- explicitly, per table, exactly as they are — no widening, no narrowing.
-- On both live projects every statement below is a no-op (GRANT is
-- idempotent); its purpose is the chain. From this version on, the rule is
-- that every migration grants the tables it creates in the same file
-- (`hub/tests/unit/platform/migration-table-grants.test.ts` reads the files;
-- `hub/tests/integration/platform/table-grant-lockdown.test.ts` reads the
-- live catalog for presence as well as absence).
--
-- WHAT THIS MIGRATION DOES NOT DO, ON PURPOSE:
--   * No `ALTER DEFAULT PRIVILEGES … GRANT`. Re-creating the convenience
--     Supabase is removing would put the dependency back under the rug.
--   * Not Supabase's own template (`grant select, insert, update, delete …
--     to authenticated`). That reopens the TASK-SEC-02 lock (20260902210000):
--     the client roles hold NO table-level DML; every write goes through a
--     SECURITY DEFINER contract (ADR-U038). The house block for a new table:
--         grant select on public.X to anon, authenticated;   -- drop anon when no anon policy reads it
--         grant all on public.X to service_role;
--   * No change to the three contract-only tables (`journal_entries`,
--     `journey_steps`, `journey_step_instances` — `REVOKE ALL` in their own
--     migrations) or to the column-scoped SELECT on `users` / `groups`: those
--     grants are already explicit where they were decided.
--   * MAINTAIN (the `m` in `rm`) is not re-stated. The default ACL also handed
--     the client roles PG17's MAINTAIN on every table; a replayed project will
--     not have it, the live projects still do. Recorded in the task file as an
--     open decision (revoke it live, or leave it), not decided here.
--   * Sequences: out of scope, as TASK-SEC-02 recorded them. The Supabase
--     notice names tables only.
--
-- SIBLING ASSERTIONS: none change. Every cell that reads grants today reads
-- the same grants after this migration (a no-op on live). The two new
-- presence cells in `table-grant-lockdown.test.ts` are green before and after
-- on the live projects; they exist for the table that arrives without its
-- grants after 2026-10-30.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. service_role: the full set on every public table (42/42 today).
--    The BFF's admin client, `runAdminSql`'s siblings, the E2E fixtures, the
--    reaper and the walk scripts read and write through it. RLS does not
--    apply to it; the grant is its only lock and its only key.
-- ─────────────────────────────────────────────────────────────────────────────
grant all on public.admin_audit_log to service_role;
grant all on public.announcements to service_role;
grant all on public.consent_purposes to service_role;
grant all on public.consent_records to service_role;
grant all on public.content_families to service_role;
grant all on public.content_reports to service_role;
grant all on public.conversation_kinds to service_role;
grant all on public.conversation_participants to service_role;
grant all on public.conversations to service_role;
grant all on public.ds5_config to service_role;
grant all on public.forum_posts to service_role;
grant all on public.group_memberships to service_role;
grant all on public.group_role_permissions to service_role;
grant all on public.group_roles to service_role;
grant all on public.group_template_roles to service_role;
grant all on public.group_templates to service_role;
grant all on public.groups to service_role;
grant all on public.journal_entries to service_role;
grant all on public.journey_enrollments to service_role;
grant all on public.journey_step_instances to service_role;
grant all on public.journey_steps to service_role;
grant all on public.journeys to service_role;
grant all on public.messages to service_role;
grant all on public.notification_action_types to service_role;
grant all on public.notification_categories to service_role;
grant all on public.notification_channels to service_role;
grant all on public.notification_kinds to service_role;
grant all on public.notification_preferences to service_role;
grant all on public.notifications to service_role;
grant all on public.pc2_config to service_role;
grant all on public.pending_email_invitations to service_role;
grant all on public.permissions to service_role;
grant all on public.reaper_runs to service_role;
grant all on public.role_template_permissions to service_role;
grant all on public.role_template_publications to service_role;
grant all on public.role_template_version_permissions to service_role;
grant all on public.role_template_versions to service_role;
grant all on public.role_templates to service_role;
grant all on public.step_kinds to service_role;
grant all on public.telemetry_events to service_role;
grant all on public.user_group_roles to service_role;
grant all on public.users to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The client roles: SELECT only, RLS-governed — exactly the tables that
--    hold it today (35 for both roles, 2 for authenticated alone). No DML:
--    TASK-SEC-02 holds.
-- ─────────────────────────────────────────────────────────────────────────────
grant select on public.admin_audit_log to anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant select on public.consent_purposes to anon, authenticated;
grant select on public.consent_records to anon, authenticated;
grant select on public.content_reports to anon, authenticated;
grant select on public.conversation_kinds to anon, authenticated;
grant select on public.conversation_participants to anon, authenticated;
grant select on public.conversations to anon, authenticated;
grant select on public.ds5_config to anon, authenticated;
grant select on public.forum_posts to anon, authenticated;
grant select on public.group_memberships to anon, authenticated;
grant select on public.group_role_permissions to anon, authenticated;
grant select on public.group_roles to anon, authenticated;
grant select on public.group_template_roles to anon, authenticated;
grant select on public.group_templates to anon, authenticated;
grant select on public.journey_enrollments to anon, authenticated;
grant select on public.journeys to anon, authenticated;
grant select on public.messages to anon, authenticated;
grant select on public.notification_action_types to anon, authenticated;
grant select on public.notification_categories to anon, authenticated;
grant select on public.notification_channels to anon, authenticated;
grant select on public.notification_kinds to anon, authenticated;
grant select on public.notification_preferences to anon, authenticated;
grant select on public.notifications to anon, authenticated;
grant select on public.pc2_config to anon, authenticated;
grant select on public.pending_email_invitations to anon, authenticated;
grant select on public.permissions to anon, authenticated;
grant select on public.reaper_runs to anon, authenticated;
grant select on public.role_template_permissions to anon, authenticated;
grant select on public.role_template_publications to anon, authenticated;
grant select on public.role_template_version_permissions to anon, authenticated;
grant select on public.role_template_versions to anon, authenticated;
grant select on public.role_templates to anon, authenticated;
grant select on public.telemetry_events to anon, authenticated;
grant select on public.user_group_roles to anon, authenticated;

-- authenticated only — anon's SELECT was revoked where these were narrowed.
grant select on public.content_families to authenticated;
grant select on public.step_kinds to authenticated;

-- Contract-only (no client-role read; ADR-U038) — stated so the file says
-- what the chain says, and so the static gate's marker vocabulary is used
-- once where a reader will see it:
-- no-client-read: journal_entries — FEAT-PD001, `REVOKE ALL … FROM anon, authenticated` (20260703084810)
-- no-client-read: journey_steps — FEAT-PD003 (20260707190000)
-- no-client-read: journey_step_instances — FEAT-PD003 (20260707190000)
-- `users` and `groups` read column-scoped (20260702120000, 20260903120000); unchanged here.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Self-verification (migration checklist row 2, applied to grants): abort
--    loudly if the state after this file is not the state this file claims.
--    On a fresh replay after 2026-10-30 this is the cell that proves the
--    chain no longer needs the default ACL.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tables integer;
  v_service_full integer;
  v_client_dml integer;
  v_contract_only_reads integer;
  v_auth_readable integer;
BEGIN
  SELECT count(*) INTO v_tables FROM pg_tables WHERE schemaname = 'public';

  -- every public table: the full seven for service_role
  SELECT count(*) INTO v_service_full
  FROM (
    SELECT table_name
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'service_role'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
    GROUP BY table_name
    HAVING count(DISTINCT privilege_type) = 7
  ) s;
  IF v_service_full <> v_tables THEN
    RAISE EXCEPTION 'TASK-SEC-03: service_role fully granted on % of % public tables', v_service_full, v_tables;
  END IF;

  -- the TASK-SEC-02 lock still holds: no table-level DML for the client roles
  SELECT count(*) INTO v_client_dml
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
    AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
  IF v_client_dml <> 0 THEN
    RAISE EXCEPTION 'TASK-SEC-03: % client-role table-level DML grants present — TASK-SEC-02 lock reopened', v_client_dml;
  END IF;

  -- the three contract-only tables stay unreadable by the client roles
  SELECT count(*) INTO v_contract_only_reads
  FROM information_schema.role_column_grants
  WHERE table_schema = 'public' AND grantee IN ('anon','authenticated') AND privilege_type = 'SELECT'
    AND table_name IN ('journal_entries','journey_steps','journey_step_instances');
  IF v_contract_only_reads <> 0 THEN
    RAISE EXCEPTION 'TASK-SEC-03: a contract-only table became client-readable (% column grants)', v_contract_only_reads;
  END IF;

  -- every other public table is readable by authenticated at some column set
  SELECT count(DISTINCT table_name) INTO v_auth_readable
  FROM information_schema.role_column_grants
  WHERE table_schema = 'public' AND grantee = 'authenticated' AND privilege_type = 'SELECT';
  IF v_auth_readable <> v_tables - 3 THEN
    RAISE EXCEPTION 'TASK-SEC-03: authenticated can read % tables, expected % (all but the three contract-only)', v_auth_readable, v_tables - 3;
  END IF;
END $$;
