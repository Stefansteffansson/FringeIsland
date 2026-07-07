# Group-detail enrolment summary — the GRP-4 seam filled as a failure-isolated slice

---
id: TASK-JA-08
title: Group-detail enrolment summary — the GRP-4 seam filled as a failure-isolated slice (FEAT-H019 STORY-6)
status: todo
assigned_to: Claude
priority: medium
feature: FEAT-H019
owner: hub
wave: ferd
cycle: J-A
depends_on: [TASK-JA-02]
estimated_hours: 2
---

## Description
The group page's BFF route composes `get_group_enrollment_summary()` alongside `get_group_detail()` as an ADR-U042 slice; the page renders an enrolment-summary section (title, status, links to journey detail). A failed summary slice never breaks the group page.

## Acceptance criteria
- [ ] `hub/app/api/groups/[id]/route.ts` GET returns `{ group, enrollments: {data}|{error} }` — the group read canonical and untouched in behaviour; the summary wrapped in the `Slice<T>` envelope with content-free `slice_failed` telemetry (never swallowed).
- [ ] Section on `/groups/[id]`: lists `{journey_id, title, status}` linking to `/journeys/[id]`; honest empty state when none; honest unavailable state when the slice failed; invisible group stays the house 404 whole-page (no new leak through the slice).
- [ ] Unit tests red-first: envelope composition (summary failure → group still returns), section render states (list/empty/unavailable).

## Technical notes
Envelope prior art: `hub/app/api/me/overview/route.ts` — `Slice<T>` at :34, `readSlice()` :40-58, `SliceRefusal` :38. Keep the group fetch primary: if `get_group_detail` refuses, the route 404s as today regardless of the summary.

## Verification
`npm run test:unit` green; `/groups/[id]` renders whole with the summary section; kill the RPC name in a test double to see the unavailable state.
