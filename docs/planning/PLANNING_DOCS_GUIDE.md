# Planning Documentation Guide

**Purpose:** How to use and maintain ROADMAP.md and DEFERRED_DECISIONS.md
**Last Updated:** February 4, 2026

---

## 📋 Overview

FringeIsland has two critical planning documents that work together:

1. **ROADMAP.md** - What we ARE building and when
2. **DEFERRED_DECISIONS.md** - What we're NOT building and why

Both are now integrated into boot-up and close-down workflows.

---

## 📖 ROADMAP.md

**Location:** `docs/planning/ROADMAP.md`
**Current Version:** 1.3 (updated Feb 4, 2026)
**Status:** 85% Phase 1 complete

### What It Contains

**Phase Breakdown:**
- Phase 1: Foundation (85% complete)
  - Weeks 1-16 broken into sub-phases
  - Current focus: Phase 1.4 (Journey System)
- Phase 2: User-Generated Content
- Phase 3: Dynamic Journeys
- Phase 4: Developer Platform

**Progress Tracking:**
- Completion percentages
- What's done (✅), in progress (🔄), not started (⏳)
- Version history with dates
- Current sprint focus

**Decision Log:**
- Architectural decisions made
- When and why decisions were made
- Links to relevant code/migrations

**Success Metrics:**
- Phase 1: 100+ users, 10+ groups, 50+ enrollments
- Future phases: detailed metrics for each

### When to Update

**Update ROADMAP.md when:**
- ✅ Feature/phase completed
- 📊 Completion percentage changes significantly (±10%)
- 🎯 Priorities shift
- 🏗️ Major architectural decision made
- 📅 Milestones hit or missed

**During close-down workflow:**
- Mark features complete
- Update completion percentage
- Add to "What We've Completed" section
- Update "Current Development Focus"
- Add to Decision Log

### How to Read During Boot-Up

**Quick scan (30 seconds):**
```
1. Check: Phase completion percentage
   Current: "Phase 1: 85% Complete"

2. Check: Current focus
   Current: "Journey content delivery (next up)"

3. Check: Recent completions
   Latest: v0.2.10 - Journey enrollment

4. Check: Next sprint priority
   Next: Journey content delivery + Progress tracking
```

**When user asks "What's next?":**
- Point to "Next Sprint" section
- Reference specific phase deliverables
- Show success criteria for current phase

---

## 🚫 DEFERRED_DECISIONS.md

**Location:** `docs/planning/DEFERRED_DECISIONS.md`
**Current Version:** 1.2 (updated Feb 4, 2026)
**Size:** 1100+ lines of detailed analysis

### What It Contains

**Deferred Topics:**
- Permission inheritance (Phase 2)
- Subgroups implementation (Phase 2)
- Journey versioning (Phase 2)
- Dynamic journey paths (Phase 3)
- Advanced analytics (Phase 2)
- Multi-language support (Post-Phase 1)
- Mobile apps (Phase 2+)
- And 15+ more...

**For Each Deferral:**
- **Topic:** What question or feature
- **Context:** Why it came up
- **Decision:** What was decided for now
- **Deferred To:** Which phase to revisit
- **Notes:** Implementation considerations
- **Rationale:** Why deferred (complexity, time, validation needed)

### When to Update

**Add new deferral when:**
- User requests feature that's out of scope
- Team discusses feature and decides to defer
- Architectural decision defers complexity
- Phase planning pushes feature to later phase

**Update existing deferral when:**
- New information changes context
- Implementation approach evolves
- Dependencies change
- Deferral becomes less/more important

**During close-down workflow:**
- Add entry if you deferred something
- Use standard format
- Explain rationale clearly
- Include version number

### How to Use During Session

**When user asks "Can we add X?":**

1. Check DEFERRED_DECISIONS.md
2. If already documented:
   ```
   "We've already considered X. It's deferred to Phase 2 because
   [reason from doc]. Would you like to revisit that decision?"
   ```
3. If not documented and you're deferring:
   ```
   "Let's defer X because [reason]. I'll add it to
   DEFERRED_DECISIONS.md so we remember the rationale."
   ```

**Prevents:**
- Re-discussing same decisions
- Scope creep
- Building premature features
- Forgetting why something was deferred

---

## 🔄 Integration with Workflows

### Boot-Up Workflow

**Step 1: Read Current Status**
```
1. Read PROJECT_STATUS.md (always)
2. Quick scan ROADMAP.md:
   - Phase completion %
   - Current sprint priorities
   - Recent completions
3. Read DEFERRED_DECISIONS.md (only if relevant):
   - User asks "Why don't we have X?"
   - Planning session to understand scope
```

**Example Boot-Up Message:**
```
🚀 FringeIsland v0.2.10 ready

📊 Phase 1: 85% complete
🎯 Current: Journey content delivery (next priority)
✅ Recent: Journey enrollment complete (v0.2.10)

📚 Context loaded:
- PROJECT_STATUS.md
- ROADMAP.md (Phase 1.4 context)
- CLAUDE.md (technical patterns)

What would you like to work on?
```

### Close-Down Workflow

**Step 2: Update Project Documentation**
```
A. PROJECT_STATUS.md (ALWAYS)
   - Update current focus
   - Mark tasks complete
   - Update last session summary

B. ROADMAP.md (if significant progress)
   - Feature complete? Mark it ✅
   - Phase milestone? Update percentage
   - Major decision? Add to Decision Log
   - New version? Add to "What We've Completed"

C. DEFERRED_DECISIONS.md (if new deferrals)
   - User requested feature? Document why deferred
   - Architectural choice? Document simpler approach chosen
   - Scope decision? Document what's out of MVP
```

**Example Close-Down Checklist:**
```
✅ Updated PROJECT_STATUS.md (current focus, tasks)
✅ Updated ROADMAP.md (Phase 1.4: 85% → 90%)
⏭️ DEFERRED_DECISIONS.md (no new deferrals)
✅ Created session bridge
✅ Git commit created
```

---

## 📐 Best Practices

### For ROADMAP.md

**Do:**
- ✅ Update completion % when significant progress made
- ✅ Mark features complete with ✅ when done
- ✅ Add to Decision Log when architectural choices made
- ✅ Keep "Current Development Focus" up-to-date
- ✅ Update version numbers and dates

**Don't:**
- ❌ Update for minor changes (wait for milestones)
- ❌ Remove historical information (keep it!)
- ❌ Change past decisions (add new ones instead)
- ❌ Make it a daily journal (that's for session bridges)

### For DEFERRED_DECISIONS.md

**Do:**
- ✅ Document WHY something was deferred
- ✅ Include enough context for future revisit
- ✅ Update when new information emerges
- ✅ Use standard format for consistency
- ✅ Include implementation notes for future

**Don't:**
- ❌ Use it for bugs (that's for issue tracker)
- ❌ Defer everything (choose battles wisely)
- ❌ Skip rationale (future you needs to understand)
- ❌ Delete old decisions (mark as "Implemented" instead)

---

## 🔍 Quick Reference

### When to Check Each File

| Situation | Check | Why |
|-----------|-------|-----|
| Starting session | PROJECT_STATUS.md + ROADMAP.md (quick scan) | Current state + priorities |
| User asks "What's next?" | ROADMAP.md (Next Sprint) | Immediate priorities |
| User asks "Why no X?" | DEFERRED_DECISIONS.md | Rationale for deferral |
| Feature complete | ROADMAP.md | Mark it done, update % |
| Deferring feature | DEFERRED_DECISIONS.md | Document decision |
| Planning next phase | ROADMAP.md + DEFERRED_DECISIONS.md | Full context |

### Update Frequency

| File | Update Frequency | Trigger |
|------|-----------------|---------|
| PROJECT_STATUS.md | Every session | Always update |
| ROADMAP.md | Weekly or milestone | Significant progress |
| DEFERRED_DECISIONS.md | As needed | New deferrals only |

---

## 💡 Tips

### Keeping Docs Current

**Set reminders:**
- Update ROADMAP.md at end of each week
- Review DEFERRED_DECISIONS.md quarterly
- Check all docs before major release

**Use close-down workflow:**
- Checklist ensures nothing forgotten
- Systematic approach prevents missed updates
- Habits form through repetition

### Preventing Stale Docs

**Include in close-down:**
- "Did we complete a phase/feature?" → Update ROADMAP
- "Did we defer something?" → Update DEFERRED_DECISIONS
- "Did priorities change?" → Update both

**Version numbers help:**
- Both files have version numbers
- Update version number when making changes
- Helps track when last updated

---

## 🎯 Success Metrics

**Well-maintained planning docs enable:**
- ✅ AI agents quickly understand what's next
- ✅ Reduced "What should I work on?" questions
- ✅ Prevented scope creep (deferred decisions clear)
- ✅ Historical context preserved
- ✅ Smoother phase transitions
- ✅ Better prioritization decisions

**Signs docs need attention:**
- ❌ Completion % doesn't match reality
- ❌ "Current Focus" is outdated
- ❌ User keeps asking about deferred features
- ❌ Can't remember why decision was made
- ❌ Last updated >1 month ago

---

## 📚 Related Documentation

- **PROJECT_STATUS.md** - Day-to-day current state
- **CHANGELOG.md** - Version history (what changed)
- **docs/INDEX.md** - Master documentation navigation
- **docs/workflows/boot-up.md** - Starting a session
- **docs/workflows/close-down.md** - Ending a session

---

**These planning documents are your project's memory. Keep them current, and they'll keep you focused.**
