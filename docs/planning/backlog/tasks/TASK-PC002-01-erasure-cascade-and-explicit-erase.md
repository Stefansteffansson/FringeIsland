---
id: TASK-PC002-01
title: Mist erasure-cascade primitive + explicit-erase RPC ("say goodbye")
status: done
assigned_to: Claude
priority: high
feature: FEAT-PC002
owner: platform/core/identity
wave: ferd
cycle: IDN-2
depends_on: []
estimated_hours: 3
---

# TASK-PC002-01: Mist erasure-cascade primitive + explicit-erase RPC

## Description

FEAT-PC002 STORY-2 (ADR-U033). Build the shared Mist erasure-cascade primitive
`public._erase_mist(uuid)` and the owner-invoked `public.explicit_erase_mist()`
RPC. This is the foundation the scheduled reaper (TASK-PC002-02) reuses — the
sweep wraps the same primitive for expired rows; explicit-erase wraps it for the
owner on close.

Status `review` (not `done`): schema change behind the schema-review gate.

## Acceptance criteria

- [x] `explicit_erase_mist()` erases the **calling** Mist (caller = `auth.uid()`)
      immediately — full cascade (journeys, `auth.users`→profile, proto group →
      memberships/roles/role-permissions) with **no orphaned child rows**.
- [x] A **non-temporary** caller (a FIM) is denied with ERRCODE `42501`
      (insufficient_privilege); the FIM is unchanged. A Mist may erase only its
      own (temporary) session.
- [x] `_erase_mist(uuid)` is REVOKEd from PUBLIC (no client may erase an
      arbitrary user by id); `explicit_erase_mist()` is GRANTed to `authenticated`.

## Technical notes

- Both functions `SECURITY DEFINER` + `SET search_path = ''` (platform gotcha);
  privilege-escalation surface documented in the migration comment.
- **Cascade order** mirrors `admin_hard_delete_user`: journeys (RESTRICT FK) →
  `auth.users` (CASCADE removes `public.users`) **before** the proto group, so the
  `users.personal_group_id` ON DELETE SET NULL never trips the
  `enforce_personal_group_id_immutability` BEFORE-UPDATE guard. Bypass session
  vars (`app.bypass_personal_group_id_immutability`, `app.hard_delete_in_progress`)
  set defensively.
- Observability: the explicit-erase V4 event is emitted **Hub-side** over the
  existing telemetry seam (no DB event sink today); the reaper-run event lands
  with TASK-PC002-02.
- Migration: `supabase/migrations/20260626202215_feat_pc002_mist_explicit_erase.sql`.

## Verification

- `hub/tests/integration/auth/mist-reaper.test.ts` — green, **demonstrated red
  first** (cascade: `PGRST202` → null; denial: `PGRST202` → `42501`).
- Full `npm run test:integration -w hub` auth slice + `npm run lint -w hub` green.
