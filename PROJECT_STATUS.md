# FringeIsland - Current Status

**Last Updated:** 2026-02-15 (Communication system bug fixes)
**Current Version:** 0.2.15
**Active Branch:** main

---

## 🎯 What We're Working On NOW

**Current Focus:** Phase 1.5-B - Direct Messaging (next sub-sprint)

**Active Tasks:**
- [x] Create journeys.md behavior spec (B-JRN-001 to B-JRN-007) ✅
- [x] Journey content delivery (JourneyPlayer UI) ✅
- [x] Fix integration test flakiness ✅
- [x] **B-GRP-005: Group Deletion (Danger Zone UI + DELETE RLS)** ✅ **DONE v0.2.12!**
- [x] **B-AUTH-002: Block inactive users on sign-in** ✅ **DONE v0.2.12!**
- [x] **Fix role assignment 403 (user_group_roles RLS)** ✅ **DONE v0.2.12!**
- [x] **Fix group creation 403 (group_memberships bootstrap)** ✅ **DONE v0.2.12!**
- [x] **Fix catalog tables 406 (group_templates/role_templates RLS)** ✅ **DONE v0.2.12!**
- [x] **Fix 9 Supabase Security Advisor warnings (Function Search Path Mutable)** ✅ **DONE v0.2.13!**
- [x] **Document B-ROL-001, B-ROL-002, B-ROL-003 behaviors** ✅ **DONE v0.2.13!**
- [x] **Write role-assignment.test.ts (8 tests, INSERT + SELECT RLS)** ✅ **DONE v0.2.13!**
- [x] **Fix dev dashboard (phase timeline + test stats regex)** ✅ **DONE v0.2.13!**
- [x] **RBAC / Dynamic Permissions System — DESIGN COMPLETE** ✅ (22 decisions, D1-D22)
- [x] **Agent System — Two-tier architecture with continuous learning** ✅ (7 agents, 7 journals, 3-layer learning)
- [x] **Phase 1.5-A: Notification System + Group Forum** ✅ **DONE v0.2.14!**
- [x] **Phase 1.5-B: Direct Messaging** ✅ **DONE v0.2.15!**
- [ ] **NEXT:** RBAC implementation (fully unblocked — all communication infrastructure exists)

**Blocked/Waiting:**
- Nothing blocked — RBAC implementation fully unblocked (all communication infrastructure complete)

---

## 📊 Quick Stats

- **Phase:** 1.5 - Communication System (100% — notifications, forum, messaging all complete)
- **Total Tables:** 17 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 38 migration files
- **Recent Version:** v0.2.15 (Direct Messaging - Feb 15, 2026)
- **Test Coverage:** 157 tests, **157/157 passing** ✅ (stable)
- **Behaviors Documented:** 33 (5 auth, 5 groups, 7 journeys, 3 roles, 7 communication, 6 messaging) ✅
- **Feature Docs:** 3 complete + 3 planned designs (notification-system, group-forum-system, direct-messaging)
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
- ✅ Testing Infrastructure (Jest + integration tests, 157/157 stable) 🧪
- ✅ **RLS Security (all tables protected)** 🔒
- ✅ **Development Dashboard** (visual project status at /dev/dashboard) 📊
- ✅ **RBAC System Design** (22 decisions, ready for implementation) 🔒
- ✅ **Agent System** (7 agents, two-tier architecture, continuous learning) 🤖
- ✅ **Notification System** (7 types, Realtime push, triggers, bell UI) 🔔 v0.2.14
- ✅ **Group Forum** (flat threading, RBAC stub, moderation, tab UI) 💬 v0.2.14
- ✅ **Direct Messaging** (1:1 conversations, inbox, read tracking, Realtime) 📨 **NEW v0.2.15!**

---

## 📚 Quick Context Links

**Essential Reading (always start here):**
- `CLAUDE.md` - Technical patterns and current implementation (auto-loaded)
- `README.md` - Project overview and setup
- `CHANGELOG.md` - Version history
- `docs/planning/ROADMAP.md` - **Phase progress, priorities, what's next**
- `docs/planning/DEFERRED_DECISIONS.md` - **Why we didn't build X (prevents feature creep)**

**For Specific Work:**
- **Database work:** `docs/database/schema-overview.md`
- **Feature development:** `docs/features/implemented/[feature-name].md`
- **Architecture decisions:** `docs/architecture/ARCHITECTURE.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## 🔄 Last Session Summary

**Date:** 2026-02-15 (Communication system bug fixes)
**Summary:**
- ✅ **Investigated forum 403 bug:** Members without a role in `user_group_roles` are blocked by `has_forum_permission()`. Root cause: invitation acceptance flow never assigns a "Member" role. **Decision: Leave for RBAC to fix** (personal group joining engagement group auto-assigns Member role per D21).
- ✅ **Fixed DM sender badge bug:** Sender's own message showed as unread in Messages badge. Fix: update sender's `last_read_at` after sending.
- ✅ **Removed DM notification trigger:** DMs created duplicate alerts (bell + Messages badge). Removed `notify_new_direct_message()` trigger/function. DMs now tracked exclusively via Messages badge.
- ✅ **Fixed "View all notifications" 404:** Link pointed to non-existent `/notifications` page. Replaced with "Dismiss all" button.
- ✅ **Fixed Realtime unread race condition:** Badge flashed (1) when user was already viewing the conversation. Fix: await `last_read_at` update before refreshing count + 500ms delay in MessagingContext.
- ✅ **Updated B-MSG-005 tests:** Now verify DMs do NOT create notifications.

**1 new migration:**
- `20260215183547_remove_dm_notification_trigger.sql` — Drop trigger + function + clean up existing DM notifications

**Test Results:** 157/157 passing ✅ (stable)

**Known Issue (deferred to RBAC):**
- Forum post/reply 403 for members without explicit role assignment. RBAC will fix via D21 (joining groups get Member role by default).

**Previous Session (2026-02-15, earlier):**
- Sprint 1.5-B complete: Direct Messaging system built end-to-end with TDD

**Previous Session (2026-02-14):**
- Phase 1.5-A complete: Notification System + Group Forum (v0.2.14)

**Previous Session (2026-02-13):**
- Agent System built (7 agents, two-tier architecture)

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**RBAC Implementation (fully unblocked — all communication infrastructure complete):**
1. Schema evolution (group_type column, group-to-group memberships, personal groups)
2. Build `has_permission()` SQL function + `usePermissions()` React hook
3. Migrate UI from `isLeader` to `hasPermission()` (parallel run with feature flag)
4. Role management UI (Steward creates/customizes roles)

**Phase 1.6 - Polish and Launch:**
8. Mobile responsiveness audit
9. User onboarding flow
10. E2E tests (Playwright)

**What We're NOT Building Yet:**
- See `docs/planning/DEFERRED_DECISIONS.md` for rationale on deferred features
- Prevents scope creep and keeps focus on MVP

---

## 🛠️ Development Workflows

**Starting a new session?**
- Read: `docs/workflows/boot-up.md`
- Or ask: "Boot up FringeIsland"

**Ending your session?**
- Read: `docs/workflows/close-down.md`
- Or ask: "Close down session"

---

## 📝 Notes

- **Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase (PostgreSQL)
- **Database:** 15 tables with comprehensive RLS policies
- **Repository:** https://github.com/Stefansteffansson/FringeIsland
- **Local Dev:** http://localhost:3000
- **Supabase Project:** [Your Supabase project]
- **TDD MANDATORY:** Behaviors → Tests (RED) → Implement (GREEN). Never write tests last.

---

**This file is the entry point for AI assistants. Update after each significant session.**
