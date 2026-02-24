# FringeIsland - Current Status

**Last Updated:** 2026-02-24 (Admin bug fixes + hard delete trigger bypass + orphan group issue identified)
**Current Version:** 0.2.29
**Active Branch:** main

---

## What We're Working On NOW

**Current Focus:** Force Logout Responsiveness + Session Hardening — COMPLETE

**Design Doc:** `docs/features/active/enhanced-member-invitations.md`

**Active Tasks:**
- [x] **User Search Typeahead** ✅ DONE — debounced 300ms, name+email search, avatar dropdown, 8 result limit, excludes members/self
- [x] **Pending Email Invitations** ✅ DONE — new `pending_email_invitations` table, RLS, handle_new_user() trigger auto-claim, simulated email service
- [x] **API Route** ✅ DONE — `/api/invitations/send-email` with JWT auth + permission check
- [x] **14 integration tests** ✅ DONE — 10 pending-invitations + 4 user-search

**Blocked/Waiting:**
- None

**Previous Features (COMPLETE):**
- [x] **Performance Optimization** ✅ All tiers (1A-3B)
- [x] **DeusEx Admin Foundation** ✅ v0.2.21-v0.2.25
- [x] **D15 Universal Group Pattern** ✅ v0.2.29

---

## Quick Stats

- **Phase:** Enhanced Member Invitations COMPLETE
- **Total Tables:** 19 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 8 active + 71 archived
- **Recent Version:** v0.2.29 (Enhanced Member Invitations)
- **Test Coverage:** 438 integration + 99 unit + 4 setup = **541 tests** ✅
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
- ✅ **D15 Universal Group Pattern** (schema rebuild, 28-step frontend migration, all residuals fixed) v0.2.29

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
- **Active feature:** `docs/features/active/enhanced-member-invitations.md` ← **LATEST**
- **Admin feature (complete):** `docs/features/active/deusex-admin-foundation.md`
- **Architecture decisions:** `docs/architecture/ARCHITECTURE.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-02-24 (Admin bug fixes + hard delete trigger bypass + orphan group issue)
**Summary:**
- Fixed admin deactivate/decommission silently failing due to RLS — replaced client-side `.update()` with SECURITY DEFINER RPCs (`admin_update_user_status`, `admin_decommission_user`)
- Fixed `signIn()` to check `profileError` and `!profile.is_active` explicitly (defense-in-depth)
- Suppressed noisy PGRST116 console error for deactivated user profile resolution
- Fixed intermittent "Access Denied" on admin panel — added `userProfile` to dependency array in `admin/layout.tsx`
- Fixed hard delete blocked by `prevent_last_leader_removal` trigger — added `app.hard_delete_in_progress` bypass to both `prevent_last_leader_removal()` and `prevent_last_deusex_role_removal()` (Migration #8)
- **Identified orphan group issue** — hard deleting a user who is the last Steward leaves groups leaderless (see Next Priorities)
- 4 files modified, 1 migration

**Key decisions:**
- Always use SECURITY DEFINER RPCs for admin operations that change RLS-visible columns
- Admin layout waits for `userProfile` before checking permissions
- Hard delete bypass for last-leader triggers uses same `app.hard_delete_in_progress` pattern as notification triggers

**Previous Sessions:**
- 2026-02-24: Fix admin deactivate/decommission RLS + admin layout race condition
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

**Enhanced Member Invitations COMPLETE** ✅

**Next — Orphan Group Stewardship Transfer (PRIORITY):**
When deactivating/decommissioning/hard-deleting a user who is the last Steward of a group, the admin UI must:
1. Detect affected groups (where user is sole Steward)
2. Present a stewardship transfer UI before proceeding
3. Allow admin to pick another member of the group, OR the DeusEx user, OR another user (who gets auto-joined first)
4. Transfer Steward role, then proceed with the delete/deactivate action

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
