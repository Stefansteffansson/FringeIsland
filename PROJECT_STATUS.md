# FringeIsland - Current Status

**Last Updated:** 2026-02-11 (RLS Bootstrap Fixes + Group Deletion + Auth Hardening)
**Current Version:** 0.2.12
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
- [ ] **NEXT:** Phase 1.5 - Communication System (forums, messaging)

**Blocked/Waiting:**
- None

---

## 📊 Quick Stats

- **Phase:** 1.4 - Journey System (100% complete ✅) → Moving to Phase 1.5
- **Total Tables:** 13 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 29 applied
- **Recent Version:** v0.2.12 (RLS Bootstrap Fixes - Feb 11, 2026)
- **Test Coverage:** 110 tests, **110/110 passing** ✅ (stable)
- **Behaviors Documented:** 17 (5 auth, 5 groups, 7 journeys) ✅
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
- ✅ Testing Infrastructure (Jest + integration tests, 110/110 stable) 🧪
- ✅ **RLS Security (all tables protected)** 🔒
- ✅ **Development Dashboard** (visual project status at /dev/dashboard) 📊

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

**Date:** 2026-02-11 (RLS Bootstrap Fixes + Group Deletion + Auth Hardening)
**Bridge Doc:** `docs/planning/sessions/2026-02-11-rls-bootstrap-fixes-and-group-deletion.md`
**Summary:**
- ✅ **B-GRP-005 COMPLETE:** Group Deletion — Danger Zone UI + DELETE RLS + cascade trigger fix
- ✅ **B-AUTH-002 COMPLETE:** Sign-in now blocks inactive users (was only partially implemented)
- ✅ **ROLE ASSIGNMENT FIXED:** user_group_roles INSERT/DELETE RLS policies were wrong from day 1
- ✅ **GROUP CREATION FIXED:** 3 cascading RLS gaps resolved end-to-end
- ✅ **110/110 tests passing** throughout

**What was fixed:**
- `prevent_last_leader_removal` trigger blocked CASCADE group deletes — fixed with group-existence check
- `user_group_roles` INSERT policy was self-assign-only placeholder — replaced with Group Leaders policy + bootstrap
- `user_group_roles` DELETE policy was missing entirely — added
- `group_memberships` INSERT policy deleted as "overly permissive" — broke group creation; added bootstrap policy
- `group_templates` / `role_templates` had RLS enabled but no SELECT policies — added USING(true) policies
- Migration tracking canonical workflow established + `scripts/apply-migration-temp.js` created

**Migrations Applied (4 new):**
- `20260211181225` — Group DELETE policy + cascade trigger fix
- `20260211182333` — user_group_roles INSERT+DELETE policies + group_has_leader() helper
- `20260211183334` — group_memberships bootstrap INSERT policy
- `20260211183842` — SELECT policies for group_templates, role_templates, role_template_permissions, group_template_roles

**Files Created:**
- `supabase/migrations/20260211181225_add_group_delete_policy.sql`
- `supabase/migrations/20260211182333_fix_user_group_roles_insert_policy.sql`
- `supabase/migrations/20260211183334_fix_group_memberships_bootstrap_insert.sql`
- `supabase/migrations/20260211183842_add_select_policies_for_catalog_tables.sql`
- `scripts/apply-migration-temp.js`

**Files Modified:**
- `app/groups/[id]/edit/page.tsx` (Danger Zone section + handleDelete + confirmation modal)
- `tests/integration/groups/deletion.test.ts` (last test now expects success, not blocked)
- `lib/auth/AuthContext.tsx` (signIn checks is_active, auto signs out inactive users)
- `tests/integration/auth/signin.test.ts` (B-AUTH-002 test updated)
- `docs/specs/behaviors/groups.md` (B-GRP-005 marked ✅ IMPLEMENTED)
- `docs/specs/behaviors/authentication.md` (B-AUTH-002 marked ✅)

**Test Results:** 110/110 passing ✅

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**Immediate (Phase 1.5 - Communication System):**
1. [Phase 1.5] Basic messaging system 🚀 **← NEXT**
2. [Phase 1.5] Group forums/discussions
3. [Phase 1.5] Notification system

**Testing & Documentation:**
4. Verify group creation flow end-to-end in browser (after RLS fixes)
5. Add B-ROL-001 behavior spec (Role Assignment Permissions) — now fully implemented

**Phase 1.5 - Communication:**
6. [Phase 1.5] Basic messaging system
7. [Phase 1.5] Group forums/discussions
8. [Phase 1.5] Notification system

**Phase 2 - Journey Experience:**
9. [Phase 2] Facilitator/Travel Guide tools
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
