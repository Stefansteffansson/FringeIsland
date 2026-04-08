# Quick Reference: Documentation Restructuring with Claude Code

**Session Goal:** Restructure docs → Three-tier architecture (Universe/Products/Implementation)

---

## Files to Upload to Claude Code

**All files are in:** `./docs/refactor_docs/`

**Required (point Claude Code to this folder):**
1. ✅ CLAUDE_CODE_PROMPT-documentation-restructuring.md (this session's instructions)
2. ✅ COMPLETE_FOLDER_STRUCTURE.md (target structure)
3. ✅ REQUIREMENTS-ferd-complete.md (96 requirements)
4. ✅ ACTUAL_STATE.md (codebase analysis from previous session)
5. ✅ ARCHITECTURE_ANATOMY.md (L0-L7 architecture)

**Note:** You don't need to upload these — just tell Claude Code they're in `./docs/refactor_docs/` in the repo.

**Optional (helpful context):**
- ARCHITECTURE_DECISIONS.md (if it exists — for ADR splitting)
- README.md (current version)
- CLAUDE.md (current version)

---

## Your Opening Message to Claude Code

```
I need you to restructure the FringeIsland documentation into a three-tier architecture.

First, read the planning documents in ./docs/refactor_docs/:
1. CLAUDE_CODE_PROMPT-documentation-restructuring.md (complete instructions)
2. COMPLETE_FOLDER_STRUCTURE.md (target structure)
3. REQUIREMENTS-ferd-complete.md (requirements reference)
4. ACTUAL_STATE.md (current codebase state)
5. ARCHITECTURE_ANATOMY.md (architecture reference)

Repository: Stefansteffansson/FringeIsland
Local path: D:\WebDev\GitHub Repositories\FringeIsland

Start with Phase 1, Task 1.1: Create an inventory of current .md files in /docs/ (excluding /docs/refactor_docs/).

IMPORTANT: PAUSE after Phase 2 (mapping) and show me the MIGRATION_MAPPING.md for approval before executing any file moves.
```

---

## What Claude Code Will Do

### **Phase 1: Discovery (30 min)**
**Output:**
- CURRENT_FILES_INVENTORY.md
- MIGRATION_MAPPING.md
- MIGRATION_RISKS.md

**What you do:** Review the mapping, approve or request changes

---

### **Phase 2: ⏸️ PAUSE FOR YOUR APPROVAL**

Claude Code will show you MIGRATION_MAPPING.md with:
- Every file's current location
- Every file's new location
- Action (move/archive/delete)
- Rationale

**Your review checklist:**
- ✅ File placement makes sense?
- ✅ Nothing important being deleted/archived?
- ✅ ADR splits look correct (Universe vs Ferd)?
- ✅ Session file renaming OK?

**Your response options:**
- ✅ "Approved, proceed with migration"
- ⚠️ "Change these mappings: [list changes]"
- ❌ "Stop, let's discuss [issue]"

---

### **Phase 3: Execution (1-2 hours)**

**Only after you approve Phase 2.**

Claude Code will:
1. Create folder structure
2. Create INDEX.md files
3. Move files per mapping
4. Update cross-references
5. Create new docs (KANBAN, ROADMAP, BASELINE)
6. Archive old files
7. Update CLAUDE.md and README.md

---

### **Phase 4: Validation (15 min)**

**Output:** MIGRATION_REPORT.md

Claude Code validates:
- All files moved correctly
- No broken links
- Nothing lost
- Structure matches target

---

## What You'll Get at the End

**New Structure:**
```
docs/
├── INDEX.md (navigation hub)
├── universe/
│   ├── vision/VISION.md, MANIFESTO.md
│   ├── architecture/ARCHITECTURE_ANATOMY.md
│   └── decisions/ADR-U001-*.md (universe ADRs)
├── products/ferd/
│   ├── requirements/REQUIREMENTS.md
│   ├── architecture/decisions/ADR-F001-*.md (Ferd ADRs)
│   ├── planning/ROADMAP.md, sessions/
│   └── [full structure]
└── implementation/
    ├── shared/ (DATABASE, AUTH, RLS — all products)
    └── ferd/
        ├── baseline/BASELINE.md, ACTUAL_STATE.md
        └── status/KANBAN.md
```

**Plus:**
- Updated CLAUDE.md (new paths)
- Updated README.md (structure explanation)
- MIGRATION_REPORT.md (what was done)

---

## Critical Decision Points

**You'll need to decide:**

### **1. ADR Splits (during Phase 2 review)**
Example:
- ADR-009 "API Route Layer" → Ferd-specific? Or universe-wide?
- Claude Code will suggest, you confirm

### **2. Archive vs Delete**
- Archive = preserve in `/docs/_archive/2026-04-04-filename.md`
- Delete = gone forever
- Default: archive unless you say delete

### **3. File Merges**
If Claude Code suggests merging files:
- Example: "Merge ROADMAP_DRAFT.md into ROADMAP.md?"
- You decide

---

## Time Estimate

**Total: 2-3 hours**
- Phase 1 (Discovery): 30 min
- Your review: 15 min
- Phase 3 (Execution): 1-2 hours
- Phase 4 (Validation): 15 min
- Your final check: 15 min

---

## Red Flags to Watch For

**If Claude Code says:**
- ❌ "I'll delete these files..." → STOP, archive instead
- ❌ "I can't find X file..." → Investigate before continuing
- ❌ "These cross-references can't be updated..." → Need manual review

**If something seems wrong:**
- PAUSE the session
- Ask Claude Code to explain
- Come back to me (planning Claude) if needed

---

## After Migration Success

**Next steps:**
1. Commit to git: `git commit -m "docs: restructure to three-tier architecture"`
2. Create ROADMAP.md if not created (based on REQUIREMENTS.md)
3. Create KANBAN.md if not created (based on critical issues)
4. Fix launch blockers (email, alert()s, ARIA)

---

## Emergency: Roll Back

**If migration goes wrong:**

```bash
# Don't panic - everything is in git
git status  # See what changed
git diff    # See exact changes
git restore docs/  # Undo everything
```

**Then:**
- Review what went wrong
- Adjust mapping
- Try again

---

## Success Looks Like

✅ Run `ls docs/` → See universe/, products/, implementation/  
✅ Open `docs/old_INDEX.md` → Clear navigation  
✅ Find REQUIREMENTS.md → In `products/ferd/requirements/`  
✅ Check CLAUDE.md → References new paths  
✅ No broken links  
✅ Nothing lost (check archive if needed)  
✅ Can find anything in < 30 seconds

---

## Questions? Issues?

**During the session:**
- Ask Claude Code to clarify
- Request changes to mapping
- Pause if unsure

**After the session:**
- Bring MIGRATION_REPORT.md back to me (planning Claude)
- We'll review together
- Fix any issues

---

**Ready to start? Upload the files to Claude Code and send the opening message!** 🚀
