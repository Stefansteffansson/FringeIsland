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

## Active tasks — Cycle J-C (Journeys: Completion & review)

| Task | Feature | Depends on | Status |
|---|---|---|---|
| [TASK-JC-01](./TASK-JC-01-pd004-red-first-integration-suite.md) — PD004 red-first integration suite | FEAT-PD004 | — | done (23 tests: 17 red verified, 6 pins green, 2026-07-08) |
| [TASK-JC-02](./TASK-JC-02-pd004-completion-contracts-migration.md) — completion/timing contracts migration (schema gate) | FEAT-PD004 | JC-01 | review (held at the gate) |
| [TASK-JC-03](./TASK-JC-03-h021-completion-moment-and-types.md) — completion moment + payload types | FEAT-H021 | JC-02 | todo |
| [TASK-JC-04](./TASK-JC-04-h021-review-mode-timing-entry-points.md) — review mode + timing + entry affordances | FEAT-H021 | JC-03 | todo |
| [TASK-JC-05](./TASK-JC-05-h021-e2e-perf-close-out.md) — E2E + perf DoD + 6-done close-out | FEAT-H021 | JC-03, JC-04 | todo |

The previous cycle's files (TASK-JB-01..06) were swept when [`retro-2026-07-08.md`](../../retrospectives/retro-2026-07-08.md) committed, per the lifecycle above (TASK-JA-01..09 swept at [`retro-2026-07-07.md`](../../retrospectives/retro-2026-07-07.md)).

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*
