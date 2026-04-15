# Verticals

**Wave:** Ferd
**Category:** Architecture
**Status:** 🟡 Needs study

---

## What Is This

The five verticals are cross-cutting concerns that span all eight horizontal layers.
Unlike layers — which represent a level of abstraction — a vertical represents
a capability or concern that is relevant at every level of the platform simultaneously.

The five verticals are:

| Vertical | Primary Responsibility |
|----------|----------------------|
| **Administration** | Platform management, content oversight, user management |
| **Privacy** | Data protection, consent management, GDPR compliance |
| **Notifications** | Delivery of system messages, admin messages and alerts |
| **Observability** | Logging, monitoring, tracing, alerting |
| **Transactions** | Financial and transactional integrity |

---

## Why We Are Building This

Separating these concerns into explicit verticals prevents them from being
implemented ad hoc, duplicated, or scattered across the codebase.
Each vertical has a single home. Everything that touches that concern goes through it.

---

## Ferd Scope for Each Vertical

| Vertical | In scope for Ferd |
|----------|------------------|
| **Administration** | Basic admin covering: members, groups, roles, permissions, journeys, journals, messaging, forums, notifications, authentication |
| **Privacy** | To be defined in study phase |
| **Notifications** | System messages and admin messages to members |
| **Observability** | To be defined in study phase |
| **Transactions** | To be defined in study phase — may be minimal or placeholder in Ferd |

---

## Open Questions

- [ ] What is the precise scope of each vertical for Ferd specifically?
- [ ] How are verticals implemented technically — middleware, services, hooks?
- [ ] How does the Administration vertical relate to the permission model — is admin access just a role or something more?
- [ ] What does the Privacy vertical need to cover in Ferd — is GDPR compliance in scope for wave 1?
- [ ] Is the Transactions vertical needed at all in Ferd or is it a placeholder?
- [ ] How does Observability integrate with Next.js and Supabase — what tooling is in scope?
- [ ] How do verticals interact with each other — e.g. does Notifications go through Privacy?

---

*Status: 🟡 Needs study*
