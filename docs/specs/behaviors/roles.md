# Role Management Behaviors

> **Purpose:** Document the fundamental rules and guarantees for role assignment, removal, and permission enforcement within groups.
> **Domain Code:** ROL

---

## B-ROL-001: Role Assignment Permissions ✅

**Rule:** Only active Group Leaders can assign or remove roles within their group. Members cannot assign roles to others, and non-members cannot assign or remove roles at all. The sole exception is bootstrap: the group creator may self-assign the first Group Leader role when the group has no leader yet.

**Why:** Roles determine what members can do inside a group (edit settings, invite members, manage others). Allowing any member to self-assign or grant roles would break the permission hierarchy entirely. Concentrating role management with Group Leaders ensures controlled, intentional role escalation.

**Verified by:**
- **Test:** `tests/integration/groups/last-leader.test.ts` — covers role removal (DELETE side) ✅
- **Code:** `components/groups/AssignRoleModal.tsx` — UI for assigning roles
- **Code:** `app/groups/[id]/page.tsx` — role remove (× button) + isLeader guard
- **Database:** RLS INSERT policy `"Group Leaders can assign roles in their groups"` on `user_group_roles`
- **Database:** RLS DELETE policy `"Group Leaders can remove roles in their groups"` on `user_group_roles`
- **Database:** Trigger `validate_user_group_role()` — ensures assigned role belongs to the group
- **Database:** UNIQUE constraint `(user_id, group_id, group_role_id)` — prevents duplicate assignments
- **Migration:** `supabase/migrations/20260211182333_fix_user_group_roles_insert_policy.sql`

**Acceptance Criteria:**
- [x] Group Leaders can assign any role from the group's role list to any active member
- [x] Group Leaders can remove any role from any member (subject to last-leader protection)
- [x] Non-leaders cannot INSERT into `user_group_roles` (RLS blocks with 42501)
- [x] Non-members cannot INSERT into `user_group_roles` (RLS blocks — not a leader)
- [x] A member can hold multiple roles simultaneously in the same group
- [x] The same role cannot be assigned twice to the same member (UNIQUE constraint)
- [x] The assigned role must belong to the same group as the membership (trigger enforces)
- [x] Bootstrap: group creator can self-assign the first Group Leader role when no leader exists
- [x] Bootstrap is one-time only: once a Group Leader exists, bootstrap path is blocked
- [x] UI filters out roles the member already holds (no duplicate assignment attempt)
- [x] UI hides × button for the last Group Leader (last-leader protection — B-GRP-001)
- [ ] Non-leader members cannot open AssignRoleModal (UI guard — visually enforced by isLeader check)

**Examples:**

✅ **Valid:**
- Group Leader opens AssignRoleModal for a member → Selects "Travel Guide" → Assigns → Success
- Group Leader clicks × on a member's "Member" role badge → Role removed → Success
- Group Leader assigns both "Travel Guide" and "Group Leader" to the same member → Both succeed (multiple roles allowed)
- New group created → creator self-assigns Group Leader role (bootstrap) → Success
- Group Leader removes their own leader role when another leader exists → Success

❌ **Invalid:**
- Regular member attempts `INSERT INTO user_group_roles` via API → **BLOCKED** (RLS 42501)
- Non-member attempts to assign roles via API → **BLOCKED** (not a group leader — RLS 42501)
- Group Leader assigns a role from a different group → **BLOCKED** (trigger: role must belong to same group)
- Assigning a role the member already holds → **BLOCKED** (UNIQUE constraint violation)
- Group Leader removes the last Group Leader role → **BLOCKED** (B-GRP-001 trigger)
- Bootstrap attempted when group already has a leader → **BLOCKED** (`group_has_leader()` returns true)

**Edge Cases:**

- **Scenario:** User is promoted to Group Leader, then demotes themselves (removes own leader role)
  - **Behavior:** Allowed only if another Group Leader exists; blocked if they are the last
  - **Why:** Last-leader protection (B-GRP-001) applies regardless of who initiates the removal

- **Scenario:** Group Leader is removed from the group (membership deleted) while being the only leader
  - **Behavior:** Leader membership deletion is blocked while they hold the last Group Leader role
  - **Why:** Deletion of membership would cascade-delete the last leader role, which the trigger prevents

- **Scenario:** Group Leader assigns a role to a member who is still in `status='invited'` (not yet active)
  - **Behavior:** INSERT succeeds at DB level (no membership status check in role policy); functionally
    the role exists but the member cannot act on it until they accept the invitation
  - **Why:** Role assignment and membership acceptance are independent operations; invited users
    rarely receive roles before joining (UI only shows active members)

- **Scenario:** New group just created — no leader role assignment yet (bootstrap window)
  - **Behavior:** Only the group creator can self-assign the Group Leader role
  - **Why:** `group_has_leader()` returns false until first leader role is assigned;
    any other user is blocked (they are not the group creator and there is no leader yet)

- **Scenario:** Two Group Leaders simultaneously try to assign the same role to the same member
  - **Behavior:** One succeeds, the other gets a UNIQUE constraint violation
  - **Why:** `(user_id, group_id, group_role_id)` unique constraint prevents duplicate assignments

- **Scenario:** Role is deleted from `group_roles` while members hold it
  - **Behavior:** ON DELETE CASCADE removes all `user_group_roles` rows for that role
  - **Why:** Role deletion (currently admin-only) automatically cleans up assignments; last-leader
    trigger fires and may block if it would remove the last Group Leader

**Database Enforcement:**

```sql
-- INSERT: Group Leaders or bootstrap
CREATE POLICY "Group Leaders can assign roles in their groups"
ON user_group_roles FOR INSERT TO authenticated
WITH CHECK (
  -- Normal: Group Leader assigns role in their group
  (is_active_group_leader(group_id) AND assigned_by_user_id = get_current_user_profile_id())
  OR
  -- Bootstrap: creator self-assigns first Group Leader role (no leader exists yet)
  (user_id = get_current_user_profile_id()
   AND assigned_by_user_id = get_current_user_profile_id()
   AND NOT group_has_leader(group_id))
);

-- DELETE: Group Leaders only (last-leader trigger still applies)
CREATE POLICY "Group Leaders can remove roles in their groups"
ON user_group_roles FOR DELETE TO authenticated
USING (is_active_group_leader(group_id));
```

**Key Helper Functions (SECURITY DEFINER):**
- `is_active_group_leader(group_id)` — checks if current user is a Group Leader in the group
- `get_current_user_profile_id()` — returns current user's `public.users.id` (avoids nested RLS)
- `group_has_leader(group_id)` — checks if any Group Leader role exists (bootstrap guard)

**Related Behaviors:**
- B-GRP-001: Last Leader Protection (role removal is gated by this trigger)
- B-GRP-004: Group Editing Permissions (same `is_active_group_leader()` check)
- B-GRP-005: Group Deletion Rules (Group Leader required to delete)

**Testing Priority:** 🔴 CRITICAL (security — role escalation prevention, permission hierarchy)

**Test Coverage:**
- ✅ INSERT (assign) side: covered by `tests/integration/groups/role-assignment.test.ts` (6 tests)
- ✅ DELETE (remove) side: covered by `tests/integration/groups/last-leader.test.ts` (indirectly)

**History:**
- 2026-01-26: Implemented (v0.2.6.2) — AssignRoleModal + role assignment UI
- 2026-02-11: RLS policies fixed (v0.2.12) — original INSERT policy was self-assign-only placeholder;
  replaced with Group Leader policy + bootstrap; DELETE policy added (was missing entirely)
- 2026-02-11: Documented

---

## B-ROL-002: Role Template Initialization ✅

**Rule:** When a group is created, the system automatically creates a `group_roles` instance named "Group Leader" from the "Group Leader Role Template" seed record, and immediately assigns that role to the group creator.

**Why:** Every group must start with at least one Group Leader (B-GRP-001). Deriving the role from a template record establishes a traceable lineage between the live role and the platform's canonical role definitions, enabling future feature work (e.g., inheriting permissions from the template).

**Verified by:**
- **Code:** `components/groups/GroupCreateForm.tsx` — steps 3–5 of the group creation flow
- **Database:** `role_templates` seed data (initial schema — "Group Leader Role Template")
- **Database:** `group_roles.created_from_role_template_id` FK → `role_templates.id`
- **Database:** RLS SELECT policy on `role_templates` (USING(true) — all authenticated users can read)
- **Database:** RLS SELECT policy on `group_templates` (USING(true) — dropdown population)
- **Migration:** `supabase/migrations/20260211183842_add_select_policies_for_catalog_tables.sql`

**Creation Flow (5 steps in GroupCreateForm.tsx):**

```
Step 1: INSERT INTO groups (created_from_group_template_id = selectedTemplate)
Step 2: INSERT INTO group_memberships (status='active') — creator becomes active member
Step 3: SELECT FROM role_templates WHERE name = 'Group Leader Role Template'
Step 4: INSERT INTO group_roles (name='Group Leader', created_from_role_template_id = template.id)
Step 5: INSERT INTO user_group_roles (user_id=creator, group_role_id=new_role.id)  ← bootstrap
```

**Acceptance Criteria:**
- [x] Every newly created group has exactly one `group_roles` row named "Group Leader"
- [x] That role's `created_from_role_template_id` references the "Group Leader Role Template"
- [x] The group creator is assigned the Group Leader role in `user_group_roles` on creation
- [x] `group_templates` catalog is readable by all authenticated users (SELECT policy USING(true))
- [x] `role_templates` catalog is readable by all authenticated users (SELECT policy USING(true))
- [ ] Other template roles (Travel Guide, Member) are NOT automatically created — by design (see Note)

**Examples:**

✅ **Valid:**
- User selects "Small Team Template", enters name → Creates → Group has Group Leader role, creator is assigned → Success
- User selects any template → Same result (template choice only stored, not used to expand roles — see Note)
- Group created → `role_templates` table is readable → Dropdown loads → Success

❌ **Invalid:**
- Group creation attempted when `role_templates` has no "Group Leader Role Template" → **Step 3 throws** (`.single()` returns error)
- Group creation attempted when `role_templates` SELECT policy is missing → **Step 3 returns null** (RLS blocks catalog read) → Creation fails with "no rows found"

**Note — Partial Implementation:**

The schema includes a `group_template_roles` junction table intended to map each `group_template` to multiple `role_templates`. This would allow automatic expansion of all template roles when creating a group (e.g., Small Team Template → Group Leader + Travel Guide + Member).

**Currently, the app only creates the Group Leader role** (hardcoded lookup by name). The Travel Guide and Member role instances are NOT created at group initialization. They are created on demand when a Group Leader later assigns those roles (which creates the `group_roles` row implicitly via the assignment flow — actually, `group_roles` must exist before assignment, so roles are added manually by a Group Leader or by future template expansion).

Full template-driven role initialization is deferred to Phase 2.

**Related Behaviors:**
- B-ROL-001: Role Assignment Permissions (bootstrap path depends on this initialization)
- B-GRP-001: Last Leader Protection (relies on Group Leader existing after creation)
- B-GRP-005: Group Deletion Rules (group deletion cascades to group_roles and user_group_roles)

**Testing Priority:** 🟡 HIGH (indirectly tested by group creation; no dedicated test)

**History:**
- 2026-01-25: Implemented (v0.2.3) — initial group creation flow
- 2026-02-11: Catalog SELECT policies added (v0.2.12) — group_templates, role_templates now readable
- 2026-02-11: Documented

---

## B-ROL-003: Role Visibility Rules ✅

**Rule:** Users can only view role assignments (`user_group_roles` rows) in groups where they are an active member (status='active'). Invited, paused, or removed users cannot see role assignments, and non-members cannot see any.

**Why:** Role assignments within a group are internal group information. Exposing them to non-members would leak data about group structure and personnel hierarchy. Invited-but-not-yet-active users are considered outside the group for visibility purposes.

**Verified by:**
- **Database:** RLS SELECT policy `"Users can view role assignments in their groups"` on `user_group_roles`
- **Migration:** `supabase/migrations/20260125_1_group_rls_policies.sql` (lines 184–197)
- **Code:** `app/groups/[id]/page.tsx` — member list renders roles fetched via this policy

**Policy:**

```sql
CREATE POLICY "Users can view role assignments in their groups"
ON user_group_roles
FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM group_memberships
    WHERE user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  )
);
```

**Acceptance Criteria:**
- [x] Active members can see all role assignments in their groups
- [x] Invited users (status='invited') CANNOT see role assignments
- [x] Removed users (status='removed') CANNOT see role assignments
- [x] Non-members CANNOT see role assignments in any group they don't belong to
- [x] A user who belongs to multiple groups sees only the role assignments for those groups
- [x] Unauthenticated requests return no rows

**Examples:**

✅ **Valid:**
- Active member of Group A queries `user_group_roles` → Sees all role assignments for Group A → Success
- Active member of Groups A and B queries `user_group_roles` → Sees assignments for both groups → Success
- Group Leader checks member roles before assigning new roles → Gets accurate current assignment list → Success

❌ **Invalid:**
- Non-member queries `user_group_roles` for a private group → **Returns empty (RLS filters)** ← Not a hard error, just empty
- Invited user (not yet accepted) queries role assignments → **Returns empty (status != 'active')**
- User queries another group's role assignments → **Returns empty (not a member)**

**Edge Cases:**

- **Scenario:** User is in multiple groups — one public, one private
  - **Behavior:** Can see role assignments for both; the `IN (SELECT group_id ...)` clause includes both
  - **Why:** Policy checks membership across all groups for the user, not per-group

- **Scenario:** Group changes a member's status from 'active' to 'removed'
  - **Behavior:** That user immediately loses visibility of the group's role assignments
  - **Why:** RLS re-evaluates on every query; status='active' filter applied at query time

- **Scenario:** Group Leader removes their own leader role (while another exists)
  - **Behavior:** They can still see role assignments (they remain an active member)
  - **Why:** Visibility is based on group membership, not on role held

**Test Coverage:**
- ✅ Active member visibility: `tests/integration/groups/role-assignment.test.ts` (B-ROL-003 test 1)
- ✅ Non-member blocked: `tests/integration/groups/role-assignment.test.ts` (B-ROL-003 test 2)

**Related Behaviors:**
- B-GRP-003: Group Visibility Rules (same membership-based access pattern)
- B-ROL-001: Role Assignment Permissions (INSERT/DELETE complement to this SELECT rule)

**Testing Priority:** 🟡 HIGH (security — prevents role hierarchy leakage)

**History:**
- 2026-01-25: Implemented (v0.2.3) — initial RLS policies
- 2026-02-11: Documented

---

## Notes

**Implemented Behaviors:**
- ✅ B-ROL-001: Role Assignment Permissions
- ✅ B-ROL-002: Role Template Initialization
- ✅ B-ROL-003: Role Visibility Rules

**Test Coverage:**
- 3 / 3 behaviors documented
- B-ROL-001 INSERT (assign) side: 6 tests in `tests/integration/groups/role-assignment.test.ts` ✅
- B-ROL-001 DELETE (remove) side: covered indirectly via `last-leader.test.ts` ✅
- B-ROL-003 SELECT visibility: 2 tests in `tests/integration/groups/role-assignment.test.ts` ✅

**Next Behaviors to Document:**
- B-ROL-004: Role Permission Inheritance (what a role allows — deferred to Phase 2)
