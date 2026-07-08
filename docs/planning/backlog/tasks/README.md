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

## Active tasks

No active cycle tasks — Cycle J-E's task files land with its decomposition (after the J-O6 design session at this boundary).

The previous cycle's files (TASK-JD-01..05) were swept when [`retro-2026-07-08-j-d.md`](../../retrospectives/retro-2026-07-08-j-d.md) committed, per the lifecycle above (TASK-JC-01..05 swept at [`retro-2026-07-08-j-c.md`](../../retrospectives/retro-2026-07-08-j-c.md); TASK-JB-01..06 at [`retro-2026-07-08.md`](../../retrospectives/retro-2026-07-08.md); TASK-JA-01..09 at [`retro-2026-07-07.md`](../../retrospectives/retro-2026-07-07.md)).

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*
