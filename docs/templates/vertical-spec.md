# Vertical — V{N}: {Vertical name}

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V{N}
name: {Administration | Privacy/GDPR | Notifications | Observability | Transactions}
owner: {name or team}
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: {draft | active | stable}
last_updated: YYYY-MM-DD
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V4.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

What this vertical exists to guarantee, in one paragraph. What goes wrong if it isn't satisfied? Which principle from Vision does this operationalise?

### 2. Scope

What it covers. Be specific — "privacy" alone is too vague to be enforceable. ("Personal data minimisation, consent capture, right-to-erasure flows, data export, AI training opt-out, GDPR Art. 30 records of processing.")

### 3. Tooling and infrastructure

What shared infrastructure exists to make this vertical cheap to satisfy (audit log, consent store, rate limiter, etc.). If something has to be reimplemented per-feature, that's a smell — flag it.

Tooling that is owned by this vertical as a shipped feature appears here and also shows up in the §L4 feature-inventory summary. Tooling that is owned by another entity (e.g., a Platform Core capability that this vertical consumes) appears here as a reference only.

### 4. Failure modes

What can go wrong when this vertical's obligations aren't met, what happens when it does, how it's detected, and how it's recovered. This is structural — describes the vertical itself — and does not vary per obligation (per-obligation failure is covered in §L3's checklists).

### 5. Open questions

L2-level questions still under design. Each is a candidate ADR or spike.

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

What every Platform Core tier (PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance) must do to satisfy this vertical. May vary by tier — list per tier if the obligations differ meaningfully.

#### Domain Services

What every domain service (DS-1 through DS-7 per ADR-U023) must do. May vary by service — list per service if needed.

#### Surfaces (Products · Studios · Design System)

What every surface-tier entity must do (UI affordances, copy, flows, component-level behaviour).

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] ...
- [ ] ...

### Sources-status block

The `ecosystem-decomposition` skill's prerequisite-check pause mechanic produces remarks when upstream thinking is inadequate but the author proceeds anyway. Record those remarks here — one line per remark, with the upstream gap and a cross-reference to `docs/ecosystem/how-we-work/gaps.md`.

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline is tracked as G-21.*

### Summary of vertical-owned features

| Obligation (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| ... | FEAT-V{NNN} | 0–6 | ... |

One row per vertical-owned feature. If the vertical owns no features, this section contains a single line: *"This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections."*

### Obligations without shared infrastructure

Obligations from §L3 that cannot currently be satisfied by shared tooling — each feature author must implement the obligation themselves. This is a smell signal (per §3 guidance). Listing such obligations here surfaces them as candidates for future V-prefix features.

- {Obligation} — {short note on why no shared tooling exists and what it would look like}

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
