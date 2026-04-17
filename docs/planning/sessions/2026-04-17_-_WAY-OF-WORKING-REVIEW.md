# Session — Way of Working Review

**Date:** 2026-04-17
**Participants:** Stefan + Claude
**Status:** In progress
**Session type:** Strategic review — way of working across the whole ecosystem

---

## Purpose

Review, analyse, and refactor the way of working for the FringeIsland ecosystem end-to-end, so that the process from vision down to AI-executed tasks is solid, clear, and documented.

This document is the live working surface for the session: discoveries, decisions, open questions, and the running action list. At session close it becomes the session bridge.

---

## Goals (locked at session start)

### Goal 1 — Overall

We have a solid, clear, and documented way of working, from the very top (vision) all the way down to execution of tasks by automated AI agents / sub-agents, based on the whole FringeIsland ecosystem and its products.

### Goal A — Overarching process and cycle

We have a solid, clear, and documented view of the overarching process and cycle used to coordinate the complete evolution of the FringeIsland ecosystem.

**Primary artifact:** `docs/planning/PROCESS.md` (exists, April 2026 rewrite)
**Scope:** strategic — multi-product, multi-wave, multi-cycle

### Goal B — How the top process and cycle is used in reality

We have a solid, clear, and documented view of how the top process and cycle is used in reality.

#### Goal B1 — Evolution and development (vertical trace)

For evolution and development this means it's easy to follow how our thinking is broken down from our vision all the way down to concrete actions that we run on a daily basis.

**Scope:** per-work-item — vision → product description → product spec → feature PRD → user story → task → daily AI execution
**Includes:** the Research → Plan → Annotate → Implement AI execution loop; the mechanics of a feature travelling the pipeline end-to-end

#### Goal B2 — Continuous learning and quality (horizontal trace)

For continuous learning and keeping a high standard to our overall work this means we have a solid, clear, and documented view of how we care for the whole ecosystem, its products, the quality of our code and documentation, and performance of both the development and products.

**Scope:** ecosystem-wide — code quality, documentation quality, product performance, development performance, ecosystem coherence
**Includes:** doc-health-check machinery, retrospectives at multiple scales, quarterly audits, cross-product consistency checks

### Mental model

| Goal | Scope |
|------|-------|
| A | The machine itself |
| B1 | A single part moving through the machine |
| B2 | Maintaining the machine while it runs |

---

## Method for this session

Walking the goals in order: A → B1 → B2.

For each goal:
1. Survey what exists
2. Identify gaps against the goal statement
3. Log discoveries in the list below — don't design solutions yet
4. At the end of each goal, pause to decide what becomes a concrete action

Discovery format: one bullet per item, tagged with the goal it belongs to (A / B1 / B2), followed by a one-line description and current status.

---

## Discovery list

### Goal A — Overarching process and cycle

_(walk completed)_

**PRE-EXISTING NOTES from prior analysis:**

- **[A] PRD template missing** — PROCESS.md §6 and §2 correctly reference `templates/prd.md`. The file does not yet exist in `docs/templates/`. Needs to be created soon. Keep the reference as `prd.md`; leave the separate `feature-spec.md` file alone.
- **[A] Templates exist but aren't referenced in PROCESS.md §6** — `docs/templates/task.md` and `docs/templates/wave-spec.md` exist on disk but aren't in the trigger-artifact map. Task is implied by the work item lifecycle (§1); wave-spec likely relates to `docs/planning/waves/`. Needs a decision: add them to §6, or are they support templates not meant to appear there?
- **[A] Tech-debt allocation not explicit** — PROCESS.md §2 names `tech-debt` as a work item type but doesn't ensure it reaches the betting table. Research recommends allocation; milder version is "at least one bet per cycle is tech-debt / NFR / process unless backlog has none."
- **[A] NOW/NEXT/LATER roadmap format not prescribed** — PROCESS.md §6 references product/platform/ecosystem roadmaps as artifacts but doesn't specify the outcome-based format the research recommends. May be a template question rather than a PROCESS.md question.
- **[A] Two "under review" protocols still present** — `DEFERRAL_PROTOCOL.md` and `PLANNING_PROTOCOL.md` flagged as under review in `docs/planning/README.md`. May be redundant with PROCESS.md §3 (deferral via wave tags + icebox + betting) and PROCESS.md §1 (research-before-specification discipline).

**DISCOVERIES FROM THIS WALK:**

- **[A] Backlog files `discovery.md`, `product.md`, `icebox.md` referenced but don't exist** — PROCESS.md §1 treats these as the canonical homes for items at maturity 0–4 and for parked items. None exist on disk; only `backlog/README.md` and `backlog/tasks/` are present. Until they exist, the maturity-location table in §1 is aspirational.
- **[A] Contradiction between PROCESS.md §1 and `backlog/README.md`** — §1 says items at 0–2 live in `backlog/discovery.md` and 3–4 live in `backlog/product.md`. `backlog/README.md` says items at 0–3 live in the ecosystem tree as feature specs under each owner, "not duplicated here." These two cannot both be true. Needs a decision: is the backlog the catalogue of work-in-motion (with backlog files as its contents), or is the ecosystem tree the catalogue (with the backlog being only cycle-pulled items)?
- **[A] `cycles/cycle-current.md` referenced but doesn't exist** — PROCESS.md §6, the maturity table in §1, and the Quick Reference all point here as the home of the active cycle. Only `cycles/README.md` exists. First cycle hasn't run yet; when it does, this file needs to appear.
- **[A] `prds/` directory referenced but doesn't exist** — PROCESS.md §1, §6, and Quick Reference point to `prds/prd-{slug}.md` for major-feature PRDs. No such directory. Possibly defensible because no feature has reached maturity 3 yet. When the first PRD is written, needs a real home. Also worth reconciling with the ecosystem-tree-as-catalogue model from `backlog/README.md` — are PRDs flat in `docs/planning/prds/`, or nested alongside features under each owner?
- **[A] `docs/ecosystem/ECOSYSTEM_ROADMAP.md` referenced but doesn't exist** — PROCESS.md §3 and the wave-transition section reference this file twice as the place where cycle-boundary and wave-transition roadmap updates land. Not on disk.
- **[A] `docs/platform/core/ROADMAP.md` and `docs/platform/core/SPECIFICATION.md` referenced but don't exist** — PROCESS.md §3 references the roadmap; §5 DoD references `docs/platform/core/SPECIFICATION.md` as the thing to update when shared API surfaces change. `docs/platform/core/` currently has only `features/` and `README.md`.
- **[A] Stale reference to `ARCHITECTURE_ANATOMY.md`** — PROCESS.md header refers to `../architecture/ARCHITECTURE_ANATOMY.md` as companion docs. The file on disk is `ARCHITECTURE_ANATOMY_V1.md` (archived per April 12 session bridge). Link is broken.
- **[A] No mention of `docs/products/` or `docs/studios/` in PROCESS.md §6 consumer side** — §6 correctly says new product/studio artifacts go under `../products/{name}/` and `../studios/{name}/`. These directories exist. But PROCESS.md doesn't anywhere say "features live in `products/{name}/features/`" — a pattern that's assumed by memory and backlog/README.md but not stated in PROCESS.md itself.
- **[A] Maturity pipeline and artifact lifecycle aren't wired together explicitly** — §1 defines maturity levels; §6 defines triggers for artifacts. A reader can't easily answer "when a feature reaches maturity 2 (Explored), what artifact is the output, and where does it live?" — because §6 is keyed on triggers-that-are-events, not on maturity-level transitions. Worth considering whether §6 should have a maturity-level column, or a separate column mapping.

**OVERALL READ OF GOAL A:**

PROCESS.md's strategic content is solid and internally consistent in spirit. The maturity pipeline, work item types, cadence, DoR/DoD, tagging system, and meta-process machinery are all coherent. The research-to-PROCESS mapping done in the previous exchange confirms it's a faithful implementation of the two research reports.

The gap is almost entirely about **references that don't resolve**: files that should exist don't, paths that were correct at time of writing are now stale, and one genuine structural contradiction (backlog-as-catalogue vs ecosystem-tree-as-catalogue). These are not philosophical gaps — they're execution gaps between what PROCESS.md promises and what the filesystem delivers.

Fixing Goal A cleanly requires roughly two things:
1. Resolve the backlog-vs-ecosystem-tree contradiction (decision, not just file creation).
2. Create the missing scaffold files and fix the stale path references so everything PROCESS.md promises actually resolves.

### Goal B1 — Evolution and development

_(walk completed)_

**THE ACTUAL WORKING MODEL (what exists on disk):**

```
Level 1: VISION.md (constitutional)
   ↓
Level 2: Entity DESCRIPTION + SPECIFICATION + ROADMAP
         (products/ · platform/ · studios/ · design-system/)
   ↓
Level 3: Capability map (analytical, produced during wave planning or cooldown)
   ↓
Level 4: Feature spec: FEAT-{PREFIX}{NNN}-{slug}.md
         under owner in ecosystem tree
         stories embedded inline with Given/When/Then
         maturity tracked in YAML frontmatter (0 → 6)
   ↓
Level 5: Task: TASK-{NNN}.md in docs/planning/backlog/tasks/
         created only at maturity 4+
   ↓
Level 6: Daily AI execution via `feature-development` skill
         Load context → Check tasks → Implement → Update status → Clean up
```

**Supporting machinery (present and working):**
- `ecosystem-decomposition` skill at `.claude/skills/ecosystem-decomposition/SKILL.md` — comprehensive, covers Levels 1–5 decomposition end-to-end
- `feature-development` skill at `.claude/skills/feature-development/SKILL.md` — execution loop for maturity 4 → 6
- `wave-planning` skill at `.claude/skills/wave-planning/SKILL.md` — wave scope + progress + DoD
- 15 templates in `docs/templates/` (including feature-spec.md, task.md, wave-spec.md — all the ones the skills reference)
- `AGENTS.md` + per-tier `CLAUDE.md` files (e.g. `docs/products/CLAUDE.md`, `docs/platform/CLAUDE.md`) — boundaries and tier-specific conventions
- `research-mode` skill — adjacent anti-hallucination toggle
- `agent-builder` skill + three adjacent agents (voice, image, music) — support domains, not core workflow

**DISCOVERIES FROM THIS WALK:**

- **[B1 → A] MAJOR: Structural mismatch between PROCESS.md and the actual working model** — PROCESS.md §2 says feature-type items use `prd.md` + `user-story.md` templates, and §6 describes PRDs at `prds/prd-{slug}.md` as the artifact at maturity 3. But the actual working model is: feature spec (with embedded stories) in the ecosystem tree under the owner, described in the `ecosystem-decomposition` skill and supported by `feature-spec.md` template. The `user-story.md` template in `docs/templates/` is orphaned — nothing on disk uses it, no skill references it. This is the root cause of the backlog-as-catalogue vs ecosystem-tree-as-catalogue contradiction from Goal A. Resolution: PROCESS.md needs to be rewritten to describe the actual model, and the vestigial PRD + separate user-story model needs to be retired. The `user-story.md` template should probably be deleted.

- **[B1] The three skills collectively cover Levels 1–6** — `ecosystem-decomposition` covers Vision → maturity-4 feature, `feature-development` covers maturity 4 → 6 (including daily execution), `wave-planning` covers the cross-cutting wave-level tracking and DoD. This answers the "daily AI execution" question — the mechanics live in skills, not in PROCESS.md or workflow files. The four pre-restructure workflow files (BOOT_UP, CLOSE_DOWN, DOC_HEALTH_CHECK, WORKFLOW) have been superseded by the skills, whether or not we've formally acknowledged that.

- **[B1] Level 6 (daily AI execution) is documented but not discoverable from PROCESS.md** — A reader of PROCESS.md has no idea that `.claude/skills/feature-development/SKILL.md` exists or that it's the answer to "how do I actually build a ready feature." PROCESS.md §6 stops at the trigger-artifact map and says nothing about the skills. Goal B1 is completed by the skills, but the trace from top to bottom is not visible because PROCESS.md doesn't point to the skills as the execution layer.

- **[B1] No feature specs written yet at any level** — `docs/products/hub/features/`, `docs/platform/core/features/`, `docs/platform/domain/features/`, `docs/studios/*/features/` all contain only README files. The structure is ready; the content hasn't been produced. This is expected per memory ("Level 4 feature specs in preparation") but means the trace from entity-level down to feature level is a structural promise, not a realised system yet.

- **[B1] Gimbal, Game, Studios lack DESCRIPTION.md** — Only Hub has a DESCRIPTION.md. Gimbal, Game, Journey Studio, Universe Studio, Arc Studio directories exist with README files but no descriptions yet. Defensible because they're pre-scope — but worth noting that the "every active entity has DESCRIPTION.md" quality check in the `ecosystem-decomposition` skill will start firing as soon as any of them become active.

- **[B1] `SPECIFICATION.md` and `ROADMAP.md` don't exist for any product** — Not even for Hub, which is active. `ecosystem-decomposition` skill says they should exist when an entity enters active development; Hub has entered active development (it has a DESCRIPTION.md, a CLAUDE.md, and a features/ directory); but SPECIFICATION.md and ROADMAP.md are missing.

- **[B1 → A partial resolution] `products/README.md` specifies NOW/NEXT/LATER roadmap format** — One Goal A discovery is partially resolved by discovery here: the roadmap format IS specified (in `docs/products/README.md`), just not in PROCESS.md. The gap is that PROCESS.md doesn't reference it. Fixing this is a PROCESS.md pointer, not missing content.

- **[B1] The skills are the real Level 6 specification, not PROCESS.md** — PROCESS.md reads as if it's the complete way-of-working document. But PROCESS.md only covers the strategic machinery (maturity pipeline, cadence, DoR/DoD, tagging, meta-process). The execution mechanics — how a feature gets built, how tasks are created from stories, how context is loaded, what the quality gates are — live in the skills. If this is the intended design, PROCESS.md needs to point at the skills explicitly and say "execution mechanics are here." Otherwise the whole system looks incomplete to anyone reading PROCESS.md.

**OVERALL READ OF GOAL B1:**

Goal B1 is **more complete than it looks from PROCESS.md alone**. The vertical trace from Vision down to daily AI execution genuinely exists — VISION.md is solid, the ecosystem tree is structured, templates are comprehensive, the three skills cover decomposition + development + wave tracking end-to-end. The Research → Plan → Annotate → Implement loop from the research is effectively realised in the `feature-development` skill's 6-step workflow.

What's missing is **not the execution layer** — it's the **discoverability layer**. PROCESS.md describes a different (older) model. A newcomer reading PROCESS.md would not find the skills, would think PRDs and separate user-story files are the artifacts, and would miss that the real working system lives in `.claude/skills/`.

Fixing Goal B1 cleanly requires:
1. **Rewrite PROCESS.md §2 and §6** to reflect the actual working model (feature specs with embedded stories in ecosystem tree; tasks in planning tree; skills as execution layer).
2. **Retire the orphaned PRD + user-story model** — delete `user-story.md` template, remove PRD references from PROCESS.md, decide whether `prd.md` (still missing from templates/) is actually a different thing or whether "PRD" is just an old name for the feature spec.
3. **Make the skills discoverable from PROCESS.md** — add a reference from PROCESS.md to the three core skills as the execution layer.

This is actually good news: Goal B1 is largely done — we need to connect the pieces, not build them.

### Goal B2 — Continuous learning and quality

_(walk completed)_

**SIX CONCERNS WALKED:**

Goal B2 is a collection of maintenance practices across six concerns. Walking them separately.

---

**Concern 1 — Retrospectives (learning loops)**

PROCESS.md §3 and §8 name four retrospective scales:
- Weekly Three Ls (~30 min Friday)
- Cycle boundary retrospective (~2 hrs)
- Wave retrospective when a wave's core work completes
- Quarterly process audit

Template at `docs/templates/retrospective.md` is solid and handles weekly/cycle/wave with a single template, scope determining depth. Cycle retros live in `docs/planning/retrospectives/retro-YYYY-MM-DD.md`, wave retros in `retro-wave-{name}.md`.

Discoveries:
- **[B2] Weekly Three Ls has no specified home** — `retrospectives/README.md` describes cycle and wave retros but says nothing about weekly retros. If the retrospective template applies to them too (which it's designed for), where do they live? `retrospectives/weekly-YYYY-MM-DD.md`? Or somewhere lighter? Not specified.
- **[B2] Quarterly process audit has no artifact, template, or location** — PROCESS.md §8 names it as a practice ("What did I skip? What's missing? What can be automated?") but gives it no file location, no template, no trigger mechanism. It's the audit most likely to be skipped because there's no scaffolding to prompt it.
- **[B2] Retro template's "Metrics" section has no feeder** — Throughput, cycle time, spillover, DoR/DoD compliance are listed as fields but there's no mechanism for collecting them, no baseline, no "how to measure." For a solo developer pre-first-cycle this may be fine; when cycles start, these fields will either get populated or get skipped — and if skipped, the template becomes cargo cult.

---

**Concern 2 — Documentation quality / doc health**

The old `DOC_HEALTH_CHECK.md` workflow file exists but is stale (pre-restructure, referenced for reference only per prior session instruction). No skill covers doc health. `feature-development` skill step 5 updates specific docs per-feature (CHANGELOG.md, features/README.md) but that's scoped to work being done, not periodic ecosystem-wide checking.

Discoveries:
- **[B2] MAJOR: No ecosystem-wide doc health mechanism exists** — There's no periodic check for: stale path references (we hit one this session: `ARCHITECTURE_ANATOMY.md` → `_V1.md`), terminology drift, README indexes out of sync with their directories, missing DESCRIPTION.md for active entities, features at maturity 6-done with unfilled Implementation notes, or broken cross-references. The old `DOC_HEALTH_CHECK.md` workflow file was the closest thing and has been set aside. This is the single largest gap in Goal B2.
- **[B2] No cadence or trigger for doc health** — Even if a doc-health mechanism existed, when does it run? At cycle boundaries? During cooldown? After cross-cutting changes? All of the above? Needs a decision.

---

**Concern 3 — Code quality**

Tooling is in place: ESLint, Jest, Playwright, TypeScript strict, Supabase CLI for DB tests. PROCESS.md §5 DoD covers per-task code quality gates (lint, tests, RLS, builds, preview deployment). `feature-development` skill Step 4 runs lint. AGENTS.md "always do" includes lint + type-check before committing.

Discoveries:
- **[B2] No ecosystem-wide code quality health check** — Per-task DoD is covered, but there's no "test coverage report across all products," no "technical debt register," no "NFR compliance tracking." Not an urgent gap pre-launch, but flagged as a future concern when the codebase grows beyond what one person can hold in their head.

---

**Concern 4 — Product performance (post-launch monitoring, metrics, user feedback)**

Entirely forward-looking. Pre-launch for Hub, not applicable for Gimbal/Game. Research recommended Sentry + uptime + analytics + weekly feedback review as a Phase 3 practice.

Discoveries:
- **[B2] Post-launch product feedback loops are undocumented** — No skill, no process, nothing captures how user/product signal feeds back into development. Defensible as pre-launch deferral, but the B2 framework needs to grow to include this when Hub launches. Worth an explicit entry rather than discovering it late.

---

**Concern 5 — Development performance (process-health metrics)**

PROCESS.md §3 says "Review metrics (cycle time, throughput, deployment frequency)" at cycle boundaries. Retrospective template has a Metrics section with these fields.

Discoveries:
- **[B2] Development metrics have template fields but no collection mechanism** — See Concern 1's third bullet. Same issue: the slots are there, the practice isn't.

---

**Concern 6 — Ecosystem coherence**

Cross-cutting consistency: terminology, cross-reference integrity, boundary violations between products/services, ADR coverage, cross-product dependency tracking. Some partial mechanisms exist.

- `docs/platform/DEPENDENCIES.md` is referenced in `platform/README.md` as "to be written" — not yet created.
- PROCESS.md §8's quarterly audit covers process coherence but not ecosystem coherence.
- `ecosystem-decomposition` skill has quality checklists that fire during decomposition work, not periodically.

Discoveries:
- **[B2] `DEPENDENCIES.md` is promised but doesn't exist** — Listed as "to be written" in `platform/README.md`. The cross-product dependency table (Capability × Consumer matrix) is a core B2 artifact per the research report. Defensible to defer until Gimbal planning starts, but when a second product enters active development the absence of this table starts hurting immediately.
- **[B2] No periodic ecosystem coherence check** — Terminology drift, boundary violations, and cross-product consistency only get caught if a session happens to touch them. No explicit mechanism.

---

**Concern 7 (adjacent) — Maintaining the maintenance mechanisms themselves**

Already captured earlier in this session: the question of how AGENTS.md stays healthy as more rules accumulate (surfacing from adding the "cross-check negative search results" rule today). This is meta-B2 — how we maintain the tools we use to maintain quality.

Discoveries (duplicate, kept for completeness):
- **[B2] AGENTS.md as a living capture of agent-behavioral rules** — Already logged. (1) how do discoveries get captured reliably, (2) how does AGENTS.md stay short and scannable, (3) is there a periodic audit of AGENTS.md rules?

---

**OVERALL READ OF GOAL B2:**

B2 is the weakest of the three goals in its current state. Unlike Goal A (mostly there, needs reference fixes and one rewrite) or Goal B1 (largely complete, needs discoverability), B2 has **real structural gaps**:

1. **Doc health has no home.** The old mechanism is stale and set aside; no replacement exists.
2. **Weekly retros have no specified location.**
3. **Quarterly process audit has no scaffolding.**
4. **Metrics are template fields, not a practice.**
5. **DEPENDENCIES.md is overdue.**
6. **Post-launch feedback loops aren't even sketched.**
7. **No periodic ecosystem coherence check.**

The common pattern: **B2 practices are named in PROCESS.md or in templates, but the mechanisms that would make them happen are missing.** Retros have a template; weekly retros have no home. Metrics have slots; nothing feeds them. Process audit is named; has no artifact. Doc health was a workflow file that's now a stale reference.

The good news: **most of B2's fixes are small-to-medium scope** — creating a few skill files, defining cadence for existing practices, writing DEPENDENCIES.md when Gimbal scoping starts. Unlike the B1 discoveries which involved retiring a mental model (Model B), B2 fixes are mostly additive rather than corrective.

Priority ordering (my read, not locked):
1. **Highest: doc health mechanism** — the ecosystem is already at the size where stale references are happening, and we don't have a safety net.
2. **High: quarterly process audit scaffolding** — cheap to add, easy to skip without it, matters most for the "how we improve how we work" goal.
3. **Medium: weekly retro location + metrics feeder** — will matter once first cycle starts, which hasn't happened yet.
4. **Medium: DEPENDENCIES.md** — matters when Gimbal enters active scoping.
5. **Lower: post-launch feedback loops** — real concern but pre-launch, future B2 work.
6. **Lower: ecosystem-wide code quality dashboards** — not urgent at current scale.

---

### CROSS-CUTTING DISCOVERY — Roadmaps and waves

_(surfaced after the three walks, touches Goal A, B1, and B2)_

**The theory (what PROCESS.md, templates, and READMEs describe):**

A three-roadmap model:
- **Ecosystem roadmap** at `docs/ecosystem/ECOSYSTEM_ROADMAP.md` — all products + platform + studios, NOW/NEXT/LATER by outcomes, updated at wave boundaries.
- **Product roadmaps** at `docs/products/{name}/ROADMAP.md` — one per product, NOW/NEXT/LATER, items link to feature specs, has explicit "Wave alignment" section, updated at cycle boundaries.
- **Platform roadmap** at `docs/platform/core/ROADMAP.md` — shared infrastructure work, updated at cycle boundaries.

The `product-roadmap.md` template is well-designed (no dates, items move NOW/NEXT/LATER as confidence grows, explicit wave-alignment table, decision log at the bottom for append-only history).

**The practice (what exists on disk):**

- **Zero roadmap files exist.** No `ECOSYSTEM_ROADMAP.md`, no `products/hub/ROADMAP.md`, no `platform/core/ROADMAP.md`. All three referenced in PROCESS.md §3 and in README files, none written.
- **All six wave files exist but are empty.** `ferd.md`, `eid.md`, `hamn.md`, `heim.md`, `brim.md`, `urd.md` each contain only `_Content to be populated._`. The `wave-spec.md` template is ready (features-in-scope section, wave DoD, completion criteria) but hasn't been applied.
- **`FERD-CAPABILITY-MAP.md` is doing double duty.** This is the one roadmap-adjacent artifact that currently holds content: 110 capabilities across PC/PD/Hub with status, dependencies, and notes. It's a capability tracker, not a NOW/NEXT/LATER roadmap. It's carrying the weight of what should be split across the Ferd wave file + the Hub/Platform roadmaps.

**Waves and roadmaps — how they tie together:**

The two are **orthogonal but intersect**:
- Waves = thematic focus periods (what the ecosystem prioritises during a period)
- Roadmaps = NOW/NEXT/LATER views of what's actively being worked on, queued, or considered
- A single feature is: listed in a wave's "features in scope" (wave-spec template) AND listed on its owner's product/platform roadmap in NOW or NEXT or LATER (roadmap template) AND tagged with its wave in the roadmap's Wave alignment section.

The two must stay coherent:
- A feature in the Ferd wave's "features in scope" should appear on a product or platform roadmap somewhere.
- A feature on a product roadmap should be tagged with which wave it belongs to (or none, if it's pure tech-debt / NFR).
- When a wave transitions (e.g. Ferd complete → Eid active), the ecosystem roadmap updates to reflect the shift in strategic focus.

Without either side of this pairing, the other breaks: empty wave files mean nothing to draw from when filling roadmaps; missing roadmaps mean cycle betting has no queue to pick from.

**DISCOVERIES:**

- **[cross-cutting] MAJOR: The entire roadmap layer is scaffolding without content** — PROCESS.md describes roadmaps as real artifacts consumed at cycle boundaries and wave transitions. None exist. The first cycle hasn't started yet, so this hasn't hurt yet. The moment cycles start, absence of roadmaps will mean "what goes into the next cycle" is re-derived each time instead of read from a document. **Priority: High — roadmaps are a pre-first-cycle prerequisite, not a nice-to-have.**

- **[cross-cutting] All six wave files are empty** — `ferd.md` (active wave) has no features-in-scope list. Each wave file should apply the wave-spec template. Ferd specifically needs this before the first cycle starts. Later waves can be populated gradually but should at least have the theme and a few seed features.

- **[cross-cutting] FERD-CAPABILITY-MAP.md's role is unclear under Model A** — Is it a permanent Ferd wave artifact that lives alongside `ferd.md`? Is it point-in-time reference that gets superseded by `ferd.md` once that file has the feature list? Is it a capability audit snapshot that should move to `docs/planning/reference/`? Needs a decision. My instinct: it should be absorbed into `ferd.md` (via the features-in-scope list linking to feature specs) with any remaining historical value archived to `reference/`. But this is a real call, not obvious.

- **[cross-cutting] Creating roadmaps and populating waves is real thinking work, not scaffolding** — These aren't files you write in an hour. They require: reflecting on strategic priorities (ecosystem roadmap), identifying NOW/NEXT/LATER boundaries honestly (product roadmap), and knowing what "in scope" actually means for each wave. The session file will capture this as its own dedicated track in the action list — not batched with template/file cleanup.

**What this changes about the action list structure:**

Previously I was thinking in three tiers (cleanup / structural additions / deferred with triggers). The roadmap work is a fourth category: **reflection-heavy strategic work** that needs its own session(s) and its own pacing. It can't be done in parallel with cleanup — it needs focus.

Suggested addition to the tier structure:
- Tier 1: Cleanup (mechanical, fast)
- Tier 2: Structural additions (skill files, PROCESS.md rewrites, template updates)
- **Tier 3 NEW: Strategic reflection sessions** — Hub SPECIFICATION.md + ROADMAP.md (already in DECISION-06), ecosystem roadmap, platform roadmap, Ferd wave file, future wave files (seed only)
- Tier 4: Deferred with triggers (DEPENDENCIES.md, post-launch, code quality dashboards)

---

### CROSS-CUTTING DISCOVERY — "Project specification" does not exist as a concept

_(Stefan's question, 2026-04-17)_

Checked:
- `docs/templates/` — no `project-specification.md` or similar; templates are `product-specification.md`, `domain-service-spec.md`, `feature-spec.md`, `wave-spec.md`, `vertical-spec.md`. No "project" variant.
- PROCESS.md, AGENTS.md, root CLAUDE.md, planning/CLAUDE.md — the word "project" does not appear in PROCESS.md or the templates at all.
- Grep across the full docs tree and skills — no `PROJECT_SPEC` or "project specification" references anywhere.

**Answer: No. FringeIsland does not use a "project specification" concept.**

The mental model is: **Ecosystem → Products / Platform / Studios / Design System → Features → Tasks.** There is no "project" layer. The word "project" is actively absent from the canonical documentation — which is deliberate, because using it would introduce ambiguity:

- Is a "project" a product? (It's not — a product is a surface FIMs touch.)
- Is it a wave? (It's not — a wave is a thematic focus period.)
- Is it a cycle? (It's not — a cycle is a 3-4 week betting period.)
- Is it a feature? (It's not — features are owned artifacts with embedded stories.)

The four terms (product, wave, cycle, feature) each answer a specific question and don't overlap. Introducing "project" would force a fifth axis that duplicates or confuses one of the existing four.

**If a "project-like" artifact is ever needed**, the closest existing shapes are:
- **A wave** — if it's a time-bound cluster of thematic work ("the Ferd project" = the Ferd wave)
- **A feature** — if it's a single deliverable with stories ("the payment project" = one or more payment features)
- **A cluster of features** — if it's a set of related features in one wave, potentially grouped under an epic-like concept that doesn't currently exist in the model

The last case — a cluster of related features that forms a natural deliverable larger than a feature but smaller than a wave — is the one place where "project" might genuinely fill a gap. Worth noting as an open question: does the model need an intermediate grouping concept between wave and feature? The research reports mention "epics" as this level, but PROCESS.md and the skills do not use the term.

**Recommendation:** Keep the absence of "project" as a deliberate design choice. Document it in PROCESS.md glossary (if one is created) or the ecosystem README, so future contributors don't re-introduce the term. If the need for an intermediate grouping arises, address it explicitly rather than defaulting to "project."

---

## Decisions locked this session

### DECISION-01 — Feature spec with embedded stories is the canonical pattern (Model A)

**Locked:** 2026-04-17

**Decision:** Features are described by a single `feature-spec.md` artifact with stories embedded inline. The PRD + separate user-story model (Model B) is retired.

**What this means:**
- `docs/templates/feature-spec.md` is the canonical artifact template for features at all maturity levels (0 → 6).
- Stories are embedded inside feature specs as subsections with Given/When/Then acceptance criteria, never as separate files.
- PRDs are not a separate artifact in this system. The word "PRD" may persist in casual use as a synonym for feature spec, or be retired entirely — either is fine, but there is no `prd.md` template to create and no `prds/` directory to build.
- `docs/templates/user-story.md` will be deleted as part of the cleanup.
- PROCESS.md §2 and §6 will be rewritten to describe Model A.
- All Goal A discoveries about missing PRD template, `prds/` directory, orphaned user-story template, and the backlog-vs-ecosystem-tree contradiction collapse into this decision. They are symptoms of the same root cause (PROCESS.md describing a vestigial model B) and dissolve when §2 and §6 are rewritten.

**Why locked now:**
The actual working system — `ecosystem-decomposition` skill, `feature-development` skill, `wave-planning` skill, the 15 templates, the ecosystem tree structure, the task template's `feature:` reference — has already committed to Model A. PROCESS.md was still pointing at Model B. Removing Model B as an option eliminates a large cluster of Goal A discoveries at the root rather than patching their symptoms.

---

### DECISION-02 — Skills are the execution layer; PROCESS.md references them

**Locked:** 2026-04-17

**Decision:** The skills in `.claude/skills/` are the canonical execution layer for the way of working. PROCESS.md remains the strategic document (cadence, pipeline, quality gates, meta-process) and references the skills as the place where execution mechanics live.

**What this means:**
- `ecosystem-decomposition` skill is canonical for decomposition work (Vision → maturity-4 feature).
- `feature-development` skill is canonical for execution (maturity 4 → 6).
- `wave-planning` skill is canonical for wave-level tracking and DoD.
- New execution workflows (e.g. doc-health-check) become skills, not PROCESS.md sections.
- PROCESS.md gets a new section (or expansion to §6) that names the skills and describes when each fires.
- PROCESS.md does NOT absorb execution detail — separation of concerns is preserved.

**Why locked now:**
The skills exist and work. The question was whether to keep them separate from PROCESS.md or merge them in. Merging would produce a 1500+ line monolith mixing cadence (PROCESS.md's job) with execution mechanics (skills' job). Keeping them separate preserves each document's focus, matches the loading model (skills load on-demand when agents recognise triggers; PROCESS.md is read during planning), and respects that execution mechanics churn faster than strategic rhythm.

---

### DECISION-03 — Doc health is a skill

**Locked:** 2026-04-17

**Decision:** Doc health checking is implemented as a `doc-health-check` skill in `.claude/skills/doc-health-check/SKILL.md`. Not as a PROCESS.md section, not as a standalone workflow file.

**What this means:**
- A new skill file will be created at `.claude/skills/doc-health-check/SKILL.md`.
- The skill contains step-by-step checks (stale paths, terminology drift, README indexes out of sync, missing DESCRIPTION.md for active entities, unfilled Implementation notes in 6-done specs, broken cross-references).
- The stale `docs/planning/workflows/DOC_HEALTH_CHECK.md` will be deleted once the skill supersedes it.
- Cadence for when the skill fires needs to be decided separately (open question).

**Why locked now:**
Consistent with DECISION-02 (skills are the execution layer). Doc health is a step-by-step workflow with clear checks — the exact shape a skill is designed for. A PROCESS.md section would repeat the pattern that didn't work for the old workflow files: strategic document carrying execution mechanics that should live elsewhere.

---

### DECISION-04 — Weekly Three Ls retros live in `docs/planning/retrospectives/`

**Locked:** 2026-04-17

**Decision:** Weekly retros use filename `weekly-YYYY-MM-DD.md` and live in `docs/planning/retrospectives/` alongside cycle and wave retros.

**What this means:**
- `retrospectives/README.md` needs updating to mention weekly retros and their naming.
- All three retro scales (weekly, cycle, wave) use the same `docs/templates/retrospective.md` template — already designed for this.
- A weekly retro is a real committed artifact, not informal journaling.

**Why locked now:**
Co-locating all retros in one directory means the retrospective history is a single searchable chronological record. Separating weekly retros into a journal or lighter location would fragment the learning trail and make quarterly audits (Decision pending) harder to perform.

---

### DECISION-05 — Consequences of DECISION-01 (cleanup actions, not separate decisions)

**Locked:** 2026-04-17 (as consequences of DECISION-01)

Recorded for traceability — these are not independent decisions but follow directly from locking Model A:

- `docs/templates/user-story.md` will be deleted (orphaned, no skill or file references it).
- `prds/` directory is not created. `prd.md` template is not created. PROCESS.md §1, §6, and Quick Reference will be updated to remove PRD references.
- PROCESS.md §1 maturity-location table will be rewritten: items at maturity 0–3 live in the ecosystem tree as feature specs under each owner. The `backlog/discovery.md`, `backlog/product.md`, `backlog/icebox.md` flat files are not created — they were Model B artifacts.
- The "parked / icebox" concept still matters, but needs a new home under Model A: probably a YAML frontmatter tag or a maturity state rather than a separate file. Open question, see below.
- `cycles/cycle-current.md` is created when the first cycle starts, not pre-emptively.
- `ARCHITECTURE_ANATOMY.md` reference in PROCESS.md header is updated to `ARCHITECTURE_ANATOMY_V1.md`.

---

### DECISION-06 — Hub SPECIFICATION.md and ROADMAP.md are required but deferred

**Locked:** 2026-04-17

**Decision:** Hub (the only active product) needs both a SPECIFICATION.md and a ROADMAP.md. These are promised by `ecosystem-decomposition` Level 2 and `products/README.md`. They will be written in a dedicated session, not as part of this way-of-working review.

**What this means:**
- Both files land in the action list with "own session" scope.
- Neither is blocking this session or the next cycle.
- Until they exist, Hub's entity-level documentation is incomplete — acknowledge the gap rather than hiding it.

---

### DECISION-07 — `DEPENDENCIES.md` deferred until Gimbal scoping starts

**Locked:** 2026-04-17

**Decision:** `docs/platform/DEPENDENCIES.md` (the cross-product capability × consumer table) is deferred. Trigger for creation: when Gimbal enters active scoping.

**What this means:**
- Until a second product is actively being scoped, there's no cross-product dependency to track.
- When Gimbal scoping begins, creating DEPENDENCIES.md is a prerequisite artifact, not optional.
- Recorded as a deferred decision with an explicit trigger so it doesn't get forgotten.

---

### DECISION-08 — Post-launch feedback loops and ecosystem-wide code quality dashboards are out of scope for this B2 pass

**Locked:** 2026-04-17

**Decision:** Both are valid B2 concerns, both are premature at current scale (pre-launch, solo, one active product). They will be addressed in a future B2 pass triggered by: Hub launching (for feedback loops) or codebase/team growth (for code quality dashboards).

---

### DECISION-09 — Quarterly process audit lives in `retrospectives/` using the retrospective template

**Locked:** 2026-04-17

**Decision:** The quarterly process audit (PROCESS.md §8) is written to `docs/planning/retrospectives/audit-YYYY-Q#.md` using the existing `docs/templates/retrospective.md` template.

**What this means:**
- Four retro scales now all use the same template and live in the same directory: `weekly-YYYY-MM-DD.md`, `retro-YYYY-MM-DD.md` (cycle), `retro-wave-{name}.md`, `audit-YYYY-Q#.md`.
- The retrospective template's existing sections (Three Ls, Metrics, Decisions, Process changes, Action items) already cover what PROCESS.md §8 describes as audit questions ("What did I skip? What's missing? What can be automated?"). No new template needed.
- `retrospectives/README.md` needs updating to describe all four scales and their naming.

**Why locked now:**
One template for all retro scales keeps the learning trail searchable and consistent. The quarterly audit's questions already fit inside the template — creating a separate template would be duplication.

---

### DECISION-10 — Doc-health-check skill fires at cycle boundaries

**Locked:** 2026-04-17

**Decision:** The `doc-health-check` skill (DECISION-03) fires at cycle boundaries — when a cycle ends, before the next cycle is shaped. Part of the cooldown-week ritual.

**What this means:**
- Cadence is predictable (every 3–4 weeks matching cycle length).
- Integrates with existing cycle-boundary ritual rather than creating a new cadence to remember.
- Findings feed the cycle retrospective and/or produce backlog items for the next cycle.
- PROCESS.md §3's cycle-boundary checklist will be updated to include "run doc-health-check."
- The skill can still be invoked on-demand after cross-cutting changes — the cycle-boundary firing is the baseline cadence, not the only allowed trigger.

**Why locked now:**
Aligning doc health with cycle boundaries means it happens at a natural pause point when the ecosystem is between states. Monthly would drift out of sync with cycles. Quarterly would be too infrequent for an ecosystem still actively restructuring. On-demand only would mean it rarely happens.

---

### DECISION-11 — Icebox is YAML frontmatter, not a separate file

**Locked:** 2026-04-17

**Decision:** The "icebox / parked work" concept is implemented as optional YAML frontmatter fields on feature specs: `parked: true` and `parked_reason: {short explanation}`. Absent or `parked: false` means active. No separate `icebox.md` file is created.

**What this means:**
- A feature can be at any maturity level (0–6) and simultaneously parked. Maturity ("how well-specified is this") and parked ("is this currently progressing") are orthogonal.
- Parking does NOT reset or regress maturity. An item parked at maturity 3 un-parks at maturity 3.
- `parked_reason` is required when `parked: true` — prevents parking decisions from getting lost. Examples: "priority shifted to other wave", "waiting for PC-Identity capability", "research inconclusive, needs revisit".
- Cycle-boundary ritual (DECISION-10) includes reviewing parked features: grep for `parked: true`, evaluate whether `parked_reason` still holds, decide to un-park or keep parked.
- The `feature-spec.md` template will be updated to document these optional fields.

**What replaces the research's icebox concept:**
The research's icebox was a bin for raw ideas + small items. Under Model A, raw ideas and concepts already live in the ecosystem tree as low-maturity feature specs (0-raw, 1-concept). So "iceboxed" under Model A specifically means "a feature that's been specified enough to have an entry but isn't currently progressing." This is narrower and clearer than the research's open bin.

**Why locked now:**
Keeping maturity as a one-dimensional progression (0 → 6) preserves PROCESS.md §8's "maturity never regresses" invariant. Orthogonal parked flag means we can represent "specified but parked" without corrupting the pipeline. Single grep query returns the full icebox across the ecosystem tree — no separate file to maintain.

---

_(all icebox-related questions resolved)_

---

---

## Open questions

_(none yet)_

---

## Action list (candidate — reviewed at session close)

Organised into four tiers based on nature of the work:
- **Tier 1 — Cleanup** (mechanical, fast, mostly consequences of DECISION-01)
- **Tier 2 — Structural additions** (create new scaffolding the locked decisions require)
- **Tier 3 — Strategic reflection sessions** (reflection-heavy work requiring focus)
- **Tier 4 — Deferred with triggers** (recorded for traceability, not scheduled)

Within each tier, items are ordered by priority (highest first). Every action links to the decision or discovery that produced it.

---

### TIER 1 — Cleanup

Mechanical changes. Can be done in a single focused session or batched. No strategic thinking required.

**T1.1 — Rewrite PROCESS.md §2 to reflect Model A**

- Remove `prd.md` + `user-story.md` template references.
- Feature-type items use `feature-spec.md` (stories embedded).
- Tech-debt items use `feature-spec.md` (lightweight).
- Other types unchanged.
- Source: DECISION-01, DECISION-05.

**T1.2 — Rewrite PROCESS.md §1 maturity-location table to reflect Model A**

- Maturity 0–3 lives in the ecosystem tree as feature specs under each owner (at varying levels of completion).
- Maturity 4 (ready) lives in the ecosystem tree as feature specs with YAML `maturity: 4-ready`.
- Maturity 5 (in cycle) lives in the ecosystem tree as feature specs tagged with current cycle; tasks live in `docs/planning/backlog/tasks/`.
- Maturity 6 (done) lives in the ecosystem tree as feature specs with `maturity: 6-done` and Implementation notes.
- Remove references to `backlog/discovery.md`, `backlog/product.md`, `backlog/icebox.md`.
- Add the `parked: true` + `parked_reason` mechanism for icebox (DECISION-11).
- Source: DECISION-01, DECISION-05, DECISION-11.

**T1.3 — Rewrite PROCESS.md §6 to reflect Model A + skills as execution layer**

- Remove "Major feature reaches maturity 3 → PRD → `prds/prd-{slug}.md`" row.
- Add "Feature reaches maturity 2+ → `feature-spec.md` → `docs/{owner}/features/FEAT-*.md`" row.
- Add note that execution mechanics live in skills (reference `ecosystem-decomposition`, `feature-development`, `wave-planning`, `doc-health-check`).
- Source: DECISION-01, DECISION-02, DECISION-03, DECISION-05.

**T1.4 — Rewrite PROCESS.md Quick Reference section**

- "Where do I put a new idea?" → create a feature spec at maturity 0-raw in the owner's features directory, OR park it in `ecosystem/thinking/OPEN_QUESTIONS.md` if ownership is unclear.
- "Where do I write a feature spec?" → `docs/{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md`, using `feature-spec.md`.
- Remove `prds/prd-{slug}.md` references.
- "Where do I park something?" → add `parked: true` + `parked_reason` to the feature spec frontmatter.
- Source: DECISION-01, DECISION-05, DECISION-11.

**T1.5 — Fix stale reference in PROCESS.md header**

- `../architecture/ARCHITECTURE_ANATOMY.md` → `../architecture/ARCHITECTURE_ANATOMY_V1.md`.
- Source: Goal A walk.

**T1.6 — Update PROCESS.md §3 cycle-boundary checklist**

- Add: "Run `doc-health-check` skill to verify ecosystem docs are clean."
- Source: DECISION-10.

**T1.7 — Update PROCESS.md §8 quarterly audit**

- Point to the retro template and the `retrospectives/audit-YYYY-Q#.md` location.
- Source: DECISION-09.

**T1.8 — Add reference to tech-debt allocation guideline in PROCESS.md §3**

- Add: "At cycle boundaries, at least one bet should be a tech-debt / NFR / process item unless the backlog genuinely contains none."
- Source: Goal A walk (tech-debt allocation discovery).

**T1.9 — Delete `docs/templates/user-story.md`**

- Orphaned after DECISION-01; no skill or file references it.
- Source: DECISION-05.

**T1.10 — Update `docs/templates/feature-spec.md`**

- Document optional `parked: true` and `parked_reason: {explanation}` frontmatter fields.
- Source: DECISION-11.

**T1.11 — Update `docs/planning/retrospectives/README.md`**

- Describe all four retro scales: weekly (`weekly-YYYY-MM-DD.md`), cycle (`retro-YYYY-MM-DD.md`), wave (`retro-wave-{name}.md`), quarterly audit (`audit-YYYY-Q#.md`).
- Source: DECISION-04, DECISION-09.

**T1.12 — Update `docs/planning/README.md`**

- Resolve "under review" status on `DEFERRAL_PROTOCOL.md` and `PLANNING_PROTOCOL.md` — decide keep / merge into PROCESS.md / delete.
- Source: Goal A walk.

**T1.13 — Delete the four stale workflow files**

- Delete `docs/planning/workflows/BOOT_UP.md`, `CLOSE_DOWN.md`, `DOC_HEALTH_CHECK.md`, `WORKFLOW.md` once their replacements (skills) exist.
- Sequenced: do this AFTER T2.1 (the new doc-health-check skill exists) so nothing is lost in transition.
- Source: DECISION-02, DECISION-03.

---

### TIER 2 — Structural additions

New files or skill content that locked decisions require. More than cleanup but not strategic reflection.

**T2.1 — Create the `doc-health-check` skill**

- Location: `.claude/skills/doc-health-check/SKILL.md`.
- Scope: step-by-step checks for stale paths, terminology drift, README indexes out of sync, missing DESCRIPTION.md for active entities, unfilled Implementation notes in 6-done specs, broken cross-references.
- Trigger: at cycle boundaries (cooldown week), plus on-demand after cross-cutting changes.
- Source: DECISION-03, DECISION-10.
- **Mine the old `DOC_HEALTH_CHECK.md` for useful content** before writing the skill — the structure was good, only the paths were stale.

**T2.2 — Add a new section to PROCESS.md pointing at the skills**

- New § or expansion of §6 explicitly naming: `ecosystem-decomposition` (for decomposition work), `feature-development` (for execution), `wave-planning` (for wave tracking), `doc-health-check` (for doc hygiene).
- One paragraph each: when it fires, what it produces, where it lives.
- Source: DECISION-02.

**T2.3 — Document the "no project" design choice**

- Add a short section to PROCESS.md or ecosystem README explicitly stating that FringeIsland does not use a "project" concept, and why. Point to the four axes (product, wave, cycle, feature).
- Source: Cross-cutting discovery (project specification).
- **Low priority** — only matters if a future contributor tries to introduce the term.

---

### TIER 3 — Strategic reflection sessions

Each of these requires dedicated thinking time, not batched cleanup. Sequenced by dependency — later items benefit from earlier items being complete.

**T3.1 — Populate the Ferd wave file (`docs/planning/waves/ferd.md`)**

- Apply the `wave-spec.md` template.
- Theme: foundation. Features-in-scope: link to feature specs (which don't exist yet — this means creating stubs for each Ferd-scope capability). Wave completion criteria. End-to-end user journey verified.
- Dependency on T3.2: feature spec stubs need to exist before they can be linked. But creating stubs can be done in the same session.
- Source: Cross-cutting discovery (roadmaps + waves).
- **Scope: dedicated session, likely half a day to a full day.**

**T3.2 — Create Ferd-scope feature spec stubs from FERD-CAPABILITY-MAP.md**

- Walk through the 110 capabilities and create feature spec files at appropriate maturity levels. Many will be maturity 6-done (retroactive documentation) for already-shipped capabilities; others at 3-specified or 2-explored for in-scope but not-yet-built.
- Feature spec stubs don't need full content — frontmatter + Problem statement is enough to make them linkable from the wave file.
- Decide FERD-CAPABILITY-MAP.md's fate: absorb / supersede / archive.
- Source: Cross-cutting discovery, Goal B1 walk (no feature specs written yet).
- **Scope: large. Possibly multiple sessions. Highest priority in Tier 3.**

**T3.3 — Write Hub SPECIFICATION.md**

- Apply `product-specification.md` template.
- Covers: feature inventory (shipped/in-progress/planned), user roles & permissions, UI/UX principles, technical constraints, API dependencies.
- Source: DECISION-06, Goal B1 walk.
- **Scope: dedicated session. Blocked by T3.2 (needs feature specs to reference).**

**T3.4 — Write Hub ROADMAP.md**

- Apply `product-roadmap.md` template.
- NOW (current cycle) / NEXT (1–2 cycles) / LATER. Wave alignment table.
- Source: DECISION-06, Cross-cutting discovery.
- **Scope: dedicated session. Blocked by T3.2 (needs feature specs to reference).**

**T3.5 — Write `docs/ecosystem/ECOSYSTEM_ROADMAP.md`**

- NOW/NEXT/LATER at ecosystem scope. Organised by outcomes, not features. Shows how products + platform + studios contribute to the ecosystem vision across waves.
- Source: Cross-cutting discovery.
- **Scope: dedicated session. Benefits from T3.1, T3.3, T3.4 being complete.**

**T3.6 — Write `docs/platform/core/ROADMAP.md`**

- Platform infrastructure roadmap. NOW/NEXT/LATER for shared capabilities.
- Source: Cross-cutting discovery.
- **Scope: dedicated session. Lower priority than T3.3–T3.5 — matters most when platform work runs in parallel with product work.**

**T3.7 — Seed future wave files (`eid.md`, `hamn.md`, `heim.md`, `brim.md`, `urd.md`)**

- Each wave gets: theme paragraph, a few seed features-in-scope (placeholders are fine), wave completion criteria scaffolding.
- Source: Cross-cutting discovery.
- **Scope: quick per-file, but best done as one focused pass. Low priority — can wait until first Ferd cycle runs.**

---

### TIER 4 — Deferred with triggers

Captured for traceability, not scheduled. Each has an explicit trigger that activates the work.

**T4.1 — `docs/platform/DEPENDENCIES.md`** — trigger: Gimbal enters active scoping. Source: DECISION-07.

**T4.2 — Post-launch product feedback loops** — trigger: Hub launches. Source: DECISION-08.

**T4.3 — Ecosystem-wide code quality dashboards** — trigger: codebase or contributor count grows past what one person can hold. Source: DECISION-08.

**T4.4 — Create `prd.md` template** — **NO, this is not happening.** PRDs are not a separate artifact in Model A. Recorded here to explicitly close the item. Source: DECISION-01, DECISION-05.

---

### Recommended execution order

Pragmatic sequencing across tiers — not strict waterfall, but a sensible order:

1. **Session 1 (soon):** All of Tier 1 except T1.13 (batch all the cleanup). Plus T2.1 (create doc-health-check skill) and T2.2 (PROCESS.md section pointing at skills). T1.13 goes at the end of this session once T2.1 is complete.
2. **Session 2:** T3.2 (feature spec stubs from capability map) — biggest single piece of work, unblocks most of Tier 3.
3. **Session 3:** T3.1 (populate Ferd wave file) + T3.3 (Hub SPECIFICATION.md) + T3.4 (Hub ROADMAP.md). All depend on T3.2.
4. **Session 4:** T3.5 (ecosystem roadmap) + T3.6 (platform roadmap).
5. **Session 5 (optional, low priority):** T3.7 (seed future wave files) + T2.3 (document "no project" choice).
6. **Deferred:** Tier 4 items, activated by their triggers.

Sessions 2–4 can be rescheduled if priorities shift. Session 1 should happen before the first real cycle starts, because it cleans up contradictions that would otherwise cause friction.

---

## Session bridge / next steps

**For the next agent instance picking up this work.**

### What this session accomplished

A full review of the FringeIsland way of working across three goals: A (overarching process and cycle), B1 (vertical trace from vision to daily execution), B2 (continuous learning and quality). Methodology: walk each goal, identify real gaps, log discoveries, lock decisions, produce an action list.

Starting point: PROCESS.md (April 2026 rewrite) plus a suspicion that the four pre-restructure workflow files (BOOT_UP, CLOSE_DOWN, DOC_HEALTH_CHECK, WORKFLOW) were stale. Those four files were explicitly set aside at the start of the session and are not the subject of what follows.

### The headline finding

FringeIsland has two coherent, well-designed systems that don't yet know about each other:

1. **PROCESS.md** — the strategic machinery: maturity pipeline, cadence, DoR/DoD, tagging, meta-process.
2. **The three skills + ecosystem tree + templates** — the execution machinery: `ecosystem-decomposition`, `feature-development`, `wave-planning`, 15 templates, feature specs under owners.

PROCESS.md was still describing an older model (PRDs + separate user-story files at `prds/prd-{slug}.md`) that the rest of the system had already moved past. The actual working model is **Model A: feature specs with embedded stories in the ecosystem tree under each owner, carrying a feature from maturity 0 to 6 in a single file with YAML frontmatter tracking state.**

Locking Model A as canonical (DECISION-01) collapsed a cluster of discoveries across Goal A (missing PRD template, phantom `prds/` directory, orphaned user-story template, backlog-vs-ecosystem-tree contradiction) into a single rewrite task.

### Eleven decisions locked

See the "Decisions locked this session" section above for full reasoning. Brief list:

| # | Decision | Scope |
|---|---|---|
| 01 | Feature spec with embedded stories is canonical (Model A); Model B retired | Foundational |
| 02 | Skills are the execution layer; PROCESS.md references them but doesn't absorb them | Structural |
| 03 | Doc health is a skill (`doc-health-check`), not a workflow file or PROCESS.md section | Structural |
| 04 | Weekly Three Ls retros live in `docs/planning/retrospectives/weekly-YYYY-MM-DD.md` | Location |
| 05 | Consequences of DECISION-01 (cleanup bundle: delete user-story.md template, no prds/, PROCESS.md rewrites, etc.) | Cleanup |
| 06 | Hub SPECIFICATION.md and ROADMAP.md required but deferred to own session | Deferral |
| 07 | `DEPENDENCIES.md` deferred until Gimbal scoping starts (trigger recorded) | Deferral |
| 08 | Post-launch feedback + code quality dashboards out of scope for this B2 pass (triggers recorded) | Deferral |
| 09 | Quarterly process audit uses retrospective template at `retrospectives/audit-YYYY-Q#.md` | Location |
| 10 | Doc-health-check skill fires at cycle boundaries, on-demand after cross-cutting changes | Cadence |
| 11 | Icebox is YAML frontmatter (`parked: true` + `parked_reason`), not a separate file | Mechanism |

### Two cross-cutting discoveries

- **Roadmap layer is scaffolding without content.** Three-roadmap model is described (ecosystem, product, platform). Template is well-designed. Zero roadmap files exist. All six wave files contain only `_Content to be populated._`. `FERD-CAPABILITY-MAP.md` is currently doing triple duty. Roadmap work is reflection-heavy and needs dedicated sessions — it's a new tier in the action list.
- **"Project" is not a concept in FringeIsland.** The word is deliberately absent from PROCESS.md, templates, and skills. The mental model is Ecosystem → Products/Platform/Studios → Features → Tasks with Waves (thematic focus) and Cycles (betting periods) as orthogonal axes. Keep the absence explicit.

### The four-tier action list

**Tier 1 — Cleanup (13 items):** PROCESS.md rewrites (§1, §2, §6, Quick Reference, header, §3, §8, tech-debt line), template cleanup, README updates, stale workflow file deletion (sequenced last).

**Tier 2 — Structural additions (3 items):** Create `doc-health-check` skill, add skills-reference section to PROCESS.md, document the "no project" design choice.

**Tier 3 — Strategic reflection sessions (7 items):** Ferd wave file, Ferd feature spec stubs from capability map (biggest single piece — unblocks most of Tier 3), Hub SPECIFICATION.md, Hub ROADMAP.md, ecosystem roadmap, platform roadmap, seed future waves.

**Tier 4 — Deferred with triggers (4 items):** `DEPENDENCIES.md`, post-launch feedback, code quality dashboards, and the explicitly-closed `prd.md` template (`NO, not happening`).

### Recommended next session

**Session 1: execute all of Tier 1 except T1.13 + T2.1 + T2.2, finishing with T1.13.**

This is the highest-priority work because:
- Tier 1 cleanup removes the Model A / Model B contradictions currently in PROCESS.md.
- T2.1 creates the doc-health-check skill that T1.13 depends on (can't delete the stale workflow file until the skill replaces it).
- T2.2 makes the skills discoverable from PROCESS.md — without this, a newcomer reading PROCESS.md would still miss that the execution layer lives in `.claude/skills/`.

**Time estimate:** one focused session, probably 2–4 hours of actual work. Most edits are mechanical. The skill file creation (T2.1) and the PROCESS.md skills section (T2.2) are the thinking-heavier items within Session 1.

**After Session 1, the system is internally consistent.** Tier 3 can proceed at whatever pace strategic reflection allows.

### Open questions flagged but not decided

- **FERD-CAPABILITY-MAP.md's role under Model A** — absorb into `ferd.md`, move to `reference/`, or keep in place. My instinct (recorded in the Roadmaps discovery) is absorb; but it's a real call. Resolve during Session 2 (T3.2).
- **Maturity 0–1 feature-spec heaviness** — is a one-sentence raw idea genuinely a feature-spec file, or does it need a lighter container? Flagged but intentionally not addressed this session; separate concern.
- **Potential need for an intermediate grouping between wave and feature** — the research reports mention "epics" at this level. If the need arises, address explicitly (don't default to "project").
- **`DEFERRAL_PROTOCOL.md` and `PLANNING_PROTOCOL.md` fate** — still flagged as "under review" in `docs/planning/README.md`. T1.12 covers deciding keep / merge / delete. Decision not made this session.

### Critical context for the next agent

- **Model A is locked.** Do not reintroduce PRD + separate user-story files as a concept. DECISION-01 and DECISION-05 are binding.
- **Skills are the execution layer.** When writing process documentation, do not absorb execution mechanics into PROCESS.md. Reference the skill instead.
- **AGENTS.md rule:** When a search or lookup returns a negative result, cross-check with a direct listing before logging it as missing. This was added 2026-04-17 after a false-negative search result nearly caused a wrong discovery to be logged.
- **The ecosystem tree is the catalogue.** Features live under their owners (`docs/products/{name}/features/`, `docs/platform/core/features/`, `docs/platform/domain/features/`, `docs/studios/{name}/features/`). The backlog is work-in-motion (tasks), not a duplicate feature catalogue.
- **`docs/planning/backlog/tasks/` holds ephemeral TASK-*.md files.** They're deleted after the cycle retrospective. The retro is the permanent learning artifact.
- **Four workflow files in `docs/planning/workflows/` are stale.** They were set aside at the start of this session and will be deleted in Session 1 after the doc-health-check skill exists.

### Files touched this session

| File | Action |
|------|--------|
| `docs/planning/sessions/2026-04-17_-_WAY-OF-WORKING-REVIEW.md` | Created (this file) |
| `AGENTS.md` | Added "cross-check negative search results" rule under "Always do" |

No other files were modified. All action items are captured in this session file for execution in future sessions.

### Suggested opening prompt for the next session

> Continue the way-of-working refactor from the 2026-04-17 session. Read `docs/planning/sessions/2026-04-17_-_WAY-OF-WORKING-REVIEW.md` fully. Execute Tier 1 cleanup items T1.1 through T1.12, plus Tier 2 items T2.1 (create `doc-health-check` skill, mining the old `docs/planning/workflows/DOC_HEALTH_CHECK.md` for structural content) and T2.2 (add skills-reference section to PROCESS.md). Finish with T1.13 (delete the four stale workflow files). Work through items sequentially; pause after each for verification. Respect all 11 locked decisions — they are binding.
