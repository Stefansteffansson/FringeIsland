# Hub forum data layer: lib module, BFF routes, unit suites

---
id: TASK-CB-03
title: hub/lib/forum + BFF routes (forum read/post/reply/moderate) + sender-map consumption, unit red-first
status: todo
assigned_to: claude
priority: high
feature: FEAT-H026
owner: hub
wave: ferd
cycle: C-B
depends_on: [TASK-CB-01]
estimated_hours: 3
---

## Description
`hub/lib/forum/` (queries + client: session cache, in-flight dedupe, confirmed write-through, W9 `registerCacheInvalidator`), SQLSTATE→HTTP presentation (the `lib/messages/http.ts` pattern), BFF routes `GET|POST /api/groups/[id]/forum`, `POST /api/forum/[postId]/reply`, `POST /api/forum/[postId]/moderate` (mutations `getUser()`, GET `getClaims()`/`getVerifiedUserId()`; no runtime/region exports). `hub/lib/messages/` detail consumption updated to the `{display_name, attribution}` sender map in the same cycle.

## Acceptance criteria
- [ ] Unit suites demonstrated red (module-absent) → green; route-policy conformance walk green with zero exception entries
- [ ] No business rule lives only in a route (ADR-U038); routes are presentation/session plumbing
- [ ] W9 registration proven (cache drops at session end)

## Technical notes
Mirror `hub/lib/messages/client.ts` + `hub/app/api/groups/[id]/conversations/route.ts` verbatim in posture.

## Verification
`npm run lint` clean; unit sweep green; route-policy test green.
