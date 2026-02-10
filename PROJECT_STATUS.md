# FringeIsland - Current Status

**Last Updated:** 2026-02-10 (Journey Behavior Tests + RLS Fixes)
**Current Version:** 0.2.10
**Active Branch:** main

---

## 🎯 What We're Working On NOW

**Current Focus:** Journey Content Delivery System (Phase 1.4 - next step after tests)

**Active Tasks:**
- [x] Create journeys.md behavior spec (B-JRN-001 to B-JRN-007) ✅ **DONE!**
- [x] Write 48 integration tests for all 7 journey behaviors ✅ **DONE!**
- [x] Fix journey_enrollments RLS policies ✅ **DONE!**
- [x] Fix missing journeys SELECT RLS policy ✅ **DONE!**
- [x] All 48 journey tests passing ✅ **DONE!**
- [ ] **NEXT:** Journey content delivery (JourneyPlayer UI component)

**Blocked/Waiting:**
- None

---

## 📊 Quick Stats

- **Phase:** 1.4 - Journey System (90% complete - tests all green!)
- **Total Tables:** 13 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 25 applied (+2 today for enrollment RLS + journeys SELECT policy)
- **Recent Version:** v0.2.10 (Journey Enrollment - Jan 31, 2026)
- **Test Coverage:** 94 tests (48 journey + 46 other, 48/48 journey passing with `npm run test:integration`)
- **Behaviors Documented:** 17 (5 auth, 5 groups, 7 journeys) ✅ **NEW!**
- **Feature Docs:** 3 complete (authentication, journey-system, group-management) ✅
- **Supabase CLI:** Configured and ready for automated migrations ✅

**Completed Major Features:**
- ✅ Authentication & Profile Management
- ✅ Group Management (create, edit, invite, roles)
- ✅ Journey Catalog & Browsing (8 predefined journeys)
- ✅ Journey Enrollment (individual + group)
- ✅ My Journeys Page
- ✅ Error Handling System
- ✅ Testing Infrastructure (Jest + integration tests)
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

**Date:** 2026-02-10 (Journey Behavior Spec + Integration Tests + RLS Fixes)
**Summary:**
- ✅ **BEHAVIOR SPEC CREATED:** `docs/specs/behaviors/journeys.md` (7 behaviors, B-JRN-001 to B-JRN-007)
- ✅ **48 TESTS WRITTEN:** Full TDD test suite for all journey behaviors
- ✅ **2 RLS MIGRATIONS APPLIED:**
  - `20260210_fix_journey_enrollment_rls_and_schema.sql` - Fixed enrollment RLS + added `last_accessed_at` column
  - `20260210_add_journeys_rls_policies.sql` - Added missing journeys SELECT policy (was MISSING entirely!)
- ✅ **ALL 48 JOURNEY TESTS PASSING** via `npx jest --runInBand tests/integration/journeys`

**Root Causes Found & Fixed:**
1. **`journey_enrollments` INSERT blocked by RETURNING**: PostgREST INSERT...RETURNING triggered SELECT policy which used raw subqueries (nested RLS). Fixed with SECURITY DEFINER functions.
2. **`journeys` table had NO SELECT policy**: RLS was enabled but no policy was created, so nobody could read journeys. Fixed by adding `journeys_select_published` policy.
3. **Missing `last_accessed_at` column**: Added to `journey_enrollments` table.
4. **Timestamp format Z vs +00:00**: Fixed test assertions to compare as Date objects.
5. **UNIQUE constraint cascade failures in resume tests**: Fixed with `try/finally` cleanup pattern.
6. **Parallel auth rate limiting**: Fixed by adding `--runInBand` to `test:integration` script.

**New SECURITY DEFINER Functions Created:**
- `public.is_group_leader(p_group_id UUID)` - Checks if current user is Group Leader
- `public.is_active_group_member_for_enrollment(p_group_id UUID)` - Checks group membership

**Files Created:**
- `docs/specs/behaviors/journeys.md` (7 journey behaviors fully documented)
- `supabase/migrations/20260210_fix_journey_enrollment_rls_and_schema.sql`
- `supabase/migrations/20260210_add_journeys_rls_policies.sql`
- `tests/integration/journeys/catalog.test.ts` (B-JRN-001: 6 tests)
- `tests/integration/journeys/detail.test.ts` (B-JRN-002: 7 tests)
- `tests/integration/journeys/enrollment.test.ts` (B-JRN-003: 9 tests)
- `tests/integration/journeys/step-navigation.test.ts` (B-JRN-004: 5 tests)
- `tests/integration/journeys/progress-tracking.test.ts` (B-JRN-005: 8 tests)
- `tests/integration/journeys/resume.test.ts` (B-JRN-006: 6 tests)
- `tests/integration/journeys/completion.test.ts` (B-JRN-007: 7 tests)

**Files Modified:**
- `tests/helpers/fixtures.ts` (added `testJourneyMultiStep` fixture)
- `tests/helpers/supabase.ts` (added `cleanupTestJourney`, `cleanupTestEnrollment`)
- `package.json` (added `--runInBand` to `test:integration` script)
- `PROJECT_STATUS.md` (this file)

**Test Results:**
- **Before session:** 46 tests, 46 passing (journey tests didn't exist yet)
- **After session:** 94 tests, 48/48 journey tests passing with `npm run test:integration`
- **Note:** `npm test` (parallel) has pre-existing auth test flakiness unrelated to journey changes

**⚠️ Known Issue (Pre-existing, not caused by our changes):**
- `cleanupTestGroup` fails with `42703: record "old" has no field "group_role_id"`
  - The `prevent_last_leader_removal` trigger has a bug when CASCADE deleting groups
  - Only affects test cleanup (console.error), not test results
  - Should be investigated in a future session

---

## 🎯 Next Priorities

**See `docs/planning/ROADMAP.md` for complete phase breakdown**

**Immediate (Phase 1.4 - Journey System):**
1. [Phase 1.4] **Journey content delivery (JourneyPlayer UI)** - step navigation, content display 🚀 **← NEXT**
2. [Phase 1.4] Progress tracking UI (leverages tested DB layer from today)
3. [Phase 1.4] Journey completion UI flow

**Testing & Documentation:**
4. Fix `cleanupTestGroup` 42703 trigger bug (pre-existing, non-critical)
5. Add tests for remaining group behaviors (B-GRP-002, B-GRP-004)

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
