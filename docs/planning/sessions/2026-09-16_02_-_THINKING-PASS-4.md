# Session bridge — 2026-09-16 (second) — Thinking tree pass 4: names that say what is inside, one discovery file

**Cycle:** The Eid kickoff (front door unchanged in substance — a documentation consolidation, not build work)
**Trigger:** Stefan, after pass 3 landed: the discovery names told a first-time viewer nothing ("universe-session-01", "statements"), and nobody had challenged what content goes into which file or how many files there should be. "File names need to tell the viewer what content related to FringeIsland he/she can expect if/when the files are opened."

---

## The conversation that shaped it

Four rounds of challenge, each of which changed the plan:

1. *Why multiple discovery files, and why is one called "universe"?* — the word was the old activity's name ("Universe Discovery"), carried content-pure through the flatten; the five files were four kinds wearing one prefix.
2. *"discovery--statements.md" — statements about what?* — a format word, not a content word. Every file states things.
3. *"...when we already have ...-FOUNDATIONS.md"* — a collision check I should have run on my own proposal.
4. *Why four files and not one or fifteen?* — the honest content inventory: a 1,744-line primary record, a 1,632-line study, two short candidate notes, a 70-line status block. The study is research by content; the rest is one register of "what is not canon yet".

Two side questions answered on the way, now written into the index's Start-here block: *where do I look for what is true right now, and where do I start changing it* (the graduation table → the Status line → the ADR; change by session → ratification → ADR if a contract moves), and *how does discovery or research become canon* (research never does; it feeds a session; what Stefan states there is what gets ratified).

## Decisions (Stefan, 2026-09-16)

The cited target list, plus: **"2. one file as recommended. 4. ok. 3. okay."** — one discovery file; the engineering pair merged; the knowledge base to research. The growth merge was in the list.

## What was done — branch `docs/thinking-pass-4`, PR #666

| Move | Result |
|---|---|
| Discovery → one file | `discovery--the-universe-in-the-making.md`: Part 1 where things stand (the tracker, headings verbatim one level deeper — `sources.json` and doc-health §10 repointed), Part 2 the ideas on the table (Candidate A portal types, Candidate B the Gimbal's origin), Part 3 the sessions (Session 01, S001–S048; future sessions append and number on). The session record's history follows the file. |
| Knowledge base → research | `research--growth--thinkers-and-models-behind-the-whisp.md`, text unchanged. |
| Growth → one core | `canon--growth--how-growth-works.md`: the red thread, Live / Grow / Matter, the 9-cell matrix, the engagement spectrum, the archetypes; grades per section; no canon sentence rewritten. |
| Engineering → one report file | `research--engineering--performance-budget-and-cold-start.md`, Report A and B verbatim. |
| The index | Rewritten with a **Start here** block, a reading order, the convention line for the two single-file registers, the tables. |
| Steering | `AGENTS.md`, the Claude.ai discovery instructions (sessions and candidates append to the one file; Part 1 rules), the doc-health skill (§10 path, four §3.6 rows), `sources.json`, `docs/ecosystem/README.md` (two pointers; a stale `canvas--` dropped from its register list). |

**Count:** 26 → **21** `.md` files; the folder went 33 → 26 → 21 over two days.

**Sweep:** nine old names, one script, 21 files, 39 replacements; ADR-U025/U026/U031/U036/U043 path wording only; bridges links-only with their plain-text history kept (seven mentions, listed); the TASK-UNI records untouched; the doc-health skill, `sources.json`, the new discovery file and the index excluded and edited by hand — the last two would otherwise have had their own history lines rewritten into self-references (pass 1's trap 3, avoided this time by design).

**Verification:** index 23 / 23 both ways (docx twins included); link resolver against a detached HEAD worktree **80 before, 80 after, zero new**; old names absent from active files; tooling headings present and the CQ register's anchor into the backlog resolves; the three Canonical cores named in the graduation table; every `CLAUDE.md` / `AGENTS.md` / `sources.json` thinking path resolves; `npm run dashboard` 917 files, the backlog section rendered from the new path and heading level, zero "Section not found"; front-door gate 7/7.

## Worth keeping

- **Content first, kind second, never format.** "sessions" and "statements" describe how a file came to be; "the universe in the making" and "thinkers and models behind the Whisp" describe what a reader gets. Run the collision check on every proposed name, including against the files that are staying.
- **A register can be one file.** When the kinds inside a register are a primary record, a status block and a couple of notes, the reader is better served by one file with a real table of contents than by four files whose names need a glossary.
- **Reclassify by content, not by who wrote it.** The knowledge base sat in discovery because the discovery project produced it; by content it is research, and it now sits beside the reports it resembles.
- **The Start-here block answers the question every newcomer asks** — where is what is true, and where do I change it — in five lines at the top of the index. Keep it accurate as the folder changes.

## State at close

- PR #666 open; **merge waits for Stefan's nod** — steering carve-outs.
- After the merge: pull `main`, sync `main` → the `discovery` worktree (the Claude.ai instructions changed: sessions now append to one file), remove the "waiting" row from the front door, flip TASK-UNI-04 and TASK-UNI-05 to done.
- The three kickoff decisions on the front door are untouched by this session.

## Doc health after the merge (2026-09-17, on Stefan's request: "run the doc-health check on the whole folder")

```
Doc Health Check — 2026-09-17 — on-demand, after thinking-tree passes 3 and 4 (#664, #666 on main)

Sections run:
1.   Terminology drift            — skipped: no term renamed (the discovery register's shape changed, not a term)
1.5  Architectural drift           — 25 keywords over the folder + the 8 steering/config files the passes touched / 12 keyword hits, all historical, glossary or a different sense (transcript, retired-names table, "supersedes" section, the Claude.ai "never use X" clause, the solo-dev report's own phase plan) / 1 soft finding fixed in place: the 2026-06-13 manifestation record said "Shadow" for the entrant and cited ADR-U027 with no inline note — a vocabulary-note line added under its header (annotate, never rewrite a snapshot)
1.6  Unfiled deviation markers     — skipped: no code changed
2.   Schema drift                  — skipped: no migration
3.   Path + README sync            — index exact both directions 23 / 23 (docx twins included); 1 anchor link into the folder resolves; naming: the two record-- files carry no area token, which the convention line demanded — fixed in the index (record joins the <register>--<topic> form; no rename); docs/README.md still said "discovery sessions" — fixed ("the discovery work, one file"); link resolver over every tracked .md against a detached HEAD worktree: 3 459 links, 80 unresolved before and after, 0 new (the 80: 52 in session bridges, 9 in planning/reference, 8 template placeholders, 3 CHANGELOG, 8 other — all pre-existing; the two hub ROADMAP.md links are §7 registry scaffolding)
3.5  Archived-tree leak            — hits only in the frozen V1 anatomy (struck-through), two dated reference snapshots, the April method report's own recommendations, and a doc-health run record / 0 directive / clean
3.6  Deleted-file refs             — 23 filename groups checked / every pass-3 and pass-4 name: 0 hits in active files / older rows: the known reference-snapshot and provenance classes only (FOLDER_STRUCTURE banner'd, ADR-U025's own dissolution text, hub-legacy/, TASK-OBS-01, the test-script names) / 5 hits from the scaffold-and-growth names in a different shape, fixed in place: DS-3 journeys.md and DS-2 narrative.md said "the journeys.md / seasons-and-episodes.md sub-page is unwritten" (now "the narrative core's planned page … under Planned — not yet written"); FEAT-PD001 and FEAT-H011 cited the growth canon as bare `engagement-spectrum.md` / `three-questions.md` (now the how-growth-works file); ADR-U045 said "`first-experience.md` is unwritten" (path wording only) / disk cross-check: all 16 retired names absent, all 7 replacements present / 2 left as history: phase-1-review-findings (a Phase-1 record naming the pre-flatten path) and the solo-dev report's example path
3.7  Snapshot drift (inventories)  — skipped: no new snapshot restating an inventory
4.   Parked items                  — skipped: no wave shift
4.5  Manifest gate-review flags    — 0 flags / clean
5.   Maturity consistency          — whole-tree 6-done sweep: 100 specs, 0 without Implementation notes / front door: the latest-bridge row names the newest session file, the plan's Status is open / clean
6.   Entity coverage               — skipped: no entity changed status
7.   Expected placeholders         — no entry authored or introduced; the two hub ROADMAP.md links confirmed scaffolding
8.   Feature-inventory summary     — skipped: no feature created, advanced or deleted
9.   CLAUDE.md cascade consistency — 30 files / 0 broken load-order pointers / every fringeisland-thinking path in a CLAUDE.md, AGENTS.md or sources.json resolves (the doc-health skill's own 3.6 table names retired files by design) / clean
10.  Graduation-tracker completeness — 3 Canonical cores + the ratified narrative section + 5 discovery-sourced ADRs (U025, U026, U027 superseded, U028, U031) all have rows in Part 1 of the one discovery file; every canonical home in the table exists; the open-list note present / clean
11.  Anatomy freshness              — skipped: no ADR added or amended (ADR-U045 received a path-wording line only), nothing under docs/architecture/ moved

Critical findings: none.
Backlog items created: none.  Re-finds: none.
Placeholders confirmed scaffolding: docs/products/hub/DESCRIPTION.md and SPECIFICATION.md -> ./ROADMAP.md (§7 registry, T3.4).
Table updates: none this run — the 1.5 and 3.6 rows for passes 3 and 4 were fed in the passes themselves.
Fixes in place (9, one branch): the record's vocabulary note; the index convention line + prose; docs/README.md wording; journeys.md; narrative.md; FEAT-PD001; FEAT-H011; ADR-U045.
Notes: 3.6's filename grep found the scaffold names in a shape the pass-4 sweep could not — bare short names (`three-questions.md`) and "sub-page" prose — which is exactly why the section runs after every refactor; the two platform specs' ground-truth notes and the two journal feature specs were the only active files still describing the pre-fold shape.
```

*The check ran twice more that day on request (after #669 and #671) and found nothing; the no-op runs are summarised in one line in the [close bridge](2026-09-17_01_-_THINKING-TREE-CLOSE.md).*

## Content review of the discovery file (2026-09-17, Stefan: "run the four fixes and the open-threads reconciliation")

Stefan asked whether the one discovery file had been reviewed for content, not only for names and links. It had not — pass 4 moved its text unchanged. The review found five things and fixed them on one branch, nothing else touched:

- **Status lines**: Session 01 was still "In progress, resumed 2026-06-05" three months after its last edit; now "Closed at S48 (2026-06-21); the next session appends as Session 02 from S049", in the Part 3 header and the session log.
- **Candidate A** (the portal ideas, 2026-05-28) framed itself on the Statement-26 topology, one day before the 2026-05-29 reshape and before Session B ratified the cosmology core. A banner above it says: read the ten candidates against the core, not against the frame below. One stale path inside it (`universe-discovery/`) repointed to Part 3.
- **The open threads** already carried a first tag layer from the G-33 pass of 2026-05-29, against Statements 1–36 only. Every one of the 130 threads now carries a **second, dated tag** against everything after: the resumes to S48, the three ratified cores, ADR-U025 / U026 / U028 / U029 / U031 (and U018, U040, U044–U046 where touched), the DS-1 / DS-2 / DS-3 / DS-7 specs, PRINCIPLES-AI, the CQ register and the backlog. **Tally: 39 RESOLVED, 57 PARTIAL, 34 OPEN.** RESOLVED names the canonical home; PARTIAL the home and the remainder; OPEN where the thread is tracked (a planned page inside a core, a CQ, the backlog, a spec's open question). No bullet edited; the originals verified byte-for-byte as prefixes of the tagged lines. The Divergences section above the list carries a one-paragraph "reconciled by" note; its intro no longer says "graduate to `README.md`" (a pass-1 sweep artefact).
- **The graduation tracker's** verification date now names the two doc-health §10 runs of this week.
- **The backlog row for CQ-016** notes that the question sits in the register's Parked section and that the Hub v2 rebuild re-derived the DESCRIPTION it asks about.

What the tally says: of the threads Session 01 left open, three in ten are settled canon, four in ten are settled in their structure with a named remainder, and a quarter are genuinely open — almost all of those pointing at the same three places: the planned Whisp page, the planned NPC page, and the universe-mechanics fundamentals session the backlog names as the foundational next step. The reconciliation writes no canon; every tag is a pointer.
