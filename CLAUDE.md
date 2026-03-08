# CLAUDE.md — AI Context for FringeIsland

**Version:** 0.2.36 | **Updated:** February 28, 2026 | **Phase 1:** 95% complete

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
**Action:** Read and follow `docs/workflows/boot-up.md` EXACTLY — use EXACT file paths from its table

Key files the workflow reads: `PROJECT_STATUS.md`, `SPRINT.md`, `docs/planning/ROADMAP.md`

**If user skips boot-up** (jumps to a task): remind them and offer to run it first.

### Close-Down — End of every session

**Trigger:** "thanks", "done", "that's all", wrapping up, or after completing major work
**Action:** Proactively suggest close-down, then follow `docs/workflows/close-down.md` EXACTLY

Must update: `PROJECT_STATUS.md` (always), `SPRINT.md` (always), `docs/planning/ROADMAP.md` (if significant progress)

### Feature Work — Hand off to Sprint Agent

When user selects feature work after boot-up, load `docs/agents/contexts/sprint-agent.md` and `docs/workflows/feature-development.md`. Sprint Agent creates a sequential plan; each step requires user approval before proceeding. No parallel agent launches.

---

## Architecture (Patterns, not code)

- **Auth:** Client-side via AuthContext + useAuth() hook; proxy.ts for protected routes (Next.js 16, not middleware.ts)
- **Components:** App Router; client components marked `'use client'`; reusable UI in `/components/ui/`
- **State:** React Context for auth; local state for components; `refreshNavigation` custom event for cross-component updates
- **DB access:** Supabase client (`lib/supabase/client.ts`) for browser, server client (`lib/supabase/server.ts`) for RSC
- **Security:** RLS on all 19 tables; triggers for business logic; `is_platform_admin()` SECURITY DEFINER for admin checks
- **RBAC:** 4 roles (Steward, Guide, Member, Observer), 31 permissions, `has_permission()` function
- **UI rules:** Never use browser `alert()`/`confirm()` — always use `ConfirmModal`. Always show loading states. Update ALL related state after data changes (members + roles + isLeader).

---

## Development Workflow — TDD is Mandatory

**Hard rule:** Behaviors → failing tests (RED) → design → implement (GREEN). Tests MUST fail before implementation begins.

**Canonical workflow:** `docs/workflows/feature-development.md` (8 phases, 0–7, with hard STOP gates)

**Phase summary:** 0-Feature context → 1-Behaviors → 2-Write tests → 3-Run tests RED → 4-Design → 5-Implement GREEN → 6-Verify → 7-Document

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

| What | Where |
|------|-------|
| Current state & blockers | `PROJECT_STATUS.md` |
| Active sprint + what's next | `SPRINT.md` |
| Phase roadmap | `docs/planning/ROADMAP.md` |
| Product scope (what/why) | `docs/planning/PRODUCT_SPEC.md` |
| Vision | `docs/vision/VISION.md` |
| Deferred decisions | `docs/planning/DEFERRED_DECISIONS.md` |
| Lifecycle sprint decisions | `docs/planning/lifecycle-roadmap-decisions.md` |
| Feature docs | `docs/features/implemented/` |
| Behavior specs | `docs/specs/behaviors/` |
| Agent playbooks | `docs/agents/contexts/` (7 agents) |
| Agent journals | `docs/agents/learnings/` |
| TDD + feature workflow | `docs/workflows/feature-development.md` |
| Boot-up / Close-down | `docs/workflows/boot-up.md`, `docs/workflows/close-down.md` |
| Doc health check | `docs/workflows/doc-health-check.md` |

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
