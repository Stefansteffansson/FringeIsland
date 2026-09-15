# The Discovery Canvas experiment — what was kept

Between 2026-09-11 and 2026-09-14 the discovery material was split into entity files
(`docs/ecosystem/discovery/`) and arranged on canvases (`docs/ecosystem/canvas/`) by the
**FringeIsland Discovery Canvas** app, built in the separate `FringeIsland-canvas` repository.

On 2026-09-14 Stefan reverted that decomposition. The originals were never modified by the
importer, so the revert restored nothing — it only removed the derived copies. The big source
file, [`universe-discovery/2026-05-18_universe-discovery-session-01.md`](discovery--2026-05-18--universe-session-01.md),
is byte-identical to what it was before the experiment (blob `d910825c`), and its 48 numbered
sections were what became statements `S001`–`S048`.

**The app itself was kept.** Its code and its specification live in `FringeIsland-canvas`.

This folder holds the few things from the experiment that were authored by hand and are
therefore not re-derivable from anything else.

## Contents

| File | What it is |
|---|---|
| `feedback-v0.4.md` | Stefan's first-use feedback on the Phase 1 build, 2026-09-12 — 23 items and bugs B1–B3. The spec names this as the source of decisions D31–D35. It was untracked and would have been lost. |
| `canvas-tab-taxonomy.md` | The 13-tab structure as it stood at revert. Card contents were derived; this organisation was not. |
| `assets/The-Seam.pdf` | A 20-page document titled "The Seam", created 2026-09-11, imported into the canvas as a media card. |
| `assets/gimbal-workshop.jpg`, `assets/gimbal-dusk.jpg` | The Gimbal images used as the canvas landing and backdrop. |
| `assets/canvas-dark-VARIANT.png` | A dark-canvas mockup variant that matches no mockup committed in either repository. |

## What was deliberately not kept

- `discovery/statements/`, `session-notes/`, and the empty `kb/ questions/ gaps/ candidates/` —
  all derived from sources that still exist unmodified.
- The canvas placement data (`cards.json`, `edges.json`, `tabs/`, `tags.json`, `portals.json`)
  and the `changes.jsonl` journal of 439 operations.
- The phase-1/2/3 mockups — already committed in `FringeIsland-canvas` under `design/mockups/`
  with matching hashes.

Nothing authored was found in the entity files themselves: no file had `revision` above 1, and
the journal's seven `edit` operations all touched note cards in `cards.json`, not entity files.

The six commits that introduced the experiment are preserved behind the tag
`archive/discovery-canvas-2026-09-14`.

## A note on the tab names

The tab *files* are fossils of an earlier naming — `shimmer`, `whisp`, `entology`, `it-is`,
`it-is-not`, `origin-mythology` — while the tab *titles* had become a novel structure,
*Days of Merry & Bright*. The canvas was repurposed from universe discovery to novel planning
partway through. The auto-generated portal notes still cite the old titles.
