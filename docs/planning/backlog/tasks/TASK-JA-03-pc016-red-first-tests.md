# FEAT-PC016 red-first integration tests — the nominee's window from the substrate clock

---
id: TASK-JA-03
title: FEAT-PC016 red-first integration tests — the nominee's window from the substrate clock
status: todo
assigned_to: Claude
priority: high
feature: FEAT-PC016
owner: platform/core/organisation
wave: ferd
cycle: J-A
depends_on: []
estimated_hours: 2
---

## Description
Author the failing integration tests for `get_my_pending_nominations()` (FEAT-PC016 STORY-1), demonstrated red before the migration exists.

## Acceptance criteria
- [ ] Given two pending nominations and one expired: exactly the two pending rows return (`notification_id, group_id, group_name, created_at, expires_at`), newest first, expiry judged by the SERVER clock (expired fixture created by admin-setting `expires_at` in the past — no client clock involved).
- [ ] Acted-on nomination (`action_taken` set) excluded.
- [ ] No nominations → `[]`; Mist → `42501` (the `get_my_invitations` FIM-only mirror).
- [ ] Own-window scope: another member's nominations never appear.
- [ ] Demonstrated red (RPC absent), output captured.

## Technical notes
Suite home: `hub/tests/integration/groups/` (PC-3 sibling of the leadership tests). Nomination fixtures via the real writer `nominate_steward` (row shape at `20260705072252_feat_pc014_...:232-251`: `type='stewardship_nomination'`, `action_taken` NULL, `expires_at now()+7d`, `group_name` embedded in payload), then admin-adjust `expires_at` / `action_taken` via `runAdminSql` for the expired/acted fixtures. Payload must match the `PendingNomination` shape in `hub/lib/groups/leadership.ts:12-19` — payload-compatible by design.

## Verification
`npm run test:integration:groups` red for the right reason (function does not exist), captured.
