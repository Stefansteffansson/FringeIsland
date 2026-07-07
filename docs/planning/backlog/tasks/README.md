# Tasks

Individual task files with YAML frontmatter. Each task is a standalone work instruction assigned to a person or agent.

**Template:** [`../../../templates/task.md`](../../../templates/task.md)
**Naming:** `TASK-{NNN}.md` (e.g., `TASK-001.md`)

## Rules

- Tasks are created **only for features at maturity `4-ready` or higher**. Do NOT create tasks for features still being specified.
- One task = one focused agent session. If more than a day, split it.
- Each task references its parent feature in frontmatter (`feature: FEAT-{PREFIX}{NNN}`).

## Lifecycle

`created → in_progress → review → done → survives cooldown/retro → deleted after retrospective committed`

The retrospective is the permanent learning artifact; individual tasks are ephemeral and deleted once the retro captures their learnings.

## Active tasks — Cycle J-A (Journeys: catalogue & enrolment)

| Task | Feature | Depends on | Status |
|---|---|---|---|
| [TASK-JA-01](./TASK-JA-01-pd002-red-first-integration-suite.md) — PD002 red-first integration suite | FEAT-PD002 | — | done |
| [TASK-JA-02](./TASK-JA-02-pd002-pc016-schema-gate-migration.md) — the schema-gate migration (six contracts + PC016 rider + write-narrowing) | FEAT-PD002 | JA-01, JA-03 | review (schema gate) |
| [TASK-JA-03](./TASK-JA-03-pc016-red-first-tests.md) — PC016 red-first tests | FEAT-PC016 | — | done |
| [TASK-JA-04](./TASK-JA-04-pc016-leadership-thins.md) — leadership.ts thins to a consumer | FEAT-PC016 | JA-02 | done |
| [TASK-JA-05](./TASK-JA-05-h019-bff-routes-and-client-lib.md) — BFF routes + journeys client lib | FEAT-H019 | JA-02 | done |
| [TASK-JA-06](./TASK-JA-06-h019-catalogue-page.md) — /journeys catalogue page | FEAT-H019 | JA-05 | done |
| [TASK-JA-07](./TASK-JA-07-h019-detail-page-enrolment-block.md) — /journeys/[id] detail + enrolment block | FEAT-H019 | JA-05 | in_progress (viewer-block amendment at the gate) |
| [TASK-JA-08](./TASK-JA-08-h019-group-detail-summary-slice.md) — group-detail enrolment-summary slice | FEAT-H019 | JA-02 | done |
| [TASK-JA-09](./TASK-JA-09-h019-e2e-perf-close-out.md) — E2E + perf DoD + type gate + 6-done close-out | FEAT-H019 | JA-04, JA-06, JA-07, JA-08 | todo |

*Cycle-scoped ids (`TASK-JA-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*
