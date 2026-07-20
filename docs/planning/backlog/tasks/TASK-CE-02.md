# Schema-gate migration — sealed_at, handler, export contracts

---
id: TASK-CE-02
title: C-E migration — conversations.sealed_at, ds5_lifecycle_group_closed, get_own_messages_export, CB-6 re-issues, conformance lockstep
status: todo
assigned_to: claude
priority: high
feature: FEAT-PD012
owner: platform/domain/communication
wave: ferd
cycle: C-E
depends_on: [TASK-CE-01]
estimated_hours: 3
---

## Description

One migration carrying the whole C-E platform surface. Held at the schema gate: PR ships with red tests + apply commands; merge unlocks only on Stefan's named nod.

## Acceptance criteria

- [ ] `conversations.sealed_at timestamptz` (NULL = live); no new tables, `DS_TABLES` unchanged
- [ ] `ds5_lifecycle_group_closed(p_group_id, p_reason)` on the ds3 template (SECURITY DEFINER, `search_path=''`, reason ∈ {`group_closed`,`group_archived`} validated, REVOKE public/anon/authenticated); seals the group's `group`-kind conversations; forum + announcements rows untouched
- [ ] `close_group` / `delete_group` re-issued: ds5 call immediately after the ds3 call (same transaction; errors propagate — ADR-U047 Option A); the PD009 `pending-DS-5` comment site cleared
- [ ] `get_my_conversations` + `get_group_conversations` exclude sealed; `send_message` + `join_group_conversation` refuse sealed with named errors; `get_conversation_detail` unchanged (participant-readable)
- [ ] `get_own_messages_export()` — SECURITY DEFINER, `search_path=''`, actor via `auth.uid()` → `public.users` direct (ungated, suspended included); sections: `messages`, `conversation_participations`, `forum_posts` (incl. `is_deleted`), `reports_submitted` (incl. `content_snapshot`)
- [ ] `get_own_data_export()` re-issued: `|| jsonb_build_object('communication', public.get_own_messages_export())`
- [ ] `get_own_step_instances_export()` re-issued with ungated actor resolution (CB-6); `get_current_personal_group_id()` untouched
- [ ] `DS_OWNED_ALLOWLIST` += `ds5_lifecycle_group_closed`, `get_own_messages_export` (same-commit lockstep)
- [ ] Migration comment answers the direct-caller question (ADR-U038) for each function

## Technical notes

Template: `20260719190205` (ds3 handlers + close/delete_group definitions); export composite `20260719201718`; C-A contracts `20260719230500`. Core-function edits (`close_group`/`delete_group`) are the named carve-out — flag in the PR body.

## Verification

PR open with migration + red suites + apply commands (`node scripts/apply-migration-temp.js` + `supabase-cli.sh migration repair`); held at gate.
