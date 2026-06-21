# ADR-U025: Products as equipment profiles; feature-grain equipment-keying; the Game is depth

**Status:** Accepted
**Date:** 2026-06-10
**Deciders:** Stefan
**Tags:** scope:product · wave:ferd

> Amends [ADR-U023](ADR-U023-platform-core-domain-services-decomposition.md) — revises the Products
> row of its decomposition diagram (entity identity) while explicitly CONFIRMING its Platform Core /
> Domain Services split, both contract boundaries, and products-as-clients-over-one-Platform-API.
> Source of truth: the universe-discovery 2026-06-05 product/ecosystem design locks
> (`docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`).
> Ratified in reconciliation Session B (2026-06-10).

---

## Context and problem statement

The repo modelled products as device entities: The Hub (web), The Gimbal (mobile, with `ios/` and
`android/` sub-entities), and The Game (a future Unreal Engine product). The universe-discovery
work superseded that model: there is ONE lived experience ("being-in-FringeIsland") over one shared
core, and what reaches the FIM is decided by their situation and the equipment of the device in
their hands — not by which device-product they "are in". The discovery also reclassified the Game:
it is not a third product but a depth setting of journeys. *"How should the product tier be
defined so that products stay coherent surfaces of one experience rather than device silos?"*

**Naming note (deliberate rename):** the discovery log calls device-side capabilities
"affordances". Canon adopts **equipment** — plain language for newcomers, no collision with the
decomposition's Capability level (Vision -> Entities -> Capabilities -> Features). Wherever the
discovery says affordance, canon says equipment; this is a naming decision, not a divergence.

## Decision drivers

- The discovery is the single source of truth; the product locks are explicit and ratified.
- Device-independence and future-proofing: new hardware (tablet, AR glasses) must not create new
  product entities or per-device bookkeeping.
- One shared core (ADR-U023, ADR-U009) already makes products thin clients; the entity model
  should match.
- Newcomer-readable vocabulary; no jargon at the identity layer.
- Avoid maintaining speculative entities (Game, Gimbal-iOS/Android) ahead of need.

## Considered options

- **Option A** — Keep products as device entities (Hub=web, Gimbal=mobile incl. iOS/Android
  sub-entities, Game=Unreal product).
- **Option B** — Products as equipment profiles of one experience; feature-grain equipment-keying;
  the Game reclassified as depth.
- **Option C** — Collapse to a single product entity ("the experience") with no named profiles.

## Decision outcome

**Chosen option:** Option B, because it is what the discovery locked, it preserves the useful
Hub/Gimbal identities as complementary surfaces, and it removes device bookkeeping at every grain.

### The decision, in full

1. **One experience, one shared core.** The lived thing is being-in-FringeIsland (Mist + FIM; the Mist
   was the Shadow, renamed per ADR-U031).
   Products are shipped surfaces of that one experience — real deliverables (a web app with a URL,
   a mobile app with a store listing), each with releases and a shell.

2. **"Hub" and "Gimbal" name two equipment profiles, not two devices.**
   - **The Gimbal — the senses surface:** the physical-world membrane (camera, LiDAR, GPS,
     microphone, AR display, hands-free, portability) — perception and capture, out in the world.
   - **The Hub — the canvas surface:** the canvas/tooling membrane (screen room, precision input,
     keyboard, file system, external plugins) — refinement and depth, at the desk.
   - Devices are points in equipment space: phone (high senses / low canvas), laptop (the
     reverse), tablet (the convergence point), AR glasses (max senses + immersion). A surface
     lights up on any device whose equipment matches; no device is an entity.
   - Proof the surfaces are complementary, not clones: the Gimbal-capture -> Hub-refine pipeline
     (scan a real object on the phone, refine it on the canvas) — two ends of one workflow.

3. **Feature-grain equipment-keying (the placement rule).** Every feature spec carries a
   `requires-equipment:` metadata field beside `maturity:`, valued from a small, fixed, coarse
   set — `sensors | comfortable-canvas | precision-input | none`. A feature appears on any device
   that offers its required equipment. **Chosen restriction is allowed** (a feature may be scoped
   to richer-equipment devices on purpose), but every restriction must be named by its equipment,
   never by device or whim. Forced exclusivity is then automatic, with no per-device bookkeeping.
   Journeys likewise declare their required equipment at authoring time. Extending the equipment
   set (e.g. a future `immersion` key) is an explicit decision, not a drift.

4. **Products own only their shell.** Navigation, rendering approach, packaging, and the
   surface's own chrome belong to a product. Experience features belong to their capabilities in
   the decomposition and light up wherever their equipment exists. The question "is this a Hub
   feature or a Gimbal feature?" is retired; the question is "what equipment does it need?"

5. **The Game is depth, not a product.** The Game is a depth setting of journeys inside the one
   lived experience; it is removed as a product entity. **Revisit trigger:** a journey needs
   fidelity, an engine, or a play surface the mobile/web stack cannot render (AR glasses are a
   strong candidate spark). ADR-U017 (journeys as content templates) is compatible and unchanged.

### Consequences

- **Positive:** Device-independent and future-proof; new hardware changes nothing structural.
  Feature placement becomes declarative (one metadata field) instead of curated per product.
  Speculative entities stop accruing maintenance debt.
- **Positive:** ADR-U023's architecture is confirmed, not torn down — only the Products row reads
  differently: `Products (equipment profiles: The Hub, The Gimbal) / Studios / Design System`.
- **Negative:** A one-time correction ripple across the repo (tracked by the Session B conformance
  register): `docs/products/gimbal/ios/` and `android/` dissolve as sub-entities; the
  `docs/products/game/` entity folder is deleted (this ADR and the corrected strategy doc carry
  the lock and revisit trigger); `docs/templates/feature-spec.md` gains `requires-equipment:`;
  AGENTS.md feature-ID prefixes change (H and G survive for shell features only; GM is retired);
  `ECOSYSTEM_ANATOMY_V4.svg`, `PRODUCTS_AND_PLATFORM.md`, the products tree, the design-system
  docs, and the agent-context cascade entity level are corrected at graduation.
- **Negative:** Existing feature specs filed under products must be re-homed to their owning
  capabilities over time (shell features stay); a conformance-pass correction, not a same-day move.
- **Neutral:** "Product" remains the tier word — redefined, not retired.

## Pros and cons of each option

### Option A — Device entities (status quo)
- Pros: No churn; matches the existing tree and templates.
- Cons: Contradicts the locked discovery; every new device class forces a new entity; per-device
  feature bookkeeping; Game-as-product accrues speculative structure the locks reject.

### Option B — Equipment profiles + feature-grain keying + Game-as-depth (chosen)
- Pros: Matches the locks verbatim; declarative placement; device-independent; keeps the
  complementary Hub/Gimbal identities; confirms ADR-U023.
- Cons: One-time repo-wide correction ripple; contributors must learn the keying rule.

### Option C — Single product entity, no profiles
- Pros: Purest one-experience reading; smallest entity count.
- Cons: Erases the genuinely useful senses/canvas distinction the discovery itself names; the two
  shells (web app, mobile app) are real shipped things that need owners; loses the
  capture-vs-refine identity language.

## Links

- Amends: [ADR-U023 — Platform Core / Domain Services decomposition](ADR-U023-platform-core-domain-services-decomposition.md) (Products row only; all else confirmed)
- Related: [ADR-U009 — API-first frontend-agnostic](ADR-U009-api-first-frontend-agnostic.md) (confirmed)
- Related: [ADR-U017 — Journeys content templates](ADR-U017-journeys-content-templates.md) (compatible; carries the Game-as-depth journey grounding)
- Related: [ADR-U026 — Studio decomposition](ADR-U026-studio-decomposition-universe-studio-parent.md) (the sibling entity-decomposition decision)
- Source: `docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md` (2026-06-05 product/ecosystem design locks)
- Session record: `docs/planning/sessions/2026-06-05_02_-_SESSION-A-REPO-MAP.md` (the map this resolves)
