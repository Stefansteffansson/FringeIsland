---
id: TASK-JRN-PAUSE-01
title: Journey enrolment pause — `paused` is a CHECK value with no write path ("recorded, not built"); give it a contract and a Hub affordance
status: done
assigned_to: claude
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

## Implementation notes (2026-09-03 — built; applied on the named approval "ok merge #601")

**Substrate (migration `20260903100000_task_jrn_pause_01_journey_enrolment_pause_resume.sql`).** `pause_journey_enrollment(p_enrollment_id)` / `resume_journey_enrollment(p_enrollment_id)` — SECURITY DEFINER, `search_path = ''`, own row only (42501 for a visible row that is not the caller's; P0002 invisible/absent), P0001 naming the state, progress untouched, Mist-callable; revoke public + anon, execute for authenticated + service_role. The cascade check found the gap the task predicted: `ds3_lifecycle_member_departed` and `ds3_lifecycle_group_closed` froze `status = 'active'` rows only — re-issued byte-identical except three predicates (`in ('active', 'paused')`), extracted from `20260719190205` rather than retyped; self-verifying DO block. Manifest: both contracts registered under DS-3. **ADR-U047 rule 7** describes the sprint2 shape as active-only — superseded for paused rows; flagged for the gate (ADR edits are a carve-out).

**Reads.** `get_my_enrollments`, `get_journey_detail`'s viewer block and `get_player_state` carry `paused` as-is — verified by cells, not assumed. The step contracts refuse a paused walk P0001 with no change.

**Hub.** Routes `POST /api/journeys/[id]/pause` + `/resume` (withdraw shape; durable telemetry on success), `lib/journeys/queries.ts` relays, `lib/journeys/client.ts` transports with the J-D cache write-through, `JourneyEnrollmentPanel` Pause/Resume + "(paused)", `/journeys` card "(paused)" + Resume, player Pause (own active walk) + paused panel with Resume; the no-param resolution treats a paused walk as a walk. FEAT-H020 carries a revision pointer.

**Red-first evidence.**
- Integration `journeys/journey-enrolment-pause-contracts.test.ts`: **11 red / 1 pin** at HEAD — nine contract cells PGRST202, the two cascade cells `Expected: "frozen" / Received: "paused"` (the gap, on today's substrate), the direct-UPDATE grant cell green by design and labelled.
- `platform/function-classification-completeness.test.ts`: **1 red** at HEAD — "no stale function entries" lists `DS-3: pause_journey_enrollment`, `DS-3: resume_journey_enrollment` (registered, not yet applied).
- Unit (five suites): **15 red** at HEAD (routes suite module-absent; panel 4, list 3, player 4, cache 4) → **green** after the build; the routes suite's telemetry-server mock keeps the mirror so the sink assertions hold. Two pre-existing player cells that used `paused` as the stand-in for the generic non-active panel adapted and labelled.
- E2E `e2e/journey-pause.spec.ts`: written; runs in the post-apply set (needs the contracts).

**A lint find (recorded, fixed).** A plain async handler with try/catch/finally in the `/journeys` page body made the React Compiler lint bail out of the page silently — an injected synchronous setState in the effect went unreported. `useCallback` restored the analysis (the probe fires again on both pages). The two `react-hooks/set-state-in-effect` suppression directives on `/journeys` and the player became unused (their targets gained a second caller) and were removed, reason left in the comments.

**Records.** FEAT-PD002 STORY-8 + No-gos + Vertical impact + notes; FEAT-H019 STORY-8 + No-gos + Vertical impact + Performance + notes; FEAT-H020 revision; FEAT-PC013 / FEAT-PC014 revision lines (the cascade they trigger now reaches paused rows); Hub §L3 JRN-19 row + §L4 FEAT-H019 row; both features READMEs; FERD capability map rows 59 + 88; root + Hub CHANGELOGs.

**Gate.** Apply from the repo root on the named approval:

```
node scripts/apply-migration-temp.js 20260903100000_task_jrn_pause_01_journey_enrolment_pause_resume.sql
bash supabase-cli.sh migration repair --status applied 20260903100000
```

Read the two applied contracts' ACLs (no bare `=X/`, no `anon=X`). Post-apply verification from `hub/`: `npx jest tests/integration/journeys/journey-enrolment-pause-contracts.test.ts --runInBand --verbose` (12/12), `npm run test:integration:platform`, `npm run test:integration:journeys`, `npm run test:integration:groups`, and the E2E set `npx playwright test tests/e2e/journey-pause.spec.ts tests/e2e/player.spec.ts tests/e2e/journeys.spec.ts tests/e2e/frozen-and-group-progress.spec.ts` (dev server on :3000).
