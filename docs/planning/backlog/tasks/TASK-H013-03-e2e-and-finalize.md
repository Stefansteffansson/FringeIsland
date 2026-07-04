# E2E journey + full gates + finalize G-A

---
id: TASK-H013-03
title: Groups E2E journey, full-pyramid gates, 6-done finalization (specs, §L4, indexes, CHANGELOG)
status: todo
assigned_to: claude
priority: high
feature: FEAT-H013
owner: hub
wave: ferd
cycle: Groups G-A
depends_on: [TASK-H013-02]
estimated_hours: 3
---

## Description

The Playwright journey + the DoD sweep: create a group → land on detail (Steward affordances present) → edit name → toggle visibility → non-member honesty (private 404 / public hidden-list), then all gates and the 6-done paperwork.

## Acceptance criteria

- [ ] E2E: create→detail→settings journey green on fresh logins (suite-order-safe per the Cycle E finding)
- [ ] Full gates: unit + integration (`--runInBand`) + E2E green; lint 0 errors; `next build` clean (the type gate)
- [ ] API-boundary DoD: adversarial direct-caller tests exist substrate-side (TASK-PC010-02); routes carry no sole-home rules
- [ ] Both specs → `6-done` with honest Implementation notes (red-first evidence; any test-after labelled); §L4 rows + both feature READMEs + `hub/CHANGELOG.md` updated in the same commit

## Technical notes

`hub/tests/e2e/groups.spec.ts`; own fresh logins (never the shared storageState for mutations). Platform tasks (PC010-01/02, P3A-01) land at `review` — schema gate.

## Verification

All suites green; dashboard refresh; session bridge; PR pauses at the schema gate for Stefan's nod.
