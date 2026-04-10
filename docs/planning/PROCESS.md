# PROCESS — How Work Flows at FringeIsland

**Status:** Authoritative way of working
**Audience:** Anyone building, designing, deciding, or contributing
**Companion docs:** `../ecosystem/VISION.md` (the why) · `../templates/` (reusable shapes) · `../architecture/ARCHITECTURE_ANATOMY.md` (the what)

This document is the single canonical reference for how work moves from idea to shipped code at FringeIsland. Read it once, then return to it whenever you're not sure what to do next.

It is **descriptive of the current process**, not aspirational. When the process changes, this file changes with it (see Section 8).

---

## Section 1 — Work item lifecycle

Every piece of work — feature, bug, spike, decision — moves through the same maturity pipeline. An item enters at level 0 and is only built once it has reached level 4. Items that can't reach level 4 stay parked until they can.

### Visual flow

```
   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
   │ 0 RAW IDEA │ →  │ 1 CONCEPT  │ →  │ 2 EXPLORED │ →  │3 SPECIFIED │ →  │  4 READY   │
   └────────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘
       one              problem          research            user             DoR
     sentence           +  who           sketched           stories          met
                        benefits         approach           +  PRD

     ─── lives in backlog/discovery.md ───┤├── lives in backlog/product.md ───────┤
                                                                                  │
                                                                                  ▼
                                                                          ┌────────────┐    ┌────────────┐
                                                                          │ 5 IN CYCLE │ →  │   6 DONE   │
                                                                          └────────────┘    └────────────┘
                                                                            pulled            DoD
                                                                            into              met
                                                                            cycle
                                                                          ─── lives in cycles/cycle-current.md ───
```

### Maturity table

| Level | Name | Meaning | Where it lives | Who advances it |
|-------|------|---------|----------------|-----------------|
| 0 | Raw idea | One sentence — "wouldn't it be cool if..." | `backlog/discovery.md` | Anyone |
| 1 | Concept | Problem identified, who benefits, rough shape | `backlog/discovery.md` | Product owner |
| 2 | Explored | Research done, approach sketched, risks named | `backlog/discovery.md` → `backlog/product.md` | Product owner + research |
| 3 | Specified | User stories with acceptance criteria + PRD | `backlog/product.md` + `prds/prd-*.md` | Product owner |
| 4 | Ready | All questions answered, estimable, DoR met | `backlog/product.md` (tagged "ready") | Product owner confirms DoR |
| 5 | In cycle | Pulled into the active build cycle | `cycles/cycle-current.md` | Developer |
| 6 | Done | Implemented, tested, deployed, DoD met | `cycles/cycle-current.md` (marked done) | Developer confirms DoD |

**Movement is one-directional in normal operation.** Items only move backwards when something is wrong (e.g., a "Ready" item turns out to have an unanswered question and drops back to Level 3 until the question is resolved).

**Items at any maturity can be parked in `backlog/icebox.md`** when they're correct but not currently relevant. Icebox items are reviewed at cycle boundaries.

---

## Section 2 — Work item types

Every work item has a type. The type determines which template to use, which DoD checks apply, and what kind of artifact gets produced.

| Type | What it is | Template | Notes |
|------|-----------|----------|-------|
| **feature** | Functional requirement, user-facing | `../templates/prd.md` + `../templates/user-story.md` | Tag with product (`hub`/`gimbal`/etc.) |
| **nfr** | Non-functional / quality attribute (performance, security, a11y) | `../templates/prd.md` | Often produced by a vertical owner |
| **architectural** | Technical decision or infrastructure change | `../templates/adr.md` | Always produces an ADR |
| **spike** | Time-boxed research / exploration | `../templates/research-spike.md` | Output is findings + follow-up items |
| **bug** | Defect in existing functionality | (lightweight — backlog entry only, no PRD unless complex) | Bypasses maturity 0–2 if obvious |
| **tech-debt** | Known shortcut that needs addressing | `../templates/prd.md` (lightweight) | Allocate ~15-20% of cycle capacity |
| **process** | Change to the way of working itself | (this file gets updated) | See Section 8 |

---

## Section 3 — Cadence (Shaped Personal Kanban)

> ⚠️ **The cadence below is a recommended starting point, not law.**
> Run a few cycles, see what fights you, and adjust. It is far better to evolve a cadence that matches your real rhythm than to preserve one that you keep skipping. The shape (cycles + cooldown + WIP limit + daily/weekly/cycle reflection) matters more than the specific durations. **Update this section when your actual cadence changes** — don't run on a different rhythm than what's documented here.

### Recommended starting cadence

- **3-week build cycles** with a **1-week cooldown** between cycles
- **WIP limit:** 3 items in "doing" at any time (anything beyond gets blocked or returned)
- **Daily practice (~8 min):**
  - Morning: write a one-sentence intention for the day
  - End of day: log what was done, what was learned, what's blocked
- **Weekly practice (~30 min, Friday):**
  - Three Ls retrospective (Liked / Learned / Lacked)
  - Reprioritise the backlog
  - Adjust the current cycle plan if the week revealed new information
- **Cycle boundary (~2 hrs):**
  - Shape 1–2 bets for the next cycle (Shape Up style)
  - Review metrics (cycle time, throughput, deployment frequency)
  - Update the relevant roadmaps (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`, product roadmaps, `docs/platform/core/ROADMAP.md`)
  - Run retrospective for the cycle that just ended (template: `../templates/retrospective.md`)

### Waves as thematic focus

Waves (Ferd → Eid → Hamn → Heim → Brim → Urd) are **thematic focus buckets**, not sequential gates. They communicate what the ecosystem prioritises during a period — earlier waves are generally prioritised over later waves, but this is a guideline, not a rule.

Work from any wave can be in any maturity state (Concept, Study, Specify, Build) at any time. Waves overlap naturally: one winds down as the next builds up, and items from different waves may coexist in the same cycle. **WIP limits constrain total active work regardless of which wave items come from** — that's the real concurrency control, not wave boundaries.

Wave tags (`ferd`, `eid`, `hamn`, etc.) are used for filtering, prioritisation, and strategic overview — see Section 7. They are not permissions.

### Wave transition

When a wave's core work is substantially complete, it triggers:
- A **wave retrospective** (use `../templates/retrospective.md`, scope = entire wave, not just last cycle)
- An **ecosystem roadmap update** (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`) reflecting the shift in strategic focus

### Why this shape

- **Cycles + cooldown** — gives a forcing function to ship and a buffer to absorb spillover, fix bugs, and rest. Without cooldown, every cycle's overflow becomes the next cycle's starting debt.
- **WIP limit of 3** — concurrent work multiplies cognitive load nonlinearly. Three is the empirical sweet spot for solo and small-team work.
- **Daily intention + log** — replaces the "where was I?" startup tax with a 30-second read.
- **Weekly Three Ls** — the smallest retrospective that still produces signal. Not optional even when "nothing happened."
- **Cycle boundary** — the only time you allow yourself to zoom out. Without it, urgent work eats important work.

### What to adjust first

If something is wrong, this is the order to try changes in:
1. **Lower the WIP limit** before lengthening cycles. Most cadence pain is concurrency pain in disguise.
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
| Major feature reaches maturity 3 (Specified) | PRD | `../templates/prd.md` | `prds/prd-{slug}.md` |
| Significant architectural decision is taken | ADR | `../templates/adr.md` | `../architecture/decisions/NNNN-{title}.md` |
| Planning / design session with Claude | Session bridge | `../templates/session-bridge.md` | `sessions/YYYY-MM-DD-{topic}.md` |
| Research needed before specifying | Research spike | `../templates/research-spike.md` | `../research/{topic}.md` |
| Cycle starts | Cycle plan | `../templates/cycle-plan.md` | `cycles/cycle-current.md` |
| Cycle ends | Retrospective | `../templates/retrospective.md` | `cycles/retro-YYYY-MM-DD.md` |
| Wave completes (last Build item Done) | Wave retrospective + ecosystem roadmap update | `../templates/retrospective.md` (wave-scoped) | `cycles/retro-wave-{name}.md` + edit `../ecosystem/ECOSYSTEM_ROADMAP.md` |
| Cross-cutting vertical concern needs specifying | Vertical spec | `../templates/vertical-spec.md` | `../verticals/{name}.md` |
| Ecosystem vision changes | Update VISION.md | (no template — constitutional) | `../ecosystem/VISION.md` |

If your trigger isn't in this table, it's either too small for a document (just put it in the backlog) or it's a new kind of work that should be added to this table.

---

## Section 7 — Backlog tagging

Every backlog item carries four tags. Without tags, prioritisation across the ecosystem is impossible.

| Tag | Values |
|-----|--------|
| **Product** | `hub` · `gimbal` · `game` · `journey-studio` · `universe-studio` · `arc-studio` · `platform-core` · `platform-domain` · `design-system` |
| **Type** | `feature` · `nfr` · `architectural` · `spike` · `bug` · `tech-debt` · `process` |
| **Maturity** | `0-raw` · `1-concept` · `2-explored` · `3-specified` · `4-ready` |
| **Domain service** *(if applicable)* | `world-model` · `narrative` · `experience` · `content` · `communication` · `discovery` · `intelligence` · `extension` |
| **Wave** *(optional)* | `ferd` · `eid` · `hamn` · `heim` · `brim` · `urd` — separate from and in addition to the product/studio/platform tag |

> **Gimbal platform sub-tags:** For platform-specific work on The Gimbal, use `gimbal:ios` or `gimbal:android` in the Product tag. For work that applies to both platforms, use `gimbal` alone.

### Tag format

In `backlog/discovery.md` and `backlog/product.md`, write tags as a single line beneath the item title:

```
## Add group polls
**Tags:** product:hub · type:feature · maturity:2-explored · domain-service:communication

[item description...]
```

Tags are required. An untagged item is invisible — it cannot be prioritised, filtered, or assigned to a cycle.

---

## Section 8 — How this process evolves

The process is not sacred. It exists to serve the work, not the other way around. When the process gets in the way, the process changes.

### Rules for changing the process

1. **Process changes are work items** — type `process`. They go through the same maturity pipeline.
2. **PROCESS.md is versioned alongside code** — every change is a normal git commit with a clear "why."
3. **Quarterly process audit** — once per quarter, ask:
   - What did I skip? (and why — was the rule wrong, or was I wrong?)
   - What's missing? (something we did informally that should be codified)
   - What can be automated? (a checklist that became a script, a template that became a generator)
4. **The process must survive continuous refinement** — adding structure should never erase existing tracking. If a new rule makes an old artifact obsolete, archive the old artifact rather than deleting it.
5. **No hidden process** — if you're following an unwritten rule, write it down here.

### What never changes

- The maturity pipeline (Sections 1–2) — items always move 0 → 4 → 6
- The DoR/DoD shape (Sections 4–5) — checklists may grow or shrink, but every item passes both
- Tag categories (Section 7) — tag values may evolve, but every item carries tags

Everything else — cadence, durations, retrospective format, document templates — is open to revision when experience demands it.

---

## Quick reference

- **Where do I put a new idea?** `backlog/discovery.md`, with tags
- **Where do I write a feature spec?** `prds/prd-{slug}.md`, using `../templates/prd.md`
- **Where do I record a decision?** `../architecture/decisions/NNNN-{title}.md`, using `../templates/adr.md`
- **Where do I find what I'm working on this cycle?** `cycles/cycle-current.md`
- **Where do I park something I don't want to forget but can't act on?** `backlog/icebox.md`
- **Where do I document a session with Claude?** `sessions/YYYY-MM-DD-{topic}.md`
- **What's the way of working?** This file.

---

**Last updated:** April 2026 — Phase 2 of the doc restructure. See `../../CLAUDE.md` for restructure phase status.
