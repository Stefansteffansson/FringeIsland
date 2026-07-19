# E2E + close: journeys through the messages surface, sweeps, 6-done

---
id: TASK-CA-06
title: E2E coverage, full sweeps, per-RPC W12 verification, 6-done transitions
status: todo
assigned_to: claude
priority: high
feature: FEAT-H025
owner: hub
wave: ferd
cycle: C-A
depends_on: [TASK-CA-04, TASK-CA-05]
estimated_hours: 3
---

## Description
Playwright E2E: DM journey (roster → message → inbox → detail → send → badge clears on read — observable effects asserted, in-context navigation for revisit assertions); group-conversation journey (create → join → message → leave → rejoin); Mist exclusion (no nav, deep-link denied). W12 per-RPC verification pass for the eight contracts (function body vs spec gates; adversarial coverage confirmed). Full sweeps: unit, integration, E2E, lint, `next build` (the type gate — house rule). 6-done transitions for both specs + §L4 rows + README indexes same-commit; Implementation notes with honest red→green evidence; CHANGELOG; plain-English walkthrough at cycle close.

## Acceptance criteria
- [ ] E2E green asserting effects, not clicks; revisit assertions navigate client-side
- [ ] `next build` clean; full integration + unit sweeps green; any pre-existing failure fenced "found (not caused)" by name
- [ ] W12 rows recorded for all eight RPCs
- [ ] Both specs `6-done` with L4 summaries + indexes updated same-commit

## Technical notes
Dev server required for E2E; serialize integration vs manual testing (house rule). Fixture names run-unique.

## Verification
The DoD checklists in the feature-development skill Step 5, walked and cited.
