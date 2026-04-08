# Claude Code Session: Documentation Restructuring

**Session Goal:** Restructure FringeIsland documentation into three-tier architecture (Universe/Products/Implementation) with hybrid baseline.

**Repository:** `Stefansteffansson/FringeIsland`  
**Local Path:** `D:\WebDev\GitHub Repositories\FringeIsland`

**Planning Documents Location:** `./docs/refactor_docs/`  
- This folder contains the planning artifacts for this restructuring session
- These files will NOT be migrated — they're temporary scaffolding
- After migration completes, you can delete this folder or move it to archive

---

## Context

We've completed:
- ✅ Step A: Reviewed proposed structure
- ✅ Step B: Defined Ferd's ideal state (REQUIREMENTS-ferd-complete.md created)
- ✅ Gap Analysis: ACTUAL_STATE.md exists from previous session

**Now executing:** Steps C & D — Create file mapping and execute migration.

---

## Required Reading

Before starting, read these documents from `./docs/refactor_docs/`:

1. **COMPLETE_FOLDER_STRUCTURE.md** — The target structure (complete spec)
2. **REQUIREMENTS-ferd-complete.md** — Complete requirements (96 total)
3. **ACTUAL_STATE.md** — Current codebase analysis (from your previous session)
4. **ARCHITECTURE_ANATOMY.md** — The layered architecture (L0-L7, V1-V5)

**Note:** These planning documents are in `./docs/refactor_docs/` and will NOT be migrated into the new structure — they're temporary planning artifacts.

---

## Your Tasks

### PHASE 1: Discovery & Mapping (30 min)

**Task 1.1: Inventory Current Documentation**

Scan the repository and create a complete list of current `.md` files:

```bash
find docs/ -type f -name "*.md" -not -path "docs/refactor_docs/*" | sort
```

**Exclude from inventory:**
- `./docs/refactor_docs/*` — These are planning artifacts, not documentation to migrate

**Output:** `CURRENT_FILES_INVENTORY.md` with:
- All markdown files in `/docs/` (excluding refactor_docs)
- Brief description of each
- Current location
- File size
- Last modified date

---

**Task 1.2: Create Migration Mapping**

For each file in the inventory, determine:
- **Current location** (where it is now)
- **New location** (per COMPLETE_FOLDER_STRUCTURE.md)
- **Action** (move/merge/archive/delete)
- **Rationale** (why this mapping)

**Special Cases:**

**ADRs:** Split by scope
- Current: `ARCHITECTURE_DECISIONS.md` (24 ADRs)
- Universe ADRs (U001-U00X) → `/docs/old_universe/decisions/`
- Ferd ADRs (F001-F00X) → `/docs/old_products/ferd/architecture/decisions/`
- You decide the split based on content (is it ecosystem-wide or Ferd-specific?)

**Sessions:** Rename with dates
- Current: `JOURNEY_DESIGNER_SESSION_04.md`
- New: `2026-03-XX-SESSION-04-journey-designer.md` → `/docs/old_products/ferd/planning/sessions/`
- Use file modified date if session date not in content

**Baseline Docs:**
- Current: May have `ARCHITECTURE_BASELINE.md` or similar
- Shared backend → `/docs/old_implementation/shared/`
- Ferd frontend → `/docs/old_implementation/ferd/baseline/`

**Research Reports:** (if they exist)
- Theory U report → `/docs/old_universe/research/theory-u/`
- Ikigai report → `/docs/old_universe/research/human-flourishing/`
- Kegan report → `/docs/old_universe/research/adult-development/`

**Output:** `MIGRATION_MAPPING.md` in this format:

```markdown
# Documentation Migration Mapping

**Total Files:** X  
**Actions:** Y move, Z archive, A delete

---

## Universe Tier

### /docs/old_universe/vision/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `/docs/VISION.md` | `/docs/old_universe/vision/VISION.md` | move | Core vision doc |
| `/docs/planning/MANIFESTO.md` | `/docs/old_universe/vision/MANIFESTO.md` | move | Values document |

### /docs/old_universe/architecture/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `/docs/planning/ARCHITECTURE_ANATOMY.md` | `/docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md` | move | Applies to all products |

### /docs/old_universe/decisions/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| ADR-001 from ARCHITECTURE_DECISIONS.md | `/docs/old_universe/decisions/ADR-U001-{slug}.md` | extract+move | Universal decision |
| ADR-002 from ARCHITECTURE_DECISIONS.md | `/docs/old_universe/decisions/ADR-U002-{slug}.md` | extract+move | Universal decision |

[etc.]

---

## Products Tier — Ferd

### /docs/old_products/ferd/requirements/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `./docs/planning/REQUIREMENTS-ferd-complete.md` | `/docs/old_products/ferd/requirements/REQUIREMENTS.md` | move | Main requirements doc |

### /docs/old_products/ferd/architecture/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| (portion of ARCHITECTURE_DECISIONS.md) | `/docs/old_products/ferd/architecture/decisions/ADR-F001-{slug}.md` | extract+move | Ferd-specific ADR |

### /docs/old_products/ferd/planning/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `/docs/planning/ROADMAP.md` | `/docs/old_products/ferd/planning/ROADMAP.md` | move | Ferd roadmap |
| `/docs/planning/DEFERRED_DECISIONS.md` | `/docs/old_products/ferd/planning/DEFERRED.md` | move+rename | Deferred features |

### /docs/old_products/ferd/planning/sessions/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `JOURNEY_DESIGNER_SESSION_04.md` | `/docs/old_products/ferd/planning/sessions/2026-03-XX-SESSION-04-journey-designer.md` | move+rename | Session record |

[etc.]

---

## Implementation Tier

### /docs/old_implementation/shared/ (Backend)

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `DATABASE_SCHEMA.md` (if exists) | `/docs/old_implementation/shared/DATABASE_CURRENT.md` | move | Shared by all products |
| `AUTHORIZATION.md` (if exists) | `/docs/old_implementation/shared/AUTH_SYSTEM.md` | move | RLS shared |

### /docs/old_implementation/ferd/baseline/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `ARCHITECTURE_BASELINE.md` (if exists) | `/docs/old_implementation/ferd/baseline/BASELINE.md` | regenerate | Claude Code generates new |

### /docs/old_implementation/ferd/status/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| (new file) | `/docs/old_implementation/ferd/status/KANBAN.md` | create | Visual board (to be created) |

---

## Archive

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `/docs/old/legacy-doc.md` | `/docs/_archive/2026-04-04-legacy-doc.md` | archive | Superseded |

[etc.]
```

---

**Task 1.3: Identify Risks**

Create `MIGRATION_RISKS.md`:
- Broken cross-references
- Duplicate content
- Lost information
- Orphaned files
- CLAUDE.md needs update
- README.md needs update

---

### PHASE 2: Validation (15 min)

**Task 2.1: Review Mapping with Stefan**

**PAUSE HERE.** Output the mapping document and ask Stefan:

```
I've created the migration mapping. Please review:

1. Does the file placement make sense?
2. Did I miss any important files?
3. Disagreement on Universe vs Ferd ADR splits?
4. Should any files be archived vs moved?
5. Ready to proceed with execution?
```

**DO NOT PROCEED TO PHASE 3 until Stefan approves the mapping.**

---

### PHASE 3: Execution (1-2 hours)

**Only execute this phase after Stefan approves Phase 2.**

**Task 3.1: Create Folder Structure**

Create all folders per COMPLETE_FOLDER_STRUCTURE.md:

```bash
mkdir -p docs/old_universe/{vision,strategy,worldbuilding,brand,legal,architecture,research,decisions}
mkdir -p docs/old_products/ferd/{specification,architecture,planning,development,sessions,research}
mkdir -p docs/old_products/ferd/architecture/decisions
mkdir -p docs/old_products/ferd/planning/sessions
mkdir -p docs/old_implementation/{shared,cross-product,ferd}
mkdir -p docs/old_implementation/ferd/{status,baseline,handover,testing,changelog}
mkdir -p docs/_archive
```

---

**Task 3.2: Create INDEX.md Files**

Create INDEX.md in each major folder using examples from uploaded files:
- `/docs/old_INDEX.md` (root hub)
- `/docs/old_universe/INDEX.md`
- `/docs/old_products/INDEX.md`
- `/docs/old_products/ferd/INDEX.md`
- `/docs/old_implementation/INDEX.md`
- [etc. for all folders with 3+ items]

**Pattern:**
```markdown
# {Folder Name}

**Purpose:** {One-line description}

---

## Contents

| Document | Purpose |
|----------|---------|
| [FILENAME.md](./FILENAME.md) | {Description} |

---

## Related

- [Link to related folder](../other-folder/)
```

---

**Task 3.3: Move Files**

Execute the migration per approved mapping:

```bash
# Example moves (based on your mapping)
mv docs/planning/ARCHITECTURE_ANATOMY.md docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md
mv docs/planning/REQUIREMENTS-ferd-complete.md docs/old_products/ferd/requirements/REQUIREMENTS.md

[etc. per mapping]
```

**For ADR splits:**
1. Parse ARCHITECTURE_DECISIONS.md
2. Extract each ADR
3. Create individual files (ADR-U001-{slug}.md or ADR-F001-{slug}.md)
4. Place in correct folder
5. Update cross-references

---

**Task 3.4: Update Cross-References**

Scan all moved files for internal links:
- Update `[link](../old/path.md)` → `[link](../../new/path.md)`
- Update relative paths
- Verify links still work

**Tool suggestion:**
```bash
grep -r "\.md)" docs/ | grep -v ".git" | grep -v "node_modules"
```

Then update each broken link.

---

**Task 3.5: Create New Documents**

**Create these if they don't exist:**

**1. ACTUAL_STATE.md**
- **Location:** `/docs/old_implementation/ferd/baseline/ACTUAL_STATE.md`
- **Content:** Copy from your previous session output (I'll provide)

**2. KANBAN.md**
- **Location:** `/docs/old_implementation/ferd/status/KANBAN.md`
- **Content:** Visual board based on REQUIREMENTS.md status
- **Columns:** 🔥 IMMEDIATE, 🔄 In Progress, 📋 Next Sprint, 🗓️ Backlog, ⏸️ Deferred
- **Rows:** Critical issues from ACTUAL_STATE.md + REQUIREMENTS.md

**3. ROADMAP.md**
- **Location:** `/docs/old_products/ferd/planning/ROADMAP.md`
- **Content:** Phase breakdown based on REQUIREMENTS.md
- **Phases:** 1.4 (current), 1.5 (polish), 1.6 (API layer), 2.0 (Hamn)

**4. BASELINE.md**
- **Location:** `/docs/old_implementation/ferd/baseline/BASELINE.md`
- **Content:** Re-generate from codebase (you've done this before)

---

**Task 3.6: Archive Superseded Files**

Move to `/docs/_archive/` with date prefix:
```bash
mv old-file.md docs/_archive/2026-04-04-old-file.md
```

Add `_ARCHIVE_INDEX.md` listing archived files with reasons.

---

**Task 3.7: Update Root Files**

**Update CLAUDE.md:**
- Replace old file paths with new
- Add section on three-tier structure
- Update "Key Files" section
- Add navigation guidance

**Update README.md:**
- Add "Documentation Structure" section
- Link to `/docs/old_INDEX.md`
- Brief explanation of three tiers
- How to find things

**Update package.json (if exists):**
- Update any doc-related scripts

---

**Task 3.8: Clean Up Planning Artifacts**

**Move refactor_docs to archive:**

```bash
mv docs/refactor_docs docs/_archive/2026-04-04-refactor-planning
```

**Add note to archive index:**
- These were planning documents for restructuring
- COMPLETE_FOLDER_STRUCTURE.md = the plan
- REQUIREMENTS-ferd-complete.md = moved to products/ferd/requirements/
- ACTUAL_STATE.md = moved to implementation/ferd/baseline/
- Planning artifacts preserved for reference

---

### PHASE 4: Validation (15 min)

**Task 4.1: Generate Migration Report**

Create `MIGRATION_REPORT.md`:

```markdown
# Documentation Migration Report

**Date:** 2026-04-04  
**Executor:** Claude Code

---

## Summary

**Files Moved:** X  
**Files Archived:** Y  
**Files Created:** Z  
**Cross-References Updated:** N  
**INDEX Files Created:** M

---

## Detailed Actions

### Moved Files (X total)

| From | To | Status |
|------|-----|--------|
| `/docs/old/path.md` | `/docs/new/path.md` | ✅ Done |

### Created Files (Z total)

| File | Purpose | Status |
|------|---------|--------|
| `/docs/old_INDEX.md` | Root navigation | ✅ Done |

### Archived Files (Y total)

| File | Reason | Status |
|------|--------|--------|
| `old-doc.md` | Superseded by REQUIREMENTS.md | ✅ Done |

---

## Validation Checklist

- [ ] All files moved per mapping
- [ ] No files left in old locations
- [ ] All cross-references updated
- [ ] All INDEX files created
- [ ] CLAUDE.md updated
- [ ] README.md updated
- [ ] Archive documented
- [ ] No broken links (verified)

---

## Issues Found

[List any issues or deviations from plan]

---

## Next Steps

1. Stefan validates structure
2. Fix any issues found
3. Commit to git with message: "docs: restructure to three-tier architecture"
```

---

**Task 4.2: Verify No Broken Links**

Run link checker or manual verification:
```bash
# Check for common broken link patterns
grep -r "\.\./\.\./\.\./docs/" docs/
grep -r "](/docs/planning/" docs/
```

Fix any found.

---

## Output Files You'll Create

**Phase 1:**
1. `CURRENT_FILES_INVENTORY.md`
2. `MIGRATION_MAPPING.md`
3. `MIGRATION_RISKS.md`

**Phase 3:**
4. All INDEX.md files
5. ACTUAL_STATE.md (moved)
6. KANBAN.md (created)
7. ROADMAP.md (created)
8. BASELINE.md (regenerated)
9. Updated CLAUDE.md
10. Updated README.md

**Phase 4:**
11. `MIGRATION_REPORT.md`

---

## Critical Rules

**1. DO NOT DELETE ANY FILES without Stefan's explicit approval**
- Move to archive instead
- Document reason for archival

**2. PAUSE after Phase 2 (mapping)**
- Wait for Stefan approval
- Do not execute migration without go-ahead

**3. PRESERVE ALL CONTENT**
- If merging files, preserve all information
- If splitting ADRs, keep full ADR text
- No data loss allowed

**4. UPDATE CROSS-REFERENCES**
- Critical that internal links work
- Broken links = migration failure

**5. VALIDATE BEFORE DECLARING DONE**
- Check all files moved
- Verify links work
- Ensure nothing lost

---

## Success Criteria

Migration is successful when:

✅ All files in correct locations per COMPLETE_FOLDER_STRUCTURE.md  
✅ INDEX.md files provide clear navigation  
✅ Cross-references work (no broken links)  
✅ CLAUDE.md reflects new structure  
✅ README.md explains new structure  
✅ Archive documented (nothing lost)  
✅ KANBAN.md + ROADMAP.md created  
✅ BASELINE.md regenerated  
✅ Stefan can find any document in < 30 seconds

---

## Ready to Start?

1. Read COMPLETE_FOLDER_STRUCTURE.md carefully
2. Scan current `/docs/` folder
3. Create CURRENT_FILES_INVENTORY.md
4. Create MIGRATION_MAPPING.md
5. **PAUSE and show Stefan the mapping**
6. Wait for approval
7. Execute migration (Phase 3)
8. Validate (Phase 4)
9. Report completion

**Begin with Phase 1, Task 1.1 — Inventory Current Documentation.**
