# The response substrate — schema-gate migration (columns + registry seed)

---
id: TASK-JF-01
title: Response substrate migration — response/response_updated_at on the step-instance, captures_response on the registry
status: done
assigned_to: claude
priority: high
feature: FEAT-PD007
owner: platform/domain/journeys
wave: ferd
cycle: J-F
depends_on: []
estimated_hours: 3
---

## Description

The FEAT-PD007 schema-gate migration: `journey_step_instances.response jsonb` (nullable) + `journey_step_instances.response_updated_at timestamptz` (nullable) + `step_kinds.captures_response boolean NOT NULL DEFAULT false`, with the registry seed update (`reflection`, `assessment`, `choice`, `journal` → true). Red-first: the STORY-1 contract tests demonstrate red (columns absent) before the migration applies. Carry-over and ephemerality ride as labelled proofs over existing machinery (`finalise_transcendence`; the ADR-U031 cascade), not TDD.

## Acceptance criteria

- [ ] FEAT-PD007 STORY-1 ACs green post-apply; columns/registry demonstrated red first
- [ ] No change to the `uq_step_instance_open` grain, RLS posture (contract-only table), or any existing column
- [ ] Migration applied via `node scripts/apply-migration-temp.js` + `repair --status applied`; task status set to `review`, never `done` (schema gate — the merge waits for the explicitly-named nod)

## Technical notes

Substrate: `journey_step_instances` created in PD003 migration `20260707190000` (six columns; partial unique idx `uq_step_instance_open`); registries seeded PD003. Follow the PD006 migration shape (additive columns + comments + seed touch in one file). The gate asks the ADR-U038 direct-caller question of all three touches.

## Verification

`npm run test:integration:journeys` — new PD007 suite red before apply, green after; full journeys slice unregressed.
