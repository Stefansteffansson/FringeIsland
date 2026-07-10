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

**Cycle J-E** (The onboarding arc — FEAT-PD006 + FEAT-H023, plus the FEAT-H011 retrofit rider):

| Task | What | Feature | Depends on |
|------|------|---------|------------|
| [TASK-JE-01](./TASK-JE-01.md) | PD006 schema + contracts migration (designation, Mist-scoped gate, `get_onboarding_status`) — **schema gate: ends at `review`** | FEAT-PD006 | — |
| [TASK-JE-02](./TASK-JE-02.md) | Seed the placeholder onboarding journey (native steps + takeaway payloads) | FEAT-PD006 | JE-01 |
| [TASK-JE-03](./TASK-JE-03.md) | JRN-5 carry-over + ADR-U031 ephemerality proofs | FEAT-PD006 | JE-01, JE-02 |
| [TASK-JE-04](./TASK-JE-04.md) | H023 arrival orchestration (overview-bundle slice + post-paint auto-launch) | FEAT-H023 | JE-01, JE-02 |
| [TASK-JE-05](./TASK-JE-05.md) | H023 never-a-wall + post-transcendence resume + E2E proofs | FEAT-H023 | JE-04 |
| [TASK-JE-06](./TASK-JE-06.md) | FEAT-H011 Journal retrofit: session cache + skeleton (B4/B6; revision note — 6-done spec touch) | FEAT-H011 | — |
| [TASK-JE-07](./TASK-JE-07.md) | Deep-cold spot measurement of the arrival path (pre-6-done gate) | FEAT-H023 | JE-05 |

The previous cycle's files (TASK-JD-01..05) were swept when [`retro-2026-07-08-j-d.md`](../../retrospectives/retro-2026-07-08-j-d.md) committed, per the lifecycle above (TASK-JC-01..05 swept at [`retro-2026-07-08-j-c.md`](../../retrospectives/retro-2026-07-08-j-c.md); TASK-JB-01..06 at [`retro-2026-07-08.md`](../../retrospectives/retro-2026-07-08.md); TASK-JA-01..09 at [`retro-2026-07-07.md`](../../retrospectives/retro-2026-07-07.md)).

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*
