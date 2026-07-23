# N-A: E2E journey + cycle close

---
id: TASK-NA-05
title: E2E notification journey, fleet sweep, FEAT-H030 to 6-done
status: todo
assigned_to: claude
priority: medium
feature: FEAT-H030
owner: hub
wave: ferd
cycle: N-A
depends_on: [TASK-NA-04]
estimated_hours: 3
---

## Description
One Playwright journey: seed a passive notification (e.g. trigger an invitation) → badge shows on sign-in → dropdown renders it unread → click marks read + navigates → inbox shows history + read state → mark-all clears badge → reload proves server state. Full E2E fleet sweep (no regressions). Advance FEAT-H030 to `6-done` with Implementation notes; Hub §L4 row + README same commit; session bridge for the cycle.

## Acceptance criteria
- [ ] New E2E journey green 3/3 consecutive runs.
- [ ] Fleet sweep green (the TASK-E2E-01 fence exception noted if it fires — verify found-not-caused at main HEAD before attributing).
- [ ] FEAT-H030 `6-done` + Implementation notes; Hub SPECIFICATION §L4 + features README updated same commit.
- [ ] Cycle N-A bridge written under `docs/planning/sessions/`.

## Technical notes
Single-token nicknames in fixtures (first-token render rule). Check for a live sibling session before the suite run (shared dev DB rule). ADR-U043 measurement + live walk are AREA-gate duties, not per-cycle — do not run here.

## Verification
`cd hub && npx playwright test` fleet green; the two spec files read `maturity: 6-done` at their own line 9.
