# Session: Lifecycle Roadmap Decisions + Feature Doc Reorganization

**Date:** 2026-02-28
**Version:** 0.2.31 (no code changes)
**Focus:** Map all lifecycle feature dependencies, make binding decisions, fix documentation organization

---

## Summary

Deep analysis session mapping all interconnected lifecycle features (user/group/journey). Identified 8 lifecycle tracks (A-H), 5 broken things in current state, and created a 5-sprint implementation roadmap with 5 binding decisions.

Also reorganized feature docs — moved 7 implemented features from `planned/` and `active/` folders to `implemented/`, rewrote `journey-system.md` for post-D15 accuracy, and applied 9 tweaks to the leave group spec.

No code changes — documentation and planning only.

---

## Completed

- [x] Mapped 8 lifecycle tracks (A: signup through H: groups-join-groups)
- [x] Identified 5 broken things: non-public journey RLS, missing groups.status, wrong journey ownership, cosmetic-only frozen enrollment, no smart notifications
- [x] Created lifecycle roadmap with dependency graph and critical path
- [x] Made 5 binding decisions (D-R1 through D-R5)
- [x] Defined 5-sprint structure (Sprint 0: Security → Sprint 4: Platform Exit)
- [x] Applied 9 tweaks to leave_group_feature_review.md
- [x] Moved 7 feature docs to implemented/ folder
- [x] Rewrote journey-system.md for post-D15 accuracy
- [x] Updated PROJECT_STATUS.md, ROADMAP.md

---

## Decisions Made

1. **D-R1:** Smart notifications are a separate feature (Sprint 3), not part of leave-group core
2. **D-R2:** Security fixes (Sprint 0) must complete before any leave-group implementation
3. **D-R3:** Platform exit is admin-assisted for v1 — no self-service "Leave FringeIsland" button
4. **D-R4:** Timeout mechanism deferred to Sprint 3 — hard-coded 7d/30d values when implemented
5. **D-R5:** Forum content preserved on hard delete — attribution anonymised, content kept

---

## Files Changed

### Created
- `docs/planning/lifecycle-roadmap-decisions.md` — **Single source of truth** for sprint structure
- `docs/planning/sessions/2026-02-28-lifecycle-roadmap-decisions.md` — This session bridge

### Modified
- `docs/features/planned/leave_group_feature_review.md` — 9 tweaks applied
- `docs/features/implemented/journey-system.md` — Rewritten for post-D15 accuracy
- `docs/features/implemented/deusex-admin-foundation.md` — Status update
- `docs/features/implemented/direct-messaging.md` — Status update
- `docs/features/implemented/dynamic-permissions-system.md` — Status update
- `docs/features/implemented/enhanced-member-invitations.md` — Status update
- `docs/features/implemented/group-forum-system.md` — Status update
- `docs/features/implemented/notification-system.md` — Status update
- `docs/features/implemented/performance-optimization.md` — Status update
- `PROJECT_STATUS.md` — Session summary, sprint priorities
- `docs/planning/ROADMAP.md` — Fixed stale links, added lifecycle roadmap reference

### Moved (renamed)
- `docs/features/active/deusex-admin-foundation.md` → `implemented/`
- `docs/features/planned/direct-messaging.md` → `implemented/`
- `docs/features/planned/dynamic-permissions-system.md` → `implemented/`
- `docs/features/active/enhanced-member-invitations.md` → `implemented/`
- `docs/features/planned/group-forum-system.md` → `implemented/`
- `docs/features/planned/notification-system.md` → `implemented/`
- `docs/features/active/performance-optimization.md` → `implemented/`

---

## Next Steps

- [ ] **Sprint 0 — Security Fixes** (TDD workflow):
  - S1: Fix `journeys_select_published` RLS (enforce `is_public`)
  - S2: Fix EnrollmentModal `is_public` check
  - S3: Fix JourneyPlayer frozen enforcement
  - S4: RLS-level frozen enforcement on enrollment UPDATE policies
- [ ] Sprint 1 — Foundation Schema (`groups.status` + "FringeIsland Journeys" group)
- [ ] Sprint 2 — Leave Group Core (L1 + L2 + L3)

---

## Context for Next Session

**Start with:** Sprint 0 Security Fixes — TDD workflow (behaviors → failing tests → implement)

**Key docs:**
- `docs/planning/lifecycle-roadmap-decisions.md` — Sprint structure and decisions
- `docs/features/planned/leave_group_feature_review.md` — Leave group spec (Section 2.5 has prerequisites)
- `docs/features/implemented/journey-system.md` — Current journey RLS policies to fix
