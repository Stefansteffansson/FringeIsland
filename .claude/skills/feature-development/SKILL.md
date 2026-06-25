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

After creating tasks, update the feature maturity to `5-in-cycle`. In the **same commit**, update the feature-inventory summary row in the parent entity's `SPECIFICATION.md` (§L4) to reflect the new maturity. This keeps the entity-level summary honest about what's in flight. Per the `ecosystem-decomposition` skill L4 write scope, this is L4's property; `feature-development` is the operational layer carrying the update out.

### Step 4: Implement (BDD outside-in, TDD red-first)

The feature is 4-ready, so its behaviour is already specified as Given/When/Then acceptance criteria — the **BDD outer loop**. Implementation is the **TDD inner loop**: drive each criterion red → green → refactor. **Do not write implementation code before a failing test exists for the behaviour it satisfies.**

For each story, then each acceptance criterion:

1. **Map the criterion to the right test tier** (keep the pyramid upright):
   - **unit** (Jest + jsdom) — component/UI logic, branching, pure functions
   - **integration** (Jest + node) — the real substrate / API contract
   - **E2E** (Playwright) — the critical user journey

   Push logic-heavy assertions down to the unit tier; reserve integration for the substrate contract and E2E for journeys.
2. **Red** — write the test, tag it with the story/behaviour ID, run it, and confirm it FAILS for the right reason. Capture the red result.
3. **Green** — implement the minimum to pass; run the test; confirm it passes.
4. **Refactor** — clean up with the test green.
5. Run lint/type-check (`npm run lint`) and the relevant suite.
6. Update task status to `review` or `done`.

Every acceptance criterion ends with at least one passing test that was **first seen red**. A behaviour with no failing-first test is not done. **If a freshly-written test passes the first time it runs (green when it should be red), STOP and surface it** — the test is suspect (vacuous, mis-targeted, or the behaviour already exists), and a test that never failed proves nothing; investigate before writing any implementation. (Coverage added test-after — e.g. backfill on already-shipped code — is allowed, but must be **labelled honestly** as test-after, never claimed as TDD.)

**Platform work requires extra caution:**
- New tables MUST have RLS policies
- API changes MUST be documented
- Schema changes require human approval (set task to `review`, not `done`)

### Step 5: Update status

After all tasks for a story are done:
- Verify the story's Given/When/Then acceptance criteria end-to-end
- **Test DoD (required before `6-done`):**
  - every acceptance criterion has a passing test that was **demonstrated red first**
  - the **pyramid is upright** — unit-tier coverage exists for component/logic behaviour, not only integration + E2E
  - lint + build + the **full suite** are green
  - the Implementation notes record the red → green evidence honestly; any test-after coverage is **labelled as such** (never claimed as test-first)
- If all stories in the feature are complete, update feature maturity to `6-done`
- In the **same commit** as the maturity change, update the feature-inventory summary row in the parent entity's `SPECIFICATION.md` (§L4) to reflect `6-done`. Per the `ecosystem-decomposition` skill L4 write scope, this is L4's property; `feature-development` is the operational layer carrying the update out. The `doc-health-check` skill §8 verifies the summary matches the actual state of `features/` at cycle boundaries — miss this step and the check will flag drift.
- Update the `features/README.md` index
- Update `CHANGELOG.md` if the change is user-visible

### Step 6: Clean up

- Ensure all code is committed with conventional commits: `feat(hub): ...` or `feat(platform): ...`
- Tasks stay in `tasks/` until the cycle retrospective — do NOT delete them

## Boundaries

### Always do
- Read the feature spec BEFORE writing any code
- Write a failing test BEFORE the implementation it covers — demonstrate red, then green, then refactor
- Keep the test pyramid upright — cover logic/component behaviour at the unit tier, not only via integration/E2E
- Follow the acceptance criteria exactly — don't add unrequested scope
- Respect the No-gos section — these are explicit exclusions
- Run lint and type-check before committing
- Update CHANGELOG.md for user-visible changes

### Ask first
- A freshly-written test that passes when it should fail (green-at-red) — stop and surface the anomaly before writing implementation
- Database schema changes (new tables, columns, RLS modifications)
- Adding new npm dependencies
- Changing shared platform code
- Deviating from the solution sketch in the feature spec (forward-looking specs only — retroactive 6-done specs have no solution sketch)

### Never do
- Implement features below maturity 4 (they need more specification)
- Write implementation code for a behaviour before a failing test exists for it
- Claim TDD / test-first in specs, commits, or bridges when coverage was written test-after — label it honestly
- Delete migration files
- Modify API contracts without updating dependent feature specs
- Skip RLS policies on new tables
- Ignore the Rabbit holes section — those are flagged for a reason
