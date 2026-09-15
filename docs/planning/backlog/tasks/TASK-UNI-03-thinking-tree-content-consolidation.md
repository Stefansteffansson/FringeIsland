# Consolidate the content of `docs/fringeisland-thinking/` — pass 2 of the thinking-tree flatten

---
id: TASK-UNI-03
title: "Pass 2 after TASK-UNI-02: rule the graded files, retire superseded versions, drop the navigation tables that the index now owns, decide the fate of the raw transcripts"
status: done — merged as #658 on 2026-09-15; rulings recorded below; pass 3 is TASK-UNI-04
assigned_to: claude
priority: medium
owner: ecosystem
wave: eid
depends_on: [TASK-UNI-02]
estimated_hours: 3
---

## Why

[TASK-UNI-02](TASK-UNI-02-flatten-thinking-tree-into-fringeisland-thinking.md) moved 39 files into one flat folder **content-pure** — every file's body is byte-identical to what it was, so git's rename detection and `--follow` history hold. That deliberately left the content questions for a second pass on its own branch, where the diff is readable. This is that pass.

## Items — each gets a written ruling before an edit

| # | File | Question | Recommendation |
|---|---|---|---|
| 1 | `canon--community--member-archetypes.md` | Its Status line says **"Thinking — needs deepening and validation"** while its register says canon (it sat under `universe/` by location). Ratify, or re-register as `discovery--`? | Stefan's ruling. If it stays canon, the Status line must say so; if not, rename to `discovery--community--member-archetypes.md` and add a backlog row in `discovery--tracker-and-backlog.md`. |
| 2 | `research--growth--what-fills-a-life-v1.md` (headless — no H1) and `research--method--multi-product-ecosystem-management-rev1.docx` | v2 / rev2 supersede them. Retire? | Delete v1 and rev1; the git history keeps them. The index row for v1 already says "superseded by v2". |
| 3 | `canon--cosmology--worlds-topology.md`, `canon--roles--taxonomy.md`, `canon--beings--whisp-and-npcs.md`, `canon--narrative--how-story-works.md` | Each carries a **"Sub-pages"** section — a navigation table repointed in pass 1. The index does that job now. | Delete the Sub-pages sections; keep any prose in them that is not navigation. |
| 4 | `discovery--tracker-and-backlog.md` | Its **"Sessions"** list duplicates the index's discovery table. | Delete the Sessions list; keep backlog, sounding-board notes, graduation tracker (read by `doc-health-check` §10 and the dashboard — keep those headings verbatim). |
| 5 | `discovery--2026-05-18--universe-session-01.md` (1,744 L) and `discovery--2026-06-15--knowledge-base-whisp-and-universe-foundations.md` (1,632 L) | Leave as append-only records, or split by section? | Leave. They are the source of S001–S048 and are cited by statement number from the cores, ADRs and the reconciliation register; splitting breaks the citations. |
| 6 | `canon--narrative--how-story-works.md` | Lists **planned** sub-pages (seasons, episodes, first experience…). Do they become `canon--narrative--*` files, or is the plan dropped? | Keep the plan as a short "still to write" line; drop the table. |
| 7 | Directory references that now land on the index | Pass 1 mapped a link to a former directory (`universe/`, `thinking/`, `research/`, `personal-growth/`, `community/`) onto `README.md`. In a few prose sentences the wording now reads "(→ `docs/fringeisland-thinking/README.md`)" where "(→ `canon--*`)" would read better. | Optional tidy; grep `fringeisland-thinking/README.md` in prose and re-word where a register would be more precise. Not required for correctness — the index is the right landing. |

## Rulings (Stefan, 2026-09-15 — "go but keep (create?) whisp.md, npcs.md, seasons-and-episodes.md, journeys.md, first-experience.md")

| # | Ruling | Done |
|---|---|---|
| 1 | **Keep as is.** The register says where a file lives; its Status line carries the grade — the convention already accommodates "Thinking" under `canon--`. No edit. | — |
| 2 | **Retired** `research--growth--what-fills-a-life-v1.md` and `…-rev1.docx` (zero live references; git history keeps them); index rows updated. | yes |
| 3 + 6 | **Amended by Stefan: the five planned pages become real files.** Created as scaffolds — scope verbatim from the tables, pointers to where the substance lives today, Status "Planned — scaffold only", sections empty on purpose; no canon written. The cores' tables now link to them ("Companion pages"). | yes |
| 4 | **Deviation from the recommendation:** the Sessions table is **kept** — its Status cell holds Session 01's resume history (statement ranges per resume), which the index does not. Retitled "Session log" with a line saying what it carries. | yes |
| 5 | Left as records. | — |
| 7 | 12 sentences re-pointed from the index to the precise register (`canon--*`, `canon--growth--*`, `discovery--*`, one to the specific research file); 14 left where the index is the right landing. Two of the 12 are in carve-out files (ADR-U044, `journeys/CLAUDE.md`) — path wording only. | yes |
| 8 | Left — a correctly-worded historical note. | — |
| 9 *(raised by Stefan mid-review)* | **The `canvas--` register dissolved.** Four app-side files → the `FringeIsland-canvas` repo (`15921fb`); `the-seam.pdf` → `docs/novel/` (a short story, self-declared non-canon); the two Gimbal images deleted — the app serves them from its data folder (byte-identical copies), the canvas repo refuses them by policy. Five registers remain. | yes |

## Done when

- [x] Every item above has a ruling recorded here (who, when, what)
- [x] The edits are on one branch, one PR, reviewed as content changes (not renames)
- [x] `doc-health-check` run: README index, §10 graduation tracker (the headings item 4 depends on are intact)
- [x] The index `README.md` rows for any deleted or re-registered file updated in the same PR
