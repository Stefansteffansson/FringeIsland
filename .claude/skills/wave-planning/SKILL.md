---
name: wave-planning
description: >
  Manages FringeIsland wave scope, tracks feature completion across the ecosystem,
  and verifies wave-level Definition of Done. Use this skill whenever someone asks to:
  plan a wave, check wave progress, determine if a wave is complete, see what's left
  in a wave, review wave status, define wave scope, update wave completion criteria,
  or generate a wave status report. Also use when the user mentions a wave name
  (ferd, eid, hamn, heim, brim, urd) in a planning context, or asks "what's left",
  "are we done with", "wave status", or "wave progress".
---

# Wave Planning

This skill manages wave-level planning, progress tracking, and completion verification in the FringeIsland ecosystem.

## What a wave is (and isn't)

A wave is a **strategic focus period** — a thematic bucket that defines what the ecosystem prioritises. Waves are NOT containers that own features. They are planning instruments that REFERENCE features across multiple products, services, and studios.

- Wave files live in: `docs/planning/waves/{name}.md` (planning tree)
- Features live in: `docs/products/*/features/`, `docs/platform/*/features/`, `docs/studios/*/features/` (ecosystem tree)
- A wave file links to features. Features tag which wave they belong to. But the product/service/studio owns the feature, not the wave.

## The six waves

| Wave | Name | Meaning |
|------|------|---------|
| 1 | Ferd | Voyage / departure — foundation |
| 2 | Eid | Narrow passage — design tools + narrative |
| 3 | Hamn | Harbour — mobile + polish |
| 4 | Heim | Home — community + world |
| 5 | Brim | Horizon — discovery + growth |
| 6 | Urd | The deep well — AI + depth |

Waves are thematic focus buckets, NOT sequential gates. Work from any wave can be in any maturity state at any time. Earlier waves are generally prioritised, but this is guidance, not a rule.

## Workflow: Define wave scope

### Step 1: Load context

1. `docs/planning/waves/{wave}.md` — current wave file
2. `docs/ecosystem/VISION.md` — ecosystem vision (what the wave serves)
3. `docs/ecosystem/ECOSYSTEM_ROADMAP.md` — strategic priorities
4. Feature indexes across relevant products/services — scan `features/README.md` files

### Step 2: Identify features in scope

For each product, service, and studio, determine which features are relevant to this wave's theme. A feature belongs to a wave if:

- It directly supports the wave's thematic focus
- It is a prerequisite for other wave features
- It addresses a gap identified in a previous wave's retrospective

List each feature with its current maturity level and owner:

```markdown
## Features in scope

### Products
- [ ] [FEAT-H0NN: {feature title}](link-to-feature-spec) — Hub — maturity: 6-done
- [ ] [FEAT-H0NN: {feature title}](link-to-feature-spec) — Hub — maturity: 4-ready

### Platform
- [ ] [FEAT-PC0NN: {feature title}](link-to-feature-spec) — Core — maturity: 3-specified
```

### Step 3: Define completion criteria

Every wave needs a Definition of Done that goes beyond individual features. Use the template at `docs/templates/wave-spec.md`.

Wave DoD covers four areas:

**Feature completeness:**
- All listed features at maturity 6-done
- End-to-end user journey verified (describe the critical path)

**Quality gates:**
- All tests pass (unit, integration, e2e)
- No critical/high security vulnerabilities
- RLS policies on all new tables

**Documentation:**
- ADRs written for all architectural decisions made during wave
- Platform API contracts documented
- Product specifications updated

**Retrospective:**
- Wave retrospective completed
- Ecosystem roadmap updated

## Workflow: Track wave progress

### Step 1: Scan feature maturity

For each feature listed in the wave file, check its current maturity by reading the YAML frontmatter in its feature spec.

### Step 2: Generate status report

```markdown
## Wave progress: Ferd

**Overall:** 8/12 features done (67%)

| Status | Count | Features |
|--------|-------|----------|
| 6-done | 8 | H001, H002, H003, H004, P001, P002, P003, D001 |
| 5-in-cycle | 2 | H005, P004 |
| 4-ready | 1 | H006 |
| 3-specified | 1 | D002 |

**Blocked:** None
**At risk:** H006 (still at maturity 4, not yet in cycle)
```

### Step 3: Check completion criteria

Walk through each line of the wave DoD checklist. For items that can be verified by scanning files (feature maturity, test results, documentation existence), do so. For items requiring human judgment (quality assessment, stakeholder alignment), flag them for review.

## Workflow: Complete a wave

When all features reach maturity 6-done AND all DoD criteria are met:

1. Update wave status to `completed` in the wave file
2. Create a wave retrospective: `docs/planning/retrospectives/retro-wave-{name}.md`
3. Update `docs/ecosystem/ECOSYSTEM_ROADMAP.md` to reflect the shift in strategic focus
4. Identify any incomplete items that should carry over to the next wave
5. Clean up: ensure all tasks from this wave have been deleted (they should have been deleted after cycle retros, but verify)
6. **Repoint the front door.** A wave close is a cycle close too: `docs/planning/cycles/cycle-current.md` must name what follows (the next wave's first cycle, or "next: …") — the unit gate `hub/tests/unit/platform/cycle-current-front-door.test.ts` goes red on a closed plan until it does (PROCESS.md §3; Audit V R-14, 2026-09-05).

## Boundaries

### Always do
- Reference features by their full path in the ecosystem tree
- Keep the wave file as a curated list of links, not a copy of feature content
- Track maturity levels accurately — don't inflate
- Include cross-product features (a wave typically spans multiple owners)

### Ask first
- Adding features to a wave that are below maturity 2 (they may not be ready for wave commitment)
- Removing features from a wave scope (this is a strategic decision)
- Declaring a wave complete (human must verify DoD)

### Never do
- Move feature specs into the wave file — features belong to their owner
- Create tasks directly from a wave file — tasks come from feature specs
- Skip the wave retrospective — it's the learning artifact for the entire period
