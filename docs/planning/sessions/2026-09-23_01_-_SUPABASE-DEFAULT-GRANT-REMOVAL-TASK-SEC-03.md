# Session bridge — 2026-09-23 — Supabase drops the default table grants on 2026-10-30: TASK-SEC-03 built and held at the schema gate

**Cycle:** The Eid kickoff (front door repointed to this bridge; the kickoff itself still waits for its fresh session)
**Span:** 2026-09-23, one Claude Code session; the discovery sweep (#682) then one held PR
**Trigger:** Stefan pasted Supabase's notice — *"On October 30, Supabase will stop automatically granting Data API access to new tables in the public schema"* — and asked: *"do we need to act from Claude Code?"* Then: *"so do you want to act on this now?"*

---

## The arc

1. **Assessment first, no edits.** The repo was read for grants: 145 migrations, 42 public tables, only 2 tables ever granted in a file; the other 40 got SELECT (client roles) and ALL (`service_role`) from the `postgres` default ACL — the row Supabase removes. The live test project confirmed the row (`anon=rm, authenticated=rm, service_role=arwdDxtm`). TASK-SEC-02 had deliberately left SELECT and `service_role` to that default. The lockdown gate pinned absence only. Verdict: nothing breaks on the day; the first Eid table and every rebuild would.
2. **Stefan's go.** One task under the schema gate, the SEC-02 shape: the gate is the deliverable.
3. **Both projects measured identical** (md5 over 366 grant rows), so the backfill states the live state per table, no widening, no narrowing.
4. **Red-first, twice.** The static gate: red at authoring (module absent) → 10/10. The presence cells: green on live (6/6), **red against a real owner-only probe table** created and dropped on the test project (2/6 — the SEC-02 cells stayed green, the blind spot exactly), green again (6/6).
5. **The migration rehearsed in a rolled-back transaction** on the test project: every GRANT + the self-check passed; the grant-state hash inside the transaction equalled the live one. A proven no-op; its purpose is the chain.

## Decisions (this session)

- **Posture unchanged** — SELECT only for the client roles, ALL for `service_role`, contract-only tables stay closed. The task states the posture in the files; it does not move it. *Locked (it is SEC-02's).*
- **Not Supabase's template block.** `grant select, insert, update, delete … to authenticated` reopens the SEC-02 lock; the house block is `grant select … to anon, authenticated;` + `grant all … to service_role;`. Written into the tier rule, checklist row 8 and the static gate (`client-dml` finding). *Locked.*
- **No `ALTER DEFAULT PRIVILEGES … GRANT`** to re-create the convenience. Explicit grants per table, the notice's own advice. *Locked.*
- **One held PR**, not two — the tier `CLAUDE.md` is a steering file and the migration is schema; both are carve-outs, so splitting bought nothing. *Proposed; Stefan's nod merges it.*

## What was produced

- `supabase/migrations/20260923120000_task_sec03_explicit_table_grants.sql` — the backfill + self-check (not applied)
- `hub/tests/helpers/migration-table-grants.ts`, `hub/tests/unit/platform/migration-table-grants.test.ts` — the static gate (10 cells)
- `hub/tests/integration/platform/table-grant-lockdown.test.ts` — two presence cells (6 cells total)
- `docs/platform/CLAUDE.md` — the table-grant rule beside the function-grant rule; `supabase/migrations/README.md` — checklist row 8
- [`TASK-SEC-03`](../backlog/tasks/TASK-SEC-03-explicit-table-grants-before-supabase-drops-the-default-acl.md) (`review`), its row in the [tasks index](../backlog/tasks/README.md), the kickoff plan §2 line (Eid's second tooling item), the root and Platform Core CHANGELOG entries
- Discovery sweep at session start: one appended session in the discovery file → #682, `discovery` synced

## What is still open — Stefan

- ~~"ok merge" for the held PR~~ — **given the same session.** Gate record: test leg applied + repaired; `test:integration:platform` 48/48; production leg applied + repaired; `migration-drift.js` files = test = production = 143; the applied grants read back on both projects — md5 `8ce5c98e89de293de2310a135263b792`, 366 rows, 42 tables, version `20260923120000` recorded. The migration changed nothing live, exactly as claimed. #683 merged.
- **MAINTAIN residue** — the client roles hold PG17's `MAINTAIN` on the default-granted tables (live only; a replay will not). Revoke live (recommended, next schema-gated cycle) or leave.
- **anon SELECT on 35 tables** — default residue, RLS-governed; narrowing starts with an anon-policy audit, a separate task.

## Non-obvious insights

- **A gate that pins absence is blind to nothing-at-all.** SEC-02's four cells all passed with a table that no role could read. Presence and absence are two halves; the second was missing for eight months and only a vendor notice surfaced it.
- **`role_column_grants` is the right catalog for "readable at all"**: it expands a table-level SELECT per column and lists a column-scoped one as written, so `users`/`groups` count as readable without a special case. `role_table_grants` alone would have made them false exceptions.
- **A vendor's own remediation snippet can violate the house posture.** Supabase's block is correct for a default project and wrong for this one; the rule now says so where a migration author will read it.
- **The probe method (SEC-01) generalises**: a real object with the future shape, created and dropped outside any suite, is a truer red than an emptied exception list.

## For the next session

- The held PR is the only thing in flight from this session. Nothing is applied anywhere. The test project is clean (probe dropped, `remaining 0`; the rehearsal rolled back).
- Read order: this bridge → the task file → the migration header. The apply commands are in the task; the PR body carries them too.
- The front door's "Waiting on Stefan" carries the item; the kickoff plan §2 names it as Eid's second tooling item with the hard date 2026-10-30.
- A dev server was listening on :3000 throughout; only the lockdown file was run (three times, in band) plus the unit tier — no full suite.

## Doc health — 2026-09-23 — on-demand, after the migration + the new planning files

Run: 1.5 (one row added — "a new public table inherits its Data API grants from the default ACL", retired by Supabase 2026-10-30; 9 files hit the keyword, all function-sense or historical → clean) · 2 (grants-only migration; the tier rule updated; clean) · 3 (every relative link in the seven touched files resolves; the task indexed; sessions README curated by policy) · 5 (6-done sweep whole-tree clean; the front door names the newest bridge) · 9 (the tier edit is tier-applicable; pointers unchanged). Skipped, nothing triggered them: 1, 1.6 (tests are not product code), 3.5, 3.6, 3.7, 4, 4.5, 6, 7, 8, 10, 11. No critical findings, no backlog items.
