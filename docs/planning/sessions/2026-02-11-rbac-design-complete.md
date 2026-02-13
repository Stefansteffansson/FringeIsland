# Session: RBAC / Dynamic Permissions System — Design Complete

**Date:** 2026-02-11 (Session 2 of 2)
**Duration:** ~3 hours (across two sessions)
**Version:** 0.2.13 (no code changes)
**Focus:** Complete the RBAC system design started in Session 1

---

## Summary

Completed the full design of the Dynamic Permissions System across two planning sessions with Stefan. Session 1 established the architecture and core model (D1-D13). Session 2 resolved all remaining questions (Q1-Q11) and added 9 new design decisions (D14-D22), resulting in a comprehensive, implementation-ready design document.

No code was written — this was pure design/planning work. The planning doc (`docs/features/planned/dynamic-permissions-system.md`) is the single source of truth.

---

## Decisions Made (Session 2: D14-D22)

1. **D14: Role Selector "Act as..."** — Client-side UI filter on permissions. Server always uses full union. Zero backend complexity.
2. **D15: Schema Group-to-Group Only** — Drop `user_id` from `group_memberships`, use `member_group_id` only. Extra JOIN is negligible at any scale.
3. **D16: Preserve Data on Leaving** — Forum posts, progress, feedback stay. Membership → 'departed' status.
4. **D17: Four Default Roles** — Steward (group care), Guide (facilitation), Member (participation), Observer (follow-along). Replaces old Group Leader/Travel Guide/Member/Observer.
5. **D18: Data Privacy & Consent** — Feedback private (giver+receiver only). `sharing_level` column (private/guide/group). Cross-group: aggregates freely, individual by explicit consent. Small group protection (<3 suppresses aggregates).
6. **D18a: Complete Permission Grid** — Steward 24, Guide 15, Member 12, Observer 7 permissions.
7. **D19: Try-It Journeys** — Anonymous auth → signup conversion. Fundamental product feature. `allow_anonymous` flag on journeys.
8. **D20: System-Level Role Grids** — Guest 5, FI Member 8, Myself 0 (RLS only), Deusex all.
9. **D21: Joining Groups Get Member** — No separate External Observer. Engagement > observation. Same roles for all joining groups.
10. **D22: Seeded Permissions Delta** — 31 total (1 rename, 1 remove, 2 add). 4 role templates (1 remove, 2 rename).

## Key Terminology Changes Decided
- "Group Leader" → **Steward**
- "Travel Guide" → **Guide**
- "Journey groups" → **Engagement groups**

---

## Files Created
- `docs/features/planned/dynamic-permissions-system.md` (created Session 1, heavily updated Session 2)
- `docs/planning/sessions/2026-02-11-rbac-design-complete.md` (this file)

## Files Modified
- `PROJECT_STATUS.md` — Updated session summary, active tasks, next priorities, blockers
- `docs/planning/ROADMAP.md` — Phase 1.5 priority elevated (RBAC infrastructure), Phase 2 references RBAC doc, decision log entry, version 1.6

## Memory Files Updated
- `MEMORY.md` — RBAC design summary (90 lines, within 200 limit)
- `rbac-planning.md` — Rewritten to reflect completed state (D1-D22)
- `rls-and-testing.md` — Created in Session 2 (extracted from MEMORY.md for space optimization)

---

## Next Steps

- [ ] **Phase 1.5: Communication System** (forums, messaging, in-app notifications)
  - This is now HIGH priority — also infrastructure for RBAC membership flows (D13)
- [ ] **RBAC Implementation** (after Phase 1.5 messaging):
  - Schema evolution (group_type, group-to-group, personal groups)
  - `has_permission()` SQL function
  - `usePermissions()` React hook
  - Migrate UI from `isLeader` to `hasPermission()`
  - Role management UI

---

## Context for Next Session

**The RBAC design is complete and ready for implementation.** All 22 decisions are documented in `docs/features/planned/dynamic-permissions-system.md`. No further design work needed — next step is building Phase 1.5 communication system, then implementing the RBAC system.

**Key dependency:** Phase 1.5 messaging must come first because the RBAC membership model (D13) requires in-app notifications for join requests, acceptance, and group-joins-group flows.
