# Session Close-Down Workflow

**Purpose:** Standard procedure for ending a work session on FringeIsland
**For:** AI assistants and developers ending a session
**Last Updated:** February 9, 2026

---

## 🎯 Quick Close-Down

**For AI Assistants:**
When user says "Close down session" or "End session", follow this workflow.

---

## ⚠️ CRITICAL: EXACT FILE PATHS - READ AS WRITTEN, DO NOT MODIFY!

**These file paths are EXACT. Use them PRECISELY as shown. DO NOT guess or change paths!**

| File | EXACT Path (use this EXACTLY) | When to Update | Location |
|------|-------------------------------|----------------|----------|
| **Project Status** | `PROJECT_STATUS.md` | ✅ ALWAYS (required) | Root directory |
| **Roadmap** | `docs/planning/ROADMAP.md` | If significant progress | docs/planning/ directory |
| **Deferred Decisions** | `docs/planning/DEFERRED_DECISIONS.md` | If new deferrals | docs/planning/ directory |
| **Product Spec** | `docs/planning/PRODUCT_SPEC.md` | If scope changed | docs/planning/ directory |
| **Behavior Specs** | `docs/specs/behaviors/[domain].md` | If behaviors tested | docs/specs/behaviors/ directory |
| **Feature Docs** | `docs/features/implemented/[feature].md` | If features updated | docs/features/implemented/ directory |
| **Session Bridge** | `docs/planning/sessions/YYYY-MM-DD-description.md` | If significant work | docs/planning/sessions/ directory |

**IMPORTANT NOTES:**
- ❌ **WRONG:** `ROADMAP.md` (root directory)
- ✅ **CORRECT:** `docs/planning/ROADMAP.md`
- ❌ **WRONG:** Guessing file locations
- ✅ **CORRECT:** Using EXACT paths from table above
- ⚠️ **PROJECT_STATUS.md is ALWAYS updated** - This is in root directory, not docs/

**IF A FILE READ FAILS:**
1. Do NOT skip the file silently
2. Report the error to the user immediately
3. Use Glob to find the correct location
4. Update this table if the file has moved

---

## 📋 Close-Down Checklist

### 1. Summarize Work Done
**Ask user:**
```
Let's wrap up this session. What did we accomplish today?

[Wait for user response or summarize based on conversation]
```

**Create summary:**
- What was implemented/fixed/updated
- Files created or modified
- Decisions made
- Challenges encountered
- Incomplete work
- **Tests written/updated** (NEW - Since v0.2.10+)
- **Behaviors documented** (NEW - Since v0.2.10+)
- **Test results** (passing/failing)

### 2. Run Tests (NEW - If Code Changed)
**If code was modified:**

```bash
npm test
```

**Check:**
- All tests passing?
- New tests added?
- Test coverage changed?

**If tests failing:**
- Fix before committing OR
- Document as known issue in commit message

**Report:**
```
🧪 Test Status:
- Tests: X total (Y passing, Z failing)
- Coverage: N% (was M%)
- New tests: [list new test files]
```

### 3. Update Documentation

**A. Update PROJECT_STATUS.md (ALWAYS REQUIRED) ⚠️ ROOT DIRECTORY!**
**File path:** `PROJECT_STATUS.md` (root directory, NOT docs/PROJECT_STATUS.md!)

Update fields:
- **Last Updated** date
- **Current Focus** (if changed)
- **Active Tasks** (mark completed, add new)
- **Test Coverage** (if tests added/removed) - NEW
- **Behaviors Documented** (if behaviors added) - NEW
- **Last Session Summary** (what we just did)
- **Next Priorities** (update based on progress)

**Note:** If dashboard is open (http://localhost:3000/dev/dashboard), refresh page to see updates

**B. Update Behavior Specs (if behaviors tested) - NEW**
Mark behaviors as verified in `docs/specs/behaviors/[domain].md`:
```markdown
**Verified by:**
- **Test:** `tests/integration/.../test.ts` ✅ **4/4 PASSING**

**Acceptance Criteria:**
- [x] Criterion 1 ✅ **TESTED**
- [x] Criterion 2 ✅ **TESTED**
```

**C. Update Feature Docs (if behaviors added) - NEW**
Link behaviors to features in `docs/features/implemented/[feature].md`:
```markdown
**Behaviors:**
- B-GRP-001: Last Leader Protection (verified ✅)
- B-GRP-002: Member Invitation Lifecycle (verified ✅)
```

**D. Update PRODUCT_SPEC.md (if scope changed) - NEW**
Update if:
- Features added/removed from scope
- Success criteria changed
- User personas evolved
- Acceptance criteria modified

**Include in summary:**
- Test results (if tests run)
- Behaviors added/verified (if any)
- Feature docs updated (if any)
- Bugs discovered via tests (if any)

**Show diff to user for approval**

### 4. Create Session Bridge (if significant work)
**If substantial work done:**
- Create file: `docs/planning/sessions/YYYY-MM-DD-brief-description.md`
- Include: summary, decisions, files changed, next steps
- Link from PROJECT_STATUS.md

**Template (Updated for TDD):**
```markdown
# Session: [Brief Description]

**Date:** YYYY-MM-DD
**Duration:** ~X hours
**Version:** 0.2.X

## Summary
[What we did]

## Test Results (NEW)
- Tests added: X
- Tests passing: Y/Z (N%)
- Coverage: Before → After
- Bugs found: [list any]

## Behaviors Documented (NEW)
- [B-DOMAIN-###]: Behavior name
- [B-DOMAIN-###]: Behavior name

## Decisions Made
- Decision 1
- Decision 2

## Files Changed
- Created: [files]
- Modified: [files]
- Deleted: [files]
- **Tests:** [test files]
- **Behaviors:** [behavior spec files] ← Mark as verified ✅
- **Feature Docs:** [feature doc files] ← Link behaviors

## Next Steps
- [ ] Task 1
- [ ] Task 2

## Notes
[Any important notes for next session]
```

### 5. Update Features Database (if applicable)
**If features completed or added:**

```bash
cd dev_databases
node manage_features.js
```

**Update:**
- Mark features as completed
- Add new features discovered
- Update test status

### 6. Update CHANGELOG.md (if version change)
**If implementing a new version:**
- Add version entry
- List all changes
- Update date

### 7. Git Commit (optional but recommended)
**Ask user:**
```
Would you like me to create a git commit?

Changes to commit:
- [list of changed files]

Suggested commit message:
"[type]: [brief description]

- Detail 1
- Detail 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**If user approves:**
```bash
git add [relevant files]
git commit -m "[commit message]"
```

### 8. Final Report
**Present to user:**
```
✅ Session closed for FringeIsland

📝 Summary:
[Brief summary of work done]

🧪 Test Status: (NEW)
- Tests: X total (Y passing, Z%)
- New tests: N added
- Bugs found: M (if any)

📄 Updated:
- PROJECT_STATUS.md
- [Behavior specs: docs/specs/behaviors/... (marked as verified ✅)] (NEW)
- [Feature docs: docs/features/.../... (linked behaviors)] (NEW)
- [Tests: tests/.../...] (NEW)
- [PRODUCT_SPEC.md (if scope changed)] (NEW)
- [ROADMAP.md / not needed]
- [Session bridge created/not needed]
- [Features database updated/not needed]
- [CHANGELOG.md updated/not needed]
- [Git commit: abc123f / not created]

🎯 Next session priorities:
1. Priority 1
2. Priority 2

See you next time! 👋
```

---

## 🔍 Detailed Close-Down Process

### Step 1: Gather Session Information

**Questions to answer:**
1. What was the main focus of this session?
2. What did we complete?
3. What's incomplete?
4. Were any decisions made?
5. Were any issues discovered?
6. What should we work on next?

**Extract from conversation:**
- Features implemented
- Bugs fixed
- Documentation updated
- Code refactored
- Tests written

### Step 2: Update Project Documentation

**A. Update PROJECT_STATUS.md (ALWAYS):**

**Last Updated:**
```markdown
**Last Updated:** 2026-02-04  # Today's date
```

**Current Focus:**
```markdown
**Current Focus:** [Update if changed during session]
```

**Active Tasks:**
```markdown
**Active Tasks:**
- [x] Completed task (mark as done)
- [ ] New task (add if discovered)
- [ ] Existing task (keep if still active)
```

**Last Session Summary:**
```markdown
**Date:** 2026-02-04
**Summary:** [Brief summary of today's work]

**Bridge Doc:** `docs/planning/sessions/2026-02-04-[description].md`

**Files Modified:**
- Created: [list]
- Modified: [list]
```

**Next Priorities:**
```markdown
**Next Priorities:**
1. [Update based on progress]
2. [Reorder if priorities changed]
```

**E. Update ROADMAP.md (if significant progress) ⚠️ docs/planning/ DIRECTORY!**
**File path:** `docs/planning/ROADMAP.md` (NOT root/ROADMAP.md!)

Update these sections if major milestones hit:
- Current phase completion percentage (e.g., 75% → 85%)
- Mark features/deliverables complete (✅)
- Add to "What We've Completed" section
- Update "Current Development Focus"
- Add to "Decision Log" if architectural choices made
- Update feature links if new features completed

**F. Update DEFERRED_DECISIONS.md (if new deferrals) ⚠️ docs/planning/ DIRECTORY!**
**File path:** `docs/planning/DEFERRED_DECISIONS.md` (NOT root!)

Add new entry if you decided NOT to build something:
- Use standard format (Topic, Context, Decision, Deferred To, Notes)
- Explain rationale for deferral
- Include version number
- Prevents re-discussing same decisions later

### Step 3: Create Session Bridge (When Needed)

**Create bridge if:**
- Significant feature work done
- Major decisions made
- Complex changes implemented
- Important insights discovered
- Anything future you needs to know

**Skip bridge if:**
- Minor documentation updates
- Simple bug fixes
- Quick tasks
- No major changes

**Session Bridge Template:**

**File:** `docs/planning/sessions/2026-02-04-brief-description.md`

```markdown
# Session: [Brief Description]

**Date:** YYYY-MM-DD
**Duration:** ~X hours
**Version:** 0.2.X
**Focus:** [Main focus of session]

---

## 📝 Summary

[2-3 paragraphs describing what was done]

---

## ✅ Completed

- [x] Implemented feature X
- [x] Fixed bug Y
- [x] Updated documentation Z

---

## 🔧 Technical Changes

### Files Created
- `path/to/file1.ts`
- `path/to/file2.tsx`

### Files Modified
- `path/to/existing1.ts` - [What changed]
- `path/to/existing2.tsx` - [What changed]

### Database Changes
- [Migration applied / None]
- [Tables modified / None]

---

## 💡 Decisions Made

1. **Decision 1**: [Rationale]
2. **Decision 2**: [Rationale]

---

## ⚠️ Issues Discovered

- Issue 1: [Description and status]
- Issue 2: [Description and status]

---

## 🎯 Next Steps

Priority order for next session:

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

---

## 📚 Context for Next Session

**What you need to know:**
- [Important context]
- [Decisions that affect future work]
- [Gotchas or tricky parts]

**Useful docs:**
- `docs/features/implemented/[feature].md`
- `docs/agents/contexts/[agent].md`

---

## 🔗 Related

- **Feature docs:** [links]
- **Migration:** [if applicable]
- **Previous session:** [if continuing work]
```

### Step 4: Update Features Database

**If features were completed:**

```bash
# Navigate to database directory
cd dev_databases

# Run management script
node manage_features.js

# Follow prompts to:
# - Mark features as completed
# - Add completion date
# - Update status
# - Link to documentation
```

**If new features discovered:**
- Add to features database
- Mark as "planned" or "in-progress"
- Document requirements

### Step 5: Update CHANGELOG.md (Version Changes)

**If this session completes a version:**

```markdown
## [0.2.X] - 2026-02-04

### Added
- Feature X with Y functionality
- Component Z for ABC

### Changed
- Updated X to support Y
- Refactored Z for performance

### Fixed
- Bug in X when Y
- Error handling in Z

### Technical Details
- Database changes: [summary]
- New files: X
- Modified files: Y
```

### Step 6: Git Commit

**Commit Message Format:**
```
[type]: [brief description]

- Detail 1
- Detail 2
- Detail 3

[Optional: Additional context]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

**Example:**
```bash
git add [relevant files]

git commit -m "$(cat <<'EOF'
feat: Add journey content delivery system

- Created step navigation component
- Added progress tracking
- Implemented content rendering
- Updated journey detail page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## 💡 Close-Down Scenarios

### Scenario 1: Feature Completion
**Significant work done:**

1. **Summarize:** "Completed journey enrollment feature with individual and group enrollment"
2. **Update:** PROJECT_STATUS.md (mark feature complete)
3. **Create:** Session bridge with full details
4. **Update:** Features database (mark complete)
5. **Update:** CHANGELOG.md (add to version notes)
6. **Commit:** Git commit with comprehensive message
7. **Report:** Full session summary

### Scenario 2: Bug Fix
**Minor work done:**

1. **Summarize:** "Fixed RLS recursion bug in journey enrollments"
2. **Update:** PROJECT_STATUS.md (brief mention in last session)
3. **Skip:** Session bridge (not needed for single bug fix)
4. **Skip:** Features database (bug fix, not feature)
5. **Update:** CHANGELOG.md (add to Fixed section)
6. **Commit:** Git commit with fix details
7. **Report:** Brief summary

### Scenario 3: Documentation Update
**Documentation only:**

1. **Summarize:** "Restructured project documentation"
2. **Update:** PROJECT_STATUS.md
3. **Create:** Session bridge (restructuring is significant)
4. **Skip:** Features database (no feature changes)
5. **Skip:** CHANGELOG.md (documentation doesn't version)
6. **Commit:** Git commit with docs changes
7. **Report:** What was reorganized, how to find things now

### Scenario 4: Work in Progress
**Incomplete work:**

1. **Summarize:** "Started journey content delivery, not complete"
2. **Update:** PROJECT_STATUS.md (add task as active)
3. **Create:** Session bridge with context for resuming
4. **Skip:** Features database (feature not complete)
5. **Skip:** CHANGELOG.md (nothing to announce)
6. **Commit:** Git commit OR leave uncommitted (ask user)
7. **Report:** What's done, what's left, blockers

---

## 📊 Close-Down Decision Tree

```
START
  ↓
Summarize work done
  ↓
Significant work?
  ├─ Yes → Create session bridge
  └─ No → Skip bridge
  ↓
Feature complete?
  ├─ Yes → Update features database
  └─ No → Skip features DB
  ↓
Version change?
  ├─ Yes → Update CHANGELOG.md
  └─ No → Skip changelog
  ↓
Update PROJECT_STATUS.md (always)
  ↓
Ask about git commit
  ├─ Yes → Stage & commit files
  └─ No → Skip commit
  ↓
Present final report
  ↓
END
```

---

## 🎯 Close-Down Outputs

### Minimal Output (Quick Task)
```
✅ Session closed

Updated PROJECT_STATUS.md
No git commit created

Next: Continue with journey content delivery
```

### Standard Output (Normal Session)
```
✅ Session closed for FringeIsland

📝 Summary:
Fixed RLS recursion bug in journey enrollments

📄 Updated:
- PROJECT_STATUS.md
- CHANGELOG.md (v0.2.10)

💾 Git commit: abc123f
"fix: Resolve RLS recursion in journey enrollments"

🎯 Next session:
Continue with journey content delivery

See you next time! 👋
```

### Detailed Output (Major Work)
```
✅ Session closed for FringeIsland v0.2.10

📝 Summary:
Completed comprehensive documentation restructuring:
- Created INDEX.md master navigation
- Organized session bridges in planning/sessions/
- Created database/ directory for DB docs
- Created features/ directory for feature specs
- Created agents/ directory for AI agent contexts
- Created workflows/ directory (boot-up, close-down)

📄 Documentation updated:
- PROJECT_STATUS.md (updated current status)
- docs/INDEX.md (created - master index)
- docs/README.md (updated to v0.2.10)
- docs/database/schema-overview.md (created)
- docs/database/migrations-log.md (created)
- docs/features/implemented/authentication.md (created)
- docs/features/implemented/journey-system.md (created)
- docs/agents/README.md (created)
- docs/agents/contexts/database-agent.md (created)
- docs/agents/contexts/ui-agent.md (created)
- docs/agents/contexts/feature-agent.md (created)
- docs/workflows/boot-up.md (created)
- docs/workflows/close-down.md (created - this file!)

💡 Key decisions:
1. Use minimal SQLite (features + sessions only)
2. Agent-specific contexts for focused work
3. Boot-up/close-down workflows for continuity

📦 Files created: 15
📝 Files modified: 3

🔗 Session bridge: docs/planning/sessions/2026-02-04-restructuring.md

💾 Git commit ready:
Would you like me to commit these changes?

Suggested message:
"docs: Complete project documentation restructuring

- Create INDEX.md master navigation
- Organize session bridges
- Create agent-specific contexts
- Add boot-up/close-down workflows
- Consolidate database documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

🎯 Next session priorities:
1. Complete Phase 4 (SQLite schema update)
2. Complete Phase 5 (streamline CLAUDE.md)
3. Test new workflows

Excellent work today! See you next time! 👋
```

---

## 📝 Notes

**Close-down is important:**
- Captures work for continuity
- Documents decisions
- Prevents lost context
- Enables smooth handoffs
- Maintains project memory

**Be thorough but efficient:**
- Don't over-document simple tasks
- Do document complex work
- Always update PROJECT_STATUS.md
- Create bridges for significant work

---

## 🔗 Related Workflows

- **Boot Up:** `docs/workflows/boot-up.md`
- **TDD Workflow:** `docs/workflows/tdd-workflow.md`
- **Project Status:** `PROJECT_STATUS.md`
- **Product Spec:** `docs/planning/PRODUCT_SPEC.md`
- **Session Bridges:** `docs/planning/sessions/`

---

**The close-down workflow ensures continuity between sessions and creates a clear record of progress. Never skip it for significant work!**
