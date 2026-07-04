# Group contracts: create/detail/settings RPCs + red-first contract tests

---
id: TASK-PC010-01
title: Group contracts — create_engagement_group / get_group_detail / update_group_settings + red-first integration tests
status: in_progress
assigned_to: claude
priority: high
feature: FEAT-PC010
owner: platform/core/organisation
wave: ferd
cycle: Groups G-A
depends_on: []
estimated_hours: 4
---

## Description

The three own-actor SECURITY DEFINER contracts over existing PC-3 substrate (no new table), red-first: integration tests demonstrating RED (functions absent) before the migration lands them. Actor = `get_current_personal_group_id()` (P-O1). Creator Steward-binding is permission-derived (the instantiated role whose template grants `assign_roles` — verified unique to the Steward template on dev), never a role-name string.

## Acceptance criteria

- [ ] `create_engagement_group()` — atomic bootstrap (group + role instances from template/default + creator active membership + Steward binding); FIM-only (42501), suspended refused (42501), unknown template P0002, empty name 22023
- [ ] `get_group_detail()` — member-or-(public+active) visibility; P0002 no-existence-leak; viewer block with `can_manage_settings`; members array (display-identity names) iff `view_member_list` permission or public+`show_member_list`
- [ ] `update_group_settings()` — partial update (null = leave unchanged); per-field permission keys (`edit_group_settings` / `set_group_visibility` / `control_member_list_visibility`); P0002/42501 refusals; `status`/`group_type` not updatable
- [ ] All contract tests demonstrated RED (functions absent) → GREEN post-migration

## Technical notes

Test file `hub/tests/integration/groups/group-crud-contracts.test.ts` on the `member-groups-contract.test.ts` harness (createTestUser/createAdminClient/signInWithRetry/cleanup*). Migration via `bash supabase-cli.sh migration new` + `node scripts/apply-migration-temp.js` + `repair --status applied`. SQLSTATEs per house pattern (PC009/PD001): 42501 insufficient-privilege, P0002 no-leak.

## Verification

`npm run test:integration:groups` red before migration, green after; full `npm run test:integration` green.
