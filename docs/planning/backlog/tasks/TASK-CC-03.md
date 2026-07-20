# The channel manager: hub/lib/realtime/

---
id: TASK-CC-03
title: The shared ADR-U039 tenant substrate — one socket, declarative private-topic tenants, status + rejoin surface, teardown; A-NTF-ready
status: done
assigned_to: claude
priority: high
feature: FEAT-H027
owner: hub
wave: ferd
cycle: C-C
depends_on: []
estimated_hours: 3
---

## Description
`hub/lib/realtime/` (STORY-1, STORY-7 lifecycle half): a manager over the one AuthContext browser client — register a tenant as data (topic, events, handler), join `private: true` after `realtime.setAuth(access_token)`, exactly one subscription per armed topic (never duplicated across pages/remounts), channel status exposed (subscribed / reconnecting) with a rejoin callback, full teardown on sign-out/identity change, arming rule FIM + live session (the session-guard rule). `session-guard.ts` untouched (No-go).

## Acceptance criteria
- [ ] Unit suite red-first: subscribe-once semantics, setAuth-before-join, private config asserted, teardown on sign-out, no-arm for Mist/sessionless, status transitions + rejoin callback firing, tenant registration without manager edits (the A-NTF readiness proof)
- [ ] No second client/socket created anywhere; the manager takes the shared client as input
- [ ] Content-free telemetry hooks on join/refused/lost/rejoined

## Technical notes
Pattern precedent: `hub/lib/auth/session-guard.ts` (:97-115 subscription mechanics; :121-138 visibility/interval gating). Mock shape precedent: `hub/tests/unit/lib/auth/session-guard.test.tsx:89-181`. Channel status via supabase-js subscribe callback statuses (SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED).

## Verification
`npm run test:unit` — manager suite green after demonstrated red; lint clean.
