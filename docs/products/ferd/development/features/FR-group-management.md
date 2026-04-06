# Group Management System

**Status:** IMPLEMENTED
**Date:** January 24, 2026
**Completed:** February 28, 2026
**Version:** v0.2.35
**Phase:** 1.3 (Group Management) + post-D15 (RBAC, admin lifecycle, leave-group, stewardship nomination)
**Related:** [Authentication](./FR-authentication.md) | [Display Name System](./FR-display-name-system.md) | [Dynamic Permissions System](./AR-dynamic-permissions-system.md) | [Leave Group Core](./FR-leave-group-core.md) | [Foundation Schema](./AR-foundation-schema.md)

---

## Context

FringeIsland uses a **Universal Group Pattern** (D15) where every actor in the system is a group. Users interact through their personal group, and all relationships are group-to-group. This eliminates the traditional `user_id` FK pattern — memberships, role assignments, and content authorship all reference `member_group_id` (a personal group's UUID) instead of a user UUID.

There are **three group types**:
- **Personal** — one per user, created at signup by `handle_new_user()`, is the user's identity anchor. `is_public = false`, `show_member_list = false`.
- **System** — platform infrastructure groups (DeusEx admin group, FringeIsland Members, [Deleted User] sentinel). Created by migrations, not by users.
- **Engagement** — user-created groups for collaboration (teams, cohorts, guilds). Created via the GroupCreateForm UI.

The **groups-as-members** design means a personal group joins an engagement group as a member. This architecture supports future group-joins-group scenarios (e.g., a team joining an organization) without schema changes.

**RBAC** replaces the old `isLeader` boolean pattern. Permission checks use `has_permission(acting_group_id, context_group_id, permission_name)` — a two-tier function that checks system group permissions (Tier 1) and then context group permissions (Tier 2). The frontend `usePermissions` hook exposes `hasPermission()` for UI gating.

---

## Feature Summary

1. **Three group types** — personal (identity), system (infrastructure), engagement (user-created) — with `group_type` CHECK constraint
2. **Group creation** from templates via GroupCreateForm — 7-step client-side flow (template selection, group insert, self-membership, role template lookup, Steward + Member role creation, role assignment)
3. **Visibility** — `is_public` for discoverability; `show_member_list` for member list visibility; RLS enforces that private groups are invisible to non-members
4. **Invitations (existing users)** — Stewards search by email/name via typeahead, create `group_memberships` with `status = 'invited'`
5. **Invitations (pending email)** — when the invitee has no account yet, a `pending_email_invitations` record is created; claimed automatically by `handle_new_user()` at signup
6. **Invitation lifecycle** — `invited` → `active` (accept), or DELETE (decline/revoke). Accepting auto-assigns the Member role via trigger. Notifications sent to Stewards on accept/decline.
7. **Role management** — four roles from templates: Steward, Guide (future), Member, Observer (future). Roles are group-scoped instances of role templates. Multiple roles per member supported.
8. **Last Steward protection** — `prevent_last_leader_removal()` trigger blocks deleting the last Steward role assignment from any group. UI hides the remove button when only one Steward remains.
9. **RBAC** — 31 permissions, `has_permission()` two-tier check, `can_assign_role()` anti-escalation, `usePermissions` hook. Replaces all `isLeader` boolean checks.
10. **Group editing** — Stewards (users with `edit_group_settings` permission) can edit name, description, label, visibility settings via `/groups/[id]/edit`
11. **Danger Zone / group deletion** — users with `delete_group` permission can permanently delete a group. CASCADE removes memberships, roles, enrollments. RESTRICT on `journeys.created_by_group_id` blocks deletion if group has created journeys. Notification trigger alerts all active members.
12. **Notification triggers** — database triggers fire on: invitation received, invitation accepted, invitation declined, member left, member removed, role assigned, role removed, group deleted
13. **Leave-group** — `leave_group(p_group_id)` SECURITY DEFINER RPC handles three scenarios: regular member leave (L1), sole Steward -> DeusEx handover (L2), group closure on last member leave (L3). Non-public journey enrollments frozen, pending invitations transferred. (Sprint 2, v0.2.34). See [leave-group-core.md](./FR-leave-group-core.md).
14. **Group lifecycle** — `groups.status` column with CHECK constraint (`active`, `closed`, `archived`, `suspended`). Non-active groups hidden from non-admin users via RLS. (Sprint 1, v0.2.33). See [foundation-schema.md](./AR-foundation-schema.md).
15. **Stewardship nomination (Track 1)** — `nominate_steward()` RPC allows sole Steward to nominate ranked successors. Smart notification with Accept/Decline, 7-day expiry, sequential nominees, DeusEx fallback. (Sprint 3, v0.2.35). See [smart-notifications.md](./AR-smart-notifications.md).
16. **Platform exit** — `admin_exit_user_from_platform()` SECURITY DEFINER RPC cascades leave across all engagement groups (L1/L2/L3 per group), decommissions user, force-logs-out. L4 nomination explicitly skipped for admin exit. (Sprint 4, v0.2.36). See [platform-exit.md](./FR-platform-exit.md).
17. **Known gaps** — no group-joins-group UI, no personal/system group protection in Danger Zone, no self-service platform exit

---

## Data Model

### `groups` table

| Column | Type | Default | Nullable | Purpose |
|--------|------|---------|----------|---------|
| `id` | UUID | `gen_random_uuid()` | No | Primary key |
| `name` | TEXT | — | No | Display name. For personal groups, synced from user's display preference. |
| `description` | TEXT | — | Yes | Group description |
| `label` | TEXT | — | Yes | Optional categorization label |
| `created_by_group_id` | UUID | — | Yes | FK to `groups(id)` ON DELETE SET NULL. The personal group of the creator. |
| `created_from_group_template_id` | UUID | — | Yes | FK to `group_templates(id)` ON DELETE SET NULL. Template used at creation. |
| `group_type` | TEXT | `'engagement'` | No | CHECK `('system', 'personal', 'engagement')` |
| `is_public` | BOOLEAN | `false` | No | Whether the group is discoverable by non-members |
| `show_member_list` | BOOLEAN | `true` | No | Whether the member list is visible to members |
| `avatar_url` | TEXT | — | Yes | Group avatar (for personal groups, copied from user's avatar) |
| `status` | TEXT | `'active'` | No | CHECK `('active', 'closed', 'archived', 'suspended')`. Lifecycle state. `'closed'` = last member left. Non-active groups hidden from non-admin users via RLS. (Sprint 1, v0.2.33) |
| `settings` | JSONB | `'{}'` | No | Extensible settings (future use) |
| `created_at` | TIMESTAMPTZ | `NOW()` | No | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | No | Auto-updated by `set_groups_updated_at` trigger |

### `group_memberships` table

| Column | Type | Default | Nullable | Purpose |
|--------|------|---------|----------|---------|
| `id` | UUID | `gen_random_uuid()` | No | Primary key |
| `group_id` | UUID | — | No | FK to `groups(id)` ON DELETE CASCADE. The group being joined. |
| `member_group_id` | UUID | — | No | FK to `groups(id)` ON DELETE CASCADE. The personal group of the joining member. |
| `added_by_group_id` | UUID | — | Yes | FK to `groups(id)` ON DELETE SET NULL. The personal group of whoever invited/added. |
| `status` | TEXT | `'active'` | No | CHECK `('active', 'invited', 'paused', 'removed')` |
| `added_at` | TIMESTAMPTZ | `NOW()` | No | When the membership was created |
| `status_changed_at` | TIMESTAMPTZ | `NOW()` | No | When the status last changed |

**Constraint:** `UNIQUE(group_id, member_group_id)` — a member can only appear once in a group.

### `user_group_roles` table

Assigns roles to members within a group context. `UNIQUE(member_group_id, group_id, group_role_id)` — a member can hold each role only once per group. Full schema: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

### `group_roles` table

Group-scoped role instances cloned from role templates (Steward, Guide, Member, Observer). `UNIQUE(group_id, name)`. Full schema: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

### `pending_email_invitations` table

| Column | Type | Default | Nullable | Purpose |
|--------|------|---------|----------|---------|
| `id` | UUID | `gen_random_uuid()` | No | Primary key |
| `group_id` | UUID | — | No | FK to `groups(id)` ON DELETE CASCADE. The group being invited to. |
| `invited_email` | TEXT | — | No | The email address of the invitee |
| `invited_by_group_id` | UUID | — | Yes | FK to `groups(id)` ON DELETE SET NULL. Who sent the invitation. |
| `token` | UUID | `gen_random_uuid()` | No | Invitation token for future email link support (no UNIQUE constraint — collision-free by UUID nature) |
| `status` | TEXT | `'pending'` | No | CHECK `('pending', 'claimed', 'expired')` |
| `created_at` | TIMESTAMPTZ | `NOW()` | No | When the invitation was created |
| `expires_at` | TIMESTAMPTZ | `NOW() + 30 days` | No | Expiration timestamp |
| `claimed_at` | TIMESTAMPTZ | — | Yes | When the invitation was claimed (user signed up) |

**Constraint:** `UNIQUE(group_id, invited_email)` — one pending invitation per email per group.

### `role_templates` table (seed data)

Four system templates: Steward, Guide, Member, Observer. Permissions are auto-copied to group role instances via `copy_template_permissions` trigger. Full details: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

---

## Core Mechanisms

### Group creation: 7-step `GroupCreateForm` flow

The client-side creation flow in `components/groups/GroupCreateForm.tsx`:

```typescript
// Step 1: INSERT group (created_by_group_id = userProfile.personal_group_id)
const { data: groupData } = await supabase.from('groups').insert({
  name, description, label, created_by_group_id: userId,
  created_from_group_template_id: selectedTemplate, is_public, show_member_list,
}).select().single();

// Step 2: INSERT self-membership (member_group_id = personal_group_id, status = 'active')
await supabase.from('group_memberships').insert({
  group_id: groupData.id, member_group_id: userId,
  added_by_group_id: userId, status: 'active',
});

// Step 3: Fetch role templates (Steward + Member)
const { data: roleTemplates } = await supabase.from('role_templates')
  .select('id, name').in('name', ['Steward Role Template', 'Member Role Template']);

// Step 4: CREATE Steward role instance (permissions auto-copied by copy_template_permissions trigger)
const { data: stewardRole } = await supabase.from('group_roles').insert({
  group_id: groupData.id, name: 'Steward', created_from_role_template_id: stewardTemplate.id,
}).select('id').single();

// Step 5: CREATE Member role instance
const { data: memberRole } = await supabase.from('group_roles').insert({
  group_id: groupData.id, name: 'Member', created_from_role_template_id: memberTemplate.id,
}).select('id').single();

// Step 6: Assign creator both Steward and Member roles
await supabase.from('user_group_roles').insert([
  { member_group_id: userId, group_id: groupData.id, group_role_id: stewardRole.id, assigned_by_group_id: userId },
  { member_group_id: userId, group_id: groupData.id, group_role_id: memberRole.id, assigned_by_group_id: userId },
]);

// Step 7: Redirect to /groups
```

**RLS bootstrap:** The `memberships_insert_bootstrap` and `ugr_insert_assign` (bootstrap branch) policies allow the group creator to self-add before any Steward exists, using `is_group_creator()` and `NOT group_has_leader()` checks.

### Invitation flow

**Path A: Existing user (typeahead search)**

1. Steward opens InviteMemberModal, searches by email or display name
2. Typeahead queries `users` table (RLS: `users_select_active`)
3. Steward clicks "Invite" → INSERT into `group_memberships` with `status = 'invited'`, `added_by_group_id = personal_group_id`
4. `notify_invitation_received` trigger fires → creates notification for the invitee
5. Invitee sees invitation on `/invitations` page

**Path B: Non-existent user (pending email)**

1. Steward enters an email that doesn't match any existing user
2. INSERT into `pending_email_invitations` with `status = 'pending'`, `expires_at = NOW() + 30 days`
3. When the invitee signs up, `handle_new_user()` Step 8 claims all matching pending invitations → creates `group_memberships` with `status = 'invited'` + marks pending invitation as `'claimed'`
4. Flow continues as Path A from step 4

### Invitation acceptance

```typescript
// Accept: UPDATE status from 'invited' to 'active'
await supabase.from('group_memberships')
  .update({ status: 'active' })
  .eq('id', membershipId);
```

The `auto_assign_member_role_on_accept` AFTER UPDATE trigger fires when `OLD.status = 'invited' AND NEW.status = 'active'`:

```sql
-- Trigger: auto_assign_member_role_on_accept()
SELECT id INTO v_member_role_id FROM public.group_roles
  WHERE group_id = NEW.group_id AND name = 'Member' LIMIT 1;

INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  VALUES (NEW.member_group_id, NEW.group_id, v_member_role_id, NEW.member_group_id)
  ON CONFLICT DO NOTHING;
```

The `notify_invitation_accepted` trigger notifies all Stewards of the group.

### RBAC: `has_permission()` two-tier check

Core permission function: checks system group permissions (Tier 1, context-free) then context group permissions (Tier 2, group-scoped). Used by RLS policies and the frontend `usePermissions` hook (`lib/hooks/usePermissions.ts`). Full implementation: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

### Anti-escalation: `can_assign_role()`

Prevents assigning a role that grants permissions the assigner doesn't hold. Combines `has_permission('assign_roles')` with a subquery check. Full implementation: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

### Last Steward protection

**Trigger:** `prevent_last_leader_removal()` — BEFORE DELETE on `user_group_roles`

```sql
-- Skip during hard-delete cascade (session variable bypass)
IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN RETURN OLD; END IF;

-- Skip if group is closed (Sprint 2 — allows role cleanup during group closure)
SELECT status INTO v_group_status FROM public.groups WHERE id = OLD.group_id;
IF v_group_status = 'closed' THEN RETURN OLD; END IF;

-- If parent group is gone (CASCADE), allow deletion
IF NOT EXISTS (SELECT 1 FROM groups WHERE id = OLD.group_id) THEN RETURN OLD; END IF;

-- Check if the role being removed is a Steward role (by template or name)
-- Count remaining Steward role holders (excluding the one being removed)
-- If count = 0: RAISE EXCEPTION 'Cannot remove the last Steward from the group.'
```

**UI gate:** The AssignRoleModal counts Stewards and disables the Steward checkbox if removing it would leave zero Stewards.

### Group deletion / Danger Zone

The edit page (`app/groups/[id]/edit/page.tsx`) shows a Danger Zone section when `hasPermission('delete_group')` is true:

```typescript
const handleDelete = async () => {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
  router.push('/groups');
};
```

**CASCADE table** (data deleted when a group is deleted):

| Table | FK Column | ON DELETE |
|-------|-----------|-----------|
| `group_memberships` | `group_id` | CASCADE |
| `user_group_roles` | `group_id` | CASCADE |
| `group_roles` | `group_id` | CASCADE |
| `journey_enrollments` | `group_id` | CASCADE |
| `notifications` | `recipient_group_id` | CASCADE |
| `notifications` | `group_id` (context) | SET NULL |
| `forum_posts` | `group_id` | CASCADE |

**RESTRICT blockers:**
- `journeys.created_by_group_id` ON DELETE RESTRICT — if the group has created any journeys, deletion fails with a FK violation. Currently unhandled in the UI.
- `forum_posts.author_group_id` ON DELETE RESTRICT — if a personal group has authored forum posts, that personal group cannot be deleted (on hard-delete, posts are reassigned to `[Deleted User]` sentinel first). See [Group Forum System](./FR-group-forum-system.md).

**Notification trigger:** `notify_group_deleted()` fires BEFORE DELETE on `groups`, notifying all active members (except the deleter) before the CASCADE removes membership records.

---

## RBAC Functions

The group management system uses 13 SECURITY DEFINER functions for RBAC, lifecycle, and bootstrap operations. Key functions used by this feature:

- **`has_permission()`** — core two-tier RBAC check. See [Dynamic Permissions System](./AR-dynamic-permissions-system.md).
- **`can_assign_role()`** — anti-escalation check. See [Dynamic Permissions System](./AR-dynamic-permissions-system.md).
- **`leave_group()`** — L1/L2/L3 leave scenarios. See [Leave Group Core](./FR-leave-group-core.md).
- **`nominate_steward()` / `handle_notification_action()`** — Track 1 stewardship nomination. See [Smart Notifications](./AR-smart-notifications.md).

Helper functions (`get_current_personal_group_id`, `is_platform_admin`, `is_active_group_member`, `is_group_creator`, `group_has_leader`, etc.) are documented in [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

---

## RLS Policies

### `groups` table (4 policies — as of final `fix_personal_group_rls_visibility` migration)

```sql
-- SELECT: Personal groups visible to all (identity containers), public groups,
-- member groups, invited groups, creator's groups, platform admins
CREATE POLICY "groups_select"
  ON public.groups FOR SELECT TO authenticated
  USING (
    group_type = 'personal'
    OR is_public = true
    OR public.is_active_group_member(id)
    OR public.is_invited_group_member(id)
    OR created_by_group_id = public.get_current_personal_group_id()
    OR public.is_platform_admin()
  );

-- INSERT: Creator must be the current user's personal group
CREATE POLICY "groups_insert"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (created_by_group_id = public.get_current_personal_group_id());

-- UPDATE: Requires edit_group_settings permission in the group
CREATE POLICY "groups_update"
  ON public.groups FOR UPDATE TO authenticated
  USING (public.has_permission(public.get_current_personal_group_id(), id, 'edit_group_settings'))
  WITH CHECK (public.has_permission(public.get_current_personal_group_id(), id, 'edit_group_settings'));

-- DELETE: Requires delete_group permission in the group
CREATE POLICY "groups_delete"
  ON public.groups FOR DELETE TO authenticated
  USING (public.has_permission(public.get_current_personal_group_id(), id, 'delete_group'));
```

### `group_memberships` table (8 policies)

```sql
-- SELECT: Active members of the group, or viewing own memberships, or platform admin
CREATE POLICY "memberships_select"
  ON public.group_memberships FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR member_group_id = public.get_current_personal_group_id()
    OR public.is_platform_admin()
  );

-- INSERT (invite): Requires invite_members permission, status must be 'invited'
CREATE POLICY "memberships_insert_invite"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    status = 'invited'
    AND added_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(public.get_current_personal_group_id(), group_id, 'invite_members')
  );

-- INSERT (bootstrap): Creator self-adds during group creation
CREATE POLICY "memberships_insert_bootstrap"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    member_group_id = public.get_current_personal_group_id()
    AND added_by_group_id = public.get_current_personal_group_id()
    AND status = 'active'
    AND public.is_group_creator(group_id)
  );

-- INSERT (admin): Platform admin can add memberships
CREATE POLICY "gm_insert_admin"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    AND added_by_group_id = public.get_current_personal_group_id()
  );

-- UPDATE (accept): Invitee can accept their own invitation (invited → active)
CREATE POLICY "memberships_update_accept"
  ON public.group_memberships FOR UPDATE TO authenticated
  USING (member_group_id = public.get_current_personal_group_id() AND status = 'invited')
  WITH CHECK (status = 'active');

-- DELETE (leave): Members can delete their own membership
CREATE POLICY "memberships_delete_leave"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (member_group_id = public.get_current_personal_group_id());

-- DELETE (remove): Steward can remove active members
CREATE POLICY "memberships_delete_remove"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (
    public.has_permission(public.get_current_personal_group_id(), group_id, 'remove_members')
    AND status = 'active'
  );

-- DELETE (admin): Platform admin can remove any membership
CREATE POLICY "gm_delete_admin"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (public.is_platform_admin());
```

### `user_group_roles` table (5 policies)

SELECT (active members/own/admin), INSERT (assign with anti-escalation + bootstrap), INSERT (admin), DELETE (assign_roles permission), DELETE (admin). Full policy definitions: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

### `group_roles` table (5 policies)

SELECT (active/invited members + admin), INSERT (manage_roles + bootstrap), UPDATE (manage_roles), DELETE (manage_roles, custom roles only). Full policy definitions: see [Dynamic Permissions System](./AR-dynamic-permissions-system.md).

### `pending_email_invitations` table (3 policies)

```sql
-- SELECT: Users with invite_members permission in the group
CREATE POLICY "pending_invitations_select"
  ON public.pending_email_invitations FOR SELECT TO authenticated
  USING (public.has_permission(public.get_current_personal_group_id(), group_id, 'invite_members'));

-- INSERT: Users with invite_members permission, must be the inviter
CREATE POLICY "pending_invitations_insert"
  ON public.pending_email_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(public.get_current_personal_group_id(), group_id, 'invite_members')
  );

-- DELETE: Users with invite_members permission can cancel invitations
CREATE POLICY "pending_invitations_delete"
  ON public.pending_email_invitations FOR DELETE TO authenticated
  USING (public.has_permission(public.get_current_personal_group_id(), group_id, 'invite_members'));
```

---

## Trigger Inventory

### `groups` table

| Trigger | Timing | Event | Function | Purpose |
|---------|--------|-------|----------|---------|
| `set_groups_updated_at` | BEFORE UPDATE | UPDATE | `update_updated_at_column()` | Auto-sets `updated_at = NOW()` |
| `notify_group_deleted` | BEFORE DELETE | DELETE | `notify_group_deleted()` | Notifies active members before CASCADE deletes memberships |

### `group_memberships` table

| Trigger | Timing | Event | Function | Purpose |
|---------|--------|-------|----------|---------|
| `notify_invitation_received` | AFTER INSERT | INSERT | `notify_invitation_received()` | Notifies invitee when invitation is created |
| `assign_member_role_on_accept` | AFTER UPDATE | UPDATE (invited → active) | `auto_assign_member_role_on_accept()` | Auto-assigns Member role when invitation accepted |
| `auto_assign_deusex_role` | AFTER UPDATE | UPDATE | `auto_assign_deusex_role_on_accept()` | Auto-assigns DeusEx role when DeusEx invitation accepted |
| `notify_invitation_accepted` | AFTER UPDATE | UPDATE | `notify_invitation_accepted()` | Notifies Stewards when invitation accepted |
| `notify_invitation_declined_or_member_change` | AFTER DELETE | DELETE | `notify_invitation_declined_or_member_change()` | Notifies Stewards on decline; notifies Stewards on leave; notifies removed member |
| `check_last_deusex_membership_removal` | BEFORE DELETE | DELETE | `prevent_last_deusex_membership_removal()` | Blocks removing last DeusEx member |
| `trg_audit_admin_membership_change` | AFTER INSERT OR DELETE | INSERT, DELETE | `audit_admin_membership_change()` | Writes admin audit log for admin-initiated membership changes |

### `user_group_roles` table

| Trigger | Timing | Event | Function | Purpose |
|---------|--------|-------|----------|---------|
| `validate_user_group_role` | BEFORE INSERT | INSERT | `validate_user_group_role()` | Ensures role belongs to the correct group |
| `check_last_leader_removal` | BEFORE DELETE | DELETE | `prevent_last_leader_removal()` | Blocks removing last Steward role (with hard-delete bypass) |
| `check_last_deusex_role_removal` | BEFORE DELETE | DELETE | `prevent_last_deusex_role_removal()` | Blocks removing last DeusEx role (with hard-delete bypass) |
| `notify_role_assigned` | AFTER INSERT | INSERT | `notify_role_assigned()` | Notifies member when role is assigned |
| `notify_role_removed` | AFTER DELETE | DELETE | `notify_role_removed()` | Notifies member when role is removed (skip on CASCADE) |

### `group_roles` table

| Trigger | Timing | Event | Function | Purpose |
|---------|--------|-------|----------|---------|
| `copy_template_permissions` | AFTER INSERT | INSERT | `copy_template_permissions_on_role_create()` | Copies permissions from role template to new group role instance |

---

## Affected Surfaces

| Surface | File Path | Key Permissions |
|---------|-----------|-----------------|
| Group list | `app/groups/page.tsx` | — (RLS handles visibility) |
| Group detail | `app/groups/[id]/page.tsx` | `view_member_list`, `invite_members`, `assign_roles` |
| Group creation | `app/groups/create/page.tsx` + `components/groups/GroupCreateForm.tsx` | — (any authenticated user) |
| Group editing | `app/groups/[id]/edit/page.tsx` | `edit_group_settings`, `delete_group` |
| Invite modal | `components/groups/InviteMemberModal.tsx` | `invite_members` |
| Assign role modal | `components/groups/AssignRoleModal.tsx` | `assign_roles` |
| Invitations page | `app/invitations/page.tsx` | — (own invitations only) |
| Navigation | `components/ui/Navigation.tsx` | — (invitation count badge) |

---

## Behaviors & Testing

### Behavior Specs

- `docs/products/ferd/development/specs/groups.md` — Group creation, visibility, editing, deletion, leave-group behaviors (B-GRP-008, B-GRP-009, B-GRP-010), stewardship nomination (B-GRP-011)
- `docs/products/ferd/development/specs/invitations.md` — Invitation lifecycle behaviors
- `docs/products/ferd/development/specs/roles.md` — Role assignment and management behaviors
- `docs/products/ferd/development/specs/rbac.md` — RBAC permission resolution behaviors
- `docs/products/ferd/development/specs/d15-hardening.md` — D15-specific edge cases and hardening
- `docs/products/ferd/development/specs/admin.md` — Admin group management behaviors

### Integration Tests

- `tests/integration/groups/last-leader.test.ts` — Last Steward protection trigger
- `tests/integration/groups/edit-permissions.test.ts` — Group editing permission checks
- `tests/integration/groups/invitations.test.ts` — Invitation lifecycle (invite, accept, decline)
- `tests/integration/groups/pending-invitations.test.ts` — Pending email invitation flow
- `tests/integration/groups/role-assignment.test.ts` — Role assignment and removal
- `tests/integration/groups/deletion.test.ts` — Group deletion + CASCADE + RESTRICT
- `tests/integration/groups/user-search.test.ts` — User search for invitations
- `tests/integration/rls/groups.test.ts` — Groups table RLS policies
- `tests/integration/rbac/role-permissions.test.ts` — Role-permission resolution
- `tests/integration/rbac/role-management.test.ts` — Role CRUD operations
- `tests/integration/rbac/permission-resolution.test.ts` — has_permission() two-tier check
- `tests/integration/rbac/ui-permission-gating.test.ts` — UI permission gating
- `tests/integration/rbac/personal-groups.test.ts` — Personal group invariants
- `tests/integration/rbac/d15-hardening.test.ts` — Bootstrap policies, anti-escalation
- `tests/integration/communication/notifications.test.ts` — Notification triggers
- `tests/integration/groups/leave-group.test.ts` — Leave group (L1 regular, L2 DeusEx handover, L3 group closure) — 17 tests
- `tests/integration/groups/stewardship-nomination.test.ts` — Stewardship nomination Track 1 (B-GRP-011) — 8 tests

---

## Known Limitations

1. **No personal/system group protection in Danger Zone** — the edit page does not check `group_type` before showing the delete button. Personal and system groups could theoretically be deleted from the UI if the user has `delete_group` permission.
2. **RESTRICT FK blocker unhandled** — if a group has created journeys (`journeys.created_by_group_id`), deletion fails with a FK violation. The UI shows the raw error instead of a user-friendly message.
3. **No group-joins-group UI** — the schema supports groups as members of other groups via `member_group_id`, but no UI exists for this workflow.
4. **Danger Zone uses local modal, not ConfirmModal** — the delete confirmation is a locally-defined modal in the edit page, not the shared `ConfirmModal` component.
5. **Group creation is client-side multi-step** — the 7-step creation flow is not transactional; a failure at step 5 leaves a group with memberships but no roles. A server-side RPC would be more robust.
6. **No Leave Group UI** — the `leave_group()` RPC exists but no frontend button, confirmation modal, or handover dialog has been built yet.
7. **Forum "Former Member" display** — the query-time membership check needs to be implemented in the `ForumSection` component. Currently, ex-member posts still show the author's display name.

---

## Out of Scope

- **Group-joins-group UI** — schema supports it, but no frontend implementation
- **Custom role creation UI** — roles are currently created from templates only; no UI for defining new role types
- **Member pausing** — `status = 'paused'` is in the CHECK constraint but unused
- **Bulk invitations** — one invitation at a time
- **Invitation expiry enforcement** — `expires_at` is stored but not checked in the UI (only checked in the signup trigger)
- **Group transfer** — no ability to transfer group ownership (created_by_group_id)
- **Self-service platform exit** — admin-assisted is implemented (v0.2.36); self-service remains deferred
- **Group archive/suspend UI** — `groups.status` supports `'archived'` and `'suspended'` values, but no admin UI exists to set them

---

## Related Documentation

- **Authentication:** `docs/products/ferd/development/features/FR-authentication.md`
- **Display name system:** `docs/products/ferd/development/features/FR-display-name-system.md`
- **RBAC design:** `docs/products/ferd/development/features/AR-dynamic-permissions-system.md`
- **Leave Group Core:** `docs/products/ferd/development/features/FR-leave-group-core.md`
- **Smart Notifications:** `docs/products/ferd/development/features/AR-smart-notifications.md`
- **Platform Exit:** `docs/products/ferd/development/features/FR-platform-exit.md`
- **Foundation Schema:** `docs/products/ferd/development/features/AR-foundation-schema.md`
- **Leave Group Review (archived):** `docs/archive/leave_group_feature_review.md`
- **Behavior specs:** `docs/products/ferd/development/specs/groups.md`, `docs/products/ferd/development/specs/invitations.md`, `docs/products/ferd/development/specs/rbac.md`
- **D15 base migration:** `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql`
- **RC7 admin fixes:** `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql`
- **Pending email invitations:** `supabase/migrations/20260223140126_enhanced_member_invitations.sql`
- **Hard-delete trigger bypass:** `supabase/migrations/20260224205639_fix_hard_delete_leader_trigger_bypass.sql`
- **Personal group RLS fix:** `supabase/migrations/20260227110556_fix_personal_group_rls_visibility.sql`
- **Foundation schema migration:** `supabase/migrations/20260228110815_sprint1_foundation_schema.sql`
- **Leave group migration:** `supabase/migrations/20260228120745_sprint2_leave_group_core.sql`
- **Smart notifications migration:** `supabase/migrations/20260228125730_sprint3_smart_notifications.sql`
- **Platform exit migration:** `supabase/migrations/20260228144747_sprint4_platform_exit.sql`

---

## Version History

- **v0.2.36** (2026-02-28): Sprint 4 — Platform Exit. `admin_exit_user_from_platform()` RPC cascades L1/L2/L3 across all engagement groups, decommissions user, force-logs-out. L4 nomination skipped for admin exit. 10 new tests. B-EXIT-001 through B-EXIT-004. See [platform-exit.md](./FR-platform-exit.md).
- **v0.2.35** (2026-02-28): Sprint 3 — Smart Notifications + Stewardship Nomination. `nominate_steward()` RPC for Track 1, `handle_notification_action()` for smart notification responses. Accept/Decline UI in NotificationBell. 8 new stewardship tests. B-GRP-011.
- **v0.2.34** (2026-02-28): Sprint 2 — Leave Group Core. `leave_group()` RPC handles L1 (regular leave), L2 (sole Steward -> DeusEx handover), L3 (group closure). `prevent_last_leader_removal` trigger updated with closed-group bypass. 17 new tests. B-GRP-008, B-GRP-009, B-GRP-010.
- **v0.2.33** (2026-02-28): Sprint 1 — Foundation Schema. `groups.status` column (active/closed/archived/suspended), partial index, RLS policy updates. "FringeIsland Journeys" engagement group created, 8 predefined journeys migrated. 19 new tests.
- **v0.2.32** (2026-02-28): Sprint 0 — Security Fixes. Non-public journey RLS, enrollment enrollability checks, frozen enrollment enforcement.
- **v0.2.31** (2026-02-27): Display name system — personal group `name` is now the display name source of truth. `groups_select` policy updated to make personal groups visible to all authenticated users (`group_type = 'personal'`). [Deleted User] sentinel group seeded.
- **v0.2.24** (2026-02-24): Hard-delete trigger bypass — `prevent_last_leader_removal()` and `prevent_last_deusex_role_removal()` skip during `app.hard_delete_in_progress`.
- **v0.2.23** (2026-02-23): RC7 admin fixes — `is_platform_admin()`, admin RLS overrides on memberships/roles/groups. Notification triggers updated with hard-delete cascade guards. Enhanced member invitations — `pending_email_invitations` table, `handle_new_user()` Step 8 (claim pending invitations).
- **v0.2.22** (2026-02-22): D15 Universal Group Pattern — complete schema rebuild. `member_group_id` replaces `user_id`. `created_by_group_id` replaces `created_by_user_id`. RBAC with `has_permission()`, `can_assign_role()`, `usePermissions` hook. Steward/Guide/Member/Observer role templates. Notification triggers. Group deletion with CASCADE + Danger Zone UI.
- **v0.2.7** (2026-01-26): Group editing page + invite modal integration.
- **v0.2.6.2** (2026-01-26): Role assignment UI with last leader protection.
- **v0.2.5** (2026-01-26): Member invitations and management.
- **v0.2.4** (2026-01-25): Group detail page.
- **v0.2.3** (2026-01-25): Group creation.
- **v0.1.2** (2026-01-24): Initial schema and RLS policies.
