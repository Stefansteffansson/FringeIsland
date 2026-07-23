# N-A: bell, dropdown, inbox surface

---
id: TASK-NA-04
title: Hub surface — BFF routes, bell + badge, dropdown, /notifications inbox
status: todo
assigned_to: claude
priority: high
feature: FEAT-H030
owner: hub
wave: ferd
cycle: N-A
depends_on: [TASK-NA-03]
estimated_hours: 5
---

## Description
FEAT-H030 in full: the four BFF routes (`GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all`) as thin authenticated pass-throughs; the bell + badge in navigation (context-cached count, `9+` cap, optimistic decrement + rollback); the recent-15 dropdown (unread-first, mark-read on click, mark-all, View all); the `/notifications` keyset-paginated inbox; kind-agnostic rendering with safe unknown-kind fallback; actionable rows passive-only with the status chip (Awaiting response / Handled / Expired). Unit tests red-first per component/route.

## Acceptance criteria
- [ ] Every FEAT-H030 story AC covered by a unit or integration test; suite green; no browser-side `.from()`/`.rpc()` (outer-ring gate green).
- [ ] Unknown-kind row renders generically (test with a fabricated kind).
- [ ] `group_id` NULL / inaccessible click-through degrades gracefully (no dead link).
- [ ] Design-system-layer primitives used for bell/badge/list (no ad-hoc restyle).
- [ ] `next build` passes (the type gate — required before any 6-done claim).

## Technical notes
Fetch-based only — no polling loops, no socket work (N-C). Count fetch must not block first paint (badge hydrates late). Follow FEAT-H028's BFF route + component test shape. Nickname fixtures single-token (E2E later).

## Verification
`cd hub && npx jest tests/unit --runInBand` green; `npm run build` green; manual: badge count matches DB state for a seeded user.
