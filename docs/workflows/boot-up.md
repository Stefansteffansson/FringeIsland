# Session Boot-Up Workflow

**Purpose:** Standard procedure for starting a work session on FringeIsland
**For:** AI assistants and developers starting a new session
**Last Updated:** February 9, 2026

---

## 🎯 Quick Boot-Up

**For AI Assistants:**
When user says "Boot up FringeIsland" or starts a new session, follow this workflow.

---

## 📋 Boot-Up Checklist

### 1. Read Current Status
**Files:**
- `PROJECT_STATUS.md` (root directory) - Current state
- `docs/planning/ROADMAP.md` - Phase progress and priorities
- `docs/VISION.md` - Why we're building this (optional, for new features or context)
- `docs/planning/PRODUCT_SPEC.md` - What we're building (optional, for new features)
- `docs/planning/DEFERRED_DECISIONS.md` - What we're NOT building (optional, if relevant)

**Extract from PROJECT_STATUS.md:**
- Current version
- What we're working on now
- Active tasks
- Any blockers
- Next priorities

**Quick scan ROADMAP.md for:**
- Current phase completion percentage
- Immediate next priorities
- Recent completions

**Report to user:**
```
🚀 Booting up FringeIsland v0.2.10

📍 Current focus: [from PROJECT_STATUS.md]

📝 Active tasks:
- Task 1
- Task 2

⚠️ Blockers: [None / List blockers]

🎯 Next priorities:
- Priority 1
- Priority 2
```

### 2. Check Git Status
**Command:** `git status`

**Check for:**
- Uncommitted changes
- Untracked files
- Current branch
- Ahead/behind remote

**Report:**
```
📁 Git status:
✅ Clean working directory
OR
⚠️ X uncommitted files, Y untracked files
```

### 3. Check Test Status (NEW - Since v0.2.10+)
**Command:** `npm test -- --listTests | wc -l` (count) or check PROJECT_STATUS.md

**Check:**
- Current test coverage (from PROJECT_STATUS.md)
- Any failing tests from last session
- Blockers related to test failures

**Report:**
```
🧪 Test coverage:
- Tests: X total (Y passing, Z% coverage)
- Status: ✅ All passing / ⚠️ N failing
- Blockers: [List any test-related blockers]
```

**If tests failing:**
- Prioritize fixing tests before new work
- Load relevant behavior specs

### 4. Load Core Context
**Always load:** `CLAUDE.md` (auto-loaded by system)

**Optionally load based on work type:**
- Database work → `docs/agents/contexts/database-agent.md`
- UI work → `docs/agents/contexts/ui-agent.md`
- Feature work → `docs/agents/contexts/feature-agent.md`
- Specific feature → `docs/features/implemented/[feature].md`
- **Testing/TDD work** → `docs/specs/behaviors/[domain].md` + `docs/workflows/tdd-workflow.md`

**NEW: If building new feature:**
- **FIRST:** Verify feature context (see TDD workflow Phase 0):
  - Check `docs/planning/PRODUCT_SPEC.md` - Is feature listed?
  - Check `docs/features/[feature].md` - Does feature doc exist?
  - If missing, create feature doc first or ask user
- Load `docs/VISION.md` (optional, understand "why")
- Load `docs/planning/PRODUCT_SPEC.md` (verify feature scope)
- Load relevant behavior specs from `docs/specs/behaviors/`
- Load TDD workflow from `docs/workflows/tdd-workflow.md`
- Remind about full BDD hierarchy (Vision → Product Spec → Roadmap → Features → Behaviors → Tests → Code)

**Report:**
```
📚 Context loaded:
- CLAUDE.md (technical patterns)
- VISION.md (optional, for new features)
- PRODUCT_SPEC.md (optional, for new features)
- [agent-context].md (if relevant)
- [feature docs] (if specified)
- [behavior specs] (if TDD work)
- TDD workflow (if building new feature)
```

### 5. Ask User
**Prompt user:**
```
✅ Ready to work on FringeIsland v0.2.10

What would you like to work on today?

Suggestions based on PROJECT_STATUS.md:
1. [Active task 1]
2. [Active task 2]
3. [Next priority 1]

💡 Reminder: We use TDD for new features (spec → test → implement)
```

**If building new feature, remind:**
```
Building new feature? Follow TDD workflow (docs/workflows/tdd-workflow.md):

0. Verify feature context:
   - Feature in Product Spec? (docs/planning/PRODUCT_SPEC.md)
   - Feature doc exists? (docs/features/[feature].md)

1. Write behavior spec (docs/specs/behaviors/[domain].md)
2. Write tests (tests/integration/[domain]/[feature].test.ts)
3. Run tests (should fail - RED)
4. Implement feature (database → backend → frontend)
5. Run tests (should pass - GREEN)
6. Refactor and document

Full process: Vision → Product Spec → Roadmap → Features → Behaviors → Tests → Code
```

---

## 🔍 Detailed Boot-Up Process

### Step 1: Read Project Status
```typescript
// PRIMARY: /PROJECT_STATUS.md
Read and extract:
- Current Version
- Current Focus
- Active Tasks
- Blockers
- Next Priorities
- Last Session Summary

// SECONDARY: /docs/planning/ROADMAP.md (quick scan)
Extract:
- Phase completion percentage (e.g., "Phase 1.4: 85% complete")
- Current Sprint priorities
- What's next after current work

// OPTIONAL: /docs/planning/DEFERRED_DECISIONS.md
Read ONLY if user asks about a feature:
- "Why don't we have X?" → Check deferred decisions
- Prevents re-discussing already-decided deferrals
```

### Step 2: Quick System Check
```bash
# Check git status
git status

# Check branch
git branch --show-current

# Recent commits (optional)
git log --oneline -5
```

### Step 3: Context Selection
**Ask user (if not specified):**
```
What type of work will you be doing?

1. Database changes (schema, migrations, RLS)
2. UI components (styling, forms, modals)
3. Feature development (full-stack)
4. Bug fixing
5. Documentation
6. Other (specify)
```

**Load appropriate context:**
- Option 1 → database-agent.md
- Option 2 → ui-agent.md
- Option 3 → feature-agent.md
- Option 4 → Based on bug location
- Option 5 → No additional context
- Option 6 → Ask for specifics

### Step 4: Feature-Specific Context (Optional)
**If working on specific feature:**
```
Which feature will you be working on?

1. Authentication
2. Groups
3. Journeys
4. Member Management
5. Role Management
6. Other (specify)
```

**Load feature doc:**
`docs/features/implemented/[feature].md`

### Step 5: Ready State
**Present summary to user:**
```
🎉 Boot-up complete!

📊 Project: FringeIsland v0.2.10
🎯 Focus: [Current focus from PROJECT_STATUS.md]
📚 Context: [Loaded contexts]
📁 Git: [Clean / X uncommitted files]
🌿 Branch: [branch name]

Ready to work. What's first?
```

---

## 💡 Boot-Up Scenarios

### Scenario 1: Continuing Previous Work
**User:** "Boot up FringeIsland, continuing from last session"

**Actions:**
1. Read PROJECT_STATUS.md
2. Check "Last Session Summary"
3. Load same contexts as last session
4. Check git status
5. Ask: "Ready to continue with [last session work]?"

### Scenario 2: Starting New Feature
**User:** "Boot up FringeIsland, working on notifications feature"

**Actions:**
1. Read PROJECT_STATUS.md
2. **Check PRODUCT_SPEC.md** - Is "notifications" listed as a feature?
3. **Check docs/features/** - Does feature doc exist?
4. If missing, alert user: "Feature not in Product Spec. Should we add it first?"
5. Load feature-agent.md context
6. Load TDD workflow (docs/workflows/tdd-workflow.md)
7. Check git status
8. Ask: "Planning or implementing notifications?"

### Scenario 3: Bug Fix
**User:** "Boot up FringeIsland, fixing a bug in group invitations"

**Actions:**
1. Read PROJECT_STATUS.md
2. Load groups feature doc
3. Ask: "What's the bug? I'll load relevant context."
4. Based on answer, load database-agent.md or ui-agent.md
5. Check git status
6. Ready to investigate

### Scenario 4: Quick Task
**User:** "Boot up FringeIsland, just need to update documentation"

**Actions:**
1. Read PROJECT_STATUS.md (brief)
2. No additional context needed
3. Check git status
4. Ask: "Which docs need updating?"

---

## 📊 Boot-Up Flowchart

```
START
  ↓
Read PROJECT_STATUS.md
  ↓
Present current state to user
  ↓
Check git status
  ↓
Ask: "What will you work on?"
  ↓
  ├─→ Database work → Load database-agent.md
  ├─→ UI work → Load ui-agent.md
  ├─→ Feature work → Load feature-agent.md
  ├─→ Specific feature → Load feature doc
  ├─→ Documentation → No additional context
  └─→ Other → Ask for details
  ↓
Present ready state
  ↓
READY TO WORK
```

---

## 🎯 Boot-Up Outputs

### Minimal Output (Quick Start)
```
FringeIsland v0.2.10 ready
Current focus: Journey content delivery
Git: Clean
What would you like to work on?
```

### Standard Output (Normal Start)
```
🚀 Booting up FringeIsland v0.2.10

📍 Current focus: Journey content delivery system
📝 Active tasks:
- Complete journey content rendering
- Add progress tracking

📁 Git: Clean working directory
🌿 Branch: main

📚 Loaded: CLAUDE.md (technical patterns)

What would you like to work on?
```

### Detailed Output (Context-Rich Start)
```
🚀 Booting up FringeIsland v0.2.10

📍 Current focus: Journey content delivery system

📝 Active tasks:
- Complete journey content rendering
- Add progress tracking

📊 Project stats:
- Phase: 1.4 - Journey System (85% complete)
- Total tables: 13
- Recent version: v0.2.10 (Journey Enrollment)

📁 Git status:
✅ Clean working directory
🌿 Branch: main
📍 Last commit: "Complete documentation restructuring"

📚 Context loaded:
- CLAUDE.md (technical patterns - auto)
- feature-agent.md (full-stack development)
- journey-system.md (feature docs)

🎯 Next priorities:
1. Journey content delivery
2. Progress tracking
3. Communication system (Phase 1.5)

Ready to work. What's first?
```

---

## 🔧 Customization

### For Specific Team Members
**Developer A (frontend focus):**
- Always load ui-agent.md
- Skip database details
- Show only UI-related tasks

**Developer B (backend focus):**
- Always load database-agent.md
- Skip UI details
- Show only backend-related tasks

### For Project Phase
**Early development (foundation):**
- Show all details
- Load all contexts
- Explain patterns

**Later development (maintenance):**
- Minimal output
- Only load relevant context
- Skip basics

---

## 📝 Notes

**Boot-up is flexible:**
- Adapt to user preferences
- Skip steps if user specifies ("Just help me fix X")
- Load more context if needed during work
- Don't overload with information

**Goal:**
- Get user productive quickly
- Provide relevant context
- Avoid information overload
- Enable focused work

---

## 🔗 Related Workflows

- **Close Down:** `docs/workflows/close-down.md`
- **Project Status:** `PROJECT_STATUS.md`
- **Agent Contexts:** `docs/agents/README.md`

---

**Example Usage:**

```
User: "Boot up FringeIsland"