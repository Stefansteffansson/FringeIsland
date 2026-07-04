# Erasure-cascade extension over invitation rows + adversarial direct paths + TRUNCATE hygiene

---
id: TASK-PC012-02
title: erase_fim_account amendment (pending_email_invitations, Art. 17) + ADR-U038 adversarial direct-path suite + TRUNCATE revokes on pending_email_invitations and group_memberships
status: done
assigned_to: claude
priority: high
feature: FEAT-PC012
owner: platform/core/organisation
wave: ferd
cycle: Groups G-C
depends_on: [TASK-PC012-01]
estimated_hours: 3
---

## Description

Rides TASK-PC012-01's migration. Three items:

1. **Erasure amendment (STORY-6, the FEAT-PC002 gap found at decomposition):** `erase_fim_account()` gains a step — capture the target's email from `public.users` **before** the `admin_hard_delete_user` teardown, then `DELETE FROM pending_email_invitations WHERE LOWER(invited_email) = LOWER(<email>)` (they are unclaimed offers, not consent proof — the ADR-U034 retain-pattern does not apply; spec Open Q4 default). `invited_by_group_id → NULL` on inviter erasure is the existing FK behaviour — asserted, not assumed. Record the cross-reference in FEAT-PC002's Implementation notes at 6-done paperwork.
2. **Adversarial direct paths (STORY-7, ADR-U038):** as a non-privileged member and as a Mist, direct PostgREST INSERT/UPDATE/DELETE against `group_memberships` (invite/accept/decline shapes) and `pending_email_invitations` — every contract refusal also refused by the existing RLS (verified, not assumed; most asserts green-before-migration **by design**, labelled honestly). Known residue for the gate: a direct email-invite INSERT by an `invite_members` holder bypasses the contract's email validation and existing-FIM conversion — surfaced at the gate per the G-B posture, not unilaterally narrowed.
3. **TRUNCATE hygiene:** revoke TRUNCATE from `anon`, `authenticated` on `pending_email_invitations` and `group_memberships` (neither covered by PC010/PC011); verified via `information_schema.table_privileges` at the gate (PostgREST exposes no TRUNCATE verb — gate-audit record, not a Jest assert).

## Acceptance criteria

- [ ] Erasure suite: pending email invitations addressed to the erased FIM's email (any group, any case) are gone post-`erase_fim_account`; invitations *sent by* the erased FIM survive with `invited_by_group_id IS NULL`
- [ ] `erase_fim_account`'s existing behaviour unchanged (consent anonymise-then-retain, Mist refusal, teardown delegation — existing PC002 suite stays green)
- [ ] Direct-path matrix: Mist + plain member refused on every invite/accept-other/cancel-other shape (RLS agrees with contracts)
- [ ] Direct self-accept (`invited→active` UPDATE) and self-decline (DELETE) remain RLS-permitted — recorded as substrate-consistent (the contracts compose them; not a divergence)
- [ ] TRUNCATE absent from client-role privileges on both tables post-migration

## Technical notes

Same migration as TASK-PC012-01. The erasure amendment is a full-body `CREATE OR REPLACE` of `erase_fim_account(uuid)` (email capture must precede step 4's teardown — after `admin_hard_delete_user` the users row is gone). At build, the erasure tests landed in the invitation-contracts suite (STORY-6 describe block) reusing the fim-account-erasure suite's makePlatformAdmin pattern — one suite per feature; the existing PC002 suite stays untouched and green. Direct-path tests in the same file (STORY-7 describe block).

## Verification

`npm run test:integration` full green; migration header records the residue + hygiene for the schema-gate reviewer.
