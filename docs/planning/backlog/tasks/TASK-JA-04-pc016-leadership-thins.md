# leadership.ts thins to a contract consumer — the audit LOW finding closes

---
id: TASK-JA-04
title: leadership.ts thins to a contract consumer — the audit LOW finding closes (FEAT-PC016 STORY-2)
status: todo
assigned_to: Claude
priority: medium
feature: FEAT-PC016
owner: hub
wave: ferd
cycle: J-A
depends_on: [TASK-JA-02]
estimated_hours: 1
---

## Description
Swap `fetchPendingNominations()` in `hub/lib/groups/leadership.ts` from the direct `.from('notifications')` read + client-clock date math to a thin `get_my_pending_nominations` RPC call. External behaviour unchanged.

## Acceptance criteria
- [ ] `fetchPendingNominations()` calls the RPC and performs no filtering, date math, or table-shape knowledge of its own.
- [ ] The `PendingNomination` payload and `GET /api/me/nominations` behave identically (existing unit tests pass unchanged: `hub/tests/unit/lib/groups-leadership.test.ts`, `hub/tests/unit/app/api/group-leadership-routes.test.ts`).
- [ ] The 2026-07-06 audit LOW finding is recorded closed in the perf/compliance trail (`docs/planning/hub-v2/api-conformance-register.md`).

## Technical notes
Current implementation at `hub/lib/groups/leadership.ts:95-118`. The route (`hub/app/api/me/nominations/route.ts`) stays Edge + `dub1` + `getVerifiedUserId` — an RPC of equal weight on an already-Edge route (no budget change, per the spec's Performance-budget note).

## Verification
`npm run test:unit` green; `npm run test:integration:groups` green post-migration.
