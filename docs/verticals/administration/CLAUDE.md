# CLAUDE.md — V1: Administration

**Applies to:** anything under `docs/verticals/administration/` — the Administration `SPECIFICATION.md`, its `features/` subdirectory (currently empty; V-prefix features are sparse by design), and any Administration-specific checklist or tooling documentation.
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (verticals tier) → **this file** → [`SPECIFICATION.md`](./SPECIFICATION.md).
**Reads as a delta.** Assumes root and verticals-tier `CLAUDE.md` are already loaded. Contains only what's specific to authoring the Administration vertical spec.

---

## Status

Administration has no entity-specific authoring rules that diverge from the verticals tier. The vertical's obligation profile (audit logs, admin tooling, platform-exit, content moderation) shares the same authoring shape as the other operationally-defined verticals — locked-set discipline, tier-specificity, DoD feed, no blank slots, owned open questions, never-retired all apply without entity-specific extension. Two of the five verticals warrant substantive entity files (Privacy, Transactions); Administration is one of three that warrants a stub on this evidence.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../CLAUDE.md)). When Administration develops entity-specific authoring rules, this file becomes substantive. The trigger shapes currently observed are external regulatory regime, external vendor with concrete API surface, and tier-inexpressible discipline; other shapes may emerge.

---

## Where to go next

- **Feature ID prefix at this entity:** `V` (Verticals — shared across all five). See [`../README.md`](../README.md).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every verticals-tier rule applies here without restatement.
