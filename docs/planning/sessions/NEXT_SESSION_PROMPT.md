We are continuing the FringeIsland documentation restructuring. Please read these files first to get context:

1. `docs/planning/sessions/2026-04-15_-_LEGACY-MIGRATION-PRODUCTS-IMPLEMENTATION.md` — what we did last session
2. `docs/README.md` — current documentation map (needs updating)
3. `CLAUDE.md` — project conventions (WARNING: severely broken — most path references point to deleted files)
4. `docs/planning/PROCESS.md` — canonical way of working

**Context:** Last session we fully decommissioned `docs/old_products/` (178 files), `docs/old_implementation/` (19 files), and `docs/old_INDEX.md`. The legacy documentation is gone. Two new files were created: `docs/ecosystem/universe/community/member-archetypes.md` and `docs/ecosystem/strategy/EXPERIENCE_PRINCIPLES.md`. CQ-014 was added to OPEN_QUESTIONS.md. 31 study docs were migrated to `docs/planning/waves/studies/`. 34 session records were migrated to `docs/planning/sessions/`.

**Critical state:** CLAUDE.md is severely broken. Nearly every path in §Session Management, §Document Map, and §Architecture points to deleted files. This must be fixed before any development work can happen, because CC reads CLAUDE.md at the start of every session.

---

## This session's tasks (in priority order):

### 1. Rewrite CLAUDE.md

This is the critical path. CLAUDE.md needs a full rewrite to reflect the new documentation structure. Key changes:

- **§Session Management** — boot-up/close-down workflow references all point to deleted files. Stefan moved BOOT_UP.md, CLOSE_DOWN.md, WORKFLOW.md, DOC_HEALTH_CHECK.md to a workflows folder — find them and decide: rewrite these for the new structure, or absorb their process into CLAUDE.md/PROCESS.md?
- **§Doc Structure — In Transition** — migration is complete. Remove the "in transition" framing. Describe the current (final) structure.
- **§Architecture** — remove references to deleted implementation docs (DATABASE_CURRENT.md, AUTH_SYSTEM.md, BASELINE.md). Note: these are generated on demand by CC reading the live codebase, not maintained as files.
- **§Document Map** — remove entire "Products Tier — Ferd (old tree)" and "Implementation Tier (old tree)" sections. Replace with references to the new structure.
- **§Development Workflow** — update WORKFLOW.md path reference. Update or remove agent context references.
- Add references to new files: member-archetypes.md, EXPERIENCE_PRINCIPLES.md, wave studies
- Remove every `old_products/`, `old_implementation/`, and `old_universe/` reference throughout

### 2. Update docs/README.md

- Remove the legacy section referencing old_products and old_implementation
- Update the tree view to reflect current state (no more old_* directories)
- Verify all paths in the tree are correct

### 3. Discuss the path to known state

Last session we locked the sequence for establishing what Hub needs in Ferd:

1. Hub Product Specification — what the Hub *should* be (from Description + Vision)
2. Ferd scoping — which parts are in scope for Ferd
3. Feature specs / PRDs — intended behavior per feature
4. Code review against specs — delta with four states: fully correct, partially implemented, missing, implemented wrong
5. Delta work — through normal BDD/TDD cycles

After CLAUDE.md and README.md are fixed, we should discuss when and how to start this sequence — specifically whether to write the Hub Specification in this session or defer it.

---

## Key constraints:
- Don't modify or delete anything without my confirmation
- CLAUDE.md changes should be reviewed section by section before committing
- The workflow docs (BOOT_UP etc.) need to be located first — Stefan moved them but the new location hasn't been recorded
