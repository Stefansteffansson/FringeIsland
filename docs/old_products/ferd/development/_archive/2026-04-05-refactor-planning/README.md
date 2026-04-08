# FringeIsland Documentation Architecture Package

**Version:** 2.0 (Hybrid Baseline Model)  
**Created:** 2026-04-04  
**Status:** Review & Feedback Phase

---

## What's in This Package

This package contains the complete proposal for restructuring FringeIsland's documentation using a **three-tier architecture with hybrid baseline**.

### Core Documents

1. **FRINGEISLAND_DOCUMENTATION_ARCHITECTURE_PROPOSAL.md** (60+ pages)
   - Complete proposal with research and rationale
   - Industry best practices analysis
   - Three-tier architecture explanation
   - Migration planning guidance

2. **COMPLETE_FOLDER_STRUCTURE.md** (40+ pages)
   - Every folder, every file defined
   - **KEY UPDATE:** Hybrid baseline approach
   - `/shared/` for backend infrastructure
   - `/{product}/baseline/` for product-specific code
   - File purposes and naming conventions
   - Progressive disclosure examples

3. **NEXT_STEPS.md**
   - Tracks committed follow-up work (B, C, D)
   - Timeline estimates
   - Success criteria

### Example Files

Located in `/examples/` folder:

#### Navigation INDEX Files
4. **INDEX-root.md** — Root documentation entry point
5. **INDEX-universe.md** — Universe tier navigation
6. **INDEX-ferd.md** — Ferd product navigation

#### Content Examples
7. **REQUIREMENTS-ferd.md** — Requirements with status metadata (18 examples)
8. **KANBAN-ferd.md** — Visual development status board

#### Hybrid Baseline Examples (NEW)
9. **DATABASE_CURRENT-shared.md** — Shared PostgreSQL schema (ALL products)
10. **FRONTEND_CURRENT-ferd.md** — Ferd-specific frontend baseline
11. **REFERENCES_SHARED-ferd.md** — How Ferd integrates with shared infrastructure

---

## Key Changes from Previous Version

### ✨ NEW: Hybrid Baseline Approach

**Previous (v1.0):** Each product had its own complete baseline, duplicating database schema 4+ times.

**Current (v2.0):** Hybrid model splits baseline into:
- **`/implementation/shared/`** — Backend infrastructure (database, auth, Supabase)
- **`/implementation/{product}/baseline/`** — Product-specific frontends/apps

**Why:** All products (Ferd, Hamn, iOS, Android) share the same backend (Supabase, PostgreSQL) but have different frontends.

**See:** COMPLETE_FOLDER_STRUCTURE.md Section "Hybrid Baseline: What Goes Where"

---

## The Three Tiers

### TIER 1: Universe (`/docs/old_universe/`)
**Purpose:** Ecosystem-wide vision, strategy, worldbuilding

**Characteristics:**
- Product-agnostic
- Slowly changing (months/years)
- Strategic and aspirational

**Folders:** vision/, strategy/, worldbuilding/, brand/, legal/, decisions/

**Example:** VISION.md, MANIFESTO.md, THREE_QUESTIONS.md

---

### TIER 2: Products (`/docs/old_products/{product}/`)
**Purpose:** Product-specific specification, architecture, planning

**Characteristics:**
- Self-contained per product
- Technical and detailed
- Planning-focused

**Folders:** specification/, architecture/, planning/, development/, sessions/, research/

**Example:** REQUIREMENTS.md, ANATOMY.md, ROADMAP.md

---

### TIER 3: Implementation (`/docs/old_implementation/`)
**Purpose:** Current state tracking, status, handover

**Characteristics:**
- Hybrid baseline (shared + per-product)
- Frequently updated
- Bridge between planning and code

**Folders:** shared/, cross-product/, {product}/ (with status/, baseline/, handover/, testing/)

**Example:** DATABASE_CURRENT.md (shared), KANBAN.md (per-product), FRONTEND_CURRENT.md (per-product)

---

## Documentation Features

### ✅ Progressive Disclosure
INDEX.md files in every folder create navigation hierarchy. Agents load ~5,000 tokens instead of 80,000+ by following INDEX → detail → section path.

### ✅ Status Tracking
Requirements carry status inline (✅ Done, 🔄 In Progress, 📋 Planned, ⏸️ Deferred, ❌ Rejected). KANBAN.md provides visual board.

### ✅ Single Source of Truth
- Database schema: ONE file in `/shared/` (not 4×)
- Requirements: ONE file per product
- Each concept has one canonical location

### ✅ Cross-References
Files link to each other rather than duplicating content.

### ✅ Hybrid Baseline Accuracy
- Shared backend documented once → `/shared/`
- Product frontends documented separately → `/{product}/baseline/`
- Reflects FringeIsland's actual architecture

---

## How to Review

### Quick Review (30 minutes)
1. Read COMPLETE_FOLDER_STRUCTURE.md (skim structure, read hybrid baseline section)
2. Review example INDEX files (see navigation pattern)
3. Look at KANBAN-ferd.md (status tracking format)

### Detailed Review (2-3 hours)
1. Read FRINGEISLAND_DOCUMENTATION_ARCHITECTURE_PROPOSAL.md (complete proposal)
2. Read COMPLETE_FOLDER_STRUCTURE.md (every folder/file)
3. Review all example files
4. Check hybrid baseline examples (DATABASE_CURRENT-shared.md, FRONTEND_CURRENT-ferd.md, REFERENCES_SHARED-ferd.md)
5. Note any gaps, issues, or improvements

### What to Look For
- **Structure:** Does three-tier separation make sense?
- **Hybrid baseline:** Does shared + per-product split work?
- **Navigation:** Can you find what you need?
- **Status tracking:** Does KANBAN + metadata work?
- **Naming:** Are conventions clear?
- **Examples:** Are they realistic/useful?

---

## Next Steps After Review

### A. Review & Refine (CURRENT)
You provide feedback on this structure.

### B. Define Ferd's Ideal State (NEXT)
Create complete REQUIREMENTS.md, ROADMAP.md, CURRENT_PHASE.md using examples as templates.

### C. Create File Mapping (AFTER B)
Map current docs → new structure, create migration plan.

### D. Involve Claude Code (AFTER C)
Gap analysis (code vs docs), migration execution.

**See:** NEXT_STEPS.md for complete breakdown

---

## Questions to Consider

### Structure Questions
- Does the three-tier model make sense for FringeIsland?
- Any folders/files missing?
- Any unnecessary complexity?

### Hybrid Baseline Questions
- Does splitting backend (/shared/) from frontends (/{product}/) make sense?
- Should anything else be shared beyond database/auth/RLS?
- Are the example files clear about what goes where?

### Navigation Questions
- Can you imagine finding what you need?
- Are INDEX files helpful or overwhelming?
- Too many folders or too few?

### Status Tracking Questions
- Does KANBAN format work?
- Is status metadata in REQUIREMENTS useful?
- Any other tracking needed?

---

## How to Provide Feedback

### Format
- **Structured:** List issues/suggestions by document
- **Freeform:** Just point out what doesn't work
- **Incremental:** Review section by section with Claude

### Focus Areas
1. Is hybrid baseline the right approach?
2. Does the folder structure make sense?
3. Are examples clear and useful?
4. Any critical gaps?

---

## Files in This Package

```
fringeisland-docs-package/
├── README.md                                    # This file
├── FRINGEISLAND_DOCUMENTATION_ARCHITECTURE_PROPOSAL.md
├── COMPLETE_FOLDER_STRUCTURE.md
├── NEXT_STEPS.md
└── examples/
    ├── INDEX-root.md                            # Root navigation
    ├── INDEX-universe.md                        # Universe tier navigation
    ├── INDEX-ferd.md                            # Ferd product navigation
    ├── REQUIREMENTS-ferd.md                     # Requirements with status
    ├── KANBAN-ferd.md                           # Visual status board
    ├── DATABASE_CURRENT-shared.md               # NEW: Shared backend
    ├── FRONTEND_CURRENT-ferd.md                 # NEW: Ferd frontend
    └── REFERENCES_SHARED-ferd.md                # NEW: Integration mapping
```

---

## Version History

**v2.0 (2026-04-04) — Hybrid Baseline**
- Added `/implementation/shared/` for backend infrastructure
- Split baselines: shared backend + per-product frontends
- Created example files: DATABASE_CURRENT-shared.md, FRONTEND_CURRENT-ferd.md, REFERENCES_SHARED-ferd.md
- Updated COMPLETE_FOLDER_STRUCTURE.md with hybrid model

**v1.0 (2026-04-04) — Initial Proposal**
- Three-tier architecture
- Per-product baselines (duplicated database schema)
- Example INDEX, REQUIREMENTS, KANBAN files

---

## Contact

**Project:** FringeIsland Documentation Architecture  
**Owner:** Stefan Stefansson  
**Status:** Review phase  
**Next milestone:** Finalize structure based on feedback

---

*This package represents the complete proposal for FringeIsland's documentation restructuring. Take your time reviewing — this is a foundational architectural decision.*
