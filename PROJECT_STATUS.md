# FringeIsland - Current Status

**Last Updated:** 2026-02-20 (Hotfix: Auth deadlock + Tier 2C)
**Current Version:** 0.2.27
**Active Branch:** main

---

## What We're Working On NOW

**Current Focus:** Performance Optimization — system-wide responsiveness overhaul

**Design Doc:** `docs/features/active/performance-optimization.md` (COMPLETE — full analysis + implementation plan)

**Active Tasks:**
- [x] **Admin infinite re-render bug** ✅ FIXED (useCallback wrapping)
- [x] **AdminDataPanel optimizations** ✅ DONE (single query, prefetch, debounce, two-tier loading)
- [x] **Deep performance analysis** ✅ DONE (5 root causes identified, 3-tier fix plan)
- [x] **Tier 1A: Add missing indexes** ✅ DONE — 3 composite indexes (groups.group_type, memberships, ugr)
- [x] **Tier 1B: Admin service_role route** ✅ DONE — /api/admin/users bypasses RLS, 11 TDD tests
- [x] **Tier 1C: Shared UserProfile context** ✅ DONE — eliminated 4-6 duplicate queries/page across 20+ files
- [x] **HOTFIX: Auth deadlock in Supabase SSR** ✅ FIXED — profile resolution moved out of onAuthStateChange
- [x] **HOTFIX: Navigation null safety** ✅ FIXED — full_name?.charAt(0) + safe alt attribute
- [x] **HOTFIX: Admin API cookie auth** ✅ FIXED — pass JWT via Authorization header
- [x] **Tier 2C: Remove has_permission() from SELECT RLS policies** ✅ DONE — admin handled by service_role
- [ ] **Tier 2A: Parallelize group detail queries** — 8 sequential → 3 parallel steps
- [ ] **Tier 2B: Fix N+1 on My Groups** — RPC for batch member counts
- [ ] **Tier 3: Admin polish** — debounce commonGroupCount, deduplicate stats

**Blocked/Waiting:**
- None — Tier 2 ready to implement

**Previous Feature (COMPLETE):**
- [x] **Admin Sub-Sprint 1: DB Foundation** ✅ v0.2.21
- [x] **Admin Sub-Sprint 2: Admin Panel UI** ✅ v0.2.21
- [x] **Admin Sub-Sprint 3: User Management Actions** ✅ v0.2.25

---

## Quick Stats

- **Phase:** Performance Optimization (Tier 1 + 2C COMPLETE, Tier 2A/2B next)
- **Total Tables:** 18 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 69 migration files
- **Recent Version:** v0.2.27 (Hotfix: auth deadlock + Tier 2C admin SELECT policy removal)
- **Test Coverage:** 414 integration + 99 unit + 4 setup = **517 tests, all passing** ✅
- **Behaviors Documented:** 77 (58 previous + 19 admin) ✅
- **Feature Docs:** 4 complete + 3 planned designs + 1 active (performance)
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
- **Active feature:** `docs/features/active/performance-optimization.md` ← **START HERE**
- **Admin feature (complete):** `docs/features/active/deusex-admin-foundation.md`
- **Architecture decisions:** `docs/architecture/ARCHITECTURE.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-02-20 (Hotfix: Auth deadlock + Tier 2C)
**Summary:**
- **CRITICAL HOTFIX:** Fixed Supabase SSR auth deadlock — `@supabase/ssr`'s `createBrowserClient` deadlocks when DB queries run inside `onAuthStateChange`. Restructured AuthContext to resolve profile in a separate `useEffect`.
- **Tier 2C COMPLETE:** Dropped admin SELECT policies using `has_permission()` from users, group_memberships, user_group_roles, and groups tables. These caused query hangs for all authenticated users.
- Fixed Navigation null safety (`full_name?.charAt(0)`)
- Fixed admin API 401 — AdminDataPanel now passes JWT via Authorization header

**Files Created:**
- `supabase/migrations/20260220120833_hotfix_drop_admin_select_policies.sql`

**Files Modified:**
- `lib/auth/AuthContext.tsx` — restructured: profile resolution now in separate useEffect, not inside onAuthStateChange
- `components/Navigation.tsx` — null safety for full_name and avatar alt
- `components/admin/AdminDataPanel.tsx` — pass JWT via Authorization header for admin API

**Previous Sessions (2026-02-20):**
- Performance Tier 1 implementation (indexes, shared profile, admin API route) — v0.2.26
- Performance analysis + admin bug fixes (design doc created)
- Admin Sub-Sprint 3C UI wiring: all 10 action buttons with modals (v0.2.25)

---

## Next Priorities

**See `docs/features/active/performance-optimization.md` for full plan**

**Tier 1 + 2C COMPLETE** ✅

**Next — Performance Optimization (Tier 2A/2B):**
1. Parallelize group detail page queries (8 sequential → 3 parallel steps)
2. Fix N+1 on My Groups with batch RPC

**Then — Phase 1.6 Polish and Launch:**
7. Mobile responsiveness audit
8. User onboarding flow
9. E2E tests (Playwright)

**Known Issues:**
- `app/admin/fix-orphans/page.tsx` uses `alert()` (should use ConfirmModal)
- `ROADMAP.md` "Next Priorities" section is outdated (still references Phase 1.5 as next)
- Groups SELECT policy `has_permission()` adds latency (~2s) — addressed in Tier 2C

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
