---
id: TASK-PC004-01
title: Own-account-state read — get_own_account_state() + /api/account/state route
status: review
assigned_to: Claude
priority: high
feature: FEAT-PC004
owner: platform/core/identity
wave: ferd
cycle: IDN-9
depends_on: []
estimated_hours: 4
---

# TASK-PC004-01: Own-account-state read contract (function + route)

## Description

FEAT-PC004 (IDN-9 platform half). A member-facing read of their **own**
account lifecycle state, bypassing the `users_select_active` visibility filter
for the caller's own row so a switched-off member can see their own state.

- **`public.get_own_account_state()`** — `SECURITY DEFINER`, `SET search_path = ''`.
  Resolves the caller via the actor primitive (`auth.uid()` → `users.auth_user_id`
  → `users.id`), reads the own row with **no `is_active` filter**, and returns
  `jsonb {is_active, is_decommissioned, state}`. The derived `state` is an **open**
  label: the off-but-not-closed state is reported as **`'suspended'`** (today's
  only producer is an admin hold), `'decommissioned'` is terminal, otherwise
  `'active'`. `'deactivated'` was retired as ambiguous; the member-initiated
  `'paused'` label is deferred with IDN-12 (see
  `../../hub-v2/account-lifecycle-states-decision.md`). GRANT to `authenticated`
  + `service_role`.
- **`GET /api/account/state`** — `@supabase/ssr` cookie-session auth (the shipped
  Hub house style; the spec's `/api/v1/` + Bearer is directional, not yet
  realised — same posture as TASK-PC003-01). Sessionless → 401; no mapped row → 404.

**Status `review`: schema-touching.** Migration `20260629054349` (the new
`SECURITY DEFINER` function) is **applied and human-approved**, but the **PR merge
is pending** — the schema gate holds the task at `review` until merge lands.

## Acceptance criteria

- [ ] `get_own_account_state()` returns the caller's own `is_active` /
      `is_decommissioned` + derived `state`, resolved via the actor primitive;
      never another user's row, no parameter to target another account.
- [ ] A switched-off member (`is_active=false`) reads their own state through the
      `SECURITY DEFINER` read even though `users_select_active` hides the row;
      an ordinary `SELECT` by any other surface still returns nothing
      (visibility filter unchanged).
- [ ] `is_decommissioned=true` reads as terminal (`state='decommissioned'`),
      distinct from the off-but-not-closed `'suspended'`.
- [ ] Route: sessionless → 401; authenticated-but-no-mapped-row → 404;
      structured telemetry (actor + outcome, failures included).

## Technical notes

- `SECURITY DEFINER` + `search_path=''` per platform `SECURITY DEFINER` discipline;
  migration comment documents the privilege-escalation surface (own two lifecycle
  booleans + derived label only).
- Additive — no existing route/contract signature change (no ADR-U015 bump).
- `state` is an open string the Surfaces switch on; a future `'paused'` label adds
  without a breaking change.

## Verification

- Integration `hub/tests/integration/account/account-state-read.test.ts` — 6/6
  (three states + own-row boundary + RLS-unchanged guard + empty case).
- Route unit `hub/tests/unit/app/api/account-state-route.test.ts` — 5/5.
- Red-first: demonstrated red on the missing function before the gated apply.
- `bash supabase-cli.sh migration list` shows `20260629054349` applied.
