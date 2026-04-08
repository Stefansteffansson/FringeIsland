# Session Bridge: Documentation Restructuring — Overlap Elimination + SPRINT.md

**Date:** 2026-03-03
**Focus:** Eliminate doc overlap, give each file ONE job, create SPRINT.md operational heartbeat
**Version:** v0.2.36 (no code changes — docs only)

---

## Summary

Comprehensive documentation restructuring across 16 files. The driving principle: each file gets ONE job, information lives in ONE place, everything else points there.

### Key Changes

1. **README.md** rewritten (403→155 lines) — GitHub landing page only
2. **INDEX.md** rewritten (249→128 lines) — navigation hub only
3. **SPRINT.md** created — new operational heartbeat with multi-stream TDD phase tracking
4. **NEXT.md** deleted — fully absorbed by SPRINT.md
5. **PROJECT_STATUS.md** slimmed — removed operational sections, kept historical record
6. **CLAUDE.md** + **boot-up.md** — fixed TDD phase numbering to match canonical 0-7
7. **feature-development.md** — added phase summary table
8. **PRODUCT_SPEC.md** — 15 terminology fixes (Steward/Guide), Non-Goals corrected
9. **lifecycle-roadmap-decisions.md** — all 5 tracks marked IMPLEMENTED
10. **DEFERRED_DECISIONS.md** — footer/terminology updates
11. **sprint-agent.md** — added SPRINT.md refs, fixed stale tdd-workflow.md link
12. **ROADMAP.md** — NEXT.md→SPRINT.md link
13. **MEMORY.md** — NEXT.md→SPRINT.md reference

### Design Principle Established

| File | Single Purpose |
|------|---------------|
| SPRINT.md | What we're DOING (operational, changes every session) |
| PROJECT_STATUS.md | What we've DONE + known issues (historical record) |
| ROADMAP.md | WHEN things are planned (strategic, rarely changes) |
| CLAUDE.md | WHERE to look (routing, auto-loaded) |
| README.md | GitHub landing page (human-facing) |
| INDEX.md | Doc navigation hub (find any doc) |

### SPRINT.md Format

- Multi-stream from day one (Work Stream 1, 2, ... N)
- Each stream: Feature name, TDD Phase (0-7), Status, Sprint Plan table, Blockers
- HTML comment template for adding parallel work streams
- Next Sprint backlog + Completed Sprints reference

---

## Files Modified (16 total)

- `README.md` (rewritten)
- `docs/INDEX.md` (rewritten)
- `SPRINT.md` (created)
- `docs/planning/NEXT.md` (deleted)
- `PROJECT_STATUS.md` (restructured)
- `CLAUDE.md` (phase summary + 3 refs)
- `docs/workflows/boot-up.md` (phase summary + 3 refs)
- `docs/workflows/close-down.md` (4 refs)
- `docs/workflows/feature-development.md` (phase table + 1 ref)
- `docs/planning/PRODUCT_SPEC.md` (15 edits)
- `docs/planning/lifecycle-roadmap-decisions.md` (status markers)
- `docs/planning/DEFERRED_DECISIONS.md` (footer + terminology)
- `docs/agents/contexts/sprint-agent.md` (3 edits)
- `docs/planning/ROADMAP.md` (1 link)
- `MEMORY.md` (1 ref)
- `docs/planning/sessions/2026-03-03-doc-restructuring-overlap-elimination.md` (this file)

---

## Decisions Made

1. **Delete NEXT.md** — redundant with PROJECT_STATUS.md; absorbed by SPRINT.md
2. **SPRINT.md at root level** — next to PROJECT_STATUS.md for easy access
3. **Multi-stream from start** — SPRINT.md supports parallel work streams via numbered sections
4. **Phase 0-7 canonical naming** — all docs now use: 0-Feature context, 1-Behaviors, 2-Write tests, 3-Run tests RED, 4-Design, 5-Implement GREEN, 6-Verify, 7-Document

---

## Next Steps

- Phase 1.6 Polish & Launch work (see SPRINT.md for sprint plan)
- No code changes needed from this session
