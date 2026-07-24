# Red-first actionable-notification contract suite (FEAT-PD014)

---
id: TASK-NB-01
title: Red-first actionable-notification contract suite
status: done
assigned_to: Claude
priority: high
feature: FEAT-PD014
owner: platform/domain/communication
wave: ferd
cycle: N-B
depends_on: []
estimated_hours: 3
---

## Description
Author the red-first integration suite for the N-B actionable-notification framework: action_data on the list contract, the acting-invitation fan-out to act_as_group holders, the respond_to_acting_invitation dispatch + first-answer-wins convergence, and NTF-8 lazy expiry-on-view.

## Acceptance criteria
- [x] Suite authored at `hub/tests/integration/notifications/actionable-notifications.test.ts` covering STORY-1..4.
- [ ] Demonstrated RED pre-migration — **BLOCKED**: an active ES256 window (TASK-INT-01) rejects `createTestUser` in `beforeAll`; control-proven (the unchanged N-A suite, 16/16 green on main, also fails 16/16 at the same `createTestUser` step). Red demonstration deferred to the next clear window.
- [ ] Green post-apply.

## Technical notes
Models the N-A suite (`notification-contracts.test.ts`) — same helpers, baseline-relative assertions, runTag cleanup. Fan-out topology: context group A (Alice) invites engagement group B; B has two act_as_group holders (Bob creator-Steward, Carol assigned) and one non-holder (Dave).

## Verification
`npx jest tests/integration/notifications/actionable-notifications.test.ts --runInBand` — red pre-migration (once ES256 clears), green post-apply.
