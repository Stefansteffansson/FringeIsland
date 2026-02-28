# FringeIsland - Current Status

**Last Updated:** 2026-02-28 (Sprint 3 — Smart Notifications + Steward Nomination complete)
**Current Version:** 0.2.35
**Active Branch:** main

---

## What We're Working On NOW

**Current Focus:** Sprint 3 COMPLETE — Sprint 4 (Platform Exit) is next

**Key Docs:**
- `docs/planning/lifecycle-roadmap-decisions.md` — **Single source of truth** for sprint structure and decisions
- `docs/features/implemented/smart-notifications.md` — Sprint 3 feature doc (COMPLETE)
- `docs/specs/behaviors/notifications.md` — B-NOTIF-001, B-NOTIF-002, B-NOTIF-003 (Smart Notifications)
- `docs/specs/behaviors/groups.md` — B-GRP-011 (Stewardship Nomination)

**Active Tasks:**
- [x] **Sprint 3 — Smart Notifications + Steward Nomination** ✅ DONE — F3 (schema) + F3-UI (actionable bell) + F3-Handler (RPC) + L4 (nomination flow), 19 new tests, v0.2.35
- [x] **Sprint 2 — Leave Group Core** ✅ DONE — L1 + L2 + L3, 17 new tests, v0.2.34
- [x] **Sprint 1 — Foundation Schema** ✅ DONE — F1 + F2, 19 new tests, v0.2.33
- [x] **Sprint 0 — Security Fixes** ✅ DONE — S1-S4, 19 new tests, v0.2.32

**Blocked/Waiting:**
- None

**Previous Features (COMPLETE):**
- [x] **Sprint 0 — Security Fixes** ✅ v0.2.32
- [x] **Personal Group RLS Visibility Fix** ✅ v0.2.31
- [x] **Display Name / Nickname System** ✅ v0.2.30
- [x] **Performance Optimization** ✅ All tiers (1A-3B)
- [x] **DeusEx Admin Foundation** ✅ v0.2.21-v0.2.25
- [x] **D15 Universal Group Pattern** ✅ v0.2.29

---

## Quick Stats

- **Phase:** Sprint 3 COMPLETE — Sprint 4 (Platform Exit) is next
- **Total Tables:** 19 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 15 active + 71 archived
- **Recent Version:** v0.2.35 (Sprint 3 — Smart Notifications + Steward Nomination)
- **Test Coverage:** 540 integration + 99 unit + 4 setup = **649+ tests** ✅ (was 630)
- **Behaviors Documented:** 101 (97 previous + 4 Sprint 3: B-NOTIF-001, B-NOTIF-002, B-NOTIF-003, B-GRP-011) ✅
- **Feature Docs:** 15 implemented + 0 active + 1 planned design + 1 roadmap (lifecycle decisions)
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
- ✅ **RLS Security (all tables protected + Sprint 0 security fixes)** v0.2.32
- ✅ **Foundation Schema (groups.status + FI Journeys group)** v0.2.33
- ✅ **Leave Group Core (L1 regular leave + L2 DeusEx handover + L3 group closure)** v0.2.34
- ✅ **Smart Notifications + Steward Nomination** (actionable notifs, accept/decline, Track 1 nomination) v0.2.35
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
- **Latest feature:** `docs/features/implemented/smart-notifications.md` ← **LATEST**
- **Admin feature (complete):** `docs/features/implemented/deusex-admin-foundation.md`
- **Lifecycle roadmap:** `docs/planning/lifecycle-roadmap-decisions.md` ← **NEW** (5 sprints, 5 decisions)
- **Architecture decisions:** `docs/architecture/ARCHITECTURE.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-02-28 (Sprint 3 — Smart Notifications + Steward Nomination)
**Summary:**
- Completed Sprint 3: Smart Notifications + Steward Nomination — full TDD workflow, v0.2.35
- F3: Smart notification schema — 5 new columns, consistency constraint, pending action index
- F3-UI: NotificationBell updated with Accept/Decline buttons, loading spinners, actioned/expired badges
- F3-Handler: `handle_notification_action` SECURITY DEFINER RPC with ownership, expiry, action validation
- L4: Stewardship nomination — `nominate_steward` RPC, ranked nominees, sequential notifications, 7-day expiry, DeusEx fallback
- Internal helper `_handle_stewardship_nomination_action` for accept/decline side effects
- 19 new integration tests (11 smart-notifications + 8 stewardship-nomination), all GREEN

**Key files:**
- `supabase/migrations/20260228125730_sprint3_smart_notifications.sql` — schema + RPCs
- `tests/integration/communication/smart-notifications.test.ts` — 11 tests (B-NOTIF-001, B-NOTIF-003)
- `tests/integration/groups/stewardship-nomination.test.ts` — 8 tests (B-GRP-011)
- `lib/notifications/NotificationContext.tsx` — handleAction method added
- `components/notifications/NotificationBell.tsx` — actionable UI with Accept/Decline buttons
- `docs/features/implemented/smart-notifications.md` — Feature doc
- `docs/specs/behaviors/notifications.md` — B-NOTIF-001, B-NOTIF-002, B-NOTIF-003
- `docs/specs/behaviors/groups.md` — B-GRP-011 (Stewardship Nomination)

**Previous Sessions:**
- 2026-02-28: Sprint 2 — Leave Group Core + Feature Doc Review (v0.2.34)
- 2026-02-28: Sprint 1 — Foundation Schema (v0.2.33)
- 2026-02-28: Sprint 0 — Security Fixes + Feature Doc Review (v0.2.32)
- 2026-02-28: Lifecycle Roadmap Decisions + feature doc reorganization
- 2026-02-27: Leave Group Feature Review + [Deleted User] sentinel seed
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

**See `docs/features/implemented/performance-optimization.md` for full plan**

**Display Name / Nickname System COMPLETE** ✅

**Sprint 1 — Foundation Schema COMPLETE** ✅ (v0.2.33)

**Sprint 2 — Leave Group Core COMPLETE** ✅ (v0.2.34)

**Sprint 3 — Smart Notifications + Steward Nomination COMPLETE** ✅ (v0.2.35)

**Next — Sprint 4: Platform Exit (admin-assisted):**
Admin action "Exit user from all groups" — iterate all memberships, apply appropriate leave track (L1/L2/L4) per group, then deactivate/decommission. NOT self-service.
See `docs/planning/lifecycle-roadmap-decisions.md` for full sprint structure.

**After lifecycle features — Phase 1.6 Polish and Launch:**
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
