# FringeIsland - Current Status

**Last Updated:** 2026-02-16 (RBAC Sub-Sprint 2 complete)
**Current Version:** 0.2.17
**Active Branch:** main

---

## 🎯 What We're Working On NOW

**Current Focus:** RBAC Implementation — Sub-Sprint 2 complete, Sub-Sprint 3 next

**Active Tasks:**
- [x] **RBAC Sub-Sprint 1: Schema Foundation** ✅ **DONE v0.2.16!**
  - [x] B-RBAC-001: Permission catalog (41 permissions, D22 changes)
  - [x] B-RBAC-002: Group types (system/personal/engagement)
  - [x] B-RBAC-003: Personal groups on signup
  - [x] B-RBAC-004: Role template permissions (57 rows)
  - [x] B-RBAC-005: Group role permission initialization (template copy + trigger)
  - [x] B-RBAC-006: System groups (FI Members, Visitor, Deusex)
  - [x] B-RBAC-007: Role renaming (Steward/Guide in templates, group_roles, functions, policies)
- [x] **RBAC Sub-Sprint 2: Permission Resolution** ✅ **DONE v0.2.17!**
  - [x] B-RBAC-008: Engagement group permission resolution (Tier 2)
  - [x] B-RBAC-009: System group permission resolution (Tier 1, additive)
  - [x] B-RBAC-010: Permission check edge cases (fail closed)
  - [x] B-RBAC-011: usePermissions() React hook (created, not unit-tested yet)
  - [x] B-RBAC-012: Deusex has all permissions (41/41)
- [ ] **NEXT:** RBAC Sub-Sprint 3: UI migration (isLeader → hasPermission)
- [ ] **THEN:** RBAC Sub-Sprint 4: Role management UI

**Blocked/Waiting:**
- Nothing blocked

---

## 📊 Quick Stats

- **Phase:** RBAC Implementation (Sub-Sprint 2 of 4 complete)
- **Total Tables:** 17 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 43 migration files (+5 RBAC)
- **Recent Version:** v0.2.17 (RBAC Sub-Sprint 2 - Feb 16, 2026)
- **Test Coverage:** 238 tests, **238/238 passing** ✅ (stable)
- **Behaviors Documented:** 45 (5 auth, 5 groups, 7 journeys, 3 roles, 7 communication, 6 messaging, 12 RBAC) ✅
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
- ✅ **RBAC Sub-Sprint 2** (has_permission() SQL function, get_user_permissions(), usePermissions() React hook, two-tier resolution) 🔒 **NEW v0.2.17!**

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

**Date:** 2026-02-16 (RBAC Sub-Sprint 2: Permission Resolution)
**Summary:**
- ✅ **Full TDD workflow:** Behavior specs (5 behaviors, B-RBAC-008 through B-RBAC-012) → Failing tests (24 RED) → Design → Implement (GREEN) → QA → Document
- ✅ **1 migration applied:**
  - `20260216111905_rbac_permission_resolution.sql` — `has_permission()` + `get_user_permissions()` SQL functions
- ✅ **Created `usePermissions()` React hook** (`lib/hooks/usePermissions.ts`)
- ✅ **Two-tier permission resolution:** System groups (Tier 1, always active) + context groups (Tier 2, group-scoped)
- ✅ **Security:** Both functions SECURITY DEFINER with search_path='', NULL→false fail-closed
- ✅ **Deusex validated:** All 41 permissions granted via normal resolution (no bypass)

**Test Results:** 238/238 passing ✅ (24 new permission tests + 214 existing, zero regressions)

**Bridge Doc:** `docs/planning/sessions/2026-02-16-rbac-sub-sprint-2.md`

**Previous Session (2026-02-15):**
- Communication system bug fixes, DM sender badge, notification trigger removal

**Previous Session (2026-02-15, earlier):**
- Sprint 1.5-B complete: Direct Messaging system built end-to-end with TDD

**Previous Session (2026-02-14):**
- Phase 1.5-A complete: Notification System + Group Forum (v0.2.14)

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**RBAC Implementation (Sub-Sprint 2 of 4 complete):**
1. ~~Schema evolution (group_type, personal groups, system groups, role rename)~~ ✅ **DONE**
2. ~~`has_permission()` SQL function + `usePermissions()` React hook~~ ✅ **DONE**
3. Migrate UI from `isLeader` to `hasPermission()` ← **NEXT**
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
