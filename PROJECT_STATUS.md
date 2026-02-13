# FringeIsland - Current Status

**Last Updated:** 2026-02-11 (RBAC Design Complete)
**Current Version:** 0.2.13
**Active Branch:** main

---

## 🎯 What We're Working On NOW

**Current Focus:** Phase 1.5 - Communication System (forums, messaging, notifications)

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
- [ ] **NEXT:** Phase 1.5 - Communication System (forums, messaging)
- [ ] **NEXT:** RBAC implementation (after Phase 1.5 communication infrastructure)

**Blocked/Waiting:**
- RBAC implementation depends on Phase 1.5 messaging (D13: in-app notifications needed for membership flows)

---

## 📊 Quick Stats

- **Phase:** 1.5 - Communication System (0% — not started)
- **Total Tables:** 13 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 33 migration files
- **Recent Version:** v0.2.13 (Security Fixes + Behavior Docs + Tests - Feb 11, 2026)
- **Test Coverage:** 118 tests, **118/118 passing** ✅ (stable)
- **Behaviors Documented:** 20 (5 auth, 5 groups, 7 journeys, 3 roles) ✅
- **Feature Docs:** 3 complete (authentication, journey-system, group-management) ✅
- **Supabase CLI:** Configured and ready for automated migrations ✅

**Completed Major Features:**
- ✅ Authentication & Profile Management
- ✅ Group Management (create, edit, invite, roles)
- ✅ Journey Catalog & Browsing (8 predefined journeys)
- ✅ Journey Enrollment (individual + group)
- ✅ My Journeys Page
- ✅ Journey Content Delivery (JourneyPlayer UI)
- ✅ **Group Deletion (Danger Zone UI + RLS)** 🎯 **NEW v0.2.12!**
- ✅ Error Handling System
- ✅ Testing Infrastructure (Jest + integration tests, 118/118 stable) 🧪
- ✅ **RLS Security (all tables protected)** 🔒
- ✅ **Development Dashboard** (visual project status at /dev/dashboard) 📊
- ✅ **RBAC System Design** (22 decisions, ready for implementation) 🔒

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

**Agent Contexts (focused, minimal):**
- `docs/agents/contexts/database-agent.md` - For DB schema, migrations, RLS
- `docs/agents/contexts/ui-agent.md` - For components, styling, UX
- `docs/agents/contexts/feature-agent.md` - For feature development

---

## 🔄 Last Session Summary

**Date:** 2026-02-11 (RBAC Design Complete — Session 2)
**Summary:**
- ✅ **RBAC Design Complete:** 22 design decisions (D1-D22) across two planning sessions
- ✅ **Q1-Q8 resolved:** Granularity, union, no negatives, has_permission(), caching, migration, guardrails, visitor group
- ✅ **Q9-Q11 resolved:** Schema group-to-group only (D15), preserve data on leaving (D16), four default roles (D17)
- ✅ **New decisions D14-D22:** Role selector UI, data privacy/consent, try-it journeys, system-level grids, joining groups = Member, seeded permissions delta
- ✅ **Key terminology:** "Group Leader" → Steward, "Travel Guide" → Guide, "journey groups" → engagement groups
- ✅ **Planning doc finalized:** `docs/features/planned/dynamic-permissions-system.md`
- ✅ **Memory files updated:** MEMORY.md (90 lines), rbac-planning.md, rls-and-testing.md

**No code changes this session** — design/planning only.

**Previous Session (2026-02-11, Session 1):**
- Security hardening (v0.2.13), behavior docs, role tests, dashboard fixes
- See `docs/planning/sessions/2026-02-11-security-behavior-docs-and-tests.md`

**Test Results:** 118/118 passing ✅ (unchanged)

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**Immediate (Phase 1.5 - Communication System):**
1. [Phase 1.5] Basic messaging system 🚀 **← NEXT** (also infrastructure for RBAC membership flows, D13)
2. [Phase 1.5] Group forums/discussions
3. [Phase 1.5] Notification system (in-app, required for group-joins-group flows)

**RBAC Implementation (after Phase 1.5 messaging infrastructure):**
4. Schema evolution (group_type column, group-to-group memberships, personal groups)
5. Build `has_permission()` SQL function + `usePermissions()` React hook
6. Migrate UI from `isLeader` to `hasPermission()` (parallel run with feature flag)
7. Role management UI (Steward creates/customizes roles)

**Testing & Documentation:**
8. Verify group creation flow end-to-end in browser (after RLS fixes)

**Phase 2 - Journey Experience:**
9. [Phase 2] Facilitator/Guide tools
10. [Phase 2] Group journey coordination
11. [Phase 2] Advanced progress tracking

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
- **Database:** 13 tables with comprehensive RLS policies
- **Repository:** https://github.com/Stefansteffansson/FringeIsland
- **Local Dev:** http://localhost:3000
- **Supabase Project:** [Your Supabase project]

---

**This file is the entry point for AI assistants. Update after each significant session.**
