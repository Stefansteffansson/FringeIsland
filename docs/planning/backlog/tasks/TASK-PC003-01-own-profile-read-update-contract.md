---
id: TASK-PC003-01
title: Own-profile read + identity-scope-gated update contract (lib + route)
status: todo
assigned_to: Claude
priority: high
feature: FEAT-PC003
owner: platform/core/identity
wave: ferd
cycle: IDN-4
depends_on: []
estimated_hours: 5
---

# TASK-PC003-01: Own-profile read + identity-scope-gated update contract

## Description

FEAT-PC003 STORY-1 (own-row read), STORY-2 (identity-scope-gated update),
STORY-3 (display-name cascade confirmed as the existing-trigger contract), and
STORY-4 (observability + no regression). The contract is a data-access lib
(`lib/profile/queries.ts`) plus the `GET`/`PATCH /api/profile/me` route, run as
the **authenticated caller** under the existing own-row RLS — *not*
`SECURITY DEFINER`/`service_role`.

**Recon-confirmed substrate (no schema work in this task):**
- `users_update_own` UPDATE policy already exists (`auth_user_id = auth.uid()`,
  same `with_check`) — the own-row UPDATE posture is already enforced.
- `users_select_active` SELECT policy is broad (`is_active = true`), so own-row
  *read* is enforced by **route-scoping** (the contract only ever resolves the
  caller's own row) and the readback after `UPDATE…RETURNING` is safe (no
  dual-policy trip).
- `sync_display_name_to_personal_group` trigger is on disk and intact — confirm
  as the cascade contract; do **not** add a second cascade.

## Acceptance criteria

- [ ] Own-profile read returns only the caller's identity-scope fields
      (`full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`,
      `avatar_url`), resolved via the actor primitive; never another user's row.
- [ ] Update writes only the caller's own row; **identity-state / ownership
      columns** (`is_temporary`, `email`, `auth_user_id`, `personal_group_id`,
      `is_active`, `is_decommissioned`) are **rejected** at the route
      (allow-list column gating) — the rejected-column path is tested explicitly.
- [ ] Updating another user's row is denied (own-row RLS).
- [ ] Invalid input rejected: empty `full_name`/`nickname`, `display_preference`
      outside `{real_name, nickname}` (existing DB CHECKs), over-long `bio`
      (contract validation — bound is a single named constant).
- [ ] A display-name / display-preference change cascades to the personal-group
      `name` via the existing trigger, atomic with the update; no Hub/app write
      to `groups`.
- [ ] Profile read/update emit structured telemetry (actor + outcome, **failures
      included**); existing auth contracts (PC001/PC002) unchanged — additive,
      no ADR-U015 version bump.

## Technical notes

- Mirror `lib/groups/queries.ts` (RLS-scoped data-access fn) and the
  `/api/groups` + `/api/auth/transcend` route shape (`createClient()` →
  `getUser()` → lib call → telemetry). Route path `/api/profile/me`
  (matches the shipped `/api/<resource>` convention; the spec's `/api/v1/...`
  is directional and not yet realised anywhere in the new Hub).
- Identity-scope allow-list is a single growable constant (ADR-U018 spirit).
- Bio bound constant `PROFILE_BIO_MAX_LENGTH = 500` (the legacy oracle bound);
  the DB backstop CHECK is TASK-PC003-02.

## Verification

- Integration tests (real Postgres + RLS): own-row read scoping, gated update,
  rejected-column path, cross-user denial, invalid-input rejection, cascade.
  Unit test for the route handler (mocked client/lib). Red-first, full pyramid.
