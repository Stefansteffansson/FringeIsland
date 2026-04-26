# Vertical — V5: Transactions

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V5
name: Transactions
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

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V4.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Money flows through the platform — paid journeys, group subscriptions, creator payouts, marketplace fees. This vertical defines the shared transaction substrate so that any service that touches money does so safely, auditably, and consistently. Mishandled money is the fastest way to destroy trust. Mishandled tax is the fastest way to destroy a company. This vertical guarantees that every transaction is recorded, reconciled, and compliant.

### 2. Scope

- Payment provider integration (Stripe and successors)
- Subscription lifecycle (create, upgrade, downgrade, pause, cancel, refund)
- One-off purchases
- Creator payouts
- Tax handling (VAT, sales tax, withholding)
- Invoicing
- Reconciliation against the platform's own ledger
- Dispute and chargeback handling

### 3. Tooling and infrastructure

- Payment provider: Stripe (planned)
- Ledger (to be designed)
- Tax engine (likely Stripe Tax to start)
- Invoicing pipeline (to be designed)

### 4. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

### 5. Open questions

- When do we need a real accounting backend (vs. spreadsheet + Stripe reports)?
- How do we handle creator payouts across jurisdictions?
- Do we ever offer free trials, and how do we prevent abuse if so?

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- Provides the canonical ledger (source of truth for who owes what to whom)
- Owns the payment-provider abstraction

#### Domain Services

- Services that sell things (Discovery, Experience) consume the payment abstraction; they never call Stripe directly
- Each transaction-producing event writes a ledger entry

#### Surfaces (Products · Studios · Design System)

- Each surface that initiates a transaction shows price, currency, tax breakdown, and refund policy *before* confirmation
- Each surface respects the user's billing region

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New monetised feature has a price-display flow with tax breakdown
- [ ] New monetised feature writes to the ledger on success
- [ ] New monetised feature has a refund path
- [ ] New monetised feature handles failed payments gracefully
- [ ] New monetised feature complies with the user's tax jurisdiction

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
