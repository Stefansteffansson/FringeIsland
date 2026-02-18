# FringeIsland - Current Status

**Last Updated:** 2026-02-18 (Admin User Actions — specs + failing tests)
**Current Version:** 0.2.21
**Active Branch:** main

---

## What We're Working On NOW

**Current Focus:** DeusEx Admin Foundation — Sub-Sprint 3 (User Management Actions) — TDD RED phase complete, ready for Design

**Active Tasks:**
- [x] **Admin Sub-Sprint 1: DB Foundation** ✅ **DONE v0.2.21**
  - [x] B-ADMIN-004: Auto-grant permissions trigger
  - [x] B-ADMIN-005: Last DeusEx member protection
  - [x] B-ADMIN-006: DeusEx bootstrap migration
  - [x] B-ADMIN-007: Admin audit log + RLS
- [x] **Admin Sub-Sprint 2: Admin Panel UI** ✅ **DONE v0.2.21**
  - [x] B-ADMIN-001: Admin route protection (layout gate)
  - [x] B-ADMIN-002: Admin dashboard (4 stat cards + data panels)
  - [x] B-ADMIN-003: DeusEx member management (invite/remove)
- [ ] **Admin Sub-Sprint 3: User Management Actions** — IN PROGRESS (TDD RED done)
  - [x] Behavior specs written (19 total in admin.md — 7 unchanged, 5 revised, 7 new)
  - [x] Feature doc updated with Sub-Sprint 3 scope (decisions 7-14)
  - [x] Failing tests written: 28 tests across 5 files (17 failing, 11 passing)
  - [ ] **NEXT: Step 4 — Design** (Architect Agent: schema, RLS, RPCs)
  - [ ] Step 5 — Implement DB migrations (is_decommissioned, admin UPDATE policy, RPCs, group visibility)
  - [ ] Step 6 — Verify GREEN for Sub-Sprint 3A
  - [ ] Steps 7-11 — Sub-Sprint 3B: UI (selection model, action bar, panel rename)
  - [ ] Steps 12-16 — Sub-Sprint 3C: Wire all 10 actions + document

**Blocked/Waiting:**
- None — ready to proceed with Step 4 (Design)

---

## Quick Stats

- **Phase:** Admin Foundation (Sub-Sprints 1+2 complete, user management pending)
- **Total Tables:** 18 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅ (+admin_audit_log)
- **Total Migrations:** 62 migration files (+8 admin foundation)
- **Recent Version:** v0.2.21 (DeusEx Admin Foundation - Feb 17, 2026)
- **Test Coverage:** 377 tests (349 existing + 28 new admin), **349 passing, 17 failing (new RED tests)** — existing tests not re-verified
- **Behaviors Documented:** 77 (58 previous + 19 admin) ✅
- **Feature Docs:** 4 complete + 3 planned designs
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
- ✅ Testing Infrastructure (Jest + integration tests) 🧪
- ✅ **RLS Security (all tables protected)** 🔒
- ✅ **Development Dashboard** (visual project status at /dev/dashboard) 📊
- ✅ **RBAC System Design** (22 decisions, fully implemented) 🔒
- ✅ **Agent System** (7 agents, two-tier architecture, continuous learning) 🤖
- ✅ **Notification System** (7 types, Realtime push, triggers, bell UI) 🔔 v0.2.14
- ✅ **Group Forum** (flat threading, RBAC stub, moderation, tab UI) 💬 v0.2.14
- ✅ **Direct Messaging** (1:1 conversations, inbox, read tracking, Realtime) 📨 v0.2.15
- ✅ **RBAC Implementation** (4 sub-sprints: schema, permissions, UI migration, role management) 🔒 v0.2.16-v0.2.20
- ✅ **DeusEx Admin Foundation** (route protection, dashboard, member management, audit log) 🔑 **NEW v0.2.21**

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
- **Active feature:** `docs/features/active/deusex-admin-foundation.md`
- **Architecture decisions:** `docs/architecture/ARCHITECTURE.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-02-18 (Admin User Actions — specs + failing tests)
**Summary:**
- ✅ **Defined all user management requirements** with user (10 decisions)
- ✅ **Rewrote admin behavior spec** — 19 behaviors total (7 unchanged, 5 revised, 7 new)
- ✅ **Updated feature doc** with Sub-Sprint 3 scope (decisions 7-14, sub-sprint breakdowns)
- ✅ **Created sprint plan** — 16 steps across 3 sub-sprints (3A DB, 3B UI, 3C Wire)
- ✅ **Wrote 28 failing tests** across 5 new test files (TDD RED phase complete)
- ✅ **Fixed test false positive** in admin-group-visibility (added outsider user)
- ⚠️ Full suite verification interrupted — verify 349 existing tests at start of next session

**Bridge Doc:** `docs/planning/sessions/2026-02-18-admin-user-actions-specs-and-tests.md`

**Previous Session (2026-02-17):**
- DeusEx Admin Foundation Sub-Sprints 1+2 + crash recovery (v0.2.21)

---

## Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**Immediate — Admin Sub-Sprint 3 (TDD RED done, continue with Design):**
1. Verify existing 349 tests still pass (interrupted last session)
2. Step 4: Design — `is_decommissioned` column, admin UPDATE policy, RPCs, group visibility policy
3. Step 5: Implement DB migrations
4. Step 6: Verify GREEN for Sub-Sprint 3A (B-ADMIN-008 through B-ADMIN-012)
5. Steps 7-16: Sub-Sprints 3B (UI) and 3C (Wire actions)

**Phase 1.6 - Polish and Launch:**
7. Mobile responsiveness audit
8. User onboarding flow
9. E2E tests (Playwright)

**Known Issues:**
- `app/admin/fix-orphans/page.tsx` uses `alert()` (should use ConfirmModal)
- `ROADMAP.md` is outdated (still references Phase 1.5 as next)
- Current users UPDATE RLS policy is too broad — normal users can update other users' `is_active` (exposed by B-ADMIN-010 tests)

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
