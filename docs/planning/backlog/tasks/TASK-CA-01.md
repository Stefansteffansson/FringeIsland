# Schema-gate migration: conversation-model redesign

---
id: TASK-CA-01
title: Schema-gate migration - participants junction, kinds registry, messages rename, write-narrowing, publication disposition, permission seed
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD008
owner: platform/domain/communication
wave: ferd
cycle: C-A
depends_on: []
estimated_hours: 3
---

## Description
The one migration of Cycle C-A (held at the schema gate — named approval required): `conversation_kinds` registry (seed `dm`, `group`); `conversation_participants` junction (PK conv+participant, `last_read_at`, `joined_at`, `left_at`, RLS); `conversations` gains `kind` + nullable `group_id`, existing rows emit junction rows carrying read-state, pair columns + CHECKs retire, DM-pair uniqueness re-enforced in schema (PD008 Q1 mechanism); `direct_messages` → `messages` (PD008 Q2; audit trigger re-created); `can_update_conversation` retired, `is_conversation_participant` reshaped over the junction; permissive v1 INSERT/UPDATE policies dropped (writes through contracts only; SELECT policies stay); `conversations`/`messages` leave `supabase_realtime` publication (ADR-U039); seed `create_group_conversations` permission row + role-template assignments.

## Acceptance criteria
- [ ] Migration file complete, self-contained, data-preserving (existing 1-to-1 rows → junction rows with read-state carried)
- [ ] Every new table has RLS from birth; every function SECURITY DEFINER `search_path=''`; REVOKE posture per house pattern
- [ ] PD008 Q1/Q2/Q3 mechanisms decided and recorded in the migration header comment
- [ ] PR held at the schema gate with apply commands in the body — NOT applied without named approval

## Technical notes
Template: `20260719190205` (ds3_lifecycle handlers) for function posture; the D15 rebuild for the comm tables' current shape. Seeds: `supabase/seeds/01_permissions.sql` + `02_role_templates.sql` pattern.

## Verification
Migration applies clean on dev after approval; TASK-CA-02's red integration tests flip green.
