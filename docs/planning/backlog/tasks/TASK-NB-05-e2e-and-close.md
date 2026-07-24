# E2E + N-B close (FEAT-H031 / FEAT-PD014)

---
id: TASK-NB-05
title: E2E + N-B close
status: todo
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
- [ ] E2E: acting-invitation fan-out → answer in bell → convergence visible; nomination answered in place; PendingNominations gone.
- [ ] Both FEAT-PD014 + FEAT-H031 → 6-done (Implementation notes; L4 summaries updated in the same commit).
- [ ] ADR-U051 → Accepted.
- [ ] Full unit + E2E sweeps green (found-not-caused fencing for any pre-existing reds).

## Technical notes
Depends on the schema gate merged + the Hub half built. E2E fixture needs single-token display names (nickname first-token render).

## Verification
`cd hub && npm run test:e2e` + the area-gate DoD checklist in the completion plan.
