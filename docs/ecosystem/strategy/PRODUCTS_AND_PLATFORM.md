# FringeIsland — Products & Platform Strategy
*Version 0.3 — updated 2026-06-10 (reconciliation Session B: equipment profiles, Game-as-depth per ADR-U025; cosmology naming per the canonical core)*
*Status: Living document — evolves as the ecosystem matures*

---

## A Note Before You Read

FringeIsland is not one product. It is a family of products — each one a different way of entering the same world. Some are digital. Some are physical. Some are experiences that happen in real life. Together they form an ecosystem that extends far beyond any single screen or device.

This document describes that family: what exists, what is coming, and the principles that guide how it all fits together.

The phases described here are not hard cuts. They are waves — each one beginning before the previous is complete, overlapping naturally, building on what came before. The ecosystem grows organically, not in rigid steps.

---

## Table of Contents

1. [The Guiding Metaphor — The Hero's Journey](#the-guiding-metaphor--the-heros-journey)
2. [Part One — Digital Surfaces](#part-one--digital-surfaces)
3. [Part Two — Physical Products](#part-two--physical-products)
4. [Part Three — Experiences & Events](#part-three--experiences--events)
5. [Part Four — The Web Platform in Detail](#part-four--the-web-platform-in-detail)
6. [Part Five — The Phase Model — Waves, Not Steps](#part-five--the-phase-model--waves-not-steps)
7. [Part Six — Device Strategy](#part-six--device-strategy)
8. [Part Seven — The Experimentation Layer](#part-seven--the-experimentation-layer)
9. [Principles](#principles)

---

## The Guiding Metaphor — The Hero's Journey

The evolution of the FringeIsland platform follows the arc of the Hero's Journey — the same arc that every member lives inside the world itself.

This is not a coincidence. It is the deepest possible alignment between the platform and its purpose: the platform's own story is the member's story.

*Departure → Passage → Harbour → Home → Edge → Fate*

Each product, each release, each phase is a step in that arc. The world is being built the same way members are invited to build themselves — one honest step at a time, in the right direction, open to what the journey reveals.

---

## Part One — Digital Surfaces

There is one FringeIsland experience over one shared core. Its digital surfaces are defined by **equipment profiles, not devices** (ADR-U025): a feature declares the equipment it requires and appears on any device that offers it.

### 1. The Hub — the canvas surface
The deep work home. Screen room, keyboard, precision input, file system. Where you go to reflect, build, create, and engage with the full depth of the FringeIsland experience — for members doing inner work and for Dreamineers building the world. Ships today as the web platform.

*Exists across all phases. Never retired.*

### 2. The Gimbal — the senses surface
The world in your pocket and in your hands. Camera, GPS, microphone, AR display, portability — perception and capture, out in the world. Episode notifications, quick journey activities, garden check-ins, community moments, and the AR layer: the Fringe's near side seen through the Shimmer, the world bleeding into physical reality through location, camera, and context. Ships as native mobile apps, designed to feel truly native — not a website wrapped in an app.

*The 18–29 primary audience expects native mobile from the start. No friction or they leave. The AR layer begins as experiments in later waves and deepens through subsequent ones.*

### 3. Depth — not a product
There is no Game product. Depth is a setting of journeys inside the one lived experience. **Revisit trigger (ADR-U025):** if a journey ever needs fidelity, an engine, or a play surface the mobile/web stack cannot render (AR glasses are a strong candidate spark), a game-engine runtime is built for that journey class — on a validated, thriving community, never before.

---

## Part Two — Physical Products

*This area is early and deliberately high-level. The specific products, production methods and marketplace mechanics will be defined as the community and Dreamineer ecosystem mature. What is captured here are the directions — not the details.*

### 1. World Artefacts
Physical representations of the FringeIsland world — 3D printed member homes, gardens, avatars, and world objects. The digital world made tangible. Designed and sold by Dreamineers through the marketplace.

Each artefact is a physical expression of a member's digital identity — something you can hold, display, gift. A bridge between the island and the real world.

### 2. Printed Materials
Journals, guidebooks, maps, narrative artefacts. Physical companions to the digital journey. Could include facilitator guides for Stewards, seasonal episode companions, or beautifully printed versions of member journeys.

### 3. Merchandise
Wearables, objects and items that carry the FringeIsland world into everyday life. Created by Dreamineers and sold through the marketplace. Always values-aligned — never purely commercial.

### 4. Physical Game Expressions
A board game, card game or other physical game format that brings elements of the FringeIsland world to the table. An expression of the world for people who prefer physical play. Details undefined — a future exploration.

---

## Part Three — Experiences & Events

*Events serve multiple functions simultaneously: revenue, community belonging, visibility, Dreamineer discovery and world celebration. They are not peripheral — they are a core part of the ecosystem.*

### 1. Online Seasonal Events
Digital events tied to the narrative seasons — episode launches, world celebrations, community milestones. Accessible to all members regardless of location. The heartbeat of the community calendar.

*Begins in Wave 3 (Hamn).*

### 2. Regional Gatherings
In-person community meetups organised by members and Dreamineers in their own regions. Informal, community-led, values-aligned. The 50+ demographic is a particular strength here — experienced community builders who bring warmth and depth to in-person gatherings.

*Begins organically as the community grows.*

### 3. Training Camps & Getaways
Immersive multi-day experiences — retreats, camps, getaways — where members go deeper into the FringeIsland journey together. Facilitated by Dreamineers. Combining the digital world with real-world presence.

*Details to be defined. A future exploration.*

### 4. The Annual FringeIsland Summit
The flagship annual event. Where the full community assembles — members, Dreamineers, the Council, the Universeers. The world is celebrated, the next season is launched, the community comes alive in physical space.

The Summit is not just an event — it is a founding ritual. It happens once a year and marks the passage of time in the FringeIsland world.

*Wave 4 (Heim) ambition. First edition to be planned when the community is ready.*

---

## Part Four — The Web Platform in Detail

The web platform evolves across six named waves. Each wave has a name that reflects the arc of the journey.

### Ferd — *Departure*
*The current web platform. Where the journey begins.*

Ferd is the departure point. A functional, proven web platform for individuals, teams and leaders to learn through journeys — alone or in groups, with Stewards guiding the experience. Built through vibe coding with AI, Ferd proves two things:

1. **That the builder can build** — the technical foundation is solid, the methodology works
2. **That the journey metaphor is real** — groups can travel together, roles function, the core experience lands

Ferd is not yet the full FringeIsland world. It does not have the avatar, the garden, the narrative, the three realms. But it is the seed from which everything grows. Every line of code written for Ferd is a foundation stone for what comes next.

*Tech stack: Next.js, TypeScript, Tailwind CSS, Supabase/PostgreSQL*

### Eid — *Passage, crossing*
*You navigate the passage.*

Journey Studio v.1 — user-created journeys, journey discovery & search, journey versioning, journey creation granularity. First Whisp specifications (encounter phenomenology, practical UI experience).

### Hamn — *Harbour*
*You find harbour.*

Design system, accessibility (WCAG 2.1 AA + enhancements), and UX/UI redesign of the generic web app interface. *Hamn does not define the worlds' visual identity — that is later, Urd-level work.*

### Heim — *Home*
*You arrive home.*

FringeIsland universe design — what the village and the warm place actually look like, regions, architecture, visual language (per the [cosmology core](../universe/cosmology/)). Dynamic journey paths (branching, conditional logic). Foundation for the cord/Void and AR layers in Brim.

### Brim — *Edge, surf, horizon*
*You stand at the edge, gazing outward.*

AR near-side visualization — the Fringe seen through the Shimmer at the member's real-world coordinates, with the cord and the Void rendered per the cosmology core. The Gimbal ships native on iOS and Android (the senses surface alongside the Hub).

### Urd — *Fate, origin, what has become*
*You touch something older than the journey itself.*

Worlds UI design (felt transitions across the Ordinary World, the Shimmer, the Fringe's places and reaches — per the cosmology core), Seasons and Episodes mechanics, NPC behaviour authoring, respawning mechanics, advanced analytics, monetization at scale, the Endowment — and, if the depth revisit trigger has fired (ADR-U025), the game-engine journey runtime. Beyond Urd: distribution of that runtime to consoles and VR/AR headsets.

---

## Part Five — The Phase Model — Waves, Not Steps

Phases overlap. Each wave begins building before the previous is complete. Nothing is ever fully retired — it evolves.

### Wave 1 — Ferd
*Prove the ground is solid.*

- Web platform (Ferd) — journey foundation, groups, Stewards, profiles
- Discord — temporary community scaffold
- Shadow experience — glimpse the island before arriving (anonymous, ephemeral; transcendence is the threshold)
- First Dreamineers recruited
- Free tier + first paid membership tier + voluntary donations

### Wave 2 — Eid (Passage, crossing)
### Wave 3 — Hamn (Harbour)
### Wave 4 — Heim (Home)
### Wave 5 — Brim (Edge, horizon)
### Beyond — Urd (Fate, origin)

*Wave redistribution from the old 2-wave model was completed on 2026-04-07. See the [2026-04-07 wave-redistribution session bridge](../../planning/sessions/2026-04-07-wave-redistribution.md) for the item-level redistribution decisions and [ADR-U022](../../architecture/decisions/ADR-U022-named-waves.md) for the naming rationale.*

---

## Part Six — Device Strategy

FringeIsland lives where its members are. The world is always the same — the way you enter it depends on the moment.

### By Device

**Smartphone — primary for 18–29**
The most important device for the primary audience. Everything must work seamlessly, instantly, with no friction. Native apps are non-negotiable for this group — a mobile website is not enough.

**Laptop/Desktop — primary for Dreamineers**
Deep work device. Content creation, world-building, journey design, narrative architecture. The web platform is the permanent professional tool for Dreamineers — rich, powerful, keyboard-first.

**Tablet — significant for 30+ and 50+**
iPad especially popular in older demographics. The web platform and native apps both need to work beautifully on tablet.

**Console — Beyond Urd, only if depth demands it**
PlayStation, Xbox, Nintendo Switch. If the depth revisit trigger fires (ADR-U025), the game-engine journey runtime reaches console audiences who may never have encountered FringeIsland through web or mobile.

**VR/AR Headsets — Beyond Urd**
Apple Vision Pro, Meta Quest and successors. Maximal senses equipment plus immersion — the strongest candidate spark for the depth trigger.

### A Member's Day
A member might move across products in a single day:
- *Morning* — iOS notification, new episode dropped
- *Commute* — quick journey activity on the phone
- *Evening* — deep reflection session on the web platform
- *Weekend* — an hour deep in a journey, far out on the cord in the Fringe
- *Once a year* — the Summit, in person, with the community

### A Dreamineer's Day
A Dreamineer might work across devices and products in a single day:
- *Phone* — quick community update, short narrative note, photo for world-building
- *Laptop* — episode design, journey architecture, deep creative work
- *Real life* — facilitating a regional gathering or training camp

---

## Part Seven — The Experimentation Layer

Throughout all phases, a lightweight experimentation layer runs in parallel. New ideas — features, narrative concepts, community mechanics, AR experiments, physical product concepts — are tested cheaply before being built properly.

Lower polish is acceptable here. The purpose is validation, not production. What works gets built properly. What doesn't gets set aside without cost.

This layer is never retired. It is how FringeIsland stays alive and curious.

---

## Principles

**The platform follows the vision — never the other way around.**
If the vision demands a different architecture or technology, the platform rebuilds around that.

**FringeIsland lives where its members are.**
The world is always the same. The way you enter it depends on the moment.

**Waves, not steps.**
Phases overlap and build on each other. Nothing is ever fully retired — it evolves.

**Native mobile is non-negotiable for the primary audience.**
The 18–29 demographic expects native apps. No friction or they leave.

**The web platform is the permanent Dreamineer hub.**
Deep work, content creation, world-building — the web platform serves this need across all phases.

**Physical products are world extensions, not merchandise.**
Every physical product should feel like a piece of the FringeIsland world — not a branded item. Values-aligned always.

**Events are community, not just revenue.**
Every event serves belonging, discovery and world celebration — not just the bottom line.

**The experimentation layer never stops.**
FringeIsland stays alive by testing ideas cheaply before building them properly.

**Depth is earned, not assumed.**
There is no Game product. A game-engine runtime is built only when a journey demands what the web/mobile stack cannot render (the ADR-U025 revisit trigger) — and on a validated, thriving community, not before.

---

*This document will be updated as the product family evolves. The six-wave arc (Ferd → Eid → Hamn → Heim → Brim → Urd) is defined in [ADR-U022](../../architecture/decisions/ADR-U022-named-waves.md). Non-software product details will be fleshed out in dedicated exploration sessions as the community matures.*
