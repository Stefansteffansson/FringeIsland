# Telemetry sink & analytics posture — decide before A-ADM builds its consumers

---
id: TASK-OBS-01
title: Telemetry sink & analytics posture — durable store vs log-drain, retention, actor-linkage consent, what ADM-1 aggregates; settle at the A-ADM area-open design session
status: todo
assigned_to: claude
priority: medium
feature: none  # design-session prep — outputs are a decision board + likely ADR + V4 spec de-scaffolding, not a FEAT build
owner: platform/core/infrastructure
wave: ferd
cycle: unscheduled — slot at the A-ADM (Platform-Ops) area-open design session, or a cooldown week if one lands first
depends_on: []
estimated_hours: 3
---

## Description
Raised by Stefan at the C-C close (2026-07-20): future optimization work will need queryable data, and today the platform **emits well but stores nowhere** — the V4 discipline is in force (every meaningful action emits a content-free structured event; "meaningful = anything a future product decision would want to measure", the products-tier rule) but events land in the runtime log stream (short Vercel retention, not queryable). The decision layer is missing, and its natural decision point is the A-ADM area open, where ADM-1 (statistics aggregation, PC-1 primitive) and the audit/log viewer surfaces get shaped anyway.

Prepare a decision board (the G-F/C-D precedent — all decisions at once, recommendations marked) covering at least:
1. **The sink**: durable event store (own table(s)? which tier owns it?) vs external log-drain/analytics service vs hybrid; write path (batched? fire-and-forget like the C-C hint discipline — an emit failure never fails the action).
2. **Retention & aggregation**: raw-event retention policy; what ADM-1 pre-aggregates vs computes on read; cardinality budget.
3. **Privacy posture (V2 interaction)**: telemetry linked to actors is personal data — dispositon "analytics/optimization" as a purpose against the ADR-U034 consent substrate (consent-gated? legitimate-interest with content-free ids? erasure cascade over the event store — the export question too).
4. **V4 de-scaffolding (G-03)**: turn the Observability vertical spec's scaffold sections into the obligation inventory the decision implies, so per-spec Observability rows can cite obligation IDs.
5. **Perf-measurement continuity**: how the ADR-U043 measurement protocol's numbers (deep-cold/warm passes, area-gate walks) get recorded durably rather than living in bridges.

## Acceptance criteria
- [ ] Decision board prepared and settled with Stefan (ADR candidate drafted if the sink decision is architectural — likely)
- [ ] V4 vertical spec §§3-6 de-scaffolded per the decision (G-03 closed or explicitly narrowed)
- [ ] The purpose/consent disposition recorded (V2 + ADR-U034)
- [ ] Follow-on FEAT specs (if any) created under the normal decomposition path — this task itself builds nothing

## Technical notes
Current emission sites: PC-1 instrumentation primitives; the Hub's `[telemetry]`/`[audit]` structured events (content-free discipline — the comm/journal precedents pin it). ADM-1's external-deps row in Hub §L3 names PC-1's statistics aggregation as load-bearing. The events-without-sink state is honest today because no consumer exists yet — A-ADM ends that.

## Verification
Board settled + ADR nodded (if raised); G-03 status updated in `gaps.md`; the A-ADM completion plan cites this task's outputs at area open.
