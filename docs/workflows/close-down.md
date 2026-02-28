# Session Close-Down Workflow

**Purpose:** Standard procedure for ending a work session on FringeIsland
**Last Updated:** February 28, 2026

---

## File Paths — Use EXACTLY as written

| File | EXACT Path | When to Update |
|------|-----------|----------------|
| **Project Status** | `PROJECT_STATUS.md` | Always |
| **What's Next** | `docs/planning/NEXT.md` | Always |
| **Roadmap** | `docs/planning/ROADMAP.md` | If phase milestone hit |
| **Product Spec** | `docs/planning/PRODUCT_SPEC.md` | If scope changed |
| **Deferred Decisions** | `docs/planning/DEFERRED_DECISIONS.md` | If new deferrals |
| **Behavior Specs** | `docs/specs/behaviors/[domain].md` | If behaviors tested |
| **Feature Docs** | `docs/features/implemented/[feature].md` | If features updated |
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

**B. NEXT.md (always):** Update `docs/planning/NEXT.md` with current priorities.

**C. Behavior specs (if tested):** Mark behaviors as verified in `docs/specs/behaviors/[domain].md` with test results and checked acceptance criteria.

**D. Feature docs (if updated):** Link verified behaviors in `docs/features/implemented/[feature].md`.

**E. ROADMAP.md (if phase milestone hit):** Update phase status, completion %, deliverables. Path: `docs/planning/ROADMAP.md` (not root!).

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
Next priorities: [from NEXT.md]
```

---

## Related

- **Boot-up:** `docs/workflows/boot-up.md`
- **Feature development (TDD):** `docs/workflows/feature-development.md`
- **Project status:** `PROJECT_STATUS.md`
- **What's next:** `docs/planning/NEXT.md`
- **Session bridges:** `docs/planning/sessions/`
