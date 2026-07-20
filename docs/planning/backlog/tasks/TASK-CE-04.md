# Doc dues — tags flipped, questions closed, spec recorded

---
id: TASK-CE-04
title: C-E doc dues — PC014 tags, PC008 §155 closure, PD007 amendment, DS-5 §8 Q2 + §7.4, 6-done flips, CHANGELOG
status: todo
assigned_to: claude
priority: medium
feature: FEAT-PD012
owner: platform/domain/communication
wave: ferd
cycle: C-E
depends_on: [TASK-CE-03]
estimated_hours: 2
---

## Description

The recording half of C-E, gated on the proofs passing (STORY-3/5/6 ACs bind these to the build).

## Acceptance criteria

- [ ] FEAT-PC014 STORY-4/5: `pending-DS-5` tags flipped to executed-at-C-E via `ds5_lifecycle_group_closed`; the ADR-U047 rename recorded in the file (the COR-A carry discharged)
- [ ] FEAT-PC008 §155: suspended-export open question closed (CB-6 posture + mechanism)
- [ ] FEAT-PD007: amendment note for the `get_own_step_instances_export` re-issue
- [ ] `communication.md`: §8 Q2 resolved-for-Ferd; §7.4 annotated satisfied-by-exclusion; §L4 rows flipped 6-done (same commit as the maturity flip)
- [ ] FEAT-PD012: Implementation notes replace forward-looking sections; maturity 6-done; features/README.md row updated
- [ ] CHANGELOG entry

## Verification

doc-health cascade spot-check on the touched files; links resolve.
