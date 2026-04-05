# Session: Sprint 2 — Leave Group Core + Feature Doc Review

**Date:** 2026-02-28
**Version:** v0.2.34
**Focus:** Sprint 2 TDD workflow (Phases 0-7) + comprehensive feature doc review

---

## Summary

Completed Sprint 2: Leave Group Core — the full TDD workflow from feature context through documentation. The `leave_group(p_group_id)` SECURITY DEFINER RPC handles three scenarios automatically: regular member leave (L1), sole Steward -> DeusEx handover (L2), and group closure when the last member leaves (L3). All 17 new tests passing, 630/630 full suite GREEN with zero regressions.

After Sprint 2, reviewed and updated all 15 feature documents under `docs/features/`. Moved completed feature docs from `active/` to `implemented/`, updated stale Known Limitations, added Sprint 1+2 changelog entries across affected docs, and fixed 5 stale cross-doc links.

---

## Completed

- [x] Sprint 2 — Leave Group Core (v0.2.34)
  - Phase 0: Feature context verification
  - Phase 1: Behavior specs (B-GRP-008, B-GRP-009, B-GRP-010)
  - Phase 2-3: 17 integration tests written and confirmed RED
  - Phase 4: Design (FK analysis, trigger compatibility)
  - Phase 5: Implementation (leave_group RPC + trigger update) — all GREEN
  - Phase 6-7: Verification (630/630) and documentation
- [x] Feature doc review — 15 docs reviewed, 10 updated, 2 moved

---

## Test Results

- Tests added: 17 new integration tests
- Tests passing: 630/630 (100%)
- New test file: `tests/integration/groups/leave-group.test.ts`
- Bugs found during testing: 1 (test setup issue — member2 was 'invited' not 'active', causing wrong scenario detection; fixed in test)

---

## Behaviors Documented

- B-GRP-008: Regular Member Leave Group
- B-GRP-009: Sole Steward DeusEx Handover
- B-GRP-010: Group Closure on Last Member Leave

---

## Files Changed

### Created
- `supabase/migrations/20260228120745_sprint2_leave_group_core.sql` — leave_group RPC + trigger update
- `tests/integration/groups/leave-group.test.ts` — 17 integration tests
- `docs/features/implemented/leave-group-core.md` — Feature doc (moved from active/, fully rewritten)
- `docs/features/implemented/foundation-schema.md` — Feature doc (moved from active/)
- `docs/planning/sessions/2026-02-28-sprint2-leave-group-core.md` — This session bridge

### Modified
- `CHANGELOG.md` — Sprint 2 entry
- `PROJECT_STATUS.md` — Version, stats, session summary
- `docs/planning/ROADMAP.md` — Sprint 2 complete
- `docs/planning/lifecycle-roadmap-decisions.md` — Sprint 2 marked complete
- `docs/specs/behaviors/groups.md` — B-GRP-008, B-GRP-009, B-GRP-010
- `docs/features/implemented/group-management.md` — Major update (data model, known limitations, triggers, version history)
- `docs/features/implemented/notification-system.md` — Sprint 2 notification types
- `docs/features/implemented/journey-system.md` — Sprint 1+2 changelog entries
- `docs/features/implemented/group-forum-system.md` — Former Member display section
- `docs/features/implemented/enhanced-member-invitations.md` — Sprint 2 invitation transfer note
- `docs/features/implemented/authentication.md` — Fixed stale links
- `docs/features/implemented/d15-universal-group-pattern-migration.md` — Fixed stale links
- `docs/features/planned/leave_group_feature_review.md` — Sprint 2 completion note, fixed links
- `docs/specs/behaviors/admin.md` — Fixed stale link

### Deleted
- `docs/features/active/foundation-schema.md` — Moved to implemented/
- `docs/features/active/leave-group-core.md` — Moved to implemented/

---

## Decisions Made

1. **Single RPC handles all scenarios:** `leave_group()` auto-detects L1/L2/L3 based on membership count and Steward role status
2. **Explicit role deletion before membership:** `user_group_roles` does NOT cascade on membership deletion — RPC deletes roles explicitly
3. **Closed-group bypass in trigger:** `prevent_last_leader_removal` updated to allow role deletion when `groups.status = 'closed'`
4. **L2 Steward ordering trick:** Add DeusEx as Steward BEFORE deleting old Steward's roles — trigger sees 2 Stewards, allows deletion

---

## Next Steps

- [ ] Sprint 3: Smart Notifications + Steward Nomination (Track 1)
- [ ] Leave Group UI (button, confirmation modal, handover dialog)
- [ ] Forum "Former Member" display logic in ForumSection component
- [ ] Sprint 4: Platform Exit (admin-assisted)

---

## Context for Next Session

- `docs/features/active/` is now EMPTY — all feature docs are in `implemented/` or `planned/`
- The `leave_group()` RPC is tested but has no frontend UI yet
- Sprint 3 requires designing the smart notification schema extension before Track 1 stewardship nomination can be implemented
- See `docs/planning/lifecycle-roadmap-decisions.md` for full sprint structure

**Useful docs:**
- `docs/features/implemented/leave-group-core.md` — Sprint 2 implementation details
- `docs/planning/lifecycle-roadmap-decisions.md` — Sprint 3+ planning
- `docs/features/planned/leave_group_feature_review.md` — Full design spec (Track 1 details)
