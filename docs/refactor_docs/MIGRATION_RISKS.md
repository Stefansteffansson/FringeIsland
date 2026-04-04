# Migration Risks

**Generated:** 2026-04-05

---

## HIGH Risk

### R1: Broken cross-references (200-300 links)
- **Impact:** Navigation breaks, agents load wrong files, boot-up/close-down workflows fail
- **Files affected:** CLAUDE.md, PROJECT_STATUS.md, all agent playbooks, all feature docs, behavior specs
- **Mitigation:** Systematic grep-and-replace after all moves. Verify with `grep -r "\.md)" docs/` before declaring done.
- **Special concern:** CLAUDE.md is auto-loaded every session — broken paths here break everything

### R2: CLAUDE.md document map is the primary routing file
- **Impact:** If CLAUDE.md paths are wrong, every future Claude Code session starts confused
- **Mitigation:** Rewrite CLAUDE.md last, after all moves are verified. Test by reading each referenced path.

### R3: Boot-up/close-down workflow path dependencies
- **Impact:** These workflows reference PROJECT_STATUS.md, SPRINT.md, ROADMAP.md, and agent contexts by exact path
- **Mitigation:** Update workflows AFTER moves. Keep PROJECT_STATUS.md and SPRINT.md at root (DP-1) to minimize breakage.

---

## MEDIUM Risk

### R4: ADR split (23 individual files from 1 monolithic file)
- **Impact:** If extraction misses content or breaks formatting, ADR information is degraded
- **Mitigation:** Extract each ADR with full text. Keep original ARCHITECTURE_DECISIONS.md in archive as safety net. Verify word count matches.

### R5: Session file renaming breaks git history
- **Impact:** `git log --follow` may not track renames with content changes
- **Mitigation:** Use `git mv` for all renames (preserves history tracking). Avoid content changes during rename step.

### R6: Agent playbook internal references
- **Impact:** Agent playbooks reference each other, behavior specs, and feature docs extensively
- **Mitigation:** Grep each playbook for `.md` references after migration. Update all relative paths.

### R7: MEMORY.md references to file paths
- **Impact:** The auto-memory system in `~/.claude/projects/` references docs/agents/contexts/, docs/agents/learnings/, etc.
- **Mitigation:** Update MEMORY.md "Key File Paths" section after migration.

---

## LOW Risk

### R8: Empty design-system folder deletion
- **Impact:** None — files are 0 KB placeholders
- **Mitigation:** Verify truly empty before deletion. Design system concept preserved in ADR-U013.

### R9: Swedish-language session documents
- **Impact:** Two session summaries are in Swedish — could be confusing in English-named folder structure
- **Mitigation:** Keep original language. Add "(Swedish)" note in INDEX.md entry.

### R10: Duplicate content across feature docs and behavior specs
- **Impact:** Some feature docs repeat behavior spec content
- **Mitigation:** Not a migration risk per se — flag for future deduplication but don't merge during migration.

### R11: Archive folder size
- **Impact:** 35 files moving to _archive/ — could become large and noisy
- **Mitigation:** `_archive/sessions/` subfolder keeps session archives separate. INDEX.md provides navigation.

---

## Pre-Flight Checklist

Before starting Phase 3 execution:

- [ ] Stefan has approved MIGRATION_MAPPING.md
- [ ] All decision points (DP-1 through DP-6) are resolved
- [ ] Git working tree is clean (commit any pending changes first)
- [ ] Backup exists (git provides this, but verify branch is pushed)

## Post-Migration Verification

- [ ] `grep -r "docs/vision/" docs/` → should only find universe/vision references
- [ ] `grep -r "docs/planning/" docs/` → should find no results (all moved)
- [ ] `grep -r "docs/architecture/" docs/` → should find no results (all moved)
- [ ] `grep -r "docs/agents/" docs/` → should find no results (moved to development/agents)
- [ ] `grep -r "docs/specs/" docs/` → should find no results (moved to development/specs)
- [ ] `grep -r "docs/features/" docs/` → should find no results (moved to development/features)
- [ ] All 26 INDEX.md files exist and have content
- [ ] CLAUDE.md document map points to valid files
- [ ] Boot-up workflow paths resolve correctly
