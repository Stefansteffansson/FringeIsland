# /journeys catalogue page — card grid, Enrolled badges, FIM gate, B6 skeleton

---
id: TASK-JA-06
title: /journeys catalogue page — card grid, Enrolled badges, FIM gate, B6 skeleton (FEAT-H019 STORY-1)
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H019
owner: hub
wave: ferd
cycle: J-A
depends_on: [TASK-JA-05]
estimated_hours: 3
---

## Description
The `/journeys` page: card grid (title, description, difficulty, duration, tags) in a stable order, Enrolled badge from `get_my_enrollments` data, card → detail navigation, honest empty state, FIM-only gate, deferred skeleton grid. Nav entry added. Unit tests red-first.

## Acceptance criteria
- [ ] FIM gate on the journal pattern (`hub/app/journal/page.tsx:23-33`): sessionless → `/login?redirect=/journeys`, Mist → `/` redirect; nav link in `AccountMenu` (Mist-hiding automatic — the menu renders only for FIMs).
- [ ] Cards render catalogue fields; Enrolled badge for individually- or via-group-enrolled journeys; stable order (recorded: as returned by the contract — title-ordered per Open Q2 default); no search/sort/rank controls.
- [ ] Loading: nothing under ~300 ms, then a **skeleton grid** (never spinner-first — B6); the skeleton is a new small primitive (none exists in `components/ui/` yet — deferred like `LoadingState`).
- [ ] Zero published journeys → `EmptyState`, no error styling.
- [ ] Revisit paints instantly from the session cache with background revalidate (B4).
- [ ] Unit tests red-first: gate branches, badge logic, empty state, skeleton deferral, vocabulary-tolerant difficulty rendering.

## Technical notes
Card-grid prior art inline at `hub/app/groups/page.tsx:88-112` (grid classes, badge chip :98-104); cache seed `useState(() => peekJourneyCatalog())` + revalidate keyed on stable `user.id` (`hub/app/groups/page.tsx:44-56` — the object-keyed 3x re-fire gotcha). `EmptyState`/`LoadingState` in `hub/components/ui/`.

## Verification
`npm run test:unit` green; page renders on `npm run dev` for a FIM; Mist deep-link redirects.
