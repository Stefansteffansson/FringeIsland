# TDD pair green + Phase-2 slice gate (STORY-3)

---
id: TASK-H001-05
title: TDD pair green + Phase-2 slice gate (STORY-3)
status: done
assigned_to: Claude (CC)
priority: high
feature: FEAT-H001
owner: hub
wave: ferd
depends_on: [TASK-H001-03, TASK-H001-04]
estimated_hours: 3
---

## Description

Close STORY-3 and the Phase-2 gate: the thin slice runs end-to-end (sign in → `/groups`, DB→API→frontend) with the TDD pair green and every vertical seam present or explicitly N/A. Tests are written **first** (red), then implementation makes them green.

## Acceptance criteria

- [ ] **Jest integration** — `tests/integration/groups/groups-read-path.test.ts`: a member sees their active engagement group; a private group they are NOT an active member of is excluded (RLS scoping, V2); empty membership → `[]`. Plus `tests/integration/auth/signin.test.ts`: valid creds succeed, invalid creds yield `null` session.
- [ ] **Playwright E2E** — `tests/e2e/auth.spec.ts` (login page loads; invalid creds show error; valid creds redirect to `/groups`) + `tests/e2e/groups.spec.ts` (authed `/groups` renders, no redirect, bell mount present).
- [ ] `cd hub && npm run test:integration` green; `cd hub && npm run test:e2e` green (dev server on :3000).
- [ ] Vertical-seam review vs `phase-2-kickoff.md`: V1 audit entry, V2 RLS-backed fetch, V3 bell mount, V4 telemetry all present; V5 transactions explicitly N/A.
- [ ] `npm run lint` + `next build` green; FEAT-H001 → `6-done`, §L4 row + features index updated in the same commit; `CHANGELOG.md` noted.

## Technical notes

- Integration hits the live shared Supabase (`.env.local`); create+cleanup test data per the oracle's helper pattern.
- E2E reuses storageState auth from global-setup.

## Verification

- Full slice: `npm run dev` (root) → sign in → land on `/groups`; integration + E2E suites green; gate met.
