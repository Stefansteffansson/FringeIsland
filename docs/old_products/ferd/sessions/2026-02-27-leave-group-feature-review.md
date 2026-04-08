# Session: Leave Group Feature Review + [Deleted User] Sentinel Seed

**Date:** 2026-02-27
**Duration:** ~3 hours
**Version:** v0.2.31 (no version bump — docs + seed migration only)
**Focus:** Multi-round analysis and refinement of leave_group_feature_review.md

---

## Summary

Performed a thorough multi-round analysis of the Leave Group feature specification (`docs/features/planned/leave_group_feature_review.md`), cross-referencing every section against the actual database schema (19 tables from the D15 rebuild migration). Identified and resolved 9 ambiguities, applied ~20 document fixes, and seeded a missing `[Deleted User]` system group that the `admin_hard_delete_user` RPC had been referencing without it existing.

No application code was changed — all work was documentation refinement and one database seed migration.

---

## Completed

- [x] First-pass analysis: D15 column renames, display name system, group types, trigger names
- [x] Second-pass analysis: 9 ambiguities identified and resolved with user guidance
- [x] "Exclusive Journey" → "Non-Public Journey" rename throughout (defined as `is_public = false`)
- [x] Group lifecycle design: `groups.status` column with `'active'`, `'closed'`, `'archived'`, `'suspended'`
- [x] Journey enrollment freezing: `status = 'frozen'` (already in CHECK constraint) with `progress_data` reason tracking
- [x] Pending invitation transfer: departing Steward's invitations reassigned to DeusEx
- [x] [Deleted User] sentinel seed migration created and applied
- [x] Final review: 4 additional fixes (non-public journey warning scope, platform exit scoping, group closure enrollment freezing, closure logging)

---

## Decisions Made

1. **Group lifecycle via status column** — `groups.status` with `'active'`, `'closed'`, `'archived'`, `'suspended'`. Groups are never hard-deleted. Negligible RLS performance impact with partial index.
2. **"Non-Public Journey"** — Defined as `journeys.is_public = false`. No additional schema column needed.
3. **Frozen enrollment** — `journey_enrollments.status = 'frozen'` for read-only access. Reason tracked in `progress_data` JSONB (`frozen_reason`, `frozen_at`). Strategic: extensible for future restriction types.
4. **Predefined journey ownership** — Future "FringeIsland Journeys" engagement group to own platform journeys (currently owned by arbitrary user's personal group from legacy seed).
5. **Pending invitation transfer** — `added_by_group_id` / `invited_by_group_id` on pending invitations transferred to DeusEx when last Steward departs.
6. **No DeusEx notification for simple closures** — `admin_audit_log` records admin actions; no general event log exists (identified as gap for future consideration).
7. **Platform exit scoping** — Account state changes (deactivation, etc.) are out of scope for leave-group — reference authentication docs.

---

## Files Changed

### Created
- `supabase/migrations/20260227120843_seed_deleted_user_sentinel_group.sql` — Seeds `[Deleted User]` system group
- `docs/old_products/ferd/sessions/2026-02-27-leave-group-feature-review.md` — This session bridge

### Modified
- `docs/features/planned/leave_group_feature_review.md` — Extensive modifications across all sections
- `PROJECT_STATUS.md` — Updated for this session

### Database Changes
- Migration applied: `20260227120843_seed_deleted_user_sentinel_group.sql`
- New row in `groups` table: `[Deleted User]` system group (`group_type = 'system'`)
- No schema changes — data seed only

---

## Issues Discovered

- **`[Deleted User]` sentinel was missing**: The `admin_hard_delete_user` RPC references this group for content reassignment, but no migration ever created it. The `COALESCE` fallback was silently assigning content to the admin's personal group. Fixed this session.
- **No general event log**: `admin_audit_log` only records admin actions. User-initiated lifecycle events (leaving groups, group closures) have no logging mechanism. Flagged as a cross-cutting concern for future consideration.
- **Predefined journeys owned by arbitrary user**: Legacy seed migration assigns `created_by_group_id` to whichever user's personal group is first. Needs "FringeIsland Journeys" engagement group (future work).

---

## Next Steps

- [ ] **Leave Group implementation** — TDD workflow: behaviors → RED tests → implement
  - Track 1: Last Steward leaves (stewardship transfer UI + group closure)
  - Track 2: Regular member leaves (clean exit + enrollment freezing)
  - Track 3: Platform exit (cascading leave)
- [ ] Schema changes needed: `groups.status` column, group closure RPC, enrollment freeze logic
- [ ] Smart notification system extension for handover flow
- [ ] "FringeIsland Journeys" engagement group for predefined journey ownership

---

## Context for Next Session

**What you need to know:**
- `leave_group_feature_review.md` is fully refined and ready for TDD implementation
- The `[Deleted User]` sentinel group now exists in the database (was missing before this session)
- `journey_enrollments.status` CHECK constraint already includes `'frozen'` — no schema change needed for that
- `groups.status` column does NOT exist yet — needs a migration
- The feature spec covers 3 tracks, smart notifications, forum anonymisation, and group lifecycle

**Useful docs:**
- `docs/features/planned/leave_group_feature_review.md` — The spec to implement
- `docs/features/implemented/d15-universal-group-pattern-migration.md` — Column rename reference
- `docs/features/planned/display-name-system.md` — Display name patterns (not yet implemented)
- `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` — Full schema reference
