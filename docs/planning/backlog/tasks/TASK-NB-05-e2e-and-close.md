# E2E + N-B close (FEAT-H031 / FEAT-PD014)

---
id: TASK-NB-05
title: E2E + N-B close
status: done
assigned_to: Claude
priority: high
feature: FEAT-H031
owner: hub
wave: ferd
cycle: N-B
depends_on: [TASK-NB-03, TASK-NB-04]
estimated_hours: 3
---

## Description
The end-to-end journey (a real acting-invitation answered in the bell → the co-leader's letter shows "Answered by [name]"; a nomination answered in place), the ADR-U043 measurement pass, the plain-English walkthrough, maturity → 6-done for both specs, and the N-B session bridge. Accept ADR-U051 at the schema gate.

## Acceptance criteria
- [x] E2E: acting-invitation fan-out → answer in bell → convergence visible; nomination answered in place; PendingNominations gone.
- [x] Both FEAT-PD014 + FEAT-H031 → 6-done (Implementation notes; L4 summaries updated in the same commit).
- [x] ADR-U051 → Accepted.
- [x] Full unit + E2E sweeps green (found-not-caused fencing for any pre-existing reds).

## Outcome (2026-07-24)

E2E green across three specs (8 tests): the new `notification-actions.spec.ts` (1), `group-of-groups.spec.ts` (2), `leadership-transfer.spec.ts` (5). 940/940 unit; `next build` green; the PD014 integration suite re-verified 13/13.

Beyond the planned scope, the close found and fixed **two unmet acceptance criteria** (STORY-1 AC3 — a failed dispatch swallowed its reason; STORY-2 AC1 — the "Respond by" window was lost with the retired panel), both red-first, and **a second unflagged red E2E spec** (`leadership-transfer`, which still drove the retired `PendingNominations` testids). Two test-side defects in the adaptation were fixed rather than worked around: a navigation that aborted the in-flight dispatch, and an assertion that lost its scope when re-homed.

The ADR-U043 measurement pass and Stefan's live walk are **area-gate** items, not per-cycle — A-NTF still has N-C and N-D. Carried follow-up: the `/api/me/overview` bundle's now-unconsumed `nominations` slice.

## Technical notes
Depends on the schema gate merged + the Hub half built. E2E fixture needs single-token display names (nickname first-token render).

## Verification
`cd hub && npm run test:e2e` + the area-gate DoD checklist in the completion plan.
