# FringeIsland Documentation Restructuring — Next Steps

**Status:** Review Phase (Option A)  
**Last Updated:** 2026-04-04

---

## Current Status: Review & Refine (A)

Stefan is reviewing the proposed structure and examples.

**Documents under review:**
1. FRINGEISLAND_DOCUMENTATION_ARCHITECTURE_PROPOSAL.md
2. COMPLETE_FOLDER_STRUCTURE.md
3. INDEX-root.md (example)
4. INDEX-universe.md (example)
5. INDEX-ferd.md (example)
6. REQUIREMENTS-ferd.md (example)
7. KANBAN-ferd.md (example)

**Feedback pending on:**
- Three-tier structure (Universe/Products/Implementation)
- Folder organization and file locations
- Naming conventions (ADRs, sessions, features)
- Status tracking approach (KANBAN + metadata in requirements)
- Navigation pattern (INDEX files, cross-references)

---

## Committed Next Steps

### ✅ B: Define Ferd's Ideal State
**Status:** Not started — WAITING FOR A TO COMPLETE  
**Estimated Duration:** 1-2 planning sessions  
**Owner:** Stefan + Claude (planning)

**What we'll create:**
1. **Complete REQUIREMENTS.md for Ferd**
   - List ALL features (done, in-progress, planned)
   - Add status metadata (✅🔄📋⏸️❌)
   - Include acceptance criteria
   - Link to BDD scenarios
   - Use REQUIREMENTS-ferd.md example as template

2. **ROADMAP.md for Ferd**
   - Phase breakdown (1.1, 1.2, 1.3, 1.4, 1.5+)
   - Milestones with dates
   - Dependencies between phases
   - Release targets

3. **CURRENT_PHASE.md**
   - Phase 1.4 Journey System details
   - What's being built this phase
   - Success criteria for phase completion
   - Timeline and blockers

4. **SCOPE.md**
   - What's in scope for Ferd (Wave 1)
   - What's explicitly out of scope (belongs in Hamn)
   - Boundaries and constraints

**Output:** Ferd's complete "ideal state" documentation ready for gap analysis

---

### ✅ C: Create File Mapping
**Status:** Not started — WAITING FOR B TO COMPLETE  
**Estimated Duration:** 1 planning session  
**Owner:** Stefan + Claude (planning)

**What we'll create:**

1. **MIGRATION_MAPPING.md**
   ```markdown
   # Current → New Location Mapping

   ## Universe Docs
   - Current: `/docs/planning/VISION.md`
   - New: `/docs/universe/vision/VISION.md`
   - Action: Move + update cross-references

   ## Ferd Docs
   - Current: `/docs/planning/ARCHITECTURE_ANATOMY.md`
   - New: `/docs/products/ferd/architecture/ANATOMY.md`
   - Action: Move + update cross-references

   ## Implementation
   - Current: `/docs/planning/ARCHITECTURE_BASELINE.md`
   - New: `/docs/implementation/ferd/baseline/BASELINE.md`
   - Action: Move (Claude Code generates new version)

   [Complete mapping for all files]
   ```

2. **ADR_SPLIT_PLAN.md**
   - Map current ADRs to scopes (Universe vs Ferd)
   - ADR-001 → ADR-U001 or ADR-F001?
   - Document renaming plan

3. **ARCHIVE_CANDIDATES.md**
   - List files to archive (superseded/outdated)
   - Archive naming format: `YYYY-MM-DD-original-name.md`
   - Rationale for each archive decision

4. **MIGRATION_RISKS.md**
   - Identify risks (broken links, lost content)
   - Mitigation strategies
   - Rollback plan if needed

**Output:** Complete migration plan ready for Claude Code execution

---

### ✅ D: Involve Claude Code
**Status:** Not started — WAITING FOR B AND C TO COMPLETE  
**Estimated Duration:** 2-3 Claude Code sessions + 1 planning session review  
**Owner:** Stefan + Claude Code

**Session 1: Gap Analysis**

**Input to Claude Code:**
- Proposed REQUIREMENTS.md (from B)
- Proposed ROADMAP.md (from B)
- Complete folder structure document
- Access to actual Ferd codebase

**Tasks for Claude Code:**
1. Analyze codebase (what exists in code)
2. Generate `ACTUAL_STATE.md` — what's implemented
3. Generate `GAP_ANALYSIS.md` — proposed vs actual
4. Generate `BASELINE.md` — technical snapshot
5. List all current .md files in repo
6. Identify documentation drift

**Output:** 
- Clear picture of reality vs documentation
- Identified gaps (documented but not built, built but not documented)

---

**Session 2: Migration Plan Validation**

**Input to Claude Code:**
- Gap analysis from Session 1
- MIGRATION_MAPPING.md (from C)
- Current folder structure
- Proposed new structure

**Tasks for Claude Code:**
1. Review proposed migration plan
2. Challenge assumptions
3. Identify risks
4. Suggest optimizations
5. Create step-by-step migration script
6. Estimate effort/time

**Output:**
- Validated migration plan
- Detailed execution script
- Risk mitigation strategies

---

**Session 3: Reconciliation (Planning)**

**Between Sessions 2 and 4**  
**Owner:** Stefan + Claude (planning)

**Review together:**
- Gap analysis findings
- What's actually built vs documented
- Migration plan feasibility

**Make decisions:**
- Update docs to match reality? Or implement missing features?
- Which ADRs split into Universe vs Ferd?
- Which files to archive vs update?
- Adjust structure based on Claude Code feedback?

**Output:**
- Final migration decisions
- Updated migration plan
- Go/no-go for execution

---

**Session 4: Execute Migration (Claude Code)**

**Input:**
- Approved migration plan
- Final reconciliation decisions
- Migration script from Session 2

**Tasks for Claude Code:**
1. Create new folder structure
2. Create all INDEX.md files
3. Create template files
4. Move content files (per mapping)
5. Update cross-references
6. Archive superseded files
7. Generate new BASELINE.md
8. Update root README.md and CLAUDE.md

**Output:**
- Restructured documentation
- All files in new locations
- Cross-references updated
- Archive folder populated

---

**Session 5: Validation (Planning)**

**After migration**  
**Owner:** Stefan + Claude (planning)

**Validation checklist:**
- [ ] All files moved correctly
- [ ] Cross-references work
- [ ] INDEX files complete
- [ ] Nothing lost in migration
- [ ] Archive folder correct
- [ ] README and CLAUDE.md updated
- [ ] Structure matches proposal

**If issues found:**
- Document issues
- Create fix list
- Execute fixes (Claude Code if needed)

**Output:**
- Validated new structure
- Documentation complete
- Ready for continued development

---

## Why This Order

**A → B → C → D** is the correct sequence because:

1. **A (Review)** — Must validate the TARGET before assessing current state
2. **B (Ideal State)** — Must know what SHOULD exist before comparing to reality
3. **C (Mapping)** — Must plan the migration before executing it
4. **D (Execute)** — Only execute when plan is solid

**Skipping A** = Risk building wrong structure  
**Skipping B** = Risk gap analysis without clear target  
**Skipping C** = Risk executing migration without plan  
**Jumping to D** = Risk executing before ready

---

## Timeline Estimate

**Optimistic:** 2-3 weeks total
- Week 1: A (review) + B (ideal state definition)
- Week 2: C (mapping) + D Sessions 1-2 (gap analysis, validation)
- Week 3: D Sessions 3-5 (reconciliation, execution, validation)

**Realistic:** 3-4 weeks total
- Week 1: A (review with iterations)
- Week 2: B (complete Ferd requirements, roadmap)
- Week 3: C (mapping) + D Sessions 1-2
- Week 4: D Sessions 3-5

**Conservative:** 4-6 weeks total
- Accounts for: feedback cycles, unexpected gaps, migration issues, learning curve

---

## Success Criteria

**We'll know we're done when:**

✅ Documentation structure matches three-tier model  
✅ Every file has a clear home  
✅ INDEX files provide clear navigation  
✅ Status tracking works (KANBAN + requirements metadata)  
✅ No ambiguity about what's built vs planned  
✅ AI agents can load context efficiently  
✅ Stefan can find anything in < 30 seconds  
✅ New contributors can orient themselves  
✅ Migration was clean (nothing lost)

---

## Open Questions (To Resolve in Review)

**From Stefan's review (A):**
- [To be filled in based on feedback]

**For Ideal State (B):**
- How granular should requirements be?
- Should we split non-functional requirements into own section?
- What's the phase numbering scheme for post-1.5?

**For Mapping (C):**
- Do we rename files during migration or preserve names?
- How do we handle session records (already dated)?
- Archive everything old or only truly superseded?

**For Claude Code (D):**
- Should Claude Code suggest requirements based on codebase analysis?
- How do we handle features in code but not documented?
- Do we auto-generate parts of REQUIREMENTS from code?

---

## Document This Replaces

This document is the tracking mechanism for B, C, D so they don't get forgotten.

**Previous commitment:** "Do Option A, but don't forget B, C, D!"

**This document ensures:** B, C, D are explicitly tracked and scheduled.

---

**Next Update:** After Stefan completes review (A) and provides feedback
