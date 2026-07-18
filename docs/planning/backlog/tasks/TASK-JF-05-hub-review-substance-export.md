# The Hub review substance — takeaways, the review entry's return, the walks download, the E2E arc

---
id: TASK-JF-05
title: Review substance rendering + completion-panel review entry + the walks download section + E2E
status: review
assigned_to: claude
priority: high
feature: FEAT-H024
owner: hub
wave: ferd
cycle: J-F
depends_on: [TASK-JF-04]
estimated_hours: 5
---

## Description

FEAT-H024 STORY-4/5/6: per-step `content.takeaway` renders once the step is completed (player + review); `journey.takeaway` renders on the completion panel and at the head of review; the completion panel regains the review-entry affordance (the J-C summary-not-menu posture retired); the export route composes `get_own_step_instances_export()` as the additive `journeys` key (FEAT-H010 amended at build per the FEAT-H011 pattern); the E2E arc proves capture → complete → takeaways → review → revise → download end-to-end, including the Mist onboarding capture.

## Acceptance criteria

- [ ] FEAT-H024 STORY-4 + STORY-5 + STORY-6 ACs green (unit red-first; E2E arc green)
- [ ] Absence is silent — journeys without takeaways render as today (no empty frames)
- [ ] FEAT-H010's spec gains its amendment note; existing download sections byte-identical
- [ ] Both specs' L4 summary rows advanced with the maturity transitions, same-commit

## Technical notes

Completion panel `hub/components/journeys/JourneyCompletionPanel.tsx` ("offers no affordances" comment falls here); enrolments-panel Review entry (`JourneyEnrollmentPanel.tsx`) unchanged; export composition `hub/app/api/account/export/route.ts` + `hub/lib/account/export.ts` (mirror the `journal` key composition). Takeaway timing keys off the page's existing completedStepIds derivation — no second completion computation.

## Verification

`cd hub && npm test`; `npm run test:e2e` (the new arc + full sweep); lint; `next build` green before 6-done.
