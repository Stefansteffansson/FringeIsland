# Platform Exit Gap Analysis — "FIM Leaves FringeIsland"

**Date:** 2026-04-09
**Scope:** Complete analysis of what happens when a user exits FringeIsland — admin-initiated and self-service paths, soft delete vs hard delete, data handling per entity, and GDPR gaps.

---

## 1. What `admin_exit_user_from_platform()` Currently Handles

**Source:** `supabase/migrations/20260228144747_sprint4_platform_exit.sql`

The RPC executes these steps in a single SECURITY DEFINER transaction:

| Step | Operation | Tables Affected |
|------|-----------|-----------------|
| 1. Authorization | Checks caller via `get_current_personal_group_id()` + `has_permission(..., 'manage_all_groups')` | `users`, `group_memberships`, `groups` (read) |
| 2. Target lookup | `SELECT personal_group_id, auth_user_id FROM users` | `users` (read) |
| 3. Safety guards | Rejects: self-exit, already-decommissioned, DeusEx member, non-existent user | `users`, `group_memberships`, `groups` (read) |
| 4. Steward template lookup | `SELECT id FROM role_templates WHERE name = 'Steward Role Template'` | `role_templates` (read) |
| 5. Per-group cascade | Iterates all active engagement group memberships. Per group: | |
| 5a. L1 (Regular Leave) | Freeze non-public `journey_enrollments` (status='frozen', progress_data += frozen_reason/frozen_at). DELETE from `user_group_roles`. DELETE from `group_memberships`. | `journey_enrollments` (UPDATE), `user_group_roles` (DELETE), `group_memberships` (DELETE) |
| 5b. L2 (Steward Handover) | INSERT DeusEx into `group_memberships` + `user_group_roles` (Steward). UPDATE `group_memberships` (transfer invited). UPDATE `pending_email_invitations` (transfer). Freeze enrollments. DELETE target roles + membership. INSERT notifications (stewardship_transferred to members, stewardship_required to DeusEx). | `group_memberships` (INSERT/UPDATE/DELETE), `user_group_roles` (INSERT/DELETE), `pending_email_invitations` (UPDATE), `journey_enrollments` (UPDATE), `notifications` (INSERT) |
| 5c. L3 (Group Closure) | UPDATE `groups` SET status='closed'. Freeze all enrollments in non-public journeys owned by group AND all group-level enrollments. Transfer non-public journeys to DeusEx (`UPDATE journeys SET created_by_group_id`). DELETE roles + membership. INSERT notification (group_closed to DeusEx). | `groups` (UPDATE), `journey_enrollments` (UPDATE), `journeys` (UPDATE), `user_group_roles` (DELETE), `group_memberships` (DELETE), `notifications` (INSERT) |
| 6. Decommission | `UPDATE users SET is_decommissioned = true, is_active = false` | `users` (UPDATE) |
| 7. Force logout | `DELETE FROM auth.refresh_tokens`. `DELETE FROM auth.sessions`. | `auth.refresh_tokens` (DELETE), `auth.sessions` (DELETE) |
| 8. Audit log | INSERT into `admin_audit_log` with action, groups_exited, group_details | `admin_audit_log` (INSERT) |

**What it returns:** `{ success, groups_exited, group_details: [{group_id, group_name, scenario}], decommissioned: true }`

---

## 2. Data Handling for Each Entity Type

### 2a. Group Memberships (`group_memberships`)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Regular member | Roles deleted, membership deleted (L1) | No |
| Sole Steward | DeusEx gets membership + Steward role, then target deleted (L2) | No |
| Last member | Group closed, then target deleted (L3) | No |
| Invited memberships | Transfer `added_by_group_id` to DeusEx (L2 only) | **GAP:** L1 scenario does not transfer pending invitations the user sent. If a regular member invited someone and then exits, those invitations retain the original `added_by_group_id` pointing at a decommissioned user's personal group. Not a FK violation (personal group still exists), but logically orphaned. |
| FringeIsland Members (system group) | NOT handled. The user remains an active member of the FI Members system group. | **GAP:** `admin_exit_user_from_platform` only iterates engagement groups (`g.group_type = 'engagement'`). The user's membership in FringeIsland Members (system group) is never removed. The decommissioned user is still listed as an active member of the system group. |

### 2b. Forum Posts (`forum_posts`)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Soft delete (decommission) | `author_group_id` is left intact. Per ADR-U021, display logic shows "Former Member" based on membership status. | No gap for decommission. |
| Hard delete | `admin_hard_delete_user()` reassigns `author_group_id` to `[Deleted User]` sentinel group. | No gap for hard delete. |
| Platform exit (decommission path) | **Posts are untouched.** `author_group_id` still points to the user's personal group, which still exists. Display shows "Former Member" since the user is no longer a member of the engagement group. | Acceptable per ADR-U021. |
| `is_deleted` soft-flag on posts | The `forum_posts.is_deleted` column exists but is never set during exit. | **DESIGN QUESTION:** Should a user be able to request deletion of their own posts before exit? Currently no mechanism exists. |

### 2c. Direct Messages (`direct_messages` + `conversations`)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Soft delete (decommission) | **Nothing happens.** Conversations and messages survive intact. `sender_group_id` still points to the user's personal group. The other party can still see the full conversation. | **GAP:** No decision documented on what should happen to DMs on platform exit. The other party sees messages from a decommissioned user with no indication the account is gone. |
| Hard delete | Personal group is deleted. `conversations` has `ON DELETE CASCADE` on both `participant_1` and `participant_2`. This means **the entire conversation is deleted**, including messages the other party sent. `direct_messages.sender_group_id` has `ON DELETE SET NULL`. | **GAP:** Hard delete destroys the other party's message history. This is destructive to an innocent user. No warning or alternative exists. |
| Display name after decommission | The user's personal group still exists (name column). DMs would show the old display name. | **GAP:** No "Former User" / "Decommissioned User" display logic for DM conversations, unlike forum posts which use membership-based display. |

### 2d. Journey Enrollments (`journey_enrollments`)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Non-public journey enrollments | Frozen (status='frozen', progress_data += frozen_reason + frozen_at). Only non-public journeys owned by the engagement group. | No gap. |
| Public journey enrollments | **NOT frozen.** The WHERE clause filters `j.is_public = false`. Public journey enrollments remain active. | **GAP:** A decommissioned user retains active enrollments in public journeys. These enrollments have `group_id` pointing to their personal group. Since `is_active = false`, the user cannot access them, but the data lingers as active. |
| Group-level enrollments (L3 only) | Frozen when group closes. | No gap for L3. |
| `enrolled_by_group_id` | Not touched during platform exit. | Minor: decommissioned user's personal group is still referenced. Not a bug. |

### 2e. Journey Progress Data

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Storage | Progress is stored in `journey_enrollments.progress_data` (JSONB). | N/A |
| On freeze | `frozen_reason` and `frozen_at` are appended to the existing `progress_data`. Original progress is preserved. | No gap per se, but see GDPR section. |
| Data deletion | No mechanism to purge progress data on exit. | **GDPR GAP:** Progress data may contain personal reflections, answers, etc. No erasure path exists. |

### 2f. Personal Journal / Profile Data

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| `users` table fields | `full_name`, `avatar_url`, `bio`, `email` survive decommission. Only `is_active` and `is_decommissioned` are changed. | **GAP:** PII (`full_name`, `email`, `bio`) survives decommission. For GDPR erasure, these should be scrubbed or anonymised. |
| Personal group name | The personal group `name` column (used as display name) is unchanged. | **GAP:** Display name survives decommission. |
| `avatar_url` | The URL string survives in `users.avatar_url`. | **GAP:** No check whether the URL points to a Supabase Storage object. If it does, the actual file is never deleted. |

### 2g. Uploaded Media / Avatars (Supabase Storage)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Avatar images | `users.avatar_url` and `groups.avatar_url` store URL strings. | **GAP:** Neither `admin_exit_user_from_platform` nor `admin_hard_delete_user` touches Supabase Storage buckets. If avatars are stored in Storage, the files persist indefinitely after exit. |
| Other uploads | No other upload mechanism found in the codebase. | N/A for now. |

### 2h. Notifications (`notifications`)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Notifications TO the user | `recipient_group_id` references the user's personal group. `ON DELETE CASCADE` means hard delete removes them. Decommission leaves them. | **Minor gap:** Decommissioned user accumulates notifications that nobody will ever read (e.g., stewardship_transferred notifications generated during their own exit). |
| Notifications FROM the user | No `sender_group_id` on notifications table. Notifications are system-generated. | No gap. |
| Notifications generated during exit | Platform exit generates notifications (stewardship_transferred, stewardship_required, group_closed) with `recipient_group_id` pointing to remaining members and DeusEx. | No gap. |

### 2i. The User's Personal Group (`groups` where `group_type = 'personal'`)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Soft delete (decommission) | **Untouched.** The personal group continues to exist with its original name, description, and avatar_url. | **GAP:** Personal group is still visible in queries (albeit not through normal UI paths). Contains PII (name). |
| Hard delete | Personal group is `DELETE`d. CASCADE removes: memberships, roles, notifications (recipient), conversations (both sides), enrollments (group_id). | Functional but see 2c re: conversation destruction. |

### 2j. Auth Record (Supabase Auth)

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| Decommission (platform exit) | `auth.refresh_tokens` and `auth.sessions` are deleted. The `auth.users` record **survives**. | **GAP:** The `auth.users` record contains `email`, `phone`, `encrypted_password`, `email_confirmed_at`, and other PII. This data survives decommission. The `users.auth_user_id` FK still points to it. |
| Hard delete | `DELETE FROM auth.users WHERE id = v_target_auth_user_id`. Full removal. | No gap for hard delete. |
| Can decommissioned user sign in? | `get_current_personal_group_id()` checks `is_active = true`. Returns NULL for decommissioned users, effectively blocking all RLS-gated operations. However, the Supabase Auth sign-in itself would still succeed (returns a session). The user would see an empty/broken UI. | **GAP:** No server-side block at the auth level. A decommissioned user can still obtain a valid JWT. The block is application-level only. |

### 2k. `pending_email_invitations`

| Aspect | Current Behavior | Gap? |
|--------|-----------------|------|
| L2 scenario | `invited_by_group_id` is transferred to DeusEx for pending invitations in the sole-Steward's group. | No gap for L2. |
| L1 scenario | **Not handled.** Pending invitations sent by the exiting user in groups where they are a regular member are not transferred. | **GAP:** Orphaned `invited_by_group_id` references. The invitations still work (personal group exists), but attribution is wrong. |
| Invitations addressed TO the exiting user's email | **Not handled.** If the exiting user has pending invitations to other groups (status='pending'), those invitations remain pending forever. | **GAP:** Should be expired or cleaned up on exit. |

---

## 3. Self-Service vs Admin-Initiated

### 3a. Self-Service "I Want to Leave" Flow

**There is NO self-service platform exit flow.**

- `app/profile/page.tsx` and `app/profile/edit/page.tsx` exist but contain **no** deactivation, deletion, or "leave platform" functionality (confirmed by grep).
- No `app/settings/` or `app/account/` directory exists.
- No "danger zone" or account deletion UI exists anywhere in the user-facing app.
- The only self-service group-level action is `leave_group(p_group_id)` RPC (Sprint 2), which lets a user leave a single engagement group.

**Decision reference:** D-R3 in `docs/old_products/ferd/planning/LIFECYCLE_DECISIONS.md` explicitly chose admin-assisted over self-service.

### 3b. Admin-Initiated Exit

The admin panel (`app/admin/page.tsx`) provides three relevant actions via `UserActionBar.tsx`:

| Action | Button Label | What It Does |
|--------|-------------|--------------|
| `exit_platform` | "Exit Platform" | Calls `admin_exit_user_from_platform` RPC per user. Processes all engagement groups (L1/L2/L3), decommissions, force-logs-out. Variant: `danger`. |
| `delete_soft` | "Delete (soft)" | Calls `admin_decommission_user` RPC. Sets `is_decommissioned = true`, `is_active = false`. Does NOT process groups. | 
| `delete_hard` | "Delete (hard)" | Calls `admin_hard_delete_user` RPC per user. Reassigns content to `[Deleted User]` sentinel, then `DELETE`s personal group (CASCADE), user record, and auth record. |

**Current UX for admin exit:**
1. Admin selects user(s) in the admin panel user list
2. Action bar appears with categorised buttons (Communication / Account / Group)
3. "Exit Platform" is in the Account category, styled as destructive (red)
4. ConfirmModal shows: "This will exit N user(s) from ALL engagement groups (applying leave/handover logic per group), then decommission and force-logout. This action cannot be undone."
5. Confirmation button: "Exit N User(s) from Platform" (variant: danger)
6. On success: status message, selection cleared, data refreshed

### 3c. Gap: The Missing Middle

| Gap | Description |
|-----|-------------|
| No self-service exit | A user who wants to leave must contact an admin. No in-app mechanism. GDPR Art. 17 requires that erasure be as easy as consent was to give. If sign-up is self-service, erasure should be too. |
| `delete_soft` vs `exit_platform` confusion | `delete_soft` (decommission) does NOT unwind group memberships. An admin could decommission a user who is still the sole Steward of groups, leaving those groups in a broken state. There is no guard preventing this. |
| No "cool-down" period | Platform exit is immediate and irreversible. No 30-day grace period. No "we'll delete your data in 30 days" flow. |
| No user notification before exit | The user being exited receives no notification or email that their account has been removed. |

---

## 4. Soft Delete vs Hard Delete

### 4a. Decommission (Soft Delete) — `admin_decommission_user()`

**Source:** `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql`

| What it does | Detail |
|-------------|--------|
| Sets `is_decommissioned = true` | Trigger also forces `is_active = false` |
| **Does NOT:** | Process group memberships, delete sessions, clean up content, notify anyone, touch auth record |

**Can a decommissioned account be reactivated?**
No. `admin_update_user_status()` explicitly checks:
```
IF v_target.is_decommissioned = true AND new_is_active = true THEN
  RAISE EXCEPTION 'Cannot reactivate a decommissioned user';
END IF;
```
There is no `admin_undecommission_user()` function. Decommission is a one-way operation at the application level, though a direct SQL UPDATE could reverse it.

### 4b. Platform Exit (Decommission + Group Unwinding) — `admin_exit_user_from_platform()`

Everything in 4a, PLUS:
- Unwinds all engagement group memberships (L1/L2/L3)
- Deletes auth sessions and refresh tokens
- Writes audit log

### 4c. Hard Delete — `admin_hard_delete_user()`

**Source:** `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql` (with fixes in `20260224205639`)

| What it does | Detail |
|-------------|--------|
| Reassigns `forum_posts.author_group_id` | To `[Deleted User]` sentinel group |
| Reassigns `journeys.created_by_group_id` | To `[Deleted User]` sentinel group |
| Reassigns `groups.created_by_group_id` | To `[Deleted User]` sentinel group (except personal group) |
| Reassigns `admin_audit_log.actor_group_id` | To `[Deleted User]` sentinel group |
| Reassigns `group_memberships.added_by_group_id` | To `[Deleted User]` sentinel group |
| Reassigns `user_group_roles.assigned_by_group_id` | To `[Deleted User]` sentinel group |
| Reassigns `journey_enrollments.enrolled_by_group_id` | To `[Deleted User]` sentinel group |
| Deletes personal group | CASCADE removes: memberships, roles, notifications, conversations, direct messages, enrollments |
| Deletes user record | `DELETE FROM users WHERE id = target_user_id` |
| Deletes auth record | `DELETE FROM auth.users WHERE id = v_target_auth_user_id` |

### 4d. Gaps Between Soft and Hard Delete

| Gap | Description |
|-----|-------------|
| No graceful path from decommission to hard delete | `admin_hard_delete_user()` does NOT check `is_decommissioned`. It does NOT call `admin_exit_user_from_platform()` first. If an admin hard-deletes a user who is still the sole Steward of a group, the CASCADE will delete their membership without L2 handover logic. The group is left with no Steward. |
| Hard delete does not unwind groups first | The L1/L2/L3 logic in `admin_exit_user_from_platform` is completely bypassed by hard delete. Hard delete relies on CASCADE, which is structurally different from the careful group unwinding logic. |
| `delete_soft` (decommission alone) leaves groups broken | An admin can decommission without first exiting from groups. This creates a user who is `is_active = false` but still has active group memberships, potentially as the sole Steward. |
| No recommended workflow | Docs do not state the intended sequence: exit_platform first, then optionally hard_delete later. The three actions appear independently in the UI with no enforced ordering. |

---

## 5. GDPR Gaps

### 5a. Right to Erasure (Art. 17) Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| No self-service deletion | HIGH | GDPR Art. 17(1) + Art. 12(2): erasure must be as easy as giving consent. Sign-up is self-service; deletion requires contacting an admin. |
| PII survives decommission | HIGH | `users.email`, `users.full_name`, `users.bio`, `users.avatar_url` are untouched. Personal group `name` is untouched. Auth record (`auth.users.email`, `encrypted_password`) is untouched. |
| `journey_enrollments.progress_data` not erased | MEDIUM | May contain personal reflections, answers, free-text input. No scrub/anonymise path exists. |
| `direct_messages.content` not erased | MEDIUM | Message content survives decommission. Contains personal communications. |
| `forum_posts.content` not erased (by design) | LOW | ADR-U021 preserves posts with "Former Member" attribution. This is defensible if the lawful basis is legitimate interest (preserving community knowledge), but should be documented as a deliberate GDPR Art. 17(3)(a) exception. |
| Supabase Storage files not deleted | MEDIUM | Avatar images (and any future uploads) persist in Storage buckets after both decommission and hard delete. |
| `pending_email_invitations.invited_email` | LOW | Contains the exiting user's email if they were invited to groups. Not cleaned up. |
| No erasure confirmation | MEDIUM | No email or in-app confirmation that erasure has been completed (GDPR Art. 12(3) requires confirmation within one month). |

### 5b. Right of Access / Data Portability (Art. 15 / Art. 20) Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| No data export capability | HIGH | No function, API route, or UI exists for a user to download their data. No admin tool for generating a data export either. |
| No inventory of personal data | MEDIUM | No documentation mapping which tables/columns contain personal data and what the lawful basis is for each. The `docs/verticals/privacy.md` scaffold acknowledges this as Phase 4 work. |

### 5c. Consent Tracking Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| No consent store | HIGH | `docs/verticals/privacy.md` lists "Consent store" as "Phase 4 -- currently partial". No `consents` table exists. No record of what the user consented to or when. |
| No consent withdrawal mechanism | HIGH | No way for a user to withdraw consent for specific processing purposes. |
| No privacy policy acceptance record | MEDIUM | No timestamp of when a user accepted terms of service or privacy policy. |

### 5d. Backup Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| No backup erasure process | LOW | Supabase point-in-time recovery means deleted data persists in backups. GDPR allows reasonable backup retention (Recital 65), but there should be a documented retention policy and a process for ensuring erased data is not restored from backup. |

---

## Summary: Priority-Ranked Action Items

| # | Action | Severity | Affects |
|---|--------|----------|---------|
| 1 | **Scrub PII on decommission** — Anonymise `users.{email, full_name, bio, avatar_url}` and personal group `name` when `is_decommissioned` is set. | HIGH | GDPR Art. 17 |
| 2 | **Build self-service exit flow** — User-facing "Delete My Account" in profile/settings. Could trigger the same `admin_exit_user_from_platform` logic or a new user-facing RPC. | HIGH | GDPR Art. 17 + UX |
| 3 | **Build data export** — API route + UI for users to download their data (profile, posts, messages, progress, enrollments). | HIGH | GDPR Art. 15/20 |
| 4 | **Guard `delete_soft` against group orphaning** — Either prevent standalone decommission when user has active memberships, or make it call exit_platform automatically. | HIGH | Data integrity |
| 5 | **Make hard delete call exit_platform first** — Or at minimum replicate L2 handover logic before CASCADE. | HIGH | Data integrity |
| 6 | **Handle DMs on decommission** — Decide: keep messages but show "[Decommissioned User]"? Delete the user's messages? Preserve the other party's view? Document the decision. | MEDIUM | GDPR + UX |
| 7 | **Delete auth record on decommission** — Or at minimum scrub `auth.users.email` and invalidate the password. Currently a decommissioned user can still obtain a JWT. | MEDIUM | Security + GDPR |
| 8 | **Clean up Storage files** — Delete avatar images from Supabase Storage on both decommission and hard delete. | MEDIUM | GDPR Art. 17 |
| 9 | **Clean up system group memberships** — `admin_exit_user_from_platform` should also remove membership from FringeIsland Members and any other system groups. | MEDIUM | Data integrity |
| 10 | **Expire pending invitations** — On exit, expire any `pending_email_invitations` where `invited_email` matches the exiting user, and transfer `invited_by_group_id` in L1 scenarios. | LOW | Data hygiene |
| 11 | **Freeze/cancel public journey enrollments** — Platform exit currently only freezes non-public enrollments. Public enrollments should also be frozen or cancelled. | LOW | Data hygiene |
| 12 | **Build consent store** — Track consent per user per purpose, with timestamps and withdrawal capability. | HIGH | GDPR Art. 7 |
| 13 | **Document GDPR exceptions** — Forum post preservation under Art. 17(3)(a) legitimate interest exception. Backup retention policy. | LOW | Compliance |
| 14 | **Add cool-down period** — 30-day grace before irreversible deletion, with reactivation option during the window. | MEDIUM | UX + best practice |
| 15 | **Notify user of exit** — Send email when account is decommissioned or deleted. | LOW | GDPR Art. 12(3) |

---

## Appendix: File Reference

| File | Role |
|------|------|
| `supabase/migrations/20260228144747_sprint4_platform_exit.sql` | `admin_exit_user_from_platform()` RPC |
| `supabase/migrations/20260228120745_sprint2_leave_group_core.sql` | `leave_group()` RPC (self-service per-group) |
| `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql` | `admin_hard_delete_user()`, `admin_decommission_user()`, `admin_update_user_status()` |
| `supabase/migrations/20260224205639_fix_hard_delete_leader_trigger_bypass.sql` | Hard delete trigger bypass fixes |
| `supabase/migrations/20260227120843_seed_deleted_user_sentinel_group.sql` | `[Deleted User]` sentinel group |
| `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` | All core table definitions (users, groups, forum_posts, direct_messages, conversations, notifications) |
| `supabase/migrations/20260223140126_enhanced_member_invitations.sql` | `pending_email_invitations` table |
| `app/admin/page.tsx` | Admin UI — exit_platform, delete_soft, delete_hard handlers |
| `components/admin/UserActionBar.tsx` | Action bar with Exit Platform button |
| `lib/admin/action-bar-logic.ts` | Action state logic (disabled/enabled rules) |
| `app/profile/page.tsx`, `app/profile/edit/page.tsx` | User profile pages (NO exit/delete functionality) |
| `docs/old_products/ferd/development/features/FR-platform-exit.md` | Feature doc |
| `docs/old_products/ferd/development/specs/platform-exit.md` | Behavior specs (B-EXIT-001 through B-EXIT-004) |
| `docs/old_universe/decisions/ADR-U021-forum-anonymisation-soft-flag.md` | Forum post display-logic decision |
| `docs/verticals/privacy.md` | Privacy vertical scaffold (Phase 3) |
