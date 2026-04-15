# Session Bridge — 2026-04-15

**Session:** old_products and old_implementation Migration and Decommission
**Participants:** Stefan + Claude
**Status:** Session complete — all three legacy directories fully decommissioned

---

## What was accomplished this session

### 1. Full decommission of docs/old_products/ (178 files)

Every file across all 6 wave directories + root was assessed, categorised, and either migrated, extracted, or deleted.

**Non-ferd waves (eid, hamn, heim, brim, urd):**
- 31 study docs migrated to `docs/planning/waves/studies/{wave}/`
- All scaffolding deleted (.gitkeep, INDEX.md, empty directories)

**Ferd sessions:**
- 34 session records migrated to `docs/planning/sessions/`
- 22 archived sessions deleted
- Sessions INDEX.md deleted

**Hamn archive (7 files — reviewed individually):**
- PRODUCT_SPEC.md → extracted personas to `member-archetypes.md`, UX principles to `EXPERIENCE_PRINCIPLES.md`
- VISION_TO_SPEC_MAPPING.md → extracted CQ-014 (Visitor Experience) to OPEN_QUESTIONS.md
- RESEARCH.md → all items already in OPEN_QUESTIONS.md, deleted
- DEFERRED.md → superseded by ferd DEFERRED.md, deleted
- REQUIREMENTS.md → derivative document, deleted
- INDEX.md, README.md → navigation scaffolding, deleted

**Ferd architecture:**
- ADR-F001 deleted (meta-decision about baseline generation, principle retained)
- LIFECYCLE_FLOWS.md deleted (will be recreated as PRD acceptance criteria)
- RBAC_MIGRATION_REVIEW.md deleted (completed implementation record)

**Ferd planning (4 files — all deleted):**
- DEFERRED.md — information captured elsewhere or will resurface when features are scoped
- ROADMAP.md — point-in-time snapshot, new wave structure replaces it
- LIFECYCLE_DECISIONS.md — completed sprint planning artifact, code is the record
- RESEARCH.md — implementation-level questions that will surface when features are scoped

**Ferd specification (3 files — all deleted):**
- PRODUCT_SPEC.md — to be replaced by Hub Specification through proper process
- REQUIREMENTS.md — derivative document, new structure uses PRDs
- ACTIVITY_CATALOG.md — design-time input for RBAC, implemented in database

**Ferd agent system (17 files — all deleted):**
- 7 agent contexts, 7 learnings journals, README, INDEX, 1 archived agent
- Replaced by AGENTS.md + skills in the new structure
- Important patterns already captured in CLAUDE.md Critical Gotchas

**Ferd feature docs + behavior specs (32 files — all deleted):**
- 16 feature docs + 15 behavior specs + 1 template
- To be replaced by proper PRDs through the vision→description→specification→PRD→code pipeline
- Old docs described what was built; new PRDs will describe what *should* be built, then code validates against them

**Ferd workflow docs (4 files — moved by Stefan):**
- BOOT_UP.md, CLOSE_DOWN.md, WORKFLOW.md, DOC_HEALTH_CHECK.md
- Stefan moved these to a workflows folder outside old_products
- All reference stale paths and need rewriting for the new structure

**Ferd remaining scaffolding:**
- All INDEX.md files (10), all _archive directories (18+ files), empty directories

### 2. Full decommission of docs/old_implementation/ (19 files)

**Key decision: generated state docs are deleted, not migrated.**

- DATABASE_CURRENT.md — out of date (v0.2.5, reality is v0.2.37), 13 tables documented vs 19 actual. Regenerate from live database on demand.
- AUTH_SYSTEM.md — out of date, predates D15 rebuild. Regenerate on demand.
- BASELINE.md — March 14 point-in-time snapshot. Regenerate on demand.
- ACTUAL_STATE.md — April 4 gap analysis. Regenerate on demand.
- All supporting docs deleted: SCHEMA_OVERVIEW.md, RLS_POLICIES.md, MIGRATIONS_LOG.md, AUTH_IMPLEMENTATION.md, AUTH_IMPLEMENTATION_SUMMARY.md, INSTALLATION.md, DASHBOARD.md, KANBAN.md
- All INDEX.md files and archive deleted

### 3. New files created

| File | Location | Content |
|------|----------|---------|
| member-archetypes.md | `docs/ecosystem/universe/community/` | Three personas (Homebody/Explorer/Dreamineer) with three-perspectives alignment |
| EXPERIENCE_PRINCIPLES.md | `docs/ecosystem/strategy/` | Four design principles (felt transitions, Whisp companion, stories first, creator-friendly) |
| CQ-014 | Added to `docs/ecosystem/thinking/OPEN_QUESTIONS.md` | Visitor experience — what can visitors do? (ADR-U004 locks technical approach, product experience unspecified) |

### 4. docs/old_INDEX.md

Already deleted (not found on disk).

---

## Decisions locked this session

1. **Generated state docs are not maintained** — DATABASE_CURRENT.md, AUTH_SYSTEM.md, BASELINE.md, ACTUAL_STATE.md are generated on demand by CC reading the live codebase, not maintained as files
2. **Agent system replaced** — old agent contexts/learnings/README deleted; AGENTS.md + skills is the new structure; important patterns live in CLAUDE.md
3. **Feature docs and behavior specs deleted** — to be replaced by proper PRDs through the process pipeline; BDD acceptance criteria live inside PRDs, not as separate spec files
4. **DEFERRED.md deleted** — deferred items are handled through the backlog pipeline (PROCESS.md Section 1), wave studies, and OPEN_QUESTIONS.md; no separate deferral document needed
5. **ROADMAP.md deleted** — replaced by wave structure in `docs/planning/waves/`
6. **Workflow docs need rewriting** — BOOT_UP, CLOSE_DOWN, WORKFLOW, DOC_HEALTH_CHECK moved by Stefan but all reference stale paths; need full rewrite for new structure

### Path to known state (locked)

The correct sequence for establishing what Hub needs in Ferd:

1. **Hub Product Specification** — written from Product Description and Vision, describing what the Hub *should* be (independent of current implementation)
2. **Ferd scoping** — which parts of the full Hub specification are in scope for Ferd? Informed by capability map and wave definition
3. **Feature specs / PRDs** — for each Ferd-scoped capability, write a proper PRD with acceptance criteria (BDD). Describes intended behavior, independent of current code
4. **Code review against specs** — CC reads each PRD, then reads the code. Produces a delta with four states: fully correct, partially implemented, missing, or **implemented wrong**
5. **Delta work** — gaps become new cycle work through the normal BDD/TDD process

The specifications are authoritative; the code is measured against them — not the reverse.

---

## Outstanding items

### CLAUDE.md rewrite (critical — next session)

CLAUDE.md is severely broken. Nearly every path reference points to deleted files. Sections that need updating:

- **§Session Management** — boot-up/close-down references all deleted. Needs complete rewrite pointing to new workflow docs (wherever Stefan placed them) or new process
- **§Doc Structure — In Transition** — migration is now complete, not "in transition"
- **§Architecture** — references to old_implementation paths (BASELINE.md, DATABASE_CURRENT.md, AUTH_SYSTEM.md) all deleted. Note: generate on demand
- **§Document Map** — entire "Products Tier — Ferd (old tree)" and "Implementation Tier (old tree)" sections reference deleted files. Replace with new structure references
- **§Development Workflow** — references to old WORKFLOW.md path, old agent paths
- Remove all `old_products/` and `old_implementation/` references throughout
- Add references to new files: member-archetypes.md, EXPERIENCE_PRINCIPLES.md, studies/

### docs/README.md update

- Remove legacy section referencing old_products and old_implementation
- Update tree view to reflect current state

### Hub Product Specification

- Write `docs/products/hub/SPECIFICATION.md` using template
- This is the first step in the "path to known state" sequence

### Workflow docs rewrite

- BOOT_UP.md, CLOSE_DOWN.md, WORKFLOW.md, DOC_HEALTH_CHECK.md need full rewrite for new structure
- Location: wherever Stefan moved them

### PROCESS.md gaps (from previous sessions, still outstanding)

- Redefine cycles as Shape Up betting periods
- Add Shape Up mechanisms (appetite/betting table/cooldown/circuit breaker)
- WIP at review stage
- Task lifecycle

---

## Memory-critical items

If this conversation is lost, the essential new information:

- **All three legacy directories fully decommissioned** — old_products (178 files), old_implementation (19 files), old_INDEX.md
- **Generated state docs are not files** — DATABASE_CURRENT, AUTH_SYSTEM, BASELINE are generated on demand by CC, not maintained
- **Old agent system deleted** — replaced by AGENTS.md + skills
- **Old feature docs + behavior specs deleted** — replaced by PRDs through process pipeline
- **Path to known state locked** — Hub Specification → Ferd scoping → PRDs → code delta (four states: correct, partial, missing, wrong) → cycle work
- **New files created**: `ecosystem/universe/community/member-archetypes.md`, `ecosystem/strategy/EXPERIENCE_PRINCIPLES.md`, CQ-014 in OPEN_QUESTIONS.md
- **31 study docs** now in `docs/planning/waves/studies/{wave}/`
- **34 session records** now in `docs/planning/sessions/`
- **CLAUDE.md is severely broken** — most path references point to deleted files, needs full rewrite
- **Workflow docs moved by Stefan** — need rewriting for new structure

---

## File locations for next session

| What | Where |
|------|-------|
| CLAUDE.md (needs rewrite) | `CLAUDE.md` (root) |
| docs/README.md (needs update) | `docs/README.md` |
| PROCESS.md | `docs/planning/PROCESS.md` |
| Hub description | `docs/products/hub/DESCRIPTION.md` |
| Hub specification (to create) | `docs/products/hub/SPECIFICATION.md` |
| Wave studies | `docs/planning/waves/studies/{wave}/` |
| Session records | `docs/planning/sessions/` |
| Open questions | `docs/ecosystem/thinking/OPEN_QUESTIONS.md` |
| Member archetypes (new) | `docs/ecosystem/universe/community/member-archetypes.md` |
| Experience principles (new) | `docs/ecosystem/strategy/EXPERIENCE_PRINCIPLES.md` |
| Feature spec template | `docs/templates/feature-spec.md` |
| PRD template | `docs/templates/prd.md` |
| Ferd capability map | `docs/planning/waves/FERD-CAPABILITY-MAP.md` |
| Workflow docs (moved) | Location TBD — Stefan moved from old_products |
