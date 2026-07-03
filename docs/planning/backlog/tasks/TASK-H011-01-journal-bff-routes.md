---
id: TASK-H011-01
title: Journal BFF routes — /api/journal (GET/POST) + /api/journal/[id] (PATCH/DELETE)
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H011
owner: hub
wave: ferd
cycle: IDN-5
depends_on: [TASK-PD001-02]
estimated_hours: 3
---

# TASK-H011-01: Journal BFF routes (plumbing over FEAT-PD001)

## Description

Private BFF routes per ADR-U038 — session handling + SQLSTATE→HTTP mapping
only, **no rule of their own** (enforcement is substrate-side, proven by the
TASK-PD001-01 adversarial tests):

- `GET /api/journal` (list; `limit`/`before` query params →
  `get_own_journal_entries`), `POST /api/journal` (create), and
  `PATCH`/`DELETE /api/journal/[id]` — all via `hub/lib/journal/queries.ts`,
  Bearer-token auth per the platform route convention.
- Mapping: 42501 → 403 (Mist/write refusal), P0002 → 404, 22023/23514 → 400,
  else 500. **Error payloads never echo `body` content** (observability
  no-go).

TDD: route-level integration tests red-first (route absent → 404) at
`hub/tests/integration/journal/journal-routes.test.ts`, following the existing
account-route test pattern.

## Acceptance check

- All four verbs round-trip for a FIM; Mist POST → 403; foreign id → 404.
- Signed-out request → 401. No content in error payloads.

## Verification

`npm run test:integration:journal -w hub`; `npm run lint`.
