# Acting lib wrappers + BFF routes for G-F

---
id: TASK-H018-01
title: Acting lib wrappers + BFF routes (contexts, invite-group, respond, withdraw, memberships-of, search)
status: done
assigned_to: claude
priority: high
feature: FEAT-H018
owner: hub
wave: ferd
cycle: G-F
depends_on: []
estimated_hours: 3
---

## Description

Extend `hub/lib/groups/` with the FEAT-PC015 wrappers (fetchActingContexts, fetchPermissionsAs, fetchGroupMembershipsOf, inviteGroup, searchInvitableGroups, respondToGroupInvitation, leaveGroupAsGroup) + the additive payload types (`member_group_type?`, `non_system_member_count?`), and the BFF route handlers following the FEAT-H017 shape (house SQLSTATE→HTTP map, contract messages passed through verbatim, id-only telemetry).

## Acceptance criteria

- [ ] Route/lib unit tests written red-first (modules absent → red), then green
- [ ] SQLSTATE map: P0002→404, 22023/P0001→409 with verbatim contract copy, 42501→403 (house precedent)
- [ ] No table reads/writes — RPC wrappers only (ADR-U038; routes are presentation plumbing)

## Technical notes

Follow `queries.ts` wrapper idiom (client param, rethrow). Route naming per the existing `app/api/groups/` tree; reads follow the H017 Edge+`dub1` precedent where they are hot-path.

## Verification

`npm run test:unit` green including the new route/lib specs.
