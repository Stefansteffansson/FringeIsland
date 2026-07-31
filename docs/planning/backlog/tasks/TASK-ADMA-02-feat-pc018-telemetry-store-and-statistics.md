# Build FEAT-PC018 — telemetry event store, retention prune, statistics read

---
id: TASK-ADMA-02
title: Build FEAT-PC018 (PC-1) — telemetry_events + record_telemetry_event + 90-day prune + get_platform_statistics, red-first, held at the schema gate
status: review  # built red-first 2026-07-31; PR held at the schema gate awaiting named approval
assigned_to: claude
priority: high
feature: FEAT-PC018
owner: platform/core/infrastructure
wave: ferd
cycle: ADM-A
depends_on: [TASK-ADMA-01]
estimated_hours: 5
---

## Description
Platform half one of Cycle ADM-A, per [FEAT-PC018](../../../platform/core/features/FEAT-PC018-telemetry-event-store-and-statistics.md) and [ADR-U052](../../../architecture/decisions/ADR-U052-telemetry-sink-and-analytics-posture.md) §1–§4. One migration: the deny-all `telemetry_events` table, the never-raises recorder, the pg_cron prune, the admin-gated statistics read; manifest classification riders in the same PR.

## Acceptance criteria
- [ ] All four stories' ACs demonstrated red first, green after apply (STORY-4's Mist-erasure cascade proven by count, the NB-8 lesson).
- [ ] Migration header names sibling assertions it could invalidate (the three-strikes grep rule) — expected: none, stated explicitly.
- [ ] Manifest: table + both functions registered (PC-1), `memberData: true` + ADR-U052 §4 exemption; classification + export-completeness + trigger-license gates green.
- [ ] **Schema gate: PR held at `review`** with red evidence + apply commands in the body; merges only on an explicitly NAMED approval.

## Verification
New integration suite green post-apply; full platform conformance green; `next build` unaffected (no Hub code in this task).
