# E2E journeys + finalize FEAT-H016 to 6-done

---
id: TASK-H016-03
title: Playwright journeys (pause round-trip across two FIMs incl. the paused member's honest absence; removal; leave with the G-E refusal copy) + next build gate + 6-done paperwork
status: done
assigned_to: claude
priority: high
feature: FEAT-H016
owner: hub
wave: ferd
cycle: Groups G-D
depends_on: [TASK-H016-02]
estimated_hours: 3
---

## Description

The journey half + close-out. Dedicated spec-created FIMs in their own contexts (the G-B suite-isolation default; single-token display names).

- **Pause round-trip (STORY-1 + STORY-4):** Steward pauses a member → Paused badge; the paused member's `/groups` no longer lists the private group and its detail deep-link renders the not-found view; Steward reactivates → the member's group is back and opens.
- **Removal (STORY-2):** Steward removes a member (danger ConfirmModal) → row gone; the removed member's `/groups` no longer lists it.
- **Leave (STORY-3):** a plain member leaves (ConfirmModal) → lands on `/groups`, group absent; a sole Steward attempting leave sees the honest transfer-refusal copy in place (no mutation).

Finalize: `next build` (the type gate), lint, full unit suite, full E2E; FEAT-H016 maturity 6-done + Implementation notes; hub SPECIFICATION §L4 row; features README; CHANGELOG; session bridge; close PR (fuller-auto — Hub-only, no carve-out).

## Acceptance criteria

- [ ] Three E2E journeys green on dedicated spec-created FIMs
- [ ] `next build` clean; lint 0 errors; full unit + E2E suites green
- [ ] 6-done paperwork in the same commit as the maturity flip (spec notes + §L4 + README + CHANGELOG)

## Verification

`npm run test:e2e` (dev server on :3000); `npm run build`; suite counts recorded in the Implementation notes.
