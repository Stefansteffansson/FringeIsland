# Vertical — V5: Transactions

**Status:** Draft (scaffold — Ferd)
**Owner:** Stefan
**Last updated:** 2026-04-08
**Tier:** Cross-cutting

> Money flows through the platform — paid journeys, group subscriptions, creator payouts, marketplace fees. This vertical defines the shared transaction substrate so that any service that touches money does so safely, auditably, and consistently.

---

## 1. Purpose

Mishandled money is the fastest way to destroy trust. Mishandled tax is the fastest way to destroy a company. This vertical guarantees that every transaction is recorded, reconciled, and compliant.

## 2. Scope

- Payment provider integration (Stripe and successors)
- Subscription lifecycle (create, upgrade, downgrade, pause, cancel, refund)
- One-off purchases
- Creator payouts
- Tax handling (VAT, sales tax, withholding)
- Invoicing
- Reconciliation against the platform's own ledger
- Dispute and chargeback handling

## 3. Obligations on each tier

### Platform Core
- Provides the canonical ledger (source of truth for who owes what to whom)
- Owns the payment-provider abstraction

### Domain Services
- Services that sell things (Discovery, Experience) consume the payment abstraction; they never call Stripe directly
- Each transaction-producing event writes a ledger entry

### Surfaces
- Each surface that initiates a transaction shows price, currency, tax breakdown, and refund policy *before* confirmation
- Each surface respects the user's billing region

## 4. Cross-cutting checklists

- [ ] New monetised feature has a price-display flow with tax breakdown
- [ ] New monetised feature writes to the ledger on success
- [ ] New monetised feature has a refund path
- [ ] New monetised feature handles failed payments gracefully
- [ ] New monetised feature complies with the user's tax jurisdiction

## 5. Tooling and infrastructure

- Payment provider: Stripe (planned)
- Ledger (to be designed)
- Tax engine (likely Stripe Tax to start)
- Invoicing pipeline (to be designed)

## 6. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

## 7. Open questions

- When do we need a real accounting backend (vs. spreadsheet + Stripe reports)?
- How do we handle creator payouts across jurisdictions?
- Do we ever offer free trials, and how do we prevent abuse if so?

---

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
