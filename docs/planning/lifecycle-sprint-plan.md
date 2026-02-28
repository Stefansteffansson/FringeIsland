# FringeIsland: Lifecycle Sprint Plan

**Created:** 2026-02-28
**Source:** `docs/planning/lifecycle-roadmap-decisions.md`
**Purpose:** Quick-reference table view of the 5-sprint lifecycle implementation plan

---

## Sprint Overview

| Sprint | Name | Goal | Depends On | Status |
|--------|------|------|------------|--------|
| **0** | Security Fixes | Fix broken non-public journey access + frozen enrollment | None | **NEXT** |
| **1** | Foundation Schema | Add schema pieces leave-group depends on | Sprint 0 | Pending |
| **2** | Leave Group Core | Leave-group flows without smart notifications | Sprint 0 + 1 | Pending |
| **3** | Smart Notifications + Track 1 | Actionable notification infra + steward nomination | Sprint 2 | Pending |
| **4** | Platform Exit | Admin-assisted cascade exit from all groups | Sprint 2 + 3 | Pending |

---

## Sprint 0 — Security Fixes (No Dependencies)

| Task | Description |
|------|-------------|
| **S1** | Fix `journeys_select_published` RLS — enforce `is_public`, not just `is_published`. Non-public journeys visible only to enrolled users or owning group members |
| **S2** | Fix `EnrollmentModal` — check `is_public` before allowing enrollment in non-public journeys |
| **S3** | Fix `JourneyPlayer` — enforce `frozen` enrollment status (read-only view, block step completion) |
| **S4** | Add `AND status != 'frozen'` to `enrollment_update_own` and `enrollment_update_group` RLS policies |

---

## Sprint 1 — Foundation Schema

| Task | Description |
|------|-------------|
| **F1** | `groups.status` column migration — `active/closed/archived/suspended` + partial index + RLS updates (non-admins see only `active` groups) |
| **F2** | Create "FringeIsland Journeys" engagement group + re-seed all 8 predefined journeys with correct `created_by_group_id` and `is_public = true` |

---

## Sprint 2 — Leave Group Core

| Task | Description |
|------|-------------|
| **L1** | Regular member leaves — confirmation dialog (with non-public journey warning), membership deletion, role cascade, enrollment freezing, forum anonymisation, Steward notification |
| **L2** | Sole Steward exits to DeusEx (Track 2) — stewardship transfers to DeusEx, pending invitations reassigned, standard notifications to all members + DeusEx |
| **L3** | Group closure (last member leaves) — `groups.status → 'closed'`, all enrollments frozen, non-public journeys transferred to DeusEx, DeusEx notified |

---

## Sprint 3 — Smart Notifications + Steward Nomination

| Task | Description |
|------|-------------|
| **F3** | Smart notification schema — add `action_type`, `action_data`, `action_taken`, `action_taken_at` to `notifications` |
| **F3-UI** | Update `NotificationContext` + bell UI to render actionable notifications with embedded buttons |
| **F3-Handler** | Server-side action handler (RPC/API route) to process notification responses |
| **L4** | Track 1 stewardship nomination — ranked nominee list, sequential smart notification invitations, accept/decline, timeout handling, DeusEx fallback |

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
SPRINT 0 — Security Fixes (no dependencies)
├── S1: Fix journeys RLS policy (is_public enforcement)
├── S2: Fix EnrollmentModal is_public check
├── S3: Enforce frozen status in JourneyPlayer
└── S4: RLS-level frozen enforcement

SPRINT 1 — Foundation Schema (depends on Sprint 0)
├── F1: groups.status column migration
└── F2: "FringeIsland Journeys" group + re-seed predefined journeys

SPRINT 2 — Leave Group Core (depends on Sprint 0 + 1)
├── L1: Regular member leaves
├── L2: Sole Steward → DeusEx immediately
└── L3: Group closure / last member leaves

SPRINT 3 — Smart Notifications + Track 1 (depends on Sprint 2)
├── F3: Smart notification schema + UI + handler
└── L4: Stewardship nomination flow

SPRINT 4 — Platform Exit (depends on Sprint 2 + 3)
└── L5: Admin-assisted cascade exit
```

**Critical path:** S1 → F1 + F2 (parallel) → S2 + S3 → L1 → L2 → L3 → [smart notifs] → L4 → L5
