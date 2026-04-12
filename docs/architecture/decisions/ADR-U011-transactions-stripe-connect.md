# ADR-U011: Transactions as a dedicated vertical using Stripe Connect

**Status:** Accepted
**Date:** 2026-03 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:vertical · wave:hamn

---

## Context

FringeIsland needs a marketplace (Hamn+) where Dreamineers can sell journeys, physical products and experiences. Revenue needs to be split between the Foundation and creators. Payment processing needs to be compliant and reliable.

## Decision

Transactions are a dedicated vertical, implemented via Stripe Connect. FringeIsland never builds payment logic. FringeIsland stores only: Stripe payment reference, entitlement unlocked, creator earning record.

## Why Stripe Connect specifically

Stripe Connect is designed precisely for marketplace payment splits — a buyer pays, Stripe splits between platform and creator automatically. It handles PCI compliance, fraud detection, international payments, payouts, refunds and disputes. Building any of this from scratch would take years and introduce significant compliance risk.

## Why a separate vertical from Administration

Both are cross-cutting but operated by different actors with different triggers. Administration is human-operated lifecycle events. Transactions are automated Stripe webhook events. Keeping them separate makes the distinction visible.

## Consequences

- Transactions vertical is a placeholder in Ferd
- First subscription tier may introduce basic Stripe integration in late Ferd
- Full marketplace launches in Hamn

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Related: [ADR-U002 — Five cross-cutting verticals](ADR-U002-five-cross-cutting-verticals.md)
