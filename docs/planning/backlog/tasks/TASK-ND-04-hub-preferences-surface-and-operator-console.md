# Hub preferences surface + the operator nudge console

---
id: TASK-ND-04
title: Build FEAT-H033 — /notifications/preferences matrix, BFF routes, and the DeusEx nudge console with its cost line
status: done
assigned_to: claude
priority: high
feature: FEAT-H033
owner: hub
wave: ferd
cycle: N-D
depends_on: [TASK-ND-03]
estimated_hours: 4
---

## Description

The surface half. Consumes FEAT-PD016 API-first; carries no migration.

- `app/api/notifications/preferences/route.ts` — GET + PUT, mirroring `app/api/account/consent/route.ts` exactly (cookie session, ADR-U037 identity split, SQLSTATE mapping 22023 to 422 / 42501 to 409 / 28000 to 403, sessionless to 401 before the contract, everything else 500 surfaced).
- `app/api/notifications/nudge-policy/route.ts` — GET (composes the policy read + the reach count) + PUT, admin-gated in the contract.
- `app/notifications/preferences/page.tsx` — the categories x channels matrix.
- Unit tests for the fetchers/route handlers; the matrix renders from registry rows with zero hardcoded lists.

## Acceptance criteria

- [ ] Every FEAT-H033 story's acceptance criteria met.
- [ ] The matrix hardcodes no category, channel or grade list — a new registry row renders with no Hub change.
- [ ] `member_suppressible = false` rows are **unclickable**, not click-then-rollback (a toggle that visibly bounces reads as a bug).
- [ ] The `email` column does not render, and one honest line says why.
- [ ] Operator panel absent for non-admins **and** the PUT refused server-side when called directly — the gate is the contract, not the missing button.
- [ ] One standalone read per ADR-U042; the preferences matrix is **not** added to the overview bundle (a rarely-visited settings surface must not tax every page load — the N-C nominations-slice lesson applied before the mistake).
- [ ] `ConfirmModal` for any destructive confirmation; no browser `confirm()`.
- [ ] `next build` clean.

## Verification

`cd hub && npx jest --selectProjects unit` green; `npx next build` clean; manual walk of the matrix + the admin panel.

## Outcome (2026-07-26)

Built as specified. **Process deviation, recorded honestly: this half was test-after, not red-first.** Implementation preceded both the E2E and the unit tests, and all six panel tests plus the adversarial integration test passed on their first run — green-at-red, which the skill says to surface. Surfaced here and in FEAT-H033's Implementation notes; routed to the A-NTF area retro.

The DoD's pyramid rule earned its place: it revealed that the **rollback path had no coverage at all** (a refused save must visibly revert and state the reason). Now unit-tested, along with the locked-on render, the absent email column, and the one-read first-paint budget.
