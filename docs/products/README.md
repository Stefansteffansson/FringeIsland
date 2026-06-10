# Products

**Purpose:** The shipped surfaces of the one FringeIsland experience. Two products = two **equipment profiles** of that one experience, not two devices ([ADR-U025](../architecture/decisions/ADR-U025-products-as-equipment-profiles.md)):

- **The Hub — the canvas surface:** screen room, keyboard, precision input, file system — refinement and depth, at the desk.
- **The Gimbal — the senses surface:** camera, LiDAR, GPS, mic, AR, portability — perception and capture, out in the world.

Devices (phone, laptop, tablet, AR glasses) are points in equipment space, not entities. Products own only their **shell** (navigation, rendering, packaging, chrome); experience features belong to their capabilities and light up wherever their required equipment exists.

**This is for:** Product descriptions, specifications, roadmaps, and shell feature specs for each product.

**This is NOT for:** Studios (→ `docs/studios/`), platform services (→ `docs/platform/`), ecosystem-level strategy (→ `docs/ecosystem/`), or experience features (they belong to their owning capabilities, not to a product). Waves are time phases, NOT products. The Game is not a product — it is a depth setting of journeys (ADR-U025; revisit trigger lives there).

---

## Structure

```
docs/products/
├── README.md                              ← you are here
├── CLAUDE.md                              ← agent context for product work
│
├── hub/                                   ← The Hub — the canvas surface (ships today as the web app; active in Ferd)
│   ├── DESCRIPTION.md                     ← outward-facing identity
│   ├── SPECIFICATION.md                   ← inward-facing build spec (when written)
│   ├── ROADMAP.md                         ← product roadmap (when written)
│   ├── tours/                             ← post-§L3 reader tours (HUMAN + TECHNICAL)
│   └── features/                          ← shell feature specs (prefix: H)
│
└── gimbal/                                ← The Gimbal — the senses surface (native iOS/Android are shipping targets, planned)
    └── (DESCRIPTION.md, features/ — prefix: G)
```

---

## Feature ID prefixes

| Prefix | Product |
|--------|---------|
| H | The Hub (shell features only) |
| G | The Gimbal (shell features only) |

`GM` is retired (the Game is not a product). H and G survive for **shell** features only — navigation, rendering, packaging. Experience features carry their owning capability's prefix and declare `requires-equipment:` in their spec; a feature appears on any device offering its required equipment, and any chosen restriction is named by equipment, never by device (the placement rule, ADR-U025).

## Per-product files

- `DESCRIPTION.md` — outward-facing identity (template: `../templates/product-description.md`)
- `SPECIFICATION.md` — inward-facing build spec (template: `../templates/product-specification.md`)
- `ROADMAP.md` — product slice of NOW/NEXT/LATER (template: `../templates/product-roadmap.md`)
- `features/` — feature specs (template: `../templates/feature-spec.md`)
