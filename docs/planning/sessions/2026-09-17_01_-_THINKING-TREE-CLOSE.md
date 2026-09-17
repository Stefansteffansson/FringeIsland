# Session bridge — 2026-09-17 — The thinking tree, closed: 33 → 21 files, content reviewed, the map re-run

**Cycle:** The Eid kickoff (front door unchanged in substance — three sessions of documentation work, no build)
**Span:** 2026-09-15 evening → 2026-09-17, one continuous Claude Code session; eleven PRs, #662–#672, all on `main`; the `discovery` worktree synced after each.
**Trigger:** Stefan: "in `docs/fringeisland-thinking` … multiple files indicating similar content and for someone from the outside it's impossible to know which file to open." Then, after two passes: "file names need to tell the viewer what content related to FringeIsland he/she can expect if/when the files are opened", and "how come we do not challenge what content goes into which file or the number of files?"

---

## The arc

| Pass | Day | What | Files |
|---|---|---|---|
| Analysis | 09-15 | [`TASK-UNI-04`](../backlog/tasks/TASK-UNI-04-condense-thinking-tree.md): five confusion clusters, ten items, four rulings for Stefan (#662) | 33 |
| 3 | 09-16 | D1 fold the five scaffolds, D2 `growth`, D3 merge the archetypes, D4 retire the pre-Mist summary; suffixes dropped; sweep artefacts fixed (#664, [bridge](2026-09-16_01_-_THINKING-PASS-3.md)) | 26 |
| 4 | 09-16 | Stefan's cited list + "one file as recommended, KB to research, engineering merge": one discovery file, `how-growth-works`, the knowledge base to `research--`, a Start-here block in the index ([`TASK-UNI-05`](../backlog/tasks/TASK-UNI-05-one-topic-one-file-pass-4.md), #666, [bridge](2026-09-16_02_-_THINKING-PASS-4.md)) | 21 |
| Health | 09-17 | doc-health three times (#668 nine in-place fixes; #670, #672 clean) | 21 |
| Map | 09-17 | `record--universe-to-spec-manifestation.md` re-run against the current specs + the 100 shipped features, with a built column (#669) | 21 |
| Review | 09-17 | The discovery file reviewed for content: Session 01 closed at S48, Candidate A's read-against-the-core banner, the 130 open threads given a second dated tag layer — 39 RESOLVED / 57 PARTIAL / 34 OPEN (#671) | 21 |

**The folder now:** 7 canon, 1 discovery, 1 questions, 9 research, 2 records, the index; 3 docx twins. Every name says what FringeIsland content is inside; the index opens with where truth lives and how it changes.

## Decisions (Stefan)

- 2026-09-15: renames allowed within the convention; pass 3's D1–D4 as recorded in TASK-UNI-04 (D2 on 09-16 with the ruling that the spectrum is two ways of engaging *as a FIM*, not the creating community).
- 2026-09-16: the cited target list, then "2. one file as recommended. 4. ok. 3. okay." — the one discovery file `discovery--the-universe-in-the-making.md`; the knowledge base to `research--growth--thinkers-and-models-behind-the-whisp.md`; the engineering pair merged. The naming rule behind all of it is now a memory: content first, kind second, never the format or process word; collision-check against staying files; derive the file count from a content inventory.
- 2026-09-17: "re-run it against the current specs" (the manifestation map); "go, run the four fixes and the open-threads reconciliation"; three doc-health runs on request. All three merges on the nod ("ok merge") where steering was touched.

## What a newcomer gets now

The index's **Start here**: the graduation table in Part 1 of the discovery file maps every settled concept to its single source of truth (a core, or an ADR for U025 / U026 / U028 / U031); the Status line of a core gives its grade; the ADR wins over canon. To change anything: state it in a session (Part 3, numbering on from S049), ratify it in Claude Code (the core's text, Status, the tracker row), an ADR if a platform contract moves. Research never becomes canon; it feeds a session.

## Worth keeping

- **Names that tell content beat names that tell kind** — and the reader who decides is the outsider. Four rejected proposals taught it: a date, "statements", a word colliding with a staying file, and the inherited four-file shape itself.
- **A reconciliation is a second tag layer, never an edit.** The 130 threads keep their 2026-05-29 tags; the 2026-09-17 tags sit beside them; a thread's history reads left to right. Byte-preservation was verified by script, not by eye.
- **Doc-health 3.6 finds what a path sweep cannot** — bare short names (`three-questions.md`) and "sub-page" prose in the platform specs. Run it after every refactor, never assume the sweep caught everything.
- **A record's own re-run trigger is a due date.** The manifestation map said "re-run when the descent advances"; the Hub v2 rebuild fired it on 2026-08-12 and nobody noticed for five weeks. Records with triggers belong in a checklist.
- Tooling: `sort -u` / `sort -rn` return empty in the sandbox (dedupe with `awk`); a Bash heredoc in a `&&` chain dies at parse time (write files with Write, append with `cat >>`); a positional jest pattern in `hub/` runs the whole unit tier (`--testPathPatterns` filters). All three are in memory.

## State at close

- `main` at #672; the `discovery` worktree synced, clean, on `discovery`.
- TASK-UNI-02, -03, -04, -05 all done. No task filed from this session.
- The front door's Waiting-on-Stefan list is the three kickoff items it held before this session: the Eid appetite and first theme, leaked-password protection (Supabase Pro), the E2E smoke job design.

## Next — inputs this session leaves for the Eid kickoff

1. **The manifestation map's re-ranked gaps**: the first hour's narrative (mechanics built, canon unwritten, CQ-010); the world specified but unbuilt (DS-1 / DS-2 / DS-7 have capability rows and no shipped feature — the Whisp and the world are equally specified, which is the kickoff's own question); community formation; funding; the atmospheric layer; the named-but-hollow concepts.
2. **The open-threads tally**: the 34 OPEN threads point at three places — the planned Whisp page, the planned NPC page, and the universe-mechanics fundamentals session the backlog names as the foundational next step. A discovery session on the fundamentals unblocks most of the rest.
3. **Candidate A** must be re-read against the cosmology core before any portal-locking session; **CQ-016** re-read against the Hub v2 DESCRIPTION before its framing slice is scheduled.

## Addendum — the patterns piece (same day, after the close; Stefan: "go, run the patterns piece")

The last unreconciled section of the discovery file, "Patterns emerging so far" (93 mid-session syntheses written before the reshape and before Session B), now carries a dated tag per pattern in three classes — **75 CANON** (the section that carries it now; one in structure only, the Big-5-to-sense mapping), **5 SUPERSEDED** (the two-register topology, the Shadow→FIM ladder, the 05-20 topology lock, the village-distance gradient, the Shadow vocabulary of the ball rule), **13 OPEN** (design lineage such as the ARG family and the Nordic aesthetic, the hidden-layer feeling, signature-vs-charter, the hard/soft signature, and two founding stances that turned out to be written into **no constitutional document**: "constant change is the steady state" and "humans outrank stories outrank world" — tagged with their natural home, PROCESS.md and MANIFESTO.md, not a claimed one). Every home was grepped before it was named; originals byte-preserved by script. With this the file is reviewed end to end except for the statements themselves, which are the record and stay as written. The two un-homed stances were a small canon question for Stefan — ruled the same day: **"write them into the MANIFESTO."** Done: Manifesto 0.2, two principles under "How the movement operates" in its own "X over Y" voice — *Humans and their stories over aesthetics and worldbuilding* and *Constant change over being done* — with two At-a-Glance rows and a provenance line naming Statement 13; the two pattern tags flipped to CANON (tally 77 / 5 / 11) and the graduation tracker gained a row of type "constitutional". A constitutional edit, so the merge waited for the nod.

```
Doc Health Check — 2026-09-17 (fourth run) — on-demand after #673 (this bridge) and #674 (the patterns tags)

1.5  Architectural drift           — 12 keyword groups over the 94 new lines / 2 hits, both tags stating a rename ("affordance" → equipment, ADR-U025; "the Mist, not the Shadow", ADR-U031) / clean
3.   Path + README sync            — index 23 / 23; every core file, ADR (U025, U026, U028, U029, U031), feature (PC002, PD002 — 6-done), CQ (001, 003) and core section the tags cite exists (cosmology §1–§11, six beings sections, two narrative, three growth, the roles "not a ladder"); the bridge's four links resolve; resolver 3 463 links, 80 unresolved before and after, 0 new / clean
3.5 / 3.6                          — 0 old_*/ paths; the discovery file's History line and this bridge's own explanatory sentence are the only retired-name mentions, both by design / clean
5.   Maturity consistency          — front door names this bridge, the newest session file; 6-done sweep 100 / 100 / clean
10.  Graduation-tracker completeness — four headings intact; rows for the three Canonical cores, the ratified respawn section and ADR-U025 / U026 / U027 (superseded) / U028 / U031 / clean
dashboard — 0 "Section not found"
Skipped: 1, 1.6, 2, 3.7, 4, 4.5, 6, 7, 8, 9, 11 — no trigger since the previous run. Critical findings: none. Fixes: none needed.
```

```
Doc Health Check — 2026-09-17 (fifth run) — on-demand after #676 (MANIFESTO 0.2, the two flipped tags, the tracker row, this addendum)

1.5  Architectural drift           — 11 keyword groups over the 14 new lines / 1 hit, this addendum's own sentence naming the superseded Shadow patterns (history) / no retired vocabulary in the two new Manifesto principles / clean
3.   Path + README sync            — the Manifesto's one link (PRINCIPLES-AI) and the tracker row's link to the Manifesto resolve; index 23 / 23; resolver 3 464 links, 80 unresolved before #676 and now, 0 new / clean
3.7-style (restated inventory)     — the Manifesto's value list grew from 11 to 13: no active document restates the list or counts it; three cite one principle ("Community ownership over corporate control") as a constitutional anchor — citations, not snapshots / clean
3.5 / 3.6                          — 0 old_*/ paths; the only retired-name mentions are the discovery file's History line and this bridge's explanatory sentence, by design / clean
5.   Maturity consistency          — front door names this bridge, the newest session file; 6-done sweep 100 / 100 / clean
10.  Graduation-tracker completeness — four headings intact; ten rows now (the three cores, the ratified respawn section, five ADRs, and the first row of type "constitutional" — MANIFESTO.md), every home exists / clean
dashboard — 0 "Section not found"
Skipped: 1, 1.6, 2, 4, 4.5, 6, 7, 8, 9, 11 — no trigger. Critical findings: none. Fixes: none needed.
```
