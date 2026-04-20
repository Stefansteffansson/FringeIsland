# How We Work

**Audience:** anyone who wants to understand how FringeIsland is actually developed — end-to-end, from ecosystem purpose down to the shipped code.

**Purpose:** a single navigable description of the FringeIsland development system, intended both as a self-orientation aid for Stefan and as onboarding material for future contributors.

**Status:** living document. Reflects the state of the ecosystem as of 2026-04-19. Updated whenever a canonical source (PROCESS.md, a skill, a tier CLAUDE.md, an ADR) changes materially.

---

## How to read this

The development system has four axes. Each axis is described in its own chapter with a diagram and prose. You can read them in any order, but the order below is the one that builds understanding fastest:

1. **[Decomposition cascade](./01-decomposition.md)** — how work descends from ecosystem vision down to individual tasks. The vertical axis.
2. **[Cadence and waves](./02-cadence-and-waves.md)** — how time is structured. Cycles, cooldowns, retros, the six waves. The horizontal axis.
3. **[Execution — backlog and kanban](./03-execution-kanban.md)** — how items move through refinement into an active cycle board.
4. **[Execution — the build loop](./04-execution-build-loop.md)** — what happens when a task is being worked on. Research, plan, annotate, implement. BDD and TDD.
5. **[Agent routing](./05-agent-routing.md)** — how an agent or human enters the system and builds context. The routing axis that wraps everything else.

An interactive version of all five diagrams with click-to-expand gap commentary is available at [`index.html`](./index.html) — open it in a browser. A shareable Word document of the whole set is at [`FringeIsland-how-we-work.docx`](./FringeIsland-how-we-work.docx).

## Gaps

The system has known documentation and design gaps. They are flagged inline in each chapter and consolidated in [`gaps.md`](./gaps.md). The gaps are surfaced honestly because the primary audience for this document (Stefan) is using it to spot what's missing. Future contributors should treat the gap list as a to-do, not a stable description of the system.

As of this writing, there are seventeen flagged gaps across the four axes. None of them is blocking current solo-operator work. All of them compound as the system scales toward the fifty-plus-contributor target.

## Canonical sources this document is built on

This document is a view onto the canonical sources. When they change, this document must be updated to match. When this document disagrees with a canonical source, the canonical source wins.

- `docs/ecosystem/VISION.md` — the constitutional document
- `docs/planning/PROCESS.md` — way of working (strategic layer)
- `.claude/skills/*/SKILL.md` — the four skills (execution layer)
- `/CLAUDE.md`, `/AGENTS.md` — root orientation and boundaries
- `docs/{tier}/CLAUDE.md` — tier-specific guidance (five files)
- `docs/templates/*.md` — the reusable shapes
- `docs/architecture/decisions/*.md` — ADRs, especially U002 (verticals), U022/U023/U024 (architecture), and any decisions referenced inline

## Document structure

```
how-we-work/
├── README.md                         this file
├── index.html                        interactive navigable version
├── 01-decomposition.md               vertical axis
├── 02-cadence-and-waves.md           horizontal axis
├── 03-execution-kanban.md            kanban + refinement
├── 04-execution-build-loop.md        per-task build loop
├── 05-agent-routing.md               routing axis
├── gaps.md                           consolidated 17-gap register
├── FringeIsland-how-we-work.docx     standalone Word doc
└── assets/                           diagrams as standalone SVG files
    ├── 01-decomposition-cascade.svg
    ├── 02-cadence-and-waves.svg
    ├── 03-kanban-and-refinement.svg
    ├── 04-build-loop-and-testing.svg
    └── 05-agent-routing.svg
```

## Living-document discipline

Because this document sits at `docs/ecosystem/how-we-work/`, it is part of the ecosystem tree (the permanent what), not the planning tree (the temporal how). It is therefore subject to the `doc-health-check` skill at cycle boundaries. If a canonical source changes and this document drifts, the drift is a finding the health check should catch.

When updating this document:

- Update the relevant chapter first, then re-check the cross-references in the other chapters.
- Update the SVG in `assets/` if the diagram changes. The markdown chapter references it by relative path; the HTML reads it as an embedded resource; the docx embeds a rendered copy.
- Add a line to `gaps.md` when a new gap is surfaced, and remove the corresponding callouts from the axis chapter when a gap is resolved.

---

*Authored in session 2026-04-19. Last updated 2026-04-19.*
