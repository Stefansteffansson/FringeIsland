# The J-A schema-gate migration — six DS-3 contracts + the PC016 rider + enrolment-write narrowing

---
id: TASK-JA-02
title: The J-A schema-gate migration — six DS-3 contracts + the PC016 rider + enrolment-write narrowing
status: review
assigned_to: Claude
priority: critical
feature: FEAT-PD002
owner: platform/domain/journeys
wave: ferd
cycle: J-A
depends_on: [TASK-JA-01, TASK-JA-03]
estimated_hours: 5
---

## Description
One migration carrying: `get_journey_catalog`, `get_journey_detail`, `enroll_self_in_journey`, `enroll_group_in_journey`, `withdraw_from_journey`, `get_my_enrollments`, `get_group_enrollment_summary` (FEAT-PD002), `get_my_pending_nominations` (FEAT-PC016 rider), the `journey_enrollments` direct-write narrowing (STORY-7), and grants. **Holds at the schema-review gate** — task lands at `review`, never `done`, until Stefan's explicit nod; FEAT-PD002 Open Q1–Q5 are decided at that gate.

## Acceptance criteria
- [ ] All contracts `SECURITY DEFINER SET search_path = ''`, reads STABLE / writers VOLATILE, house guard order (FIM-only → suspended → P0002 existence → P0002 membership → P0001 business rule → 22023 input), `coalesce(..., '[]'::jsonb)` empties.
- [ ] Catalogue/detail visibility mirrors the existing `journeys_select_published` RLS predicate exactly (no new semantic — Open Q3 recorded).
- [ ] Grants: `revoke all ... from public;` AND explicitly `from anon;`, then `grant execute ... to authenticated, service_role;` per the PC014 posture; `COMMENT ON` each function citing FEAT id + story + SECURITY DEFINER justification.
- [ ] Write-narrowing lands per the gate decision on Open Q4; the TASK-JA-01 STORY-7 tests bind either way.
- [ ] Migration applies cleanly (`node scripts/apply-migration-temp.js` + `repair --status applied`); TASK-JA-01 and TASK-JA-03 suites go green; the previously-green suites stay green (`npm run test:integration`).
- [ ] The direct-caller question is answered in the PR body for both tables (what can a direct PostgREST caller — including an anonymous-session Mist — do that the contracts would not allow?).

## Technical notes
Style reference: `20260705072252_feat_pc014_leadership_transfer_closure_contracts.sql` (header banner, guard order, grants at :956-985). Mirror source for PC016: `get_my_invitations()` at `20260704144630_feat_pc012_invitation_contracts.sql:478-516`. Notification fan-out: `notify_group_deleted()` pattern (`20260223171200_fix_rc7_admin_user_ops.sql:373-414`). Substrate: no UNIQUE on (journey_id, group_id) — duplicate refusal is contract-level unless the gate adds the proposed unique index; no DELETE policy exists (withdraw is contract-only); `status_changed_at` is not trigger-maintained — set explicitly. Legacy write surface to narrow: `enrollment_insert_individual`, `enrollment_insert_group`, `enrollment_update_own`, `enrollment_update_group` (`20260228102720_sprint0_security_fixes.sql:110-174`). Verify at build: whether the PC010 participation binding makes FIMs members of "FI Journeys" (`20260704204343:122`) — `enroll_self_in_journey` resolution depends on it.

## Verification
Apply on dev → `npm run test:integration:journeys` green, `npm run test:integration` green. Task status set to `review`; merge only after the schema-gate nod.
