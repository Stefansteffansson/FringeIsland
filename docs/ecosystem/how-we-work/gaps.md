# Gaps register

**Status:** twenty-six known documentation and design gaps across the FringeIsland development system as of 2026-06-10.

**Purpose:** a single place to see every gap flagged in the [how-we-work](./README.md) chapters, grouped by axis, with suggested resolution and priority.

**Discipline:** when a gap is resolved, delete its entry here and remove the callout from the relevant chapter. When a new gap is surfaced in a session, add it here with an ID continuing the sequence.

---

## Quick index

| ID | Axis | Gap | Priority | Proposed fix |
|----|------|-----|----------|--------------|
| G-02 | Decomposition (L4) | Cross-product feature sync | Medium | Extend `ecosystem-decomposition` skill with paired-spec sync protocol |
| G-03 | Decomposition (cross-cut) | Vertical specs are scaffolds | **High** | Populate §3 through §6 of each of the five vertical specs |
| G-04 | Cadence | Wave ↔ roadmap relationship | Medium | Session decision: do waves replace, duplicate, or complement roadmaps? |
| G-05 | Cadence | Review queue not operationalized | **High** | Extend PROCESS.md or `feature-development` skill with review handoff protocol |
| G-06 | Cadence | Multi-agent task locking | **High** | ADR + `assigned_to` atomicity rule in `feature-development` skill |
| G-07 | Cadence | Ferd DoD empty | Medium | Populate `docs/planning/waves/ferd.md` DoD section |
| G-09 | Execution (kanban) | Refinement ritual undocumented | Medium | Extend `ecosystem-decomposition` skill with the refinement activity (not just artifacts) |
| G-10 | Execution (kanban) | Board mechanic unchosen | Medium | Decision + documentation: pick a tool (GitHub Projects / Linear / MD-query / …) |
| G-11 | Execution (build) | TDD overstated vs risk-based | Low | Reconcile root CLAUDE.md and the research report — ADR or doc fix |
| G-12 | Execution (build) | Given/When/Then to test translation | **High** | Extend `feature-development` skill with G/W/T→test translation mechanic |
| G-13 | Execution (build) | Build hygiene unspecified | Medium | Document branching, commit cadence, PR shape in `feature-development` skill |
| G-14 | Execution (kanban) | Discovery 0→2 flow orphaned | Medium | Extend `ecosystem-decomposition` skill with explicit idea-to-explored transition |
| G-15 | Agent routing | Cross-tier entry order | Medium | Rule in root CLAUDE.md or skill: which tier CLAUDE.md loads first for cross-tier work |
| G-16 | Agent routing | Skill chaining undocumented | Medium | Add a "common chains" section to PROCESS.md §6.5 or root CLAUDE.md || G-18 | Execution (research) | Research pathway under-specified | Medium | Unify maturity-2, spike, and research-report mechanisms; describe how research enters the backlog and how findings feed specs |
| G-19 | Cadence (horizontal) | Wave-planning skill needs structural review | Medium | Run a structural review of `wave-planning` skill parallel to the 2026-04-22 review of `ecosystem-decomposition`; define its Sources, upstream dependencies, write scope, and boundary with the vertical axis |
| G-20 | Decomposition (downstream) | Reconciliation activity has no defined home | Medium | Decide where reconciliation lives (own skill / mode inside `feature-development` / named workflow); currently named only in prose in the `ecosystem-decomposition` skill |
| G-22 | Decomposition (cross-level) | Legacy pre-refactor FEAT-*.md need absorb-and-delete discipline | Medium | Add a discipline to the ecosystem-decomposition skill: when L3 runs fresh on an entity with legacy FEAT-*.md files, inspirational insight is absorbed into L1/L2/L3 first, then legacy specs are deleted in the same commit that lands new L4 specs |
| G-23 | Documentation hygiene | Stale references to superseded authorities across the repo | Medium | Grep-pass audit for references to `2026-04-10_-_SESSION-BRIDGE.md` as a dependency-rule authority and for lingering ADR-U001 L0–L7 references; repoint each hit to ADR-U023 or the V4 anatomy as appropriate |
| G-25 | Documentation tooling | How-we-work rendered views drift between markdown updates | Medium | Closed-loop mechanism (make target / pre-commit hook / `doc-health-check` extension) that detects when the canonical docx or `index.html` is older than any `how-we-work/*.md` source; README also needs correction (names `.docx` as canonical when `_3.docx` is current) |
| G-27 | Documentation hygiene | `PRODUCTS_AND_PLATFORM.md` staleness vs. authoritative status | Medium | The `ecosystem-decomposition` skill names this strategy doc as authoritative L2 read context. The file is dated March 2026 / Version 0.2 / "Living document" and was authored before ADR-U022 (named waves), ADR-U023 (Platform Core / Domain Services decomposition), ADR-U024 (wave model semantics), and the Block A template additions. A freshness pass is needed: re-read against current ADRs, update or annotate sections that are now superseded, decide whether the doc remains authoritative or is reframed as historical strategy with current strategy split out. |
| G-28 | Documentation hygiene | Trust-disk-over-memory as a cross-cutting discipline | Low | Two related rules already exist in different skills: (a) the AGENTS.md cross-check rule referenced by `doc-health-check` §3.6 ("when a grep returns no hits, confirm with a direct listing before concluding something is absent"), and (b) the citation-verification rule added to `ecosystem-decomposition`'s Quality checklist on 2026-04-26 ("every cited file path was verified against a directory listing before commit"). Both are forms of "trust disk over memory." Candidate consolidation: promote a single, named principle to root `AGENTS.md` or root `CLAUDE.md` so it can be referenced from any skill rather than restated. |
| G-29 | Decomposition (lateral) | Lateral routing for cross-entity findings produced by L3 stress-test passes | Medium | Design a routing mechanism that captures expected-dependency claims surfaced by an entity's L3 derivation and surfaces them to the targeted entity's pickup list before that entity's L3 runs |
| G-30 | Agent routing | Tier CLAUDE.md files contain miscategorised entity-specific content | Medium | Walk each tier `CLAUDE.md` against the five-row content policy in root `CLAUDE.md`; migrate Hub-specific rules out of `products/CLAUDE.md` and Core/Domain-specific guidance out of `platform/CLAUDE.md` into entity- or sub-tier-level files |
| G-32 | Decomposition (post-L3 gate) | Entities with shipped §L3 lacking reader tours — backfill obligation | Medium | Per-entity backfill when §L3 lands; `doc-health-check` flags entities with §L3 present and `tours/HUMAN.md` or `tours/TECHNICAL.md` absent |

---

## Grouped by axis

### Decomposition cascade — chapter 01

**G-02 — Cross-product feature sync (L4).**
The `ecosystem-decomposition` skill defines the paired-spec pattern: "A single capability often spans multiple owners (e.g., Hub UI + Platform data model). Create separate feature specs for each owner and link them via 'Platform dependencies' and 'Cross-product impact.'" The linking is named; the synchronization is not. When FEAT-H005 changes its acceptance criteria, nothing alerts FEAT-PD003's owner that a consumer assumption has changed. The DoR check fires once at spec creation; nothing fires afterwards.

*Proposed fix:* extend the `ecosystem-decomposition` skill with a short "cross-product sync" procedure — ideally at cycle boundary as part of the `doc-health-check` sweep. A simple grep for cross-referenced FEAT IDs + a timestamp comparison would catch most drift.

**G-03 — Vertical specs are scaffolds (cross-cut).** **Highest-priority gap in the whole document.**
Five vertical spec files exist (`docs/verticals/{administration,privacy,notifications,observability,transactions}.md`). Their §1 (Purpose) and §2 (Scope) are written. Their §3 (tier-specific obligations), §4 (cross-cutting checklists that feed DoD), §5 (tooling), and §6 (failure modes) are all marked "currently partial — to be refined." Meanwhile, the feature-spec template mandates that every feature complete a Vertical Impact section addressing all five — no blanks. Authors are forced to fill sections against stubs. They necessarily invent implicit definitions of what each vertical means, those definitions diverge across specs, and when the vertical specs are eventually populated, a subset of shipped features will be out of compliance.

*Proposed fix:* populate §3 through §6 of each of the five vertical specs. This is probably a full cycle's worth of focused work. Suggested order: Privacy (most feature-touching) → Observability → Administration → Notifications → Transactions. Each population cycle should also update the corresponding "Verticals: obligations on this tier" section in the five tier `CLAUDE.md` files.

### Cadence and waves — chapter 02

**G-04 — Wave ↔ roadmap relationship.**
PROCESS.md §3 references `docs/ecosystem/ECOSYSTEM_ROADMAP.md`, product roadmaps, and `docs/platform/core/ROADMAP.md` as things to update at cycle boundary. Separately, wave files exist under `docs/planning/waves/`. If the ecosystem roadmap shows "NOW: Ferd / NEXT: Eid / LATER: Hamn", it duplicates the waves band. If it shows NOW/NEXT/LATER features independent of wave grouping, it's a separate planning layer not currently reflected in the how-we-work diagrams.

*Proposed fix:* session decision, probably during a cooldown week. Three options — (a) waves replace roadmaps, (b) roadmaps are NOW/NEXT/LATER within waves, (c) waves and roadmaps are orthogonal planning layers. Then update `ecosystem-decomposition` skill, `wave-planning` skill, and chapter 02 of this doc to match.

**G-05 — Review queue not operationalized.** **High priority.**
Tasks have `status: review` and `assigned_to` in frontmatter. No document describes how a reviewer is chosen, how a task flows from in_progress to review to approved (or back to in_progress with changes requested), or how the WIP-at-review rule actually bites. The bottleneck the WIP limit is supposed to enforce has no enforcement mechanism.

*Proposed fix:* extend `feature-development` skill with a Review section covering: reviewer assignment (who, how), the review checklist (verify DoD, verify acceptance criteria pass end-to-end), the review outcome (approved → merged → done / changes requested → back to in_progress), the WIP enforcement (if 3 items are already in review, new tasks can't move out of in_progress until one clears).

**G-06 — Multi-agent task locking.** **High priority.**
WIP is a personal-kanban construct. At 50+ parallel contributors — the stated architectural target — two agents can independently pick up the same TASK-*.md. The `assigned_to` field is the obvious lock primitive, but no atomicity rule, first-to-claim-wins mechanic, or collision detection is specified.

*Proposed fix:* ADR on multi-agent task acquisition. Probably a combination of (a) `assigned_to` is empty-or-self-only rule (git pre-commit hook could enforce), (b) explicit "claim" step in `feature-development` skill before starting a task, (c) optional — a TASK-LOCK file or similar atomicity primitive for high-contention cases. This is a load-bearing ADR for the ecosystem's scaling path.

**G-07 — Ferd DoD empty.**
The wave-spec template has the DoD shape. `docs/planning/waves/ferd.md` has not had the Ferd-specific criteria populated. Without it, "are we done with Ferd?" cannot be answered concretely.

*Proposed fix:* populate the DoD section in `docs/planning/waves/ferd.md`. This is the natural work product of a session using the `wave-planning` skill. Suggested timing: during the cooldown before Eid begins ramping up.

**G-19 — Wave-planning skill needs structural review (cadence, horizontal).**
The 2026-04-22 session rebuilt the `ecosystem-decomposition` skill around explicit per-level Sources, upstream dependencies, and write scope. The `wave-planning` skill — the horizontal-axis counterpart — has not had the same structural review: its Sources, upstream dependencies, write scope, and boundary with the vertical axis are undefined. The skill's own description names this gap; the self-reference resolves when the review runs.

*Proposed fix:* run a structural review of `wave-planning` parallel to the 2026-04-22 review of `ecosystem-decomposition` — define its Sources, upstream dependencies, write scope, and boundary with the vertical axis.

### Execution — chapters 03 and 04

**G-09 — Refinement ritual undocumented.**
Maturity levels 0→1→2→3→4 are named. The activity that produces the transitions is not. Is it a recurring meeting? A solo shaping session? A back-and-forth with Claude? The canonical skill describes artifacts at each level; it doesn't describe how to actually refine one into the next.

*Proposed fix:* extend `ecosystem-decomposition` skill with a "refinement" section — the activity patterns for each transition. Probably: 0→1 is a solo pause to articulate the problem; 1→2 is research (a spike or a research doc under `docs/research/`); 2→3 is story writing with Given/When/Then; 3→4 is DoR pass with Stefan as product owner.

**G-10 — Board mechanic unchosen.**
Six-column kanban board depicted on the execution axis. No document says where that board physically lives. GitHub Projects? Linear? A markdown table? A query over YAML frontmatter? PROCESS.md §3 names the WIP limit without specifying the artifact.

*Proposed fix:* session decision during a cooldown. For solo current-state, a markdown table + YAML frontmatter queries via `grep` is probably enough. For 50+ contributors a proper tool is needed. Separate the two decisions: pick the current-state tool, document how it maps to the board states; flag "scale tool" as a wave-boundary decision for Eid or later.

**G-11 — TDD overstated vs risk-based.**
Root `CLAUDE.md` mandates TDD. The research report permits risk-based testing as an alternative. The stricter version was inherited without an explicit decision.

*Proposed fix:* either (a) drop the strict TDD mandate and update root `CLAUDE.md` to match the research, or (b) keep the stricter position and justify it in an ADR. Low priority because the tension is small in practice — the *testing discipline* matters; whether tests come first or shortly after is often situational.

**G-12 — Given/When/Then to test translation.** **High priority.**
The feature-spec template requires Given/When/Then scenarios. Jest, Playwright, and pgTAP exist in the stack. No document describes how a scenario in a feature spec becomes a concrete test case. The single highest-leverage practice from the research — one artifact serving as spec, tests, and AI prompt — has no documented translation mechanic.

*Proposed fix:* extend `feature-development` skill with a "scenarios to tests" section. A worked example: take one scenario, show how it lands in a unit test, an integration test, and an E2E test. Anchor the convention ("the story ID appears as a comment at the top of the test; the Given/When/Then becomes the test's arrange/act/assert").

**G-13 — Build hygiene unspecified.**
No branching strategy. No commit cadence beyond "conventional commits". No PR shape. No guidance on when to open, how to structure, who reviews. At 50+ contributors the absence is load-bearing.

*Proposed fix:* extend `feature-development` skill with a Build Hygiene section. Branching strategy (feature/TASK-NNN from main, PR back to main). Commit cadence (logical chunks, not "WIP" commits). PR shape (title references task + feature, description summarises acceptance-criteria coverage and DoD status). Likely needs an ADR for the branching strategy specifically if it has knock-on effects for CI.

**G-14 — Discovery 0→2 flow orphaned.**
`ecosystem-decomposition` skill covers levels 1-5 as artifacts. The transition from "raw idea I noticed this morning" to "problem-identified concept" (the 0→1 move) and from concept to explored (1→2) has no explicit home.

*Proposed fix:* add a level-0 section to `ecosystem-decomposition` skill describing capture (where does a raw idea land? `OPEN_QUESTIONS.md`? a lightweight `FEAT-*.md` at maturity 0? Both?), articulation (how does it become maturity 1?), and exploration (how does it become maturity 2? spike ticket? research document? short investigation session?).

**G-18 — Research pathway under-specified.**
Three research mechanisms exist in the system but are not unified or connected to the backlog: (1) maturity 2-explored is described as a research stage on a feature spec; (2) `spike` is listed as a work-item type with a template at `docs/templates/research-spike.md`, defined as time-boxed research producing findings + follow-up items; (3) `docs/research/` holds long-form research reports that inform strategic and architectural decisions (e.g. the two reports that shaped PROCESS.md itself).

What's missing is the connective tissue. When does a question warrant a spike versus a research report? How do spike findings flow back into affected feature specs? How do research-report conclusions become ADRs, skill updates, or new features? When a spike produces follow-up items, how do they enter the backlog at the right maturity level with the right context preserved? This gap is related to but distinct from G-14: G-14 is about ideas entering the system; G-18 is about ideas being validated before they become commitments.

The gap compounds as waves mature. Ferd is foundation work where most research was done before PROCESS.md existed; Eid (narrative design + design tools) will require significantly more investigative research that the current system has no natural home for.

*Proposed fix:* add a Research pathway section to `ecosystem-decomposition` skill or PROCESS.md §6 that: (a) distinguishes spike (cycle-scoped, produces follow-up items) from research report (wave-scoped or cross-wave, produces principles); (b) describes how a question becomes a spike (it's a `type: spike` backlog item); (c) describes how spike findings feed back — affected feature specs are updated, follow-up items become new feature specs at maturity 0-1; (d) describes when to escalate a spike to a research report (cross-wave significance, architectural implications, external-facing strategy). Consider whether `research-spike.md` template should gain a "Feeds into" field.

**G-20 — Reconciliation activity has no defined home (decomposition, downstream).**
The 2026-04-22 rewrite of the `ecosystem-decomposition` skill locked that **reconciliation is a separate activity, downstream of derivation** — L3 and L4 produce authoritative output derived fresh from upstream, and existing artifacts (pre-refactor specs, current code) are compared against that authoritative output as a distinct activity. The skill names two reconciliations: inventory-against-existing-specs (run after fresh L3) and spec-against-code (run after L4). But the activity itself has no skill, no workflow, and no named home. It currently runs as a named activity in whatever skill context is active when it's needed, which is not sustainable at fifty contributors.

*Proposed fix:* session decision to pick a home. Three plausible options — (a) own skill (`reconciliation` or similar), (b) mode inside `feature-development` since spec-against-code reconciliation produces cycle work, (c) embed reconciliation mechanics inside `ecosystem-decomposition` as a post-derivation section. Option (b) is probably the natural fit for spec-against-code; option (c) might work for inventory-against-existing-specs. Leaning toward: defer the decision until reconciliation has actually run once in practice, which will inform its shape. Flag this gap when wave 1's first reconciliation happens.

**G-22 — Legacy pre-refactor FEAT-*.md need absorb-and-delete discipline (decomposition, cross-level).**
The 2026-04-22 rewrite locked Resolution A and choice (a): L4 derives feature specs fresh from L3's inventory and reads zero pre-refactor FEAT-*.md files; any inspirational value from the legacy specs is absorbed upstream (at L2 or the start of L3) into DESCRIPTION.md, SPECIFICATION.md, or the capability inventory before L4 runs; legacy specs are then deleted as part of the commit that lands the new L4 specs. This discipline is described in the skill but has no enforcement. Without it, someone may run L3 on an entity with legacy specs, produce a fresh capability inventory, and leave the legacy FEAT-*.md files in place "just in case" — re-introducing the exact contamination the discipline is designed to prevent.

*Proposed fix:* (a) make the absorb-and-delete step an explicit substep in the skill's Level 3 section (currently it's only named in the cross-skill prose about inspirational input); (b) add a `doc-health-check` check for "entities where L3 has recently run that still have legacy FEAT-*.md files" — the check triggers on the signal that a SPECIFICATION.md capability-inventory section was updated in the last cycle.

**G-23 — Stale references to superseded authorities across the repo (documentation hygiene).**
ADR-U023 (2026-04-12) locked the current ecosystem anatomy and superseded the earlier L0–L7 tier model from ADR-U001. During Commit 3 on 2026-04-24, a stale reference was caught in `docs/templates/domain-service-spec.md` pointing at `docs/planning/sessions/2026-04-10_-_SESSION-BRIDGE.md` as the authority for domain-service dependency rules. That session bridge is a valid historical artifact, but it is no longer the authority — ADR-U023 is. A single repo-wide audit would likely surface several such references across docs, session bridges, CLAUDE.md files, skills, and the how-we-work chapters. Not urgent (nothing breaks; a reader pointed at the April 10 bridge still gets accurate historical context) but a silent drift surface that compounds over time.

*Proposed fix:* grep-pass audit for references to `2026-04-10_-_SESSION-BRIDGE.md` as a dependency-rule authority, `ADR-U001` references in active prose (not as historical citations), and lingering "L0", "L1 Infrastructure", "L2 Identity" style language from the retired tier model. Each hit is classified: historical/fine (describing what used to be the case), authority-superseded/fix (repoint to ADR-U023 or the V4 anatomy), ambiguous/discuss. One focused cooldown session should clear the backlog.

**G-29 — Lateral routing for cross-entity findings produced by L3 stress-test passes (decomposition, lateral).**
The 2026-04-30 stress-test pattern bridge (`docs/planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md`) names a three-step L3 authoring pattern (cold derivation → code-informed stress-test pass → adjudication) whose stress-test step produces a structured delta in three classes. Two of the three classes (confirms, entity-internal delta) have natural homes inside the candidate inventory itself. The third class — **cross-entity findings** (empirical or architectural artifacts that don't belong to the candidate entity at all but to another entity entirely) — has **no canonical home**. Without a routing mechanism, these findings either get silently dropped, get captured ad-hoc inside the candidate entity's spec where they don't belong, or live in session-bridge memory until they're forgotten. The Hub L3 derivation (Block B.2) is the first instance producing such findings. Cascade-plan Session 4 (tier-CLAUDE content audit) was initially named as the natural second instance, but the 2026-05-03 cross-entity-findings audit (per `docs/planning/sessions/2026-05-03_03_-_PROGRAM-FRAMING-AND-RESTART.md`) verified the work-shape mismatch: Session 4's cascade-content audit performed vertical movement through cascade levels — deciding which level of the hierarchy owns each rule — not per-entity capability derivation, and the stress-test pattern only produces cross-entity findings when applied to per-entity L3 derivation. Cascade-content audit produces categorisation-axis findings instead (verification-and-delete, destination-classification-by-readership-via-cascade — captured in the cascade-plan close-out's §3 candidate ledger). The "different decomposition surface" qualifier in the original framing turned out to be load-bearing in a way that wasn't visible at gap-write time. Next true second-instance candidate is the next per-entity L3 derivation with stress-test pass — Platform Core area, a Domain Service, a Studio, or a sibling product. Without lateral routing, downstream entity L3 sessions will not inherit the pickup-context that prior entities' stress-test passes generated for them, and the structural-completeness probe value of the stress-test pattern is lost.

*Proposed fix:* design a routing mechanism. Don't pre-decide the shape — candidate options noted in the originating B.2 bridge include (a) per-entity expected-dependency appendix in every L3 spec, template-wide; (b) separate registry file (e.g., `docs/architecture/expected-dependencies.md`); (c) follow-up notes appended to each entity's pickup list. Each has different ergonomics for the entity author writing the finding, the entity author later reading the finding, the cycle-boundary review that ensures findings don't accumulate unread, and the `doc-health-check` skill that would verify the mechanism's discipline holds. The resolution session designs the mechanism and updates `ecosystem-decomposition` skill to make the routing step part of the L3 stress-test pattern's adjudication phase. **Connection to former G-31:** G-31 (stress-test pass naming in `ecosystem-decomposition` skill) closed at Phase 2 close-out, 2026-05-16. G-29 covers routing the cross-entity findings the named stress-test pattern produces; the routing mechanism remains a per-session caveat in sources-status until G-29 resolves.

**G-32 — Entities with shipped §L3 lacking reader tours — backfill obligation (decomposition, post-L3 maturity gate).**
The 2026-05-03 reader-tours-promotion session named two reader tours (HUMAN, TECHNICAL) under `{entity}/tours/` as a post-§L3 maturity gate, registered in the `ecosystem-decomposition` skill and PROCESS.md §6. The gate applies to every entity in the ecosystem; first-instance execution landed for Hub in the same session. Entities that ship §L3 without producing both tours are out of compliance with the gate. Hub: resolved in same-session execution; remaining entities pending §L3 maturity. The gap exists as a forward marker — when the second entity ships §L3, this gap surfaces the backfill obligation; if a future entity ships §L3 without producing tours, this gap surfaces the regression.

*Proposed fix:* per-entity backfill triggered when §L3 lands. The `doc-health-check` skill is the natural enforcement point — at cycle boundaries, flag any entity with §L3 present and `tours/HUMAN.md` or `tours/TECHNICAL.md` absent.

*Methodology connection:* the second-entity instance that triggers this gap's first non-Hub resolution is also the n=2 instance for tour internal-shape convergence (per the `ecosystem-decomposition` skill's Reader-tours subsection). When this gap fires for the second time, both questions resolve together.

### Documentation tooling (cross-cut)

**G-25 — How-we-work rendered views drift between markdown updates (documentation tooling).**
The `how-we-work/` directory contains canonical markdown chapters (five files, chapter 01 through chapter 05) and rendered views of those chapters: `FringeIsland-how-we-work.docx`, `FringeIsland-how-we-work_2.docx`, `FringeIsland-how-we-work_3.docx`, `FringeIsland-how-we-work_4.docx` (current canonical render as of 2026-06-10), and `index.html`. The README's living-document discipline says "update the relevant chapter first, then re-check cross-references" — markdown is authoritative. But no mechanism detects when rendered views have fallen behind the markdown source. Symptoms as of 2026-04-24: the README names the unsuffixed `.docx` as canonical when `_3.docx` is actually current; `_2.docx` is an untracked intermediate; regenerating `_3.docx` after a markdown edit is a manual step with no reminder. *(2026-06-10: the README now points at `_4.docx` as the current render; regeneration remains a manual step, and `index.html` plus the chapter gap-callouts still lag the register — the closed-loop mechanism is the open remainder of this gap.)*

*Proposed fix:* a closed-loop mechanism. Candidate approaches — (a) a make target / npm script that regenerates all rendered views from markdown (pandoc for docx, a simple script for index.html), invoked on-demand or via pre-commit hook; (b) a `doc-health-check` Section-9-candidate that compares mtimes of rendered views against the markdown sources and flags any rendered view older than any source; (c) both. The README also needs correction to name `_3.docx` as canonical (or the canonical naming convention needs rethinking so there's no numbered suffix on the authoritative file). Low-cost to implement; compounds silently otherwise.

**G-27 — `PRODUCTS_AND_PLATFORM.md` staleness vs. authoritative status (documentation hygiene).**
The `ecosystem-decomposition` skill names `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md` as authoritative L2 read context. The file is dated *Version 0.2 — March 2026* with status "Living document." Several of its claims predate locked architectural decisions: the wave names are present (Ferd, Eid, Hamn, Heim, Brim, Urd) but the underlying anatomy framing (Platform Core / Domain Services split per ADR-U023, the seven-domain-service decomposition, the Surfaces tier per V4) is not reflected. The doc is internally consistent and historically valuable, but it is being read by L2 authors as authoritative *current* strategy when in fact parts of it predate the current model. Surfaced during the 2026-04-26 Hub L2 walk — the doc was used for context but its staleness was visible.

*Proposed fix:* a freshness pass. Re-read against ADR-U022 (named waves), ADR-U023 (Platform Core / Domain Services decomposition), ADR-U024 (wave model semantics), and the Block A templates that landed 2026-04-26. Either (a) update the doc inline with a clear "Updated 2026-04-XX against ADR-U023/U024" note, or (b) reframe the doc as historical strategy with a pointer to a successor authoritative-strategy doc, or (c) split it: keep historical narrative (Hero's Journey arc, family-of-products framing) as evergreen, separate the time-sensitive wave/anatomy claims into a current-state doc that references the locked ADRs. One focused session.

**G-28 — Trust-disk-over-memory as a cross-cutting discipline (documentation hygiene).**
Two related rules already exist in different skills: (a) the AGENTS.md cross-check rule referenced by `doc-health-check` §3.6 ("when a grep returns no hits, confirm with a direct listing before concluding something is absent"), and (b) the citation-verification rule added to `ecosystem-decomposition`'s Quality checklist on 2026-04-26 ("every cited file path was verified against a directory listing before commit; never inferred from a description, a memory of the filename, or another document's citation"). Both are forms of "trust disk over memory." The pattern recurred in the 2026-04-26 Hub L2 walk: three ADR filenames were inferred from descriptions and got the wrong filename in each case. The verification step caught all three before commit, but the failure mode is generic enough to deserve a single named principle.

*Proposed fix:* promote a single principle to root `AGENTS.md` or root `CLAUDE.md`, named (proposal: "trust disk over memory" or "verify before cite"), so per-skill restatements can reference one canonical rule rather than each independently restate it. The two existing per-skill rules then become applications of the principle rather than independent inventions. Low-cost; high-leverage if it prevents the same failure recurring under a different surface.

### Agent routing — chapter 05

**G-15 — Cross-tier entry order.**
Step 5 of the load order says "the tier `CLAUDE.md` for where the work lives." For cross-tier features (Hub UI + Platform Domain data model), which tier loads first is undefined. Wrong order means less-relevant tier constraints get internalized first.

*Proposed fix:* rule in root `CLAUDE.md` or in `feature-development` skill: "For cross-tier tasks, load the consumer tier first (the product or studio), then the provider tier (the platform service). Consumer constraints contextualise the work; provider constraints scope the implementation." Alternatively, load both and annotate which is primary.

**G-16 — Skill chaining undocumented.**
Real work crosses skills. `ecosystem-decomposition` to write a spec, then `feature-development` to build it. `feature-development` to mark 6-done, then `doc-health-check` to verify. The four skills are described as discrete; the chains are implicit.

*Proposed fix:* add a "common chains" section to PROCESS.md §6.5 or to root `CLAUDE.md`. Name the three or four chains that matter most. Example: "Specifying and building a new feature: load `ecosystem-decomposition` → write spec → advance to maturity 4 → unload skill → load `feature-development` → implement."
**G-30 — Tier CLAUDE.md files contain miscategorised entity-specific content (agent routing).**
The 2026-04-27 cascade-plan bridge (`docs/planning/sessions/2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md`) surfaced that `docs/products/CLAUDE.md` carries Hub-specific rules (`useAuth()`, `refreshNavigation`, `proxy.ts`, `sb_publishable_*` key format, realtime-channel narrowing) as if they were product-tier rules. They aren't, strictly — they're Hub rules sitting at tier level because Hub is the only active product. Similarly, `docs/platform/CLAUDE.md` folds Core-specific and Domain-specific guidance together despite ADR-U023 naming them as categorically different stability zones. The miscategorisation is invisible today (Hub is the only product loading `products/CLAUDE.md`), but every future Gimbal sub-agent loads Hub-specific bloat as if it were product-tier truth — and a future Gimbal-iOS sub-agent loads even more, web-stack rules irrelevant to native iOS. The cost compounds with every load every time once additional entities go active.

*Proposed fix:* execute Session 4 of the cascade plan — once entity CLAUDE.md files exist as targets (Sessions 2 and 3), walk each tier file against the five-row content policy now in root `CLAUDE.md` and migrate miscategorised rules down to the entity or sub-tier file. Reviewable as granular commits, one migration per commit. Note: the `fringeisland:` MCP file-operations rule landed in `AGENTS.md` on 2026-04-30 (commit 2716f88) ahead of the policy table; Session 4's audit should consider whether that rule's home is still correct under the new policy, or whether part of it migrates to root `CLAUDE.md`.

### Decomposition findings — Phase 3 Hub v2 (vertical axis)

**G-34 — Sharing controls (IDN-7 per-audience visibility) split out of Cycle B; no substrate yet.**
§L3 IDN-7 ("update granular consent decisions **and sharing controls**") bundles two concerns. The consent-decision half is specced and buildable now (FEAT-PC006/PC007 + FEAT-H008/H009, Cycle B). The **sharing-controls** half — per-audience visibility of the member's own aspects (the `1+1` / `1+Community` dimensions; the **PC-3** dependency) — has **no substrate today** (no sharing/visibility table; it is current-state preference data, a different grain from the append-only consent ledger), and it is the building block IDN-7 shares with DIS-6 (discoverability defaults) and COI-1 (Whisp engagement). Decomposition decision (2026-06-29): split delivery — ship the consent half in Cycle B, sequence sharing controls as their own later paired slice. §L3 IDN-7 stays one capability; only delivery is sequenced (mirrors the Cycle A IDN-9/IDN-12 split).

*Proposed fix:* author the sharing-controls paired slice (a PC-3-coupled per-audience visibility substrate + a Hub surface) when Cycle B closes, or when DIS-6 / COI-1 first need it — whichever comes first. FEAT-H009 references this gap as the tracking home so the split-out half is not lost.

**G-35 — PC-4 Governance §L3 under-enumerates the GDPR-cluster capabilities the Hub attributes to it (consent row added 2026-06-29; data-export added 2026-06-30; feature-flags remain).**
`docs/products/hub/SPECIFICATION.md` §L3:366 (the consumer-side cross-entity dependency table) attributes "GDPR consent state, data export request flow, feature flags" to **PC-4 Governance** for IDN-6/7/8 — and ADR-U034 plus the phase-3 plan concur. PC-4's own §L3 capability inventory (`docs/platform/core/governance-specification.md` §L3, derived cold in Phase 2) had enumerated only admin/audit/sanction/force-logout/DeusEx capabilities (plus two LATENT rows). Surfaced 2026-06-29 while authoring the PC-4 consent contracts (FEAT-PC006/PC007): L4 was authoring features for a capability the owning entity's §L3 did not list. The consent *substrate table* (`consent_records`) is PC-2-owned (FEAT-PC002 / IDN-2); the consent-state *governance* capability is PC-4's.

**Partially closed 2026-06-29:** the **consent-state governance** capability row was added to PC-4 §L3 — a forward addition driven by ADR-U034 (which post-dates the Phase-2 derivation), not a derivation-miss correction; see the §L3 reconciliation note + FEAT-PC006/PC007's L4 summary.

**Further closed 2026-06-30 (Cycle C decomposition):** the **data-export** capability row was added to PC-4 §L3 (internal area PC-4; upstream-PC substrate only — PC-2 `users` + actor primitive, own `consent_records`, PC-3 `group_memberships`, PC-1 RLS; V2/V4) as the IDN-8 capability was decomposed — realized by [FEAT-PC008](../../platform/core/features/FEAT-PC008-member-data-export.md) ↔ Hub [FEAT-H010](../../products/hub/features/FEAT-H010-download-my-data.md). Domain-owned personal data (journey enrolments DS-3; later forum content DS-5) is deliberately **not** read by PC-4 (one-way Core→Domain boundary); each Domain area contributes its own export section when built. **Open remainder:** §L3:366 also attributes *feature flags* to PC-4 — still unenumerated, pending its first consumer's derivation.

*Proposed fix (remainder):* enumerate the feature-flag capability row when its first consumer is derived — internal area PC-4, the relevant upstream-PC substrate dependency, and V2/V4 vertical impact. The consent and data-export portions are done.

---

## Priority summary

**High priority** (compounds silently, affects multiple future decisions, or blocks scale):
- G-03 Vertical specs are scaffolds
- G-05 Review queue not operationalized
- G-06 Multi-agent task locking
- G-12 Given/When/Then to test translation

**Medium priority** (affects clarity and contributor onboarding but not blocking today):
- G-02 Cross-product feature sync
- G-04 Wave ↔ roadmap relationship
- G-07 Ferd DoD empty
- G-09 Refinement ritual undocumented
- G-10 Board mechanic unchosen
- G-13 Build hygiene unspecified
- G-14 Discovery 0→2 flow orphaned
- G-15 Cross-tier entry order
- G-16 Skill chaining undocumented
- G-18 Research pathway under-specified
- G-19 Wave-planning skill needs structural review
- G-20 Reconciliation activity has no defined home
- G-22 Legacy pre-refactor FEAT-*.md need absorb-and-delete discipline
- G-23 Stale references to superseded authorities
- G-25 How-we-work rendered views drift
- G-27 `PRODUCTS_AND_PLATFORM.md` staleness vs. authoritative status
- G-29 Lateral routing for cross-entity findings produced by L3 stress-test passes
- G-30 Tier CLAUDE.md files contain miscategorised entity-specific content
- G-32 Entities with shipped §L3 lacking reader tours — backfill obligation
- G-34 Sharing controls (IDN-7) split out of Cycle B — no substrate yet
- G-35 PC-4 §L3 under-enumerates GDPR-cluster capabilities (consent + data-export rows added; feature-flags remain)

**Low priority** (single-word fixes or edge cases):
- G-11 TDD overstated vs risk-based- G-28 Trust-disk-over-memory as a cross-cutting discipline

---

*Last updated 2026-05-29 (G-33 added during the universe-discovery Session 01 resume, commit 3548b98, and closed the same day by the G-33 cleaning pass that classified all 130 Open-thread bullets against the 36 statements and tagged them inline: 20 RESOLVED, 65 PARTIAL, 45 STILL OPEN). Originating session bridges: `docs/planning/sessions/2026-04-19_-_HOW-WE-WORK-SESSION.md` (G-01 through G-18); `docs/planning/sessions/2026-04-22_-_DECOMPOSITION-SKILL-REFACTOR.md` (G-19 through G-22); `docs/planning/sessions/2026-04-24_-_L2-COMPLIANCE-AUDIT.md` (G-23 through G-25). G-26 was added in `docs/planning/sessions/2026-04-26_02_-_BLOCK-A1-A2-TEMPLATE-DECISIONS.md` and closed in `docs/planning/sessions/2026-04-26_06_-_BLOCK-A2-AUTHOR-DESIGN-SYSTEM-TEMPLATE.md`. G-24 was closed in the same A.2-author bridge after Block A completed (all three previously-missing templates were authored across the 2026-04-26 session chain). G-27 and G-28 were added in `docs/planning/sessions/2026-04-26_07_-_BLOCK-B1-HUB-L2.md` (the Hub L2 walk session). G-29 has dual lineage: first registered in concept as G-NN in `docs/planning/sessions/2026-04-28_01_-_BLOCK-B2-HUB-L3.md` (the B.2 resumption bridge — surfacing the lateral-drift problem during L3 capability authoring), then sharpened in `docs/planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md` (the stress-test pattern bridge — re-scoping the gap's resolution to handle the structured output of a named methodology step rather than ad-hoc surprises), and registered as G-29 during Block B.2 resumption (cascade-plan Session 1 had not yet landed at registration time, so G-29 was the next available number rather than G-32). G-30 and G-31 were both registered in cascade-plan Session 1 (`docs/planning/sessions/2026-05-01_01_-_CASCADE-SESSION-1.md` — to be authored at session close): G-30 was anticipated by the 2026-04-27 cascade-plan bridge as the tier-CLAUDE miscategorisation gap to register in Session 1; G-31 was drafted in the 2026-04-30 stress-test pattern bridge as the gap covering the pattern's promotion to skill text, with the cascade-plan bridge having sequenced it as deferred until two-instance evidence — Session 1 lands G-31's *registration* alongside its *resolution* against the closing-bridge Observations A–G evidence rather than waiting for Session 4. ID numbering is monotonic — closed IDs are not reused.*

*Updated 2026-06-10: register housekeeping — G-32 added to the quick index and priority summary (described in the body since the 2026-05-03 reader-tours session but missing from both); G-19 given a body entry (index-only since 2026-04-22); G-21 closed — its proposed fix is implemented: the `feature-development` skill carries the same-commit summary update at maturity transitions 4→5 and 5→6, and `doc-health-check` Section 8 verifies consistency at cycle boundaries. References that named G-21 by ID (six specification templates, doc-health-check Section 8, and — caught by the post-change health check — the instantiated entity specifications, verticals CLAUDE.md, and verticals feature-READMEs) were repointed to the implemented discipline in the same pass.*

*Updated 2026-06-10 (later the same day): G-01 closed — its proposed fix happened: the DS-1 descent session ratified the Whisp L2-owner decision (split by face: DS-1 World Model owns world-presence — cord, Void distance, anchoring, severance; DS-7 Intelligence owns the being — dialogue, filling, senses, internalisation; DS-7 consumes DS-1). Recorded as an ADR candidate in `docs/architecture/decisions/PENDING.md` (promote at the DS-7 descent) and instantiated in `docs/platform/domain/world-model.md` + `world-model/CLAUDE.md`. The chapter-01 callout and the cascade-SVG gap box were updated to resolved in the same health-check pass; the rendered views (index.html, docx) remain on the accepted G-25 deferral.*

*Updated 2026-06-29 (Cycle B consent decomposition): **G-34** (sharing-controls split out of IDN-7) and **G-35** (PC-4 §L3 omits the consent-state / data-export / feature-flag capabilities the Hub `SPECIFICATION.md` §L3:366 attributes to PC-4) registered while authoring FEAT-PC006/PC007 + FEAT-H008/H009. Next available ID is **G-36**. ID numbering is monotonic — G-33 was added and closed 2026-05-29 and is not reused.*

*Updated 2026-06-29 (G-35 consent portion closed): the consent-state governance capability row was added to PC-4 §L3 (`governance-specification.md`) as a forward addition driven by ADR-U034; **G-35 narrowed** to its data-export + feature-flag remainder. G-34 unchanged.*

*Updated 2026-06-30 (G-35 data-export portion closed, Cycle C decomposition): the data-export capability row was added to PC-4 §L3 (`governance-specification.md`) as the IDN-8 capability was decomposed — realized by FEAT-PC008 ↔ FEAT-H010; **G-35 narrowed** to its feature-flag remainder only (awaiting the first feature-flag consumer's derivation). G-34 unchanged.*
