# Platform Domain Services

The seven FringeIsland-specific modules that sit on top of Platform Core. Each is independently modular and extensible.

**Feature ID prefix:** `PD`

## The seven services

- **DS-1 World Model** (`world-model.md`) — Universe, the worlds topology (the Ordinary World, the Shimmer, the Fringe's two places — each with a near side and a Beyond — and the Void; ground truth: [`../../ecosystem/universe/cosmology/README.md`](../../ecosystem/universe/cosmology/README.md), which supersedes the retired "Three Worlds" model), the Tree/balls/branches, seeds/anchors/cord state, the tendable world, private homes, the Whisp's **world-presence** face (Void distance, cord state, severance — per the Whisp-split decision, `../../architecture/decisions/PENDING.md`), lore
- **DS-2 Narrative** (`narrative.md`) — Seasons and episodes on the universal calendar, plot structure (arcs, story beats), respawn topologies and loop textures with in-story return shapes (home base, episode-repeat), what persists across a loop, and the Teller-authored NPC character layer (ground truth: [`../../ecosystem/universe/narrative/README.md`](../../ecosystem/universe/narrative/README.md); renamed from "Narrative Engine" per the Engine-suffix decision in [`../../architecture/decisions/PENDING.md`](../../architecture/decisions/PENDING.md))
- **DS-3 Journeys** (`journeys.md`) — Journeys as content templates (route types, required equipment declared at authoring, depth settings — the Game is a depth, ADR-U025), steps (kinds data-driven, ADR-U008), enrolments (groups enrol, ADR-U017/U020) and per-traveller progress, **respawn delivery** and loop runtime (composing DS-1 position resolution with DS-2 loop declarations), Shadow-to-FIM transcendence continuity, and signature-vs-charter personalisation with per-FIM pacing (ground truth: [`../../ecosystem/universe/personal-growth/README.md`](../../ecosystem/universe/personal-growth/README.md) + the narrative core; renamed from "Experience Engine" per the rename decision in [`../../architecture/decisions/PENDING.md`](../../architecture/decisions/PENDING.md))
- **DS-4 Content** (`content.md`) — Media and assets (3D models, images, audio, captured scans — kinds data-driven) with renditions/variants served by equipment and depth, narrative content blocks (the renderable units DS-2 beats and DS-3 steps reference opaquely by ID), the **Gimbal-capture → Hub-refine pipeline state** (ADR-U025's proof case — the surfaces operate the pipeline, DS-4 owns its state), the content authoring write-path (reached from within each studio's own mode plus personal-scope capture — no fourth studio, ADR-U026), rendering contracts (content-kind registries as the extension surface), content retirement cascades (ADR-U016), and Shadow-capture ephemerality (ADR-U027) (ground truth: ADR-U025 + the 2026-06-05 product locks in [`../../ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`](../../ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md); the narrative core for the block boundary)
- **DS-5 Communication** (`communication.md`) — DM, forums, activity feeds
- **DS-6 Discovery** (`discovery.md`) — Search, recommendations, marketplace
- **DS-7 Intelligence** (`intelligence.md`) — the Whisp **as a being** (dialogue, empty-fills-by-growth, the senses model, the internalisation arc, guard railing — per the Whisp-split decision, `../../architecture/decisions/PENDING.md`), profile accumulation

## Extension System

The **Extension System** sits within the Platform Domain layer. It defines the contracts that allow new step types, group types, role types, and content types to be added without modifying Platform Core. See `../extensions/`.

## Dependencies

For the dependency graph between domain services, see `../../architecture/DOMAIN_SERVICE_DEPENDENCIES.svg`.

## Files

- One markdown file per service (above), plus `SPECIFICATION.md` (overview) and `ROADMAP.md` _(both to be written)_
- `features/` — feature specs using `FEAT-PD*` IDs
- Template for each service: `../../templates/domain-service-spec.md`
