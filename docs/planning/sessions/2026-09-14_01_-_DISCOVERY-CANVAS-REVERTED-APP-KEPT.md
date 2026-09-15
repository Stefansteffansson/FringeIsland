# Session bridge — 2026-09-14 — The discovery-canvas decomposition reverted, the app kept

**Cycle:** The Eid kickoff (front door unchanged — this session was not build work)
**Trigger:** Stefan asked whether to flatten the research/discovery directory structure, and raised a single-source-of-truth worry about the semi-separate FringeIsland Canvas project.

---

## What the question turned out to be

The opening question was structural — flat directories with a naming convention, versus the nested tree — and whether the Canvas project had produced duplicates.

Investigation found the structural question was the smaller half. The scheme Stefan was leaning towards **already existed and was already spec'd**: `docs/ecosystem/discovery/` with one folder per category, flat inside, typed IDs (`S001`, `KB-014`, `X-<slug>`), relations in frontmatter, and a generated view rebuilt by a sweep.

The real finding was that none of it was in version control.

| | tracked | on disk |
|---|---|---|
| `docs/ecosystem/discovery/` | 7 | 62 |
| `docs/ecosystem/canvas/` | 19 | 116 |

76 untracked files and 5 modified, on the `discovery` worktree only. The Canvas app writes there and **never runs git** (its spec §1, by design); the sweep skill that commits is the only thing that does, and it had never run. Most consequentially, the canvas spec — the app's single contract — was committed at **v0.4** and sat at **v0.9.4** on disk, carrying decisions **D31–D40** and the whole Phase 1.1/2/3/4 design history. Committed code, uncommitted rationale.

`FringeIsland-discovery` is a **git worktree of this same repo** (its `.git` is a 76-byte pointer file, same object store, same origin) — not a second clone. So there was no content duplication between it and `main`; the divergence was an unmerged branch plus untracked files.

## The decision

Stefan ruled: **keep what was built for FringeIsland-canvas, revert the research/discovery files to their pre-canvas shape.**

The revert was clean because the work had been purely additive. Only three pre-existing files were modified, all navigation READMEs. Every original source document was present and unmodified — the importer honoured its own promise. The source file `universe-discovery/2026-05-18_universe-discovery-session-01.md` is byte-identical (blob `d910825c`) to what it was before, and its 48 numbered sections map one-to-one onto `S001`–`S048`.

So **nothing had to be restored.** `main` already was the original shape; the revert removed derived copies.

Checks run before deleting: 0 entity files with `revision` above 1; `candidates/ questions/ gaps/ kb/` empty but for READMEs; the journal's seven `edit` operations all touched note cards in `cards.json`, not entity files, and those notes were a test note ("Lite text!") and two empty titles.

## What was kept

`docs/fringeisland-thinking/canvas--what-was-kept.md` — the hand-authored remnants, the only things not re-derivable:

- **`feedback-v0.4.md`** — Stefan's Phase 1 first-use notes, 23 items and bugs B1–B3. The spec names it as the source of D31–D35. It was **untracked** and would have been lost.
- `canvas-tab-taxonomy.md` — the 13-tab structure at revert. The tab *files* are fossils of earlier names (`shimmer`, `whisp`, `entology`, `it-is`, `origin-mythology`) while the titles had become a novel structure, *Days of Merry & Bright*: the canvas was repurposed from universe discovery to novel planning partway through.
- `assets/` — The Seam (20pp), both Gimbal images, and a dark-canvas mockup variant matching nothing committed in either repo.

The app and its spec live in `FringeIsland-canvas`, which was **pushed to a remote for the first time** — 36 commits of Phases 1–4 had existed only on disk.

The six commits are preserved behind the annotated tag **`archive/discovery-canvas-2026-09-14`**, pushed. The `discovery` branch was reset to `main`, not deleted.

## Two traps found

1. **A folder carrying its own `.gitignore` is invisible to both `git status` and `git clean -fd`.** After the revert, status read "0 changes" and clean reported removing 9 entries — while `canvas/.trash/` still held 17 files. Only `find` revealed them. Root cause traced in the canvas repo: `uiState.ts` `ensureGitignored` writes `<dataDir>/.gitignore` after **every** `ui.json` write, so it reappears in any data folder. The sweep skill now `check-ignore`s a journal-named path that has gone invisible (`eb6ed1a`).
2. **A committed fixture used as a live data folder drifts under ordinary use.** The seed fixture built to replace the deleted material was itself the app's `dataDir`, so clicking rewrote tracked files — and the drift was *net deletion* (23 insertions against 57), which would have shipped a thinner fixture than its own tests assert. Resolved by pointing the working copy outside every repository: `D:/WebDev/canvas-data/`.

## State at close

- `main` and `discovery` aligned, both pushed, both clean.
- `FringeIsland-canvas` pushed, tree clean; `canvas.local.json` points at `D:/WebDev/canvas-data/canvas`; branding restored from the tag (workshop → landing, dusk → backdrop).
- Doc-health run: two hits on the deleted trees, both historical narrative in the record file (correct); one genuine index gap fixed (`universe-discovery/` was missing from the thinking README, pre-existing).

## Open

- **The original structural question is unresolved and worth returning to.** Standing recommendation: keep the ecosystem tree's nesting, because the `CLAUDE.md` cascade addresses documents by path and `doc-health-check` §9 verifies it; reserve flat-plus-typed-IDs for entity-like material.
- `docs/fringeisland-thinking/README.md` is still six directories holding one README each — structure heavier than content, and part of what made things hard to find.
- `docs/fringeisland-thinking/README.md` carries four coexisting naming conventions and real `.docx`/`.md` duplicate pairs.
- Whether the Canvas app should keep writing a `.gitignore` into its data folder is a spec question, left with Stefan and Cowork.
- Whether the fixture ships a small committed image so a fresh clone demos well — currently `fixtures/canvas/branding/` is gitignored, so a clone still lands on the placeholder.
