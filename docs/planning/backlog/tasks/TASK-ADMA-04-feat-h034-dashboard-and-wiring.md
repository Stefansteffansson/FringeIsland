# Build FEAT-H034 — /admin dashboard + durable audit & telemetry wiring

---
id: TASK-ADMA-04
title: Build FEAT-H034 (Hub) — gated /admin dashboard over the statistics contract; wire the four auth callers to record_auth_event and give emitTelemetry its durable leg
status: done  # built 2026-07-31: unit 1068/1068, next build green, own E2E 3/3; sweep fallout adapted (menu locators) or filed (TASK-DBT-02)
assigned_to: claude
priority: high
feature: FEAT-H034
owner: hub
wave: ferd
cycle: ADM-A
depends_on: [TASK-ADMA-02, TASK-ADMA-03]
estimated_hours: 6
---

## Description
Surface half of Cycle ADM-A, per [FEAT-H034](../../../products/hub/features/FEAT-H034-admin-dashboard-and-durable-audit-wiring.md). No migration of its own; consumes FEAT-PC018/PC019 API-first. Born under the COR-C lattice: tokens only, jest-axe green, outer-ring clean, unit + E2E red-first.

## Acceptance criteria
- [ ] STORY-1..4 ACs demonstrated (unit + integration + E2E: an admin sees the dashboard render live numbers; a non-admin gets the 404 shape; a sign-in produces its durable audit row end-to-end).
- [ ] Awaited-but-non-fatal proven: forced recorder failure on each of the four auth flows leaves the flow succeeding, mirrors intact, failure logged.
- [ ] `A-OPS` naming gone; the audit TODO discharged; telemetry sweep list enumerated in the PR body (no silent cap).
- [ ] `next build` green (the type gate); jest-axe green on the new components; token gate green.
- [ ] Feature-inventory summaries advance (4-ready → 6-done rows) in the closing commit per L4 discipline.

## Verification
Full unit suite + targeted E2E green; ADR-U043 measurements for `/admin` recorded at the area-gate pass (B2/B3, standalone-read boot path).
