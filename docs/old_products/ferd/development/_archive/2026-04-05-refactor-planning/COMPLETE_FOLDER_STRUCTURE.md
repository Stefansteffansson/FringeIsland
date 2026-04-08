# FringeIsland — Complete Folder Structure
*Three-Tier Documentation Architecture with Hybrid Baseline*
*Every Folder, Every File, Every Purpose*

---

## Overview

This document defines the **complete folder and file structure** for FringeIsland's three-tier documentation architecture.

**KEY ARCHITECTURAL DECISION: Hybrid Baseline Approach**

Since all FringeIsland products (Ferd, Hamn, iOS, Android) share the same backend infrastructure (Supabase, PostgreSQL, Auth), we use a **hybrid baseline model**:

- **`/implementation/shared/`** — Backend infrastructure used by ALL products
- **`/implementation/{product}/baseline/`** — Product-specific frontends and apps

This avoids duplicating database schema 4+ times while keeping product-specific code separate.

**The Three Tiers:**
1. **Universe** — Ecosystem-wide (vision, strategy, worldbuilding)
2. **Products** — Product-specific (specification, architecture, planning)
3. **Implementation** — Execution tracking with hybrid baseline

---

## Root Repository Structure

```
FringeIsland/                      # GitHub repo root
├── src/                           # Application code (Ferd web app)
├── public/                        # Public assets
├── package.json
├── README.md                      # Quick start guide
├── CLAUDE.md                      # Agent context file
├── CHANGELOG.md                   # Version history
└── docs/                          # ALL DOCUMENTATION LIVES HERE
    ├── INDEX.md
    ├── universe/                  # TIER 1
    ├── products/                  # TIER 2
    └── implementation/            # TIER 3 (hybrid baseline)
```

---

## TIER 1: Universe Documentation

**Location:** `/docs/universe/`

**Purpose:** Defines FringeIsland as an ecosystem — independent of any specific product.

**Characteristics:**
- Product-agnostic (applies even if products change)
- Slowly changing (updates in months/years)
- Human-readable first
- Strategic and aspirational

### Complete Structure

```
/docs/universe/
│
├── INDEX.md                                    # Universe docs navigation hub
│
├── vision/                                     # The Why
│   ├── INDEX.md
│   ├── VISION.md                               # North star document
│   ├── MANIFESTO.md                            # Values and principles
│   ├── THREE_QUESTIONS.md                      # Who/What/How framework
│   └── FOUNDING_STORY.md                       # Origin story
│
├── strategy/                                   # The How
│   ├── INDEX.md
│   ├── PRODUCTS_AND_PLATFORM.md                # Product family strategy
│   ├── CONTRIBUTION_ARCHITECTURE.md            # Who builds what
│   ├── GOVERNANCE.md                           # Foundation/Council/Community
│   ├── BUSINESS_MODEL.md                       # Revenue & sustainability
│   ├── PHASES.md                               # Wave 1/2/3+ timeline
│   ├── KICKSTARTER_STRATEGY.md
│   └── ENDOWMENT_PLAN.md
│
├── worldbuilding/                              # The What
│   ├── INDEX.md
│   ├── THREE_REALMS.md                         # Earth, FI, Other Side
│   ├── WHISP_MODEL.md                          # Whisp mechanics
│   ├── SEASONS_AND_EPISODES.md                 # Narrative structure
│   ├── COSMOLOGY.md                            # Three-Dimensional Void
│   ├── CHARACTERS.md
│   ├── LORE.md
│   └── NARRATIVE_FRAMEWORK.md
│
├── brand/                                      # Identity
│   ├── INDEX.md
│   ├── BRAND_IDENTITY.md
│   ├── NAMING_CONVENTIONS.md
│   ├── VISUAL_LANGUAGE.md
│   └── MESSAGING_FRAMEWORK.md
│
├── legal/                                      # IP & Privacy
│   ├── INDEX.md
│   ├── IP_MODEL.md                             # Open source + CC licensing
│   ├── CLA.md
│   ├── TRADEMARK_POLICY.md
│   └── PRIVACY_PRINCIPLES.md
│
└── decisions/                                  # Universe ADRs
    ├── INDEX.md
    ├── TEMPLATE.md
    ├── ADR-U001-no-venture-capital.md
    ├── ADR-U002-open-source-licensing.md
    ├── ADR-U003-kickstarter-as-founding.md
    ├── ADR-U004-three-layer-governance.md
    ├── ADR-U005-marketplace-revenue-model.md
    └── [Additional ADRs]
```

### File Purposes — Universe Tier

| File | Purpose | Audience |
|------|---------|----------|
| `vision/VISION.md` | North star — why FI exists | Everyone |
| `vision/MANIFESTO.md` | Core values (X over Y) | Community, contributors |
| `vision/THREE_QUESTIONS.md` | Who/What/How deep dive | Product designers, creators |
| `strategy/PRODUCTS_AND_PLATFORM.md` | Product family overview | Product managers, devs |
| `strategy/CONTRIBUTION_ARCHITECTURE.md` | Visitor→Member→Dreamineer→Council | Contributors |
| `strategy/GOVERNANCE.md` | Foundation/Council structure | Governance, leadership |
| `strategy/BUSINESS_MODEL.md` | Revenue streams | Founders, investors |
| `worldbuilding/THREE_REALMS.md` | Earth, FI, The Other Side | Narrative designers |
| `worldbuilding/WHISP_MODEL.md` | Whisp mechanics, fidelity | Game designers, creators |
| `brand/BRAND_IDENTITY.md` | Visual identity, tone, voice | Designers, marketers |
| `legal/IP_MODEL.md` | MIT/Apache + CC BY-SA | Contributors, legal |
| `decisions/ADR-U00X-{slug}.md` | Universe-level decisions | Architects, founders |

---

## TIER 2: Product Documentation

**Location:** `/docs/products/{product-name}/`

**Purpose:** Specification, architecture, and planning for individual products.

**Characteristics:**
- Product-specific
- Self-contained
- Technical and detailed
- Planning and execution focused

### Template Structure (Replicated for Each Product)

```
/docs/products/{product-name}/
│
├── INDEX.md                                    # Product overview
│
├── specification/                              # What this product is
│   ├── INDEX.md
│   ├── PRODUCT_SPEC.md                         # Core definition
│   ├── REQUIREMENTS.md                         # FR/NFR with status
│   ├── USER_PERSONAS.md
│   ├── USER_JOURNEYS.md
│   ├── SCOPE.md                                # In/out of scope
│   └── SUCCESS_METRICS.md
│
├── architecture/                               # How it's built
│   ├── INDEX.md
│   ├── ANATOMY.md                              # System structure
│   ├── DECISIONS.md                            # Product ADRs
│   ├── DESIGN_SYSTEM.md
│   ├── TECH_STACK.md
│   └── DEPLOYMENT.md
│
├── planning/                                   # When & what
│   ├── INDEX.md
│   ├── ROADMAP.md
│   ├── CURRENT_PHASE.md
│   ├── BACKLOG.md
│   ├── DEFERRED.md
│   └── RELEASE_NOTES.md
│
├── development/                                # How we develop
│   ├── INDEX.md
│   ├── WORKFLOW.md
│   ├── BDD_APPROACH.md
│   ├── TDD_APPROACH.md
│   ├── CODING_STANDARDS.md
│   └── CONTRIBUTION_GUIDE.md
│
├── sessions/                                   # Planning records
│   ├── INDEX.md
│   ├── 2026-03-15-SESSION-01-journey-designer.md
│   ├── 2026-03-22-SESSION-02-journey-designer.md
│   └── [Dated sessions]
│
└── research/                                   # Product research
    ├── INDEX.md
    ├── user-research/
    └── technical-research/
```

### Products in Ecosystem

```
/docs/products/
│
├── INDEX.md                                    # All products overview
│
├── ferd/                                       # Wave 1: Web platform
│   └── [Full structure above]
│
├── hamn/                                       # Wave 2: Evolved platform
│   └── [Full structure above]
│
├── ios-app/                                    # Wave 2: Native iOS
│   └── [Full structure above]
│
├── android-app/                                # Wave 2: Native Android
│   └── [Full structure above]
│
└── game/                                       # Wave 3+: Immersive
    └── [Full structure above]
```

---

## TIER 3: Implementation Documentation (HYBRID BASELINE)

**Location:** `/docs/implementation/`

**Purpose:** Track current state, status, handover — with hybrid baseline.

### HYBRID BASELINE RATIONALE

**Problem:** All products (Ferd, Hamn, iOS, Android) share the same backend (Supabase, PostgreSQL, Auth). Documenting database schema in each product baseline = 4× duplication.

**Solution:** Split baseline into:
1. **`/shared/`** — Backend infrastructure (database, auth, Supabase)
2. **`/{product}/baseline/`** — Product-specific code (frontends, apps)

### Complete Structure

```
/docs/implementation/
│
├── INDEX.md                                    # Implementation overview
│
├── shared/                                     # ★ SHARED INFRASTRUCTURE ★
│   ├── INDEX.md                                # All products use these
│   ├── DATABASE_CURRENT.md                     # PostgreSQL schema (ALL)
│   ├── SUPABASE_CONFIG.md                      # Supabase setup (ALL)
│   ├── AUTH_SYSTEM.md                          # Authentication (ALL)
│   ├── RLS_POLICIES.md                         # Row Level Security (ALL)
│   ├── STORAGE_BUCKETS.md                      # Supabase Storage (ALL)
│   └── BACKEND_API.md                          # Edge Functions (ALL)
│
├── cross-product/                              # Multi-product views
│   ├── INDEX.md
│   ├── CURRENT_STATE.md                        # Status summary
│   ├── PRIORITIES.md                           # What's active NOW
│   ├── DEPENDENCIES.md                         # Cross-product deps
│   └── TECH_STACK_COMPARISON.md                # Tech comparison table
│
├── ferd/                                       # Ferd tracking
│   ├── INDEX.md
│   │
│   ├── status/                                 # Status tracking
│   │   ├── INDEX.md
│   │   ├── KANBAN.md                           # Visual board
│   │   ├── IN_PROGRESS.md
│   │   ├── COMPLETED.md
│   │   └── BLOCKED.md
│   │
│   ├── baseline/                               # ★ FERD-SPECIFIC CODE ★
│   │   ├── INDEX.md
│   │   ├── BASELINE.md                         # Claude Code generated
│   │   ├── API_ROUTES_CURRENT.md               # Next.js routes
│   │   ├── FRONTEND_CURRENT.md                 # React components
│   │   ├── DEPENDENCIES_CURRENT.md             # package.json
│   │   └── REFERENCES_SHARED.md                # Links to /shared/
│   │
│   ├── handover/                               # Session continuity
│   │   ├── INDEX.md
│   │   ├── NEXT_SESSION_PLAN.md
│   │   ├── CONTEXT_FOR_AGENTS.md
│   │   ├── OPEN_QUESTIONS.md
│   │   └── TECHNICAL_DEBT.md
│   │
│   ├── testing/                                # Test artifacts
│   │   ├── INDEX.md
│   │   ├── bdd-scenarios/
│   │   │   ├── authentication.feature
│   │   │   ├── groups.feature
│   │   │   └── [features]
│   │   └── test-status/
│   │       ├── COVERAGE.md
│   │       └── TEST_RESULTS.md
│   │
│   └── changelog/
│       ├── INDEX.md
│       ├── CHANGELOG.md
│       └── MIGRATION_GUIDES.md
│
├── hamn/                                       # Hamn tracking (future)
│   ├── INDEX.md
│   ├── status/
│   ├── baseline/                               # ★ HAMN-SPECIFIC CODE ★
│   │   ├── BASELINE.md
│   │   ├── API_ROUTES_CURRENT.md
│   │   ├── FRONTEND_CURRENT.md
│   │   └── REFERENCES_SHARED.md                # Links to /shared/
│   ├── handover/
│   ├── testing/
│   └── changelog/
│
├── ios-app/                                    # iOS tracking (future)
│   ├── INDEX.md
│   ├── status/
│   ├── baseline/                               # ★ iOS-SPECIFIC CODE ★
│   │   ├── BASELINE.md
│   │   ├── APP_STRUCTURE_CURRENT.md            # SwiftUI
│   │   ├── DEPENDENCIES_CURRENT.md             # Swift packages
│   │   └── REFERENCES_SHARED.md                # Links to /shared/
│   ├── handover/
│   ├── testing/
│   └── changelog/
│
├── android-app/                                # Android tracking (future)
│   ├── INDEX.md
│   ├── status/
│   ├── baseline/                               # ★ ANDROID-SPECIFIC CODE ★
│   │   ├── BASELINE.md
│   │   ├── APP_STRUCTURE_CURRENT.md            # Kotlin/Compose
│   │   ├── DEPENDENCIES_CURRENT.md             # Gradle
│   │   └── REFERENCES_SHARED.md                # Links to /shared/
│   ├── handover/
│   ├── testing/
│   └── changelog/
│
└── _archive/                                   # Superseded files
    ├── INDEX.md
    └── [Dated archived files]
```

---

## Hybrid Baseline: What Goes Where

### `/implementation/shared/` — Backend Infrastructure

**What belongs here:**
✅ PostgreSQL database schema (tables, relationships)  
✅ Supabase project configuration  
✅ Authentication flows (Supabase Auth)  
✅ Row Level Security policies  
✅ Supabase Storage buckets  
✅ Backend API (Edge Functions)

**Why shared:**
- All products connect to the **same database**
- All products use the **same auth system**
- Database changes affect **all products**
- Avoids 4× duplication

**Generated by:**
- Claude Code analyzing Supabase project
- Manual backend architecture docs

**Example content:**

`DATABASE_CURRENT.md`:
```markdown
# Shared PostgreSQL Schema

**Used by:** Ferd, Hamn, iOS, Android

## users table
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| email | text | UNIQUE |
| full_name | text | NOT NULL |

[Complete schema]
```

### `/implementation/{product}/baseline/` — Product-Specific Code

**What belongs here:**
✅ Frontend code (React for web, SwiftUI for iOS, Compose for Android)  
✅ API routes (Next.js routes for Ferd/Hamn)  
✅ App structure (navigation, screens, state)  
✅ Dependencies (npm, Swift packages, Gradle)

**Why per-product:**
- Ferd = Next.js, iOS = Swift (completely different)
- Each has different build/deploy
- Different teams work on each

**Generated by:**
- Claude Code analyzing product codebase
- Ferd: Next.js analysis
- iOS: Xcode analysis
- Android: Android Studio analysis

**Example content:**

`/ferd/baseline/FRONTEND_CURRENT.md`:
```markdown
# Ferd Frontend

**Tech:** Next.js 16.1, React 19

## Components
- GroupCard.tsx
- JourneyCard.tsx

**Backend:** [Shared Infrastructure](../../shared/INDEX.md)
```

---

## File Naming Conventions

### Documents
- **UPPERCASE.md** — Major (VISION.md, ROADMAP.md)
- **PascalCase.md** — Supporting (UserPersonas.md)
- **INDEX.md** — Every folder (navigation hub)
- **kebab-case.md** — Multi-word supporting

### ADRs
**Format:** `ADR-{SCOPE}{NUMBER}-{slug}.md`

**Scopes:**
- `U` = Universe → `ADR-U001-no-venture-capital.md`
- `F` = Ferd → `ADR-F001-supabase-backend.md`
- `H` = Hamn → `ADR-H001-native-push.md`
- `I` = iOS → `ADR-I001-swiftui.md`
- `A` = Android → `ADR-A001-kotlin.md`

### Sessions
**Format:** `YYYY-MM-DD-SESSION-NN-{topic}.md`

Examples:
- `2026-03-15-SESSION-01-journey-designer.md`
- `2026-03-22-SESSION-02-journey-designer.md`

### BDD Features
**Format:** `{feature-name}.feature`

Examples:
- `authentication.feature`
- `journey-enrollment.feature`

### Archive
**Format:** `YYYY-MM-DD-{original-filename}.md`

Example: `2026-03-01-ROADMAP.md`

---

## Progressive Disclosure Example

### Agent Loading: "Implement Journey Enrollment in Ferd"

**Step 1:** `/docs/products/ferd/INDEX.md` (~500 tokens)  
**Step 2:** `/docs/products/ferd/planning/CURRENT_PHASE.md` (~800 tokens)  
**Step 3:** `/docs/implementation/ferd/handover/NEXT_SESSION_PLAN.md` (~1000 tokens)  
**Step 4:** `/docs/products/ferd/specification/REQUIREMENTS.md#FR-008` (~400 tokens)  
**Step 5:** `/docs/implementation/shared/DATABASE_CURRENT.md` (journeys section) (~400 tokens)  
**Step 6:** `/docs/implementation/ferd/baseline/API_ROUTES_CURRENT.md` (journeys) (~300 tokens)  
**Step 7:** `/docs/products/ferd/architecture/ANATOMY.md#L3` (~600 tokens)  
**Step 8:** `/docs/implementation/ferd/testing/bdd-scenarios/journeys.feature` (~400 tokens)

**Total:** ~4,400 tokens (vs 80,000+)

---

## Summary Statistics

### Folders
- Universe: 6 folders
- Products (each): ~13 folders
- Implementation (hybrid): 13 folders (including /shared/)
- **Total (4 products):** ~70 folders

### Files (when all products exist)
- Universe: ~25 files
- Ferd: ~40 files
- Hamn: ~40 files  
- iOS: ~25 files
- Android: ~25 files
- Shared: ~10 files
- **Total:** ~165 files

### INDEX.md Files
Every folder = ~70 INDEX.md files

---

## Migration Guide

### From "Per-Product Baselines" to "Hybrid"

**If you already implemented per-product baselines:**

1. Create `/docs/implementation/shared/`
2. Move `/ferd/baseline/DATABASE_CURRENT.md` → `/shared/DATABASE_CURRENT.md`
3. Create new files in `/shared/`: AUTH_SYSTEM.md, RLS_POLICIES.md, SUPABASE_CONFIG.md
4. Update `/ferd/baseline/` to remove database content
5. Create `/ferd/baseline/REFERENCES_SHARED.md`
6. Update cross-references

**What stays the same:**
- All Universe/Products tier structure
- Status, handover, testing folders
- File naming conventions

---

## Why Hybrid Works for FringeIsland

✅ **Reflects architecture:** Shared backend, different frontends  
✅ **Avoids duplication:** Database documented once, not 4×  
✅ **Clear ownership:** Backend team → `/shared/`, product teams → `/{product}/`  
✅ **Scales well:** New product = new folder, references `/shared/`  
✅ **Accurate mental model:** Matches reality

---

## Next Steps

1. Review this structure
2. Create example files for `/shared/` and `/{product}/baseline/`
3. Define Ferd's complete requirements
4. Create migration mapping
5. Execute with Claude Code

---

*This hybrid structure is specifically designed for FringeIsland's architecture: multiple products sharing Supabase/PostgreSQL backend with different frontends.*
