# Invitations BFF: lib fetchers + route handlers + red-first route units

---
id: TASK-H015-01
title: Invitations BFF — GET/POST /api/groups/[id]/invitations, DELETE both cancel shapes, GET /api/groups/[id]/member-search, GET /api/me/invitations, POST accept / DELETE decline + red-first route-unit tests
status: done
assigned_to: claude
priority: high
feature: FEAT-H015
owner: hub
wave: ferd
cycle: Groups G-C
depends_on: []
estimated_hours: 4
---

## Description

BFF plumbing over the FEAT-PC012 contracts (merged, PR #68), API-first (ADR-U038 — routes are presentation only; every rule lives in the substrate). Red-first route units on the H014 `group-roles-routes.test.ts` pattern (modules absent → PGRST-shape mocks).

Routes:
- `GET /api/groups/[id]/invitations` → `get_group_invitations` (Edge+`dub1` hot read, ADR-U036/U037)
- `POST /api/groups/[id]/invitations` — body `{member_group_id}` XOR `{email}`; mixed/empty 400; relays `invite_member` / `invite_by_email`
- `DELETE /api/groups/[id]/invitations/members/[memberGroupId]` → `cancel_member_invitation`
- `DELETE /api/groups/[id]/invitations/email/[invitationId]` → `cancel_email_invitation`
- `GET /api/groups/[id]/member-search?q=` → `search_invitable_members` (Edge+`dub1`)
- `GET /api/me/invitations` → `get_my_invitations` (Edge+`dub1`)
- `POST /api/me/invitations/[groupId]/accept` → `accept_group_invitation`
- `DELETE /api/me/invitations/[groupId]` → `decline_group_invitation`

## Acceptance criteria

- [ ] SQLSTATE→HTTP per house map (42501→403, P0002→404, 22023→400, 23505→409); refusal messages passed through
- [ ] Reads Edge+`dub1` (`runtime='edge'`, `preferredRegion='dub1'`, Edge-safe imports); mutations Node with per-request `getUser`
- [ ] POST XOR validation (member_group_id XOR email → else 400, no RPC call)
- [ ] Id-only telemetry on every success and refusal — **email addresses and search queries never in events** (STORY-6)
- [ ] Route units demonstrated RED (modules absent) → GREEN

## Technical notes

Follow `hub/app/api/groups/[id]/roles/*` handler patterns + `lib/groups/*` fetcher conventions. Auth via `Authorization: Bearer` per platform CLAUDE.md. Search query param `q` relayed verbatim; no client-side trimming logic beyond UX.

## Verification

`npx jest tests/unit/api/group-invitations-routes.test.ts` red then green; `npm run lint` clean.
