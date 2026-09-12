# Canvas

**Purpose:** Data of the Discovery Canvas app: layout, relations, tags, tables and native material over the entity files in `../discovery/`. Owned by the app; edit through it, not by hand. Never a source of truth for canon.

**Spec:** [`../thinking/2026-09-11_discovery-canvas-spec.md`](../thinking/2026-09-11_discovery-canvas-spec.md), sections 4 (layout), 6 (write policies), 8 to 13 (edges, tags, tabs, media, tables, inbox) and 14 (change journal and sweep).

| Item | Holds | Spec |
|------|-------|------|
| `config.json` | Repo roots, entity folders with their write policies, read-only doc sources | section 6 |
| `cards.json` | Native cards only (notes, URLs, images, PDFs, audio/video, tables); entity cards are their files under `../discovery/` | section 5 |
| `edges.json` | The global typed edge list; edges reference card IDs only | section 8 |
| `tags.json` | The tag tree; stable IDs mapped to paths | section 9 |
| `tabs/` | One `<slug>.tab.json` per tab, manual or dynamic; the only place positions live | section 10 |
| `tables/` | Authored tables: `<slug>.json` source plus a generated `<slug>.md` twin | section 12 |
| `assets/` | Dropped and imported files, `YYYY-MM-DD_<slug>.<ext>` | section 11 |
| `cache/` | Gitignored: thumbnails, page renders, extracted text, index; rebuildable from assets and entity files | section 4 |
| `changes.jsonl`, `inbox-state.json` | Append-only change journal and last imported capture id; created by the app on first write | sections 13 and 14 |

The app code lives in its own repository (decision D17) and finds this folder through its local `canvas.local.json` or `CANVAS_DATA_DIR`. Deleting everything here except `assets/` loses layout and annotations but never canon.

The empty `tabs/`, `tables/` and `assets/` folders are held in git by a `.gitkeep` each; the app should ignore those files.

**Status (2026-09-12):** scaffolded at Phase 0; the three JSON registries are empty envelopes until Phase 1 writes them.
