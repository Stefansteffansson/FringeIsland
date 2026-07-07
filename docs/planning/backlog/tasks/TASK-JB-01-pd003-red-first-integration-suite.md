# PD003 red-first integration suite — the step substrate and progress contracts demonstrated red

---
id: TASK-JB-01
title: PD003 red-first integration suite
status: done
assigned_to: Claude
priority: high
feature: FEAT-PD003
owner: platform/domain/journeys
wave: ferd
cycle: J-B
depends_on: []
estimated_hours: 4
---

## Description

BDD outer loop → Jest integration tests for every FEAT-PD003 story, written and demonstrated red BEFORE the migration exists (label any test that can only be red-by-absence). Covers: registries seeded (STORY-1), per-journey migration parity — count-agnostic, asserted against pre-migration `jsonb_array_length(content->'steps')` captured in the test (STORY-2), catalog/detail re-point (STORY-3), `get_player_state` payload + P0002 gating (STORY-4), `enter_journey_step` engagement semantics incl. repeatable/non-repeatable (STORY-5), `complete_journey_step` idempotency + required-predecessor P0001 (STORY-6), withdraw-preserves-instances + erasure-cascade + direct-DML refusal on all four tables (STORY-7).

## Acceptance criteria

- [ ] One or more assertions per STORY-1..7 acceptance criterion, mapped in comments
- [ ] Suite runs red for the right reasons (missing functions/tables), demonstrated and captured before TASK-JB-02 applies
- [ ] Migration parity assertions are count-agnostic (no hardcoded 47/21/5 — the two seed sets differ)
- [ ] Dev pre-checks scripted: which seed set is live; every `content->` reader enumerated (`grep` over migrations + functions)

## Technical notes

Suite home: `hub/tests/integration/journeys/journey-step-progress-contracts.test.ts` (rides `test:integration:journeys`). Helpers: `hub/tests/helpers/supabase.ts` (`createTestUser`, `createAdminClient`, `runAdminSql`, cleanup). Pattern: `journey-catalogue-enrolment-contracts.test.ts` (the J-A suite). Actor = personal group (P-O1 four-hop). Seed facts: `20260228111514_sprint1_foundation_schema.sql:176-244` (FI Journeys, 21/21/5) vs `seeds/05_professional_pathfinders.sql` (17/22/8) — confirm live set first.

## Verification

`npm run test:integration:journeys` — red for the right reasons; the red run recorded for the gate PR body.
