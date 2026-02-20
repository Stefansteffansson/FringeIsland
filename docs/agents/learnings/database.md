# Database Agent — Learning Journal

**Purpose:** Running log of schema, migration, and RLS discoveries.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/database-agent.md` (playbook)

---

## Entries

### 2026-02-16: Nested RLS in INSERT policies with anti-escalation
When an INSERT policy on table A uses subqueries on tables B and C (e.g., `SELECT group_id FROM group_roles WHERE id = group_role_id`), those subqueries are subject to RLS on B and C. This silently blocks legitimate inserts. Fix: create SECURITY DEFINER helper functions (`get_group_id_for_role()`, `get_permission_name()`) that bypass RLS. This is the second time we hit nested RLS (first was `has_permission`). Always use helpers for cross-table lookups in policies.
> Promoted to playbook? Partially — already in MEMORY.md, now confirmed with second occurrence.

### 2026-02-16: Trigger should check template ID, not role name
The `prevent_last_leader_removal` trigger was checking `gr.name = 'Steward'`. If the Steward role is renamed, the trigger silently stops protecting. Fix: check `created_from_role_template_id` against the Steward Role Template ID. This is more robust and aligns with the template system design. All tests that create "Steward" roles must now include `created_from_role_template_id`.
> Promoted to playbook? Not yet

### 2026-02-16: Adding a permission bumps many hardcoded counts in tests
Adding `manage_roles` (41→42) caused 13 test failures across 8 suites: permission catalog count, Steward template count, Deusex count, total template permissions, group_management category count. When adding permissions, grep for the old count across all test files and update systematically.
> Promoted to playbook? Not yet

### 2026-02-16: RBAC Sub-Sprint 1 — Schema discoveries
- `group_role_permissions` and `role_template_permissions` have composite PKs, no `id` column. All queries must use `.select('group_role_id, permission_id')` not `.select('id')`.
- `group_roles` table has no `description` column. Don't try to INSERT descriptions.
- Role renaming requires updating ALL functions and RLS policies that hardcode role names. Found 6+ functions and 2+ inline policies referencing 'Group Leader' beyond the 3 core functions.
- `handle_new_user()` trigger extension (personal group + FI Members enrollment) causes `notify_role_assigned` trigger to fire for the new user_group_roles inserts. Tests that count notifications must account for this.
- `copy_template_permissions` trigger (AFTER INSERT on group_roles) auto-populates `group_role_permissions` when `created_from_role_template_id` is set. Uses `ON CONFLICT DO NOTHING` for idempotency.
→ Promoted to playbook? Not yet

### 2026-02-13: Journal initialized
Starting point. Known patterns captured in playbook from prior sessions:
- Always set search_path = '' on public functions
- PostgREST INSERT...RETURNING triggers SELECT policy
- Catalog tables need explicit SELECT USING (true)
- SECURITY DEFINER for helper functions, never for data-modifying functions
- Nested RLS: use SECURITY DEFINER to bypass inner checks

→ Promoted to playbook? ✅ (all in existing playbook)

---

### 2026-02-15: Column-level UPDATE restriction via SECURITY DEFINER helper

For the conversations table, each participant can only update their own `last_read_at` column. Standard RLS WITH CHECK can't express "column X didn't change." Solution: a `can_update_conversation()` SECURITY DEFINER function that compares old vs new values using `IS DISTINCT FROM` and rejects changes to the other participant's column.

**Pattern:** When RLS needs column-level restrictions on UPDATE, use a SECURITY DEFINER helper that reads the existing row and validates which columns changed.

→ Promoted to playbook? Not yet (first use of this pattern)

---

### 2026-02-14: Notification System — SECURITY DEFINER trigger functions (controlled INSERT bypass)

**Context:** Implementing notification_system migration (20260214161709).

**Pattern confirmed:** SECURITY DEFINER IS appropriate on trigger functions that INSERT into a
table with no authenticated INSERT policy. This is the standard PostgreSQL/Supabase pattern for
"controlled write path" — only the trigger (running as superuser via SECURITY DEFINER) can
write to the table; the application layer has no INSERT policy and therefore cannot bypass
the trigger logic.

**Clarification to playbook note:** "SECURITY DEFINER: never for data-modifying functions" applies
to functions called directly by application code. Trigger functions that are the SOLE write path
for a table are an intentional exception — they are the gate, not the bypass.

**Trigger WHEN clause at trigger level:** PostgreSQL WHEN clauses on AFTER triggers are evaluated
before the function body runs, which avoids function call overhead for non-matching rows. Used for:
- `WHEN (NEW.status = 'invited')` on INSERT trigger
- `WHEN (OLD.status = 'invited' AND NEW.status = 'active')` on UPDATE trigger
DELETE case handled inside the function body (multiple status values to check).

**auth.uid() NULL in triggers:** Confirmed design decision: when auth.uid() is NULL (CASCADE,
service role, background job), `notify_invitation_declined_or_member_change()` defaults to
`member_removed` type (treats as "removed by another user"), not `member_left`. Safe default.

**notify_role_removed skips cascade:** If group is deleted (and user_group_roles CASCADE-deletes),
the trigger still fires AFTER DELETE. The function checks if the group still exists and skips
notification if it does not — avoids spurious "role removed" noise during group deletion cleanup.

→ Promoted to playbook? No (implementation detail, not a new cross-cutting pattern)

### 2026-02-14: Group Forum System migration (20260214161716)

**Pattern confirmed: RBAC-compatible permission stub**
`has_forum_permission(group_id, permission_name)` is a SECURITY DEFINER, STABLE function that encapsulates role-name logic. RLS policies call the function by name; when RBAC ships only the function body changes, not the 4 policies. This is the recommended pattern for all new tables added during RBAC transition.

**view_forum logic:** `WHEN 'view_forum' THEN RETURN TRUE` fires after the active-membership guard at the top of the function, so unauthenticated and non-member callers are still rejected before reaching that branch. All active members (any role) get view access.

**Flat-threading trigger:** `enforce_flat_threading()` runs BEFORE INSERT and validates two things when `parent_post_id IS NOT NULL`:
  1. The parent must itself have `parent_post_id IS NULL` (no nesting beyond 1 level).
  2. The parent must share the same `group_id` (no cross-group replies).

**No new permission INSERTs needed:** The 4 `communication.forum.*` permissions were seeded in the initial migration. Design doc confirmed this explicitly.

**Dual UPDATE policies:** PostgreSQL evaluates multiple UPDATE policies with OR logic. `forum_posts_update_own` and `forum_posts_moderate_permission` coexist correctly — either can authorize an UPDATE.

**CHECK constraint on content:** `CHECK (length(trim(content)) > 0)` prevents empty/whitespace-only posts at the DB level, complementing UI validation.

→ Promoted to playbook? Pending Sprint Agent review.

### 2026-02-16: Bootstrap pattern for chicken-and-egg RLS during group creation
Group creation requires inserting into `group_roles`, but the INSERT RLS policy requires `manage_roles` permission which the creator doesn't have yet (roles don't exist). Solution: add a "bootstrap case" to the INSERT policy — `is_group_creator(group_id) AND NOT group_has_leader(group_id)`. This pattern works because once the Steward role is created and assigned, the bootstrap path is no longer matched. The `is_group_creator()` function must be SECURITY DEFINER to avoid nested RLS on the groups table.
> Promoted to playbook? Not yet

### 2026-02-16: copy_template_permissions trigger must be SECURITY DEFINER
The `copy_template_permissions_on_role_create()` trigger copies permissions from a role template to a new group role. During group creation bootstrap, the creator has no permissions, so the trigger's INSERT into `group_role_permissions` is blocked by RLS. Fix: make the trigger function SECURITY DEFINER. This is a system operation (template copying), not a user action, so SECURITY DEFINER is appropriate per the established pattern.
> Promoted to playbook? Not yet

### 2026-02-16: Auto-assign Member role via DB trigger, not client-side
Client-side role assignment after invitation acceptance fails because the newly-accepted member has no `assign_roles` permission, and the bootstrap case doesn't apply (Steward already exists). Solution: AFTER UPDATE trigger on `group_memberships` that fires when `OLD.status = 'invited' AND NEW.status = 'active'`, finds the Member role template instance for the group, and assigns it. The trigger is SECURITY DEFINER to bypass RLS.
> Promoted to playbook? Not yet

### 2026-02-16: BEFORE DELETE trigger to capture data before CASCADE
The `notify_group_deleted` trigger must fire BEFORE DELETE on groups, not AFTER, because CASCADE will delete `group_memberships` rows before an AFTER trigger runs. The BEFORE trigger can still read membership data. The notification's `group_id` will be SET NULL by CASCADE, but the group name is pre-rendered in the notification title/body so that's fine.
> Promoted to playbook? Not yet

### 2026-02-16: can_assign_role() — DB-level anti-escalation for role assignment
The `user_group_roles` INSERT RLS policy now calls `can_assign_role(user_id, group_role_id)` which checks: (1) user has `assign_roles` permission via `has_permission()`, and (2) anti-escalation — every permission on the target role must be held by the assigning user. This replaces the old `is_active_group_leader()` check and is the correct RBAC pattern.
> Promoted to playbook? Not yet

### 2026-02-20: PostgREST DELETE...RETURNING requires SELECT visibility

When PostgREST executes a DELETE, it issues `DELETE ... RETURNING *`. This means the row must pass BOTH the DELETE policy AND a SELECT policy. An admin DELETE policy existed on `group_memberships`, but the only SELECT policy checked group membership — admins who aren't group members couldn't see the rows, so DELETE silently returned 0 rows. Fix: add a parallel admin SELECT policy on any table where admin DELETE is needed.

**Pattern:** For every admin DELETE policy, ensure a matching admin SELECT policy exists on the same table.

> Promoted to playbook? Not yet

### 2026-02-20: Trigger functions querying RLS-protected tables need SECURITY DEFINER

Two existing triggers (`validate_user_group_role`, `prevent_last_leader_removal`) query `group_roles` to validate operations. When an admin assigns a role in a group they don't belong to, RLS blocks the trigger from seeing `group_roles` rows, causing false validation failures ("Role X does not belong to group Y"). Fix: make these trigger functions SECURITY DEFINER. This extends the existing pattern: triggers that enforce business rules must bypass RLS to see all relevant data.

> Promoted to playbook? Not yet

### 2026-02-20: auth.refresh_tokens.user_id is varchar, not UUID

The `auth.refresh_tokens` table stores `user_id` as `varchar`, not `UUID`. Comparing a UUID variable directly fails with `operator does not exist: character varying = uuid`. Fix: explicit cast `WHERE user_id = v_target_auth_id::text`. The `auth.sessions` table uses UUID normally — no cast needed there.

> Promoted to playbook? Not yet

### 2026-02-20: prevent_last_leader_removal needs name fallback, not just template ID

The trigger was only checking `created_from_role_template_id` to identify Steward roles. Roles created without templates (e.g., in test setup) were not recognized as Steward roles, allowing the last Steward to be removed. Fix: check BOTH template ID AND `name = 'Steward'` as fallback. This partially reverts the 2026-02-16 decision to only check template ID.

> Promoted to playbook? Not yet

<!-- Append new entries below this line -->
