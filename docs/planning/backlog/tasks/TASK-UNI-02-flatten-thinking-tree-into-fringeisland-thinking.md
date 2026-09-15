# Flatten the thinking tree into `docs/fringeisland-thinking/` — one folder, the filename carries the register

---
id: TASK-UNI-02
title: "Move docs/research, docs/ecosystem/thinking and docs/ecosystem/universe into one flat folder, docs/fringeisland-thinking/, with a register--area--topic naming convention; repoint every reference; update the agent cascade and skills"
status: in-progress — pass 1 executed 2026-09-15 on branch docs/flatten-thinking-tree (commits A move / B sweep / C steering / D bookkeeping); done at merge
assigned_to: claude
priority: high
owner: ecosystem
wave: eid
depends_on: []
supersedes: TASK-UNI-01
estimated_hours: 6 (pass 1) + 3 (pass 2, follow-up)
---

## Why

Raised by Stefan 2026-09-14: the discovery and canonical documentation is nested five to six levels deep for ~40 documents. Vital information cannot be found. `docs/ecosystem/universe/` alone has 13 files, 8 of them `README.md`; four directories hold nothing but a README. This absorbs [TASK-UNI-01](TASK-UNI-01-collapse-universe-single-readme-dirs.md), whose question ("collapse the single-README dirs?") is answered by this task's shape.

## Decisions (Stefan, 2026-09-14)

1. **One folder**, `docs/fringeisland-thinking/`; the **filename prefix carries the register** (canonical vs exploratory vs research). No sub-directories.
2. `VISION.md`, `MANIFESTO.md`, `PRINCIPLES-AI.md`, `strategy/`, `how-we-work/` **stay** in `docs/ecosystem/` — constitutional, named everywhere, and the "two trees" rule names `docs/ecosystem/`.
3. **Two passes.** Pass 1 = relocate + rename + index + reference sweep (this task). Pass 2 = content consolidation, filed separately as a follow-up (see §6 for why it is not in the same session).
4. Naming convention as in §2.
5. `.docx` twins are **kept** and renamed to their `.md` sibling's new name.
6. **Every** referencing file is repointed — ADRs, old bridges, retros, archived openers included. Link rot is not a decision change.

## 1. Inventory (verified on disk 2026-09-14)

| Tree | Files | Of which `README.md` | Max depth | Inbound referencing files |
|---|---|---|---|---|
| `docs/research/` | 17 (13 md, 4 docx) | 1 | 3 | 28 |
| `docs/ecosystem/thinking/` | 15 (11 md, 4 binary — 6.5 MB) | 3 | 6 | 34 |
| `docs/ecosystem/universe/` | 13 (13 md) | 8 | 5 | 89 |

Steering files that name these paths: root `CLAUDE.md` (5 rows), `AGENTS.md` (Discovery-worktree write surface = `docs/ecosystem/`), `.claude/skills/doc-health-check/SKILL.md` (Section 10 graduation-tracker procedure greps `docs/ecosystem/universe/*/README.md`), `.claude/skills/ecosystem-decomposition/SKILL.md` (read-context lines), `scripts/dashboard/sources.json` (15 path entries), `docs/README.md` (5 rows), `docs/ecosystem/README.md` (tree + contents), 8 tier/entity `CLAUDE.md` files (links). `scripts/session-opener.js` hardcodes nothing. No jest test names any of the three paths.

## 2. The naming convention

```
<register>--<area>--<topic>.ext          canon, research, record
<register>--<yyyy-mm-dd>--<topic>.ext    discovery (dated sessions)
<register>--<topic>.ext                  questions, canvas (small, single-area registers)
```

The first token is **what kind of thing this is** (the register). The second token is **what you would scan for inside that register**: the area for canon and research, the date for discovery sessions. Double-dash separates tokens; single dashes are inside a token. Sorted alphabetically, any file lister groups by register, then by area or date. Six registers:

| Register | Meaning | Was |
|---|---|---|
| `canon--` | The canonical world. What the universe **is**. Status line inside the file carries the finer grade (Canonical / Extracted / Thinking). | `docs/ecosystem/universe/` |
| `discovery--` | Dated working sessions on the universe, plus their graduation tracker and backlog. Never canon. | `docs/ecosystem/thinking/universe-discovery/` + the 2026-06-15 knowledge base |
| `research--` | Reports and studies — domain (`growth`), worldbuilding (`worlds`), way-of-working (`method`), engineering (`engineering`). | `docs/research/` |
| `record--` | Design records and snapshots produced by a session — neither research nor canon. | the two "design records" in `docs/research/` |
| `questions--` | The ecosystem open-questions (CQ) register. | `docs/ecosystem/thinking/OPEN_QUESTIONS.md` |
| `canvas--` | What was kept from the discovery-canvas experiment (2026-09-11..14). | `docs/ecosystem/thinking/canvas-experiment/` |

Areas under `canon--`: `cosmology`, `roles`, `beings`, `narrative`, `growth`, `community`. The Kickstarter joins `community` (it is the founding moment). Areas under `research--`: `growth`, `worlds`, `method`, `engineering`.

## 3. The mapping — every file

**FOLD** = a navigation-only README whose table is obsoleted by flattening; its Purpose/Overview prose goes into the new index `README.md`, the file is deleted.

### canon-- (was `docs/ecosystem/universe/`)

| Old | New | Note |
|---|---|---|
| `universe/README.md` | FOLD → `README.md` | purpose + graduation path prose |
| `universe/cosmology/README.md` | `canon--cosmology--worlds-topology.md` | Canonical (Session B) |
| `universe/roles/README.md` | `canon--roles--taxonomy.md` | Canonical (Session B) |
| `universe/beings/README.md` | `canon--beings--whisp-and-npcs.md` | Canonical (Session B) |
| `universe/narrative/README.md` | `canon--narrative--how-story-works.md` | Respawn section ratified 2026-06-10 |
| `universe/personal-growth/README.md` | FOLD | |
| `universe/personal-growth/three-questions.md` | `canon--growth--three-questions.md` | Extracted + Live/Grow/Matter |
| `universe/personal-growth/engagement-spectrum.md` | `canon--growth--engagement-spectrum.md` | Extracted |
| `universe/personal-growth/privacy-model.md` | `canon--growth--privacy-model.md` | Extracted, re-grounded ADR-U031 |
| `universe/community/README.md` | FOLD | |
| `universe/community/member-archetypes.md` | `canon--community--member-archetypes.md` | **Status says "Thinking"** — location says canon; the rename keeps the location's register and does not re-grade. Pass-2 ruling. |
| `universe/kickstarter/README.md` | FOLD | |
| `universe/kickstarter/kickstarter-vision.md` | `canon--community--kickstarter-season-zero.md` | Extracted |

### discovery-- (was `docs/ecosystem/thinking/` and its `universe-discovery/`)

| Old | New | Note |
|---|---|---|
| `thinking/README.md` | FOLD | |
| `thinking/universe-discovery/README.md` | `discovery--tracker-and-backlog.md` | graduation tracker, backlog, sounding-board notes; its "Sessions" list is replaced by the index. `doc-health` §10 and the dashboard read sections from it — headings unchanged. |
| `…/2026-05-18_universe-discovery-session-01.md` | `discovery--2026-05-18--universe-session-01.md` | 1,744 L, the source of S001–S048 |
| `…/2026-05-18_universe-discovery-onboarding-summary.md` | `discovery--2026-05-18--the-universe-explained.md` | |
| `…/2026-05-28_portal-ideas-from-research.md` | `discovery--2026-05-28--portal-ideas-from-research.md` | |
| `…/2026-07-24_gimbal-origin-and-altered-states.md` | `discovery--2026-07-24--gimbal-origin-and-altered-states.md` | CANDIDATE, not locked |
| `thinking/2026-06-15_knowledge-base_whisp-and-universe-foundations.md` | `discovery--2026-06-15--knowledge-base-whisp-and-universe-foundations.md` | 1,632 L |

### questions--

| Old | New |
|---|---|
| `thinking/OPEN_QUESTIONS.md` | `questions--ecosystem-open-questions.md` |

### canvas-- (was `docs/ecosystem/thinking/canvas-experiment/`)

| Old | New |
|---|---|
| `canvas-experiment/README.md` | `canvas--what-was-kept.md` |
| `canvas-experiment/canvas-tab-taxonomy.md` | `canvas--tab-taxonomy.md` |
| `canvas-experiment/feedback-v0.4.md` | `canvas--feedback-v0.4.md` |
| `canvas-experiment/assets/The-Seam.pdf` | `canvas--the-seam.pdf` |
| `canvas-experiment/assets/canvas-dark-VARIANT.png` | `canvas--mockup-dark-variant.png` |
| `canvas-experiment/assets/gimbal-dusk.jpg` | `canvas--gimbal-dusk.jpg` |
| `canvas-experiment/assets/gimbal-workshop.jpg` | `canvas--gimbal-workshop.jpg` |

### research-- and record-- (was `docs/research/`)

| Old | New | Note |
|---|---|---|
| `research/README.md` | FOLD | |
| `Kegan_ITC_Research_Report.md` | `research--growth--kegan-immunity-to-change.md` | |
| `What_Fills_a_Life_v1.md` | `research--growth--what-fills-a-life-v1.md` | headless (no H1) — pass 2: retire? |
| `What_Fills_a_Life_v2.md` | `research--growth--what-fills-a-life-v2.md` | |
| `What_Fills_a_Life_Human_Flourishing_v2.docx` | `research--growth--what-fills-a-life-v2.docx` | twin kept |
| `Theory_U_Research_Report.md` | `research--growth--theory-u.md` | |
| `Portal_Fantasy_Research_Report.md` | `research--worlds--portal-fantasy.md` | |
| `Parallel_Worlds_Research_Report.md` | `research--worlds--parallel-worlds.md` | |
| `multi-product-ecosystem-management_2.md` | `research--method--multi-product-ecosystem-management.md` | |
| `Multi-Product-Ecosystem-Management-FringeIsland.docx` | `research--method--multi-product-ecosystem-management-rev1.docx` | twin kept |
| `Multi-Product-Ecosystem-Management-FringeIsland rev 2.docx` | `research--method--multi-product-ecosystem-management-rev2.docx` | twin kept |
| `The solo developer's complete guide to systematic web development.md` | `research--method--solo-developer-systematic-web-development.md` | |
| `Solo-Developers-Guide-to-Systematic-Web-Development.docx` | `research--method--solo-developer-systematic-web-development.docx` | twin kept |
| `Performance_Budget_Research_Report.md` | `research--engineering--performance-budget.md` | |
| `2026-07-10-cold-start-industry-research.md` | `research--engineering--cold-start-industry.md` | date stays in the H1 |
| `breach-response-design.md` | `record--breach-response-gdpr-art-33-34.md` | design record |
| `universe-to-spec-manifestation.md` | `record--universe-to-spec-manifestation.md` | snapshot map |

**Result:** 45 files in → 39 moved + 6 folded; plus one new `README.md` = **40 files, one level deep**.

## 4. The index — `docs/fringeisland-thinking/README.md`

One file, written in pass 1: the six registers explained (the table in §2), then one table per register with one row per file (name, what it is, status). Carries the Purpose and graduation prose from the three folded tree READMEs. Graduation becomes: *a discovery concept that crystallises is written into a `canon--` file and gets a row in `discovery--tracker-and-backlog.md`.* `doc-health-check`'s README-index check verifies this file.

## 5. The sweep — what changes outside the folder

| Where | Change | Nod? |
|---|---|---|
| `CLAUDE.md` (root) | doc-map rows 81–83, 86, 108 → new paths; "Two trees" line gains `docs/fringeisland-thinking/` on the ecosystem (WHAT) side | **yes** — steering |
| `AGENTS.md` "Discovery worktree" | write surface, sweep step 1–2 and anomaly rule: `docs/ecosystem/` → `docs/ecosystem/` **and** `docs/fringeisland-thinking/` | **yes** — steering |
| `.claude/skills/doc-health-check/SKILL.md` | §10 procedure: enumerate `docs/fringeisland-thinking/canon--*.md` with Status "Canonical"; tracker path → `discovery--tracker-and-backlog.md`; trigger row (line 46), concept row (148) | **yes** — steering |
| `.claude/skills/ecosystem-decomposition/SKILL.md` | read-context lines 102–103; graduation wording | **yes** — steering |
| `scripts/dashboard/sources.json` | 15 path entries repointed; section headings unchanged so `type: section` readers keep working | no |
| `docs/README.md` | rows 59, 92, 94, 98, 118 → one `fringeisland-thinking/` row + updated tree | no |
| `docs/ecosystem/README.md` | tree and contents lose `universe/` and `thinking/`; one pointer row | no |
| 8 tier/entity `CLAUDE.md` | link repoints only | **yes** — steering |
| ~120 other files (planning bridges/retros/openers, ADRs, specs, `docs/novel/`) | mechanical link repoint, anchors preserved | ADRs: **yes** |
| Links **inside** the moved files | relative depth recomputed (they drop from 3–5 levels under `docs/` to 2); sibling links become `./canon--…` | no |

Verification: a relative-link resolver run over the whole tree **before and after** (zero new unresolved links); `npm run dashboard` regenerates; `doc-health-check` run (README index, broken links, §10 tracker, cascade §9); `npm run test:unit` for the docs gates.

## 6. Execution — one branch, three commits, one PR

Branch `docs/flatten-thinking-tree`.

1. **Commit A — the move.** `git mv` all 39 files, **no content edits** — so git's rename detection holds and `git log --follow` survives the move. Add the new `README.md`; delete the 6 folded READMEs.
2. **Commit B — the sweep.** Mapping-driven link rewrite across the repo and inside the moved files. Resolver diff attached to the PR.
3. **Commit C — steering.** `CLAUDE.md`, `AGENTS.md`, the two skills, `sources.json`, `docs/README.md`, `docs/ecosystem/README.md`.
4. Close TASK-UNI-01 as absorbed; file TASK-UNI-03 (pass 2, §7).
5. PR opened; **merge waits for Stefan's nod** (steering + ADR edits are fuller-auto carve-outs).
6. After merge: sync `main` → `discovery` worktree and push, per AGENTS.md.

**Why pass 2 is a follow-up, not this session:** the move commit must be content-pure for rename detection; pass 1 already touches ~130 files and three steering files; content edits mixed into the same PR make the diff unreviewable. Pass 2 goes on its own branch after this PR merges.

## 7. Pass 2 — content consolidation (follow-up, TASK-UNI-03)

- `canon--community--member-archetypes.md` — Status "Thinking" under a canon register: ratify, or move to `discovery--`. Stefan's ruling.
- `research--growth--what-fills-a-life-v1` (md, headless) vs `-v2` — retire v1 and the rev1 docx?
- "Sub-pages" tables inside `canon--cosmology`, `canon--roles`, `canon--beings`, `canon--narrative` — repointed in pass 1; probably delete, the index does that job now.
- `discovery--tracker-and-backlog.md` — drop its "Sessions" list (duplicates the index).
- The two 1,600–1,750-line raw transcripts — leave as records, or split by section.
- `canon--narrative--how-story-works.md` lists planned sub-pages — decide whether they become `canon--narrative--*` files or are dropped from the plan.

## Done when (pass 1)

- [ ] `docs/research/`, `docs/ecosystem/thinking/`, `docs/ecosystem/universe/` no longer exist
- [ ] `docs/fringeisland-thinking/` holds 40 files, none in a sub-directory, every name conforming to §2
- [ ] Link resolver: zero unresolved relative links repo-wide (same count as before or lower)
- [ ] `npm run dashboard` regenerates without error; `doc-health-check` clean on README index, broken links, §9 cascade, §10 tracker
- [ ] Steering files updated and merged on Stefan's nod; `discovery` worktree synced
- [ ] TASK-UNI-01 closed as absorbed; TASK-UNI-03 filed with §7
