# CLAUDE.md — The Game

**Applies to:** anything under `docs/products/game/` and the corresponding code (when The Game's scope is decided and the entity enters active development).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (products tier) → **this file** → [`README.md`](./README.md) → the feature spec.
**Reads as a delta.** Assumes root and products-tier `CLAUDE.md` are already loaded. Contains only what's specific to The Game.

---

## Status

The Game has no entity-specific rules locked yet. Its scope is TBD; `DESCRIPTION.md` and `SPECIFICATION.md` are unwritten. Until those exist and surface entity-specific gotchas, technical-stack details, or tooling instantiations, every applicable rule lives at the products-tier file ([`../CLAUDE.md`](../CLAUDE.md)) — including API-first, cross-product-by-default, paired-spec discipline, and permission resolution via `has_permission()`.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../CLAUDE.md)). When The Game's scope is decided and the entity enters active development, this file becomes substantive.

---

## Where to go next

- **Feature ID prefix at this entity:** `GM` (Game). See [`README.md`](./README.md) and [`features/`](./features/).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every products-tier rule applies here without restatement.
