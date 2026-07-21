# E2E journeys + fleet — the lifecycle loop end-to-end

---
id: TASK-CF-05
title: E2E — pause→reactivate loop and delete→farewell; then the standing fleet
status: todo
assigned_to: claude
priority: high
feature: FEAT-H029
owner: hub
wave: ferd
cycle: C-F
depends_on: [TASK-CF-04]
estimated_hours: 3
---

## Description

Two C-F Playwright journeys: (1) **the absence loop** — an active FIM pauses (ConfirmModal), lands on the paused surface, reactivates, lands back active with everything intact; (2) **the departure** — a purpose-created FIM walks the delete ceremony (consequence copy visible, export offer present, type-to-confirm enforced), reaches the farewell, and every subsequent authenticated request treats them as signed out; a co-member still reads the departed member's forum post attributed as former-member. Then the full standing fleet.

## Acceptance criteria

- [ ] Both journeys green 3/3 isolated
- [ ] Fleet run green (modulo the standing profile.spec STORY-4 fence, TASK-E2E-01)
- [ ] Fleet runs against a `next start` production server on :3001 — never a shared dev server (the C-E environment lesson)

## Technical notes

Deletion fixtures are single-use — create the departing FIM in-test. Fresh logins, no shared storageState for the deleted user. Stop the :3001 server at close.

## Verification

`npm run test:e2e` output preserved; isolated re-runs for the two new specs.
