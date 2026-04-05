# Session: Sprint 1 — Foundation Schema

**Date:** 2026-02-28
**Duration:** ~2 hours
**Version:** 0.2.33
**Focus:** Sprint 1 TDD implementation (F1: groups.status + F2: FI Journeys group)

---

## Summary

Completed Sprint 1: Foundation Schema using the full TDD workflow (Phases 0-7). Two infrastructure changes that enable the leave-group lifecycle features (Sprint 2):

- **F1:** Added `groups.status` column with 4 valid states, CHECK constraint, partial index, and RLS policy update (non-admin users only see active groups).
- **F2:** Created "FringeIsland Journeys" engagement group, added DeusEx as Steward, re-seeded all 8 predefined journeys with correct D15 ownership.

## Test Results

- Tests added: 19 (9 group-status + 10 platform-ownership)
- Tests passing: 504/504 (100%)
- Bugs found: 0 regressions
- Full suite: 60 suites, 504 tests, all GREEN

## Behaviors Documented

- B-GRP-007: Group Status Visibility (9 acceptance criteria)
- B-JRN-008: Platform Journey Ownership (9 acceptance criteria)

## Decisions Made

1. **FI Journeys group is `engagement` type, not `system`** — it functions like a normal group that happens to be platform-owned. System groups serve infrastructure purposes.
2. **`created_by_group_id` set to DeusEx** — prevents globalTeardown orphan sweep (Phase 3 deletes engagement groups with NULL creator). Originally was NULL but caused test instability.
3. **Journey seed data included in migration** — the 8 predefined journeys were lost during D15 rebuild (old migration referenced dropped column). Re-seeded directly in the Sprint 1 migration with idempotent check.

## Issues Discovered

1. **Journeys table was empty** — The D15 schema rebuild archived old migrations including the journey seed. New migration set had schema but not data.
2. **Supabase Management API silently skips DO blocks combined with DDL** — F2's DO block didn't execute when sent alongside F1's DDL. Workaround: execute DO blocks separately.
3. **globalTeardown deletes groups with NULL created_by_group_id** — Phase 3 orphan sweep treated FI Journeys group as orphan. Fixed by setting creator to DeusEx.

## Files Changed

### Created
- `supabase/migrations/20260228111514_sprint1_foundation_schema.sql`
- `tests/integration/groups/group-status.test.ts`
- `tests/integration/journeys/platform-ownership.test.ts`
- `docs/features/active/foundation-schema.md`

### Modified
- `docs/specs/behaviors/groups.md` — Added B-GRP-007
- `docs/specs/behaviors/journeys.md` — Added B-JRN-008
- `PROJECT_STATUS.md` — Sprint 1 complete, v0.2.33
- `CHANGELOG.md` — Sprint 1 entry
- `docs/planning/ROADMAP.md` — Sprint tracker updated
- `docs/agents/learnings/database.md` — 3 new entries
- `docs/agents/learnings/testing.md` — 2 new entries

## Next Steps

- [ ] Sprint 2: Leave Group Core (regular member leave, sole Steward transfer, group closure)
- [ ] Move `docs/features/active/foundation-schema.md` to `docs/features/implemented/` when appropriate

## Context for Next Session

**What you need to know:**
- Sprint 1 is complete. Sprint 2 (Leave Group Core) is the next lifecycle sprint.
- The `groups.status` column is live. All existing groups are `active`. Status transitions are Sprint 2 scope.
- The "FringeIsland Journeys" group exists with ID `faf50170-0a1b-455e-9459-576a531e14a6`, owned by DeusEx.
- The RLS policy on `groups` now has 3 arms: personal (always), active+conditions (non-admin), all (admin).
- The `lifecycle-roadmap-decisions.md` has the full 5-sprint plan.

**Useful docs:**
- `docs/planning/lifecycle-roadmap-decisions.md` — Sprint structure and dependencies
- `docs/features/active/foundation-schema.md` — Sprint 1 feature doc (COMPLETE)
- `docs/features/planned/leave_group_feature_review.md` — Sprint 2 scope

---

## Related

- **Migration:** `20260228111514_sprint1_foundation_schema.sql`
- **Previous session:** Sprint 0 Security Fixes (v0.2.32)
- **Next sprint:** Sprint 2 — Leave Group Core
