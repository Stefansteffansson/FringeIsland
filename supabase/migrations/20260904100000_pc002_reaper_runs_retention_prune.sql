-- FEAT-PC002 amendment — reaper_runs RETENTION. Found 2026-09-04 during the
-- database review: `public.reaper_runs` (the Mist reaper's run log — one row per
-- 15-minute `mist-reaper` cron run since 2026-06-26, 7,400 rows, all success)
-- had no retention rule, while `telemetry_events` has a nightly prune
-- (`prune_telemetry_events`, 20260731180000). Stefan, 2026-09-04: "Fix this
-- please" — the named approval for this gate.
--
-- OWNERSHIP: PC-2 (Identity) — `reaper_runs` is PC-2's in
-- supabase/ownership.manifest.json; the new function is registered there under
-- PC-2 in the same commit (the function-classification gate).
--
-- WHAT CHANGES (additive, re-runnable):
--   * `prune_reaper_runs()` — SECURITY DEFINER, search_path '', deletes runs
--     older than 30 DAYS and returns the count (the prune_telemetry_events
--     shape). EXECUTE for service_role only — an operations job, never a member
--     door (revoked from public, anon AND authenticated).
--   * `reaper_runs_ran_at_idx` — the prune's predicate and the admin surfaces'
--     natural order; the table had only its primary key.
--   * cron job `reaper-runs-prune` at 03:45 daily (after telemetry-prune at
--     03:30). `cron.schedule` upserts by name — the reaper idiom.
--   * ONE prune at apply, self-verified: no run older than 30 days remains.
--
-- RETENTION CHOICE: 30 days keeps ~3,000 rows (about a hundred runs a day) —
-- enough for the admin surfaces FEAT-PC002 reserved ("admin surfaces consume
-- later") to show a month of reaper health, and bounded forever.
--
-- SIBLING ASSERTIONS (grep -rlE "reaper_runs|cron\.job|prune_" hub/tests):
--   * integration/auth/mist-reaper.test.ts — pins the mist-reaper job by its
--     command and reads the run log the reaper writes; the prune touches only
--     rows older than 30 days. LEFT.
--   * integration/observability/telemetry-and-statistics-contracts.test.ts —
--     pins the telemetry-prune job; untouched. LEFT.
--   * integration/account/self-deletion-grace-period.test.ts — the
--     member-deletion-reaper job; untouched. LEFT.
--   * NEW: integration/auth/reaper-runs-retention.test.ts — RED at HEAD
--     (PGRST202 on the function for both roles; no cron row), the two sibling
--     jobs pinned as labelled green.
--
-- APPLY:
--   node scripts/apply-migration-temp.js 20260904100000_pc002_reaper_runs_retention_prune.sql
--   bash supabase-cli.sh migration repair --status applied 20260904100000
-- GATE READ: select proacl from pg_proc where proname = 'prune_reaper_runs'
--   — must be {postgres, service_role} only; select * from cron.job where
--   jobname = 'reaper-runs-prune'.

create or replace function public.prune_reaper_runs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  delete from public.reaper_runs
   where ran_at < now() - interval '30 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.prune_reaper_runs() from public, anon, authenticated;
grant execute on function public.prune_reaper_runs() to service_role;

comment on function public.prune_reaper_runs() is
  'FEAT-PC002 retention (2026-09-04): deletes reaper_runs rows older than 30 days '
  'and returns the count. Operations job — service_role only; scheduled nightly as '
  'cron job reaper-runs-prune (03:45). SECURITY DEFINER because reaper_runs is RLS '
  'deny-by-default and the job runs as the cron role.';

create index if not exists reaper_runs_ran_at_idx on public.reaper_runs (ran_at);

create extension if not exists pg_cron;
select cron.schedule('reaper-runs-prune', '45 3 * * *', 'SELECT public.prune_reaper_runs();');

-- One prune now, so the rule takes effect at apply rather than at 03:45.
select public.prune_reaper_runs() as pruned_at_apply;

-- Apply-time self-verification (README row 2).
do $$
declare v_n integer; v_acl text;
begin
  select count(*) into v_n from public.reaper_runs where ran_at < now() - interval '30 days';
  if v_n <> 0 then
    raise exception 'reaper_runs retention: % rows older than 30 days survive the apply-time prune', v_n;
  end if;

  select p.proacl::text into v_acl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prune_reaper_runs';
  if v_acl is null or v_acl like '%anon=%' or v_acl like '%authenticated=%' or v_acl like '{=X%' then
    raise exception 'prune_reaper_runs ACL is not service_role-only: %', coalesce(v_acl, '<null>');
  end if;

  select count(*) into v_n from cron.job where jobname = 'reaper-runs-prune';
  if v_n <> 1 then
    raise exception 'reaper-runs-prune cron job not scheduled (% rows)', v_n;
  end if;
end $$;
