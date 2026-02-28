# FringeIsland: Lifecycle Sprint Plan

**Created:** 2026-02-28
**Last Updated:** 2026-02-28
**Source:** `docs/planning/lifecycle-roadmap-decisions.md`
**Purpose:** Quick-reference table view of the 5-sprint lifecycle implementation plan

---

## Sprint Overview

| Sprint | Name | Goal | Depends On | Status |
|--------|------|------|------------|--------|
| **0** | Security Fixes | Fix broken non-public journey access + frozen enrollment | None | **DONE** (v0.2.32) |
| **1** | Foundation Schema | Add schema pieces leave-group depends on | Sprint 0 | **DONE** (v0.2.33) |
| **2** | Leave Group Core | Leave-group flows without smart notifications | Sprint 0 + 1 | **DONE** (v0.2.34) |
| **3** | Smart Notifications + Track 1 | Actionable notification infra + steward nomination | Sprint 2 | **DONE** (v0.2.35) |
| **4** | Platform Exit | Admin-assisted cascade exit from all groups | Sprint 2 + 3 | **NEXT** |

---

## Sprint 0 — Security Fixes (No Dependencies) ✅ DONE (v0.2.32)

**Completed:** 2026-02-28 | **Tests:** 19 new | **Migration:** `20260228_sprint0_security_fixes.sql`

| Task | Description | Status |
|------|-------------|--------|
| **S1** | Fix `journeys_select_published` RLS — enforce `is_public`, not just `is_published`. Non-public journeys visible only to enrolled users or owning group members | ✅ |
| **S2** | Fix `EnrollmentModal` — check `is_public` before allowing enrollment in non-public journeys | ✅ |
| **S3** | Fix `JourneyPlayer` — enforce `frozen` enrollment status (read-only view, block step completion) | ✅ |
| **S4** | Add `AND status != 'frozen'` to `enrollment_update_own` and `enrollment_update_group` RLS policies | ✅ |

**Implementation notes:** 2 new SECURITY DEFINER helpers, 5 RLS policies replaced. Full TDD workflow.

---

## Sprint 1 — Foundation Schema ✅ DONE (v0.2.33)

**Completed:** 2026-02-28 | **Tests:** 19 new | **Migration:** `20260228_sprint1_foundation_schema.sql`

| Task | Description | Status |
|------|-------------|--------|
| **F1** | `groups.status` column migration — `active/closed/archived/suspended` + partial index + RLS updates (non-admins see only `active` groups) | ✅ |
| **F2** | Create "FringeIsland Journeys" engagement group + re-seed all 8 predefined journeys with correct `created_by_group_id` and `is_public = true` | ✅ |

---

## Sprint 2 — Leave Group Core ✅ DONE (v0.2.34)

**Completed:** 2026-02-28 | **Tests:** 17 new (630/630 GREEN total) | **Migration:** `20260228120745_sprint2_leave_group_core.sql`

| Task | Description | Status |
|------|-------------|--------|
| **L1** | Regular member leaves — membership deletion, role cascade, non-public enrollment freezing, Steward notification | ✅ |
| **L2** | Sole Steward exits to DeusEx (Track 2) — DeusEx gets membership + Steward role, pending invitations transferred, all members notified | ✅ |
| **L3** | Group closure (last member leaves) — `groups.status → 'closed'`, all enrollments frozen, non-public journeys transferred to DeusEx, DeusEx notified | ✅ |

**Implementation notes:** `leave_group(p_group_id)` SECURITY DEFINER RPC handles all 3 scenarios automatically. Updated `prevent_last_leader_removal` trigger to allow role deletion when group is 'closed'. Feature doc: `docs/features/implemented/leave-group-core.md`. Behaviors: B-GRP-008, B-GRP-009, B-GRP-010.

---

## Sprint 3 — Smart Notifications + Steward Nomination ✅ DONE (v0.2.35)

**Completed:** 2026-02-28 | **Tests:** 19 new (11 smart-notifications + 8 stewardship-nomination) | **Migration:** `20260228125730_sprint3_smart_notifications.sql`

| Task | Description | Status |
|------|-------------|--------|
| **F3** | Smart notification schema — add `action_type`, `action_data`, `action_taken`, `action_taken_at`, `expires_at` to `notifications` + consistency constraint | ✅ |
| **F3-UI** | Update `NotificationContext` + bell UI to render actionable notifications with Accept/Decline buttons, loading states, expired/actioned badges | ✅ |
| **F3-Handler** | `handle_notification_action` SECURITY DEFINER RPC — validates ownership, actionability, expiry, action validity; records response; dispatches type-specific side effects | ✅ |
| **L4** | Track 1 stewardship nomination — `nominate_steward` RPC, ranked nominee list, sequential smart notifications, 7-day expiry, accept (Steward transfer + original leaves) / decline (next nominee) / all-decline (DeusEx fallback) | ✅ |

**Implementation notes:** `handle_notification_action` dispatches to `_handle_stewardship_nomination_action` for stewardship-specific side effects. `nominate_steward` validates sole Steward, active members, no self-nomination, no duplicate in-progress. Lazy timeout (expiry checked at action time, not via scheduled jobs). Feature doc: `docs/features/implemented/smart-notifications.md`. Behaviors: B-NOTIF-001, B-NOTIF-002, B-NOTIF-003, B-GRP-011.

---

## Sprint 4 — Platform Exit (Admin-Assisted)

| Task | Description |
|------|-------------|
| **L5** | Admin action: "Exit user from all groups" — iterate all memberships, apply appropriate leave track (L1/L2/L4) per group, then deactivate/decommission. NOT self-service. |

---

## Binding Decisions

| ID | Decision | Impact |
|----|----------|--------|
| **D-R1** | Smart notifications are a separate feature | Sprint 2 ships WITHOUT Track 1 (steward nomination) |
| **D-R2** | Security fixes before leave-group | Sprint 0 must complete before any leave-group work |
| **D-R3** | Platform exit is admin-assisted for v1 | No self-service "Leave FringeIsland" button |
| **D-R4** | Timeout mechanism deferred to Sprint 3 | Hard-coded 7d/30d values when implemented |
| **D-R5** | Forum content preserved on hard delete | Attribution anonymised to "[Deleted User]", content kept |

---

## Explicit Deferrals

| Item | Deferred Until | Current Alternative |
|------|---------------|---------------------|
| Self-service platform exit UI | After leave-group v1 | Admin-assisted deactivation |
| Stewardship nomination (Track 1) | Sprint 3 | Sole Steward → DeusEx immediately |
| Configurable timeout durations | After Track 1 works | Hard-coded 7d / 30d |
| Groups-join-groups UI | Phase 2 | Schema + tests exist, no UI |
| GDPR content erasure | Before public launch | Content preserved, attribution anonymised |

---

## Dependency Graph

```
SPRINT 0 — Security Fixes ✅ DONE (v0.2.32)
├── S1: Fix journeys RLS policy (is_public enforcement) ✅
├── S2: Fix EnrollmentModal is_public check ✅
├── S3: Enforce frozen status in JourneyPlayer ✅
└── S4: RLS-level frozen enforcement ✅

SPRINT 1 — Foundation Schema ✅ DONE (v0.2.33)
├── F1: groups.status column migration ✅
└── F2: "FringeIsland Journeys" group + re-seed predefined journeys ✅

SPRINT 2 — Leave Group Core ✅ DONE (v0.2.34)
├── L1: Regular member leaves ✅
├── L2: Sole Steward → DeusEx immediately ✅
└── L3: Group closure / last member leaves ✅

SPRINT 3 — Smart Notifications + Track 1 ✅ DONE (v0.2.35)
├── F3: Smart notification schema + constraint + handler RPC ✅
├── F3-UI: NotificationContext + NotificationBell actionable UI ✅
└── L4: Stewardship nomination (nominate_steward RPC + accept/decline/fallback) ✅

SPRINT 4 — Platform Exit (depends on Sprint 3) ⏳ NEXT
└── L5: Admin-assisted cascade exit
```

**Critical path:** ~~S1 → F1 + F2 (parallel) → S2 + S3 → L1 → L2 → L3~~ (DONE) → ~~F3 → L4~~ (DONE) → L5

---

## Progress Summary

- **Sprints completed:** 4 of 5 (Sprint 0, 1, 2, 3)
- **Tests added:** 74 new tests across 4 sprints (19 + 19 + 17 + 19)
- **Total test suite:** 649+ GREEN
- **Next sprint:** Sprint 4 — Platform Exit (admin-assisted)
