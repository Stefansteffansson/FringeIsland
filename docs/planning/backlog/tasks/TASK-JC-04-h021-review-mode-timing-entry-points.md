# H021 review mode, time display, and Review/Continue entry points

---
id: TASK-JC-04
title: H021 review mode + timing + entry affordances
status: done
assigned_to: Claude
priority: high
feature: FEAT-H021
owner: hub
wave: ferd
cycle: J-C
depends_on: [TASK-JC-03]
estimated_hours: 4
---

## Description

Review posture over the player (JRN-13), the timing display (JRN-11), and the status-conditional Review/Continue affordances on the journeys page + detail enrolment panel (JRN-12/13 entry points).

## Acceptance criteria

- [ ] STORY-2 red-first: completed walks boot into review posture (steps navigable, renderer registry unchanged, marks + times on the rail); background `enter` suppressed in review (asserted); explicit re-engagement verbs ride the normal complete path; `frozen`/`withdrawn` keep the honest panel; via-group traveller-complete renders review from the `completion` block.
- [ ] STORY-3 red-first: per-step time + total from the payload's `timing` block only (never re-derived); em-dash for no accrued time; engagement total vs calendar span labelled distinctly; coarse formatting helper (minutes; h:mm ≥ 1 h).
- [ ] STORY-4 red-first: `completed` enrolments offer Review (deep-link, `?enrollment=` preserved); `active` keep Continue; `withdrawn` offer nothing.
- [ ] Review posture derived per render from payload state — no client mode enum.
- [ ] Unit suite green; lint clean.

## Technical notes

Review is the same `/journeys/[id]/play` page — no new route. The suppression rule: derive review posture, skip the `enterStep` background call in navigation handlers. Affordance swap keys off `get_my_enrollments.status` (already shipped).

## Verification

Unit project green; the review/timing/affordance blocks each demonstrated red first.
