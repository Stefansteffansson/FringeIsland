# Invitation & joining contracts: search, invite (FIM + email), pending reads, accept/decline + red-first contract tests

---
id: TASK-PC012-01
title: Invitation contracts — search_invitable_members / invite_member / invite_by_email / get_group_invitations / cancel_member_invitation / cancel_email_invitation / get_my_invitations / accept_group_invitation / decline_group_invitation + red-first integration tests
status: review
assigned_to: claude
priority: high
feature: FEAT-PC012
owner: platform/core/organisation
wave: ferd
cycle: Groups G-C
depends_on: []
estimated_hours: 5
---

## Description

Nine SECURITY DEFINER contracts over the existing PC-3 invitation substrate (**no new table, no policy changes**), red-first: integration tests demonstrating RED (functions absent, PGRST202) before the migration lands them. Actor = `get_current_personal_group_id()` (P-O1). All writes FIM-only + active-account-only (`is_active is distinct from true` → 42501 'account is suspended' — the PC011 gate verbatim); group resolution follows the G-A visibility rule where the caller is not the invitee (member-or-public+active, else P0002 — no leak); invitee-side contracts anchor on the caller's own `'invited'` row instead.

**Substrate facts verified on disk (2026-07-04, decompose session):**
- `memberships_insert_invite` RLS: `status='invited' AND added_by_group_id = actor AND has_permission(actor, group, 'invite_members')` — the contract mirrors exactly this predicate.
- `memberships_update_accept`: self-only `invited→active`; decline = self-delete (`memberships_delete_leave`). On accept, `auto_assign_member_role_on_accept` binds the Member-template instance and `notify_invitation_accepted` writes the durable row; `notify_invitation_received` fires on the invite INSERT, `notify_invitation_declined_or_member_change` on the decline DELETE — expected, never duplicated by the contracts.
- `UNIQUE(group_id, member_group_id)` on `group_memberships` → duplicate invite / already-member surfaces 23505. `UNIQUE(group_id, invited_email)` on `pending_email_invitations` → duplicate email invite 23505.
- `pending_email_invitations`: token UUID + `expires_at` default NOW()+30 days; **no UPDATE policy** (claim flips status only via SECURITY DEFINER `handle_new_user` Step 8); RLS select/insert/delete all `invite_members`-gated; **expiry is predicate-based** — nothing transitions `status` to `'expired'`, no reaper exists or is built (reads compute an honest `expired` boolean from `expires_at`).
- `handle_new_user()` Step 8 auto-claims at sign-up (case-insensitive, unexpired, multi-group) into `'invited'` memberships — **consumed, never modified** (PC-2 seam).
- `get_member_groups()` and `get_group_detail()` both filter `status='active'` — invited memberships are invisible to every existing read; the invitee-side contracts are the only window.
- `public.users.email` is UNIQUE NOT NULL — exact-email search and the existing-FIM conversion check stay inside `public`, no auth-schema join.
- **No member-search primitive exists anywhere** (verified zero + independent cross-check; legacy's users-RLS search policy lives only in `migrations/archive/`, not carried into v2).

## Acceptance criteria

- [ ] `search_invitable_members(p_group_id, p_query)` — `invite_members`-gated (42501 without; P0002 non-member no-leak); name-partial ilike on personal-group display name + case-insensitive **exact** email match; cap 8; payload rows `{member_group_id, display_name, membership_status}` — **no email addresses**; Mists (`is_temporary`), suspended (`is_active=false`, incl. the `[Deleted User]` sentinel) never returned (spec Open Q1 default)
- [ ] `invite_member(p_group_id, p_member_group_id)` — `invite_members`-gated; inserts `'invited'` membership with `added_by_group_id` = actor; target must be an invitable FIM personal group, else P0002 (Mist proto-groups/engagement groups/ghosts indistinguishable); already-member/already-invited → 23505-mapped; re-invite after decline succeeds
- [ ] `invite_by_email(p_group_id, p_email)` — `invite_members`-gated; malformed email 22023; duplicate (group,email) 23505; existing-FIM email (case-insensitive) **converts server-side** to a membership invitation, no email row created (spec Open Q2 default); otherwise durable `pending_email_invitations` row (`invited_by_group_id` = actor); **no dispatch** (D4 — V3 seam)
- [ ] `get_group_invitations(p_group_id)` — `invite_members`-gated (spec Open Q3 default); both kinds: membership invitations (invitee display name, `invited_at`, inviter display name) + email invitations (`id`, `invited_email`, `created_at`, `expires_at`, honest `expired` boolean)
- [ ] `cancel_member_invitation(p_group_id, p_member_group_id)` / `cancel_email_invitation(p_invitation_id)` — `invite_members`-gated deletes; ghosts P0002
- [ ] `get_my_invitations()` — the caller's own `'invited'` memberships: group id/name/description/`is_public`, `invited_at`, inviter display name — invitation context only, never private-group detail
- [ ] `accept_group_invitation(p_group_id)` — own invited row `invited→active` (Member role auto-bound + accepted-notification row via existing triggers, asserted); group then appears in `get_member_groups()`; no invited row → P0002
- [ ] `decline_group_invitation(p_group_id)` — own invited row deleted (declined-notification via existing trigger); re-invitation afterwards possible; no invited row → P0002
- [ ] Auto-claim arc: seed a pending email invitation, sign up a fresh user with that email (test client), assert the `'invited'` membership + `'claimed'` email row exist, then accept via the contract — one joining flow for both births (STORY-3/5)
- [ ] Mist callers 42501 on every contract; suspended callers 42501 on every write
- [ ] All new-contract tests demonstrated RED (functions absent) → GREEN post-migration, migration untouched between runs

## Technical notes

Test file `hub/tests/integration/groups/invitation-contracts.test.ts` on the `role-permission-contracts.test.ts` harness (createTestUser/createAdminClient/signInWithRetry/cleanup*; the seedGroup pattern with an admin-seeded 'GC Inviter' custom role holding `invite_members` only — the minimal-permission probe persona). One migration (with TASK-PC012-02's items): nine functions + grants. SQLSTATEs per house pattern: 42501 FIM-only/suspended/not-permitted, P0002 no-leak, 22023 invalid parameter, 23505 surfaced from uniques. Display identity = the personal group's name (the synced display name), never `full_name` directly. Each SECURITY DEFINER function documents its elevation; bodies minimal per the PG17 ceiling; no role-name strings (ADR-U007).

## Verification

`npm run test:integration:groups` red before migration, green after; full `npm run test:integration` green (`--runInBand`).
