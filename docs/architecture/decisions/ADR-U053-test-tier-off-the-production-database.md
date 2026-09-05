# ADR-U053: The test tier leaves the production database — a dedicated test project, a code fuse, and the schema gate rehearsed before it lands

**Status:** Accepted — ruled and adopted 2026-09-05 (Stefan: "do the ADR-U053 now"), cutover the same day; realisation notes below. (Was: Proposed, drafted 2026-09-05.)
**Date:** 2026-09-05
**Deciders:** Stefan.
**Tags:** scope:platform-core · scope:infrastructure · wave:ferd (adopt) · wave:eid (branching refinement, if ever)
**Supersedes / amends:** nothing. Amends the operating fact recorded in `AGENTS.md` "The dev database has one consumer at a time" (the rule stays for the test project; production stops being a test consumer at all). Builds on the hygiene machinery of TASK-DBT-03, TASK-E2E-02/03/04, #610 (no leftover test accounts), #611/#612 (retention as a gated rule).

---

## Context and problem statement

One Supabase project (`FringeIslandDB`, eu-west-1, PG17) serves everything: the production Hub at `fringe-island.vercel.app`, local development, every Jest integration suite, every Playwright E2E run, every one-off probe, and every live walk. There has never been a second database. Every fixture a test creates is a production row; every migration is "in production" at the moment it is applied; every hygiene rule the project has written since June exists to make that survivable.

The 2026-09-04/05 review measured what that costs even with the rules in place:

- **Residue that the rules could not see.** 180 `intprobe-*` accounts from a flake probe that ran outside the suite helpers and ignored its refused deletes; seven hand-made `*.hopper@test.com` accounts with three groups from August; a run log at 7,400 rows and pg_cron's history at 7,284 because nothing asked for retention. Each was found by a human looking, months or days late.
- **Dead space that no discipline prevents.** The suites' churn on production: `notifications` 444,950 inserts and 423,030 deletes lifetime, 16 MB on disk holding zero rows; the role and membership tables 2 to 8 MB each for a handful of live rows. Autovacuum ran hundreds of times and did its job; Postgres never returns file space without a full vacuum, so a weekly `VACUUM FULL` on production is now a scheduled stopgap (#612).
- **Collisions between humans and machines.** The standing rule "never two integration suites against the shared dev DB at once" (AGENTS.md) extends to Stefan's manual walks: the dev server, the auth rate limit, and cookie state all collide when a walk and a suite overlap (memory: manual-testing coexistence; the 2026-08-05/06 27-red run was self-caused by cleanup during a sweep).
- **The schema gate lands cold.** A migration's first execution is on production. The "reviewer reads the applied ACL" step and the post-apply verification set exist precisely because there is no rehearsal — the invocation-axis gate caught #603's and #608's first drafts *after* they were applied to production, and each needed a corrective migration.
- **A real member cannot be told apart from a fixture by anything but an email pattern.** The teardown census is domain-scoped (`@fringeisland.test` minus an allowlist) because a broader rule once deleted a hand-made persona (2026-08-12). The allowlist is a list of exceptions to a rule that should not need exceptions.

The disciplines are good and they stay. But they are disciplines: every script, every helper and every human has to do the right thing every time, on the database that also holds the members. *How should the test tier be separated from production so that residue, bloat and collisions become impossible by construction rather than merely policed?*

## Decision drivers

- **Production holds only real members and their data** — a fixture on production is a category error, not a hygiene lapse.
- **The suites keep their real substrate.** The integration tier's value is that it runs against real Postgres + RLS + PostgREST + Auth (the PG17 RLS ceiling, INSERT…RETURNING dual policies, the consent trigger, pg_cron, realtime). Mocks are not an option.
- **The management-API path the suites depend on must keep working** — `runAdminSql` (Supabase management API SQL as `postgres`), `apply-migration-temp.js`, `supabase migration repair`, and the auth admin API are the house tooling.
- **The schema gate should be rehearsed.** A migration should be applied, sibling-swept and gate-read somewhere that is not production before it is applied to production on the named approval.
- **One region, one shape.** ADR-U035 co-locates compute and datastore in Ireland; ADR-U043's performance pass measures production and must keep doing so.
- **Bounded cost and bounded ceremony.** One more standing thing to keep in lockstep is acceptable; per-run infrastructure spin-up, or a second toolchain, is not.

## Considered options

- **Option A — a dedicated, persistent test project.** A second Supabase project (`FringeIsland-test`) in the same region, built from `supabase/migrations` alone, carrying the suites, the E2E fleet, the probes, the walk cast and the dev server. Production carries members only.
- **Option B — Supabase branching.** Preview branches per pull request (ephemeral, migrations replayed automatically) and optionally one persistent branch as the standing test database.
- **Option C — local Supabase via the CLI (Docker).** Each developer and CI runs the whole stack locally; no shared test database at all.
- **Option D — status quo plus disciplines.** Keep one database; keep tightening the teardown, the census, the retention gate and the probes.

## Decision outcome

**Chosen option (recommended for Stefan's ruling): Option A**, because it removes the class by construction with the least change to the house tooling: the same management API, the same apply-and-repair scripts, the same helpers pointed at a different project ref, and it gives the schema gate a rehearsal for free. Option B is the natural refinement once per-PR isolation is worth its cost; Option C is the right long-term shape for local speed but changes the `runAdminSql` path and every developer's setup; Option D is where the project has been, and the review showed its ceiling.

The decision has six parts:

1. **Two projects, one migration history.** `FringeIsland-test` is created empty and built from `supabase/migrations` alone. Pre-flight before cutover: a fresh project must yield DeusEx, the four system groups, the role and group templates, the permission catalogue, the notification registries and the canonical journeys from migrations — anything that turns out to have been hand-made on production becomes a seed migration first (17 migrations already insert into those tables; the audit confirms the remainder).
2. **The schema gate runs twice, test first.** A held PR's apply commands run against test; the post-apply verification set, the sibling sweep and the gate reads happen there; the migration is applied to production only on the named approval, and `supabase migration list` on both projects must agree at the end of every gate. A drift check (a script, later a CI step) fails on any difference between the two histories.
3. **A code fuse, not a convention.** `hub/tests/helpers/supabase.ts`, the E2E helpers, `runAdminSql`, `apply-migration-temp.js` for the test path, and every script under `hub/scripts/` refuse to run when the configured project ref equals the production ref, unless an explicit `ALLOW_PRODUCTION=1` names the intent (the apply script for the production leg of a gate is the one legitimate case). Targets come from `hub/.env.test.local` (suites, E2E, probes, the walk cast, the local dev server by default) and `hub/.env.local` keeps production only for the gate's production leg; Vercel's production environment alone carries production keys.
4. **Walks move with the cast.** The standing walk cast (`hub/scripts/walk-cast.mjs`) lives on the test project only. Live walks run against a Vercel *Preview* deployment wired to the test project, or against the local dev server; `fringe-island.vercel.app` is never walked with fixtures again.
5. **What stays on production.** ADR-U043's performance pass (production, read paths, no fixtures — the cold-scenario rules unchanged), the retention jobs (#611/#612) and the weekly `VACUUM FULL` stopgap until the churn has visibly left, and the teardown census as defence in depth — a fixture-domain account on production after cutover is a red alarm, not residue.
6. **The rule changes shape.** AGENTS.md's "one consumer at a time" becomes a rule about the test project (suites still never overlap each other there); production has one kind of consumer, members. The memory that "every dev write is a production write" is retired at cutover.

### Consequences

- **Positive:** fixtures, probes and walks cannot leave production residue or bloat; suites and walks stop colliding with members; every schema gate gets a rehearsal on a real substrate before production; the teardown machinery becomes a backstop instead of the only line; the launch-checklist "fixture sweep" item disappears.
- **Negative:** one more project on the Supabase plan (cost is Stefan's to weigh; the org already carries an inactive second project, `BookForge`); two migration histories to keep in lockstep (the drift check is the price); the gate takes two applies instead of one; secrets and Vercel environments need a one-time re-wiring; the seed pre-flight may surface hand-made platform rows that must become migrations.
- **Neutral:** the suites, helpers and scripts change by configuration, not by shape; the region stays Ireland; the ES256 auth-admin history (a vendor incident, closed 2026-09-03) is unaffected either way.

## Pros and cons of each option

### Option A — dedicated persistent test project
- Pros: smallest change to house tooling (same management API and scripts, different ref); persistent, so no per-run spin-up; a real rehearsal for every gate; the fuse is a one-line check; the walk cast and the E2E session user live where they belong.
- Cons: a standing cost; two histories to keep aligned; a second set of secrets to manage; the test project's own residue still needs the teardown machinery (it is not production, but it is shared by every suite).

### Option B — Supabase branching
- Pros: per-PR isolation removes even suite-to-suite sharing; migrations replay automatically from the repo; the preview deployment wiring is native.
- Cons: ephemeral branches spin up per run (time and compute cost); the persistent-branch variant is Option A with a different bill; the house apply-and-repair flow and `migration repair` semantics need re-learning against branch refs; the seed pre-flight is identical; a heavier change for the same first-order gain.

### Option C — local Supabase (CLI, Docker)
- Pros: fastest suites, zero shared state, free; the eventual right shape for developer loops.
- Cons: `runAdminSql` and the apply script speak the management API, which does not exist locally — a second admin path (direct Postgres) has to be written and kept equivalent; Docker on every machine and in CI; pg_cron, realtime and auth behave close to but not identically to the hosted stack; the gate still needs a hosted rehearsal, so it does not replace Option A, it complements it.

### Option D — status quo plus disciplines
- Pros: nothing to buy, nothing to wire; the machinery built since June is genuinely good.
- Cons: every remaining failure is a human or a script forgetting once; bloat is structural, not a lapse; the gate lands cold on production; members and fixtures share a table forever; the review's numbers are the ceiling of this option.

## Adoption plan (for the ruling, not part of the decision)

1. Stefan creates `FringeIsland-test` (region eu-west-1) and rules on the plan.
2. Build it from migrations (`supabase db push` or the apply script per file, then `migration repair` to match production's history); run the seed pre-flight (§1) and turn any gap into a seed migration.
3. Env split and the fuse (§3); run the full integration tier, the E2E fleet, the probe and `walk-cast create` / `teardown` on test — all green, census clean.
4. Wire the Vercel Preview environment to test; walk the DB-4 legs 4, 5, 6 and 8 there with a fresh cast.
5. Amend AGENTS.md, `docs/platform/CLAUDE.md` (the migration workflow gains the test leg), PROCESS.md §5 (the post-apply set names the test project), and retire the "one database" memory. Promote this ADR to Accepted on the day of cutover.

## Realisation (2026-09-05, appended at acceptance — the ADR body above is unchanged)

Executed in the session that closed Cycle COR-E; record: `docs/planning/hub-v2/2026-09-05-adr-u053-cutover.md`. Where the realisation differs from the letter of the decision, the letter yields to the reason:

1. **Env file names.** The decision named `hub/.env.test.local` for the test project and `hub/.env.local` for production. Realised the other way round: `.env.local` (root and `hub/`) = **test**, `.env.production-gate.local` = production. Reason: Next.js, dotenv, Jest and Playwright all load `.env.local` by default — the DEFAULT had to be the test project for "a suite cannot reach production by accident" to be structural rather than a convention. Production is reachable only by naming it twice (`--production` selects the gate file; `ALLOW_PRODUCTION=1` passes the fuse).
2. **The chain is not replayable from empty as-is.** `scripts/replay-migrations.js` + `supabase/migrations/REPLAY-EXCEPTIONS.json`: three pre-D15-rebuild fixes are recorded-not-executed (their effect is subsumed by `20260222000000`); seeds 01–04 replay before `20260227120843` and seed 06 after the chain — the point in history production received them by hand. Adding an entry is a schema-gate matter.
3. **The standing DeusEx member.** A fresh project has no platform administrator, and the last-DeusEx-member guards then refuse every fixture demotion. `scripts/seed-test-deusex.js` creates `deusex@fringeisland-test.internal` (outside the swept fixture domain) through the real sign-up path and elevates it. Production keeps its own.
4. **The pre-flight's production findings.** One residue notification kind (`na_test_kind_msug30be`) → corrective migration `20260905130000`, rehearsed on test, production leg on the named approval. One mis-stamped history record (`20260821132432` for the file `20260821150000`) — the drift check's first catch; repair SQL under `docs/planning/hub-v2/sql/`. Both production writes were refused by the auto-mode classifier — the fuse's intent honoured by the harness — and wait for Stefan's hand.
5. **Names.** `apply-migration-temp.js` (as this ADR was drafted) is `scripts/apply-migration.js` since COR-E W5; every script under `scripts/` and `hub/scripts/` is registered in `scripts/README.md` and loads its target through the fuse (`production-fuse.test.ts` sweeps them).
6. **What stays on production (§5) — confirmed:** the retention jobs and the weekly `VACUUM FULL` (still declared a stopgap; revisit once the churn has visibly left), the ADR-U043 pass (`perf-measure.mjs` with `PERF_ENV=../.env.production-gate.local ALLOW_PRODUCTION=1`), the teardown census as defence in depth.
7. **Still open at acceptance:** the Vercel Preview environment wired to the test project (§4 — dashboard, Stefan's); a CI step for the drift check (needs a management-API secret in CI — the GC-16 posture, revisit at Eid); Option B (branching) remains the refinement this ADR names.

## Links

- Related ADRs: [ADR-U035](./ADR-U035-compute-datastore-colocation.md) (region), [ADR-U043](./ADR-U043-performance-budgets.md) (the production performance pass), [ADR-U038](./ADR-U038-platform-contracts-platform-side-surface-bff.md) (the gate's direct-caller question, now rehearsable), [ADR-U052](./ADR-U052-telemetry-sink-and-analytics-posture.md) (retention precedent).
- Related work: TASK-DBT-03 (suite teardown by token), TASK-E2E-02/03/04 (E2E fixture hygiene), PR #610 (no leftover test accounts), #611 and #612 (retention as a gated rule; `hub/tests/integration/platform/retention-conformance.test.ts`), `hub/scripts/walk-cast.mjs`.
- Steering to amend at cutover: `AGENTS.md` "The dev database has one consumer at a time"; `docs/platform/CLAUDE.md` "Database migrations"; `docs/planning/PROCESS.md` §5 (Q1 post-apply set).
