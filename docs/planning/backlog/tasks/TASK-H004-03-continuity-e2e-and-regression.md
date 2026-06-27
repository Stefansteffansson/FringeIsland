# TASK-H004-03: Continuity E2E + no-regression sweep (STORY-1 continuity, STORY-4)

---
id: TASK-H004-03
title: Transcendence + farewell E2E journeys and the no-regression sweep
status: done
feature: FEAT-H004
owner: hub
wave: ferd
depends_on: [TASK-H004-01, TASK-H004-02]
estimated_hours: 3
---

## Description

Prove the IDN-2 slice end-to-end and guard the existing identity flows. Continuity is a Supabase id-preservation property exercised at the **Hub E2E** (FEAT-PC002 names it so): a Mist that becomes a FIM keeps the **same session continued** — nothing restarts. Plus the farewell journey and the no-regression sweep across FEAT-H001/H002/H003.

## Acceptance criteria

- [ ] **Transcendence journey (E2E):** Look around → become-a-FIM (credentials + consent) → submit → lands on **`/groups`** as a FIM, same session continued (no re-scaffold, no "new user" reset) (STORY-1).
- [ ] **Farewell journey (E2E):** Look around → "say goodbye" → confirm (`ConfirmModal`) → back to the **sessionless entry** (STORY-3).
- [ ] **No regression (STORY-4):** FEAT-H001 sign-in and FEAT-H002 direct FIM sign-up behave **unchanged** (a person can still sign up as a FIM at the door without first being a Mist); FEAT-H003 sessionless entry / lazy Mist / three-state gating behave unchanged **except** the become-a-FIM CTA now opens the in-place flow.
- [ ] A **FIM** session shows **no** farewell/erase Mist chrome (STORY-4).
- [ ] The **full hub suite** (unit + integration + E2E) is green; lint + build clean (Test DoD before `6-done`).

## Technical notes

- **New `hub/tests/e2e/transcendence.spec.ts`** — the two journeys (transcendence + farewell), mirroring `tests/e2e/entry.spec.ts` / `signup.spec.ts` idioms and `tests/e2e/helpers/auth.ts`. E2E requires the dev server on `localhost:3000` (Hub CLAUDE.md §Testing).
- Regression is largely covered by keeping the existing unit/integration/E2E suites green; add only the FIM-no-farewell-chrome guard where not already implied.
- **Honesty note:** E2E continuity is the journey-level proof; the data-level continuity (same `personal_group_id`) is already asserted at the integration tier in TASK-H004-01. If the dev server / browser is unavailable in the build environment, record the E2E run status honestly in the bridge (specs authored, run pending) rather than claiming a green E2E pass.

## Verification

- `npm run test:e2e -w hub` green (dev server running); `npm run test:unit -w hub` + `npm run test:integration -w hub` green; `npm run lint -w hub` + `npm run build -w hub` clean.
