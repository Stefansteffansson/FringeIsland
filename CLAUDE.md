# CLAUDE.md — AI Context for FringeIsland

**Version:** 0.2.37 | **Updated:** April 5, 2026 | **Wave 1 (Ferd):** 95% complete

---

## Project Overview

FringeIsland is an edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences.

**Stack:** Next.js 16.1 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, 19 tables with RLS)
**Testing:** Jest (659 tests: integration + unit) + Playwright (7 E2E tests)
**Repo:** https://github.com/Stefansteffansson/FringeIsland

---

## Session Management (Read First!)

### Boot-Up — Start of every session

**Trigger:** "boot up", "start session", or any variation
**Action:** Read and follow `docs/products/ferd/development/BOOT_UP.md` EXACTLY — use EXACT file paths from its table

Key files the workflow reads: `PROJECT_STATUS.md`, `SPRINT.md`, `docs/products/ferd/planning/ROADMAP.md`

**If user skips boot-up** (jumps to a task): remind them and offer to run it first.

### Close-Down — End of every session

**Trigger:** "thanks", "done", "that's all", wrapping up, or after completing major work
**Action:** Proactively suggest close-down, then follow `docs/products/ferd/development/CLOSE_DOWN.md` EXACTLY

Must update: `PROJECT_STATUS.md` (always), `SPRINT.md` (always), `docs/products/ferd/planning/ROADMAP.md` (if significant progress)

### Feature Work — Hand off to Sprint Agent

When user selects feature work after boot-up, load `docs/products/ferd/development/agents/contexts/sprint-agent.md` and `docs/products/ferd/development/WORKFLOW.md`. Sprint Agent creates a sequential plan; each step requires user approval before proceeding. No parallel agent launches.

---

## Architecture (Patterns, not code)

**Primary reference:** `docs/universe/architecture/ARCHITECTURE_ANATOMY.md` — the layered anatomy (L0–L7, 5 verticals, Platform API ring). Read this before generating or modifying code. ADRs (22 universe + 1 Ferd) in `docs/universe/decisions/`. Live implementation state in `docs/implementation/ferd/baseline/BASELINE.md`.

**Wave model (not phases):** The platform evolves in overlapping waves. **Ferd** (current web platform, Wave 1) → **Hamn** (full FringeIsland experience, Wave 2). See `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md`.

- **Auth:** Client-side via AuthContext + useAuth() hook; proxy.ts for protected routes (Next.js 16, not middleware.ts)
- **Components:** App Router; client components marked `'use client'`; reusable UI in `/components/ui/`
- **State:** React Context for auth; local state for components; `refreshNavigation` custom event for cross-component updates
- **DB access:** Supabase client (`lib/supabase/client.ts`) for browser, server client (`lib/supabase/server.ts`) for RSC
- **API-first (ADR-009):** Business logic belongs in API routes (`/api/...`), not server components. Frontend calls the API; the API calls the database. Build every feature as if iOS/Android already exist. Pattern: `Database → API route → Frontend component`. Never: `Database → Frontend component directly`. **Binding rule (2026-04-05):** All new Ferd 1.6 features must follow the architecture anatomy. Existing ADR-009 violations must be refactored pre-launch. See REQUIREMENTS.md "Binding Architecture Rule".
- **Security:** RLS on all 19 tables; triggers for business logic; `is_platform_admin()` SECURITY DEFINER for admin checks
- **RBAC:** 4 roles (Steward, Guide, Member, Observer), 31 permissions, `has_permission()` function
- **UI rules:** Never use browser `alert()`/`confirm()` — always use `ConfirmModal`. Always show loading states. Update ALL related state after data changes (members + roles + isLeader).

---

## Development Workflow — TDD is Mandatory

**Hard rule:** Behaviors → failing tests (RED) → design → implement (GREEN). Tests MUST fail before implementation begins.

**Canonical workflow:** `docs/products/ferd/development/WORKFLOW.md` (8 stages, 0–7, with hard STOP gates)

**Stage summary:** 0-Feature context → 1-Behaviors → 2-Write tests → 3-Run tests RED → 4-Design → 5-Implement GREEN → 6-Verify → 7-Document

### Database Migrations (correct commands)

```bash
# 1. Create migration
bash supabase-cli.sh migration new add_my_feature
# 2. Edit the generated SQL file in supabase/migrations/
# 3. Apply migration
node scripts/apply-migration-temp.js <timestamp>_name.sql
# 4. Mark as applied
bash supabase-cli.sh migration repair --status applied <timestamp>
# 5. Verify
bash supabase-cli.sh migration list
```

**Never use `supabase-cli.bat`** — Claude Code runs in bash.

### Testing

- **During dev:** `npm run test:integration:<domain>` (domain: auth, groups, journeys, rls, rbac, admin, communication, security)
- **Before commit:** `npm run test:integration` (full suite, ~8 min — run in background)
- **Quick regression:** `npm run test:integration:quick` (stops on first fail)
- **E2E:** `npm run test:e2e` (Playwright, requires dev server on localhost:3000)

---

## Document Map — Where to find things

**Three-tier structure:** `docs/universe/` (shared foundations) > `docs/products/` (product-specific) > `docs/implementation/` (live code state). Full navigation: `docs/INDEX.md`.

| What | Where |
|------|-------|
| Current state & blockers | `PROJECT_STATUS.md` |
| Active sprint + what's next | `SPRINT.md` |
| **Universe Tier** | |
| Vision | `docs/universe/vision/VISION.md` |
| Manifesto | `docs/universe/vision/MANIFESTO.md` |
| Products & platform (waves) | `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md` |
| Contribution architecture | `docs/universe/strategy/CONTRIBUTION_ARCHITECTURE.md` |
| **Architecture anatomy (primary)** | `docs/universe/architecture/ARCHITECTURE_ANATOMY.md` |
| Domain entities | `docs/universe/architecture/DOMAIN_ENTITIES.md` |
| Architecture decisions (ADRs) | `docs/universe/decisions/` (22 universe-level) |
| Vision session decisions | `docs/universe/vision/VISION_DECISIONS.md` |
| Research (human flourishing) | `docs/universe/research/` |
| Cross-product processes | `docs/universe/processes/` (deferral protocol, planning protocol) |
| Community & governance | `docs/universe/community/` (open questions, organizational concerns) |
| Cross-wave open questions | `docs/universe/strategy/OPEN_QUESTIONS.md` |
| **Products Tier — Ferd** | |
| Product scope (what/why) | `docs/products/ferd/specification/PRODUCT_SPEC.md` |
| Requirements (100 total) | `docs/products/ferd/specification/REQUIREMENTS.md` |
| Wave roadmap | `docs/products/ferd/planning/ROADMAP.md` |
| Deferred decisions | `docs/products/ferd/planning/DEFERRED.md` |
| Lifecycle sprint decisions | `docs/products/ferd/planning/LIFECYCLE_DECISIONS.md` |
| Ferd research / open investigations | `docs/products/ferd/planning/RESEARCH.md` |
| Ferd ADRs | `docs/products/ferd/architecture/decisions/` (1 Ferd-specific) |
| Feature docs | `docs/products/ferd/development/features/` (FR-/AR-/NF- prefixed) |
| Behavior specs | `docs/products/ferd/development/specs/` |
| Agent playbooks | `docs/products/ferd/development/agents/contexts/` (7 agents) |
| Agent journals | `docs/products/ferd/development/agents/learnings/` |
| TDD + feature workflow | `docs/products/ferd/development/WORKFLOW.md` |
| Boot-up / Close-down | `docs/products/ferd/development/BOOT_UP.md`, `CLOSE_DOWN.md` |
| Doc health check | `docs/products/ferd/development/DOC_HEALTH_CHECK.md` |
| Journey Designer sessions | `docs/products/ferd/sessions/` |
| **Products Tier — Hamn** | |
| Hamn product docs (Wave 2) | `docs/products/hamn/INDEX.md` |
| Hamn product spec | `docs/products/hamn/specification/PRODUCT_SPEC.md` |
| Hamn requirements | `docs/products/hamn/specification/REQUIREMENTS.md` |
| Hamn requirements (82 total) | `docs/products/hamn/specification/REQUIREMENTS.md` |
| Hamn deferred decisions | `docs/products/hamn/planning/DEFERRED.md` |
| Hamn research / open investigations | `docs/products/hamn/planning/RESEARCH.md` |
| **Implementation Tier** | |
| Database schema | `docs/implementation/shared/DATABASE_CURRENT.md` |
| Schema overview | `docs/implementation/shared/SCHEMA_OVERVIEW.md` |
| Authorization / RLS | `docs/implementation/shared/AUTH_SYSTEM.md`, `RLS_POLICIES.md` |
| Architecture baseline (live) | `docs/implementation/ferd/baseline/BASELINE.md` |
| Actual state / gap analysis | `docs/implementation/ferd/baseline/ACTUAL_STATE.md` |
| Status / Kanban | `docs/implementation/ferd/status/KANBAN.md` |

---

## Critical Gotchas

- **PostgREST INSERT...RETURNING:** Triggers BOTH INSERT and SELECT policies. Include creator check in SELECT.
- **Nested RLS:** Subqueries in policies hit RLS on referenced tables. Use SECURITY DEFINER to bypass.
- **SECURITY DEFINER:** Helper functions only. Never for user-data mutations. Always `search_path = ''`.
- **Circular RLS:** If function F queries table T, and F is used in T's SELECT policy → infinite recursion. Fix: make F SECURITY DEFINER.
- **`is_platform_admin()` not `has_permission()`** for admin RLS policies. Complex PLPGSQL fails in PG17 RLS.
- **Supabase SSR deadlock:** Never make DB queries inside `onAuthStateChange` callback — set state only, query in separate `useEffect`.
- **Policy name mismatch:** `DROP POLICY IF EXISTS` with wrong name silently succeeds, leaving old policy active.
- **Cookies:** `@supabase/ssr` cookies are chunked/encoded. API routes: pass JWT via `Authorization: Bearer` header.
- **Timestamps:** Supabase uses `+00:00`, JS uses `Z`. Compare as `new Date().getTime()`.
- **Next.js 16:** Uses `proxy.ts` not `middleware.ts`.

---

**This file is a routing document — it tells you WHERE to look, not HOW to code. Code patterns are in the codebase; detailed specs are in agent playbooks and behavior docs.**
