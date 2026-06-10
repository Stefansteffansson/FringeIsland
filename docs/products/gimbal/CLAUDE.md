# CLAUDE.md — The Gimbal

**Applies to:** anything under `docs/products/gimbal/` and the corresponding code (the planned native iOS and native Android builds of the one Gimbal surface, when they enter active development). The Gimbal is **the senses surface** — the equipment profile built on camera, LiDAR, GPS, mic, AR, and portability (ADR-U025).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (products tier) → **this file** → [`README.md`](./README.md) → the feature spec.
**Reads as a delta.** Assumes root and products-tier `CLAUDE.md` are already loaded. Contains only what's specific to The Gimbal.

---

## Status

The Gimbal has no entity-specific rules locked yet. It is planned but not in active development — Ferd-wave focus is The Hub — and `DESCRIPTION.md` and `SPECIFICATION.md` are unwritten. Until those exist and surface entity-specific gotchas, technical-stack details, or tooling instantiations, every applicable rule lives at the products-tier file ([`../CLAUDE.md`](../CLAUDE.md)) — including API-first, equipment-keyed feature placement (ADR-U025), paired-spec discipline, and permission resolution via `has_permission()`.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../CLAUDE.md)). When The Gimbal enters active development and its first entity-specific rule surfaces, this file becomes substantive.

There are no `ios/` or `android/` sub-entities (ADR-U025): devices are points in equipment space, not entities. Native iOS and native Android are shipping targets of the one Gimbal surface; per-target toolchain particulars, if they ever diverge sharply, would be an opt-in-by-divergence decision at that time.

---

## Where to go next

- **Feature ID prefix at this entity:** `G` (Gimbal). See [`README.md`](./README.md) and [`features/`](./features/).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every products-tier rule applies here without restatement.
