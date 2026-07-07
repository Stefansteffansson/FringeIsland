# H020 player BFF routes + client lib — the player's data path

---
id: TASK-JB-03
title: H020 player BFF routes + session-cache client
status: done
assigned_to: Claude
priority: high
feature: FEAT-H020
owner: hub
wave: ferd
cycle: J-B
depends_on: [TASK-JB-02]
estimated_hours: 4
---

## Description

The player's API-first data path: `GET /api/journeys/enrollments/[enrollmentId]/player` (Edge + `dub1` + `getVerifiedUserId` — hot read → `get_player_state`), `POST /api/journeys/enrollments/[enrollmentId]/steps/[stepId]/enter` and `.../complete` (Node + `getUser` — mutations). Client lib `hub/lib/journeys/player.ts`: `peekPlayerState`/`fetchPlayerState` per the PR #102 session-cache pattern (shared in-flight, failed-read-never-cached), `enterStep`/`completeStep` background-save wrappers, `invalidatePlayerCache()` added to the AuthContext sign-out block.

## Acceptance criteria

- [ ] Route-policy conformance walk green with zero new exceptions (reads Edge+dub1, mutations Node)
- [ ] SQLSTATE→HTTP mapping per house pattern (42501→403, P0002→404, P0001→409, sessionless→401)
- [ ] Cache semantics unit-tested: peek paints last payload, fetch shares in-flight, failure never cached, sign-out invalidates
- [ ] Types keep the open vocabulary (`kind: string`) — no unions over registry keys

## Verification

`npm run test` unit suites green incl. `route-policy-conformance.test.ts`; new route + client tests.
