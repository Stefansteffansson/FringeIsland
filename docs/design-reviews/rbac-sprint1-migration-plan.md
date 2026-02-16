# RBAC Sub-Sprint 1: Migration Plan (Design Review)

**Phase:** 3 — Design Review
**Date:** 2026-02-16
**Input:** 50 failing tests (7 suites), RBAC design doc (D1-D22)

---

## Gap Found: Permission Count Error in Design Doc

**D22 claims:** "30 permissions currently, final: 31 (was 30: +2 added, -1 removed, 1 renamed)"

**Actual DB count:** 40 permissions seeded in `20260120_initial_schema.sql`:
- `group_management`: 13
- `journey_management`: 9
- `journey_participation`: 5
- `communication`: 5
- `feedback`: 3
- `platform_admin`: **5** (not 4 — includes `view_platform_analytics`)

**D22's own category totals** (14+10+5+5+2+4) add up to **40**, not 31. The "31" total is a math error.

**Decision needed:** Is `view_platform_analytics` kept or removed? D22's final table omits it but doesn't list it as a removal.

**Proposed resolution:** Keep `view_platform_analytics` (no reason to remove it). Final count:
- 40 current - 1 (remove `view_member_feedback`) + 2 (add `browse_journey_catalog`, `browse_public_groups`) = **41 permissions**
- **Tests must be updated** from 31 → 41

### Updated Category Counts (Final Target)

| Category | Current | Changes | Final |
|----------|---------|---------|-------|
| `group_management` | 13 | +1 (`browse_public_groups`) | 14 |
| `journey_management` | 9 | +1 (`browse_journey_catalog`) | 10 |
| `journey_participation` | 5 | rename `track_group_progress` → `view_group_progress` | 5 |
| `communication` | 5 | none | 5 |
| `feedback` | 3 | -1 (`view_member_feedback`) | 2 |
| `platform_admin` | 5 | none | 5 |
| **Total** | **40** | **+2 -1** | **41** |

---

## Migration Plan

Three migrations, ordered by dependency:

### Migration 1: Schema + Permission Catalog

**Depends on:** Nothing (first migration)

**Changes:**

1. **Add `group_type` column to `groups`**
   ```sql
   ALTER TABLE groups ADD COLUMN group_type TEXT NOT NULL DEFAULT 'engagement';
   ALTER TABLE groups ADD CONSTRAINT groups_group_type_check
     CHECK (group_type IN ('system', 'personal', 'engagement'));
   ```

2. **Update permission catalog (D22)**
   ```sql
   -- Rename
   UPDATE permissions SET name = 'view_group_progress',
     description = 'View group-wide progress overview'
     WHERE name = 'track_group_progress';

   -- Remove
   DELETE FROM permissions WHERE name = 'view_member_feedback';

   -- Add
   INSERT INTO permissions (name, description, category) VALUES
     ('browse_journey_catalog', 'Browse the journey catalog', 'journey_management'),
     ('browse_public_groups', 'Discover and browse public groups', 'group_management');
   ```

3. **Update role templates (D17, D22)**
   ```sql
   -- Rename Group Leader → Steward
   UPDATE role_templates SET name = 'Steward Role Template',
     description = 'Long-term group care — membership, settings, structure'
     WHERE name = 'Group Leader Role Template';

   -- Rename Travel Guide → Guide
   UPDATE role_templates SET name = 'Guide Role Template',
     description = 'Journey facilitation — content expertise, progress, feedback'
     WHERE name = 'Travel Guide Role Template';

   -- Remove Platform Admin template (becomes Deusex group role)
   DELETE FROM role_templates WHERE name = 'Platform Admin Role Template';
   ```

4. **Seed `role_template_permissions` (D18a grid)**
   - Steward: 24 permissions
   - Guide: 15 permissions
   - Member: 12 permissions
   - Observer: 7 permissions
   - Total: 58 rows

**Tests addressed:** B-RBAC-001 (permission catalog), B-RBAC-002 (group_type column), B-RBAC-004 (template permissions), B-RBAC-007 (template renaming)

---

### Migration 2: System Groups + FI Members Enrollment

**Depends on:** Migration 1 (group_type column, permissions, templates)

**Changes:**

1. **Create 3 system groups**
   ```sql
   INSERT INTO groups (name, group_type, created_by_user_id, is_public, ...)
   VALUES
     ('FringeIsland Members', 'system', <system_user_id>, false, ...),
     ('Visitor', 'system', <system_user_id>, false, ...),
     ('Deusex', 'system', <system_user_id>, false, ...);
   ```

   **Note:** `created_by_user_id` is NOT NULL. System groups need a creator. Options:
   - Use the first existing user (query at migration time)
   - Create a dedicated "system" user
   - **Recommended:** Use the first user in the `users` table (the platform creator)

2. **Create roles in system groups**
   - FringeIsland Members → "Member" role (8 permissions per D20)
   - Visitor → "Guest" role (5 permissions per D20)
   - Deusex → "Deusex" role (ALL 41 permissions)

3. **Populate `group_role_permissions` for system group roles**
   - FI Members / Member: `browse_journey_catalog`, `browse_public_groups`, `create_group`, `enroll_self_in_journey`, `send_direct_messages`, `view_journey_content`, `complete_journey_activities`, `view_own_progress`
   - Visitor / Guest: `browse_journey_catalog`, `browse_public_groups`, `view_journey_content`, `complete_journey_activities`, `view_own_progress`
   - Deusex / Deusex: All 41 permissions

4. **Enroll all existing users in FringeIsland Members**
   ```sql
   INSERT INTO group_memberships (group_id, user_id, added_by_user_id, status)
   SELECT fi_members_id, id, id, 'active' FROM users WHERE is_active = true;
   ```

**Tests addressed:** B-RBAC-006 (system groups)

---

### Migration 3: Personal Groups + Role Renaming + Backfill

**Depends on:** Migration 1 (group_type), Migration 2 (system groups)

**Changes:**

1. **Rename existing `group_roles` in all groups**
   ```sql
   UPDATE group_roles SET name = 'Steward' WHERE name = 'Group Leader';
   UPDATE group_roles SET name = 'Guide' WHERE name = 'Travel Guide';
   ```

2. **Update `prevent_last_leader_removal` trigger** → check `'Steward'` instead of `'Group Leader'`

3. **Update `is_active_group_leader()` function** → check `'Steward'` (or rename to `is_active_steward()`)

4. **Create personal groups for all existing users**
   ```sql
   -- For each user, create:
   -- a) A personal group (group_type='personal')
   -- b) A membership (active)
   -- c) A "Myself" role
   -- d) A user_group_role assignment
   ```

5. **Extend `handle_new_user()` trigger** to also:
   - Create personal group
   - Create membership
   - Create "Myself" role
   - Assign role
   - Create FringeIsland Members membership

6. **Backfill `group_role_permissions` for existing engagement groups**
   - For each `group_roles` row with a `created_from_role_template_id`, copy template's permissions
   - This only covers the "Group Leader" (now "Steward") role in existing groups

**Tests addressed:** B-RBAC-003 (personal groups), B-RBAC-005 (role permissions init), B-RBAC-007 (role renaming in groups)

---

## Test Updates Required

Before running Phase 4, update tests to use correct counts:

| Test | Current Assertion | Correct Assertion |
|------|-------------------|-------------------|
| Permission total count | 31 | 41 ✓ (updated) |
| group_management count | 14 | 14 ✓ |
| journey_management count | 10 | 10 ✓ |
| journey_participation count | 5 | 5 ✓ |
| communication count | 5 | 5 ✓ |
| feedback count | 2 | 2 ✓ |
| platform_admin count | 4 | 5 ✓ (updated) |
| Deusex permissions | 31 | 41 ✓ (updated) |
| role_template_permissions total | 58 | recalculate (may change with 41 perms) |

**Steward template permissions:** Need to recount against the updated D18a grid with 41 permissions. The counts (24/15/12/7) were based on the 31-perm model. With additional `view_platform_analytics`, the Steward count might need to include it (Steward doesn't get platform admin perms → stays 24).

**Confirmed: Template counts stay the same (24/15/12/7 = 58 total)**. The extra `view_platform_analytics` is a platform_admin perm — not granted to any engagement group role template.

---

## Risks

1. **`created_by_user_id` NOT NULL on groups** — System groups need a creator. Using first user is pragmatic but not pure.
2. **`handle_new_user()` trigger complexity** — Currently simple (insert into users). Will now create 3+ additional records. Must handle errors gracefully.
3. **Role rename cascading** — Any code that checks `group_roles.name === 'Group Leader'` will break. UI code needs updating (Sub-Sprint 3).
4. **Existing tests must be updated for role rename** — 157 existing tests reference "Group Leader". After Migration 3 renames roles to "Steward", tests that create or query `group_roles` with `name = 'Group Leader'` will fail. **Action:** After Migration 3, grep all test files for `'Group Leader'` and `'Travel Guide'` and update to `'Steward'` and `'Guide'`. Key files: `role-assignment.test.ts`, `last-leader.test.ts`, `edit-permissions.test.ts`, `deletion.test.ts`, `invitations.test.ts`.

---

## Summary

| Migration | Content | Tests Addressed |
|-----------|---------|-----------------|
| 1 | group_type column, permission catalog (D22), template rename/remove, seed role_template_permissions | B-RBAC-001, 002, 004, 007 (partial) |
| 2 | System groups (FI Members, Visitor, Deusex), system group roles + permissions, FI Members enrollment | B-RBAC-006 |
| 3 | Rename group_roles, update triggers/functions, personal groups (backfill + trigger), backfill group_role_permissions | B-RBAC-003, 005, 007 |
