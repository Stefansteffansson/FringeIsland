# P3a hardening: 14 FK covering indexes + remaining auth-RLS initplan wraps

---
id: TASK-PERF-P3A-01
title: P3a — add the 14 advisor-listed FK covering indexes and wrap the 2 remaining auth_rls_initplan policies
status: review
assigned_to: claude
priority: medium
feature: PERF-P3A (perf-hardening-backlog.md — the Identity→Groups boundary NFR bet, decision D1)
owner: platform/core/infrastructure
wave: ferd
cycle: Groups G-A
depends_on: []
estimated_hours: 1
---

## Description

The zero-risk half of P3 from the perf backlog, taken as the boundary NFR bet (D1). Advisor-verified work-list (2026-07-04): 14 unindexed FKs (consent_records.subject_user_id; direct_messages.sender_group_id; group_memberships.added_by_group_id; group_role_permissions.permission_id; group_roles.created_from_role_template_id; group_template_roles.role_template_id; groups.created_from_group_template_id; journey_enrollments.enrolled_by_group_id; journeys.created_by_group_id; pending_email_invitations.invited_by_group_id; role_template_permissions.permission_id; user_group_roles.assigned_by_group_id + .group_id + .group_role_id) and 2 remaining `auth_rls_initplan` policies (`public.users.users_update_own`, `realtime.messages.session_signal_receive_own`) — the big sweep the backlog described is otherwise already clean.

## Acceptance criteria

- [ ] All 14 covering indexes created (additive, `IF NOT EXISTS`)
- [ ] Both policies recreated with `(select auth.<fn>())` wraps — logic unchanged
- [ ] Advisor re-run: zero `unindexed_foreign_keys`, zero `auth_rls_initplan`
- [ ] No behaviour change: full integration suite green

## Technical notes

Own migration (separate from PC010's), through the same schema gate. Multiple-permissive-policies consolidation is P3b (careful batch) — NOT this task. Unused-index findings are informational (near-zero traffic) — leave.

## Verification

`get_advisors(performance)` clean on those two lint classes; `npm run test:integration` green.
