# Feature Development Workflow

**Purpose:** Authoritative end-to-end lifecycle for building new features in FringeIsland
**For:** All agents — this is the canonical ordering that every feature must follow
**Last Updated:** February 15, 2026

---

## Overview

Every new feature follows six phases with **hard STOP gates** between them. No phase may begin until the previous phase's gate is passed. This prevents schema-first design and ensures TDD compliance.

**⛔ CRITICAL: Every STOP gate is a USER CHECKPOINT.** The AI must present what was accomplished and ask the user for permission to proceed. These are conversations with the user, not internal AI checkpoints. Never proceed to the next phase without explicit user approval.

```
Phase 0: Feature Context ──GATE──▶ Phase 1: Behaviors ──GATE──▶ Phase 2: Tests RED
    │                                                                    │
    │                                                              GATE (tests MUST fail)
    │                                                                    │
    ▼                                                                    ▼
Phase 6: Document ◀──GATE── Phase 5: Verify ◀──GATE── Phase 4: Implement GREEN ◀──GATE── Phase 3: Design
```

---

## Phase 0: Feature Context

**Owner:** Sprint Agent (or whoever initiates the feature)

**Actions:**
1. Verify feature is listed in `docs/planning/PRODUCT_SPEC.md`
2. Check `docs/planning/DEFERRED_DECISIONS.md` — has this been deferred?
3. Create or update feature doc in `docs/features/`
4. Identify which milestone/phase this belongs to

**⛔ STOP GATE → Phase 1:**
- [ ] Feature is in scope for the current phase
- [ ] Feature doc exists with clear description of what users can do
- [ ] **Ask user:** "Phase 0 complete. Feature doc is ready. Shall I proceed to Phase 1 (behavior specs)?"

---

## Phase 1: Behaviors

**Owner:** Test Agent

**Actions:**
1. Read the feature doc from Phase 0
2. Write behavior specs in `docs/specs/behaviors/[domain].md`
3. For each behavior, document:
   - Rule (one sentence invariant)
   - Why (business reason)
   - Acceptance criteria
   - Examples (valid + invalid)
   - Edge cases
   - Testing priority (CRITICAL / HIGH / MEDIUM / LOW)

**⛔ STOP GATE → Phase 2:**
- [ ] All behaviors for this feature are documented with IDs (B-XXX-NNN)
- [ ] Acceptance criteria are specific and testable
- [ ] Edge cases are identified
- [ ] **Ask user:** "Phase 1 complete. Behavior specs written. Shall I proceed to Phase 2 (write failing tests)?"

---

## Phase 2: Tests RED

**Owner:** Test Agent

**Actions:**
1. Write integration tests in `tests/integration/[domain]/[feature].test.ts`
2. Tests should cover all CRITICAL and HIGH behaviors
3. Run tests: `npm run test:integration`
4. **Tests MUST FAIL** — this confirms they're testing something that doesn't exist yet

**⛔ STOP GATE → Phase 3:**
- [ ] Integration tests are written for all CRITICAL/HIGH behaviors
- [ ] Tests have been run
- [ ] Tests FAIL (RED) — if they pass, the test is wrong or the feature already exists
- [ ] Test failure messages are clear and actionable
- [ ] **Ask user:** "Phase 2 complete. Tests written and failing (RED). Shall I proceed to Phase 3 (design)?"

**If tests pass immediately:** STOP. The test is not testing what you think. Fix the test before proceeding.

---

## Phase 3: Design

**Owner:** Architect Agent

**Actions:**
1. **First: Verify Phase 2 gate is passed** (failing tests exist)
2. Read behavior specs and failing tests to understand requirements
3. Design schema (tables, relationships, constraints, indexes)
4. Design RLS strategy (SELECT, INSERT, UPDATE, DELETE)
5. Design data flow (DB → Supabase queries → State → UI)
6. Document the design with migration plan
7. Verify design addresses all scenarios from the failing tests

**⛔ STOP GATE → Phase 4:**
- [ ] Failing tests from Phase 2 exist (verified, not assumed)
- [ ] Design is documented
- [ ] Schema changes have migration SQL drafted
- [ ] RLS strategy covers all CRUD operations
- [ ] Design addresses all failing test scenarios
- [ ] **Ask user:** "Phase 3 complete. Design documented. Shall I proceed to Phase 4 (implement)?"

---

## Phase 4: Implement GREEN

**Owner:** Database Agent, UI Agent, Integration Agent

**Actions:**
1. **Database Agent:** Create and apply migration
   - `bash supabase-cli.sh migration new feature_name`
   - Edit SQL, apply migration
   - Run tests — some should now pass
2. **UI Agent:** Build components
   - TypeScript interfaces, Tailwind styling
   - Loading/error states
3. **Integration Agent:** Wire data to UI
   - Supabase queries, state management
   - Run tests — all should now pass

**⛔ STOP GATE → Phase 5:**
- [ ] All tests from Phase 2 now PASS (GREEN)
- [ ] No new test failures introduced
- [ ] **Ask user:** "Phase 4 complete. All tests pass (GREEN). Shall I proceed to Phase 5 (verify/QA)?"

---

## Phase 5: Verify

**Owner:** QA/Review Agent + Test Agent

**Actions:**
1. Run full test suite: `npm run test:integration`
2. Run tests twice to confirm no flakiness
3. Review code for security (RLS, input validation)
4. Review for pattern consistency
5. Manual smoke test if UI changes are involved

**⛔ STOP GATE → Phase 6:**
- [ ] All tests pass (run twice)
- [ ] No security issues identified
- [ ] Code follows established patterns
- [ ] **Ask user:** "Phase 5 complete. QA verified. Shall I proceed to Phase 6 (document)?"

---

## Phase 6: Document

**Owner:** Sprint Agent (or implementing agent)

**Actions:**
1. Update behavior specs — mark as verified with test links
2. Update `PROJECT_STATUS.md`
3. Update `CHANGELOG.md` if version bumped
4. Update `CLAUDE.md` if new patterns established
5. Update feature doc with implementation details
6. Create session bridge if significant work

**Done when:**
- [ ] All documentation is current
- [ ] Feature is traceable: Vision → Product Spec → Feature → Behaviors → Tests → Code

---

## Quick Reference: Who Does What

| Phase | Agent | Key Output |
|-------|-------|------------|
| 0. Context | Sprint | Feature doc |
| 1. Behaviors | Test | Behavior specs (B-XXX-NNN) |
| 2. Tests RED | Test | Failing integration tests |
| 3. Design | Architect | Schema + RLS + data flow design |
| 4. Implement GREEN | Database + UI + Integration | Working code, passing tests |
| 5. Verify | QA/Review + Test | Confirmed quality |
| 6. Document | Sprint | Updated docs |

---

## Anti-Patterns (What NOT to Do)

1. **Schema-first design** — Designing tables before behaviors/tests exist. This happened in Phase 1.5-A and 1.5-B. The fix is the hard gate at Phase 3.

2. **Tests last** — Writing tests after implementation. Tests written after code tend to verify the implementation rather than the behavior.

3. **Skipping Phase 2** — "We'll add tests later." Later never comes, or the tests are weak.

4. **Design without test evidence** — The Architect Agent must see actual failing tests, not just behavior specs.

5. **Implementing without design** — Jumping from tests to code without a design review leads to ad-hoc schema decisions.

---

## Related Documentation

- **TDD workflow (detailed):** `docs/workflows/tdd-workflow.md`
- **Boot-up workflow:** `docs/workflows/boot-up.md`
- **Close-down workflow:** `docs/workflows/close-down.md`
- **Behavior spec template:** `docs/specs/behaviors/_template.md`
- **Agent system:** `docs/agents/README.md`
