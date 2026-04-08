# Session: Testing Infrastructure & Behavior-Driven Development

**Date:** 2026-02-08
**Duration:** ~3 hours
**Version:** 0.2.10
**Focus:** Implementing Option B (Start Clean From Here - TDD + Behavior-First)

---

## 📝 Summary

Today we successfully implemented a complete testing infrastructure and behavior-driven development workflow for FringeIsland. After analyzing the proposed project restructure, we chose Option B: "Start clean from here" - adopting TDD and behavior-first thinking going forward without restructuring existing code.

We accomplished 4 major tasks:
1. Set up Jest + React Testing Library with dual test environments
2. Created a lightweight behavior specification system
3. Documented 10 critical behaviors (authentication + groups)
4. Wrote 15 integration tests - discovered critical production bug!

**Major win:** Proved the value of testing immediately by finding that the last leader protection trigger is not working in production.

---

## ✅ Completed

- [x] Reviewed proposed project structure (heavy behavior-driven approach)
- [x] Chose Option B: Start clean from here (pragmatic approach)
- [x] Removed duplicate AuthContext file (cleanup)
- [x] Installed Jest + React Testing Library (320 packages)
- [x] Configured dual test environments (jsdom for unit, node for integration)
- [x] Added environment variable loading (dotenv)
- [x] Added fetch polyfill (whatwg-fetch)
- [x] Created test helper utilities (Supabase clients, fixtures)
- [x] Created behavior specification template
- [x] Documented 10 critical behaviors
- [x] Wrote 15 integration tests
- [x] Verified Supabase connection with service role key
- [x] Ran tests and found production bug

---

## 🔧 Technical Changes

### Files Created (17)

**Testing Infrastructure:**
- `jest.config.js` - Dual environment configuration
- `tests/setup.ts` - Environment loading + polyfills
- `tests/helpers/supabase.ts` - Test client utilities
- `tests/helpers/fixtures.ts` - Reusable test data
- `tests/setup.test.ts` - Setup verification (4 tests passing)

**Integration Tests:**
- `tests/integration/verify-supabase.test.ts` - Connection tests (3/3 passing)
- `tests/integration/auth/signup.test.ts` - B-AUTH-001 (4/4 passing)
- `tests/integration/groups/last-leader.test.ts` - B-GRP-001 (1/4 passing - bug found!)
- `tests/integration/rls/groups.test.ts` - B-GRP-003 (not run yet)

**Behavior Specifications:**
- `docs/specs/behaviors/_template.md` - Lightweight behavior format
- `docs/specs/behaviors/authentication.md` - 5 auth behaviors
- `docs/specs/behaviors/groups.md` - 5 group behaviors

**Planning Documents:**
- `docs/planning/STRUCTURE_REVIEW.md` - Analysis of current vs. proposed structure
- `docs/planning/STRUCTURE_MIGRATION_PLAN.md` - Migration steps for Option B

**Session Bridge:**
- `docs/planning/sessions/2026-02-08-testing-infrastructure.md` - This file

### Files Modified (5)

- `jest.config.js` - Created with Next.js integration, dual environments
- `package.json` - Added test scripts and dependencies
- `tests/setup.ts` - Added dotenv and fetch polyfill
- `.env.local` - Added SUPABASE_SERVICE_ROLE_KEY
- `components/auth/AuthContext.tsx` - **DELETED** (duplicate removed)

### Dependencies Added

```json
{
  "devDependencies": {
    "@jest/globals": "^30.2.0",
    "jest": "^30.2.0",
    "jest-environment-jsdom": "^30.2.0",
    "jest-environment-node": "^30.2.0",
    "ts-jest": "^29.4.6",
    "@testing-library/react": "^16.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^30.0.0",
    "dotenv": "^17.2.4",
    "whatwg-fetch": "^3.6.20",
    "cross-fetch": "^4.0.0"
  }
}
```

### Test Directory Structure

```
tests/
├── setup.ts                    # Test configuration
├── setup.test.ts               # Setup verification
├── helpers/
│   ├── supabase.ts            # Supabase test clients
│   └── fixtures.ts            # Test data
├── unit/                       # Component tests (jsdom)
│   ├── components/
│   └── lib/
├── integration/                # API + RLS tests (node)
│   ├── verify-supabase.test.ts
│   ├── auth/
│   │   └── signup.test.ts
│   ├── groups/
│   │   └── last-leader.test.ts
│   ├── journeys/
│   └── rls/
│       └── groups.test.ts
└── e2e/                        # End-to-end (future)
```

---

## 💡 Decisions Made

### 1. **Chose Option B: Start Clean From Here**

**Context:** Analyzed proposed heavy behavior-driven structure with BHV-XXX-### IDs, catalog.json, SQLite dev database, etc.

**Decision:** Use lightweight approach instead:
- Simple markdown behavior specs (no BHV-XXX IDs)
- No catalog.json (use PROJECT_STATUS.md)
- No SQLite dev layer (keep Supabase-first)
- Test-driven for new features only

**Rationale:**
- We're 85% through Phase 1 MVP - don't restructure everything
- Lightweight = sustainable for solo/small team
- Proves value quickly (found bug on first run!)
- Can always formalize later if needed

### 2. **Dual Test Environments**

**Decision:** Use `jest-environment-node` for integration tests, `jest-environment-jsdom` for unit tests

**Rationale:**
- Service role key requires Node environment (security)
- Component tests need DOM environment
- Jest projects feature enables both

### 3. **Behavior Specification Format**

**Format:**
```markdown
## B-[DOMAIN]-###: [Behavior Name]

**Rule:** [What must ALWAYS be true]
**Why:** [Business reason]
**Verified by:** [Test, Code, Database]
**Examples:** [Valid/Invalid scenarios]
**Edge Cases:** [Tricky situations]
```

**Rationale:**
- Simple markdown (no special tooling needed)
- Human-readable
- Links to tests and implementation
- Captures "why" not just "what"

### 4. **Test-First for New Features**

**Decision:** Use TDD for journey content delivery (next feature)

**Process:**
1. Write behavior spec
2. Write test (RED)
3. Implement (GREEN)
4. Refactor
5. Document

**Rationale:** Proven value today - tests caught real bug!

---

## ⚠️ Issues Discovered

### CRITICAL: Last Leader Protection Trigger Not Working

**Behavior:** B-GRP-001 - Groups must always have at least one Group Leader

**Expected:** Database trigger `prevent_last_leader_removal()` blocks deletion

**Actual:** Trigger NOT blocking deletions (tests failing)

**Test Results:**
- ✅ Can remove leader when others exist (1/4 passing)
- ❌ Cannot remove last leader (3/4 failing)

**Evidence:**
```typescript
// Test attempts to delete last leader
const { error } = await supabase
  .from('user_group_roles')
  .delete()
  .eq('id', lastLeaderRoleId);

// Expected: error with "last leader" message
// Actual: error is NULL (deletion succeeds!)
```

**Impact:**
- HIGH - Groups can become orphaned (no leaders)
- Data integrity issue
- Users can't manage orphaned groups

**Root Cause:**
Migration file exists: `supabase/migrations/20260125_6_prevent_last_leader_removal.sql`
Trigger defined: `prevent_last_leader_removal()` function
But tests show it's NOT preventing deletion

**Hypothesis:** Migration not applied to production Supabase database

**Next Steps:**
1. Check Supabase dashboard → SQL Editor → Applied migrations
2. If missing, run migration manually
3. Re-run tests to verify fix
4. Update B-GRP-001 behavior spec with test status

---

## 🎯 Next Steps

**Priority order for next session:**

### Immediate (Critical)
- [ ] **Verify/apply last leader trigger migration in Supabase**
- [ ] Re-run last-leader.test.ts to confirm fix
- [ ] Update B-GRP-001 behavior spec with passing status

### Testing
- [ ] Run RLS visibility tests (B-GRP-003) - `groups-rls.test.ts`
- [ ] Add tests for remaining authentication behaviors
- [ ] Add tests for journey enrollment behaviors

### Documentation
- [ ] Create TDD workflow guide (Task #5)
- [ ] Update CLAUDE.md with testing section
- [ ] Update README.md with testing instructions

### Next Feature (Use TDD!)
- [ ] Journey content delivery - BUILD WITH TESTS FIRST
  - Write behavior specs
  - Write tests (RED)
  - Implement (GREEN)
  - Refactor

---

## 📚 Context for Next Session

### What You Need to Know:

**Testing Infrastructure is Ready:**
- `npm test` runs all tests
- `npm test -- <pattern>` runs specific tests
- Service role key in `.env.local` (keep secret!)
- Tests run in Node environment (not browser)

**Behavior Specs Guide Development:**
- Located in `docs/specs/behaviors/`
- Use `_template.md` as starting point
- Keep it simple (no heavy IDs or tracking)
- Link behaviors to tests

**Critical Bug Found:**
- Last leader protection not working
- Must verify migration before building more features
- This proves testing works - keep doing it!

**How to Add Tests:**
1. Document behavior in `docs/specs/behaviors/[domain].md`
2. Create test file in `tests/integration/[domain]/`
3. Write test using helpers in `tests/helpers/`
4. Run with `npm test -- <filename>`
5. Fix implementation until test passes
6. Update behavior spec with test status

### Known Issues:

**Test Cleanup:**
- Tests create data in Supabase
- Service role key enables cleanup
- Some tests might leave data behind (acceptable for now)
- Can manually clean from Supabase dashboard if needed

**Group Roles Not Auto-Created:**
- When creating groups in tests, must manually create group_roles
- Real app creates them (probably from template)
- Tests handle this explicitly

### Useful Docs:

- `docs/specs/behaviors/_template.md` - Copy for new behaviors
- `docs/planning/STRUCTURE_REVIEW.md` - Why we chose this approach
- `tests/helpers/supabase.ts` - Test utility functions
- `jest.config.js` - Test environment configuration

---

## 📊 Test Coverage Summary

| Behavior | Tests | Status | Coverage |
|----------|-------|--------|----------|
| B-AUTH-001: Sign Up Creates Profile | 4 | ✅ PASSING | 100% |
| B-AUTH-002: Sign In Requires Active | 0 | 📝 TODO | 0% |
| B-AUTH-003: Session Persistence | 0 | 📝 TODO | 0% |
| B-AUTH-004: Sign Out Cleanup | 0 | 📝 TODO | 0% |
| B-AUTH-005: Protected Routes | 0 | 📝 TODO | 0% |
| B-GRP-001: Last Leader Protection | 4 | ❌ 1/4 PASSING | 25% (bug) |
| B-GRP-002: Invitation Lifecycle | 0 | 📝 TODO | 0% |
| B-GRP-003: Group Visibility RLS | 7 | 📝 Ready, not run | 0% |
| B-GRP-004: Editing Permissions | 0 | 📝 TODO | 0% |
| B-GRP-005: Deletion Rules | 0 | 🔴 NOT IMPLEMENTED | 0% |

**Total:** 15 tests written, 8 passing (53%)

**Next Target:** Fix B-GRP-001, run B-GRP-003 → 75% coverage on tested behaviors

---

## 🔗 Related

- **Behavior Specs:** `docs/specs/behaviors/authentication.md`, `docs/specs/behaviors/groups.md`
- **Test Helpers:** `tests/helpers/supabase.ts`, `tests/helpers/fixtures.ts`
- **Migration:** `supabase/migrations/20260125_6_prevent_last_leader_removal.sql`
- **Structure Docs:** `docs/planning/STRUCTURE_REVIEW.md`, `docs/planning/STRUCTURE_MIGRATION_PLAN.md`

---

## 💭 Lessons Learned

**Testing is Worth It:**
- Found critical bug on first test run
- Would have gone unnoticed without tests
- Investment paid off immediately

**Behavior-First Clarifies Requirements:**
- Writing "what must be true" forces clear thinking
- Examples and edge cases prevent bugs
- Links implementation to intent

**Keep It Simple:**
- Lightweight markdown specs work fine
- Don't need heavy BHV-XXX-### IDs yet
- Can always formalize later if needed

**Integration Tests Catch Real Issues:**
- Unit tests verify components work in isolation
- Integration tests verify system works as whole
- RLS tests especially important (security!)

**Start Clean From Here Works:**
- Don't need to restructure everything
- Just change how we work going forward
- Tests for new features, gradually add to old

---

**This session proved the value of Option B. Keep testing!** 🚀
