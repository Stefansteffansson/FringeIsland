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

**Future Sub-Sprints (behaviors TBD):**
- Sub-Sprint 2: `has_permission()` function, RLS migration
- Sub-Sprint 3: `usePermissions()` hook, UI migration from `isLeader`
- Sub-Sprint 4: Group-to-group membership, transitive resolution, circularity prevention

**Design Decisions Referenced:**
- D1 (Three-Layer Architecture), D2 (Self-Service Customization), D3 (Deusex is a Group)
- D5 (Two-Tier Scoping), D6 (FI Members Group), D7 (Groups Join Groups)
- D9 (Personal Group = Identity), D15 (Group-to-Group Only Schema)
- D17 (Four Default Roles), D18a (Permission Grid), D20 (System-Level Grids)
- D22 (Seeded Permissions Delta)
