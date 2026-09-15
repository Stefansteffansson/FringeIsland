# Condense `docs/fringeisland-thinking/` — one topic, one obvious file (pass 3 after the flatten)

---
id: TASK-UNI-04
title: "Pass 3 after TASK-UNI-03: fold the empty scaffolds into their cores, merge the Homebody/Explorer twins, retire the pre-canon onboarding summary, fix the sweep artefacts the flatten left in the tracker and the manifestation record"
status: todo — analysis done 2026-09-15; items 5–7 and 10 need no ruling; items 1–4 wait for Stefan's rulings D1–D4
assigned_to: claude
priority: medium
owner: ecosystem
wave: eid
depends_on: [TASK-UNI-03]
estimated_hours: 3
---

## Why

Stefan, 2026-09-15, after passes 1 and 2 landed: "today we have multiple files indicating similar content and for someone from the outside it's impossible to know which file to open and instead need to open each file to find what he/she is looking for." Condense the number of files where possible; renames are allowed as long as the folder's naming convention holds (`<register>--<area>--<topic>.md`, dated sessions `<register>--<yyyy-mm-dd>--<topic>.md`, one level deep).

This file is the analysis and the plan. Nothing is executed until the rulings below are written.

## What the analysis found (all 33 `.md` files + 3 `.docx` twins, 2026-09-15, main at `db1b4eb7`)

**Inventory:** 14 `canon--`, 6 `discovery--`, 9 `research--`, 2 `record--`, 1 `questions--`, the index. Five of the fourteen canon files are the scaffolds created earlier today (empty sections by design). Four files are long records that TASK-UNI-03 item 5 ruled append-only (Session 01 at 1,744 lines, the knowledge base at 1,632, the two worlds surveys at 1,030 and 822).

**Where an outsider gets lost — five clusters:**

| # | Cluster | Files | What the outsider hits |
|---|---|---|---|
| A | **The Whisp** | `canon--beings--whisp-and-npcs.md` (Canonical, 121 L) · `canon--beings--whisp.md` (scaffold, four empty H2s) · `canon--beings--npcs.md` (scaffold, three empty H2s) · `discovery--2026-06-15--knowledge-base-whisp-and-universe-foundations.md` (1,632 L, 29 thinkers) · Session 01 (405 mentions) | Opens the file called `whisp.md` and finds "(to be specified)" four times. The content is in the file with the longer name. |
| B | **Narrative** | `canon--narrative--how-story-works.md` (55 L; only Respawn ratified) · `canon--narrative--seasons-and-episodes.md` · `canon--narrative--journeys.md` · `canon--narrative--first-experience.md` (all three scaffolds, empty) | Four names for one page of content. |
| C | **Homebody / Explorer** | `canon--growth--engagement-spectrum.md` (47 L, extracted from the founding vision) · `canon--community--member-archetypes.md` (63 L, Status "Thinking", extracted from a Hamn product spec, personas Elena / David / Astrid) | The same two figures described twice under two different areas, so they do not even sort together. The archetypes file's own open questions ask how it relates to the spectrum. |
| D | **"Explain the universe"** | `discovery--2026-05-18--the-universe-explained.md` (195 L) · the index · `record--universe-to-spec-manifestation.md` (87 L) | The May summary was written at 25 statements, before ratification and before the Mist rename: it calls the anonymous entrant a **Shadow** (lines 75, 155, 184) — the canon reassigned "Shadow" to the place-3 menace (ADR-U031). A newcomer who opens it as the entry point reads contradicted canon. |
| E | **Sweep artefacts** | `discovery--tracker-and-backlog.md` header · `record--universe-to-spec-manifestation.md` section headings · `canon--growth--three-questions.md` footer · `canon--community--kickstarter-season-zero.md` footer · `AGENTS.md` | Pass 1's mechanical sweep mapped old directories onto `README.md`, so prose now says: sessions are "Named `YYYY-MM-DD_universe-discovery-session-NN.md`" (the retired convention), concepts "graduate into `README.md`", research lives in "`README.md` (Portal_Fantasy_Research_Report.md, …)" (retired filenames); the record's H3s cite `cosmology/README.md`, `roles/README.md`, `personal-growth/`, `kickstarter/README.md` + `kickstarter-vision.md`, `OPEN_QUESTIONS.md`, `universe-discovery/`; three-questions says "See [research/](README.md)"; AGENTS.md line 92 says "the six registers" (five since #658). |

**What is not a problem and stays:** the nine `research--` reports (distinct topics in four areas, cited by ADR-U036/U043/U044 and the dashboard); the two `record--` files (unrelated by design — the register is the design-record shelf); the CQ register; the two candidate notes (`portal-ideas`, `gimbal-origin`); the three Canonical cores; `three-questions`; `privacy-model` (reads more like identity than growth, but it has 8 outside referrers including ADR-U046 and an area change buys little); `kickstarter-season-zero`. The `.docx` twins keep their `.md` sibling's name.

**Reference weight** (distinct outside referrers; the generated `docs/dashboard/index.html` excluded): roles 56 · cosmology 47 · questions 19 · whisp-and-npcs 14 · session-01 11 · how-story-works 9 · privacy-model 8 · breach-response 8. Every fold or retire candidate below has at most 3: the TASK-UNI-02/03 records, one old bridge, and for `whisp.md` / `journeys.md` one entity `CLAUDE.md` each (`platform/domain/intelligence`, `platform/domain/content`).

**Tooling that pins names or headings:** doc-health §3 (index exact both directions), §10 (enumerates `canon--*.md` whose Status is Canonical; reads the tracker's "Graduation tracker" heading), `scripts/dashboard/sources.json` (fixed paths for the three cores, five research reports, the tracker with heading `## Discovery backlog (open topics awaiting sessions)`, the CQ register, the manifestation record with heading `## Headline`), the Claude.ai project instructions (`docs/planning/sessions/openers/claude-ai-discovery-project-instructions.md`, names files and the five registers), `AGENTS.md` line 92.

## Items — each gets a written ruling before an edit

| # | Item | Proposal | Files | Ruling needed |
|---|---|---|---|---|
| 1 | Beings scaffolds | Fold `canon--beings--whisp.md` and `canon--beings--npcs.md` back into `canon--beings--whisp-and-npcs.md` as one **"Planned — not yet written"** block per page: the scope sentence, the where-the-substance-lives pointers, the how-it-gets-written line; the empty H2s become a bullet list of promised sections. The day a discovery session fills one, the file is split out again under the same name (that is the graduation path). **Reverses today's ruling** (TASK-UNI-03 #3 + 6, "keep (create?) whisp.md, npcs.md, …"). | 3 → 1 | **D1** |
| 2 | Narrative scaffolds | The same for `seasons-and-episodes`, `journeys`, `first-experience` into `canon--narrative--how-story-works.md`. The first-experience block keeps its CQ-010 pointer and the "deferred until the fundamentals are firm" sequencing line verbatim (Stefan, 2026-06-14). | 4 → 1 | **D1** |
| 3 | Homebody / Explorer twins | One file, **`canon--community--engagement-spectrum-and-archetypes.md`**: the spectrum text (vision-extracted, the higher grade) as the body; the three personas as a section with its own grade line ("Thinking — needs deepening and validation"; precedent for a per-section grade: how-story-works, Respawn ratified, rest overview); the two Open-questions lists merged, the "how do archetypes relate to the spectrum" question closed by the merge itself. `git mv` the spectrum file (the one three-questions cites) so `--follow` history holds; the archetypes body moves in as content. Area `community`: both files describe how a member inhabits the world; `growth` keeps three-questions and privacy-model. | 2 → 1 | **D2** (area) · **D3** (merge vs cross-link) |
| 4 | Pre-canon summary | Retire `discovery--2026-05-18--the-universe-explained.md`; git history keeps it. **Before deleting**, read it against the three cores and the index and list anything not carried — expected: nothing (its "one picture" table and glossary are what Session B ratified, and its Shadow usage is now wrong). The index's discovery row goes in the same commit. | 1 → 0 | **D4** |
| 5 | Tracker header | Rewrite the **Discipline** block and the graduation-tracker intro of `discovery--tracker-and-backlog.md` to the current convention: sessions are `discovery--<yyyy-mm-dd>--<topic>.md`; concepts graduate into a `canon--*` core or an ADR; the two worlds reports by their current names. Headings untouched (§10 and the dashboard read them). | — | none (correctness) |
| 6 | Manifestation record | Re-point each H3 of `record--universe-to-spec-manifestation.md` to the current filename (nine old-path mentions). The record stays a dated snapshot; `## Headline` stays (dashboard). | — | none (correctness) |
| 7 | Footers | `canon--growth--three-questions.md`: "See [research/](README.md)" → the three `research--growth--*` files. `canon--community--kickstarter-season-zero.md`: "See [community/](README.md)" → the merged community file (or drop if D3 says cross-link). | — | none |
| 8 | Steering | `AGENTS.md` line 92: six → five registers. The Claude.ai project instructions and the index tables updated for every fold, merge, rename and retire. `sources.json` is untouched unless item 10 renames a path it holds (it does: what-fills-a-life-v2). | — | carve-out: merge on Stefan's nod |
| 9 | Left alone, deliberately | Everything under "What is not a problem". Two Whisp names remain after item 1 — the canon core and the discovery knowledge base — and that is the convention working: the register token is the difference. | — | — |
| 10 | Version suffixes that point at nothing | `research--growth--what-fills-a-life-v2.{md,docx}` → `…what-fills-a-life.{md,docx}`; `research--method--multi-product-ecosystem-management-rev2.docx` → `…management.docx`. v1 and rev1 were retired today, so the suffix now tells an outsider a version is missing. Referrers: `sources.json`, the index, TASK-UNI-02. | rename | none (recommend yes) |

**Result if D1–D4 follow the recommendations:** 33 → 26 `.md` files; `canon--` from 14 to 8 (cosmology, roles, beings, narrative, three-questions, privacy-model, engagement-spectrum-and-archetypes, kickstarter-season-zero); every remaining name is the only file for its topic in its register. If D1 says keep: 33 → 31 (items 3 and 4 only).

## Decisions for Stefan

| # | Question | Recommendation | Alternative |
|---|---|---|---|
| **D1** | Fold the five scaffolds created today back into their cores? | **Fold.** The empty files are the confusion; the promise survives as a headed "Planned" block inside the core, and a file is split out the day a session fills it. | Keep the five files, accept that `whisp.md` is empty and `whisp-and-npcs.md` is the one with content. |
| **D2** | Area token for the merged Homebody / Explorer file | **`community`** — how a member inhabits the world. | `growth` — keep `canon--growth--engagement-spectrum.md` as the name and fold the archetypes in. |
| **D3** | Merge the twins, or only cross-link them? | **Merge** — 110 lines about the same two figures. | Cross-link only; both files stay. |
| **D4** | Retire the 2026-05-18 onboarding summary? | **Retire** — pre-Mist, superseded by the cores and the index. | Keep it as the newcomer narrative — then it needs re-grounding on the Mist canon, which is canon writing and not this pass. |

## Execution (after the rulings)

One branch `docs/thinking-pass-3`, one PR, content changes reviewed as content, not renames. Order: items 5, 6, 7, 10 (no ruling needed) → 3 (`git mv`, then merge the body) → 1, 2 (folds) → 4 (read-through, then retire) → index tables → 8 (steering) → re-point every outside referrer of a folded, merged, renamed or retired name (the list above; at most 3 each) → `npm run dashboard` → doc-health §3, §3.6 (feed the deleted-file table), §9, §10.

**No canon is written in this pass.** Folds and merges move existing text; the only new sentences are pointers ("planned — see …"). Rules that bind: rename-pass-no-new-canon (point the word at its referent, never characterise beyond what discovery locked); fundamentals-before-experience-design (the first-experience block stays a placeholder); template-changes-need-instance-grep (every renamed name grepped repo-wide in the same session); verify-before-asserting (item 4's read-through is written down before the delete).

## Done when

- [ ] D1–D4 ruled here (who, when, what)
- [ ] Items 5, 6, 7 and 10 done regardless of the rulings
- [ ] Every fold, merge, rename and retire has its outside referrers re-pointed in the same PR; the index exact both directions
- [ ] `AGENTS.md` and the Claude.ai project instructions say five registers and name only files that exist
- [ ] doc-health run (§3, §3.6, §9, §10) clean; retired names in the §3.6 table
- [ ] `npm run dashboard` regenerates; the front door's thinking-tree bullet repointed at the close
