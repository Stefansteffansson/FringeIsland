# Platform Domain Services

The seven FringeIsland-specific modules that sit on top of Platform Core. Each is independently modular and extensible.

**Feature ID prefix:** `PD`

## The seven services

- **DS-1 World Model** (`world-model.md`) — Universe, the worlds topology (the Ordinary World, the Shimmer, the Fringe's two places — each with a near side and a Beyond — and the Void; ground truth: [`../../ecosystem/universe/cosmology/README.md`](../../ecosystem/universe/cosmology/README.md), which supersedes the retired "Three Worlds" model), the Tree/balls/branches, seeds/anchors/cord state, the tendable world, private homes, the Whisp's **world-presence** face (Void distance, cord state, severance — per the Whisp-split decision, `../../architecture/decisions/PENDING.md`), lore
- **DS-2 Narrative** (`narrative.md`) — Seasons and episodes on the universal calendar, plot structure (arcs, story beats), respawn topologies and loop textures with in-story return shapes (home base, episode-repeat), what persists across a loop, and the Teller-authored NPC character layer (ground truth: [`../../ecosystem/universe/narrative/README.md`](../../ecosystem/universe/narrative/README.md); renamed from "Narrative Engine" per the Engine-suffix decision in [`../../architecture/decisions/PENDING.md`](../../architecture/decisions/PENDING.md))
- **DS-3 Experience Engine** (`experience-engine.md`) — Journeys, steps, progress, enrolments
- **DS-4 Content** (`content.md`) — Media, assets, narrative blocks
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
