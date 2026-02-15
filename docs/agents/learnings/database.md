# Database Agent — Learning Journal

**Purpose:** Running log of schema, migration, and RLS discoveries.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/database-agent.md` (playbook)

---

## Entries

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

<!-- Append new entries below this line -->
