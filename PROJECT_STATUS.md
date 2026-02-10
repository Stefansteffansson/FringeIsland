# FringeIsland - Current Status

**Last Updated:** 2026-02-10 (JourneyPlayer UI + Test Stability)
**Current Version:** 0.2.11
**Active Branch:** main

---

## 🎯 What We're Working On NOW

**Current Focus:** Phase 1.5 - Communication System (forums, messaging, notifications)

**Active Tasks:**
- [x] Create journeys.md behavior spec (B-JRN-001 to B-JRN-007) ✅ **DONE!**
- [x] Write 48 integration tests for all 7 journey behaviors ✅ **DONE!**
- [x] Fix journey_enrollments RLS policies ✅ **DONE!**
- [x] Fix missing journeys SELECT RLS policy ✅ **DONE!**
- [x] All 48 journey tests passing ✅ **DONE!**
- [x] **Journey content delivery (JourneyPlayer UI)** ✅ **DONE!**
- [x] **Fix integration test flakiness (auth rate limiting)** ✅ **DONE!**
- [ ] **NEXT:** Phase 1.5 - Communication System (forums, messaging)

**Blocked/Waiting:**
- None

---

## 📊 Quick Stats

- **Phase:** 1.4 - Journey System (100% complete ✅) → Moving to Phase 1.5
- **Total Tables:** 13 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 25 applied
- **Recent Version:** v0.2.11 (JourneyPlayer - Feb 10, 2026)
- **Test Coverage:** 90 tests, **90/90 passing** ✅ (stable, no flakiness)
- **Behaviors Documented:** 17 (5 auth, 5 groups, 7 journeys) ✅
- **Feature Docs:** 3 complete (authentication, journey-system, group-management) ✅
- **Supabase CLI:** Configured and ready for automated migrations ✅

**Completed Major Features:**
- ✅ Authentication & Profile Management
- ✅ Group Management (create, edit, invite, roles)
- ✅ Journey Catalog & Browsing (8 predefined journeys)
- ✅ Journey Enrollment (individual + group)
- ✅ My Journeys Page
- ✅ **Journey Content Delivery (JourneyPlayer UI)** 🎯 **NEW!**
- ✅ Error Handling System
- ✅ Testing Infrastructure (Jest + integration tests, 90/90 stable) 🧪
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

**Date:** 2026-02-10 (JourneyPlayer UI + Test Stability)
**Bridge Doc:** `docs/planning/sessions/2026-02-10-journey-player-and-test-stability.md`
**Summary:**
- ✅ **JOURNEY PLAYER BUILT:** Full step-by-step content delivery at `/journeys/[id]/play`
- ✅ **4 NEW COMPONENTS:** ProgressBar, StepSidebar, StepContent, JourneyPlayer
- ✅ **TEST FLAKINESS FIXED:** 90/90 passing consistently (was 12/90 failing intermittently)

**What was built (JourneyPlayer):**
- Step navigation with required-step completion gating
- Progress saved to `progress_data` JSONB on every action
- Resume from last position (`current_step_id` in progress_data)
- Completion detection (marks `status: 'completed'` when all required steps done)
- Review mode for completed journeys (free navigation, no gating)
- Unenrolled users redirected to detail page
- My Journeys "Continue" button now goes to `/play` (was going to detail page)
- Smart button labels: Start / Continue / Review depending on progress state

**Test stability fix:**
- Root cause: each `it` block signs in fresh; rate limiter kicked in mid-run → silent failures
- Fix: `tests/integration/suite-setup.ts` with `beforeAll(2s)` + `beforeEach(800ms)` delays
- Also added 4 domain-split scripts: `test:integration:auth/groups/journeys/rls`
- Also added `signInWithRetry` helper in `tests/helpers/supabase.ts`

**Files Created:**
- `components/journeys/ProgressBar.tsx`
- `components/journeys/StepSidebar.tsx`
- `components/journeys/StepContent.tsx`
- `components/journeys/JourneyPlayer.tsx`
- `app/journeys/[id]/play/page.tsx`
- `tests/integration/suite-setup.ts`

**Files Modified:**
- `lib/types/journey.ts` (JourneyProgressData, StepProgressEntry, PlayerEnrollment, description/instructions on JourneyStep)
- `app/my-journeys/page.tsx` (Continue → /play, progress bar, smart button labels, fixed group name bug)
- `app/journeys/[id]/page.tsx` (enrolled button → /play)
- `jest.config.js` (suite-setup in setupFilesAfterEnv)
- `package.json` (4 new test:integration:* scripts)
- `tests/helpers/supabase.ts` (signInWithRetry helper)

**Test Results:**
- **Before session:** 90 tests, flaky (12 failing randomly)
- **After session:** 90 tests, **90/90 passing** consistently (verified 2 runs)

**⚠️ Known Issue (Pre-existing, not caused by our changes):**
- `cleanupTestGroup` fails with `42703: record "old" has no field "group_role_id"`
  - The `prevent_last_leader_removal` trigger has a bug when CASCADE deleting groups
  - Only affects test cleanup (console.error), not test results

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
