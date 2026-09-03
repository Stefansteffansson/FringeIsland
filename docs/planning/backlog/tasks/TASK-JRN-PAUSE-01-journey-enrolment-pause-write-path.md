---
id: TASK-JRN-PAUSE-01
title: Journey enrolment pause — `paused` is a CHECK value with no write path ("recorded, not built"); give it a contract and a Hub affordance
status: todo
assigned_to: unassigned
priority: medium
feature: FEAT-PD002 (journey catalogue and enrolment contracts) + FEAT-H019 (journey catalogue and enrolment) — both amend
owner: platform/domain (DS-3 journeys) + hub
wave: ferd
cycle: none — ruled at the Ferd leftovers pass (Stefan, 2026-09-03: "journey pause … now"), queued for the next session
depends_on: []
estimated_hours: 4-6 + one schema gate
---

# TASK-JRN-PAUSE-01 — the pause that was recorded but never built

**Where it stood:** `journey_enrollments.status` admits `paused` by CHECK, FEAT-PD002 records the state as *"recorded, not built"* (`FEAT-PD002:55`), and FEAT-H019 has no pause affordance (`FEAT-H019:47`). The Ferd leftovers sweep (2026-09-02) surfaced it; Stefan ruled it **in**.

## What to build

- **Contracts (FEAT-PD002 amendment, SECURITY DEFINER, the enrolment family's shape):** `pause_journey_enrollment(p_enrollment_id)` and `resume_journey_enrollment(p_enrollment_id)` — the enrollee's own enrolment only (42501 otherwise); `active → paused → active`; refusals typed for a completed/frozen enrolment (P0001 with the state named); progress untouched by a pause (the walk resumes where it stopped); the ADR-U016 cascade check — what a group closure/freeze does to a paused enrolment (the frozen shape wins; pause is not a third terminal).
- **Reads:** `get_my_journey_enrollments` / the player's status read carry `paused` honestly (they may already — verify, do not assume); the Mist page's walk resolution treats a paused walk as a walk (the door stays a door).
- **Hub (FEAT-H019 amendment):** a Pause / Resume affordance on the enrolment card and in the player, ConfirmModal-free (a pause is reversible — no ceremony), the "(paused)" state legible in the list, the BFF route pair over the two contracts (mutations → `getUser()`; durable telemetry per Q2 — a mutation).
- **Notifications:** none (the enrollee's own act) — say so in the Vertical Impact.
- **Tests, red-first:** integration (contract cells incl. the adversarial direct-UPDATE proof — remember the grant now refuses first, 42501), unit (route pair + the affordance), one E2E (pause in the player, resume from the list, position carried).
- One schema gate, held for the named approval.
