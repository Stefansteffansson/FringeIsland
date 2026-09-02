---
id: TASK-SEC-02
title: Table-grant narrowing is partial (12 of 42) and TRUNCATE was never in the revoke recipe — close it structurally, with a gate
status: review  # built 2026-09-02 — migration + gate + labelled siblings; HELD at the schema gate for the named approval
assigned_to: unassigned
priority: medium
feature: none
owner: platform/core
wave: ferd
cycle: unscheduled — schema-gated
depends_on: []
estimated_hours: 4
---

# TASK-SEC-02 — finish the table-grant narrowing and gate it

**Found:** 2026-08-11, at the Phase-4 W1 oracle discharge check, while closing that note's own
"documented, not verified live" limit ([discharge note §7](../../hub-v2/2026-08-11-oracle-discharge-note.md)).
**Not a live vulnerability.** Read the severity section before acting on this.

## What was measured (dev DB `jveybknjawtvosnahebd`, read-only)

| Fact | Count |
|---|---|
| Public tables | 42 |
| RLS enabled | **42 of 42** |
| `authenticated` still holds the default INSERT grant | 30 of 42 |
| `authenticated` still holds TRUNCATE | 33 of 42 |
| INSERT deliberately revoked (ADR-U038 narrowing) | 12 |
| …of those 12, TRUNCATE **not** revoked | 4 — `content_families`, `journey_enrollments`, `role_template_publications`, `step_kinds` |

## Severity — stated plainly so nobody over- or under-reads it

**There is no reachable exploit today.**

- Every table has RLS on, and the tables in question have **zero write policies**, so INSERT/UPDATE/DELETE from `anon`/`authenticated` are refused regardless of the grant.
- TRUNCATE is the one verb RLS cannot gate. But **PostgREST exposes no TRUNCATE verb**, and no `SECURITY INVOKER` function in the schema issues one, so a signed-in member has no path to it.

What this *is*: defense-in-depth debt. The grant is a second lock that was left unlocked because the first lock (RLS) holds. If a future migration ever adds a permissive write policy, or a `SECURITY INVOKER` helper, the second lock is not there.

## Why this is not just "another sweep item"

The **function**-grant version of exactly this class was found three separate times (`leave_group` EXECUTE-to-PUBLIC; the sprint3 nomination surface; the twelve PC010–PC013 contracts), and the [2026-07-06 retro](../../retrospectives/retro-2026-07-06.md) escalated it with a named lesson:

> *"a manual sweep list that grows back after being worked is a wrong-layer pattern, not an unfinished chore. It escalates to a structural fix; it does not re-park."*

It was then closed structurally — a full sweep, a default-privileges fix, and a **permanent regression gate** (now part of the conformance family, which caught COR-D's own W6 trigger function on its first post-merge run).

The **table**-grant analogue never got that treatment. That is precisely why 30 tables kept the Supabase default and why four *deliberately narrowed* tables still kept TRUNCATE. Working this as a one-off sweep would repeat the mistake the retro named.

## Definition of ready

- Decide the target posture: does `authenticated` need any table-level DML grant at all, given every write goes through `SECURITY DEFINER` contracts (ADR-U038)? Default expectation: **no** — revoke DML + TRUNCATE from `anon`/`authenticated` on all 42, and let RLS govern reads only.
- Confirm against the ownership manifest that no DS-owned path relies on a direct client write (the ADR-U038 audit says none should).
- **The gate is the deliverable, not the sweep.** Extend the conformance family with a table-grant check mirroring the existing function-grant gate, so a new migration that re-introduces a default grant fails the suite. Without that, this task will be re-filed in three months.
- `ALTER DEFAULT PRIVILEGES` must be checked too — the function-grant fix needed it, and new *tables* will inherit the same defaults otherwise.

## Disposition — built 2026-09-02, HELD at the schema gate (Ferd leftovers pass)

**Posture decided (the DoR's default, for Stefan's nod at the gate):** the client roles hold **no** table-level DML. Verified before writing a line: `hub/app` + `hub/lib` have **zero** direct `.from().insert|update|delete|upsert` calls; **exactly one** SECURITY INVOKER function executable by `authenticated` writes a table as the caller — `update_own_profile` on `users` (FEAT-PC003), under `users_update_own`, narrowed by migration `20260702120000` to six identity columns. That grant is the **one named exception**, re-issued **column-exact** (a table-level re-grant would have widened it to `is_active` / `is_decommissioned` / `email` — caught while writing, not after). The write policies on `groups`, `journal_entries`, `pending_email_invitations` are dormant (no direct caller) and stay; a policy without a grant permits nothing. **Closed on purpose, stated:** FEAT-PC010's column-scoped UPDATE on `groups` (a permitted Steward's direct settable-column write) — the Hub never used it (`PATCH /api/groups/[id]` → `update_group_settings()`, SECURITY DEFINER); its only pin was a regression-guard cell, inverted with a label.

**Re-measured 2026-09-02 (read-only):** 42 tables; `authenticated` INSERT on 30, TRUNCATE on 33; `anon` DML on 33; both `postgres` and `supabase_admin` default ACLs hand `arwdDxtm` to anon/authenticated on new tables.

**Built:**
- `supabase/migrations/20260902210000_task_sec02_table_grant_lockdown.sql` — a DO block revoking INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER from `anon`, `authenticated` on every `public` table; the column-exact `users` re-grant; `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE … ON TABLES FROM anon, authenticated` so the next migration's table inherits nothing. Sequences out of scope (recorded). Header names every sibling assertion, adapted or left.
- **The gate is the deliverable:** `hub/tests/integration/platform/table-grant-lockdown.test.ts` — four cells: no table-level DML for the client roles (no exception at all), no column-level DML beyond the named exception **with its exact column set** (`role_column_grants` expands table grants per column, so this cell also reads the default-granted tables today), the exception held column-exact (an overshoot is a regression too), and the migration role's default ACL grants no DML on future tables. **Red today** (the run is recorded in the PR), green after the apply, red again the day a migration re-grants.
- Siblings adapted with labels: `group-closure-deletion.test.ts` STORY-6 ×2 (42501 before RLS's silent 0 rows), `group-crud-contracts.test.ts` (the settable-column guard inverted). Left as-is: `invitation-contracts.test.ts:916` (already expected a refusal), the profile suites (the exception keeps them working), every E2E (admin-client writes are service_role; no journey walks a direct write — Q1: nothing beyond the post-apply slices).

**At the gate (named approval, per the standing rule):** apply the migration; run `test:integration:platform` (the gate flips green), `groups` (the adapted siblings), `profile` (the exception); then merge.

## Notes

- Red-first: the gate test must demonstrably fail against today's substrate (30 tables) before the revoke migration turns it green.
- Schema-gated cycle: migration + named approval, per the standing rule.
- Related, already closed: the pre-partition SECURITY DEFINER **function** grant sweep (PR #105 + its regression test).
