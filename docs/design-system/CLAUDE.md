# CLAUDE.md — Design System tier

**Applies to:** anything under `docs/design-system/` and the corresponding code (shared components, design tokens, theme primitives, motion primitives, accessibility utilities, localisation infrastructure).
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → `README.md` → the feature spec.
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to design-system-tier work.

---

## What makes this tier different

The design system has the **highest blast radius in the ecosystem**. Every product and every studio depends on what it provides. A badly-chosen token, a broken component, a regressed accessibility pattern — any of these ripple outward to every surface simultaneously. Platform is strict because it's the foundation; the design system is strict because it's the skin everyone shares.

The design system is **shared visual language**, not a product utility. It is NOT a UI library for Hub; it is the shared language that both equipment profiles — the Hub (canvas surface) and the Gimbal (senses surface) — and the Studios under Universe Studio all speak (ADR-U025, ADR-U026). Designing or changing a component means thinking about consumers you haven't met yet — the Gimbal viewport, devices at other points in equipment space (tablet, AR glasses), the Studios' denser creator workflows. A component that only feels right in Hub is a component that fragments the family.

The design system is currently **not yet specified** — it's scoped but not active. When work begins (expected Eid-wave onward), the tier's identity will crystallise. For now, these rules are forward-looking: they document the discipline that will apply when the design system starts producing tokens, components, and patterns.

---

## Verticals: obligations on this tier

The five verticals (ADR-U002) are obligations on every tier. Here's what each requires specifically when you're working at the design-system tier. Every feature spec's Vertical Impact section must address all five — address each or mark "None" with rationale (AGENTS.md, always-do).

- **Administration** — Design system doesn't expose admin primitives directly, but admin UIs across products and studios depend on design-system components. Components used in admin contexts (destructive confirmations, bulk actions, audit-log viewers) must have explicit "destructive variant" affordances — larger targets, clearer copy, slower defaults. The design system owns these variants; products don't invent their own.
- **Privacy / GDPR** — Components that render FIM data (names, avatars, attribution, message content) must respect privacy state at the component level. A `<FimName />` component asks the platform for the correct display form based on viewer + viewed + privacy settings — products don't filter at the call site. Empty/redacted states are first-class visual states, not placeholders.
- **Notifications** — The design system owns the visual language of notifications: inbox, badges, toasts, banners, severity levels. Notification *copy* is authored per-event (not here); notification *appearance* is canonical (here). Products surface notifications using design-system primitives — they don't restyle them per product.
- **Observability** — Components instrument their own interaction events at the design-system level (button clicked, modal opened, form submitted) using canonical event names. Products and studios get observability for free by using the components — they don't rewire it. Error states are visual primitives; "show error" is a component concern, "what the error was" is a caller concern.
- **Transactions** — Payment flows, entitlement gates, paywall variants, and receipt displays use design-system primitives (never bespoke). Transaction UI is high-stakes — regression risk is financial, not cosmetic — so it lives behind the design system's stability guarantees, not in product-tier one-offs.

---

## Rules that only apply at this tier

- **Additive over breaking — always.** New variants preferred over modified defaults. New props preferred over changed prop semantics. New components preferred over reshaped existing ones. When a break is genuinely unavoidable, it requires an ADR that includes a migration story (what consumers need to change, in what order, with what fallback period).
- **Breaking changes require a migration story, not just a bump.** A new major version of a component without documented migration is a trap for every consumer. The migration story names the old behaviour, the new behaviour, the transition path, and the deprecation timeline. No migration story, no merge.
- **Every component is documented — or it doesn't exist.** Pattern docs (what the component is for, when to use it, when not to, examples of correct use, examples of misuse) are part of the work, not an afterthought. An undocumented component is worse than no component — consumers will misuse it, then the design system inherits the consequences.
- **i18n is a constraint, not a feature (ADR-U013).** All user-facing strings externalised from day one. No hardcoded English. No "we'll extract later." Every component that renders text accepts translation keys, not literals. Retrofitting i18n costs 3–5× building it correctly initially.
- **Accessibility is a constraint, not a feature (ADR-U013).** WCAG 2.1 AA is baseline, not aspiration. Every component meets keyboard navigation, screen reader, colour contrast, and focus management requirements before it ships. A component that's "accessible in a future release" is not accessible. A11y is a values concern tied to the manifesto ("belonging over fitting in") — not a compliance checkbox.
- **Tokens over hardcoded values.** Colour, type, spacing, motion, elevation — all flow from named tokens. A component that uses a hex literal or a pixel value directly is a component that can't theme, can't adapt to Gimbal's viewport, and can't serve the worlds visually. Extending the token set is cheap; hardcoding is expensive.
- **No product-specific behaviour in shared components.** If a component needs to behave differently for Hub vs Gimbal, the product passes a prop or composes a variant — the component doesn't branch internally on which product it's running in. Product-aware components couple the design system to products and make the design system harder to evolve.
- **The worlds inform the visual language, but the design system is not several visual languages.** The places of the worlds topology (the Ordinary World, the Fringe, the village — see the cosmology core, [`../ecosystem/universe/cosmology/README.md`](../ecosystem/universe/cosmology/README.md)) affect mood, motion, and atmosphere — they don't fork components into per-place versions. World-specific affordances are theming concerns, not structural ones.

---

## Gotchas (tier-specific)

- **"It works in Storybook" is not the same as "it works in context."** Components tested in isolation can look perfect and still fail in a real product layout — grid collapse, z-index conflicts, focus-trap interactions with adjacent modals, unexpected parent context. Every component needs at least one consumer-tier integration test in a real product surface before it's considered stable.
- **Token changes propagate silently.** Changing a token value (say, `--color-accent` from teal to indigo) changes every component that uses it, across every consumer. There is no "local override" that contains the change. Token changes are major events — treat them with the gravity of schema changes at the platform tier.
- **Dark mode + high contrast + reduced motion are orthogonal.** A component that handles dark mode but not reduced-motion ships half-accessible. Test the full matrix, not just the mode you happened to be in.
- **Character set surprises.** Swedish roots mean Å, Ä, Ö must render correctly in every font and every surface. Languages with different script directions, complex ligatures, or large glyph sets exist — component width and line-height assumptions that work for Latin break elsewhere. Never hardcode widths in characters; use content-driven sizing.
- **Motion defaults matter more than motion features.** A default animation duration applied everywhere is an accessibility concern for users with vestibular sensitivity. Respect `prefers-reduced-motion` in every animated primitive, and keep the default durations short.

---

## Where to go next

- **Feature ID prefix at this tier:** `DS` (Design System). See `docs/design-system/README.md`.
- **Current state:** design system is scoped but not yet active. When active work begins, expect: tokens (colour, type, spacing, motion), component contracts, accessibility rules (WCAG 2.1 AA), theming, and the visual language for the worlds (cosmology core).
- **Relevant ADRs:** U002 (five verticals) · U009 (API-first — design system components consume the Platform API via the product, never directly) · U013 (i18n and a11y as constraints) · U022 (named waves) · U024 (wave model semantics).
- **Relevant skills:** [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing DS feature specs; [`feature-development`](../../.claude/skills/feature-development/SKILL.md) when implementing them (once active).
- **Sibling tier CLAUDE.md files:** [`../products/CLAUDE.md`](../products/CLAUDE.md) (every product consumes the design system) · [`../studios/CLAUDE.md`](../studios/CLAUDE.md) (Studios have denser creator workflows that still use design-system primitives) · [`../verticals/CLAUDE.md`](../verticals/CLAUDE.md) (vertical obligations shape component contracts).
