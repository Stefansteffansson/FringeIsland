# Schema gate + docs for FEAT-PC015

---
id: TASK-PC015-03
title: Schema gate review + docs close for FEAT-PC015
status: todo
assigned_to: claude
priority: high
feature: FEAT-PC015
owner: platform/core/organisation
wave: ferd
cycle: G-F
depends_on: [TASK-PC015-02]
estimated_hours: 1
---

## Description

Hold the PC015 PR at the schema gate for Stefan's review (Open Q1–Q5 defaults + the direct-caller question per ADR-U038), then close the docs: Implementation notes at 6-done, feature-inventory summary row, features/README index, CHANGELOGs.

## Acceptance criteria

- [ ] PR held at `review` with the red→green evidence and Open Q1–Q5 defaults stated for ruling
- [ ] The direct-caller question answered explicitly in the PR body for each new function
- [ ] After the nod: maturity 6-done + summary row updated same-commit; CHANGELOG updated

## Technical notes

Fuller-auto carve-out: schema/RLS changes pause at the gate — never merge without the nod. If the dev-DB apply is permission-denied in this session, the PR body carries the apply + repair commands (house pattern, PR #87 precedent).

## Verification

Stefan's gate nod recorded on the PR; `main` green after merge.
