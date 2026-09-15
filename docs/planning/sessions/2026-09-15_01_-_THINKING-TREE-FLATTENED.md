# Session bridge — 2026-09-15 — The thinking tree flattened: one folder, the filename carries the register

**Cycle:** The Eid kickoff (front door unchanged in substance — this session was a documentation restructure, not build work)
**Trigger:** Stefan: "We have too deep structures today that I can't find vital information that I'm looking for." Target: `docs/research/`, `docs/ecosystem/thinking/*`, `docs/ecosystem/universe/*` → one folder, `docs/fringeisland-thinking/`, with a naming convention that groups files by area.

---

## What was there

45 files, not hundreds — nested five to six levels deep. `universe/` had 13 files, **8 of them `README.md`**; four directories held nothing but a README. ~130 files referenced the three trees (89 for `universe/` alone, 11 of them steering files).

## Decisions (Stefan, 2026-09-14/15)

1. **One folder; the filename prefix carries the register** (canonical vs exploratory vs research) — not two roots.
2. `VISION.md`, `MANIFESTO.md`, `PRINCIPLES-AI.md`, `strategy/`, `how-we-work/` **stay** in `docs/ecosystem/`.
3. **Two passes.** Pass 1 (this session) relocates content-pure and repoints everything; pass 2 (content consolidation) is a follow-up on its own branch — the ruling on why is in [`TASK-UNI-02`](../backlog/tasks/TASK-UNI-02-flatten-thinking-tree-into-fringeisland-thinking.md) §6: the move commit must stay content-pure so git rename detection and `--follow` history hold.
4. The convention: `<register>--<area>--<topic>.ext`; for discovery sessions the second token is the **date**. Six registers: `canon` · `discovery` · `research` · `record` · `questions` · `canvas`.
5. `.docx` twins kept, renamed to their `.md` sibling's name.
6. **Every** referencing file repointed — ADRs, old bridges, archived openers included. Link rot is not a decision change.

Judgment calls made by Claude and accepted on "go": `record--` as a sixth register for the two design records that sat in `research/`; the Kickstarter under `community`; `growth` (not `personal-growth`) as the area token; `member-archetypes` stays `canon--` by location, its "Thinking" status is a pass-2 ruling.

## What was done — branch `docs/flatten-thinking-tree`, four commits + close ritual

| Commit | What | Numbers |
|---|---|---|
| A — the move | `git mv` 39 files; 6 navigation-only READMEs folded into the new index `README.md` | 39/39 detected as renames, add == del per file |
| B — the sweep | mapping-driven rewrite: link targets resolved against the file's old dir and re-relativised from the new; plain-text repo paths; backtick-quoted relative paths (second pass) | 155 files (146 in the first pass, 17 in the second, 8 in both); 106 links, 244 text mentions, 40 backtick paths, 17 depth re-links inside moved files |
| C — steering | root `CLAUDE.md` (two trees + doc map), `AGENTS.md` (the Claude.ai write surface is now `docs/ecosystem/` **and** the new folder; new files obey the convention), `doc-health-check` §10 (enumerate `canon--*.md`), `ecosystem-decomposition` read-context, `docs/README.md` + `docs/ecosystem/README.md` trees, how-we-work conventions, dashboard `sources.json` | 32 exact-match edits |
| D — bookkeeping | TASK-UNI-01 absorbed, TASK-UNI-02 in progress, [`TASK-UNI-03`](../backlog/tasks/TASK-UNI-03-thinking-tree-content-consolidation.md) filed (pass 2, seven items with recommendations), front door repointed | |

**Verification:** a relative-link resolver over every tracked `.md` — **80 unresolved before, 80 after, zero new** (the 80 are pre-existing: 52 in session bridges, 9 in `planning/reference/legacy-feature-docs/`, template placeholders like `link-to-feature-spec`, and the two registry scaffolds). `npm run dashboard` regenerates (923 files indexed). Unit tier 1662/1662 after the front-door bullet was shortened under the 300-char gate. Doc-health targeted run: README index of the new folder exact in both directions (39/39); `docs/ecosystem/README.md` matches disk; §3.5 archived-tree leak 0; §3.6 refs to the deleted trees in active files 0; §9 cascade 28 `CLAUDE.md`, 0 broken pointers; §10 tracker: the three Canonical cores all named, 11 home refs all resolve. Skill tables fed: a §3.6 row for the six deleted READMEs, a README-index row for the new folder.

## Three traps found — worth keeping

1. **A directory key in a path sweep must be boundary-guarded.** `docs/ecosystem/universe/` followed by `*/README.md` (a glob in the doc-health skill) or `research-{feature}.md` (a convention in how-we-work) would otherwise become `…/README.md*/README.md`. The sweep refused any key followed by `[\w.*-]`; the leftovers were then fixed by hand as wording, which is what they were.
2. **A move sweep is not re-runnable on the moved files.** After the first pass, a moved file's `README.md` link (correct, meaning the new index) re-resolves against its *old* directory to `…/roles/README.md` — a key in the mapping — and would be rewritten to the roles core. The second pass (backtick paths) was therefore a separate one-shot script, not a rerun.
3. **The sweep rewrote the new README's own footer** — "flattened from `docs/ecosystem/universe/` …" became "flattened from `docs/fringeisland-thinking/README.md` × 3". Any file that *names the old paths as history* must be excluded from a mechanical sweep, or written after it. The TASK-UNI records were excluded by pattern; the README was caught by the after-check.

## State at close

- Branch pushed, PR open; **merge waits for Stefan's nod** — steering files (`CLAUDE.md`, `AGENTS.md`, two skills, 8 tier `CLAUDE.md`) and 13 ADR link repoints are fuller-auto carve-outs.
- After merge: sync `main` → the `discovery` worktree (its Claude.ai write surface now includes the new folder).
- Pass 2 is TASK-UNI-03 — seven items, each with a recommendation; item 1 (member-archetypes' grade) and item 2 (retire What-Fills-a-Life v1) are Stefan's.

## Open

- The three kickoff decisions from the [front door](../cycles/cycle-current.md) are untouched by this session: the Eid appetite and first theme; leaked-password protection (Supabase Pro); the E2E smoke job's design.
