# FringeIsland - Current Status

**Last Updated:** 2026-02-28 (Sprint 1 — Foundation Schema complete)
**Current Version:** 0.2.33
**Active Branch:** main

---

## What We're Working On NOW

**Current Focus:** Sprint 1 COMPLETE — Sprint 2 (Leave Group Core) is next

**Key Docs:**
- `docs/planning/lifecycle-roadmap-decisions.md` — **Single source of truth** for sprint structure and decisions
- `docs/features/active/foundation-schema.md` — Sprint 1 feature doc (COMPLETE)
- `docs/specs/behaviors/groups.md` — B-GRP-007 (Group Status Visibility)
- `docs/specs/behaviors/journeys.md` — B-JRN-008 (Platform Journey Ownership)

**Active Tasks:**
- [x] **Sprint 1 — Foundation Schema** ✅ DONE — F1 (groups.status) + F2 (FI Journeys group), 19 new tests, 504/504 GREEN, v0.2.33
- [x] **Sprint 0 — Security Fixes** ✅ DONE — 4 security gaps fixed (S1-S4), 19 new tests, v0.2.32
- [x] **Feature Doc Review** ✅ DONE — 6 docs updated (D15 renames, Sprint 0 staleness, path fixes)

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

- **Phase:** Sprint 1 COMPLETE — Sprint 2 (Leave Group Core) is next
- **Total Tables:** 19 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 13 active + 71 archived
- **Recent Version:** v0.2.33 (Sprint 1 — Foundation Schema)
- **Test Coverage:** 504 integration + 99 unit + 4 setup = **607 tests** ✅
- **Behaviors Documented:** 94 (92 previous + 2 Sprint 1) ✅
- **Feature Docs:** 8 implemented + 1 active (foundation-schema COMPLETE) + 1 planned design (leave-group refined) + 1 roadmap (lifecycle decisions)
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

**Date:** 2026-02-28 (Sprint 1 — Foundation Schema)
**Summary:**
- Completed Sprint 1: Foundation Schema — full TDD workflow (Phases 0-7), v0.2.33
- F1: Added `groups.status` column (active/closed/archived/suspended) with CHECK constraint, partial index, updated `groups_select` RLS policy
- F2: Created "FringeIsland Journeys" engagement group, added DeusEx as Steward, re-seeded 8 predefined journeys with correct D15 ownership
- 19 new integration tests (9 group-status + 10 platform-ownership), 504/504 GREEN, zero regressions
- Discovered and fixed: (1) journeys table was empty (lost during D15 rebuild), (2) globalTeardown orphan sweep deleted FI Journeys group when `created_by_group_id` was NULL — fixed by setting it to DeusEx

**Key files:**
- `supabase/migrations/20260228111514_sprint1_foundation_schema.sql` — F1 + F2
- `tests/integration/groups/group-status.test.ts` — 9 tests (B-GRP-007)
- `tests/integration/journeys/platform-ownership.test.ts` — 10 tests (B-JRN-008)
- `docs/features/active/foundation-schema.md` — Feature doc (COMPLETE)
- `docs/specs/behaviors/groups.md` — B-GRP-007
- `docs/specs/behaviors/journeys.md` — B-JRN-008

**Previous Sessions:**
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

**See `docs/features/active/performance-optimization.md` for full plan**

**Display Name / Nickname System COMPLETE** ✅

**Sprint 1 — Foundation Schema COMPLETE** ✅ (v0.2.33)

**Next — Sprint 2: Leave Group Core:**
Regular member leave, sole Steward→DeusEx transfer, group closure. TDD workflow.
See `docs/planning/lifecycle-roadmap-decisions.md` for full sprint structure.

**After Sprint 2:**
- Sprint 3: Smart Notifications + Steward Nomination (Track 1)
- Sprint 4: Platform Exit (admin-assisted)

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
