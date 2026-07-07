# /journeys/[id] detail page — steps overview + the viewer-shaped enrolment block

---
id: TASK-JA-07
title: /journeys/[id] detail page — steps overview + viewer-shaped enrolment block (FEAT-H019 STORY-2/3/4/5)
status: done
assigned_to: Claude
priority: high
feature: FEAT-H019
owner: hub
wave: ferd
cycle: J-A
depends_on: [TASK-JA-05]
estimated_hours: 5
---

## Description
The journey detail page: journey fields, steps overview (title/kind/duration — no content; the player is J-B), and the enrolment block rendered strictly from the payload's viewer block. Self-enrol, the group-enrol wielding walk, and Withdraw. Unit tests red-first.

## Acceptance criteria
- [ ] STORY-2: fields + steps overview; unpublished/nonexistent → house not-found from the BFF 404, indistinguishable; sessionless deep-link → login-and-return; unknown difficulty/step-kind strings render plainly (vocabulary-tolerant, no exhaustive switches).
- [ ] STORY-3: *Start this journey* when not individually enrolled; busy feedback within 100 ms, no double-submit (B5); success re-reads — no optimistic flip; refusals surface honestly, rendered state stays last-read truth.
- [ ] STORY-4: *Enrol a group* offers exactly the payload's `enrollable_groups` (absent affordance when empty — never a disabled tease); confirm names the group (H018 wielding-confirm pattern); success re-reads; refusals honest.
- [ ] STORY-5: Withdraw behind destructive `ConfirmModal` (confirm names the group for group enrolments); gone on re-read, catalogue badge clears; frozen posture rendered from the payload, never client-guessed.
- [ ] The primary-action slot is structurally reserved for J-B's player entry (layout note, no affordance).
- [ ] Unit tests red-first: viewer-block branching (all enrolment states), picker exactness, confirm copy, busy/disabled states, not-found path, tolerant vocab.

## Technical notes
Wielding-confirm copy builder: `hub/components/groups/GroupMembershipsPanel.tsx:68-88` + `ConfirmModal` render :187-198. `ConfirmModal` props (`variant='danger'`, `busy`) at `hub/components/ui/ConfirmModal.tsx:14-24`. Detail-title seeding from the catalogue card cache is a NEW pattern (no prior art — groups detail shows `LoadingState` until resolve); implement the "title paints immediately, payload fills in" seed only if it stays small, else record as J-B follow-up.

## Verification
`npm run test:unit` green; manual walk: enrol self, enrol group, withdraw, all against dev.
