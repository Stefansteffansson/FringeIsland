# CLAUDE.md — AI Context for FringeIsland

**Version:** 0.2.37 | **Updated:** April 12, 2026 | **Wave 1 (Ferd):** 95% complete

---

## Project Overview

FringeIsland is an edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences.

**Stack:** Next.js 16.1 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, 19 tables with RLS)
**Testing:** Jest (659 tests: integration + unit) + Playwright (7 E2E tests)
**Repo:** https://github.com/Stefansteffansson/FringeIsland

---

## Doc Structure — In Transition (April 2026)

The repository documentation is being restructured into a multi-product ecosystem layout. Two structures coexist:

- **`docs/old_*/`** (`old_products/`, `old_implementation/`, `old_INDEX.md`) — partially migrated. Boot-up, sessions, agent contexts, and all live work still reference `old_products/` and `old_implementation/` paths.
- **`docs/{ecosystem,products,studios,platform,architecture,planning,research,design-system,templates,verticals}/`** — new ecosystem layout. Ecosystem, architecture, research, planning, and universe design content is now authoritative here.

**Migration status (April 12, 2026):**
- ✅ `old_universe/` — deleted. All 24 ADRs (U001-U024) in `docs/architecture/decisions/`.
- ✅ `OLD_VISION.md`, `OLD_VISION_DECISIONS.md` — deleted. All unique content extracted to `docs/ecosystem/universe/`, `docs/ecosystem/strategy/`, `docs/ecosystem/thinking/OPEN_QUESTIONS.md`, and `docs/ecosystem/VISION.md`.
- ✅ `DEFERRAL_PROTOCOL.md`, `PLANNING_PROTOCOL.md` — deleted. Principles absorbed into `docs/planning/PROCESS.md`.
- ⬜ `old_products/` — not yet migrated. Boot-up, sessions, agent contexts still reference these paths.
- ⬜ `old_implementation/` — not yet migrated.

---

## Session Management (Read First!)

### Boot-Up — Start of every session

**Trigger:** "boot up", "start session", or any variation
**Action:** Read and follow `docs/old_products/ferd/development/BOOT_UP.md` EXACTLY — use EXACT file paths from its table

Key files the workflow reads: `PROJECT_STATUS.md`, `SPRINT.md`, `docs/old_products/ferd/planning/ROADMAP.md`

**If user skips boot-up** (jumps to a task): remind them and offer to run it first.

### Close-Down — End of every session

**Trigger:** "thanks", "done", "that's all", wrapping up, or after completing major work
**Action:** Proactively suggest close-down, then follow `docs/old_products/ferd/development/CLOSE_DOWN.md` EXACTLY

Must update: `PROJECT_STATUS.md` (always), `SPRINT.md` (always), `docs/old_products/ferd/planning/ROADMAP.md` (if significant progress)

### Feature Work — Hand off to Sprint Agent

When user selects feature work after boot-up, load `docs/old_products/ferd/development/agents/contexts/sprint-agent.md` and `docs/old_products/ferd/development/WORKFLOW.md`. Sprint Agent creates a sequential plan; each step requires user approval before proceeding. No parallel agent launches.

---

## Architecture (Patterns, not code)

**Primary references (new tree):**
- `docs/architecture/ARCHITECTURE_ANATOMY_V1.md` — original layered anatomy (L0-L7, 5 verticals, Platform API ring). Conceptually superseded by Platform Core / Domain Services decomposition but contains unique rationale.
- `docs/architecture/DOMAIN_ENTITIES.md` — core domain model (entities, relationships, business rules)
- `docs/architecture/ECOSYSTEM_ANATOMY_V3.svg` — current ecosystem anatomy diagram
- `docs/architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` — dependency flow diagram
- `docs/architecture/decisions/` — 24 ADRs (U001-U024, all migrated)

**Live implementation state:** `docs/old_implementation/ferd/baseline/BASELINE.md`

**Wave model (not phases):** The platform evolves in six named waves: **Ferd** (Wave 1) → **Eid** (Wave 2) → **Hamn** (Wave 3) → **Heim** (Wave 4) → **Brim** (Wave 5) → **Urd** (Beyond). Waves are thematic focus buckets, not sequential gates — see ADR-U022 (naming) and ADR-U024 (operational semantics) in `docs/architecture/decisions/`.

- **Auth:** Client-side via AuthContext + useAuth() hook; proxy.ts for protected routes (Next.js 16, not middleware.ts)
- **Components:** App Router; client components marked `'use client'`; reusable UI in `/components/ui/`
- **State:** React Context for auth; local state for components; `refreshNavigation` custom event for cross-component updates
- **DB access:** Supabase client (`lib/supabase/client.ts`) for browser, server client (`lib/supabase/server.ts`) for RSC
- **API-first (ADR-009):** Business logic belongs in API routes (`/api/...`), not server components. Frontend calls the API; the API calls the database. Build every feature as if iOS/Android already exist. Pattern: `Database → API route → Frontend component`. Never: `Database → Frontend component directly`.
- **Security:** RLS on all 19 tables; triggers for business logic; `is_platform_admin()` SECURITY DEFINER for admin checks
- **RBAC:** 4 roles (Steward, Guide, Member, Observer), 31 permissions, `has_permission()` function
- **UI rules:** Never use browser `alert()`/`confirm()` — always use `ConfirmModal`. Always show loading states. Update ALL related state after data changes (members + roles + isLeader).

---

## Development Workflow — TDD is Mandatory

**Hard rule:** Behaviors → failing tests (RED) → design → implement (GREEN). Tests MUST fail before implementation begins.

**Canonical workflow:** `docs/old_products/ferd/development/WORKFLOW.md` (8 stages, 0–7, with hard STOP gates)

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

Start at `docs/README.md` for the full navigation map.

| What | Where |
|------|-------|
| Current state & blockers | `PROJECT_STATUS.md` |
| Active sprint + what's next | `SPRINT.md` |
| **Ecosystem (new tree — authoritative)** | |
| Vision (constitutional) | `docs/ecosystem/VISION.md` |
| Manifesto | `docs/ecosystem/MANIFESTO.md` |
| Universe design | `docs/ecosystem/universe/` |
| Products & platform strategy | `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md` |
| Business model | `docs/ecosystem/strategy/BUSINESS_MODEL.md` |
| IP & licensing | `docs/ecosystem/strategy/IP_AND_LICENSING.md` |
| Contribution architecture | `docs/ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md` |
| Open questions | `docs/ecosystem/thinking/OPEN_QUESTIONS.md` |
| **Architecture (new tree — authoritative)** | |
| Architecture anatomy (v1 reference) | `docs/architecture/ARCHITECTURE_ANATOMY_V1.md` |
| Domain entities | `docs/architecture/DOMAIN_ENTITIES.md` |
| Ecosystem anatomy diagram | `docs/architecture/ECOSYSTEM_ANATOMY_V3.svg` |
| Dependency diagram | `docs/architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` |
| ADRs (24 — all migrated) | `docs/architecture/decisions/` |
| **Research (new tree — authoritative)** | |
| Kegan / adult development | `docs/research/Kegan_ITC_Research_Report.md` |
| Human flourishing (v1, v2) | `docs/research/What_Fills_a_Life_v1.md`, `v2.md` |
| Theory U | `docs/research/Theory_U_Research_Report.md` |
| **Planning (new tree — authoritative)** | |
| Way of working | `docs/planning/PROCESS.md` |
| Current wave (Ferd) | `docs/planning/waves/ferd.md` |
| Ferd capability map | `docs/planning/waves/FERD-CAPABILITY-MAP.md` |
| Reference snapshots | `docs/planning/reference/` |
| Session records | `docs/planning/sessions/` |
| **Products Tier — Ferd (old tree — still authoritative)** | |
| Product scope (what/why) | `docs/old_products/ferd/specification/PRODUCT_SPEC.md` |
| Requirements (100 total) | `docs/old_products/ferd/specification/REQUIREMENTS.md` |
| Wave roadmap | `docs/old_products/ferd/planning/ROADMAP.md` |
| Deferred decisions | `docs/old_products/ferd/planning/DEFERRED.md` |
| Feature docs | `docs/old_products/ferd/development/features/` |
| Behavior specs | `docs/old_products/ferd/development/specs/` |
| Agent playbooks | `docs/old_products/ferd/development/agents/contexts/` |
| TDD + feature workflow | `docs/old_products/ferd/development/WORKFLOW.md` |
| Boot-up / Close-down | `docs/old_products/ferd/development/BOOT_UP.md`, `CLOSE_DOWN.md` |
| **Implementation Tier (old tree — still authoritative)** | |
| Database schema | `docs/old_implementation/shared/DATABASE_CURRENT.md` |
| Authorization / RLS | `docs/old_implementation/shared/AUTH_SYSTEM.md` |
| Architecture baseline (live) | `docs/old_implementation/ferd/baseline/BASELINE.md` |

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

## Documentation structure (updated 2026-04-12)
- `docs/` has two trees: ecosystem (what we're building) and planning (how we're building it)
- `docs/ecosystem/` has four layers: constitutional (VISION, MANIFESTO), universe/ (what the world is and how it works), strategy/ (stable direction), thinking/ (explorations)
- `docs/ecosystem/universe/` holds universe design: cosmology, personal-growth, beings, narrative, community, kickstarter
- Features live under their product: `docs/products/hub/features/FEAT-H001-*.md`
- Tasks live in backlog: `docs/planning/backlog/tasks/TASK-NNN.md`
- Waves define strategic focus: `docs/planning/waves/ferd.md`
- Start at `docs/README.md` for navigation

## Directory purpose guide
- `docs/ecosystem/` — strategic, philosophical, cross-product ("what is FringeIsland?")
- `docs/ecosystem/strategy/` — stable directional documents (product family, contributors)
- `docs/ecosystem/thinking/` — open questions, explorations, legacy content being mined
- `docs/architecture/` — structural models, binding decisions, dependency diagrams
- `docs/platform/` — service descriptions, feature specs, API contracts
- `docs/planning/reference/` — point-in-time snapshots informing planning cycles
- `docs/research/` — all research reports regardless of topic

## Skills (updated 2026-04-09)
- `ecosystem-decomposition` — decompose vision → product → feature → story → task
- `feature-development` — take a feature spec and implement it
- `wave-planning` — define wave scope and verify completion

## Context loading order
1. Read CLAUDE.md (this file) — project overview + nav
2. Read docs/README.md — documentation map
3. Read the specific product/service README.md — area overview
4. Read the feature spec — full spec for the task
5. Read the task file — specific implementation work
Never load all features at once — load only what you're working on.

---

**This file is a routing document — it tells you WHERE to look, not HOW to code. Code patterns are in the codebase; detailed specs are in agent playbooks and behavior docs.**
