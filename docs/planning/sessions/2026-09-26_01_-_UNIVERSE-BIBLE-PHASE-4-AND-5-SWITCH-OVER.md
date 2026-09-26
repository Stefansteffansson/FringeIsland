# Session bridge — 2026-09-25 → 26 — The Universe Bible: written (Phase 4), reviewed, trimmed, and switched over (Phase 5)

**Cycle:** The Eid kickoff (front door repointed to this bridge; the kickoff itself still waits for its fresh session)
**Span:** 2026-09-25 evening to 2026-09-26, one Claude Code session across the discovery worktree and the main checkout; eight pull requests (#685–#690 plus two held)
**Trigger:** Stefan's Phase 4 brief — write the Universe Bible chapter by chapter from the plan (`record--universe-bible-plan.md`), glossary first, stopping for his review after each; then, on his "reviewed, go on", Phase 5.

---

## The arc

1. **The glossary first** (2026-09-25), from the sources in the plan's order of authority: Sessions 04–05 over the rulings record over the chapter maps over Sessions 01–03 over the canon files. Ten questions for Stefan where the sources conflicted; all ten answered the next morning and applied in one pass.
2. **Chapters 2 to 7** the same day, each from its Phase 2 chapter map: the worlds, the beings, growth, story, roles and governance, community. Every open question written once, in an Open box where its topic is discussed, with a letter-number handle (W-, B-, G-, S-, R-, C-).
3. **Chapter 8, the index, generated from the boxes themselves** — 73 anchored links — and chapter 1, Start here, written last with "leave something unmapped" as a stated principle.
4. **Merged on "merge"** (#685) with the swept Claude.ai writes (Sessions 03–05, the plan, the Phase 2 records, the quotes collection, CQ-018/019, the MANIFESTO paragraph).
5. **The size question answered with numbers**: 60K tokens, a third of it the glossary that repeated the chapters. Stefan chose the trim; the glossary became definitions with chapter pointers (#686) and "load the chapter you need, never the whole bible" was written into Start here.
6. **Phase 5 on Stefan's two mid-turn decisions:** delete the canon files rather than stub them; delete the two Phase 2 working records; keep the research, the discovery file, the plan, the manifestation map and the breach record. Part 1 (#687): nine files deleted, 68 files repointed, the README rewritten, the tracker retired, the doc-health check adapted. Part 3 (#689): VISION's vocabulary under R-50. Parts 2 and 4 held: the ADR amendments (#688) and the steering-file pointers (#690).

## Decisions (this session)

- **Vocabulary rulings from the glossary review** (Stefan, 2026-09-26): "map" keeps two senses; the founding questions are the trait data loaded into the Gimbal, not the three life questions; the two ways of engaging are "cultivate the home" and "go on expeditions" (Homebody and Explorer retired as names); "line" is the bond's name, reserved for it, the Shimmer is "an edge, not a band"; the crown is the Tree's top; "the dark future" replaces "the dark branch"; the village stays a working name; a Mist only sees the near side; ADR pointers on platform-defined terms; citations are best effort. *Locked; applied to the glossary and every chapter.*
- **Trim the glossary, keep one file, route by chapter** (Stefan, 2026-09-26). *Locked (#686).* Splitting into one file per chapter is held back unless the file keeps growing.
- **Delete the canon files, reroute all links** rather than leave pointer stubs (Stefan, 2026-09-26, reversing the plan's Decision 2). *Locked (#687).* Git keeps them; historical files keep the old paths by design; the doc-health check registers the nine deletions and the "canon core" vocabulary as an obsoleted concept so residue is swept over time.
- **Delete the two Phase 2 records; keep the plan until Phase 6 closes; keep the manifestation map until its next run; keep the breach record** (Stefan, 2026-09-26). *Locked (#687).* The one named loss: the chapter maps were the only place a bible fact traced to its statement; that trace is now in git history.
- **The discovery file stays** as origin material and the workshop; Part 3 untouched, Part 1's tracker retired, Part 2 marked as ruled. *Locked.*
- **ADR vocabulary corrections as dated amendments, decision text untouched** (Claude's shape for the ask-first carve-out; the transcend route and telemetry stay as code, a rename and a birth event are follow-ups). *Proposed; #688 waits for Stefan's nod.*

## What was produced

- `docs/fringeisland-thinking/bible--fringeisland-universe.md` — nine chapters, about 51K tokens after the trim, 189 glossary entries, 73 Open boxes with anchors and an index.
- `docs/fringeisland-thinking/README.md` — rewritten around the bible; the `bible--` and `quotes--` registers; the canon table gone.
- The discovery file's Part 1 and header; the CQ register's bible pointers (CQ-010, 012, 013, 018, 019); the Claude.ai project opener; the doc-health skill (§1.5 row, §3.6 rows, §10 rewritten as "Bible completeness"); the dashboard sources; 68 active files repointed.
- Deleted: the seven `canon--` files, `record--universe-bible-phase-2-rulings.md`, `record--universe-bible-phase-2-chapter-maps.md`.
- Pull requests: #685 (the bible and the sweep), #686 (glossary trim), #687 (switch-over part 1), #689 (VISION, R-50); held: #688 (ADRs), #690 (CLAUDE.md, AGENTS.md).

## What is still open — Stefan

- **Two merge nods:** #688 (ADR-U031 and ADR-U025 amendments, five ADR relinks) and #690 (the CLAUDE.md document map and the AGENTS.md discovery rule).
- **Re-paste the Claude.ai project instructions.** `docs/planning/sessions/openers/claude-ai-discovery-project-instructions.md` changed in #687 (the bible register replaces the canon register; sessions end with "Baked into the bible"; S115 is next). The project holds only a paste and nothing syncs it.
- **Phase 6:** prioritise the 73 open questions from chapter 8; the plan record stays until then.
- **Follow-ups named, not scheduled:** the Hub's `transcend` route and telemetry name the consent step (rename with a birth event when the birth is built); the manifestation map's next run against the bible; the spec ground-truth lines still speak of "planned pages" in places the doc-health §1.5 row will surface.

## Non-obvious insights

- **The bible carries no statement numbers by design, so provenance lives elsewhere.** The chapter maps were that elsewhere; deleting them moved the trace into git history. Any future dispute over a bible fact resolves by reading Part 3 of the discovery file by concept, or `git show 30eb9a39^:docs/fringeisland-thinking/record--universe-bible-phase-2-chapter-maps.md`.
- **A replacement bounded by the wrong heading deletes everything after it.** The tracker retirement first cut Part 2 of the discovery file because Part 2 sits between Part 1 and Part 3; a failed match on the Part 2 heading was the only thing that caught it before a write. Bound every section replacement by the next heading, and assert the file's counts after.
- **Automatic phrase swaps need a review pass for compound words.** "personal-growth core" became "personal-the bible's growth chapter" and "the [cosmology core]" became "the [the bible's …"; both were caught by a residue grep, not by eye.
- **The context-mode grep filters can hide the very lines you need.** Excluding `/canon--` to drop the canon files' own paths also dropped every link whose target contained that path; the first inventory found 35 lines where there were 157. Filter on the file column, never on the line.

## For the next session

- Nod or amend #688 and #690, then Phase 6 from the bible's chapter 8; the plan record can go once Phase 6 is planned.
- A discovery session now starts from an Open box and ends with "Baked into the bible"; Claude Code carries the list across. The opener says so; the paste is Stefan's.
- Run the manifestation map against the bible when the Eid kickoff needs it.

## Doc health — 2026-09-26 — on-demand, after the Universe Bible switch-over

Sections run: 1.5, 3, 3.6, 9, 10, 11 (1, 2, 3.5, 3.7 and 4–8 skipped: no trigger this session).

- **1.5 Architectural drift** — 1 row added (the canon cores, their planned pages and the graduation tracker). 321 keyword hits, 259 in historical files by policy; 62 active-by-policy hits classified: 18 prose fixes applied in place (the "ground truth" lines of the DS-1/4/5/6/7 specs and tier CLAUDE files, the two templates, the administration spec, the Hub technical tour, the CQ register's notes, DOMAIN_ENTITIES' status line, VISION's version line); the rest are historical (derivation notes, version lines, the plan record, the manifestation map — now bannered — and one research pointer, left) or pending in #688 / #690.
- **3 Path + README sync** — the thinking README indexes all 19 files, both directions. 14 broken links in the whole active tree, none new: 2 in root CLAUDE.md (#690), 2 in the frozen ARCHITECTURE_ANATOMY_V1 (exempt), 8 in the legacy-feature-docs reference tree (pre-existing history), 2 Hub ROADMAP (registry scaffolding).
- **3.6 Deleted-file refs** — 2 rows added (the 7 canon files; the 2 Phase 2 records). 49 hits, 14 active: root README fixed in place; CLAUDE.md (#690); ADR-U028/U029/U045/U046 (#688); the plan record and the manifestation map (historical, the map bannered); one research pointer left as history. Disk cross-check: all nine absent.
- **9 CLAUDE.md cascade** — 29 files, 2 unresolved links, both in root CLAUDE.md (#690); tier and entity files carry link swaps only.
- **10 Bible completeness** (the rewritten section's first run) — 73 boxes, 73 index rows, none unmatched. Forward check on Sessions 04–05: every "Baked into the bible" item and open thread has a sentence or a box, with one exception filed: the Nalome trademark, Bolagsverket and domain checks (a business item — CQ-020, this run). ADR vocabulary: ADR-U031's body says "the Beyond" and "the persistence-and-consent threshold" (covered by the amendment in #688); ADR-U040 says "transcends and consents to become a FIM" (a one-line amendment added to #688 this run).
- **11 Anatomy freshness** — the living pair carries 0 retired-vocabulary hits after the switch-over edits; the stamp is unchanged since the 2026-09-23 run.

Critical findings: none open beyond the two held pull requests. Table updates: §1.5 +1, §3.6 +2, §10 rewritten. One self-inflicted defect repaired: the automatic reference pass had rewritten the skill's own keyword and filename columns, which would have blinded §1.5 and §3.6 on this very row — the skill file must be excluded from every mechanical sweep, as it is from the greps.
