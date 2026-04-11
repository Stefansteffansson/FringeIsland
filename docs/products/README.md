# Products

One folder per product that members or creators actually touch. Studios live in their own peer folder (`../studios/`). Waves are time phases, NOT products.

## The three products

- **The Hub** (`hub/`) — the full browser-based FringeIsland experience. The web platform where FIMs explore journeys, manage groups, reflect, and connect. **Active product in the Ferd wave.** Feature ID prefix: `H`. See [`hub/DESCRIPTION.md`](./hub/DESCRIPTION.md).
- **The Gimbal** (`gimbal/`) — mobile app, one product across iOS and Android. The Whisp's stabilizing instrument in the Ordinary World — AR overlay, navigation, journal, messaging, inventory. Shared product description at `gimbal/` level; platform-specific implementation docs in `gimbal/ios/` and `gimbal/android/`. Planned, not in active development. Feature ID prefix: `G`.
- **The Game** (`game/`) — placeholder name, scope TBD. Feature ID prefix: `GM`.

## Per-product files

- `DESCRIPTION.md` — outward-facing identity (template: `../templates/product-description.md`)
- `SPECIFICATION.md` — inward-facing build spec (template: `../templates/product-specification.md`)
- `ROADMAP.md` — product slice of NOW/NEXT/LATER (template: `../templates/product-roadmap.md`)
- `features/` — feature specs (template: `../templates/feature-spec.md`)
