# Session bridge — 2026-09-01: next-session brief — suite teardown + governance-catalog audit (TASK-DBT-03)

**Continuation of `2026-09-01_01`** (the H048 + EDT-01 live walk, all green). Stefan directed: prepare the bridge so a fresh session can start clean. This bridge IS the preparation.

## Live state (verified this session — cite, don't re-derive)

- **FEAT-H048** (wielded announcements) and **TASK-EDT-01** (unlimited own edit/delete, "(edited)" + 3-min grace) are `6-done`, merged (#573, #575), **and live-walked green on 2026-09-01** — every leg plus the reply-under-tombstone and role-power-retract sights. No product defects. The walk record is `2026-09-01_01`.
- The acting family is complete on both sides (platform PD019 T1/T2/T2R/T3; surfaces H046/H047/H048). Main = discovery, clean.

## The task

**[TASK-DBT-03](../backlog/tasks/TASK-DBT-03-pc025-suite-teardown-leak.md)** — the PC025/RD-* admin suites' teardown + the governance-catalog audit checklist. Small, mechanical, no rulings owed, no schema → fuller-auto merge. The task file carries the full disposition history (the 2026-08-19 leaked clone, walked through the house contracts; RD-4a's designed refusal).

## What the build consumes

- **The two debts, from the task file:** (1) `tests/integration/admin/role-template-editing.test.ts` — afterAll must retire + unpublish + delete its clones and synthetic group templates **even on mid-run failure**; the sharpened stake is that an OFFERED clone is permanently undeletable on leak (RD-4a), so every leaked run adds a forever-row to the production catalog. (2) The debris-audit sweep must add the governance catalogs: `role_templates` (is_system=false), `role_template_versions/publications`, `group_templates` beyond the seeded four.
- **Fresh evidence (2026-08-21, this session pair):** an accidental un-in-banded `npx jest` run left residue the `[integration-teardown]` sweep caught — 31 accounts, 1 Mist, 2 personal + 2 engagement groups, 1 test journey, 144 notifications, 110 audit rows, 8 subject-less consent rows, tagged "A suite is not cleaning up after itself." That log line is the checklist's starting inventory of leak classes; the governance catalogs are the class it provably misses.
- **Where the sweep lives:** the global integration teardown (grep `integration-teardown` under `hub/tests/`) — extend it, don't fork it.
- **Pattern for teardown-on-failure:** afterAll runs regardless of cell failures, but partial fixtures need guarded cleanup (delete-if-exists by run tag; the suites already tag runs `pc025<random>`). The elevation pattern for cleanup is the suites' own `makePlatformAdmin` + immediate demotion (used and verified in the 2026-08-19 disposition).

## Environment notes for the fresh session

- **One database** (memory `one-database-prod-equals-dev`) — every leaked row is a production row; that is the entire point of this task.
- **Unit tier is `npm run test:unit`** — a bare `jest` runs BOTH projects un-in-banded (memory `bare-jest-runs-both-projects`; the 241-red instance). Integration slices are the named in-band scripts only; check for sibling sessions first (AGENTS.md one-consumer rule).
- Walk cast (Wanda/Bert/Mona + Harbour/Riverside) stands ready, passwords rotated 2026-08-21 in-session (never committed — re-rotate via an admin-API reset script if needed). Walk residue is deliberate fixture history (see `2026-09-01_01`).
- Dev server on :3000 was healthy at session close; if adopting a survivor, probe an on-demand-compiled route for a clean 401 first (memory `taskstop-dev-server-epipe`, incl. the `E2E_BASE_URL`/`next start -p 3001` sidestep).
- Script probes as walk users end with `signOut({ scope: 'local' })` or none (memory `probe-signout-global-bounce`).

## The rest of the board (after DBT-03)

- The **ADR-U039 topic-channel rider** (recorded, unscheduled) — the standard-shaped future for conversation hints.
- **DM/conversation message editing** — open question, deliberately unpulled (EDT-01's ruling named forum posts only; DMs have no editing today).
- **beppe.hopper reaps ~2026-09-14 by design** — about two weeks out; nothing to do, just don't mistake the reap for a bug when it fires.
- TASK-DBT-01 / DBT-02 remain in the backlog at their own priorities.
