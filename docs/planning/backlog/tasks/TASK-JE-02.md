# Seed the placeholder onboarding journey (native ADR-U044 steps + ADR-U046 takeaway payloads)

---
id: TASK-JE-02
title: Seed the placeholder onboarding journey with native steps and takeaway seed content
status: todo
assigned_to: claude
priority: high
feature: FEAT-PD006
owner: platform/domain/journeys
wave: ferd
cycle: J-E
depends_on: [TASK-JE-01]
estimated_hours: 4
---

## Description

Seed migration for the placeholder onboarding journey (STORY-5, ADR-U045 §5):

- A new `predefined` journey: `is_published=true` (valid enrollable published journey for the FIM path), `is_public=false` (kept out of the browse catalogue), `is_onboarding_designated=true`.
- Steps seeded as **native `journey_steps` rows** — NOT via the legacy `content.steps[]` + `_migrate_journey_content_steps()` conversion path. Ordered, typed against the seeded step-kind registries, a welcome step first. Throwaway welcome-and-a-few-steps content; structure is real. Plant the re-authoring hook comment (real content arrives at CQ-010).
- Per-step `content` payloads carry the ADR-U046 per-step takeaway keys; `journeys.takeaway` carries the journey-level closing word (both `pending-DS-4`; rendered at J-F — this feature only seeds).

## Acceptance criteria

- [ ] Seed inspection test: `predefined`, `is_published=true`, `is_public=false`, `is_onboarding_designated=true`, ordered native steps, welcome first — demonstrated red first
- [ ] Takeaway payloads present per-step and journey-level (`pending-DS-4`)
- [ ] **Catalogue-exclusion pin test:** the onboarding journey does NOT appear in `get_journey_catalog()` — confirm at the gate whether the filter is `is_published` or `is_public` and pin it with the test either way (rabbit hole 1)
- [ ] The native-seed divergence from the house conversion pattern is commented honestly in the migration; the parity-guard machinery does not half-run over it
- [ ] Rides the TASK-JE-01 schema-gate PR (same gate; ends at `review`)

## Technical notes

- Seed conversion machinery + step registries: `supabase/migrations/20260707190000_feat_pd003_step_substrate_progress_contracts.sql` (`_migrate_journey_content_steps()` NULLs `journeys.content` — the reason a journey-level takeaway needs `journeys.takeaway`).
- Check which step kinds the registries seed before choosing the welcome step's kind — type against existing registry keys only.
- Single-designation: the partial unique index from TASK-JE-01 must admit this seed (no other designated journey exists).

## Verification

`npm run test:integration:journeys` — seed inspection + catalogue-exclusion tests green after apply.
