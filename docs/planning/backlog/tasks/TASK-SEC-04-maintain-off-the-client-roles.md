---
id: TASK-SEC-04
title: MAINTAIN off the client roles — the PG17 privilege the default ACL handed anon/authenticated on every table and no revoke ever named, gated
status: review  # built 2026-09-23 on Stefan's ruling ("revoke MAINTAIN then, same gate shape"), HELD at the schema gate; rehearsed in a rolled-back transaction on the test project: client-role MAINTAIN 0, service_role 42, standard grants untouched
assigned_to: unassigned
priority: medium
feature: none
owner: platform/core/infrastructure
wave: eid
cycle: The Eid kickoff — follows TASK-SEC-03 the same day
depends_on: [TASK-SEC-03]
estimated_hours: 2
---

# TASK-SEC-04 — MAINTAIN off the client roles

**Found:** 2026-09-23, while writing the TASK-SEC-03 backfill: the default ACL's `anon=rm,
authenticated=rm` carries an `m` beside the `r`. The backfill states SELECT only, so a replayed
project lacks the `m` while the live projects hold it — recorded as SEC-03's deferred item 1.
**Ruled:** 2026-09-23, Stefan — *"revoke MAINTAIN then, same gate shape."*
**Not a live exploit.** Read the severity section before acting on this.

## What was measured (2026-09-23, read-only, BOTH projects identical, PG 17.6)

| Fact | Count |
|---|---|
| Public tables | 42 |
| `anon` holds MAINTAIN | 37 |
| `authenticated` holds MAINTAIN | 39 — the SELECT revokes on `users` / `groups` took the `r` and left the `m` |
| `service_role` / `postgres` hold MAINTAIN | 42 / 42 |
| `pg_default_acl` for `postgres` / tables | `anon=rm, authenticated=rm, service_role=arwdDxtm` |
| Cells that could see it | none — `information_schema.role_table_grants` and `role_column_grants` do not expose MAINTAIN |

## Severity — stated plainly

MAINTAIN (PG17) = VACUUM, ANALYZE, CLUSTER, REINDEX, REFRESH MATERIALIZED VIEW, LOCK TABLE.
PostgREST exposes none of them; no SECURITY INVOKER function executable by a client role issues
one. Defense in depth, the SEC-02 class: a client role has no business locking or vacuuming a
table, and an invoker-mode helper written tomorrow would inherit the ability. It is also the one
bit by which a project replayed from the chain (SEC-03) differed from the live projects.

## Built 2026-09-23 — HELD at the schema gate

- **`supabase/migrations/20260923150000_task_sec04_client_role_maintain_revoke.sql`** — a DO loop
  `REVOKE MAINTAIN ON TABLE public.X FROM anon, authenticated` over every public table (the SEC-02
  shape); `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE MAINTAIN ON TABLES
  FROM anon, authenticated`; a self-verifying block (live count 0; the default ACL row carries no
  `m` for a client role — a missing row after 2026-10-30 passes). `service_role` keeps ALL.
- **The gate**, `hub/tests/integration/platform/table-grant-lockdown.test.ts` (now 7 cells): a new
  cell reads `pg_class.relacl` through `aclexplode` — no MAINTAIN for `anon` / `authenticated` on
  any public table; the default-ACL cell's letter class gains `m`.
- **The static gate**, `hub/tests/helpers/migration-table-grants.ts`: MAINTAIN joins the words
  refused to a client role (`client-dml`), fixture-pinned in the unit suite.

## Red-first record (the test project, one file in band, alone)

| Step | Result |
|---|---|
| Unit suite with the MAINTAIN fixture, checker unchanged | **RED 1/10** — `grant select, maintain … to authenticated` produced no finding |
| Checker: MAINTAIN in the refused words | **GREEN 10/10** |
| Lockdown gate at HEAD (new cell + the `m` letter) | **RED 2/7** — the MAINTAIN cell lists 76 rows (37 anon + 39 authenticated); the default-ACL cell shows `anon=rm/postgres`, `authenticated=rm/postgres`; the five other cells green |
| The migration rehearsed inside `BEGIN … ROLLBACK` on the test project | passed; inside the transaction: client-role MAINTAIN **0**, `service_role` 42, default ACL `anon=r, authenticated=r`, the standard-grant md5 `8ce5c98e…` **unchanged** — the migration touches only the `m` bit; rolled back |
| `npm run typecheck` (hub, app + tests) | 0 errors |

The gate stays RED on the live projects until the migration is applied — by design, SEC-02's shape.

## At the gate — the named approval ("ok merge"), per the standing rule

```
node scripts/apply-migration.js 20260923150000_task_sec04_client_role_maintain_revoke.sql
bash supabase-cli.sh migration repair --status applied 20260923150000 --project-ref spxitjjiawxatwmyjmsp
cd hub && npm run test:integration:platform && cd ..
ALLOW_PRODUCTION=1 node scripts/apply-migration.js --production 20260923150000_task_sec04_client_role_maintain_revoke.sql
bash supabase-cli.sh migration repair --status applied 20260923150000 --project-ref jveybknjawtvosnahebd
node scripts/migration-drift.js
```

Expected: the lockdown gate flips GREEN 7/7 (platform suite 49/49), drift clean at 144, and on
both projects client-role MAINTAIN = 0 with the standard-grant md5 still `8ce5c98e…`. Then merge.

## Sibling assertions

None read MAINTAIN — the information_schema views hide it, which is the reason it survived. The
SEC-03 presence cells read SELECT and the seven standard privileges: unchanged. LEFT.

## Notes

- Sequences (`rwU` to the client roles by default) remain out of scope, as SEC-02 and SEC-03
  recorded them.
- The second SEC-03 residue — `anon` SELECT on 35 tables — is not ruled here; it needs the
  anon-policy audit first.
