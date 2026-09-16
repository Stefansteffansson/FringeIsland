# FringeIsland Thinking — the universe, the discovery work, the research

**Purpose:** Everything that describes FringeIsland as a world and everything we learned while working it out — the canonical universe design, the discovery work it grew from, the research reports that inform it, the design records, the open questions. One folder, one level deep. **The filename carries the register, and the name says what is inside.**

**This is for:** Universe design (cosmology, roles, beings, narrative, growth, community), the discovery work (where it stands, the ideas on the table, the sessions record), research reports (growth, worlds, method, engineering), cross-cutting design records, and the ecosystem open-questions register.

**This is NOT for:** Constitutional documents (→ [`../ecosystem/VISION.md`](../ecosystem/VISION.md), [`../ecosystem/MANIFESTO.md`](../ecosystem/MANIFESTO.md), [`../ecosystem/PRINCIPLES-AI.md`](../ecosystem/PRINCIPLES-AI.md)), stable strategy (→ [`../ecosystem/strategy/`](../ecosystem/strategy/)), platform architecture or service specifications (→ [`../platform/`](../platform/)), product features (→ [`../products/`](../products/)), binding decisions (→ [`../architecture/decisions/`](../architecture/decisions/)), or point-in-time planning snapshots (→ [`../planning/reference/`](../planning/reference/)).

**Relationship to other docs:** `VISION.md` constrains — it says what FringeIsland is and isn't. `MANIFESTO.md` inspires — it says what we value. The `canon--` files here **imagine** — they say how the world actually works. [`../platform/domain/world-model/`](../platform/domain/world-model/) implements what the canon describes.

---

## Start here

**What is true right now — three steps, in this order.**

1. Open the **graduation tracker**, Part 1 of [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md). It maps every settled concept to its single source of truth: a `canon--*` file, or an ADR for the four concepts that are architectural decisions — products as equipment profiles ([ADR-U025](../architecture/decisions/ADR-U025-products-as-equipment-profiles.md)), the studio decomposition ([ADR-U026](../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md)), governance by scope ([ADR-U028](../architecture/decisions/ADR-U028-governance-by-scope.md)), the Mist identity lifecycle ([ADR-U031](../architecture/decisions/ADR-U031-mist-identity-lifecycle.md)). A concept that is not in that table is not settled: look for it in the discovery backlog beside the table, or in the [CQ register](questions--ecosystem-open-questions.md).
2. Open the canon file and read its **Status line**. *Canonical* means ratified and true now. *Extracted* means carried from the founding vision and never ratified. *Thinking* means provisional. *Planned — not yet written* means nothing is true yet. The Statement index at the bottom of a ratified core says which session statements its text rests on.
3. If the table named an ADR, **read the ADR**. ADRs bind; canon must agree with them, and where they differ the ADR wins and the canon file owes a reconciliation.

**How to change it.** Canon is never edited ad hoc. State the change in a discovery session — Part 3 of the discovery file, numbered on from the last statement — then a ratification pass in Claude Code rewrites the canon section citing the new statements, updates its Status line, and adds or refreshes the graduation-tracker row. If a platform contract moves, an ADR is written and becomes the concept's home instead. Research never becomes canon: it feeds a session and stays a report.

**Read in this order if you are new:** the [cosmology](canon--cosmology--worlds-topology.md) → the [roles](canon--roles--taxonomy.md) → the [beings](canon--beings--whisp-and-npcs.md) → [how story works](canon--narrative--how-story-works.md) → [how growth works](canon--growth--how-growth-works.md) → the [open questions](questions--ecosystem-open-questions.md).

---

## How to read a filename

```
<register>--<area>--<topic>.ext    canon, research, record
<register>--<topic>.ext            discovery, questions (one file each)
```

The first token says **what kind of thing this is**. The second token is **what you would scan for inside that register** — the area for canon, research and records; for the two single-file registers the name says what the file holds. Sorted alphabetically, any file lister groups by register, then by area.

| Register | Meaning | Graduation |
|---|---|---|
| `canon--` | The canonical world — what the universe **is**. The Status line at the top of each file carries the finer grade (Canonical / Extracted / Thinking); a page that is promised but unwritten is listed inside its core under "Planned — not yet written", never as an empty file. | Arrives here from `discovery--`. |
| `discovery--` | One file: where the discovery work stands, the ideas on the table, and the sessions record. Working notes, **never canon**. | A concept that crystallises is written into a `canon--` file (or an ADR) and gets a row in the graduation tracker, Part 1 of [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md). |
| `research--` | Reports and studies — what we learned from studying something. Areas: `growth` (human development, flourishing, facilitation, the thinkers behind the Whisp), `worlds` (portals, parallel worlds), `method` (how a solo developer runs an ecosystem), `engineering`. | Informs canon, ADRs and specs; never becomes them. |
| `record--` | Design records and snapshots produced by a session — the design lives here, the obligations land in the owning specs. | — |
| `questions--` | The ecosystem open-questions (CQ) register. | Resolved questions move to the register's Resolved section; strategic direction → `../ecosystem/strategy/`; constitutional change → `VISION.md` / `MANIFESTO.md`. |

---

## canon-- — the canonical world

This is the puzzle — pieces placed as they are defined, gaps visible where they are not. The full picture keeps emerging as the ecosystem, the community, and the Dreamineer movement grow.

| File | What it covers | Status |
|---|---|---|
| [`canon--cosmology--worlds-topology.md`](canon--cosmology--worlds-topology.md) | The worlds topology — Ordinary World, the Shimmer, the Fringe (two co-located places, near side and the Beyond), the Void and the cord, the village and the Tree | **Canonical** — ratified Session B, 2026-06-10 |
| [`canon--roles--taxonomy.md`](canon--roles--taxonomy.md) | The role taxonomy — L0 identity states, L1 FIM modes, L2 the enterprise-stewardship plane; retired names; why NPCs are not roles | **Canonical** — ratified Session B, 2026-06-10 |
| [`canon--beings--whisp-and-npcs.md`](canon--beings--whisp-and-npcs.md) | Beings that inhabit the world — the Whisp; NPCs as layered, depth-on-demand composites; where the creative roles went; the two planned pages (the Whisp's full specification, NPC authoring) listed inside | **Canonical** — rewritten Session B, 2026-06-10 |
| [`canon--narrative--how-story-works.md`](canon--narrative--how-story-works.md) | How story works — seasons, episodes, journeys; Respawn, the loop as the medium; the three planned pages (seasons and episodes, journeys' route types and content families, the first experience) listed inside | Respawn section ratified 2026-06-10; the rest overview; the planned pages unwritten (the first experience waits on CQ-010) |
| [`canon--growth--how-growth-works.md`](canon--growth--how-growth-works.md) | How growth works — the red thread (Who am I? What do I want? How do I get there? × three perspectives), the Live / Grow / Matter drives beneath it, the 9-cell matrix; the engagement spectrum (cultivate the home, or go on expeditions near or far — Homebody, Explorer, Beyond); the three member-archetype personas | Extracted from founding vision (April 2026); Live/Grow/Matter added Session B; the archetypes section is Thinking — needs validation |
| [`canon--growth--privacy-model.md`](canon--growth--privacy-model.md) | What the world may see of you — three tiers of avatar / personal-data visibility: private by default, selectively shared, transparently shared | Extracted; re-grounded on the Mist 2026-06-21 (ADR-U031) |
| [`canon--community--kickstarter-season-zero.md`](canon--community--kickstarter-season-zero.md) | How it begins — the Kickstarter as the founding moment, Season Zero; backers arrive on the island; the founding Dreamineer cohort | Extracted from founding vision (April 2026) |

**Growth** — FringeIsland is built around three questions. They are not answered by the platform; they are held by it. Growth happens through lived experience, not instruction: the developmental scaffolding is invisible in the experience layer — stories first, themes underneath. The `growth` files describe that scaffolding as universe design, not software specification; they are foundational to the Journey Studio, the Whisp, and DS-3 Journeys.

**Community** — FringeIsland is a movement, not a product. The community is not an add-on to the platform; it is the reason the platform exists. The `community` file describes how it begins and how its founding moment shapes everything that follows. The Kickstarter is not primarily a fundraiser: it is a community-building event, a world-launch, an invitation. Its design is its own exploration, and the campaign launches after the full ecosystem vision is set — not before. For the governance view of contributor groups and boundaries, see [`../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md`](../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md).

---

## discovery-- — the universe in the making

One file, three parts. Content here is not canonical.

| File | What it is | Status |
|---|---|---|
| [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md) | **Part 1 — where things stand:** the session log, the discovery backlog (topics awaiting a session), the sounding-board notes, the **graduation tracker** (which concept became canon, and where). **Part 2 — ideas on the table:** the ten portal types generated against the cosmology (2026-05-28), the Gimbal's origin, the ball as key and the three altered states (2026-07-24) — candidates, not locked. **Part 3 — the sessions:** Stefan's statements verbatim, S001 onward, with Claude's held interpretations; Session 01 (2026-05-18, resumed three times) is the source the three Canonical cores were ratified from. | Live — Part 1 is read by `doc-health-check` §10 and the dashboard; Part 3 is append-only |

---

## questions-- — the open-questions register

| File | What it is |
|---|---|
| [`questions--ecosystem-open-questions.md`](questions--ecosystem-open-questions.md) | Ecosystem-level open questions, CQ-numbered — blocking / active / parked / resolved. Bootstrapping, Dreamineer recruitment, Council governance, monetisation, and more. |

---

## research-- — reports and studies

Any document that answers "what did we learn from studying something?" Research informs decisions across ecosystem, architecture, and planning — but the research itself lives here regardless of which area it feeds. Research never becomes canon: it feeds a discovery session, and what Stefan states there is what gets ratified.

| File | Topic |
|---|---|
| [`research--growth--kegan-immunity-to-change.md`](research--growth--kegan-immunity-to-change.md) | Kegan's adult-development theory and Immunity to Change — how adults actually grow, and why they often don't |
| [`research--growth--what-fills-a-life.md`](research--growth--what-fills-a-life.md) | What Fills a Life — the architecture of human flourishing ([`.docx`](research--growth--what-fills-a-life.docx)); v1 retired 2026-09-15 and the v2 suffix dropped 2026-09-16, both in git history |
| [`research--growth--theory-u.md`](research--growth--theory-u.md) | Theory U — Scharmer's phenomenology of transformation; facilitation methodology |
| [`research--growth--thinkers-and-models-behind-the-whisp.md`](research--growth--thinkers-and-models-behind-the-whisp.md) | The thinkers and models behind the Whisp — 29 entries from Parfit and Korzybski to Jung, Kegan and Kross, each read for what the Whisp must be so that a human grows by talking to it; with the syntheses (the Whisp as growth mirror, tough love, the three-level Shadow hypothesis). Append-only; moved here from `discovery--` on 2026-09-16 because by content it is a study with implications |
| [`research--worlds--portal-fantasy.md`](research--worlds--portal-fantasy.md) | Portal fantasy — thresholds, doorways, and other worlds across books, film, theatre, games, folklore (54 entries) |
| [`research--worlds--parallel-worlds.md`](research--worlds--parallel-worlds.md) | Worlds beside our own — parallel and alternative realities across five media (22 entries) |
| [`research--method--multi-product-ecosystem-management.md`](research--method--multi-product-ecosystem-management.md) | Multi-product ecosystem management for solo developers — the document hierarchy, description vs specification ([`.docx`](research--method--multi-product-ecosystem-management.docx); rev1 retired 2026-09-15 and the rev2 suffix dropped 2026-09-16, both in git history) |
| [`research--method--solo-developer-systematic-web-development.md`](research--method--solo-developer-systematic-web-development.md) | The solo developer's complete guide to systematic web development ([`.docx`](research--method--solo-developer-systematic-web-development.docx)) |
| [`research--engineering--performance-budget-and-cold-start.md`](research--engineering--performance-budget-and-cold-start.md) | Two reports, one investigation — the first-paint performance budget vetted against Core Web Vitals, RAIL, Nielsen limits and SaaS benchmarks (2026-07-07, locked as ADR-U043), and cold start: how the field solves what we measured, Vercel's solution stack (2026-07-10, feeds ADR-U036) |

The `worlds` reports are the external cross-media surveys that feed the discovery work — see Candidate A in Part 2 of [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md).

---

## record-- — design records

Cross-cutting design records produced by joint-design spikes — the design lives here; the obligations land in the owning specs.

| File | What it is |
|---|---|
| [`record--breach-response-gdpr-art-33-34.md`](record--breach-response-gdpr-art-33-34.md) | Breach-response design (GDPR Art. 33/34) across all five verticals — detect → assess → clock → notify authority → notify members → record |
| [`record--universe-to-spec-manifestation.md`](record--universe-to-spec-manifestation.md) | Snapshot map of how the canon and discovery concepts are (or aren't) realised as capabilities in the entity specifications; prioritised gaps |

---

*Flattened on 2026-09-15 (TASK-UNI-02) from the former `ecosystem/universe/`, `ecosystem/thinking/` and `research/` trees; condensed on 2026-09-16 (TASK-UNI-04, TASK-UNI-05) to one file per topic. This folder is the creative heart of the ecosystem documentation. It grows as the universe is defined — through sessions, through community input, and through the work of Dreamineers who haven't arrived yet.*
