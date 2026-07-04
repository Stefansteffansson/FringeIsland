# Roles lib + the six BFF route handlers, red-first route-units

---
id: TASK-H014-01
title: lib/groups queries+client extensions and the six role BFF routes (fabric read Edge+dub1, create/update/delete, assign/remove, my-permissions) + red-first route-unit tests
status: done
assigned_to: claude
priority: high
feature: FEAT-H014
owner: hub
wave: ferd
cycle: Groups G-B
depends_on: []
estimated_hours: 4
---

## Description

The API-first plumbing consuming FEAT-PC011 (merged, PR #65). Extend `lib/groups/queries.ts` (RPC wrappers: `get_group_roles`, `create_group_role`, `update_group_role`, `set_group_role_permission`, `delete_group_role`, `assign_member_role`, `remove_member_role`, and `fetchMyPermissions` = `get_current_personal_group_id` → `get_user_permissions`; `GroupMemberEntry` gains `member_group_id` + `roles[]`) and `lib/groups/client.ts` (BFF transports). Routes per the spec: `GET`/`POST /api/groups/[id]/roles` (GET Edge+`dub1`, ADR-U036/U037 getClaims identity; POST per-request getUser), `PATCH`/`DELETE /api/groups/[id]/roles/[roleId]` (PATCH body: `name?`/`description?`/`set_permission? {name, granted}`), `POST`/`DELETE /api/groups/[id]/members/[memberGroupId]/roles/[roleId]`, `GET /api/groups/[id]/my-permissions` (Edge+`dub1`).

SQLSTATE→HTTP per house map, extended for this cycle: 42501→403, P0002→404, 22023→400, **23505→409** (duplicate name / double-assign), **P0001→409** (held-role and last-Steward invariant refusals — message passed through so the Surface can show it in place), else 500 content-free. Telemetry id-only (`roles.*` events: actor, group, role ids — role names are member content, never in events).

## Acceptance criteria

- [ ] All six handlers + my-permissions exist; contracts self-gate, routes only map (ADR-U038 posture — no business rule route-side)
- [ ] 401 sessionless on every handler without reaching the contract
- [ ] Full SQLSTATE map incl. 409 for 23505/P0001; invariant messages surfaced in the 409 body; 500s content-free
- [ ] Telemetry: success + failure-variant events on every handler, id-only (STORY-5)
- [ ] Route-units demonstrated RED (modules absent) → GREEN

## Technical notes

Route-unit file `hub/tests/unit/app/api/group-roles-routes.test.ts` on the `groups-crud-routes.test.ts` harness (mock `next/server`, `@/lib/supabase/server`, `@/lib/groups/queries`; telemetry sink; content-free assert with planted role-name strings). Fabric GET + my-permissions GET use `getVerifiedUserId` (getClaims); mutations use `getUser`.

## Verification

`npx jest tests/unit/app/api/group-roles-routes.test.ts` red → green; lint clean.
