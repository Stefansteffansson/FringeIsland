# PD004 red-first integration suite — completion, timing, notification, guard loosening

---
id: TASK-JC-01
title: PD004 red-first integration suite
status: done
assigned_to: Claude
priority: high
feature: FEAT-PD004
owner: platform/domain/journeys
wave: ferd
cycle: J-C
depends_on: []
estimated_hours: 3
---

## Description

Write the red-first integration tests for every FEAT-PD004 story before the migration exists, recording the absence-class of each failure (missing payload keys, missing behaviour, intended-legacy-behaviour reds for the guard loosening).

## Acceptance criteria

- [ ] STORY-1: solo final-required completion flips status/completed_at/status_changed_at in-transaction; idempotent repeats; racing-finals serialization (two clients, one transition); optional-steps-remaining still completes.
- [ ] STORY-2: via-group traveller completion never touches the enrolment row; `completion` block traveller-scoped; no cross-traveller leak.
- [ ] STORY-3: exactly one `journey_completed` notification row on the edge (recipient = traveller personal group, passive, payload keys); none on non-edge calls; erasure cascade proof.
- [ ] STORY-4: enter/complete succeed on `completed`; refuse on `withdrawn`/`frozen`/`paused` (intended-red against today's `= 'active'` guard, labelled).
- [ ] STORY-5: timing block per-step sums over completed engagements only; totals; wall-clock distinct; repeatable post-completion accrual.
- [ ] STORY-6: `journey_completed` transition flag true only on the edge; `get_player_state` pre-existing keys byte-shape pinned; P0002 concealment unchanged.
- [ ] All reds recorded with their absence class before TASK-JC-02 starts.

## Technical notes

Extend `tests/integration/journeys/` alongside `journey-step-progress-contracts.test.ts`. Fixture with native `journey_steps` rows (never legacy JSONB). Use the live seed shape (sprint1 set), not `seeds/05` assumptions — the J-B dossier flag. Timestamp comparisons via epoch ms (the `+00:00` vs `Z` gotcha).

## Verification

`npm run test:integration:journeys` — new tests all red with recorded absence classes; existing 65 stay green.
