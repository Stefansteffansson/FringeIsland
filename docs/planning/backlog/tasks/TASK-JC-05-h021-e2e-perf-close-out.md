# H021 E2E completion arc + perf DoD + 6-done close-out

---
id: TASK-JC-05
title: H021 E2E + perf DoD + 6-done close-out
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H021
owner: hub
wave: ferd
cycle: J-C
depends_on: [TASK-JC-03, TASK-JC-04]
estimated_hours: 3
---

## Description

The E2E completion/review arc, the performance DoD assertions, and the close-out gates for both J-C specs.

## Acceptance criteria

- [ ] E2E: walk to the final required step → complete → the milestone renders → reload → Review entry from the journeys/detail surfaces → review posture (navigation, no enter fired, times visible) → an optional/repeatable re-engagement still works. Clean isolated re-run; `player.spec` + `journeys.spec` unchanged green.
- [ ] Perf DoD asserted: review boot = one `get_player_state` read (no timing/completion extra request); completion moment renders with zero additional reads; B5/B6 rows unchanged.
- [ ] `next build` green (the type gate) · lint 0 errors.
- [ ] Both specs advanced to 6-done with honest Implementation notes (gate resolutions + red→green recorded); §L4 rows + feature READMEs updated same-commit; CHANGELOGs (root + Hub).

## Technical notes

Dev server on `localhost:3000` required for E2E. The completion fixture needs a journey walkable to completion in-test (short required set). Watch the 522 flake class on long sweeps — green-isolated evidence before blaming app code.

## Verification

`npm run test:e2e` targeted specs green; `npm run build`; `npm run lint`.
