# Doc Health Check Workflow

**Purpose:** Periodic audit to catch documentation drift before it accumulates
**Trigger:** Run at every sprint retrospective. Also run on-demand when a cross-cutting change (rename, schema change, role change) lands.
**Last Updated:** March 3, 2026

---

## When to Run

| Trigger | Scope |
|---------|-------|
| Sprint retrospective (every sprint) | Full check — all three sections below |
| After a cross-cutting rename (e.g., "Group Leader" → "Steward") | Section 1 (Terminology) focused on the renamed term |
| After schema migration (new table, dropped column, changed RLS) | Section 2 (Schema) focused on the changed objects |
| After a feature ships and tests pass | Section 3 (Acceptance Criteria) for that feature's behavior specs |

---

## Section 1: Terminology Drift

**Question:** Were any role names, entity names, or permission names changed this sprint (or recently)?

**If yes:**

1. List the old → new terms (e.g., `Group Leader → Steward`, `user_id → member_group_id`)
2. Search for the **old** term across these locations:
   - `docs/specs/behaviors/*.md` — behavior specs
   - `docs/features/implemented/*.md` — feature docs
   - `docs/architecture/*.md` — architecture docs
   - `docs/database/*.md` — database docs
   - `CLAUDE.md` — project instructions
   - `docs/agents/contexts/*.md` — agent playbooks
3. For each hit: update to the new term, preserving surrounding context
4. Verify no code references use the old name (search `app/`, `components/`, `lib/`)

**Skip if:** No renames happened this sprint.

---

## Section 2: Schema Drift

**Question:** Were any tables added, columns dropped, RLS policies changed, or migrations applied?

**If yes:**

1. List the schema changes (table/column/policy + what changed)
2. Check these docs for accuracy:
   - `docs/database/schema-overview.md` — table and column descriptions
   - `docs/database/rls-policies.md` — RLS policy listing
   - `docs/architecture/DATABASE_SCHEMA.md` — architecture-level schema overview
   - `docs/architecture/AUTHORIZATION.md` — auth flow and RLS strategy
3. For each doc: verify the described schema matches the actual database
4. If a doc references a dropped column, removed policy, or renamed table — fix it

**Skip if:** No schema changes happened this sprint.

---

## Section 3: Unchecked Acceptance Criteria

**Question:** Are there behavior specs with `- [ ]` checkboxes for features that are fully implemented and tested?

**If yes:**

1. For each behavior spec in `docs/specs/behaviors/*.md`:
   - Find unchecked `- [ ]` acceptance criteria
   - Check if the spec header says `Status: PASSING` or similar
   - If the feature is implemented and tests pass: check the box (`- [x]`)
   - If the feature is NOT implemented: leave unchecked
2. Cross-reference with test results: `npm run test:integration:[domain]`
3. A spec should not show `PASSING` status with unchecked criteria — that's drift

**Skip if:** No new test passes this sprint.

---

## Output

After running the check, summarize:

```
Doc Health Check — [date]

Terminology: [N terms checked / N docs updated / clean]
Schema: [N changes checked / N docs updated / clean]
Acceptance Criteria: [N specs checked / N boxes checked / clean]
Skipped sections: [list any skipped with reason]
```

Include this summary in the sprint retrospective notes and in `PROJECT_STATUS.md` if any corrections were made.

---

## Related

- **Sprint Agent retrospective step 4:** `docs/agents/contexts/sprint-agent.md` (references this workflow)
- **Close-down step D2:** `docs/workflows/close-down.md` (cross-cutting consistency check at session end)
- **Phase 7 cross-reference audit:** `docs/workflows/feature-development.md` (per-feature audit at completion)
