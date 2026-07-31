# Build FEAT-PC019 — record_auth_event, the durable auth-audit primitive

---
id: TASK-ADMA-03
title: Build FEAT-PC019 (PC-4) — record_auth_event SECURITY DEFINER audit-write primitive, red-first, held at the schema gate
status: review  # built red-first 2026-07-31; PR held at the schema gate awaiting named approval
assigned_to: claude
priority: high
feature: FEAT-PC019
owner: platform/core/governance
wave: ferd
cycle: ADM-A
depends_on: [TASK-ADMA-01]
estimated_hours: 4
---

## Description
Platform half two of Cycle ADM-A, per [FEAT-PC019](../../../platform/core/features/FEAT-PC019-durable-auth-event-audit-binding.md) and board AB-2. One additive migration: the recorder function + ACL. No table, policy, or existing-writer changes — PC-4 blast-radius discipline applies (platform/core carve-out; the PR pauses regardless of size).

## Acceptance criteria
- [ ] STORY-1..3 ACs demonstrated red first, green after apply — producer-driven (rows created by invoking the contract as the flow's actor, never fixture INSERTs; the AC3-2 lesson).
- [ ] Append-only re-asserted against the post-change catalog (B-ADMIN-007 forward).
- [ ] STORY-2's farewell row proven PII-free after the personal-group cascade (read-back assertion).
- [ ] Manifest: function registered PC-4 (born classified per TASK-ADMA-01's gate).
- [ ] **Schema gate: PR held at `review`**; merges only on an explicitly NAMED approval.

## Verification
Auth/account integration suites green post-apply; platform conformance green.
