# Feature Development Workflow

**Purpose:** Authoritative end-to-end lifecycle for building new features in FringeIsland
**For:** All agents — this is the canonical ordering that every feature must follow
**Last Updated:** February 28, 2026

---

## Overview

Every new feature follows eight stages (0–7) with **hard STOP gates** between them. No stage may begin until the previous stage's gate is passed. This prevents schema-first design and ensures TDD compliance.

This document is the single source of truth for the development process. It combines the stage structure (what order) with the TDD reference material (how to implement each stage).

**⛔ CRITICAL: Every STOP gate is a USER CHECKPOINT.** The AI must present what was accomplished and ask the user for permission to proceed. These are conversations with the user, not internal AI checkpoints. Never proceed to the next stage without explicit user approval.

| Stage | Name | What it means |
|-------|------|---------------|
| 0 | Feature Context | Confirm the feature is in scope; create/update the feature doc |
| 1 | Behaviors | Write behavior specs — the rules this feature must obey |
| 2 | Write Tests | Write integration tests that verify those behaviors |
| 3 | Run Tests RED | Run the tests — they MUST fail (nothing is built yet) |
| 4 | Design | Design schema, RLS, and data flow to make the tests pass |
| 5 | Implement GREEN | Build it (database + UI + wiring) until all tests pass |
| 6 | Verify | QA — run full suite twice, check security, smoke test |
| 7 | Document | Update PROJECT_STATUS, CHANGELOG, feature docs, behavior specs |

```
Stage 0: Feature Context ──GATE──▶ Stage 1: Behaviors ──GATE──▶ Stage 2: Write Tests
    │                                                                       │
    │                                                                     GATE
    │                                                                       │
    │                                                                       ▼
    │                                                              Stage 3: Run Tests RED
    │                                                              (tests MUST fail)
    │                                                                       │
    ▼                                                                     GATE
                                                                            │
Stage 7: Document ◀──GATE── Stage 6: Verify ◀──GATE── Stage 5: Implement GREEN ◀──GATE── Stage 4: Design
```

### BDD Hierarchy

This workflow sits at the bottom of the BDD hierarchy. Every feature should be traceable upward:

```
Vision (docs/universe/vision/VISION.md)     → WHY we're building this
Product Spec (docs/products/ferd/specification/PRODUCT_SPEC.md) → WHAT we're building
Roadmap (docs/products/ferd/planning/ROADMAP.md)  → WHEN we're building it
Features (docs/products/ferd/development/features/)           → User-facing functionality
Behaviors (docs/products/ferd/development/specs/behaviors/)   → Rules that govern features ← TDD STARTS HERE
Tests (tests/integration/)                   → Verify behaviors work
Implementation (app/, components/)           → Code that passes tests
```

---

## Stage 0: Feature Context

**Owner:** Sprint Agent (or whoever initiates the feature)

**Actions:**
1. Verify feature is listed in `docs/products/ferd/specification/PRODUCT_SPEC.md`
2. Check `docs/products/ferd/planning/DEFERRED.md` — has this been deferred?
3. Create or update feature doc in `docs/products/ferd/development/features/`
4. Identify which milestone/wave this belongs to

**⛔ STOP GATE → Stage 1:**
- [ ] Feature is in scope for the current wave/milestone
- [ ] Feature doc exists with clear description of what users can do
- [ ] **Ask user:** "Stage 0 complete. Feature doc is ready. Shall I proceed to Stage 1 (behavior specs)?"

---

## Stage 1: Behaviors

**Owner:** Test Agent

**Actions:**
1. Read the feature doc from Stage 0
2. Write behavior specs in `docs/products/ferd/development/specs/behaviors/[domain].md`
3. For each behavior, document:
   - Rule (one sentence invariant)
   - Why (business reason)
   - Acceptance criteria
   - Examples (valid + invalid)
   - Edge cases
   - Testing priority (CRITICAL / HIGH / MEDIUM / LOW)

**Behavior Spec Template:**
```markdown
## B-[DOMAIN]-[NUM]: [Behavior Name]

**Rule:** [One sentence describing the invariant/rule]

**Why:** [Business reason - what breaks if this rule is violated?]

**Verified by:**
- **Test:** `tests/integration/[domain]/[test-file].test.ts`
- **Code:** `[implementation file paths]`
- **Database:** `[migration file if applicable]`
- **Feature:** `[link to feature doc]`

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Examples:**

Valid:
- Scenario → Expected behavior

Invalid:
- Scenario → BLOCKED (error message)

**Edge Cases:**
- **Scenario:** Description
  - **Behavior:** What happens
  - **Why:** Reasoning

**Related Behaviors:**
- B-[DOMAIN]-[NUM]: Related behavior

**Testing Priority:** CRITICAL / HIGH / MEDIUM / LOW
```

**⛔ STOP GATE → Stage 2:**
- [ ] All behaviors for this feature are documented with IDs (B-XXX-NNN)
- [ ] Acceptance criteria are specific and testable
- [ ] Edge cases are identified
- [ ] **Ask user:** "Stage 1 complete. Behavior specs written. Shall I proceed to Stage 2 (write failing tests)?"

---

## Stage 2: Write Tests

**Owner:** Test Agent

**Actions:**
1. Write integration tests in `tests/integration/[domain]/[feature].test.ts`
2. Tests should cover all CRITICAL and HIGH behaviors
3. Do NOT run tests yet — that is Stage 3

**Test Structure:**
```typescript
/**
 * Integration Tests: [Domain] - [Feature]
 *
 * Tests: B-[DOMAIN]-[NUM]: [Behavior Name]
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  createAdminClient,
} from '@/tests/helpers/supabase';

describe('B-[DOMAIN]-[NUM]: [Behavior Name]', () => {
  let testUser1: any;
  let testUser2: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    testUser1 = await createTestUser({ displayName: 'Test User 1' });
    testUser2 = await createTestUser({ displayName: 'Test User 2' });
  });

  afterAll(async () => {
    if (testUser1) await cleanupTestUser(testUser1.user.id);
    if (testUser2) await cleanupTestUser(testUser2.user.id);
  });

  it('should [describe expected behavior]', async () => {
    // Arrange: Set up test conditions
    // Act: Perform the action being tested
    // Assert: Verify expected outcome
  });
});
```

**Naming Conventions:**
- Test files: `[domain]/[feature].test.ts` (e.g., `groups/last-leader.test.ts`)
- Test descriptions: Start with "should" (e.g., "should prevent removing last leader")
- Use `describe()` for behaviors, `it()` for specific scenarios
- Test both negative (should block) and positive (should allow) cases

**⛔ STOP GATE → Stage 3:**
- [ ] Integration tests are written for all CRITICAL/HIGH behaviors
- [ ] Test code is syntactically valid
- [ ] **Ask user:** "Stage 2 complete. Tests written. Shall I proceed to Stage 3 (run tests to confirm RED)?"

---

## Stage 3: Run Tests — RED

**Owner:** Test Agent

**Actions:**
1. Run tests: `npm run test:integration:[domain]` (targeted) or `npm run test:integration` (full)
2. **Tests MUST FAIL** — this confirms they're testing something that doesn't exist yet
3. Review each failure message — they should be clear and actionable
4. If any test passes unexpectedly, investigate: the test is wrong or the feature already exists

**⛔ STOP GATE → Stage 4:**
- [ ] Tests have been run
- [ ] Tests FAIL (RED) — if they pass, the test is wrong or the feature already exists
- [ ] Test failure messages are clear and actionable
- [ ] Failure count and summary reported to user
- [ ] **Ask user:** "Stage 3 complete. N tests failing (RED). Shall I proceed to Stage 4 (design)?"

**If tests pass immediately:** STOP. The test is not testing what you think. Fix the test and re-run before proceeding.

---

## Stage 4: Design

**Owner:** Architect Agent

**Actions:**
1. **First: Verify Stage 3 gate is passed** (failing tests exist)
2. Read behavior specs and failing tests to understand requirements
3. Design schema (tables, relationships, constraints, indexes)
4. Design RLS strategy (SELECT, INSERT, UPDATE, DELETE)
5. Design data flow (DB → Supabase queries → State → UI)
6. Document the design with migration plan
7. Verify design addresses all scenarios from the failing tests

**⛔ STOP GATE → Stage 5:**
- [ ] Failing tests from Stage 3 exist (verified, not assumed)
- [ ] Design is documented
- [ ] Schema changes have migration SQL drafted
- [ ] RLS strategy covers all CRUD operations
- [ ] Design addresses all failing test scenarios
- [ ] Affected docs identified — list every existing doc (behavior specs, feature docs, architecture docs, database docs, CLAUDE.md) that this design will invalidate or require updating. Attach this list to the design output for Stage 7.
- [ ] **Ask user:** "Stage 4 complete. Design documented. Shall I proceed to Stage 5 (implement)?"

---

## Stage 5: Implement GREEN

**Owner:** Database Agent, UI Agent, Integration Agent

**Actions:**
1. **Database Agent:** Create and apply migration
   - `bash supabase-cli.sh migration new feature_name`
   - Edit SQL, apply: `node scripts/apply-migration-temp.js <timestamp>_name.sql`
   - Repair: `bash supabase-cli.sh migration repair --status applied <timestamp>`
   - Run tests — some should now pass
2. **UI Agent:** Build components
   - TypeScript interfaces, Tailwind styling
   - Loading/error states
3. **Integration Agent:** Wire data to UI
   - Supabase queries, state management
   - Run tests — all should now pass

**⛔ STOP GATE → Stage 6:**
- [ ] All tests from Stage 3 now PASS (GREEN)
- [ ] No new test failures introduced
- [ ] **Ask user:** "Stage 5 complete. All tests pass (GREEN). Shall I proceed to Stage 6 (verify/QA)?"

---

## Stage 6: Verify

**Owner:** QA/Review Agent + Test Agent

**Actions:**
1. Run full test suite: `npm run test:integration`
2. Run E2E tests if UI changes: `npm run test:e2e`
3. Run tests twice to confirm no flakiness
4. Review code for security (RLS, input validation)
5. Review for pattern consistency
6. Manual smoke test if UI changes are involved

**⛔ STOP GATE → Stage 7:**
- [ ] All tests pass (run twice)
- [ ] No security issues identified
- [ ] Code follows established patterns
- [ ] **Ask user:** "Stage 6 complete. QA verified. Shall I proceed to Stage 7 (document)?"

---

## Stage 7: Document

**Owner:** Sprint Agent (or implementing agent)

**Actions:**
1. Update behavior specs — mark as verified with test links
2. Update `PROJECT_STATUS.md`
3. Update `SPRINT.md` — tick off completed steps, update TDD stage, update "Next Sprint" if priorities shifted
4. Update `CHANGELOG.md` if version bumped
5. Update `CLAUDE.md` if new patterns established
6. Update feature doc with implementation details
7. Cross-reference audit — work through the affected-docs list from Stage 4. For each doc: open it, verify terminology, schema references, RLS rules, acceptance criteria, and role names still match reality. Apply corrections. If no affected-docs list exists (e.g., hotfix), audit behavior specs for the domain, the domain feature doc, and `docs/universe/architecture/ARCHITECTURE_ANATOMY.md` as minimum.
8. Create session bridge if significant work

**Done when:**
- [ ] All documentation is current
- [ ] Cross-reference audit complete — no doc on the affected-docs list has uncorrected drift
- [ ] Feature is traceable upward: `docs/universe/vision/VISION.md` → `docs/products/ferd/specification/PRODUCT_SPEC.md` → `docs/products/ferd/development/features/` → `docs/products/ferd/development/specs/` → `tests/integration/` → `app/` (verified, not assumed)

---

## Quick Reference: Who Does What

| Stage | Agent | Key Output |
|-------|-------|------------|
| 0. Context | Sprint | Feature doc |
| 1. Behaviors | Test | Behavior specs (B-XXX-NNN) |
| 2. Write Tests | Test | Integration test code |
| 3. Run Tests RED | Test | Confirmed failing tests (RED) |
| 4. Design | Architect | Schema + RLS + data flow design |
| 5. Implement GREEN | Database + UI + Integration | Working code, passing tests |
| 6. Verify | QA/Review + Test | Confirmed quality |
| 7. Document | Sprint | Updated docs |

---

## Anti-Patterns (What NOT to Do)

1. **Schema-first design** — Designing tables before behaviors/tests exist. The fix is the hard gate at Stage 4.
2. **Tests last** — Writing tests after implementation. Tests written after code tend to verify the implementation rather than the behavior.
3. **Skipping Stage 2-3** — "We'll add tests later." Later never comes, or the tests are weak.
4. **Skipping the RED step** — Writing tests (Stage 2) but not running them to confirm failure (Stage 3) before designing. If you don't see tests fail, you don't know they're testing anything real.
5. **Design without test evidence** — The Architect Agent must see actual failing tests from Stage 3, not just behavior specs.
6. **Implementing without design** — Jumping from tests to code without a design review leads to ad-hoc schema decisions.

---

## Appendix A: Domain Codes

| Code | Domain | Example Behavior |
|------|--------|-----------------|
| `AUTH` | Authentication & Sessions | B-AUTH-001 |
| `GRP` | Group Management | B-GRP-001 |
| `ROL` | Role Management | B-ROL-001 |
| `JRNY` | Journey System | B-JRNY-001 |
| `ENRL` | Journey Enrollments | B-ENRL-001 |
| `USR` | User Profiles | B-USR-001 |
| `COMM` | Communication | B-COMM-001 |
| `SEC` | Security | B-SEC-001 |
| `RBAC` | Permissions | B-RBAC-001 |
| `ADMIN` | Admin / DeusEx | B-ADMIN-001 |
| `DISP` | Display Name | B-DISP-001 |
| `NOTIF` | Notifications | B-NOTIF-001 |
| `MSG` | Messaging | B-MSG-001 |
| `EXIT` | Platform Exit | B-EXIT-001 |

---

## Appendix B: Testing Patterns

### Pattern 1: Database Trigger Testing

Test database-level constraints (triggers, check constraints):

```typescript
it('should prevent invalid action via database trigger', async () => {
  // Arrange: Create record that would violate rule
  const { data: record } = await admin
    .from('table')
    .insert({ /* ... */ })
    .select()
    .single();

  // Act: Try to perform forbidden action
  const { error } = await admin
    .from('table')
    .delete()
    .eq('id', record!.id);

  // Assert: Trigger blocks action
  expect(error).not.toBeNull();
  expect(error?.message).toContain('specific error text');
});
```

### Pattern 2: RLS Policy Testing

Test row-level security (visibility, permissions):

```typescript
it('should enforce RLS policy for unauthorized access', async () => {
  // Arrange: Create record owned by user1
  const { data: record } = await user1Client
    .from('table')
    .insert({ /* ... */ })
    .select()
    .single();

  // Act: Try to access with user2 (unauthorized)
  const { data, error } = await user2Client
    .from('table')
    .select()
    .eq('id', record!.id)
    .maybeSingle();

  // Assert: RLS blocks access (no data, no error — just filtered out)
  expect(data).toBeNull();
  expect(error).toBeNull();
});
```

### Pattern 3: Business Logic Testing

Test application-level rules (RPCs, workflows):

```typescript
it('should enforce business rule', async () => {
  // Arrange: Set up initial state
  const initialState = await setupTestState();

  // Act: Perform business action
  const result = await performAction(initialState);

  // Assert: Verify correct state transition
  expect(result.status).toBe('expected_status');
  expect(result.data).toMatchObject({ /* expected shape */ });
});
```

### Pattern 4: Edge Case Testing

Test unusual scenarios, boundaries, and error paths:

```typescript
it('should handle edge case: [describe scenario]', async () => {
  // Arrange: Create edge case scenario
  // (concurrent actions, boundary values, null data)

  // Act: Perform action

  // Assert: Verify graceful handling
  // (no crashes, clear error messages, data integrity maintained)
});
```

---

## Appendix C: Test Helpers

**Location:** `tests/helpers/supabase.ts`

```typescript
// Create anon client (respects RLS — use in tests)
const client = createTestClient();

// Create admin client (bypasses RLS — use for setup/teardown only)
const admin = createAdminClient();

// Create test user with auth + profile + personal group
const testUser = await createTestUser({ displayName: 'Test User' });
// Returns: { user: AuthUser, profile: PublicUser, personalGroupId: string }

// Sign in with retry (handles auth rate limits)
await signInWithRetry(client, email, password);

// Generate unique test email
const email = generateTestEmail(); // → timestamp_random@fringeisland.test

// Cleanup
await cleanupTestUser(userId);
await cleanupTestGroup(groupId);
await cleanupTestJourney(journeyId);
await cleanupTestEnrollment(enrollmentId);
```

**When to use admin client:** Setup/teardown, testing triggers directly, verifying data state
**When to use user clients:** Testing RLS, authorization rules, user-facing workflows

**Test data cleanup layers:**
1. `afterAll` hooks per-suite (primary)
2. Jest `globalTeardown` (`tests/global-teardown.ts`) — auto-sweeps orphans
3. `node scripts/cleanup-test-data.js` — manual purge

---

## Appendix D: Common Pitfalls

1. **Tests pass immediately** — Test isn't testing what you think. Always see RED first.
2. **Flaky tests** — Use `beforeAll`/`afterAll` for setup/cleanup. Use `--runInBand`. Use `signInWithRetry` for auth rate limits.
3. **Testing implementation, not behavior** — Test outcomes ("data should be X"), not internals ("function should be called with Y").
4. **Over-mocking** — Use integration tests with real Supabase. Mocks hide real bugs.
5. **Unclear test names** — Use "should prevent X when Y", not "should work".
6. **Missing edge cases** — Check: valid, invalid, edge, and security scenarios.

---

## Appendix E: Test Commands

```bash
# Full integration suite (~8 min)
npm run test:integration

# Stop on first failure (quick regression check)
npm run test:integration:quick

# Domain-specific (faster feedback during dev)
npm run test:integration:auth
npm run test:integration:groups
npm run test:integration:journeys
npm run test:integration:rls
npm run test:integration:rbac
npm run test:integration:admin
npm run test:integration:communication
npm run test:integration:security

# Unit tests
npm run test:unit

# E2E tests (Playwright — requires dev server on localhost:3000)
npm run test:e2e
npm run test:e2e:headed    # visible browser
npm run test:e2e:debug     # debug mode

# Single test file
npx jest tests/integration/[domain]/[feature].test.ts --runInBand --verbose
```

---

## Related Documentation

- **Boot-up workflow:** `docs/products/ferd/development/BOOT_UP.md`
- **Close-down workflow:** `docs/products/ferd/development/CLOSE_DOWN.md`
- **Doc health check:** `docs/products/ferd/development/DOC_HEALTH_CHECK.md`
- **Behavior spec template:** `docs/products/ferd/development/specs/behaviors/_template.md`
- **Agent system:** `docs/products/ferd/development/agents/README.md`
