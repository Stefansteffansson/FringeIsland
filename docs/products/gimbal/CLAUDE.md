# CLAUDE.md — The Gimbal

**Applies to:** anything under `docs/products/gimbal/` and the corresponding code (the planned native iOS and native Android applications, when they enter active development).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (products tier) → **this file** → [`README.md`](./README.md) → the feature spec.
**Reads as a delta.** Assumes root and products-tier `CLAUDE.md` are already loaded. Contains only what's specific to The Gimbal.

---

## Status

The Gimbal has no entity-specific rules locked yet. It is planned but not in active development — Ferd-wave focus is The Hub — and `DESCRIPTION.md` and `SPECIFICATION.md` are unwritten. Until those exist and surface entity-specific gotchas, technical-stack details, or tooling instantiations, every applicable rule lives at the products-tier file ([`../CLAUDE.md`](../CLAUDE.md)) — including API-first, cross-product-by-default, paired-spec discipline, and permission resolution via `has_permission()`.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../CLAUDE.md)). When The Gimbal enters active development and its first entity-specific rule surfaces, this file becomes substantive.

Sub-entity `CLAUDE.md` files for [`ios/`](./ios/) and [`android/`](./android/) were considered and deferred per cascade-plan Decision 2's opt-in-by-divergence principle — there is no Gimbal codebase, no specification, and nothing to diverge from yet. Revisit when Gimbal's L2 specification is written or first iOS/Android code lands, whichever is sooner.

---

## Where to go next

- **Feature ID prefix at this entity:** `G` (Gimbal). See [`README.md`](./README.md) and [`features/`](./features/).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every products-tier rule applies here without restatement.
