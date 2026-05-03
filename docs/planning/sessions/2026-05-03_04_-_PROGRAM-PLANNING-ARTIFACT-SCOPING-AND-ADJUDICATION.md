# Session Bridge — Program-planning artifact scoped and adjudicated

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md`
**Date:** 2026-05-03 (fourth bridge of the day; predecessors `_01` cascade-plan close-out, `_02` reader-tours-promotion, `_03` program-framing-and-restart)
**Session type:** Surface-level scoping pass on the program-planning artifact (henceforth "A"), followed by same-session adjudication. **Not authoring.** A itself is not drafted in this session; only its scope is fixed.

**Chronological predecessor:** `2026-05-03_03_-_PROGRAM-FRAMING-AND-RESTART.md` (committed `c53f681`).
**Substantive predecessor:** same — that bridge locked the program direction (Platform §L1-L5 → Verticals adapted → Hub continuation) and registered "Program-planning artifact pending" as the load-bearing open marker. This session converts that marker from "format and scope are open" into "scope adjudicated; format and authoring deferred to next session."

---

## Session frame

The prior bridge's program reframe deferred A explicitly: format, scope, and cardinality unresolved. This session opened with a surfacing-only frame plan-back (B → A → C dependency-clean compression), which the bouncing partner corrected for four pre-collapses: A's scope held at broader read; A's cardinality (single artifact vs. family) held open; G-27 resolve-vs-annotate held as its own adjudication; same-session pairing withdrawn pending #1/#2.

Adjudication then landed: scope A this session, with the scoping itself adjudicating cardinality and scope simultaneously. Discipline rails — surface-level scoping only, not authoring; let cardinality fall out of which deltas A keeps. Opening question: **what does A need to carry that isn't already carried by existing artifacts (bridges, gaps register, ADRs, `ecosystem-decomposition` skill, CLAUDE.md cascade, per-entity SPECIFICATION.md scaffolds)?**

---

## State-read against existing artifacts — what's already covered

- **`ecosystem-decomposition` skill** — L1-L5 *methodology*: per-level dependencies, read context, write scope, output, handoff; L3 content-type variants (capability / obligation / vocabulary); stress-test pass embedded in L3 (G-31 closed); reader tours as post-§L3 maturity gate. Does **not** sequence entities, does **not** name phases, does **not** carry program-discipline rules.
- **ADR-U022 / U023 / U024** — wave names; PC/PD architectural backbone with internal-API and platform-API contracts; wave model semantics — explicitly *waves are thematic, not sequential phase gates; future-wave work is allowed*. ADRs lock structure, not program flow.
- **CLAUDE.md cascade** — agent-routing per tier/entity. No program-shape content.
- **`platform/README.md` + `core/README.md` + `domain/README.md`** — two-tier structure diagram, twelve entities each with one-line scope, consumption direction (Products → PD → PC). No ordering of which entity opens first; no stress-test sourcing.
- **Per-entity `SPECIFICATION.md` scaffolds** — twelve `_(to be written)_`; will hold per-entity L2 (and §L3) when authored. Not cross-aware.
- **Verticals `CLAUDE.md`** — partitions vertical specs L2/L3/L4 (obligation-shape divergence from entities). Carries the divergence shape, not phase ordering.
- **Wave files (`ferd.md` stub; `FERD-CAPABILITY-MAP.md` populated)** — wave-scoped capability map with codebase-verified status. Wave-scoped, not entity-L1/L2-program-scoped.
- **Bridges** — 2026-04-27 cascade-plan bridge is the closest precedent for "multi-session arc plan with internal block/session sequencing + explicit blockers." 2026-05-03_03 locks program direction. Bridges decay in salience; not the load-bearing planning home.
- **Gaps register** — debt log; not forward-planning. Adjacent: G-04 (wave↔roadmap), G-07 (Ferd DoD), G-19 (wave-planning skill scope).
- **PROCESS.md** — doc-lifecycle table (trigger → artifact → template → location); cadence (cycles + waves + Shaped Personal Kanban); skills as execution layer. **No row for a program-spanning artifact.**

---

## Nine-delta inventory — what isn't carried anywhere

Surface-level, not ranked. Reproduced from the in-session surfacing pass:

1. **Phase-boundary definition.** Platform §L1-L5 → Verticals adapted → Hub continuation lives only in a bridge.
2. **Entity ordering inside Platform.** Twelve entities, no rationale-of-ordering exists. Build asymmetry (PC built, PD mostly unbuilt; DS-3 partial) bears on stress-test yield and may bear on ordering.
3. **Stress-test sourcing per entity.** Methodology in skill; per-entity input-mapping (which migrations / API code / feature descriptions / reference snapshots / which session bridges) carried nowhere.
4. **Program-discipline rules.** "No Hub-need projection"; "pre-methodology reference snapshots safe-as-stress-test-input, unsafe-as-derivation-input" — currently bridge-only. Distinct from skill methodology and from architectural ADRs.
5. **Phase-DoD.** What makes Platform §L1-L5 "done enough" to open Verticals adapted? Wave DoD (ADR-U024) is per-wave thematic, not per-phase program-shaped. Different shape.
6. **Read-context per phase.** What grounds each phase's L1/L2 reading? Skill names PRODUCTS_AND_PLATFORM (G-27 stale); per-phase grounding not held elsewhere.
7. **Verticals methodology adaptation timing.** Open marker. Phase-boundary or earlier?
8. **Cross-phase finding routing.** Hub L3 produced cross-entity findings; G-29 caps re-surfacing during Platform stress-tests. The queue/routing has no canonical home.
9. **Program-cadence integration.** How does the program plan interact with cycles and waves? Cycle pulls from program → wave? Open.

---

## Sibling-absorption surface

The delta isn't only "what's missing" — it's "what should A hold rather than push elsewhere." Each delta has a plausible non-A home:

- **1, 4, 5** — could land as ADR(s) (architectural / program-discipline locks).
- **3, 7, 8** — could land as `ecosystem-decomposition` skill updates (per-entity stress-test sourcing pattern; verticals adaptation prose; lateral-routing mechanism).
- **9** — could land as PROCESS.md edit (program-vs-cycle-vs-wave integration).
- **6** — could land in wave files if read-context is wave-scoped, or in per-phase artifacts if phase-scoped.
- **2** — has no obvious sibling home; closest to A's natural scope.

Whether A absorbs each delta or pushes it sibling-ward is the load-bearing scoping question. Cardinality (single artifact vs. family) likely falls out of which deltas A keeps: the deltas decay at different rates (durable program-discipline vs. operational sequencing) and have different authority shapes (architectural lock vs. methodology vs. routing register), which is itself an argument against pre-collapsing to single.

---

## Adjudications (provisional, may revise next session)

### A holds

- **#1 phase-boundary definition + #5 phase-DoD — coupled.** A boundary without a DoD is incomplete; you cannot fix "the boundary lives here" without naming "this is what 'done at the boundary' looks like." Their plausible sibling home is an ADR, but no such ADR is being authored or explicitly queued, so routing them sibling-ward would be sibling-absorption-as-deferral disguised as packaging. A absorbs both. If a natural ADR home emerges during Platform §L1 work, split out at that point.
- **#2 entity ordering inside Platform — A's operational core.** This is the only delta with no plausible sibling home. Twelve entities, no rationale-of-ordering anywhere; build asymmetry (PC mostly built, PD mostly unbuilt, DS-3 partial) bears on stress-test yield and may bear on ordering. A is where this lives or it doesn't live at all.
- **#4 program-discipline rules — both halves, in A, with a flagged split-clause.** The two named rules are heterogeneous: "no Hub-need projection" is a flow-direction rule about authority direction during decomposition; "pre-methodology reference snapshots safe-as-stress-test-input, unsafe-as-derivation-input" is an input-classification rule about how prior artifacts feed the methodology. They could plausibly split — flow-direction rule sibling-absorbed into an ADR, input-classification rule sibling-absorbed into the `ecosystem-decomposition` skill — but neither sibling is currently being authored. Same deferral risk as #1/#5: A absorbs both halves. Carry the heterogeneity observation as a split-later flag; if Platform §L1 work surfaces a natural ADR or skill-section home for either half, lift out at that point.
- **#7 Verticals methodology adaptation timing — lightweight.** A names *when* the adaptation lands (phase-boundary vs. earlier); A does not author *how* the adaptation reads. The how is sequenced for the Verticals phase itself. This is a low-cost addition to A; no sibling home contested.
- **#8 cross-phase finding routing — open marker only.** A flags that the queue/routing for Hub L3's cross-entity findings (re-surfacing during Platform stress-tests per G-29) needs a canonical home. A does not decide whether that home is a skill update, a new register, or an extension to the gaps register. Routing decision deferred until Platform §L1 surfaces actual cross-phase findings to route — i.e., until n>0 evidence of the routing shape is in hand.
- **#9 program-cadence integration — open marker only; PROCESS.md edit named as needed but not authored.** A flags that program-vs-cycle-vs-wave integration is unspecified and that PROCESS.md is the natural sibling home. A does not draft the PROCESS.md row. The naming is low-cost in A; the authoring is sequenced when program execution requires it.

### Sibling-ward (deferred authoring; A names but does not produce)

- **#3 stress-test sourcing per entity → `ecosystem-decomposition` skill update.** Real, ready sibling: the methodology section already exists, the place is ready, the pattern is named (G-31 closed). Per-entity input-mapping is a natural extension of the existing prose. Authoring deferred; A points at this as a known-shape future skill edit.

### Blocked

- **#6 read-context per phase → blocked on G-27 resolution shape.** G-27 (`PRODUCTS_AND_PLATFORM.md` staleness vs. authoritative L2 read status) is exactly the substrate of #6's question. Until G-27 is adjudicated (resolve vs. annotate, the asymmetric binary held over from this session's #3 correction), per-phase read-context has no stable home. A flags this dependency; it does not author #6.

### Cardinality

**Single artifact, provisionally, with explicit may-split clause.** No delta decisively forced cardinality during scoping; the heterogeneity observations argue for the option to split rather than for splitting now. Single keeps cost low and reads naturally; the may-split clause keeps the option live as a low-cost future move if a delta's sibling-home matures (most likely candidates: #4 halves to ADR/skill; #1+#5 to ADR; #7's *how* always going to skill at Verticals phase).

---

## Bouncing-partner observations carried into adjudication

The four pre-collapse corrections from earlier in the session (A's scope held broad; cardinality held open; G-27 resolve-vs-annotate held as its own adjudication; same-session pairing withdrawn) framed the discipline of the scoping pass and shaped its outputs. Three further observations emerged during adjudication and are carried explicitly:

- **#1+#5 coupling.** Phase-boundary without phase-DoD is incomplete by construction. Locking them as a pair preserves coherence and prevents the failure mode where a boundary is named but its completion criterion drifts.
- **#4 heterogeneity.** Program-discipline rules contain at least two distinct rule-shapes (flow-direction rule vs. input-classification rule). Heterogeneity is a split-signal; the split-later clause names the future move without forcing it now.
- **#6/G-27 dependency.** #6's substrate is exactly what G-27 contests. Adjudicating #6 ahead of G-27 would either pre-decide G-27 or build on a contested foundation. Blocking #6 until G-27's own (separate-session) adjudication is the dependency-clean move.

The dominant tripwire across these observations was **sibling-absorption-as-deferral**: pushing a delta to a sibling artifact that is not currently being authored, has no scheduled author, and has no committed shape, is deferral, not packaging. The discipline that prospective-home siblings stay in A (even when their long-run home may be sibling-ward) prevents this. Real-and-ready siblings (#3 → skill update, with the methodology section already in place) are exempt from the tripwire.

---

## Open adjudications carried forward (post-travel)

- **G-27 resolution shape (resolve vs. annotate)** — upstream of #6 routing. Asymmetric binary; do not pre-collapse. Independent session.
- **Watch for natural ADR home for #4 halves** — when Platform §L1 work opens, observe whether either rule-half ("no Hub-need projection" or "snapshots safe-as-stress-test, unsafe-as-derivation") finds an ADR shape; split out at that point if found.
- **#8 routing decision (skill update vs. new register vs. gaps-register extension)** — defer until Platform §L1 surfaces actual cross-phase findings; route the decision against evidence rather than ahead of it.
- **Authoring A itself** — next session's opening work. Format and structure deliberately not pre-decided in this scoping session.
- **Verticals methodology adaptation work (the *how*, not the *when*)** — sequenced for the Verticals phase, not for A's authoring session. Skill prose currently entity-shaped; adaptation lands when the phase opens.

---

## Tripwire status

Clean. No candidate-ledger promotions this session. Stress-test-pass pattern remains n=1 (Hub B.2 only; per the 2026-05-03_03 bridge's audit verdict, cascade-plan Session 4 was a different decomposition surface and did not produce a second instance). No new gaps registered; no gap-text corrections beyond the prior session's G-29 landing. Sibling-absorption-as-deferral named as a tripwire and applied during adjudication.

---

## Working-pattern observations

**Bouncing-partner discipline held tightly throughout.** The session opened with a surfacing-only frame plan-back, which the partner corrected for pre-collapses; the corrections were absorbed without re-litigation; adjudication then landed in a single named-and-locked move. The discipline of "surface, hold, await adjudication" prevented the surfacer from drifting into authoring.

**State-read posture re-applied per discipline rail.** The opening state-read pass (recent commits, working tree, session bridges, gaps register, untracked orphans) ran before any candidate framing; a deeper state-read against existing artifacts (skill, ADRs, READMEs, PROCESS, wave files, scaffolds) ran before the by-subtraction delta surfaced. No memory-grounded claims about coverage; every "what's already carried" cell was verified against the artifact in the same session.

**Three-then-four-bridge day.** The 2026-05-03 date now carries four bridges (`_01` cascade-plan close-out, `_02` reader-tours-promotion, `_03` program-framing-and-restart, `_04` this one). Each bridge closed a distinct concern — chronological clustering reflects work-cadence under tight bouncing-partner adjudication rhythm, not arc-coupling.

---

## State at session close

- Branch `main` was 2 commits ahead of `origin/main` at session open (the `_03` bridge `c53f681` and the G-29 correction `7f2ebc2`, both unpushed). After this bridge commits, branch will be 3 commits ahead of `origin/main`. **No push this session.**
- No code changes. No state changes beyond this bridge file. A itself is not authored. No sibling-ward artifacts (skill update, PROCESS.md edit, ADR draft) are authored.
- Gaps register unchanged.
- `ecosystem-decomposition` skill, `feature-development` skill, `wave-planning` skill, `doc-health-check` skill — all unchanged.

---

## Travel note

Stefan abroad after this session. Next session opens cold with this bridge as primary read-in. **All adjudications above are provisional and revisable** — the may-split clauses (cardinality; #4 halves; #1+#5 pair) are explicit invitations to revisit when next-session evidence shifts. Authoring A is the natural opening work for next session, but the scoping itself remains the canonical input regardless of what next session opens with.

---

## Status at session close

- [x] Surface-level scoping pass complete (state-read against existing artifacts, by-subtraction delta surfaced as nine items)
- [x] Sibling-absorption surface mapped (each delta to plausible non-A home)
- [x] Adjudications landed: A holds #1+#5, #2, #4 (both halves with split-clause), #7, #8 (open marker), #9 (open marker); #3 sibling-ward to skill; #6 blocked on G-27
- [x] Cardinality adjudicated provisionally as single-with-may-split-clause
- [x] Bouncing-partner observations captured (#1+#5 coupling; #4 heterogeneity; #6/G-27 dependency; sibling-absorption-as-deferral tripwire)
- [x] Open adjudications named for post-travel pickup
- [x] Tripwire status registered clean; n=1 stress-test-pass evidence held
- [x] Closing bridge written

---

*One commit this session: this bridge. Push deferred per Stefan's discretion (travel imminent).*
