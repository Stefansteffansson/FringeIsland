# Session Bridge — 2026-04-12 — Legacy Review and Universe Design

**Session:** Legacy file review, universe directory creation, OLD_VISION extraction
**Participants:** Stefan + Claude
**Status:** Session complete

---

## What was accomplished this session

### 1. old_universe/ fully deleted

All 22 remaining ADR files (U001–U022) deleted from `docs/old_universe/decisions/`. The directory is now empty and can be removed (git won't track empty directories).

### 2. Universe design directory created

New `docs/ecosystem/universe/` directory established as the home for "what the FringeIsland world is and how it works" — the creative, conceptual, evolving description of FringeIsland as a world.

Structure:

```
docs/ecosystem/universe/
├── README.md
├── cosmology/           ← Three Worlds (placeholder)
├── personal-growth/     ← red thread, engagement, void, privacy
├── beings/              ← Whisp, NPCs, Dreamineers (placeholder)
├── narrative/           ← seasons, episodes, journeys (placeholder)
├── community/           ← community dynamics (placeholder)
└── kickstarter/         ← the founding moment: Season Zero
```

Relationship to other ecosystem layers:
- VISION.md **constrains** — says what FringeIsland is and isn't
- MANIFESTO.md **inspires** — says what we value
- universe/ **imagines** — says how the world actually works
- strategy/ **directs** — says how the ecosystem is structured
- thinking/ **explores** — holds questions not yet answered

VISION.md updated (v1.1) to point to `universe/` instead of the non-existent `platform/domain/world-model/`.

### 3. OLD_VISION.md fully mined and deleted

Seven unique content items extracted to permanent homes:

| # | Content | Destination |
|---|---|---|
| 1 | Engagement Spectrum (Homebody → Explorer) | `universe/personal-growth/engagement-spectrum.md` |
| 2 | Red Thread 9-cell matrix (3 questions × 3 perspectives) | `universe/personal-growth/three-questions.md` |
| 3 | Business Model (5 revenue streams, anti-VC, Endowment) | `strategy/BUSINESS_MODEL.md` |
| 4 | IP/Licensing three-layer model (MIT, CC BY-SA+CLA, marketplace) | `strategy/IP_AND_LICENSING.md` |
| 5 | Kickstarter as Season Zero | `universe/kickstarter/kickstarter-vision.md` |
| 6 | 4 missing open questions | `thinking/OPEN_QUESTIONS.md` (CQ-010 to CQ-013) |
| 7 | SFM vision + mission epigraph | `VISION.md` (v1.1) |

### 4. OLD_VISION_DECISIONS.md fully mined and deleted

One unique item extracted:

| Content | Destination |
|---------|-------------|
| Avatar Privacy Model (three tiers: private by default, selectively shared, transparently shared) | `universe/personal-growth/privacy-model.md` |

### 5. DEFERRAL_PROTOCOL.md absorbed and deleted

Core principle ("a deferred item is not done until someone owns it") absorbed into PROCESS.md §3 as new subsection "Deferred and cross-wave work." The formal protocol (per-product DEFERRED.md files, state transitions) is superseded by the maturity pipeline + wave tags + icebox + betting table.

### 6. PLANNING_PROTOCOL.md absorbed and deleted

Core principle ("research before roadmap — Ferd's lesson") absorbed into PROCESS.md §1 as new subsection "Why the pipeline matters." The formal protocol (RESEARCH.md → PRODUCT_SPEC.md → REQUIREMENTS.md → ROADMAP.md sequence) is superseded by the maturity pipeline.

### 7. COMMUNITY_OPEN_QUESTIONS.md renamed

Renamed to `OPEN_QUESTIONS.md` — the file contains ecosystem-wide questions (strategy, governance, business, universe), not just community questions.

### 8. other-topics/ superseded

The three empty placeholder directories (`whisp/`, `community/`, `kickstarter/`) under `docs/ecosystem/other-topics/` are superseded by the new `universe/` directory. The empty directories need manual deletion.

### 9. README updates (6 files)

| File | What changed |
|------|-------------|
| `docs/ecosystem/VISION.md` | v1.1 — SFM epigraph added, links updated to universe/ |
| `docs/ecosystem/README.md` | Rewritten with universe/ as first-class layer, graduation paths |
| `docs/ecosystem/thinking/README.md` | Graduation path includes universe/, deleted files removed |
| `docs/ecosystem/strategy/README.md` | BUSINESS_MODEL.md and IP_AND_LICENSING.md added |
| `docs/README.md` | Universe/ in tree, old_universe marked deleted, protocols removed |
| `docs/planning/PROCESS.md` | Two new subsections added |

---

## Decisions locked this session

1. **`docs/ecosystem/universe/` is the home for universe design** — creative, conceptual, evolving. Separate from platform architecture (how software implements it) and strategy (how ecosystem is structured).
2. **Folder renamed: `development/` → `personal-growth/`** to avoid ambiguity with software development.
3. **Kickstarter gets its own top-level folder in universe/** — it's a cross-cutting founding event, not a subcategory of community.
4. **COMMUNITY_OPEN_QUESTIONS.md → OPEN_QUESTIONS.md** — the file covers the full ecosystem, not just community.
5. **Deferral and planning protocols absorbed into PROCESS.md** — principles preserved, formal protocols superseded by maturity pipeline.

---

## Outstanding items

### Next session: old_products/ and old_implementation/ migration

These two directories are the last legacy holdouts. They contain authoritative content that CLAUDE.md, boot-up, close-down, and sprint workflows still reference.

**old_products/ (the big one)**

6 wave directories (ferd, eid, hamn, heim, brim, urd) plus root files. The ferd directory is the most complex:

- `ferd/specification/` — PRODUCT_SPEC.md, REQUIREMENTS.md, ACTIVITY_CATALOG.md
- `ferd/development/` — BOOT_UP.md, CLOSE_DOWN.md, WORKFLOW.md, 7 agent contexts, 7 agent learnings, 16 feature docs, 15 behavior specs
- `ferd/planning/` — DEFERRED.md, ROADMAP.md, RESEARCH.md, 11 study docs
- `ferd/sessions/` — 35 session records
- `ferd/architecture/` — ADR-F001, 4 study docs, LIFECYCLE_FLOWS.md

Other wave directories (eid, hamn, heim, brim, urd) are mostly scaffolding with study docs and .gitkeep files.

**old_implementation/**

- `shared/` — DATABASE_CURRENT.md, AUTH_SYSTEM.md, RLS_POLICIES.md, SCHEMA_OVERVIEW.md, MIGRATIONS_LOG.md
- `ferd/baseline/` — BASELINE.md, AUTH_IMPLEMENTATION.md, ACTUAL_STATE.md, INSTALLATION.md
- `ferd/status/` — DASHBOARD.md, KANBAN.md
- `ferd/changelog/` and `ferd/testing/` — INDEX files only

**Key challenge:** CLAUDE.md §Session Management still points to old_products paths for boot-up, close-down, and sprint agent. These workflows are actively used — migration must update all references or the development workflow breaks.

### Also outstanding (from previous sessions)

- PRODUCTS_AND_PLATFORM.md — needs review and update (docs/ecosystem/strategy/)
- CONTRIBUTION_ARCHITECTURE.md — needs review and update (docs/ecosystem/strategy/)
- PROCESS.md — still needs Shape Up mechanisms (redefine cycles as betting periods, add appetite/betting table/cooldown/circuit breaker)
- 32 files reference deleted SPRINT.md
- Level 4 retroactive feature specs (36 specs)

### Manual cleanup needed

- Delete empty `docs/old_universe/` directory
- Delete empty `docs/old_universe/decisions/` directory
- Delete empty `docs/ecosystem/other-topics/` and its three empty subdirectories
- Delete empty `docs/ecosystem/universe/development/` directory (renamed to personal-growth)

---

## Memory-critical items

If this conversation is lost, the essential new information:

- `docs/ecosystem/universe/` exists — the creative heart of the ecosystem docs, with 7 subdirectories
- VISION.md is now v1.1 with SFM epigraph and links to universe/
- OLD_VISION.md and OLD_VISION_DECISIONS.md are deleted — all unique content extracted
- DEFERRAL_PROTOCOL.md and PLANNING_PROTOCOL.md are deleted — principles in PROCESS.md
- COMMUNITY_OPEN_QUESTIONS.md renamed to OPEN_QUESTIONS.md, now has 13 items (CQ-001 to CQ-013)
- strategy/ now has BUSINESS_MODEL.md and IP_AND_LICENSING.md
- PROCESS.md has two new subsections: "Why the pipeline matters" and "Deferred and cross-wave work"
- old_products/ and old_implementation/ are the remaining legacy directories — next session's focus

---

## File locations for next session

| What | Where |
|------|-------|
| Session bridges | docs/planning/sessions/ |
| Universe design (new) | docs/ecosystem/universe/ |
| Strategy docs (updated) | docs/ecosystem/strategy/ |
| Open questions (renamed) | docs/ecosystem/thinking/OPEN_QUESTIONS.md |
| PROCESS.md (updated) | docs/planning/PROCESS.md |
| old_products/ (to migrate) | docs/old_products/ |
| old_implementation/ (to migrate) | docs/old_implementation/ |
| CLAUDE.md (needs update after migration) | CLAUDE.md |
| Boot-up (references old paths) | docs/old_products/ferd/development/BOOT_UP.md |
| Close-down (references old paths) | docs/old_products/ferd/development/CLOSE_DOWN.md |
