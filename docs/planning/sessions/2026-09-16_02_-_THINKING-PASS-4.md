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
