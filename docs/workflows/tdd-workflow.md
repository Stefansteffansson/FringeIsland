# Test-Driven Development (TDD) Workflow

**Purpose:** Standard procedure for building new features using behavior-first TDD within FringeIsland's BDD framework
**For:** AI assistants and developers building FringeIsland features
**Last Updated:** February 9, 2026

---

## 🎯 TDD Within Our BDD Framework

FringeIsland uses **Behavior-Driven Development (BDD)** where features flow from product vision through to tested code:

```
1. Vision & Intent (docs/VISION.md)
   ↓ WHY FringeIsland exists

2. Product Specification (docs/planning/PRODUCT_SPEC.md)
   ↓ WHAT we're building

3. Roadmap (docs/planning/ROADMAP.md)
   ↓ WHEN we're building it

4. Milestones (in roadmap - e.g., Phase 1.4: Journey System)
   ↓ How we measure progress

5. FEATURES (docs/features/)
   ↓ User-facing functionality (e.g., "Group Management")

6. BEHAVIORS (docs/specs/behaviors/) ← TDD STARTS HERE
   ↓ Rules that govern features (e.g., "B-GRP-001: Last Leader Protection")

7. TESTS (tests/integration/)
   ↓ Verify behaviors work correctly

8. IMPLEMENTATION (app/, components/)
   ↓ Code that makes tests pass
```

**Our TDD Process:** We focus on steps 6-8 (Behaviors → Tests → Implementation). This is proper Test-Driven Development within the larger Behavior-Driven Development framework.

---

## 💡 Why TDD?

**Our Experience:** TDD found 4 critical bugs in existing code during our first testing session (Feb 8, 2026):
1. ✅ Last leader protection trigger wasn't applied to production
2. ✅ RLS disabled on all tables (major security vulnerability!)
3. ✅ Infinite recursion in RLS policies
4. ✅ Membership status constraint missing values ('removed', 'paused')

**Result:** 100% test coverage (29/29 tests passing) and confidence in our code.

**TDD Benefits:**
- **Prevents bugs** - Catch issues before they reach production
- **Documents behavior** - Tests serve as living documentation
- **Enables refactoring** - Change code confidently
- **Improves design** - Forces you to think about API before implementation
- **Faster debugging** - Know exactly what broke when tests fail
- **Validates assumptions** - Tests expose gaps between spec and reality

---

## 🔄 The TDD Cycle (Red-Green-Refactor)

```
1. RED    → Write a failing test
2. GREEN  → Write minimal code to pass
3. REFACTOR → Improve code quality
4. REPEAT → Next behavior
```

**CRITICAL:** Always run tests and see them FAIL first. If a test passes immediately, it might not be testing what you think it is.

---

## 📋 Step-by-Step TDD Workflow

### Phase 0: Ensure Feature Context Exists

**Before writing behaviors, verify:**

1. **Feature is defined** in Product Spec
   - Check: `docs/planning/PRODUCT_SPEC.md` lists this feature
   - Milestone is clear (which phase/sub-phase?)

2. **Feature doc exists** (or create it)
   - Check: `docs/features/implemented/[feature-name].md`
   - If missing, create feature doc first
   - Feature doc describes WHAT users can do
   - Behavior spec describes RULES that govern it

**Example:**
- **Feature:** Group Management ([`docs/features/implemented/group-management.md`](../features/implemented/group-management.md))
- **Behaviors:** B-GRP-001 (Last Leader), B-GRP-002 (Invitations), etc.

---

### Phase 1: Document the Behavior

**File:** `docs/specs/behaviors/[domain].md`

**Template:**
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
- [ ] Criterion 3

**Examples:**

✅ **Valid:**
- Scenario → Expected behavior

❌ **Invalid:**
- Scenario → **BLOCKED** (error message)

**Edge Cases:**
- **Scenario:** Description
  - **Behavior:** What happens
  - **Why:** Reasoning

**Related Behaviors:**
- B-[DOMAIN]-[NUM]: Related behavior

**Testing Priority:** 🔴 CRITICAL / 🟡 HIGH / 🟢 MEDIUM / ⚪ LOW
```

**Real Example:**
```markdown
## B-GRP-001: Last Leader Protection ✅

**Rule:** A group MUST always have at least one member with the Group Leader role.

**Why:** Groups become orphaned without leaders. No one can manage membership,
assign roles, edit settings, or delete the group.

**Verified by:**
- **Test:** `tests/integration/groups/last-leader.test.ts` ✅ **4/4 PASSING**
- **Database:** `supabase/migrations/20260125_6_prevent_last_leader_removal.sql`
- **Trigger:** `prevent_last_leader_removal()` function
- **Feature:** [Group Management](../../features/implemented/group-management.md)

**Acceptance Criteria:**
- [x] Cannot remove last leader via UI (× button disabled/hidden)
- [x] Cannot remove last leader via API (trigger blocks transaction) ✅ **TESTED**
- [x] Cannot delete last leader via direct SQL (trigger blocks) ✅ **TESTED**
- [x] Error message is clear to user
- [x] Can remove leader role if other leaders exist ✅ **TESTED**
```

---

### Phase 2: Write the Test (RED)

**File:** `tests/integration/[domain]/[feature].test.ts`

**Structure:**
```typescript
/**
 * Integration Tests: [Domain] - [Feature]
 *
 * Tests: B-[DOMAIN]-[NUM]: [Behavior Name]
 *
 * [Brief description of what this test suite verifies]
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
    // Setup: Create test data
    testUser1 = await createTestUser({ displayName: 'Test User 1' });
    testUser2 = await createTestUser({ displayName: 'Test User 2' });
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    if (testUser1) await cleanupTestUser(testUser1.user.id);
    if (testUser2) await cleanupTestUser(testUser2.user.id);
  });

  it('should [describe expected behavior - negative case]', async () => {
    // Arrange: Set up test conditions
    const { data: record } = await admin
      .from('table')
      .insert({ /* test data */ })
      .select()
      .single();

    // Act: Perform the action being tested
    const { error } = await admin
      .from('table')
      .delete()
      .eq('id', record!.id);

    // Assert: Verify expected outcome
    expect(error).not.toBeNull();
    expect(error?.message).toContain('expected error text');
  });

  it('should allow [valid scenario - positive case]', async () => {
    // Arrange
    // ... setup

    // Act
    // ... perform action

    // Assert
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

**Naming Conventions:**
- Test files: `[domain]/[feature].test.ts` (e.g., `groups/last-leader.test.ts`)
- Test descriptions: Start with "should" (e.g., "should prevent removing last leader")
- Use `describe()` for behaviors, `it()` for specific scenarios
- Test both negative (should block) and positive (should allow) cases

**Run Tests (Should FAIL):**
```bash
npm test -- tests/integration/[domain]/[feature].test.ts
```

**Expected:** ❌ Tests should FAIL because implementation doesn't exist yet.

**If tests pass immediately:** Something's wrong - the test isn't testing what you think!

---

### Phase 3: Implement the Feature (GREEN)

**Implement in this order:**

#### 1. Database (if needed)

```bash
# Create migration
supabase-cli.bat migration new feature_name

# Edit: supabase/migrations/TIMESTAMP_feature_name.sql
# Add tables, columns, triggers, RLS policies

# Apply to database
supabase-cli.bat db push
```

**Example Migration:**
```sql
-- Add database trigger for business logic
CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- Implementation
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_last_leader_removal
BEFORE DELETE ON user_group_roles
FOR EACH ROW
EXECUTE FUNCTION prevent_last_leader_removal();
```

#### 2. Backend/API Logic
- Supabase queries
- Business logic
- Error handling

#### 3. Frontend Components
- UI components
- Forms
- State management

#### 4. Integration
- Wire up UI to backend
- Add navigation
- Test manually

**Run Tests (Should PASS):**
```bash
npm test -- tests/integration/[domain]/[feature].test.ts
```

**Expected:** ✅ All tests should PASS now.

---

### Phase 4: Refactor (CLEAN)

**With passing tests, refactor confidently:**
- Extract helper functions
- Improve naming
- Reduce duplication
- Optimize performance
- Add comments for complex logic

**Run Tests After Each Change:**
```bash
npm test
```

**If tests fail:** Revert refactoring - tests caught a regression!

---

### Phase 5: Document (VERIFY)

**Update behavior spec:**
```markdown
**Verified by:**
- **Test:** `tests/integration/groups/last-leader.test.ts` ✅ **4/4 PASSING**

**Acceptance Criteria:**
- [x] Criterion 1 ✅ **TESTED**
- [x] Criterion 2 ✅ **TESTED**
```

**Update PROJECT_STATUS.md:**
- Add test count
- Update phase completion percentage
- Document what was built

**Update CLAUDE.md (if patterns changed):**
- Add new patterns
- Update architecture notes
- Document learnings

**Create Feature Doc (if doesn't exist):**
- `docs/features/implemented/[feature-name].md`
- Link behaviors to feature

---

## 📁 File Organization

```
FringeIsland/
├── docs/
│   ├── VISION.md                     # WHY (vision & intent)
│   ├── planning/
│   │   ├── PRODUCT_SPEC.md           # WHAT (features to build)
│   │   └── ROADMAP.md                # WHEN (timeline & milestones)
│   ├── features/                     # User-facing functionality
│   │   ├── implemented/
│   │   │   ├── authentication.md
│   │   │   ├── journey-system.md
│   │   │   └── group-management.md   # (needed)
│   │   ├── in-progress/
│   │   └── planned/
│   └── specs/
│       └── behaviors/                # Rules & constraints
│           ├── authentication.md     # B-AUTH-001, B-AUTH-002, etc.
│           ├── groups.md             # B-GRP-001, B-GRP-002, etc.
│           └── journeys.md           # B-JRNY-001, B-JRNY-002, etc.
├── tests/
│   ├── integration/
│   │   ├── auth/
│   │   │   └── signup.test.ts        # Tests B-AUTH-001
│   │   ├── groups/
│   │   │   ├── last-leader.test.ts   # Tests B-GRP-001
│   │   │   └── invitations.test.ts   # Tests B-GRP-002
│   │   └── rls/
│   │       └── groups.test.ts        # Tests B-GRP-003 (RLS policies)
│   └── helpers/
│       └── supabase.ts               # Test utilities
└── supabase/
    └── migrations/
        └── TIMESTAMP_feature.sql     # Database changes
```

**Domain Codes:**
- `AUTH` - Authentication & Sessions
- `GRP` - Group Management
- `ROL` - Role Management
- `JRNY` - Journey System
- `ENRL` - Journey Enrollments
- `USR` - User Profiles
- `COMM` - Communication (future)

---

## 🛠 Testing Patterns

### Pattern 1: Database Trigger Testing

**Behavior:** Database-level constraints (like last leader protection)

**Test Pattern:**
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

**Example:** `tests/integration/groups/last-leader.test.ts`

---

### Pattern 2: RLS Policy Testing

**Behavior:** Row-level security rules (visibility, permissions)

**Test Pattern:**
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

  // Assert: RLS blocks access
  expect(data).toBeNull();  // No data returned
  expect(error).toBeNull(); // No error, just filtered out
});
```

**Example:** `tests/integration/rls/groups.test.ts`

---

### Pattern 3: Business Logic Testing

**Behavior:** Application-level rules (invitations, workflows)

**Test Pattern:**
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

---

### Pattern 4: Edge Case Testing

**Behavior:** Unusual scenarios, race conditions, boundary conditions

**Test Pattern:**
```typescript
it('should handle edge case: [describe scenario]', async () => {
  // Arrange: Create edge case scenario
  // (e.g., concurrent actions, boundary values, null data)

  // Act: Perform action

  // Assert: Verify graceful handling
  // (no crashes, clear error messages, data integrity maintained)
});
```

---

## 🧪 Test Helpers

**Location:** `tests/helpers/supabase.ts`

**Available Helpers:**
```typescript
// Create test user with auth + profile
const testUser = await createTestUser({
  displayName: 'Test User',
  email: 'custom@test.com' // Optional
});
// Returns: { user: AuthUser, profile: PublicUser }

// Create admin client (bypasses RLS)
const admin = createAdminClient();

// Cleanup test data
await cleanupTestUser(userId);
await cleanupTestGroup(groupId);
```

**When to use admin client:**
- Setup/teardown (creating test data)
- Testing database triggers directly
- Bypassing RLS to verify data state

**When to use user clients:**
- Testing RLS policies
- Testing authorization rules
- Testing user-facing workflows

---

## 🚨 Common Pitfalls

### Pitfall 1: Tests Pass Immediately
**Problem:** Test passes without implementation
**Cause:** Test isn't actually testing what you think
**Solution:** Always see tests FAIL first (RED phase)

### Pitfall 2: Flaky Tests
**Problem:** Tests pass/fail randomly
**Cause:** Test data not cleaned up, race conditions
**Solution:** Use `beforeAll`/`afterAll` for setup/cleanup

### Pitfall 3: Testing Implementation, Not Behavior
**Problem:** Tests break when refactoring
**Cause:** Testing "how" instead of "what"
**Solution:** Test outcomes, not internal steps

**Bad:**
```typescript
// Testing implementation details
expect(component.state.loading).toBe(true);
expect(apiCall).toHaveBeenCalledWith(params);
```

**Good:**
```typescript
// Testing behavior
expect(result.data).toEqual(expectedData);
expect(error?.message).toContain('Cannot remove last leader');
```

### Pitfall 4: Over-Mocking
**Problem:** Tests pass but production fails
**Cause:** Mocked too much, not testing real integrations
**Solution:** Use integration tests with real database (Supabase)

### Pitfall 5: Unclear Test Names
**Problem:** Can't tell what broke when test fails
**Cause:** Vague descriptions like "should work"
**Solution:** Descriptive names: "should prevent removing last leader when only one exists"

### Pitfall 6: Missing Edge Cases
**Problem:** Production bugs despite passing tests
**Cause:** Only tested happy path
**Solution:** Think through edge cases in behavior spec first

**Checklist:**
- ✅ Valid scenarios (happy path)
- ✅ Invalid scenarios (error cases)
- ✅ Edge cases (boundaries, nulls, concurrent actions)
- ✅ Security cases (unauthorized access)

---

## 📊 TDD Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 0. VERIFY FEATURE CONTEXT                                  │
│    docs/planning/PRODUCT_SPEC.md (feature listed?)          │
│    docs/features/[feature].md (exists?)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. DOCUMENT BEHAVIOR                                        │
│    docs/specs/behaviors/[domain].md                         │
│    - Define rule                                            │
│    - Document "why"                                         │
│    - List acceptance criteria                              │
│    - Think through edge cases                              │
│    - Link to feature doc                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. WRITE TEST (RED)                                         │
│    tests/integration/[domain]/[feature].test.ts             │
│    - Write failing test                                     │
│    - Run: npm test (should FAIL ❌)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. IMPLEMENT (GREEN)                                        │
│    - Create database migration (if needed)                  │
│    - Write minimal code to pass test                        │
│    - Run: npm test (should PASS ✅)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. REFACTOR (CLEAN)                                         │
│    - Improve code quality                                   │
│    - Run: npm test after each change                        │
│    - Keep tests passing ✅                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DOCUMENT (VERIFY)                                        │
│    - Mark behavior as verified ✅                           │
│    - Update feature doc (link behaviors)                    │
│    - Update PROJECT_STATUS.md                               │
│    - Update CLAUDE.md if needed                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  NEXT BEHAVIOR │
         └────────────────┘
```

---

## 🎯 TDD for Different Feature Types

### New Database Feature

**Example:** Add journey progress tracking

**Workflow:**
1. Verify feature in Product Spec: "Progress Tracking" is listed
2. Create/update feature doc: `docs/features/implemented/journey-system.md`
3. Document behavior: `docs/specs/behaviors/journeys.md` - B-JRNY-003: Progress Tracking
4. Write test: `tests/integration/journeys/progress.test.ts`
4a. **Run test and CONFIRM FAIL (RED)** — tests MUST fail before any implementation
5. Create migration: `bash supabase-cli.sh migration new add_journey_progress`
6. Add table, RLS policies, triggers
7. Run test (should pass — GREEN)
8. Build UI (test-driven for logic, manual for visual)

---

### New UI Component

**Example:** Add notification dropdown

**Workflow:**
1. Verify feature in Product Spec: "Notifications" is listed
2. Create feature doc: `docs/features/implemented/notifications.md`
3. Document behavior: `docs/specs/behaviors/notifications.md` - B-NOTIF-001: Display Rules
4. Write test: `tests/integration/notifications/display.test.ts`
5. Create component: `components/notifications/NotificationDropdown.tsx`
6. Test logic (state, events, data fetching)
7. Manual test visual appearance

**Note:** We test behavior/logic, not styling. Visual QA is still manual.

---

### Bug Fix

**Example:** Users can see private groups they shouldn't (B-GRP-003)

**Workflow:**
1. **Reproduce bug** - Write failing test that exposes bug
2. Document expected behavior (if not already documented)
3. Fix implementation (RLS policy)
4. Test passes
5. Update behavior spec with "tested" checkmark

**This is what we did for B-GRP-003!**

---

### Refactoring

**Example:** Extract helper function, reorganize files

**Workflow:**
1. **Run tests first** - Ensure all passing before refactor
2. Make refactoring changes
3. **Run tests after each change**
4. If tests fail → Revert, fix, try again
5. Tests should still pass after refactor

---

## 📈 Measuring Success

**Test Coverage Goals:**
- 🔴 **Critical behaviors:** 100% coverage (security, data integrity)
- 🟡 **High-priority behaviors:** 80%+ coverage (business logic)
- 🟢 **Medium-priority behaviors:** 50%+ coverage (nice-to-have)

**Current Status:**
- Total tests: 29
- Passing: 29 (100%)
- Coverage: All critical paths covered

**Track in PROJECT_STATUS.md:**
```markdown
- **Test Coverage:** 29 tests (29 passing, 100%!)
- **Behaviors Documented:** 10 (5 auth, 5 groups)
```

---

## 🔗 Related Documentation

- **Vision & Intent:** [`docs/VISION.md`](../VISION.md) - Why FringeIsland exists
- **Product Spec:** [`docs/planning/PRODUCT_SPEC.md`](../planning/PRODUCT_SPEC.md) - What we're building
- **Roadmap:** [`docs/planning/ROADMAP.md`](../planning/ROADMAP.md) - When we're building it
- **Features:** [`docs/features/implemented/`](../features/implemented/) - User-facing functionality
- **Behaviors:** [`docs/specs/behaviors/`](../specs/behaviors/) - Rules & constraints
- **Boot-up Workflow:** [`docs/workflows/boot-up.md`](boot-up.md) - Start session checklist
- **Close-down Workflow:** [`docs/workflows/close-down.md`](close-down.md) - End session checklist
- **Project Status:** [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md) - Current state
- **Architecture:** [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) - Technical design

---

## 💡 Pro Tips

**1. Start Small**
- Don't write all tests at once
- One behavior at a time
- Build confidence incrementally

**2. Test Behavior, Not Implementation**
- Test "what", not "how"
- Tests should survive refactoring
- Focus on observable outcomes

**3. Red-Green-Refactor is Sacred**
- ALWAYS see tests fail first
- ONLY write code to pass tests
- REFACTOR with confidence

**4. Edge Cases Win**
- Most bugs hide in edge cases
- Think through "what could go wrong?"
- Document edge cases in behavior spec

**5. Integration > Unit (for now)**
- We use integration tests (real database)
- Tests actual behavior end-to-end
- Catches more bugs than unit tests
- Unit tests can come later for performance

**6. Clean Up After Yourself**
- Use `afterAll()` to cleanup test data
- Don't pollute database with test data
- Each test should be independent
- **Safety net:** Jest `globalTeardown` (`tests/global-teardown.ts`) automatically sweeps orphaned test data after every suite run — catches leaks from crashed `afterAll` hooks
- **Manual recovery:** `node scripts/cleanup-test-data.js` purges all orphaned test data (use `--dry-run` to preview)

**7. Descriptive Names Save Time**
- Future you will thank you
- "should prevent X when Y" > "should work"
- Name reveals what's broken when test fails

**8. Document While Fresh**
- Update behavior spec immediately
- Mark acceptance criteria as tested
- Capture learnings in PROJECT_STATUS.md

**9. Link Everything**
- Behaviors link to features
- Tests link to behaviors
- Features link to product spec
- Product spec links to vision

---

## 🚀 Quick Reference

**Starting new feature?**
```bash
# 0. Verify feature context
cat docs/planning/PRODUCT_SPEC.md  # Is feature listed?
cat docs/features/implemented/[feature].md  # Does feature doc exist?

# 1. Document behavior
vim docs/specs/behaviors/[domain].md

# 2. Write test
vim tests/integration/[domain]/[feature].test.ts

# 3. Run test (should fail)
npm test -- tests/integration/[domain]/[feature].test.ts

# 4. Create migration (if needed)
supabase-cli.bat migration new feature_name

# 5. Implement feature
# ... write code ...

# 6. Run test (should pass)
npm test

# 7. Refactor
# ... improve code ...
npm test  # Keep passing!

# 8. Document
vim docs/specs/behaviors/[domain].md  # Mark verified ✅
vim docs/features/implemented/[feature].md  # Link behaviors
vim PROJECT_STATUS.md                  # Update stats
```

**Running tests:**
```bash
# All tests
npm test

# Specific test file
npm test -- tests/integration/groups/last-leader.test.ts

# Watch mode (re-run on changes)
npm test -- --watch

# Coverage report
npm test -- --coverage
```

---

## 📝 Example: Real TDD Session

**Feature:** Last Leader Protection (B-GRP-001)

**Day 1: Document + Test (RED)**
1. Verified feature exists: Group Management (Phase 1.3)
2. Created `docs/specs/behaviors/groups.md`
3. Documented B-GRP-001 rule and acceptance criteria
4. Created `tests/integration/groups/last-leader.test.ts`
5. Wrote 4 test cases
6. Ran tests → ❌ **ALL FAILED** (no trigger exists)

**Day 2: Implement (GREEN)**
1. Created migration: `20260125_6_prevent_last_leader_removal.sql`
2. Wrote database trigger: `prevent_last_leader_removal()`
3. Applied to database: `supabase-cli.bat db push`
4. Ran tests → ✅ **ALL PASSED!**

**Day 3: Discover Production Bug**
1. Realized migration never applied to production
2. Tests exposed the gap!
3. Applied migration
4. Re-ran tests → ✅ **4/4 PASSING**
5. Marked behavior as verified in spec

**Result:** TDD caught a critical production bug that would have caused data integrity issues.

---

## 🎉 Success Criteria

**You're doing TDD right when:**
- ✅ You write tests BEFORE implementation
- ✅ You see tests FAIL before they pass (RED → GREEN)
- ✅ You refactor without fear (tests catch regressions)
- ✅ You find bugs in existing code (tests expose gaps)
- ✅ You understand behavior before coding (documented first)
- ✅ Tests run fast (< 10 seconds for full suite)
- ✅ Tests are reliable (not flaky, not random failures)
- ✅ Code is cleaner (TDD forces better design)
- ✅ Behaviors link to features, features link to product spec

**You're NOT doing TDD when:**
- ❌ Tests written after implementation
- ❌ Tests always pass on first run
- ❌ "Testing" by clicking around UI
- ❌ Skipping edge cases
- ❌ Tests break during refactoring
- ❌ Writing code without failing test first
- ❌ Behaviors exist without feature context

---

**Remember:** TDD is not about testing. It's about **design**. Tests are just a byproduct of thinking through behavior first, which itself flows from features, which flow from product vision.

**The goal:** Build the right thing, the right way, with confidence - and know it connects to our vision.
