# Session Boot-Up Workflow

**Purpose:** Standard procedure for starting a work session on FringeIsland
**Last Updated:** February 28, 2026

---

## File Paths — Use EXACTLY as written

| File | EXACT Path | Required? |
|------|-----------|-----------|
| **Project Status** | `PROJECT_STATUS.md` | Always |
| **Sprint Tracker** | `SPRINT.md` | Always |
| **Roadmap** | `docs/planning/ROADMAP.md` | Always |
| **Lifecycle Decisions** | `docs/planning/lifecycle-roadmap-decisions.md` | If sprinting |
| **Vision** | `docs/vision/VISION.md` | Optional |
| **Manifesto** | `docs/vision/MANIFESTO.md` | Optional |
| **Contribution Architecture** | `docs/vision/CONTRIBUTION_ARCHITECTURE.md` | Optional |
| **Products & Platform** | `docs/vision/PRODUCTS_AND_PLATFORM.md` | Optional |
| **Product Spec** | `docs/planning/PRODUCT_SPEC.md` | Optional |
| **Deferred Decisions** | `docs/planning/DEFERRED_DECISIONS.md` | Optional |

If a file read fails: report the error immediately, use Glob to find it, update this table.

---

## Boot-Up Checklist

### 1. Read Current Status

Read the 3 required files. Extract from PROJECT_STATUS.md: current version, focus, active tasks, blockers, next priorities. Quick-scan ROADMAP.md for phase completion % and immediate priorities.

**Report:**
```
Booting up FringeIsland v[VERSION]

Current focus: [from PROJECT_STATUS.md]
Active tasks: [list]
Blockers: [None / list]
Active sprint: [work stream name + TDD stage from SPRINT.md]
Next sprint: [from SPRINT.md "Next Sprint" section]
```

### 2. Check Git Status

Run `git status`. Report: clean/dirty, branch name, uncommitted/untracked files, ahead/behind remote.

### 3. Check Test Status

Check PROJECT_STATUS.md for current test counts (Jest integration + unit + Playwright E2E) and any failing tests from last session. If tests failing, prioritize fixing them before new work.

**Test commands (if needed):**
- `npm run test:integration:quick` — regression check (stops on first fail)
- `npm run test:e2e` — Playwright E2E (requires dev server on localhost:3000)

### 4. Load Context

CLAUDE.md is auto-loaded. Optionally load based on work type:

| Work type | Load |
|-----------|------|
| Database | `docs/agents/contexts/database-agent.md` |
| UI | `docs/agents/contexts/ui-agent.md` |
| Feature (full-stack) | `docs/agents/contexts/integration-agent.md` + `architect-agent.md` |
| Specific feature | `docs/features/implemented/[feature].md` |
| Testing/TDD | `docs/specs/behaviors/[domain].md` + `docs/workflows/feature-development.md` |

**If building new feature:** verify feature context first (Stage 0 of TDD workflow) — check PRODUCT_SPEC.md for scope, check if feature doc exists. If missing, create it first or ask user. Follow the BDD hierarchy: Vision → Product Spec → Roadmap → Features → Behaviors → Tests → Code.

### 5. Ask User

Present ready state and suggest work items from PROJECT_STATUS.md. Remind: TDD for new features (spec > test > implement).

### 6. Hand Off to Sprint Agent (for feature work)

**When user selects feature work, hand off immediately. Do NOT explore the codebase or plan on your own.**

1. Load `docs/agents/contexts/sprint-agent.md`
2. Load `docs/workflows/feature-development.md`
3. Sprint Agent creates sequential plan with user checkpoints
4. Present plan to user for approval BEFORE executing any step
5. Execute one step at a time — ask permission between each

**Do NOT:** launch parallel agents, skip planning for "simple" features, or proceed without user approval.

**TDD workflow reminder (Stages 0-7):**
0. Feature context → 1. Behaviors → 2. Write tests → 3. Run tests RED → 4. Design → 5. Implement GREEN → 6. Verify → 7. Document

Each stage completes fully before the next begins. No parallel execution.

---

## Related

- **Close-down:** `docs/workflows/close-down.md`
- **Feature development (TDD):** `docs/workflows/feature-development.md`
- **Doc health check:** `docs/workflows/doc-health-check.md`
- **Project status:** `PROJECT_STATUS.md`
- **Sprint tracker:** `SPRINT.md`
- **Agent contexts:** `docs/agents/contexts/`
