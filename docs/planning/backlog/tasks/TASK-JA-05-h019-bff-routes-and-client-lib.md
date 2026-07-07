# FEAT-H019 BFF routes + journeys client lib — five routes, session cache, telemetry

---
id: TASK-JA-05
title: FEAT-H019 BFF routes + journeys client lib — five routes, session cache, telemetry
status: done
assigned_to: Claude
priority: high
feature: FEAT-H019
owner: hub
wave: ferd
cycle: J-A
depends_on: [TASK-JA-02]
estimated_hours: 4
---

## Description
The plumbing half of the surface: `GET /api/journeys`, `GET /api/journeys/[id]`, `GET /api/me/journeys` (hot reads), `POST /api/journeys/[id]/enroll` (body `{ group_id? }` — absent = self), `POST /api/journeys/[id]/withdraw` (mutations), plus `hub/lib/journeys/client.ts` with the session-cache pattern. Unit tests red-first per route/lib behaviour.

## Acceptance criteria
- [ ] Reads: `runtime='edge'`, `preferredRegion='dub1'`, `getVerifiedUserId()`; mutations: Node runtime (no edge export), `supabase.auth.getUser()` — the PR #111 route-policy conformance test passes with zero new exceptions.
- [ ] SQLSTATE→HTTP inline per house style: `42501`→403, `P0002`→404, sessionless→401, else 500.
- [ ] Content-free telemetry: `journey.catalog_loaded`, `journey.detail_loaded`, `journey.enrolled_self`, `journey.enrolled_group`, `journey.withdrawn` + failure variants — journey/group ids only, never titles.
- [ ] `hub/lib/journeys/client.ts`: module-scope cache (`peek*`/`fetch*`/`invalidate*`, shared in-flight, failed reads never cached) on the `hub/lib/groups/client.ts:54-133` pattern; invalidation wired to sign-out/session-end alongside the groups cache; mutations re-read, never optimistic.
- [ ] Unit tests demonstrated red first (route handlers + client cache), then green.

## Technical notes
Exemplars: `hub/app/api/groups/[id]/route.ts` (hot read, error map :42-52), `hub/app/api/groups/route.ts` POST (mutation). Telemetry helper: `hub/lib/observability/telemetry.ts` (`emitTelemetry`). Mutation-only route files must NOT export `runtime='edge'` (conformance rule). Unit-test prior art: `hub/tests/unit/app/api/group-leadership-routes.test.ts`, `hub/tests/unit/lib/groups/client-cache.test.ts`.

## Verification
`npm run test:unit` green including `route-policy-conformance.test.ts`; red-first evidence captured.
