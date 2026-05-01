# CLAUDE.md — V4: Observability

**Applies to:** anything under `docs/verticals/observability/` — the Observability `SPECIFICATION.md`, its `features/` subdirectory (currently empty; V-prefix features are sparse by design), and any Observability-specific checklist or tooling documentation.
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (verticals tier) → **this file** → [`SPECIFICATION.md`](./SPECIFICATION.md).
**Reads as a delta.** Assumes root and verticals-tier `CLAUDE.md` are already loaded. Contains only what's specific to authoring the Observability vertical spec.

---

## Status

Observability has no entity-specific authoring rules that diverge from the verticals tier. The vertical's obligation profile (logs, metrics, tracing, audit log, error reporting, dashboards, on-call posture) shares the same authoring shape as the other operationally-defined verticals — locked-set discipline, tier-specificity, DoD feed, no blank slots, owned open questions, never-retired all apply without entity-specific extension. Two of the five verticals warrant substantive entity files (Privacy, Transactions); Observability is one of three that warrants a stub on this evidence.

This file exists so the agent-context cascade has a stub at every active-entity directory (per the five-row content policy in root [`CLAUDE.md`](../../../CLAUDE.md)). When Observability develops entity-specific authoring rules, this file becomes substantive. The trigger shapes currently observed are external regulatory regime, external vendor with concrete API surface, and tier-inexpressible discipline; other shapes may emerge.

---

## Where to go next

- **Feature ID prefix at this entity:** `V` (Verticals — shared across all five). See [`../README.md`](../README.md).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every verticals-tier rule applies here without restatement. The tier file's canonical example for tier-specific obligation shape ("each operation emits a log entry at the appropriate level, increments a metric for count + duration, writes an audit-log entry for every security-relevant action") is drawn from this vertical's `SPECIFICATION.md` §6 because Observability is the cleanest illustration of the generic tier-obligation pattern, not because it carries entity-specific authoring discipline.
