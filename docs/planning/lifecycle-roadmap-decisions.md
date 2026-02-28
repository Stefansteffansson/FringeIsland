# FringeIsland: Lifecycle Feature Roadmap — Decision Record

**Date:** 2026-02-28
**Status:** ALL 5 SPRINTS COMPLETE (v0.2.32–v0.2.36)
**Participants:** Stefan + Claude (Opus 4.6 analysis session)
**Purpose:** Decision record for the 5-sprint lifecycle feature implementation. Single source of truth for sprint structure, binding decisions, and deferrals.

**Context:** Users, personal groups, engagement groups, journeys (public vs exclusive), group-in-groups, stewardship, and DeusEx all interact in complex ways. This analysis mapped all the flows, identified gaps, and defined the work order.

---

## Quick Reference

| Sprint | Name | Goal | Version | Tests | Status |
|--------|------|------|---------|-------|--------|
| **0** | Security Fixes | Fix non-public journey access + frozen enrollment | v0.2.32 | +19 | **DONE** |
| **1** | Foundation Schema | groups.status + FI Journeys group | v0.2.33 | +19 | **DONE** |
| **2** | Leave Group Core | L1 + L2 + L3 (no smart notifs) | v0.2.34 | +17 | **DONE** |
| **3** | Smart Notifications + Track 1 | Actionable notifs + steward nomination | v0.2.35 | +19 | **DONE** |
| **4** | Platform Exit | Admin-assisted cascade exit | v0.2.36 | +10 | **DONE** |

**Total:** 84 new tests across 5 sprints. All lifecycle tracks (A–G) implemented.

---

## Current State — What's Broken

### Security Gap: Non-Public Journey Access
- `journeys_select_published` RLS only checks `is_published = true` — NOT `is_public`
- Anyone who knows a non-public journey's UUID can read it and enroll
- `EnrollmentModal` has zero `is_public` gating
- **This must be fixed before any Non-Public Journey feature (including freezing) is meaningful**

### Missing Schema: `groups.status` Column
- Leave-group needs `active/closed/archived/suspended` — column doesn't exist
- No migration written yet

### Wrong Ownership: Predefined Journeys
- 8 predefined journeys owned by a random user's personal group (legacy seed)
- No "FringeIsland Journeys" group exists
- Until fixed, the distinction between "platform journey" and "group non-public journey" is untestable

### Frozen Enrollment is Cosmetic Only
- `'frozen'` exists in the CHECK constraint but nothing sets it
- JourneyPlayer doesn't check for frozen status — a frozen user can still play
- No RLS enforcement on frozen enrollments

### Smart Notifications Don't Exist
- Leave-group Track 1 requires actionable notifications (Yes/No buttons)
- Current notification system (v0.2.14) has 7 passive types only
- No `action_type`, `action_data`, or `action_taken` columns

---

## The Lifecycle Tracks

### A. User Joins Platform
`signup -> handle_new_user() -> personal group created -> FI Members enrollment -> lands in /groups`
**Status: Fully working.**

### B. Personal Group Joins Engagement Group
`Steward invites -> status='invited' -> user accepts -> status='active' -> Member role auto-assigned`
**Status: Fully working.**

### C. Journey Created & Enrolled
`Journey created (created_by_group_id) -> published -> user enrolls (personal group) or Steward enrolls group -> JourneyPlayer -> progress tracked -> completed`
**Status: Working, but non-public access control is broken (see above).**

### D. Member Leaves Engagement Group
`Confirmation -> membership deleted -> roles cascade -> non-public enrollments frozen -> forum anonymised -> Steward(s) notified`
**Status: NOT IMPLEMENTED. Spec complete. Multiple schema gaps block it.**

### E. Sole Steward Leaves
`Track 1: Nominate successor (ranked list, sequential invitations, smart notifications) OR Track 2: Hand to DeusEx immediately -> pending invitations transferred -> exit completes`
**Status: NOT IMPLEMENTED. Depends on smart notifications for Track 1.**

### F. Last Member Leaves (Group Closure)
`groups.status -> 'closed' -> all enrollments frozen -> non-public journeys transferred to DeusEx -> DeusEx notified`
**Status: NOT IMPLEMENTED. Depends on groups.status column.**

### G. User Leaves Platform
`Cascade leave from all groups (applying Track D/E per group) -> account decommission`
**Status: NOT IMPLEMENTED. Admin-only deletion exists. No self-service exit.**

### H. Group Joins Another Group
`Schema supports it. has_permission() works. Tests exist. NO UI. No circularity prevention trigger.`
**Status: Phase 2. Does NOT block leave-group (limited to personal-groups-leaving-engagement-groups).**

---

## Dependency Graph

```
SECURITY FIXES (no dependencies — fix now)
├── S1: Fix journeys RLS policy (is_public enforcement)
├── S2: Fix EnrollmentModal is_public check
└── S3: Enforce frozen status in JourneyPlayer

FOUNDATION SCHEMA (must precede leave-group)
├── F1: groups.status column migration
├── F2: "FringeIsland Journeys" group + re-seed predefined journeys
└── F3: Smart notifications schema (IF not split out)

LEAVE GROUP CORE
├── L1: Regular member leaves (simplest — no smart notifs needed)
├── L2: Sole Steward → DeusEx immediately (standard notifs only)
├── L3: Group closure / last member leaves
├── L4: Steward nomination flow (REQUIRES smart notifications)
└── L5: Platform exit (cascade of L1-L4 across all groups)
```

**Critical path:** S1 -> F1 + F2 (parallel) -> S2 + S3 -> L1 -> L2 -> L3 -> [smart notifs] -> L4 -> L5

---

## Recommended Work Order

### Sprint 0 — Security Fixes
1. Fix `journeys_select_published` RLS -> gate non-public journeys behind enrollment or group membership
2. Fix EnrollmentModal -> check `is_public` before allowing enrollment in non-public journeys
3. Enforce `frozen` in JourneyPlayer -> read-only view with contextual message

### Sprint 1 — Foundation Schema
1. `groups.status` column migration + RLS policy updates (AND status = 'active' for non-admins)
2. "FringeIsland Journeys" engagement group + predefined journey ownership migration

### Sprint 2 — Leave Group Core (L1 + L2 + L3) ✅ COMPLETE (v0.2.34)
- ✅ Regular member leaves — membership deletion, role cascade, non-public enrollment freezing, Steward notification
- ✅ Sole Steward → DeusEx — DeusEx gets membership + Steward role, pending invitations transferred, all members notified
- ✅ Group closure — `groups.status = 'closed'`, all enrollments frozen, non-public journeys transferred to DeusEx
- ✅ All using standard notifications only — no smart notification dependency
- ✅ 17 integration tests, 630/630 GREEN
- ✅ Migration: `20260228120745_sprint2_leave_group_core.sql`

### Sprint 3 — Smart Notifications + Steward Nomination (L4)
- Smart notification schema extension (action_type, action_data, action_taken)
- NotificationContext update to render actionable notifications
- Track 1: ranked nominee list, sequential invitations, timeout handling

### Sprint 4 — Platform Exit (L5) ✅ COMPLETE (v0.2.36)
- ✅ `admin_exit_user_from_platform` SECURITY DEFINER RPC — cascades L1/L2/L3 across all engagement groups
- ✅ Admin UI: "Exit Platform" button in UserActionBar with ConfirmModal
- ✅ Safety guards: self-exit, decommissioned, DeusEx member
- ✅ Decommission + force logout after all groups processed
- ✅ Audit log with detailed per-group metadata
- ✅ 10 integration tests, 106/106 admin suite GREEN
- ✅ Migration: `20260228144747_sprint4_platform_exit.sql`

---

## Specific Tweaks to Leave Group Spec

1. **Add Prerequisites section** — explicitly require the non-public journey RLS fix and the "FringeIsland Journeys" migration as hard prerequisites before BDD scenarios
2. **Split smart notifications** — gate Track 1 behind a smart notification prerequisite; ship Tracks 2, group closure, and regular member leaves first
3. **Add groups-join-groups scope exclusion** — explicitly state: "This feature covers personal groups leaving engagement groups only. Engagement-group-leaves-engagement-group is deferred until groups-join-groups UI exists."
4. **Elevate "FringeIsland Journeys" migration** from side note to hard prerequisite
5. **Decide frozen enforcement layer** — recommend RLS + app (add `AND status != 'frozen'` to enrollment UPDATE policies)
6. **Hard-code timeout durations for v1** — 7 days for invitation acceptance, 30 days for absence window
7. **DeusEx backlog: standard notifications for v1** — smart notification for DeusEx is a convenience enhancement, not a blocker

---

## Decisions — Binding Commitments

Each decision below was discussed and confirmed on 2026-02-28. These are not suggestions — they are locked-in constraints for all future sprint planning.

### D-R1: Smart Notifications Are a Separate Feature
**Decision:** Smart notifications (actionable Yes/No and multi-choice embedded in notification UI) are NOT part of the leave-group sprint. They are a standalone prerequisite feature that must be designed, specified, and implemented in its own sprint BEFORE the stewardship nomination flow (Track 1) can be built.

**What this means:**
- Leave-group Sprint 2 ships WITHOUT Track 1 (steward nomination with ranked nominees)
- Sprint 2 includes: regular member leaves, sole Steward->DeusEx immediate handover, group closure
- All Sprint 2 notifications use the existing standard notification system (v0.2.14, 7 passive types)
- Smart notifications get their own TDD sprint (Sprint 3) with: schema extension (`action_type`, `action_data`, `action_taken` columns on `notifications`), NotificationContext UI updates, server-side action handler
- Track 1 (stewardship nomination) is built in Sprint 3 AFTER smart notification infrastructure exists

**Why:** Smart notifications are a significant new infrastructure feature (schema, UI, server handlers) that will be reused by future features beyond leave-group. Building them as a standalone feature makes each sprint shippable and testable independently.

### D-R2: Security Fixes Before Leave-Group
**Decision:** The following security gaps are fixed in a dedicated Sprint 0 BEFORE any leave-group implementation begins:
1. `journeys_select_published` RLS policy must enforce `is_public` (not just `is_published`)
2. `EnrollmentModal` must check `is_public` before allowing enrollment in non-public journeys
3. `JourneyPlayer` must enforce `frozen` enrollment status (read-only view, block progress)

**What this means:**
- Sprint 0 is a security-focused sprint with its own TDD cycle
- No leave-group work starts until Sprint 0 is complete and verified
- The non-public journey access model must be correct at the RLS level before we build any features that depend on the public/non-public distinction (enrollment freezing, journey access after leaving)

**Why:** The leave-group spec's journey freezing logic assumes non-public journeys have proper access control. Currently they don't — `journeys_select_published` only checks `is_published = true`. Freezing an enrollment is meaningless if the user can still read the journey directly via Supabase API.

### D-R3: Platform Exit Is Admin-Assisted for v1
**Decision:** In v1, there is NO self-service "Leave FringeIsland" button. The platform exit flow is:
1. User self-service leaves each engagement group individually (stewardship transfers happen here — always self-service)
2. User contacts support to request account deactivation
3. Admin uses existing admin panel to deactivate/decommission the account

**What this means:**
- Sprint 2 (leave-group core) builds only the group-level leaving flows
- Sprint 4 (platform exit) builds a lightweight cascade: an admin-facing "exit user from all groups" action, NOT a self-service UI
- Self-service account deletion / "Delete my account" button is deferred to a future polish sprint (Phase 1.6 or later)
- The existing `admin_decommission_user()` and `admin_hard_delete_user()` RPCs remain the only account termination mechanisms

**Why:** Self-service platform exit requires careful GDPR/legal considerations, additional UI flows, and abuse prevention. Admin-assisted is safer for v1 and keeps scope manageable. The group-level stewardship transfer machinery (which is the hard part) is fully self-service regardless.

### D-R4: Timeout Mechanism Deferred to Smart Notifications Sprint
**Decision:** The timeout processing mechanism for Track 1 stewardship nominations (how the system detects that a nominee hasn't responded within X days) is NOT decided now. It will be decided during the smart notifications sprint (Sprint 3).

**What this means:**
- Sprint 0, Sprint 1, and Sprint 2 do not need any timeout infrastructure
- The choice between pg_cron (scheduled server-side job) and lazy client-side checking will be made when Track 1 is being designed
- Default timeout values when eventually implemented: 7 days for invitation acceptance, 30 days for steward absence window — hard-coded, not configurable

**Why:** This decision only affects Track 1 (stewardship nomination flow), which is gated behind smart notifications. There's no value in deciding now — we'll have more context about Supabase capabilities and infrastructure needs by the time Sprint 3 begins.

### D-R5: Forum Content Preserved on Hard Delete
**Decision:** When an admin hard-deletes a user, their forum post CONTENT is preserved. Only the attribution changes to "[Deleted User]" (via the `[Deleted User]` sentinel group).

**What this means:**
- The existing `[Deleted User]` sentinel mechanism (`admin_hard_delete_user()` reassigns `forum_posts.author_group_id` to the sentinel) is the correct and final approach
- Forum posts from deleted users remain readable in group forums
- The display layer shows "Former Member" for members who left a group, and "[Deleted User]" for hard-deleted accounts
- No GDPR-driven content erasure for v1 — if needed later, it would be a separate feature with legal review

**Why:** Preserving content with anonymised attribution is the standard approach (Reddit, Discord, etc.). Erasing content breaks conversation threads and is destructive. The "[Deleted User]" sentinel already exists and works.

---

## Explicit Deferrals — What Is NOT Being Built

Each item below is explicitly deferred. This section prevents scope creep and ensures future sessions don't accidentally pull these into an earlier sprint.

### DEFERRED: Self-Service Platform Exit UI
**What:** A user-facing "Leave FringeIsland" page where users can delete their own account.
**When:** After leave-group v1 is complete and tested. Possibly Phase 1.6 polish or Phase 2.
**Prerequisite:** Leave-group core (Sprint 2) must be fully working first. GDPR/legal review of data retention.
**Current alternative:** Admin-assisted deactivation via the admin panel.

### DEFERRED: Smart Notifications Infrastructure
**What:** Actionable notifications with embedded Yes/No buttons, multi-choice options, and response tracking. Schema columns: `action_type`, `action_data`, `action_taken` on the `notifications` table.
**When:** Sprint 3 (after leave-group core ships in Sprint 2).
**Prerequisite:** Current standard notification system (v0.2.14) continues to work for all Sprint 0-2 notifications.
**Depends on:** Nothing — can be designed and specified independently.

### DEFERRED: Stewardship Nomination Flow (Track 1)
**What:** When the sole Steward leaves, they provide a ranked list of nominees. Smart notifications sent sequentially. Nominees accept/decline. Timeout handling if nominees don't respond.
**When:** Sprint 3 (ships together with smart notifications).
**Prerequisite:** Smart notifications infrastructure, leave-group core (Tracks 2 + group closure).
**Current alternative:** In Sprint 2, the sole Steward can only hand stewardship to DeusEx immediately (Track 2). No nomination flow.

### DEFERRED: Timeout Processing Mechanism
**What:** Server-side or client-side mechanism to detect expired stewardship nominations and automatically progress to the next nominee or fall back to DeusEx.
**When:** Decided and built during Sprint 3 (smart notifications + Track 1).
**Options to evaluate then:** pg_cron scheduled job vs. lazy client-side check vs. hybrid.

### DEFERRED: Groups-Join-Groups UI
**What:** UI for engagement groups to join other engagement groups. Circularity prevention trigger (D11). Group-level leave flow (engagement group leaves parent group).
**When:** Phase 2.
**Current state:** Schema supports it, `has_permission()` works for engagement group actors, integration tests exist. No UI, no circularity trigger.
**Scope exclusion for leave-group:** "This feature covers personal groups leaving engagement groups only. Engagement-group-leaves-engagement-group is out of scope."

### DEFERRED: Configurable Timeout Durations
**What:** Platform settings for stewardship nomination timeout (default: 7 days) and steward absence timeout (default: 30 days).
**When:** Polish sprint after Track 1 is working with hard-coded values.
**Current alternative:** Hard-coded constants in the RPC.

### DEFERRED: GDPR Content Erasure
**What:** On hard delete, erase all forum post content (not just anonymise attribution). Right to be forgotten compliance.
**When:** Before public launch. Requires legal/policy review.
**Current approach:** Content preserved, attribution anonymised to "[Deleted User]".

---

## Confirmed Sprint Structure

### Sprint 0 — Security Fixes
**Goal:** Fix broken non-public journey access control and frozen enrollment enforcement.
**Scope:**
- S1: Update `journeys_select_published` RLS policy to enforce `is_public` — non-public journeys visible only to enrolled users or members of the owning group
- S2: Update `EnrollmentModal` to check `is_public` before allowing enrollment — non-members of the owning group cannot enroll in non-public journeys
- S3: Update `JourneyPlayer` (`app/journeys/[id]/play/page.tsx`) to check `enrollment.status === 'frozen'` — show read-only view with contextual message, block step completion and navigation to new steps
- S4: Add `AND status != 'frozen'` to `enrollment_update_own` and `enrollment_update_group` RLS policies — RLS-level enforcement of frozen status
**Follows TDD:** Behavior specs -> failing tests -> implement -> green tests
**No dependency on any other sprint.**

### Sprint 1 — Foundation Schema
**Goal:** Add the schema pieces that leave-group depends on.
**Scope:**
- F1: `groups.status` column migration — `ALTER TABLE groups ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived', 'suspended'))` + partial index + RLS policy updates (non-admin users only see `status = 'active'` groups)
- F2: Create "FringeIsland Journeys" engagement group via migration — `group_type = 'engagement'`, `is_public = true`. Update all 8 predefined journeys: `SET created_by_group_id = <fi_journeys_id>, is_public = true`
**Depends on:** Sprint 0 complete (so updated RLS correctly protects the new journey ownership)
**Follows TDD.**

### Sprint 2 — Leave Group Core
**Goal:** Implement the leave-group flows that do NOT require smart notifications.
**Scope:**
- L1: Regular member leaves engagement group — confirmation dialog (with Non-Public Journey warning), membership deletion, role cascade, enrollment freezing for non-public journeys, forum anonymisation (query-time "Former Member"), standard notification to Steward(s)
- L2: Sole Steward exits immediately to DeusEx (Track 2) — stewardship transfers to DeusEx, pending invitations reassigned (`added_by_group_id` / `invited_by_group_id` -> DeusEx), exit completes, standard notifications to all group members and DeusEx
- L3: Group closure (last member leaves) — `groups.status -> 'closed'`, all enrollments for that group frozen, non-public journeys `created_by_group_id` transferred to DeusEx, standard notification to DeusEx
**NOT in scope:** Track 1 (stewardship nomination), smart notifications, platform exit
**Depends on:** Sprint 0 + Sprint 1 complete
**Follows TDD with Sprint Agent orchestration.**

### Sprint 3 — Smart Notifications + Track 1
**Goal:** Build actionable notification infrastructure and the stewardship nomination flow.
**Scope:**
- F3: Smart notification schema extension — add `action_type TEXT`, `action_data JSONB`, `action_taken TEXT`, `action_taken_at TIMESTAMPTZ` to `notifications` table
- F3-UI: Update `NotificationContext` and bell UI to render actionable notifications with embedded buttons
- F3-Handler: Server-side action handler (RPC or API route) to process notification responses
- L4: Track 1 stewardship nomination — ranked nominee list UI, sequential invitation dispatch via smart notifications, nominee accept/decline handling, timeout processing (mechanism decided in this sprint), fallback to DeusEx
**Depends on:** Sprint 2 complete (simpler leave-group tracks proven working)
**Timeout mechanism decision made here** (pg_cron vs. lazy vs. hybrid)

### Sprint 4 — Platform Exit (Admin-Assisted) ✅ COMPLETE (v0.2.36)
**Goal:** Enable admin-assisted cascade exit from all groups.
**Completed:** 2026-02-28 | **Tests:** 10 new | **Migration:** `20260228144747_sprint4_platform_exit.sql`
**Scope:**
- ✅ `admin_exit_user_from_platform` SECURITY DEFINER RPC — cascades L1/L2/L3 across all engagement groups
- ✅ Admin UI: "Exit Platform" button in UserActionBar with ConfirmModal
- ✅ Safety guards: self-exit, decommissioned, DeusEx member
- ✅ Decommission + force logout after all groups processed
- ✅ Audit log with detailed per-group metadata
- NOT self-service — admin panel only
**Depends on:** Sprint 2 + Sprint 3 complete (all leave-group tracks working)
**Feature doc:** `docs/features/implemented/platform-exit.md` | **Behaviors:** B-EXIT-001 through B-EXIT-004

---

## Tweaks Applied to `leave_group_feature_review.md` (now at `docs/archive/leave_group_feature_review.md`)

Before Sprint 2 BDD scenarios are written, the spec received these updates (applied 2026-02-28):

1. **Added Prerequisites section (Section 2.5):** Sprint 0 (security fixes) and Sprint 1 (foundation schema) listed as hard prerequisites
2. **Added scope exclusion for groups-join-groups** in Section 2
3. **Marked Track 1 as Sprint 3** — Sections 4.3, 4.4 annotated as requiring smart notification infrastructure
4. **Elevated FringeIsland Journeys migration** from Section 7.1 side note to hard prerequisite in Section 2.5
5. **Resolved frozen enforcement** — both RLS (`AND status != 'frozen'` on enrollment UPDATE policies) and application-layer
6. **Resolved timeout durations** — hard-coded for v1: 7 days (invitation acceptance), 30 days (absence window)
7. **Resolved DeusEx backlog notifications** — standard notifications for v1, smart notifications deferred to Sprint 3
8. **Added Section 12: Platform exit is admin-assisted for v1** (per D-R3)
9. **Added Section 13: Forum content preserved on hard delete** (per D-R5)
