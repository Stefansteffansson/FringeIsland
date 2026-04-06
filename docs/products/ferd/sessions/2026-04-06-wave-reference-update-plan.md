# Wave Reference Update Plan

**Date:** 2026-04-06
**Status:** EXECUTED — all categories complete
**Trigger:** 6-wave restructuring (ADR-U022 amendment) left stale references across the repo

---

## Scope

This plan covers **every .md file in the repo** (excluding `node_modules/`). Files in `_archive/` folders are flagged but recommended to leave untouched (historical record).

**Source of truth:** ADR-U022 — Ferd (Wave 1) > Eid (Wave 2) > Hamn (Wave 3) > Heim (Wave 4) > Brim (Wave 5) > Urd (Beyond)

**Critical context:** Hamn was previously Wave 2, now it's Wave 3. Eid is the new Wave 2. Many files still say "Wave 2 (Hamn)" which is now **wrong**.

---

## Category A: "Wave 2 (Hamn)" in ACTIVE Files (HIGH PRIORITY)

These files contain "Wave 2 (Hamn)" or "deferred to Hamn" where Hamn was meant as old-Wave-2. Each needs careful review — some should become "Wave TBD" (pending redistribution), some should become "Wave 3 (Hamn)", and some should just say the correct wave.

### A1. Behavior Specs (active, read by agents)

| File | Lines | Current Text | Proposed Change |
|------|-------|-------------|-----------------|
| `docs/products/ferd/development/specs/groups.md` | ~207, ~259 | "deferred — audit trail, Wave 2 (Hamn)" | → "deferred — audit trail, Wave TBD (see WAVE_REDISTRIBUTION.md)" |
| `docs/products/ferd/development/specs/authentication.md` | ~85 | "deferred — Wave 2 (Hamn)" | → "deferred — Wave TBD (see WAVE_REDISTRIBUTION.md)" |
| `docs/products/ferd/development/specs/authentication.md` | ~113 | "reactivation page deferred to Wave 2 (Hamn)" | → "deferred to Wave TBD" |
| `docs/products/ferd/development/specs/authentication.md` | ~307 | "B-AUTH-008: OAuth Integration (deferred to Wave 2 (Hamn))" | → "deferred to Wave TBD" |
| `docs/products/ferd/development/specs/journeys.md` | ~257, ~350, ~592 | "Wave 2 (Hamn) consideration", "Future (Wave 2 (Hamn))" | → "Wave TBD (see WAVE_REDISTRIBUTION.md)" |
| `docs/products/ferd/development/specs/messaging.md` | ~200 | "notification batching is deferred to Wave 2 (Hamn)+" | → "deferred to Wave TBD" |
| `docs/products/ferd/development/specs/roles.md` | ~180 | "deferred to Wave 2 (Hamn)" | → "deferred to Wave TBD" |
| `docs/products/ferd/development/specs/roles.md` | ~289 | "deferred to Wave 2 (Hamn)" | → "deferred to Wave TBD" |

### A2. Feature Docs (active, read by agents)

| File | Lines | Current Text | Proposed Change |
|------|-------|-------------|-----------------|
| `docs/products/ferd/development/features/FR-authentication.md` | ~326 | "Password reset UI (deferred to Wave 2 (Hamn))" | → "deferred to Wave TBD" |
| `docs/products/ferd/development/features/AR-deusex-admin-foundation.md` | ~34 | "Deferred to Wave 2 (Hamn)+" | → "Deferred to Wave TBD" |

### A3. Planning Docs (active, read during boot-up)

| File | Lines | Current Text | Proposed Change |
|------|-------|-------------|-----------------|
| `docs/products/ferd/planning/DEFERRED.md` | ~42 | "Accepted by Hamn → Hamn PRODUCT_SPEC.md §1 Journey Designer" | → "Wave TBD — pending redistribution (old Hamn scope archived)" |
| `docs/products/ferd/planning/DEFERRED.md` | ~228 | "Accepted by Hamn → Hamn PRODUCT_SPEC.md M1 milestone" | → "Wave TBD — pending redistribution" |
| `docs/products/ferd/planning/ROADMAP.md` | ~91 | "Wave 2 (Hamn), Wave 3, and Wave 3+" | → rewrite to reference the old model correctly |
| `docs/products/ferd/planning/ROADMAP.md` | ~147-148 | "plan Wave 2+", "Complete Wave 2+ foundation" | → "plan Eid+" or "plan post-Ferd waves" |
| `docs/products/ferd/planning/ROADMAP.md` | ~170 | "when Wave 2+ specification sessions begin" | → "when Eid specification sessions begin" |

### A4. Status/Tracking Docs

| File | Lines | Current Text | Proposed Change |
|------|-------|-------------|-----------------|
| `docs/implementation/ferd/status/KANBAN.md` | ~41 | "## Deferred (Hamn / Wave 2+)" | → "## Deferred (Wave TBD — see WAVE_REDISTRIBUTION.md)" |
| `docs/products/ferd/specification/REQUIREMENTS.md` | ~1939 | "DEFERRED to Hamn" | → "DEFERRED to Wave TBD" |

### A5. Active Session Files (historical content, but not in _archive/)

These session files contain old wave models in their body text. Most already have correct ADR-U022 header notes. Recommend adding a brief note where missing, but leaving body text as historical record.

| File | Lines | Issue |
|------|-------|-------|
| `docs/products/ferd/sessions/2026-02-SESSION-03-architecture-summary.md` | ~295 | "Wave 1 (Ferd) → Wave 2 (Hamn) → Wave 3 → Wave 3+ (Game)" |
| `docs/products/ferd/sessions/2026-02-SESSION-03-architecture-journey-summary.md` | ~237 | Same old 4-wave model |
| `docs/products/ferd/sessions/2026-01-SESSION-01-bridge.md` | ~35-36, ~145 | "Wave 2: Hamn", old Wave 3/3+ |
| `docs/products/ferd/sessions/2026-02-SESSION-03-bridge.md` | ~87, ~157 | "Game (Wave 3+)", implies Hamn = Wave 2 |
| `docs/products/ferd/sessions/2026-03-25-SESSION-02-journey-designer.md` | ~239, ~263, ~277, ~292 | "later wave (Hamn or beyond)" — meant old Wave 2 Hamn |

---

## Category B: Ambiguous "Hamn" References Without Wave Number (MEDIUM PRIORITY)

These say "Hamn" without specifying which wave — readers may assume it's still Wave 2.

| File | Line | Current Text | Proposed Change |
|------|------|-------------|-----------------|
| `docs/products/ferd/specification/PRODUCT_SPEC.md` | ~78 | "(full tools in Hamn)" | → "(full tools in Wave 3 — Hamn)" |
| `docs/products/ferd/specification/PRODUCT_SPEC.md` | ~146 | "(additional languages in Hamn)" | → "(additional languages in Wave 3 — Hamn)" |
| `docs/products/ferd/specification/PRODUCT_SPEC.md` | ~162 | "Out of Scope (Hamn / Wave TBD+)" | → "Out of Scope (Wave 2+ — see WAVE_REDISTRIBUTION.md)" |
| `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md` | ~94 | "*Begins in Hamn.*" (Online Seasonal Events) | → "*Begins in Wave 3 (Hamn).*" |
| `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md` | ~111 | "*Wave 3 ambition.*" (Annual Summit) | Verify this is correct — was this "Wave 3" in the old numbering? If so → needs updating |
| `docs/products/ferd/planning/ROADMAP.md` | ~163 | "Hamn journey system" | → "Wave 3 (Hamn) journey system" or remove Hamn reference |

---

## Category C: Stale File Path References (HIGH PRIORITY)

These reference paths from the old folder structure that no longer exist.

### C1a. Planning docs — stale `docs/features/`, `docs/workflows/`, `docs/planning/` paths

| File | Stale Path | Correct Path |
|------|-----------|-------------|
| `docs/products/ferd/planning/ROADMAP.md:35` | `docs/workflows/feature-development.md` | `docs/products/ferd/development/WORKFLOW.md` |
| `docs/products/ferd/planning/ROADMAP.md:59` | `docs/features/implemented/` | `docs/products/ferd/development/features/` |
| `docs/products/ferd/planning/ROADMAP.md:60` | `docs/planning/lifecycle-roadmap-decisions.md` | `docs/products/ferd/planning/LIFECYCLE_DECISIONS.md` |
| `docs/products/ferd/planning/DEFERRED.md:25` | `docs/features/implemented/dynamic-permissions-system.md` | `docs/products/ferd/development/features/AR-dynamic-permissions-system.md` |
| `docs/products/ferd/planning/DEFERRED.md:102` | `docs/features/implemented/dynamic-permissions-system.md` | (same as above) |
| `docs/products/ferd/planning/DEFERRED.md:124` | `docs/features/implemented/dynamic-permissions-system.md` | (same as above) |
| `docs/products/ferd/planning/LIFECYCLE_DECISIONS.md:308` | `docs/features/implemented/platform-exit.md` | `docs/products/ferd/development/features/FR-platform-exit.md` |

### C1b. Behavior specs — stale `docs/features/` paths

| File | Stale Path | Correct Path |
|------|-----------|-------------|
| `docs/products/ferd/development/specs/rbac.md:5` | `docs/features/implemented/dynamic-permissions-system.md` | `docs/products/ferd/development/features/AR-dynamic-permissions-system.md` |
| `docs/products/ferd/development/specs/display-name.md:5` | `docs/features/implemented/display-name-system.md` | `docs/products/ferd/development/features/FR-display-name-system.md` |
| `docs/products/ferd/development/specs/admin.md:5` | `docs/features/implemented/deusex-admin-foundation.md` | `docs/products/ferd/development/features/AR-deusex-admin-foundation.md` |

### C1c. Agent playbooks — stale `docs/agents/` paths (~21 references)

The agent system's own internal cross-references were never updated after the move.

| File | Lines | Stale Pattern | Correct Pattern |
|------|-------|--------------|-----------------|
| `agents/README.md` | ~98, ~103 | `docs/agents/contexts/`, `docs/agents/learnings/` | `docs/products/ferd/development/agents/contexts/`, `.../learnings/` |
| `agents/contexts/ui-agent.md` | ~626, ~657, ~661 | `docs/features/implemented/`, `docs/agents/learnings/ui.md` | corrected paths |
| `agents/contexts/test-agent.md` | ~26, ~27, ~75, ~258, ~262, ~299, ~306 | `docs/specs/behaviors/`, `docs/agents/learnings/testing.md` | corrected paths |
| `agents/contexts/qa-agent.md` | ~26, ~109, ~163, ~206, ~210, ~218, ~221, ~222 | `docs/specs/behaviors/`, `docs/agents/learnings/qa.md`, `docs/agents/contexts/` | corrected paths |
| `agents/contexts/integration-agent.md` | ~296, ~300, ~308, ~309, ~310 | `docs/agents/learnings/`, `docs/agents/contexts/`, `docs/features/implemented/` | corrected paths |
| `agents/contexts/architect-agent.md` | ~187, ~215, ~250 | `docs/features/planned/`, `docs/features/implemented/`, `docs/agents/learnings/` | corrected paths |
| `agents/learnings/ui.md` | ~5 | `docs/agents/contexts/ui-agent.md` | corrected path |
| `agents/learnings/testing.md` | ~5 | `docs/agents/contexts/test-agent.md` | corrected path |
| `agents/learnings/sprints.md` | ~5, ~27, ~50 | `docs/agents/contexts/sprint-agent.md`, `docs/planning/sessions/`, `docs/specs/behaviors/` | corrected paths |
| `agents/learnings/database.md` | ~5 | `docs/agents/contexts/database-agent.md` | corrected path |
| `agents/learnings/architecture.md` | ~5 | `docs/agents/contexts/architect-agent.md` | corrected path |
| `agents/learnings/integration.md` | ~5 | `docs/agents/contexts/integration-agent.md` | corrected path |

*(All paths above are relative to `docs/products/ferd/development/`)*

### C1d. Feature docs — stale cross-references to `docs/features/` and `docs/specs/` (~45 references)

Feature docs reference each other and behavior specs using pre-restructuring paths.

| File | Approx Stale Refs | Stale Patterns |
|------|-------------------|----------------|
| `features/FR-authentication.md` | ~9 | `docs/features/implemented/`, `docs/specs/behaviors/` |
| `features/FR-group-management.md` | ~14 | `docs/features/implemented/`, `docs/specs/behaviors/` |
| `features/FR-platform-exit.md` | ~6 | `docs/features/implemented/`, `docs/specs/behaviors/` |
| `features/FR-enhanced-member-invitations.md` | ~6 | `docs/features/implemented/`, `docs/specs/behaviors/` |
| `features/FR-journey-system.md` | ~2 | `docs/features/implemented/` |
| `features/FR-leave-group-core.md` | ~2 | `docs/specs/behaviors/groups.md` |
| `features/AR-deusex-admin-foundation.md` | ~1 | `docs/specs/behaviors/admin.md` |
| `features/AR-d15-universal-group-pattern-migration.md` | ~4 | `docs/features/implemented/`, `docs/specs/behaviors/` |
| `features/AR-smart-notifications.md` | ~6 | `docs/specs/behaviors/` |

*(All paths above are relative to `docs/products/ferd/development/`)*

### C2. Session files with stale self-references (lower priority — historical context)

These session files reference their own old location. They are not in `_archive/` but contain references to the pre-restructuring path where they used to live.

| File | Stale Path |
|------|-----------|
| `docs/products/ferd/sessions/2026-02-27-display-name-system.md:44` | `docs/planning/sessions/2026-02-27-...` |
| `docs/products/ferd/sessions/2026-02-27-leave-group-feature-review.md:47` | `docs/planning/sessions/2026-02-27-...` |
| `docs/products/ferd/sessions/2026-02-28-lifecycle-roadmap-decisions.md:47,60` | `docs/planning/sessions/...`, `docs/planning/ROADMAP.md` |
| `docs/products/ferd/sessions/2026-02-28-sprint1-foundation-schema.md:54` | `docs/planning/ROADMAP.md` |
| `docs/products/ferd/sessions/2026-02-28-sprint2-leave-group-core.md:54,59` | `docs/planning/sessions/...`, `docs/planning/ROADMAP.md` |
| `docs/products/ferd/sessions/2026-02-28-sprint3-smart-notifications.md:45,51` | `docs/planning/sessions/...`, `docs/planning/ROADMAP.md` |

---

## Category D: "Phase" Terminology in Active Files (LOW-MEDIUM PRIORITY)

These use "Phase 1.x" instead of "Ferd 1.x" or "Milestone 1.x". The March 20 terminology sweep changed most, but some remain.

| File | Issue | Proposed Change |
|------|-------|-----------------|
| `SPRINT.md:17,19` | "Phase 1.6: Polish & Launch" | → "Ferd 1.6: Polish & Launch" |
| `docs/implementation/shared/MIGRATIONS_LOG.md:285,291` | "Phase 1.5 - Communication", "Phase 2 - Advanced Features" | → "Ferd 1.5", and "Phase 2" → wave name |
| `docs/implementation/shared/SCHEMA_OVERVIEW.md:37,72,189` | "Future Tables (Phase 2+)", "Phase 2", "Phase 1.4" | → Phase 2 references → wave names |
| `docs/implementation/shared/DATABASE_CURRENT.md:1209` | "After completing Phase 1.4" | → "After completing Ferd 1.4" |
| `docs/implementation/ferd/status/DASHBOARD.md:25-28` | "Phase 1.1 - 1.6 subphases", "Phase 2, 3, 4 upcoming phases" | → "Ferd 1.1 - 1.6 milestones", "Wave 2-6" |
| `docs/implementation/ferd/baseline/BASELINE.md:504,574,632,633` | "Phase 1.6" (4 occurrences) | → "Ferd 1.6" |
| `docs/implementation/ferd/baseline/AUTH_IMPLEMENTATION_SUMMARY.md:4,139,173,196` | "Phase 2 - Core Platform" | → clarify these are Ferd internal milestones, not waves |
| `docs/universe/vision/VISION_DECISIONS.md:229` | "Wave 1, Phase 1.4" | → "Wave 1, Ferd 1.4" |
| `docs/products/ferd/specification/ACTIVITY_CATALOG.md:90,240` | "Phase 2 (custom role creation)" | → clarify wave or Ferd milestone |
| `dev_databases/CRUD_GUIDE.md:215` | "Postponed to later phase" | → "Postponed to later wave" |
| `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md:58` | "Deepens through subsequent **phases**" | → "subsequent **waves**" |

**Note:** CHANGELOG.md has many "Phase 1.x" references but these are **historical entries** — I recommend leaving them as-is since they describe what was said/done at the time.

---

## Category E: PRODUCTS_AND_PLATFORM.md Specific Issues (MEDIUM PRIORITY)

| Line | Issue | Proposed Change |
|------|-------|-----------------|
| ~37 | Hero's Journey arc says "Departure → Harbour → Shore → Passage → Home" — **doesn't match wave order** (Ferd → Eid → Hamn → Heim → Brim → Urd) | Rewrite to match actual wave arc |
| ~117 | "two founding chapters" | → "six named waves" or rewrite section |
| ~173-178 | Waves 2-6 are stub headers with no content | Add brief descriptions matching `docs/products/ROADMAP.md` or note "see ROADMAP.md" |

---

## Category F: WAVE_REDISTRIBUTION.md — "Wave 2 (Hamn)" Labels (DECISION NEEDED)

`docs/products/WAVE_REDISTRIBUTION.md` has ~13 entries showing "Wave 2 (Hamn)" in the "Previous Wave" column. These are **correct in context** — they show where items **used to be**. But the column header should make this explicit.

**Proposed:** Add a note: "Previous Wave column shows the old wave assignment before the 6-wave restructuring."

---

## Category G: CLAUDE.md and MEMORY.md (HIGH PRIORITY — affects every session)

### CLAUDE.md

| Line | Issue | Proposed Change |
|------|-------|-----------------|
| Memory section | References `docs/agents/README.md` | → `docs/products/ferd/development/agents/README.md` |
| Memory section | References `docs/agents/contexts/` | → `docs/products/ferd/development/agents/contexts/` |
| RBAC section | References `docs/features/implemented/dynamic-permissions-system.md` | → `docs/products/ferd/development/features/AR-dynamic-permissions-system.md` |

### MEMORY.md (user's ~/.claude project memory)

| Line | Issue | Proposed Change |
|------|-------|-----------------|
| Agent System section | `docs/agents/README.md` | → `docs/products/ferd/development/agents/README.md` |
| Agent System section | `docs/agents/contexts/*.md` | → `docs/products/ferd/development/agents/contexts/*.md` |
| Agent System section | `docs/agents/learnings/*.md` | → `docs/products/ferd/development/agents/learnings/*.md` |
| Key File Paths section | `docs/agents/README.md` | → `docs/products/ferd/development/agents/README.md` |
| Key File Paths section | `docs/agents/contexts/` | → `docs/products/ferd/development/agents/contexts/` |
| Key File Paths section | `docs/agents/learnings/` | → `docs/products/ferd/development/agents/learnings/` |
| Key File Paths section | `docs/features/implemented/` | → `docs/products/ferd/development/features/` |
| Key File Paths section | `docs/workflows/` | → `docs/products/ferd/development/` |
| Key File Paths section | `docs/specs/behaviors/` | → `docs/products/ferd/development/specs/` |

---

## Category H: Files Recommended to LEAVE ALONE

### H1. `_archive/` folders — historical record, do not modify

- All files under `docs/products/ferd/sessions/_archive/`
- All files under `docs/products/ferd/planning/_archive/`
- All files under `docs/products/ferd/development/_archive/`
- All files under `docs/products/hamn/_archive/`
- All files under `docs/universe/decisions/_archive/`
- All files under `docs/implementation/shared/_archive/`
- All files under `docs/implementation/ferd/baseline/_archive/`

### H2. CHANGELOG.md — historical log

Contains many "Phase 1.x" references, old `docs/specs/`, `docs/features/` paths. These describe **what happened at the time** and should stay as-is.

### H3. PROJECT_STATUS.md session history — historical log

The "Previous Session" entries reference old paths as they were at the time. Leave as-is.

### H4. dev_databases/UPDATE_INSTRUCTIONS.md

Contains a SQL string literal with `docs/planning/sessions/`. This is data, not navigation — leave as-is or update if the SQL is still run.

---

## Execution Order (Proposed)

1. **Category G first** — CLAUDE.md and MEMORY.md affect every future session
2. **Category C1** — Stale paths in active files break navigation
3. **Category A** — Wrong wave labels mislead agents and readers
4. **Category B** — Ambiguous Hamn references
5. **Category E** — PRODUCTS_AND_PLATFORM.md arc mismatch
6. **Category D** — Phase → Ferd terminology
7. **Category F** — WAVE_REDISTRIBUTION column header clarification
8. **Category C2** — Session self-references (lowest priority)

---

## Summary Statistics

| Category | Files Affected | Changes Needed |
|----------|---------------|----------------|
| A: Wave 2 (Hamn) → correct | ~15 active files | ~25 line changes |
| B: Ambiguous Hamn | ~4 files | ~6 line changes |
| C1a: Stale paths — planning docs | ~4 files | ~7 line changes |
| C1b: Stale paths — behavior specs | ~3 files | ~3 line changes |
| C1c: Stale paths — agent system | ~12 files | ~21 line changes |
| C1d: Stale paths — feature docs | ~9 files | ~45 line changes |
| C2: Stale paths — sessions | ~6 files | ~12 line changes |
| D: Phase → wave/Ferd | ~11 files | ~20 line changes |
| E: P&P specific | 1 file | ~3-5 changes |
| F: WAVE_REDISTRIBUTION | 1 file | ~1 change |
| G: CLAUDE.md + MEMORY.md | 2 files | ~12 line changes |
| **Total (active files)** | **~45 files** | **~155-160 line changes** |
| H: Leave alone | ~50+ archive files | 0 changes |

---

**No files will be moved, created, or deleted. All changes are content edits within existing files.**

*Awaiting your approval before making any changes.*
