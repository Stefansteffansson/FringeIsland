---
id: TASK-H005-03
title: V4 telemetry + E2E journeys + no-regression
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H005
owner: hub
wave: ferd
cycle: IDN-4
depends_on: [TASK-H005-01, TASK-H005-02]
estimated_hours: 3
---

# TASK-H005-03: Observability (V4), E2E journeys, no regression

## Description

FEAT-H005 STORY-5 — profile edits and sign-out emit V4 telemetry (actor +
outcome, **failures included**) toward the PC-1 path (the in-memory seam routed
to G-29, continuing the FEAT-H001..H004 discipline); existing identity flows are
unaffected. Plus the Playwright E2E journeys covering STORY-1..4 end-to-end
against the real PC003 contract + the platform cascade trigger.

## Acceptance criteria

- [ ] A completed profile update emits a **profile-updated** telemetry event
      (actor + outcome) on success **and** a failure event on failure (V4
      in-memory seam, surface `'hub'`).
- [ ] A completed sign-out emits a **session-ended** telemetry event (V4).
- [ ] FEAT-H001/H002/H003/H004 (sign-in, sign-up, Mist arrival, transcendence +
      farewell) behave **unchanged** — verified by the full unit + E2E suites
      staying green (the menu/profile are additive shell/identity surfaces).
- [ ] E2E: a FIM opens the account menu, opens **Profile**, sees their fields;
      edits the display name and the **navigation/menu label reflects it** (the
      platform cascade); **signs out** and lands on `/`; a protected surface then
      gates as sessionless.

## Technical notes

- Telemetry via `emitTelemetry` (`@/lib/observability/telemetry`); assert with
  `getTelemetrySink()` in unit tests (client seam). The PC003 **route** already
  emits server-side `profile.updated` / `profile.update_rejected` /
  `profile.update_failed`; this task adds the **Hub surface** events for the user
  action (mirrors how `AuthContext` emits `mist.entered` etc.).
- E2E: new `hub/tests/e2e/profile.spec.ts`, authenticated via the shared
  `storageState` (the `e2e-session` FIM from `global-setup`); reset any edited
  fields in the spec so the shared user stays stable across the serial suite.

## Verification

- Unit (jsdom): telemetry on edit success/failure + on sign-out (covered with
  TASK-H005-01/02 component tests).
- E2E: `npm run test:e2e` (dev server on :3000) — the view/edit+cascade/sign-out
  + gating journeys green. Red-first where practical.
- Full regression: `npm run test:unit` green; `npm run test:e2e` green.
