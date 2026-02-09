# Structure Migration Plan - Option B

**Goal:** Prepare FringeIsland for TDD + Behavior-First development
**Approach:** Minimal disruption, maximum benefit
**Timeline:** 1-2 days setup, ongoing improvement

---

## Visual: Before & After

### BEFORE (Current Structure)

```
FringeIsland/
├── app/                    # ✅ Pages - working
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx # ❌ DUPLICATE (unused)
│   │   └── AuthForm.tsx
│   └── [other features]
├── lib/
│   ├── auth/
│   │   └── AuthContext.tsx # ✅ CANONICAL (used everywhere)
│   ├── supabase/
│   └── types/
│       └── journey.ts      # Only 1 type file
├── docs/
│   ├── features/           # Product feature docs
│   ├── architecture/
│   ├── database/
│   └── workflows/
├── supabase/migrations/    # SQL migrations
└── [no tests/]             # ❌ MISSING

PROBLEMS:
❌ Duplicate AuthContext
❌ Zero tests
❌ No behavior specifications
❌ Types scattered
```

### AFTER (Proposed Structure)

```
FringeIsland/
├── app/                    # ✅ UNCHANGED
├── components/             # ✅ Cleaned up
│   ├── auth/
│   │   └── AuthForm.tsx    # (removed duplicate)
│   └── [other features]
├── lib/                    # ✅ Enhanced
│   ├── auth/
│   │   └── AuthContext.tsx # CANONICAL (only one)
│   ├── supabase/
│   └── types/              # Consolidated types
│       ├── journey.ts
│       ├── group.ts        # NEW
│       ├── user.ts         # NEW
│       └── index.ts        # Barrel export
├── tests/                  # 🆕 NEW
│   ├── setup.ts
│   ├── helpers/
│   ├── unit/
│   │   ├── components/
│   │   └── lib/
│   ├── integration/        # PRIORITY (RLS, business logic)
│   │   ├── auth/
│   │   ├── groups/
│   │   ├── journeys/
│   │   └── rls/            # RLS policy tests
│   └── e2e/                # Future
├── docs/
│   ├── specs/              # 🆕 NEW
│   │   ├── behaviors/      # "What must be true"
│   │   │   ├── _template.md
│   │   │   ├── authentication.md
│   │   │   ├── groups.md
│   │   │   └── journeys.md
│   │   └── features/       # (moved from docs/features/)
│   ├── architecture/       # ✅ UNCHANGED
│   ├── database/           # ✅ UNCHANGED
│   └── workflows/          # ✅ UNCHANGED
├── supabase/migrations/    # ✅ UNCHANGED
└── dev_databases/          # ✅ UNCHANGED

IMPROVEMENTS:
✅ No duplicates
✅ Test infrastructure ready
✅ Behavior specifications
✅ Types organized
✅ Clear structure for growth
```

---

## Migration Timeline

### Day 1 Morning: Cleanup & Setup (2-4 hours)

**1. Remove Duplicates (15 min)**
```bash
# Delete duplicate AuthContext
rm components/auth/AuthContext.tsx

# Verify no broken imports
npm run build
```

**2. Install Testing Dependencies (15 min)**
```bash
npm install --save-dev @jest/globals jest ts-jest
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev @types/jest
```

**3. Create Test Directory Structure (10 min)**
```bash
mkdir -p tests/{unit,integration,e2e,helpers}
mkdir -p tests/unit/{components,lib}
mkdir -p tests/integration/{auth,groups,journeys,rls}
```

**4. Configure Jest (30-60 min)**
- Create `jest.config.js`
- Create `tests/setup.ts`
- Create `tests/helpers/supabase.ts` (test DB utilities)
- Write first dummy test to verify setup

**5. Create Behavior Spec Structure (30 min)**
```bash
mkdir -p docs/specs/behaviors
```
- Create `docs/specs/behaviors/_template.md`
- Create example behavior spec

### Day 1 Afternoon: First Tests & Behaviors (2-4 hours)

**6. Document Critical Existing Behaviors (1-2 hours)**
- Authentication flow
- Last leader protection
- Invitation lifecycle
- Enrollment rules

**7. Write First Real Tests (1-2 hours)**
- Auth: Sign up creates profile
- Groups: Cannot remove last leader
- RLS: Users can't see private groups they're not in

**8. Verify Everything Works (30 min)**
```bash
npm test                    # Tests pass
npm run build               # Build works
npm run dev                 # Server starts
```

### Day 2: Polish & Document (2-4 hours)

**9. Update Documentation (1 hour)**
- Update `CLAUDE.md` with new structure
- Update `PROJECT_STATUS.md`
- Update `README.md` with testing instructions

**10. Create Workflow Docs (1 hour)**
- Update `docs/workflows/` with TDD process
- Create "How to add a feature" guide
- Create "How to write behaviors" guide

**11. Type Consolidation (Optional, 1-2 hours)**
- Create `lib/types/group.ts`
- Create `lib/types/user.ts`
- Create `lib/types/index.ts`

---

## Detailed Migration Steps

### Step 1: Remove Duplicate AuthContext ✂️

**Current State:**
```
components/auth/AuthContext.tsx  - 114 lines (unused)
lib/auth/AuthContext.tsx         - 103 lines (canonical)
```

**All imports use:** `@/lib/auth/AuthContext`

**Action:**
```bash
# Backup first
git add -A
git commit -m "chore: Pre-cleanup backup"

# Remove duplicate
rm components/auth/AuthContext.tsx

# Verify
npm run build    # Should succeed
```

**Expected Result:** ✅ One AuthContext, no broken imports

---

### Step 2: Setup Jest Configuration 🧪

**Create `jest.config.js`:**
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**Create `tests/setup.ts`:**
```typescript
import '@testing-library/jest-dom';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));
```

**Update `package.json`:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Verify:**
```bash
npm test -- --version
# Should show Jest version
```

---

### Step 3: Create Test Helpers 🛠️

**Create `tests/helpers/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createTestClient = () => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const cleanupTestData = async (client: any) => {
  // Helper to clean up test data
};
```

**Create `tests/helpers/fixtures.ts`:**
```typescript
export const testUser = {
  email: 'test@example.com',
  password: 'Test123!@#',
  displayName: 'Test User',
};

export const testGroup = {
  name: 'Test Group',
  description: 'A test group',
  is_public: false,
};
```

---

### Step 4: Write First Test 🎯

**Create `tests/integration/auth/signup.test.ts`:**
```typescript
import { createTestClient } from '@/tests/helpers/supabase';
import { testUser } from '@/tests/helpers/fixtures';

describe('Authentication: Sign Up', () => {
  const supabase = createTestClient();

  test('B-AUTH-001: Sign up creates both auth user and profile', async () => {
    // Arrange
    const { email, password, displayName } = testUser;

    // Act
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    // Assert
    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    // Verify profile was created via trigger
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.email).toBe(email);
    expect(profile.full_name).toBe(displayName);

    // Cleanup
    await supabase.auth.admin.deleteUser(authData.user!.id);
  });
});
```

**Run it:**
```bash
npm test -- signup.test.ts
```

**Expected Result:** ✅ Test passes (or fails, showing what to fix)

---

### Step 5: Create Behavior Template 📝

**Create `docs/specs/behaviors/_template.md`:**
```markdown
# [Feature Name] Behaviors

## B-[DOMAIN]-001: [Behavior Name]

**Rule:** [What must ALWAYS be true]

**Why:** [Business reason or user impact]

**Verified by:**
- Test: `tests/[type]/[domain]/[file].test.ts`
- Code: `[implementation location]`
- Database: `[constraints, triggers, RLS policies]`

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Examples:**
- ✅ Valid: [example]
- ❌ Invalid: [example]

**Edge Cases:**
- [Edge case 1]
- [Edge case 2]

**Related Behaviors:**
- B-[DOMAIN]-XXX: [related behavior]

---

## B-[DOMAIN]-002: [Next Behavior]

[Same structure...]
```

---

### Step 6: Document First Behavior 📋

**Create `docs/specs/behaviors/groups.md`:**
```markdown
# Group Management Behaviors

## B-GRP-001: Last Leader Protection

**Rule:** A group MUST always have at least one member with the Group Leader role.

**Why:** Groups become orphaned without leaders. No one could manage membership, assign roles, or delete the group.

**Verified by:**
- Test: `tests/integration/groups/last-leader.test.ts`
- Code: `app/groups/[id]/page.tsx` (UI prevents removal)
- Database: `supabase/migrations/20260125_6_prevent_last_leader_removal.sql`
- Trigger: `prevent_last_leader_removal()` (enforces at DB level)

**Acceptance Criteria:**
- [x] Cannot remove last leader via UI (button disabled)
- [x] Cannot remove last leader via API (trigger blocks)
- [x] Cannot delete last leader via SQL (trigger blocks)
- [x] Error message clear to user
- [x] Can remove leader role if other leaders exist

**Examples:**
- ✅ Valid: Group has 2 leaders, remove 1 leader role → Success
- ❌ Invalid: Group has 1 leader, remove leader role → Error
- ✅ Valid: Group has 1 leader, promote another member first → Success

**Edge Cases:**
- What if user deletes their own account? → Trigger allows (CASCADE delete)
- What if all members leave simultaneously? → Last leader cannot leave
- What if group created without leader? → Creation requires leader (FK)

**Related Behaviors:**
- B-GRP-002: Member removal rules
- B-GRP-003: Group deletion rules

---

## B-GRP-002: Member Invitation Lifecycle

**Rule:** Members can only be ACTIVE if they accepted an invitation or were added by a leader.

**Why:** Prevents unauthorized access to private groups.

**Verified by:**
- Test: `tests/integration/groups/invitations.test.ts`
- Code: `components/groups/InviteMemberModal.tsx`
- Database: RLS policies on `group_memberships`
- Status constraint: CHECK (status IN ('invited', 'active', 'paused', 'removed'))

**Acceptance Criteria:**
- [ ] New members start with status='invited'
- [ ] Users can only see their own invitations
- [ ] Accept invitation changes status to 'active'
- [ ] Decline invitation deletes membership record
- [ ] Leaders can invite multiple members at once

**Examples:**
- ✅ Valid: Leader invites user → status='invited' → user accepts → status='active'
- ❌ Invalid: User directly inserts status='active' → RLS blocks
- ✅ Valid: User declines → membership deleted

**Edge Cases:**
- What if user already member? → Error (unique constraint)
- What if group deleted while invitation pending? → CASCADE delete
- Can user re-invite after decline? → Yes (record deleted)

**Related Behaviors:**
- B-GRP-001: Last leader protection
- B-GRP-003: Group visibility
```

---

### Step 7: Update Package.json Scripts 📦

**Add to `package.json`:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e"
  }
}
```

---

## Verification Checklist ✅

After all migrations:

### Build & Run
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] `npm run dev` starts server
- [ ] All pages load in browser
- [ ] No console errors

### Tests
- [ ] `npm test` runs Jest
- [ ] Example test passes
- [ ] Test coverage report generates
- [ ] Test helpers work

### Structure
- [ ] No duplicate files
- [ ] All imports resolve
- [ ] Test directories exist
- [ ] Behavior docs created

### Documentation
- [ ] CLAUDE.md updated
- [ ] PROJECT_STATUS.md updated
- [ ] README.md has testing section
- [ ] Workflow docs updated

---

## Rollback Plan 🔄

If something breaks:

```bash
# Revert to backup commit
git log --oneline -5
git reset --hard <commit-hash>

# Or restore specific file
git checkout HEAD~1 -- path/to/file
```

---

## Next Steps After Migration

1. **Write critical path tests** (Task #4)
   - Auth flow
   - Last leader protection
   - RLS policies
   - Enrollment rules

2. **Start using TDD for new features** (Task #5)
   - Journey content delivery (next feature)
   - Write behavior spec first
   - Write tests first
   - Implement
   - Verify

3. **Gradually add coverage**
   - Touch old code? Add test
   - Fix bug? Write test first
   - Refactor? Add safety net

4. **Track progress**
   - Update PROJECT_STATUS.md
   - Note test coverage %
   - Document behaviors added

---

**Ready to start?** Let's begin with Step 1: Remove duplicate AuthContext.
