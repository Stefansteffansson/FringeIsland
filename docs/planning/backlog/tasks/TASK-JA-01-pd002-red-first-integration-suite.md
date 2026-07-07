# FEAT-PD002 red-first integration suite — six DS-3 contracts + the adversarial direct-caller matrix

---
id: TASK-JA-01
title: FEAT-PD002 red-first integration suite — six DS-3 contracts + the adversarial direct-caller matrix
status: todo
assigned_to: Claude
priority: high
feature: FEAT-PD002
owner: platform/domain/journeys
wave: ferd
cycle: J-A
depends_on: []
estimated_hours: 4
---

## Description
Author the failing integration suite for all six FEAT-PD002 contracts and the STORY-7 direct-caller narrowing, demonstrated red BEFORE the migration exists. This is the BDD outer loop turned into Jest: every acceptance criterion in FEAT-PD002 STORY-1..7 gets at least one test that fails for the right reason (RPC absent / write still permitted).

## Acceptance criteria
- [ ] Suite lives under `hub/tests/integration/journeys/` (the existing `test:integration:journeys` npm script picks it up automatically — the folder does not exist yet).
- [ ] STORY-1: catalogue readable by FIM and Mist, catalogue fields + derived `step_count`, unpublished journeys absent, no traveller counts/rankings; `get_my_enrollments()` kind-marking (`individual` | `via_group` with group id/name).
- [ ] STORY-2: detail fields + steps overview (title/kind/duration, no content payloads), viewer block (`is_enrolled_individually`, `enrolled_via`, `enrollable_groups` exactly the permission-holding groups), unpublished/nonexistent → `P0002` indistinguishably, Mist read succeeds with empty `enrollable_groups`.
- [ ] STORY-3: self-enrol creates personal-group enrolment (`status='active'`, initial `progress_data`), duplicate refused, Mist → `42501`, suspended FIM refused, already-enrolled-via-group refused (oracle B-JRN-003 semantic — one-directional).
- [ ] STORY-4: group-enrol permission-gated (`42501` without key), invisible/absent group → `P0002`, duplicate refused, non-active group refused, durable notification rows to active members (not the actor).
- [ ] STORY-5: withdraw own individual enrolment; group withdrawal `unenroll_from_journey`-gated; invisible enrolment → `P0002`; `frozen` enrolment refused (oracle B-SEC-003/004 immutability).
- [ ] STORY-6: summary for active member and for non-member+public group; non-member+private and nonexistent → `P0002` indistinguishably.
- [ ] STORY-7: direct PostgREST INSERT into `journey_enrollments` refused (incl. the previously-policy-allowed individual and group shapes); direct UPDATE of `status`/`progress_data` refused — exercised with the anon-key client incl. a Mist session.
- [ ] Red run captured (output pasted into the PR body): every test fails because the contract is absent or the write is still permitted — no vacuous greens. Any test green at red is STOPped and surfaced, not shrugged past.

## Technical notes
Helpers: `hub/tests/helpers/supabase.ts` (`createTestClient`, `createAdminClient`, `createTestUser`, `signInWithRetry`, `cleanupTestUser/Group`, `runAdminSql`). Adversarial style: `hub/tests/integration/groups/group-crud-contracts.test.ts` (error-code asserts, no-leak twin-assert at :227-234) and `hub/tests/integration/security/api-boundary-hardening.test.ts`. Substrate facts: seeded journeys are all `is_published=true, is_public=true` owned by "FI Journeys" (`20260228111514_sprint1_foundation_schema.sql:176-244`); unpublished/private fixtures must be created via `runAdminSql`. Permission keys are group-scoped (`supabase/seeds/01_permissions.sql:27-29`); Steward holds `enroll_group_in_journey` + `unenroll_from_journey`, Member holds `enroll_self_in_journey` (`02_role_templates.sql:33,66`). Mist = `users.is_temporary`; suspended = `users.is_active=false` (set via admin client). Frozen fixture: admin-set `status='frozen'`.

## Verification
`npm run test:integration:journeys` runs and is red for the right reasons (RPC not found / direct write succeeded where it must be refused). Red output captured.
