# Session Bridge — Block A.2 Design System template authored

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md` (date + 2-digit sequence within the day)
**Date:** 2026-04-26
**Session type:** Vertical-axis work — Block A.2-author. Template-authoring session per the locked sequence (B: A.1 → A.3 → A.2) from earlier bridges of the same day. **Final session of Block A.**
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (none yet — files written via MCP, awaiting Stefan's commit pass)
- New file: `docs/templates/design-system-specification.md`
- Modified: `docs/templates/README.md` (index entry + tree entry for the new template)
- Modified: `docs/design-system/README.md` (expanded from single-paragraph stub to include structure, authoring pointers, and ADR cross-references)
- Modified: `.claude/skills/ecosystem-decomposition/SKILL.md` (G-26 closure: three L3 content-type variants now named explicitly; References section expanded to cover all four spec templates)
- Modified: `docs/ecosystem/how-we-work/gaps.md` (G-26 closed and removed; G-24 closed and removed at end of session after Stefan confirmed; status count twenty-six → twenty-four; originating-sources line acknowledges both closes)

**Prior bridges in this 2026-04-26 chain (chronological):**
1. `2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` — locked Block A → Block B → Block C structure and decision-first sequencing.
2. `2026-04-26_02_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md` — settled A.1 (Studio: adaptation) and A.2 (Design System: genuinely new). Added G-26.
3. `2026-04-26_03_-_BLOCK-A3-PLATFORM-CORE-DECISIONS.md` — settled A.3 with three sub-decisions (per-area unit, flat layout, PC-wide ROADMAP, adaptation template).
4. `2026-04-26_04_-_BLOCK-A1-AUTHOR-STUDIO-TEMPLATE.md` — A.1-author session: `studio-specification.md` written.
5. `2026-04-26_05_-_BLOCK-A3-AUTHOR-PLATFORM-CORE-TEMPLATE.md` — A.3-author session: `platform-core-spec.md` written, `core/README.md` cleaned up.
6. **This bridge** — A.2-author session: `design-system-specification.md` written, `design-system/README.md` cleaned up, G-26 closed in same session.

---

## Session summary

The session opened on Block A.2-author. Path B was locked at session start (author A.1 → A.3 → A.2 in three separate sessions). A.1 and A.3 had landed earlier in the day, both as single mechanical authoring passes — confirming the "authoring is mechanical" property *for adaptation-with-scaffolding*. A.2 was the explicit watch-point in both prior author bridges: **genuinely new**, no source template to adapt from, the session most likely to surface a structural surprise. The orientation seed in the A.3-author bridge was clear: plan for elicitation rounds rather than assume a single pass.

The session honoured that guidance. Before any file was written, Claude proposed a concrete L2 section list to Stefan as the elicitation step — 9 sections derived from `design-system/CLAUDE.md`'s load-bearing properties, with each section tied back to the specific tier rule it makes impossible-to-skip, plus explicit notes on what was deliberately *not* included (no auth section, no storage section, no lifecycle table) and why. Stefan reacted to three concrete questions and corrected one significant error in Claude's framing.

**The correction was load-bearing.** Claude's initial framing of §7 (Three Worlds and theming) referenced the worlds as "Ordinary World, Other Side, Safe Harbour" — pulled from `design-system/CLAUDE.md`'s implicit cosmology and from Claude's user-memory carry. Stefan's answer to Q1 corrected this: the three worlds are **Ordinary World, FringeIsland, the Void**. This is not a small naming variation — it changes what the cosmology *is*. The names "Other Side" and "Safe Harbour" appeared in the prior memory text and in `design-system/CLAUDE.md`, suggesting drift exists in multiple places in the codebase. The template was authored with the corrected cosmology; `design-system/CLAUDE.md` was *not* edited in this session because that's a tier-CLAUDE.md edit deserving a deliberate sweep, not a side-effect of template-authoring. The drift is flagged below as a finding for a follow-up session — it almost certainly exists in `studios/CLAUDE.md` and possibly elsewhere.

The other two questions were quicker. Q2 (bundle G-26 closure or split): land in this session if context allows. Context was sufficient; G-26 closed. Q3 (frontmatter consumer list): no platform/domain or platform/core consumers — design-system primitives are consumed only at the Surface tier.

The authoring then proceeded as a single pass per the elicited L2 list. The L2/L3/L4 partition skeleton transferred from the partition-skeleton references (studios + platform-core templates) without modification. The L3 vocabulary-inventory variant was authored fresh from the A.2 decisions bridge specification — three sub-inventories (Tokens / Components / Patterns) with distinct attribute shapes, sharing a common Dependency-chain block (tokens → components → patterns) and External-dependencies block. The L4 feature-inventory summary transferred with one design-system-specific addition: an "Item kind" column so the layering from §L3 (token / component / pattern) remains visible at L4. No special routing note was needed because design-system has its own `features/` directory, not shared with other entities.

The 9 L2 sections held under authoring without surfacing structural surprises. **The "authoring is mechanical" property held even for the genuinely-new case** — but with an important caveat. The session ran without elicitation *during authoring* because the elicitation was front-loaded into a single explicit step (the L2 section list proposal). Without that front-loaded elicitation, the session would have run differently. The honest read: **for adaptation-with-scaffolding sessions, mechanical authoring needs no elicitation step; for genuinely-new sessions, mechanical authoring needs one front-loaded elicitation step but no elicitation during authoring.** A.1-author and A.3-author confirmed the first claim; this session confirms the second.

The `design-system/README.md` cleanup landed in the same session, mirroring the discipline applied to `core/README.md` in the A.3-author session. The README was expanded from a single-paragraph stub to include a Structure (when active) section, an Authoring section with pointers to the new template and tier rules, and a Related section with ADR cross-references. The expansion is minimal — it doesn't pre-commit to area structure that hasn't been decided — but it brings the README in line with the discipline emerging across the other entity directories.

G-26 closure landed cleanly in three places: the `ecosystem-decomposition` skill (which now names three L3 content-type variants explicitly with a table mapping each to its templates), the gaps register (G-26 entry removed; status count and originating-sources line updated), and a closing reference in the new template itself. The skill update did slightly more than the gap entry strictly required: the References section was expanded to acknowledge all four spec templates (studio, platform-core, design-system, vertical) where it previously only acknowledged product and domain-service. This wasn't strictly required by G-26 but the gap surfaced the staleness in the same area, so the cleanup landed alongside.

**G-24 was also closed in this session, after the initial bridge was written.** G-24 ("Missing SPECIFICATION templates for studios / Platform Core tiers / Design System") was the gap whose proposed fix said "Deferred until the entity categories actually need specifications written" — but the *literal subject* of the gap was the missing templates. With A.1, A.2, and A.3 author sessions all complete, the templates exist. Stefan's call after seeing the initial bridge was to close G-24; the close landed via the same surgical-edit pattern as G-26. Per-entity SPECIFICATION authoring is now framed as a Block B concern, not a documentation gap. The bridge was updated post-hoc to reflect the close — see the Forward Agenda and Closed-this-session sections below for the final state.

The drift-check finding from prior bridges stays operative: today is the **fifteenth consecutive structural session**. Sixth bridge dated 2026-04-26. The gap-pattern (structural sessions generating more gaps than they close) **was reversed** this session: net change −2 (G-26 and G-24 both closed, none added). **This is the first session in the streak with a net-negative gap change** — and the largest negative delta the streak has seen. It is a single data point, and the session was an authoring-plus-cleanup session executing prior decisions, not fresh structural design — so the same caveat applies as in the prior pause-streak. The pattern is not yet broken; it is paused, and now better than paused, but the test remains Block B.

---

## What was decided

No new architectural decisions. Authoring session — discharges the A.2-author commitment from prior bridges and **completes Block A**. The locked decisions being executed:
- A.2 unit of decomposition: single SPECIFICATION.md for the entire design-system tier (vertical pattern, locked 2026-04-26 A.1+A.2 decisions).
- A.2 directory structure: single `docs/design-system/` containing `SPECIFICATION.md` + `features/`.
- A.2 template shape: genuinely new (locked 2026-04-26 A.1+A.2 decisions).
- A.2 L3 content type: vocabulary inventory with three sub-sections (Tokens / Components / Patterns) sharing a Dependency-chain and Sources-status block (locked 2026-04-26 A.1+A.2 decisions).
- L2/L3/L4 partition skeleton transfers (locked 2026-04-22 decomposition skill refactor).

**Two in-session judgement calls**, flagged for transparency:
1. **§7 Three Worlds and theming earned its own L2 section** rather than being folded into §5 Constraints or §3 Distribution mechanism. Reasoning: "DS is not three visual languages" is a load-bearing tier-level rule per `design-system/CLAUDE.md`, and theming is the mechanism that makes the rule satisfiable. Folding the answer would bury the load-bearing claim. Same anti-pattern-catch shape as the studio template's §5 Target Domain Service contract and the platform-core template's §4 explicit "what this area does NOT depend on" subsection.
2. **G-26 closure landed in this session** rather than being deferred to a follow-up. Stefan's instruction was "if context allows," context allowed, the gap closed cleanly with three small edits (skill, gap register, originating-sources line).

**One genuine correction**, not a judgement call: the Three Worlds are Ordinary World, FringeIsland, and the Void — not "Ordinary World, Other Side, Safe Harbour" as appears in `design-system/CLAUDE.md` and prior memory text. This is a cosmology drift that almost certainly exists in other places in the codebase. Flagged as a finding below; not addressed in this session.

---

## What was produced

**New template authored: `docs/templates/design-system-specification.md`.** Genuinely new — no source template adapted. L2/L3/L4 partition skeleton transferred from existing templates (universal); L2 sections designed fresh from `design-system/CLAUDE.md` load-bearing properties; L3 implements the **vocabulary-inventory** variant (third L3 content-type per G-26) with three sub-inventories; L4 transfers from the partition skeleton with an "Item kind" column added.

**L2 section list, final (9 sections):**
1. **What it is (and what it isn't)** — explicit anti-pattern callouts: not a Hub UI library, not three visual languages, not a product utility
2. **Architecture position** — Surfaces tier; consumed by every Surface (Hub, Gimbal, Game, three Studios); explicit "what this tier does NOT depend on" subsection (no Domain Services, no Platform Core areas directly, no product-specific behaviour) — same anti-pattern-catch shape as the platform-core template's §4
3. **Distribution mechanism** — channels, versioning scheme, release cadence, consumer onboarding, Storybook scope
4. **Versioning and stability policy** — additive-over-breaking discipline made spec-shaped; breaking-change-requires-migration-story rule lifted to a DoR-relevant statement; deprecation lifecycle; token-changes-propagate-silently warning
5. **Constraints** — i18n / a11y / tokens-over-hardcoded / no-product-branching as a per-constraint table (where enforced, what failure looks like, escape hatch — typically "none, fix the component")
6. **Cross-surface contracts** — two-way contract: what consumers commit to, what the design system commits to (one-to-many rather than the studio template's pairwise)
7. **Three Worlds and theming** — Ordinary World, FringeIsland, Void; theming as the mechanism; world-specific tokens vs world-specific components (latter doesn't exist); theme provider as world boundary; world transitions as theming events not component remounts
8. **Operational concerns** — Storybook hosting, visual regression, a11y regression, token build pipeline, lint rules, full a11y matrix orthogonality, motion defaults, character-set surprises, backup/recovery
9. **Open spec questions** — kept

**Sections deliberately not included** (vs other templates):
- No "Authentication & authorization" section — the design system doesn't enforce auth; consumers do. Auth-aware components express auth-state-as-prop in §L3.
- No "Storage & schema" section — the design system owns no tables. Tokens live in JSON, components in code, patterns in docs. Folded into §3 Distribution.
- No "Lifecycle commitment" section — the design-system "lifecycle" is a versioning lifecycle, folded into §4. Not a content-creation lifecycle like studios have.
- No "Internal dependencies" section — design system has no internal areas (it's one entity, not four areas with a chain like Platform Core).
- No "Target Domain Service contract" — design system targets no Domain Service. The inverse property is named in §2 instead.

**L3 modifications vs `studio-specification.md` and `platform-core-spec.md`:**
- L3 framing introduces the **vocabulary-inventory** variant explicitly with cross-reference to G-26 (now closed)
- Three sub-inventories (Tokens / Components / Patterns) with distinct attribute shapes:
  - Tokens: kind / themability (per-world, per-mode, fixed) / default value / used by / vertical impact
  - Components: props/variants / a11y posture / i18n posture / consumer expectations / vertical impact
  - Patterns: components used / when to use / when NOT to use / vertical impact (the load-bearing pair is *when to use / when not to use* — a pattern without a "when not to use" is incomplete)
- Shared Dependency-chain block: tokens → components → patterns (token feature must reach 4-ready before consuming-component feature, etc.)
- Shared External-dependencies block: deliberately thin allowed list (web platform standards, WCAG 2.1 AA, Unicode/font specs, Verticals); explicit disallowed list (Domain Services, Platform Core, Products, Studios) — same anti-pattern-catch as the platform-core template

**L4 modifications vs `studio-specification.md`:**
- L4 summary table gains an "Item kind" column (token / component / pattern) so the layering from §L3 stays visible at L4
- "Capabilities without specs" → "Vocabulary items without specs" — terminology adjusted for the variant
- "Features without capabilities" → "Features without vocabulary items" — same

**Frontmatter additions vs other templates:**
- `slug: design-system` — single tier, no per-area slugs unlike platform-core
- `tier: Surfaces` — same as products and studios
- `tags: [design-system]` — no slug-suffix because there's only one design system
- `consumers: [products/hub, products/gimbal, products/game, studios/journey-studio, studios/universe-studio, studios/arc-studio]` — closed at the Surface tier; no platform/domain or platform/core consumers per Stefan Q3
- `feature_prefix: DS` — matches the `DS` prefix locked in tier rules

**Index updates: `docs/templates/README.md`.** New file added to the tree diagram and to the index table, both placed between `studio-specification.md` and `vertical-spec.md` to keep the Ecosystem+Architecture grouping ordered. Tree entry: `design-system-specification.md  ← design-system tier specification`. Index row: routes to `../design-system/SPECIFICATION.md`.

**Cleanup landed: `docs/design-system/README.md`.** Expanded from a single-paragraph stub to include a Structure (when active) section, an Authoring section, and a Related section. The Structure section pre-commits to `SPECIFICATION.md` + `features/` per the locked vertical pattern; the Authoring section points at the new template; the Related section names consumers and binding ADRs. Mirror of the `core/README.md` cleanup landed in the A.3-author session.

**G-26 closure landed in three places:**
1. `.claude/skills/ecosystem-decomposition/SKILL.md` — Level 3 section header retitled "Capabilities (or obligations, or vocabulary — see L3 content-type variants below)"; activity framing widened from "capability space" to "inventory at L3"; new **L3 content-type variants** subsection with a table mapping each variant (capability / obligation / vocabulary) to the entity kinds that use it and to the templates that embody it; closing note states G-26 is closed by this section. References section expanded to cover all four spec templates plus vertical template.
2. `docs/ecosystem/how-we-work/gaps.md` — G-26 row removed from quick index; G-26 sub-section header and prose entry removed; G-26 removed from Low priority list; status count updated from twenty-six to twenty-five; originating-sources line acknowledges that G-26 was added in the A.1+A.2 decisions bridge and closed in this bridge.
3. `docs/templates/design-system-specification.md` itself — the design-system-tier note in the template header explicitly cross-references G-26 and the three L3 content-type variants tracked in the gaps register.

**No other repo edits.** No SPECIFICATION.md authored for the design system (that's a future per-tier session, not template-authoring); no `design-system/CLAUDE.md` changes (the cosmology-drift correction is flagged, not seized — see findings below); no other skill or chapter changes.

---

## Drift check finding

Pattern from prior bridges (structural sessions generating more gaps than they close): **first net-negative session in the streak, and the largest negative delta the streak has seen.**

- **Net gap change: −2** (G-26 and G-24 both closed; none added).
- **Decisions advanced:** zero new — authoring session executing prior decisions, plus two in-session judgement calls (§7 split, G-26 bundling) flagged transparently but not promoted to structural decisions, plus one substantive correction (Three Worlds cosmology) that's a finding for a follow-up session rather than a decision in this one. Plus one in-session decision (G-24 closure) made by Stefan after the initial bridge was written.
- **Today's session count:** fifteenth consecutive structural session. Sixth bridge dated 2026-04-26. **Block A complete.**
- **Block B start estimate (revised):** prior bridge said session-15-or-16. This is session-15. **Block B can start in the next session.** With G-24 and G-26 both closed in this session, no bookkeeping carries forward. The cosmology-drift sweep remains deferred per Stefan's instruction ("three worlds is enough as we probably need more time to think this through").

**Five consecutive sessions where the gap-pattern paused or improved.** All five pause-or-improve sessions were either decision-only (A.1+A.2, A.3) or authoring-of-decisions-already-made (A.1-author, A.3-author, A.2-author). The pattern's original observation was about *fresh structural design* sessions, which we haven't run since 2026-04-22 (the decomposition skill refactor) and 2026-04-24 (the L2 compliance audit, which surfaced G-23 through G-25). **Block B will be the real test** — it's the first session in the streak where concrete features force the structural system to meet real instances. Until that happens, the drift-check stays an open question rather than a closed one. The honest read remains: **don't claim the pattern is broken until Block B starts.** A net-negative session is encouraging but not yet conclusive.

---

## The forward agenda

### Block A status — ALL THREE TEMPLATES AUTHORED. BLOCK A COMPLETE.

| Sub-block | Status | Next |
|---|---|---|
| A.1 Studio template | Authored 2026-04-26: `docs/templates/studio-specification.md` | (no further authoring work) |
| A.2 Design System template | **Authored 2026-04-26 (this session): `docs/templates/design-system-specification.md`** | (no further authoring work; G-26 closed in same session) |
| A.3 Platform Core template | Authored 2026-04-26: `docs/templates/platform-core-spec.md` | (no further authoring work) |

Path B sequence completed: **A.1 → A.3 → A.2 (this session).**

### Recommended next-in-sequence: Block B start

With Block A complete and both G-24 and G-26 closed in this session, no bookkeeping carries forward. **The next session opens Block B: Vision → Task vertical exercise for one chosen entity.** Block B entity choice is open and unconstrained — any of the six entity kinds (product / studio / domain service / Platform Core area / vertical / design system) is now a candidate.

The cosmology-drift sweep remains deferred per Stefan's instruction (the Three Worlds question needs more thinking-through time before being canonised across the codebase). If Block B's entity choice is design-system or studios, the drift may bite during the walk and force an in-session decision; if Block B's entity choice is anywhere else, the drift stays parked harmlessly. **Recommendation:** if Block B's entity choice would surface the cosmology drift, surface it as an open question rather than fixing it inline — the deliberate-sweep discipline still applies.

### Block B entity choice (still open)

The prior bridges have flagged Block B entity choice as upstream of any further sequencing. With Block A complete, the choice is fully unconstrained. Sequencing for Block B is its own decision and not pre-committed by this bridge.

### Then Block C

High-priority gap resolution: G-03, G-05, G-06, G-12. Sequencing informed by which gap bites hardest during Block B. **Unchanged from prior bridges.**

---

## Open questions surfaced

- **Cosmology drift correction (deferred per Stefan's call).** The Three Worlds are Ordinary World, FringeIsland, the Void — not "Ordinary World, Other Side, Safe Harbour" or any other naming. The drift exists in `design-system/CLAUDE.md` (line about *"Ordinary World / Other Side / Safe Harbour affect mood, motion, and atmosphere"*) and likely in `studios/CLAUDE.md` and other places. Stefan's call: **leave this for now — "three worlds is enough as we probably need more time to think this through."** The deferral is principled, not procrastination: correcting names is one move; thinking through what each world *is* and what it should mean for visual language is a different and larger move. Parking it until the cosmology question itself is settled is the safer call. **Watch-point:** if Block B's entity choice is design-system or studios, the drift may surface during the walk — surface as an open question rather than fixing inline.
- **No new structural questions** beyond the cosmology one above.
- **Carried forward from earlier bridges** (resolved-by-this-session items removed):
  - PC-4 Governance L3 variant question — resolution from A.3-author bridge held; no new evidence either way in this session
  - The §6 Auth & authz judgement call from A.3-author — no new evidence either way

---

## Tensions and non-obvious insights

**The "authoring is mechanical" property generalises with one important asymmetry that's now visible.** A.1-author and A.3-author confirmed the property *for adaptation-with-scaffolding*. This session was the natural test for genuinely-new authoring. The property held — but only because elicitation was front-loaded into a single explicit step (the L2 section list proposal), not because it was unnecessary. **The honest framing:** for adaptation-with-scaffolding, mechanical authoring needs zero elicitation. For genuinely-new, mechanical authoring needs one front-loaded elicitation step. In both cases, no elicitation is needed *during* authoring — but the genuinely-new case has the front-loaded step that the adaptation case doesn't. If the next "genuinely new" session arises (no immediate candidate), the same discipline applies: propose the structure concretely as the elicitation step, get reactions, then author in one pass.

**The cosmology drift is the most important finding of the session, even though no edit captured it.** The fact that I had been carrying "Other Side / Safe Harbour" through multiple sessions, that the drift is encoded in `design-system/CLAUDE.md` itself, and that it almost certainly exists in `studios/CLAUDE.md` and elsewhere, is a reminder that authoritative-looking text in the codebase is not always actually authoritative. The discipline question this raises: **what process guarantees that locked cosmology stays locked across the codebase?** Currently nothing — `VISION.md` is the canonical authority, but no doc-health-check verifies that other files reference the locked cosmology consistently. A future gap entry might be "no cosmology-consistency check across the codebase." Not adding it today; flagging it as a candidate for later.

**The "make it impossible to express the wrong thing by accident" pattern continues to recur.** A.1-author surfaced it (studio template's §5 Target Domain Service contract). A.3-author applied it (platform-core template's §4 explicit "what this area does NOT depend on"). This session applied it twice: §2 Architecture position's explicit "what this tier does NOT depend on" subsection (no Domain Services, no Platform Core directly, no product-specific behaviour) and §L3's external-dependencies block with explicit *Allowed sources / Disallowed sources* lists. **Three sessions in a row, four applications.** The pattern is now sufficiently observed to consider promoting to a documented template-design principle in the `ecosystem-decomposition` skill — provisional name *load-bearing-rule-as-anti-pattern-catch*, suggested in the A.3-author bridge. Still don't promote yet; promote when Block B has produced evidence that the catches actually fire under real authoring pressure.

**The G-26 closure was small but the skill-edit shape is informative.** The skill previously framed L3 as "Capabilities" universally; the closure required widening that framing to acknowledge variant content types while preserving the existing capability-focused walkthrough as the running example. The edit shape (header retitle + new subsection + table + closing note) is a useful template for similar future skill edits where a previously-implicit-or-ignored variant becomes load-bearing — *don't rewrite the running example, add the variant table at the top of the section that frames it.* Worth preserving as a discipline if other skills accumulate similar variants.

**The per-entity README cleanup discipline is now a stable pattern.** A.3-author cleaned `core/README.md` in the same session as the platform-core template landed. This session cleaned `design-system/README.md` in the same session as the design-system template landed. Two sessions in a row, same discipline, same outcome — the README is consistent with the template the moment the template lands. The discipline is now strong enough to name explicitly in retrospectives or in the `ecosystem-decomposition` skill: **when a template lands that prescribes companion files for an entity, the entity's README is updated in the same commit to point at the template and to declare the companion structure.** Smaller cousin of G-21 (feature-inventory summary maintenance); worth raising at retro if the pattern continues holding.

**The gap-pattern reversal in this session is encouraging but inconclusive.** Net −2 (G-26 + G-24 both closed) is the first net-negative gap delta of the streak and the largest negative delta the streak has seen. But the same pause-streak caveat applies: every recent session has been execution-against-prior-decisions, not fresh structural design under pressure. The drift-check is *less open* than it was, but still open. Block B remains the test.

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** Block B start. Vision → Task vertical exercise for one chosen entity. Read first: this bridge, `2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` (Block A → B → C structure), the chosen entity's `DESCRIPTION.md` and tier `CLAUDE.md`, the relevant template, `docs/architecture/ECOSYSTEM_ANATOMY_V4.svg` + ADR-U023, and `docs/ecosystem/VISION.md`.

**Deferred this session (vertical-axis):**
- Cosmology-drift sweep across `design-system/CLAUDE.md`, `studios/CLAUDE.md`, and any other reference files — deferred per Stefan's call ("more time to think this through")
- Block B entity choice
- Block B Vision→Task full vertical walk
- First per-entity SPECIFICATION.md write under any of the three new templates (Block B candidate)
- G-23 — stale references audit (could be folded into the cosmology-drift sweep when that lands)
- G-25 — `_3.docx` regeneration plus closed-loop tooling gap

**Deferred from earlier sessions (carried forward, unchanged):**
- G-01 Whisp architectural placement
- G-02 cross-product feature sync
- G-03 vertical specs are scaffolds — **High** (will partially close if Block B picks a vertical)
- G-04 wave↔roadmap relationship
- G-05 review queue not operationalized — **High**
- G-06 multi-agent task locking — **High**
- G-07 Ferd DoD empty
- G-09 refinement ritual undocumented
- G-10 board mechanic unchosen
- G-11 TDD overstated vs risk-based
- G-12 G/W/T to test translation — **High**
- G-13 build hygiene unspecified
- G-14 discovery 0→2 flow orphaned
- G-15 cross-tier entry order
- G-16 skill chaining undocumented
- G-17 AGENTS.md precedence
- G-18 research pathway under-specified
- G-19 wave-planning skill structural review (horizontal-axis)
- G-20 reconciliation activity home
- G-21 feature-inventory summary maintenance discipline
- G-22 legacy absorb-and-delete discipline

**Closed this session:**
- G-26 — `ecosystem-decomposition` skill recognises only two L3 content-type variants. Closed by the skill update naming three variants (capability / obligation / vocabulary) with a mapping table to entity kinds and templates.
- G-24 — Missing SPECIFICATION templates for studios / Platform Core tiers / Design System. Closed after Block A's three authoring sessions completed across 2026-04-26 (`studio-specification.md`, `platform-core-spec.md`, `design-system-specification.md`). The gap's literal trigger — missing templates — is gone. Per-entity SPECIFICATION authoring is now a Block B concern, not a documentation gap.

**Out of scope per the same horizontal-axis guardrail used since 2026-04-22:**
- Wave scoping, wave progress, wave DoD
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

---

## Next session — orientation seed (not a prompt)

Per the principle locked in earlier 2026-04-26 sessions: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed.

**Orientation seed for the next session: Block B start.**

The next session opens Block B: Vision → Task vertical exercise for one chosen entity. Entity choice is the first decision of the session. Candidate entities: any of the six kinds (product / studio / domain service / Platform Core area / vertical / design system). Recommended sequencing: pick the entity, do an L2 walk first (does the entity's DESCRIPTION.md hold up under fresh derivation against the new template?), then L3 (does the new template's L3 inventory shape produce a clean inventory for this entity?), then L4 for one or two capabilities (do feature specs derive cleanly from the inventory?), then L5 for one feature at maturity 4-ready (does a task decomposition emerge?).

The session is the first concrete test of the L2/L3/L4 partition skeleton, the three L3 content-type variants, and the four spec templates against a real entity. Surface every friction point as a finding — Block B is also the moment the structural-work streak's drift-pattern actually gets tested.

**If the entity choice is design-system or studios**, expect to encounter the cosmology drift in the relevant tier `CLAUDE.md`. The discipline per Stefan's call: surface the drift as an open question and continue the walk — do *not* fix the cosmology inline. The cosmology question itself needs deliberate thinking-through time, not a side-effect fix during a vertical walk. If the entity choice is anything else, the drift stays parked harmlessly.

Read first, in order:
1. This bridge (orientation, including the cosmology-drift watch-point and the gap-pattern reversal).
2. `2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` — Block A → B → C structure.
3. The chosen entity's `DESCRIPTION.md`, tier `CLAUDE.md`, and any existing `SPECIFICATION.md` content.
4. The relevant template (`product-specification.md`, `studio-specification.md`, `platform-core-spec.md`, `design-system-specification.md`, `domain-service-spec.md`, or `vertical-spec.md`).
5. `docs/architecture/ECOSYSTEM_ANATOMY_V4.svg` and ADR-U023.
6. Vision: `docs/ecosystem/VISION.md`.

---

**One process refinement to internalise from this session.** The genuinely-new authoring case ran cleanly because elicitation was front-loaded into a single concrete proposal-and-react step before any file was written. That discipline is *different* from the adaptation cases (A.1, A.3) where no elicitation was needed at all. The pattern: **when authoring something that has no source template to adapt, propose the structure concretely as the elicitation step, get one round of reactions and corrections, then author in one mechanical pass**. The cost of skipping the elicitation step in a genuinely-new case is high (structural surprise during authoring forces backtrack); the cost of running the step in an adaptation case is low (Stefan reacts with "looks right, proceed"). Default to running the step; the cost of skipping when needed exceeds the cost of running when redundant.

**One discipline to keep watching.** This is the second consecutive session where a per-entity README was cleaned up in the same commit as the template that prescribed its structure. If a third session repeats the pattern, the discipline is stable enough to name explicitly in `ecosystem-decomposition` or in retrospectives. Not yet — wait for the next instance.

---

*Last updated 2026-04-26 at session close (sixth bridge of the day; final bridge of Block A). G-24 closure landed in-session after the initial bridge was written; bridge updated to reflect the post-hoc close.*
