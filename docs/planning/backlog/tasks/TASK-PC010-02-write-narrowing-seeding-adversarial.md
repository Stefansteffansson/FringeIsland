# Direct-write narrowing on groups + system-group seeding + adversarial direct-caller tests

---
id: TASK-PC010-02
title: ADR-U038 direct-write narrowing on public.groups, idempotent system-group seeding, adversarial direct-caller coverage
status: review
assigned_to: claude
priority: high
feature: FEAT-PC010
owner: platform/core/organisation
wave: ferd
cycle: Groups G-A
depends_on: [TASK-PC010-01]
estimated_hours: 3
---

## Description

Close the S1-class hole verified on dev: `groups_insert` RLS (`created_by_group_id = actor`) lets any authenticated caller — including a Mist — create an un-bootstrapped group; `groups_update` is permission-gated but not column-scoped (a Steward could flip `status`/`group_type` via direct PostgREST). Narrow at the privilege layer (STORY-4, Open Q4 default: revoke INSERT/TRUNCATE from `anon`+`authenticated`; revoke UPDATE then re-grant on the settable columns only). Seed `FringeIsland Members` + `DeusEx` idempotently in the migration (seeds/04 exists but sits outside the migration chain — C3-1). Adversarial tests exercise the direct paths.

## Acceptance criteria

- [ ] Direct INSERT into `public.groups` refused for authenticated FIM and Mist (privilege layer)
- [ ] Direct UPDATE of `status`/`group_type`/`created_by_group_id` refused even for a permitted Steward; settable columns still work through RLS
- [ ] TRUNCATE revoked from client roles (bypasses RLS — hygiene)
- [ ] Migration seeds the system groups idempotently (no-op on dev; presence asserted by test)
- [ ] Every refusal covered by an adversarial integration test (GP2 DoD row)

## Technical notes

Same migration file as TASK-PC010-01 (one schema-gate artifact). `groups_insert`/`groups_update` RLS policies stay (defense-in-depth); the privilege layer is the narrowing. Seeds/04's Mist rename is already done (stale header comment only — cosmetic fix; record the stale org-spec §5 seeding claim as a doc-health finding, don't edit L2 mid-build).

## Verification

Adversarial cases green in `group-crud-contracts.test.ts`; `get_advisors(security)` shows no new findings; schema gate: this task lands at `review`, not `done`.
