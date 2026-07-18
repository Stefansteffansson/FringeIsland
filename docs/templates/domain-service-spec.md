# Domain Service — {Service name} (DS-{N})

<!-- Valid service slugs: world-model | narrative | journeys | content | communication | discovery | intelligence -->

---
slug: {world-model | narrative | journeys | content | communication | discovery | intelligence}
owner: platform/domain/{slug}
consumers: [{products/hub} | {products/gimbal} | {studios/universe-studio/world-studio} | {studios/universe-studio/arc-studio} | {studios/universe-studio/journey-studio} | {platform/domain/<sibling-service>}]  # per ADR-U025 (no Game entity) and ADR-U026 (studios nested under universe-studio); sibling Domain Services may appear as Internal-API consumers
status: {proposed | active | stable | deprecated}
last_updated: YYYY-MM-DD
tier: Domain Services
tags: [domain-service:{slug}]
feature_prefix: PD  # FEAT-PD### for features owned by this service
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V6.svg`, ADR-U023). Revised when the service's boundaries, public contract, or dependencies change.*

### 1. Purpose

What this service is responsible for, in one paragraph. Bound it: what *is* this service's job, and what is *not*?

### 2. Concepts

The domain entities this service owns. Name them, define them, and note where each is persisted.

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| ... | ... | ... |

### 3. Public contract (consumed by Surfaces)

The operations this service exposes. For each: name, inputs, outputs, errors, auth requirements.

#### Operation: `{name}`
- **Purpose:** ...
- **Inputs:** ...
- **Outputs:** ...
- **Errors:** ...
- **Auth:** ...

### 4. Internal dependencies (consumed *from* this service)

What this service depends on. Allowed dependencies per ADR-U023: Platform Core (PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance) and other domain services below this one in the dependency rules.

- Platform Core: {PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance — which, and for what}
- Other domain services: {DS-N — for what}

### 5. Extension points

If this service exposes plugin contracts (step types, content renderers, etc.), document them here. Otherwise: "None."

| Extension point | Interface | Lifecycle |
|----------------|-----------|-----------|
| ... | ... | ... |

### 6. Storage & schema

Tables, columns, indexes, RLS posture. Reference migration files where applicable.

### 7. Open questions

L2-level questions still under design. Each is a candidate research spike or ADR.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the service enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

Each capability is placed under its internal owner within the service, with internal dependencies, external dependencies (capabilities consumed from other entities), and per-capability vertical impact named.

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

The **Vertical impact** column lists which of Administration / Privacy / Notifications / Observability / Transactions this capability touches, with one short phrase per vertical it touches. Verticals it doesn't touch are omitted from the cell. The rules each capability must satisfy per vertical live in the corresponding vertical's `SPECIFICATION.md` (§L3 Obligation inventory).

### Dependency chain

Prose or diagram showing the order in which capabilities become buildable. A capability that depends on another must wait for that dependency's capability inventory to be stable (and, eventually, for the dependency's feature spec to reach maturity 4-ready).

### External dependencies

Capabilities this service consumes from other entities. Each entry names the source entity, the capability consumed, and the consuming internal area. Cross-reference these entries against the source entity's own capability inventory; if the capability isn't there, surface as a boundary question.

### Sources-status block

The `ecosystem-decomposition` skill's prerequisite-check pause mechanic produces remarks when upstream thinking is inadequate but the author proceeds anyway. Record those remarks here — one line per remark, with the upstream gap and a cross-reference to `docs/ecosystem/how-we-work/gaps.md` (e.g., G-03 for scaffold vertical specs).

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| ... | FEAT-PD{NNN} | 0–6 | ... |

One row per feature spec. A capability with multiple feature specs has multiple rows. A capability with no spec gets a row with Feature spec = "—" and Maturity = "—".

### Capabilities without specs

Capabilities from §L3 that do not yet have a corresponding `FEAT-PD###.md` file. These are candidates for future L4 runs.

- {Capability name} — {short note on why not yet specified, if useful}

### Features without capabilities

If any `FEAT-PD###.md` files exist under this service's `features/` directory that do not map to a capability in §L3, they're listed here. This should normally be empty; a non-empty list is a signal of drift and surfaces as a reconciliation finding.

- {FEAT-PD###} — {short note}

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
