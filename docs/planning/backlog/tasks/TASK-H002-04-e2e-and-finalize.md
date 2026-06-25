# TASK-H002-04: E2E specs + finalize to 6-done

---
id: TASK-H002-04
title: Sign-up E2E specs + DoD finalisation
status: done
feature: FEAT-H002
owner: hub
wave: ferd
depends_on: [TASK-H002-03]
estimated_hours: 3
---

## Description

End-to-end coverage of the sign-up flow in a real browser, then the Definition-of-Done finalisation (maturity, summaries, changelog).

## Acceptance criteria

- `hub/tests/e2e/signup.spec.ts` (using `test.use({ storageState: { cookies: [], origins: [] } })` for an unauthenticated context):
  - Given a fresh unique email, when the user completes the sign-up form (with consent) and submits, then they land on `/groups` and see their "FringeIsland Members" membership. *(STORY-1, STORY-2)*
  - Given the consent box is unchecked, when the user submits, then sign-up is blocked and the inline error shows; no navigation. *(STORY-3)*
  - Given an already-registered email, when the user submits, then an inline error renders and they remain on `/signup`. *(STORY-1)*
  - The spec mints fresh emails and cleans up created users (admin client teardown) so the shared substrate stays clean.
- Vertical checklist (products tier) passes: V1 audit seam fired, V2 (the `/groups` read stays RLS-backed — unchanged), V3 bell mount present (inherited), V4 telemetry on start/success/failure, V5 none.
- DoD: feature maturity → `6-done` with Implementation notes; §L4 summary row + `features/README.md` row → `6-done`; `CHANGELOG.md` updated (user-visible: account creation).

## Technical notes

- E2E selectors per TASK-H002-03. Reuse `tests/e2e/helpers/auth.ts` patterns for admin teardown; do not pollute the shared `storageState` session user.
- `webServer` auto-starts `npm run dev`; serial (`workers: 1`).
- Keep tests resilient to the auto-confirm setting (expect a session/redirect); if the live project flips to confirmation-required, the redirect assertion becomes the pending-confirmation assertion — note in the spec.

## Verification

- `npm run test:e2e -w hub` (incl. `signup.spec.ts`) green; `npm run test:integration -w hub` green; `npm run lint -w hub` + `npm run build -w hub` clean.
