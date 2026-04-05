# FringeIsland - Current Status

**Last Updated:** 2026-04-05 (Requirements review + doc health overhaul)
**Current Version:** 0.2.37
**Active Branch:** main

---

## Active Sprint

See `SPRINT.md` for current work streams, TDD stage, and sprint step plan.

---

## Quick Stats

- **Wave:** ALL 5 LIFECYCLE SPRINTS COMPLETE — Ferd 1.6 Polish & Launch is next
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
- `SPRINT.md` - **Active sprint, TDD stage, and next sprint backlog**
- `docs/products/ferd/planning/ROADMAP.md` - **Wave progress and milestone history**
- `docs/products/ferd/planning/DEFERRED.md` - **Why we didn't build X (prevents feature creep)**

**For Specific Work:**
- **Documentation hub:** `docs/INDEX.md` — three-tier navigation (universe/products/implementation)
- **Database work:** `docs/implementation/shared/SCHEMA_OVERVIEW.md`
- **Feature development:** `docs/products/ferd/development/features/` (FR-/AR-/NF- prefixed)
- **Latest feature:** `docs/products/ferd/development/features/FR-platform-exit.md`
- **Lifecycle roadmap:** `docs/products/ferd/planning/LIFECYCLE_DECISIONS.md` (5 sprints, 5 decisions)
- **Architecture baseline:** `docs/implementation/ferd/baseline/BASELINE.md` (live-validated)
- **Architecture anatomy (primary):** `docs/universe/architecture/ARCHITECTURE_ANATOMY.md`
- **Architecture decisions (ADRs):** `docs/universe/decisions/` (22 universe) + `docs/products/ferd/architecture/decisions/` (1 Ferd)
- **Planning context:** `docs/products/ferd/planning/ROADMAP.md` + `docs/products/ferd/planning/DEFERRED.md`
- **Vision documents:** `docs/universe/vision/` + `docs/universe/strategy/`
- **Hamn (Wave 2) docs:** `docs/products/hamn/INDEX.md` — product spec + 82 requirements + deferred decisions
- **Vision session decisions:** `docs/universe/vision/VISION_DECISIONS.md`

**Agent System (two-tier, 7 agents — see `docs/products/ferd/development/agents/README.md`):**
- **Tier 1 — Domain:** `database-agent.md`, `ui-agent.md`, `integration-agent.md`, `test-agent.md`
- **Tier 2 — Process:** `architect-agent.md`, `qa-agent.md`, `sprint-agent.md`
- **Learning journals:** `docs/products/ferd/development/agents/learnings/*.md` (one per domain)

---

## Last Session Summary

**Date:** 2026-04-05 (Requirements review + doc health overhaul)
**Summary:**
- Rewrote Ferd PRODUCT_SPEC.md v1.2 → v2.0 (clean "what & why" document, removed duplicative content)
- Updated Ferd REQUIREMENTS.md: 5 status corrections, 3 new requirements (97→100 total), added binding architecture rule
- **Key decision:** ALL architecture compliance (AR-001 through AR-004) elevated to 🔥 LAUNCH BLOCKER — must complete pre-launch
- Populated Hamn REQUIREMENTS.md from scratch: 82 requirements across L0–L7 + V1–V5 + NFRs + ARs
- Added Whisp Respawning Mechanics to Hamn DEFERRED.md (re-deferred Ferd → Hamn → Wave 3)
- Rewrote DOC_HEALTH_CHECK.md: expanded from 3 to 6 audit sections (added path drift, cross-doc consistency, architecture compliance)
- Fixed ~80 stale path references across ~25 files (post-restructuring drift)
- Updated CLAUDE.md (requirements count, Hamn entries, binding rule) and README.md (added requirements to nav table)
- Permission count discrepancy flagged: CLAUDE.md says 31, REQUIREMENTS.md says 39 — needs DB verification
- No code changes, no tests needed

**Previous Session:** 2026-04-05 (Product specification review — Ferd + Hamn)
- Created Hamn specification scaffold, added 8 new features to Ferd PRODUCT_SPEC v1.2
- Created universe-level infrastructure (processes, community, strategy open questions)
- Created per-product research files, Hamn DEFERRED.md (7 items)
- Calibrated Ferd DEFERRED.md: 11 items accepted by Hamn, 1 re-deferred to Wave 3

**Previous Session:** 2026-04-05 (VISION.md v0.2 + Hamn folder structure + reference sweep)
- Created `docs/products/hamn/` folder structure (11 directories mirroring Ferd)
- Updated 10 files with Hamn references
- Updated VISION.md from v0.1 to v0.2 (129 insertions, 27 deletions)
- Three commits: `95cfce9`, `a006afe`, `564ccab`

**Previous Session:** 2026-04-05 (Documentation restructuring — Phase 3: Execution + Audit)
- Executed three-tier documentation restructuring (219 files changed):
  - 97 files moved (56 simple + 41 renamed) into universe/, products/ferd/, implementation/
  - 23 ADRs extracted from monolithic file into individual ADR-U0XX/ADR-F001 files
  - 25 INDEX.md navigation hubs created, 2 content files (KANBAN.md, REFERENCES_SHARED.md)
  - 35 files archived across 10 distributed `_archive/` folders, 5 empty placeholders deleted
  - 15 old directories removed, cross-references updated across all moved files
  - Root files updated: CLAUDE.md, README.md, PROJECT_STATUS.md, SPRINT.md
  - Planning artifacts archived to `docs/products/ferd/development/_archive/2026-04-05-refactor-planning/`
- Audited BOOT_UP.md, CLOSE_DOWN.md, README.md, CLAUDE.md for correctness:
  - Added KANBAN.md/ACTUAL_STATE.md as optional boot-up reads
  - Added close-down steps for KANBAN.md updates and INDEX file maintenance
  - Fixed stale references (DEFERRED_DECISIONS.md → DEFERRED.md)
  - CLAUDE.md verified: 150 lines, all paths correct
- Two commits: `901f985` (migration), `2a5bd05` (audit fixes)

**Previous Session:** 2026-04-05 (Documentation restructuring — Phase 1-2: Mapping)
- Planned three-tier documentation restructuring, created MIGRATION_MAPPING.md v2 (approved)
- Full file inventory (139 files), ADR analysis, risk assessment

**Previous Session:** 2026-04-05 (Feature inventory + Requirements accuracy fixes)
- Created `docs/implementation/ferd/baseline/ACTUAL_STATE.md` — complete feature inventory and gap analysis (~500 lines)
  - Executive summary: ~45% of intended architecture implemented
  - Key findings: ADR-009 massively violated (~40+ direct writes, only 4 API routes), permission enforcement shallow (8/39 enforced), email is stub only, no GDPR
- Applied 12 accuracy fixes to `docs/products/ferd/specification/REQUIREMENTS.md`:
  - Phase 1.4 → Wave Ferd 1.6, removed false email template claims, adjusted 5 completeness percentages
  - Added missing FR-L1-009 (Display Name/Nickname system), added self-serve vs admin note
  - Fixed broken Related Documents paths, updated summary statistics (97 total requirements)
- Reviewed and corrected `docs/products/ferd/development/_archive/2026-04-05-refactor-planning/CLAUDE_CODE_HANDOFF-ferd-feature-inventory.md` (handoff plan, now archived)

**Previous Session:** 2026-03-25 (Doc references update — sessions + research folder)
- Added references to Journey Designer Session 02 Part 1 and new `docs/research/` folder
- Updated `docs/INDEX.md`: expanded sessions listing, added Research section with human flourishing doc
- Updated `README.md`: added sessions and research to "Where to Find Things" table
- Updated `CLAUDE.md`: added sessions and research to document map
- Version bumps to 0.2.37 in INDEX.md and README.md

**Previous Session:** 2026-03-20 (Workflow docs review + update)
- Reviewed boot-up.md and close-down.md for terminology, references, and completeness
- Fixed stale "phase" → "wave" terminology in boot-up.md
- Added ARCHITECTURE_ANATOMY.md, ARCHITECTURE_DECISIONS.md, and PRODUCTS_AND_PLATFORM.md references to both workflow files
- Added Architecture/Design and Vision/Design session rows to boot-up Load Context table
- Updated dates on both workflow files

**Previous Session:** 2026-03-20 (Journey Designer Session 01 integration + terminology sweep)
- Integrated Journey Designer Discovery Session 01 into project docs (ROADMAP.md, DEFERRED_DECISIONS.md, CHANGELOG.md)
- Rewrote ROADMAP.md (v3.0) — replaced Phase 1/2/3/4 model with Wave 1 (Ferd) / Wave 2 (Hamn) / Wave 3 / Wave 3+ framing
- Added 4 Session 01 parked items to DEFERRED_DECISIONS.md: Seasons and Episodes, NPC behaviour authoring, Whisp practical UX, Three Worlds UI design
- Established terminology hierarchy: Wave > Milestone > Sprint > Stage
- Full terminology sweep across 32 files: Phase→Wave, TDD Phase→Stage, Sub-phase→Milestone, fixed 3 broken links
- Two commits: `b51457b` (Session 01 integration), `2cc29ba` (terminology sweep)

**Previous Session:** 2026-03-14 (Journey Enrollment API routes — ADR-009 compliance)
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

**What We're NOT Building Yet:** See `docs/products/ferd/planning/DEFERRED.md`

---

## Development Workflows

**Starting a new session?**
- Read: `docs/products/ferd/development/BOOT_UP.md`
- Or ask: "Boot up FringeIsland"

**Ending your session?**
- Read: `docs/products/ferd/development/CLOSE_DOWN.md`
- Or ask: "Close down session"

**Checking doc drift?**
- Read: `docs/products/ferd/development/DOC_HEALTH_CHECK.md`

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
