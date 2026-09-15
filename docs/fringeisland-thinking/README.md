# FringeIsland Thinking — the universe, the discovery work, the research

**Purpose:** Everything that describes FringeIsland as a world and everything we learned while working it out — the canonical universe design, the dated discovery sessions it grew from, the research reports that inform it, the design records, the open questions. One folder, one level deep. **The filename carries the register.**

**This is for:** Universe design (cosmology, roles, beings, narrative, growth mechanics, community), the universe-discovery sessions and their graduation tracker, research reports (domain, worldbuilding, method, engineering), cross-cutting design records, and the ecosystem open-questions register.

**This is NOT for:** Constitutional documents (→ [`../ecosystem/VISION.md`](../ecosystem/VISION.md), [`../ecosystem/MANIFESTO.md`](../ecosystem/MANIFESTO.md), [`../ecosystem/PRINCIPLES-AI.md`](../ecosystem/PRINCIPLES-AI.md)), stable strategy (→ [`../ecosystem/strategy/`](../ecosystem/strategy/)), platform architecture or service specifications (→ [`../platform/`](../platform/)), product features (→ [`../products/`](../products/)), binding decisions (→ [`../architecture/decisions/`](../architecture/decisions/)), or point-in-time planning snapshots (→ [`../planning/reference/`](../planning/reference/)).

**Relationship to other docs:** `VISION.md` constrains — it says what FringeIsland is and isn't. `MANIFESTO.md` inspires — it says what we value. The `canon--` files here **imagine** — they say how the world actually works. [`../platform/domain/world-model/`](../platform/domain/world-model/) implements what the canon describes.

---

## How to read a filename

```
<register>--<area>--<topic>.ext          canon, research, record
<register>--<yyyy-mm-dd>--<topic>.ext    discovery (dated sessions)
<register>--<topic>.ext                  questions, canvas
```

The first token says **what kind of thing this is**. The second token is **what you would scan for inside that register** — the area for canon and research, the date for discovery sessions. Sorted alphabetically, any file lister groups by register, then by area or date.

| Register | Meaning | Graduation |
|---|---|---|
| `canon--` | The canonical world — what the universe **is**. The Status line at the top of each file carries the finer grade (Canonical / Extracted / Thinking). | Arrives here from `discovery--`. |
| `discovery--` | Dated working sessions on the universe, and their graduation tracker + backlog. Working notes, **never canon**. | A concept that crystallises is written into a `canon--` file (or an ADR) and gets a row in [`discovery--tracker-and-backlog.md`](discovery--tracker-and-backlog.md). |
| `research--` | Reports and studies — what we learned from studying something. Areas: `growth` (human development, flourishing, facilitation), `worlds` (portals, parallel worlds), `method` (how a solo developer runs an ecosystem), `engineering`. | Informs canon, ADRs and specs; never becomes them. |
| `record--` | Design records and snapshots produced by a session — the design lives here, the obligations land in the owning specs. | — |
| `questions--` | The ecosystem open-questions (CQ) register. | Resolved questions move to the register's Resolved section; strategic direction → `../ecosystem/strategy/`; constitutional change → `VISION.md` / `MANIFESTO.md`. |
| `canvas--` | What was kept from the discovery-canvas experiment (2026-09-11 to 2026-09-14). | Closed record. |

---

## canon-- — the canonical world

This is the puzzle — pieces placed as they are defined, gaps visible where they are not. The full picture keeps emerging as the ecosystem, the community, and the Dreamineer movement grow.

| File | What it covers | Status |
|---|---|---|
| [`canon--cosmology--worlds-topology.md`](canon--cosmology--worlds-topology.md) | The worlds topology — Ordinary World, the Shimmer, the Fringe (two co-located places, near side and the Beyond), the Void and the cord, the village and the Tree | **Canonical** — ratified Session B, 2026-06-10 |
| [`canon--roles--taxonomy.md`](canon--roles--taxonomy.md) | The role taxonomy — L0 identity states, L1 FIM modes, L2 the enterprise-stewardship plane; retired names; why NPCs are not roles | **Canonical** — ratified Session B, 2026-06-10 |
| [`canon--beings--whisp-and-npcs.md`](canon--beings--whisp-and-npcs.md) | Beings that inhabit the world — the Whisp; NPCs as layered, depth-on-demand composites; where the creative roles went | **Canonical** — rewritten Session B, 2026-06-10 |
| [`canon--narrative--how-story-works.md`](canon--narrative--how-story-works.md) | How story works — seasons, episodes, journeys; Respawn, the loop as the medium | Respawn section ratified 2026-06-10; the rest overview |
| [`canon--growth--three-questions.md`](canon--growth--three-questions.md) | The red thread — Who am I? What do I want? How do I get there? × three perspectives; the Live / Grow / Matter teleology beneath; the 9-cell matrix | Extracted from founding vision (April 2026); Live/Grow/Matter added Session B |
| [`canon--growth--engagement-spectrum.md`](canon--growth--engagement-spectrum.md) | The Homebody → Explorer spectrum and its developmental honesty | Extracted from founding vision (April 2026) |
| [`canon--growth--privacy-model.md`](canon--growth--privacy-model.md) | Three tiers of avatar / personal-data visibility — private by default, selectively shared, transparently shared | Extracted; re-grounded on the Mist 2026-06-21 (ADR-U031) |
| [`canon--community--member-archetypes.md`](canon--community--member-archetypes.md) | Member archetypes — the Homebody, the Explorer, the Dreamineer | Thinking — needs deepening and validation (grade under review, TASK-UNI-03) |
| [`canon--community--kickstarter-season-zero.md`](canon--community--kickstarter-season-zero.md) | The Kickstarter as the founding moment — Season Zero; backers arrive on the island; the founding Dreamineer cohort | Extracted from founding vision (April 2026) |

**Growth** — FringeIsland is built around three questions. They are not answered by the platform; they are held by it. Growth happens through lived experience, not instruction: the developmental scaffolding is invisible in the experience layer — stories first, themes underneath. The `growth` files describe that scaffolding as universe design, not software specification; they are foundational to the Journey Studio, the Whisp, and DS-3 Journeys.

**Community** — FringeIsland is a movement, not a product. The community is not an add-on to the platform; it is the reason the platform exists. The `community` files describe it as a living organism — how it begins, how it grows, how its founding moment shapes everything that follows. The Kickstarter is not primarily a fundraiser: it is a community-building event, a world-launch, an invitation. Its design is its own exploration, and the campaign launches after the full ecosystem vision is set — not before. For the governance view of contributor groups and boundaries, see [`../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md`](../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md).

---

## discovery-- — the universe-discovery sessions

Working sessions exploring the universe — its cosmology, beings, dynamics, and meaning. Each session is a discrete artifact capturing statements, "held" interpretations, and open threads. Content here is not canonical.

| File | What it is | Status |
|---|---|---|
| [`discovery--tracker-and-backlog.md`](discovery--tracker-and-backlog.md) | The **graduation tracker** (which discovery concepts have a canonical home), the discovery backlog (open topics awaiting sessions), sounding-board notes | Live tracker — read by `doc-health-check` §10 and the dashboard |
| [`discovery--2026-05-18--universe-session-01.md`](discovery--2026-05-18--universe-session-01.md) | Session 01 — 48 numbered statements (S001–S048) on the Whisp, the worlds, beings, growth, community | In progress (resumed 2026-06-05); the source the cores were ratified from |
| [`discovery--2026-05-18--the-universe-explained.md`](discovery--2026-05-18--the-universe-explained.md) | "The Universe, Explained" — the onboarding summary of Session 01 | Summary |
| [`discovery--2026-05-28--portal-ideas-from-research.md`](discovery--2026-05-28--portal-ideas-from-research.md) | Portal candidates generated against the locked cosmology — five primary, five texture | Candidates |
| [`discovery--2026-06-15--knowledge-base-whisp-and-universe-foundations.md`](discovery--2026-06-15--knowledge-base-whisp-and-universe-foundations.md) | Knowledge base — philosophical, psychological, and empirical foundations for the Whisp and the universe (Live / Grow / Matter, the Whisp as companion and growth mirror) | Knowledge base |
| [`discovery--2026-07-24--gimbal-origin-and-altered-states.md`](discovery--2026-07-24--gimbal-origin-and-altered-states.md) | The Gimbal's origin, the ball as key, the three altered states | CANDIDATE — not locked |

---

## questions-- — the open-questions register

| File | What it is |
|---|---|
| [`questions--ecosystem-open-questions.md`](questions--ecosystem-open-questions.md) | Ecosystem-level open questions, CQ-numbered — blocking / active / parked / resolved. Bootstrapping, Dreamineer recruitment, Council governance, monetisation, and more. |

---

## research-- — reports and studies

Any document that answers "what did we learn from studying something?" Research informs decisions across ecosystem, architecture, and planning — but the research itself lives here regardless of which area it feeds.

| File | Topic |
|---|---|
| [`research--growth--kegan-immunity-to-change.md`](research--growth--kegan-immunity-to-change.md) | Kegan's adult-development theory and Immunity to Change — how adults actually grow, and why they often don't |
| [`research--growth--what-fills-a-life-v2.md`](research--growth--what-fills-a-life-v2.md) | What Fills a Life — the architecture of human flourishing (v2, most complete; [`.docx`](research--growth--what-fills-a-life-v2.docx)) |
| [`research--growth--what-fills-a-life-v1.md`](research--growth--what-fills-a-life-v1.md) | What Fills a Life — v1 (superseded by v2; retirement is a TASK-UNI-03 question) |
| [`research--growth--theory-u.md`](research--growth--theory-u.md) | Theory U — Scharmer's phenomenology of transformation; facilitation methodology |
| [`research--worlds--portal-fantasy.md`](research--worlds--portal-fantasy.md) | Portal fantasy — thresholds, doorways, and other worlds across books, film, theatre, games, folklore (54 entries) |
| [`research--worlds--parallel-worlds.md`](research--worlds--parallel-worlds.md) | Worlds beside our own — parallel and alternative realities across five media (22 entries) |
| [`research--method--multi-product-ecosystem-management.md`](research--method--multi-product-ecosystem-management.md) | Multi-product ecosystem management for solo developers — the document hierarchy, description vs specification ([`rev1.docx`](research--method--multi-product-ecosystem-management-rev1.docx), [`rev2.docx`](research--method--multi-product-ecosystem-management-rev2.docx)) |
| [`research--method--solo-developer-systematic-web-development.md`](research--method--solo-developer-systematic-web-development.md) | The solo developer's complete guide to systematic web development ([`.docx`](research--method--solo-developer-systematic-web-development.docx)) |
| [`research--engineering--performance-budget.md`](research--engineering--performance-budget.md) | First-paint performance budget vetted against Core Web Vitals, RAIL, Nielsen limits, SaaS benchmarks (2026-07-07) |
| [`research--engineering--cold-start-industry.md`](research--engineering--cold-start-industry.md) | Cold-start — how the field solves what we measured; Vercel's solution stack (2026-07-10) |

The `worlds` reports are the external cross-media surveys that feed the discovery work — see [`discovery--2026-05-28--portal-ideas-from-research.md`](discovery--2026-05-28--portal-ideas-from-research.md).

---

## record-- — design records

Cross-cutting design records produced by joint-design spikes — the design lives here; the obligations land in the owning specs.

| File | What it is |
|---|---|
| [`record--breach-response-gdpr-art-33-34.md`](record--breach-response-gdpr-art-33-34.md) | Breach-response design (GDPR Art. 33/34) across all five verticals — detect → assess → clock → notify authority → notify members → record |
| [`record--universe-to-spec-manifestation.md`](record--universe-to-spec-manifestation.md) | Snapshot map of how the canon and discovery concepts are (or aren't) realised as capabilities in the entity specifications; prioritised gaps |

---

## canvas-- — the discovery-canvas experiment

The hand-authored remnants of the discovery-canvas experiment (2026-09-11 to 2026-09-14) — the only material not re-derivable from the app repository. The app and its spec live in `FringeIsland-canvas`; the six commits are behind the tag `archive/discovery-canvas-2026-09-14`.

| File | What it is |
|---|---|
| [`canvas--what-was-kept.md`](canvas--what-was-kept.md) | What was kept, what was deliberately not kept, a note on the tab names |
| [`canvas--feedback-v0.4.md`](canvas--feedback-v0.4.md) | Stefan's Phase 1 first-use feedback — 23 items and bugs B1–B3, the source of spec decisions D31–D35 |
| [`canvas--tab-taxonomy.md`](canvas--tab-taxonomy.md) | The 13-tab structure at revert |
| [`canvas--the-seam.pdf`](canvas--the-seam.pdf) | The Seam (20 pp) |
| [`canvas--gimbal-dusk.jpg`](canvas--gimbal-dusk.jpg) · [`canvas--gimbal-workshop.jpg`](canvas--gimbal-workshop.jpg) | The two Gimbal images |
| [`canvas--mockup-dark-variant.png`](canvas--mockup-dark-variant.png) | A dark-canvas mockup variant matching nothing committed in either repo |

---

*Flattened from `docs/ecosystem/universe/`, `docs/ecosystem/thinking/` and `docs/research/` on 2026-09-15 (TASK-UNI-02). This folder is the creative heart of the ecosystem documentation. It grows as the universe is defined — through sessions, through community input, and through the work of Dreamineers who haven't arrived yet.*
