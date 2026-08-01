# Build FEAT-PC020 — group administration contracts

---
id: TASK-ADMB-01
title: Build FEAT-PC020 (PC-4) — admin_get_groups/detail + the first 'suspended' producers + stewardship reassignment, red-first, held at the schema gate
status: done
assigned_to: claude
priority: high
feature: FEAT-PC020
owner: platform/core/governance
wave: ferd
cycle: ADM-B
depends_on: [TASK-INT-05, TASK-DBT-02]
estimated_hours: 6
---

## Description
Platform half of Cycle ADM-B per [FEAT-PC020](../../../platform/core/features/FEAT-PC020-group-administration-contracts.md). Runs AFTER the cycle's hygiene block (TASK-INT-05 fixture cleanup — never build the caretaker list against 39/42 detritus; TASK-DBT-02 E2E adjudications — a green sweep baseline before new E2E lands). One migration: five SECURITY DEFINER contracts, no new tables; reassignment composes the PC-3 role fabric (walls never reimplemented); every mutation audited, FOR UPDATE on targets.

## Acceptance criteria
- [ ] All five stories' ACs demonstrated red first (producer-driven: the DeusEx-stewarded fixture created through the real hand-over path); green after apply.
- [ ] Migration header names sibling assertions (the three-strikes grep — status-reading contracts and GRP-5 badge tests candidates); manifest riders: functions PC-4, born classified.
- [ ] The suspend refusal matrix complete (closed/archived/personal/system/wrong-state); reassignment transactional with no partial state.
- [ ] **Schema gate: PR held at `review`** with red evidence + apply commands; merges only on an explicitly NAMED approval.

## Verification
New integration suite green post-apply; platform conformance green; the audit-action names recorded in the spec's implementation notes.
