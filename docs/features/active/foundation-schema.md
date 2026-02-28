# Foundation Schema (Sprint 1)

**Status:** COMPLETE
**Sprint:** 1 (Foundation Schema)
**Date:** February 28, 2026
**Version:** v0.2.33 (planned)
**Phase:** 1.6 (Polish and Launch — lifecycle prerequisites)
**Depends on:** Sprint 0 complete (v0.2.32) ✅
**Source:** `docs/planning/lifecycle-roadmap-decisions.md`
**Related:** [Group Management](../implemented/group-management.md) | [Leave Group Review](../planned/leave_group_feature_review.md) | [Journey System](../implemented/journey-system.md)

---

## Context

Sprint 1 adds two schema foundations that the leave-group feature (Sprint 2) depends on. Neither is a user-facing feature on its own — they are infrastructure changes that correct existing gaps and enable future lifecycle flows.

**Why now:**
- Leave-group requires `groups.status` to support `closed`, `archived`, `suspended` states — the column doesn't exist yet.
- 8 predefined journeys are owned by a random user's personal group (legacy seed). Until a "FringeIsland Journeys" system group exists, the distinction between "platform journey" and "group non-public journey" is untestable.

---

## F1: `groups.status` Column

### What It Does

Adds a `status` column to the `groups` table with four possible values: `active`, `closed`, `archived`, `suspended`. All existing groups default to `active`.

### Schema Change

```sql
ALTER TABLE groups
ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'closed', 'archived', 'suspended'));

-- Partial index for common query (most groups are active)
CREATE INDEX idx_groups_status_active ON groups (id) WHERE status = 'active';
```

### RLS Impact

Non-admin users should only see groups with `status = 'active'`. This means updating the groups SELECT policy to include `AND status = 'active'` for non-admin queries. Platform admins (DeusEx members) can see all groups regardless of status.

### User-Facing Impact

- **None visible** — all existing groups are `active`, so queries return the same results as before.
- **Future:** When leave-group is implemented (Sprint 2), closing/archiving a group will hide it from non-admin users.

### Behaviors to Specify

- Groups with non-active status are invisible to non-admin users (SELECT filtered)
- Groups default to `active` status on creation
- Platform admins can see groups of any status
- The `status` column cannot contain arbitrary values (CHECK constraint)

---

## F2: "FringeIsland Journeys" System Group

### What It Does

Creates a platform-owned engagement group called "FringeIsland Journeys" and migrates ownership of all 8 predefined journeys from their current random-user ownership to this group.

### Migration Steps

1. Create the "FringeIsland Journeys" group:
   - `group_type = 'engagement'`
   - `is_public = true`
   - `created_by_group_id = <deusex_group_id>` (owned by DeusEx — prevents globalTeardown orphan sweep)
   - `name = 'FringeIsland Journeys'`
   - `description = 'Official FringeIsland predefined journeys'`

2. Update all 8 predefined journeys:
   - `SET created_by_group_id = <fi_journeys_group_id>`
   - `SET is_public = true` (confirm they're already public)

3. Make the DeusEx admin group a Steward of "FringeIsland Journeys" (so admins can manage it)

### Why Engagement Group, Not System Group?

The "FringeIsland Journeys" group functions like a normal engagement group that happens to be platform-owned. It has members (DeusEx as Steward), it owns journeys, and it's publicly visible. Using `group_type = 'engagement'` keeps it within the standard group management flows. System groups (like DeusEx, [Deleted User]) serve infrastructure purposes and are typically hidden.

### User-Facing Impact

- **Journey catalog:** No visible change — the same 8 journeys appear.
- **Journey detail pages:** The "Created by" attribution (if shown) would change from a random user to "FringeIsland Journeys".
- **Future:** Non-public journeys created by engagement groups will only be visible to group members — this distinction is now testable with correct ownership.

### Behaviors to Specify

- "FringeIsland Journeys" group exists with `group_type = 'engagement'` and `is_public = true`
- All 8 predefined journeys have `created_by_group_id` pointing to the FI Journeys group
- All 8 predefined journeys have `is_public = true`
- DeusEx is a Steward of the FI Journeys group (can manage it)
- The migration is idempotent (safe to re-run)

---

## Success Criteria

- [x] `groups.status` column exists with CHECK constraint and default `'active'` ✅
- [x] Partial index on active groups exists ✅
- [x] RLS policies filter non-active groups for non-admin users ✅
- [x] "FringeIsland Journeys" engagement group exists ✅
- [x] All 8 predefined journeys owned by "FringeIsland Journeys" group ✅
- [x] DeusEx has Steward role in "FringeIsland Journeys" group ✅
- [x] All existing integration tests still pass (zero regressions) ✅ 504/504
- [x] New integration tests cover all behaviors ✅ 19 new tests (9 + 10)

---

## Risks

- **F1 RLS change affects all group queries:** The `AND status = 'active'` filter is added to existing SELECT policies. Must verify that no existing queries break (e.g., admin queries, group creation flows, invitation flows).
- **F2 touches seed data:** The 8 predefined journeys are referenced by existing enrollments in test data. The migration must handle FK relationships correctly.
- **F2 group creation without a creator:** ✅ RESOLVED — `created_by_group_id` set to DeusEx group ID. This prevents the globalTeardown orphan sweep (Phase 3 deletes engagement groups with `created_by_group_id IS NULL`).

---

## Out of Scope (Sprint 1)

- Leave-group feature (Sprint 2)
- Smart notifications (Sprint 3)
- Group lifecycle state machine (status transitions — Sprint 2)
- Group archive/suspend UI (future)
- Journey ownership transfer UI (future)
