# FringeIsland Group/Membership/Role/Permission Model -- Current State

**Date:** 2026-04-09
**Source:** ADRs (U006, U007, U018, U020), behavior specs (groups.md, roles.md, rbac.md), feature docs (FR-group-management, AR-dynamic-permissions-system, AR-d15-universal-group-pattern-migration), domain entities, and 19 migration files.

---

## 1. Group Types

### Schema Implementation

The `groups` table has a `group_type` column with a CHECK constraint:

```sql
group_type TEXT NOT NULL DEFAULT 'engagement'
  CHECK (group_type IN ('system', 'personal', 'engagement'))
```

There are no hardcoded group types beyond this column (ADR-U018). The three values are a convention enforced by CHECK constraint, not an enum type.

### The Three Types

**Personal Groups** (`group_type = 'personal'`)
- One per user, auto-created by the `handle_new_user()` trigger on signup.
- The user's identity anchor in the RBAC system. When a user "joins" a group, their personal group joins.
- Always `is_public = false`, `show_member_list = false`.
- Has exactly one member: the user themselves (via `group_memberships`).
- Gets a "Myself" role (no permissions currently -- placeholder).
- Linked back to the user via `users.personal_group_id` FK.
- Named from the user's display name. `created_by_group_id` points to itself (circular bootstrap resolved in `handle_new_user()` Step 3).

**System Groups** (`group_type = 'system'`)
- Created by migrations, never by users.
- Three system groups exist in the database:
  - **FringeIsland Members** -- All authenticated users auto-join on signup. Has a "Member" group role with platform-wide permissions (create groups, browse catalog, enroll self, send messages). This is the Tier 1 "what the platform lets you do" group.
  - **DeusEx** -- Superuser group. Manually assigned. Has a "DeusEx" group role with ALL permissions. New permissions are auto-granted to DeusEx via the `auto_grant_permission_to_deusex()` trigger on the `permissions` table.
  - **[Deleted User]** -- Sentinel group. Content from hard-deleted users (forum posts, journeys, group ownership) is reassigned here. Created by migration `20260227120843`.

**Engagement Groups** (`group_type = 'engagement'`)
- User-created groups for collaboration (teams, cohorts, book circles, communities of practice, etc.).
- Created via the `GroupCreateForm` 7-step client-side flow.
- Default: `is_public = false`, `show_member_list = true`.
- `group_type` defaults to `'engagement'` and cannot be changed by regular users.
- Has a `status` column: CHECK `('active', 'closed', 'archived', 'suspended')`, default `'active'`. Non-active groups are hidden from non-admin users via RLS.

### Constraints on Each Type

| Constraint | Personal | System | Engagement |
|---|---|---|---|
| Created by | `handle_new_user()` trigger | Migrations only | Users via UI |
| One per user | Yes (`users.personal_group_id` FK) | N/A | No limit |
| Members allowed | Exactly 1 (the user) | Platform-managed | Unlimited |
| Deletable by users | No | No | Yes (Steward with `delete_group` permission) |
| `group_type` changeable | No | No | No |
| Visible to non-members | Always (RLS: `group_type = 'personal'`) | Via membership only | If `is_public = true`, or admin |

---

## 2. The Join Model

### How a User Joins a Group -- Data Flow

**Path A: Existing user invited by Steward**

1. Steward opens `InviteMemberModal`, searches by email/name via typeahead.
2. Steward clicks "Invite" -- INSERT into `group_memberships`:
   ```
   group_id = <target engagement group>
   member_group_id = <invitee's personal_group_id>
   added_by_group_id = <steward's personal_group_id>
   status = 'invited'
   ```
3. `notify_invitation_received` trigger fires, creating a notification.
4. Invitee sees invitation on `/invitations` page.
5. Invitee clicks "Accept" -- UPDATE `status` from `'invited'` to `'active'`.
6. `auto_assign_member_role_on_accept` AFTER UPDATE trigger fires:
   - Looks up the "Member" `group_role` in the target group.
   - INSERT into `user_group_roles` assigning that role.
7. `notify_invitation_accepted` trigger notifies all Stewards.

**Path B: Non-existent user (pending email invitation)**

1. Steward enters an email with no matching user.
2. INSERT into `pending_email_invitations` with `status = 'pending'`, `expires_at = NOW() + 30 days`.
3. When the invitee signs up, `handle_new_user()` Step 8 claims matching pending invitations: creates `group_memberships` with `status = 'invited'`, marks pending invitation as `'claimed'`.
4. Flow continues as Path A from step 3.

**Path C: Group creation (self-membership)**

1. Creator submits `GroupCreateForm`.
2. Step 1: INSERT into `groups`.
3. Step 2: INSERT into `group_memberships` with `member_group_id = personal_group_id`, `status = 'active'`.
4. Steps 3-6: Create Steward + Member roles from templates, assign both to creator.

### The `group_memberships` Table

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | Primary key |
| `group_id` | UUID NOT NULL FK `groups(id)` ON DELETE CASCADE | The group being joined |
| `member_group_id` | UUID NOT NULL FK `groups(id)` ON DELETE CASCADE | The joining group (always a group, usually a personal group) |
| `added_by_group_id` | UUID FK `groups(id)` ON DELETE SET NULL | Who invited/added (personal group of the inviter) |
| `status` | TEXT NOT NULL DEFAULT `'active'` | CHECK `('active', 'invited', 'paused', 'removed')` |
| `added_at` | TIMESTAMPTZ | When membership was created |
| `status_changed_at` | TIMESTAMPTZ | When status last changed |

**Key constraint:** `UNIQUE(group_id, member_group_id)` -- a member can only appear once in a group.

### Personal Group Joins Engagement Group (Groups-Join-Groups)

Yes, it is **always** Personal Group joining Engagement Group. There is no `user_id` column on `group_memberships`. The old `user_id` column was dropped in the D15 migration (v0.2.22). All memberships are group-to-group.

### `member_group_id` vs the Old `user_id` Pattern

Before D15, `group_memberships` had both `user_id` and `member_group_id` with a CHECK constraint (exactly one set). The D15 migration:
- Created personal groups for all existing users.
- Converted all `user_id` memberships to `member_group_id` (pointing to the personal group).
- Dropped `user_id` entirely.
- Renamed across all tables: `user_id` -> `member_group_id`, `added_by_user_id` -> `added_by_group_id`, `assigned_by_user_id` -> `assigned_by_group_id`, `created_by_user_id` -> `created_by_group_id`.

To resolve "which human user?" from a `member_group_id`, you join: `group_memberships.member_group_id` -> `users.personal_group_id`.

---

## 3. Group-in-Group (Groups Join Groups)

### Design vs. Implementation Status

**Designed (ADR-U006, D4, D7, D10, D11, D12):**
- Any group can join any other group. An engagement group joins another engagement group using the same `group_memberships` mechanism as a personal group joining.
- Membership is fully transitive with no depth limit (D10).
- Circular membership prevented by a recursive CTE check on INSERT (D11).
- Multiple-path permissions resolved as union (D12).
- Attribution chains: "Mogwai in 'Alpha' in 'Beta'" for nested group access.

**Built in schema:**
- The `group_memberships.member_group_id` FK points to `groups(id)` with no constraint limiting it to personal groups only. An engagement group's UUID can be inserted as `member_group_id`. The schema **supports** group-in-group.

**NOT built:**
- **D11 circularity prevention trigger** -- Designed as a BEFORE INSERT trigger on `group_memberships` that walks the membership chain upward via recursive CTE. **Does not exist in any migration.** There is no protection against circular membership today.
- **No UI for group-joins-group** -- The `InviteMemberModal` searches users, not groups. There is no "Add Group" flow in the frontend.
- **No transitive permission resolution** -- `has_permission()` only checks direct membership. It does NOT walk transitive chains. If Alpha is a member of Beta, and Stefan is a member of Alpha, `has_permission(stefan_pg, beta_id, 'some_perm')` returns FALSE unless Stefan also has a direct membership in Beta.
- **No `max_membership_depth` setting** (D10).
- **No attribution chain display** ("Mogwai in 'Alpha'").
- **No subgroup browsing UI**.

### What Can Actually Happen Today

At the **database level**, you can INSERT a row into `group_memberships` where `member_group_id` is an engagement group UUID. The schema allows it. However:

1. No UI exposes this capability.
2. `has_permission()` does not resolve transitive access -- the joining group's members get no permissions in the host group.
3. No circularity check prevents A joining B joining A.
4. The hardening tests (`tests/integration/rbac/groups-join-groups.test.ts` -- 4 tests, per the D15 hardening docs) tested engagement group as member + `has_permission()` with engagement group actor, but these test direct membership of the engagement group itself, not transitive access for the engagement group's members.

**Depth supported:** Schema has no depth limit. The `has_permission()` function only resolves depth 1 (direct membership). Transitive resolution is not implemented.

**Summary:** Group-in-group is schema-ready but functionally inert. The schema permits it; the permission system, UI, and safety mechanisms do not support it.

---

## 4. Roles and Permissions

### Tables Involved

| Table | Purpose |
|---|---|
| `permissions` | System catalog of 31 atomic permissions across 6 categories. Developer-managed via migrations. |
| `role_templates` | 4 system templates: Steward, Guide, Member, Observer. Starting points for group role creation. |
| `role_template_permissions` | Junction: which permissions each template grants by default. Populated with 57 rows (24+14+12+7). |
| `group_roles` | Group-scoped role instances. `UNIQUE(group_id, name)`. FK `created_from_role_template_id` -> `role_templates`. |
| `group_role_permissions` | Junction: which permissions each group role instance grants. `UNIQUE(group_role_id, permission_id)`. Copied from template on creation, then independently customizable. |
| `user_group_roles` | Assignment: which member holds which role in which group. `UNIQUE(member_group_id, group_id, group_role_id)`. |
| `group_templates` | Templates for group creation (e.g., "Small Team Template"). |
| `group_template_roles` | Junction: which role templates belong to which group template. |

### The 4 Role Templates

| Template | Permissions | Function |
|---|---|---|
| **Steward** | 24 | Long-term group care: membership, settings, structure, oversight. Can edit group settings, delete group, invite/remove members, assign/remove roles, enroll group in journeys. |
| **Guide** | 14 | Journey facilitation: content expertise, progress tracking, feedback. Can view/complete journey content, view others' progress, freeze journeys. |
| **Member** | 12 | Active participation: learning, completing activities, engaging. Can view/complete journey content, post in forums, provide/receive feedback. DEFAULT role for all joining groups. |
| **Observer** | 7 | Supportive follow-along: watching, feedback, extra perspective. Can view journey content, view forum, view progress, send DMs. Cannot post in forums or complete activities. |

Additionally, system groups have their own roles:
- **"Member"** role in FringeIsland Members group -- platform-wide capabilities.
- **"DeusEx"** role in DeusEx group -- ALL permissions.
- **"Myself"** role in personal groups -- currently has zero permissions (placeholder).

### How Roles Are Assigned

**At group creation:** The `GroupCreateForm` 7-step flow:
1. Creates the group.
2. Creates self-membership (`status = 'active'`).
3. Fetches Steward + Member role templates.
4. Creates "Steward" group role instance (triggers `copy_template_permissions_on_role_create` which copies 24 permissions).
5. Creates "Member" group role instance (triggers copy of 12 permissions).
6. Assigns creator both Steward and Member roles in `user_group_roles`.

**On invitation acceptance:** The `auto_assign_member_role_on_accept` AFTER UPDATE trigger assigns the "Member" role automatically when `status` changes from `'invited'` to `'active'`.

**Manual assignment:** Stewards can assign/remove roles via `AssignRoleModal` in the group detail page. RLS INSERT policy on `user_group_roles` requires `has_permission(..., 'assign_roles')` or bootstrap (creator self-assigning first role when no Steward exists).

**Auto-linking:** The `copy_template_permissions_on_role_create()` trigger (enhanced in migration `20260221222339`) auto-links group roles to templates by naming convention: role name "Steward" matches template "Steward Role Template". Permissions are copied on creation.

### How `has_permission()` Works

```sql
has_permission(p_acting_group_id UUID, p_context_group_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql, SECURITY DEFINER, STABLE
```

**Two-tier check:**

1. **Tier 1 (System groups):** Checks if the acting group has an active membership in any system group (`groups.group_type = 'system'`) that has a role granting the requested permission. Context-free -- applies everywhere. This is how DeusEx and FI Members permissions work.

2. **Tier 2 (Context group):** If Tier 1 didn't match, checks if the acting group has an active membership in the specific `p_context_group_id` with a role granting the requested permission. This is how engagement group permissions work.

**Resolution path:** `group_memberships` -> `user_group_roles` (same `member_group_id` + `group_id`) -> `group_role_permissions` -> `permissions`.

**Fails closed:** Returns FALSE on NULL inputs. Returns FALSE if no matching permission found.

**Does NOT resolve transitive membership.** Only checks direct membership in system groups (Tier 1) and the specific context group (Tier 2).

### How `is_platform_admin()` Works

```sql
is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql, SECURITY DEFINER, STABLE
```

Checks if the current user's personal group has an active membership in the DeusEx system group:

```sql
SELECT EXISTS (
  SELECT 1 FROM public.group_memberships gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.member_group_id = public.get_current_personal_group_id()
    AND g.name = 'DeusEx'
    AND g.group_type = 'system'
    AND gm.status = 'active'
);
```

**Why it exists separately from `has_permission()`:** PG17 has issues with complex PLPGSQL SECURITY DEFINER functions (`has_permission()`) when called from within RLS policy evaluation. `is_platform_admin()` is a simple SQL SECURITY DEFINER function that PG17 handles correctly in RLS contexts. All admin RLS policies use `is_platform_admin()` instead of `has_permission()`.

**Must be SECURITY DEFINER** to avoid circular RLS dependency: it queries `group_memberships`/`groups`, whose SELECT policies also call `is_platform_admin()`.

### Anti-Escalation: `can_assign_role()`

```sql
can_assign_role(p_acting_group_id, p_group_id, p_group_role_id)
```

Returns TRUE only if:
1. The actor has `assign_roles` permission in the group, AND
2. The actor holds every permission that the target role grants (no escalation -- you cannot assign a role that gives permissions you don't have yourself).

### Template-to-Instance Relationship

Role templates are **starting points only**. When a group role is created from a template:
1. `group_roles.created_from_role_template_id` records the lineage.
2. `copy_template_permissions_on_role_create()` trigger copies all `role_template_permissions` into `group_role_permissions`.
3. After copying, the group role is **independent**. A Steward can add/remove permissions from the group role without affecting the template or other groups.

Templates do NOT auto-propagate changes to existing group role instances. If a template is updated, only newly created roles pick up the change.

---

## 5. Built vs. Designed But Not Built

### BUILT (exists in database + code today)

| Feature | Evidence |
|---|---|
| `group_type` column with CHECK constraint (system/personal/engagement) | Migration `20260222000000`, line 86 |
| Personal group auto-creation on signup | `handle_new_user()` trigger, Steps 1-3 |
| FI Members auto-enrollment on signup | `handle_new_user()` trigger, Step 4 |
| `[Deleted User]` sentinel system group | Migration `20260227120843` |
| `group_memberships` with `member_group_id` only (no `user_id`) | D15 migration, `UNIQUE(group_id, member_group_id)` |
| `users.personal_group_id` FK to `groups` | Migration `20260222000000`, line 100 |
| `personal_group_id` immutability trigger | Migration `20260223075926` |
| Invitation lifecycle (invite/accept/decline) | `InviteMemberModal`, RLS policies, triggers |
| Pending email invitations | `pending_email_invitations` table, `handle_new_user()` Step 8 |
| Auto-assign Member role on invitation acceptance | `auto_assign_member_role_on_accept()` trigger |
| 31 permissions across 6 categories | `permissions` table (seeded) |
| 4 role templates (Steward, Guide, Member, Observer) | `role_templates` table (seeded) |
| `role_template_permissions` populated (57 rows) | Seeded data |
| `copy_template_permissions_on_role_create()` trigger | Migration `20260221222339` (enhanced version) |
| `has_permission()` two-tier check | Migration `20260222000000`, line 419 |
| `is_platform_admin()` PG17-safe admin check | Migration `20260223171200` |
| `can_assign_role()` anti-escalation | Migration `20260222000000`, line 509 |
| `get_user_permissions()` | Migration `20260222000000`, line 481 |
| `usePermissions` hook + `hasPermission()` frontend | `lib/hooks/usePermissions.ts` |
| Last Steward protection trigger | `prevent_last_leader_removal()` + UI guard |
| Last DeusEx member protection triggers | `prevent_last_deusex_role_removal()`, `prevent_last_deusex_membership_removal()` |
| Auto-grant new permissions to DeusEx | `auto_grant_permission_to_deusex()` trigger on `permissions` INSERT |
| Auto-assign DeusEx role on DeusEx invitation acceptance | `auto_assign_deusex_role_on_accept()` trigger |
| Group deletion with CASCADE + RESTRICT | CASCADE on memberships/roles/enrollments, RESTRICT on journeys |
| `groups.status` lifecycle column | Migration `20260228111514` (active/closed/archived/suspended) |
| `leave_group()` RPC (L1/L2/L3) | Migration `20260228120745` |
| Stewardship nomination (`nominate_steward()`) | Migration `20260228125730` |
| Platform exit (`admin_exit_user_from_platform()`) | Migration `20260228144747` |
| Notification triggers (7 types) | Invitation received/accepted/declined, member left/removed, role assigned/removed, group deleted |
| RLS on all tables with RBAC-based policies | 19 tables with RLS enabled |
| Group creation from templates (7-step flow) | `GroupCreateForm.tsx` |
| Admin audit log | `admin_audit_log` table + triggers |

### DESIGNED BUT NOT BUILT

| Feature | Design Reference | Status |
|---|---|---|
| **D11: Circularity prevention trigger** | ADR D11 -- BEFORE INSERT trigger with recursive CTE check | No trigger exists in any migration. Circular group membership is possible at the DB level. |
| **Group-joins-group UI** | D4, D7 design docs | No frontend UI for adding an engagement group as a member of another group. `InviteMemberModal` only searches users. |
| **Transitive permission resolution** | D10 -- "fully transitive with no depth limit" | `has_permission()` only checks direct membership (depth 1). No recursive CTE walks the membership chain. |
| **`max_membership_depth` setting** | D10 -- "configurable depth limit, default unlimited" | Not implemented. |
| **Attribution chains** | D7 -- "Mogwai in 'Alpha' in 'Beta'" | Not implemented in UI. |
| **Multiple-path permission union** | D12 -- union of all paths | Only works for direct memberships (depth 1). The union logic within `has_permission()` for Tier 1 + Tier 2 works, but multi-hop paths are not resolved. |
| **Subgroup browsing UI** | FR-group-management "Known gaps" | No UI for viewing/managing nested group memberships. |
| **Full template-driven role initialization** | B-ROL-002 "Partial Implementation" note | Currently only Steward + Member roles are created at group creation. Guide and Observer role instances are NOT auto-created. Full template expansion (via `group_template_roles`) is deferred. |
| **Self-service role customization UI** | D2 -- leaders create custom roles, customize permissions | `RoleFormModal` exists but full permission picker UI for customizing which permissions a role grants is not documented as complete. |
| **Role selector / "Act as..." UI filter** | D14 -- client-side role filter toggle | Not implemented. |
| **`sharing_level` column on personal data** | D18 -- private/guide/group consent model | Not implemented. |
| **Visitor system group** | D4 -- implicit group for non-logged-in users with Guest role | Not created in any migration. Pre-auth access handled differently. |
| **Personal/system group protection in Danger Zone** | FR-group-management "Known gaps" | No guard preventing deletion attempt on personal or system groups via the Danger Zone UI. |
| **Group status transitions via UI** | B-GRP-007 -- status column exists | Column exists with RLS filtering, but no UI for admins to change group status (archive, suspend). Only `leave_group()` RPC sets status to 'closed'. |
| **B-RBAC-001 through B-RBAC-005 behavior tests** | rbac.md spec | Behaviors are specified but marked with unchecked acceptance criteria, indicating the RBAC sub-sprint 1 schema foundation tests are planned but not yet passing. |

### Summary: Current Capability

The system has a fully functional RBAC model for **direct, flat group memberships**: users (via personal groups) join engagement groups, get roles with permissions, and `has_permission()` enforces access. The schema is structurally ready for group-in-group (the FK allows it), but the permission engine, safety mechanisms, and UI do not support nested/transitive group relationships. The gap between the designed architecture (fully transitive, depth-unlimited, circularity-protected group-joins-group) and the implemented system (flat, direct-membership-only) is the single largest architectural debt in the group model.
