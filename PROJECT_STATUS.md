# FringeIsland - Current Status

**Last Updated:** 2026-03-14 (Journey Enrollment API routes)
**Current Version:** 0.2.36
**Active Branch:** main

---

## Active Sprint

See `SPRINT.md` for current work streams, TDD phase, and sprint step plan.

---

## Quick Stats

- **Phase:** ALL 5 LIFECYCLE SPRINTS COMPLETE — Phase 1.6 Polish & Launch is next
- **Total Tables:** 19 (PostgreSQL via Supabase) - **ALL with RLS enabled** ✅
- **Total Migrations:** 16 active + 71 archived
- **Recent Version:** v0.2.37 (Journey Enrollment API routes)
- **Test Coverage:** 550 integration + 99 unit + 4 setup = **659 Jest tests** (655/659 pass, 4 pre-existing flaky) + **7 Playwright E2E tests** ✅
- **Behaviors Documented:** 105 (101 previous + 4 Sprint 4: B-EXIT-001, B-EXIT-002, B-EXIT-003, B-EXIT-004) ✅
- **Feature Docs:** 18 implemented + 0 active + 1 planned design + 1 roadmap (lifecycle decisions)
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
- ✅ Testing Infrastructure (Jest + integration tests + Playwright E2E)
- ✅ **RLS Security (all tables protected + Sprint 0 security fixes)** v0.2.32
- ✅ **Foundation Schema (groups.status + FI Journeys group)** v0.2.33
- ✅ **Leave Group Core (L1 regular leave + L2 DeusEx handover + L3 group closure)** v0.2.34
- ✅ **Smart Notifications + Steward Nomination** (actionable notifs, accept/decline, Track 1 nomination) v0.2.35
- ✅ **Platform Exit** (admin-assisted cascade exit from all groups + decommission) v0.2.36
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
- `SPRINT.md` - **Active sprint, TDD phase, and next sprint backlog**
- `docs/planning/ROADMAP.md` - **Phase progress and milestone history**
- `docs/planning/DEFERRED_DECISIONS.md` - **Why we didn't build X (prevents feature creep)**

**For Specific Work:**
- **Database work:** `docs/database/schema-overview.md`
- **Feature development:** `docs/features/implemented/[feature-name].md`
- **Latest feature:** `docs/features/implemented/platform-exit.md` ← **LATEST**
- **Admin feature (complete):** `docs/features/implemented/deusex-admin-foundation.md`
- **Lifecycle roadmap:** `docs/planning/lifecycle-roadmap-decisions.md` ← **NEW** (5 sprints, 5 decisions)
- **Architecture baseline:** `docs/architecture/ARCHITECTURE_BASELINE.md` ← **NEW** (6-phase analysis, live-validated)
- **Architecture anatomy (primary):** `docs/architecture/ARCHITECTURE_ANATOMY.md`
- **Architecture decisions (ADRs):** `docs/architecture/ARCHITECTURE_DECISIONS.md`
- **Planning context:** `docs/planning/ROADMAP.md` + `docs/planning/DEFERRED_DECISIONS.md`
- **Vision documents:** `docs/vision/VISION.md` + `docs/vision/MANIFESTO.md` + `docs/vision/CONTRIBUTION_ARCHITECTURE.md` + `docs/vision/PRODUCTS_AND_PLATFORM.md`
- **Vision session decisions:** `docs/planning/VISION_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-03-14 (Journey Enrollment API routes — ADR-009 compliance)
**Summary:**
- Created 3 API routes for journey enrollment: POST/DELETE `/api/v1/journeys/[id]/enroll`, GET `/api/v1/journeys/enrollments`
- Refactored `EnrollmentModal.tsx`, journey detail page, and My Journeys page to call API routes instead of direct Supabase access
- All enrollment writes now go through API routes per ADR-009 (API-first)
- Fixed: enrollments API was filtering `status='active'` only — completed/paused/frozen journeys were missing from My Journeys
- Fixed: "Finish Review" button on last step of completed/frozen journeys was a no-op — now navigates to `/my-journeys`
- Updated CHANGELOG.md, bumped version to v0.2.37

**Previous Session:** 2026-03-14 (ROADMAP.md outdated notice)
- Added outdated/pending-rewrite notice to top of `docs/planning/ROADMAP.md`, pointing to `PRODUCTS_AND_PLATFORM.md` and `ARCHITECTURE_ANATOMY.md`
- Rewrite deferred until after Journey specification session

**Previous Session:** 2026-03-14 (Architecture documentation integration)
- Integrated new architecture docs: `ARCHITECTURE_ANATOMY.md` (primary), `ARCHITECTURE_DECISIONS.md` (ADRs), `ARCHITECTURE_ANATOMY_DIAGRAM.svg`
- Renamed `ARCHITECTURE_OVERVIEW.md` → `ARCHITECTURE_DECISIONS_LEGACY.md`; old baseline archived to `docs/architecture/archive/`
- Regenerated `ARCHITECTURE_BASELINE.md` — complete rewrite structured around L0–L7 anatomy layers, 5 verticals, Platform API ring, Ferd completion summary
- Updated CLAUDE.md with wave model (Ferd/Hamn), API-first pattern (ADR-009), ARCHITECTURE_ANATOMY.md as primary reference
- Updated 10 files replacing stale ARCHITECTURE_OVERVIEW.md references

**Previous Session:** 2026-03-10 (PRODUCTS_AND_PLATFORM.md reference integration)
- Integrated references to new `docs/vision/PRODUCTS_AND_PLATFORM.md` across 6 files
- Audited all docs for missing/broken references to the new vision document

**Previous Session:** 2026-03-09 (Vision docs integration + Vercel build fix)
- Fixed Vercel build failure: supabase-js 2.91.0 type errors in 3 E2E test helper files
- Integrated 3 new vision documents + updated 20+ references across 7 files

**Previous Session:** 2026-03-07 (MCP config migration)
- Migrated MCP server config from old `.claude/mcpservers.json` to proper `.claude/mcp.json` format
- Added both Supabase and SQLite MCP servers to new config

**Previous Sessions:**
- 2026-03-03: Doc drift prevention + existing drift fix (~130 instances across 17 docs)
- 2026-03-03: Documentation restructuring — overlap elimination + SPRINT.md
- 2026-03-03: Architecture Baseline + live DB validation (zero drift, 11 corrections)
- 2026-02-28: Documentation restructuring (CLAUDE.md, workflows, ROADMAP, NEXT.md, archives)

**Previous Sessions:**
- 2026-03-03: Architecture Baseline + live DB validation (zero drift, 11 corrections)
- 2026-02-28: Documentation restructuring (CLAUDE.md, workflows, ROADMAP, NEXT.md, archives)
- 2026-02-28: Sprint 4 — Platform Exit + feature doc review (v0.2.36)
- 2026-02-28: Sprint 3 — Smart Notifications + Steward Nomination (v0.2.35)
- 2026-02-28: Sprint 2 — Leave Group Core + Feature Doc Review (v0.2.34)
- 2026-02-28: Sprint 1 — Foundation Schema (v0.2.33)
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

## Known Issues

- **Orphan groups after hard delete** — groups lose their last Steward (no admin, no one can manage). Needs stewardship transfer UI.
- `app/admin/fix-orphans/page.tsx` uses `alert()` (should use ConfirmModal)
- Hydration mismatch warning in `AuthForm.tsx:60` (cosmetic, non-blocking)
- WebSocket/Realtime connection warning in console (cosmetic, non-blocking)
- Realtime broadcast for force-logout may not work without Realtime Authorization policies (polling fallback handles this)
- `signOut({ scope: 'local' })` broken in supabase-js 2.91.0 — makes server call despite docs saying local-only
- Console 403 errors on force-logout redirect (browser-level network logs, not visible to end users)

**What We're NOT Building Yet:** See `docs/planning/DEFERRED_DECISIONS.md`

---

## Development Workflows

**Starting a new session?**
- Read: `docs/workflows/boot-up.md`
- Or ask: "Boot up FringeIsland"

**Ending your session?**
- Read: `docs/workflows/close-down.md`
- Or ask: "Close down session"

**Checking doc drift?**
- Read: `docs/workflows/doc-health-check.md`

---

## Notes

- **Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase (PostgreSQL)
- **Database:** 19 tables with comprehensive RLS policies
- **Repository:** https://github.com/Stefansteffansson/FringeIsland
- **Local Dev:** http://localhost:3000
- **Supabase Project:** [Your Supabase project]
- **TDD MANDATORY:** Behaviors → Tests (RED) → Implement (GREEN). Never write tests last.

---

**Update this file after each significant session.**
