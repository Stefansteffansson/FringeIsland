# Groups lib + BFF routes: POST /api/groups, GET+PATCH /api/groups/[id]

---
id: TASK-H013-01
title: Groups lib wrappers + the three BFF routes (create, detail, settings) with SQLSTATE mapping and content-free telemetry
status: done
assigned_to: claude
priority: high
feature: FEAT-H013
owner: hub
wave: ferd
cycle: Groups G-A
depends_on: [TASK-PC010-01, TASK-PC010-02]
estimated_hours: 3
---

## Description

Typed RPC wrappers in `hub/lib/groups/` (extend `queries.ts` + a browser `client.ts` per the sessions-lib pattern) and the three routes: `POST /api/groups` (create), `GET /api/groups/[id]` (detail — Edge+`dub1`, ADR-U036/U037), `PATCH /api/groups/[id]` (settings; standard runtime). Private BFF per ADR-U038 — presentation only, no rule lives here.

## Acceptance criteria

- [ ] Route-unit tests red-first: 401 sessionless; 42501→403; P0002→404; 22023→400; success shapes; telemetry events content-free (no names/descriptions/member data — group id only)
- [ ] GET detail Edge+`dub1` with local-claims identity (ADR-U037 read pattern); POST/PATCH via `getUser`
- [ ] Lib wrappers typed against the PC010 payloads (viewer block incl. `can_manage_settings`)

## Technical notes

Patterns: `hub/app/api/sessions/*` (dynamic segment + DELETE precedent), `hub/app/api/groups/route.ts` (existing GET list). Keep all imports Edge-safe on the GET route.

## Verification

`npm run test:unit -- groups` (route units) red→green; lint clean.
