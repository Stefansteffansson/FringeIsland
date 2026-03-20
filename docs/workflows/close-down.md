# Session Close-Down Workflow

**Purpose:** Standard procedure for ending a work session on FringeIsland
**Last Updated:** March 20, 2026

---

## File Paths — Use EXACTLY as written

| File | EXACT Path | When to Update |
|------|-----------|----------------|
| **Project Status** | `PROJECT_STATUS.md` | Always |
| **Sprint Tracker** | `SPRINT.md` | Always |
| **Roadmap** | `docs/planning/ROADMAP.md` | If wave milestone hit |
| **Product Spec** | `docs/planning/PRODUCT_SPEC.md` | If scope changed |
| **Deferred Decisions** | `docs/planning/DEFERRED_DECISIONS.md` | If new deferrals |
| **Behavior Specs** | `docs/specs/behaviors/[domain].md` | If behaviors tested, OR if a cross-cutting change (terminology, schema, roles) affects specs in other domains |
| **Feature Docs** | `docs/features/implemented/[feature].md` | If feature updated, OR if a cross-cutting change invalidates sections in related feature docs |
| **Architecture Docs** | `docs/architecture/[doc].md` (incl. `ARCHITECTURE_ANATOMY.md`, `ARCHITECTURE_DECISIONS.md`) | If schema, RLS, auth flow, system design, or new ADRs |
| **Vision Docs** | `docs/vision/[doc].md` (incl. `PRODUCTS_AND_PLATFORM.md`) | If product strategy, wave model, or vision changed |
| **Database Docs** | `docs/database/[doc].md` | If tables, columns, migrations, or RLS policies changed |
| **Session Bridge** | `docs/planning/sessions/YYYY-MM-DD-description.md` | If significant work |

If a file read fails: report the error immediately, use Glob to find it, update this table.

---

## Close-Down Checklist

### 1. Summarize Work Done

Gather from conversation: what was implemented/fixed/updated, files changed, decisions made, tests written, challenges encountered, incomplete work.

### 2. Run Tests (if code changed)

- `npm run test:integration:quick` — quick regression check
- `npm run test:integration` — full suite (~8 min, run in background)
- `npm run test:e2e` — Playwright E2E (if UI changed)

Report: total tests, passing/failing, new tests added. Fix failures before committing or document as known issue.

### 3. Update Agent Learnings

For each domain worked in, append discoveries to `docs/agents/learnings/[domain].md` (database, ui, integration, testing, architecture, qa, sprints). Cross-cutting insights also go in MEMORY.md if under 150-line cap.

### 4. Update Documentation

**A. PROJECT_STATUS.md (always):** Update date, focus, active tasks, test counts, last session summary, next priorities.

**B. SPRINT.md (always):** Update `SPRINT.md` — tick off completed sprint steps, update active TDD stage, update "Next Sprint" if priorities shifted.

**C. Behavior specs (if tested):** Mark behaviors as verified in `docs/specs/behaviors/[domain].md` with test results and checked acceptance criteria.

**D. Feature docs (if updated):** Link verified behaviors in `docs/features/implemented/[feature].md`.

**D2. Cross-cutting consistency (if any terminology, schema, or role change was made):** Check docs outside the domain worked in. Check `docs/architecture/ARCHITECTURE_ANATOMY.md` for stale role names or schema references. Check `docs/architecture/AUTHORIZATION.md` and `docs/database/rls-policies.md` if RLS changed. Check behavior specs in other domains that reference the changed concept (e.g., a rename from "Group Leader" to "Steward" touches every spec that used the old term).

**E. ROADMAP.md (if wave milestone hit):** Update wave/milestone status, completion %, deliverables. Path: `docs/planning/ROADMAP.md` (not root!).

**F. PRODUCT_SPEC.md (if scope changed):** Update features, criteria, or personas.

**G. DEFERRED_DECISIONS.md (if new deferrals):** Add entry with topic, rationale, and version.

Show diff to user for approval.

### 5. Create Session Bridge (if significant work)

**Create if:** significant feature work, major decisions, complex changes, important insights.
**Skip if:** minor docs updates, simple bug fixes, quick tasks.

File: `docs/planning/sessions/YYYY-MM-DD-brief-description.md`
Include: summary, test results, behaviors documented, decisions, files changed, next steps.

### 6. Update CHANGELOG.md (if version change)

Add version entry with Added/Changed/Fixed sections.

### 7. Git Commit

Ask user. Stage relevant files (never stage .env or credentials).

**Commit message format:**
```
[type]: [brief description]

- Detail 1
- Detail 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

### 8. Final Report

```
Session closed for FringeIsland

Summary: [what was done]
Test status: [X passing / Y failing]
Updated: [list of docs updated]
Git: [commit hash / not committed]
Sprint status: [active work stream + TDD stage + steps completed/remaining, from SPRINT.md]
```

---

## Related

- **Boot-up:** `docs/workflows/boot-up.md`
- **Feature development (TDD):** `docs/workflows/feature-development.md`
- **Doc health check:** `docs/workflows/doc-health-check.md`
- **Project status:** `PROJECT_STATUS.md`
- **Sprint tracker:** `SPRINT.md`
- **Session bridges:** `docs/planning/sessions/`
