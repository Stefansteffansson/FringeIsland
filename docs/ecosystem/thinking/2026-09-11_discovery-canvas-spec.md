# Discovery Canvas — specification

**Status:** Draft v0.3 for review (2026-09-12; v0.3 replaces the up-front migration with an in-app importer, D21). Design document, not canon. Lives in `thinking/` because it describes tooling for the discovery process; it graduates nowhere.

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

## 2. Decisions taken (2026-09-11)

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
| D9 | Phone: capture only, via a separate free-tier Supabase project; captures can target a tab and carry tags; desktop app imports the inbox on launch | Arranging on a phone is a poor experience; isolation from the platform's Supabase project |
| D10 | Locked statements become editable with revisions (was: append-only). Statement keeps its number, gets a revision marker, previous text kept in history, edges touching it flagged for review; minor wording fixes carry no flag | Canon must follow the evolving narrative; traceability preserved by revision records instead of append-only |
| D11 | Write policies per entity folder or doc source: `revisioned` (statements), `editable` (other entity folders), `read-only` (cores and main repo) | Folder rules: never write to the main repo |
| D12 | The app writes files and a change journal; Claude Code owns commits, pushes and merges, driven by the journal | Existing role split |
| D13 | Tables: authored tables (JSON source + markdown twin) and derived tables (read-only query results); a card-reference column type turns cells into edges | Tables participate in the graph |
| D14 | PDFs: file is source, thumbnail/page renders/extracted text are caches keyed by content hash; explicit "replace file" action; page-anchor staleness flag | Updated PDFs refresh without breaking edges |
| D15 | Obsidian Canvas feature parity except write-back into revisioned sources and canvas-in-note embedding (section 16) | Nothing lost, plus the graph layer |
| D16 | Modern light/dark UI with a glass look; landing page carrying the FringeIsland feeling from an image Stefan supplies (section 17) | The tool should feel like part of the universe, not a utility |
| D17 | The app lives in a separate repository; canvas data stays in the discovery worktree | Tooling code and universe documentation have different lifecycles; the FringeIsland repo stays about FringeIsland |
| D18 | Canon on the canvas is one file per entity under `docs/ecosystem/discovery/` (statements, candidates, KB entries, questions, gaps, session notes); readable long views are generated from the entity files | One card = one file: no parser, no partial writes, per-statement git history, frontmatter as the single home for status and tags |
| D21 | No up-front migration. The app is built first; existing files are brought in later, when Stefan chooses, through an in-app importer that splits a markdown file into entity files by a chosen rule with a preview. Originals are left untouched by the importer | Build the tool, then decide what to import and how; the chop is a feature, not a one-off script |
| D19 | Canonical cores under `universe/` stay whole (one card per file, read-only); their statement citations become `derived-from` edges | Cores are coherent documents; graduation picture comes from citations, not from splitting |
| D20 | Sweep commits only; push stays manual. Voice-note transcription is in the inbox phase | Stefan's call |

---

## 3. Architecture

```
+-------------------------------+        +----------------------------+
|  Phone (PWA / share target)   |  --->  |  Supabase (inbox project)  |
|  capture: url/photo/note/pdf  |        |  captures, manifest, bucket|
+-------------------------------+        +-------------+--------------+
                                                       | pull on launch
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

On load the app scans the entity folders and `cards.json`. A file whose `id` collides with another is reported, never silently renamed. A card that is not placed on any tab is "unplaced" and shows in the drawer (section 10.5), whatever its tags or edges.

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
- Write: entity files under the chosen folder, verbatim bodies, frontmatter per section 5.2; a journal entry `import-file` listing the source and every file created. The original file is never modified.
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
- `editable` — double-click edits body and frontmatter fields in place; the app writes the whole file.
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

Edges reference card IDs only. A tab shows an edge when both endpoints are placed on it; when only one is, the placed card shows a badge with the count of off-tab links and a jump list.

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
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "frames": [ { "id": "f_1", "title": "Sections A-H", "x": 0, "y": 0, "w": 1600, "h": 900, "color": "#f2c94c" } ],
  "placements": [ { "card": "cand:2026-07-24/B", "x": 40, "y": 80, "w": 320, "h": 200, "frame": "f_1", "display": "summary" } ],
  "views": [ { "title": "Contradictions only", "edgeTypes": ["contradicts"], "query": null } ]
}
```

`display`: `summary` (title + first lines), `full` (rendered body), `thumb` (media), `embed` (URL iframe or PDF page). Deleting a tab deletes placements only; cards and edges survive as unplaced.

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

### 10.5 Drawer

A side panel listing unplaced cards, the general Inbox, and search results; drag from it onto the current tab.

---

## 11. Media cards: PDF, image, URL, audio/video

**Import:** drop a file onto a tab, or use the inbox. The file is copied to `assets/YYYY-MM-DD_<slug>.<ext>`; a card is created with the content hash.

**PDF caches** (in `cache/`, keyed by hash): first-page thumbnail (PNG), per-page renders on demand (pdf.js), extracted text layer (`.txt`) for search and for Claude sessions, page count. A PDF with no text layer is marked "no text layer"; OCR is out of scope for v1.

**Semantic zoom** (from Canvas for OneNote): `thumb` at low zoom, readable page at high zoom, same object. Double-click opens the in-app viewer (pdf.js in a side panel, canvas still visible). Context menu "Open in external app" shells out on the PC.

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

Desktop app on launch (and on a "Sync inbox" button): pulls captures with `imported_at is null`, downloads files into `assets/`, creates cards (`status: raw`), applies tags, places the card in an "Inbox" frame on the target manual tab, or leaves it unplaced if the target is dynamic (the tags decide visibility), or places it on the general Inbox tab when no target; sets `imported_at`; updates `inbox-state.json`. On every save the desktop app pushes the manifest (tab list, tag tree; nothing else). Apart from that manifest, canvas data never leaves the PC.

---

## 14. Change journal and the Claude Code sweep

Every write appends one line to `changes.jsonl`:

```json
{ "ts": "2026-09-11T14:02:11+02:00", "op": "revise", "card": "stmt:26", "rev": 2, "reason": "Section B reconciliation", "files": ["docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md", "docs/ecosystem/canvas/cards.json", "docs/ecosystem/canvas/edges.json"], "flagged": ["e_7d1a", "e_02cc", "e_9a10"] }
```

Ops: `revise`, `edit`, `append-statement`, `add-card`, `replace-asset`, `add-edge`, `edit-edge`, `delete-edge`, `tag`, `tag-tree`, `table`, `tab`, `layout`, `import`.

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
| Swap card, convert text card to file | Swap; "promote note to candidate file" under `thinking/` with status candidate |
| Resize (Shift keeps aspect), Alt-drag duplicate, Shift-drag axis lock, Space disables snapping | Same |
| Multi-select, delete via key or menu | Same |
| Card and edge colors | Same, plus tag colors |
| Embed canvas in a note | Not needed; instead: embed a tab as a card (later phase) and export tab as PNG/SVG |
| `.canvas` JSON Canvas files | Tab files are JSON Canvas-shaped with card IDs; registry, edges and tags are separate files |

Additions beyond Obsidian: global card identity across tabs, typed edges, tag tree with dynamic tabs and tag-derived relations, tables with card references, PDF caching and revision protocol, phone inbox, change journal, analysis views, on-canvas search.

---

---

## 17. Look and feel

- Light and dark themes, following the OS by default with a manual toggle; both are first-class (no dark-only afterthought). Tokens for surfaces, text, accent, tag colors and edge colors are defined once and used by both themes.
- "Glass" look: translucent panels (inspector, drawer, tag tree, toolbars, tab bar) with backdrop blur, soft borders and low-elevation shadows, floating over the canvas so the canvas stays the visual ground. Cards are opaque for legibility; frames are translucent. Keep blur off the canvas layer itself so React Flow stays fast at hundreds of nodes.
- Front page: the app opens on a landing view rather than directly on a tab: a full-bleed image or short loop that carries the FringeIsland feeling (supplied by Stefan, stored at `docs/ecosystem/canvas/branding/`), the tab list as glass tiles over it, the inbox count, recent activity, and the flag queue count. One click into a tab. The same image, heavily blurred and dimmed, can serve as the canvas backdrop in both themes.
- Typography and spacing: quiet and dense enough for analysis work; no decoration on cards beyond status color, tag chips and kind icon.
- Motion: subtle (panel slide, zoom easing); respect the reduced-motion preference.

## 18. Working loop

The spec is the single contract. Section 16 (parity table) is the feature checklist; `design/tokens.json` in the app repo (colors, glass surfaces, typography, spacing, card and edge styles for both themes) is the visual checklist. Each phase runs the same cycle:

1. **Mock before build.** For screens the phase adds or changes, Claude (Cowork) produces a mockup from the token set; Stefan reacts visually; iterate until it feels right. The mockup is stored under `design/` in the app repo and referenced in the Claude Code prompt.
2. **Build.** Claude Code implements from the spec version named in the prompt plus the mockup. Its run ends with a parity check: every section 16 row the phase touches reported as done, partial or deferred, and every section 19 item of the phase likewise.
3. **Use.** Stefan uses the result for real before judging it.
4. **Feed back.** Observations come back to Cowork as plain statements of what felt wrong or missing. Claude turns them into spec changes (D-table entries, section edits, a version bump) and, when visual, a revised mockup. The next Claude Code prompt names the new spec version.

Rules: a decision counts only once it is in the spec; Claude Code never edits the spec, only Claude (Cowork) does, from Stefan's decisions; ideas that surface mid-phase go to the "Later" list below rather than into the running build; a phase is done when its parity rows are green and Stefan has used it, not when the code compiles.

### Later (parked ideas, not scheduled)

- Embed a tab as a card on another tab.
- Split canonical cores into per-section entities.
- OCR for scanned PDFs.
- Main-repo sources (ADRs, features) for traceability.

---

## 19. Build phases

Each phase is shippable and usable on its own. Claude Code owns implementation; Stefan reviews at each phase boundary.

**Phase 0 — Repo setup (Claude Code).** In the discovery worktree: commit the spec, add it to `thinking/README.md`, create `docs/ecosystem/discovery/` and `docs/ecosystem/canvas/` with `config.json` and a `.gitignore` for `cache/`. In a new repo `D:\WebDev\GitHub\FringeIsland-canvas`: scaffold the Next.js app, `canvas.local.json` (gitignored) pointing at the data folder, a README that points back at the spec, and `design/tokens.json` with a first token set for both themes (the mockup for Phase 1 starts from it).

**Phase 1 — Registry, manual tabs and importer.** Theme tokens (light/dark) and the glass shell (tab bar, inspector, drawer) from the start, so later phases inherit it; landing page with placeholder image until Stefan supplies the FringeIsland one. File API; entity-file reader with frontmatter validation; the importer (section 5.7) with the four presets, so the discovery material can be brought in from day one; `cards.json` for native cards; React Flow canvas with manual tabs (CRUD), frames, placements, summary/full display; typed edges with global list; card inspector; drawer with unplaced cards; on-canvas search; change journal. Read-only cards. Outcome: Stefan imports the discovery log and whatever else he wants through the importer, and has the statements, KB entries, CQs and gaps on tabs with drawn typed relations.

**Phase 2 — Tags and dynamic tabs.** Tag tree and manager; tagging in inspector; tag expressions; dynamic tabs with `cluster-by-tag`, `shared-tag-graph`, `force`; implicit relations and promotion; freeze; saved views on manual tabs.

**Phase 3 — Native cards and media.** Notes, URLs, images, PDFs (caches, viewer, external open, replace-file), audio/video; folder drop; export tab as PNG/SVG.

**Phase 4 — Write-back.** Whole-file editing for `editable` entities; revision protocol for statements; append-statement; promote note to candidate entity; conflict guard; Claude Code sweep skill including view regeneration; freezing imported originals on request.

**Phase 5 — Tables.** Authored tables with editor and markdown twin; cardref edges; derived tables from analysis views.

**Phase 6 — Inbox.** Supabase project, schema, RLS; PWA share-target page; manifest push; importer with tab targeting.

**Phase 7 — Analysis and polish.** Analysis panel, activity slider, matrix and timeline layouts.
