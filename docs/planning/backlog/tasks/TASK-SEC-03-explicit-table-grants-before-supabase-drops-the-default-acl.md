---
id: TASK-SEC-03
title: Every public table's Data API grants stated in the migrations before Supabase stops granting them by default (2026-10-30) — a backfill, a static gate, presence cells, the rule
status: review  # built 2026-09-23, HELD at the schema gate; the migration is a proven no-op on both live projects (rolled-back rehearsal on the test project: grant-state hash unchanged)
assigned_to: unassigned
priority: high
feature: none
owner: platform/core/infrastructure
wave: eid
cycle: The Eid kickoff — Eid's second tooling item; lands before the first Eid table migration and before any project rebuild
depends_on: []
estimated_hours: 4
---

# TASK-SEC-03 — explicit table grants before Supabase drops the default ACL

**Found:** 2026-09-23, from Supabase's notice to the account owner — *"On October 30, Supabase will
stop automatically granting Data API access to new tables in the public schema for existing
projects … Migrations count too. From October 30, any migration that creates a table without the
required grants leaves that table unreachable through the Data API. That includes new projects,
preview branches, and a local `supabase db reset`."*
**Not a live vulnerability, not a live outage.** Nothing breaks on the day. Read the severity
section before acting on this.

## What was measured (2026-09-23, read-only, BOTH projects)

| Fact | Test (`FringeIsland-test`) | Production (`FringeIslandDB`) |
|---|---|---|
| Public tables | 42 | 42 |
| Tables with a table-level grant in ANY migration file | 2 — `pending_email_invitations`, `role_template_publications` | same files |
| `service_role` holds the full set (7 privileges) | 42 | 42 |
| `authenticated` SELECT, table-level | 37 | 37 |
| `authenticated` SELECT at some column set (`role_column_grants`; adds the column-scoped `users`, `groups`) | 39 | 39 |
| `anon` SELECT, table-level | 35 | 35 |
| md5 over all 366 client-role `role_table_grants` rows | `8ce5c98e89de293de2310a135263b792` | `8ce5c98e89de293de2310a135263b792` |
| `pg_default_acl` for `postgres` / tables | `anon=rm, authenticated=rm, service_role=arwdDxtm` | not read (Supabase's default; the same row) |

So 40 of the 42 tables hold grants that no migration ever wrote: they came from the `postgres`
default ACL at `CREATE TABLE` time. That row is what Supabase removes.

## Severity — stated plainly so nobody over- or under-reads it

- **Existing tables: unaffected.** Both projects keep every grant; the Hub, the BFF, the suites and
  the walks keep working on 2026-10-30. No action is needed to keep the app running.
- **New tables from 2026-10-30:** a migration that creates a table without its own GRANT leaves it
  unreachable for **every** role, `service_role` included — 42501 on every read and write, loud, not
  silent (Supabase returns the exact GRANT to run). TASK-SEC-02 deliberately left SELECT and the
  `service_role` set to the default ACL, so the house pattern *as written* produces exactly this
  table. The first Eid table migration (Journey Studio v1) is the first one at risk.
- **The chain itself:** `scripts/replay-migrations.js` (the ADR-U053 rebuild path), a preview
  branch, a local reset — a replay onto a fresh project after the change comes up with ~40 tables
  no client role can reach. The disaster-recovery story silently depended on the row being removed.
- **The gate as it stood:** `table-grant-lockdown.test.ts` pinned ABSENCE (no client-role DML, a
  DML-free default ACL). A table with no grant at all passed it.
- **The hazard inside the notice:** Supabase's suggested block grants `insert, update, delete` to
  `authenticated`. Pasted into a FringeIsland migration it reopens the SEC-02 lock and turns the
  lockdown gate red.

## Posture — unchanged (ADR-U038, TASK-SEC-02)

Client roles: SELECT only, RLS-governed, column-scoped where a table carries sensitive columns
(`users`, `groups`); no table-level DML. `service_role`: the full set (RLS does not apply to it;
the grant is its only lock and its only key). Contract-only tables — no client read at all:
`journal_entries`, `journey_steps`, `journey_step_instances`. **This task states that posture in
the files. It does not move it.**

## Built 2026-09-23 — HELD at the schema gate

- **`supabase/migrations/20260923120000_task_sec03_explicit_table_grants.sql`** — every public
  table's table-level grants, explicit, exactly the live state: 42 × `grant all … to service_role`,
  35 × `grant select … to anon, authenticated`, 2 × `grant select … to authenticated`
  (`content_families`, `step_kinds`); the five others untouched — their reads are column-scoped
  (`users` 20260702120000, `groups` 20260903120000) or contract-only (`REVOKE ALL` in their own
  migrations). A self-verifying DO block (checklist row 2 applied to grants) aborts on any
  deviation from the claimed state. **No `ALTER DEFAULT PRIVILEGES … GRANT`** — re-creating the
  convenience Supabase is removing would put the dependency back under the rug. A no-op on both
  live projects; its purpose is the chain.
- **The static half of the gate:** `hub/tests/helpers/migration-table-grants.ts` +
  `hub/tests/unit/platform/migration-table-grants.test.ts`. Every migration from `20260923120000`
  on must grant the tables it creates in the same file — `service_role` always; `authenticated`
  (table- or column-scoped) or a `-- no-client-read: X — <reason>` marker — and no GRANT may hand
  DML/ALL to a client role (`-- client-dml-exception: X — <reason>` for a decided one). It reads
  the files, so it fails **before** apply. Ten cells: the parser (comments, literals and
  dollar-quoted bodies blanked in one pass so a function grant can never swallow the table grant
  after it), the fixtures, the folder sweep, and a "teeth" cell that measures the pre-rule chain
  (≥ 30 tables with no grant in their file — the reason the backfill exists).
- **The presence half, live:** two cells added to `hub/tests/integration/platform/table-grant-lockdown.test.ts`
  — every public table readable by `authenticated` beyond the three named contract-only tables,
  the list exact (a widening is a decision); every public table fully granted to `service_role`.
- **The rule:** `docs/platform/CLAUDE.md` (beside the function-grant rule, same shape — the house
  block, the never-block, the marker, the two gates); `supabase/migrations/README.md` checklist
  row 8; the kickoff plan §2 (Eid's second tooling item); the root and Platform Core CHANGELOGs.

## Red-first record (the test project, one file in band, alone; the dev server on :3000 left running)

| Step | Result |
|---|---|
| Unit suite at authoring — the helper does not exist | **RED** — `Could not locate module @/tests/helpers/migration-table-grants` |
| Unit suite with the helper | **GREEN 10/10** |
| Lockdown gate at HEAD + the two presence cells, live substrate | **GREEN 6/6** — the presence cells hold today, as they must |
| Probe: `create table public.sec03_probe` + `revoke all … from anon, authenticated, service_role` — the post-2026-10-30 shape, owner-only ACL (`postgres` ×7). DDL outside any suite, the SEC-01 throwaway-object method | **GATE RED 2/6** — both presence cells name `sec03_probe` (`sec03_probe: (none)`); the four SEC-02 cells stay green. Exactly the blind spot |
| Probe dropped (`remaining 0`) | **GREEN 6/6** |
| The backfill rehearsed inside `BEGIN … ROLLBACK` on the test project — every GRANT + the DO block | passed, no exception; the grant-state md5 **inside** the transaction = the live `8ce5c98e…` over 366 rows — a proven no-op; rolled back |
| `npm run typecheck` (hub, app + tests) | 0 errors |

## At the gate — the named approval ("ok merge"), per the standing rule

```
node scripts/apply-migration.js 20260923120000_task_sec03_explicit_table_grants.sql
bash supabase-cli.sh migration repair --status applied 20260923120000 --project-ref spxitjjiawxatwmyjmsp
cd hub && npm run test:integration:platform && cd ..
ALLOW_PRODUCTION=1 node scripts/apply-migration.js --production 20260923120000_task_sec03_explicit_table_grants.sql
bash supabase-cli.sh migration repair --status applied 20260923120000 --project-ref jveybknjawtvosnahebd
node scripts/migration-drift.js
```

Expected: the platform suite green (the presence cells were green before; the migration changes no
grant), drift clean (files = test = production), and the live grant hash still `8ce5c98e…` on both.
Then merge. The reviewer reads the applied grants, not this file.

## Sibling assertions

None change — the migration is a no-op on live, so every cell that reads grants today reads the
same grants after it. Grep 2026-09-23 over `hub/tests` for `role_table_grants | role_column_grants |
pg_default_acl | has_table_privilege`: the lockdown gate, `anon-execute-lockdown`, and three groups
suites (`group-closure-deletion`, `role-provenance-and-retirement`, `role-publication-and-diff`)
that pin 42501 on direct writes or a specific table's SELECT — all read the same state. LEFT.

## Deferred — Stefan's decisions, stated so they are not lost

1. **MAINTAIN residue.** The default ACL also handed the client roles PG17's `MAINTAIN` (the `m`
   in `rm`) on every default-granted table; SEC-02's revoke list did not include it and this
   backfill does not re-state it (SELECT only). Live: `anon`/`authenticated` hold MAINTAIN on the
   35–37 default-granted tables (VACUUM / ANALYZE / REINDEX / LOCK TABLE — not reachable through
   PostgREST; a SECURITY INVOKER helper could LOCK). A replayed project will not have it, so live
   and replayed differ by that bit. Decide: revoke it live (a one-liner + a lockdown cell reading
   `pg_class.relacl`, same-shape follow-up, next schema-gated cycle — recommended) or leave it.
2. **`anon` SELECT on 35 tables is default residue**, RLS-governed. The backfill restates it as it
   is; narrowing `anon` to the tables an anon policy actually reads is a separate decision that
   starts with an audit of the anon policies, not this task.
3. **Sequences** — out of scope, as SEC-02 recorded them; the notice names tables only. The
   sequence default ACL (`rwU` to the client roles) is unchanged by Supabase.

## Notes

- Red-first, the SEC-02 way: the gate's new cells were shown red against a real ungranted table on
  the test project, not against an emptied exception list.
- Schema-gated cycle: migration + named approval; task at `review` until the gate record is
  written here (date, Stefan's words, the live hash on both projects after apply).
- Related: TASK-SEC-01 (functions: the default privileges miss the apply path), TASK-SEC-02 (the
  table-grant lockdown this task states the presence half of).
