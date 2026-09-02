# Session bridge — 2026-09-02: TASK-DBT-03 done — the suite cleans by token through the house contracts; the sweep learns the governance catalogs

**Continuation of `2026-09-01_02`** (the next-session brief). Stefan opened with "let's get going with DBT-03"; the session ran fuller-auto (tests + planning docs only — no schema, no core, no steering files).

## Live state (verified this session — cite, don't re-derive)

- **TASK-DBT-03 is `done`** (both parts). The disposition with the full evidence is in the task file: [`TASK-DBT-03`](../backlog/tasks/TASK-DBT-03-pc025-suite-teardown-leak.md).
- **The production catalog is clean**: 0 non-system role templates, the seeded four group templates only (Small Team / Large Group / Organization / Learning Cohort — `is_system` false on all four), 0 publications. **The 2026-08-19 scar row (`pc025xmsq8d0lb Steward Clone`) is gone** — removed by the new sweep during this session's green run, as designed (see "Stated plainly" below).
- Discovery worktree: clean and level with main at session start; re-synced at close.

## What was built

**Why 2026-08-19 leaked, read from the code, not assumed:** `role_templates` has no delete trigger and every child cascades, so the old afterAll's data-level delete would have worked *had it run*. The run died mid-cell (3 versions = between S5's v3 and v4; the synthetic gt still linked) — an afterAll that never runs cleans nothing. Its three latent defects were real anyway: id-dependence, a data-level bypass of a house-created clone, and `.catch(() => undefined)` on every step.

1. **The PC025 editing suite's afterAll** (`hub/tests/integration/admin/role-template-editing.test.ts`) — every class found **by run token**; groups first (RD-4a's adopter clause); synthetic group templates data-level (symmetric with creation); the clone **retire → unpublish → delete through the house contracts** as the elevated DeusEx fixture (the offer was a data-level platform-wide INSERT with no `role_template.publish` audit row, so after the house unpublish the house delete is permitted — no bypass needed); each step names its own failure; residue counted by class and said out loud, not thrown; demotion and accounts last, each guarded. **Labelled: hardening, not red-first.**
2. **The global integration teardown** (`hub/tests/integration/global-teardown.ts`, extended not forked) — four **fixture classes** (convention-named non-system role templates, their versions and publications, non-seeded convention-named group templates: swept after the group deletes, only with no surviving adopter, children cascading) and three **note classes** (non-system templates and group templates *outside* the convention, publications of seeded templates whose publisher is gone: a `Catalog note` line once per run, never swept, never in the residue sum). Discriminator: the run-token name convention the suites already carry, `^(pc0[0-9]{2}x[0-9a-z]+|RD-A|RDB)( |$)` — the same species as `test-%@fringeisland.test`, because the catalog has no structural fixture marker. Exports for the suite: `read`, `sweepGovernanceCatalogs`, `FIXTURE_CATALOG_NAME_RE`, `SEEDED_GROUP_TEMPLATE_NAMES`.
3. **The red-first suite** `hub/tests/integration/platform/integration-teardown-governance-catalogs.test.ts` — the leaked shape reproduced data-level + an adopted control (a real personal group carrying a copy) + a hand-made control outside the convention. **Red 3/3 at head** (`read`/`sweepGovernanceCatalogs` not functions, regex undefined — and the head teardown printed "Clean" over that run). **Green 3/3.** The convention is evaluated **in Postgres**, against every shape the four catalog-writing suites use, a seeded name and a near-miss.

## Evidence (all this session, one DB consumer at a time)

| Run | Result | Teardown said |
|---|---|---|
| New suite at head | 3/3 red, stated reasons | `Clean` (the blind spot) |
| New suite after | 3/3 green | `Clean` |
| Editing suite, full | **17/17**, 52 s, no `[pc025-teardown] … failed` | `Clean`, 26 trail rows |
| Editing suite, `-t S2a` only (mid-run-failure path) with a planted probe leak (`pc025xdbt03probe` clone + version + platform-wide publication + linked gt) and a hand-made control | 1 passed / 16 skipped; the clone cleaned by token through the house path | `Catalog note … 1 non-system role templates … outside the convention` then `Swept residue … 1 fixture role templates (1 versions, 1 publications), 1 fixture group templates` — the spliced DO block ran; the control survived and was removed by hand after |

Lint 0 on the three files; `tsc --noEmit` 0 errors in them (the test tree carries ~1 100 pre-existing type errors ts-jest never sees — found, not caused, untouched). Root `CHANGELOG.md` entry written; not Hub-visible, not Core substrate, so the other two owe nothing.

## Stated plainly (assumptions Stefan can veto)

- **The 2026-08-19 scar row was deleted by the sweep.** It matched the convention, had no adopter, and its "was offered" memory lived in a data-level publication row plus an audit trail the same sweep already clears. It was the accepted leftover of a *ruled full cleanup* the house contract refused — the sweep finishing that cleanup is the intended behaviour. If a retired fixture template should ever be preserved as history, the sweep's adopter guard is the place to widen.
- **The sweep never hard-deletes a non-system template outside the convention.** A hand-made template on `/admin/roles` is safe from it and shows as a note each run. A new catalog-writing suite must name inside the convention or extend the regex (the new suite pins the shapes).
- **Not a cycle boundary; no cross-cutting change** — `doc-health-check` not run. Dashboard refreshed at close.

## The rest of the board (unchanged from `2026-09-01_02`)

- The **ADR-U039 topic-channel rider** (recorded, unscheduled).
- **DM/conversation message editing** — open question, deliberately unpulled.
- **beppe.hopper reaps ~2026-09-14 by design** — not a bug when it fires.
- TASK-DBT-01 / DBT-02 remain in the backlog at their own priorities.
