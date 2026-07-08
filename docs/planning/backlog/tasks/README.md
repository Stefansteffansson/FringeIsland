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

## Active tasks — Cycle J-D (Journeys: Group progress & frozen mode)

| Task | Feature | Depends on | Status |
|---|---|---|---|
| [TASK-JD-01](./TASK-JD-01-pd005-red-first-integration-suite.md) — PD005 red-first integration suite (freeze re-verification + progress/consent contracts) | FEAT-PD005 | — | done (27 tests: 15 red verified / 12 pins incl. Q8 both-ways; 27/27 post-apply; 2026-07-08) |
| [TASK-JD-02](./TASK-JD-02-pd005-contracts-migration-schema-gate.md) — PD005 contracts migration (schema gate, Q1–Q9 board) | FEAT-PD005 | JD-01 | done (gate nodded "yes"; applied + rider `20260708190000` nodded separately; sweep 419/419; PR #143) |
| [TASK-JD-03](./TASK-JD-03-h022-frozen-read-only-mode.md) — H022 frozen read-only mode (JRN-14) | FEAT-H022 | JD-02 | review (built red-first; unit 656/656, build + lint green; E2E pending) |
| [TASK-JD-04](./TASK-JD-04-h022-sharing-toggle-group-progress-panel.md) — H022 sharing toggle + group progress panel (JRN-16/17) | FEAT-H022 | JD-02 | review (built red-first; unit 656/656, build + lint green; E2E pending) |
| [TASK-JD-05](./TASK-JD-05-h022-e2e-perf-close-out.md) — H022 E2E + perf DoD + 6-done close-out | FEAT-H022 | JD-03, JD-04 | todo |

The previous cycle's files (TASK-JC-01..05) were swept when [`retro-2026-07-08-j-c.md`](../../retrospectives/retro-2026-07-08-j-c.md) committed, per the lifecycle above (TASK-JB-01..06 swept at [`retro-2026-07-08.md`](../../retrospectives/retro-2026-07-08.md); TASK-JA-01..09 at [`retro-2026-07-07.md`](../../retrospectives/retro-2026-07-07.md)).

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*
