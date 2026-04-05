# FringeIsland — Documentation Architecture Proposal
*A First-Principles Restructuring for a Product Ecosystem*
*Prepared: April 2026*

---

## Executive Summary

This document proposes a complete restructuring of FringeIsland's documentation and project organization — built from first principles for a **product ecosystem**, not a single web application.

**The core insight:** FringeIsland is not one product. It is a universe containing multiple products (Ferd web app, Hamn evolution, iOS app, Android app, physical products, events, marketplace). Current documentation treats the web app as if it were the entirety of FringeIsland, causing drift between vision and implementation, ambiguity about status, and context window problems for AI agents.

**The proposal:** A three-tier hierarchical structure:
1. **Universe tier** — vision, strategy, ecosystem-wide decisions
2. **Product tier** — individual product specifications and planning
3. **Implementation tier** — technical execution, status tracking, handover

This document is informed by industry best practices from: monorepo architectures, Architecture Decision Records (ADR), Behavior-Driven Development (BDD), progressive documentation disclosure, and docs-as-code methodologies.

---

## Table of Contents

1. [The Problem — Current State Analysis](#the-problem--current-state-analysis)
2. [First Principles — What Documentation Must Do](#first-principles--what-documentation-must-do)
3. [The Proposed Structure — Three Tiers](#the-proposed-structure--three-tiers)
4. [Tier 1: Universe Documentation](#tier-1-universe-documentation)
5. [Tier 2: Product Documentation](#tier-2-product-documentation)
6. [Tier 3: Implementation Documentation](#tier-3-implementation-documentation)
7. [Progressive Disclosure — The Index System](#progressive-disclosure--the-index-system)
8. [Status Tracking Integration](#status-tracking-integration)
9. [Agent-Friendly Context Loading](#agent-friendly-context-loading)
10. [Migration Path from Current State](#migration-path-from-current-state)
11. [Folder Structure — Complete Tree](#folder-structure--complete-tree)
12. [File Naming Conventions](#file-naming-conventions)
13. [Best Practices from Industry Research](#best-practices-from-industry-research)
14. [What This Solves](#what-this-solves)

---

## The Problem — Current State Analysis

### What You're Experiencing

**Drift between documentation and implementation:**
- `.md` files describe a vision of FringeIsland
- The web app implements a subset of that vision
- No clear mapping between the two
- Ambiguity about what's implemented vs planned vs deferred

**Documentation fragmentation:**
- Information spread across many files
- Old files remain alongside new files without clear supersession
- No versioning discipline
- No single source of truth for "what is the current state?"

**No status visibility:**
- Hard to see what's done, in progress, planned, or deferred
- No kanban-like view of development status
- Requirements exist but status is invisible

**Context window problems:**
- Large files loaded entirely into agent context
- No progressive disclosure — everything or nothing
- Agents can't load "just what's needed" for a specific session

**Ecosystem vs Product confusion:**
- FringeIsland (the universe) and Ferd (the web app) are conflated
- Documentation doesn't acknowledge multiple products
- No separation of concerns between ecosystem strategy and product execution

### Root Cause

The documentation was structured for a **single product** (a web app) when FringeIsland is actually a **multi-product ecosystem**.

The GitHub repo `FringeIsland` hosts the Ferd web app code — but documentation inside it describes the entire FringeIsland universe. This creates a category error that manifests as drift, ambiguity, and fragmentation.

---

## First Principles — What Documentation Must Do

Before proposing a structure, establish what documentation must accomplish:

### 1. Separate Concerns by Audience
- **Vision/Strategy documents** → For Stefan, future team, investors, community
- **Product specifications** → For product-level planning and decision-making
- **Technical architecture** → For implementation (developers, AI agents)
- **Development tracking** → For knowing what's done/in-progress/planned

### 2. Progressive Disclosure
- **Index files** point to detail files
- **Detail files** point to deep-detail files
- Agents load only what's needed for their session
- Humans can navigate from high-level to specifics

### 3. Single Source of Truth
- One canonical location for each piece of information
- Clear versioning and supersession
- Archived files physically separated from current files

### 4. Status Visibility
- Every requirement/feature has a visible status
- Status integrated into documentation (not external tracker)
- Kanban-like clarity: Planned → In Progress → Done

### 5. Ecosystem vs Product Clarity
- Universe-level concerns separated from product-level concerns
- Each product has its own specification space
- Shared ecosystem decisions propagate to all products

### 6. Agent-Friendly Structure
- File size optimized for context windows (target: <5000 tokens per file)
- References instead of duplication
- Clear entry points for different session types

---

## The Proposed Structure — Three Tiers

```
TIER 1: UNIVERSE
├─ What FringeIsland is (vision, manifesto, values)
├─ Ecosystem strategy (products, contribution model, governance)
└─ Cross-product decisions (brand, IP, business model)

TIER 2: PRODUCTS
├─ Ferd (web app) — specification, architecture, planning
├─ Hamn (evolved platform) — specification, architecture, planning
├─ iOS App — specification, architecture, planning
├─ Android App — specification, architecture, planning
└─ [Future products as they emerge]

TIER 3: IMPLEMENTATION
├─ Current state (what exists now)
├─ Development tracking (status, milestones, releases)
├─ Technical baseline (generated from code)
├─ Session handovers (planning → code → planning)
└─ BDD/TDD artifacts (specs → tests → implementation)
```

**The fundamental principle:** Information flows DOWN (universe informs products, products inform implementation) but never UP (implementation details don't pollute universe vision).

---

## Tier 1: Universe Documentation

**Location:** `/docs/universe/`

**Purpose:** Defines what FringeIsland is as an ecosystem — independent of any specific product implementation.

### Structure

```
/docs/universe/
├── INDEX.md                          # Entry point - what's in universe docs
├── vision/
│   ├── INDEX.md                      # Vision overview
│   ├── VISION.md                     # The north star (current file, enhanced)
│   ├── MANIFESTO.md                  # The values and principles
│   └── THREE_QUESTIONS.md            # Deep dive on Who/What/How framework
├── strategy/
│   ├── INDEX.md                      # Strategy overview
│   ├── PRODUCTS_AND_PLATFORM.md      # Product family (current file, enhanced)
│   ├── CONTRIBUTION_ARCHITECTURE.md  # Who builds what (current file)
│   ├── GOVERNANCE.md                 # Foundation, Council, Community model
│   ├── BUSINESS_MODEL.md             # Revenue streams, sustainability
│   └── PHASES.md                     # Wave 1/2/3+ timeline and dependencies
├── worldbuilding/
│   ├── INDEX.md                      # Worldbuilding overview
│   ├── THREE_REALMS.md               # Earth, FringeIsland, The Other Side
│   ├── WHISP_MODEL.md                # The Whisp, fidelity, void mechanics
│   ├── SEASONS_AND_EPISODES.md       # Narrative structure
│   └── COSMOLOGY.md                  # Three-Dimensional Void, developmental model
└── decisions/
    ├── INDEX.md                      # Universe-level ADRs index
    ├── ADR-U001-no-venture-capital.md
    ├── ADR-U002-open-source-licensing.md
    ├── ADR-U003-kickstarter-as-founding.md
    └── [Universe-level ADRs only]
```

### Key Files

**INDEX.md** — The entry point. Lists what exists in universe docs, with one-line descriptions. Points to other indexes.

**Vision files** — Aspirational, inspirational. What FringeIsland means. Why it exists.

**Strategy files** — How the ecosystem works. Products, governance, business model, phases.

**Worldbuilding files** — The fictional/narrative foundation. Three realms, Whisps, seasons.

**Universe ADRs** — Decisions that apply to the entire ecosystem, not specific to any product. Example: "We will never take venture capital" is a universe decision. "We will use Supabase for backend" is a product decision (belongs in Ferd docs).

### Characteristics
- **Aspirational and strategic**
- **Product-agnostic** (could apply even if Ferd were deleted and rebuilt from scratch)
- **Slowly changing** (updates happen in months/years, not days/weeks)
- **Human-readable first** (written for people, not just agents)

---

## Tier 2: Product Documentation

**Location:** `/docs/products/{product-name}/`

**Purpose:** Specification, architecture, and planning for each individual product in the ecosystem.

### Structure (using Ferd as example)

```
/docs/products/ferd/
├── INDEX.md                          # Ferd product overview
├── specification/
│   ├── INDEX.md                      # Spec overview
│   ├── PRODUCT_SPEC.md               # What Ferd is, what it does
│   ├── REQUIREMENTS.md               # Functional + Non-functional requirements
│   ├── USER_PERSONAS.md              # Who uses Ferd and how
│   └── SCOPE.md                      # What's in scope, what's explicitly out
├── architecture/
│   ├── INDEX.md                      # Architecture overview
│   ├── ANATOMY.md                    # Current ARCHITECTURE_ANATOMY.md (enhanced)
│   ├── DECISIONS.md                  # Current ARCHITECTURE_DECISIONS.md (product ADRs)
│   ├── DATABASE_SCHEMA.md            # Database structure with rationale
│   ├── API_CONTRACT.md               # Platform API ring specification
│   ├── AUTHORIZATION_MODEL.md        # RLS, permissions, has_permission()
│   └── DESIGN_SYSTEM.md              # Visual language, components, patterns
├── planning/
│   ├── INDEX.md                      # Planning overview
│   ├── ROADMAP.md                    # Phases, milestones, releases
│   ├── CURRENT_PHASE.md              # What we're building RIGHT NOW
│   ├── BACKLOG.md                    # Planned features not yet started
│   └── DEFERRED.md                   # Explicitly deferred decisions/features
├── development/
│   ├── INDEX.md                      # Development practices overview
│   ├── BDD_SCENARIOS.md              # Behavior specs (Given-When-Then)
│   ├── TDD_APPROACH.md               # How TDD is practiced in Ferd
│   └── WORKFLOW.md                   # Vision → Spec → BDD → TDD → Baseline
└── sessions/
    ├── INDEX.md                      # Planning session record index
    ├── 2026-03-15-SESSION-01-journey-designer.md
    ├── 2026-03-22-SESSION-02-journey-designer.md
    └── [Session records with consistent naming]
```

### Replicated for Each Product

```
/docs/products/
├── ferd/          # Web app (Wave 1)
├── hamn/          # Evolved platform (Wave 2)
├── ios-app/       # Native iOS (Wave 2)
├── android-app/   # Native Android (Wave 2)
└── [future products as they emerge]
```

### Key Principles

**Product ADRs live with the product** — "Use Supabase for backend" is a Ferd decision, not a universe decision. If iOS app uses a different backend, that's its own ADR in its own docs.

**Cross-product patterns reference universe** — If multiple products share a pattern (e.g., "all products use Three Questions framework"), that belongs in universe docs. Products reference it.

**Each product is self-contained** — Should be possible to understand Ferd entirely from `/docs/products/ferd/` without reading other product docs.

---

## Tier 3: Implementation Documentation

**Location:** `/docs/implementation/`

**Purpose:** Track current state, development status, and provide handover between sessions.

### Structure

```
/docs/implementation/
├── INDEX.md                          # Implementation overview
├── status/
│   ├── INDEX.md                      # Status tracking overview
│   ├── CURRENT_STATE.md              # What exists RIGHT NOW (auto-updated)
│   ├── IN_PROGRESS.md                # Currently being built
│   ├── COMPLETED.md                  # Done (with completion dates)
│   └── KANBAN.md                     # Visual kanban view (Planned/Progress/Done)
├── baseline/
│   ├── INDEX.md                      # Baseline overview
│   ├── BASELINE.md                   # Current ARCHITECTURE_BASELINE.md (Claude Code generated)
│   ├── DATABASE_CURRENT.md           # Actual current schema (generated)
│   ├── API_CURRENT.md                # Actual current API routes (generated)
│   └── COMPONENTS_CURRENT.md         # Actual current React components (generated)
├── handover/
│   ├── INDEX.md                      # Handover docs overview
│   ├── NEXT_SESSION_PLAN.md          # What to work on next (bridge doc)
│   ├── CONTEXT_FOR_AGENTS.md         # Quick context for new sessions
│   └── OPEN_QUESTIONS.md             # Unresolved decisions needing attention
├── testing/
│   ├── INDEX.md                      # Testing overview
│   ├── bdd-scenarios/                # Gherkin feature files
│   │   ├── authentication.feature
│   │   ├── groups.feature
│   │   └── [feature files]
│   └── test-status/
│       └── TEST_COVERAGE.md          # What's tested, what's not
└── changelog/
    ├── INDEX.md                      # Changelog overview
    ├── CHANGELOG.md                  # Version history (root copy reference)
    └── MIGRATION_GUIDES.md           # Breaking changes and how to migrate
```

### Key Files

**CURRENT_STATE.md** — Auto-generated or manually maintained. Answers "what exists right now?" Maps requirements to implementation status.

**KANBAN.md** — Visual representation of development board:
```markdown
## Planned
- [ ] Feature X
- [ ] Feature Y

## In Progress
- [→] Feature Z (started 2026-04-01, Stefan)

## Done
- [✓] Feature A (completed 2026-03-15)
- [✓] Feature B (completed 2026-03-20)
```

**BASELINE.md** — Claude Code generated. Technical snapshot of actual code. Never hand-written.

**NEXT_SESSION_PLAN.md** — Bridge document. Prepared at end of each session. Loads at start of next session.

---

## Progressive Disclosure — The Index System

### The Pattern

Every folder has an `INDEX.md` that serves as:
1. **Table of contents** for that folder
2. **Navigation hub** to child folders
3. **Context setter** — what this section contains

### Example: `/docs/products/ferd/INDEX.md`

```markdown
# Ferd — Web Platform Documentation

Ferd is the Wave 1 web platform for FringeIsland — the departure point where the journey begins.

## What's in This Section

### Specification
Defines what Ferd is, who it serves, and what it must do.
- [PRODUCT_SPEC.md](./specification/PRODUCT_SPEC.md) — Core product definition
- [REQUIREMENTS.md](./specification/REQUIREMENTS.md) — Functional & non-functional requirements
- [More →](./specification/INDEX.md)

### Architecture
Defines how Ferd is built and why.
- [ANATOMY.md](./architecture/ANATOMY.md) — Layered architecture model
- [DECISIONS.md](./architecture/DECISIONS.md) — Architecture Decision Records
- [More →](./architecture/INDEX.md)

### Planning
Tracks what's being built and when.
- [ROADMAP.md](./planning/ROADMAP.md) — Phases and milestones
- [CURRENT_PHASE.md](./planning/CURRENT_PHASE.md) — Active development focus
- [More →](./planning/INDEX.md)

### Development
How Ferd is developed (BDD/TDD workflow).
- [BDD_SCENARIOS.md](./development/BDD_SCENARIOS.md) — Behavior specifications
- [More →](./development/INDEX.md)

### Sessions
Planning session records.
- [More →](./sessions/INDEX.md)

## Quick Links
- [Current State →](/docs/implementation/status/CURRENT_STATE.md)
- [Universe Vision →](/docs/universe/vision/VISION.md)
- [Ferd Roadmap →](./planning/ROADMAP.md)
```

### Agent Loading Pattern

An agent starting a session would:
1. Load `/docs/products/ferd/INDEX.md` (overview)
2. Load `/docs/products/ferd/planning/CURRENT_PHASE.md` (what we're building now)
3. Load `/docs/implementation/handover/NEXT_SESSION_PLAN.md` (what to do this session)
4. Load specific detail files only as needed

**Total tokens:** ~3,000–5,000 instead of 50,000+

---

## Status Tracking Integration

### The Challenge
You need kanban-like visibility without external tools. Status must be integrated into documentation.

### The Solution: Status Metadata in Requirements

**In `/docs/products/ferd/specification/REQUIREMENTS.md`:**

```markdown
# Ferd — Requirements

## Functional Requirements

### FR-001: User Authentication
**Status:** ✅ Done (v0.2.0)  
**Owner:** Stefan  
**Completed:** 2026-02-15

Users must be able to...

---

### FR-002: Journey Enrollment
**Status:** 🔄 In Progress (v0.3.0)  
**Owner:** Stefan  
**Started:** 2026-03-20  
**Target:** 2026-04-15

Users must be able to...

---

### FR-003: AI Mentor Integration
**Status:** 📋 Planned (v0.5.0)  
**Owner:** TBD  
**Dependencies:** FR-002, FR-008

Users must be able to...

---

### FR-004: Social Login
**Status:** ⏸️ Deferred  
**Reason:** See ADR-042

Users must be able to...
```

### Status Symbols
- ✅ **Done** — Implemented, tested, shipped
- 🔄 **In Progress** — Currently being built
- 📋 **Planned** — In backlog, not yet started
- ⏸️ **Deferred** — Deliberately postponed (with ADR reference)
- ❌ **Rejected** — Decided not to implement (with ADR reference)

### Automated Status Board

**In `/docs/implementation/status/KANBAN.md`** (can be auto-generated from requirements):

```markdown
# Development Status Board

Last updated: 2026-04-04

## 🔄 In Progress (3)
- FR-002: Journey Enrollment (started 2026-03-20)
- FR-007: Group Forums (started 2026-03-28)
- NFR-003: Mobile Responsiveness (started 2026-04-01)

## 📋 Planned — This Phase (5)
- FR-008: Journey Progress Tracking
- FR-009: Profile Data Collection
- FR-010: Member Invitations
- NFR-004: Page Load Performance
- NFR-005: Accessibility (WCAG 2.1 AA)

## ✅ Recently Completed (Last 30 Days)
- FR-001: User Authentication (2026-03-15)
- FR-005: Group Creation (2026-03-18)
- FR-006: Role Management (2026-03-22)

## 📊 Summary
- Total Requirements: 47
- Done: 23 (49%)
- In Progress: 3 (6%)
- Planned: 15 (32%)
- Deferred: 6 (13%)
```

### BDD Scenario Status

**In `/docs/implementation/testing/bdd-scenarios/authentication.feature`:**

```gherkin
# Status: ✅ All scenarios passing
# Last run: 2026-04-04
# Coverage: 100%

Feature: User Authentication
  As a visitor to FringeIsland
  I want to create an account
  So that I can access member features

  Scenario: Successful registration
    Given I am on the registration page
    When I enter valid credentials
    Then I should be logged in
    And I should see my profile page
```

---

## Agent-Friendly Context Loading

### Problem
Current: Large files (30-50KB) loaded entirely. Wastes tokens. Slows sessions.

### Solution: Hierarchical Loading + References

#### Example Session: "Implement Journey Enrollment"

**Step 1: Load Context (Agent Start)**
```
1. /docs/products/ferd/INDEX.md                     (~500 tokens)
2. /docs/products/ferd/planning/CURRENT_PHASE.md    (~800 tokens)
3. /docs/implementation/handover/NEXT_SESSION_PLAN.md (~1000 tokens)
TOTAL: ~2300 tokens
```

**Step 2: Load Specific Requirements**
```
4. /docs/products/ferd/specification/REQUIREMENTS.md  
   → Only FR-002 section                            (~400 tokens)
5. /docs/products/ferd/architecture/ANATOMY.md
   → Only L3 Experience Engine section              (~600 tokens)
TOTAL ADDED: ~1000 tokens
RUNNING TOTAL: ~3300 tokens
```

**Step 3: Load Architecture Decisions (If Needed)**
```
6. /docs/products/ferd/architecture/DECISIONS.md
   → Only ADR-008 (Step type extensibility)         (~300 tokens)
TOTAL ADDED: ~300 tokens
RUNNING TOTAL: ~3600 tokens
```

**Step 4: Load BDD Scenarios**
```
7. /docs/implementation/testing/bdd-scenarios/journeys.feature
   → Enrollment scenarios only                      (~400 tokens)
TOTAL ADDED: ~400 tokens
RUNNING TOTAL: ~4000 tokens
```

**Step 5: Load Current Baseline (Selective)**
```
8. /docs/implementation/baseline/DATABASE_CURRENT.md
   → Only journey-related tables                    (~600 tokens)
TOTAL ADDED: ~600 tokens
RUNNING TOTAL: ~4600 tokens
```

**Result:** Agent has everything needed for this session in ~4600 tokens instead of loading 3 massive files totaling 80,000 tokens.

### Reference Pattern

Instead of duplicating information, files reference each other:

```markdown
## Journey Enrollment Requirements

See [FR-002 in REQUIREMENTS.md](../specification/REQUIREMENTS.md#FR-002)

**Architecture:** See [L3 Experience Engine](../architecture/ANATOMY.md#L3-experience-engine)

**Status:** See [KANBAN.md](/docs/implementation/status/KANBAN.md)

**BDD Scenarios:** See [journeys.feature](/docs/implementation/testing/bdd-scenarios/journeys.feature)
```

---

## Migration Path from Current State

### Phase 1: Create New Structure (No Content Move)
1. Create folder structure `/docs/universe/`, `/docs/products/`, `/docs/implementation/`
2. Create all INDEX.md files (navigation only)
3. **Don't move files yet**

### Phase 2: Move Universe-Level Docs
1. Move VISION.md → `/docs/universe/vision/VISION.md`
2. Move PRODUCTS_AND_PLATFORM.md → `/docs/universe/strategy/PRODUCTS_AND_PLATFORM.md`
3. Move CONTRIBUTION_ARCHITECTURE.md → `/docs/universe/strategy/CONTRIBUTION_ARCHITECTURE.md`
4. Create new universe-level ADRs in `/docs/universe/decisions/`

### Phase 3: Create Ferd Product Docs
1. Create `/docs/products/ferd/INDEX.md`
2. Move ARCHITECTURE_ANATOMY.md → `/docs/products/ferd/architecture/ANATOMY.md`
3. Split ARCHITECTURE_DECISIONS.md:
   - Product ADRs → `/docs/products/ferd/architecture/DECISIONS.md`
   - Universe ADRs → `/docs/universe/decisions/ADR-U00X.md`
4. Create PRODUCT_SPEC.md for Ferd
5. Create REQUIREMENTS.md from current ROADMAP.md + features

### Phase 4: Create Implementation Tracking
1. Create `/docs/implementation/status/CURRENT_STATE.md`
2. Create `/docs/implementation/status/KANBAN.md`
3. Add status metadata to all requirements
4. Move ARCHITECTURE_BASELINE.md → `/docs/implementation/baseline/BASELINE.md`

### Phase 5: Archive Old Files
1. Create `/docs/_archive/` folder
2. Move superseded files to archive with date suffix
3. Update README.md to point to new structure

### Phase 6: Update Root Documentation
1. Update README.md to explain new structure
2. Update CLAUDE.md with new paths
3. Create ROOT_INDEX.md as top-level entry point

---

## Folder Structure — Complete Tree

```
FringeIsland/                          # GitHub repo root
├── README.md                          # Quick start, points to docs structure
├── CLAUDE.md                          # Agent context (updated paths)
├── CHANGELOG.md                       # Version history
├── package.json
├── src/                               # Application code
├── public/
└── docs/
    ├── INDEX.md                       # Root documentation index
    ├── universe/                      # TIER 1: Ecosystem
    │   ├── INDEX.md
    │   ├── vision/
    │   │   ├── INDEX.md
    │   │   ├── VISION.md
    │   │   ├── MANIFESTO.md
    │   │   └── THREE_QUESTIONS.md
    │   ├── strategy/
    │   │   ├── INDEX.md
    │   │   ├── PRODUCTS_AND_PLATFORM.md
    │   │   ├── CONTRIBUTION_ARCHITECTURE.md
    │   │   ├── GOVERNANCE.md
    │   │   ├── BUSINESS_MODEL.md
    │   │   └── PHASES.md
    │   ├── worldbuilding/
    │   │   ├── INDEX.md
    │   │   ├── THREE_REALMS.md
    │   │   ├── WHISP_MODEL.md
    │   │   ├── SEASONS_AND_EPISODES.md
    │   │   └── COSMOLOGY.md
    │   └── decisions/
    │       ├── INDEX.md
    │       ├── ADR-U001-no-venture-capital.md
    │       ├── ADR-U002-open-source-licensing.md
    │       └── [universe ADRs]
    ├── products/                      # TIER 2: Individual Products
    │   ├── INDEX.md
    │   ├── ferd/                      # Wave 1 web app
    │   │   ├── INDEX.md
    │   │   ├── specification/
    │   │   │   ├── INDEX.md
    │   │   │   ├── PRODUCT_SPEC.md
    │   │   │   ├── REQUIREMENTS.md
    │   │   │   ├── USER_PERSONAS.md
    │   │   │   └── SCOPE.md
    │   │   ├── architecture/
    │   │   │   ├── INDEX.md
    │   │   │   ├── ANATOMY.md
    │   │   │   ├── DECISIONS.md
    │   │   │   ├── DATABASE_SCHEMA.md
    │   │   │   ├── API_CONTRACT.md
    │   │   │   ├── AUTHORIZATION_MODEL.md
    │   │   │   └── DESIGN_SYSTEM.md
    │   │   ├── planning/
    │   │   │   ├── INDEX.md
    │   │   │   ├── ROADMAP.md
    │   │   │   ├── CURRENT_PHASE.md
    │   │   │   ├── BACKLOG.md
    │   │   │   └── DEFERRED.md
    │   │   ├── development/
    │   │   │   ├── INDEX.md
    │   │   │   ├── BDD_SCENARIOS.md
    │   │   │   ├── TDD_APPROACH.md
    │   │   │   └── WORKFLOW.md
    │   │   └── sessions/
    │   │       ├── INDEX.md
    │   │       └── [dated session records]
    │   ├── hamn/                      # Wave 2 evolved platform
    │   │   ├── INDEX.md
    │   │   └── [same structure as ferd]
    │   ├── ios-app/                   # iOS native app
    │   │   ├── INDEX.md
    │   │   └── [same structure]
    │   └── android-app/               # Android native app
    │       ├── INDEX.md
    │       └── [same structure]
    └── implementation/                # TIER 3: Execution & Status
        ├── INDEX.md
        ├── status/
        │   ├── INDEX.md
        │   ├── CURRENT_STATE.md
        │   ├── IN_PROGRESS.md
        │   ├── COMPLETED.md
        │   └── KANBAN.md
        ├── baseline/
        │   ├── INDEX.md
        │   ├── BASELINE.md           # Claude Code generated
        │   ├── DATABASE_CURRENT.md   # Generated
        │   ├── API_CURRENT.md        # Generated
        │   └── COMPONENTS_CURRENT.md # Generated
        ├── handover/
        │   ├── INDEX.md
        │   ├── NEXT_SESSION_PLAN.md
        │   ├── CONTEXT_FOR_AGENTS.md
        │   └── OPEN_QUESTIONS.md
        ├── testing/
        │   ├── INDEX.md
        │   ├── bdd-scenarios/
        │   │   ├── authentication.feature
        │   │   ├── groups.feature
        │   │   ├── journeys.feature
        │   │   └── [feature files]
        │   └── test-status/
        │       └── TEST_COVERAGE.md
        ├── changelog/
        │   ├── INDEX.md
        │   └── MIGRATION_GUIDES.md
        └── _archive/
            └── [superseded files with date suffix]
```

---

## File Naming Conventions

### Documents
- **UPPERCASE.md** — Major documents (VISION.md, ROADMAP.md, REQUIREMENTS.md)
- **PascalCase.md** — Supporting documents (UserPersonas.md, DesignSystem.md)
- **INDEX.md** — Always uppercase, every folder has one

### ADRs
- **Format:** `ADR-{SCOPE}{NUMBER}-{slug}.md`
- **Scopes:**
  - `U` = Universe (ADR-U001-no-venture-capital.md)
  - `F` = Ferd product (ADR-F001-supabase-backend.md)
  - `H` = Hamn product (ADR-H001-native-push.md)
  - `I` = iOS app (ADR-I001-swiftui.md)
- **Numbers:** Zero-padded 3 digits (001, 002, etc.)
- **Slug:** Kebab-case short description

### Sessions
- **Format:** `YYYY-MM-DD-SESSION-NN-{topic}.md`
- **Example:** `2026-03-15-SESSION-01-journey-designer.md`

### BDD Feature Files
- **Format:** `{feature-name}.feature`
- **Example:** `authentication.feature`, `journey-enrollment.feature`

### Status Files
- **CURRENT_STATE.md** — Always current, manually updated or generated
- **KANBAN.md** — Visual board, manually updated
- **COMPLETED.md** — Historical record, append-only

---

## Best Practices from Industry Research

This proposal incorporates best practices from:

### 1. Monorepo Documentation Patterns
**Source:** Nx, Turborepo, Google monorepo practices

**Applied:**
- Single repo contains multiple "products" (Ferd, Hamn, iOS, Android)
- Each product has isolated docs but shares universe-level strategy
- Consistent structure replicated across products
- Single source of truth for cross-product decisions

### 2. Architecture Decision Records (ADR)
**Source:** Michael Nygard, AWS Prescriptive Guidance, Azure Well-Architected

**Applied:**
- Every significant decision recorded with context
- Status values (Locked, Provisional, Superseded, Deferred)
- Scoped by level (Universe vs Product vs Implementation)
- Lightweight format, append-only log

### 3. Progressive Disclosure / Hierarchical Documentation
**Source:** GitBook, Diátaxis framework, Microsoft Learn

**Applied:**
- INDEX.md files as navigation hubs
- Multiple levels of detail (overview → detail → deep-detail)
- Agent-friendly context loading
- Human-readable navigation structure

### 4. BDD/TDD Integration
**Source:** Cucumber, Behave, Gherkin best practices

**Applied:**
- Feature files as living documentation
- Scenarios referenced from requirements
- Status tracking integrated with tests
- Given-When-Then as specification language

### 5. Docs-as-Code
**Source:** Google Developer Documentation Style Guide, GitLab docs

**Applied:**
- Documentation in version control (Git)
- Markdown as primary format
- Index files as entry points
- References instead of duplication

### 6. Status Tracking in Documentation
**Source:** AWS Architecture Decision Records, ThoughtWorks ADR practices

**Applied:**
- Status metadata in requirements
- Kanban board as documentation file
- Auto-generated status summaries
- Visual symbols for quick scanning

---

## What This Solves

### ✅ Problem: Drift between docs and implementation
**Solution:** Status metadata in requirements + auto-generated baseline + kanban board

### ✅ Problem: Documentation fragmentation
**Solution:** Single location per concept + INDEX.md navigation + versioned supersession

### ✅ Problem: No status visibility
**Solution:** Integrated status tracking (Planned/Progress/Done) in documentation itself

### ✅ Problem: Context window waste
**Solution:** Progressive disclosure + hierarchical loading + references not duplication

### ✅ Problem: Ecosystem vs Product confusion
**Solution:** Three-tier structure (Universe/Products/Implementation) with clear separation

### ✅ Problem: Old files alongside new
**Solution:** `_archive/` folder + explicit supersession in ADRs + versioning discipline

### ✅ Problem: No single source of truth
**Solution:** One canonical location per information type + references everywhere else

### ✅ Problem: Ambiguous "what next"
**Solution:** CURRENT_PHASE.md + NEXT_SESSION_PLAN.md + handover documents

---

## Next Steps

### Immediate (This Week)
1. Review this proposal with Stefan
2. Refine based on feedback
3. Create folder structure (no content move yet)
4. Create all INDEX.md navigation files

### Short Term (This Month)
1. Migrate universe-level docs
2. Create Ferd product structure
3. Split ADRs by scope (Universe vs Ferd)
4. Create first REQUIREMENTS.md with status metadata

### Medium Term (Next Quarter)
1. Create status tracking system (KANBAN.md, CURRENT_STATE.md)
2. Migrate all existing session records
3. Archive superseded files
4. Update CLAUDE.md and README.md

### Long Term (Ongoing)
1. Maintain discipline: new docs follow new structure
2. Add product folders as products emerge (Hamn, iOS, Android)
3. Keep status tracking current
4. Generate baseline regularly from Claude Code

---

## Conclusion

This restructuring transforms FringeIsland documentation from a **single-product model** to an **ecosystem architecture**.

**Before:** Everything conflated. Vision mixed with implementation. Ferd treated as "FringeIsland."

**After:** Clear separation. Universe → Products → Implementation. Each product self-contained. Status visible. Agents load only what's needed.

The structure scales as FringeIsland grows. Adding Hamn doesn't pollute Ferd docs. Adding iOS app doesn't touch web app. Universe vision remains pure.

This is documentation built for a **multi-product ecosystem** — which is what FringeIsland always was, even when only Ferd existed.

---

*This proposal is informed by your current state analysis, industry best practices research, and first-principles thinking about what documentation must do for a product ecosystem of FringeIsland's magnitude and ambition.*

*It is a starting point for discussion — not a decree. Your feedback will refine it.*
