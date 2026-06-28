---
id: TASK-PC003-02
title: Bio length DB CHECK constraint (defense-in-depth backstop)
status: done
assigned_to: Claude
priority: high
feature: FEAT-PC003
owner: platform/core/identity
wave: ferd
cycle: IDN-4
depends_on: []
estimated_hours: 1
---

# TASK-PC003-02: Bio length DB CHECK constraint

## Description

FEAT-PC003 Open Spec Q2. Recon confirmed there is **no DB CHECK on `bio`**
(unlike `nickname_not_empty` and `users_display_preference_check`, which are
DB-enforced). Because the `users_update_own` RLS policy lets an authenticated
caller write their own `bio` directly, the contract-layer length validation
(TASK-PC003-01) is not a sufficient backstop on its own. This task adds the
DB-level guard so `bio` has parity with the other identity-scope CHECKs — the
DB is the backstop, the contract is defense-in-depth.

**Decision (human-approved): add the DB CHECK** — bound 500 chars, matching the
contract constant `PROFILE_BIO_MAX_LENGTH`.

Status `review`: schema change behind the **schema-review gate**. The migration
is authored and a red test written, then **paused for human approval before it
is applied / merged**.

## Acceptance criteria

- [ ] New additive migration adds `CHECK (bio IS NULL OR char_length(bio) <= 500)`
      to `public.users` (constraint named, e.g. `bio_max_length`).
- [ ] No existing row violates the bound before the constraint is added
      (verified against live data — bio is currently null/short).
- [ ] An over-long `bio` written directly (bypassing the contract) is rejected
      by the DB constraint — proven by a red-first integration test.
- [ ] Migration follows the supabase-CLI workflow (timestamp order; never
      rewrites `20260222000000` or `20260227095615`).

## Technical notes

- Additive `ALTER TABLE … ADD CONSTRAINT`. No RLS change (the own-row UPDATE
  policy already exists). No trigger needed — a length bound needs no subquery,
  so a plain CHECK is the correct tool.
- The bound is duplicated between the SQL literal and the TS constant; the
  migration comment names `PROFILE_BIO_MAX_LENGTH` as the source of truth so a
  future tweak updates both (constant + new additive migration).

## Verification

- Integration test: direct over-long `bio` UPDATE on own row (own-row RLS
  permits the row) is rejected by the constraint. Red before apply → green after.
- `bash supabase-cli.sh migration list` shows the new migration applied.
