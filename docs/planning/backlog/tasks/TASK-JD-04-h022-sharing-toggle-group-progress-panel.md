# H022 sharing toggle + group progress panel — consent UX and the leader window

---
id: TASK-JD-04
title: H022 sharing toggle + group progress panel (JRN-16/17)
status: review
assigned_to: Claude (delegated session)
priority: high
feature: FEAT-H022
owner: hub
wave: ferd
cycle: J-D
depends_on: [TASK-JD-02]
estimated_hours: 4
---

## Description
H022 STORY-2/3/4: the sharing toggle on the player for via-group walks (boots from `progress_sharing`; optimistic flip + rollback; consent copy naming exactly what is shared); two new BFF routes (POST sharing → `set_journey_progress_sharing`; GET progress → `get_group_journey_progress`, Edge/`dub1`); the group detail's on-demand Progress panel (aggregate row with honest basis label, alphabetical member list with marks or "not shared", skeleton on expand).

## Acceptance criteria
- [ ] Red-first per block; the toggle absent on solo walks; flip optimistic (B5) with rollback + retry on failure.
- [ ] Routes follow the house pattern (`getVerifiedUserId`, SQLSTATE→HTTP: P0002→404, 42501→403, P0001→409/422 per house map, else 500 content-free; telemetry).
- [ ] Panel: per-step counts labelled "of M sharing · N members"; zero-sharing renders the honest empty state; members alphabetical only — no sort controls, bars, percentages, or emphasis derived from progress; "shares-but-not-started" distinct from "not shared"; no timing anywhere.
- [ ] Progress affordance renders only for `view_group_progress` holders (from the effective-permissions read already fetched on the group page); direct route call without permission refuses.
- [ ] Telemetry events for sharing flip + panel expand; lint 0 errors.

## Technical notes
Panel lives beside `GroupJourneysSection` on the group detail; fetch on expand only (never on page boot). Permission gating via the already-fetched effective-permissions read — never role-name string checks.

## Verification
`npm run test:unit` green; manual on `localhost:3000`: member toggles sharing, Steward expands panel, marks appear/disappear with the flip.
