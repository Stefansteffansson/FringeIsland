# Hub BFF routes + messages client library

---
id: TASK-CA-03
title: Messages BFF routes (route-policy conformant) + client lib with session cache and W9 registration
status: review
assigned_to: claude
priority: high
feature: FEAT-H025
owner: hub
wave: ferd
cycle: C-A
depends_on: [TASK-CA-02]
estimated_hours: 3
---

## Description
BFF plumbing (never sole enforcement — ADR-U038): `GET /api/messages`, `GET|POST /api/messages/[id]`, `POST /api/messages/[id]/read|join|leave`, `POST /api/messages/dm`, `POST /api/messages/group`, `GET /api/groups/[id]/conversations` — mutations `getUser()`, GETs `getClaims()`, no runtime/region exports. `hub/lib/messages/client.ts`: typed fetchers, session cache for the inbox slice, confirmed-response write-through on every mutation, `registerCacheInvalidator` (W9).

## Acceptance criteria
- [ ] Route-policy conformance test green over the new routes, zero exception entries
- [ ] Unit tests (red-first) for the client cache: invalidation on send/read/join/leave; sign-out clears via the registry
- [ ] SQLSTATE→HTTP mapping per house pattern; telemetry with actor + outcome; no business rule living only in a route

## Technical notes
Pattern: `hub/lib/journeys/client.ts` + `hub/lib/groups/client.ts` (existing registrants). BFF calls RPCs via PostgREST with the caller's JWT.

## Verification
`npm run test:unit` green incl. route-policy walk; manual smoke via dev server after gate.
