# Vertical — V4: Observability

**Status:** Draft (Phase 3 scaffold)
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

- Logger (Phase 4 — currently console-based)
- Metrics backend (Phase 4 — to be selected)
- Tracer (Phase 4 — to be selected)
- Audit log table (Phase 4 — currently partial)
- Error reporter (Phase 4 — to be selected)

## 6. Failure modes

*To be filled in during Phase 4.*

## 7. Open questions

- Do we self-host or buy observability infrastructure?
- How long do we retain logs vs. metrics vs. audit entries?
- Who is on-call during the solo-developer phase?

---

*Phase 3 scaffold. Real content migrates from `../old_*` in Phase 4.*
