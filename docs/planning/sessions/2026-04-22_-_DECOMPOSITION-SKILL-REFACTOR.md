# Session bridge — Decomposition skill refactor (vertical-axis separation)

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-22
**Session type:** Architecture · design · refactor
**Status:** Closed (Commit 3 and several follow-ons deferred to future sessions)
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)

---

## Session summary

Session opened as a continuation from the 2026-04-19 how-we-work session, with the originally queued next work being the Ferd capability map (Level 3 of the ecosystem-decomposition cascade). Stefan stepped back and asked a structural question before jumping into the Ferd work: *how does the process actually go from Vision to capabilities — what documents feed what, and where is that captured?* That question opened a review of the `ecosystem-decomposition` skill that ran for most of the session.

The review surfaced three conceptual errors that had been quietly baked into the skill's framing. First, L3 was described as wave-triggered ("scoping a wave" was listed as a primary L3 entry point), conflating the vertical decomposition axis with the horizontal wave-planning axis. Second, L3's input list included existing feature specs and the current codebase as sources — making L4 outputs and implementation state upstream inputs to L3, which violates the cascade. Third, the original framing treated per-level source lists as file-centric (hard prerequisites / soft sources) rather than as thinking-centric — mixing "what upstream thinking must exist" with "which files happen to be readable."

Each error was caught by Stefan pushing back on a specific line in a draft. The session's pattern was: Claude proposed a framing, Stefan identified the contamination, Claude reworked. Three cycles of this produced a substantially cleaner model: levels as *activities* (not files); files as *containers* that may hold sections written under different levels' authority; strict downward authority flow; reconciliation as a *separate downstream activity* from derivation. The session then produced the skill rewrite, PROCESS.md alignment edits, four new gap entries, and a rewrite of chapter 01 of the how-we-work set to match the new framing.

The arc landed at: the decomposition skill is now strictly vertical, with authoritative derivation per level, a clear write-scope partition across levels (including the three-section ownership of SPECIFICATION.md), and a named reconciliation activity whose home is deferred as G-20. The Ferd capability map, still queued, now has a cleaner skill to run against when it happens.

## What was decided

- **Decomposition skill is vertical-axis only.** Wave scoping, wave progress, wave DoD, and all other horizontal planning live in `wave-planning`. *Locked. (Resolution A.)*
- **L4 derives feature specs fresh from L3's capability inventory.** Existing pre-refactor FEAT-*.md files are not read at L4. Their inspirational value is absorbed upstream into L1/L2/L3 before L4 runs; then the legacy specs are deleted in the same commit that lands the new specs. *Locked. (Choice (a), with refinement that old specs remain valid as inspirational input to upstream levels.)*
- **Levels are activities, not files.** A level describes *what kind of work is being done*. Files are containers. A single file (SPECIFICATION.md) may hold sections authored by different levels under different authority. *Locked.*
- **L3 runs per entity by default, per-set when cross-entity work is legitimate** (e.g., boundary coherence across all domain services). *Locked.*
- **Reconciliation is a separate activity, downstream of derivation.** L3 and L4 produce authoritative output derived fresh from upstream; existing artifacts (pre-refactor specs, current code) are compared against that authoritative output as a distinct activity. *Locked; home deferred as G-20.*
- **SPECIFICATION.md ownership is split across three levels.** L2 owns identity/boundaries/technical shape. L3 owns the capability inventory section. L4 owns the feature-inventory summary section. *Locked.*
- **The capability inventory has no status column.** Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output. Keeping status out of the inventory keeps L3's authority over "what should be" uncontaminated by "what currently is." *Locked.*
- **Prerequisite check is human-in-the-loop.** When upstream thinking is inadequate, the skill surfaces issues one at a time in dependency order. Stefan decides per case: fix upstream first / proceed with remark / discuss. *Locked.*
- **Uniform structure across L1–L5, proportional content.** Each level's section in the skill has the same skeleton (upstream-thinking dependencies / read context / write scope / output / when runs / what if upstream inadequate / handoff). Content volume tracks reality — L1 and L5 are naturally shorter than L3 and L4. *Locked.*

## What was produced

Four file edits applied, all via MCP with dry-run-review-apply:

- `.claude/skills/ecosystem-decomposition/SKILL.md` — full rewrite. New framing around vertical axis, activities-not-files, per-level uniform structure, authoritative derivation, shared SPECIFICATION.md ownership, reconciliation-is-downstream. Removed: wave triggers at L3, existing feature specs and code as L3 inputs, the global "Context loading order" section (replaced by per-level read contexts), `wave-spec.md` in the References section.
- `docs/planning/PROCESS.md` — §6 pointer added to reverse-direction source map in the skill; §6.5 paragraphs for `ecosystem-decomposition` and `wave-planning` revised to make the vertical/horizontal axis separation explicit; footer updated.
- `docs/ecosystem/how-we-work/gaps.md` — four new gaps added (G-19 wave-planning structural review, G-20 reconciliation home undefined, G-21 feature-inventory summary has no maintenance discipline, G-22 legacy FEAT-*.md need absorb-and-delete discipline). Header count updated from seventeen to twenty-one. Priority summary and footer updated.
- `docs/ecosystem/how-we-work/01-decomposition.md` — L3 subsection rewritten to remove wave contamination and describe authoritative derivation per entity. L2 subsection gained one-sentence acknowledgment of shared SPECIFICATION.md authorship.

No new templates, no new skills, no changes to `VISION.md`, no changes to chapter 02–05 of how-we-work, no SVG changes.

## What is still open

- **Commit 3 deferred.** Template restructure for `product-specification.md` and `domain-service-spec.md` — visible section boundaries for L2/L3/L4 authorship. Named during the session but not drafted, on explicit context-management grounds. Next session.
- **L2 compliance audit deferred.** Stefan asked for this on entry to the L2 walk and explicitly said to keep it on the list. Still outstanding. Would enumerate every named entity (all products, all four Platform Core tiers, all seven domain services, all three studios, the design system, all five verticals) and check DESCRIPTION.md / SPECIFICATION.md / ROADMAP.md presence and state.
- **G-19:** `wave-planning` skill structural review. The horizontal-axis counterpart to what this session did for `ecosystem-decomposition`.
- **G-20:** reconciliation activity has no defined home. Deliberately deferred until reconciliation runs in practice at least once, which will inform its shape.
- **G-21:** feature-inventory summary in SPECIFICATION.md has no maintenance discipline. Probably lands in `feature-development` skill + `doc-health-check`.
- **G-22:** legacy pre-refactor FEAT-*.md need absorb-and-delete discipline operationalized.
- **Chapter 01 SVG (`assets/01-decomposition-cascade.svg`)** — not reviewed this session. May need small updates to match the new L3 framing if the SVG currently labels L3 as wave-triggered or shows status in the inventory.
- **Ferd capability map.** The originally queued work. Now has a cleaner skill to run against — first run will validate the prerequisite-check pause mechanic end to end.

## Tensions and contradictions

- **`docs/planning/waves/FERD-CAPABILITY-MAP.md` referenced in chapter 01 but does not yet exist.** The pre-session version of chapter 01 pointed to this file as the "canonical worked example." The rewrite removed the reference as part of the wave-contamination cleanup. No current chapter-01 text requires this file, but the file's non-existence was noted as a drift signal against the earlier framing.
- **Extensibility as a "sixth vertical" in `feature-spec.md` template.** The template's Vertical Impact section currently lists six items — the five verticals named in ADR-U002 plus "Extensibility." This quiet sixth vertical isn't acknowledged in the architecture documents. Flagged but not acted on this session.
- **Entity ROADMAP.md as a planning artifact in the ecosystem tree.** Roadmap files carry timing information (ordering, sequencing) but live next to entity definitions (DESCRIPTION.md, SPECIFICATION.md) in the ecosystem tree rather than the planning tree. This is a deliberate choice — the roadmap is entity-owned — but it sits on the boundary between the two trees. Worth keeping in mind as the wave-planning skill review happens.
- **`wave-planning` skill description now names `wave-planning` as needing review (G-19) in the skill's own description.** This is mildly awkward self-reference but honest; it resolves when G-19 is addressed.

## Non-obvious insights

- **Every framing error Claude made in this session had the same shape: treating existing artifacts as authoritative upstream inputs to derivation.** Wave scope as L3 trigger (existing wave file shaping capability derivation). Feature specs as L3 input (existing L4 output shaping L3). Feature summary as L3 input (existing L4 reconciliation shaping L3). Codebase as L3 input (existing implementation shaping L3). The underlying reflex: *when uncertain, include more context, look backward*. The correct reflex: *derive strictly from upstream authority; everything downstream is measured against the derivation, not folded into it*. This mirrors the locked principle "specs are authoritative; code is measured against them" — the decomposition skill now applies the same rule at every level, not just spec-vs-code.
- **The distinction between "files" and "levels" is load-bearing.** Once the framing moved from "which files does L3 read" to "which upstream thinking must exist before L3 can derive," the circularity problems dissolved. A file is a container; any level may read any file; what matters is whether the content the level writes is contaminated by content authored at or below its own level. This reframing is what makes the Sources-per-level exercise stop being padding and become discipline.
- **The path-to-known-state principle (specs authoritative, code measured against them) generalises upward.** The relationship between L3 inventory and L4 feature specs has the same shape as the relationship between L4 specs and code: inventory is authoritative, L4 is measured against it; spec is authoritative, code is measured against it. This suggests the reconciliation activity (G-20) is a single pattern applied at two different altitudes, which should simplify its eventual design.
- **The prerequisite-check pause mechanic has implicit dependency-graph requirements.** "One at a time, in dependency order" means the skill has to build a topological ordering across missing upstream thinking before it can surface issues. Trivial in simple cases; non-trivial if a real L3 run surfaces both a missing sibling DESCRIPTION.md and a missing vertical spec, where one could reasonably affect the other. The skill's pause instructions say "dependency order" but don't specify the algorithm — worth watching in first real use.
- **Stefan's catching pattern accelerated as the session progressed.** The first framing error (wave-as-trigger) took a long explicit question to surface. The second (feature specs as L3 input) was caught with a shorter prompt. The third (codebase as L3 input) was caught in one sentence. The session got more efficient as the shared model got cleaner — which is itself evidence that the framing work was productive.

## For the next session

**Read order:**
1. This bridge
2. `.claude/skills/ecosystem-decomposition/SKILL.md` — the rewritten skill; the canonical reference for all decomposition work
3. `docs/planning/PROCESS.md` §6 and §6.5 — the axis-separation wording and the pointer to the skill
4. `docs/ecosystem/how-we-work/gaps.md` — 21 gaps now, with G-19 through G-22 added this session
5. `docs/ecosystem/how-we-work/01-decomposition.md` — L3 rewrite reflects the new framing

**Locked decisions from this session** (do not re-litigate):
- Decomposition skill covers vertical axis only (Resolution A)
- (a) fresh derivation at L4; legacy specs deleted after inspirational absorb upstream
- Activities-not-files; SPECIFICATION.md has three section owners
- Reconciliation is downstream, separate activity
- Status column belongs to reconciliation, not the capability inventory
- Prerequisite check: human-in-the-loop, one issue at a time, dependency order
- L3 per entity; per-set only for cross-entity work
- Uniform structure across levels; proportional content

**Open decisions available to revisit if evidence changes:**
- Where reconciliation lives (G-20) — deferred intentionally until first real run
- Whether the wave-planning skill adopts the same Sources-per-level structure (G-19)
- Whether to operationalize the absorb-and-delete discipline via `doc-health-check` or another mechanism (G-22)

**Current focus:** Commit 3 (template restructure for `product-specification.md` and `domain-service-spec.md`) is the natural next work item. After that, the L2 compliance audit, then the originally queued Ferd capability map, which will be the first live test of the rewritten skill.

**Explicit user instructions that carried through this session:**
- Architecture-first, deliberate, one question at a time
- Dry-run-review-apply pattern for substantive edits (used throughout via MCP `edit_file` with `dryRun: true` followed by explicit Stefan approval before each real apply)
- Session bridge written at session close rather than mid-session
- Stefan drops binaries into the repo manually (not applicable this session — no binaries produced)

---

## Open items

### Immediate
- [ ] Git commit the four file changes from this session (suggested message provided in session closing)
- [ ] Verify the session bridge renders correctly and the forward-reference from `gaps.md` resolves

### Near-term
- [ ] Commit 3 — template restructure for `product-specification.md` and `domain-service-spec.md` (L2/L3/L4 visible sections)
- [ ] L2 compliance audit — named entities vs. present DESCRIPTION.md / SPECIFICATION.md / ROADMAP.md
- [ ] Chapter 01 SVG review (`assets/01-decomposition-cascade.svg`) against the new L3 framing
- [ ] Ferd capability map — the queued Level-3 work; first real run of the rewritten skill

### Deferred
- [ ] G-19: `wave-planning` skill structural review
- [ ] G-20: reconciliation activity home decision (defer until first real reconciliation run informs the shape)
- [ ] G-21: feature-inventory summary maintenance discipline
- [ ] G-22: legacy FEAT-*.md absorb-and-delete discipline operationalization
- [ ] Extensibility-as-sixth-vertical question (`feature-spec.md` template)
