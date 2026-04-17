# CLAUDE.md — AI Context for FringeIsland

**Last updated:** 2026-04-17 (post way-of-working refactor — Session 1).
**Reflects:** Model A (feature specs with embedded stories in the ecosystem tree; no PRDs); four skills as the execution layer; `old_universe/`, `old_products/`, and `old_implementation/` all deleted.

This file is the project's entry point for AI agents. It tells you WHERE to look and WHICH skill to load — it does not try to describe every mechanic.

---

## Project overview

FringeIsland is an edutainment platform for group-based personal development built around three questions: **Who am I? What do I want? How do I get there?** Users travel solo or in groups on structured journeys, guided by role-based experiences (Stewards lead, Guides facilitate, Members participate, Observers watch).

**Stack:** Next.js 16.1 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL).
**Testing:** Jest (integration + unit) + Playwright (E2E).
**Repo:** https://github.com/Stefansteffansson/FringeIsland

The canonical source for current test counts, table counts, and wave progress is the codebase itself — migrations in `supabase/migrations/`, tests under `tests/`, and wave status in `docs/planning/waves/ferd.md`. Don't infer those numbers from this file.

---

## How to start any task

The way of working is not described in this file. It lives in one canonical document and four skills:

- **Way of working:** [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) — pipeline, cadence, DoR/DoD, tagging, how the process evolves.
- **Execution layer (skills):** [`.claude/skills/`](.claude/skills/) — the four skills below are where operational mechanics actually live. See PROCESS.md §6.5 for the canonical description of why skills are separated from PROCESS.md.

### The four skills — load the one that matches the work

| Skill | Load when the task is… | Path |
|-------|------------------------|------|
| `ecosystem-decomposition` | Decomposing vision → product → feature → story → task. Writing or updating a DESCRIPTION, SPECIFICATION, feature spec, or capability map. Scoping a wave. | [`.claude/skills/ecosystem-decomposition/SKILL.md`](.claude/skills/ecosystem-decomposition/SKILL.md) |
| `feature-development` | Implementing a feature at maturity 4-ready or higher. Generating tasks from stories. Writing code against a spec. Updating feature maturity to `6-done`. | [`.claude/skills/feature-development/SKILL.md`](.claude/skills/feature-development/SKILL.md) |
| `wave-planning` | Scoping, tracking, or completing a wave. Asking "what's left in Ferd?" Checking wave DoD. | [`.claude/skills/wave-planning/SKILL.md`](.claude/skills/wave-planning/SKILL.md) |
| `doc-health-check` | Cycle-boundary audit; on-demand after cross-cutting changes (renames, deletions, schema migrations, folder restructures). | [`.claude/skills/doc-health-check/SKILL.md`](.claude/skills/doc-health-check/SKILL.md) |

**The right skill is the first thing to load** after this file and AGENTS.md. Don't try to execute from PROCESS.md alone — PROCESS.md tells you *what* and *when*; the skill tells you *how*.

### Context loading order

1. This file — project orientation + navigation.
2. [`AGENTS.md`](AGENTS.md) — boundaries (always-do / ask-first / never-do).
3. [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) — way of working (skim once; return as needed).
4. The skill that matches the task (see table above).
5. The **tier-level `CLAUDE.md`** for where the work lives — [`docs/products/CLAUDE.md`](docs/products/CLAUDE.md), [`docs/platform/CLAUDE.md`](docs/platform/CLAUDE.md), [`docs/studios/CLAUDE.md`](docs/studios/CLAUDE.md), [`docs/design-system/CLAUDE.md`](docs/design-system/CLAUDE.md), or [`docs/verticals/CLAUDE.md`](docs/verticals/CLAUDE.md). Each tier file is a delta from this file: it contains the tier-specific rules, verticals obligations, and gotchas that only matter when working in that subtree.
6. The owner's `README.md` — the specific product / service / studio / vertical.
7. The specific feature spec (if one is already in play).
8. The task file (if assigned a specific TASK-*.md).

Load progressively. Never load all features at once — pull only what the task actually needs.

---

## Document map

Start at [`docs/README.md`](docs/README.md) for the full navigation map. Everything below links to entry points; deeper structure lives in each area's README.

| What | Where |
|------|-------|
| **Way of working (read first)** | [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) |
| **Ecosystem (what we're building)** | |
| Vision (constitutional) | [`docs/ecosystem/VISION.md`](docs/ecosystem/VISION.md) |
| Manifesto | [`docs/ecosystem/MANIFESTO.md`](docs/ecosystem/MANIFESTO.md) |
| Universe design (cosmology, beings, narrative, …) | [`docs/ecosystem/universe/`](docs/ecosystem/universe/) |
| Products & platform strategy | [`docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md`](docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md) |
| Open questions | [`docs/ecosystem/thinking/OPEN_QUESTIONS.md`](docs/ecosystem/thinking/OPEN_QUESTIONS.md) |
| **Products, platform, studios** | |
| The Hub (web) | [`docs/products/hub/`](docs/products/hub/) |
| The Gimbal (mobile, planned) | [`docs/products/gimbal/`](docs/products/gimbal/) |
| The Game (scope TBD) | [`docs/products/game/`](docs/products/game/) |
| Platform Core (Infrastructure / Identity / Organisation / Governance) | [`docs/platform/core/`](docs/platform/core/) |
| Platform Domain Services (World Model, Narrative, Experience, …) | [`docs/platform/domain/`](docs/platform/domain/) |
| Studios (Journey, Universe, Arc) | [`docs/studios/`](docs/studios/) |
| Design system | [`docs/design-system/`](docs/design-system/) |
| Cross-cutting verticals | [`docs/verticals/`](docs/verticals/) |
| **Architecture** | |
| Architecture anatomy (v1 reference) | [`docs/architecture/ARCHITECTURE_ANATOMY_V1.md`](docs/architecture/ARCHITECTURE_ANATOMY_V1.md) |
| Domain entities | [`docs/architecture/DOMAIN_ENTITIES.md`](docs/architecture/DOMAIN_ENTITIES.md) |
| ADRs (U001–U024, all migrated) | [`docs/architecture/decisions/`](docs/architecture/decisions/) |
| **Planning** | |
| Current wave (Ferd) | [`docs/planning/waves/ferd.md`](docs/planning/waves/ferd.md) |
| Ferd capability map | [`docs/planning/waves/FERD-CAPABILITY-MAP.md`](docs/planning/waves/FERD-CAPABILITY-MAP.md) |
| Active cycle (when one exists) | `docs/planning/cycles/cycle-current.md` |
| Tasks in motion | [`docs/planning/backlog/tasks/`](docs/planning/backlog/) |
| Retrospectives (weekly / cycle / wave / quarterly) | [`docs/planning/retrospectives/`](docs/planning/retrospectives/) |
| Session bridges | [`docs/planning/sessions/`](docs/planning/sessions/) |
| Reference snapshots | [`docs/planning/reference/`](docs/planning/reference/) |
| **Templates** (canonical shapes) | [`docs/templates/`](docs/templates/) |
| **Research reports** | [`docs/research/`](docs/research/) |

---

## Architecture (patterns, not code)

The codebase already reflects these patterns — this list is orientation for agents new to the repo, not a re-specification.

- **Two trees, never mixed:** `docs/ecosystem/`, `docs/products/`, `docs/platform/`, `docs/studios/`, `docs/design-system/`, `docs/verticals/`, `docs/architecture/` (the ecosystem tree — WHAT) versus `docs/planning/` (the planning tree — HOW). Features live in the ecosystem tree under their owner; tasks and cycles live in the planning tree.
- **Wave model (not phases):** Six named waves — **Ferd** → **Eid** → **Hamn** → **Heim** → **Brim** → **Urd**. Thematic focus buckets, not sequential gates (see ADR-U022 naming, ADR-U024 operational semantics).
- **Five verticals (obligations on every tier):** Administration · Privacy/GDPR · Notifications · Observability · Transactions (ADR-U002). Verticals are not services — they are cross-cutting obligations that every platform service, product, studio, and design-system component must fulfil. Every feature spec has a mandatory Vertical Impact section (see AGENTS.md). The tier-level `CLAUDE.md` files describe how each vertical applies to their tier specifically.
- **API-first (ADR-U009):** Business logic belongs in API routes (`/api/...`), not server components. Build every feature as if iOS/Android already exist: `Database → API route → Frontend component`. Never `Database → Frontend component directly`.
- **Auth:** Client-side via `AuthContext` + `useAuth()` hook; `proxy.ts` for protected routes (Next.js 16 — not `middleware.ts`).
- **Components:** App Router; client components marked `'use client'`; reusable UI in `/components/ui/`.
- **State:** React Context for auth; local state for components; `refreshNavigation` custom event for cross-component updates.
- **DB access:** Supabase client (`lib/supabase/client.ts`) for browser, server client (`lib/supabase/server.ts`) for RSC.
- **Security:** RLS on every table; triggers for business logic requiring subqueries; `is_platform_admin()` SECURITY DEFINER for admin-level RLS.
- **RBAC:** Four roles (Steward, Guide, Member, Observer); permission checks via `has_permission()` SQL function.
- **UI rules:** Never use browser `alert()` / `confirm()` — always `ConfirmModal`. Always show loading states. Update ALL related state after data changes (e.g., members + roles + isLeader together).

---

## Development workflow

TDD is mandatory. The day-to-day mechanics — how to read a feature spec, generate tasks from stories, write failing tests, implement, and mark maturity `6-done` — live in the [`feature-development`](.claude/skills/feature-development/SKILL.md) skill. Load it when you're about to build.

### Database migrations

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

**Use `supabase-cli.sh`, never `supabase-cli.bat`** — Claude Code runs in bash.

### Testing

- **During dev:** `npm run test:integration:<domain>` (domains: `auth`, `groups`, `journeys`, `rls`, `rbac`, `admin`, `communication`, `security`).
- **Before commit:** `npm run test:integration` — full suite; run in background.
- **Quick regression:** `npm run test:integration:quick` — stops on first failure.
- **E2E:** `npm run test:e2e` — Playwright; requires dev server on `localhost:3000`.

---

## Critical gotchas

Hard-won lessons; read once, remember forever.

- **PostgREST INSERT…RETURNING:** Triggers BOTH INSERT and SELECT policies. Include creator check in SELECT.
- **Nested RLS:** Subqueries in policies hit RLS on referenced tables. Use SECURITY DEFINER to bypass.
- **SECURITY DEFINER:** Helper functions only. Never for user-data mutations. Always `search_path = ''`.
- **Circular RLS:** If function F queries table T and F is used in T's SELECT policy → infinite recursion. Fix: make F SECURITY DEFINER.
- **Admin RLS:** Use `is_platform_admin()`, not `has_permission()`. Complex PLPGSQL fails in PG17 RLS.
- **Supabase SSR deadlock:** Never make DB queries inside `onAuthStateChange` — set state only; query in a separate `useEffect`.
- **Policy name mismatch:** `DROP POLICY IF EXISTS` with the wrong name silently succeeds, leaving the old policy active.
- **Cookies:** `@supabase/ssr` cookies are chunked/encoded. API routes: pass JWT via `Authorization: Bearer` header.
- **Timestamps:** Supabase uses `+00:00`, JS uses `Z`. Compare as `new Date().getTime()`.
- **Next.js 16:** Uses `proxy.ts`, not `middleware.ts`.
- **PostgreSQL CHECK constraints:** Cannot contain subqueries. Use triggers instead when validation needs one.

---

## Directory purpose guide (ecosystem vs. planning)

| Directory | What belongs here | What does NOT |
|-----------|-------------------|---------------|
| `docs/ecosystem/` | Strategic, philosophical, cross-product — "what is FringeIsland?" | Technical architecture, service specs, planning artifacts |
| `docs/ecosystem/universe/` | Universe design — cosmology, beings, narrative, community | Service specs (→ platform/), open questions (→ thinking/) |
| `docs/ecosystem/strategy/` | Stable directional documents — product family, contributors | Open questions (→ thinking/), research (→ research/) |
| `docs/ecosystem/thinking/` | Open questions, explorations, items awaiting clear ownership | Stable strategy (→ strategy/), research (→ research/) |
| `docs/architecture/` | Structural models, binding decisions (ADRs), dependency diagrams | Service descriptions, feature specs, planning snapshots |
| `docs/platform/` | Service descriptions, feature specs, API contracts | Binding decisions (→ architecture/), ecosystem strategy (→ ecosystem/) |
| `docs/planning/reference/` | Point-in-time snapshots informing planning cycles | Permanent structural models (→ architecture/) |
| `docs/research/` | Research reports regardless of topic | Strategy (→ ecosystem/), decisions (→ architecture/) |

---

**This file is a routing document — WHERE to look, not HOW to code.** Code patterns live in the codebase. Operational mechanics live in the skills. Strategic rhythm lives in PROCESS.md.
