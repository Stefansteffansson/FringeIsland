# FringeIsland — Architecture Anatomy (living overview)

**Status:** Living, derived overview — **canon wins.**
**Reflects decisions through:** [ADR-U048 Amendment 1](decisions/ADR-U048-notifications-vertical-delivery-substrate.md) + [ADR-U051 Amendment 1](decisions/ADR-U051-actionable-notification-typed-response-framework.md) (2026-07-31, the COR-C W4 rulings, Audit III R-5 + AC3-11) — U048A1 legitimises DS-5's substrate-mounted routing enforcement (the preference-suppression write edge; the DS-5 row below carries the clause), U051A1 scopes the typed-response claim to the framework with **no other anatomy impact** (no tier, service, core, ownership split, or contract boundary moves). Substantively the anatomy reflects [ADR-U050](decisions/ADR-U050-account-lifecycle-state-machine.md) (**absorbed 2026-07-26**, at the A-NTF area gate — the four-state account lifecycle is carried on the PC-2 Identity row) and, before it, [ADR-U049](decisions/ADR-U049-announcements-durable-home-routed-delivery.md) (2026-07-20).
**Diagram companion:** [`ECOSYSTEM_ANATOMY_V6.svg`](ECOSYSTEM_ANATOMY_V6.svg) (v2.5) — the same anatomy as a one-page visual. Doc and diagram move together, but they are not always at the same depth: the diagram reflects ADR-U049 (and carries U047 in its `<desc>`), and was **reviewed for ADR-U050 on 2026-07-26 with no diagram impact** — the four account-lifecycle states are internal to PC-2 Identity and move no tier, service, core, or boundary the visual draws. The prose above therefore carries U050 where the diagram does not need to.

> **How this document works.** This is the one-stop prose overview of what the FringeIsland ecosystem is made of and how the parts relate. It is **derived, not authoritative**: every section names its ground truth (an ADR, a canonical core under `docs/ecosystem/universe/`, or a tier README), and on any conflict the pointed-at source wins. It is kept fresh by the doc-health-check skill's anatomy-freshness section: the "Reflects decisions through" stamp above is checked against the ADR index at every cycle boundary. Predecessor: [`ARCHITECTURE_ANATOMY_V1.md`](ARCHITECTURE_ANATOMY_V1.md) (the original L0–L7 layered anatomy — frozen historical reference, superseded by ADR-U023).

---

## The anatomy at a glance

From top to bottom (matching the diagram):

1. **Design System band** — visual language, components, world aesthetic, i18n, a11y.
2. **Products and studios** — the Hub and the Gimbal as **equipment profiles** (ADR-U025), plus **Universe Studio** as the parent of World, Arc, and Journey Studios (ADR-U026); Dreamineers use the studios' authoring modes.
3. **Platform API ring** — the contract boundary every surface consumes (ADR-U009, ADR-U038).
4. **Domain Services** — seven FringeIsland-specific services (DS-1..DS-7) plus the Extension System (ADR-U023). The iteration zone: modular, extensible.
5. **Internal API** — the domain-to-core contract boundary; core reaches upward only through domain-owned lifecycle-fact hooks (ADR-U047).
6. **Platform Core** — four domain-agnostic areas (PC-1..PC-4) (ADR-U023). The stability zone: stability over speed.
7. **Five verticals** threading the full stack as obligations on every tier (ADR-U002).

---

## Products — equipment profiles (ADR-U025)

Products are **equipment profiles**, not silos:

- **The Hub** — the canvas surface. → [`docs/products/hub/`](../products/hub/)
- **The Gimbal** — the senses surface. → [`docs/products/gimbal/`](../products/gimbal/)
- **The Game is a depth setting of journeys, not a product** (ADR-U025). Journeys declare required equipment and depth at authoring (DS-3).

Ground truth: [ADR-U025](decisions/ADR-U025-products-as-equipment-profiles.md) · [`docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md`](../ecosystem/strategy/PRODUCTS_AND_PLATFORM.md).

## Studios (ADR-U026)

**Universe Studio** is the parent; **World Studio**, **Arc Studio**, and **Journey Studio** are its children. There is no fourth (content) studio — content authoring is reached from within each studio's own mode plus personal-scope capture. Studios write to their domain services.

Ground truth: [ADR-U026](decisions/ADR-U026-studio-decomposition-universe-studio-parent.md) · [`docs/studios/`](../studios/).

## The Platform API ring (ADR-U009 · ADR-U038)

- **API-first** (ADR-U009): every feature is built as if every other client surface already exists — `Database → API route → Frontend component`, never database-to-frontend directly.
- **Platform contracts live platform-side** (ADR-U038): the binding rules are enforced below the Platform API — as PostgREST RPC, RLS, triggers, and grants. `/api/v1` + Bearer bind the platform surface. A product's `app/api/*` routes are **private BFF plumbing** — never the sole home of a rule.

Ground truth: [ADR-U009](decisions/ADR-U009-api-first-frontend-agnostic.md) · [ADR-U038](decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md).

## Domain Services (ADR-U023)

Seven services, FringeIsland-specific, each owning its own data. Charters in full: [`docs/platform/domain/README.md`](../platform/domain/README.md) (canonical one-liners) and each service's own file.

| Service | Owns (compressed — the domain README is the canonical charter) |
|---------|----------------------------------------------------------------|
| **DS-1 World Model** | Universe and worlds topology (ground truth: the [cosmology core](../ecosystem/universe/cosmology/README.md)), the tendable world, seeds/anchors/cord state, the Whisp's **world-presence** face (ADR-U029), lore |
| **DS-2 Narrative** | Seasons and episodes, plot structure (arcs, beats), respawn topologies and loop textures, the NPC character layer (ground truth: the [narrative core](../ecosystem/universe/narrative/README.md)) |
| **DS-3 Journeys** | Journeys as content templates (equipment + depth declared at authoring), steps, enrolments and per-traveller progress, respawn delivery and loop runtime, Mist-to-FIM transcendence continuity |
| **DS-4 Content** | Media and assets with equipment/depth renditions, narrative content blocks, the Gimbal-capture → Hub-refine pipeline state, rendering contracts, retirement cascades, Mist-capture ephemerality |
| **DS-5 Communication** | DMs, group forums, activity feeds (ambient — no rankings), the durable announcements home routed onto the delivery substrate (ADR-U049), notification routing above the vertical delivery substrate — enforced, where central and non-bypassable, at the substrate's write edge (ADR-U048 + Amendment 1), journey-scoped social surfaces, communication lifecycle cascades |
| **DS-6 Discovery** | Search over the published world, affinity-shaped recommendations inside the anti-leaderboard guardrails, the marketplace surface |
| **DS-7 Intelligence** | The Whisp **as a being** (ADR-U029; rails always human-authored, per [`PRINCIPLES-AI.md`](../ecosystem/PRINCIPLES-AI.md)), consent-gated profile accumulation, the personal Journal store |

**The Whisp is split by face** ([ADR-U029](decisions/ADR-U029-whisp-ownership-split-by-face.md)): DS-1 owns world-presence (cord, severance, respawn position); DS-7 owns the being (dialogue, growth-driven filling, maturity). The entity stays canonical in the beings core; neither service owns "the Whisp" outright. DS-7 consumes DS-1, never the reverse.

**Extension System:** step types, content renderers, AI providers, integrations, plugin registry — the surface that keeps the domain extensible.

**Dependency direction inside Domain is acyclic and explicit** — DS-1 at the bottom, DS-7 at the top; nothing depends on DS-7. Visual: [`DOMAIN_SERVICE_DEPENDENCIES.svg`](DOMAIN_SERVICE_DEPENDENCIES.svg).

## Platform Core (ADR-U023)

Four domain-agnostic areas. Specs: [`docs/platform/core/`](../platform/core/README.md).

- **PC-1 Infrastructure** — Supabase, PostgreSQL, RLS, Storage, feature flags.
- **PC-2 Identity** — authentication, sessions, profiles, the `user_id` contract, the **Mist lifecycle** ([ADR-U031](decisions/ADR-U031-mist-identity-lifecycle.md) — the anonymous entrant is the **Mist**; "Shadow" names the place-3 menace), and the **account lifecycle state machine** ([ADR-U050](decisions/ADR-U050-account-lifecycle-state-machine.md)): four states — `active`, `paused`, `suspended`, `decommissioned` — derived from the existing booleans plus `deactivation_origin`, which is what makes a member's own step-away distinguishable from an admin hold. The split is the ownership line that matters here: **a member may return their own `paused` account to active and may never escape a `suspended` one**, `decommissioned` is terminal for everybody, and an off row of unknown origin always reads `suspended`. Self-service transitions are own-row `SECURITY DEFINER` contracts; admin holds remain PC-4 Governance's (ADR-U028).
- **PC-3 Organisation** — groups, memberships, roles, permissions.
- **PC-4 Governance** — **governance by scope** ([ADR-U028](decisions/ADR-U028-governance-by-scope.md)), the Console, DeusEx, audit, moderation, platform rules.

Platform Core is the stability zone; changes here carry the strictest review (see [`docs/platform/CLAUDE.md`](../platform/CLAUDE.md) and the core sub-tier rules).

## Identity states and roles

The canonical identity states and role taxonomy — **Mist**, **FIM**, the per-group roles **Steward / Guide / Participant / Observer**, and the Dreamineer specialisations — live in the roles core: [`docs/ecosystem/universe/roles/`](../ecosystem/universe/roles/README.md). The worlds they move through live in the cosmology core: [`docs/ecosystem/universe/cosmology/`](../ecosystem/universe/cosmology/README.md).

## The five verticals (ADR-U002)

**Administration · Privacy/GDPR · Notifications · Observability · Transactions.** Verticals are not services — they are cross-cutting **obligations** that every platform service, product, studio, and design-system component must fulfil. Every feature spec carries a mandatory Vertical Impact section. The Notifications vertical's delivery substrate (`public.notifications`) is platform-side, written by every tier as obligation-fulfilment; DS-5 owns routing above it (ADR-U048). How each vertical applies at a given tier is described in that tier's `CLAUDE.md`.

Ground truth: [ADR-U002](decisions/ADR-U002-five-cross-cutting-verticals.md) · [`docs/verticals/`](../verticals/).

## Design system

The visual language, component library, world aesthetic, i18n, and a11y that make every surface feel like the same world. → [`docs/design-system/`](../design-system/)

---

## How this document stays fresh

1. **The stamp is the contract.** "Reflects decisions through: ADR-U0XX" at the top. Any pass that updates this document (or the diagram) to absorb newer decisions moves the stamp; a review that finds no anatomy impact still moves the stamp and says so.
2. **doc-health-check enforces it** (anatomy-freshness section): stamp vs the ADR index; retired-vocabulary grep over this file and the current diagram; pointer integrity (root `CLAUDE.md`, `PROCESS.md`, the architecture README, and ADR "current visual" pointers must resolve to the living doc and the current diagram version).
3. **Snapshots stay frozen.** `ARCHITECTURE_ANATOMY_V1.md` and superseded `ECOSYSTEM_ANATOMY_V*` diagrams are historical records — bannered/watermarked, never edited in body.

## Related documents

| Document | Purpose |
|----------|---------|
| [`decisions/`](decisions/) | The ADRs — why each architectural decision was made (index: [`decisions/README.md`](decisions/README.md)) |
| [`DOMAIN_ENTITIES.md`](DOMAIN_ENTITIES.md) | Core domain model — entities, relationships, business rules |
| [`ECOSYSTEM_ANATOMY_V6.svg`](ECOSYSTEM_ANATOMY_V6.svg) | The current one-page visual of this anatomy |
| [`ARCHITECTURE_ANATOMY_V1.md`](ARCHITECTURE_ANATOMY_V1.md) | The original L0–L7 anatomy — frozen historical reference |
| [`../ecosystem/VISION.md`](../ecosystem/VISION.md) | The north star — why FringeIsland exists |
| [`../planning/PROCESS.md`](../planning/PROCESS.md) | How work flows — the way of working |
