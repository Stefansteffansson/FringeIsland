# Domain Service — {Service name} (DS-{N})

<!-- Valid service slugs: world-model | narrative-engine | experience-engine | content | communication | discovery | intelligence -->

---
slug: {world-model | narrative-engine | experience-engine | content | communication | discovery | intelligence}
owner: platform/domain/{slug}
consumers: [{hub} | {gimbal} | {game} | {studio/journey-studio} | {studio/universe-studio} | {studio/arc-studio}]
status: {proposed | active | stable | deprecated}
last_updated: YYYY-MM-DD
tier: Domain Services
tags: [domain-service:{slug}]
feature_prefix: PD  # FEAT-PD### for features owned by this service
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

---

## 1. Purpose

What this service is responsible for, in one paragraph. Bound it: what *is* this service's job, and what is *not*?

## 2. Concepts

The domain entities this service owns. Name them, define them, and note where each is persisted.

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| ... | ... | ... |

## 3. Public contract (consumed by Surfaces)

The operations this service exposes. For each: name, inputs, outputs, errors, auth requirements.

### Operation: `{name}`
- **Purpose:** ...
- **Inputs:** ...
- **Outputs:** ...
- **Errors:** ...
- **Auth:** ...

## 4. Internal dependencies (consumed *from* this service)

What this service depends on. Allowed dependencies: Platform Core, services below it in the dependency rules (`../planning/sessions/2026-04-10_-_SESSION-BRIDGE.md` and `../planning/reference/`).

- Platform Core: {Identity, Organisation, Governance, Infrastructure}
- Other domain services: {DS-N — for what}

## 5. Extension points

If this service exposes plugin contracts (step types, content renderers, etc.), document them here. Otherwise: "None."

| Extension point | Interface | Lifecycle |
|----------------|-----------|-----------|
| ... | ... | ... |

## 6. Storage & schema

Tables, columns, indexes, RLS posture. Reference migration files where applicable.

## 7. Cross-cutting concerns

How this service handles each vertical (`../verticals/`):

- **V1 Administration:** ...
- **V2 Privacy/GDPR:** ...
- **V3 Notifications:** ...
- **V4 Observability:** ...
- **V5 Transactions:** ...

## 8. Open questions

Anything not yet decided. Each question is a candidate spike or ADR.
