# Session Bridge — 2026-04-12

**Session:** old_universe Review and Decommission
**Participants:** Stefan + Claude
**Status:** Session complete — old_universe mostly decommissioned, ADR migration deferred

---

## What was accomplished this session

### 1. Full old_universe assessment (51 files)

Every file in `docs/old_universe/` was read, assessed, and categorised:
- 22 ADR-MIGRATE (deferred to dedicated step)
- 4 RESEARCH-KEEP (migrated)
- 7 MIGRATE (migrated)
- 10 SUPERSEDED (deleted via move cleanup)
- 8 DELETE (deleted via move cleanup)

### 2. Directory purpose clarification locked

Resolved ambiguity between `docs/architecture/`, `docs/platform/`, `docs/planning/reference/`, `docs/ecosystem/`, and `docs/research/`:

| Directory | Purpose |
|-----------|---------|
| `docs/ecosystem/` | Strategic, philosophical, cross-product — "what is FringeIsland and how does the whole thing fit together?" |
| `docs/architecture/` | Structural models, binding decisions (ADRs), dependency diagrams — "how is the system structured and why?" |
| `docs/platform/` | Service descriptions, feature specs, API contracts — "what does this service do and how does it work?" |
| `docs/planning/reference/` | Point-in-time snapshots — gap analyses, current-state assessments, capability maps |
| `docs/research/` | All research reports regardless of topic — domain (human development) and methodology (ecosystem management) |

### 3. Ecosystem subfolder structure locked

`docs/ecosystem/` organised into progressive disclosure layers:
- Root: constitutional documents (VISION.md, MANIFESTO.md)
- `strategy/`: stable directional documents (PRODUCTS_AND_PLATFORM.md, CONTRIBUTION_ARCHITECTURE.md)
- `thinking/`: open questions, explorations, legacy content being mined (COMMUNITY_OPEN_QUESTIONS.md, OLD_VISION.md, OLD_VISION_DECISIONS.md)
- Future subdirectories created as topics accumulate (whisp/, community/, kickstarter/, etc.)

Graduation path: thinking/ → strategy/ (when stable) or absorbed into constitutional documents.

### 4. Structural change: diagrams moved to architecture

ECOSYSTEM_ANATOMY_V3.svg and DOMAIN_SERVICE_DEPENDENCIES.svg moved from `docs/planning/reference/` to `docs/architecture/` — they are structural models, not temporal planning snapshots.

### 5. Migrations executed

| Source (old_universe) | Destination | Notes |
|-----------------------|-------------|-------|
| architecture/ARCHITECTURE_ANATOMY.md | docs/architecture/ARCHITECTURE_ANATOMY_V1.md | Archived reference |
| architecture/DOMAIN_ENTITIES.md | docs/architecture/DOMAIN_ENTITIES.md | Only place entities are documented |
| community/OPEN_QUESTIONS.md | docs/ecosystem/thinking/COMMUNITY_OPEN_QUESTIONS.md | 9 open questions, needs triage |
| processes/DEFERRAL_PROTOCOL.md | docs/planning/DEFERRAL_PROTOCOL.md | Review note added |
| processes/PLANNING_PROTOCOL.md | docs/planning/PLANNING_PROTOCOL.md | Review note added |
| research/adult-development/Kegan_ITC_Research_Report.md | docs/research/ | |
| research/human-flourishing/What_Fills_a_Life_v1.md | docs/research/ | |
| research/human-flourishing/What_Fills_a_Life_v2.md | docs/research/ | |
| research/theory-u/Theory_U_Research_Report.md | docs/research/ | |
| strategy/PRODUCTS_AND_PLATFORM.md | docs/ecosystem/strategy/ | Needs review and update |
| strategy/CONTRIBUTION_ARCHITECTURE.md | docs/ecosystem/strategy/ | Needs review and update |
| vision/VISION.md | docs/ecosystem/thinking/OLD_VISION.md | Needs content extraction |
| vision/VISION_DECISIONS.md | docs/ecosystem/thinking/OLD_VISION_DECISIONS.md | Needs content review |

### 6. Deletions (automatic cleanup)

All empty directories in old_universe were automatically removed when their last file was moved out. Superseded and obsolete files removed:
- All 7 INDEX.md files
- ARCHITECTURE_ANATOMY_DIAGRAM.svg, ECOSYSTEM_ANATOMY_V2.svg, DOMAIN_SERVICE_DEPENDENCIES.svg (superseded)
- 2 archived monolithic decision files
- 1 archived task plan prompt
- strategy/OPEN_QUESTIONS.md (resolved/irrelevant)
- vision/MANIFESTO.md (already migrated)

### 7. README updates (9 files)

| File | What changed |
|------|-------------|
| docs/architecture/README.md | Rewritten with purpose + boundary statement, full contents table |
| docs/ecosystem/README.md | Three-layer structure: constitutional, strategy/, thinking/ with reading order |
| docs/ecosystem/strategy/README.md | Created — purpose + boundary + contents |
| docs/ecosystem/thinking/README.md | Created — purpose + graduation path + contents |
| docs/platform/README.md | Purpose + boundary statement added |
| docs/planning/reference/README.md | Created with purpose + boundary |
| docs/research/README.md | Rewritten: domain research + methodology research sections |
| docs/README.md | Full rewrite: directory purpose guide with ecosystem subfolders, updated entry points |
| README.md (root) | Vision link fixed, simplified |

### 8. CLAUDE.md updated

Document map fully updated to new paths including ecosystem/strategy/ and ecosystem/thinking/ subpaths. Directory purpose guide expanded with ecosystem subfolders. Documentation structure section updated.

---

## Decisions locked this session

1. **Directory purpose separation:** ecosystem (strategic) / architecture (structural) / platform (operational) / planning/reference (temporal) / research (all studies)
2. **Ecosystem three-layer structure:** constitutional (root) → strategy/ (stable) → thinking/ (exploratory)
3. **Diagrams belong in architecture:** moved from planning/reference
4. **ARCHITECTURE_ANATOMY_V1.md kept as reference:** superseded conceptually but rationale is unique
5. **DOMAIN_ENTITIES.md → architecture:** structural model, not service description
6. **Research scope clarified:** all research regardless of topic
7. **Session bridge naming:** date first, then descriptive text (e.g. `2026-04-12_-_SESSION-BRIDGE.md`)

---

## Outstanding items

### ADR migration (deferred — separate step)

22 ADRs in `docs/old_universe/decisions/` → `docs/architecture/decisions/`. Stefan wants to discuss individually.

### Files needing review

| File | Location | What's needed |
|------|----------|---------------|
| DEFERRAL_PROTOCOL.md | docs/planning/ | Challenge what to bring into new way of working |
| PLANNING_PROTOCOL.md | docs/planning/ | Challenge what to bring into new way of working |
| PRODUCTS_AND_PLATFORM.md | docs/ecosystem/strategy/ | Review and update |
| CONTRIBUTION_ARCHITECTURE.md | docs/ecosystem/strategy/ | Review and update |
| COMMUNITY_OPEN_QUESTIONS.md | docs/ecosystem/thinking/ | Triage all 9 questions |
| OLD_VISION.md | docs/ecosystem/thinking/ | Extract unique content |
| OLD_VISION_DECISIONS.md | docs/ecosystem/thinking/ | Review for unique content |

### Also outstanding (from previous sessions)

- PROCESS.md — needs Shape Up mechanisms
- 32 files reference deleted SPRINT.md
- Level 4 retroactive feature specs (36 specs)
- old_products/ and old_implementation/ migration
- old_INDEX.md — can be deleted once old_products/ and old_implementation/ are migrated

---

## Memory-critical items

If this conversation is lost, the essential new information:

- Directory purpose guide locked: ecosystem (strategic), architecture (structural), platform (operational), planning/reference (temporal), research (all studies)
- Ecosystem three-layer structure: constitutional (root) → strategy/ (stable) → thinking/ (exploratory)
- Diagrams now in docs/architecture/ (moved from planning/reference/)
- old_universe/ reduced to just decisions/ folder with 22 ADRs
- CLAUDE.md, docs/README.md, root README.md, and 6 additional READMEs all updated
- 7 files migrated with "needs review" notes
- ADR migration deferred to dedicated step per Stefan's request
- Session bridge naming: date first (e.g. `2026-04-12_-_SESSION-BRIDGE.md`)

---

## File locations for next session

| What | Where |
|------|-------|
| ADRs pending migration | docs/old_universe/decisions/ (22 files) |
| ADR destination | docs/architecture/decisions/ |
| Ferd capability map | docs/planning/waves/FERD-CAPABILITY-MAP.md |
| Feature spec template | docs/templates/feature-spec.md |
| Skills | .claude/skills/ |
| Session bridges | docs/planning/sessions/ |
