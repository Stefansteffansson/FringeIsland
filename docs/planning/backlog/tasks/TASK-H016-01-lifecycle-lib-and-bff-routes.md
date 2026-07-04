# Membership lifecycle lib + BFF routes: pause / activate / remove / leave

---
id: TASK-H016-01
title: lib fetchers + transports and 3 BFF route files (POST pause, POST activate, DELETE remove, POST leave) with SQLSTATE mapping and id-only telemetry + red-first route units
status: todo
assigned_to: claude
priority: high
feature: FEAT-H016
owner: hub
wave: ferd
cycle: Groups G-D
depends_on: []
estimated_hours: 3
---

## Description

The plumbing half of FEAT-H016, red-first: route-unit tests (modules absent at collection) before the handlers. Four mutations over the FEAT-PC013 contracts — no new reads (`membership_status` rides the existing detail payload; gating rides the existing my-permissions read).

- `lib/groups/queries.ts`: `GroupMemberEntry` gains `membership_status`; four rpc wrappers (`pauseMember`, `activateMember`, `removeGroupMember`, `leaveGroup` — the last returns the contract's `{group_id, group_name}`).
- `lib/groups/client.ts`: four transports + type re-exports (the `throwFrom`/`GroupsApiError` pattern).
- Routes: `app/api/groups/[id]/members/[memberGroupId]/route.ts` (DELETE = remove), `.../members/[memberGroupId]/pause/route.ts` + `.../activate/route.ts` (POST), `app/api/groups/[id]/leave/route.ts` (POST). All Node-runtime mutations (no Edge pin — the hot-read convention is reads-only). SQLSTATE→HTTP per house map: 42501→403, P0002→404, P0001→409 (message passed through — it carries the honest G-E refusal copy), 22023→400.

## Acceptance criteria

- [ ] Route units demonstrated RED (modules absent at collection) → GREEN
- [ ] Unauthenticated callers 401 on all four handlers, telemetry variant fired
- [ ] Success paths relay the contract result (leave returns the payload; the others `{ok:true}`)
- [ ] Every refusal maps per the house table with the substrate message passed through (the sole-Steward/last-member copy reaches the client verbatim)
- [ ] Telemetry id-only on success and failure variants (actor auth-id, group id, member id, outcome) — display names never in events

## Technical notes

Copy the `members/[memberGroupId]/roles/[roleId]/route.ts` shape (auth via `createClient` + `auth.getUser`, params Promise, lib fetcher throws the SQLSTATE-carrying error, `emitTelemetry`). Route units on the `group-roles-routes.test.ts` harness. The two cancel shapes precedent (H015) applies: remove keys on `(group, memberGroupId)` — never conflated with invitation cancels, which live under `/invitations/`.

## Verification

`npx jest tests/unit/app/api/group-membership-routes.test.ts` red before, green after; lint clean.
