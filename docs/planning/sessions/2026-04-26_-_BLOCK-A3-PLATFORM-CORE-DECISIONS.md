# Session Bridge — Block A.3 Platform Core template-shape decisions

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-26
**Session type:** Vertical-axis work — Block A.3 of the forward agenda. Decision-only session per the locked option (c) from the prior bridges.
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (none — no edits applied to repo this session beyond writing this bridge; `core/README.md` update deferred to authoring session)

**Prior bridges in this 2026-04-26 chain (chronological):**
1. `2026-04-26_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` — locked the Block A → Block B → Block C structure and the decision-first sequencing.
2. `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md` — settled A.1 (Studio: adaptation) and A.2 (Design System: genuinely new). Added G-26 to the gaps register.
3. **This bridge** — settles A.3 (Platform Core: adaptation, with three sub-decisions).

---

## Session summary

The session opened on Block A.3 — settling the Platform Core SPECIFICATION template shape question, the last remaining decision in Block A. The prior bridge had flagged A.3 as structurally different from A.1 and A.2 because it has a *prior question*: before any template-shape question can be answered, the unit-of-decomposition question must be settled. Specifically: is the unit a Platform Core *tier* (one SPECIFICATION.md covering all of PC-1 → PC-4), or is the unit a *capability area* (one SPECIFICATION.md per area)?

The session settled three decisions in priority order. (1) Unit of decomposition — Option 2: one SPECIFICATION.md per Platform Core area, mirroring the DS-1 through DS-7 pattern from Domain Services. The choice was reinforced by evidence from the 2026-04-24 L2 compliance audit, which had implicitly already counted the four PC areas as four entities (rather than as one tier-level entity), making this decision a confirmation of an existing implicit assumption. (2) Two sub-questions that fell out of unit-of-decomposition: directory structure (flat layout under `docs/platform/core/`, mirroring the intended PD precedent) and ROADMAP.md placement (one PC-wide ROADMAP.md, on the reasoning that roadmaps describe delivery sequencing which often crosses areas). (3) Template shape — Option 2: adaptation, new file `docs/templates/platform-core-spec.md`. The reasoning: the L3 content type stays as capability inventory (no new variant emerges, G-26's three variants stay at three), but L2 sections diverge substantially because PC's contract surface (Internal API consumed by Domain Services, near-zero internal dependencies, no extension points) is materially different from a Domain Service's contract surface.

A small process improvement landed mid-session: Stefan flagged a preference for "Option 1 / Option 2 / Option 3" labelling instead of Greek letters (α/β/γ) for option enumeration. Committed to memory. The session closed with all three sub-questions of Block A.3 settled and Block A's decision phase complete. The forward path is now three template-authoring sessions (in any order) followed by Block B — the Vision→Task vertical exercise that all this template work is in service of.

The drift-check finding from prior bridges stays operative: today is the twelfth consecutive structural session, and the pattern of "structural sessions generating more gaps than they close" did not operate today (zero gaps added, zero closed). Second consecutive session where the pattern paused; not enough data to conclude anything from a sample of two, but worth tracking. The truthful framing remains that today's value is measured by how cleanly the decisions let Block B start, not by elegance in isolation.

---

## What was decided

**A.3 unit of decomposition: Option 2 — one SPECIFICATION.md per Platform Core area.** Four files to be authored over time, one per PC area: PC-1 Infrastructure, PC-2 Identity, PC-3 Organisation, PC-4 Governance. Mirrors the DS-1 through DS-7 pattern from Domain Services. Structurally aligned with the 2026-04-24 L2 compliance audit, which had already counted the four areas as four distinct entities. **Locked.**

**A.3 directory structure: flat layout, single shared `core/features/` directory.** Following the intended Domain Services precedent (one file per service, flat under `docs/platform/domain/`, single shared `domain/features/`). Concretely: `docs/platform/core/infrastructure-specification.md`, `docs/platform/core/identity-specification.md`, `docs/platform/core/organisation-specification.md`, `docs/platform/core/governance-specification.md`. Existing `core/features/` stays as a single shared directory; `FEAT-PC###` files are routed to whichever area owns the capability via the spec's L4 feature-inventory summary. **Locked.**

**A.3 ROADMAP.md placement: one PC-wide `docs/platform/core/ROADMAP.md`.** Roadmaps describe delivery sequencing — features pair across areas in a wave (an Auth feature alongside a Groups feature; an Infrastructure RLS-posture change alongside an Identity migration). Splitting roadmaps four ways would fragment the planning view without clear benefit. SPECIFICATION.md and ROADMAP.md serve different purposes; symmetric file layout isn't the right prior. The PC-wide ROADMAP.md sets a precedent for the Domain Services tier when its ROADMAP.md eventually gets written. **Locked.**

**A.3 template shape: Option 2 — adaptation.** New template file `docs/templates/platform-core-spec.md` to be authored in a separate session. L2/L3/L4 partition skeleton transfers from `domain-service-spec.md`. L3 content type stays as **capability inventory** (no new variant emerges; G-26's three variants — capability / obligation / vocabulary — stay at three). L2 sections substantially reworked to fit PC's distinct contract surface. **Locked.**

**Provisional L2 section reworks for the PC template** (to be confirmed at authoring time):
- §1 Purpose — kept; framed as "what this PC area is responsible for"
- §2 Concepts — kept (entities the area owns, where persisted)
- §3 reframed: "Contract surface — what this area exposes and to whom" — replaces `domain-service-spec.md`'s §3 "Public contract (consumed by Surfaces)". PC areas expose their contracts via the **Internal API** (consumed by Domain Services), not the Platform API. PC-1 Infrastructure is the special case — it exposes primitives (RLS helpers, `has_permission()`, feature-flag API) consumed by every tier, not a conventional API surface.
- §4 Internal dependencies — adapted with the explicit upward-only PC dependency rule made load-bearing: PC-1 → PC-2 → PC-3 → PC-4, strictly. Tighter than at Domain Services and worth surfacing as its own L2 statement rather than a generic field.
- §5 Extension points — drop or fold into Open questions. The Extension System is a Domain Services concept; PC areas don't expose plugin contracts.
- §6 Storage & schema — kept, especially load-bearing for PC-1 Infrastructure (RLS posture, migration discipline, trigger-based validation patterns from `platform/CLAUDE.md`).
- **NEW §7: Stability posture** — Platform Core's "changes rarely" property is load-bearing per `platform/CLAUDE.md` ("Platform Core changes are rare by design") and ADR-U023 (Core is the highest-blast-radius layer). This deserves its own L2 section per area: how rare is "rarely" *for this area*, what triggers a change, what review escalation looks like. Not a generic field — different per area (Infrastructure changes are wave-boundary events; Governance changes are ADR-required).
- §8 Open questions — kept.

**A.3 open questions deferred to authoring session:**
- **PC-4 Governance L3 variant question.** PC-4 levies cross-area policy enforcement — audit, moderation rules other services obey. This is capability-inventory-shaped on the surface but obligation-inventory-flavoured underneath. Authoring session needs to test whether PC-4 fits the standard capability inventory or whether it surfaces a fourth L3 variant (capability / obligation / vocabulary / **policy**?). If a fourth variant emerges, G-26's eventual skill update widens accordingly. Provisional read: stays as capability inventory, with policy-flavour expressed in the per-capability vertical-impact column. To be confirmed at authoring time against PC-4's concrete capabilities.
- **Stale `core/README.md` pre-commitment cleanup.** `docs/platform/core/README.md` currently says *"`SPECIFICATION.md` — overview spec (to be written)"* and *"`ROADMAP.md` — Platform Core slice of NOW/NEXT/LATER (to be written)"*. The first line is now superseded by Option 2 (four per-area specs, no PC-wide SPECIFICATION.md). The second line is consistent with the locked decision. Either clean up at template-authoring time or at first per-area SPECIFICATION.md write. No structural impact either way; flagged so it doesn't drift.

**Process preference: Option labels.** Stefan flagged a preference for "Option 1 / Option 2 / Option 3" instead of Greek letters (α/β/γ) for option enumeration. Committed to memory; future sessions use this labelling consistently.

---

## What was produced

**Decisions captured (this bridge).** A.3 settled with three sub-decisions named.

**Memory edit applied.** Option-labelling preference committed via `memory_user_edits`.

**Session artifact.** This bridge.

**No repo edits.** No files written, no `core/README.md` update applied. The README cleanup is deferred to template-authoring time; nothing else needed file-level changes this session.

---

## Drift check finding — load-bearing for future sessions

The pattern from prior bridges (ten-then-eleven consecutive structural sessions generating more gaps than they close) did not operate this session.

- **Net gap change:** 0 (none added, none closed).
- **Decisions advanced:** all three sub-questions of A.3 in one session.
- **Today's session count:** twelfth consecutive structural session. Third bridge dated 2026-04-26 (verticals-migration this morning, A.1+A.2 mid-day, A.3 now).
- **Block B start estimate (revised):** prior bridge said session-17-or-18 of structural-work streak. With A.3 closing in one session instead of two-or-more, revised to **session-15-or-16** assuming each template-authoring session runs cleanly. Authoring is mechanical; that estimate should hold unless a template surfaces an unexpected structural question.

Second consecutive session where the gap-pattern paused. Not enough data to conclude anything from a sample of two — the pattern won't be confirmed broken until Block B starts and concrete features force the structural system to meet real instances. Worth keeping the question alive at every session boundary until that happens.

---

## The forward agenda

### Block A status — decision phase complete

| Sub-block | Status | Next |
|---|---|---|
| A.1 Studio template shape | **Decided 2026-04-26: adaptation** | Authoring session for `studio-specification.md` |
| A.2 Design System template shape | **Decided 2026-04-26: genuinely new** | Authoring session for `design-system-specification.md` |
| A.3 Platform Core unit + template shape + ROADMAP placement | **Decided 2026-04-26 (this session)** | Authoring session for `platform-core-spec.md` |

**Block A's decision phase is complete.** Three template-authoring sessions remain. They are independent of each other and can run in any order.

### Recommended next-in-sequence

Three template-authoring sessions to run before Block A is closed:

- **A.1-author** — `docs/templates/studio-specification.md`
- **A.2-author** — `docs/templates/design-system-specification.md`
- **A.3-author** — `docs/templates/platform-core-spec.md`

The natural order is whatever Block B will hit first. Block B is the Vision→Task vertical exercise — picking a single concrete entity and walking it from Vision through SPECIFICATION → capability inventory → feature spec → tasks. The entity choice for Block B determines which template gets exercised first, which means **the Block B entity choice is upstream of the template-authoring order.**

**My weak lean for Block-B-first authoring:** if Block B picks a **Studio** for the Vision→Task walk, author A.1 first. If Block B picks the **Design System**, author A.2 first. If Block B picks a **Platform Core area**, author A.3 first.

If the entity choice is still open at the next session, the recommended order in absence of a Block B prior is **A.1 (Studio) → A.3 (Platform Core) → A.2 (Design System)**. Reasoning: Studio is the smallest authoring lift (adaptation with the most direct parallels to product-specification.md); Platform Core is the medium lift (adaptation with section-level rework); Design System is the largest lift (genuinely new, three sub-inventories with different attribute shapes). Smallest-first lets the partition skeleton settle on familiar ground before the harder template runs. But this is a weak lean — Block B's entity choice should override it.

### Block B — Vision→Task full vertical exercise (the load-bearing endpoint)

**This is what all the template work is in service of.** The Block A templates exist so that Block B can run cleanly. Block B is a **Vision → ... → Task full ecosystem decomposition vertical exercise**: take one concrete entity, walk it through every level of the decomposition cascade, produce real artifacts at each level, and observe where the system holds and where it breaks.

The expected walk:
1. **Vision (L1)** — confirm the entity's place in the Vision and the ecosystem anatomy.
2. **DESCRIPTION.md** if the entity uses one (products, studios) — populate or confirm.
3. **SPECIFICATION.md L2** — author identity, boundaries, technical shape using the Block-A template authored for this entity kind.
4. **SPECIFICATION.md L3** — author the capability inventory (or vocabulary inventory for the Design System; or the obligation inventory if the chosen entity is a vertical) with vertical-impact column populated, dependency chain stated, sources-status block including any prerequisite-check pause remarks against G-03 (vertical specs are scaffolds).
5. **SPECIFICATION.md L4** — pick at least one capability and produce its feature-inventory summary entry plus a real `FEAT-{prefix}NNN.md` at maturity 0–2 to start.
6. **Maturity progression** — advance the chosen feature from 0 → 4-ready, exercising the Given/When/Then scenarios and the DoR check.
7. **Tasks** — break the maturity-4 feature into TASK-*.md items.
8. **Reconciliation** — run the inventory-against-existing-specs reconciliation (G-20) and, if any code exists for this entity's area, the spec-against-code reconciliation.

**What Block B is designed to surface:**
- Whether the locked L2/L3/L4 partition holds under real authorship friction.
- Which gaps from the gaps register *bite hardest* during a real walk (high-priority candidates: G-03 vertical scaffolds, G-05 review queue, G-06 multi-agent locking, G-12 G/W/T-to-test translation).
- Whether the templates we authored in Block A actually fit the entity they were designed for.
- Which skill-level mechanics (in `ecosystem-decomposition` and `feature-development`) need extending to support the chain end-to-end.

**Block B cannot start until at least one Block A template is authored.** It can start as soon as one is — provided the Block B entity choice matches that template's entity kind. If the entity choice is *Hub* (or another product), Block B can technically start right now since `product-specification.md` is already restructured — but that would skip the value of testing the freshly-authored templates against their target entities, which is a meaningful loss. **My lean is that Block B picks an entity from one of the three pending-authoring categories** (studio, Platform Core area, design system) so the template authoring and the vertical exercise reinforce each other.

### Block C — high-priority gap resolution

Unchanged from prior bridges. Sequencing informed by which gaps bite hardest during Block B. Top candidates:
- G-03 vertical specs are scaffolds — partially closes if Block B picks a vertical, more likely closes once a non-vertical Block-B walk produces concrete vertical-impact pressure.
- G-05 review queue not operationalized.
- G-06 multi-agent task locking.
- G-12 Given/When/Then to test translation.

Block C is on the other side of Block B and shouldn't be planned in detail until Block B has produced its findings.

---

## Open questions surfaced

- **Block B entity choice.** Carried forward as the next structural decision after template authoring (or before, if it's used to sequence the three authoring sessions). The choice determines authoring order.
- **PC-4 Governance L3 variant question** (named in §"What was decided"). Authoring-time question; not new structural debt, just flagged.
- **`core/README.md` cleanup timing** (named in §"What was decided"). Bookkeeping; not new structural debt.
- **G-26 timing unchanged.** The `ecosystem-decomposition` skill update for the third L3 variant (vocabulary) still waits for the design system template to be authored — A.2-author. If the PC-4 question above surfaces a fourth variant, G-26 widens at the same authoring point.

---

## Tensions and non-obvious insights

**The L2 audit had implicitly already decided the Platform Core unit-of-decomposition question.** The 2026-04-24 L2 compliance audit listed the four PC areas as four distinct entities side-by-side with the seven Domain Services — not as one tier-level entity. That was a structural assumption baked into the audit's matrix, but it was never explicitly *named* as a decision. Today's Option 2 lock confirms that implicit assumption rather than overriding it. Worth flagging as a pattern: structural assumptions sometimes get made implicitly in *audit* artifacts before they're made explicitly in *decision* artifacts. The danger is that an audit's implicit assumption could be wrong and harden silently. The discipline going forward: when an audit categorises entities, the categorisation is itself a structural claim and should be either grounded in a prior decision or flagged as an open question. The 2026-04-24 audit caught itself on this in its "Open questions surfaced" section ("Template coverage across entity types … then either (a) one of these two templates is reused for them, or (b) additional templates are needed") — which became G-24 and ultimately Block A. The system worked, but only because the audit's author was disciplined about flagging it.

**Three sub-decisions in one session is faster than the prior bridge's reference rate, but the right comparison isn't speed.** Yesterday's bridge anticipated 2–3 sessions for the three Block A shape decisions; we're at three sessions for *all six* sub-decisions across A.1, A.2, A.3 (A.1 plus A.2 plus three A.3 sub-decisions = six). The right framing isn't "decisions per session." It's whether the decisions hold under Block B friction. They will or they won't; we'll know during Block B. Tracking session-count is a process metric; tracking decision-durability under real walk is the outcome metric.

**The PC-1 → PC-4 dependency rule is *tighter* than the Domain Services dependency rule, and that's load-bearing.** Domain Services have a partial-order dependency graph (DS-1 World Model has fewer dependencies; DS-7 Intelligence has many, including transitive ones). Platform Core is a strict linear chain — PC-1 has zero internal dependencies (it *is* the foundation), PC-2 depends only on PC-1, PC-3 depends on PC-1 and PC-2, PC-4 depends on all three. This is meaningfully stricter than DS and deserves its own L2 statement in the template. The reason it matters: a PC-2 capability can't depend on a PC-3 capability, and the template should make that impossible to express by accident. Worth making explicit in the L2 §4 rework.

**The template-authoring sequencing question is genuinely downstream of Block B's entity choice, but the temptation will be to decide authoring order independently.** Watch for this drift in the next session. The honest thing is to either pick the Block B entity first (which makes authoring order obvious) or to acknowledge that we're picking authoring order under uncertainty and accept the cost. Picking authoring order *while pretending it's independent of Block B* is the worst of both worlds.

**The "Option 1 / Option 2 / Option 3" preference is a small example of a bigger pattern.** Greek letters were efficient in the moment but didn't account for the user's reading experience. Same root cause as the "use MCP tools directly without asking permission" preference from the A.1+A.2 bridge — defaulting to a habit that adds friction without value. The pattern to internalise: option labels, tool choice, and confirmation requests are all places where the cost of "the convenient default for me" can land on the user. Worth checking each before defaulting to a habit.

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** Either (a) Block B entity choice followed by the matching authoring session, or (b) one of the three Block A template-authoring sessions (preferred order in absence of a Block B prior: A.1 Studio → A.3 Platform Core → A.2 Design System). Read first: this bridge, the prior bridge (`2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md`), the verticals-migration bridge (`2026-04-26_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md`), and the existing template the new template is adapting from (e.g., `docs/templates/domain-service-spec.md` for A.3-author).

**Deferred this session (vertical-axis):**
- A.1-author — `docs/templates/studio-specification.md`
- A.2-author — `docs/templates/design-system-specification.md`
- A.3-author — `docs/templates/platform-core-spec.md`
- Block B entity choice
- Block B Vision→Task full vertical walk
- `core/README.md` cleanup of the stale single-SPECIFICATION.md pre-commitment
- G-23 — stale references audit
- G-25 — `_3.docx` regeneration plus closed-loop tooling gap
- G-26 — `ecosystem-decomposition` skill update; deferred until design system template is authored (A.2-author)

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

Per the principle locked in earlier 2026-04-26 sessions: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed. The next session's prompt should be authored fresh at session start.

**Orientation seed for whoever opens the next session:**

The next session enters one of two paths. Path A: pick the Block B entity (the entity that will be walked from Vision → Task in Block B), then author the matching Block A template first. Path B: defer the Block B entity choice and author one of the three Block A templates in the recommended order (A.1 Studio first, then A.3 Platform Core, then A.2 Design System). The honest answer is that Path A is better — the Block B entity choice is upstream of authoring order — but Path B is acceptable if there's a reason to delay the Block B entity decision.

If Path A: read this bridge §"Block B" first; then read VISION.md, the chosen entity's existing CLAUDE.md and any partial DESCRIPTION.md, ADR-U023 (the canonical anatomy), ADR-U002 (the five verticals), the gaps register entries that the entity is likely to brush against (G-03 if it touches verticals; G-12 if it goes deep into feature implementation; others as relevant); then read the matching Block A template's adaptation source (`product-specification.md` for A.1, `domain-service-spec.md` for A.3, neither for A.2 since it's genuinely new).

If Path B: read this bridge §"Recommended next-in-sequence" first; then read the matching Block A bridge (A.1 and A.2 in `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md`, A.3 in this bridge); then read the source template being adapted (where applicable). Author the new template file. Do NOT walk a real entity through it during the authoring session — authoring and walking are separate sessions.

In either path: the load-bearing endpoint is **Block B — the Vision→Task vertical exercise**. Every Block A authoring session is in service of Block B. If a Block A authoring session starts feeling like template-elegance work disconnected from "will this hold up under a real walk" — pause and refocus.

---

*Last updated 2026-04-26 at session close (third bridge of the day).*
