---
name: feature-development
description: >
  Implements a FringeIsland feature from its specification. Use this skill whenever
  someone asks to: build a feature, implement a feature spec, work on a FEAT-* file,
  create tasks from a feature, start building a specified feature, or implement stories
  from a feature spec. Also use when the user references a specific feature ID
  (e.g., "build FEAT-H001") or says "implement", "build", "code", or "develop" in
  the context of a feature. This skill reads the feature spec, creates tasks if needed,
  implements code, runs tests, and updates feature maturity status.
---

# Feature Development

This skill guides the implementation of a FringeIsland feature from its specification to shipped code.

## Prerequisites

- The feature spec exists in the ecosystem tree (e.g., `docs/products/hub/features/FEAT-H001-*.md`)
- The feature is at maturity **4-ready** or higher (all stories have acceptance criteria, no open questions)
- If the feature is below maturity 4, use the `ecosystem-decomposition` skill to complete the spec first

## Workflow

### Step 1: Load context (progressive disclosure)

Load files in this order — stop when you have enough context:

1. Root `CLAUDE.md` — project conventions, stack, patterns
2. `AGENTS.md` — boundaries (always do / ask first / never do)
3. The owner's `CLAUDE.md` — tier-specific constraints
   - `docs/products/CLAUDE.md` for product work
   - `docs/platform/CLAUDE.md` for platform work (STRICT rules)
4. The owner's `README.md` — product/service overview
5. **The feature spec** — the full specification you're implementing
6. The task file (if assigned a specific task)

Do NOT load unrelated features, other product specs, or wave files.

### Step 2: Check for existing tasks

Look in `docs/planning/backlog/tasks/` for tasks linked to this feature (check `feature:` in YAML frontmatter).

- If tasks exist: pick up the next `todo` task (respect `depends_on`)
- If no tasks exist and maturity is 4-ready: create tasks from the stories (see Step 3)
- If maturity is below 4: STOP — the feature needs more specification first

### Step 3: Create tasks (if needed)

For each story in the feature spec, create one or more tasks.

**Task sizing rule:** One task = one focused session of work. If it would take more than a day, split it.

**Task creation checklist:**
- [ ] Each task has a clear title describing the implementation work
- [ ] YAML frontmatter links back to the feature ID
- [ ] Dependencies between tasks are explicit (`depends_on`)
- [ ] Acceptance criteria are concrete and verifiable
- [ ] Technical notes reference specific files and patterns
- [ ] Verification steps describe how to confirm it's done

After creating tasks, update the feature maturity to `5-in-cycle`.

### Step 4: Implement

For each task:

1. Read the task's acceptance criteria and technical notes
2. Implement the code
3. Run lint and type-check: `npm run lint`
4. Run relevant tests
5. Verify the acceptance criteria manually if needed
6. Update task status to `review` or `done`

**Platform work requires extra caution:**
- New tables MUST have RLS policies
- API changes MUST be documented
- Schema changes require human approval (set task to `review`, not `done`)

### Step 5: Update status

After all tasks for a story are done:
- Verify the story's Given/When/Then acceptance criteria end-to-end
- If all stories in the feature are complete, update feature maturity to `6-done`
- Update the `features/README.md` index
- Update `CHANGELOG.md` if the change is user-visible

### Step 6: Clean up

- Ensure all code is committed with conventional commits: `feat(hub): ...` or `feat(platform): ...`
- Tasks stay in `tasks/` until the cycle retrospective — do NOT delete them

## Boundaries

### Always do
- Read the feature spec BEFORE writing any code
- Follow the acceptance criteria exactly — don't add unrequested scope
- Respect the No-gos section — these are explicit exclusions
- Run lint and type-check before committing
- Update CHANGELOG.md for user-visible changes

### Ask first
- Database schema changes (new tables, columns, RLS modifications)
- Adding new npm dependencies
- Changing shared platform code
- Deviating from the solution sketch in the feature spec (forward-looking specs only — retroactive 6-done specs have no solution sketch)

### Never do
- Implement features below maturity 4 (they need more specification)
- Delete migration files
- Modify API contracts without updating dependent feature specs
- Skip RLS policies on new tables
- Ignore the Rabbit holes section — those are flagged for a reason
