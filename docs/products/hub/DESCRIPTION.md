# The Hub — Description

**Status:** Active
**Type:** Product (equipment profile — the canvas surface; ships today as the web app)
**Path:** `docs/products/hub/`

---

## Identity

The Hub is **the canvas surface** of the one FringeIsland experience (ADR-U025) — the equipment profile built on screen room, keyboard, precision input, and file system, shipping today as the web app. It is the primary surface where FIMs arrive, orient, connect, and experience journeys: a browser-based environment where FIMs manage their identity, belong to groups, and engage with structured developmental experiences. It serves the same one experience as the Gimbal; what differs is equipment, not audience. (Where FIMs rest and gather in world-language is the village, in the Beyond of the warm place — see the cosmology core, [`docs/ecosystem/universe/cosmology/README.md`](../../ecosystem/universe/cosmology/README.md).)

The Hub is where you land. It is not where you author.

---

## Target users

The canonical role taxonomy lives in [`docs/ecosystem/universe/roles/README.md`](../../ecosystem/universe/roles/README.md) — this section names who the Hub serves; the roles core defines them.

**Shadows** — the anonymous entrants (the identity state before transcendence). Shadows can browse, explore, and begin participating before creating an account. Their activity and preferences accumulate via anonymous sessions (ADR-U004) and transfer seamlessly into a FIM account upon sign-up. The Shadow-to-FIM transition is a soft threshold, not a wall.

**FIMs (FringeIsland Members)** — anyone 18 or older with an account; the base identity. Under-18s are outside scope for legal reasons. Every FIM can browse, enroll, experience journeys, participate in forums, exchange messages (1-1 and 1-many), keep a personal Journal, and track progress. Within a given group, a FIM wears a per-group role:

- **Stewards** — lead and care for a group. Invite participants, assign roles, enroll groups in journeys, moderate.
- **Guides** — facilitate a joint journey.
- **Participants** — take part (the default per-group role).
- **Observers** — watch.

**Dreamineers** — FIMs in their authorial mode, creating and maintaining journeys, arcs, worlds, and other contributions across the ecosystem. Their authoring tools live in the Studios. The Hub is their home as FIMs and supports their cross-ecosystem community participation.

**The enterprise plane** — Universeers, the Council, and **DeusEx** (the root-admin group of the running platform: members, groups, roles, permissions, and journeys at the platform level; lifecycle management, threat response, data hygiene). Universe-scoped governance happens on the Console; community-scoped care stays woven into the Hub experience.

---

## Core experience

Using the Hub feels like arriving at a harbour. You know where things are. You can see who's here. You can choose where to go next — a journey, a conversation, your own profile — without being pushed.

The interface is calm, not gamified. Progress is visible but not competitive. Groups are the primary social container — you belong to groups, and through groups you encounter journeys, forums, and each other.

The Hub supports all three dimensions of growth: solo work (individual journeys, personal reflection), relational exchange (direct messages, pair activities), and collective experience (group journeys, forums, shared milestones).

The emotional register is: safe, oriented, purposeful.

---

## Boundaries

The Hub intentionally does **not**:

- Provide journey authoring, deployment, or lifecycle management tools (→ Studios: Journey Studio, Arc Studio)
- Provide world-building or universe management tools (→ Studios: World Studio, under Universe Studio)
- Offer experiences requiring `sensors` equipment — GPS, camera, LiDAR, mic, AR (→ The Gimbal, the senses surface; placement is by equipment, never by device — ADR-U025)
- Access the database directly — all data flows through the Platform API (ADR-U009)
- Implement its own permission logic — permissions are resolved by Platform Core (Organisation)
- Handle payments, subscriptions, or marketplace transactions (→ Platform: Transactions vertical)
- Surface developmental frameworks or theories explicitly — development is implicit, per VISION.md
- Serve users under 18 years of age

---

## Relationship to ecosystem

**Consumes:**
- Platform Core — Identity (auth, profiles, sessions, personal Journal)
- Platform Core — Organisation (groups, memberships, roles, permissions)
- Domain Services — Experience Engine (journey enrollment, progress, content delivery)
- Domain Services — Content (media, assets, narrative blocks)
- Domain Services — Communication (forums, direct messaging, activity feeds)
- Design System (shared components, visual language)

**Sibling:**
- The Gimbal (the senses surface) — shares the same Platform API and serves the same one experience; the Hub carries the features keyed to canvas equipment, the Gimbal those keyed to `sensors`. (The Game is not a product — it is a depth setting of journeys; ADR-U025.)

**Does not consume (yet):**
- Domain Services — World Model (future: Whisp presence, the worlds' atmosphere — see the cosmology core)
- Domain Services — Narrative Engine (future: seasons and episodes)
- Domain Services — Discovery (future: search, recommendations)
- Domain Services — Intelligence (future: AI mentor, profile accumulation)

**Does not consume (by design):**
- Domain Services — Extension System (meta-module for runtime extension; not a product-surface concern)

---

*For technical state and feature inventory, see [SPECIFICATION.md](./SPECIFICATION.md) (when written).*
*For the product roadmap, see [ROADMAP.md](./ROADMAP.md) (when written).*
*For feature specs, see [features/](./features/).*
