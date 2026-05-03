# Products

**Purpose:** Product surfaces that FIMs and creators actually touch. One folder per product.

**This is for:** Product descriptions, specifications, roadmaps, and feature specs for each product.

**This is NOT for:** Studios (→ `docs/studios/`), platform services (→ `docs/platform/`), or ecosystem-level strategy (→ `docs/ecosystem/`). Waves are time phases, NOT products.

---

## Structure

```
docs/products/
├── README.md                              ← you are here
├── CLAUDE.md                              ← agent context for product work
│
├── hub/                                   ← The Hub — web platform (active in Ferd)
│   ├── DESCRIPTION.md                     ← FIM-facing identity
│   ├── SPECIFICATION.md                   ← inward-facing build spec (when written)
│   ├── ROADMAP.md                         ← product roadmap (when written)
│   ├── tours/                             ← post-§L3 reader tours (HUMAN + TECHNICAL)
│   └── features/                          ← feature specs (prefix: H)
│
├── gimbal/                                ← The Gimbal — mobile app (iOS + Android, planned)
│   └── (DESCRIPTION.md, features/ — prefix: G)
│
└── game/                                  ← The Game — placeholder name, scope TBD
    └── (DESCRIPTION.md, features/ — prefix: GM)
```

---

## Feature ID prefixes

| Prefix | Product |
|--------|---------|
| H | The Hub |
| G | The Gimbal |
| GM | The Game |

## Per-product files

- `DESCRIPTION.md` — outward-facing identity (template: `../templates/product-description.md`)
- `SPECIFICATION.md` — inward-facing build spec (template: `../templates/product-specification.md`)
- `ROADMAP.md` — product slice of NOW/NEXT/LATER (template: `../templates/product-roadmap.md`)
- `features/` — feature specs (template: `../templates/feature-spec.md`)
