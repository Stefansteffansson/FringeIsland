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

**A-NTF (Notifications) is in flight** — N-A, N-B and N-C are built and closed; **N-D, the area's last cycle, opened 2026-07-26**. Live cycle files: `TASK-NC-01..06`. `TASK-NC-05` is deliberately still open — it carries the **owed ADR-U043 `/groups` before/after measurement**, which needs a deployed environment and an enforced-idle window.

Swept **2026-07-26** at the N-D boundary (instructed, ahead of the area retro): `TASK-NA-01..05`, `TASK-NB-01..05` — both cycles built, closed and merged (N-A 2026-07-23, N-B 2026-07-24), their learnings carried in their session bridges and feature Implementation notes. **`TASK-NC-01..06` and N-D's files are held for the A-NTF area retro**, following the A-COM precedent of one sweep line per area rather than per cycle. Only prose mentions of the swept ids remain (the completion plan's status history, `TASK-H017-01`, the session bridges) — no markdown links, so nothing broke.

Swept at the [A-COM area retro](../../retrospectives/retro-2026-07-22-communication-area.md) (2026-07-22), per the lifecycle above: `TASK-CA-01..06`, `TASK-CB-01..05`, `TASK-CC-01..06`, `TASK-CD-01..06`, `TASK-CE-01..05`, `TASK-CF-01..06` — and `TASK-JF-01..05`, which the [Journeys area retro](../../retrospectives/retro-2026-07-19-journeys-area.md) should have swept and missed. Earlier sweeps: TASK-JE-01..07 and TASK-JD-01..05 ([J-D retro](../../retrospectives/retro-2026-07-08-j-d.md)), TASK-JC-01..05 ([J-C retro](../../retrospectives/retro-2026-07-08-j-c.md)), TASK-JB-01..06 ([2026-07-08](../../retrospectives/retro-2026-07-08.md)), TASK-JA-01..09 ([2026-07-07](../../retrospectives/retro-2026-07-07.md)).

*Cycle-scoped ids (`TASK-{cycle}-NN`) — the numeric `TASK-{NNN}` counter has no live predecessor to continue from (tasks are deleted after each retro); cycle-scoped ids keep the retro traceable.*

## Standing tasks (not cycle-scoped, survive sweeps)

These carry across areas until done; they are deliberately **not** swept at a retro.

| Task | What | Raised | Triage 2026-07-26 (N-D boundary) |
|------|------|--------|----------------------------------|
| [TASK-MIST-01](./TASK-MIST-01-ghost-session-handling.md) | Ghost Mist sessions — a browser session outliving its erased subject | J-O3 area gate (live walk) | **carry (1st)** — still valid, still A-IDN-adjacent; no boundary pressure yet |
| [TASK-OBS-01](./TASK-OBS-01-telemetry-sink-and-analytics-posture.md) | Telemetry sink + analytics posture (A-ADM's tenant) | A-JRN | **BET — its gate has arrived** (see note) |
| [TASK-E2E-01](./TASK-E2E-01-profile-shared-session-flake.md) | profile.spec shared-session flake (the scope-global sign-out trap) | A-JRN | **carry (2nd)** — N-C found and fixed a real coalescing-timer leak in this area; watch for recurrence before spending more on it |
| [TASK-FORUM-01](./TASK-FORUM-01-reply-addressing-and-collapse.md) | Forum reply collapse + addressing; the depth-cap decision + its missing rationale | A-COM live walk (2026-07-22) | **carry (1st)** — needs a product decision, not engineering time |
| [TASK-INT-01](./TASK-INT-01-auth-admin-es256-flake.md) | Auth-admin ES256 flake — vendor-confirmed incident, held in `review` | A-NTF N-A | **carry, deliberately** — needs several clean days, not work |

### Third-carry rulings (PROCESS.md §3: bet, re-scope, or drop — never silently carried a third time)

**TASK-DOC-003 — BET, re-scoped by merger into TASK-DOC-005. ✅ The bet paid out: both DONE 2026-07-26 at the A-NTF area gate, as the single pass this ruling named.** The merger's premise held — the two docs were one job, and the pass found that `DOMAIN_ENTITIES.md` was not merely lagging but **actively asserting the superseded pre-U044 step model**, which is exactly the "wrong costs more than missing" failure this ruling refused to drop. DOC-005's blocked half also dissolved: ADR-U050's acceptance condition had been met on 2026-07-21 and only its status line lagged. Original ruling preserved below.

 Both are architecture-tier document refreshes chasing the same rot (`DOMAIN_ENTITIES.md` lags the Journeys substrate by five cycles; `ARCHITECTURE_ANATOMY.md` lags ADR-U049/U050). Neither has ever been the most valuable thing in a cycle, which is exactly why each was carried — separately they lose every prioritisation, together they are one coherent pass over the two docs the root `CLAUDE.md` document map points agents at. **Not a re-carry under a new name:** the bet is named to a boundary (the A-NTF area close, the next natural doc-health point) and DOC-003's third acceptance criterion — a freshness marker so the doc stops rotting silently — is the durable half and applies to both files. Dropping was considered and rejected: these two docs are *loaded by agents as orientation*, so their being wrong is more expensive than their being missing.

**TASK-OBS-01 — BET, because its gate has arrived rather than because it aged.** The task was never carried for lack of will; it is explicitly scoped to "the A-ADM (Platform-Ops) area-open design session", and that dependency was unmet at all three prior boundaries. **A-NTF N-D is the last cycle of the fifth Phase-3 area, so A-ADM is next** — the design session this task waits for is now the very next area open. Re-scoping would be wrong (the board it prepares is the right shape) and dropping would be wrong (the platform still "emits well but stores nowhere", and A-ADM's ADM-1 is the first consumer that ends that). Recorded so the A-ADM completion plan cites it at area open, per the task's own verification line.

**Closed, awaiting the next retro sweep:** [TASK-DOC-003](./TASK-DOC-003-domain-entities-journeys-refresh.md) + [TASK-DOC-005](./TASK-DOC-005-anatomy-refresh-u049-u050.md) — the merged architecture-doc pass, both `done` 2026-07-26 at the A-NTF area gate: `DOMAIN_ENTITIES.md` gained the step substrate, the response payload's privacy posture and a freshness marker (and had its superseded `content.steps[]` block demoted to labelled legacy); `ARCHITECTURE_ANATOMY.md` absorbed ADR-U050 on the PC-2 Identity row, **ADR-U050 was accepted** (its C-F gate had merged 2026-07-21 — only the status line lagged), and pointer integrity re-checked clean. · [TASK-DOC-004](./TASK-DOC-004-pc002-implementation-notes-backfill.md) — FEAT-PC002's Implementation notes backfilled 2026-07-25, plus the whole-tree sweep it asked for (62 `6-done` specs; PC002 was the only one missing notes). `TASK-DOC-006`, a re-filing of the same finding raised at the A-NTF N-B boundary, was **deleted as a duplicate** — the audit had re-found an already-open standing task. See DOC-004's Resolution section. · [TASK-INT-02](./TASK-INT-02-two-undiagnosed-integration-reds.md) — both N-C sweep reds diagnosed as stale assertions and fixed 2026-07-26; **neither was user-facing** (the `create_group_conversations` invariant holds, 0 missing of 416).
