# One topic, one file — pass 4 of the thinking-tree consolidation: names that say what is inside

---
id: TASK-UNI-05
title: "Pass 4 after TASK-UNI-04: the discovery register becomes one file, the knowledge base moves to research, growth becomes one canon file, the engineering pair merges, and the index gets a Start-here block"
status: in-progress — executed 2026-09-16 on branch docs/thinking-pass-4; done at merge
assigned_to: claude
priority: medium
owner: ecosystem
wave: eid
depends_on: [TASK-UNI-04]
estimated_hours: 3
---

## Why

Stefan, 2026-09-16, after pass 3 landed: the folder still had names that told a first-time viewer nothing about their content — five `discovery--` files whose second token was a date, one of them called "universe" as if it held everything — and nobody had challenged what content goes into which file or how many files there should be. The directive: rearrange content and names so that someone from the outside, just starting to learn about the project, knows from the filename what FringeIsland content to expect, and keep the number of files down.

## The ruling — Stefan's list, then three confirmations

Stefan cited the target listing (2026-09-16) and confirmed the three content moves that changed it from the listing's four discovery files to one: **"2. one file as recommended. 4. ok. 3. okay."**

| # | Item | Ruling | Result |
|---|---|---|---|
| 1 | Growth | From the cited list | `canon--growth--three-questions.md` (`git mv`, history follows) + `canon--growth--engagement-spectrum.md` → **`canon--growth--how-growth-works.md`**: the red thread, Live / Grow / Matter, the 9-cell matrix, the engagement spectrum, the member archetypes, each section keeping its own grade line. No canon sentence rewritten. |
| 2 | Discovery | **One file** — "one file as recommended" | `discovery--2026-05-18--universe-session-01.md` (`git mv`, history follows) + `discovery--tracker-and-backlog.md` + `discovery--2026-05-28--portal-ideas-from-research.md` + `discovery--2026-07-24--gimbal-origin-and-altered-states.md` → **`discovery--the-universe-in-the-making.md`**, three parts: Part 1 where things stand (session log, backlog, sounding-board notes, graduation tracker — headings kept verbatim one level deeper), Part 2 the ideas on the table (Candidate A portal types, Candidate B the Gimbal's origin), Part 3 the sessions (Session 01, S001–S048, append-only; future sessions append and number on). Text carried unchanged apart from heading levels, the front matter of the portal note rendered as bold lines, and four in-file pointers. |
| 3 | Knowledge base | **To research** — "okay" | `discovery--2026-06-15--knowledge-base-whisp-and-universe-foundations.md` → **`research--growth--thinkers-and-models-behind-the-whisp.md`** (`git mv`; text unchanged). By content a study with implications, the shape of the three growth reports. |
| 4 | Engineering | **Merge** — "ok" | `research--engineering--performance-budget.md` (`git mv`) + `research--engineering--cold-start-industry.md` → **`research--engineering--performance-budget-and-cold-start.md`**, Report A and Report B, verbatim. |
| 5 | Index | From the plan | `README.md` rewritten: a **Start here** block (the three-step lookup — graduation table, Status line, ADR — then the change path: state it in a session, ratify it in Claude Code, ADR if a contract moves; research never becomes canon), a reading order, the convention line (`<register>--<topic>` for the two single-file registers), the tables. |
| 6 | Steering and tooling | Carve-outs, merge on the nod | `AGENTS.md` (sessions append to the one file), the Claude.ai discovery instructions (write target, register table, session and candidate shapes, Part 1 rules), `doc-health-check` §10 path and four §3.6 rows, `scripts/dashboard/sources.json` (two paths, the backlog heading one level deeper), `docs/ecosystem/README.md` (two pointers; the stale `canvas--` in its register list dropped). |
| 7 | Left alone | — | The three growth reports, the two worlds surveys, the two method reports, the two records, the CQ register, the three Canonical cores, the narrative core, privacy-model, kickstarter-season-zero. No area word renamed. The transcript not split by subject. |

**Count:** 26 → **21** `.md` files (7 canon, 1 discovery, 1 questions, 9 research, 2 records, the index); 3 `.docx` twins unchanged.

## Sweep

Nine old names, one mapping, applied by a script over every tracked text file: 21 files touched, 39 replacements. Links repointed everywhere, including three ADRs (U025, U026, U031 cite the session record; U036 and U043 the engineering reports), two archived openers, the Mist reconciliation register and the platform domain README. Session bridges: links only; their plain-text mentions of old names stay as history (seven, listed by the script). TASK-UNI-02/03/04 untouched (their mapping tables are the record of the earlier names). The doc-health skill, `sources.json`, the new discovery file and the index were edited by hand and excluded from the script — the first two name old files deliberately, the last two would otherwise have had their history lines rewritten into self-references (pass 1's trap 3).

## Verification

- Index exact both directions: 23 / 23 (20 `.md` + 3 `.docx`).
- Old names absent from active files (bridges and TASK-UNI records excluded).
- Relative-link resolver over every tracked `.md` against a detached worktree of HEAD: **80 unresolved before, 80 after, zero new**.
- The discovery file: tooling headings present at H3 ("Session log", "Discovery backlog (open topics awaiting sessions)", "Sounding-board notes", "Graduation tracker"); the CQ register's anchor link into the backlog still resolves; the three Canonical cores named in the graduation table (§10).
- Every `fringeisland-thinking/` path in a `CLAUDE.md`, `AGENTS.md` or `sources.json` resolves; the doc-health skill's own §3.6 table names retired files by design.
- `npm run dashboard`: 917 files, the backlog section rendered from the new path and heading level, zero "Section not found".
- Front-door gate: run before commit 2.

## Done when

- [x] Stefan's list and the three confirmations recorded here
- [x] The four content moves executed as content, not renames; history follows the moved file in each merge
- [x] Every referrer repointed; index exact both directions; link resolver zero new
- [x] `AGENTS.md`, the Claude.ai instructions, the doc-health skill and `sources.json` describe the one-file discovery register
- [x] Dashboard regenerates from the new paths
- [ ] Bridge written, front door repointed, PR merged on the nod; TASK-UNI-04 and this task flipped to done at the close
