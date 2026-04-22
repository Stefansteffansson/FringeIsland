# PROCESS — How Work Flows at FringeIsland

**Status:** Authoritative way of working
**Audience:** Anyone building, designing, deciding, or contributing
**Companion docs:** `../ecosystem/VISION.md` (the why) · `../templates/` (reusable shapes) · `../architecture/ARCHITECTURE_ANATOMY_V1.md` (the what)

This document is the single canonical reference for how work moves from idea to shipped code at FringeIsland. Read it once, then return to it whenever you're not sure what to do next.

It is **descriptive of the current process**, not aspirational. When the process changes, this file changes with it (see Section 8).

---

## Section 1 — Work item lifecycle

Every piece of work — feature, bug, spike, decision — moves through the same maturity pipeline. An item enters at level 0 and is only built once it has reached level 4. Items that can't reach level 4 stay where they are until they can.

Under Model A (locked 2026-04-17), **feature-shaped items live as `FEAT-*.md` files in the ecosystem tree under their owner** at every maturity level from 0 to 6. The same file carries the item from raw idea through done — its state is tracked in YAML frontmatter (`maturity: 0-raw` … `maturity: 6-done`), not by which folder it sits in.

### Visual flow

```
   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
   │ 0 RAW IDEA │ →  │ 1 CONCEPT  │ →  │ 2 EXPLORED │ →  │3 SPECIFIED │ →  │  4 READY   │
   └────────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘
       one              problem          research            stories            DoR
     sentence           +  who           sketched           +  Given/         met
                        benefits         approach           When/Then

     ─── all levels 0–4 live in `docs/{owner}/features/FEAT-*.md` with YAML `maturity:` ─────┤
                                                                                      │
                                                                                      ▼
                                                                              ┌────────────┐    ┌────────────┐
                                                                              │ 5 IN CYCLE │ →  │   6 DONE   │
                                                                              └────────────┘    └────────────┘
                                                                                pulled            DoD
                                                                                into              met
                                                                                cycle
                                                                              ─── same feature-spec file, updated maturity + Implementation notes ───
                                                                                  tasks live in `docs/planning/backlog/tasks/TASK-*.md`
```

### Maturity table

| Level | Name | Meaning | Where it lives | Who advances it |
|-------|------|---------|----------------|-----------------|
| 0 | Raw idea | One sentence — "wouldn't it be cool if..." | `docs/{owner}/features/FEAT-*.md` with `maturity: 0-raw` | Anyone |
| 1 | Concept | Problem identified, who benefits, rough shape | same file, `maturity: 1-concept` | Product owner |
| 2 | Explored | Research done, approach sketched, risks named | same file, `maturity: 2-explored` | Product owner + research |
| 3 | Specified | Stories with Given/When/Then acceptance criteria in place | same file, `maturity: 3-specified` | Product owner |
| 4 | Ready | All questions answered, estimable, DoR met | same file, `maturity: 4-ready` | Product owner confirms DoR |
| 5 | In cycle | Pulled into the active build cycle; tasks generated | same file, `maturity: 5-in-cycle` + `docs/planning/backlog/tasks/TASK-*.md` | Developer |
| 6 | Done | Implemented, tested, deployed, DoD met | same file, `maturity: 6-done` with Implementation notes filled in | Developer confirms DoD |

**Where `{owner}` is one of:** `products/hub`, `products/gimbal`, `products/game`, `platform/core/{tier}`, `platform/domain`, `studios/{name}`, `design-system`, `verticals`. The owner is also declared in the feature spec's YAML `owner:` field.

**The ecosystem tree is the catalogue, not the backlog.** `docs/planning/backlog/` holds only ephemeral TASK-*.md files (work-in-motion for the current cycle). Feature specs are never duplicated into the planning tree — they live permanently under their owner.

**Movement is one-directional in normal operation.** Items only move backwards when something is wrong (e.g., a "Ready" item turns out to have an unanswered question and drops back to Level 3 until the question is resolved).

### Parking work (the icebox mechanism)

Under Model A, the icebox is **a YAML frontmatter flag on a feature spec**, not a separate file. An item at any maturity level (0–6) can be parked by adding:

```yaml
parked: true
parked_reason: Priority shifted to Eid wave; revisit when Ferd ships.
```

**Key properties:**

- Maturity and parked are orthogonal. A feature can be parked at maturity 3 and un-parked later at maturity 3 — parking does not regress maturity.
- `parked_reason` is required when `parked: true`. This prevents parking decisions from getting lost over time.
- Absent frontmatter, or `parked: false`, means the item is active in the pipeline.
- Parked items are reviewed at cycle boundaries (see Section 3 and the `doc-health-check` skill). For each parked item: evaluate whether `parked_reason` still holds; decide to un-park or keep parked.
- A single grep for `parked: true` across `docs/` returns the full icebox across the ecosystem — no separate file to maintain.

### Why the pipeline matters

The pipeline exists because of a lesson learned: Ferd's roadmap was built before proper research, leading to architectural assumptions that weren't validated and scope decisions made without sufficient investigation. For all future products and waves, research (maturity 2) must genuinely precede specification (maturity 3). The pipeline enforces this — an item cannot be specified until it has been explored, and it cannot be explored without naming risks and sketching an approach. Skipping ahead is how bad assumptions get baked in.

---

## Section 2 — Work item types

Every work item has a type. The type determines which template to use, which DoD checks apply, and what kind of artifact gets produced.

| Type | What it is | Template | Notes |
|------|-----------|----------|-------|
| **feature** | Functional requirement, user-facing | `../templates/feature-spec.md` | Stories are embedded inline with Given/When/Then. Tag with product (`hub`/`gimbal`/etc.). |
| **nfr** | Non-functional / quality attribute (performance, security, a11y) | `../templates/feature-spec.md` | Often produced by a vertical owner. Same shape as a feature; stories frame the quality attribute. |
| **architectural** | Technical decision or infrastructure change | `../templates/adr.md` | Always produces an ADR |
| **spike** | Time-boxed research / exploration | `../templates/research-spike.md` | Output is findings + follow-up items |
| **bug** | Defect in existing functionality | (lightweight — backlog entry only, no feature spec unless complex) | Bypasses maturity 0–2 if obvious |
| **tech-debt** | Known shortcut that needs addressing | `../templates/feature-spec.md` (lightweight) | Allocate ~15–20% of cycle capacity |
| **process** | Change to the way of working itself | (this file gets updated) | See Section 8 |

**Why `feature-spec.md` covers feature, nfr, and tech-debt:** FringeIsland uses a single canonical spec shape — a feature spec with stories embedded inline (Model A, locked 2026-04-17). There is no separate PRD + user-story file pair. Whether an item is a new capability, a quality attribute, or paying down debt, the artifact has the same structure: problem, solution sketch, stories with Given/When/Then acceptance criteria, and vertical impact. Maturity is tracked in YAML frontmatter (0-raw → 6-done), not by which file or folder the item lives in.

---

## Section 3 — Cadence (Shaped Personal Kanban)

> ⚠️ **The cadence below is a recommended starting point, not law.**
> Run a few cycles, see what fights you, and adjust. It is far better to evolve a cadence that matches your real rhythm than to preserve one that you keep skipping. The shape (cycles + cooldown + WIP limit + daily/weekly/cycle reflection) matters more than the specific durations. **Update this section when your actual cadence changes** — don't run on a different rhythm than what's documented here.

### Recommended starting cadence

- **3-week build cycles** with a **1-week cooldown** between cycles
- **WIP limit:** 3 items in "review" at any time (anything beyond gets blocked or returned)
- **Daily practice (~8 min):**
  - Morning: write a one-sentence intention for the day
  - End of day: log what was done, what was learned, what's blocked
- **Weekly practice (~30 min, Friday):**
  - Three Ls retrospective (Liked / Learned / Lacked)
  - Reprioritise the backlog
  - Adjust the current cycle plan if the week revealed new information
- **Cycle boundary (~2 hrs):**
  - Shape 1–2 bets for the next cycle (Shape Up style)
  - **Tech-debt / NFR / process allocation:** At least one bet per cycle should be a tech-debt, NFR, or process item — unless the backlog genuinely contains none. The "unless" matters: don't invent debt to meet a quota. But absent a deliberate allocation, feature work consistently crowds out quality work, and the ecosystem degrades in ways that aren't visible until they're expensive.
  - **Gap review:** Read `../ecosystem/how-we-work/gaps.md` as input to the betting session. High-priority gaps are candidates for the tech-debt/NFR/process allocation until closed; medium-priority gaps accumulate until their compounding cost warrants a bet; low-priority gaps are typically swept up during cooldown weeks. If the cycle just closed a gap, remove the entry from the register, update the header count, and remove the matching callout from the relevant how-we-work chapter. New gaps surfaced during the cycle are added to the register with the next sequential ID (G-NN).
  - Review metrics (cycle time, throughput, deployment frequency)
  - Update the relevant roadmaps (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`, product roadmaps, `docs/platform/core/ROADMAP.md`)
  - Run the `doc-health-check` skill (`.claude/skills/doc-health-check/SKILL.md`) to verify ecosystem docs are clean — stale paths, terminology drift, README indexes out of sync, missing DESCRIPTION.md for active entities, unfilled Implementation notes on 6-done specs, parked items whose `parked_reason` no longer holds
  - Run retrospective for the cycle that just ended (template: `../templates/retrospective.md`)

### Waves as thematic focus

Waves (Ferd → Eid → Hamn → Heim → Brim → Urd) are **thematic focus buckets**, not sequential gates. They communicate what the ecosystem prioritises during a period — earlier waves are generally prioritised over later waves, but this is a guideline, not a rule.

Work from any wave can be in any maturity state (Concept, Study, Specify, Build) at any time. Waves overlap naturally: one winds down as the next builds up, and items from different waves may coexist in the same cycle. **The review-stage WIP limit constrains throughput across all active work regardless of which wave items come from** — that's the real enforcement mechanism, not wave boundaries.

Wave tags (`ferd`, `eid`, `hamn`, etc.) are used for filtering, prioritisation, and strategic overview — see Section 7. They are not permissions.

### Wave transition

When a wave's core work is substantially complete, it triggers:
- A **wave retrospective** (use `../templates/retrospective.md`, scope = entire wave, not just last cycle)
- An **ecosystem roadmap update** (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`) reflecting the shift in strategic focus

### Deferred and cross-wave work

Work that doesn't fit the current wave or cycle is handled through the existing maturity pipeline — not a separate deferral process. The mechanisms:

- **Backlog with wave tags** — items tagged for a later wave stay as feature specs in the ecosystem tree at whatever maturity they've reached. They are visible, filterable, and advance through the pipeline whenever someone works on them.
- **Icebox (YAML flag)** — items that are correct but not currently relevant get `parked: true` + `parked_reason` added to their feature spec frontmatter. See Section 1. Parked items are reviewed at cycle boundaries.
- **Betting table** — items that aren't bet on stay in the backlog. No formal "deferral" is needed — the betting table is the prioritisation mechanism.

The principle: **a deferred item is not done until someone owns it.** When work is moved to a later wave, it must have a clear wave tag and enough context (in its feature spec) that a future contributor can pick it up without re-litigating the original decision. Items that have no clear owner after review surface in `../ecosystem/thinking/OPEN_QUESTIONS.md` for strategic resolution.

### Why this shape

- **Cycles + cooldown** — gives a forcing function to ship and a buffer to absorb spillover, fix bugs, and rest. Without cooldown, every cycle's overflow becomes the next cycle's starting debt.
- **WIP limit of 3 at review** — review is serialised human attention; it can't be parallelised the way build work can. Review is the real bottleneck, so that's where the limit bites. Parallelism during build is fine; throughput is gated at review. Three in review is the empirical sweet spot for solo and small-team work.
- **Daily intention + log** — replaces the "where was I?" startup tax with a 30-second read.
- **Weekly Three Ls** — the smallest retrospective that still produces signal. Not optional even when "nothing happened."
- **Cycle boundary** — the only time you allow yourself to zoom out. Without it, urgent work eats important work.

### What to adjust first

If something is wrong, this is the order to try changes in:
1. **Lower the review-stage WIP limit** before lengthening cycles. Most cadence pain is review-queue pain in disguise — things piling up waiting for review rather than too many things being worked on.
2. **Shorten cycles** if you keep underestimating; **lengthen cycles** if shaping repeatedly fails to fit.
3. **Compress the daily practice** before dropping it. Even 60 seconds beats zero.
4. **Move the weekly retro** to a different day before skipping it.

---

## Section 4 — Definition of Ready (DoR)

A work item is ready to be pulled into a cycle when **every** box is checked. If any box can't be checked, the item stays at Level 3 (Specified) until it can.

- [ ] **User story format** — "As a [role], I want [capability], so that [benefit]"
- [ ] **Value is clear** — there is a one-sentence answer to "why does this matter?"
- [ ] **Acceptance criteria** — at least one Given/When/Then scenario per behavior
- [ ] **Independent** — no unresolved blockers; if blocked, the blocker is its own work item
- [ ] **Small enough** — fits in 1–3 days of focused work; if larger, split it
- [ ] **UI/UX approach sketched** — for user-facing items, at least a wireframe or written flow
- [ ] **Data model implications understood** — new tables, new columns, RLS impact named
- [ ] **Edge cases identified** — what happens on empty / failure / concurrent / unauthorized?
- [ ] **Cross-product dependencies identified** — does this require Platform Core or Domain Service changes? Are sibling products affected?
- [ ] **No unresolved open questions** — if there are open questions, they become spikes first

DoR enforcement is the product owner's job, not the developer's. Don't pull items that don't meet DoR — push back instead.

---

## Section 5 — Definition of Done (DoD)

A work item is done when **every** applicable box is checked. "Applicable" matters: a docs-only change does not need RLS policies; a backend-only change does not need mobile responsive checks.

- [ ] **All acceptance criteria implemented and verified**
- [ ] **ESLint + TypeScript strict** pass with no new warnings
- [ ] **Key logic unit-tested** (the parts that would be hardest to debug after a regression)
- [ ] **Mobile responsive** — manual check on a small viewport for any UI change
- [ ] **Supabase RLS policies applied** — every new table or new access pattern has explicit row-level security
- [ ] **Builds without errors** locally and in CI
- [ ] **Deployed to preview environment and verified** — not just merged
- [ ] **README and/or CHANGELOG updated** if user-visible behavior changed
- [ ] **Platform Specification updated** if a shared API surface changed (`docs/platform/core/SPECIFICATION.md` or a domain service file in `docs/platform/domain/`)
- [ ] **Complex decisions documented as ADR** (`docs/architecture/decisions/`) — if you had to choose between options, future you will thank you

DoD enforcement is the developer's job. Don't mark items done that don't meet DoD — leave them open and finish the missing checks.

---

## Section 6 — Document lifecycle (what gets created when)

This is the trigger → artifact map. Whenever you find yourself starting work, look up the trigger here and create the right document from the right template.

| Trigger | Document created | Template | Location |
|---------|-----------------|----------|----------|
| New product surface identified (e.g., a new platform target) | Product Description | `../templates/product-description.md` | `../products/{name}/DESCRIPTION.md` |
| Product enters active development | Product Specification + Roadmap | `../templates/product-specification.md` + `../templates/product-roadmap.md` | `../products/{name}/` |
| New domain service scoped | Domain Service Specification | `../templates/domain-service-spec.md` | `../platform/domain/{name}.md` |
| New Studio scoped | Studio Description | `../templates/studio-description.md` | `../studios/{name}/DESCRIPTION.md` |
| Feature enters the pipeline (maturity 0-raw or higher) | Feature spec (stories embedded) | `../templates/feature-spec.md` | `../{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md` |
| Significant architectural decision is taken | ADR | `../templates/adr.md` | `../architecture/decisions/NNNN-{title}.md` |
| Planning / design session with Claude | Session bridge | `../templates/session-bridge.md` | `sessions/YYYY-MM-DD-{topic}.md` |
| Research needed before specifying | Research spike | `../templates/research-spike.md` | `../research/{topic}.md` |
| Cycle starts | Cycle plan | `../templates/cycle-plan.md` | `cycles/cycle-current.md` |
| Cycle ends | Retrospective | `../templates/retrospective.md` | `retrospectives/retro-YYYY-MM-DD.md` |
| Wave completes (last Build item Done) | Wave retrospective + ecosystem roadmap update | `../templates/retrospective.md` (wave-scoped) | `retrospectives/retro-wave-{name}.md` + edit `../ecosystem/ECOSYSTEM_ROADMAP.md` |
| Cross-cutting vertical concern needs specifying | Vertical spec | `../templates/vertical-spec.md` | `../verticals/{name}.md` |
| Ecosystem vision changes | Update VISION.md | (no template — constitutional) | `../ecosystem/VISION.md` |

This table is the **forward direction** — a trigger happens, and an artifact is produced. For the **reverse direction** — which source documents each decomposition level consumes as inputs, and which sections of shared files each level owns — see the `ecosystem-decomposition` skill's per-level structure. The skill covers upstream-thinking dependencies, read context, write scope, and handoff for each of L1 through L5.

**A single feature spec covers maturity 0 through 6.** There is no separate PRD artifact. The same `FEAT-*.md` file is created when an idea first lands (maturity 0-raw or 1-concept) and carries that feature all the way through implementation (maturity 6-done with Implementation notes). The YAML `maturity:` field tracks the state — you do not create a new document when a feature reaches maturity 3.

**Where the execution mechanics live: in the skills.** This section lists what artifacts exist and when they appear. The step-by-step mechanics of how work actually moves through the pipeline — how a feature gets decomposed, how tasks are generated from stories, how context is loaded during implementation, how wave progress is tracked — live in `.claude/skills/`. The strategic shape stays in this document; the operational choreography lives in the skill files. See the "Skills as the execution layer" section below for the four skills and when each fires.

If your trigger isn't in this table, it's either too small for a document (just put it in the backlog as a task) or it's a new kind of work that should be added to this table.

---

## Section 6.5 — Skills as the execution layer

PROCESS.md is the strategic document: cadence, pipeline, quality gates, meta-process. It deliberately does **not** contain the step-by-step mechanics of how work actually gets done. Those mechanics live in four skills under `.claude/skills/`. The separation is intentional (DECISION-02, 2026-04-17): strategic rhythm changes slowly, operational choreography changes faster, and merging them produces a 1500-line monolith that nobody reads end-to-end.

When an agent (or a human) picks up real work, the skills are what they load. PROCESS.md tells them *what* to do and *when*; the skills tell them *how*.

### The four skills

**`ecosystem-decomposition`** — `.claude/skills/ecosystem-decomposition/SKILL.md`

The **vertical-axis** decomposition skill. Fires when someone asks to decompose, break down, spec out, map an entity's capability space, write a product/service/studio description, or take a capability from L3 inventory down to a ready-to-build spec. Operates at five levels (Vision → Entities → Capabilities → Features → Tasks) and can be entered at any level. Produces everything from VISION.md edits down to maturity-4 feature specs with stories. Each level owns a defined write scope and derives authoritatively from the level(s) above — existing artifacts below a level never shape that level's derivation. It also owns the per-level source-document map and the prerequisite-check pause mechanic: before decomposition begins at any level, the skill verifies that upstream thinking is adequate and surfaces missing or inadequate inputs, one at a time in dependency order, for Stefan to decide whether to fix upstream first or to proceed with a remark. Wave scoping, wave progress, and wave DoD are NOT in this skill — see `wave-planning`.

**`feature-development`** — `.claude/skills/feature-development/SKILL.md`

The execution skill. Fires when a feature is at maturity 4-ready and someone says "build it," "implement FEAT-X", "start working on this feature," or references a specific TASK-*. Picks up the spec, generates tasks from stories if they don't exist yet, loads the right context progressively (root CLAUDE.md → AGENTS.md → tier CLAUDE.md → owner README → feature spec → task), writes code against acceptance criteria, runs lint and tests, updates the feature's maturity to `6-done`, fills in Implementation notes, and cleans up the ephemeral task files. This skill owns the day-to-day work that turns specs into shipped code.

**`wave-planning`** — `.claude/skills/wave-planning/SKILL.md`

The **horizontal-axis** planning skill for waves. Fires when someone asks for wave status, wave progress, what's left in a wave, whether a wave is complete, or to define/update wave scope and completion criteria. Cross-cuts the ecosystem because a wave references features that live under many different owners — but the features themselves, and the capabilities those features derive from, are produced by the vertical axis (`ecosystem-decomposition`). Wave-planning consumes vertical-axis output; it does not produce capabilities or feature specs. Produces wave-spec documents, wave progress reports, and wave retrospective scopes. This skill is how "are we done with Ferd?" gets answered concretely rather than by gut feel. A structural review of this skill is pending (G-19) now that the decomposition skill has been confirmed as vertical-axis only.

**`doc-health-check`** — `.claude/skills/doc-health-check/SKILL.md`

The documentation-quality skill. Fires at every cycle boundary as part of the cooldown ritual (per Section 3), and on-demand after any cross-cutting change — renames, terminology shifts, schema migrations, folder restructures. Runs six checks: terminology drift, schema drift, path + README sync, parked-items review, maturity consistency, entity coverage. Produces a summary that gets pasted into the cycle retrospective. This skill is the safety net that stops documentation rot from accumulating until it becomes a restructure project.

### How the skills fit together

A feature's life, mapped to skills:

```
   ecosystem-decomposition                feature-development              doc-health-check
 ┌─────────────────────────────┐        ┌────────────────────────┐       ┌────────────────────────┐
 │  Maturity 0 → 1 → 2 → 3 → 4   │ -----→ │  Maturity 4 → 5 → 6    │ ----→ │  Verifies the trail  │
 │  spec written under owner     │        │  tasks + code + done  │       │  at cycle boundary   │
 └─────────────────────────────┘        └────────────────────────┘       └────────────────────────┘
                                                                                ▲
                                                                                │
           wave-planning  — cross-cuts: reports on all active features at once ─┘
```

### Adding a new skill

A skill is added when an execution pattern recurs often enough that documenting the mechanics once saves writing them each time, and when the mechanics are specific enough to describe as a step-by-step workflow (rather than just a principle). Proposed skill additions go through the same `type:process` work-item pipeline as PROCESS.md changes themselves. Skills should be scoped tightly — if a skill's description runs longer than a page, it's probably two skills pretending to be one.

---

## Section 7 — Backlog tagging

Every backlog item carries four tags. Without tags, prioritisation across the ecosystem is impossible.

| Tag | Values |
|-----|--------|
| **Product** | `hub` · `gimbal` · `game` · `journey-studio` · `universe-studio` · `arc-studio` · `platform-core` · `platform-domain` · `design-system` |
| **Type** | `feature` · `nfr` · `architectural` · `spike` · `bug` · `tech-debt` · `process` |
| **Maturity** | `0-raw` · `1-concept` · `2-explored` · `3-specified` · `4-ready` · `5-in-cycle` · `6-done` |
| **Domain service** *(if applicable)* | `world-model` · `narrative` · `experience` · `content` · `communication` · `discovery` · `intelligence` · `extension` |
| **Wave** *(optional)* | `ferd` · `eid` · `hamn` · `heim` · `brim` · `urd` — separate from and in addition to the product/studio/platform tag |

> **Gimbal platform sub-tags:** For platform-specific work on The Gimbal, use `gimbal:ios` or `gimbal:android` in the Product tag. For work that applies to both platforms, use `gimbal` alone.

### Tag format

In feature specs, tags are declared in YAML frontmatter (`owner`, `consumers`, `wave`, `maturity`). For free-form backlog annotations (e.g., in TASK-*.md files, in session notes, in discussion), write tags as a single line beneath the item title:

```
## Add group polls
**Tags:** product:hub · type:feature · maturity:2-explored · domain-service:communication

[item description...]
```

Tags are required on any item that needs to be found later. An untagged item is invisible — it cannot be prioritised, filtered, or assigned to a cycle.

---

## Section 8 — How this process evolves

The process is not sacred. It exists to serve the work, not the other way around. When the process gets in the way, the process changes.

### Rules for changing the process

1. **Process changes are work items** — type `process`. They go through the same maturity pipeline.
2. **PROCESS.md is versioned alongside code** — every change is a normal git commit with a clear "why."
3. **Quarterly process audit** — once per quarter, write an audit using the retrospective template (`../templates/retrospective.md`) at `retrospectives/audit-YYYY-Q#.md` (e.g., `audit-2026-Q2.md`). The audit asks:
   - What did I skip? (and why — was the rule wrong, or was I wrong?)
   - What's missing? (something we did informally that should be codified)
   - What can be automated? (a checklist that became a script, a template that became a generator)
   
   The audit is the same shape as a cycle retro but scoped to an entire quarter — no separate template is needed.
4. **The process must survive continuous refinement** — adding structure should never erase existing tracking. If a new rule makes an old artifact obsolete, archive the old artifact rather than deleting it.
5. **No hidden process** — if you're following an unwritten rule, write it down here.

### What never changes

- The maturity pipeline (Sections 1–2) — items always move 0 → 4 → 6
- The DoR/DoD shape (Sections 4–5) — checklists may grow or shrink, but every item passes both
- Tag categories (Section 7) — tag values may evolve, but every item carries tags

Everything else — cadence, durations, retrospective format, document templates — is open to revision when experience demands it.

---

## Quick reference

- **Where do I put a new idea?** Create a feature spec at maturity 0-raw under its owner: `../{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md`, using `../templates/feature-spec.md`. If ownership is unclear, park it in `../ecosystem/thinking/OPEN_QUESTIONS.md` until it's clear where it belongs.
- **Where do I write a feature spec?** `../{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md`, using `../templates/feature-spec.md`. The same file carries the feature from maturity 0 through 6.
- **Where do I record a decision?** `../architecture/decisions/NNNN-{title}.md`, using `../templates/adr.md`
- **Where do I find what I'm working on this cycle?** `cycles/cycle-current.md` + the TASK-*.md files in `backlog/tasks/`
- **Where do I park something I don't want to forget but can't act on?** Add `parked: true` and `parked_reason: {explanation}` to the feature spec's YAML frontmatter. No separate icebox file.
- **Where do I document a session with Claude?** `sessions/YYYY-MM-DD-{topic}.md`
- **How does a feature actually get built day-to-day?** Use the `feature-development` skill (`.claude/skills/feature-development/SKILL.md`). See the "Skills as the execution layer" section.
- **What's the way of working?** This file.

---

**Last updated:** 2026-04-22 — §6 pointer to per-level source-document map added; §6.5 paragraphs for `ecosystem-decomposition` and `wave-planning` revised to make the vertical/horizontal axis separation explicit. Follows substantial rewrite of `.claude/skills/ecosystem-decomposition/SKILL.md` in the same session. Previous update: 2026-04-19 — gap review hook added to §3 cycle boundary; WIP limit in §3 corrected from "doing" to "review" (closing G-08); follow-on rewording of three §3 passages (wave paragraph, "Why this shape" rationale, "What to adjust first" item 1) to align with review-stage WIP framing. Previous update: 2026-04-17 way-of-working refactor Session 1 (Tier 1 cleanup + Tier 2 structural additions). See `../../CLAUDE.md` for the project entry point and `../planning/sessions/2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md` for the refactor's execution log.
