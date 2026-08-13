---
id: TASK-TRX-02
title: Identity flips FIM before finalisation commits — refused reads poison the session's caches
status: done — 2026-08-13, PR #531 merged (identity hold + converge in AuthContext; unit red-first 2 cells + labelled boundary guard; E2E journey extended 3/3; unit tier 1450/1450, lint 0 errors, build green)
assigned_to: unassigned
priority: high
feature: FEAT-H004
owner: products/hub (auth seam — AuthContext.transcend)
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 3
---

# TASK-TRX-02 — the post-transcendence read race

**Found:** 2026-08-13, same walk as TASK-TRX-01. After transcending, `/groups` showed "Failed to load your invitations." and "Platform announcements can't be shown right now." — still showing 7 minutes later, while direct RPC probes returned clean.

## The mechanism, verified in the logs

`transcend()` converts first (`supabase.auth.updateUser` — the narrow auth-SDK exception), then finalises through `/api/auth/transcend`. The conversion fires `USER_UPDATED`; `deriveIdentity` keys on `user.is_anonymous`, so **`identity` becomes `'fim'` the moment the conversion lands — while `finalise_transcendence`'s transaction is still open** and the substrate still sees a Mist (`is_temporary=true`, row locked).

Edge + postgres logs, 2026-08-13 19:54:23 UTC (all one second):

| t | call | result |
|---|---|---|
| .261 | `get_platform_statistics` | 403 |
| .275 | `get_my_conversations` | 403 "Communication is FIM-only" |
| .300 | `finalise_transcendence` | 200 |
| .355–.366 | overview bundle fan-out (`account_state`, `onboarding`, `profile`, `member_groups`, `invitations`) | `get_my_invitations` **403** "invitations are FIM-only" |
| .471 | `get_platform_announcements` | 403 |
| .506/.545 | route audit + telemetry | 204 |

Every FIM-gated read that fired in the window was refused mid-transaction. The refusals then **stick**:

- `adoptMyInvitationsRead` parks the rejected bundle slice as the consume-once adopted read (`hub/lib/groups/client.ts:437-463`); the first `/groups` mount consumes the refusal into `MyInvitations` error state and nothing re-reads.
- The announcements panel renders its fetch failure and has no retry trigger.
- Only a substrate refusal (`{error}` slice), not a transport failure, so the ADR-U042 fallback correctly does NOT fire — the poison is by-design slice semantics meeting an impossible identity state.

## Fix (Hub — the auth seam owns the identity semantics)

In `AuthContext`:

1. **Hold identity at `'mist'` while a transcend is in flight** — a `transcending` state consulted by the `identity` memo (`hub/lib/auth/AuthContext.tsx:264`). The premature FIM wave never fires: fim-keyed effects run once, at the real flip, after finalisation resolved. Failure path keeps today's semantics (flag drops, error surfaces).
2. **On success, before returning: `invalidateAllCaches()` + dispatch the house `refreshNavigation` event** — no Mist-era cache (profile label, adopted slices, session caches) survives into the FIM session, and mounted listeners re-read.

Known limitation, accepted: a *second tab* of the same browser receives the cross-tab `USER_UPDATED` immediately and can still race the window; this fix heals the transcending tab (the reported repro). Noted for a later cross-tab hint if it ever bites.

## Acceptance criteria (unit, red-first)

- Given a transcend in flight whose conversion has landed (auth listener delivered a non-anonymous user) and whose finalisation has not resolved, `identity` still reads `'mist'`; when the route resolves ok, `identity` reads `'fim'`.
- On transcend success, `invalidateAllCaches` is called and `refreshNavigation` is dispatched before `transcend()` resolves.
- On transcend failure (route non-ok), the error surfaces and no cache invalidation fires (behaviour parity).

E2E (with TASK-TRX-01 applied): the transcend walk lands on `/groups` with the invitations card and announcements section rendering without error, and the header/profile showing the entered name.

## Related

- TASK-TRX-01 (substrate half). Independent PRs: this one is fuller-auto; TRX-01 holds at the schema gate.
