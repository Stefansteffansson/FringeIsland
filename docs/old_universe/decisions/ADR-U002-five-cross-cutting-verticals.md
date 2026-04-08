# ADR-002 — Administration, Privacy, Notifications, Observability, Transactions as verticals

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
The layered model captures horizontal dependencies well. But some concerns are not horizontal — they cut through every layer simultaneously. The administration of a user soft-delete touches L1, L2, L3, L4, L5, L6, L7. Privacy/GDPR compliance touches every layer that holds member data. These don't belong in any single layer.

**Decision:**
Introduce five vertical concerns that run alongside the layers: Administration, Privacy/GDPR, Notifications/Email, Observability/Audit, Transactions. Each vertical is a cross-cutting concern that touches every layer simultaneously.

**Why five verticals and not fewer or more:**
- *Administration* — lifecycle events are human-operated cascades. Fundamentally different from the others.
- *Privacy/GDPR* — a founding FringeIsland value that deserves first-class architectural status. Cannot be absorbed into Administration without losing visibility.
- *Notifications/Email* — observational and outbound. Does not mutate state. Fundamentally different from Administration.
- *Observability/Audit* — read-only system health. Fundamentally different from all others.
- *Transactions* — automated Stripe-driven entitlements. External actor. Fundamentally different from human-operated Administration.

Each vertical has a different actor (human, member, system, external service) and a different interaction pattern (mutation, rights, signals, observation, entitlements). These differences justify separate verticals.

**Alternatives considered:**
- *Single "cross-cutting concerns" vertical* — simpler but loses the important distinction between human-operated and automated concerns.
- *Absorbing privacy into administration* — rejected because privacy is a founding value, not a subset of administration. Making it a separate vertical makes it visible to every developer building every feature.
- *Notifications as part of L5 Communication* — rejected because notifications are triggered by events at every layer, not just L5. Placing it in L5 incorrectly implies it only relates to communication.

**Ordering of verticals (from layers outward):**
Administration → Privacy → Notifications → Observability → Transactions
- Administration is tightest to the layers (most coupled, most internal)
- Privacy follows — internal rights concern
- Notifications — internal listener, outward deliverer
- Observability — read-only, passive
- Transactions — most external (Stripe-driven)
