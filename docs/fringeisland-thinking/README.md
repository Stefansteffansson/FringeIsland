# FringeIsland Thinking — the universe, the discovery work, the research

**Purpose:** Everything that describes FringeIsland as a world and everything we learned while working it out — the Universe Bible, the discovery work it grew from, the research reports that inform it, the design records, the open questions, the quotes kept for later. One folder, one level deep. **The filename carries the register, and the name says what is inside.**

**This is for:** Universe design (the bible: worlds, beings, growth, story, roles and governance, community), the discovery work (where it stands, the ideas on the table, the sessions record), research reports (growth, worlds, method, engineering), cross-cutting design records, the ecosystem open-questions register, and the quotes collection.

**This is NOT for:** Constitutional documents (→ [`../ecosystem/VISION.md`](../ecosystem/VISION.md), [`../ecosystem/MANIFESTO.md`](../ecosystem/MANIFESTO.md), [`../ecosystem/PRINCIPLES-AI.md`](../ecosystem/PRINCIPLES-AI.md)), stable strategy (→ [`../ecosystem/strategy/`](../ecosystem/strategy/)), platform architecture or service specifications (→ [`../platform/`](../platform/)), product features (→ [`../products/`](../products/)), binding decisions (→ [`../architecture/decisions/`](../architecture/decisions/)), or point-in-time planning snapshots (→ [`../planning/reference/`](../planning/reference/)).

**Relationship to other docs:** `VISION.md` constrains — it says what FringeIsland is and isn't. `MANIFESTO.md` inspires — it says what we value. The **bible** here **imagines** — it says how the world actually works, in the present tense. [`../platform/domain/world-model/`](../platform/domain/world-model/) implements what the bible describes. ADRs bind: the bible must agree with them, and where they differ the ADR wins and the bible owes a correction.

---

## Start here

**What is true right now — three steps, in this order.**

1. Open the **Universe Bible**, [`bible--fringeisland-universe.md`](bible--fringeisland-universe.md), and read its one-page chapter 1, *Start here*. The bible is the single truth: what FringeIsland is and how it is supposed to work, today, in the present tense, with no history in the body. It holds three kinds of content and nothing in between — what is **true**, what is **open** (a marked box in the chapter where the topic is discussed, indexed in chapter 8), and the **vocabulary** (chapter 9, the glossary, which wins wherever two documents disagree). **Load the chapter you need, never the whole bible**: it is about 50,000 tokens, and no chapter exceeds 8,500.
2. For a word, open the **glossary** (chapter 9). For a mechanic, open the chapter the glossary entry names. A question that is not stated as true in a chapter and not in an Open box is not a settled question — look for it in the discovery file's Part 1 backlog or in the [CQ register](questions--ecosystem-open-questions.md).
3. If a platform decision defines a term (the glossary entry ends with an ADR pointer), **read the ADR**. ADRs bind.

**The bible is deep-bible tier.** It holds the backdrop, which is never surfaced in the experience and is left out of the story bible authors receive; its distribution follows [CQ-019](questions--ecosystem-open-questions.md).

**How to change it.** The bible is never edited ad hoc. State the change in a discovery session — Part 3 of [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md), numbered on from the last statement — then the session's "Baked into the bible" list is carried into the bible by Claude Code: a true sentence rewritten, an Open box replaced by its answer and its index line removed, a glossary entry corrected. If a platform contract moves, an ADR is written and the bible points to it. Research never becomes truth: it feeds a session and stays a report, cited by the bible.

**Read in this order if you are new:** the bible's chapter 1 → chapter 2 (the worlds) → chapter 3 (the beings) → chapter 4 (growth) → chapter 5 (story) → chapter 9 (the glossary, as needed) → the [open questions](questions--ecosystem-open-questions.md).

---

## How to read a filename

```
<register>--<area>--<topic>.ext    research
<register>--<topic>.ext            bible, discovery, questions, quotes (one file each), record (one-off design records)
```

The first token says **what kind of thing this is**. The second token is **what you would scan for inside that register** — the area for research; for the bible, discovery, questions, quotes and the records the name itself says what the file holds. Sorted alphabetically, any file lister groups by register, then by area.

| Register | Meaning | How it changes |
|---|---|---|
| `bible--` | **The Universe Bible** — the single truth about what the universe **is** and how it works, present tense, one file, nine chapters. The vocabulary authority is its glossary. | Through a discovery session, then Claude Code bakes the session's statements into it. Never edited ad hoc. |
| `discovery--` | One file: where the discovery work stands, the ideas on the table, and the sessions record. Working notes, **never truth** on their own; the workshop where new thinking happens before it is baked into the bible. Part 3 (the sessions) is append-only and is never rewritten. | A session is appended to Part 3; its "Baked into the bible" list is carried into the bible. |
| `research--` | Reports and studies — what we learned from studying something. Areas: `growth` (human development, flourishing, facilitation, the thinkers behind the Whisp), `worlds` (portals, parallel worlds), `method` (how a solo developer runs an ecosystem), `engineering`. **Core origin material: rename and rearrange if necessary, never delete.** | Informs the bible, ADRs and specs; the bible cites it and never absorbs it. |
| `record--` | Design records and snapshots produced by a session — the design lives here, the obligations land in the owning specs. | — |
| `questions--` | The ecosystem open-questions (CQ) register: business, product and technical questions. Universe questions live in the bible's Open boxes and chapter 8; the register points at them. | Resolved questions move to the register's Resolved section; strategic direction → `../ecosystem/strategy/`; constitutional change → `VISION.md` / `MANIFESTO.md`. |
| `quotes--` | Quotes, sayings and lines kept for later — Whisp lines, breadcrumbs, seeds for seasons and episodes. Stored as they are, never analysed here. | Add at the end; never renumber. |

---

## bible-- — the Universe Bible

| File | What it covers |
|---|---|
| [`bible--fringeisland-universe.md`](bible--fringeisland-universe.md) | 1 Start here · 2 The worlds (the Ordinary World, the Shimmer, Nalome and Marath, the three reaches, time, the Void and the cord, anchoring and seeds, portals, the village, the Tree, the drips and the ball, the private home, the lines, gardening not guarding) · 3 The beings (the Whisp, Mara, the Shadow, the transfer, Mists and FIMs and the birth, NPCs) · 4 Growth (the three questions and the three perspectives, Live/Grow/Matter, the transfer, the zones, rest, the two ways of engaging, what the world may see of you, graduation, the research anchors) · 5 Story (felt stakes, respawn, seasons and episodes, who authors, the backdrop and where it lives, how the mythology is held, the older mythology, the first hour) · 6 Roles and governance · 7 Community and the founding moment · 8 Open questions, the index · 9 Glossary, the vocabulary authority |

The seven `canon--` files that preceded the bible were deleted at the switch-over on 2026-09-26; their content is the bible's, chapter by chapter (cosmology → 2; roles → 6; beings → 3; narrative → 5; growth and the privacy model → 4; the Kickstarter → 7). Git keeps them.

---

## discovery-- — the universe in the making

One file, three parts. Content here is not truth until it is baked into the bible.

| File | What it is | Status |
|---|---|---|
| [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md) | **Part 1 — where things stand:** the session log, the discovery backlog (topics awaiting a session that the bible does not already carry as an Open box), the sounding-board notes. **Part 2 — ideas on the table:** the ten portal types generated against the cosmology (2026-05-28) and the Gimbal's origin, the ball as key and the three altered states (2026-07-24) — all ruled on in Session 05; the surviving ideas are Open boxes in the bible. **Part 3 — the sessions:** Stefan's statements verbatim, S001 onward, with Claude's held interpretations; Sessions 01–05 are the source the bible was written from. | Live — Part 1 is read by the dashboard; Part 3 is append-only |

---

## questions-- — the open-questions register

| File | What it is |
|---|---|
| [`questions--ecosystem-open-questions.md`](questions--ecosystem-open-questions.md) | Ecosystem-level open questions, CQ-numbered — blocking / active / parked / resolved. Bootstrapping, Dreamineer recruitment, Council governance, monetisation, the repository set-up for sensitive material, and more. Universe questions are carried in the bible's Open boxes; the register says which. |

---

## quotes-- — kept for later

| File | What it is |
|---|---|
| [`quotes--collection.md`](quotes--collection.md) | Quotes, sayings and lines Stefan wants to keep for later — Whisp lines, breadcrumbs, seeds for seasons and episodes. Stored as they are, numbered Q001 onward; any analysis happens in a discovery session that links back here. |

---

## research-- — reports and studies

Any document that answers "what did we learn from studying something?" Research informs decisions across ecosystem, architecture, and planning — but the research itself lives here regardless of which area it feeds. **Research and the Whisp's wisdom are core origin material: rename and rearrange if necessary, never delete.** Research never becomes truth: it feeds a discovery session, and what Stefan states there is what is baked into the bible; the bible cites the report.

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

The `worlds` reports are the external cross-media surveys that fed the discovery work — see Candidate A in Part 2 of [`discovery--the-universe-in-the-making.md`](discovery--the-universe-in-the-making.md) and the portal types held open in the bible's worlds chapter.

---

## record-- — design records

Cross-cutting design records produced by joint-design spikes — the design lives here; the obligations land in the owning specs.

| File | What it is |
|---|---|
| [`record--breach-response-gdpr-art-33-34.md`](record--breach-response-gdpr-art-33-34.md) | Breach-response design (GDPR Art. 33/34) across all five verticals — detect → assess → clock → notify authority → notify members → record |
| [`record--universe-to-spec-manifestation.md`](record--universe-to-spec-manifestation.md) | Snapshot map of how the universe's concepts are (or aren't) realised as capabilities in the entity specifications, and since the 2026-09-17 re-run whether a shipped feature has built them; what changed since June; prioritised gaps. Written against the canon files; its next run is against the bible |
| [`record--universe-bible-plan.md`](record--universe-bible-plan.md) | The plan the bible was built to — its goal, Stefan's decisions, the shape, the phases and the rules. Kept until the plan's last phases (the switch-over, then prioritising the open questions) are closed. The two Phase 2 working records (the rulings list and the chapter maps) were deleted at the switch-over; git keeps them |

---

*Flattened on 2026-09-15 (TASK-UNI-02) from the former `ecosystem/universe/`, `ecosystem/thinking/` and `research/` trees; condensed on 2026-09-16 (TASK-UNI-04, TASK-UNI-05) to one file per topic; the canon files replaced by the one Universe Bible on 2026-09-26. This folder is the creative heart of the ecosystem documentation. It grows as the universe is defined — through sessions, through community input, and through the work of Dreamineers who haven't arrived yet.*
