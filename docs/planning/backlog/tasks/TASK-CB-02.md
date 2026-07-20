# Schema-gate migration: forum contracts, attribution ladder, ds5 relocation, gate lockstep

---
id: TASK-CB-02
title: Schema-gate migration - forum contracts + COM-14 ladder + ds5_lifecycle_user_hard_deleted relocation + conformance lockstep + ADR-U047 Amendment 3
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD009
owner: platform/domain/communication
wave: ferd
cycle: C-B
depends_on: [TASK-CB-01]
estimated_hours: 3
---

## Description
The one migration of Cycle C-B (held at the schema gate — named approval required): `get_group_forum` / `create_forum_post` / `reply_to_forum_post` / `moderate_forum_post` (SECURITY DEFINER, `search_path=''`, `ds5_require_fim_actor` first, granted to authenticated); the COM-14 resolution (PD009 Q1 mechanism decided at authoring; strings "Former member"/"Unknown" fixed); `get_conversation_detail` re-issued with `{display_name, attribution}` sender map; `ds5_lifecycle_user_hard_deleted` (DS-3 fact-4 posture: REVOKE all, no grant) + `admin_hard_delete_user` re-issued byte-equivalent except PERFORM (core carve-out — this is the gate's core-touch); DROP `forum_insert_post`/`forum_update_own`/`forum_update_moderate` (`forum_select` stays). Same-change lockstep: conformance test `DS_TABLES` += `forum_posts`, `DS5_COMMUNICATION_FUNCTIONS` += the four contracts + the handler + `enforce_flat_threading`. ADR-U047 Amendment 3 (first DS-5 fact) rides the PR per PD009 Q2.

## Acceptance criteria
- [ ] Migration self-contained; no new tables (no new RLS needed); every function posture per house pattern
- [ ] PD009 Q1/Q2/Q3 decided and recorded in the migration header comment
- [ ] Conformance edits in the same PR; pre-apply RED labelled expected (the live `admin_hard_delete_user` body still holds the crossing — the gate proving it polices); post-apply green
- [ ] PR held at the schema gate with red evidence + apply commands in the body — NOT applied and NOT merged without a named approval

## Technical notes
Templates: `20260719190205` (handler posture + PERFORM wiring, `admin_hard_delete_user` current body at :1384-1470), `20260719230500` (contract style, `ds5_require_fim_actor`, sender-map precedent :346-357). The forum UPDATE to relocate: `:1421-1424`.

## Verification
Post-approval apply + repair; TASK-CB-01 suite flips green; conformance + full integration sweep green.
