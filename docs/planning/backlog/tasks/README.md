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

**None.** No cycle is in flight — the Communication area (A-COM) closed at its gate on 2026-07-22 and Notifications (A-NTF) has not opened. Cycle task files land here when A-NTF's first cycle is scoped.

Swept at the [A-COM area retro](../../retrospectives/retro-2026-07-22-communication-area.md) (2026-07-22), per the lifecycle above: `TASK-CA-01..06`, `TASK-CB-01..05`, `TASK-CC-01..06`, `TASK-CD-01..06`, `TASK-CE-01..05`, `TASK-CF-01..06` — and `TASK-JF-01..05`, which the [Journeys area retro](../../retrospectives/retro-2026-07-19-journeys-area.md) should have swept and missed. Earlier sweeps: TASK-JE-01..07 and TASK-JD-01..05 ([J-D retro](../../retrospectives/retro-2026-07-08-j-d.md)), TASK-JC-01..05 ([J-C retro](../../retrospectives/retro-2026-07-08-j-c.md)), TASK-JB-01..06 ([2026-07-08](../../retrospectives/retro-2026-07-08.md)), TASK-JA-01..09 ([2026-07-07](../../retrospectives/retro-2026-07-07.md)).

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*

## Standing tasks (not cycle-scoped, survive sweeps)

These carry across areas until done; they are deliberately **not** swept at a retro.

| Task | What | Raised |
|------|------|--------|
| [TASK-MIST-01](./TASK-MIST-01-ghost-session-handling.md) | Ghost Mist sessions — a browser session outliving its erased subject | J-O3 area gate (live walk) |
| [TASK-DOC-003](./TASK-DOC-003-domain-entities-journeys-refresh.md) | DOMAIN_ENTITIES refresh for the Journeys substrate | A-JRN doc health |
| [TASK-DOC-005](./TASK-DOC-005-anatomy-refresh-u049-u050.md) | Anatomy pair refresh through ADR-U050; move the stamp | A-COM doc health (2026-07-22) |
| [TASK-OBS-01](./TASK-OBS-01-telemetry-sink-and-analytics-posture.md) | Telemetry sink + analytics posture (A-ADM's tenant) | A-JRN |
| [TASK-E2E-01](./TASK-E2E-01-profile-shared-session-flake.md) | profile.spec shared-session flake (the scope-global sign-out trap) | A-JRN |
| [TASK-FORUM-01](./TASK-FORUM-01-reply-addressing-and-collapse.md) | Forum reply collapse + addressing; the depth-cap decision + its missing rationale | A-COM live walk (2026-07-22) |

**Closed, awaiting the next retro sweep:** [TASK-DOC-004](./TASK-DOC-004-pc002-implementation-notes-backfill.md) — FEAT-PC002's Implementation notes backfilled 2026-07-25, plus the whole-tree sweep it asked for (62 `6-done` specs; PC002 was the only one missing notes). `TASK-DOC-006`, a re-filing of the same finding raised at the A-NTF N-B boundary, was **deleted as a duplicate** — the audit had re-found an already-open standing task. See DOC-004's Resolution section.
