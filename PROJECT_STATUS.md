# FringeIsland - Current Status

**Last Updated:** 2026-02-16 (RBAC bug fixes + group deletion notifications)
**Current Version:** 0.2.20
**Active Branch:** main

---

## 🎯 What We're Working On NOW

**Current Focus:** RBAC Implementation — All 4 Sub-Sprints COMPLETE!

**Active Tasks:**
- [x] **RBAC Sub-Sprint 1: Schema Foundation** ✅ **DONE v0.2.16!**
- [x] **RBAC Sub-Sprint 2: Permission Resolution** ✅ **DONE v0.2.17!**
- [x] **RBAC Sub-Sprint 3: UI Migration** ✅ **DONE v0.2.18!**
- [x] **RBAC Sub-Sprint 4: Role Management** ✅ **DONE v0.2.19!**
  - [x] B-RBAC-018: manage_roles permission
  - [x] B-RBAC-019: View group roles
  - [x] B-RBAC-020: Create custom role
  - [x] B-RBAC-021: Edit role
  - [x] B-RBAC-022: Delete custom role
  - [x] B-RBAC-023: Permission picker (anti-escalation)
  - [x] B-RBAC-024: Anti-escalation enforcement
  - [x] B-RBAC-025: RLS policies for role management

**Blocked/Waiting:**
- Nothing blocked

---

## 📊 Quick Stats

- **Phase:** RBAC Implementation COMPLETE (4 of 4 sub-sprints done)
- **Total Tables:** 17 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 54 migration files (+7 RBAC +9 bug fixes)
- **Recent Version:** v0.2.20 (RBAC bug fixes + notifications - Feb 16, 2026)
- **Test Coverage:** 319 tests, **319/319 passing** ✅ (stable, 2x QA verified)
- **Behaviors Documented:** 58 (5 auth, 5 groups, 7 journeys, 3 roles, 7 communication, 6 messaging, 25 RBAC) ✅
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
- ✅ **Direct Messaging** (1:1 conversations, inbox, read tracking, Realtime) 📨 v0.2.15
- ✅ **RBAC Sub-Sprint 1** (group types, personal groups, system groups, role rename, template permissions, auto-copy trigger) 🔒 v0.2.16
- ✅ **RBAC Sub-Sprint 2** (has_permission() SQL function, get_user_permissions(), usePermissions() React hook, two-tier resolution) 🔒 v0.2.17
- ✅ **RBAC Sub-Sprint 3** (UI migration: isLeader → hasPermission across 6 components, permission-gated actions) 🔒 v0.2.18
- ✅ **RBAC Sub-Sprint 4** (Role management: manage_roles permission, RLS policies, RoleManagementSection/RoleFormModal/PermissionPicker UI) 🔒 **NEW v0.2.19!**

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

**Date:** 2026-02-16 (RBAC bug fixes + group deletion notifications)
**Summary:**
- ✅ **Fixed cascading RBAC bugs** discovered during real-user testing (Stefan + Agnes):
  - `user_group_roles` INSERT/DELETE RLS: replaced `is_active_group_leader()` with `has_permission('assign_roles')` + `can_assign_role()` anti-escalation
  - AssignRoleModal: added UI-level anti-escalation filtering (users only see roles they can assign)
  - RoleFormModal: added self-lockout warning when removing `manage_roles`/`assign_roles`
  - Auto-assign Member role on invitation acceptance via DB trigger (replaced unreliable client-side code)
  - Bootstrap case for group creation (chicken-and-egg with group_roles INSERT policy)
  - Made `copy_template_permissions` trigger SECURITY DEFINER
  - Backfilled orphaned groups with no roles and members missing Member role
- ✅ **Group deletion notifications** — BEFORE DELETE trigger notifies all members except deleter
- ✅ **Notification UX** — notifications no longer navigate, unread sorted first
- ✅ **9 new migrations applied**, 10 files modified, 3 new DB functions, 2 new triggers

**Bridge Doc:** `docs/planning/sessions/2026-02-16-rbac-bugfixes-and-notifications.md`

**Previous Session (2026-02-16, earlier):**
- RBAC Sub-Sprint 4: Role Management (v0.2.19)

**Previous Session (2026-02-16, earlier):**
- RBAC Sub-Sprint 3: UI migration isLeader → hasPermission (v0.2.18)

**Previous Session (2026-02-15):**
- Communication system bug fixes, DM sender badge, notification trigger removal

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**RBAC Implementation COMPLETE (4 of 4 sub-sprints):**
1. ~~Schema evolution (group_type, personal groups, system groups, role rename)~~ ✅ **DONE**
2. ~~`has_permission()` SQL function + `usePermissions()` React hook~~ ✅ **DONE**
3. ~~Migrate UI from `isLeader` to `hasPermission()`~~ ✅ **DONE**
4. ~~Role management UI (manage_roles, RLS, UI components)~~ ✅ **DONE**

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
