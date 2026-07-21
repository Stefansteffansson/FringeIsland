# Hub surface — pause/delete ceremony, paused branch, reactivation

---
id: TASK-CF-04
title: Build FEAT-H029 (pause/delete) + FEAT-H007 (reactivate) + the FEAT-H006 paused branch + BFF routes
status: done
assigned_to: claude
priority: high
feature: FEAT-H029
owner: hub
wave: ferd
cycle: C-F
depends_on: [TASK-CF-03]
estimated_hours: 6
---

## Description

The cycle's surface half: the account-area lifecycle section (Pause behind ConfirmModal; the Delete ceremony — consequence summary, FEAT-H010 export offer, type-to-confirm), the farewell screen + clean local sign-out, the FEAT-H006 paused branch (renders `paused` distinctly from `suspended`, hosting FEAT-H007's Reactivate affordance), and the thin BFF pass-throughs to `POST /api/v1/account/pause|delete|reactivate` (Bearer JWT; presentation mapping only — no rule lives solely in a route, ADR-U038). Unit tests per story; record a one-line H006 amendment note (paused branch) in its spec's Implementation notes.

## Acceptance criteria

- [ ] All FEAT-H029 stories (S1–S5) and FEAT-H007 stories (S1–S5) covered by unit tests, green
- [ ] Affordance gating switches on `state`/`deactivation_origin` labels only; suspended surface unchanged; decommissioned terminal
- [ ] Delete success path: local session cleared, farewell rendered, no authenticated flash, no toast storm from in-flight 401s
- [ ] `next build` clean (0 type errors) — the type gate before any 6-done claim
- [ ] Route-policy conformance test green (no runtime/region exports)

## Technical notes

ConfirmModal (never browser dialogs). Type-to-confirm phrase fixed in one constant. Re-read account state via FEAT-PC004 after every transition — never assume. `refreshNavigation` if the account menu reflects state.

## Verification

`npm run test:unit` green; `next build` clean; manual walk of pause→paused-surface→reactivate→active and delete→farewell on the dev server.
