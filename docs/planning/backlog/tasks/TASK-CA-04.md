# Messages surface: inbox, detail, composer, roster entry, nav badge

---
id: TASK-CA-04
title: /messages inbox + /messages/[id] detail + send + roster Message action + FIM-only nav badge
status: todo
assigned_to: claude
priority: high
feature: FEAT-H025
owner: hub
wave: ferd
cycle: C-A
depends_on: [TASK-CA-03]
estimated_hours: 4
---

## Description
H025 STORY-1..5 surfaces: FIM-only Messages nav item with conversations-with-unread badge (Mist: absent); `/messages` inbox (one list, kind + display context + recency + unread dot, empty state); `/messages/[id]` detail (chronological, load-earlier pagination, sender display with `'Unknown'` fallback, mark-read on open, composer with optimistic append + confirmed write-through + visible failure/retry); roster "Message" action → dm get-or-create → navigate.

## Acceptance criteria
- [ ] Every H025 STORY-1..5 criterion has a unit test demonstrated red first (component logic at the unit tier — pyramid upright)
- [ ] B6 loading states (skeletons, not spinners); B5 optimistic send ≤200 ms path
- [ ] First-paint request test: call count ≤ spec'd N, no duplicate fetches across auth churn
- [ ] No realtime anywhere; no notifications rendered or created

## Technical notes
`components/ui/` primitives + ConfirmModal convention; `'use client'` on anything touching `useAuth()`; kind renders from data (no kind switches).

## Verification
Unit sweep green; E2E rides TASK-CA-06.
