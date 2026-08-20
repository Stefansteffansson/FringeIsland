---
id: TASK-H047-1
title: The hat opens the conversations — wielded list/join/leave/create, the param-carried thread, the labelled composer
status: in-progress
assigned_to: claude
priority: high
feature: FEAT-H047
owner: hub
wave: unassigned
cycle: 2026-08-20 session
depends_on: [TASK-PD019-2, TASK-PD019-2R]
estimated_hours: one focused session (the spec's appetite)
---

# TASK-H047-1 — wielded conversation affordances (all three stories)

One task for the feature: STORY-1 (the list door: banner, A-referented rows, join/leave/create with one-time confirms naming the wielding), STORY-2 (the param-carried thread: `?acting=` behind Suspense, banner, "Sending as {A}" composer label, no optimistic wielded bubbles, the group clock, honest fallback), STORY-3 (kind badges + A-row highlight + Report hidden under the hat).

## Build map (rulings + mechanism facts pinned in the spec's walks)

- **Rulings (Stefan, 2026-08-19):** the link carries the hat (`/messages/[id]?acting=A`, server gate is the authority, per-page state only); composer label instead of per-message dialogs (join/leave/create keep one-time confirms).
- **Plumbing:** BFF routes gain param/body passthrough (`/api/groups/[id]/conversations`, `/api/messages/[id]` GET+POST, `/join`, `/leave`, `/read`, `/api/messages/group`); `lib/messages` client + queries gain acting params; the pending-bubble optimistic machinery stays personal-path-only.
- **Merge order:** after PR #562 (the T2R leave rider's schema gate) — the Leave-as-group door calls the rider's contract (already applied to the one DB, so tests run green locally).
- **useSearchParams sits behind Suspense** on the thread page (the W-1 CSR-bailout precedent).

## Acceptance check

FEAT-H047 STORY-1..3 ACs red-first at the unit tier (section + thread-page harnesses), the wielded conversation journey at E2E; route-policy conformance green; `next build` green; root + hub changelogs; 6-done with L4 rows in the same commit.
