# ADR-012 — Observability as a dedicated vertical

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
Without observability, production issues are invisible until users report them. Audit trails are required by GDPR for data access events. Error tracking is essential for a platform handling sensitive personal data.

**Decision:**
Observability is a dedicated fourth vertical — read-only, passive, touching every layer. Three components: structured logs, performance metrics, and immutable audit trail. Error tracking (Sentry or equivalent) named explicitly.

**Why observability is a vertical and not a layer:**
Observability does not depend on layers below it — it observes them. It is purely read-only. It fits the vertical model precisely: it touches every layer simultaneously without being part of the functional stack.

**Why audit trail is a trust concern not just a technical one:**
When a member asks "what has been done with my data?", the audit trail answers. This is a member rights concern (Privacy vertical) as much as an operational concern. The audit trail is shared between Observability and Privacy — Observability records it, Privacy exposes it to members.
