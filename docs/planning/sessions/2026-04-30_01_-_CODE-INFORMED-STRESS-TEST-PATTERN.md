# Session Bridge — Code-informed stress-test pattern + B.2 resumption rhythm

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md` (date + 2-digit sequence within the day)
**Date:** 2026-04-30
**Session type:** Methodology-design pivot — emerged from a session-pacing question Stefan raised about the descent. **Not L-level work**; mechanism-level work supporting the vertical axis. **Block B.2 remains paused** per the 2026-04-27 cascade-plan bridge; this session does not move B.2 forward, but it locks the rhythm by which B.2 will resume in the other chat session.
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (none — this bridge is the planning artifact; the pattern's named promotion to skill is sequenced for after a second instance of evidence; see §"What's deferred")

**Prior bridges this session pivots from:**
- `2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md` — the cascade-plan bridge that paused B.2 mid-elicitation. This session does not displace any of its sequencing.
- `2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md` — the inspirational input that informed the pattern's naming (read during this session as evidence of the pattern already being practised).
- `2026-04-28_01_-_BLOCK-B2-HUB-L3.md` — the B.2 resumption bridge whose orientation I read but did not modify; B.2 resumption rhythm in this bridge is consistent with the green-light decisions already locked there.

---

## Why this bridge exists

Stefan opened the session with a pacing question: *"this whole work is very time consuming — should we continue semi-manually, or take the leap and trust Claude with more autonomy via Opus 4.7 / max effort / Ultrareview?"*

The question sounded like a binary choice about autonomy. Pulling on it surfaced a methodology pattern that was already being practised but not yet named: **code-informed stress-test of architecture-derived specs**. The pattern is currently undocumented and operates entirely on session-by-session judgment. Stefan confirmed that he had already run a version of it (running CC against existing feature description files, comparing the output against an L1+L2-derived Hub capability draft) and that the comparison had produced findings that flowed *outward* from Hub into capability needs at Platform Core, Design System, and other entities.

The outward-flowing findings are what makes this a *pattern* worth naming, rather than a one-off efficiency move. They demonstrate that working code (and feature descriptions derived from it) encodes architectural constraints that pure derivation-from-vision will eventually re-derive — so checking now is faster than waiting for the gap to surface during build, and the cross-entity dependencies surface naturally rather than waiting until each downstream entity is descended into.

This bridge captures the pattern's name, shape, and operating constraints, and locks the autonomy split for the cascade plan and B.2 resumption that flow from it. It also queues the methodology for promotion-to-skill once a second instance of evidence lands.

---

## What was decided

Five decisions, locked, in dependency order.

### 1. The pattern — code-informed stress-test (not code-informed derivation)

The pattern has three steps and a strict ordering:

1. **Architecture-derived inventory.** Author the inventory (capabilities, rules, content) cold from L1+L2 sources, with no reference to existing code or implementation artifacts. Output is the candidate authoritative artifact.
2. **Code-informed stress-test pass.** Open existing artifacts (codebase, feature description files, working specs) as adversarial input. Compare candidate against artifacts. Produce a structured delta in three classes (see §2).
3. **Adjudication.** Reconcile the delta. The candidate inventory is updated only where the architecture *agrees*, never because the code says so. Code that has no architectural home becomes a finding, not a feature.

**Direction of authority is preserved.** The candidate artifact comes first. Code stress-tests it; code never sources it. This respects the locked principle from earlier sessions: *"Specs are authoritative; code is measured against them, not reverse."* The pattern adds a step that exploits empirical artifacts as a completeness probe; it does not change which side wins on disagreement.

**The pattern is named "code-informed stress-test" deliberately**, not "code-informed derivation." The framing matters because the verb tells the author what authority they hold during the activity. *Derivation* would license sourcing capabilities from code; *stress-test* does not — it only licenses noticing when the candidate is incomplete or wrong.

### 2. The three output classes from the stress-test pass

The delta produced by the stress-test pass has three structurally distinct outputs that need different downstream handling:

| Output class | Meaning | Downstream handling |
|---|---|---|
| **Confirms** | Architecture-derived item has a clear empirical analogue | Logged for traceability; no further action |
| **Entity-internal delta** | Architecture-derived item without analogue (gap), or empirical thing that maps to a candidate item but with a different shape | Reconciled into the candidate artifact under L3 author's judgment |
| **Cross-entity findings** | Empirical artifact has a thing that doesn't map to the candidate at all *and* doesn't belong inside this entity — it belongs in another entity's L3 (or another tier altogether) | Routed via the lateral-routing mechanism (see G-29 / lateral-drift gap registered in B.2 bridge) |

The cross-entity output class is the one that turns this from "efficient delta-detection" into "structural-completeness probe." When the Hub L3 stress-test pass surfaces something that belongs in PC-3 Organisation, in DS-7 Intelligence, or in the Design System, that finding must not be silently dropped; it has to land somewhere structured for those entities' future L3 work to inherit.

The lateral-routing mechanism for cross-entity findings is the gap registered in the B.2 bridge (the B.2 bridge calls it G-NN; it will get its actual ID in B.2's session opening). **This bridge does not solve that mechanism** — solving it is exactly what the gap exists to do. What this bridge does is locate the stress-test pattern as the *generator* of cross-entity findings, so the lateral-routing gap's resolution covers the right surface.

### 3. The autonomy split — applied surgically, not globally

The original framing of the pacing question — semi-manual vs. autonomous — is wrong-shaped. Different bands of work tolerate different autonomy levels. The split locked is:

| Band | Activity character | Autonomy tolerance |
|---|---|---|
| **Mechanism / structural / methodology design** | Pivot bridges, principle-locking, skill edits, gap registration, taxonomy decisions | Semi-manual with Stefan in the loop. High judgment per decision; low volume. |
| **Architecture-derived inventory authoring (step 1 of stress-test)** | Cold derivation from L1+L2 against an authoritative source | Semi-manual. The author needs to expose reasoning to Stefan as it happens because contamination from below is the failure mode that's hard to catch later. |
| **Stub authoring against a locked policy** | Mechanical instantiation of a known shape | Mostly autonomous (Claude Code). Stefan reviews shape conformance, not content. |
| **Code-informed stress-test pass (step 2 of stress-test)** | Empirical comparison against a fixed candidate | Mostly autonomous (Claude Code). The activity is bounded and mechanical: list routes, list tables, compare to candidate. Output shape is fixed (three classes). |
| **Adjudication (step 3 of stress-test)** | Classifying delta items, especially cross-entity ones | Semi-manual. High judgment per item; low tolerance for misclassification. |
| **Tier audit / migration with code as adversarial input** | "Does this rule generalise to siblings?" cross-checked by "is this rule used outside the candidate entity in code?" | Hybrid. Derivation semi-manual; code-informed validation pass autonomous; reclassification semi-manual. |

**The split's organising principle:** autonomy is licensed in **bounded mechanical activities with fixed output shapes** (stub authoring, code comparison, presence/absence checks). Autonomy is *not* licensed in **judgment-heavy activities where misclassification has long-tail consequences** (cross-entity findings handling, taxonomy decisions, migration scoping).

### 4. Cascade plan rhythm — updated against this split

The 2026-04-27 cascade-plan bridge sequenced four sessions. With the autonomy split locked, the rhythm refines:

| Session | Activity | Rhythm |
|---|---|---|
| **Session 1** — skill edits + policy text + gap entries | Foundational mechanism design | **Semi-manual.** High-judgment-per-decision; sets contracts that downstream sessions depend on. |
| **Session 2** — entity CLAUDE.md authoring batch 1 | Hub substantive + entity stubs everywhere else | **Hybrid.** Hub substantive section semi-manual (consolidating real Hub-specific rules from `products/CLAUDE.md` is judgment-heavy); stubs mostly autonomous (mechanical against locked stub shape from Session 1). |
| **Session 3** — vertical entity CLAUDE.md + platform sub-tier CLAUDE.md | Vertical entity CLAUDE files + Core/Domain/Extensions sub-tier files | **Hybrid.** Verticals mostly autonomous (point-upward stubs); platform sub-tier semi-manual (Core/Domain split per ADR-U023 is content-rich). |
| **Session 4** — tier-CLAUDE content audit (G-30) | Migrate miscategorised rules from tier files to entity files | **Hybrid with stress-test.** Migration plan semi-manual; **code-informed validation pass autonomous** (does `useAuth()` actually appear only in Hub code? does `proxy.ts` show up only on the web stack?). Reclassification semi-manual. This is the cascade plan's first explicit application of the stress-test pattern. |

Session 4 is the methodology load-test for the stress-test pattern within the cascade plan. If it works smoothly, that's the second instance of evidence (with B.2 being the first) — and therefore the trigger for promoting the pattern to a named step in `ecosystem-decomposition`.

### 5. B.2 resumption rhythm — locked

The 2026-04-28 B.2 bridge locked authoring-plan steps (verify G-NN, namespace check, author §L3, MEM-16 inline fix, sources-status). It did not specify the **autonomy rhythm** within the authoring step. With this session's split, the rhythm is:

1. **Architecture-derived L3 capability inventory** — semi-manual with Stefan in the loop. Co-equal derivation from VISION (three founding questions, Three Dimensions) + DESCRIPTION + L2 + the eight areas in the inspirational input. **No reference to feature descriptions or code during this step.** The output is the candidate authoritative inventory.
2. **Code-informed stress-test pass** — more autonomous via Claude Code. Compares candidate inventory against existing feature description files (and, where useful, the Hub codebase). Produces three outputs: confirms, Hub-internal delta, cross-entity findings. **The cross-entity findings have no canonical home yet** — they are queued for the lateral-routing gap's resolution. In the meantime, the B.2 sources-status block records them as caveats.
3. **Adjudication** — semi-manual. Confirms log without action. Hub-internal delta reconciled into the inventory under L3 authority. Cross-entity findings classified and recorded for downstream handling.

**The B.2 sources-status block carries an additional remark beyond what the B.2 bridge specified**: a "stress-test outputs" subsection that lists the three classes' counts and surfaces cross-entity findings as enumerated lines. This makes the stress-test's contribution visible in the spec without inflating the spec — the findings live in sources-status, not in the capability table itself.

The B.2 bridge's authoring plan is otherwise unchanged. The rhythm decision here refines step 3 of the bridge ("Re-derive freshly") and inserts a stress-test step before adjudication; it does not displace anything else.

---

## What was produced (this session)

**This bridge.** Plus two derivative artifacts queued for landing in their proper homes, drafted here so they are not lost in handoff:

1. **A draft G-31 entry** for `gaps.md`, describing the stress-test pattern's promotion-to-skill watch-point. Lands when Session 1 of the cascade plan executes (G-29 and G-30 land in the same session per the cascade-plan bridge; G-31 is added to that batch).
2. **A short orientation seed** for the other chat session resuming B.2 — points at this bridge plus the B.2 bridge plus the inspirational input.

Both drafts are appended below.

No code changes. No CLAUDE.md files authored. No skill edits landed. No spec sections authored. Like the cascade-plan bridge before it, this is a planning artifact whose value is captured-decision, not produced-code.

---

## Drift findings (recorded, not fixed in this session)

Two findings worth carrying forward:

1. **The inspirational input file (`2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md`) is itself an artifact of the stress-test pattern, authored before the pattern was named.** Section 5 ("Belongs elsewhere") explicitly records cross-entity findings inline as the document was produced. Section 6 (open questions) anticipates several of the structural questions the stress-test pass would surface. The pattern was already being practised, just not labelled. **Classification:** observation only, no fix needed. The naming itself is the fix; the inspirational input does not need rewriting to match the new vocabulary.

2. **The B.2 bridge's "lateral drift surface" gap (G-NN) is the routing mechanism for cross-entity findings.** It was registered without yet being connected to the stress-test pattern as their *generator*. When that gap's resolution session runs, the resolution should explicitly cover findings produced by the stress-test pattern, not only findings produced ad-hoc. **Classification:** noted in §"Tensions and non-obvious insights" below; revisit when the lateral-drift gap's resolution session is scheduled.

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** B.2 resumption in the other chat session, using the rhythm locked here as orientation. The other chat session does not need to wait for cascade-plan Session 1 to land before resuming — B.2 was already cleared to proceed against pre-Session-1 state per the cascade-plan bridge.

**Deferred this session:**
- **Naming the pattern as a methodology step in `ecosystem-decomposition` skill.** Sequenced for after a second instance of evidence (cascade-plan Session 4 is the natural candidate). Don't formalise on one data point; one session's worth of evidence might rationalise a fluke. Two sessions across two different decompositions (Hub L3 capabilities; tier-CLAUDE content audit) is the minimum bar.
- **Designing the lateral-routing mechanism for cross-entity findings.** This is the B.2 bridge's G-NN gap, registered there, scheduled to land in its own session. This bridge connects the stress-test pattern to that gap as the generator of findings; the gap still has to be solved.
- **Updating `2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md` to use the new vocabulary.** Not needed; the file is fit for purpose as B.2's input. New vocabulary applies to future inspirational inputs.

**Deferred from earlier sessions (carried forward, unchanged):**
- All G-01 through G-28 entries except where Sessions 1–4 of the cascade plan affect them (per the cascade-plan bridge).
- Block B.2 paused state itself — no change. This bridge's rhythm is consumed when B.2 resumes; the resumption itself is the unpause event.
- All cosmology questions (deferred per Stefan's earlier call, unchanged).

**Out of scope per the same horizontal-axis guardrail used since 2026-04-22:**
- Wave scoping, wave progress, wave DoD
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

---

## Next session — orientation seed (the other chat session)

Per the locked principle: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed.

**The other chat session is resuming B.2 — Hub L3 capability inventory authoring.**

Read first, in order:
1. **The B.2 bridge** — `docs/planning/sessions/2026-04-28_01_-_BLOCK-B2-HUB-L3.md`. The full B.2 reading list and authoring plan live there. **This bridge does not displace it.**
2. **This bridge** — `docs/planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md`. Refines the authoring rhythm (steps 1–3 of the L3 authoring plan now follow the stress-test pattern explicitly).
3. **The inspirational input** — `docs/planning/sessions/2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md`. Per the B.2 bridge: inspirational input, not authority.
4. **L1/L2 sources** — VISION, DESCRIPTION, L2 sections of SPECIFICATION — for the cold-derivation step. Read these before the inspirational input's master appendix; the temptation to anchor on §7 of the input rather than re-derive is the failure mode to avoid.

**Specific watch-points for B.2 resumption:**
- **Cold-derivation discipline.** Step 1 of the stress-test pattern is non-negotiable. The candidate inventory is authored before the inspirational input's §7 master appendix is consulted as a comparison instrument, not as a transcription source. Anchoring is the failure mode; re-deriving freshly is the discipline that catches it.
- **Cross-entity findings collection.** Step 2 will produce findings outside Hub. Stefan has confirmed this happens in practice (it is what motivated this bridge). Record them in the sources-status block as caveats; do not silently drop them; do not invent a new register without consulting the lateral-routing gap.
- **The two-column template deviation.** Per B.2 bridge: capability table adds Founding-question(s) and Dimension(s) columns. This is non-controversial; just remember to do it.
- **G-NN gap registration.** First session-opening action per B.2 bridge. Verify next available number — if cascade-plan Session 1 has *not* landed by the time B.2 resumes, the next number is G-29; if it has, G-29 + G-30 + G-31 (this bridge's G-31) are taken and the lateral-drift gap is G-32.

**B.2 closure produces a session-close bridge.** Per the discipline, the closing bridge writes the next-session orientation seed for whatever comes next (B.3? ROADMAP? Stefan's call per B.2 bridge).

---

## Tensions and non-obvious insights

**The pattern was already being practised; the naming is what unlocks reuse.** This is the same shape as the cascade-plan bridge's "the cascade principle was implicit; making it explicit is an unlock." Two sessions in a row, the methodology has surfaced a discipline that was de facto in use but not yet labelled. Worth noting that the descent itself is a methodology-completeness probe: each entity descended produces both spec content and a methodology-completeness gap. The cost the descent feels expensive *because* of this — but the methodology-gap output is a parallel artifact that pays off downstream, not slow methodology overhead. Naming the pattern to make this explicit reduces the temptation (which Stefan voiced) to "go faster" in ways that would lose the parallel artifact.

**"Code is mostly correct" and "specs are authoritative" are compatible, not in tension.** Stefan pushed on this directly — and the resolution is that direction-of-authority is about disagreement-resolution, not ignorance. The architect can read the code; what they cannot do is *source* the specification from the code. The stress-test pattern formalises this distinction. It is the same shape as a peer reviewer reading a draft: the reviewer reads everything, but the author owns the draft. Code is reviewer; spec is author.

**The lateral-drift gap (B.2's G-NN) and the stress-test pattern were registered separately but are tightly coupled.** Lateral-drift gap is *routing*; stress-test pattern is *generation*. Without the pattern named, the lateral-drift gap looks like an ad-hoc mechanism for occasional cross-entity findings; with the pattern named, the lateral-drift gap is the standard handler for an enumerated output of a standard methodology step. **This sharpens the lateral-drift gap's resolution scope.** The mechanism it designs has to handle a recurring, structured input, not occasional surprises.

**The autonomy split's organising principle generalises beyond this work.** "Autonomy is licensed in bounded mechanical activities with fixed output shapes" is a useful frame for *all* future autonomy decisions, not only this descent. Worth carrying forward as a heuristic for cycle work too — DoD verification, ESLint sweeps, BDD test scaffolding all fit "bounded mechanical with fixed output." Migration planning, gap registration, taxonomy decisions don't. The descent is just the place where the heuristic was first articulated.

**This session is itself a test of the cascade-plan bridge's "pivot bridges are first-class artifacts" claim.** Three sessions ago this would have been buried inside a B.2 sub-section. The discipline of treating pivots as their own bridges has now produced two pivot bridges in four days. The pattern is stable enough that it could be promoted from "lesson learned" to "expected operating mode" — but, consistent with the deferral discipline, that promotion should also wait for a second piece of evidence, which arguably this very bridge constitutes (this is now the second pivot bridge of the kind). Worth flagging for the next process retrospective.

---

## Open questions surfaced (this session)

**New:**
- **Should "stress-test pass" become a named step in the `ecosystem-decomposition` skill, or should it remain a per-session discipline?** Decision-deferred per the "two-instance evidence" rule. Cascade-plan Session 4 is the natural second instance; B.2 is the first. After Session 4, decide.
- **The lateral-drift gap's resolution scope expanded by this bridge.** Originally framed as routing for occasional findings; now framed as standard handler for stress-test-pattern outputs. The gap's resolution session needs to know this. Watchpoint: when scheduling the lateral-drift gap's resolution, re-read this bridge first.

**Carried forward (unchanged):**
- Cosmology constitutional question (deferred).
- Cross-product paired-spec naming convention (B.1 §8.5; expected to surface in B.3).
- B.2 three shape questions are now resolved per the B.2 bridge; nothing carried forward there.

---

## Draft artifacts for downstream landing

### Draft G-31 entry (lands in `gaps.md` during cascade-plan Session 1)

```
## G-31 — Stress-test pattern not yet named in `ecosystem-decomposition` skill

**Priority:** Medium

**Description:** The "code-informed stress-test pass" methodology step (architecture-derived inventory first, code-informed comparison second, three-class delta with cross-entity findings routed laterally) is currently practised on a per-session judgment basis. It has been used in B.2 Hub L3 (the first instance) and is queued for cascade-plan Session 4 (the candidate second instance). The pattern is currently undocumented in `ecosystem-decomposition` skill; only ad-hoc session-bridge memory carries it forward.

**Why it matters:** The pattern is the generator of cross-entity findings (which the lateral-drift gap routes). Without a named methodology step, future entity descents (Gimbal L3, Studio L3, Domain Service L3) may skip the stress-test pass or apply it inconsistently, missing structural completeness probes and producing under-specified candidate inventories. The methodology's value is reproducibility; without naming it, it is not reproducible.

**Proposed fix:** After cascade-plan Session 4 produces the second instance of evidence, evaluate whether to add a "Stress-test pass" sub-section to `ecosystem-decomposition` (likely positioned within the L3 mechanics section, possibly also referenced from L2 and L4). Draft the section to specify (a) the three-step ordering, (b) the three output classes, (c) the connection to the lateral-routing mechanism (whatever that gap's resolution produces), (d) when the pass is required versus optional.

**Origin:** Surfaced 2026-04-30 during the methodology-design pivot bridge `2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md`. Connected to the lateral-drift gap (G-NN of B.2 bridge; check actual ID at session start) as routing-of-output.
```

### Orientation seed for the other chat session

> **You are resuming Block B.2 — Hub L3 capability inventory authoring.**
>
> Two bridges and one inspirational input frame the work. **Read in order:**
> 1. `docs/planning/sessions/2026-04-28_01_-_BLOCK-B2-HUB-L3.md` — the B.2 bridge. Full reading list, authoring plan, granularity micro-decisions, namespace-collision check, MEM-16 inline-fix, the lateral-drift G-NN registration. **Authoritative for B.2.**
> 2. `docs/planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md` — the methodology-design bridge. Refines the authoring rhythm: cold L1+L2 derivation first, then code-informed stress-test pass against the inspirational input's master appendix and (if useful) the Hub codebase, then adjudication. Three output classes; cross-entity findings recorded as sources-status caveats pending the lateral-routing gap's resolution.
> 3. `docs/planning/sessions/2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md` — the inspirational input. Read after L1+L2 sources and after authoring the cold candidate inventory; consult §7 master appendix as comparison instrument, not transcription source.
>
> **Open with the two green-light decisions** the B.2 bridge specifies (authoring plan; granularity micro-decisions). After greenlight, proceed: verify next G-NN number (gaps.md), resolve namespace collision (ADR-U023), author §L3, inline-fix MEM-16 in a separate commit, populate sources-status with the items B.2 bridge enumerates plus the stress-test pattern's outputs subsection.
>
> **No L4 work.** **No ROADMAP authoring.** **No entity-CLAUDE.md files.** All deferred per their respective bridges.

---

*Last updated 2026-04-30 at session close (first bridge of the day; methodology-design pivot from a session-pacing question; B.2 still paused). One new gap to be registered (G-31) in cascade-plan Session 1; zero gaps closed; zero files authored; one paused block (B.2) carried forward to the other chat session for resumption.*
