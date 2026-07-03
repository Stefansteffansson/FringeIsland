# Sessions lib + BFF routes (GET /api/sessions, DELETE /api/sessions/[id])

---
id: TASK-H012-01
title: Sessions lib + BFF routes — list + revoke, Edge+dub1, SQLSTATE→HTTP, content-free telemetry
status: done
assigned_to: claude
priority: high
feature: FEAT-H012
owner: hub
wave: ferd
cycle: E
depends_on: [TASK-PC009-01]
estimated_hours: 3
---

## Description

The BFF plumbing (FEAT-H012, consumed by STORY-1/2): `hub/lib/sessions/` (fetch/revoke + types over the PC009 RPCs) and routes `GET /api/sessions` + `DELETE /api/sessions/[id]` — `@supabase/ssr` cookie auth, Edge + `dub1` (ADR-U036, Edge-safe imports only), SQLSTATE→HTTP (sessionless→401, 42501→403, P0002→404), content-free telemetry (**never** `user_agent`/`ip` in logs). Private BFF per ADR-U038 — no rule lives only here (the RPCs self-gate; TASK-PC009-02 carries the adversarial substrate proof).

## Acceptance criteria

- [ ] Route-unit tests demonstrated RED (modules absent) then GREEN: 401 sessionless; 200 list pass-through; 204/200 revoke; 403 on 42501; 404 on P0002; telemetry content-free
- [ ] `next build` clean (Edge-safety type gate)

## Technical notes

Follow the journal BFF pattern (`hub/app/api/journal/*`, Cycle D) for route shape, error mapping, and route-unit test style (`hub/tests/unit/app/api/`).

## Verification

`npm run test -w hub -- tests/unit` green; `next build` clean.
