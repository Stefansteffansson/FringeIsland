# {Product name} — Specification

---
slug: {hub | gimbal}
owner: products/{slug}
status: {draft | active | frozen}
last_updated: YYYY-MM-DD
tier: Surfaces
tags: [product:{slug}]
feature_prefix: {H | G}  # H=Hub, G=Gimbal — shell features only (ADR-U025); used for FEAT-*.md file naming
---

> The inward-facing build spec for a product surface. For developers who need to know how the thing actually works, what it depends on, and what its contracts are. Identity and "why" live in `DESCRIPTION.md` — don't repeat them here. Companion files: `DESCRIPTION.md` (outward-facing), `ROADMAP.md`.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy. Revised when the entity's boundaries, technical surface, or architectural position change.*

### 1. Surface

- **Shipping targets:** {Next.js web · iOS native · Android native · ...} — shipping targets of the one surface; devices are points in equipment space, not entities (ADR-U025)
- **Repo location:** {paths within the monorepo, or external repo URL}
- **Build / deploy pipeline:** {summary or link}
- **Environments:** {dev, preview, prod URLs / TestFlight / etc.}

### 2. Architecture position

Where this product sits in the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023):

- **Tier:** Surfaces (Products)
- **Domain services consumed:** {list with the operations called}
- **Platform Core capabilities used:** {PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance — which, and for what}
- **Verticals it must satisfy:** all five (Administration · Privacy · Notifications · Observability · Transactions) per ADR-U002. Per-capability detail lives in §L3.

### 3. Authentication & authorization

- How a user signs in on this surface
- Which RBAC roles see which screens
- Any product-specific permission bits that are not in the global RBAC table

### 4. Data ownership

- Tables this product writes to (and which it only reads)
- Storage buckets / CDN paths
- Sync, offline, and caching strategy

### 5. Public API surface

If this product exposes APIs (e.g., for sibling products or extensions), document them here. Otherwise link to the relevant Platform Core component's `SPECIFICATION.md`.

### 6. Cross-product contracts

Anything this product *promises* to siblings or *requires* from siblings. Breaking changes here trigger an ADR.

### 7. Operational concerns

- Observability hooks (metrics, error reporting, audit log entries)
- Feature flags and how they're toggled
- Known scaling limits and degradation modes
- Backup and disaster recovery posture

### 8. Open spec questions

L2-level questions still under design. Each is a candidate research spike or ADR.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the entity enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

Each capability is placed under its internal owner within the entity, with internal dependencies, external dependencies (capabilities consumed from other entities), and per-capability vertical impact named.

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

The **Vertical impact** column lists which of Administration / Privacy / Notifications / Observability / Transactions this capability touches, with one short phrase per vertical it touches. Verticals it doesn't touch are omitted from the cell. The rules each capability must satisfy per vertical live in the corresponding vertical's `SPECIFICATION.md` (§L3 Obligation inventory).

### Dependency chain

Prose or diagram showing the order in which capabilities become buildable. A capability that depends on another must wait for that dependency's capability inventory to be stable (and, eventually, for the dependency's feature spec to reach maturity 4-ready).

### External dependencies

Capabilities this entity consumes from other entities. Each entry names the source entity, the capability consumed, and the consuming internal area. Cross-reference these entries against the source entity's own capability inventory; if the capability isn't there, surface as a boundary question.

### Sources-status block

The `ecosystem-decomposition` skill's prerequisite-check pause mechanic produces remarks when upstream thinking is inadequate but the author proceeds anyway. Record those remarks here — one line per remark, with the upstream gap and a cross-reference to `docs/ecosystem/how-we-work/gaps.md` (e.g., G-03 for scaffold vertical specs).

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-*.md` file under this entity's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| ... | FEAT-{PREFIX}{NNN} | 0–6 | ... |

One row per feature spec. A capability with multiple feature specs has multiple rows. A capability with no spec gets a row with Feature spec = "—" and Maturity = "—".

### Capabilities without specs

Capabilities from §L3 that do not yet have a corresponding `FEAT-*.md` file. These are candidates for future L4 runs.

- {Capability name} — {short note on why not yet specified, if useful}

### Features without capabilities

If any `FEAT-*.md` files exist under this entity's `features/` directory that do not map to a capability in §L3, they're listed here. This should normally be empty; a non-empty list is a signal of drift and surfaces as a reconciliation finding.

- {FEAT-ID} — {short note}

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
