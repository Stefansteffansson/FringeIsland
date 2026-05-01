# CLAUDE.md — Universe Studio

**Applies to:** anything under `docs/studios/universe-studio/` and the corresponding code (the Universe Studio authoring + management surface, when it enters active development).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (studios tier) → **this file** → [`README.md`](./README.md) → the feature spec.
**Reads as a delta.** Assumes root and studios-tier `CLAUDE.md` are already loaded. Contains only what's specific to Universe Studio.

---

## Status

Universe Studio has no entity-specific rules locked yet. It is scoped from the Eid wave onward and is not in active development before then; `DESCRIPTION.md` and `SPECIFICATION.md` are unwritten. Until those exist and surface entity-specific gotchas, technical-stack details, or tooling instantiations, every applicable rule lives at the studios-tier file ([`../CLAUDE.md`](../CLAUDE.md)) — including the one-Studio-one-Domain-Service constraint (Universe Studio writes to World Model, DS-1), the full-lifecycle requirement (design → deploy → manage → retire), and the cross-Studio reference direction.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../CLAUDE.md)). When Universe Studio enters active development and its first entity-specific rule surfaces, this file becomes substantive.

---

## Where to go next

- **Feature ID prefix at this entity:** `US` (Universe Studio). See [`README.md`](./README.md) and [`features/`](./features/).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every studios-tier rule applies here without restatement.
