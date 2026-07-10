# JRN-5 carry-over and ADR-U031 ephemerality — proofs over existing machinery

---
id: TASK-JE-03
title: Carry-over and ephemerality proofs (transcendence continuity + erasure cascade)
status: review
assigned_to: claude
priority: high
feature: FEAT-PD006
owner: platform/domain/journeys
wave: ferd
cycle: J-E
depends_on: [TASK-JE-01, TASK-JE-02]
estimated_hours: 3
---

## Description

Integration proofs (STORY-4, STORY-6) — **no new mechanism**; these tests prove existing machinery holds over the new onboarding path:

1. **JRN-5 carry-over:** enrol a Mist in onboarding, advance at least one step, run `finalise_transcendence`, assert the **same `enrollment_id`** and step-instances persist on the same personal group, `is_temporary` now false, resume pointer unchanged; `get_player_state(onboarding_id)` resumes at the same step — no new enrolment row, no step-1 restart.
2. **ADR-U031 ephemerality:** a Mist enrolled + progressed in onboarding is erased **via the house erasure function** (`erase_fim_account`, DeusEx-called — never a bare-delete simulation, per the J-C bound rule); enrolment and step-instances gone, cascading cleanly.

## Acceptance criteria

- [ ] Carry-over test demonstrated red first only if it exposes a real gap — expected: green against existing substrate; **label honestly**: these are proofs over shipped machinery (test-after coverage of PC002/U031 behaviour, claimed as proofs, not TDD)
- [ ] Same-enrollment-id + step-instance survival + resume pointer asserted explicitly
- [ ] Erasure proof uses the house erasure function; a consent-trigger refusal is treated as the substrate succeeding
- [ ] Both proofs live in the journeys integration domain and run in the full sweep

## Technical notes

- `finalise_transcendence`: `supabase/migrations/20260626205932_feat_pc002_atomic_transcendence.sql` (mutates only `is_temporary`, preserves the personal group — the decomposition's substrate audit cite).
- `journey_enrollments` are `group_id`-keyed to the personal group (PD002) — that is why carry-over is continuity-free.
- House Mist-creation + erasure helpers: follow the existing identity/journeys integration suites' patterns.

## Verification

`npm run test:integration:journeys` green; the two proofs visible in the run output.
