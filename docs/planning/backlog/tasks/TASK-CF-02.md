# ADR-U050 + schema-gate migration — origin split, pause/delete RPCs, retirement

---
id: TASK-CF-02
title: Author ADR-U050 (account-lifecycle state machine) + the C-F schema-gate migration; hold at the gate
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PC017
owner: platform/core/identity
wave: ferd
cycle: C-F
depends_on: [TASK-CF-01]
estimated_hours: 5
---

## Description

Author **ADR-U050** — the formal promotion of the 2026-06-29 account-lifecycle decision record (four states split by `deactivation_origin`) that the record itself mandates at build time — and the single C-F migration: `users.deactivation_origin` + backfill `'admin'` for existing off rows; `pause_own_account()`; `delete_own_account()` (three-scenario walk ported from the admin path **plus** `ds5_lifecycle_group_closed` on closure; F-2 erasure legs; decommission + scrub; session deletion; audit); `get_own_account_state()` re-issue (origin split + `deactivation_origin` key); `reactivate_own_account()` re-issue (origin gate + clear); `DROP FUNCTION admin_exit_user_from_platform`. Assemble re-issued function bodies from each function's **latest on-disk body via anchored replacements** (the C-E shape — fail-loud, verify every edit site). PR held at the schema gate for the explicitly-named nod; never bypass; apply commands in the PR body.

## Acceptance criteria

- [ ] ADR-U050 authored (append-only; supersedes nothing — promotes the planning-tree decision record) and riding this PR
- [ ] One migration file; backfill and CASE split land together (misreport window impossible)
- [ ] Both new RPCs `SECURITY DEFINER`, `SET search_path = ''`, no target parameter, migration comments documenting the elevation
- [ ] REVOKE/GRANT posture: RPCs granted to `authenticated` only; handler REVOKEs untouched
- [ ] The DROP is present; admin lifecycle RPCs untouched
- [ ] PR opened and **held** at the gate with red-suite evidence + apply commands in the body

## Technical notes

Migration via `bash supabase-cli.sh migration new c_f_account_lifecycle_self_service`. The direct-caller question (ADR-U038) applies to both RPCs and the re-issued reads. Schema changes set status `review`, not `done`.

## Verification

Migration lints; gate PR open; no apply until the named nod ("ok merge <PR#>" naming this PR).
