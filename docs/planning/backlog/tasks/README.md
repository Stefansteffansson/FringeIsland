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

## Active tasks — Cycle J-B (Journeys: Player core)

| Task | Feature | Depends on | Status |
|---|---|---|---|
| [TASK-JB-01](./TASK-JB-01-pd003-red-first-integration-suite.md) — PD003 red-first integration suite | FEAT-PD003 | — | done (24 red 2026-07-07) |
| [TASK-JB-02](./TASK-JB-02-pd003-schema-gate-migration.md) — the ADR-U044 schema-gate migration (tables + registries + step migration + contracts) | FEAT-PD003 | JB-01 | done (gate nodded 2026-07-07, applied, 61/61 + sweep green) |
| [TASK-JB-03](./TASK-JB-03-h020-player-bff-and-client.md) — player BFF routes + session-cache client | FEAT-H020 | JB-02 | done (28/28 + conformance clean) |
| [TASK-JB-04](./TASK-JB-04-h020-player-page-boot-resume-nav.md) — player page: boot, resume, linear nav | FEAT-H020 | JB-03 | done (36 new tests; unit project 558/558) |
| [TASK-JB-05](./TASK-JB-05-h020-kind-renderers-completion-gating.md) — kind renderers + completion/gating UX | FEAT-H020 | JB-04 | done (36 in scope; unit 578/578) |
| [TASK-JB-06](./TASK-JB-06-h020-e2e-perf-close-out.md) — E2E + perf DoD + 6-done close-out | FEAT-H020 | JB-04, JB-05 | todo |

The previous cycle's files (TASK-JA-01..09) were swept when [`retro-2026-07-07.md`](../../retrospectives/retro-2026-07-07.md) committed, per the lifecycle above.

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*
