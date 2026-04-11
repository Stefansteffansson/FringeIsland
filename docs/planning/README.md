# Planning

The **planning tree** describes **how** work gets done — the temporal, operational counterpart to the **ecosystem tree** (which describes **what** we are building). The single canonical process lives in [`PROCESS.md`](./PROCESS.md).

**Current wave:** Ferd

## Layout

- [`PROCESS.md`](./PROCESS.md) — canonical way of working (read this first)
- [`waves/`](./waves/) — strategic focus periods (Ferd → Eid → Hamn → Heim → Brim → Urd). Wave files **reference** features in the ecosystem tree; they don't contain features.
- [`cycles/`](./cycles/) — Shape Up betting cycles (2-3 weeks + cooldown)
- [`backlog/`](./backlog/) — work items and ephemeral task files
- [`sessions/`](./sessions/) — design and decision session bridges
- [`retrospectives/`](./retrospectives/) — cycle and wave retrospectives (permanent learning artifacts)
- [`reference/`](./reference/) — gap analyses, current-state snapshots, anatomy diagrams (FERD-CAPABILITY-MAP context, group model, etc.)

## Key principle

Features live in the ecosystem tree under their owner (e.g., `../products/hub/features/FEAT-H001-*.md`). Waves, cycles, and tasks **reference** those features — they never duplicate them.
