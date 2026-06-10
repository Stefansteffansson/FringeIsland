# Design System — Specification

---
slug: design-system
owner: design-system
consumers: [products/hub, products/gimbal, studios/universe-studio, studios/universe-studio/world-studio, studios/universe-studio/arc-studio, studios/universe-studio/journey-studio]
status: {proposed | active | stable}
last_updated: YYYY-MM-DD
tier: Surfaces
tags: [design-system]
feature_prefix: DS  # FEAT-DS### for design-system features
---

> The single inward-facing build spec for the design system. The design system is the shared visual language consumed by every Surface — the Hub and the Gimbal (the two equipment profiles, ADR-U025) and the Studios under Universe Studio (ADR-U026). There is one `SPECIFICATION.md` for the entire tier (locked 2026-04-26: vertical pattern — no DESCRIPTION.md, no separate ROADMAP.md until warranted). This file folds L2 (identity, distribution, versioning, constraints, contracts, theming, operations, open questions), L3 (vocabulary inventory — tokens, components, patterns), and L4 (feature-inventory summary) into one document.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the **vocabulary inventory** (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Design-system tier note.** This template is the design-system-specific instance of the L2/L3/L4 partition skeleton shared with `product-specification.md`, `studio-specification.md`, `domain-service-spec.md`, and `platform-core-spec.md`. The partition skeleton is universal; the L3 *content type* differs. Where products, studios, domain services, and Platform Core areas use a **capability inventory** at L3, and where verticals use an **obligation inventory**, the design system uses a **vocabulary inventory** — three sub-inventories (Tokens, Components, Patterns) with distinct attribute shapes. This is the third L3 content-type variant tracked under G-26 in `docs/ecosystem/how-we-work/gaps.md`.

The design-system tier has properties no other tier has: every Surface depends on it; it depends on no Domain Service and no Platform Core area directly; its evolution is governed by additive-over-breaking discipline rather than wave-boundary stability or per-cycle refresh. These properties shape the L2 sections below — every section corresponds to a load-bearing rule named in `docs/design-system/CLAUDE.md`.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision, the design-system-tier `CLAUDE.md`, and the ecosystem anatomy (`../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023). Revised when the design system's identity, distribution mechanism, versioning policy, constraint set, cross-surface contracts, theming model, or operational shape changes. Changes here propagate to every Surface — see §4 Versioning and stability policy.*

### 1. What it is (and what it isn't)

The design system is the **shared visual language** that every FringeIsland Surface speaks. One paragraph naming what it is and what it explicitly is not.

- **Is:** the canonical vocabulary of tokens, components, and patterns that the Hub, the Gimbal, and the Studios all consume to render their interfaces. Owns the visual identity, motion language, and accessibility posture of the family as a whole.
- **Is not:** a Hub UI library. A component that "feels right in Hub" but doesn't fit Gimbal's viewport, a device at another point in equipment space, or a Studio's denser creator workflow is a *bug*, not a Hub-specific feature. The design system is consumed by every Surface; designing for one and assuming the rest will adapt is a category error per `docs/design-system/CLAUDE.md`.
- **Is not:** several visual languages. The places of the worlds topology (per the cosmology core, `../ecosystem/universe/cosmology/README.md`) inform mood, motion, and atmosphere — but the design system is **one** vocabulary that serves them all via theming, not forked vocabularies. See §7 for the theming mechanism.
- **Is not:** a product utility. The design system has the highest blast radius in the ecosystem — a token change ripples to every Surface simultaneously. That blast radius is what justifies the tier-specific stability discipline in §4.

### 2. Architecture position

Where this tier sits in the ecosystem anatomy (`../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023):

- **Tier:** Surfaces (Design System) — peer to Products and Studios within the Surfaces tier.
- **Consumed by:** every Surface entity — the Hub and the Gimbal (the two equipment profiles; native iOS/Android are the Gimbal's shipping targets, not entities), and the Studios under Universe Studio (World, Arc, Journey). The consumer set is closed at the Surface tier; Domain Services and Platform Core areas do not render UI directly and therefore do not consume design-system primitives.
- **Verticals it must satisfy:** all five (Administration · Privacy · Notifications · Observability · Transactions) per ADR-U002. Design-system-tier obligations are summarised in `docs/design-system/CLAUDE.md` §"Verticals: obligations on this tier"; per-component / per-pattern detail lives in §L3.
- **Wave scope:** scoped but not yet active; expected to crystallise from Eid wave onward. Until then, this specification documents the discipline that will apply.

#### What this tier does NOT depend on

The design system's dependency posture is uniquely thin and worth naming explicitly — same anti-pattern-catch shape as the platform-core template's §4:

- **No Domain Services.** The design system does not consume any domain-service capability. Components do not call DS-1 World Model, DS-2 Narrative, or any other Domain Service. If a component appears to need domain data, the *consumer* fetches it and passes it in as a prop.
- **No Platform Core areas directly.** The design system does not call `has_permission()`, does not query Platform Core tables, does not consume Platform Core APIs. Auth-aware components (e.g., `<FimName />`) accept the resolved state as a prop; the consumer does the platform-tier resolution.
- **No product-specific behaviour.** A component that branches internally on which product is rendering it is a coupling error. Per-product variation is expressed through props or composition, never through `if (product === 'hub')`.

If a component in §L3 appears to need any of the above, the design has an inversion error — surface as an open question in §9.

### 3. Distribution mechanism

How tokens, components, and patterns reach consumers. This is the design system's contract surface — the analogue of "API endpoints" for a domain service or "primitives" for PC-1 Infrastructure.

- **Distribution channels:** {npm package(s) · monorepo workspace package(s) · token JSON bundles · Storybook URL · theme bundle · ...}. List each channel with what it carries and which consumers use it.
- **Versioning scheme:** {semver, with the additive-over-breaking discipline from §4 expressed in version-bump rules — e.g., new variants and new components → minor; breaking prop changes or removed components → major + ADR}.
- **Release cadence:** {per cycle · on-demand · pinned to wave boundaries · ...}. State the default and the exceptions.
- **Consumer onboarding:** how a new Surface starts consuming the design system — repo setup, dependency declaration, theme initialisation, expected consumer-side conventions (e.g., always wrap the app in the theme provider).
- **Storybook (or equivalent canonical surface):** URL, scope, what consumers should and shouldn't read it as. Storybook is documentation, not contract — see §8 Operational concerns for the "works in Storybook ≠ works in context" rule.

### 4. Versioning and stability policy

Per `docs/design-system/CLAUDE.md` ("Additive over breaking — always" and "Breaking changes require a migration story, not just a bump"), the design system's evolution discipline is the load-bearing tier-level rule that earns its own L2 section.

- **Default mode:** **additive**. New variants are preferred over modified defaults. New props are preferred over changed prop semantics. New components are preferred over reshaped existing ones. The first question on any change is "can this be additive?"
- **Breaking changes:** require an **ADR** that includes a documented **migration story**. The story names: the old behaviour, the new behaviour, the transition path for consumers, the deprecation timeline, and the fallback period. **No migration story, no merge** — this is enforced at review.
- **Deprecation lifecycle:** how a token / component / pattern is marked deprecated, how long it remains available, what consumers must do, what tooling surfaces the deprecation (lint warnings, Storybook badges, release notes).
- **Token changes propagate silently** — there is no local override that contains them. Per the gotchas section of `design-system/CLAUDE.md`, treat token value changes with the gravity of schema changes at the platform tier.

**DoR-relevant.** A feature spec proposing a breaking change must include the migration story before reaching maturity 4-ready. Features that propose a break without a migration story fail DoR.

### 5. Constraints

The hard constraints every component, token, and pattern must satisfy. These are enforced as constraints, not features — a component that "will become accessible in a future release" is not accessible.

| Constraint | Enforced where | What failure looks like | Escape hatch |
|---|---|---|---|
| **i18n (ADR-U013)** — all user-facing strings externalised, translation keys not literals, RTL-safe layouts, character-set-safe (Å Ä Ö and beyond) | Component-author time · CI lint | Hardcoded English string · pixel-width hardcoded for Latin · RTL layout breakage | None. Retrofitting i18n costs 3–5× building it correctly initially. |
| **Accessibility (WCAG 2.1 AA, ADR-U013)** — keyboard navigation, screen reader behaviour, colour contrast, focus management, `prefers-reduced-motion` respected | Component-author time · CI a11y tests · consumer-tier integration tests | Inaccessible focus order · contrast failure · animation that can't be reduced | None. A11y is tied to the manifesto ("belonging over fitting in"), not a compliance checkbox. |
| **Tokens over hardcoded values** — colour, type, spacing, motion, elevation, radius all flow from named tokens | Component-author time · CI lint (no hex literals, no pixel literals) | Hex colour in component code · pixel value in spacing | None. Extending the token set is cheap; hardcoding is expensive. |
| **No product-specific behaviour in shared components** — components do not branch on which product is rendering them | Component-author time · code review | `if (product === 'hub')` inside a component | None. Per-product variation is expressed via props or composition. |

If a constraint cannot be satisfied for a particular component or token, the right move is to *not ship it* and surface as an open question in §9 — not to ship it with an exception.

### 6. Cross-surface contracts

The two-way contract between the design system and its consumers. Mirror of the studios template's §8 Cross-studio contracts, but consumer-facing rather than peer-facing — and one-to-many rather than pairwise.

#### What consumers commit to

- **Use design-system primitives, not bespoke.** A Surface that builds its own button, modal, form input, or notification toast is in violation. If a primitive doesn't exist for the need, the right move is to request it (or contribute it), not to bespoke it.
- **Respect the published surface.** Consumers do not reach into a component's internals, do not depend on undocumented behaviour, do not patch tokens locally. The published API is the contract; everything else is implementation.
- **Adopt theme primitives properly.** Consumers initialise the theme at app boundary; do not bypass it for "just this one component."
- **Follow vertical obligations the design system encodes.** Consumers using a `<FimName />` component get the Privacy posture for free; they do not also apply their own filtering on top.

#### What the design system commits to

- **Stability of the published surface.** Components, tokens, and patterns at `stable` status do not break their contracts without an ADR + migration story (see §4).
- **Backwards-compatible additive evolution as the default.** Consumers can upgrade minor versions without code changes.
- **Documentation parity.** Every published primitive has documentation that names what it's for, when to use it, when not to, and at least one example of correct use plus one example of misuse. A component without this documentation does not exist (per `design-system/CLAUDE.md`).
- **Migration support during deprecation.** When a primitive is deprecated, consumers get tooling support (lint warnings, codemods where feasible) and a documented timeline.

Breaking either side of this contract is a structural failure — a Surface bespoke-ing a primitive is as much a violation as a design-system breaking-change without a migration story.

### 7. The worlds and theming

The places of FringeIsland's worlds topology (per the cosmology core, `../ecosystem/universe/cosmology/README.md` — the Ordinary World, the Fringe, the village) affect mood, motion, and atmosphere in the rendered experience. The load-bearing rule from `docs/design-system/CLAUDE.md`: *the worlds inform the visual language, but the design system is not several visual languages.* Theming is the mechanism that makes that rule satisfiable.

This section earns its own L2 surface because it is the load-bearing answer to a question every component author and every Surface engineer will eventually ask: *"how do I make this feel like the Void?"* Folding the answer into §5 Constraints would bury it; folding it into §3 Distribution would miss the point. The answer is: through tokens and theme primitives, never by forking the component.

#### What lives where

- **World-specific tokens** live in the design system. Token sets per world are published and themable — colour palettes, motion durations, atmospheric primitives that vary by world.
- **World-specific components do NOT exist.** A component that's only valid in one world is a category error. If a pattern is genuinely world-specific (e.g., a Void-only narrative affordance), it lives in the consuming Surface, not in the design system.
- **The theme provider is the world boundary.** A Surface declares which world it's currently rendering by setting the active theme; components consume tokens through the theme without knowing which world is active.
- **World transitions are theming events**, not component remounts. Moving between worlds changes the active theme; components persist and re-render with new token values.

#### Authoring discipline

Component authors do not branch on world. If a component needs to behave differently across worlds, the difference flows through tokens (colour, motion duration, type weight) — not through a `world === 'void'` check inside the component. If the difference cannot be expressed through tokens, the question to ask is whether the component itself is world-specific (in which case it belongs in the Surface, not here) or whether the token set needs extending (in which case extend it).

The full enumeration of world-specific tokens, theme primitives, and theming patterns lives in §L3 below; this section names the principle.

### 8. Operational concerns

How the design system is operated and how it stays trustworthy as it evolves.

- **Storybook (or canonical primitive-rendering surface):** hosting, scope, who maintains it. Storybook is documentation; "works in Storybook" does not mean "works in context" — every component needs at least one consumer-tier integration test in a real Surface before it's considered `stable` (per `design-system/CLAUDE.md` gotchas).
- **Visual regression testing:** what pipeline runs, on what cadence, what failure looks like, how regressions are triaged.
- **Accessibility regression testing:** automated a11y checks per component, the cadence and surface for results, what triggers a deeper manual audit (e.g., colour-contrast changes, new interactive primitives).
- **Token build pipeline:** how token JSON is built, validated, and shipped to consumers; what consumes the build output (npm packages, runtime theme bundles).
- **Lint rules enforcing constraints from §5:** what's machine-checked at consumer build time (no hex literals in consumer code, no bespoke buttons where a `<Button>` exists), and how lint failures surface.
- **The full a11y matrix is orthogonal.** Dark mode + high contrast + reduced motion + large text + RTL — test every combination, not just the mode the author was in (per `design-system/CLAUDE.md` gotchas).
- **Motion defaults matter more than motion features.** Default animation durations apply everywhere; treat them as accessibility settings, not aesthetic choices. `prefers-reduced-motion` is respected in every animated primitive.
- **Character-set surprises.** Swedish roots mean Å, Ä, Ö are baseline; never hardcode widths in characters; use content-driven sizing; verify glyph coverage in every shipped font.
- **Backup, recovery, and continuity:** what happens if a published version of the design system is found broken in production — rollback path, hotfix discipline, communication channel to consumers.

### 9. Open spec questions

L2-level questions still under design. Each is a candidate research spike or ADR.

---

## L3 — Vocabulary inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the design system enters active development, has its constraints or theming model materially revised, or is affected by an architectural change that introduces new token kinds, component categories, or pattern types. L3 does not read existing component code or feature specs during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

The design system's L3 is a **vocabulary inventory** — three distinct sub-inventories, each with its own attribute shape. This is the third L3 content-type variant (tracked under G-26): products, studios, domain services, and Platform Core areas use **capability** inventories; verticals use an **obligation** inventory; the design system uses a **vocabulary** inventory. The reason is structural — the design system does not own *capabilities* in the sense of caller-facing operations, nor *obligations* in the sense of rules other entities must obey. It owns a *vocabulary*: tokens, components, and patterns that consumers compose into their own capabilities.

The three sub-inventories below share a common Dependency chain block, External dependencies block, and Sources-status block at the end of §L3. The sub-inventories do not share a single unified table because their attributes genuinely differ — themability is a token concern, props/variants are a component concern, "when to use / when not to use" is a pattern concern.

### Sub-inventory 1 — Tokens

The atomic vocabulary. Tokens are named values for colour, type, spacing, motion, elevation, and radius. Tokens are themable — a token's value may differ between worlds (Ordinary World, FringeIsland, Void) per §7.

| Token name | Kind | Themability | Default value | Used by | Vertical impact |
|---|---|---|---|---|---|
| ... | colour \| type \| spacing \| motion \| elevation \| radius | per-world \| per-mode \| fixed | ... | components / patterns that consume this token | ... |

**Themability values:**
- *per-world* — value differs across the worlds' places; world-specific theme bundles override the default.
- *per-mode* — value differs across modes orthogonal to world (dark mode, high contrast, reduced motion).
- *fixed* — value is the same in every theme; the token name exists for semantic clarity, not for variation.

**Vertical impact** lists which of Administration / Privacy / Notifications / Observability / Transactions this token touches. Common patterns: motion tokens carry an Accessibility / Privacy obligation (must respect `prefers-reduced-motion`); colour tokens used in destructive contexts carry an Administration obligation (the destructive variant requires distinct treatment).

### Sub-inventory 2 — Components

The compositional vocabulary. Components are reusable rendering primitives — buttons, modals, form inputs, notification surfaces, FIM-data displays, and so on. Components consume tokens; consumers compose components.

| Component name | Props / variants | A11y posture | i18n posture | Consumer expectations | Vertical impact |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |

**A11y posture** names the keyboard navigation behaviour, screen-reader behaviour, focus management, and any animation-respecting behaviour the component implements. Per §5, every component meets WCAG 2.1 AA before shipping.

**i18n posture** names which strings the component accepts as translation keys, RTL-safety, and any character-set considerations. Per §5, components accept translation keys, never literals.

**Consumer expectations** name what the consumer must provide — props, surrounding context (theme provider, i18n provider, etc.), data fetching responsibility (e.g., `<FimName />` consumes resolved name state from the consumer; the component does not call the platform itself per §2).

**Vertical impact** lists which verticals the component owns at the component level — e.g., destructive variants (Admin), `<FimName />` privacy state (Privacy), notification visual language (Notifications), interaction event instrumentation (Observability), paywall and receipt primitives (Transactions).

### Sub-inventory 3 — Patterns

The recipe vocabulary. Patterns are higher-order compositions — combinations of components and tokens that solve recurring UX problems (form-with-validation, list-with-empty-state, paywall-presentation, notification-inbox). Patterns are documented but not necessarily packaged as code; they are "the right way to compose these primitives for this situation."

| Pattern name | Components used | When to use | When NOT to use | Vertical impact |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

**When to use / When NOT to use** is the load-bearing pair for patterns. A pattern without a "when not to use" is incomplete — patterns succeed by being applied in their right context and failing loudly when misapplied. Per `design-system/CLAUDE.md`: "an undocumented component is worse than no component"; the same is true of patterns.

**Vertical impact** lists which verticals the pattern carries — e.g., paywall patterns carry Transactions obligations, audit-log-display patterns carry Administration obligations.

### Dependency chain

The three sub-inventories are layered: tokens → components → patterns.

- **Tokens** depend on nothing within the design system. They are the foundation.
- **Components** depend on tokens. A component cannot be authored against a token that is not stable; a token whose value is still being decided blocks any component that wants to consume it.
- **Patterns** depend on components. A pattern cannot be authored against a component that is not stable; a component whose API is still being decided blocks any pattern that wants to compose it.

This layering applies to feature-spec maturity as well: a token feature must reach maturity 4-ready before a component feature consuming it; a component feature must reach 4-ready before a pattern feature consuming it.

### External dependencies

Capabilities or vocabularies the design system consumes from outside its own boundary. The design system's external dependency surface is **deliberately thin** — most "external" inputs are standards, not other ecosystem entities.

**Allowed external sources:**
- **Web platform standards** — CSS specifications, ARIA specifications, the underlying primitives the design system builds on top of.
- **WCAG 2.1 AA** — the accessibility baseline (per ADR-U013).
- **Unicode and font specifications** — the character-set and glyph-coverage baseline.
- **Verticals** — the obligations levied by Administration / Privacy / Notifications / Observability / Transactions that apply at the design-system tier. Note: the design system is often the *enabler* for vertical obligations elsewhere (e.g., the Privacy obligation that names render through `<FimName />` is *enabled* by the design system providing that component), so the dependency framing is sometimes inverted at this tier.

**Disallowed sources:** Domain Services, Platform Core areas, Products, Studios. Per §2, the design system depends on no Domain Service and no Platform Core area directly, and absorbs no product- or studio-specific behaviour. If a token, component, or pattern appears to depend on any of these, the design has an inversion error — surface as an open question in §9.

### Sources-status block

The `ecosystem-decomposition` skill's prerequisite-check pause mechanic produces remarks when upstream thinking is inadequate but the author proceeds anyway. Record those remarks here — one line per remark, with the upstream gap and a cross-reference to `docs/ecosystem/how-we-work/gaps.md` (e.g., G-03 for scaffold vertical specs).

*Note: no status column in the vocabulary tables. Status (shipped / in flight / deprecated / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's vocabulary inventory. Updated whenever a `FEAT-DS###.md` file under `docs/design-system/features/` is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

Design-system features may target tokens, components, or patterns; the L4 summary distinguishes the target so the layering from §L3 (tokens → components → patterns) remains visible.

### Summary

| Vocabulary item (from §L3) | Item kind | Feature spec | Maturity | Notes |
|---|---|---|---|---|
| ... | token \| component \| pattern | FEAT-DS{NNN} | 0–6 | ... |

One row per feature spec. A vocabulary item with multiple feature specs has multiple rows. A vocabulary item with no spec gets a row with Feature spec = "—" and Maturity = "—".

### Vocabulary items without specs

Items from §L3 that do not yet have a corresponding `FEAT-DS###.md` file. These are candidates for future L4 runs.

- {Item name} ({kind}) — {short note on why not yet specified, if useful}

### Features without vocabulary items

If any `FEAT-DS###.md` files exist under `docs/design-system/features/` that do not map to a token, component, or pattern in §L3, they're listed here. This should normally be empty; a non-empty list is a signal of drift and surfaces as a reconciliation finding.

- {FEAT-DS###} — {short note}

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour, the reconciliation-is-downstream principle, and the three L3 content-type variants (capability / obligation / vocabulary). See `docs/design-system/CLAUDE.md` for the design-system-tier obligations this template encodes.*
