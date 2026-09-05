# Session bridge — 2026-09-05 (1): the database review — clean slate, retention as a gated rule, the walk cast as a script, ADR-U053 proposed

**Continuation of `2026-09-03_07`.** Stefan opened 2026-09-04 with a request for a summary of the last sessions and a live-walk plan for DB-4, walked legs 1, 2, 3 and 7, then turned to the database: "review the db and if we have slop", "we do NOT want any test accounts to be left overs from testing … this needs to STOP", "remove all test-accounts, engagement groups, notifications, forums and DM's so we have a clean database", "clean out the walk accounts … tear down whatever artifacts", "clean logs as well", "analyze why we had these logs and stale spaces … fix whatever we need to fix", "draft the ADR". Six PRs: #610, #611, #612 (retention gate), #613 (ADR-U053), plus #608/#609 from the previous bridge.

## Live state (verified at close — cite, don't re-derive)

- `main` = `origin/main` = discovery at the #613 merge; clean; no open PRs.
- **The database is a clean slate.** Accounts: `deusex@fringeisland.com` only. Groups: DeusEx (personal) and the four system groups. Zero notifications, conversations, messages, forum posts, announcements, enrolments, consent records, audit rows, telemetry, pending invitations, orphaned personal groups. Canonical data intact: 4 journeys, 4 role templates, 4 group templates, 48 permissions, the notification registries. **No `walk-*` accounts exist** — `npm run walk:cast -- create` (from `hub/`) makes the cast; `teardown` removes it with everything it made; proven both ways.
- **Migrations applied and repaired since the last bridge:** `20260904100000` (reaper_runs 30-day prune, `reaper-runs-prune` 03:45), `20260905100000` (`cron-history-prune` 03:55 / 7 days; `weekly-vacuum-full` Sundays 04:00). Logs at close: `reaper_runs` restarting from 0 (retention active), `cron.job_run_details` 0, `auth.audit_log_entries` 0; database 20 MB after a manual `VACUUM FULL` (was ~60 MB; `notifications` had been 16 MB with zero rows).
- **The gates that keep it so:** `retention-conformance.test.ts` (every `_log/_runs/_events/_history/_audit` table declared in the ownership manifest's `retention` section with a scheduled, active job or a "forever because …"); the integration teardown census covers every `@fringeisland.test` address except `walk-*` and `e2e-session@` (#610); the ES256 probe sweeps and censuses itself (#610). Migration checklist row 7 and the platform-tier rule say the same in words.
- **ADR-U053 — Proposed, merged (#613):** the test tier leaves the production database — a dedicated persistent test project, the gate rehearsed on test before production, a code fuse against the production ref, walks on a Preview deployment. **Stefan's ruling is open:** the plan and cost, Option A vs branching, the cutover date. The seed pre-flight is named in the ADR.
- **DB-4's live walk:** legs 1 (Steward note on rest/wake), 2 (admin suspend with reason → wall → bell → ANN-01 pane → reactivate), 3 (member suspension with reason on the account surface) and 7 (nomination in the bell) walked green; **legs 4 (bulk bar), 5 (preferences locked-on), 6 (journey pause/resume) and 8 (preserved threads) not walked** — the cast was torn down first. They need a fresh cast (`walk:cast create`) and, per ADR-U053, ideally the test project.
- `ferd.md` is still the placeholder — the Ferd close waits on it.

## Findings worth carrying

- **Leg 7 corrected the walk script, not the product.** "Assign role…" is a direct grant (no answer needed); "Hand over leadership" is the sole Steward's leave-and-nominate flow with FringeIsland as caretaker until a nominee accepts — Mona declined, so DeusEx held Harbour and was told it needed a permanent Steward. My leg text had said Bert stays Steward until acceptance; the platform behaved as FEAT-H017 specifies.
- **The residue the rules could not see was all outside the suite helpers:** the flake probe (delete errors ignored; consent RESTRICT refuses a bare `deleteUser`; census scoped to `test-*`), hand-made August accounts with no register, log tables born without retention, pg_cron's own history. Each is now either gated or scripted; the class itself only disappears with ADR-U053.
- **Root cause of the dead space is churn on production, not a vacuum fault:** `notifications` 444,950 inserts / 423,030 deletes lifetime; autovacuum ran 532 times. Postgres never returns file space without `VACUUM FULL`.
- **`get_own_notifications.category` is the category key, not the label** (PD021's pin corrected); **the admin's act reaches the Steward too** in the notice fan-out (a test-expectation lesson, not a product one).

## Not done — plainly

- **ADR-U053's ruling and cutover** — Stefan's (plan, cost, Option A vs B, date); then the adoption plan's five steps.
- **DB-4 walk legs 4, 5, 6, 8** — need a fresh cast; recommended on the test project once it exists.
- **The Ferd close** — `ferd.md` placeholder; the wave DoD walk has not started.
- **The E2E smoke job in CI** (TASK-E2E-04's recommendation) — still Stefan's ruling to take.
