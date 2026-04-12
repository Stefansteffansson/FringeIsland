# Session Bridge — 2026-04-12 — ADR Migration

**Session:** ADR Migration and Formalisation
**Participants:** Stefan + Claude
**Status:** Session complete — all ADRs migrated, two new ADRs written

---

## What was accomplished this session

### 1. ADR migration (22 files)

All 22 ADRs (ADR-U001 through ADR-U022) migrated from `docs/old_universe/decisions/` to `docs/architecture/decisions/`. Each ADR received:
- Standardised MADR headers (Status, Date, Deciders, Tags)
- "Extracted from" notes moved to Links sections
- Cross-references between related ADRs added

Body text preserved as-is — ADRs are historical records, not rewritten into the full MADR template.

### 2. Three ADRs amended during migration

| ADR | Amendment |
|-----|-----------|
| ADR-U002 (Five verticals) | Note added: L0-L7 references superseded by Platform Core / Domain Services decomposition; verticals themselves unchanged |
| ADR-U008 (Step type extensibility) | "L3 Experience engine" updated to Narrative Engine / Experience Engine domain services |
| ADR-U016 (Cascade specification first) | Cascade template rewritten from L0-L7 to Platform Core / Domain Services structure |

ADR-U022 (Named waves) also received an amendment clarifying that waves are evolutionary stages, not products, and that wave assignments may still shift.

### 3. ADR-U001 superseded

ADR-U001 (Layered anatomy framework) marked "Superseded by ADR-U023". The L0-L7 model is now historical context; the principle of explicit dependency ordering lives on in U023.

### 4. ADR-U023 written (new — full MADR format)

**Platform Core / Domain Services decomposition.** Formally captures the current architecture:
- Platform Core (Infrastructure, Identity, Organisation, Governance)
- Internal API (contract boundary)
- Domain Services (7 services + Extension System)
- Platform API (contract boundary)
- Products / Studios / Design System

First ADR written in the full MADR template format. All future ADRs follow this format.

### 5. ADR-U024 written (new — full MADR format)

**Wave model semantics.** Formalises the operational rules that ADR-U022 (naming) didn't cover:
- Waves are thematic focus buckets, not sequential gates
- Work from any wave can be at any maturity state at any time
- Generation is unconstrained; WIP limits apply at review stage only
- Earlier waves generally prioritised (guideline, not rule)
- Wave transition triggers retrospective + roadmap update

### 6. README updates (4 files)

| File | What changed |
|------|-------------|
| `docs/architecture/decisions/README.md` | Full index table with all 24 ADRs, conventions section |
| `docs/architecture/decisions/PENDING.md` | Cleared — wave model semantics written as U024 |
| `docs/architecture/README.md` | Tree updated to show U023 + U024, key documents table updated |
| `docs/README.md` | ADR count updated to 24, old_universe marked fully decommissioned |

### 7. Root file updates (2 files)

| File | What changed |
|------|-------------|
| `CLAUDE.md` | ADR paths updated from old_universe to architecture/decisions, migration status updated to "fully decommissioned", wave model description enhanced with U024 reference |
| `AGENTS.md` | No changes needed — ADR-U009 referenced by ID only |

---

## Decisions locked this session

1. **ADR format rule:** U001-U022 retain original narrative structure with standardised headers; U023+ use full MADR template
2. **ADR-U001 superseded** by U023 (Platform Core / Domain Services decomposition)
3. **Three amendments** to U002, U008, U016 updating L0-L7 references to current decomposition
4. **ADR-U024 accepted** — wave model semantics formalised (WIP at review, not generation)
5. **old_universe/ fully decommissioned** — directory can be deleted

---

## Outstanding items

### Cleanup (for Claude Code)

- Delete `docs/old_universe/decisions/` (22 original files still present — duplicates of migrated ADRs)
- Delete the now-empty `docs/old_universe/` directory

### Files needing review (next session)

| File | Location | What's needed |
|------|----------|---------------|
| OLD_VISION.md | docs/ecosystem/thinking/ | Extract unique content not already in VISION.md |
| OLD_VISION_DECISIONS.md | docs/ecosystem/thinking/ | Review for unique content |
| DEFERRAL_PROTOCOL.md | docs/planning/ | Challenge what to bring into new way of working |
| PLANNING_PROTOCOL.md | docs/planning/ | Challenge what to bring into new way of working |

### Also outstanding (from previous sessions)

- PRODUCTS_AND_PLATFORM.md — needs review and update (docs/ecosystem/strategy/)
- CONTRIBUTION_ARCHITECTURE.md — needs review and update (docs/ecosystem/strategy/)
- COMMUNITY_OPEN_QUESTIONS.md — triage all 9 questions (docs/ecosystem/thinking/)
- PROCESS.md — needs Shape Up mechanisms (redefine cycles, add appetite/betting table/cooldown/circuit breaker)
- 32 files reference deleted SPRINT.md
- Level 4 retroactive feature specs (36 specs)
- old_products/ and old_implementation/ migration
- old_INDEX.md — can be deleted once old_products/ and old_implementation/ are migrated

---

## Memory-critical items

If this conversation is lost, the essential new information:

- All 24 ADRs now live in `docs/architecture/decisions/` — this is the single source of truth
- ADR-U001 is superseded by ADR-U023 (Platform Core / Domain Services decomposition)
- ADR-U024 formalises wave model semantics: WIP limits at review stage only, generation unconstrained
- ADR-U001-U022 keep original narrative structure; U023+ use full MADR template
- old_universe/ is fully decommissioned — original ADR files still need deleting
- CLAUDE.md updated with correct ADR paths and migration status
- PENDING.md cleared — only queued item (wave model) was written as U024

---

## File locations for next session

| What | Where |
|------|-------|
| ADRs (authoritative) | docs/architecture/decisions/ |
| ADR index | docs/architecture/decisions/README.md |
| OLD_VISION.md (review) | docs/ecosystem/thinking/OLD_VISION.md |
| OLD_VISION_DECISIONS.md (review) | docs/ecosystem/thinking/OLD_VISION_DECISIONS.md |
| DEFERRAL_PROTOCOL.md (review) | docs/planning/DEFERRAL_PROTOCOL.md |
| PLANNING_PROTOCOL.md (review) | docs/planning/PLANNING_PROTOCOL.md |
| Session bridges | docs/planning/sessions/ |
