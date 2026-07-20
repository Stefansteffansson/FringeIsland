# C-D close — E2E journeys, sweeps, 6-done transitions, bridge

---
id: TASK-CD-06
title: C-D E2E + sweeps + close ritual
status: todo
assigned_to: claude
priority: medium
feature: FEAT-H028
owner: hub
wave: ferd
cycle: C-D
depends_on: [TASK-CD-04, TASK-CD-05]
estimated_hours: 4
---

## Description

E2E journeys (Steward announces → member sees on group page; platform announcement seeded → FIM sees on home, Mist doesn't; edit-own within window + tombstone self-delete; report submission toast), fresh logins per context (the C-C storageState lesson). Full sweeps (unit, integration, E2E fleet), `next build` before 6-done, plain-English walkthrough, CHANGELOG, 6-done maturity flips + §L4 summary rows same-commit, session bridge.

## Acceptance criteria

- [ ] E2E specs green standalone and under fleet ordering; fresh logins, run-unique single-token fixtures
- [ ] Full Test/API/route-policy/performance DoD blocks verified per the skill before any 6-done flip
- [ ] Bridge written; tasks left in place for the retro

## Technical notes

Never two integration suites concurrent vs the shared dev DB. Deep-cold check: home gains a section on an existing page via standalone read post-paint — verify no new first-paint request before claiming ADR-U043 not triggered.

## Verification

Sweep numbers recorded in the bridge; dev server stopped at close.
