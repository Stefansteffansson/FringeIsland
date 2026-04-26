# Session Bridge — Block A.3 Platform Core template authored

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-26
**Session type:** Vertical-axis work — Block A.3-author. Template-authoring session per the locked sequence (B: A.1 → A.3 → A.2) from earlier bridges of the same day.
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (none yet — files written via MCP, awaiting Stefan's commit pass)
- New file: `docs/templates/platform-core-spec.md`
- Modified: `docs/templates/README.md` (index entry + tree entry for the new template)
- Modified: `docs/platform/core/README.md` (replaced stale single-SPECIFICATION.md pre-commitment with four per-area files; named the shared `features/` directory routing rule; pointer to the new template)

**Prior bridges in this 2026-04-26 chain (chronological):**
1. `2026-04-26_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` — locked Block A → Block B → Block C structure and decision-first sequencing.
2. `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md` — settled A.1 (Studio: adaptation) and A.2 (Design System: genuinely new). Added G-26.
3. `2026-04-26_-_BLOCK-A3-PLATFORM-CORE-DECISIONS.md` — settled A.3 with three sub-decisions (per-area unit, flat layout, PC-wide ROADMAP, adaptation template).
4. `2026-04-26_-_BLOCK-A1-AUTHOR-STUDIO-TEMPLATE.md` — A.1-author session: `studio-specification.md` written.
5. **This bridge** — A.3-author session: `platform-core-spec.md` written and `core/README.md` cleaned up.

---

## Session summary

The session opened on Block A.3-author. Path B was locked at session start (author A.1 → A.3 → A.2 in three separate sessions); A.1 had landed cleanly that morning, confirming the "authoring is mechanical" property when the source template, tier `CLAUDE.md`, and locked decisions are sufficient. A.3 had a parallel setup — adaptation from `domain-service-spec.md`, well-written `platform/CLAUDE.md`, and a comprehensive A.3 decisions bridge with provisional L2 reworks already named — so the prediction was that A.3 would also run as a single mechanical pass.

That prediction held. The L2/L3/L4 partition skeleton transferred from `domain-service-spec.md` as expected. The L3 capability inventory variant transferred without modification (G-26 stays at three variants). The L4 feature-inventory summary transferred with one addition: an explicit note about the shared `docs/platform/core/features/` directory and the L4-routes-to-owning-area rule, since that's a Platform Core-specific consequence of the locked flat layout that wouldn't be obvious from the partition skeleton alone.

The non-trivial adaptation work landed in L2, where three Platform Core-specific load-bearing properties earned dedicated treatment per the A.3 decisions bridge. §3 Public contract was reframed as **Contract surface — what this area exposes and to whom**, separating conventional API endpoints (the typical case for PC-2/3/4) from SQL helpers and primitives (the load-bearing case for PC-1) from schema-level contracts (the edge case where shared identity tables are read directly with RLS as the contract enforcement). PC-1 Infrastructure earned its own subsection within §3 because most of what it "exposes" is not a conventional API at all — it's a set of platform primitives consumed by every tier. §4 Internal dependencies was reframed as **strict upward-only chain** with the PC-1 → PC-2 → PC-3 → PC-4 rule lifted into a named L2 statement, an explicit ASCII-arrow diagram, a per-area "what this area depends on" table, and an explicit "what this area does NOT depend on" subsection. The "what this area does NOT depend on" subsection is the load-bearing move: the studio-template pattern from A.1-author of *making it impossible to express the wrong relationship by accident* applied to dependency direction. The previously-existing §5 Extension points was dropped per the bridge — Extension System is a Domain Services concept; PC areas don't expose plugin contracts. **NEW §7: Stability posture** landed as a per-area characterisation table — change cadence, what triggers a change, review escalation, the default answer to "we want to change this," and deprecation pathway. This is per area, not generic, since Infrastructure changes are wave-boundary events while Governance changes are ADR-required. The section ends with a DoR-relevant sentence: features that don't address stability posture fail DoR.

One section was not pre-named in the A.3 decisions bridge but earned its place during authoring: **§6 Authentication & authorization**. `domain-service-spec.md` doesn't have one, but `product-specification.md` and `studio-specification.md` both do, and `platform/CLAUDE.md` puts heavy emphasis on `has_permission()` and the per-area auth model. Dropping it would leave PC-2 Identity and PC-3 Organisation without a natural L2 home for their core subject matter. The judgement call was to add it; this is the one section that wasn't pre-locked in the decisions bridge and is flagged below as a watch-point for the first PC area SPECIFICATION.md walk.

The PC-4 Governance L3 variant question — flagged as an open question in the A.3 decisions bridge — was tested at the §L3 framing step and resolved per the provisional read. PC-4's policy-enforcement flavour is best surfaced in the per-capability vertical-impact column rather than introducing a fourth L3 variant. The template encodes this with a brief "Note on PC-4 Governance" subsection inside §L3 that explicitly says: do not introduce a fourth variant ad-hoc; if a future PC-4 walk shows the capability-inventory shape genuinely doesn't fit, surface as an open question against G-26. This keeps the three-variant lock stable while leaving the door open if Block B's PC-4 walk shows the shape failing.

The result: 8 L2 sections in `platform-core-spec.md` versus 7 in `domain-service-spec.md` and versus 10 in `studio-specification.md`. The expansion vs `domain-service-spec.md` is principled — every kept-or-added section corresponds to a property named in `docs/platform/CLAUDE.md` or in the A.3 decisions bridge as load-bearing. The smaller count vs `studio-specification.md` is also principled — Platform Core areas don't have the studio-tier lifecycle commitment, the single-target-DS contract, or the constraints-on-creator-content discipline. Different tiers, different load-bearing surfaces, different L2 partitions. The L2/L3/L4 partition skeleton holds across all four templates; only L2's content varies.

The `core/README.md` cleanup landed in the same session per the in-session decision. The stale "(to be written)" line for a PC-wide SPECIFICATION.md was replaced with four per-area `{area}-specification.md` lines, the shared `features/` directory was named with its L4 routing rule, the PC-wide ROADMAP.md commitment was retained (consistent with locked Option 2), and a pointer to the new template was added. This closes the bookkeeping item flagged in the A.3 decisions bridge.

---

## What was decided

No new architectural decisions. Authoring session — discharges the A.3-author commitment from the prior bridges. The locked decisions being executed:
- A.3 unit of decomposition: one SPECIFICATION.md per Platform Core area (locked 2026-04-26 A.3 decisions).
- A.3 directory structure: flat layout, single shared `core/features/`.
- A.3 ROADMAP.md placement: one PC-wide `docs/platform/core/ROADMAP.md`.
- A.3 template shape: adaptation of `domain-service-spec.md` (locked 2026-04-26 A.3 decisions).
- L2/L3/L4 partition skeleton transfers (locked 2026-04-22 decomposition skill refactor).
- L3 content type: capability inventory — same as products, studios, domain services.

**One small in-session judgement call**, flagged for transparency rather than as a new decision: §6 Authentication & authorization was added to the L2 list even though the A.3 decisions bridge didn't pre-name it. Reasoning is in §"Tensions and non-obvious insights" below; it's the natural watch-point for the first PC area SPECIFICATION.md walk.

---

## What was produced

**New template authored: `docs/templates/platform-core-spec.md`.** Adaptation of `domain-service-spec.md` with three load-bearing PC-specific reworks, one section dropped, one section added per `CLAUDE.md` emphasis. L3 capability inventory carries a PC-4 framing note. L4 carries a shared-`features/`-directory routing note.

**L2 section list, final (8 sections):**
1. Purpose — kept, framed as area responsibility, with explicit anti-pattern callout (FringeIsland-specific concepts belong in Domain Services, not here)
2. Concepts — kept, with explicit "Platform Core concepts are universal primitives, not domain entities" framing
3. **Contract surface — what this area exposes and to whom (REFRAMED)** — replaces `domain-service-spec.md`'s "Public contract (consumed by Surfaces)". Split into Surface shape (endpoints / SQL primitives / schema-level contracts), Operations (per-operation table), and a dedicated "Note on PC-1 Infrastructure" subsection because PC-1's contract is primitives rather than endpoints
4. **Internal dependencies — strict upward-only chain (REFRAMED)** — PC-1 → PC-2 → PC-3 → PC-4 rule lifted into named L2 statement with ASCII-arrow diagram, per-area upstream-consumption table, and explicit "what this area does NOT depend on" subsection (the structural-error catch)
5. Storage & schema — kept, expanded with PC-1-specific bullets (RLS posture per table, trigger-based validation patterns, SECURITY DEFINER discipline, migration ordering, PG17 RLS gotcha)
6. **Authentication & authorization (NEW vs `domain-service-spec.md`, judgement call)** — per-area description of how the area participates in the platform's auth and permission model
7. **Stability posture (NEW)** — per-area characterisation table: change cadence, what triggers a change, review escalation, default-answer-to-"we want to change this," deprecation pathway. Closes with DoR-relevant sentence
8. Open spec questions — kept

**Section dropped vs `domain-service-spec.md`:** §5 Extension points (per A.3 decisions bridge — not applicable to Platform Core).

**L3 modifications vs `domain-service-spec.md`:**
- Capability table column "Depends on (external)" renamed to "Depends on (external, upstream PC only)" — encodes the §4 chain at the table level
- New "Note on PC-4 Governance" subsection inside §L3 — provisional read locked: PC-4's policy-enforcement flavour expressed via Vertical impact column, not a fourth G-26 variant. Door left open if Block B's PC-4 walk shows the shape failing
- External dependencies prose adapted: explicit "Allowed sources" / "Disallowed sources" lists. Disallowed: Domain Services, Products, Studios, Design System (the inversion catch)

**L4 modification vs `domain-service-spec.md`:** new "Note on shared `features/` directory" preamble making explicit that the four PC areas share one `docs/platform/core/features/` directory, with each FEAT-PC### file routed via its owning area's L4 summary. A FEAT-PC### appears in exactly one area's L4 summary — the owning area; cross-area dependencies go in Platform dependencies in the feature spec.

**Frontmatter additions vs `domain-service-spec.md`:**
- `slug: {infrastructure | identity | organisation | governance}` — replaces the seven domain-service slugs
- `tier: Platform Core` — replaces `Domain Services`
- `tags: [platform-core:{slug}]` — replaces `domain-service:{slug}`
- `consumers: [platform/domain/{any DS}, products/{any}, studios/{any}]` — wider consumer set than DS (which is consumed by Surfaces only)

**Index updates: `docs/templates/README.md`.** New file added to the tree diagram and to the index table, both placed between `domain-service-spec.md` and `studio-description.md` to keep the Ecosystem+Architecture grouping ordered. Tree entry: `platform-core-spec.md  ← Platform Core area specification`. Index row: routes to `../platform/core/{area}-specification.md`.

**Cleanup landed: `docs/platform/core/README.md`.** Stale "`SPECIFICATION.md` — overview spec (to be written)" line replaced with four per-area `{area}-specification.md` lines. Shared `features/` directory described with its L4 routing rule. PC-wide `ROADMAP.md` commitment retained (consistent with locked Option 2). Pointer added to the new template under `docs/templates/`. This closes the cleanup item flagged in the A.3 decisions bridge.

**No other repo edits.** No SPECIFICATION.md authored for any of the four PC areas (that's a future per-area session, not template-authoring); no CLAUDE.md changes (template doesn't change tier-level rules — it encodes them); no skill changes (G-26 still waits for A.2-author since the new variant doesn't surface in A.3).

---

## Drift check finding

Pattern from prior bridges (structural sessions generating more gaps than they close) did not operate this session.

- **Net gap change:** 0 (none added, none closed).
- **Decisions advanced:** zero new — this was an authoring session executing prior decisions, plus one in-session judgement call (§6 Auth & authz) flagged but not promoted to a structural decision.
- **Today's session count:** fourteenth consecutive structural session. Fifth bridge dated 2026-04-26.
- **Block B start estimate (revised):** prior bridge said session-15 minimum, session-17 plausible. With A.3-author closing in one mechanical pass per the prediction, **session-15-or-16** holds — A.2-author remains the wildcard since it's genuinely new (no source template to adapt from) and is the most likely of the three to surface a structural surprise.

Four consecutive sessions where the gap-pattern paused. Same caveat as the prior bridge: all four pause-sessions were either decision-only or authoring of decisions already made. The pattern's original observation was about *fresh structural design* sessions, which we haven't run since 2026-04-22 (the decomposition skill refactor) and 2026-04-24 (the L2 compliance audit, which surfaced G-23 through G-25). Block B will be the real test — it's the first session in the streak where concrete features force the structural system to meet real instances. Until that happens, the drift-check stays an open question rather than a closed one. **The honest read remains: don't claim the pattern is broken until Block B starts.**

---

## The forward agenda

### Block A status — A.1 and A.3 authored, A.2 remains

| Sub-block | Status | Next |
|---|---|---|
| A.1 Studio template | Authored 2026-04-26 (earlier today): `docs/templates/studio-specification.md` | (no further authoring work) |
| A.2 Design System template shape | Decided 2026-04-26: genuinely new | **A.2-author — next-in-sequence per Path B** |
| A.3 Platform Core template | **Authored 2026-04-26 (this session): `docs/templates/platform-core-spec.md`** | (no further authoring work; first per-area SPECIFICATION.md write becomes a Block B candidate) |

Path B sequence reaches its final authoring step: **A.1 → A.3 (this session) → A.2.**

### Recommended next-in-sequence: A.2-author

Author `docs/templates/design-system-specification.md` per the decisions in `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md`. **Genuinely new** — the largest authoring lift of the three. No source template to adapt from. Three sub-inventories with different attribute shapes (tokens, components, patterns). L3 content type: vocabulary inventory (the third G-26 variant).

After A.2 lands, update `ecosystem-decomposition` skill to acknowledge all three L3 content-type variants — closes G-26.

A.2 is the session most likely to surface a structural surprise. The prior two authoring sessions (A.1 and this one) both ran as single mechanical passes because the L2/L3/L4 partition skeleton, plus a well-written tier `CLAUDE.md`, plus a parallel template to adapt from, was enough scaffolding. A.2 has the partition skeleton and (presumably) a well-written `design-system/CLAUDE.md`, but no parallel template — the L2 sections must be designed from the load-bearing properties of the design system tier rather than transferred from a sibling. The session should plan for elicitation rounds rather than a single authoring pass. If A.2 hits a moment where the partition skeleton itself doesn't fit the design system content profile, pause and surface — that's the kind of structural surprise the "authoring is mechanical" property explicitly does not cover.

### Then Block B

Vision → Task vertical exercise. The load-bearing endpoint that all this template work is in service of. Block B entity choice is still open and remains upstream of any further sequencing decisions. With all three Block A authorings done after A.2 lands, Block B can pick any entity it wants without being constrained by template-availability.

---

## Open questions surfaced

- **No new structural questions** in the ecosystem sense.
- **One template-shape question to watch at first PC area SPECIFICATION.md walk:** the §6 Authentication & authorization section was a judgement call not pre-named in the A.3 decisions bridge. If the first PC area walk (likely PC-2 Identity or PC-3 Organisation in Block B) shows §6 overlapping awkwardly with §3 Contract surface — i.e., the auth model is fully describable inside §3's Operations table without needing a separate section — fold §6 into §3 in a template revision. If §6 instead pulls its weight (PC-3's `has_permission()` resolution, role templates, group-vs-user distinctions) the section earns its place permanently. Not a gap, just a watch-point.
- **One template-shape watch-point to retain from the A.3 decisions bridge:** the PC-4 Governance L3 variant question. The template's resolution is "stays as capability inventory, with policy-flavour expressed in the vertical-impact column," but this resolution is only validated when PC-4's actual capabilities meet the template at L3 walk time. If PC-4's policy-enforcement capabilities resist the capability-inventory shape during a real walk, surface against G-26 at that point.
- **Carried forward:** G-26 `ecosystem-decomposition` skill update — resolved at A.2-author time.

---

## Tensions and non-obvious insights

**The "authoring is mechanical" property held for the second consecutive session, and the data is starting to be informative.** A.1-author predicted that adaptation-style template authoring runs in one pass when the L2/L3/L4 skeleton, tier `CLAUDE.md`, and source template are all in place. A.3-author had the same setup and ran the same way. Two data points isn't a pattern, but it's enough to set a clear expectation for A.2: when *any* of those three scaffolding pieces is absent (A.2 has no source template), expect the session shape to differ — multiple elicitation rounds, longer authoring, possible structural surprises. The honest framing is that we have evidence the property holds *for adaptation-with-scaffolding*; we have no evidence about authoring without that scaffolding. A.2 is where that question actually gets tested.

**The "make it impossible to express the wrong thing by accident" pattern is becoming a template-design principle worth naming.** A.1-author surfaced this in the studio template's §5 Target Domain Service contract (single-target-DS rule made spec-shaped via dedicated section + table). A.3-author applied the same pattern in §4 Internal dependencies via the explicit "what this area does NOT depend on" subsection — the inversion-error catch. Both are the same shape: a load-bearing tier-level rule earns not just an L2 section but a structural surface that makes the wrong move *visibly missing* if a author tries to skip it. If this pattern proves valuable in Block B — when real authors fill these sections under real time pressure and the catches actually fire — consider promoting it to a documented template-design principle in the `ecosystem-decomposition` skill or in the `templates/README.md` conventions section. Provisionally name it: *load-bearing-rule-as-anti-pattern-catch*. Don't promote yet; promote when Block B has produced evidence one way or the other.

**The §6 Authentication & authorization judgement call is the one place this session diverged from the A.3 decisions bridge, and it's worth being explicit about why.** The bridge's provisional L2 reworks listed §1, §2, §3, §4, §5 (drop), §6 Storage, §7 (new) Stability, §8 Open questions — seven sections after dropping §5. Adding §6 Auth makes eight. The reasoning was: `domain-service-spec.md` (the source) doesn't have an Auth & authz section, but `product-specification.md` and `studio-specification.md` both do, and the platform tier `CLAUDE.md` puts heavy emphasis on `has_permission()` (PC-3 Organisation's central object), the role-template system, the `is_platform_admin()` distinction (PC-4 Governance's central object), and the strict no-hardcoded-role-names discipline. Folding all of that into §3 Contract surface or §5 Storage & schema would have been awkward — auth is a cross-cutting concern at the platform tier, not a property of one section. The risk of the judgement call: if the first PC area SPECIFICATION.md walk shows §6 redundant with what §3's Operations table naturally captures (per-operation `auth requirements` field), §6 is dead weight and should be folded into §3. The risk of *not* making the call: PC-2 Identity and PC-3 Organisation walking into the template and finding their core subject matter without a natural home. The choice was: take the small risk of redundancy in exchange for not orphaning the auth model. Flag it, watch it, revise if Block B shows it failing.

**The `core/README.md` cleanup happening in the same session as the template authoring is a small process win worth marking.** The A.3 decisions bridge flagged the cleanup as "either at template-authoring time or at first per-area SPECIFICATION.md write." Doing it in the same session as the template means the README is consistent with the template the moment the template lands — no period where the README points contributors at a SPECIFICATION.md that doesn't exist while the template does, no period where the template is in the index but not yet referenced from the entity directory's README. The smaller cousin of G-21 (feature-inventory summary maintenance) flagged in the A.1-author bridge — *every entity README that names companion files in advance creates a small piece of documentation drift* — got its first observation: the cleanup *did* land at the same time as the new authority, which is the right discipline. If the same opportunity comes up in A.2-author (the design system tier may have a similar stale pre-commitment), the same in-session cleanup discipline applies.

**The session ran in one pass without elicitation rounds, matching A.1-author exactly.** This is the second consecutive authoring session that went directly from prior-bridge orientation to file authoring to bridge writing in one continuous arc. That's the "authoring is mechanical" property doing real work twice — when the decisions are locked and the source template plus tier `CLAUDE.md` provide enough material, no fresh elicitation is required. **Important asymmetry to preserve for A.2-author:** the property has been observed only for adaptation-style authoring. A.2 is genuinely new. Going in expecting a single-pass session would be the wrong calibration. A.2 may well need a planning round inside the session itself — list the design system's load-bearing properties from `design-system/CLAUDE.md`, decide which ones earn dedicated L2 sections (versus folding into existing partition surfaces), then author. That extra step is the natural cost of "no source template to adapt from."

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** A.2-author session — `docs/templates/design-system-specification.md`. Read first: this bridge, `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md`, the existing studio and Platform Core templates as reference points for partition-skeleton fidelity, `docs/design-system/CLAUDE.md` (tier-level rules to encode), and any existing `design-system/README.md` that names the area structure.

**Deferred this session (vertical-axis):**
- A.2-author — `docs/templates/design-system-specification.md`
- Block B entity choice
- Block B Vision→Task full vertical walk
- First PC area SPECIFICATION.md write (Block B candidate)
- First studio SPECIFICATION.md write (Block B candidate; would also clean up `journey-studio/README.md`'s "(to be written)" line for SPECIFICATION.md)
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

**Orientation seed for A.2-author:**

The next session is A.2-author — write `docs/templates/design-system-specification.md`. The setup is **deliberately different** from A.1-author and A.3-author: no source template to adapt from. The L2/L3/L4 partition skeleton transfers (it's universal), and L3's content type is locked as **vocabulary inventory** (the third G-26 variant: tokens, components, patterns), but the L2 section list must be designed fresh from `docs/design-system/CLAUDE.md`'s load-bearing properties rather than inherited from a sibling.

Plan for elicitation rounds inside the session, not a single authoring pass. Concrete sequence to consider:
1. Read the inputs (this bridge, A.1+A.2 decisions bridge, `design-system/CLAUDE.md`, design system area structure if it exists, `studio-specification.md` and `platform-core-spec.md` as partition-skeleton reference points only — *not* as content sources).
2. List the load-bearing properties of the design system tier from `design-system/CLAUDE.md`. These are the candidates for dedicated L2 sections.
3. Decide for each candidate: dedicated L2 section, or fold into an existing partition surface? The principle from A.1-author and A.3-author applies: load-bearing rules that need to be impossible-to-skip earn dedicated sections.
4. Author L2 section by section, then L3 (with vocabulary-inventory content type — the three sub-inventories with their distinct attribute shapes), then L4 (likely transfers cleanly with adjustments for design-system-specific FEAT prefix and routing).
5. Update `docs/templates/README.md` with the new entry. Optionally clean up `docs/design-system/README.md` if it has a stale "(to be written)" pre-commitment for SPECIFICATION.md (mirror of the `core/README.md` cleanup landed this session).
6. Bridge at session close.

After A.2 lands, the immediate G-26 closure work is small but real: update `ecosystem-decomposition` skill to acknowledge all three L3 content-type variants (capability / obligation / vocabulary) with the design system template as the concrete reference for the vocabulary variant. This can land in the A.2-author session itself or in a follow-up; light enough to fit either way.

Read first, in order:
1. This bridge (orientation, including the load-bearing-rule-as-anti-pattern-catch principle and the §6 Auth & authz judgement call).
2. `2026-04-26_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md` (the locked A.2 decisions, particularly the genuinely-new framing and the vocabulary-inventory L3 content type).
3. `2026-04-26_-_BLOCK-A1-AUTHOR-STUDIO-TEMPLATE.md` and this bridge for the partition-skeleton-transfer pattern.
4. `docs/design-system/CLAUDE.md` (tier-level rules to encode in the template — this is the primary content source for L2).
5. `docs/design-system/README.md` if it exists (current area structure; check for stale pre-commitments to clean up).
6. `docs/templates/studio-specification.md` and `docs/templates/platform-core-spec.md` (partition-skeleton reference only — not content sources; do not adapt their L2 sections, design fresh).
7. `docs/architecture/ECOSYSTEM_ANATOMY_V4.svg` (the canonical anatomy — confirm the design system's place in the Surfaces tier before authoring).

Output: new file `docs/templates/design-system-specification.md`; updated `docs/templates/README.md` with new index entry. Optionally, clean `docs/design-system/README.md` if a stale pre-commitment exists. Possibly: small update to `ecosystem-decomposition` skill closing G-26 (or follow-up session). Bridge at session close.

**One process refinement to internalise from this session.** The A.3-author session ran without elicitation, like A.1-author before it. That was the right behaviour for two consecutive adaptation-with-scaffolding sessions. **A.2 is a different kind of session and the right behaviour is different.** If A.2-author starts feeling like it should run in one pass, that's the signal to slow down — the property that licensed single-pass authoring (adaptation from a source template) is missing. Plan for at least one elicitation round before authoring begins, even if it turns out to be unnecessary in retrospect.

---

*Last updated 2026-04-26 at session close (fifth bridge of the day).*
