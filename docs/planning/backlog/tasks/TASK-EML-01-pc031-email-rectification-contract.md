# PC-4 contract — admin_update_user_email

---
id: TASK-EML-01
title: The member email rectification contract — admin_update_user_email(uuid, text, text) + its migration
status: done
assigned_to: Claude
priority: high
feature: FEAT-PC031
owner: platform/core/governance
wave: eid
cycle: email-rectification
depends_on: []
estimated_hours: 5
---

## Description

Build the PC-4 contract specified by [FEAT-PC031](../../../platform/core/features/FEAT-PC031-member-email-rectification-contract.md), in one new migration under `supabase/migrations/`.

`admin_update_user_email(target_user_id uuid, p_new_email text, p_reason text) returns jsonb`, `SECURITY DEFINER`, `SET search_path = ''`, following the member-operations family's spine exactly (`20260801190000_adm_c_pc021_member_operations_family.sql:142-211` is the reference).

**Schema change — this task lands at `review`, never `done`.** It is the repository's first migration that *writes* the auth schema; every existing access is a DELETE.

## Acceptance criteria

- [ ] STORY-1 — `42501` for a non-admin; `P0002` for a missing target; target read `FOR UPDATE`; `actor_group_id` from `get_current_personal_group_id()`
- [ ] STORY-2 — address trimmed + lowercased before any write; `22023` on a malformed address; `22023` on a blank reason; `P0001` on a no-op (same address)
- [ ] STORY-3 — `P0001` on collision, checked case-insensitively against **both** `auth.users` and `public.users`, **before** any mutation
- [ ] STORY-4 — `P0001` for a Mist (`is_temporary`) and for a target whose `public.users.email` is null
- [ ] STORY-5 — one transaction writes `auth.users` (email, `email_confirmed_at`, five `email_change*` columns cleared), `auth.identities.identity_data` for the `provider='email'` row, and the `public.users` mirror; no store written on any refusal
- [ ] STORY-6 — `auth.sessions` + `auth.refresh_tokens` deleted for the target; count returned as `sessions_revoked`
- [ ] STORY-7 — `pending_email_invitations` matching the **previous** address deleted; count returned as `invitations_deleted`; rows matching the new address untouched
- [ ] STORY-8 — one `admin_audit_log` row, `action = 'member.email_change'`, metadata carrying both addresses, the reason and both counts
- [ ] STORY-9 — `account_email_changed` seeded in the `account` category with `on conflict (kind) do nothing`; the notice title is a **literal in the function body**, never a registry read; no notice when the target has no personal group
- [ ] STORY-10 — `revoke all on function ... from public, anon` paired with the grant; registered in `supabase/ownership.manifest.json` under `functions."PC-4"` **and** `exposure.client`

## Technical notes

- **Do not** use the Supabase Auth Admin API. No service-role key exists on the Surface (ADR-U038). The contract writes the auth schema from inside Postgres, as `admin_hard_delete_user` already does at `20260801190000...:379`.
- `auth.identities.email` is `GENERATED ALWAYS AS (lower(identity_data ->> 'email')) STORED` — write `identity_data`, never the column.
- `auth.users`' unique index `users_email_partial_key` is **case-sensitive**; `public.users.email` is `UNIQUE` and **nullable**.
- Notice title must be a literal — the rule from `20260903130000_db4_pc030_notice_titles_are_core_literals.sql`.
- Session deletion precedent: `20260801190000...:426-427`.
- Per the tier rule, the migration header names any sibling assertions it invalidates. This contract adds behaviour rather than changing shipped semantics, so the expected answer is "none" — but run the sweep and record it, don't assume.

## Verification

```
npx jest --selectProjects integration --testPathPatterns "member-email-rectification"
npm run test:integration:platform -w hub     # the conformance family
```

Red first: the suite must fail with "function does not exist" before the migration is applied.
