# Session Bridge — Block A.1 Studio template authored

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-26
**Session type:** Vertical-axis work — Block A.1-author. Template-authoring session per the locked sequence (B: A.1 → A.3 → A.2) from the prior bridge of the same day.
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (none yet — files written via MCP, awaiting Stefan's commit pass)
- New file: `docs/templates/studio-specification.md`
- Modified: `docs/templates/README.md` (index entry + tree entry for the new template)

**Prior bridges in this 2026-04-26 chain (chronological):**
1. `2026-04-26_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` — locked Block A → Block B → Block C structure and decision-first sequencing.
2. `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md` — settled A.1 (Studio: adaptation) and A.2 (Design System: genuinely new). Added G-26.
3. `2026-04-26_-_BLOCK-A3-PLATFORM-CORE-TEMPLATE-DECISIONS.md` — settled A.3 with three sub-decisions (per-area unit, flat layout, PC-wide ROADMAP, adaptation template).
4. **This bridge** — A.1-author session: `studio-specification.md` written.

---

## Session summary

The session opened on Block A.1-author. Path B was locked at session start (author A.1 → A.3 → A.2 in three separate sessions), with a sub-decision to ship A.1 only and stop with a bridge. The reasoning: A.1 is the smallest-lift template (adaptation with the most direct parallels to `product-specification.md`), so it's the cleanest one to use as the empirical confirmation that "authoring is mechanical" before stacking the others. If A.1 surfaces a structural surprise, that surprise should drive a separate decision session before A.3 starts.

The authoring proceeded cleanly with no structural surprises. The L2/L3/L4 partition skeleton transferred from `product-specification.md` as expected. The L3 capability inventory variant transferred without modification (same content type as products and domain services per G-26's three-variant taxonomy). The L4 feature-inventory summary transferred without modification (same maintenance discipline tracked under G-21). The non-trivial adaptation work landed in L2, where three studio-specific load-bearing properties earned dedicated sections that don't exist in the product template: §3 Lifecycle commitment (the four-stage design/deploy/manage/retire cycle from `studios/CLAUDE.md`), §5 Target Domain Service contract (the "writes to exactly one DS" rule made spec-shaped), and §7 Constraints enforced on creator content (the "studios don't trust creator input" rule made spec-shaped). One product-template section was reframed: §6 Cross-product contracts became §8 Cross-studio contracts with the one-way reference rule made load-bearing.

The result: 10 L2 sections in `studio-specification.md` versus 8 in `product-specification.md`. The expansion is principled — every new section corresponds to a load-bearing property named in `docs/studios/CLAUDE.md` that doesn't apply at the products tier. None of the new sections breaks the L2 partition discipline (each one is entity-level identity / boundaries / technical shape, owned by L2, revised when the entity changes). The `doc-health-check` skill's section-boundary verification will work the same way it does for the product template.

A small cross-skill alignment landed implicitly: the L3 capability table picked up an additional **Lifecycle stage** column (design / deploy / manage / retire) so the four-stage commitment from §3 is visible at the capability level. A studio whose capabilities cluster on one or two stages is incomplete by design — surfacing that as a finding at L3 keeps the lifecycle-or-incomplete principle from CLAUDE.md visible during the actual capability decomposition. This is template-level discipline, not a skill change; it doesn't widen G-26.

The drift-check finding from prior bridges stays operative: today is the thirteenth consecutive structural session, and the gap-pattern (structural sessions generating more gaps than they close) did not operate today (zero gaps added, zero closed). Third consecutive session where the pattern paused. Still not enough data to conclude anything definitive — the pattern won't be confirmed broken until Block B starts and concrete features force the structural system to meet real instances. But three sessions of pause is more interesting than two.

The truthful framing remains: today's value is measured by whether `studio-specification.md` holds up under the eventual Block-B walk against a real studio entity, not by elegance in isolation.

---

## What was decided

No new architectural decisions. Authoring session — discharges the A.1-author commitment from prior bridges. The locked decisions being executed:
- A.1 template shape: adaptation of `product-specification.md` (locked 2026-04-26 morning bridge).
- L2/L3/L4 partition skeleton transfers (locked 2026-04-22 decomposition skill refactor).
- L3 content type: capability inventory (one of the three G-26 variants — same as products and domain services).

---

## What was produced

**New template authored: `docs/templates/studio-specification.md`.** Adaptation of `product-specification.md` with three studio-specific L2 sections added and one reframed. L3 capability inventory carries an additional Lifecycle stage column. L4 unchanged from the partition-skeleton baseline.

**L2 section list, final (10 sections):**
1. Surface — authoring/lifecycle surface for Dreamineers
2. Architecture position — with target Domain Service made load-bearing in the bullets
3. **Lifecycle commitment (NEW)** — four-stage table: design / deploy / manage / retire
4. Authentication & authorization — group-role-based creator status via `has_permission()`
5. **Target Domain Service contract (NEW)** — the "writes to exactly one DS" rule made spec-shaped (tables, write semantics, validation gate at publish, read scope, what the studio doesn't touch)
6. Data ownership — adapted with content-lifecycle state framing (draft / published / deprecated / archived / retired)
7. **Constraints enforced on creator content (NEW)** — World Model / cosmological canon / safety bar checks, with where each fires (save / publish / cross-reference / retirement) and what failure looks like
8. **Cross-studio contracts (REFRAMED)** — replaces product template's §6 Cross-product contracts. One-way reference rule made load-bearing. Specifically calls out Journey/Universe Studio not anticipating Arc Studio's contracts before Urd.
9. Operational concerns — adapted with draft-vs-published cache-invalidation callout, preview-PII-leak rule, content-lifecycle observability emphasis
10. Open spec questions — kept

**L3 modification:** capability table gains a **Lifecycle stage** column. Dependency-chain prose adapted to the typical studio order (design → deploy → manage → retire). External-dependency block names the four common source classes for studios (target DS, Platform Core, sibling studios with one-way reads only, verticals). Sources-status block unchanged.

**L4 unchanged.** Same maintenance discipline (G-21), same `doc-health-check` boundary, same Capabilities-without-specs and Features-without-capabilities subsections.

**Frontmatter additions vs `product-specification.md`:** `target_domain_service: {DS-1 World Model | DS-2 Narrative Engine | DS-3 Experience Engine}` — surfaces the single-target-DS rule at file head where it can't be missed.

**Index updates: `docs/templates/README.md`.** New file added to the tree diagram and to the index table. Tree entry: `studio-specification.md  ← inward-facing studio build spec`. Index row: routes to `../studios/{name}/SPECIFICATION.md`.

**No other repo edits.** No SPECIFICATION.md authored for any of the three studios (that's a future per-studio session, not template-authoring); no CLAUDE.md changes (template doesn't change tier-level rules — it encodes them); no skill changes (G-26 still waits for A.2-author since the new variant doesn't surface in A.1).

---

## Drift check finding

Pattern from prior bridges (structural sessions generating more gaps than they close) did not operate this session.

- **Net gap change:** 0 (none added, none closed).
- **Decisions advanced:** zero new — this was an authoring session executing prior decisions.
- **Today's session count:** thirteenth consecutive structural session. Fourth bridge dated 2026-04-26.
- **Block B start estimate (revised):** prior bridge said session-15-or-16 of structural-work streak. Current is session-13. With A.3-author and A.2-author still ahead and Block B entity choice still open, **session-15 minimum, session-17 plausible** depending on whether each authoring session runs in one go and whether Block B entity choice is taken in its own session or merged with one of the authoring sessions.

Three consecutive sessions where the gap-pattern paused. Worth noting: all three pause-sessions were either decision-only (A.1+A.2, A.3) or authoring of decisions already made (this one). The pattern's original observation was about *structural design* sessions — sessions where new entities or relationships were being shaped against the existing system. The recent pause may not be evidence the pattern is broken; it may be evidence we're in a window of execution-against-prior-decisions rather than fresh structural design. The honest read: **don't claim the pattern is broken until Block B starts and a fresh structural pressure (a real entity walk) tests the system.** Until then, the drift-check stays an open question rather than a closed one.

---

## The forward agenda

### Block A status — A.1 authored, A.3 and A.2 remain

| Sub-block | Status | Next |
|---|---|---|
| A.1 Studio template | **Authored 2026-04-26 (this session): `docs/templates/studio-specification.md`** | (no further authoring work) |
| A.2 Design System template shape | Decided 2026-04-26: genuinely new | A.2-author — to be authored after A.3 per Path B order |
| A.3 Platform Core template shape | Decided 2026-04-26: adaptation | **A.3-author — next-in-sequence per Path B** |

Path B sequence locked at session start: **A.1 (this session) → A.3 → A.2.**

### Recommended next-in-sequence: A.3-author

Author `docs/templates/platform-core-spec.md` per the decisions in `2026-04-26_-_BLOCK-A3-PLATFORM-CORE-TEMPLATE-DECISIONS.md`. Adaptation source: `domain-service-spec.md`. Provisional L2 reworks (per the A.3 decisions bridge):
- §1 Purpose — kept
- §2 Concepts — kept (entities the area owns, where persisted)
- §3 reframed: "Contract surface — what this area exposes and to whom" (Internal API consumed by Domain Services, with PC-1 Infrastructure as the special case exposing primitives consumed by every tier rather than a conventional API surface)
- §4 Internal dependencies — adapted with the strict PC-1 → PC-2 → PC-3 → PC-4 dependency rule made load-bearing as its own L2 statement
- §5 Extension points — drop or fold into Open questions (PC areas don't expose plugin contracts)
- §6 Storage & schema — kept, especially load-bearing for PC-1 Infrastructure
- **NEW §7: Stability posture** — Platform Core's "changes rarely" property per `platform/CLAUDE.md` and ADR-U023, expressed per area
- §8 Open questions — kept

L3 content type: capability inventory (no new variant — confirmed at decision time). L4 unchanged.

**Open question for A.3-author session:** the PC-4 Governance L3 variant question. PC-4 levies cross-area policy enforcement (audit, moderation rules other services obey). Surface-shape is capability-inventory; underneath it's obligation-flavoured. Provisional read at decision time was "stays as capability inventory, with policy-flavour expressed in the per-capability vertical-impact column." A.3-author session needs to test that read against PC-4's concrete capabilities. If a fourth L3 variant surfaces, G-26 widens to four variants and the `ecosystem-decomposition` skill update (still deferred to A.2-author) widens accordingly.

**Stale `core/README.md` cleanup:** The README currently says *"`SPECIFICATION.md` — overview spec (to be written)"* — superseded by Option 2 (four per-area specs, no PC-wide SPECIFICATION.md). Either clean up at A.3-author time or at first per-area SPECIFICATION.md write. No structural impact either way.

### Then A.2-author

Author `docs/templates/design-system-specification.md` per the decisions in `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md`. Genuinely new — the largest authoring lift. Three sub-inventories with different attribute shapes (tokens, components, patterns). L3 content type: vocabulary inventory (the third G-26 variant). After A.2 lands, update `ecosystem-decomposition` skill to acknowledge all three L3 content-type variants — closes G-26.

### Then Block B

Vision → Task vertical exercise. The load-bearing endpoint that all this template work is in service of. Block B entity choice is still open and remains upstream of any further sequencing decisions. With all three Block A templates authored, Block B can pick any entity it wants without being constrained by template-availability — that was the value of doing all three Block A authorings before Block B starts.

---

## Open questions surfaced

- **No new structural questions.** A.1-author ran cleanly without surfacing template-shape surprises.
- **One small studio-tier question** that the template encodes but doesn't resolve: the L3 Lifecycle stage column commits to "design / deploy / manage / retire" as the four canonical stages. The CLAUDE.md uses these four consistently. Worth flagging that if a future studio (or a future stage of Arc Studio) surfaces a fifth lifecycle concept that isn't cleanly in one of these four buckets, the template's column needs widening. Not a structural debt today — just a watch-point. Not added to the gaps register.
- **Carried forward from the A.3 decision bridge:** PC-4 Governance L3 variant question (resolved at A.3-author time); G-26 `ecosystem-decomposition` skill update (resolved at A.2-author time).

---

## Tensions and non-obvious insights

**The L2 expansion from 8 sections to 10 was load-bearing, not cosmetic.** The bridge that locked A.1 as "adaptation" specifically didn't say "minimal rename." The studios CLAUDE.md names three load-bearing properties — the four-stage lifecycle, the single-target-DS rule, the constraint-enforcement-on-creator-content rule — that don't apply at the products tier and aren't expressible cleanly inside an existing product-template section. The honest move was to give each its own L2 section. The risk of doing otherwise (folding them into existing sections) is that a studio author could omit them by accident — they'd be sentences inside larger sections rather than sections that have to be filled out. The dedicated-section discipline makes omission visible.

**The Lifecycle stage column at L3 is the most subtle move in the template.** It's not visible at first glance — it looks like a small column addition. But it makes "incomplete-by-design lifecycle coverage" detectable at the L3 inventory step, before any feature spec is written. A studio whose capability inventory clusters all on "design" and has nothing on "retire" has a structural problem that the template surfaces automatically. This is the same pattern as the §3 Lifecycle commitment table at L2 — making an incompleteness condition visible at the level it should be visible. If this pattern proves valuable in Block B, consider promoting it to a documented template-design principle: *load-bearing tier-level rules earn both an L2 section and an L3 column when they constrain capability shape.*

**The "structural surprise" prediction held.** Path B was locked with the explicit hypothesis that A.1 was the cleanest of the three, would author mechanically, and would set a template (no pun intended) for the harder two. That prediction held — A.1 took one straightforward authoring pass with no structural questions surfaced. This is a useful data point: the L2/L3/L4 partition skeleton, plus a well-written tier `CLAUDE.md`, plus a parallel template to adapt from, is enough scaffolding for adaptation-style template authoring to run mechanically. A.3 has a similar setup (adaptation from `domain-service-spec.md`, well-written `platform/CLAUDE.md`); A.2 doesn't (genuinely new, no parallel to adapt from). The risk-ranking from the prior bridges holds: A.2 is the session most likely to surface a structural surprise.

**The `core/README.md` and `journey-studio/README.md` stale pre-commitments are the same pattern.** Both contain "(to be written)" lines that need cleanup at the corresponding SPECIFICATION.md authoring time. There's a pattern emerging: every entity README that names companion files in advance creates a small piece of documentation drift. Worth watching for during Block B — when a real SPECIFICATION.md lands for a studio or PC area, the per-entity README needs a parallel update. This is a smaller cousin of G-21 (feature-inventory summary maintenance) and possibly belongs in the same maintenance discipline. Not flagged as a gap yet because the pattern's only got two instances and neither is causing harm.

**The session ran in one pass without elicitation rounds.** Compared to the prior decision sessions (which had multiple option-presentation rounds), this authoring session went directly from prior-bridge orientation to file authoring to bridge writing in one continuous arc. That's the "authoring is mechanical" property doing real work — when the decisions are locked and the source template plus the tier CLAUDE.md provide enough material, no fresh elicitation is required. This is a useful confirmation for A.3-author: if the same property holds (it should, given the parallel setup), A.3 should also run as a single mechanical pass.

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** A.3-author session — `docs/templates/platform-core-spec.md`. Read first: this bridge, `2026-04-26_-_BLOCK-A3-PLATFORM-CORE-TEMPLATE-DECISIONS.md`, `docs/templates/domain-service-spec.md` (adaptation source), `docs/platform/CLAUDE.md` (tier-level rules to encode), `docs/platform/core/README.md` (the area structure).

**Deferred this session (vertical-axis):**
- A.3-author — `docs/templates/platform-core-spec.md`
- A.2-author — `docs/templates/design-system-specification.md`
- Block B entity choice
- Block B Vision→Task full vertical walk
- `core/README.md` cleanup (deferred to A.3-author or first PC area SPECIFICATION.md write)
- `journey-studio/README.md` cleanup of "(to be written)" line for SPECIFICATION.md (deferred to first studio SPECIFICATION.md authoring)
- G-23 — stale references audit
- G-25 — `_3.docx` regeneration plus closed-loop tooling gap
- G-26 — `ecosystem-decomposition` skill update; remains deferred until A.2-author

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

Per the principle locked in earlier 2026-04-26 sessions: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed.

**Orientation seed for A.3-author:**

The next session is A.3-author — write `docs/templates/platform-core-spec.md`. The setup parallels A.1-author closely (adaptation, well-written tier CLAUDE.md, source template available), so the session should run mechanically in one pass like this one did. The single watch-point is the PC-4 Governance L3 variant question: when populating the L3 section's framing, briefly check whether PC-4's likely capabilities (audit, moderation rules other services obey, policy enforcement) sit cleanly inside the capability-inventory variant, or whether they suggest a fourth variant is genuinely needed. The provisional read is "stays as capability inventory, with policy-flavour expressed in the vertical-impact column" — confirm or deny in the template framing.

Read first, in order:
1. This bridge (orientation, including the L2 expansion pattern).
2. `2026-04-26_-_BLOCK-A3-PLATFORM-CORE-TEMPLATE-DECISIONS.md` (the locked decisions and the provisional L2 reworks).
3. `docs/templates/domain-service-spec.md` (adaptation source).
4. `docs/platform/CLAUDE.md` (tier-level rules to encode in the template — particularly "Platform Core changes are rare by design" which becomes §7 Stability posture).
5. `docs/platform/core/README.md` (current area structure; check the stale pre-commitment).
6. `docs/architecture/ECOSYSTEM_ANATOMY_V4.svg` (the canonical anatomy — confirm PC-1/PC-2/PC-3/PC-4 boundaries before authoring).

Output: new file `docs/templates/platform-core-spec.md`; updated `docs/templates/README.md` with new index entry. Optionally, clean `docs/platform/core/README.md` if the stale pre-commitment is in scope. Bridge at session close.

**One process refinement to internalise from this session.** The A.1 authoring ran without elicitation. That's the right behaviour for a locked-decisions authoring session — but it's only the right behaviour because the decisions were genuinely locked and the source material was sufficient. If A.3-author hits a moment where the provisional L2 reworks don't actually fit (e.g., the Stability-posture section can't be cleanly populated for PC-1 because PC-1's stability looks different from PC-2/PC-3/PC-4), pause and surface the question rather than authoring through it. The "authoring is mechanical" property is a property of the setup, not a license to never check.

---

*Last updated 2026-04-26 at session close (fourth bridge of the day).*
