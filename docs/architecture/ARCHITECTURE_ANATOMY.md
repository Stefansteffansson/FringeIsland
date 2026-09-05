# FringeIsland — Architecture Anatomy (living overview)

**Status:** Living, derived overview — **canon wins.**
**Reflects decisions through:** [ADR-U047 Amendment 4](decisions/ADR-U047-internal-api-lifecycle-facts.md) + **the retention rule** (2026-09-05) (**reviewed 2026-09-05, Cycle COR-E W1, Audit V AC5-5** — A4 widens rule 7's member-scoped and group-closed freeze shapes to `paused` enrolments: DS-3-internal, **no anatomy impact**; the retention rule lands on the PC-1 row below as a gated obligation of the scheduled-job substrate: no tier, service, core, or boundary moves, no diagram impact. [ADR-U053](decisions/ADR-U053-test-tier-off-the-production-database.md) is **Proposed** and not absorbed — when accepted it changes where the test tier runs, not what the anatomy is made of). Prior: [ADR-U047 Amendment 3](decisions/ADR-U047-internal-api-lifecycle-facts.md) (**absorbed 2026-08-11, Cycle COR-D** — rule 3 gains the declared-composition class: a core wrapper fulfilling a vertical obligation may call a sealed DS-owned body under per-pair manifest declaration, mutation only as the obligation itself; the ownership manifest becomes the single living registry of Internal-API contract instances, and the W3 conformance family enforces the invocation axis. No tier, service, core, or boundary moves — no diagram impact beyond the independent v2.7 refresh). Prior: [ADR-U052](decisions/ADR-U052-telemetry-sink-and-analytics-posture.md) + [ADR-U051 Amendment 2](decisions/ADR-U051-actionable-notification-typed-response-framework.md) (**absorbed 2026-08-10, at the AB-6 full anatomy audit**) — U052 lands the durable telemetry sink on the PC-1 row (`public.telemetry_events`, PC-1-owned; 90-day retention, computed-on-read aggregates) and narrows the `admin_audit_log` Art. 15 export split carried on the PC-4 row; U051A2 brings the personal-invitation path into the typed-response framework with **no other anatomy impact** (a thin dispatch wrapper over untouched Core contracts plus an ADR-U048-classified convergence trigger — no tier, service, core, ownership split, or contract boundary moves). Prior stamp: ADR-U048 A1 + ADR-U051 A1 (2026-07-31). Substantively the anatomy still reflects [ADR-U050](decisions/ADR-U050-account-lifecycle-state-machine.md) (**absorbed 2026-07-26** — the four-state account lifecycle is carried on the PC-2 Identity row) and, before it, [ADR-U049](decisions/ADR-U049-announcements-durable-home-routed-delivery.md) (2026-07-20).
**Diagram companion:** [`ECOSYSTEM_ANATOMY_V6.svg`](ECOSYSTEM_ANATOMY_V6.svg) (v2.7) — the same anatomy as a one-page visual. Doc and diagram move together, but they are not always at the same depth: earlier reviews found no diagram impact for U050 (2026-07-26) and U048A1 + U051A1 (2026-07-31) — internal-state and framework-scope changes move no tier, service, core, or boundary the visual draws. **Reviewed for ADR-U052 + ADR-U051 Amendment 2 on 2026-08-10 (AB-6 audit) WITH diagram impact from U052:** the PC-1 box advertised feature flags — which ADM-15 established have zero substrate and zero reading code — and lacked the telemetry sink; v2.6 swaps the box text (feature flags out, telemetry sink in) and records the refresh in the `<desc>` and caption. U051A2 has no diagram impact (framework-internal). **Refreshed to v2.7 at Audit IV (Cycle COR-D W7, 2026-08-11):** the same zero-substrate test that evicted feature flags also fails `email` (the channel is seeded non-delivering — "abstraction-only in Ferd"), so the PC-1 box sheds it; `Storage` stays (real Supabase substrate underneath, decision board row 6). No tier, service, core, or boundary moves. **Reviewed for ADR-U047 Amendment 4 + the retention rule on 2026-09-05 (COR-E W1): no diagram impact** — the PC-1 box already names pg_cron; the bound-per-table rule is a property of that substrate, not a new box. The diagram stays at v2.7.

> **How this document works.** This is the one-stop prose overview of what the FringeIsland ecosystem is made of and how the parts relate. It is **derived, not authoritative**: every section names its ground truth (an ADR, a canonical core under `docs/ecosystem/universe/`, or a tier README), and on any conflict the pointed-at source wins. It is kept fresh by the doc-health-check skill's anatomy-freshness section: the "Reflects decisions through" stamp above is checked against the ADR index at every cycle boundary. Predecessor: [`ARCHITECTURE_ANATOMY_V1.md`](ARCHITECTURE_ANATOMY_V1.md) (the original L0–L7 layered anatomy — frozen historical reference, superseded by ADR-U023).

---

## The anatomy at a glance

From top to bottom (matching the diagram):

1. **Design System band** — visual language, components, world aesthetic, i18n, a11y.
2. **Products and studios** — the Hub and the Gimbal as **equipment profiles** (ADR-U025), plus **Universe Studio** as the parent of World, Arc, and Journey Studios (ADR-U026); Dreamineers use the studios' authoring modes.
3. **Platform API ring** — the contract boundary every surface consumes (ADR-U009, ADR-U038).
4. **Domain Services** — seven FringeIsland-specific services (DS-1..DS-7) plus the Extension System (ADR-U023). The iteration zone: modular, extensible.
5. **Internal API** — the domain-to-core contract boundary; core reaches upward only through domain-owned lifecycle-fact hooks and manifest-declared compositions (ADR-U047 + A2/A3; the manifest is the living registry of both).
6. **Platform Core** — four domain-agnostic areas (PC-1..PC-4) (ADR-U023). The stability zone: stability over speed.
7. **Five verticals** threading the full stack as obligations on every tier (ADR-U002).

---

## Products — equipment profiles (ADR-U025)

Products are **equipment profiles**, not silos:

- **The Hub** — the canvas surface. → [`docs/products/hub/`](../products/hub/)
- **The Gimbal** — the senses surface. → [`docs/products/gimbal/`](../products/gimbal/)
- **The Game is a depth setting of journeys, not a product** (ADR-U025). Journeys declare required equipment and depth at authoring (DS-3).

Repo note: the top-level `hub-legacy/` tree held the **frozen v1 oracle** ([ADR-U032](decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)) — read-only reference for the v2 rebuild, referenced by zero live code. It was **deleted at the Phase-4 cutover (2026-08-11)**, its guarantees discharged; it remains retrievable at the annotated tag `hub-legacy-final`.

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

**Extension System:** step types, content renderers, AI providers, integrations, plugin registry — the surface that keeps the domain extensible. **Chartered-future** (Audit IV ruling R-9, 2026-08-11): no Extension System entity exists in code yet — its early surface shipped as per-service open registries (`step_kinds` in DS-3, the notification registries in DS-5) plus Hub-side renderer maps; the box stays as charter, and the ownership manifest gains an Extension System owner token only when its first real substrate lands.

**Dependency direction inside Domain is acyclic and explicit** — DS-1 at the bottom, DS-7 at the top; nothing depends on DS-7. Visual: [`DOMAIN_SERVICE_DEPENDENCIES.svg`](DOMAIN_SERVICE_DEPENDENCIES.svg).

## Platform Core (ADR-U023)

Four domain-agnostic areas. Specs: [`docs/platform/core/`](../platform/core/README.md).

- **PC-1 Infrastructure** — Supabase, PostgreSQL, RLS, Storage, the scheduled-job substrate (pg_cron), and the **durable telemetry sink** ([ADR-U052](decisions/ADR-U052-telemetry-sink-and-analytics-posture.md)): `public.telemetry_events`, platform-owned — one fire-and-forget content-free `SECURITY DEFINER` recorder, deny-all RLS, 90-day scheduled prune, aggregates computed on read. **Retention is a gated rule of the scheduled-job substrate** (2026-09-05): every log-shaped table (`_log` / `_runs` / `_events` / `_history` / `_audit`) declares its bound in the ownership manifest's `retention` section — a pg_cron prune job with its window, or "forever" with a reason — and the manifest also names the job that prunes pg_cron's own run history and the weekly `VACUUM FULL` that stands as a declared stopgap while the test tier still shares this database ([ADR-U053](decisions/ADR-U053-test-tier-off-the-production-database.md), Proposed). `retention-conformance` fails red on an undeclared table or an unscheduled job. Feature flags are chartered here but **deferred with zero substrate** (ADM-15; activation no earlier than Phase-4 cutover planning).
- **PC-2 Identity** — authentication, sessions, profiles, the `user_id` contract, the **Mist lifecycle** ([ADR-U031](decisions/ADR-U031-mist-identity-lifecycle.md) — the anonymous entrant is the **Mist**; "Shadow" names the place-3 menace), and the **account lifecycle state machine** ([ADR-U050](decisions/ADR-U050-account-lifecycle-state-machine.md)): four states — `active`, `paused`, `suspended`, `decommissioned` — derived from the existing booleans plus `deactivation_origin`, which is what makes a member's own step-away distinguishable from an admin hold. The split is the ownership line that matters here: **a member may return their own `paused` account to active and may never escape a `suspended` one**, `decommissioned` is terminal for everybody, and an off row of unknown origin always reads `suspended`. Self-service transitions are own-row `SECURITY DEFINER` contracts; admin holds remain PC-4 Governance's (ADR-U028).
- **PC-3 Organisation** — groups, memberships, roles, permissions.
- **PC-4 Governance** — **governance by scope** ([ADR-U028](decisions/ADR-U028-governance-by-scope.md)), the Console (Ferd shape: Console-routed surfaces inside the Hub shell under its `admin` route segment — a plain path segment, not a Next.js `(group)`; Console-as-entity stays deferred — ADR-U025/U028), DeusEx, audit (the append-only `admin_audit_log` with its durable auth-event recorder and the narrowed Art. 15 export split, [ADR-U052](decisions/ADR-U052-telemetry-sink-and-analytics-posture.md) §6), moderation, platform rules, and the `admin_*` RPC contract family — canonically enumerated in [`supabase/ownership.manifest.json`](../../supabase/ownership.manifest.json) (PC-4 section), held complete by the gate-enforced mechanical rule `admin_*` -> PC-4.

**Platform-admin reach is total, by ruling** (ADR-U028 Amendment 2026-08-10, AB-6 ruling A1): `has_permission`'s Tier-1 arm is context-free — a permission held via a `group_type='system'` group satisfies **any** group's check, so platform admins pass every purely permission-gated door platform-wide, including in groups they never joined. Gate-pinned by a platform conformance test so the arm can neither silently vanish nor silently widen.

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
