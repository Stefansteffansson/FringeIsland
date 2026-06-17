# Project dashboard — how to update it

**To refresh the overview:** run `npm run dashboard` (regenerates the snapshot). **To read it:** run `npm run dashboard:serve`, then open the printed URL (http://localhost:4178/docs/dashboard/index.html). The dashboard is a **derived view** — its overview panels are a *snapshot* from the last generate, while the in-page file viewer is *always live*. You never hand-edit the generated HTML.

---

## When to regenerate

- At every **cooldown / cycle boundary**, alongside the doc-health check (it's a step in [`PROCESS.md`](../../docs/planning/PROCESS.md) §3).
- Any time after a change to the canon you want reflected in the overview panels (a new ADR, a status change, a refreshed spec, the build metrics moving).
- You do **not** need to regenerate just to read the latest version of a file — the file viewer fetches live.

## What to change, and where

| To change… | Edit… |
|---|---|
| **What a panel shows** (which files/sections feed it, the tabs, their order) | `sources.json` — the manifest. This is the single place that decides content; the dashboard owns no prose of its own. |
| **How it looks or behaves** (styling, the modal viewer, new block types, computed metrics) | `generate.js` — the generator. |
| **Where file links resolve / the port** | `serve.js` — the static server. |

After editing, run `npm run dashboard` and refresh the browser.

## The manifest (`sources.json`) in brief

The file is `{ title, subtitle, panels: [...] }`. Each panel becomes a tab (in array order — reorder the array to reorder the tabs) and holds a list of **blocks**. Block types:

- `links` — a titled list of file links.
- `intro` — the top/intro of a `.md` file (frontmatter stripped).
- `section` — a named `## heading` section of a `.md` file.
- `entities` — grouped name + auto-extracted summary + open-link (used for PC/DS/verticals, chapters, skills).
- `group` — wraps several blocks in one bordered container with an optional `note` on top (used for the research→thinking→universe foundations).
- `toc` — the `##` headings of a file.
- `adrs` · `cqs` · `waves` — auto-enumerated from `decisions/`, OPEN_QUESTIONS, and `waves/`.
- `metrics` · `activity` — live, computed from the repo (migrations, tests, routes, ADRs, last commit; recent git log).
- `svg` — an embedded diagram.
- `folders` — the top-level `docs/` folders with their README purpose lines.

Paths are repo-root-relative (e.g. `docs/...`, `.claude/skills/...`). Any `.md` path becomes a clickable link that opens in the modal viewer.

## Files

- `generate.js` — reads the manifest, extracts text + computes metrics, renders `docs/dashboard/index.html`.
- `sources.json` — the manifest (what the panels show).
- `serve.js` — a zero-dependency static server so file links open in the browser.
- `docs/dashboard/` — the generated output (gitignored; regenerate on demand). The generator and manifest are the source of truth that *is* committed.

Dependencies: `marked` + `gray-matter` (dev deps).
