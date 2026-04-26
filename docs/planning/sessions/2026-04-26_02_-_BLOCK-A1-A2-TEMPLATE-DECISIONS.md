# Session Bridge — Block A.1 and A.2 template-shape decisions

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md` (date + 2-digit sequence within the day)
**Date:** 2026-04-26
**Session type:** Vertical-axis work — Block A.1 and A.2 of the forward agenda locked in the prior session bridge (`2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md`); decision-only sessions per option (c).
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (gaps register edit applied via MCP — G-26 added; not yet committed at session close)

---

## Session summary

The session opened on the next-in-sequence work named in the prior bridge: Block A.1 — settle the Studio SPECIFICATION template shape question (clone of `product-specification.md`, adaptation, or genuinely new). Decision-first per the locked option (c). After Stefan locked A.1, the session continued into A.2 — the Design System SPECIFICATION template shape question. Both decisions were settled in the same session because A.2 turned out to be tractable enough to handle without compromising the decision quality on either.

Two distinct decisions emerged. Studios got **adaptation** of `product-specification.md`: the L2/L3/L4 partition skeleton transfers cleanly, the L3 capability-inventory substance preserves cleanly, but the L2 sections require substantial section-level rework (5 of 8 sections change, 2 new sections added) to accommodate creator-facing content with full lifecycle, draft-vs-published, and one-Domain-Service constraints. Design system got **genuinely new** template: the L2/L3/L4 partition skeleton still transfers, but the L3 *content type* changes from capability inventory to **Vocabulary inventory** (tokens / components / patterns) — a structural inversion analogous to verticals' Obligation inventory. Three follow-up sub-decisions were locked for design system: three separate L3 sub-sections (one per kind: Token / Component / Pattern), single SPECIFICATION.md following the vertical pattern (no DESCRIPTION.md), and a new gap (G-26) added to the register flagging that the `ecosystem-decomposition` skill currently recognises only two L3 content-type variants and now needs to acknowledge a third.

The G-26 entry was applied directly to `docs/ecosystem/how-we-work/gaps.md` via MCP `edit_file` with dry-run discipline, in a single edit covering five surgical changes (status line update from "twenty-four" to "twenty-six", Quick index row added, prose entry added under a new "Decomposition cascade — skill mechanics" sub-section placed after G-25, Low priority list updated, last-updated line refreshed with this bridge as originating source). The session closed at this point — Block A.3 (Platform Core tier template shape) is deferred to its own session because the structural prior question ("is a tier the right unit of decomposition?") is genuinely unresolved and shouldn't be rushed.

The drift-check finding from the prior bridge stays relevant: this session is the eleventh consecutive structural session. Two clean decisions and a gap-register update are the right outcome — but the *value* of these decisions is measured by whether they let Block B (vertical Vision→Task proof) start cleanly, not by template-shape elegance in isolation. Both A.1 and A.2 still need authoring sessions before Block A is complete.

---

## What was decided

- **A.1 Studio SPECIFICATION template shape: adaptation.** New file `docs/templates/studio-specification.md` to be authored in a separate session. L2 sections substantially reworked from `product-specification.md`; L3 (capability inventory with vertical-impact column) and L4 (feature inventory summary, reconciliation pattern) structurally identical to the product template. DESCRIPTION.md stays separate — existing `studio-description.md` template covers it.

- **L2 section-level adaptations for the studio template** (provisional, to be confirmed at authoring time):
  - §1 Surface — kept, creator-facing framing
  - §2 Architecture position — adapted; **Target Domain Service** named as a load-bearing field (the one-DS constraint per `docs/studios/CLAUDE.md`)
  - §3 Authentication & authorization — Dreamineer permission model (group-role-based, granted/revoked per group; the studio asks `has_permission(...)`, doesn't compute creator status locally)
  - §4 Data ownership — split into **draft data** vs **published data** (different RLS, caching, Platform API behaviour)
  - §5 replaced with **Content lifecycle states** — draft / published / deprecated / archived / retired
  - §6 replaced with **Cross-studio content references** — the one-way reference rule (a journey reads a universe, not the reverse)
  - §7 Operational concerns — kept
  - §8 Open spec questions — kept
  - **NEW §9 Creator lifecycle** — design → deploy → manage → retire → handover/takeover (the full-lifecycle obligation gets its own L2 section because every feature must address it)
  - **NEW §10 Constraint enforcement** — what canon / World-Model / safety-bar constraints, enforced at which lifecycle transitions (save / publish / update)

- **A.1 open questions deferred to authoring session:**
  - Whether Universe Studio's Stålenhag-inspired multimedia content (2D/3D sketches, models, vignettes, mood boards, maps) needs a dedicated L2 section beyond what "Data ownership" + "Content lifecycle states" cover. Provisional read: no — the multimedia-ness is a property of the *content* the studio writes, not the *studio surface itself*. To be confirmed at authoring time against a concrete Universe Studio walkthrough.
  - Whether **Constraint enforcement** lives at L2 (structural identity claim) or L3 (per-capability concern). Provisionally placed at L2; authoring session can revisit.

- **A.2 Design System SPECIFICATION template shape: genuinely new.** New file `docs/templates/design-system-specification.md` to be authored in a separate session. The L2/L3/L4 partition skeleton transfers from the other templates, but L3's content type is **Vocabulary inventory** (tokens / components / patterns), not capability inventory. This is structurally analogous to how verticals use an Obligation inventory at L3.

- **A.2 sub-decision: three separate L3 sub-sections.** The Vocabulary inventory at L3 is authored as three sections — Token inventory, Component inventory, Pattern inventory — each with its own table and own attributes (tokens have themability, components have props/variants, patterns have when-to-use guidance). Not one unified table with a "kind" column. The three sub-inventories share a common Dependency chain and Sources-status block.

- **A.2 sub-decision: single SPECIFICATION.md (vertical pattern).** Design system follows the vertical file shape: no DESCRIPTION.md, no separate ROADMAP.md (until/unless one becomes warranted). One `docs/design-system/SPECIFICATION.md` folds L2 (identity, distribution mechanism, versioning policy, constraints, cross-surface contracts, operational concerns, open questions) and L3 (vocabulary inventory) into a single file. L4 (feature inventory summary) is appended in the same file. The directory will eventually contain `SPECIFICATION.md` + `features/`.

- **A.2 sub-decision: G-26 added to gaps register.** The `ecosystem-decomposition` skill currently names two L3 content-type variants (capability / obligation). With this decision, three exist (capability / obligation / vocabulary). G-26 captures the skill-update need; priority **Low** because the documentation system already encodes the variant via the new template — the skill update is for clarity and contributor onboarding, not correctness. Best handled when the design system template is actually authored.

- **L2 sections expected for the design system template** (provisional, to be confirmed at authoring time):
  - §1 What it is (and what it isn't — explicitly not Hub UI library, not Three Worlds aesthetic per-product)
  - §2 Architecture position — Surfaces tier; consumed by all surfaces; no domain services consumed; no Platform Core capabilities consumed (the only entity with that property — say so)
  - §3 Distribution mechanism — npm package / monorepo package / token JSON / Storybook URL; versioning scheme; release cadence
  - §4 Versioning and stability policy — additive-over-breaking rule; breaking-change ADR requirement; deprecation lifecycle; migration story discipline
  - §5 Constraints — i18n (ADR-U013), a11y (WCAG 2.1 AA, ADR-U013), tokens-over-hardcoded-values, no-product-specific-behaviour, three-worlds-inform-not-three-systems
  - §6 Cross-surface contracts — what consumers commit to (using DS components/tokens, not bespoke); what DS commits to (stability of published surface)
  - §7 Operational concerns — Storybook hosting, visual regression testing, token build pipeline, linting
  - §8 Open spec questions

- **A.3 deferred to its own session.** Platform Core tier template shape was not addressed. The prior bridge flagged that A.3 has a structural prior question ("is a tier the right unit of decomposition, or should each capability under a tier be specified individually?") that needs settling before any template-shape question can be answered cleanly. Closing here with two clean decisions is the right call; rushing A.3 at session-end would not be.

- **Working preference noted in memory:** for FringeIsland repo work, Claude uses MCP tools (`fringeisland:edit_file`, `fringeisland:write_file`, `fringeisland:read_text_file`) directly without asking permission or offering options. Dry-run discipline still applies for destructive edits to existing files; new-file writes don't need a dry-run.

---

## What was produced

**Decisions captured (this bridge).** A.1 and A.2 locked with sub-decisions named.

**G-26 added to gaps register (one MCP edit applied).** `docs/ecosystem/how-we-work/gaps.md` updated with five surgical changes:
- Status string: "twenty-four" → "twenty-six"; date: 2026-04-24 → 2026-04-26
- Quick index: G-26 row appended after G-25
- Prose section: new sub-section "Decomposition cascade — skill mechanics" added after G-25's "Documentation tooling (cross-cut)" section, containing the G-26 entry and proposed fix
- Low priority list: G-26 appended
- Last-updated footer: date refreshed; this bridge added as originating source for G-26

**Session artifact.** This bridge.

---

## Drift check finding — load-bearing for future sessions

The prior bridge (2026-04-26 verticals migration) named the meta-pattern: ten consecutive structural sessions had generated more structural gaps than they had closed. Today is the eleventh structural session. The honest read on today's outcome:

- **Net gap change:** +1 (G-26 added; nothing closed).
- **Decisions advanced:** A.1 and A.2 of the three-part Block A.
- **Authoring still required:** both A.1 and A.2 templates need to be written before Block A is complete.
- **Block B (vertical Vision→Task proof) still has not started.** It still cannot start until at least Block A is complete, because Block B may need a studio or design system spec mid-walk.

The pattern is not getting worse, but it is not yet breaking. Two decisions in one session is faster than the prior bridge anticipated (it allotted 2–3 sessions for the three shape decisions alone). If A.3 takes one session for the structural prior question + decision, and authoring takes one session per template (three templates), Block A could close in five further sessions. That puts Block B start at session-17-or-18 of the structural-work streak.

The truthful framing remains: today's value is measured by how cleanly it lets Block B start, not by elegance in isolation. The decisions made today should hold up under Block B friction; if they don't, the friction will surface as concrete gap entries. That's informative, not failure.

---

## The forward agenda

The prior bridge laid out Block A → Block B → Block C maintenance. Today addressed the first two of three sub-blocks in Block A.

### Updated Block A status

| Sub-block | Status | Next |
|---|---|---|
| A.1 Studio template shape | **Decided: adaptation** | Authoring session for `studio-specification.md` |
| A.2 Design System template shape | **Decided: genuinely new** | Authoring session for `design-system-specification.md` |
| A.3 Platform Core tier template shape | Pending | Decision session (with the structural prior question — "is a tier the right unit of decomposition?") |

### Recommended next-in-sequence

The prior bridge recommended Studio → Design System → Platform Core for decision ordering. With A.1 and A.2 decided, the natural next-in-sequence is **A.3 Platform Core tier shape decision**.

A.3 is structurally different from A.1 and A.2. The studio and design-system decisions were template-shape questions — *given that we're authoring a SPECIFICATION for this entity, what shape does it take?* A.3 has a prior question: **what is the entity?** Is it a tier (PC-1 Identity, PC-2 Organisation, PC-3 Infrastructure, PC-4 Governance), a capability under a tier (Auth, Profile, Sessions under Identity), or something else?

The session that takes A.3 should expect to spend most of its time on the unit-of-decomposition question, not on template-shape questions. The template-shape question only becomes meaningful once the unit is settled.

**Alternative path: author A.1 first.** The prior bridge's reasoning for decisions-first was "having all three shape decisions on the table together makes it easier to spot patterns." With A.1 and A.2 already decided, that argument loses some weight. Authoring `studio-specification.md` next would give a concrete reference for the eventual Platform Core decision, and it's the smallest authoring lift of the three. Either path is defensible.

My weak lean: **A.3 decision session next.** Reasoning: A.3 is the *only* remaining sub-decision in Block A; once it's settled, all three templates can be authored in any order. Authoring sessions are mechanical work; decision sessions need the structural thinking to happen. Front-loading the remaining decision keeps the authoring sessions clean and parallel-able.

### Block B (unchanged from prior bridge)

Vertical Vision→Task proof for one entity. Cannot start until Block A is complete.

### Block C (unchanged from prior bridge)

High-priority gap resolution: G-03, G-05, G-06, G-12. Sequencing informed by which gap bites hardest during Block B.

---

## Open questions surfaced

- **Two A.1 authoring-session questions** (named in §"What was decided" above): Universe Studio multimedia handling, and L2-vs-L3 placement of Constraint enforcement. Both are template-authoring concerns, not new structural questions.
- **A.2 has no open questions** beyond what's already in the Block A summary. The three sub-decisions closed the gap.
- **The Platform Core unit-of-decomposition question** (A.3 prior question). Carried forward unchanged.
- **G-26 timing.** When is the right time to update the `ecosystem-decomposition` skill to acknowledge the third L3 variant? The proposed fix says "when the design system template is actually authored." Worth flagging that this means the skill is *correct in intent but stale in detail* between now and that authoring session — anyone reading the skill in this window will not know about the vocabulary-inventory variant. Acceptable trade-off given the gap is Low priority and the new template will encode the variant directly, but worth being aware of.

---

## Tensions and non-obvious insights

**The L3 content-type variants pattern is now visible.** Three are now named: capability (products, studios, domain services), obligation (verticals), vocabulary (design system). The L2/L3/L4 partition *skeleton* is universal; only the content type at L3 changes by entity kind. This is a load-bearing pattern that wasn't visible before today — it had to wait for a third instance to make the structure obvious. The pattern's existence justifies why "genuinely new" was the right answer for design system: the L3 substance shifts, which justifies a separate template even though the partition itself is shared. Worth surfacing in the eventual G-26 skill update as a *named pattern*, not just a list of variants.

**Two decisions in one session was the right call, but only because A.2 turned out tractable.** The prior bridge anticipated 2–3 sessions for the three shape decisions; we did two in one. The alignment was that A.1 turned out to be a clean adaptation question (no structural surprises), which left enough session budget for A.2. Had A.1 surfaced an unexpected complication, the right call would have been to close after A.1. Worth not over-generalising — "two decisions per session" is not a target, just what worked today.

**Stefan's working-preference instruction (use MCP tools directly, don't ask) corrects a real friction pattern.** I had been offering 2–3 options for routine repo edits where the tool choice was obvious. That pattern adds session friction without adding value — it's the moral equivalent of asking permission before performing each well-understood step. The corrected pattern is: use the most effective tool, apply dry-run discipline for destructive edits to existing files, write directly for new files, and only surface options when there's a *genuine* trade-off worth a decision (e.g., the bridge approach for ambiguous content scope).

**Date-collision check.** Today (2026-04-26) is now the date on two distinct session bridges: the verticals-migration bridge written this morning, and this template-decisions bridge written at session close. Two bridges in one day is fine — the date prefix is for chronological ordering, not uniqueness — but worth noting in case the sessions README or `doc-health-check` ever assumes one-bridge-per-day. Currently no such assumption is enforced.

**The drift-check ritual stays valuable.** The prior bridge introduced "ask not just what we did but what hasn't moved" as a session-boundary check. Today's net-gap-change of +1 (one added, none closed) is a small but real data point: the meta-pattern of structural sessions generating more gaps than they close is *still operating*. The pattern won't break until Block B starts and concrete features force the structural system to meet real instances. Worth keeping the question alive at every session boundary until that happens.

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** Block A.3 — settle the Platform Core tier template shape question. Decision-first session with the structural prior question handled first ("is a tier the right unit of decomposition?"). Read first: this bridge, the prior bridge (`2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md`), `docs/platform/CLAUDE.md`, ADR-U023 (the canonical anatomy), and `ECOSYSTEM_ANATOMY_V4.svg`.

**Deferred this session (vertical-axis):**
- A.1 authoring session — `studio-specification.md`
- A.2 authoring session — `design-system-specification.md`
- A.3 decision session — Platform Core tier shape
- G-23 — stale references audit
- G-25 — `_3.docx` regeneration plus closed-loop tooling gap
- G-26 — `ecosystem-decomposition` skill update; deferred until design system template is authored

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

**Out of scope per the same horizontal-axis guardrail used since 2026-04-22:**
- Wave scoping, wave progress, wave DoD
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

---

## Next session — orientation seed (not a prompt)

Per the principle locked in the prior session: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed. The next session's prompt should be authored fresh at session start.

**Orientation seed for whoever opens the next session:**

The next session is Block A.3 — settle the Platform Core tier SPECIFICATION template shape question. Decision-first per the locked option (c). Two questions to answer in priority order: (1) is a Platform Core *tier* (PC-1 through PC-4) the right unit of decomposition for SPECIFICATION authorship, or is the unit a capability under a tier (e.g., Auth as a unit under PC-2 Identity)? (2) given the answer to (1), is the SPECIFICATION template a clone of `domain-service-spec.md`, an adaptation, or genuinely new?

Read this bridge §"Forward agenda — Recommended next-in-sequence" first; then read the prior bridge (`2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md`) §"Forward agenda — A.3 Platform Core tier SPECIFICATION template" for the prior context already pulled; then read `docs/platform/CLAUDE.md`, ADR-U023 (the canonical anatomy decision), and `docs/templates/domain-service-spec.md` for the existing closest-template comparison. Surface any prior session material on Platform Core decomposition via `conversation_search` if not already in context. Do NOT author any template in this session. Decision only.

If the session ends with both questions settled, the next bridge documents the decisions and points at authoring sessions as next-in-sequence (in any order). If the unit-of-decomposition question alone takes the full session, the bridge documents that decision and points at the template-shape question as next-in-sequence.

---

*Last updated 2026-04-26 at session close.*
