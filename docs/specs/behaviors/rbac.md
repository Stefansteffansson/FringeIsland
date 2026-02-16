# RBAC (Dynamic Permissions) Behaviors

> **Purpose:** Document the fundamental rules and guarantees for the Role-Based Access Control system.
> **Domain Code:** RBAC
> **Design Reference:** `docs/features/planned/dynamic-permissions-system.md` (D1-D22)
> **Sub-Sprint:** 1 — Schema Foundation

---

## B-RBAC-001: Permission Catalog Integrity

**Rule:** The system maintains exactly 31 permissions across 6 categories. Permissions are system-defined atoms — they can only be created or removed by developers via migrations, never by users.

**Why:** Permissions represent enforced code paths in the application. A permission only makes sense if there is a UI button, a Supabase query, and an RLS policy behind it. Letting users create arbitrary permissions would produce phantom entries with no enforcement (D1).

**Verified by:**
- **Test:** `tests/integration/rbac/permission-catalog.test.ts`
- **Database:** `permissions` table with seeded rows
- **Migration:** TBD (D22 changes: rename 1, remove 1, add 2)

**Acceptance Criteria:**
- [ ] `permissions` table contains exactly 31 rows
- [ ] Categories: `group_management` (14), `journey_management` (10), `journey_participation` (5), `communication` (5), `feedback` (2), `platform_admin` (4)
- [ ] `track_group_progress` has been renamed to `view_group_progress`
- [ ] `view_member_feedback` has been removed
- [ ] `browse_journey_catalog` exists in `journey_management`
- [ ] `browse_public_groups` exists in `group_management`
- [ ] Each permission has a unique `name` and a non-empty `description`
- [ ] No user-facing API allows INSERT into `permissions` (no RLS INSERT policy for non-admin)

**Examples:**

✅ **Valid:**
- Query `SELECT count(*) FROM permissions` → Returns 31
- Query `SELECT * FROM permissions WHERE name = 'view_group_progress'` → Returns 1 row
- Query `SELECT * FROM permissions WHERE name = 'browse_journey_catalog'` → Returns 1 row

❌ **Invalid:**
- Query `SELECT * FROM permissions WHERE name = 'track_group_progress'` → Returns 0 (renamed)
- Query `SELECT * FROM permissions WHERE name = 'view_member_feedback'` → Returns 0 (removed)
- Authenticated user attempts `INSERT INTO permissions` → BLOCKED (no INSERT policy)

**Testing Priority:** 🔴 CRITICAL (foundation — all permission checks depend on this catalog)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-002: Group Type Classification

**Rule:** Every group has a `group_type` column with one of three values: `'system'`, `'personal'`, or `'engagement'`. This classification determines permission scoping: system groups (Tier 1) are always active, context groups (Tier 2: personal + engagement) are only active within that group's context.

**Why:** Permission scoping prevents role bleed — a Steward role in Group A must not grant Steward permissions in Group B. System-level permissions (like creating groups or browsing the catalog) must apply everywhere. The group_type column is the mechanism that distinguishes these two tiers (D5).

**Verified by:**
- **Test:** `tests/integration/rbac/group-types.test.ts`
- **Database:** `groups.group_type` column with CHECK constraint
- **Migration:** TBD (add group_type column)

**Acceptance Criteria:**
- [ ] `groups` table has a `group_type` column of type TEXT
- [ ] CHECK constraint enforces values: `'system'`, `'personal'`, `'engagement'`
- [ ] All existing groups are classified as `'engagement'` (migration backfill)
- [ ] New groups created via the UI default to `'engagement'`
- [ ] System groups cannot be created via normal user flows (only migrations/admin)
- [ ] `group_type` cannot be changed by regular users (no UPDATE policy for group_type, or immutable after creation)

**Examples:**

✅ **Valid:**
- `SELECT group_type FROM groups WHERE name = 'FringeIsland Members'` → `'system'`
- `SELECT group_type FROM groups WHERE name = 'Visitor'` → `'system'`
- User creates a new group → `group_type` = `'engagement'`
- `SELECT group_type FROM groups WHERE id = personal_group_id` → `'personal'`

❌ **Invalid:**
- `INSERT INTO groups (..., group_type) VALUES (..., 'admin')` → BLOCKED (CHECK constraint)
- User attempts to change their group's `group_type` from `'engagement'` to `'system'` → BLOCKED

**Edge Cases:**
- **Scenario:** Existing groups created before RBAC migration
  - **Behavior:** Migration sets `group_type = 'engagement'` for all existing rows
  - **Why:** All pre-RBAC groups are user-created engagement groups

**Testing Priority:** 🔴 CRITICAL (permission scoping depends on this classification)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-003: Personal Group Creation on Signup

**Rule:** When a new user registers, the system automatically creates a personal group for that user. The personal group has `group_type = 'personal'`, exactly one member (the user), and a "Myself" role. Every user has exactly one personal group.

**Why:** The personal group IS the user's identity in the RBAC system (D9). When a user "joins" an engagement group, their personal group joins. This unifies the membership model — it's always group-to-group (D7, D15).

**Verified by:**
- **Test:** `tests/integration/rbac/personal-groups.test.ts`
- **Database:** Extended `on_auth_user_created` trigger (or new trigger)
- **Migration:** TBD (extend signup trigger)

**Acceptance Criteria:**
- [ ] On user signup, a personal group is auto-created
- [ ] Personal group has `group_type = 'personal'`
- [ ] Personal group has the user as its sole member (via `group_memberships`)
- [ ] Personal group membership has `status = 'active'`
- [ ] A "Myself" role is created in the personal group
- [ ] The user is assigned the "Myself" role
- [ ] Each user has exactly one personal group (UNIQUE constraint or equivalent)
- [ ] Personal group name defaults to user's `full_name` (can be customized later)
- [ ] Existing users get personal groups via migration backfill

**Examples:**

✅ **Valid:**
- New user signs up → Personal group created → User is sole member with "Myself" role
- Query `SELECT g.* FROM groups g JOIN group_memberships gm ON g.id = gm.group_id WHERE gm.user_id = X AND g.group_type = 'personal'` → Returns exactly 1 row

❌ **Invalid:**
- User signs up but no personal group exists → VIOLATED (trigger must fire)
- User has two personal groups → VIOLATED (uniqueness constraint)
- Another user is added to someone's personal group → BLOCKED (personal groups have exactly 1 member)

**Edge Cases:**
- **Scenario:** Existing users (pre-RBAC migration) have no personal group
  - **Behavior:** Migration creates personal groups for all existing users
  - **Why:** RBAC requires every user to have a personal group for the group-to-group model

- **Scenario:** User deactivates their account (soft delete)
  - **Behavior:** Personal group remains (is_active = false mirrors user status)
  - **Why:** Data preservation — the personal group is the user's identity anchor

**Testing Priority:** 🔴 CRITICAL (RBAC membership model depends on personal groups)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-004: Role Template Permission Mapping

**Rule:** Each of the 4 role templates (Steward, Guide, Member, Observer) has a defined set of default permissions stored in `role_template_permissions`. These mappings are the source of truth for what permissions a new role instance receives when created from a template.

**Why:** Currently `role_template_permissions` is empty — templates exist but aren't connected to permissions. This table must be populated so that when a group role is instantiated from a template, it knows which permissions to copy (D1, D18a).

**Verified by:**
- **Test:** `tests/integration/rbac/role-templates.test.ts`
- **Database:** `role_template_permissions` junction table
- **Migration:** TBD (seed template → permission mappings)

**Acceptance Criteria:**
- [ ] Steward template has 24 permissions mapped (per D18a grid)
- [ ] Guide template has 14 permissions mapped (D18a grid recount: 14, not 15)
- [ ] Member template has 12 permissions mapped
- [ ] Observer template has 7 permissions mapped
- [ ] Total: 57 rows in `role_template_permissions` (24+14+12+7)
- [ ] Role templates renamed: "Group Leader Role Template" → "Steward Role Template"
- [ ] Role templates renamed: "Travel Guide Role Template" → "Guide Role Template"
- [ ] "Platform Admin Role Template" removed (becomes Deusex group role, not a template)
- [ ] Final template count: 4 (Steward, Guide, Member, Observer)
- [ ] Each mapping references a valid `role_template_id` and `permission_id`

**Examples:**

✅ **Valid:**
- `SELECT count(*) FROM role_template_permissions WHERE role_template_id = steward_id` → 24
- `SELECT count(*) FROM role_template_permissions WHERE role_template_id = guide_id` → 15
- Steward template includes `edit_group_settings`, `delete_group`, `invite_members`
- Guide template includes `view_journey_content`, `complete_journey_activities`, `view_others_progress`
- Member template includes `view_journey_content`, `post_forum_messages`, but NOT `invite_members`
- Observer template includes `view_forum`, `view_journey_content`, but NOT `post_forum_messages`

❌ **Invalid:**
- `SELECT * FROM role_templates WHERE name = 'Platform Admin Role Template'` → Returns 0 (removed)
- `SELECT * FROM role_templates WHERE name = 'Group Leader Role Template'` → Returns 0 (renamed to Steward)
- Steward template missing `invite_members` → VIOLATED (D18a requires it)

**Testing Priority:** 🔴 CRITICAL (group role initialization depends on these mappings)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-005: Group Role Permission Initialization

**Rule:** When a group role is instantiated from a template (e.g., during group creation), the template's default permissions are copied into `group_role_permissions`. After copying, the group role's permissions are independent — the Steward can customize them without affecting the template or other groups.

**Why:** This is the template-to-instance copy mechanism (D1, D2). Without it, roles exist but have no permissions, which is the current broken state. After initialization, each group's permission set is independent, enabling per-group customization.

**Verified by:**
- **Test:** `tests/integration/rbac/role-permissions.test.ts`
- **Database:** `group_role_permissions` junction table
- **Code:** Group creation flow (extended to copy permissions)

**Acceptance Criteria:**
- [ ] When a group is created and a Steward role instantiated, `group_role_permissions` receives 24 rows
- [ ] Permissions copied match the Steward template's permission set exactly
- [ ] Modifying a group's role permissions does NOT affect the template
- [ ] Modifying a group's role permissions does NOT affect other groups' roles
- [ ] Each row in `group_role_permissions` references valid `group_role_id` and `permission_id`
- [ ] Existing groups receive backfilled permissions via migration (based on their role's template)

**Examples:**

✅ **Valid:**
- Create new group → Steward role created from template → 24 permission rows in `group_role_permissions`
- Group A's Steward removes `invite_members` from their Steward role → Group B's Steward role unaffected
- Query `SELECT p.name FROM group_role_permissions grp JOIN permissions p ON grp.permission_id = p.id WHERE grp.group_role_id = X` → Returns the role's permission names

❌ **Invalid:**
- Group created but `group_role_permissions` has 0 rows for the Steward role → VIOLATED
- Template permissions changed → existing group roles retroactively change → VIOLATED (independence)

**Edge Cases:**
- **Scenario:** Existing groups (pre-RBAC) have roles but no `group_role_permissions` entries
  - **Behavior:** Migration backfills permissions based on each role's `created_from_role_template_id`
  - **Why:** Existing Group Leader roles should get Steward permissions retroactively

- **Scenario:** A group role has no `created_from_role_template_id` (custom role)
  - **Behavior:** No auto-copy; the Steward manually assigns permissions from the catalog
  - **Why:** Custom roles have no template to copy from (D2)

**Testing Priority:** 🔴 CRITICAL (permission enforcement depends on these mappings)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-006: System Groups Exist

**Rule:** The platform has three system groups that are always present: "FringeIsland Members" (all authenticated users), "Visitor" (implicit, anonymous access), and "Deusex" (superusers). All system groups have `group_type = 'system'`.

**Why:** System groups provide Tier 1 permissions that apply regardless of context (D5, D6). The FringeIsland Members group is the centralized platform policy control point — changing one role affects all users (D6). Deusex goes through the same `has_permission()` checks as everyone else (D3).

**Verified by:**
- **Test:** `tests/integration/rbac/system-groups.test.ts`
- **Database:** `groups` table rows with `group_type = 'system'`
- **Migration:** TBD (create system groups)

**Acceptance Criteria:**
- [ ] A group named "FringeIsland Members" exists with `group_type = 'system'`
- [ ] A group named "Visitor" exists with `group_type = 'system'`
- [ ] A group named "Deusex" exists with `group_type = 'system'`
- [ ] FringeIsland Members group has a "Member" role with 8 permissions (D20)
- [ ] Visitor group has a "Guest" role with 5 permissions (D20)
- [ ] Deusex group has a "Deusex" role with ALL 31 permissions
- [ ] All authenticated users are automatically members of FringeIsland Members (via signup trigger)
- [ ] System groups cannot be deleted by regular users
- [ ] System groups are not visible in the normal "My Groups" list (filtered by group_type)

**Examples:**

✅ **Valid:**
- `SELECT * FROM groups WHERE group_type = 'system'` → Returns 3 rows
- New user signs up → Automatically becomes member of FringeIsland Members
- Deusex member queries `has_permission(user_id, any_group, any_permission)` → Always true

❌ **Invalid:**
- `SELECT * FROM groups WHERE name = 'FringeIsland Members'` → Returns 0 → VIOLATED
- Regular user deletes the FringeIsland Members system group → BLOCKED
- System groups appear in user's "My Groups" page → VIOLATED (UI filter)

**Edge Cases:**
- **Scenario:** New permission added to the system catalog
  - **Behavior:** Must be explicitly added to Deusex role (D3 — no bypass)
  - **Why:** Forces awareness of new permissions rather than silently granting them

- **Scenario:** Existing users (pre-RBAC) are not members of FringeIsland Members
  - **Behavior:** Migration creates memberships for all existing users
  - **Why:** All authenticated users must have Tier 1 system permissions

**Testing Priority:** 🔴 CRITICAL (Tier 1 permission resolution depends on system groups)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-007: Role Renaming (Steward/Guide Terminology)

**Rule:** The system uses the updated role terminology: "Group Leader" → "Steward", "Travel Guide" → "Guide". This applies to role templates, existing group roles, and all UI references.

**Why:** The new names better reflect the roles' functions. Steward = long-term group care (membership, settings, structure). Guide = journey facilitation (content expertise, progress, feedback). The old names implied hierarchy; the new names imply function (D17).

**Verified by:**
- **Test:** `tests/integration/rbac/role-renaming.test.ts`
- **Database:** `role_templates.name` and `group_roles.name` columns
- **Migration:** TBD (rename in role_templates and group_roles)

**Acceptance Criteria:**
- [ ] `role_templates` contains "Steward Role Template" (not "Group Leader Role Template")
- [ ] `role_templates` contains "Guide Role Template" (not "Travel Guide Role Template")
- [ ] All existing `group_roles` named "Group Leader" are renamed to "Steward"
- [ ] All existing `group_roles` named "Travel Guide" are renamed to "Guide"
- [ ] "Member" and "Observer" role names remain unchanged
- [ ] RLS helper functions updated: `is_active_group_leader()` → `is_active_steward()` (or equivalent)
- [ ] UI references updated: "Group Leader" → "Steward", "Travel Guide" → "Guide"
- [ ] Last-leader protection trigger updated to check for "Steward" instead of "Group Leader"

**Examples:**

✅ **Valid:**
- `SELECT name FROM role_templates` → Returns: Steward Role Template, Guide Role Template, Member Role Template, Observer Role Template
- `SELECT name FROM group_roles WHERE group_id = X` → Returns "Steward" (not "Group Leader")
- Last steward removal is blocked by trigger (same protection, new name)

❌ **Invalid:**
- `SELECT * FROM role_templates WHERE name = 'Group Leader Role Template'` → Returns 0 (renamed)
- UI still shows "Group Leader" anywhere → VIOLATED

**Edge Cases:**
- **Scenario:** Code references `'Group Leader'` string literal for role checks
  - **Behavior:** All such references must be updated to `'Steward'`
  - **Why:** String-based role checks will break if role names change but code doesn't

- **Scenario:** Migration runs but UI is not yet updated
  - **Behavior:** UI will show "Steward" from DB data even before component code is updated (role names come from DB, not hardcoded in most places)
  - **Why:** The group detail page renders role names from the `group_roles` table

**Testing Priority:** 🟡 HIGH (functional correctness — role checks depend on name matching)

**History:**
- 2026-02-15: Created (Sub-Sprint 1)

---

## B-RBAC-008: Engagement Group Permission Resolution

**Rule:** `has_permission()` checks if a user has a specific permission in an engagement group by looking up their roles in that group and checking if any role grants the permission.

**Why:** This is the core Tier 2 (context-specific) permission resolution logic. Users can have different roles in different groups, so the permission check must be scoped to the group context being checked (D5). A user who is a Steward in Group A but only a Member in Group B should only have Steward permissions when acting in Group A's context.

**Verified by:**
- **Test:** `tests/integration/rbac/permission-resolution.test.ts`
- **Database:** `has_permission(user_id, group_id, permission_name)` SQL function
- **Migration:** `20260216111905_rbac_permission_resolution.sql`

**Acceptance Criteria:**
- [ ] `has_permission(user_id, group_id, 'invite_members')` returns true if user is an active member of the group AND has a role with that permission
- [ ] User must have `status = 'active'` in `group_memberships` for the group
- [ ] Checks `user_group_roles` → `group_roles` → `group_role_permissions` → `permissions` path
- [ ] If user has multiple roles in the group, permissions are unioned (any role grants = true)
- [ ] Returns false if user is not a member of the group
- [ ] Returns false if user is a member but has status 'invited' (not yet accepted)
- [ ] Returns false if user is a member but none of their roles grant the permission
- [ ] Function is `SECURITY DEFINER` with `search_path = ''` (project convention)

**Examples:**

✅ **Valid:**
- User has Steward role in Group A, check `has_permission(user_id, group_a_id, 'invite_members')` → true
- User has Member role in Group B (Member has 12 perms but NOT invite_members), check `has_permission(user_id, group_b_id, 'invite_members')` → false
- User has both Steward AND Member roles in Group C, check `has_permission(user_id, group_c_id, 'invite_members')` → true (union semantics)

❌ **Invalid:**
- User is invited to Group D but hasn't accepted (status='invited'), check `has_permission(user_id, group_d_id, 'view_journey_content')` → false
- User is not a member of Group E, check `has_permission(user_id, group_e_id, any_permission)` → false

**Edge Cases:**
- **Scenario:** User has Observer role (7 permissions) and checks `post_forum_messages` (not in Observer)
  - **Behavior:** `has_permission()` returns false
  - **Why:** Observer can view but not post (D18a grid)

- **Scenario:** User's membership is paused (`status = 'paused'`)
  - **Behavior:** `has_permission()` returns false (only 'active' memberships count)
  - **Why:** Paused users should not have any group-context permissions

**Testing Priority:** 🔴 CRITICAL (core permission resolution — all UI and RLS depend on this)

**History:**
- 2026-02-16: Created (Sub-Sprint 2)

---

## B-RBAC-009: System Group Permission Resolution (Tier 1)

**Rule:** `has_permission()` always checks system group permissions (Tier 1) in addition to context group permissions. System permissions are additive and apply regardless of which engagement group context is being checked.

**Why:** System groups provide platform-wide permissions that apply everywhere (D5, D6). A user who is a member of FringeIsland Members should be able to `create_group` no matter which group's page they're viewing. System permissions are always "on" — they don't require a group context to be active.

**Verified by:**
- **Test:** `tests/integration/rbac/permission-resolution.test.ts`
- **Database:** `has_permission(user_id, group_id, permission_name)` SQL function
- **Migration:** `20260216111905_rbac_permission_resolution.sql`

**Acceptance Criteria:**
- [ ] `has_permission()` checks system groups (where `group_type = 'system'`) FIRST
- [ ] If permission found in system groups, return true immediately (no need to check context group)
- [ ] System group permissions apply to ALL group contexts (e.g., `create_group` works everywhere)
- [ ] FringeIsland Members group has a Member role with 8 permissions (D20)
- [ ] These 8 permissions are available to all authenticated users in any context
- [ ] Deusex group has a Deusex role with ALL 41 permissions (D3, D20, D22 correction)
- [ ] Deusex members have ALL permissions in ALL contexts (via system group, not bypass)
- [ ] Visitor group has a Guest role with 5 permissions (D20)
- [ ] Anonymous users (if supported) get Visitor permissions

**Examples:**

✅ **Valid:**
- User is FI Members, check `has_permission(user_id, any_group_id, 'create_group')` → true (Tier 1)
- User is FI Members, check `has_permission(user_id, any_group_id, 'browse_journey_catalog')` → true (Tier 1)
- User is Deusex member, check `has_permission(user_id, any_group_id, 'delete_group')` → true (Tier 1, all perms)
- User is ONLY in engagement groups (not FI Members somehow), check `has_permission(user_id, group_id, 'create_group')` → false (no Tier 1 access)

❌ **Invalid:**
- User has `create_group` from FI Members but function doesn't check system groups → VIOLATED
- Deusex member missing one permission because function only checks context group → VIOLATED

**Edge Cases:**
- **Scenario:** User has permission from BOTH system group AND context group
  - **Behavior:** `has_permission()` returns true (union of Tier 1 + Tier 2)
  - **Why:** Permissions are additive across tiers

- **Scenario:** User is checking a system group as the context (e.g., `has_permission(user_id, fi_members_id, permission)`)
  - **Behavior:** Works normally — system groups can be queried like any other group
  - **Why:** System groups are still groups; they just also grant Tier 1 permissions

- **Scenario:** New authenticated user who hasn't accepted any group invitations yet
  - **Behavior:** Has 8 permissions from FI Members (Tier 1), but 0 from engagement groups (Tier 2)
  - **Why:** System group membership is automatic; engagement groups require invitation + acceptance

**Testing Priority:** 🔴 CRITICAL (Tier 1 permissions are the foundation of platform-wide access)

**History:**
- 2026-02-16: Created (Sub-Sprint 2)

---

## B-RBAC-010: Permission Check Edge Cases

**Rule:** `has_permission()` returns false for invalid inputs, non-existent entities, and edge cases where permission should not be granted.

**Why:** Robust error handling prevents security holes. If a user_id, group_id, or permission_name is invalid, the function must fail closed (deny access) rather than throw an error or return null, which could cause RLS policies to malfunction (D4).

**Verified by:**
- **Test:** `tests/integration/rbac/permission-resolution.test.ts`
- **Database:** `has_permission(user_id, group_id, permission_name)` SQL function
- **Migration:** `20260216111905_rbac_permission_resolution.sql`

**Acceptance Criteria:**
- [ ] Non-existent `user_id` → returns false
- [ ] Non-existent `group_id` → returns false
- [ ] Non-existent `permission_name` → returns false
- [ ] NULL `user_id` → returns false
- [ ] NULL `group_id` → returns false
- [ ] NULL `permission_name` → returns false
- [ ] User exists but is soft-deleted (`is_active = false`) → returns false
- [ ] User is a member of the group but status is 'invited' → returns false
- [ ] User is a member of the group but status is 'removed' → returns false
- [ ] User is a member of the group but status is 'paused' → returns false
- [ ] Valid inputs but user is not a member of the group → returns false
- [ ] Valid inputs but user has no roles in the group → returns false (edge case: member with no roles)
- [ ] Valid inputs but user's roles don't grant the permission → returns false
- [ ] Function does NOT throw errors (silent false for all invalid cases)

**Examples:**

✅ **Valid (function works correctly):**
- `has_permission('00000000-0000-0000-0000-000000000000', valid_group, 'invite_members')` → false (fake user)
- `has_permission(valid_user, '00000000-0000-0000-0000-000000000000', 'invite_members')` → false (fake group)
- `has_permission(valid_user, valid_group, 'nonexistent_permission')` → false (invalid permission)
- `has_permission(NULL, valid_group, 'invite_members')` → false (NULL input)
- `has_permission(inactive_user, valid_group, 'view_journey_content')` → false (soft-deleted user)

❌ **Invalid (bugs to avoid):**
- Function throws SQL error on NULL input → VIOLATED (must return false)
- Function returns NULL instead of false → VIOLATED (breaks RLS boolean checks)
- Function allows soft-deleted users to pass permission checks → VIOLATED

**Edge Cases:**
- **Scenario:** User is removed from group (`status = 'removed'`) but `user_group_roles` entries still exist
  - **Behavior:** `has_permission()` returns false (membership status check comes before role lookup)
  - **Why:** Roles are historical data; only active memberships grant permissions

- **Scenario:** Permission name has typo (e.g., `'invite_member'` instead of `'invite_members'`)
  - **Behavior:** `has_permission()` returns false (no such permission in catalog)
  - **Why:** Fail closed — better to deny access than grant due to typo

- **Scenario:** User passes a personal group ID as the context
  - **Behavior:** Works normally (personal groups are groups; user is sole member with Myself role)
  - **Why:** No special handling needed; the data model is consistent

- **Scenario:** Function is called during signup before personal group is created
  - **Behavior:** Returns false for engagement group checks (no memberships yet), but returns true for FI Members Tier 1 permissions (signup trigger adds FI Members membership)
  - **Why:** Signup trigger creates both personal group AND FI Members membership atomically

**Testing Priority:** 🔴 CRITICAL (security — must fail closed, never open)

**History:**
- 2026-02-16: Created (Sub-Sprint 2)

---

## B-RBAC-011: usePermissions() Hook — Permission Set Fetching

**Rule:** The `usePermissions(groupId)` React hook fetches the complete set of permission names the current user has in the given group context, combining system (Tier 1) and context (Tier 2) permissions. It returns a synchronous lookup function and a loading state.

**Why:** UI components need to check permissions frequently (e.g., show/hide buttons, enable/disable features). Calling `has_permission()` via Supabase RPC on every render would be slow and wasteful. Instead, fetch the user's full permission set once and cache it in React state (Q5 in design doc).

**Verified by:**
- **Test:** `tests/integration/rbac/use-permissions-hook.test.ts` (React Testing Library)
- **Code:** `lib/hooks/usePermissions.ts`
- **Database:** Supabase query combining system + context permissions

**Acceptance Criteria:**
- [ ] Hook signature: `usePermissions(groupId: string | null) → { permissions: string[], hasPermission: (name: string) => boolean, loading: boolean }`
- [ ] `permissions` is a deduplicated array of permission name strings (e.g., `['invite_members', 'edit_group_settings', ...]`)
- [ ] `hasPermission('invite_members')` returns true/false synchronously (checks the cached `permissions` array)
- [ ] `loading` is true during initial fetch, false after data loads
- [ ] Re-fetches when `groupId` changes
- [ ] Re-fetches when `refreshNavigation` custom event fires (same event that triggers Navigation.tsx refresh)
- [ ] Returns empty `permissions: []` when user is not authenticated
- [ ] Returns empty `permissions: []` when `groupId` is null
- [ ] Combines Tier 1 (system group) + Tier 2 (context group) permissions in one query
- [ ] Uses `useAuth()` hook to get current user ID
- [ ] Uses Supabase client to fetch permissions (not direct `has_permission()` calls)

**Examples:**

✅ **Valid:**
- User loads group detail page → `usePermissions(groupId)` called → hook fetches permissions → `hasPermission('invite_members')` returns true/false based on fetched data
- User accepts invitation → `refreshNavigation` event fires → hook re-fetches → buttons update
- User switches from Group A to Group B → `groupId` changes → hook re-fetches → different permission set
- Component renders `{hasPermission('delete_group') && <DeleteButton />}` → button shows/hides instantly (no async check)

❌ **Invalid:**
- Hook calls `has_permission()` SQL function on every button render → VIOLATED (too slow, use cached data)
- `hasPermission()` returns a Promise → VIOLATED (must be synchronous)
- Hook doesn't re-fetch on group change → VIOLATED (stale permissions)

**Edge Cases:**
- **Scenario:** User loads group page before hook finishes fetching
  - **Behavior:** `loading = true`, `permissions = []`, `hasPermission(any) = false` → All permission-gated buttons hidden
  - **Why:** Fail closed during loading; buttons appear once permissions load

- **Scenario:** User is on Group A's page but also has permissions from FI Members (Tier 1)
  - **Behavior:** `permissions` includes BOTH Tier 1 (e.g., `create_group`) AND Tier 2 (e.g., `invite_members` if Steward)
  - **Why:** Hook combines both tiers in one query for efficiency

- **Scenario:** User's role is changed by another Steward while they're viewing the page
  - **Behavior:** Permissions don't update until `refreshNavigation` event or page reload
  - **Why:** No real-time subscription yet (Phase 2 feature)

- **Scenario:** Hook is called with `groupId = null` (e.g., on a non-group page)
  - **Behavior:** Returns only Tier 1 (system group) permissions, no Tier 2
  - **Why:** No group context to check; only platform-wide permissions apply

**Testing Priority:** 🔴 CRITICAL (all UI permission checks depend on this hook)

**History:**
- 2026-02-16: Created (Sub-Sprint 2)

---

## B-RBAC-012: Deusex Has All Permissions

**Rule:** Users who are members of the Deusex system group have ALL permissions in ALL contexts. This is not a bypass — it works through the normal permission resolution: the Deusex role has all 31 permissions, and system group permissions are always active (Tier 1).

**Why:** Validates that the RBAC model can express "superuser" purely through permissions, with no special-case code (D3). Deusex users go through the same `has_permission()` checks as everyone else; they just happen to always return true because their role grants all permissions.

**Verified by:**
- **Test:** `tests/integration/rbac/deusex-permissions.test.ts`
- **Database:** `has_permission(deusex_user_id, any_group, any_permission)` always returns true
- **Migration:** `20260216111905_rbac_permission_resolution.sql` (functions) + `20260216071649_rbac_system_groups.sql` (Deusex group/role)

**Acceptance Criteria:**
- [ ] Deusex group exists with `group_type = 'system'`
- [ ] Deusex group has a "Deusex" role
- [ ] Deusex role has ALL 41 permissions mapped in `group_role_permissions`
- [ ] When new permissions are added to the catalog, Deusex role must be explicitly updated (no auto-grant)
- [ ] `has_permission(deusex_user, any_valid_group, any_valid_permission)` → true
- [ ] Deusex users can perform ANY action in ANY group (subject to implementation, not just permission check)
- [ ] No special-case code checks for "is Deusex" — permission checks are the ONLY gate
- [ ] `usePermissions(groupId)` for a Deusex user returns all 41 permission names

**Examples:**

✅ **Valid:**
- Deusex user checks `has_permission(user_id, group_a, 'delete_group')` → true
- Deusex user checks `has_permission(user_id, group_b, 'invite_members')` → true
- Deusex user checks `has_permission(user_id, any_group, 'create_group')` → true
- UI code: `if (hasPermission('delete_group'))` shows delete button for Deusex users

❌ **Invalid:**
- Code checks `if (user.role === 'admin')` instead of `hasPermission(...)` → VIOLATED (no special-case code)
- New permission added but Deusex role doesn't get it → VIOLATED (Deusex must have all)
- Deusex member is blocked from an action even though they have the permission → VIOLATED (permission should grant access)

**Edge Cases:**
- **Scenario:** New permission `reset_user_password` is added to the catalog (future feature)
  - **Behavior:** Migration must add this permission to Deusex role explicitly
  - **Why:** Forces awareness (D3 — no silent auto-grant)

- **Scenario:** Deusex user tries to delete the FringeIsland Members system group
  - **Behavior:** Permission check passes, but implementation should block deleting system groups (business logic, not permission logic)
  - **Why:** Some actions are universally forbidden regardless of permissions

- **Scenario:** Deusex user loads `usePermissions(groupId)`
  - **Behavior:** Returns all 31 permission names (deduplicated if context group also has some)
  - **Why:** Tier 1 grants all, so hook returns the full catalog

**Testing Priority:** 🔴 CRITICAL (validates RBAC model correctness — no bypasses)

**History:**
- 2026-02-16: Created (Sub-Sprint 2)

---

## B-RBAC-013: Group Detail Page — Permission-Gated Actions

**Rule:** The group detail page (`app/groups/[id]/page.tsx`) shows action buttons based on the user's permissions in that group, not based on whether they hold a specific role name. Each action maps to a specific permission from the catalog.

**Why:** The current UI uses `isLeader` (derived from `role.name === 'Group Leader'`) as a binary gate for all management actions. This is too coarse — a Guide who should be able to view member progress can't, and a custom role with `invite_members` permission can't see the invite button. Permission-based gating enables fine-grained, customizable access (D1, D2, D14).

**Verified by:**
- **Test:** `tests/integration/rbac/ui-permission-gating.test.ts`
- **Code:** `app/groups/[id]/page.tsx` using `usePermissions(groupId)` hook
- **Database:** `has_permission()` + `get_user_permissions()` SQL functions (Sub-Sprint 2)

**Acceptance Criteria:**
- [ ] Page uses `usePermissions(groupId)` hook instead of deriving `isLeader` from role names
- [ ] Edit Group button: shown when `hasPermission('edit_group_settings')` is true
- [ ] Invite Member button: shown when `hasPermission('invite_members')` is true
- [ ] Remove Member button (×): shown when `hasPermission('remove_members')` is true
- [ ] Assign Role button: shown when `hasPermission('assign_roles')` is true
- [ ] Remove Role button (×): shown when `hasPermission('remove_roles')` is true
- [ ] Member list section: shown when `show_member_list` is true OR `hasPermission('view_member_list')` is true
- [ ] Quick Actions section: shown when user has ANY management permission (invite, assign, etc.)
- [ ] While permissions are loading (`loading = true`), management buttons are hidden (fail closed)
- [ ] No code checks `role.name === 'Group Leader'` or `role.name === 'Steward'` for access decisions

**Examples:**

✅ **Valid:**
- User with Steward role sees edit, invite, remove, assign buttons (Steward has all management perms)
- User with Guide role sees member list but NOT invite/remove/assign buttons (Guide lacks those perms)
- User with custom "Mentor" role that has `invite_members` sees the invite button but NOT edit/remove
- Deusex user sees all buttons in every group (all permissions via Tier 1)

❌ **Invalid:**
- Code checks `isLeader` or `role.name === 'Steward'` → VIOLATED (must use `hasPermission()`)
- Guide user can't see member list even though Guide has `view_member_list` → VIOLATED
- Permissions still loading but buttons are visible → VIOLATED (fail closed during loading)

**Edge Cases:**
- **Scenario:** User has multiple roles (Steward + Guide) in the same group
  - **Behavior:** Buttons reflect union of permissions (both roles' permissions apply)
  - **Why:** D12 — multiple roles = union

- **Scenario:** Steward removes `invite_members` from a custom role while user is viewing the page
  - **Behavior:** Buttons don't update until page reload or `refreshNavigation` event
  - **Why:** No real-time subscription yet; hook re-fetches on navigation events

**Testing Priority:** 🔴 CRITICAL (most-used page, most permission checks)

**History:**
- 2026-02-16: Created (Sub-Sprint 3)

---

## B-RBAC-014: Edit Group Page — Permission-Gated Access

**Rule:** The edit group page (`app/groups/[id]/edit/page.tsx`) checks `hasPermission('edit_group_settings')` to determine if the user can access the page, not whether they hold the "Group Leader" or "Steward" role.

**Why:** Access to group editing should be controlled by the `edit_group_settings` permission, which the Steward can grant to other roles if desired (D2). Hardcoding role-name checks prevents this flexibility.

**Verified by:**
- **Test:** `tests/integration/rbac/ui-permission-gating.test.ts`
- **Code:** `app/groups/[id]/edit/page.tsx` using `usePermissions(groupId)` hook

**Acceptance Criteria:**
- [ ] Page uses `usePermissions(groupId)` hook instead of deriving `isLeader` from role names
- [ ] Page renders edit form when `hasPermission('edit_group_settings')` is true
- [ ] Page renders "not authorized" message when `hasPermission('edit_group_settings')` is false
- [ ] Delete group (Danger Zone) section: shown when `hasPermission('delete_group')` is true
- [ ] While permissions are loading, page shows loading state (not the edit form)
- [ ] No code checks `role.name === 'Group Leader'` or `role.name === 'Steward'`

**Examples:**

✅ **Valid:**
- User with Steward role navigates to `/groups/[id]/edit` → sees edit form
- User with Member role navigates to `/groups/[id]/edit` → sees "not authorized"
- User with custom role that has `edit_group_settings` but NOT `delete_group` → sees edit form but NOT Danger Zone

❌ **Invalid:**
- Page checks `isLeader` boolean → VIOLATED
- User with `edit_group_settings` permission (via custom role) is denied access → VIOLATED

**Testing Priority:** 🟡 HIGH

**History:**
- 2026-02-16: Created (Sub-Sprint 3)

---

## B-RBAC-015: Forum Moderation — Permission-Gated Delete

**Rule:** Forum moderation actions (deleting others' posts) are gated by the `moderate_forum` permission, not by whether the user is a "Group Leader" or "Steward". Users can always edit/delete their own posts regardless of permissions.

**Why:** Forum moderation is a specific capability that may be delegated to roles other than Steward (e.g., a "Moderator" custom role). The current `isLeader` prop creates a binary gate that prevents this delegation (D2, D18a).

**Verified by:**
- **Test:** `tests/integration/rbac/ui-permission-gating.test.ts`
- **Code:** `ForumSection.tsx`, `ForumPost.tsx`, `ForumReplyList.tsx`

**Acceptance Criteria:**
- [ ] `ForumSection` receives permission data instead of `isLeader` boolean prop
- [ ] Delete button on others' posts: shown when `hasPermission('moderate_forum')` is true
- [ ] Users can always edit/delete their OWN posts (no permission needed — author check)
- [ ] `ForumPost` and `ForumReplyList` components updated to use permission-based prop
- [ ] No `isLeader` prop in forum component interfaces

**Examples:**

✅ **Valid:**
- Steward sees delete button on all posts (has `moderate_forum` permission)
- Guide does NOT see delete button on others' posts (Guide lacks `moderate_forum` per D18a)
- Member sees edit/delete on their own posts only
- Custom "Moderator" role with `moderate_forum` permission sees delete button on all posts

❌ **Invalid:**
- `isLeader` prop still passed to forum components → VIOLATED
- Guide can delete others' posts → VIOLATED (Guide doesn't have `moderate_forum`)

**Testing Priority:** 🟡 HIGH

**History:**
- 2026-02-16: Created (Sub-Sprint 3)

---

## B-RBAC-016: Enrollment Modal — Permission-Based Group Enrollment

**Rule:** The enrollment modal's group enrollment tab fetches groups where the user has the `enroll_group_in_journey` permission, not groups where the user has the "Group Leader" role name.

**Why:** The current code queries `group_roles.name = 'Group Leader'` to find eligible groups. This breaks when roles are renamed (already renamed to "Steward") and prevents custom roles with enrollment permissions from working (D2).

**Verified by:**
- **Test:** `tests/integration/rbac/ui-permission-gating.test.ts`
- **Code:** `components/journeys/EnrollmentModal.tsx`

**Acceptance Criteria:**
- [ ] Group enrollment tab fetches groups using `has_permission()` or `get_user_permissions()` instead of role name matching
- [ ] User sees groups where they have `enroll_group_in_journey` permission
- [ ] "You must be a Group Leader" message updated to permission-based language (e.g., "You don't have permission to enroll any groups")
- [ ] Variable names updated: `leaderGroups` → `enrollableGroups`, `fetchLeaderGroups` → `fetchEnrollableGroups`
- [ ] No code queries `group_roles.name = 'Group Leader'` or `group_roles.name = 'Steward'`

**Examples:**

✅ **Valid:**
- User with Steward role in 3 groups → sees all 3 groups in dropdown
- User with custom "Coordinator" role that has `enroll_group_in_journey` → sees those groups too
- User with Member role only (no enrollment perm) → sees "no permission" message

❌ **Invalid:**
- Code filters by `group_roles.name = 'Group Leader'` → VIOLATED (already renamed to Steward, and should use permissions anyway)
- User with `enroll_group_in_journey` on a custom role can't see the group → VIOLATED

**Testing Priority:** 🟡 HIGH

**History:**
- 2026-02-16: Created (Sub-Sprint 3)

---

## B-RBAC-017: No Remaining isLeader or Role-Name Checks in Application Code

**Rule:** After Sub-Sprint 3, no application code (components, pages, hooks) uses `isLeader` boolean state, `role.name === 'Group Leader'`, `role.name === 'Steward'`, or any other role-name string comparison for access decisions. All access decisions use `hasPermission('permission_name')`.

**Why:** Role-name checks are the root problem RBAC solves. If any remain, the system is partially migrated and fragile — renaming a role breaks access, and custom roles can't work. This behavior is the "definition of done" for Sub-Sprint 3 (D1, D2).

**Verified by:**
- **Test:** Code grep / static analysis (no integration test needed)
- **Code:** All files in `app/` and `components/`

**Acceptance Criteria:**
- [ ] `grep -r "isLeader" app/ components/` → 0 matches (excluding comments/docs)
- [ ] `grep -r "'Group Leader'" app/ components/` → 0 matches
- [ ] `grep -r "'Steward'" app/ components/` → 0 matches (for access checks; display labels are OK)
- [ ] `grep -r "role.name ===" app/ components/` → 0 matches (for access decisions)
- [ ] `grep -r "role_name ===" app/ components/` → 0 matches (for access decisions)
- [ ] All removed `isLeader` state variables have been replaced with `usePermissions()` hook calls
- [ ] Role names may still appear in display/labels (e.g., showing "Steward" badge) — this is OK
- [ ] The `is_active_group_leader()` SQL helper function may still exist for RLS backward compatibility (RLS migration is a separate concern from UI migration)

**Examples:**

✅ **Valid:**
- `{hasPermission('invite_members') && <InviteButton />}` — permission-based
- `<span>{role.name}</span>` — displaying role name in UI label (not access decision)

❌ **Invalid:**
- `const isLeader = roles.some(r => r.name === 'Steward')` → VIOLATED
- `{isLeader && <EditButton />}` → VIOLATED
- `.eq('group_roles.name', 'Group Leader')` → VIOLATED (Supabase query filtering by role name)

**Testing Priority:** 🔴 CRITICAL (definition of done for Sub-Sprint 3)

**History:**
- 2026-02-16: Created (Sub-Sprint 3)

---

## B-RBAC-018: manage_roles Permission Exists in Catalog

**Rule:** The permission catalog includes a `manage_roles` permission in the `group_management` category. This permission gates all role CRUD operations: creating custom roles, editing role names/descriptions/permissions, and deleting custom roles. The Steward role template includes this permission by default.

**Why:** Without a dedicated permission for role management, the system cannot gate who can create/edit/delete roles using the RBAC model. We'd have to hardcode "only Stewards" — which is the anti-pattern RBAC eliminates. A single coarse permission is used because role CRUD and permission configuration share the same UI context and have similar security impact (Q1 principle).

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Database:** `permissions` table, `role_template_permissions`, `group_role_permissions`
- **Migration:** TBD

**Acceptance Criteria:**
- [ ] `permissions` table contains `manage_roles` with category `group_management`
- [ ] Permission catalog total is now 42 (was 41)
- [ ] Steward role template has `manage_roles` in `role_template_permissions`
- [ ] All existing Steward role instances (in `group_role_permissions`) have `manage_roles` backfilled
- [ ] Deusex role has `manage_roles` added to its `group_role_permissions`
- [ ] Guide, Member, Observer templates do NOT have `manage_roles`

**Examples:**

✅ **Valid:**
- `SELECT * FROM permissions WHERE name = 'manage_roles'` → Returns 1 row, category = 'group_management'
- `SELECT count(*) FROM permissions` → Returns 42
- Steward in Group A: `hasPermission('manage_roles')` → true

❌ **Invalid:**
- Member checks `hasPermission('manage_roles')` → false (Members can't manage roles by default)
- `manage_roles` missing from Deusex role → VIOLATED

**Testing Priority:** 🔴 CRITICAL (gates all Sub-Sprint 4 functionality)

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-019: View Roles in Group (Role List)

**Rule:** Any active group member can view the list of roles in their group, including role names, descriptions, and permission counts. Viewing the full permission details of a role requires the `manage_roles` permission.

**Why:** All members should know what roles exist in their group (transparency). But the detailed permission configuration is only relevant to those who can manage roles. This mirrors the existing pattern where all members can see role badges but only Stewards manage them.

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Code:** Role list component on group page or dedicated `/groups/[id]/roles` page
- **Database:** `group_roles` SELECT policy (existing — members can view roles in their groups)

**Acceptance Criteria:**
- [ ] Any active group member can see the list of roles (name, description, member count)
- [ ] Users with `manage_roles` permission see a "Manage Roles" button/link
- [ ] Users without `manage_roles` do NOT see management controls (create/edit/delete buttons)
- [ ] Role list shows which roles originated from templates vs. custom-created
- [ ] Role list shows permission count per role (e.g., "24 permissions")
- [ ] Loading state shown while fetching roles
- [ ] Empty state handled (no roles — shouldn't happen with templates, but defensive)

**Examples:**

✅ **Valid:**
- Member views group → sees "Steward (24 permissions), Guide (15), Member (12), Observer (7)"
- Steward views group → sees same list PLUS "Manage Roles" button
- Custom "Mentor" role with 8 permissions → shows in list with "8 permissions"

❌ **Invalid:**
- Member sees create/edit/delete buttons on roles → VIOLATED (needs `manage_roles`)
- Active member can't see role list at all → VIOLATED (all members can view)

**Testing Priority:** 🟡 HIGH

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-020: Create Custom Role

**Rule:** Users with the `manage_roles` permission can create custom roles in their group. Custom roles have a name, optional description, and a set of permissions selected from the system catalog. Custom roles have `created_from_role_template_id = NULL`.

**Why:** Different groups have fundamentally different needs (D2). A corporate training group might need a "Mentor" role. A community of practice might need a "Facilitator" role. Stewards must be able to create roles tailored to their group without developer involvement.

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Code:** Create role modal/form component
- **Database:** `group_roles` INSERT + `group_role_permissions` INSERT

**Acceptance Criteria:**
- [ ] "Create Role" button visible only when `hasPermission('manage_roles')` is true
- [ ] Form requires a non-empty role name (trimmed, minimum 1 character)
- [ ] Form accepts optional description text
- [ ] Form includes permission picker (see B-RBAC-023)
- [ ] Created role has `created_from_role_template_id = NULL` (custom, not from template)
- [ ] Created role has `group_id` set to the current group
- [ ] Selected permissions are inserted into `group_role_permissions`
- [ ] Role name must be unique within the group (UNIQUE constraint on `group_id, name`)
- [ ] Duplicate name shows user-friendly error (not raw SQL error)
- [ ] Creating a role with zero permissions is valid (empty role)
- [ ] After creation, role list refreshes to show the new role
- [ ] Success feedback shown to user (toast/message)

**Examples:**

✅ **Valid:**
- Steward creates "Mentor" role with `view_others_progress`, `provide_feedback_to_members` → saved
- Steward creates "Auditor" role with zero permissions → valid (permissions can be added later)
- Steward creates role with description "Helps new members get started" → saved

❌ **Invalid:**
- Empty name submitted → BLOCKED (validation error)
- Duplicate name "Steward" in same group → BLOCKED (unique constraint, user-friendly message)
- Member without `manage_roles` creates a role → BLOCKED (permission check)

**Edge Cases:**
- **Scenario:** Role name with only whitespace
  - **Behavior:** Trimmed → empty → validation error
- **Scenario:** Very long role name (100+ characters)
  - **Behavior:** Accept but consider UI truncation (no hard DB limit unless added)

**Testing Priority:** 🔴 CRITICAL (core Sub-Sprint 4 feature)

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-021: Edit Role (Name, Description, Permissions)

**Rule:** Users with the `manage_roles` permission can edit any role in their group — including roles created from templates. Editing includes changing the name, description, and permission set. Changes to a group's role do NOT affect the template or other groups' roles.

**Why:** Per D2, template-based roles start with default permissions but can be customized after creation. A Steward might want to give their Guide role extra permissions or restrict the Observer role further. The template is a starting point, not a constraint.

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Code:** Edit role modal/form component
- **Database:** `group_roles` UPDATE + `group_role_permissions` INSERT/DELETE

**Acceptance Criteria:**
- [ ] "Edit" button on each role visible only when `hasPermission('manage_roles')` is true
- [ ] Can edit role name (same validation as create: non-empty, unique in group)
- [ ] Can edit role description
- [ ] Can add permissions (INSERT into `group_role_permissions`)
- [ ] Can remove permissions (DELETE from `group_role_permissions`)
- [ ] Changes to a group role do NOT affect the role template it was created from
- [ ] Changes do NOT affect the same-named role in other groups
- [ ] Permission picker pre-populates with current permissions (checkboxes checked)
- [ ] After saving, role list refreshes to show updated data
- [ ] Anti-escalation guardrail enforced (see B-RBAC-024)

**Examples:**

✅ **Valid:**
- Steward edits Guide role: adds `invite_members` → Guide in THIS group can now invite
- Steward edits Observer role: removes `view_forum` → Observer in THIS group can't view forum
- Steward renames "Member" to "Participant" in their group → other groups unaffected
- Steward edits a custom "Mentor" role's permissions → works same as template roles

❌ **Invalid:**
- Editing Guide in Group A changes Guide in Group B → VIOLATED (independence)
- Editing Guide in Group A changes Guide Role Template → VIOLATED (template immutability after copy)
- Member without `manage_roles` opens edit form → VIOLATED (permission check)

**Edge Cases:**
- **Scenario:** Steward renames "Steward" to something else
  - **Behavior:** Allowed. The last-steward protection trigger checks role name — if renamed, the trigger needs to be aware. **Decision needed:** Should the Steward role name be immutable, or should the trigger check by template origin?
  - **Current trigger:** Checks `group_roles.name = 'Steward'`. If renamed, trigger breaks.
  - **Recommendation:** Update trigger to check `created_from_role_template_id` = Steward template ID, not name.

- **Scenario:** Steward removes ALL permissions from a role that members hold
  - **Behavior:** Allowed. Those members effectively have zero group-context permissions (still have Tier 1 system permissions).
  - **Why:** Steward has authority over their group's role configuration.

**Testing Priority:** 🔴 CRITICAL (core Sub-Sprint 4 feature)

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-022: Delete Custom Role

**Rule:** Users with the `manage_roles` permission can delete custom roles (roles with `created_from_role_template_id = NULL`). Template-originated roles cannot be deleted. Deleting a role removes all `user_group_roles` assignments and `group_role_permissions` entries for that role (CASCADE).

**Why:** Custom roles may become obsolete. A "Mentor" role created for a specific initiative should be deletable when no longer needed. Template roles (Steward, Guide, Member, Observer) are protected because they're the group's structural foundation — deleting "Steward" would leave no one with management permissions.

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Code:** Delete role button/confirmation
- **Database:** `group_roles` DELETE (CASCADE to `user_group_roles`, `group_role_permissions`)

**Acceptance Criteria:**
- [ ] "Delete" button shown only on custom roles (`created_from_role_template_id IS NULL`)
- [ ] Template-originated roles show no delete button (even for users with `manage_roles`)
- [ ] Deletion requires confirmation (ConfirmModal with danger variant)
- [ ] Confirmation message shows how many members currently hold this role
- [ ] On delete, `user_group_roles` entries for this role are removed (CASCADE)
- [ ] On delete, `group_role_permissions` entries for this role are removed (CASCADE)
- [ ] After deletion, affected members lose the role (their other roles remain)
- [ ] Role list refreshes after deletion
- [ ] If deleted role was a member's ONLY role, they remain a group member but with zero group-context permissions (Tier 1 still applies)

**Examples:**

✅ **Valid:**
- Steward deletes custom "Mentor" role → role removed, 3 members who had it lose it
- Steward sees delete button on "Mentor" (custom) but NOT on "Steward" (template)
- Confirmation shows: "Delete 'Mentor' role? 3 members currently have this role."

❌ **Invalid:**
- Steward deletes "Steward" template role → BLOCKED (template roles are protected)
- Steward deletes "Guide" template role → BLOCKED
- Member without `manage_roles` sees delete button → VIOLATED

**Edge Cases:**
- **Scenario:** Delete a custom role that no members hold
  - **Behavior:** Allowed (clean delete, no member impact)
  - **Confirmation:** "Delete 'Auditor' role? No members currently have this role."

- **Scenario:** Delete a custom role that is the only role for some members
  - **Behavior:** Allowed. Those members become "role-less" members (still in group, have Tier 1 permissions only)
  - **Why:** Steward made an informed choice (confirmation showed member count)

**Testing Priority:** 🟡 HIGH

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-023: Permission Picker — Category-Grouped Selection

**Rule:** The permission picker UI displays all permissions from the system catalog, organized by category. Each permission has a checkbox, label (the permission name, human-readable), and description. The picker is used in both create and edit role flows.

**Why:** The system catalog has 42 permissions across 6 categories. Without organization, this is an overwhelming list of checkboxes. Grouping by category (group_management, journey_management, journey_participation, communication, feedback, platform_admin) makes the UI scannable and helps Stewards understand what they're granting (D1, D2).

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Code:** PermissionPicker component
- **Database:** `permissions` table (fetched and grouped by `category`)

**Acceptance Criteria:**
- [ ] Fetches all permissions from `permissions` table
- [ ] Groups permissions by `category` column
- [ ] Each category is a collapsible/expandable section with header
- [ ] Category headers show: category name + count of selected permissions (e.g., "Group Management (8/15)")
- [ ] Each permission shows: checkbox + human-readable name + description
- [ ] Checkboxes reflect current state (checked = granted, unchecked = not granted)
- [ ] User can toggle individual permissions
- [ ] "Select All" / "Deselect All" per category (convenience)
- [ ] Platform_admin permissions are hidden or clearly marked as system-only (not grantable by Stewards)
- [ ] Anti-escalation guardrail applied: permissions the current user doesn't hold are disabled/greyed out (see B-RBAC-024)
- [ ] Permission picker is a reusable component (used by both create and edit flows)
- [ ] Total selected count shown (e.g., "12 of 42 permissions selected")

**Examples:**

✅ **Valid:**
- Steward opens permission picker → sees 6 categories, each expandable
- "Group Management" section expanded → shows 15 checkboxes (including `manage_roles`)
- Steward checks `view_others_progress` → checkbox becomes checked, count updates
- Category header updates: "Journey Participation (3/5)" → "(4/5)"

❌ **Invalid:**
- All 42 permissions shown as flat list with no grouping → VIOLATED (poor UX)
- Steward can check `manage_platform_settings` (platform_admin) → VIOLATED (not grantable)
- No description shown for permissions → VIOLATED (Steward needs to understand what they're granting)

**Edge Cases:**
- **Scenario:** Platform_admin category permissions
  - **Behavior:** Hidden from permission picker (or shown as disabled with "System only" label)
  - **Why:** Regular Stewards cannot grant platform admin permissions; only Deusex can

- **Scenario:** Permission descriptions are missing in DB
  - **Behavior:** Show permission name as fallback (e.g., `invite_members` → "invite_members")
  - **Why:** Graceful degradation

**Testing Priority:** 🟡 HIGH

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-024: Anti-Escalation Guardrail

**Rule:** A user can only grant permissions that they themselves hold. When configuring a role's permissions, any permission the current user does NOT have is shown as disabled/greyed out and cannot be checked. This prevents privilege escalation.

**Why:** Without this guardrail, a Steward could create a role more powerful than their own (Q7 in design doc). For example, a Steward whose own role has had `delete_group` removed could still grant `delete_group` to a new role — effectively escalating privileges. The anti-escalation rule prevents this.

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Code:** Permission picker component + server-side validation
- **Database:** RLS policy or application-layer check on `group_role_permissions` INSERT

**Acceptance Criteria:**
- [ ] Permission picker disables (greyed out, non-clickable) any permission the current user does not hold
- [ ] Disabled permissions show tooltip/label: "You don't have this permission"
- [ ] Server-side validation: attempting to INSERT a permission the user doesn't hold into `group_role_permissions` is rejected
- [ ] Deusex users can grant ALL permissions (they hold all 42)
- [ ] If user has permission from Tier 1 (system group), they can grant it in Tier 2 (engagement group role)
- [ ] The check uses the user's effective permissions (union of all roles in this group + system groups)
- [ ] Anti-escalation applies to BOTH create and edit flows

**Examples:**

✅ **Valid:**
- Steward with 25 permissions → can grant any of those 25 to a custom role
- Steward whose `delete_group` was removed → `delete_group` checkbox is disabled in picker
- Deusex user → all 42 checkboxes are enabled
- User has `invite_members` from Tier 1 (FI Members) → can grant it in engagement group role

❌ **Invalid:**
- User without `moderate_forum` grants it to a custom role → VIOLATED (escalation)
- All checkboxes enabled for non-Deusex users → VIOLATED (missing guardrail)
- Guardrail only enforced client-side but not server-side → VIOLATED (bypassable)

**Edge Cases:**
- **Scenario:** Steward creates a role, then another Steward removes a permission from the first Steward's role. First Steward tries to edit the custom role and re-add that permission.
  - **Behavior:** The permission is now disabled in the picker (first Steward no longer holds it)
  - **Why:** Anti-escalation is always evaluated against current effective permissions, not historical

- **Scenario:** User has `manage_roles` but very few other permissions
  - **Behavior:** Can create roles but can only grant the few permissions they hold
  - **Why:** `manage_roles` grants the ability to manage role structure, not to escalate

**Testing Priority:** 🔴 CRITICAL (security — prevents privilege escalation)

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## B-RBAC-025: RLS Policies Use has_permission() for Role Management

**Rule:** RLS policies on `group_roles` and `group_role_permissions` tables use `has_permission()` function calls instead of `created_by_user_id` checks. This ensures role management access is controlled by the RBAC system itself.

**Why:** Current RLS policies on these tables check `created_by_user_id` (hardcoded to group creator). This means only the original group creator can manage roles, even if they're no longer a Steward or if another user has been promoted. Migrating to `has_permission('manage_roles')` checks makes role management RBAC-consistent.

**Verified by:**
- **Test:** `tests/integration/rbac/role-management.test.ts`
- **Database:** RLS policies on `group_roles` and `group_role_permissions`
- **Migration:** TBD

**Acceptance Criteria:**
- [ ] `group_roles` INSERT policy: allows when user has `manage_roles` permission in the group
- [ ] `group_roles` UPDATE policy (NEW): allows when user has `manage_roles` permission in the group
- [ ] `group_roles` DELETE policy (NEW): allows when user has `manage_roles` permission AND role is custom (`created_from_role_template_id IS NULL`)
- [ ] `group_role_permissions` INSERT policy: allows when user has `manage_roles` permission in the role's group
- [ ] `group_role_permissions` DELETE policy (NEW): allows when user has `manage_roles` permission in the role's group
- [ ] Old `created_by_user_id` checks are removed from these policies
- [ ] SELECT policies remain unchanged (all active members can view)
- [ ] Anti-escalation enforced at RLS level: user can only INSERT permissions they themselves hold

**Examples:**

✅ **Valid:**
- Steward (with `manage_roles`) inserts new `group_roles` row → allowed by RLS
- Steward updates `group_roles.name` → allowed by RLS (UPDATE policy)
- Steward deletes custom role → allowed by RLS (DELETE policy, custom role check)
- Steward inserts `group_role_permissions` row for a permission they hold → allowed

❌ **Invalid:**
- Member (without `manage_roles`) tries to INSERT into `group_roles` → BLOCKED by RLS
- Steward tries to DELETE a template-originated role → BLOCKED by RLS (template protection)
- User tries to INSERT a permission they don't hold into `group_role_permissions` → BLOCKED (anti-escalation)
- Original group creator who is no longer Steward tries to manage roles → BLOCKED (no longer has `manage_roles`)

**Testing Priority:** 🔴 CRITICAL (security — RLS is the last line of defense)

**History:**
- 2026-02-16: Created (Sub-Sprint 4)

---

## Notes

**Domain Code:** RBAC

**Sub-Sprint 1 Behaviors:**
- B-RBAC-001: Permission Catalog Integrity (31 permissions, D22)
- B-RBAC-002: Group Type Classification (system/personal/engagement)
- B-RBAC-003: Personal Group Creation on Signup
- B-RBAC-004: Role Template Permission Mapping (4 templates with permissions)
- B-RBAC-005: Group Role Permission Initialization (template → instance copy)
- B-RBAC-006: System Groups Exist (FI Members, Visitor, Deusex)
- B-RBAC-007: Role Renaming (Steward/Guide terminology)

**Sub-Sprint 2 Behaviors:**
- B-RBAC-008: Engagement Group Permission Resolution (`has_permission()` Tier 2 logic)
- B-RBAC-009: System Group Permission Resolution (Tier 1 logic, additive)
- B-RBAC-010: Permission Check Edge Cases (fail closed, invalid inputs)
- B-RBAC-011: usePermissions() Hook (fetch permission set, cache in React state)
- B-RBAC-012: Deusex Has All Permissions (validates RBAC model, no bypasses)

**Sub-Sprint 3 Behaviors:**
- B-RBAC-013: Group Detail Page — Permission-Gated Actions (usePermissions replaces isLeader)
- B-RBAC-014: Edit Group Page — Permission-Gated Access (edit_group_settings check)
- B-RBAC-015: Forum Moderation — Permission-Gated Delete (moderate_forum replaces isLeader)
- B-RBAC-016: Enrollment Modal — Permission-Based Group Enrollment (enroll_group_in_journey replaces role name query)
- B-RBAC-017: No Remaining isLeader or Role-Name Checks (definition of done)

**Sub-Sprint 4 Behaviors:**
- B-RBAC-018: manage_roles Permission Exists in Catalog
- B-RBAC-019: View Roles in Group (Role List)
- B-RBAC-020: Create Custom Role
- B-RBAC-021: Edit Role (Name, Description, Permissions)
- B-RBAC-022: Delete Custom Role
- B-RBAC-023: Permission Picker — Category-Grouped Selection
- B-RBAC-024: Anti-Escalation Guardrail
- B-RBAC-025: RLS Policies Use has_permission() for Role Management

**Design Decisions Referenced:**
- D1 (Three-Layer Architecture), D2 (Self-Service Customization), D3 (Deusex is a Group)
- D4 (RLS Migration), D5 (Two-Tier Scoping), D6 (FI Members Group), D7 (Groups Join Groups)
- D9 (Personal Group = Identity), D12 (Union Semantics), D14 (Role Selector "Act as...")
- D15 (Group-to-Group Only Schema), D17 (Four Default Roles), D18a (Permission Grid)
- D20 (System-Level Grids), D22 (Seeded Permissions Delta)
- Q4 (`has_permission()` function design), Q5 (`usePermissions()` hook design)
