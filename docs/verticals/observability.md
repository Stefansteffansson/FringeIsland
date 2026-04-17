# Vertical — V4: Observability

**Status:** Draft (scaffold — Ferd)
**Owner:** Stefan
**Last updated:** 2026-04-08
**Tier:** Cross-cutting

> Logs, metrics, traces, audit trails, error reports. Every service must be inspectable in production. If a feature isn't observable, it doesn't exist as far as operations are concerned.

---

## 1. Purpose

Operating a multi-product ecosystem with extensions and 50+ contributors is impossible without observability. This vertical guarantees that any anomaly — performance regression, error spike, suspicious access pattern — is detectable, attributable, and reproducible.

## 2. Scope

- Structured application logs
- Performance and business metrics
- Distributed tracing across service boundaries
- Audit log (immutable record of security-relevant events)
- Error reporting and alerting
- Dashboards for the most critical metrics
- On-call posture (who gets paged, when, why)

## 3. Obligations on each tier

### Platform Core
- Provides the shared logger, metrics client, tracer, and audit-log writer
- Owns the connection to the observability backend

### Domain Services
- Each operation emits a log entry at the appropriate level
- Each operation increments a metric (count + duration)
- Each security-relevant action writes an audit-log entry

### Surfaces
- Each surface reports unhandled errors to the central error reporter
- Each surface emits a small set of business-critical metrics (signups, conversions, journey starts)

## 4. Cross-cutting checklists

- [ ] New API route logs request + result
- [ ] New API route increments a metric
- [ ] New security-relevant action writes an audit-log entry
- [ ] New unhandled error path reports to the error reporter
- [ ] Dashboard exists if this feature has a measurable success criterion

## 5. Tooling and infrastructure

- Logger (currently console-based — to be refined as the tooling matures)
- Metrics backend (to be selected)
- Tracer (to be selected)
- Audit log table (currently partial — to be refined)
- Error reporter (to be selected)

## 6. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

## 7. Open questions

- Do we self-host or buy observability infrastructure?
- How long do we retain logs vs. metrics vs. audit entries?
- Who is on-call during the solo-developer phase?

---

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
