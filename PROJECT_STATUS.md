# FringeIsland - Current Status

**Last Updated:** 2026-02-27 (Leave Group Feature Review + [Deleted User] sentinel seed)
**Current Version:** 0.2.31
**Active Branch:** main

---

## What We're Working On NOW

**Current Focus:** Leave Group Feature Specification — review and refinement complete

**Design Doc:** `docs/features/planned/leave_group_feature_review.md`

**Active Tasks:**
- [x] **Leave Group Feature Review** ✅ DONE — multi-round analysis, 9 ambiguities resolved
- [x] **[Deleted User] Sentinel Seed** ✅ DONE — migration applied, system group now exists in DB
- [ ] **Leave Group Implementation** — Next: TDD workflow (behaviors → RED tests → implement)

**Blocked/Waiting:**
- None

**Previous Features (COMPLETE):**
- [x] **Personal Group RLS Visibility Fix** ✅ v0.2.31
- [x] **Display Name / Nickname System** ✅ v0.2.30
- [x] **Performance Optimization** ✅ All tiers (1A-3B)
- [x] **DeusEx Admin Foundation** ✅ v0.2.21-v0.2.25
- [x] **D15 Universal Group Pattern** ✅ v0.2.29

---

## Quick Stats

- **Phase:** Leave Group Feature Specification COMPLETE — ready for implementation
- **Total Tables:** 19 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 11 active + 71 archived
- **Recent Version:** v0.2.31 (Fix personal group RLS visibility)
- **Test Coverage:** 466 integration + 99 unit + 4 setup = **569 tests** ✅
- **Behaviors Documented:** 88 (77 previous + 11 display-name) ✅
- **Feature Docs:** 5 complete + 2 planned designs (leave-group refined) + 1 active (performance)
- **Supabase CLI:** Configured and ready for automated migrations ✅

**Completed Major Features:**
- ✅ Authentication & Profile Management
- ✅ Group Management (create, edit, invite, roles)
- ✅ Journey Catalog & Browsing (8 predefined journeys)
- ✅ Journey Enrollment (individual + group)
- ✅ My Journeys Page
- ✅ Journey Content Delivery (JourneyPlayer UI)
- ✅ **Group Deletion (Danger Zone UI + RLS)** v0.2.12
- ✅ Error Handling System
- ✅ Testing Infrastructure (Jest + integration tests)
- ✅ **RLS Security (all tables protected)**
- ✅ **Development Dashboard** (visual project status at /dev/dashboard)
- ✅ **RBAC System Design** (22 decisions, fully implemented)
- ✅ **Agent System** (7 agents, two-tier architecture, continuous learning)
- ✅ **Notification System** (7 types, Realtime push, triggers, bell UI) v0.2.14
- ✅ **Group Forum** (flat threading, RBAC stub, moderation, tab UI) v0.2.14
- ✅ **Direct Messaging** (1:1 conversations, inbox, read tracking, Realtime) v0.2.15
- ✅ **RBAC Implementation** (4 sub-sprints: schema, permissions, UI migration, role management) v0.2.16-v0.2.20
- ✅ **DeusEx Admin Foundation** (route protection, dashboard, member management, audit log) v0.2.21-v0.2.25
- ✅ **D15 Universal Group Pattern** (schema rebuild, 28-step frontend migration, all residuals fixed) v0.2.29
- ✅ **Display Name / Nickname System** (nickname, display preference toggle, real name visibility, 28 tests) v0.2.30

---

## Quick Context Links

**Essential Reading (always start here):**
- `CLAUDE.md` - Technical patterns and current implementation (auto-loaded)
- `README.md` - Project overview and setup
- `CHANGELOG.md` - Version history
- `docs/planning/ROADMAP.md` - **Phase progress, priorities, what's next**
- `docs/planning/DEFERRED_DECISIONS.md` - **Why we didn't build X (prevents feature creep)**

**For Specific Work:**
- **Database work:** `docs/database/schema-overview.md`
- **Feature development:** `docs/features/implemented/[feature-name].md`
- **Latest feature:** `docs/features/implemented/display-name-system.md` ← **LATEST**
- **Admin feature (complete):** `docs/features/active/deusex-admin-foundation.md`
- **Architecture decisions:** `docs/architecture/ARCHITECTURE.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-02-27 (Leave Group Feature Review + [Deleted User] sentinel seed)
**Summary:**
- Multi-round analysis of `leave_group_feature_review.md` — cross-referenced with actual DB schema (19 tables)
- Identified and resolved 9 ambiguities: group soft delete, exclusive journey naming, notification scope, pending invitation transfer, frozen enrollment, predefined journey ownership, [Deleted User] sentinel, group closure logging
- Created and applied migration `20260227120843_seed_deleted_user_sentinel_group.sql` — seeds the `[Deleted User]` system group that `admin_hard_delete_user` RPC references (was missing, causing content to fallback to admin's personal group)
- No application code changes — documentation and 1 seed migration only

**Key decisions:**
- Group lifecycle via `groups.status` column: `'active'`, `'closed'`, `'archived'`, `'suspended'` — groups never hard-deleted
- "Exclusive Journey" renamed → "Non-Public Journey" (`is_public = false`) — no new schema column needed
- `journey_enrollments.status = 'frozen'` for read-only access when member leaves group (already in CHECK constraint)
- Predefined journeys to be owned by "FringeIsland Journeys" engagement group (future migration)
- Pending invitations from departing Steward: `added_by_group_id`/`invited_by_group_id` transferred to DeusEx
- No DeusEx notification for simple group closures — `admin_audit_log` sufficient (no general event log yet)

**Previous Sessions:**
- 2026-02-27: Fix personal group RLS visibility (v0.2.31)
- 2026-02-27: Display Name / Nickname System — full TDD sprint (v0.2.30)
- 2026-02-24: Admin bug fixes + hard delete trigger bypass + orphan group issue identified
- 2026-02-24: Force logout responsiveness + stale session error handling
- 2026-02-23: Fix PGRST201 ambiguous FK errors
- 2026-02-23: Test Data Cleanup + Script Housekeeping
- 2026-02-23: Enhanced Member Invitations — typeahead, pending email invitations, 14 tests
- 2026-02-23: Database cleanup + D15 residual fixes
- 2026-02-23: D15 Hardening Sprint, Claude Code permissions cleanup
- 2026-02-22: D15 migration audit, residual fixes, documentation

---

## Next Priorities

**See `docs/features/active/performance-optimization.md` for full plan**

**Display Name / Nickname System COMPLETE** ✅

**Next — Leave Group Feature (PRIORITY):**
Full leave/exit group implementation — see `docs/features/planned/leave_group_feature_review.md` for complete specification.
Key tracks:
1. **Track 1** — Last Steward leaves (stewardship transfer or group closure)
2. **Track 2** — Regular member leaves (clean exit with enrollment freezing)
3. **Track 3** — Platform exit (cascading leave across all groups)
Includes: group lifecycle (`groups.status`), enrollment freezing, pending invitation transfer, forum anonymisation, smart notifications.

**Approaches to consider:**
- **Pre-check approach:** Before executing the action, query for groups where user is last Steward. If any found, show a transfer modal. Only proceed after all groups have new Stewards assigned.
- **Database-level approach:** New RPC that handles the full flow atomically — detect orphans, assign new steward, then delete.
- **UI flow:** Modal listing affected groups with dropdowns to select new Steward per group. Options: existing group members, DeusEx admin, or search for any user (auto-join if needed).

**After orphan fix — Phase 1.6 Polish and Launch:**
1. Mobile responsiveness audit
2. User onboarding flow
3. E2E tests (Playwright)

**Known Issues:**
- **Orphan groups after hard delete** — groups lose their last Steward (no admin, no one can manage). Needs stewardship transfer UI.
- `app/admin/fix-orphans/page.tsx` uses `alert()` (should use ConfirmModal)
- Hydration mismatch warning in `AuthForm.tsx:60` (cosmetic, non-blocking)
- WebSocket/Realtime connection warning in console (cosmetic, non-blocking)
- Realtime broadcast for force-logout may not work without Realtime Authorization policies (polling fallback handles this)
- `signOut({ scope: 'local' })` broken in supabase-js 2.91.0 — makes server call despite docs saying local-only
- Console 403 errors on force-logout redirect (browser-level network logs, not visible to end users)

**What We're NOT Building Yet:**
- See `docs/planning/DEFERRED_DECISIONS.md` for rationale on deferred features
- Prevents scope creep and keeps focus on MVP

---

## Development Workflows

**Starting a new session?**
- Read: `docs/workflows/boot-up.md`
- Or ask: "Boot up FringeIsland"

**Ending your session?**
- Read: `docs/workflows/close-down.md`
- Or ask: "Close down session"

---

## Notes

- **Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase (PostgreSQL)
- **Database:** 18 tables with comprehensive RLS policies
- **Repository:** https://github.com/Stefansteffansson/FringeIsland
- **Local Dev:** http://localhost:3000
- **Supabase Project:** [Your Supabase project]
- **TDD MANDATORY:** Behaviors → Tests (RED) → Implement (GREEN). Never write tests last.

---

**This file is the entry point for AI assistants. Update after each significant session.**
