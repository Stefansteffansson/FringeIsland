# CLAUDE.md — Journey Studio

**Applies to:** anything under `docs/studios/universe-studio/journey-studio/` and the corresponding code (the Journey Studio authoring + management surface, when it enters active development). Journey Studio is a child of Universe Studio (ADR-U026), gated by the Wayfinder specialisation.
**Load order:** root [`CLAUDE.md`](../../../../CLAUDE.md) → [`AGENTS.md`](../../../../AGENTS.md) → [`PROCESS.md`](../../../planning/PROCESS.md) → the skill matching the task → [`../../CLAUDE.md`](../../CLAUDE.md) (studios tier) → [`../CLAUDE.md`](../CLAUDE.md) (Universe Studio parent) → **this file** → [`README.md`](./README.md) → the feature spec.
**Reads as a delta.** Assumes root, studios-tier, and Universe-Studio-parent `CLAUDE.md` are already loaded. Contains only what's specific to Journey Studio.

---

## Status

Journey Studio has no entity-specific rules locked yet beyond its identity: a role-gated authoring mode (gate: Wayfinder), child of Universe Studio (ADR-U026), authoring journeys — alone / pairs / group — which declare their required equipment at authoring time (ADR-U025). It is scoped from the Eid wave onward and is not in active development before then; `DESCRIPTION.md` and `SPECIFICATION.md` are unwritten. Until those exist and surface entity-specific gotchas, technical-stack details, or tooling instantiations, every applicable rule lives at the studios-tier file ([`../../CLAUDE.md`](../../CLAUDE.md)) and the parent file ([`../CLAUDE.md`](../CLAUDE.md)) — including the one-sub-studio-one-Domain-Service constraint (Journey Studio writes to Experience Engine, DS-3), the full-lifecycle requirement (design → deploy → manage → retire), and the cross-Studio reference direction.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../../CLAUDE.md)). When Journey Studio enters active development and its first entity-specific rule surfaces, this file becomes substantive.

---

## Where to go next

- **Feature ID prefix at this entity:** `JS` (Journey Studio). See [`README.md`](./README.md) and [`features/`](./features/).
- **Tier file (read first per load order):** [`../../CLAUDE.md`](../../CLAUDE.md) — every studios-tier rule applies here without restatement.
- **Parent file:** [`../CLAUDE.md`](../CLAUDE.md) (Universe Studio — the binding frame; coherence rules live there).
