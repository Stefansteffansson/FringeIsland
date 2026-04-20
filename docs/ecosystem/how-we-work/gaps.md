# Gaps register

**Status:** seventeen known documentation and design gaps across the FringeIsland development system as of 2026-04-19.

**Purpose:** a single place to see every gap flagged in the [how-we-work](./README.md) chapters, grouped by axis, with suggested resolution and priority.

**Discipline:** when a gap is resolved, delete its entry here and remove the callout from the relevant chapter. When a new gap is surfaced in a session, add it here with an ID continuing the sequence.

---

## Quick index

| ID | Axis | Gap | Priority | Proposed fix |
|----|------|-----|----------|--------------|
| G-01 | Decomposition (L2) | Whisp architectural placement | Medium | ADR or session decision to assign Whisp to Intelligence, World Model, or a new cross-service abstraction |
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
| G-16 | Agent routing | Skill chaining undocumented | Medium | Add a "common chains" section to PROCESS.md §6.5 or root CLAUDE.md |
| G-17 | Agent routing | AGENTS.md precedence across tools | Low | ADR on tool-specific AGENTS.md precedence; tool-specific copies derive from root |
| G-18 | Execution (research) | Research pathway under-specified | Medium | Unify maturity-2, spike, and research-report mechanisms; describe how research enters the backlog and how findings feed specs |

---

## Grouped by axis

### Decomposition cascade — chapter 01

**G-01 — Whisp architectural placement (L2).**
VISION.md names Whisp as a core structural concept: "each FIM's personal future self … perceptual lens, operating across all three worlds as companion voice, perceptual richness, and active instrument." The L2 entity inventory (per `ecosystem-decomposition` skill) lists 3 products, 4 platform-core components, 7 domain services, 3 studios, design system, and verticals. None of them owns Whisp. Natural candidates are Intelligence (DS-7), World Model (DS-1), or a cross-service abstraction. Every Whisp-involving feature currently has no routing to an owner; it falls into `OPEN_QUESTIONS.md` by default. Acceptable as a temporary pattern, problematic as permanent.

*Proposed fix:* ADR (draft as ADR-U025 or similar) that either assigns Whisp to an existing domain service, creates a new one, or explicitly locks "Whisp is cross-cutting; its features are paired specs between Intelligence and World Model."

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

### Agent routing — chapter 05

**G-15 — Cross-tier entry order.**
Step 5 of the load order says "the tier `CLAUDE.md` for where the work lives." For cross-tier features (Hub UI + Platform Domain data model), which tier loads first is undefined. Wrong order means less-relevant tier constraints get internalized first.

*Proposed fix:* rule in root `CLAUDE.md` or in `feature-development` skill: "For cross-tier tasks, load the consumer tier first (the product or studio), then the provider tier (the platform service). Consumer constraints contextualise the work; provider constraints scope the implementation." Alternatively, load both and annotate which is primary.

**G-16 — Skill chaining undocumented.**
Real work crosses skills. `ecosystem-decomposition` to write a spec, then `feature-development` to build it. `feature-development` to mark 6-done, then `doc-health-check` to verify. The four skills are described as discrete; the chains are implicit.

*Proposed fix:* add a "common chains" section to PROCESS.md §6.5 or to root `CLAUDE.md`. Name the three or four chains that matter most. Example: "Specifying and building a new feature: load `ecosystem-decomposition` → write spec → advance to maturity 4 → unload skill → load `feature-development` → implement."

**G-17 — AGENTS.md precedence across tools.**
Three `AGENTS.md` files exist: `/AGENTS.md` (canonical for Claude), `configs/codex/AGENTS.md`, `configs/opencode/AGENTS.md`. No precedence rule between them.

*Proposed fix:* ADR declaring `/AGENTS.md` as the canonical source; tool-specific copies are derivatives that must not contradict the canonical. Add a `doc-health-check` check at cycle boundary comparing the tool-specific AGENTS.md files against the root one and flagging any divergent rules. Low priority until Codex or Opencode becomes the primary tool for a given contributor.

---

## Priority summary

**High priority** (compounds silently, affects multiple future decisions, or blocks scale):
- G-03 Vertical specs are scaffolds
- G-05 Review queue not operationalized
- G-06 Multi-agent task locking
- G-12 Given/When/Then to test translation

**Medium priority** (affects clarity and contributor onboarding but not blocking today):
- G-01 Whisp architectural placement
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

**Low priority** (single-word fixes or edge cases):
- G-11 TDD overstated vs risk-based
- G-17 AGENTS.md precedence across tools

---

*Last updated 2026-04-19. Originating session bridge: `docs/planning/sessions/2026-04-19_-_HOW-WE-WORK-SESSION.md` (pending).*
