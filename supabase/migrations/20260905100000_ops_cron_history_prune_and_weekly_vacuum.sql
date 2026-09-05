-- Operations retention, the second half (Stefan, 2026-09-05: "yes" to the
-- batch — "we do want to fix whatever we need to fix in order not to end up
-- there again"; the named approval for this gate). Companion to 20260904100000
-- (reaper_runs retention). No table, no function, no policy — two pg_cron jobs.
--
-- WHY: the 2026-09-04/05 database review found pg_cron's own run history
-- (`cron.job_run_details`) at 7,284 rows since 2026-06-26 — pg_cron keeps every
-- run forever unless a job prunes it (Supabase documents the cleanup job as the
-- operator's to add) — and the public tables carrying the suites' churn on the
-- one database bloated to megabytes with nothing in them (`notifications` 16 MB
-- with zero rows; 444,950 inserts / 423,030 deletes lifetime): autovacuum ran
-- hundreds of times and did its job, but Postgres never returns file space
-- without a full vacuum.
--
-- WHAT:
--   * `cron-history-prune` — nightly 03:55: delete run-history rows older than
--     7 days (Supabase's recommended shape).
--   * `weekly-vacuum-full` — Sundays 04:00: `VACUUM FULL` (pg_cron runs each
--     command in its own autocommit session, so VACUUM is legal there). A
--     STOPGAP while the production database also carries the test tier: it takes
--     exclusive locks for well under a second at this size (20 MB after the
--     2026-09-05 manual pass). Tables the `postgres` role cannot vacuum are
--     skipped with a warning, never an error. Revisit when suites move off
--     production.
--   Both declared in supabase/ownership.manifest.json `retention` (same commit)
--   and enforced by hub/tests/integration/platform/retention-conformance.test.ts.
--
-- SIBLING ASSERTIONS: none name these jobs; the three job-pinning suites
-- (mist-reaper, telemetry-and-statistics-contracts, self-deletion-grace-period,
-- reaper-runs-retention) pin their own jobs by name — LEFT. NEW:
-- retention-conformance.test.ts, RED at HEAD (no manifest retention section; no
-- cron-history job; no maintenance job).
--
-- APPLY:
--   node scripts/apply-migration-temp.js 20260905100000_ops_cron_history_prune_and_weekly_vacuum.sql
--   bash supabase-cli.sh migration repair --status applied 20260905100000

create extension if not exists pg_cron;

select cron.schedule(
  'cron-history-prune',
  '55 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);

select cron.schedule(
  'weekly-vacuum-full',
  '0 4 * * 0',
  'VACUUM FULL'
);

do $$
declare v_n integer;
begin
  select count(*) into v_n from cron.job where jobname in ('cron-history-prune', 'weekly-vacuum-full') and active;
  if v_n <> 2 then
    raise exception 'ops retention: expected both jobs scheduled and active, found %', v_n;
  end if;
end $$;
