# Session Bridge — Program framing and restart

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md`
**Date:** 2026-05-03 (third bridge of the day; predecessors `2026-05-03_01_-_CASCADE-PLAN-CLOSE-OUT.md` and `2026-05-03_02_-_READER-TOURS-PROMOTION.md`)
**Session type:** Candidate-exploration → program-level reframe. No within-session execution beyond state-reads, an audit verdict, and one same-session gap-text correction.

**Chronological predecessor:** `2026-05-03_02_-_READER-TOURS-PROMOTION.md` (committed `f125f9e`).
**Substantive predecessor:** `2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md` — Hub L3 close, the original cross-entity-findings producer that registered G-29.

---

## Session arc — candidate exploration that ended in program reframe

The session opened from a clean state (working tree clean, no orphans, no pending close-outs). The prior bridge's "What's next" named four candidates. Each was explored with state-grounded verification rather than rhetoric-grounded promotion. Three were ruled out for distinct reasons; the fourth's objection surfaced the program-level dependency that reframed the session entirely.

### Candidate 1 — Platform §L3 (would deliver n=2 simultaneously)

The 2026-05-03_02 bridge framed this as highest-leverage. State-read showed work-size mismatch: a full §L3 derivation pass with stress-test for Platform is multi-session work, not one session. Ripe in opportunity, not in fit-for-one-session. Set aside as session frame even though it remained the highest-leverage thread.

### Candidate 3 — G-29 resolution (lateral routing for cross-entity findings)

Verified blocked at n=1 via Session 4 cross-entity-findings audit. Audit reviewed cascade-plan Sessions 4a/4b/4c bridges and the close-out (`d32afbe`) for findings of the form "entity X needs something from entity Y." None surfaced. Session 4's scope was tier-CLAUDE content audit — vertical movement through cascade levels (deciding which level of the cascade hierarchy owns each rule), not per-entity capability derivation. The stress-test pattern only produces cross-entity findings when applied to per-entity L3 derivation; cascade-content audit produces *categorisation-axis* findings instead (verification-and-delete, destination-classification-by-readership-via-cascade — captured as candidates in the cascade-plan close-out's §3 ledger).

**Outcome 3 (per the audit verdict surfaced this session):** G-29 stays at n=1. Hub B.2 is still the only instance. The gap text's expectation that Session 4 would supply n=2 was wrong — the "different decomposition surface" qualifier in the original gap text turned out to be load-bearing in a way that wasn't visible at gap-write time. Next true second-instance candidate is the next per-entity L3 derivation with stress-test pass. Gap text correction landing in same-session as separate commit (see §"Commits this session" below).

### Candidate 4 — Hub ROADMAP.md

Initially identified as smallest-scope, most ripe-for-one-session candidate (Hub now at §L3 + reader-tours mature; a roadmap layers on existing material). Fragmented during exploration into approaches 4a/4b/4c — different framings of how the roadmap composes Hub's current §L3 + reader-tours surface against forward sequencing.

**Ruled out via Hub-needs-objection.** A Hub roadmap derives meaningful sequencing from upstream platform availability. Without Platform §L3 (capability inventory) and §L4 (feature inventory) shipped, the Hub roadmap has nothing to schedule against beyond what's already in Hub's own §L3. Authoring it now produces one of two failure modes: (a) project Platform needs from Hub's perspective, the authority-direction contamination shape the methodology guards against; or (b) produce a roadmap that's only Hub-internal and doesn't actually answer the sequencing question the roadmap exists to answer. Either way, not the right artifact at this stage.

### Reframe

The Hub-needs-objection on Candidate 4 surfaced the load-bearing dependency: **Hub continuation depends on Platform decomposition landing first.** Platform §L1 through §L5 (and onward where applicable) is the prerequisite for any meaningful Hub roadmap. Verticals follow as a second prerequisite (their obligations bind every tier including Hub's). Hub roadmap and continuation come third.

The session's frame shifted from "what's the next single session" to "what's the next program."

---

## Platform & Verticals state-read findings

### Platform

- **§L1 absent.** No `docs/platform/DESCRIPTION.md`, and no DESCRIPTION-equivalent at any sub-tier or per-area/per-service level. Vision material that informs platform sits one tier up: `docs/ecosystem/VISION.md` (constitutional, ecosystem-wide) and `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md` (G-27-flagged stale, predates ADR-U023/U024).
- **§L2 is twelve prospective entities, not one.** PC-1 Infrastructure, PC-2 Identity, PC-3 Organisation, PC-4 Governance + DS-1 World Model through DS-7 Intelligence + Extension System. Each named in `core/README.md` and `domain/README.md` with one-line scope. Every per-area and per-service spec file is marked `_(to be written)_`. ADR-U023 is the architectural backbone; not L2 itself.
- **Compared to Hub at B.2 open:** Hub had a populated `DESCRIPTION.md` and `SPECIFICATION.md` §L2 fully written. Platform has agent-routing CLAUDE.md files (mature, just refined through cascade-plan 4a/4b/4c) but no decomposition layer. Hub's eight internal areas were L3-internal partitions of one entity; Platform's twelve are each prospective entities needing their own L2 spec. Different scale of work.
- **Codebase asymmetric.** Twenty migrations and partial v1 API exist. Platform Core (Identity, Organisation, parts of Infrastructure, Governance) substantially built — five sprints of group/role/permission/invitation/exit machinery shipped. Platform Domain mostly unbuilt — only DS-3 Experience Engine has visible API/migration surface. Implication: stress-test pass yield will vary by entity. PC entities will produce rich code-informed deltas comparable to Hub's; most PD entities will be cold-derivation-heavy with thin-or-empty stress-test material.

### Verticals

- **§L1 absent everywhere.** No DESCRIPTION-equivalent at vertical-tier or per-vertical level.
- **§L2 partial scaffold.** Five SPECIFICATION.md files exist, one per vertical. Per G-03 (highest-priority gap in the register): §1 Purpose and §2 Scope written; §3-§6 marked partial.
- **Shape-different from Platform.** Verticals are obligations, not entities with internal structure. The methodology's L2/L3 split for verticals (per `docs/verticals/CLAUDE.md`) partitions §1-§5 (purpose / scope / tooling / failure-modes / open-questions) from §6-§7 (per-tier obligations / cross-cutting checklists). The capability-inventory pattern doesn't transfer; methodology applies differently.

---

## Program decision locked

**Sequence:** Platform §L1-L5 → Verticals (adapted to obligation-shape) → Hub continuation.

**Discipline:**

- Each entity derived from its own authority — Platform from Platform's own L1+L2, Verticals from their own L1+L2 once defined. **No Hub-need projection.**
- Sequential phases, not interleaved. Hub roadmap and continuation deferred until upstream prerequisites land.
- Pre-methodology reference snapshots (`docs/planning/reference/PLATFORM-EXIT-GAP-ANALYSIS.md`, `ADMIN-DEUSEX-GAP-ANALYSIS.md`, `GROUP-MODEL-CURRENT-STATE.md`) are safe as code-informed stress-test inputs; unsafe as L1/L2 derivation inputs (authority direction would flow from current implementation → L1 identity, the contamination shape).
- G-29's un-routed Hub findings (the cross-entity findings produced by Hub L3's stress-test pass) should re-surface during Platform's own stress-test pass, not be pulled in as L1/L2 derivation input. The stress-test pattern naturally re-surfaces them where the discipline allows code-informed comparison material.

---

## Commits this session

Two commits in logical concern separation:

1. **Bridge** (this file) — captures candidate-exploration arc, audit verdict, state-read findings, program decision, open markers.
2. **G-29 gap-text correction** — updates `docs/ecosystem/how-we-work/gaps.md` G-29 entry to reflect the audit verdict: cascade-plan Session 4 was a different decomposition surface and could not produce cross-entity findings. Next true second-instance candidate is the next per-entity L3 derivation with stress-test pass. Cites this bridge as the audit's home.

---

## Open markers carried forward

- **Program-planning artifact pending.** The Platform → Verticals → Hub program needs a planning home. Format and scope are open: cycle? wave? a multi-session arc plan analogous to the 2026-04-27 cascade-plan bridge? The next session opens the question; this bridge does not pre-decide it.
- **Verticals methodology adaptation timing.** Verticals' L1/L2/L3 partitioning differs from entity-shape; the `ecosystem-decomposition` skill's L1-L3 prose may need adjustment for verticals before that phase opens, or the adaptation can happen at the verticals phase boundary. Open.
- **Stale `PRODUCTS_AND_PLATFORM.md` (G-27).** Currently named as authoritative L2 read context by the `ecosystem-decomposition` skill. Reading it cold during Platform L1/L2 work imports a model predating ADR-U023/U024. Either resolve G-27 before Platform L1/L2 opens, or carry an explicit "treat as historical, ground in ADRs" rule for the Platform arc. Decision deferred to next session.
- **Gaps-register section-drift observation.** G-32 (and G-20, G-21, G-22, G-23, G-29, G-31) bear `(decomposition, …)` axis tags in their headers but are file-located under "Execution — chapters 03 and 04" section. Possibly longstanding misfile pattern, possibly section-name-vs-axis-tag mismatch. Worth a doc-health-check entry or a new gap registration. Stefan's call — not landing this session.

---

## Working-pattern observations

**State-read discipline (registered in 2026-05-03_02 bridge) held throughout.** Session-open ran the full state-read pass before any work proposal. The cross-entity-findings audit was itself a state-read against Session 4's bridges and close-out — surfacing the work-shape mismatch the original gap text did not anticipate. The Platform/Verticals state-read surfaced the §L1-absent and twelve-entities findings that reframed the session.

**Bouncing-partner cycle behaviour.** Surface-draft fired on the bridge text and the G-29 correction text before commit (consequential + first-visibility AND-logic). No mechanical follow-ons this session beyond the commits themselves. Tripwire stayed at 1 throughout — single program-reframe candidate emerged and was named-and-locked in-session; no second first-instance candidate surfaced for split-conversation reopening.

**Three-bridge day, one session each.** The 2026-05-03 date carries three bridges (`_01` cascade-plan close-out, `_02` reader-tours-promotion, `_03` this one). Each bridge closed a distinct concern; the chronological clustering reflects work-cadence, not arc-coupling.

---

## Status at session close

- [x] Candidate exploration arc surfaced and verdicts locked (Candidate 1 size-deferred, Candidate 3 verified blocked at n=1, Candidate 4 ruled out via Hub-needs-objection)
- [x] Session 4 cross-entity-findings audit verdict locked (Outcome 3, G-29 stays at n=1)
- [x] Platform & Verticals state-read complete and findings captured
- [x] Program decision locked (Platform §L1-L5 → Verticals adapted → Hub continuation; sequential, derived from own authority, no Hub-need projection)
- [x] G-29 gap-text correction landing in separate commit this session
- [x] Closing bridge written

---

*Two commits this session: bridge + G-29 correction. Push timing at Stefan's discretion.*
