# Discovery Canvas — specification

**Status:** Draft v0.4 (2026-09-12). Contract for Phase 0 and Phase 1.

**Change log.** v0.1 (2026-09-11): first draft. v0.2: entity files (D18), separate app repo (D17), cores whole (D19), push manual (D20). v0.3: in-app importer instead of migration (D21). v0.4: nested tabs (D22), automatic inbox sync (D23), portals with canon vocabulary (D24), no overlap and Arrange (D25), four-side edge handles (D26), multi-select, groups and per-placement color (D27), hover "+" in the tab tree (D28), reader overlay with edit mode and write-only-on-change (D29); sizing, align and distribute, selection toolbar and context menu; shell layout, palette, glass values and the control map (section 17); Phase 1 mockup under `docs/ecosystem/canvas/branding/mockups/phase-1/`. Design document, not canon. Lives in `thinking/` because it describes tooling for the discovery process; it graduates nowhere.

**Owner:** Stefan. **Author of this draft:** Claude (Cowork session, 2026-09-11).

**Builder:** Claude Code, in slices per section 19, run through the loop in section 18.

---

## 1. Purpose

The discovery material is large and linear: a 247 KB append-only session log with 48 locked statements, a 154 KB knowledge base with 29 entries, unlocked candidate material (Sections A-H), OPEN_QUESTIONS (CQ-numbered), the gaps register (G-numbered) and the canonical cores under `universe/`. Relationships between these items exist only in prose and in Stefan's head.

The Discovery Canvas is a local web app that turns that material into cards on zoomable canvases, where Stefan can arrange, group, tag, relate and analyze them, and drop new raw material (images, PDFs, URLs, notes, tables) alongside. It is a view and an annotation layer over the repository — never a second source of truth for canon. Canon lives in entity files (one statement, entry or question per markdown file, section 5); the canvas holds layout, relations and native material.

### Non-goals

- Not a project-management tool. Kanban, features, ADRs and how-we-work are out of scope for v1 (see section 2, scope decision).
- Not a spreadsheet. Tables have no formulas.
- Not a hosted product. It runs on Stefan's PC; only the phone capture inbox (and the small tab/tag manifest it needs) is in the cloud.
- Not a git client. The app never runs git.

---

## 2. Decisions taken (2026-09-11 to 2026-09-12)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Scope: discovery material first; card schema can reference any file in either repo so traceability to the main repo (ADRs, features) can be added later without redesign | The pain is in discovery; the future value is canon-to-product traceability |
| D2 | Own app, not Obsidian | Stefan does not want Obsidian; cross-tab card identity, typed edges and analysis are beyond Obsidian Canvas |
| D3 | Local Next.js app, React Flow as canvas engine, whiteboard-style skin | Analysis needs a graph model; whiteboard feel is styling |
| D4 | Storage: plain files in git under `docs/ecosystem/canvas/`, JSON Canvas-inspired format | Diffable, readable by Claude Code and Claude.ai, no database on the PC |
| D5 | Multiple canvases as tabs; global card registry and global edge list; a card can be placed on many tabs and is the same card everywhere | Cross-referencing between tabs |
| D6 | Two tab kinds: manual (placements) and dynamic (query + layout rule); a manual tab can also hold saved filter views | Tag-driven canvases |
| D7 | Tags form a tree of unlimited depth, created and managed in-app; cards carry any number of tags; tags referenced by stable ID | Rename/move never breaks cards |
| D8 | Relationships: explicit typed edges (drawn) and implicit tag-derived relationships (computed, dashed, never stored); implicit can be promoted to explicit | Tags describe cards, edges describe relationships; the two never substitute |
| D9 | Phone: capture only, via a separate free-tier Supabase project; captures can target a tab and carry tags; desktop app imports the inbox automatically (D23) | Arranging on a phone is a poor experience; isolation from the platform's Supabase project |
| D10 | Locked statements become editable with revisions (was: append-only). Statement keeps its number, gets a revision marker, previous text kept in history, edges touching it flagged for review; minor wording fixes carry no flag | Canon must follow the evolving narrative; traceability preserved by revision records instead of append-only |
| D11 | Write policies per entity folder or doc source: `revisioned` (statements), `editable` (other entity folders), `read-only` (cores and main repo) | Folder rules: never write to the main repo |
| D12 | The app writes files and a change journal; Claude Code owns commits, pushes and merges, driven by the journal | Existing role split |
| D13 | Tables: authored tables (JSON source + markdown twin) and derived tables (read-only query results); a card-reference column type turns cells into edges | Tables participate in the graph |
| D14 | PDFs: file is source, thumbnail/page renders/extracted text are caches keyed by content hash; explicit "replace file" action; page-anchor staleness flag | Updated PDFs refresh without breaking edges |
| D15 | Obsidian Canvas feature parity except write-back into revisioned sources and canvas-in-note embedding (section 16) | Nothing lost, plus the graph layer |
| D16 | Modern light/dark UI with a glass look; landing page carrying the FringeIsland feeling from an image Stefan supplies (section 17) | The tool should feel like part of the universe, not a utility |
| D17 | The app lives in a separate repository; canvas data stays in the discovery worktree | Tooling code and universe documentation have different lifecycles; the FringeIsland repo stays about FringeIsland |
| D18 | Canon on the canvas is one file per entity under `docs/ecosystem/discovery/` (statements, candidates, KB entries, questions, gaps, session notes); readable long views are generated from the entity files | One card = one file: no parser, no partial writes, per-statement git history, frontmatter as the single home for status and tags |
| D19 | Canonical cores under `universe/` stay whole (one card per file, read-only); their statement citations become `derived-from` edges | Cores are coherent documents; graduation picture comes from citations, not from splitting |
| D20 | Sweep commits only; push stays manual. Voice-note transcription is in the inbox phase | Stefan's call |
| D21 | No up-front migration. The app is built first; existing files are brought in later, when Stefan chooses, through an in-app importer that splits a markdown file into entity files by a chosen rule with a preview. Originals are left untouched by the importer | Build the tool, then decide what to import and how; the chop is a feature, not a one-off script |
| D22 | Tabs nest: a tab can have child tabs to any depth; the panel shows a collapsible tree; a parent tab is a full canvas, not a folder; every child tab is the far side of a portal card on its parent (D24) | Discovery material clusters naturally (a universe tab with beings, places and narrative under it) |
| D23 | Inbox sync is automatic: on launch, live via Supabase Realtime while the app runs, and by a 2-minute poll as fallback; the sync button stays but is never required | The phone postbox should just arrive |
| D24 | Any card or frame can become a portal: "Open a portal" creates a child tab as the card's far side; double-click is "Cross" (a Shimmer transition), Escape or the breadcrumb is "Return", "Close the portal" brings the far side back to the near side; the link lives on the canvas side, never in entity files | Folding detail away without losing it, in the universe's own words; the nested-tab tree gets a spatial entrance |
| D25 | Cards and frames never overlap: placing, moving or resizing nudges neighbours aside; frames grow to hold their contents; "Arrange" lays out a tab, a frame or a selection and zooms to fit | Legibility without housekeeping; z-order becomes irrelevant |
| D26 | Every card has an edge handle on each of its four sides; an edge records the side it attaches to at both ends; several edges on one side fan out along it | Relationships stay readable as tabs grow |
| D27 | Multi-select by Ctrl-click or marquee drag; Group (Ctrl G) wraps the selection in a frame; every frame carries a tint from a small palette so groups read as colored regions; cards can be colored the same way, per placement (border at full strength, face at a faint alpha), so one card may differ in color between tabs; edges keep their type colors | Grouping is the everyday gesture; color is an arrangement tool, the status dot stays the semantic signal |
| D28 | Every row in the tab tree shows a right-aligned "+" on hover that opens a portal under that tab | Creating structure where you are looking |
| D29 | A reader overlay shows any card's full content over the dimmed canvas, with its own scroll, editable per the card's write policy, and arrows to the neighbouring cards on the tab | Content lives in the overlay, metadata in the inspector |

---

## 3. Architecture

```
+-------------------------------+        +----------------------------+
|  Phone (PWA / share target)   |  --->  |  Supabase (inbox project)  |
|  capture: url/photo/note/pdf  |        |  captures, manifest, bucket|
+-------------------------------+        +-------------+--------------+
                                              | launch pull + realtime + poll
                                                       v
+------------------------------------------------------------------------+
|  Local Next.js app (PC)                                                |
|  - Browser: React Flow canvas, inspector, tag tree, table editor,      |
|    PDF viewer, analysis panel                                          |
|  - Server (route handlers): file API over the discovery worktree,     |
|    entity-file reader/writer, cache builder, inbox importer, journal,  |
|    "open in external app" shell-out                                    |
+-------------------------------+----------------------------------------+
                                | reads/writes plain files
                                v
+------------------------------------------------------------------------+
|  D:\WebDev\GitHub\FringeIsland-discovery  (discovery worktree)         |
|  docs/ecosystem/canvas/**      (canvas data, owned by the app)         |
|  docs/ecosystem/discovery/**   (entity files: the canon, read/write)   |
|  D:\WebDev\GitHub\FringeIsland (main repo: read-only sources, later)   |
+-------------------------------+----------------------------------------+
                                | commits, pushes, merges
                                v
                          Claude Code sweep (section 14)
```

The app code lives in its own repository (decision D17), suggested `D:\WebDev\GitHub\FringeIsland-canvas`. It finds the data through a local, gitignored `canvas.local.json` in the app repo (or the env var `CANVAS_DATA_DIR`) pointing at `<discovery worktree>/docs/ecosystem/canvas/`. The data always lives under `docs/ecosystem/canvas/` in the discovery worktree, never in the app repo. The Claude Code sweep skill (section 14) lives in the FringeIsland repo's `.claude/skills/`, since it runs against that repo's git; the app repo has its own ordinary commit flow.

---

## 4. Storage layout

```
docs/ecosystem/discovery/
  statements/      S001.md ... S048.md, *.history.md, SESSION-VIEW.md (generated)
  candidates/      <source-slug>/A.md ...
  kb/              KB-001.md ..., X-<slug>.md, KB-VIEW.md (generated)
  questions/       CQ-001.md ..., QUESTIONS-VIEW.md (generated)
  gaps/            G-002.md ..., GAPS-VIEW.md (generated)
  session-notes/   opening-frame.md, ...

docs/ecosystem/canvas/
  config.json            source files and their write policies, repo roots (committed; paths relative to the roots)
  cards.json             native cards only (section 5)
  edges.json             global edge list (section 8)
  tags.json              tag tree (section 9)
  tabs/
    <slug>.tab.json      one file per tab, manual or dynamic (section 10)
  tables/
    <slug>.json          authored table source (section 12)
    <slug>.md            markdown twin, written on save, read-only
  assets/
    YYYY-MM-DD_<slug>.<ext>   dropped/imported files (pdf, png, jpg, mp3, mp4, ...)
  portals.json           card id -> far-side tab id (section 10.1)
  cache/                 gitignored: thumbnails, page renders, extracted text, index
  changes.jsonl          append-only change journal (section 14)
  inbox-state.json       last imported capture id
```

Principles: one ID per thing; positions live only in tabs; caches are rebuildable from assets and entity files; deleting everything under `canvas/` except `assets/` loses layout and annotations but never canon, which lives in `discovery/`.

SQLite is deliberately deferred. At hundreds of cards and thousands of edges, JSON plus an in-memory index is sufficient. If it ever grows past that, SQLite becomes a local index built from these files, not a replacement.

---

## 5. Cards and entity files

A card is anything with an identity on the canvas. Two families:

**Entity cards** are markdown files, one entity per file, under `docs/ecosystem/discovery/` (decision D18). The file is the card: frontmatter carries the metadata, the body carries the text. There is no parser of existing documents at load time and no section-scoped write-back; the app reads and writes whole entity files. Entity files come into existence through the importer (section 5.7), through "new statement / question / note" actions in the app, or by hand.

**Native cards** are owned by the canvas: notes, URLs, images, PDFs, audio/video, tables. Content inline (notes, URLs) or as a path under `canvas/assets/` plus a content hash. Native cards are stored in `canvas/cards.json`.

### 5.1 Entity folders and ID scheme

| Folder | Kind | ID | File name | Typical import source |
|--------|------|----|-----------|---------------|
| `discovery/statements/` | Locked statement | `stmt:26` | `S026.md` | discovery log `## N. Title` |
| `discovery/candidates/` | Candidate section | `cand:gimbal-origin/B` | `gimbal-origin/B.md` | candidate files `## X. Title` (one subfolder per source file) |
| `discovery/kb/` | Knowledge-base entry | `kb:14` | `KB-014.md` | KB `### N. Name — Title` |
| `discovery/kb/` | KB non-numbered section | `kbx:mirror-questions` | `X-mirror-questions.md` | KB principles, synthesis insights, cosmology-of-embodiment sections |
| `discovery/questions/` | Open question | `cq:010` | `CQ-010.md` | OPEN_QUESTIONS `### CQ-NNN: Title` |
| `discovery/gaps/` | Gaps-register entry | `gap:12` | `G-012.md` | gaps.md `**G-NN — Title**` |
| `discovery/session-notes/` | Non-statement log material | `log:opening-frame` | `opening-frame.md` | log opening frame, resume headers, questions register |
| `universe/**/README.md` and satellites | Canonical core (whole file) | `doc:universe/cosmology` | existing file | not imported; one card per file (section 5.5) |
| main repo files (later) | `doc:` | `doc:main/ADR-U031` | existing file | read-only |

Native IDs are short random suffixes; entity IDs come from the file name and are stable across renames of the title. The folder table is the default mapping the importer offers; the importer can also target a new folder and prefix when a future file fits none of them.

### 5.2 Entity file format

```markdown
---
id: stmt:26
kind: stmt
title: Worlds topology locked: Ordinary World, the Shimmer, the Fringe ...
status: locked            # locked | candidate | open | parked | resolved | paused | retired
tags: [place, place/3, entity/ball]
revision: 1
created: 2026-05-18
updated: 2026-05-18
session: 2026-05-18/01    # statements and session notes only
order: 26                 # position in the generated session view
refines: [stmt:12]        # optional; becomes clarifies/supersedes edges (section 8)
cites: []                 # cores and KB: statements this text is derived from; becomes derived-from edges
held: |                   # statements only: Claude's "held" paraphrase from the session, kept verbatim
  ...
---
Body text, verbatim from the source.
```

Tags are written as paths in frontmatter for readability; `canvas/tags.json` maps stable tag IDs to paths. A rename or reparent in the tag manager rewrites the affected frontmatter in one pass and records it in the journal (section 14). Frontmatter is the single place where status and tags live; `cards.json` holds native cards only.

### 5.3 Status

`locked` (statements), `candidate` (Sections A-H and notes promoted to entities), `open` / `parked` / `resolved` (questions and gaps), `raw` (native cards on creation), `material` (a native card once at least one edge connects it to an entity; set automatically, never reverted automatically), `paused`, `retired`.

### 5.4 Registry maintenance

On load the app scans the entity folders and `cards.json`. A file whose `id` collides with another is reported, never silently renamed. A card that is not placed on any tab is "unplaced" and shows in the panel (section 10.5), whatever its tags or edges.

### 5.5 Canonical cores

The seven `universe/` cores and their satellite files stay whole and become one `doc:` card each (about twelve cards), read-only in v1. A `cites:` field in each core's own frontmatter (the S-numbers the core references) yields the `derived-from` edges for the graduation picture (section 15); adding those fields is a small one-time edit Claude Code makes when the statements have been imported. Splitting cores into per-section entities is deferred until the canvas shows it is needed.

### 5.6 Generated views

Once a source has been imported, generated read-only long documents keep the material readable top to bottom:

- `discovery/statements/SESSION-VIEW.md` — all statements in `order`, each with its `held` paraphrase, grouped by `session`, with revision markers.
- `discovery/kb/KB-VIEW.md` — entries in numeric order, followed by the non-numbered sections.
- `discovery/questions/QUESTIONS-VIEW.md` and `discovery/gaps/GAPS-VIEW.md` — grouped by status, with the same quick-index tables as today.

Views are rebuilt by the Claude Code sweep (section 14) and carry a "generated, do not edit" banner. The importer never modifies the original long files; freezing an original with a banner that points at the entity folder and the view is a separate, deliberate step Stefan asks Claude Code for, after which the view is the current reading copy and the original is history.

### 5.7 Importer

The importer is how existing and future documents become entity cards.

- Input: a markdown file picked from either repo, or dropped on a tab. Other formats (docx, txt, html) are converted to markdown first (pandoc on the server side) and then treated the same.
- Split rule, chosen per import: whole file as one card; one card per heading at a chosen level (`##`, `###`); or a regex over heading lines (presets for `## N. Title` statements, `### N. Name — Title` KB entries, `### CQ-NNN:` questions, `**G-NN —**` gaps). Text before the first match becomes a session-note card or is skipped, Stefan's choice.
- Mapping: target folder, ID prefix, numbering source (from the heading number, or sequential), status to assign, optional tags to apply to all cards, and optional field extraction (a labelled block such as "Refines / extends:" into `refines:`, a "held" block into `held:`).
- Preview: every card the rule would produce, with title, ID and body length, before anything is written; collisions with existing IDs are shown and block the import until resolved.
- Write: entity files under the chosen folder, verbatim bodies, frontmatter per section 5.2; a journal entry `import` listing the source and every file created. The original file is never modified.
- Promote (native note to entity): the note's context menu offers "Promote to…" with a kind (candidate, question, session note, KB entry) and a file name defaulting to the title. The app writes a new entity file under the matching folder with frontmatter carried over (title, tags, created) and the body verbatim, then rewrites the card id everywhere (placements, edges, portals, tables) to the new entity id in one journaled `promote` step, so the card keeps its place on every tab. Statements cannot be promoted into directly; a note becomes a candidate and is locked later through the revision flow.
- Re-import: importing the same source again offers to update existing entity bodies (if the entity's `updated` is not later than the source's) or to create only the new ones.

---

## 6. Write policies

`canvas/config.json`:

```json
{
  "roots": {
    "discovery": "D:/WebDev/GitHub/FringeIsland-discovery",
    "main": "D:/WebDev/GitHub/FringeIsland"
  },
  "entities": [
    { "path": "docs/ecosystem/discovery/statements",    "kind": "stmt", "policy": "revisioned" },
    { "path": "docs/ecosystem/discovery/candidates",    "kind": "cand", "policy": "editable" },
    { "path": "docs/ecosystem/discovery/kb",            "kind": "kb",   "policy": "editable" },
    { "path": "docs/ecosystem/discovery/questions",     "kind": "cq",   "policy": "editable" },
    { "path": "docs/ecosystem/discovery/gaps",          "kind": "gap",  "policy": "editable" },
    { "path": "docs/ecosystem/discovery/session-notes", "kind": "log",  "policy": "editable" }
  ],
  "docs": [
    { "path": "docs/ecosystem/universe/**/*.md", "policy": "read-only" },
    { "root": "main", "path": "docs/architecture/decisions/*.md", "policy": "read-only", "enabled": false }
  ]
}
```

Policies:

- `read-only` — card shows content; "open in editor" is the only action.
- `editable` — the reader overlay (section 10.6) opens in edit mode for body and frontmatter fields; the app writes the whole file, only on change.
- `revisioned` — as `editable`, plus the revision protocol in section 7.

Guards for every write: the app refuses to write if the file's mtime or hash changed since the card was loaded (shows a diff and offers reload); writes are atomic (temp file + rename); the app never writes outside the configured entity folders and `canvas/`.

Creating a new entity from the app (a new statement, a new question, a promoted note) writes a new file with the next free number and records `add-card` in the journal.

---

## 7. Revisions of locked statements

Replaces the append-only rule for the discovery log (D10).

Editing a `stmt:` card opens the revision dialog: new text, a reason (free text, required unless "minor"), and a checkbox "minor (wording only, no meaning change)".

On save:

1. The file keeps its name and `id`; `title` may change.
2. `revision` increments and `updated` is set unless minor.
3. The previous body and frontmatter are appended to a sibling history file `S026.history.md` as a dated block with the reason. History files are committed.
4. Every edge with this statement as an endpoint gets the flag `endpoint-revised` (cleared by hand from the edge inspector). Minor revisions set no flag.
5. The journal records `revise` with the reason.
6. The generated session view shows `(rev 2, 2026-09-11)` after the title and a link to the history file.

"Append a clarifying statement" stays available as a second action: it creates `S049.md` with `refines: [stmt:026]`, which yields a `clarifies` edge.

---

## 8. Edges

```json
{ "id": "e_7d1a", "from": "stmt:39", "to": "cand:2026-07-24/B", "type": "contradicts",
  "note": "B places ball creation before S39's transcendence grant", "created": "2026-09-11",
  "origin": "manual", "flags": ["endpoint-revised"] }
```

Types: `supports`, `contradicts`, `clarifies`, `depends-on`, `derived-from`, `supersedes`, `evidence-for`, `related`. Direction is from -> to; `related` is undirected. Colors per type, editable in settings. New types can be added in settings; existing edges keep their type string.

`origin`: `manual` (drawn), `frontmatter` (from `refines`/`cites` fields; regenerated on load, edited only by editing the field), `table:<id>/row/<n>` (from a card-reference cell, section 12), `import` (from the inbox importer when a capture names a target card), `promoted` (from a tag-derived line).

Edges are created by dragging from a side handle to another card, or in Link mode (click source, then target). Edges reference card IDs only, plus the attachment side at each end (`fromSide`, `toSide`: `top` | `right` | `bottom` | `left`, D26); sides are chosen at creation from where the drag started and ended, re-pickable in the edge inspector, and optionally re-chosen by Arrange for cleaner routing. Several edges on one side spread evenly along it. A tab shows an edge when both endpoints are placed on it; when only one is, the placed card shows a badge with the count of off-tab links and a jump list.

---

## 9. Tags

`tags.json`:

```json
{ "tags": [
  { "id": "t_place",   "name": "place",   "parent": null,      "color": "#5b8def" },
  { "id": "t_place3",  "name": "3",       "parent": "t_place", "color": null },
  { "id": "t_shimmer", "name": "shimmer", "parent": "t_place3","color": null }
]}
```

Path is derived (`place/3/shimmer`), never stored on cards. Unlimited depth. Color inherits from the nearest ancestor with a color.

In-app tag manager: create, create child, rename, drag to reparent, set color, merge (rewrites card references in one pass), delete with a choice (reassign to parent / to another tag / untag). Inline creation while tagging: typing a nonexistent path creates the missing levels; a new bare tag lands at root.

Rules: a card carries a set of tag IDs; a card tagged with both a tag and its ancestor is treated as carrying the deeper one; filters use expressions with `and`, `or`, `not`, `*` and ancestor matching (`place` matches everything under it).

---

## 10. Tabs

### 10.1 Manual tab

```json
{ "id": "tab:origin-mythology", "kind": "manual", "title": "Origin mythology",
  "parent": "tab:universe", "order": 2, "collapsed": false,
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "frames": [ { "id": "f_1", "title": "Sections A-H", "x": 0, "y": 0, "w": 1600, "h": 900, "color": "#f2c94c" } ],
  "placements": [ { "card": "cand:2026-07-24/B", "x": 40, "y": 80, "w": 320, "h": 200, "frame": "f_1", "display": "summary", "color": "sky" } ],
  "views": [ { "title": "Contradictions only", "edgeTypes": ["contradicts"], "query": null } ]
}
```

`display`: `summary` (title + first lines), `full` (rendered body), `thumb` (media), `embed` (URL iframe or PDF page), `portal` (live thumbnail of the far side).

**Sizing.** A placement has a width and either an automatic or a fixed height. Auto height (default): height follows the content for the current `display` mode (`summary` clamps the body to a few lines; `full` shows everything), so text is never clipped unintentionally; `h` is then stored as the last computed value for layout only. Dragging the bottom edge or a corner switches to fixed height: the body scrolls inside the card and a bottom fade signals overflow; dragging back past the auto height, or double-clicking the bottom handle, returns to auto. Minimum width 160 px, no maximum; minimum height the header plus one line. Eight handles (corners and mid-edges) on hover and selection; Shift keeps aspect, Alt resizes from the centre. Media cards keep their aspect by default and free it with Shift; the PDF thumbnail scales with the card. Frames never shrink below their contents (an inward drag past a card is refused; an outward drag adds margin). Portal cards resize like any card, the far-side thumbnail scaling inside. Resizes obey no-overlap and snapping, are undoable, and write one `layout` journal entry on release.

**Align and distribute.** With two or more placements selected: align left, horizontal centre, right, top, vertical centre, bottom; distribute horizontally or vertically with equal gaps; match width, height or size. Frames rename on double-click of the title chip; an edge's type changes on double-click of its label; "Copy id" puts the card id on the clipboard; Paste on the canvas places copied placements (or creates note cards from pasted text, media from pasted images or URLs); "Delete card" removes every placement and every edge of the card and asks first. Alignment is relative to the selection's bounding box, or to the last-selected card when Alt is held on the menu item. One undo step, one `layout` journal entry, subject to no-overlap (aligned cards that would collide are nudged; distribute resolves it). Alt + arrow keys nudge the selection by 8 px, Alt Shift + arrows by 40 px.

**No overlap (D25).** Placements are solid. On drop, move or resize, overlapping neighbours are pushed along the shortest clear direction with a short ease (~150 ms); pushes cascade; frames expand to keep their contents inside and are pushed as a unit. Snapping to an 8 px grid and to neighbours' edges is on by default (Space disables while dragging). Selection: click, Ctrl-click to add, marquee drag on empty canvas; Ctrl G groups the selection into a new frame (Ctrl Shift G ungroups). Frames carry `color` from a palette of six tints derived from the theme tokens (accent, sky, meadow, glow, ember, muted) at low alpha; the label chip takes the same hue. Placements carry an optional `color` from the same palette or a custom hex: the card border takes the color at full strength and the card face at about 8% alpha (Obsidian-style); absent means the default card look. Color is per placement, so the same card can be colored differently on different tabs. Edges are colored by type only. "Arrange" (right pill, and per frame in its context menu) runs a layered graph layout (ELK/dagre) over the tab, frame or selection: edges pull connected cards together, frames stay intact, unconnected cards fill a grid to the side; then zoom to fit. Arrange is undoable and writes one `layout` journal entry. Deleting a tab deletes placements only; cards and edges survive as unplaced.

**Portals (D24).** Vocabulary, from canon: a card with a far side is a *portal*; the tab behind it is its *far side*; the tab it sits on is the *near side*; entering is *Cross*, the transition is *the Shimmer*, leaving is *Return*. `canvas/portals.json` maps a card id to a tab id. "Open a portal" on a selected card creates a child tab of the current tab (title = card title, `parent` = current tab), writes the mapping and journals it; on a frame it moves the frame's placements to the far side and leaves one portal card. The portal card shows a small Shimmer marker and the far side's card count, and can display a live thumbnail of the far side (`display: portal`). Double-click (Cross): the card scales to fill the viewport while the far side fades in through the Shimmer; on the far side the portal card is pinned as the header. Escape, the breadcrumb in the top bar ("Return"), or zooming out past the minimum returns to the near side with the reverse transition. Portals nest without limit. "Close the portal" moves the far side's placements back into a frame on the near side and deletes the child tab. Because the mapping is per card, not per placement, a portal crosses from every tab it is placed on. Deleting a portal card's placement does not delete its far side; the card goes to the unplaced list in the panel.

Portals can also be opened from the panel: "+" on a tab row, or right-click "New portal", creates the child tab and at the same time a portal card on the near side's canvas (a native note card titled with the new tab's name, placed at the centre of the current viewport). Rule: every child tab is the far side of exactly one portal card on its near side, whichever way it was created; only root-level tabs have no portal card. The portal card can later be swapped for an entity card ("Use as portal" on a selected card while the far side exists).

**Nesting (D22).** `parent` names another tab (any kind); `order` sorts siblings; `collapsed` remembers the tree state. The panel's tab tree renders the hierarchy with chevrons; drag a tab onto another to reparent, drag between siblings to reorder; "New portal" in a tab's context menu (section 10.1, Portals). Deleting or closing: "Close the portal" (on a child tab or its portal card) moves the far side's placements back into a frame on the near side and deletes the child tab; "Delete tab" (any tab) removes its placements (cards go to the unplaced panel) and asks whether child tabs move up one level or are deleted with it. In Phase 1 the tree can nest before portals exist; when Phase 2 lands, every existing child tab gets its portal card created on its parent at the viewport centre. A dynamic tab's query may use `in:<tab-id>` to match cards placed anywhere in that tab's subtree. Tab ids are stable across moves, so placements, edges and captures targeting a tab are unaffected by reparenting.

### 10.2 Dynamic tab

```json
{ "id": "tab:place-3-map", "kind": "dynamic", "title": "Place 3 map",
  "query": "place/3 and not status/locked",
  "layout": { "rule": "cluster-by-tag", "level": 2, "nested": true },
  "relations": { "explicit": true, "implicit": { "minSharedDepth": 2 } }
}
```

Layout rules: `cluster-by-tag` (every tag at `level` becomes a frame; `nested` shows the subtree as nested frames), `shared-tag-graph` (cards connected when their deepest shared tag is at depth >= `minSharedDepth`; edge length and weight shrink/grow with depth), `matrix` (tag family A down, family B across, cards at intersections), `force` (force-directed over explicit + implicit edges), `timeline` (by lock/capture/revision date), `by-status`.

Dynamic tabs are read-only in position; cards on them are fully editable (content, tags, edges). A card that would fall in two frames appears once with a marker listing the other frames. "Freeze" copies the computed layout into a new manual tab.

### 10.3 Implicit (tag-derived) relations

Rendered dashed, weight by shared depth, hover shows the shared tag, never stored. Right-click "make explicit" creates a typed edge with `origin: promoted`.

### 10.4 Cross-tab navigation

Card inspector shows "appears on" (tabs) and "linked off this tab" (edges) with jump actions. Edge inspector has "go to source / go to target" (opens the tab where the other endpoint is, or offers to place it here).

### 10.5 Panel (Tabs mode)

The rail's panel in Tabs mode: the tab tree, then the unplaced cards (cards placed on no tab), then the inbox summary; drag from it onto the current tab. Other rail items swap the panel's content (tags, analysis, inbox). Earlier drafts called the unplaced list "the drawer"; it is this panel.

### 10.6 Reader overlay (D29)

Enter on a selected card, "Open" in the selection toolbar, or double-click on a non-portal card opens a centred glass overlay (about two thirds of the viewport, canvas dimmed behind). Layout: header with kind, id, status chip and the source path; body rendered as markdown with its own vertical scroll; a side column with the frontmatter fields (title, status, tags, refines, cites) as editable controls; the links list at the bottom; left and right arrows step to the neighbouring cards on the current tab in placement order. Media cards open in the section 11 viewer inside the same overlay; URL cards show the cached text with a button to the live page. Editing follows section 6 and opens directly: native cards and `editable` entities open in edit mode (live-preview markdown editor for the body, frontmatter fields active); `revisioned` statements open read-only with the Revise button (section 7); `read-only` docs open read-only with "Open in editor". Writes happen only on change: the overlay keeps the file as loaded, and on close (Escape, or stepping to a neighbour) or Ctrl S it serialises the current state and compares it byte for byte with the loaded version; identical means no write, no journal entry and no mtime change; different means one whole-file write with the conflict guard and one `edit` journal entry. There is no autosave timer while typing; closing with changes saves, and "Discard changes" in the overlay footer drops them.

Formatting in edit mode: standard shortcuts (Ctrl B bold, Ctrl I italic, Ctrl K link, Ctrl Shift 1-3 headings, Ctrl Shift 8 bullet list, Ctrl Shift 7 numbered list, Ctrl Shift 9 quote, Ctrl E inline code, Ctrl Shift C code block, Tab / Shift Tab list indent) plus markdown-as-you-type (`# `, `- `, `> `, `**` pairs). A compact glass formatting bar sits above the body with one icon per action; hovering an icon shows the action name and its shortcut. The bar is hidden in read-only mode. While the overlay is open it owns the keyboard, so canvas shortcuts do not fire. Reading is Phase 1, editing Phase 4.

---

## 11. Media cards: PDF, image, URL, audio/video

**Import:** drop a file onto a tab, or use the inbox. The file is copied to `assets/YYYY-MM-DD_<slug>.<ext>`; a card is created with the content hash.

**PDF caches** (in `cache/`, keyed by hash): first-page thumbnail (PNG), per-page renders on demand (pdf.js), extracted text layer (`.txt`) for search and for Claude sessions, page count. A PDF with no text layer is marked "no text layer"; OCR is out of scope for v1.

**Semantic zoom** (from Canvas for OneNote): `thumb` at low zoom, readable page at high zoom, same object. Double-click opens the in-app viewer (pdf.js inside the reader overlay, section 10.6). Context menu "Open in external app" shells out on the PC.

**Update:** "Replace file" on the card copies the new file over the asset path (old version stays in git history), records `replacedOn` and page-count change, rehashes, invalidates caches. If any edge or note on this card carries a page anchor and the page count changed, the card gets the flag `page-anchors-stale` until cleared. On app load the file API rehashes all assets so out-of-band replacements are also detected.

**URL cards:** URL, captured title, capture date, Stefan's one-line note, optional text snapshot; `embed` display renders the live page in an iframe (Obsidian parity), default display is the cached title + note so a dead link still means something.

**Images:** thumbnail cache, full-resolution on zoom. **Audio/video:** player in `embed` display.

---

## 12. Tables

**Authored table** (`tables/<slug>.json`):

```json
{ "id": "table:thinkers-x-principles", "title": "Thinkers x principles",
  "columns": [ { "id": "c1", "name": "Thinker", "type": "cardref" }, { "id": "c2", "name": "Principle", "type": "text" }, { "id": "c3", "name": "Integrated", "type": "checkbox" } ],
  "rows": [ { "id": "r1", "cells": { "c1": "kb:2", "c2": "Non-fixed self", "c3": true } } ] }
```

Column types: `text`, `number`, `date`, `tag`, `checkbox`, `cardref`. No formulas. On save the app writes the markdown twin (`tables/<slug>.md`, marked generated) and syncs `cardref` cells into `edges.json` with `origin: table:<id>/row/<n>` and type `related` by default (type editable per column). Deleting a row deletes its edges.

Editor: grid with inline editing, add/remove row and column, column type picker, drag to reorder, cardref cells as chips with jump. Glide Data Grid (MIT) or a TanStack Table build.

**Derived table:** a placement whose card is a query (`derived:<slug>`, stored inside the tab): read-only rows computed at load from the analysis views (section 15).

---

## 13. Phone capture inbox

Separate Supabase project, free tier, created 2026-09-11:

| Item | Value |
|------|-------|
| Organization | FringeIslandDEV (free plan) |
| Project name | FringeIsland-Discovery |
| Project ID | `orsoozbuqvaswsqdyqeb` |
| Region | eu-west-1 (West EU, Ireland) |
| API URL | `https://orsoozbuqvaswsqdyqeb.supabase.co` |
| Publishable key | `sb_publishable_XbKEEA2z5SHGDmCePRqJSA_bkEtbPRQ` (safe to commit; browser-side, RLS-guarded) |
| Secret key | `sb_secret_...` — never written down here or in any committed file |
| Key style | New-style keys, not the legacy anon/service_role pair |

Key handling: the publishable key goes in the phone PWA (safe in a browser with RLS on); the secret key is used only by the desktop app's server-side importer and manifest push, stored in the app repo's gitignored `canvas.local.json` (or `.env.local`), never in the spec, the data folder or any committed file. Single user; auth by magic link to Stefan's email (password login exists as a fallback but no password form is built); RLS allows only that user. Auth state as of 2026-09-12: Stefan's user created via the dashboard, public sign-ups disabled, Email the only enabled provider. Still to do at Phase 6: Site URL and redirect URLs for the PWA under Authentication > URL Configuration; tables, bucket and RLS policies created by Claude Code from this section.

Schema:

```
captures(id, created_at, type text /* url|image|pdf|note|audio */, payload text, note text,
         target_tab text null, tags text[] null, storage_path text null, imported_at timestamptz null)
manifest(id int = 1, tabs jsonb, tags jsonb, updated_at)
bucket: captures (images, PDFs, audio)
```

Phone page: a PWA registered as a share target; fields: payload (auto-filled from share), note, target tab (picker from manifest, remembers last used), tags (picker from manifest tree). Voice note transcribed to text (in scope for Phase 6).

Desktop app sync runs three ways: on launch, live while running (a Supabase Realtime subscription on `captures` inserts, so a phone capture appears in the Inbox within seconds with a toast and the rail badge), and a poll every 2 minutes as fallback when the socket is down; a "Sync now" button remains for reassurance. Each sync pulls captures with `imported_at is null`, downloads files into `assets/`, creates cards (`status: raw`), applies tags, places the card in an "Inbox" frame on the target manual tab, or leaves it unplaced if the target is dynamic (the tags decide visibility), or places it on the general Inbox tab when no target; sets `imported_at`; updates `inbox-state.json`. On every save the desktop app pushes the manifest (tab list, tag tree; nothing else). Apart from that manifest, canvas data never leaves the PC.

---

## 14. Change journal and the Claude Code sweep

Every write appends one line to `changes.jsonl`:

```json
{ "ts": "2026-09-11T14:02:11+02:00", "op": "revise", "card": "stmt:26", "rev": 2, "reason": "Section B reconciliation", "files": ["docs/ecosystem/discovery/statements/S026.md", "docs/ecosystem/discovery/statements/S026.history.md", "docs/ecosystem/canvas/edges.json"], "flagged": ["e_7d1a", "e_02cc", "e_9a10"] }
```

Ops: `revise`, `edit`, `append-statement`, `add-card`, `promote`, `replace-asset`, `add-edge`, `edit-edge`, `delete-edge`, `tag`, `tag-tree`, `table`, `tab`, `portal`, `layout`, `import`.

The sweep is a Claude Code skill: read journal entries since the last sweep marker, group into commits (canon revisions and appends; edits to editable sources; graph changes: edges, tags, tables; layout and imports), stage exactly the files listed (never glob), write `docs(scope): subject` messages with bodies from the journal reasons, commit on the discovery branch, append a `sweep` marker line. Push stays manual (Stefan pushes); the sweep never pushes. Canon revisions are the commits worth reviewing before merge. The journal is committed with the changes so history and journal always agree.

The sweep also regenerates the four long views (section 5.6) whenever entity files changed. The app has a "Sweep now" button that only writes a `sweep-requested` marker; running the sweep is Claude Code's job.

---

## 15. Analysis views

Available as a panel, as derived tables, and (where spatial) as dynamic-tab layouts:

- Contradiction pairs: all `contradicts` edges, grouped by locked endpoint.
- Unlocked material that locked statements depend on (`depends-on` edges from `locked` cards to cards with any non-locked status, `raw` included).
- Orphans: KB entries and native cards with no edge to any statement or core section; statements with no tags.
- Coverage by tag family: count of cards per tag subtree, with empty subtrees highlighted.
- Flag queue: `endpoint-revised`, `page-anchors-stale`, entity files with invalid or duplicate frontmatter.
- Revision log: statements by revision date with reasons.
- Activity slider (from Canvas for OneNote): highlight cards created, revised or captured within a date range.
- Traceability (later, when main-repo sources are enabled): statements with and without a `derived-from` edge from an ADR or feature.

---

## 16. Obsidian Canvas parity

| Obsidian Canvas | Discovery Canvas |
|-----------------|------------------|
| Infinite pan/zoom; zoom to fit / to selection / reset | Same |
| Text cards with markdown | Native note cards |
| Note cards from vault, live editable, write back | Entity cards: whole-file write-back under `editable`, revision protocol under `revisioned`, read-only for cores and main-repo docs |
| Media cards: image, audio, video, PDF | Same, with caches and semantic zoom |
| Web page embeds | URL card `embed` display |
| Drop a folder to add all files | Same (bulk import into `assets/` or as `doc:` cards) |
| Groups: create from selection, rename, color, move as unit | Frames |
| Connections with labels, colors, direction; go to source/target | Typed edges, global, cross-tab |
| Swap card, convert text card to file | Swap; "Promote to…" writes a new entity file under `discovery/` (section 5.7) |
| Resize (Shift keeps aspect), Alt-drag duplicate, Shift-drag axis lock, Space disables snapping | Same |
| Multi-select, delete via key or menu | Same |
| Card and edge colors | Same, plus tag colors |
| Embed canvas in a note | Not needed; instead: embed a tab as a card (later phase) and export tab as PNG/SVG |
| `.canvas` JSON Canvas files | Tab files are JSON Canvas-shaped with card IDs; registry, edges and tags are separate files |

Additions beyond Obsidian: global card identity across tabs, typed edges, tag tree with dynamic tabs and tag-derived relations, tables with card references, PDF caching and revision protocol, phone inbox, change journal, analysis views, on-canvas search.

---

## 17. Look and feel

- Light and dark themes, following the OS by default with a manual toggle; both are first-class (no dark-only afterthought). Tokens for surfaces, text, accent, tag colors and edge colors are defined once and used by both themes.
- "Glass" look: translucent panels (inspector, rail panel, toolbars, tab bar) with backdrop blur, soft borders and low-elevation shadows, floating over the canvas so the canvas stays the visual ground. Cards are opaque for legibility; frames are translucent. Keep blur off the canvas layer itself so React Flow stays fast at hundreds of nodes.
- Branding image: `docs/ecosystem/canvas/branding/gimbal-dusk.jpg` (the Gimbal held up against a dusk meadow, 1856 x 2304). Palette sampled from it, the seed for `design/tokens.json`:

  | Token | Dark theme | Light theme | Source in the image |
  |-------|-----------|-------------|---------------------|
  | ground | `#121512` | `#e9eef3` | leather / pale dusk sky |
  | surface (glass) | `rgba(37,44,31,0.55)` | `rgba(255,255,255,0.55)` | tree line / haze |
  | text | `#e9e4d8` | `#1e2420` | warm off-white / near-black |
  | text muted | `#8a8f86` | `#5e6560` | brushed metal grey |
  | accent (brass) | `#c9a35e` | `#8a6a34` | the housing |
  | highlight (glow) | `#f0cf8a` | `#a8823f` | the ball's light (darkened on light ground for contrast) |
  | ember | `#d98a5a` | `#b8683a` | the glow's warm edge; used for contradicts edges and the sixth tint |
  | sky | `#98b3cd` | `#5f83a8` | dusk sky |
  | meadow | `#6b8a4a` | `#4f6a3a` | grass |
  | border | `rgba(201,163,94,0.25)` | `rgba(138,106,52,0.25)` | brass, faint |

  Status colors: locked = accent, candidate = sky, open = meadow, raw = text muted, paused/retired = muted with strikethrough. Edge type colors are picked from the same set so nothing on the canvas falls outside the image's palette.
- Shell layout (Obsidian-shaped, from the Phase 1 mockup): a slim icon rail on the far left (Home, Tabs, Tags, Analysis, Inbox; Settings and Help at the bottom) that opens a panel next to it whose content follows the rail item (Tabs: the tab tree plus unplaced cards and the inbox summary; Tags: the tag tree; Analysis: the views; Inbox: captures); a glass top bar with the app name, the breadcrumb of the current tab's near-side chain, the recently opened tabs, search, "Sweep now" and the theme toggle; the canvas; a floating creation toolbar bottom-center (Note, Entity, Media, Frame, Link, Import) with keyboard shortcuts in tooltips; a vertical pill on the canvas's right edge (zoom in, level, zoom out, fit, reset, Arrange, undo, redo); the inspector on the right. Cards show a small file label above media cards (the asset filename) and a handle on each side on hover for drawing edges.
- Front page: the app opens on a landing view rather than directly on a tab: a full-bleed image or short loop that carries the FringeIsland feeling (supplied by Stefan, stored at `docs/ecosystem/canvas/branding/`), the tab list as glass tiles over it, the inbox count, recent activity, and the flag queue count. One click into a tab. The same image, heavily blurred and dimmed, can serve as the canvas backdrop in both themes.
- Typography: Manrope for UI (400-700), Instrument Serif for the landing title and the inspector's card title; fallbacks Segoe UI / Georgia. Type sizes in the mockup: UI 12-13.5px, card titles 13.5px/600, inspector title 20px serif, landing title 58px serif.
- Glass values from the Phase 1 mockup (`docs/ecosystem/canvas/branding/mockups/phase-1/`): panels `backdrop-filter: blur(18px)`, surface alpha 0.55 (0.75 for the active tab and zoom pill), 1px brass border at 0.25 alpha, radius 14px for panels and 12px for cards, chips 20px tall with 999px radius, shadow `0 10px 30px` at 0.35 (dark) / 0.12 (light). Cards are opaque (`#1b201a` dark, `#fbfaf7` light). Edge colors: supports = meadow, clarifies = sky, depends-on = accent, evidence-for = highlight, contradicts = ember (`#d98a5a` dark / `#b8683a` light, dashed).
- Spacing: quiet and dense enough for analysis work; no decoration on cards beyond status dot, tag chips and kind icon.
- Motion: subtle (panel slide, zoom easing); respect the reduced-motion preference. The one deliberate piece of motion is the Shimmer: ~350 ms, the portal card scaling to the viewport with the far side cross-fading in underneath, reversed on Return; with reduced motion it is a plain crossfade.

### 17.1 Control map (Phase 1 mockup)

Every visible control, what it does, where the spec defines it, and the phase it lands in. Claude Code treats this as the parity list for the shell.

**Top bar**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Gimbal mark + "Discovery Canvas" | Click: back to the landing view | 17 | 1 |
| Tab chips (Origin mythology, Place 3 map, Whisp craft) | Recently opened tabs; the active one is filled. Middle-click or x removes the chip (the tab stays in the tree); drag to reorder; right-click: rename, duplicate tab (placements copied), New portal, Delete tab | 10, D22 | 1 |
| "+" after the tabs | New tab at root (manual by default; dynamic via the dialog) | 10 | 1 (manual), 2 (dynamic) |
| Search field (Ctrl K) | Command palette: cards by id, title, body and tag; tabs; actions ("new tab", "import"). Enter jumps to the card on its tab | 16 (on-canvas search) | 1 |
| "Sweep now" | Writes the `sweep-requested` marker for Claude Code; never runs git | 14 | 1 |
| Sun / moon | Theme toggle (system, light, dark) | 17 | 1 |

**Rail (far left)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Home | Landing view | 17 | 1 |
| Tabs | Panel shows the tab tree, unplaced cards and inbox summary (default) | 10, 17 | 1 |
| Tags | Panel shows the tag tree and tag manager | 9 | 2 |
| Analysis | Panel shows the analysis views; each can be placed as a derived table or opened as a dynamic tab | 15 | 7 (panel), 2 (dynamic tabs) |
| Inbox (with dot) | Panel shows captures waiting; dot = unimported count | 13 | 6 |
| Settings | Data folder, write policies, edge types and colors, tokens, Supabase keys | 6, 8, 17 | 1 (basic), 6 (Supabase) |
| Help | Keyboard shortcuts and the section 16 gesture list | 16 | 1 |

**Panel (next to the rail, Tabs mode)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| TABS header "+" | New tab at root | 10 | 1 |
| Tree rows with chevrons | Click: open the tab; chevron: collapse or expand (remembered); drag onto a row: reparent; drag between rows: reorder; right-aligned "+" on hover (D28) or right-click "New portal": child tab plus its portal card on this tab's canvas; right-click also: rename, Close the portal (asks about children) | 10.1 nesting, D24 | 1 (tree), 2 (portals) |
| "DYN" badge | Marks a dynamic tab | 10.2 | 2 |
| UNPLACED list (count) | Cards on no tab; drag onto the canvas to place; click: open in inspector | 10.5 | 1 |
| INBOX summary (badge) | Count and a one-line summary; click: switch panel to Inbox mode | 13 | 6 |

**Canvas**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Card | Never overlaps another (neighbours are nudged aside on drop, move, resize); click: select (inspector follows); double-click: Cross if the card is a portal, else the reader overlay; right-click: Open a portal / Close the portal (Phase 2); drag: move; Alt-drag: duplicate placement; Shift-drag: axis lock; resize at eight handles (auto height by default, fixed height once the bottom edge is dragged; Shift keeps aspect, Alt from centre); hover shows four edge handles | 16 | 1 |
| Kind icon + id (card header) | Kind at a glance; id is copyable | 5 | 1 |
| Status dot | locked = accent, candidate = sky, open = meadow, raw = muted | 5.3, 17 | 1 |
| Tag chips on cards | Click: filter the current tab to that tag (saved view) | 9, 10.1 views | 2 |
| Frame (dashed, tinted) | Group: Ctrl-click or marquee to select several cards, then Ctrl G or the Frame tool; tint from the frame palette (menu); drag moves contents; double-click title to rename; color from the properties menu; right-click: Open a portal (folds contents onto a far side, Phase 2) | 16, 10.1 | 1 |
| Portal card (Shimmer marker + count) | Double-click: Cross to the far side; pinned as header there; Escape / breadcrumb / zoom-out: Return | 10.1 D24, 17 | 2 |
| Breadcrumb (top bar, on a far side) | Near-side chain of the current tab; click any level to Return to it | 10.1 D24 | 2 |
| Edge line + label | Click: select edge (inspector shows type, note, endpoints, "go to source / target"); double-click label: change type; Delete removes | 8 | 1 |
| Edge handles (top, right, bottom, left; visible on hover and selection) | Drag from a handle to any side of another card to create an edge; the sides are recorded; type picker appears on drop; several edges per side fan out | 8, D26 | 1 |
| Filename label above media card | Asset filename; click: open in external app | 11 | 3 |
| Dashed tag-derived line (dynamic tabs only) | Hover: shared tag; right-click: "make explicit" | 10.3 | 2 |

**Selection toolbar (floats above the selection)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Delete | Removes the placement from this tab (card stays in the unplaced list); on a frame: removes the frame, keeps its cards; on an edge: deletes the edge | 10.1, 8 | 1 |
| Color | Palette of six tints plus custom hex; on a card paints border and a faint face tint (per placement), on a frame the region tint; "None" clears | D27 | 1 |
| Zoom to selection | Fits the selection in the viewport | 16 | 1 |
| Open | Reader overlay for the selected card (Enter does the same); in edit mode a formatting bar with shortcut tooltips | 10.6 | 1 |
| Edit / Open source | Native card: edit in the overlay (Phase 1); entity card: open the file (Phase 1) or edit in the overlay (Phase 4) | 6, 10.6 | 1 |
| Open a portal / Cross | Card without a far side: open one; portal card: Cross | D24 | 2 |
| Align (2+ selected) | Menu: align left / centre / right / top / middle / bottom, distribute horizontally / vertically, match width / height / size; Alt on an item aligns to the last-selected card | 10.1 align | 1 |
| Frame only: title field | Rename inline | 16 | 1 |
| Edge only: type, direction, note | Change the edge type, flip direction, edit the note | 8 | 1 |

**Context menu (right-click on a card, frame, edge or empty canvas)**

Card: Open (reader overlay) · Cross (portal) · Open a portal / Close the portal · Edit or Open source · Revise (statement, Phase 4) · Add tag · Duplicate placement · Copy id · Open in external app / Show in folder (assets and entity files) · Zoom to selection · Remove from this tab · Delete card (asks; removes every placement and its edges). Frame: Rename · Color · Arrange contents · Open a portal (folds contents) · Ungroup · Delete frame. Edge: type · flip · note · Delete. Empty canvas: Note here · Paste · Arrange · Zoom to fit. Deliberately absent from Obsidian's list: Send to back / front (nothing overlaps) and Narrow to heading / block (an entity is already one section).

**Less frequent controls (where they live)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Freeze (dynamic tab header) | Copies the computed layout into a new manual tab | 10.2 | 2 |
| Saved views (manual tab header menu) | Save the current filter as a view; switch or delete views | 10.1 views | 2 |
| Sync now (Inbox panel) | Pulls the inbox immediately; otherwise automatic | 13, D23 | 6 |
| Replace file (media card context menu) | Swaps the asset, rehashes, invalidates caches, flags page anchors | 11 | 3 |
| Append a clarifying statement (statement context menu) | New statement file with `refines` set | 7 | 4 |
| Promote to… (note context menu) | Turns a native note into a candidate, question, session note or KB entity file; card id rewritten everywhere | 5.7 | 1 |
| Use as portal (card context menu, when the current tab is a far side) | Makes this card the portal of the current far side | 10.1 portals | 2 |
| Clear flag (edge inspector) | Clears `endpoint-revised` on the edge | 7 | 4 |
| Off-tab link badge (on a card) | Count of edges whose other end is on another tab; click: jump list | 8 | 1 |
| Export tab (empty-canvas context menu) | PNG or SVG of the tab | 16 | 3 |
| Link mode (toolbar Link, or L) | Click a source card, then a target; Esc exits; same result as dragging a handle | 8 | 1 |
| Search (Ctrl K) | Command palette over cards (id, title, body, tags), tabs and actions; Enter jumps or runs | 17 | 1 |

**Creation toolbar (bottom center)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Note (N) | New native note card at the cursor | 5, 11 | 1 |
| Entity (E) | Picker: existing entity from the panel's unplaced list, or "new statement / question / candidate" which writes a new entity file | 5, 6 | 1 (pick), 4 (new) |
| Media (M) | File dialog or paste: image, PDF, audio/video, or a URL | 11 | 3 |
| Frame (F) | Drag out a frame; with a selection, wraps it | 16 | 1 |
| Link (L) | Link mode: click source card, then target; Esc exits | 8 | 1 |
| Import | The importer: pick a markdown or other file, split rule, preview, write entity files | 5.7 | 1 |

**Right pill (canvas edge)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| + / % / - | Zoom in, current level (click: 100%), zoom out | 16 | 1 |
| Fit | Zoom to fit all, or to selection when something is selected | 16 | 1 |
| Reset | Reset viewport to the tab's saved viewport | 10.1 | 1 |
| Arrange | Auto-layout the tab (or the selection) respecting edges and frames, then zoom to fit; undoable | 10.1 D25 | 1 |
| Undo / Redo | Ctrl Z / Ctrl Shift Z; layout, edges, tags, native card edits; entity file edits undo until saved | 16 | 1 |

**Inspector (right)**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Kind icon + id + status chip | Identity; status chip shows revision for statements | 5, 7 | 1 |
| Title, source line | Title; source path opens the file location | 5 | 1 |
| Tag chips + "+ tag" | Add or remove tags; typing creates missing tags | 9 | 2 |
| LINKS list | Every edge on this card, typed; rows on other tabs show the tab name with a jump chevron | 8, 10.4 | 1 |
| APPEARS ON chips | Tabs where the card is placed; click jumps | 10.4 | 1 |
| Open source | Opens the entity file in the system editor | 6 | 1 |
| Revise | Revision dialog for statements (text, reason, minor); "Edit" for editable entities and native cards | 7 | 4 (disabled in Phase 1) |

**Landing**

| Control | Does | Spec | Phase |
|---------|------|------|-------|
| Tab tiles | Open that tab; tiles reflect the tab tree's top level | 17 | 1 |
| New tab / Import a file | Same as the toolbar actions | 10, 5.7 | 1 |
| "flags to review" | Opens the flag queue in the Analysis panel | 15 | 7 |
| RECENT list | Last journal entries; click jumps to the card | 14 | 1 |
| Footer line | Data folder and last sweep time | 14 | 1 |


---

## 18. Working loop

The spec is the single contract. Section 16 (parity table) is the feature checklist; `design/tokens.json` in the app repo (colors, glass surfaces, typography, spacing, card and edge styles for both themes) is the visual checklist. Each phase runs the same cycle:

1. **Mock before build.** For screens the phase adds or changes, Claude (Cowork) produces a mockup from the token set; Stefan reacts visually; iterate until it feels right. The mockup is stored under `design/` in the app repo and referenced in the Claude Code prompt.
2. **Build.** Claude Code implements from the spec version named in the prompt plus the mockup. Its run ends with a parity check: every section 16 row the phase touches reported as done, partial or deferred, and every section 19 item of the phase likewise.
3. **Use.** Stefan uses the result for real before judging it.
4. **Feed back.** Observations come back to Cowork as plain statements of what felt wrong or missing. Claude turns them into spec changes (D-table entries, section edits, a version bump) and, when visual, a revised mockup. The next Claude Code prompt names the new spec version.

Rules: a decision counts only once it is in the spec; Claude Code never edits the spec, only Claude (Cowork) does, from Stefan's decisions; ideas that surface mid-phase go to the "Later" list below rather than into the running build; a phase is done when its parity rows are green and Stefan has used it, not when the code compiles.

### Later (parked ideas, not scheduled)

- Split canonical cores into per-section entities.
- OCR for scanned PDFs.
- Main-repo sources (ADRs, features) for traceability.

---

## 19. Build phases

Each phase is shippable and usable on its own. Claude Code owns implementation; Stefan reviews at each phase boundary.

**Phase 0 — Repo setup (Claude Code).** In the discovery worktree: commit the spec, add it to `thinking/README.md`, create `docs/ecosystem/discovery/` and `docs/ecosystem/canvas/` with `config.json` and a `.gitignore` for `cache/`. In a new repo `D:\WebDev\GitHub\FringeIsland-canvas`: scaffold the Next.js app, `canvas.local.json` (gitignored) pointing at the data folder, a README that points back at the spec, and `design/tokens.json` with a first token set for both themes (the mockup for Phase 1 starts from it).

**Phase 1 — Registry, manual tabs and importer.** No-overlap nudging, snapping, Arrange and four-side edge handles are Phase 1 canvas behaviour. Theme tokens (light/dark) and the glass shell (tab bar, rail, panel, inspector) from the start, so later phases inherit it; landing page with placeholder image until Stefan supplies the FringeIsland one. File API; entity-file reader with frontmatter validation; the importer (section 5.7) with the four presets, so the discovery material can be brought in from day one; `cards.json` for native cards; React Flow canvas with manual tabs (CRUD), frames, placements, summary/full display; typed edges with global list; card inspector; reader overlay (read-only for entities, editable for notes); note promotion to entity files; panel with the tab tree and unplaced cards; on-canvas search; change journal. Read-only cards. Outcome: Stefan imports the discovery log and whatever else he wants through the importer, and has the statements, KB entries, CQs and gaps on tabs with drawn typed relations.

**Phase 2 — Tags, dynamic tabs and portals.** Open / close portal, portal cards, the Shimmer transition and breadcrumb; tag tree and manager; tagging in inspector; tag expressions; dynamic tabs with `cluster-by-tag`, `shared-tag-graph`, `force`; implicit relations and promotion; freeze; saved views on manual tabs.

**Phase 3 — Media.** URLs, images, PDFs (caches, viewer, external open, replace-file), audio/video; folder drop; export tab as PNG/SVG.

**Phase 4 — Write-back.** Editing in the reader overlay; whole-file editing for `editable` entities; revision protocol for statements; append-statement; conflict guard; Claude Code sweep skill including view regeneration; freezing imported originals on request.

**Phase 5 — Tables.** Authored tables with editor and markdown twin; cardref edges; derived tables from analysis views.

**Phase 6 — Inbox.** Supabase project, schema, RLS; PWA share-target page; manifest push; importer with tab targeting; realtime subscription and poll fallback; voice-note transcription.

**Phase 7 — Analysis and polish.** Analysis panel, activity slider, matrix and timeline layouts.
