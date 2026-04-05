# Session: Documentation Restructuring

**Date:** 2026-02-28
**Duration:** ~2 hours
**Focus:** Deep analysis and restructuring of all planning, workflow, and context documentation

---

## Summary

Comprehensive restructuring of docs/planning/, docs/workflows/, CLAUDE.md, and MEMORY.md to eliminate redundancy, fix stale data, and bring all AI-loaded files within the 80-150 line optimal attention zone.

## Changes

### Rewrites (trimmed to optimal size)
| File | Before | After | Change |
|------|--------|-------|--------|
| CLAUDE.md | 1,089 | 121 | Routing doc, no code examples |
| boot-up.md | 509 | 96 | Actionable checklist only |
| close-down.md | 753 | 109 | Actionable checklist only |
| ROADMAP.md | 988 | ~170 | Phases only, no changelog/decisions |
| PRODUCT_SPEC.md | — | — | Updated to v1.1, Phase 1 at 95% |

### Merges
- `tdd-workflow.md` → `feature-development.md` (single TDD source, 8 phases + 5 appendices)
- `lifecycle-sprint-plan.md` → `lifecycle-roadmap-decisions.md` (added quick-ref table)

### Created
- `docs/planning/NEXT.md` — quick human-readable "what's next" (~35 lines)

### Archived
- 19 old session bridges → `docs/planning/sessions/archive/`
- 2 phase-2 design docs → `docs/planning/archive/phase-2-designs/`

### Fixed
- 4 behavior spec files: stale paths (`planned/` and `active/` → `implemented/`)
- MEMORY.md: stale paths, missing NEXT.md reference
- close-down.md: Co-Authored-By corrected, NEXT.md added to file table
- boot-up.md: dead tdd-workflow.md reference removed
- Credential exposure scrubbed from archived session file

## Decisions

1. **80-150 lines = optimal zone** for AI-loaded context files (CLAUDE.md, workflows, MEMORY.md)
2. **CLAUDE.md is a routing document** — tells AI where to look, not how to code
3. **NEXT.md updated every close-down** — "always" not "if changed"
4. **No duplicate content** — checklist is the single source, no scenarios/flowcharts/example outputs

## Next Steps

- [ ] Phase 1.6 work (mobile responsiveness, onboarding, E2E expansion)
- [ ] Consider trimming feature-development.md if appendices push it too long
