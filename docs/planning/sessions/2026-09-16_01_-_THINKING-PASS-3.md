# Session bridge — 2026-09-16 — Thinking tree pass 3: one topic, one obvious file

**Cycle:** The Eid kickoff (front door unchanged in substance — a documentation consolidation, not build work)
**Trigger:** Stefan, 2026-09-15 evening: "today we have multiple files indicating similar content and for someone from the outside it's impossible to know which file to open and instead need to open each file to find what he/she is looking for." Condense where possible; renames allowed within the folder's convention.

---

## What the analysis found (TASK-UNI-04, filed 2026-09-15, #662)

33 `.md` files + 3 `.docx` twins. Five clusters where an outsider could not tell which file to open: the Whisp (four files, the one named `whisp.md` empty), narrative (four names for one page of content), Homebody / Explorer described twice under two areas, three "explain the universe" files of which the May summary was pre-Mist, and the sweep artefacts pass 1 had left (the tracker's Discipline block naming the retired convention and "graduate into `README.md`", nine old-path headings in the manifestation record, two footers, "six registers" in `AGENTS.md`). The research reports, the two records, the CQ register and the four long files were never in question.

## Decisions (Stefan, 2026-09-16)

| # | Ruling |
|---|---|
| D1 | **Fold** the five scaffolds created the day before back into their cores — reverses the 2026-09-15 "keep (create?)" ruling on purpose: the empty files were the confusion. |
| D2 | **`growth`**, not `community`, for the merged Homebody / Explorer file: "two different ways of engaging in FringeIsland as a FIM. Either you cultivate your FIM home at FringeIsland or you go on expeditions and explore near or far from your FringeIsland home. It's not meant to be for the community creating the actual FringeIsland experience." |
| D3 | **Merge** the archetypes into the spectrum file as a graded section. |
| D4 | **Retire** the 2026-05-18 onboarding summary after a read-through. |

D2 arrived first and alone (#663); the other three in one line: "D1 fold, D3 merge, D4 retire - go".

## What was done — branch `docs/thinking-pass-3`, PR #664

| Item | Result |
|---|---|
| Folds (D1) | `canon--beings--whisp-and-npcs.md` and `canon--narrative--how-story-works.md` each end with a **"Planned — not yet written"** block carrying every scaffold's scope, its where-the-substance-lives pointers and its graduation path; the first-experience entry keeps the CQ-010 sequencing note verbatim. Five files deleted. |
| Merge (D2 + D3) | `canon--growth--engagement-spectrum.md` keeps its name and history; the archetypes body sits under "The member archetypes (Thinking — needs deepening and validation)"; the Dreamineer persona stays as the 1+Community illustration with the existing "it is a mode" note; the question "how do archetypes relate to the spectrum" is closed by the merge. The Status block quotes D2 so the file says what it is about. |
| Retire (D4) | Read-through before the delete, recorded in TASK-UNI-04: every distinctive claim lives in a core, in `PRINCIPLES-AI.md` / `VISION.md`, or in Session 01 (the influences: ARGs, Stålenhag, Åkerman, geocaching, signature vs charter, the telescope). Not carried, correctly: "Shadow" for the anonymous entrant, and "Dreamineer vs Creator not pinned down". |
| Suffixes (item 10) | `what-fills-a-life-v2.{md,docx}` and `…-management-rev2.docx` renamed without the suffix (`git mv`); `sources.json` and the index follow. |
| Sweep artefacts (items 5–7) | Tracker header re-worded to the live convention; nine headings of the manifestation record re-pointed; the three-questions footer names the three growth reports; the kickstarter footer's dead "community/" sentence dropped. |
| Steering (item 8) | `AGENTS.md` six → five registers; the Claude.ai instructions' grade list (no "Scaffold" grade; a planned page is listed inside its core, never an empty file); `platform/domain/{intelligence,content}/CLAUDE.md` scaffold wording; four §3.6 rows in the doc-health skill. |

**Count:** 33 → 26 `.md` files; `canon--` 14 → 8 (cosmology, roles, beings, narrative, three-questions, privacy-model, engagement-spectrum, kickstarter-season-zero).

**Verification:** index exact both directions (28 / 28, docx twins included); a relative-link resolver over every tracked `.md` against a detached worktree of HEAD — **80 unresolved before, 80 after, zero new**; old names absent from active files (history records — the TASK-UNI files and bridges — keep them as text, never as links); tracker headings intact, the three Canonical cores named (§10); every `CLAUDE.md` thinking path resolves (§9); `npm run dashboard` 921 files (928 − 7). Front-door gate 7/7.

## Worth keeping

- **A fold is the right size for a promised-but-unwritten page.** A headed block inside the core carries the scope, the pointers and the path; the file is created the day it has content. An empty file with the topic's obvious name is the worst of both.
- **The area token follows the reader's question, not the file's history.** Homebody / Explorer went to `growth` because the question it answers is "how do I engage as a FIM", even though the archetypes came from a community spec.
- Tooling recurrences (already in memory, bit again): `sort -u` / `sort -rn` return empty inside the sandbox — dedupe with `awk`; a heredoc inside a Bash `&&` chain dies at parse time — write files with the Write tool and `cat >>` them.

## State at close

- PR #664 open; **merge waits for Stefan's nod** — the steering carve-outs above.
- After the merge: pull `main`, sync `main` → the `discovery` worktree (the Claude.ai instructions changed), remove the "waiting" row from the front door.
- The three kickoff decisions on the front door are untouched by this session.
