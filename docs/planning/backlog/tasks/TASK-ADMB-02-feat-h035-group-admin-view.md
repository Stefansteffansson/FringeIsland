# Build FEAT-H035 — /admin/groups list, detail, and actions

---
id: TASK-ADMB-02
title: Build FEAT-H035 (Hub) — the group administration view on the H034 shell: caretaker tab, detail, suspend/reactivate, reassign-out-of-caretakership
status: done
assigned_to: claude
priority: high
feature: FEAT-H035
owner: hub
wave: ferd
cycle: ADM-B
depends_on: [TASK-ADMB-01]
estimated_hours: 6
---

## Description
Surface half of Cycle ADM-B per [FEAT-H035](../../../products/hub/features/FEAT-H035-group-administration-view.md). No migration of its own; consumes FEAT-PC020 API-first. Born under the COR-C lattice (tokens, axe, outer-ring, route policy); red-first unit + E2E; fresh-per-mount admin reads; full confirm ceremonies on both mutations.

## Acceptance criteria
- [ ] STORY-1..5 ACs demonstrated (unit red-first; E2E: real hand-over group appears under Platform-stewarded → reassigned → leaves the tab; suspend/reactivate round-trip; demoted 404 shape).
- [ ] `next build` green; jest-axe green on list + detail; feature-inventory summaries advance in the closing commit.
- [ ] Full E2E sweep green (the TASK-DBT-02 baseline holds — no new latent fallout left behind).

## Verification
Full unit suite + E2E sweep green; ADR-U043 numbers for `/admin/groups` recorded at the area-gate pass into the perf ledger.
