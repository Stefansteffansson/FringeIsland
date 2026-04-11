# Platform Domain Services

The seven FringeIsland-specific modules that sit on top of Platform Core. Each is independently modular and extensible.

**Feature ID prefix:** `PD`

## The seven services

- **DS-1 World Model** (`world-model.md`) — Universe, Three Worlds, Whisp, lore
- **DS-2 Narrative Engine** (`narrative-engine.md`) — Seasons, episodes, story beats
- **DS-3 Experience Engine** (`experience-engine.md`) — Journeys, steps, progress, enrolments
- **DS-4 Content** (`content.md`) — Media, assets, narrative blocks
- **DS-5 Communication** (`communication.md`) — DM, forums, activity feeds
- **DS-6 Discovery** (`discovery.md`) — Search, recommendations, marketplace
- **DS-7 Intelligence** (`intelligence.md`) — AI mentor, profile accumulation

## Extension System

The **Extension System** sits within the Platform Domain layer. It defines the contracts that allow new step types, group types, role types, and content types to be added without modifying Platform Core. See `../extensions/`.

## Dependencies

For the dependency graph between domain services, see `../../planning/reference/DOMAIN_SERVICE_DEPENDENCIES.svg`.

## Files

- One markdown file per service (above), plus `SPECIFICATION.md` (overview) and `ROADMAP.md` _(both to be written)_
- `features/` — feature specs using `FEAT-PD*` IDs
- Template for each service: `../../templates/domain-service-spec.md`
