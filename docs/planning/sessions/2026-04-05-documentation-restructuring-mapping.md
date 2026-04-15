# Session: Documentation Restructuring — Phase 1-2 Mapping

**Date:** 2026-04-05
**Type:** Planning / Documentation
**Duration:** ~1 session

---

## Summary

Planned the restructuring of FringeIsland documentation from a flat/ad-hoc structure into a three-tier architecture (Universe / Products / Implementation). Completed Phase 1 (Discovery) and Phase 2 (Mapping + Approval).

## What Was Done

1. **Inventoried all documentation** — 139 .md files + 1 .svg across 15 directories (~2.3 MB)
2. **Analyzed 23 ADRs** for universe vs Ferd scope — 22 universe-level, 1 Ferd-specific (ADR-023)
3. **Created MIGRATION_MAPPING.md v2** with Stefan's feedback:
   - Feature doc prefix convention (FR-/AR-/NF-)
   - Distributed `_archive/` folders (10 total, one per content area)
   - 6 decision points resolved
4. **Created MIGRATION_RISKS.md** — 3 high, 4 medium, 4 low risks

## Key Decisions

- **DP-1:** PROJECT_STATUS.md, SPRINT.md, CHANGELOG.md stay at repo root (too many references)
- **DP-2:** Agent system + workflows move to `products/ferd/development/`
- **DP-3:** Behavior specs move to `products/ferd/development/specs/`
- **DP-4:** Feature docs get FR-/AR-/NF- prefixes in `products/ferd/development/features/`
- **DP-5:** Old session bridge drafts archived, committed versions kept active
- **DP-6:** DOMAIN_ENTITIES.md is universe-level (core domain model)
- **Archives:** Distributed `_archive/` folders in each content area, not centralized

## Files Created/Modified

- `docs/refactor_docs/MIGRATION_MAPPING.md` (v2, approved)
- `docs/refactor_docs/MIGRATION_RISKS.md`
- `docs/DOCS_INVENTORY.md`
- `PROJECT_STATUS.md` (updated)
- `SPRINT.md` (updated)

## Next Steps (Phase 3 — next session)

1. Read `docs/refactor_docs/MIGRATION_MAPPING.md` and `CLAUDE_CODE_PROMPT-documentation-restructuring_2.md`
2. Create 38 new folders
3. Move/rename 97 files
4. Split ARCHITECTURE_DECISIONS.md into 23 individual ADR files
5. Create 26 INDEX.md navigation files
6. Create KANBAN.md and REFERENCES_SHARED.md
7. Update ~200-300 cross-references
8. Rewrite CLAUDE.md document map, README.md, docs/old_INDEX.md
9. Delete 5 empty placeholders + 15 emptied old directories
10. Run Phase 4 validation

## Risks to Watch

- **R1:** Broken cross-references (highest risk — CLAUDE.md is auto-loaded every session)
- **R2:** ADR split content preservation
- **R5:** Git history tracking through renames
