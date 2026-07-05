# H017 lib + BFF routes: nominate / respond / hand-over / close / delete (5 handlers) + red-first route-units

---
id: TASK-H017-01
title: lib/groups leadership-transfer + closure fetchers and the 5 BFF routes (nominate-steward, hand-to-deusex, nomination-response, close, delete) + the scoped pending-nomination read + red-first route-unit tests
status: done
assigned_to: claude
priority: high
feature: FEAT-H017
owner: hub
wave: ferd
cycle: Groups G-E
depends_on: []
estimated_hours: 5
---

## Description

The Surface plumbing for FEAT-PC014 (already `6-done`, merged): five mutation routes + one scoped read, all API-first (ADR-U009/U038) — the BFF relays the contract's answers and gates nothing client-side. No migration.

**Routes (spec §Solution sketch):**
- `POST /api/groups/[id]/nominate-steward` — body: ordered `nominee_group_ids` → `nominate_steward(p_group_id, p_nominee_ids)`
- `POST /api/groups/[id]/hand-to-deusex` → `hand_stewardship_to_deusex(p_group_id)`
- `POST /api/notifications/[id]/nomination-response` — body: `accept` (boolean) → `respond_to_stewardship_nomination(p_notification_id, p_accept)`
- `POST /api/groups/[id]/close` → `close_group(p_group_id)`
- `DELETE /api/groups/[id]` → `delete_group(p_group_id)` (deliberate deletion — **never** conflated with member removal / leave)
- the scoped pending-nomination read — a minimal own-notifications fetch filtered to `type = 'stewardship_nomination'`, unanswered, unexpired (the A-NTF re-home seam; the one new read).

**House map (spec §BFF):** 42501→403, P0002→404, P0001→409 **with the contract message passed through verbatim** (it carries the honest outcome/refusal copy the Surface renders in place — the H016 precedent), 22023→400, else 500 content-free. All mutations Node-runtime. **id-only telemetry** (STORY-6): actor, group id, operation, outcome — never member/group names or nominee id lists.

## Acceptance criteria

- [ ] `lib/groups/leadership.ts` (or sibling) fetchers wrapping each RPC + the scoped pending-nomination read; JWT via the Authorization header (never cookies in the route — platform CLAUDE.md)
- [ ] The 5 routes exist with the exact SQLSTATE→HTTP mapping; the 409 body passes the contract message through verbatim (canary-asserted)
- [ ] `DELETE /api/groups/[id]` is its own verb/route, distinct from any member-removal path (spec Rabbit hole: don't conflate Close/Delete/Leave/Remove)
- [ ] The pending-nomination read returns only the caller's own `stewardship_nomination` rows (unanswered, unexpired); no other notification type leaks
- [ ] id-only telemetry on success and on each refusal variant (403/404/409/400); no names or nominee lists in events (canary-asserted)
- [ ] Red-first route-unit tests for all 5 handlers + the read (mapping, body validation, telemetry shape); demonstrated red before the handlers exist
- [ ] `next build` clean (the Node-runtime routes stay Node-safe; the `/groups` read that mounts the affordance stays Edge-safe if it rides the existing Edge read)

## Technical notes

Model on the H016 BFF handlers (`hub/app/api/groups/[id]/...` mutation routes; SQLSTATE→HTTP house map with message passthrough; id-only telemetry, canary-asserted). Route-unit harness: the existing `hub/tests/unit` route-handler pattern (mock the supabase client / fetcher, assert status + body + `emitTelemetry` calls). The pending-nomination read is a scoped own-notifications fetch — NOT a notifications inbox (spec Rabbit hole; A-NTF seam). Confirm the FEAT-PC014 RPC names/signatures against `supabase/migrations/20260705072252_feat_pc014_leadership_transfer_closure_contracts.sql` before wiring. Nominate body is an ordered id array (arbitrary length); relay the contract's outcome, never predict decline routing (next nominee vs DeusEx is the contract's).

## Verification

Route-unit suite green (red-first); `next build` clean. No migration. Lands `done` (no schema gate — Surface-only).
