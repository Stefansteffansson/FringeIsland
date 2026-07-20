# Cycle C-B close: sweeps, walkthrough, 6-done, note clears

---
id: TASK-CB-05
title: Full sweeps + plain-English walkthrough + 6-done transitions + H016/H017 pending-note clears + CHANGELOG
status: todo
assigned_to: claude
priority: high
feature: FEAT-H026
owner: hub
wave: ferd
cycle: C-B
depends_on: [TASK-CB-02, TASK-CB-04]
estimated_hours: 2
---

## Description
Post-apply close: full unit + integration + E2E sweeps, lint, `next build` (the type gate). Plain-English walkthrough walked against shipped behaviour (continuity questions: leave→former→rejoin→name; hard-delete→Unknown; tombstone thread integrity). 6-done transitions for PD009 + H026 with Implementation notes (red→green recorded honestly) + §L4 rows + feature READMEs in the same commits. Clear FEAT-H016:44 + FEAT-H017:45 `pending-DS-5` MEM-9 notes (landed-via-FEAT-H026). `hub/CHANGELOG.md` C-B entry. Deep-cold spot check disposition: C-B adds a section read on an existing page (`/groups/[id]`) — record the ADR-U043 Amendment 1 call (touched-page spot measurement) with idle depth, or the labelled standing-exception ruling.

## Acceptance criteria
- [ ] All sweeps green (any pre-existing failure fenced "found (not caused)" by name)
- [ ] Both specs 6-done with honest Implementation notes; §L4 + READMEs updated same-commit
- [ ] H016/H017 notes cleared; CHANGELOG entry written; session bridge at close
- [ ] MEM-9 hook-set note: no gaps.md entry exists (grep zero, 2026-07-20) — record for the area-gate re-verify

## Verification
Dashboard refresh; bridge written; branches merged and cleaned per fuller-auto.
