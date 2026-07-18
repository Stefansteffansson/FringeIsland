# The save_step_response write verb

---
id: TASK-JF-02
title: save_step_response — optional-always capture, orthogonal to completion, frozen/withdrawn refused
status: done
assigned_to: claude
priority: high
feature: FEAT-PD007
owner: platform/domain/journeys
wave: ferd
cycle: J-F
depends_on: [TASK-JF-01]
estimated_hours: 4
---

## Description

The new SECURITY DEFINER write verb `save_step_response(p_enrollment_id, p_step_id, p_response) → jsonb`: P-O1 actor, `_enrollment_traveller_standing` (P0002 hides existence), the enter/complete status guard family (`active`/`completed` admit; frozen/withdrawn/paused refuse P0001), open-else-latest-else-create instance targeting, the explicit-empty clear (retraction to NULL), `response_updated_at` stamping, the size guard, own-instance-only writes, Mist-compatible by construction. Returns `{instance_id, step_id, response, response_updated_at}`.

## Acceptance criteria

- [ ] FEAT-PD007 STORY-2 + STORY-5 ACs green, demonstrated red first
- [ ] Responding never flips `completed_at`, never duplicates an open instance; a later complete completes the response-created instance
- [ ] Adversarial pins: a non-traveller cannot write; a direct PostgREST caller cannot touch the table; the Mist onboarding capture works

## Technical notes

Mirror the guard wording of `enter_journey_step`/`complete_journey_step` (latest PD004 defs). "Latest" for completed instances = `completed_at` then `created_at`. `SET search_path = ''`; grant to `authenticated` only.

## Verification

`npm run test:integration:journeys` — the verb's suite red-first then green; sweep unregressed.
