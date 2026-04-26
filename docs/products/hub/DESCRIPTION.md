# The Hub — Description

**Status:** Active
**Type:** Product (web)
**Path:** `docs/products/hub/`

---

## Identity

The Hub is FringeIsland's web platform — the primary surface where FIMs arrive, orient, connect, and experience journeys. It is the Safe Harbour made tangible: a browser-based environment where members manage their identity, belong to groups, and engage with structured developmental experiences.

The Hub is where you land. It is not where you author.

---

## Target users

**Visitors** — people who haven't signed up yet. Visitors can browse, explore, and begin participating before creating an account. Their activity and preferences accumulate via anonymous sessions (ADR-U004) and transfer seamlessly into a full member account upon sign-up. The transition from visitor to member is a soft threshold, not a wall.

**FIMs (FringeIsland Members)** — anyone 18 or older with an account. Under-18s are outside scope for legal reasons. FIMs interact with the Hub through roles granted by group membership:

- **Members** — the default. Browse, enroll, experience journeys, participate in forums, exchange messages (1-1 and 1-many), keep a personal Journal, and track progress.
- **Stewards** — group leaders. Invite members, assign roles, enroll groups in journeys, moderate.
- **Dreamineers** — the contributor community. Dreamineers create and maintain journeys, seasons and episodes (arcs), universe content, and other contributions across the ecosystem. Their authoring tools live in the Studios. The Hub is their home as FIMs and supports their cross-ecosystem community participation.
- **DeusEx** — platform administrators. Manage members, groups, roles, permissions, and journeys at the platform level. Essential for lifecycle management, threat response, and data hygiene.

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
- Provide world-building or universe management tools (→ Studios: Universe Studio)
- Offer native mobile experiences requiring device capabilities like GPS, camera, AR (→ The Gimbal)
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

**Siblings:**
- The Gimbal (mobile) — shares the same Platform API; the Hub handles what doesn't require native device capabilities
- The Game (placeholder) — future product surface, scope TBD

**Does not consume (yet):**
- Domain Services — World Model (future: Whisp presence, Three Worlds atmosphere)
- Domain Services — Narrative Engine (future: seasons and episodes)
- Domain Services — Discovery (future: search, recommendations)
- Domain Services — Intelligence (future: AI mentor, profile accumulation)

**Does not consume (by design):**
- Domain Services — Extension System (meta-module for runtime extension; not a product-surface concern)

---

*For technical state and feature inventory, see [SPECIFICATION.md](./SPECIFICATION.md) (when written).*
*For the product roadmap, see [ROADMAP.md](./ROADMAP.md) (when written).*
*For feature specs, see [features/](./features/).*
