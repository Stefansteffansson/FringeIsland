# Doc Health Check Workflow

**Purpose:** Periodic audit to catch documentation drift before it accumulates
**Scope:** All active .md files across the three-tier doc structure (universe / products / implementation)
**Trigger:** Run at every sprint retrospective, after cross-cutting changes, or on-demand
**Last Updated:** April 5, 2026

---

## When to Run

| Trigger | Scope |
|---------|-------|
| Sprint retrospective (every sprint) | Full check — all sections below |
| After a cross-cutting rename (role, entity, permission) | Section 1 (Terminology) |
| After schema migration (table, column, RLS) | Section 2 (Schema) |
| After a feature ships and tests pass | Section 3 (Acceptance Criteria) |
| After doc restructuring or file moves | Section 4 (Path References) |
| After requirements or scope change | Section 5 (Cross-Document Consistency) |

---

## Section 1: Terminology Drift

**Question:** Were any role names, entity names, or permission names changed?

**If yes:**

1. List the old > new terms (e.g., `Group Leader > Steward`, `Phase > Wave`)
2. Search for the **old** term across these locations:
   - `docs/old_products/ferd/development/specs/behaviors/*.md` — behavior specs
   - `docs/old_products/ferd/development/features/*.md` — feature docs
   - `docs/old_universe/architecture/*.md` — architecture docs
   - `docs/old_implementation/shared/*.md` — database and schema docs
   - `docs/old_products/ferd/specification/*.md` — product spec and requirements
   - `docs/old_products/ferd/planning/*.md` — roadmap, deferred, research
   - `docs/old_products/ferd/development/agents/contexts/*.md` — agent playbooks
   - `CLAUDE.md`, `PROJECT_STATUS.md`, `SPRINT.md` — root files
3. For each hit: update to the new term, preserving surrounding context
4. Verify no code references use the old name (search `app/`, `components/`, `lib/`)
5. Check Hamn docs too (Wave 3): `docs/old_products/hamn/**/*.md`

**Skip if:** No renames happened this sprint.

---

## Section 2: Schema Drift

**Question:** Were any tables added, columns dropped, RLS policies changed, or migrations applied?

**If yes:**

1. List the schema changes (table/column/policy + what changed)
2. Check these docs for accuracy:
   - `docs/old_implementation/shared/SCHEMA_OVERVIEW.md` — table and column descriptions
   - `docs/old_implementation/shared/RLS_POLICIES.md` — RLS policy listing
   - `docs/old_implementation/shared/DATABASE_CURRENT.md` — full schema reference
   - `docs/old_implementation/shared/AUTH_SYSTEM.md` — auth flow and RLS strategy
3. For each doc: verify the described schema matches the actual database
4. If a doc references a dropped column, removed policy, or renamed table — fix it
5. Check `docs/old_products/ferd/specification/REQUIREMENTS.md` — update completeness percentages if relevant

**Skip if:** No schema changes happened this sprint.

---

## Section 3: Unchecked Acceptance Criteria

**Question:** Are there behavior specs with `- [ ]` checkboxes for features that are fully implemented and tested?

**If yes:**

1. For each behavior spec in `docs/old_products/ferd/development/specs/behaviors/*.md`:
   - Find unchecked `- [ ]` acceptance criteria
   - Check if the linked tests pass: `npm run test:integration:[domain]`
   - If implemented and tests pass: check the box (`- [x]`)
   - If NOT implemented: leave unchecked
2. A spec should not show `PASSING` status with unchecked criteria — that's drift

**Skip if:** No new test passes this sprint.

---

## Section 4: Path and Reference Drift

**Question:** Have any files been moved, renamed, or restructured?

**If yes:**

1. Identify the old path > new path mapping for each moved/renamed file
2. Search ALL active .md files for the old path pattern. Common stale patterns to check:
   - Old `docs/planning/` > new `docs/old_products/ferd/planning/` or `docs/old_products/ferd/specification/`
   - Old `docs/features/` > new `docs/old_products/ferd/development/features/`
   - Old `docs/specs/` > new `docs/old_products/ferd/development/specs/`
   - Old `docs/workflows/` > new `docs/old_products/ferd/development/`
   - Old `docs/agents/` > new `docs/old_products/ferd/development/agents/`
   - Old `docs/architecture/` > new `docs/old_universe/architecture/`
   - Old `docs/database/` > new `docs/old_implementation/shared/`
   - Old `docs/vision/` > new `docs/old_universe/vision/`
   - Any renamed files (e.g., `DEFERRED_DECISIONS.md` > `DEFERRED.md`)
3. **EXCLUDE** files in `_archive/` and `sessions/` directories — those are historical records
4. Fix all stale references in active files
5. Check all INDEX.md files — verify every link resolves to an existing file/directory

**Periodic full scan (even without moves):**
Run a grep for known old path prefixes across all active .md files. If any matches found outside `_archive/` or `sessions/`, they need fixing.

**Skip if:** No files moved or renamed. Still run the periodic full scan at least once per month.

---

## Section 5: Cross-Document Consistency

**Question:** Do key documents agree with each other?

**Check these alignment pairs:**

| Document A | Document B | Must agree on |
|---|---|---|
| `PRODUCT_SPEC.md` | `REQUIREMENTS.md` | Feature scope — every in-scope feature has requirements |
| `REQUIREMENTS.md` | `SPRINT.md` | Planned items appear in sprint plan |
| `REQUIREMENTS.md` | `DEFERRED.md` | Deferred items marked correctly in both |
| `ROADMAP.md` | `PROJECT_STATUS.md` | Wave progress percentages match |
| `CLAUDE.md` | actual file paths | Document map paths are correct |
| `BOOT_UP.md` | actual file paths | File path table is correct |
| Ferd `DEFERRED.md` | Hamn `REQUIREMENTS.md` | Items accepted by Hamn appear as Hamn requirements |
| Hamn `PRODUCT_SPEC.md` | Hamn `REQUIREMENTS.md` | Every theme has requirements |

**Also check:**
- `REQUIREMENTS.md` summary statistics match the actual count of items by status
- No requirement is marked "Done" for a feature that isn't actually implemented
- No requirement is marked "Deferred" for a feature that's now in scope (per PRODUCT_SPEC)

**Skip if:** No scope, status, or priority changes this sprint.

---

## Section 6: Architecture Compliance Spot-Check

**Question:** Does new code follow the architecture anatomy?

**For any features built this sprint:**

1. Check ADR-009 compliance — do new write operations go through API routes?
2. Check permission enforcement — are new gated actions checked in both RLS and frontend?
3. Check layer boundaries — does new code access the correct layers without skipping?
4. Check vertical coverage — do new features have admin, notification, and observability hooks?

**Reference:** `docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md`, `docs/old_products/ferd/specification/REQUIREMENTS.md` (Binding Architecture Rule)

**Skip if:** No code changes this sprint (documentation-only sessions).

---

## Output

After running the check, summarize:

```
Doc Health Check — [date]

1. Terminology: [N terms checked / N docs updated / clean]
2. Schema: [N changes checked / N docs updated / clean]
3. Acceptance Criteria: [N specs checked / N boxes checked / clean]
4. Path References: [N paths checked / N fixes / clean]
5. Cross-Document: [N pairs checked / N mismatches fixed / clean]
6. Architecture: [N features checked / N violations found / clean]
Skipped sections: [list any skipped with reason]
```

Include this summary in the sprint retrospective notes and in `PROJECT_STATUS.md` if any corrections were made.

---

## Three-Tier Doc Structure Reference

All documentation lives in three tiers. When checking paths, use this as a guide:

```
docs/
  universe/          — shared foundations (vision, architecture, strategy, decisions, processes, community, research)
  products/
    ferd/            — Wave 1 web platform (specification, planning, development, sessions)
    hamn/            — Wave 3 full experience (specification, planning, development)
  implementation/
    shared/          — cross-product (schema, RLS, auth, migrations)
    ferd/            — Ferd-specific (baseline, status, changelog, testing)
```

Full navigation: `docs/old_INDEX.md`

---

## Related

- **Sprint Agent retrospective step 4:** `docs/old_products/ferd/development/agents/contexts/sprint-agent.md`
- **Close-down consistency check:** `docs/old_products/ferd/development/CLOSE_DOWN.md`
- **Stage 7 cross-reference audit:** `docs/old_products/ferd/development/WORKFLOW.md` (per-feature audit at completion)
- **Doc structure navigation:** `docs/old_INDEX.md`
