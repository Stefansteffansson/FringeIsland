# Studios

Studios are a **role-gated authoring mode** inside the one FringeIsland experience — not products
([ADR-U026](../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md)).
Entering a studio is a permission check against the platform's own group/role mechanism (ADR-U006,
ADR-U007): each Dreamineer specialisation gates exactly one studio, and the same person moves
fluidly between the immersed and authorial stances. Studios still cover the **entire content
lifecycle** — design, deploy, manage, retire — not just authoring.

## The shape: one parent, three studios

**Universe Studio** is the parent entity. It is both the umbrella and the **binding frame**:
coherence across worldbuilding, narrative, and journeys is held at its level. It encapsulates
three sub-studios:

```
universe-studio/          <- parent: umbrella + binding frame (prefix US — umbrella-level features only)
|-- world-studio/         <- the world itself: physical + cultural substrate (prefix WS)
|-- arc-studio/           <- stories: seasons + episodes (prefix AS)
`-- journey-studio/       <- journeys: alone / pairs / group (prefix JS)
```

## Who may enter: the studio gates

Per the [roles core](../ecosystem/universe/roles/README.md):

| Dreamineer specialisation | Studio | Authors |
|---|---|---|
| **Creator** | [World Studio](./universe-studio/world-studio/) (hard side) | physical substrate: terrain, water, sky, portals, 3D models |
| **Anthropologist** | [World Studio](./universe-studio/world-studio/) (soft side) | cultural substrate: peoples, customs, beliefs, countries |
| **Teller** | [Arc Studio](./universe-studio/arc-studio/) | stories: seasons and episodes; the NPC character layer |
| **Wayfinder** | [Journey Studio](./universe-studio/journey-studio/) | journeys: alone / pairs / group |

World Studio access additionally tiers by **scope**: furnishing your own private home is open to
every FIM; authoring the shared world is Dreamineer-gated (ADR-U026).

## Domain-service affinities and equipment

Each sub-studio leans on exactly one Domain Service: World Studio -> World Model (DS-1); Arc
Studio -> Narrative (DS-2); Journey Studio -> Experience Engine (DS-3). Studio surfaces key
to equipment, never devices (ADR-U025): World Studio has a capture-foot on `sensors` and its deep
edit on `comfortable-canvas`; Arc and Journey Studios lean canvas with light mobile review.

Journey Studio and the Universe Studio umbrella are scoped from **Eid** onward; Arc Studio is
**Urd**-wave; World Studio's wave scoping awaits its feature decomposition.

## Per-studio files

- `DESCRIPTION.md` — outward-facing identity (template: `../templates/studio-description.md`)
- `features/` — feature specs using the studio's prefix (`WS` / `AS` / `JS`; `US` for umbrella-level features only)
