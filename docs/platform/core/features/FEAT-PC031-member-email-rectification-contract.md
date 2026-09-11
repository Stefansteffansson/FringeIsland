# FEAT-PC031: Member email rectification — the administrator contract that corrects a login identity

---
id: FEAT-PC031
title: Member email rectification contract — an audited, platform-admin-gated correction of a member's login identity across auth.users, auth.identities and the public.users mirror in one transaction
owner: platform/core/governance
consumers: [hub]
wave: eid
maturity: 4-ready
requires-equipment: none
---

## Problem

A member's email address is permanent for the life of their account. No contract changes it. A member who mistyped their address at signup, lost access to a mailbox, or changed employer has exactly one remedy: hard deletion and re-signup, which destroys their groups, journeys and authored content.

The platform therefore cannot honour a GDPR Art. 16 rectification request at all. [ADR-U054](../../../architecture/decisions/ADR-U054-admin-email-rectification.md) rules that a platform administrator may perform the correction, and this feature is the platform half of that ruling. The full investigation is [`EMAIL-CHANGE-GAP-ANALYSIS.md`](../../../planning/reference/EMAIL-CHANGE-GAP-ANALYSIS.md).

**Why this must be Platform Core and not a Domain Service** (sub-tier authoring discipline, `docs/platform/core/CLAUDE.md`). The capability mutates `auth.users` and `auth.identities`. Those rows are the authentication substrate that PC-2 Identity owns and every Domain Service depends on; a Domain Service reaching them would invert the one-way dependency rule outright. There is no Domain form of this capability to reject on convenience grounds — the bar is capability, and Domain does not have it. The contract is placed in PC-4 Governance rather than PC-2 Identity because it is an *administrator* operation over another member's row, which is the defining shape of the PC-4 `admin_*` family (FEAT-PC020/021/022 precedent), not of PC-2's own-row contracts.

## Solution sketch

One `SECURITY DEFINER` function in the PC-4 member-administration family:

```
admin_update_user_email(target_user_id uuid, p_new_email text, p_reason text) returns jsonb
```

It follows the family's established spine exactly — `is_platform_admin()` guard, target read `FOR UPDATE`, typed refusals, mutation, `admin_audit_log` insert, member notice, `jsonb` result — and adds the three-store write that makes an email change correct rather than partial.

**Returned payload:** `{ success, previous_email, new_email, sessions_revoked, invitations_deleted }`. The two counts are not decoration. The change cuts the member's live sessions and deletes offers addressed to them, and the administrator confirming the action should see those consequences named rather than inferred. The payload walk against FEAT-H050 is in that spec.

## Appetite

One build cycle for the contract, its migration and its integration tests. It is a single function in a family of nine siblings whose shape is settled; the cost is in the correctness of the three-store write and its refusal matrix, not in novelty.

## Rabbit holes

- **Do not reach for the Supabase Auth Admin API.** It needs a service-role key on the Surface, which [ADR-U038](../../../architecture/decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md) exists to prevent. The contract writes the auth schema from inside Postgres, as `admin_hard_delete_user` already does.
- **Do not build a confirmation-token flow.** The GoTrue `email_change*` columns exist on `auth.users` and will tempt a half-implementation. ADR-U054 ruled the change immediate and the address confirmed; the contract *clears* those columns rather than using them.
- **Do not add an `AFTER UPDATE` trigger on `auth.users` to sync the mirror.** It would fire for every GoTrue write (sign-in timestamps, token rotation) to solve a problem this contract already solves in-transaction. Timebox any discussion of it to zero.
- **Case sensitivity is a trap with a live edge.** The unique index `users_email_partial_key` on `auth.users` is case-**sensitive**; only the non-unique `users_instance_id_email_idx` is on `lower(email)`. Normalising is a correctness requirement, not tidiness.

## No-gos

- **No self-service rectification.** ADR-U054 point 3. A member cannot change their own address through this or any contract in this feature.
- **No bulk rectification.** One target per call. The bulk family (FEAT-PC021 / FEAT-H039) deliberately carries only the safe subset, and redirecting login identities in bulk is not in it.
- **No outbound email.** No notice to the old address, no confirmation to the new one. The platform has no mailer of its own; ADR-U054 names this as the accepted limitation.
- **No change to a Mist.** An anonymous account has no email identity to rectify.
- **No re-pointing of invitations.** They are deleted, not redirected (ADR-U054 point 5).
- **No new admin role or permission scope.** The existing platform-administrator grant carries it.

## Stories

### STORY-1: Only a platform administrator may rectify, and only against a real target
As the platform, I want the contract gated and its target resolved before anything else, so that the escalation is bounded to callers who already hold it.

**Acceptance criteria:**
- Given a caller for whom `public.is_platform_admin()` is false, when the contract is called, then it raises `42501` and no row, audit entry or notice is written.
- Given a platform administrator and a `target_user_id` matching no row in `public.users`, when the contract is called, then it raises `P0002`.
- Given a platform administrator and a valid target, when the contract runs, then the target row is read `FOR UPDATE` before any mutation, serialising against the self-service contracts' own-row locks.
- Given any successful call, when the audit row is written, then its `actor_group_id` is the caller's `public.get_current_personal_group_id()`.

### STORY-2: The address is normalised and validated before it is written
As the platform, I want the incoming address lowercased, trimmed and shape-checked, so that a change cannot seat two accounts that differ only by case.

**Acceptance criteria:**
- Given an address with leading or trailing whitespace or uppercase characters, when the contract runs, then the value written to all three stores is the trimmed, lowercased form.
- Given a value that is not a syntactically valid email address, when the contract is called, then it raises `22023` and nothing is written.
- Given a `p_reason` that is null, empty, or whitespace only, when the contract is called, then it raises `22023` — the reason is required, matching the DB-4 posture on `admin_update_user_status`.
- Given a normalised address identical to the target's current address, when the contract is called, then it raises `P0001` — the family's no-op guard, which writes nothing at all.

### STORY-3: A collision refuses, checked against both stores
As the platform, I want an address already in use to refuse cleanly, so that the change never fails halfway on a unique-index violation.

**Acceptance criteria:**
- Given the normalised address already exists on another `auth.users` row under any casing, when the contract is called, then it raises `P0001` with a message naming the collision, and nothing is written.
- Given the normalised address already exists on another `public.users` row, when the contract is called, then it raises `P0001`.
- Given a collision refusal, when it is raised, then it is raised *before* any store is mutated — the check is not a caught unique-violation after the fact.

### STORY-4: An account with no email identity cannot be rectified
As the platform, I want Mists and any row without an email refused, so that the contract never invents an identity where none existed.

**Acceptance criteria:**
- Given a target whose `public.users.is_temporary` is true, when the contract is called, then it raises `P0001` stating that an anonymous account has no email identity to rectify.
- Given a target whose `public.users.email` is null, when the contract is called, then it raises `P0001`. (The column is nullable; a Mist carries no address.)

### STORY-5: All three stores are written in one transaction
As the platform, I want the auth row, the identity record and the mirror updated together, so that no half-done change can survive.

**Acceptance criteria:**
- Given a valid rectification, when it succeeds, then `auth.users.email` holds the normalised address and `email_confirmed_at` is set to `now()`.
- Given a valid rectification, when it succeeds, then the five GoTrue change-flow columns on that row — `email_change`, `email_change_token_new`, `email_change_token_current`, `email_change_sent_at`, `email_change_confirm_status` — are cleared to their empty or null defaults, so no half-open change flow survives the correction.
- Given a valid rectification, when it succeeds, then the `provider = 'email'` row in `auth.identities` has the normalised address in `identity_data`. (Its `email` column is `GENERATED ALWAYS AS (lower(identity_data ->> 'email')) STORED`, so it follows automatically and must not be written directly.)
- Given a valid rectification, when it succeeds, then `public.users.email` holds the normalised address and `updated_at` is `now()`.
- Given any refusal raised by STORY-1 through STORY-4, when it is raised, then none of the three stores is modified.

### STORY-6: The member's live sessions are cut
As a member whose address was changed because the old one was compromised, I want every existing session ended, so that whoever held the old mailbox loses their foothold.

**Acceptance criteria:**
- Given a successful rectification, when it completes, then every row for that user in `auth.sessions` and `auth.refresh_tokens` is deleted, in the same transaction as the address write.
- Given a successful rectification, when the payload is returned, then `sessions_revoked` carries the number of `auth.sessions` rows deleted.

### STORY-7: Offers addressed to the old address are deleted
As the platform, I want pending invitations to the superseded address removed, so that no personal data survives beyond the reach of an erasure request.

**Acceptance criteria:**
- Given pending rows in `public.pending_email_invitations` whose `lower(invited_email)` equals the target's previous address, when the rectification succeeds, then those rows are deleted in the same transaction.
- Given a successful rectification, when the payload is returned, then `invitations_deleted` carries the number of rows deleted.
- Given invitations addressed to the *new* address, when the rectification succeeds, then they are left untouched — they now belong to this member and `erase_fim_account` can reach them.

### STORY-8: Every rectification is auditable, and the old address survives in the trail
As a platform administrator reviewing the audit log, I want both addresses and the stated reason recorded, so that a redirected account can be traced after the fact.

**Acceptance criteria:**
- Given a successful rectification, when it completes, then one row is inserted into `public.admin_audit_log` with `action = 'member.email_change'`, `target` = the target user id as text, and `actor_group_id` = the caller's personal group id.
- Given that audit row, when it is read, then its `metadata` carries `previous_email`, `new_email`, `reason`, `sessions_revoked` and `invitations_deleted`.
- Given any refusal, when it is raised, then no audit row survives. (The family raises inside the transaction, so an audit row written before the raise is discarded — this is the measured behaviour recorded against the retire family, and it is why refusals are not audited here rather than being claimed as audited.)

### STORY-9: The member is told, in a notice the contract owns
As a member, I want to find out that my sign-in address changed, so that a change I did not ask for is visible to me.

**Acceptance criteria:**
- Given the `account` notification category, when this feature ships, then `notification_kinds` carries a new row `account_email_changed` in that category, seeded with `on conflict (kind) do nothing`. (`notifications.type` has a foreign key to `notification_kinds(kind)`, so an unregistered kind cannot be inserted.)
- Given a successful rectification against a target with a personal group, when it completes, then one row is inserted into `public.notifications` addressed to that personal group with `type = 'account_email_changed'` and the administrator's reason as the body.
- Given that notice, when the contract builds its title, then the title is a **literal in the function body** and the contract does **not** read `notification_kinds` for a label — the rule established by `20260903130000_db4_pc030_notice_titles_are_core_literals.sql`.
- Given a target with no personal group, when the rectification succeeds, then no notice row is written and the rectification still succeeds.

### STORY-10: The function ships locked down and registered
As the platform, I want the new contract to satisfy every conformance gate its object class faces, so that it does not ship anon-reachable or unregistered.

**Acceptance criteria:**
- Given the migration that creates the function, when it is applied, then it carries `revoke all on function public.admin_update_user_email(uuid, text, text) from public, anon;` paired with the grant to `authenticated` and `service_role`.
- Given `supabase/ownership.manifest.json`, when the feature ships, then the function is listed under `functions."PC-4"` and under `exposure.client`, in the same commit as the migration.
- Given the platform conformance family, when it runs, then `function-classification-completeness`, `ownership-manifest-conformance`, `anon-execute-lockdown` and `exposure-register-conformance` are green.

## Conformance gates this object class faces

Named at spec time per the decomposition discipline, because this contract introduces an object class the codebase has not carried before.

**This is the first migration in the repository that *writes* the auth schema.** Every existing auth-schema access is a `DELETE` — `auth.users` in `admin_hard_delete_user` and `erase_fim_account`, `auth.sessions` and `auth.refresh_tokens` in the force-logout paths. No migration performs `UPDATE auth.users` or touches `auth.identities` at all. Verified by sweep across `supabase/migrations/`. The precedent for crossing into the auth schema from a `SECURITY DEFINER` function is therefore established, but the precedent for *mutating* rows there is not, and the `auth.identities` table has no precedent of any kind.

No conformance gate currently constrains which schemas a function may write — checked against all ten suites in `hub/tests/integration/platform/`. So this class will not be refused at build the way a cross-owner trigger mount was; the risk is the opposite one, that it ships without anyone having decided it was acceptable. ADR-U054 is that decision, and this section is its trace.

The gates that **do** bind, all four verified against their suites: the two ownership-manifest registers, the anon-execute lockdown, and the exposure register. STORY-10 carries them as acceptance criteria.

## Platform dependencies

| Source | Consumed | Verified at |
|---|---|---|
| PC-4 Governance | `is_platform_admin()` — the admin guard | `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql` |
| PC-4 Governance | `admin_audit_log (actor_group_id, action, target, metadata)` — the audit shape | `20260801190000_adm_c_pc021_member_operations_family.sql:201` |
| PC-4 Governance | The family's refusal idiom and `FOR UPDATE` discipline | `20260801190000...:142-211` |
| PC-2 Identity | `get_current_personal_group_id()` — the actor primitive | `20260801190000...:159` |
| PC-2 Identity | `public.users` mirror, `users_email_key` unique, `email` nullable | live schema, test project |
| PC-2 Identity | `auth.sessions` / `auth.refresh_tokens` deletion precedent | `20260801190000...:426-427` |
| PC-3 Organisation | `public.pending_email_invitations.invited_email` | `20260223140126_enhanced_member_invitations.sql:12` |
| V3 Notifications | `notification_kinds` registry + the `notifications.type` foreign key | `20260723120000_n_a_notification_registry_and_contracts.sql`; FK verified live |
| PC-1 Infrastructure | `SECURITY DEFINER` + `search_path = ''`; migration discipline; the revoke/grant pattern | `docs/platform/CLAUDE.md` |

## Cross-product impact

The Gimbal has no administration surface and is unaffected. No studio consumes member administration. The contract is consumed by the Hub alone, through [FEAT-H050](../../../products/hub/features/FEAT-H050-admin-member-email-rectification.md).

## Vertical impact

- **Privacy/GDPR:** Directly serves Art. 16 rectification, which the platform could not honour before. The address is personal data and moves between stores; the previous address is deliberately retained in the audit trail as the record that the account was once reachable there, which is a retention decision, not an oversight. STORY-7 exists so that the change does not strand personal data beyond the reach of an Art. 17 request. **The Privacy vertical's obligation inventory still does not name Art. 16** — this contract creates the mechanism; the inventory amendment is separate and tracked at ADR-U054.
- **Notifications:** Emits a new `account_email_changed` kind in the existing `account` category. In-app only — the platform has no outbound mail, so the member is not warned at the old address. The category is member-suppressible per its existing configuration; this notice inherits that and is not forced on.
- **Administration:** This *is* an administration capability. It joins the PC-4 member-operations family as its tenth contract and its first over the authentication surface. Per ADR-U016 the cascade is stated in full by STORY-5 through STORY-9: three stores, sessions, invitations, audit, notice.
- **Observability:** One `admin_audit_log` row per successful rectification carrying both addresses, the reason and both counts. Refusals are not audited, and STORY-8 says so explicitly rather than claiming an audit trail the transaction semantics would discard. The Hub half emits durable telemetry on the route.
- **Transactions:** None. No entitlement, subscription or payment state keys off the email address.
- **Extensibility:** Introduces no enum, no permission scope and no sealed set. The new notification kind is a row in the open `notification_kinds` registry, which is the registry's designed extension point. The refusal codes reuse the family's existing four.

## Performance budget

N/A (no surface). The contract is a single-target transaction behind an administrator action; the user-facing budget lives with FEAT-H050.
