# FringeIsland Structure Review & Recommendations

**Date:** 2026-02-06
**Purpose:** Prepare for Option B (Start Clean From Here) - TDD + Behavior-First approach
**Status:** Pre-implementation analysis

---

## Current Structure Assessment

### ✅ What's Working Well

1. **App Router Organization** (`/app/`)
   - Feature-based routing (groups, journeys, profile)
   - Clear page hierarchy
   - Dynamic routes properly structured

2. **Component Organization** (`/components/`)
   - Domain-grouped (auth, groups, journeys, profile, ui)
   - Reusable UI components separated
   - Modals co-located with features

3. **Documentation Structure** (`/docs/`)
   - Recently reorganized (v0.2.10)
   - Clear separation: architecture, database, planning, workflows
   - Agent contexts for AI assistance
   - Session bridges for continuity

4. **Database Management** (`/supabase/migrations/`)
   - Sequential migrations with dates
   - Each migration focused on single concern
   - Good naming convention

5. **Library Organization** (`/lib/`)
   - Supabase clients separated (browser vs server)
   - Type definitions starting (journey.ts)
   - Auth context centralized

---

## ⚠️ Issues to Fix

### Issue #1: Duplicate AuthContext (CRITICAL)

**Problem:**
```
./components/auth/AuthContext.tsx (114 lines) - UNUSED
./lib/auth/AuthContext.tsx       (103 lines) - CANONICAL (all imports use this)
```

**Impact:** Confusion, potential drift, maintenance burden

**Solution:** Delete `components/auth/AuthContext.tsx`

**Verification:**
```bash
grep -r "from.*components/auth/AuthContext" . --include="*.tsx" --include="*.ts"
# Should return zero results
```

---

### Issue #2: No Tests (CRITICAL)

**Problem:**
- 18 pages - 0 tests
- 11 components - 0 tests
- 5 lib modules - 0 tests
- 11 migrations - 0 verification
- Complex RLS policies - manual testing only

**Impact:**
- Fragile codebase
- Fear of refactoring
- Bugs hide until production
- Can't verify business rules

**Solution:** Add test infrastructure (Task #1)

---

### Issue #3: No Behavior Specifications (HIGH)

**Problem:**
- Business rules embedded in code without specification
- No single source of "what must always be true"
- Intent scattered across UI, DB triggers, RLS policies

**Examples:**
- Last leader protection (code + trigger + RLS)
- Invitation lifecycle (status transitions)
- Enrollment rules (individual vs group)

**Impact:**
- Hard to understand system guarantees
- Easy to break rules inadvertently
- No verification checklist

**Solution:** Create behavior specs (Task #2, #3)

---

### Issue #4: Type Definitions Scattered (MEDIUM)

**Problem:**
- Only one type file: `lib/types/journey.ts`
- Other types likely inline in components or inferred
- No centralized type definitions

**Impact:**
- Type duplication
- Inconsistent interfaces
- Harder to maintain

**Solution:** Consolidate types (future task)

---

### Issue #5: Navigation.tsx at Root Level (LOW)

**Problem:**
```
components/
├── Navigation.tsx        # Should be in ui/
├── auth/
├── groups/
├── journeys/
├── profile/
└── ui/
    ├── ConfirmModal.tsx
    └── ErrorBoundary.tsx
```

**Impact:** Minor organizational inconsistency

**Solution:** Move to `components/ui/Navigation.tsx` (optional cleanup)

---

## 📋 Recommended Structure Changes

### Phase 1: Essential Changes (This Week)

```
FringeIsland/
├── app/                        # KEEP AS-IS
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx     # ❌ DELETE (duplicate)
│   │   └── AuthForm.tsx        # ✅ KEEP
│   ├── groups/                 # ✅ KEEP
│   ├── journeys/               # ✅ KEEP
│   ├── profile/                # ✅ KEEP
│   ├── ui/                     # ✅ KEEP
│   └── Navigation.tsx          # 🔄 OPTIONALLY move to ui/
│
├── lib/
│   ├── auth/
│   │   └── AuthContext.tsx     # ✅ KEEP (canonical)
│   ├── supabase/               # ✅ KEEP
│   └── types/
│       ├── journey.ts          # ✅ KEEP
│       ├── group.ts            # 📝 ADD (future)
│       ├── user.ts             # 📝 ADD (future)
│       └── index.ts            # 📝 ADD (barrel export)
│
├── tests/                      # 🆕 NEW DIRECTORY
│   ├── setup.ts                # Test configuration
│   ├── helpers/                # Test utilities
│   │   ├── supabase.ts         # Test DB setup
│   │   └── fixtures.ts         # Test data
│   ├── unit/                   # Component/function tests
│   │   ├── components/
│   │   └── lib/
│   ├── integration/            # API + RLS tests (PRIORITY)
│   │   ├── auth/
│   │   ├── groups/
│   │   ├── journeys/
│   │   └── rls/                # RLS policy tests
│   └── e2e/                    # End-to-end (future)
│
├── docs/
│   ├── specs/                  # 🆕 NEW DIRECTORY
│   │   ├── behaviors/          # Behavior specifications
│   │   │   ├── _template.md   # Copy for new features
│   │   │   ├── authentication.md
│   │   │   ├── groups.md
│   │   │   ├── journeys.md
│   │   │   └── invitations.md
│   │   └── features/           # 🔄 MOVE from docs/features/
│   ├── architecture/           # ✅ KEEP
│   ├── database/               # ✅ KEEP
│   ├── implementation/         # ✅ KEEP
│   ├── planning/               # ✅ KEEP
│   ├── agents/                 # ✅ KEEP
│   └── workflows/              # ✅ KEEP
│
├── supabase/                   # ✅ KEEP AS-IS
├── dev_databases/              # ✅ KEEP AS-IS
└── public/                     # ✅ KEEP AS-IS
```

---

## 🎯 Migration Steps (Priority Order)

### Step 1: Clean Up Duplicates
```bash
# Remove duplicate AuthContext
rm components/auth/AuthContext.tsx

# Verify no imports broke
npm run build
```

### Step 2: Add Test Infrastructure
```bash
# Install dependencies
npm install --save-dev @jest/globals jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @supabase/supabase-js@latest
npm install --save-dev @types/jest

# Create test directories
mkdir -p tests/{unit,integration,e2e,helpers}
mkdir -p tests/unit/{components,lib}
mkdir -p tests/integration/{auth,groups,journeys,rls}

# Create test config files
# (jest.config.js, setup.ts, etc.)
```

### Step 3: Add Behavior Specs
```bash
# Create behavior directory
mkdir -p docs/specs/behaviors

# Create template
# (template for future behaviors)

# Document critical existing behaviors
# (reverse-engineer from code)
```

### Step 4: Reorganize Features Docs (Optional)
```bash
# Move feature docs under specs
mv docs/features docs/specs/features
```

### Step 5: Consolidate Types (Future)
```bash
# Create type files as needed
# Export from lib/types/index.ts
```

---

## 📁 New File Locations Guide

### Where Things Go (New Rules)

**Behaviors:**
- Location: `docs/specs/behaviors/[domain].md`
- Examples: `authentication.md`, `groups.md`, `journeys.md`
- Format: See template

**Tests:**
- Unit: `tests/unit/[domain]/[component-or-function].test.ts`
- Integration: `tests/integration/[domain]/[behavior].test.ts`
- RLS: `tests/integration/rls/[table].test.ts`
- E2E: `tests/e2e/[user-flow].test.ts`

**Types:**
- Location: `lib/types/[domain].ts`
- Export: Via `lib/types/index.ts`
- Examples: `user.ts`, `group.ts`, `journey.ts`

**Components:**
- UI primitives: `components/ui/[ComponentName].tsx`
- Feature components: `components/[domain]/[ComponentName].tsx`
- Pages: `app/[route]/page.tsx`

**Documentation:**
- Behaviors: `docs/specs/behaviors/`
- Features: `docs/specs/features/`
- Architecture: `docs/architecture/`
- Workflows: `docs/workflows/`

---

## 🔍 Pre-Migration Checklist

Before making changes, verify:

- [ ] All tests pass (when we add them)
- [ ] Git status clean
- [ ] Branch: main
- [ ] No uncommitted work
- [ ] Backup created (git tag)

After changes:

- [ ] No build errors (`npm run build`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] All imports resolve
- [ ] Dev server starts (`npm run dev`)
- [ ] Key pages load in browser

---

## 📊 Impact Analysis

### Files to Delete: 1
- `components/auth/AuthContext.tsx`

### Directories to Create: 9
- `tests/` (and subdirectories)
- `docs/specs/behaviors/`

### Files to Move: 3-4
- `docs/features/` → `docs/specs/features/`

### Files to Create: 15-20
- Test setup files
- Behavior specification files
- Test files for critical paths

### Total Effort: 4-8 hours
- Cleanup: 30 minutes
- Test setup: 2-4 hours
- Behavior specs: 2-4 hours
- Verification: 1 hour

---

## ✅ Success Criteria

Structure is ready when:

1. **No duplicates**
   - AuthContext exists in one place only
   - No contradictory files

2. **Test infrastructure exists**
   - Jest configured
   - Test directories created
   - First test passes

3. **Behavior specs ready**
   - Template created
   - Critical behaviors documented
   - Clear format established

4. **Build works**
   - No TypeScript errors
   - No broken imports
   - Dev server runs

5. **Documentation updated**
   - CLAUDE.md reflects new structure
   - PROJECT_STATUS.md updated
   - README.md updated

---

## 🚀 Next Actions

Once structure is ready:

1. **Write first test** (prove infrastructure works)
2. **Document first behavior** (prove spec format works)
3. **Build first feature with TDD** (journey content delivery)
4. **Evaluate process** (does it help?)
5. **Iterate** (adjust as needed)

---

**This document will be updated as we make changes.**

