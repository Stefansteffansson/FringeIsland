# Vertical — V4: Observability

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V4
name: Observability
owner: Stefan
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: draft
last_updated: 2026-04-26
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Logs, metrics, traces, audit trails, error reports. Every service must be inspectable in production. If a feature isn't observable, it doesn't exist as far as operations are concerned. Operating a multi-product ecosystem with extensions and 50+ contributors is impossible without observability. This vertical guarantees that any anomaly — performance regression, error spike, suspicious access pattern — is detectable, attributable, and reproducible.

### 2. Scope

- Structured application logs
- Performance and business metrics
- Distributed tracing across service boundaries
- Audit log (immutable record of security-relevant events)
- Error reporting and alerting
- Dashboards for the most critical metrics
- On-call posture (who gets paged, when, why)

### 3. Tooling and infrastructure

- Logger (currently console-based — to be refined as the tooling matures)
- Metrics backend (to be selected)
- Tracer (to be selected)
- Audit log table (currently partial — to be refined)
- Error reporter (to be selected)

### 4. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

### 5. Open questions

- Do we self-host or buy observability infrastructure?
- How long do we retain logs vs. metrics vs. audit entries?
- Who is on-call during the solo-developer phase?

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- Provides the shared logger, metrics client, tracer, and audit-log writer
- Owns the connection to the observability backend

#### Domain Services

- Each operation emits a log entry at the appropriate level
- Each operation increments a metric (count + duration)
- Each security-relevant action writes an audit-log entry

#### Surfaces (Products · Studios · Design System)

- Each surface reports unhandled errors to the central error reporter
- Each surface emits a small set of business-critical metrics (signups, conversions, journey starts)

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New API route logs request + result
- [ ] New API route increments a metric
- [ ] New security-relevant action writes an audit-log entry
- [ ] New unhandled error path reports to the error reporter
- [ ] Dashboard exists if this feature has a measurable success criterion

### Sources-status block

*No remarks recorded.*

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline is tracked as G-21.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
