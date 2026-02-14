# FringeIsland - Current Status

**Last Updated:** 2026-02-14 (Phase 1.5-A: Notifications + Forum)
**Current Version:** 0.2.14
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
- [ ] **NEXT:** Phase 1.5-B - Direct Messaging (user-to-user)
- [ ] **NEXT:** RBAC implementation (partially unblocked — notifications infrastructure exists)

**Blocked/Waiting:**
- RBAC implementation partially unblocked (notifications exist), full unblock after Phase 1.5-B messaging

---

## 📊 Quick Stats

- **Phase:** 1.5 - Communication System (~50% — notifications + forum done, messaging next)
- **Total Tables:** 15 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 36 migration files
- **Recent Version:** v0.2.14 (Notifications + Forum - Feb 14, 2026)
- **Test Coverage:** 138 tests, **138/138 passing** ✅ (stable)
- **Behaviors Documented:** 27 (5 auth, 5 groups, 7 journeys, 3 roles, 7 communication) ✅
- **Feature Docs:** 3 complete + 2 planned designs (notification-system, group-forum-system)
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
- ✅ Testing Infrastructure (Jest + integration tests, 138/138 stable) 🧪
- ✅ **RLS Security (all tables protected)** 🔒
- ✅ **Development Dashboard** (visual project status at /dev/dashboard) 📊
- ✅ **RBAC System Design** (22 decisions, ready for implementation) 🔒
- ✅ **Agent System** (7 agents, two-tier architecture, continuous learning) 🤖
- ✅ **Notification System** (7 types, Realtime push, triggers, bell UI) 🔔 **NEW v0.2.14!**
- ✅ **Group Forum** (flat threading, RBAC stub, moderation, tab UI) 💬 **NEW v0.2.14!**

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

**Date:** 2026-02-14 (Phase 1.5-A: Notifications + Forum)
**Summary:**
- ✅ **Sprint 1.5-A complete:** Notification System + Group Forum built end-to-end
- ✅ **Notification system:** `notifications` table, 6 SECURITY DEFINER trigger functions, 5 triggers on group_memberships + user_group_roles, Supabase Realtime subscriptions, NotificationProvider context, NotificationBell dropdown in nav
- ✅ **Group forum:** `forum_posts` table, `has_forum_permission()` RBAC-compatible stub, flat two-level threading enforced by trigger, ForumSection/ForumPost/ForumComposer/ForumReplyList components, tab navigation on group detail page
- ✅ **Bug found and fixed:** Cascade delete FK violation in notification trigger (group deleted but trigger tried to reference it)
- ✅ **20 new integration tests:** 10 notification + 10 forum, all passing
- ✅ **7 new behavior specs:** B-COMM-001 through B-COMM-007
- ✅ **Design docs saved:** `docs/features/planned/notification-system.md` + `group-forum-system.md`
- ✅ **Agent system first real use:** Sprint → Architect → Database → UI → Test agents all used
- ⚠️ **Process lesson:** TDD ordering was violated (tests written last instead of first). Fixed Sprint Agent playbook, Agent README, and MEMORY.md to enforce correct ordering in future.

**3 new migrations:**
- `20260214161709_notification_system.sql` — notifications table + triggers
- `20260214161716_add_group_forum_posts.sql` — forum_posts table + RBAC stub
- `20260214230404_fix_notification_cascade_delete.sql` — cascade delete bugfix

**Test Results:** 138/138 passing ✅ (was 118)

**Previous Session (2026-02-13):**
- Agent System built (7 agents, two-tier architecture)

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**Immediate (Phase 1.5-B - Direct Messaging):**
1. [Phase 1.5-B] Direct messaging between users (user-to-user conversations)
2. [Phase 1.5-B] Inbox/Messages page
3. [Phase 1.5-B] Read/unread status for messages

**RBAC Implementation (partially unblocked):**
4. Schema evolution (group_type column, group-to-group memberships, personal groups)
5. Build `has_permission()` SQL function + `usePermissions()` React hook
6. Migrate UI from `isLeader` to `hasPermission()` (parallel run with feature flag)
7. Role management UI (Steward creates/customizes roles)

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
