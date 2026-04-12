# Ecosystem

**Purpose:** Everything that defines FringeIsland as a universe and ecosystem — vision, values, strategy, and the shape of the whole.

**This is for:** Constitutional documents, ecosystem strategy, and exploratory thinking that answers "what is FringeIsland and how does the whole thing fit together?" Strategic, philosophical, cross-product, foundational.

**This is NOT for:** Technical architecture and binding decisions (→ `docs/architecture/`), service or product descriptions (→ `docs/platform/`, `docs/products/`), operational planning (→ `docs/planning/`), or research reports (→ `docs/research/`).

---

## Structure

```
docs/ecosystem/
├── README.md                              ← you are here
├── VISION.md                              ← constitutional — the north star
├── MANIFESTO.md                           ← constitutional — founding principles
│
├── strategy/                              ← how the ecosystem is shaped (stable, directional)
│   ├── README.md                          ← strategy overview
│   ├── PRODUCTS_AND_PLATFORM.md           ← full product family vision
│   └── CONTRIBUTION_ARCHITECTURE.md       ← contributor groups + boundaries
│
├── thinking/                              ← working ideas, explorations, open questions
│   ├── README.md                          ← index of active thinking
│   ├── COMMUNITY_OPEN_QUESTIONS.md        ← 9 open questions
│   ├── OLD_VISION.md                      ← legacy, pending content extraction
│   └── OLD_VISION_DECISIONS.md            ← legacy, pending review
│
└── (future subdirectories as topics grow)
    ├── whisp/                             ← when Whisp thinking accumulates
    ├── community/                         ← governance, Dreamineer council
    └── kickstarter/                       ← campaign planning
```

---

## Reading order

1. Start here — this README gives you the map
2. `VISION.md` and `MANIFESTO.md` — the constitutional foundation
3. `strategy/` — how the ecosystem is shaped (product family, contributors)
4. `thinking/` — open questions and exploratory work

---

## Graduation path

When something in `thinking/` matures into a clear position, it moves to `strategy/` or gets absorbed into a constitutional document.

---

## World Model

World Model depth (Three Worlds, Whisp, lore) lives in `../platform/domain/world-model/` — directory to be created in a future session.

## Templates

VISION.md and MANIFESTO.md are constitutional — no template. Changes require deliberate locked decisions.
