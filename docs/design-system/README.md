# Design System

The design system is **not yet specified**. This directory will contain the shared visual language, components, and world aesthetic that all surfaces (The Hub, The Gimbal, The Game, the Studios) draw from.

**Feature ID prefix:** `DS`

When work begins, expect: tokens (colour, type, spacing), component contracts, accessibility rules (WCAG 2.1 AA), theming, motion, and the visual identity for the Three Worlds.

## Structure (when active)

```
docs/design-system/
├── README.md                  ← you are here
├── CLAUDE.md                  ← tier-level rules and obligations
├── SPECIFICATION.md           ← single inward-facing build spec (to be written)
└── features/                  ← FEAT-DS###.md feature specs (to be created)
```

The design system follows the **vertical pattern**: one `SPECIFICATION.md` for the entire tier (no `DESCRIPTION.md`, no separate `ROADMAP.md` until warranted). The L3 inventory inside `SPECIFICATION.md` is a **vocabulary inventory** — three sub-inventories for tokens, components, and patterns — rather than the capability inventory used by products, studios, domain services, and Platform Core areas. Locked 2026-04-26 (Block A.2).

## Authoring

- **Specification template:** [`../templates/design-system-specification.md`](../templates/design-system-specification.md).
- **Tier rules:** [`CLAUDE.md`](./CLAUDE.md).
- **Feature specs (when created):** use [`../templates/feature-spec.md`](../templates/feature-spec.md), file name `FEAT-DS###-{slug}.md`.

## Related

- **Consumers:** every Surface — Hub, Gimbal, Game, Journey Studio, Universe Studio, Arc Studio.
- **ADRs:** U002 (five verticals) · U009 (API-first — design-system components consume the Platform API via the product, never directly) · U013 (i18n and a11y as constraints) · U023 (canonical anatomy).
