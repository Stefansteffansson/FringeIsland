# CLAUDE.md — Universe Studio (parent entity)

**Applies to:** anything under `docs/studios/universe-studio/` that is not owned by a child studio — the umbrella / binding-frame level (ADR-U026).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (studios tier) → **this file** → the child studio's `CLAUDE.md` (when working in [`world-studio/`](./world-studio/), [`arc-studio/`](./arc-studio/), or [`journey-studio/`](./journey-studio/)) → the owning `README.md` → the feature spec.
**Reads as a delta.** Assumes root and studios-tier `CLAUDE.md` are already loaded. Contains only what's specific to the Universe Studio parent level.

---

## Parent-entity rules

- **Universe Studio is the parent of World Studio, Arc Studio, and Journey Studio** (ADR-U026). It is both the umbrella and the **binding frame**: coherence across worldbuilding, narrative, and journeys is held at this level. It is not a fourth sibling, and it excludes none of the three.
- **What belongs at this level:** cross-studio coherence rules, shared authoring conventions, canon-consistency constraints that bind all three children, and umbrella-level features (prefix `US`).
- **What belongs in a child:** anything specific to one studio — its Domain Service write target, its role gate, its equipment keying, its content types. If a rule names only one child studio, it moves down to that child's `CLAUDE.md`.
- **The parent writes to no Domain Service.** Each child writes to exactly one (World Studio → DS-1 World Model; Arc Studio → DS-2 Narrative; Journey Studio → DS-3 Experience Engine), per the studios-tier file.
- **Prefix discipline:** `US` is for umbrella-level (binding-frame) features only. Never file a child-studio feature under `US` — use `WS`, `AS`, or `JS`.

`DESCRIPTION.md` and `SPECIFICATION.md` are unwritten; the umbrella is scoped from the Eid wave onward. Until entity-specific gotchas or stack details surface, every other applicable rule lives at the studios-tier file ([`../CLAUDE.md`](../CLAUDE.md)).

---

## Where to go next

- **Children:** [`world-studio/CLAUDE.md`](./world-studio/CLAUDE.md) · [`arc-studio/CLAUDE.md`](./arc-studio/CLAUDE.md) · [`journey-studio/CLAUDE.md`](./journey-studio/CLAUDE.md).
- **Feature ID prefix at this level:** `US` (umbrella only). See [`README.md`](./README.md) and [`features/`](./features/).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every studios-tier rule applies here without restatement.
