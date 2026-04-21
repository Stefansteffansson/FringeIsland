# Session bridge — How we work documentation set

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-19
**Session type:** Planning · architecture · design
**Status:** Closed (with three natural next-in-sequence candidates identified)
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)

---

## Session summary

The session was originally scoped as Ferd feature-spec stubs (T3.2 on the pre-session queue) but was redirected early into a full end-to-end overview of how FringeIsland is actually developed. The rationale Stefan gave: before specifying any Ferd features, it would be valuable to have a self-orientation document that describes the whole development system — both to help spot gaps and to serve as future onboarding material for the 50+ contributors the architecture is designed for.

The session produced the `docs/ecosystem/how-we-work/` documentation set: five chapter markdown files organised around four axes (decomposition, cadence, execution, agent routing), five standalone SVG diagrams, a gaps register, a tabbed interactive HTML view, and a shareable DOCX. It surfaced eighteen known gaps across the system, then closed one (G-08) and codified the mechanism by which the other seventeen get worked off.

The arc landed at: the how-we-work set is a durable artifact, the gaps register is hooked into PROCESS.md §3's cycle-boundary ritual, and the system is ready for the originally-queued Ferd capability map work (Level 3 of the ecosystem-decomposition cascade).

## What was decided

- **Audience for how-we-work is Stefan (primary), future contributors (secondary).** *Locked.* Drove the decision to surface gaps honestly rather than write aspirationally.
- **Format = multi-format output: standalone SVGs + chapter markdown + tabbed HTML + DOCX.** *Locked.* Tabbed HTML replaces an earlier long-scroll version per Stefan's mid-session preference.
- **Four axes, not a list of topics.** Decomposition (vertical), Cadence (horizontal), Execution (work-level, split into kanban + build loop), Agent routing (entry). Verticals treated as cross-cut obligations, not a separate axis. *Locked.*
- **The ecosystem tree is the pre-5 backlog.** Pre-5 visibility is grep-based today; dashboarded later. *Locked for solo phase.*
- **Maturity 5 spans Doing + Review; 6 aligns with Done + Implementation notes filled.** *Locked.* Documented in chapter 3 and shown on SVG 3 as brackets under the kanban row.
- **Gap-review ritual hooked into PROCESS.md §3 cycle boundary.** Anchor 1 of three proposed anchors; anchors 2 (doc-health-check integration) and 3 (`type:process` template) deferred until anchor 1 shows signal over 2 cycles. *Locked.*
- **G-18 added: Research pathway under-specified.** *Locked.* Surfaced when Stefan asked about bucketing / research / backlog mechanics.
- **G-08 closed via the gap-review ritual's own mechanism.** First exercise of the cycle-boundary housekeeping loop. Worked end-to-end. *Closed.*

## What was produced

**New files under `docs/ecosystem/how-we-work/`:**
- `README.md` — landing page
- `01-decomposition.md` through `05-agent-routing.md` — five chapter files
- `gaps.md` — consolidated register (now 17 gaps after closing G-08)
- `index.html` — tabbed interactive version (7 tabs, click-to-expand gap cards, keyboard nav, URL hash support, light/dark-mode responsive)
- `assets/01-decomposition-cascade.svg` through `assets/05-agent-routing.svg` — five diagrams, light/dark-mode responsive via CSS media queries
- `FringeIsland-how-we-work.docx` — shareable version (Stefan drops the binary into the folder manually after download since binaries can't be created via MCP)

**Edits to existing files:**
- `docs/planning/PROCESS.md` §3 — added Gap review bullet under Tech-debt/NFR/process allocation, making `gaps.md` a named input to the betting session
- `docs/planning/PROCESS.md` §3 — WIP limit corrected from "doing" to "review" (closes G-08)
- `docs/planning/PROCESS.md` footer — bumped to 2026-04-19, provenance of 2026-04-17 refactor preserved
- `docs/ecosystem/how-we-work/02-cadence-and-waves.md` — removed G-08 drift callout (now resolved)
- `docs/ecosystem/how-we-work/assets/02-cadence-and-waves.svg` — removed "PROCESS.md §3 still says WIP at doing — drift" from the gaps strip
- `docs/ecosystem/how-we-work/assets/03-kanban-and-refinement.svg` — iteratively revised: maturity 5/6 annotations added, then overlap bugs fixed when visual inspection caught them

## What is still open

Seventeen gaps remain in the register. The ones most likely to bite next:

- **G-03 (high): Vertical specs are scaffolds.** Every feature spec is filling in Vertical Impact sections against stubs. When the stubs get populated, shipped features will be out of compliance with the newly-explicit rules.
- **G-05 (high): Review queue not operationalized.** `status: review` exists in task frontmatter; no protocol describes reviewer assignment or handoff. WIP limit has nothing to enforce against.
- **G-06 (high): Multi-agent task locking.** Two agents can pick up the same task at scale. `assigned_to` is the obvious lock primitive; no atomicity rule.
- **G-12 (high): Given/When/Then to test translation.** Feature specs require G/W/T scenarios; Jest + Playwright + pgTAP exist; no document describes the translation.

Non-gap open items:

- Ferd capability map — the Level 3 work that was queued before this session's redirect; the natural next substantive work item
- G-07 Ferd DoD population — companion to the capability map
- Whether anchors 2 (doc-health-check integration) and 3 (`type:process` template) of the gap-review mechanism should be built, based on whether anchor 1 bites over the next 2 cycles

## Tensions and contradictions

- **G-11 remains: TDD vs risk-based testing.** Root CLAUDE.md mandates TDD; the research report permits risk-based. Small in practice but the inconsistency is real. Probably worth closing with an ADR during a cooldown week.
- **Pre-5 "backlog" vs `docs/planning/backlog/`.** PROCESS.md §1 says "the ecosystem tree is the catalogue, not the backlog" while functionally the ecosystem tree IS the backlog for everything pre-5. Resolved in conversation (the catalogue statement means "not a separate backlog file", not "not a backlog in any sense") but the wording could still mislead a first-time reader.
- **The gap-review ritual promotes a session-artifact file (`how-we-work/gaps.md`) to first-class canonical status.** This was deliberate but creates a small dependency: if how-we-work ever moves, PROCESS.md §3 has to move with it. The `doc-health-check` skill should eventually verify this link.

## Non-obvious insights

- **Maturity and kanban columns are orthogonal**, not the same ladder. Maturity is a flag on the feature spec (one per feature); kanban column is the status on task files (many per feature). A feature is at 5-in-cycle the moment any task enters Doing; it reaches 6-done only when all tasks are Done AND Implementation notes are written. Not previously stated explicitly anywhere in the documentation; surfaced when Stefan asked "what happens in step 5 and 6?"
- **Three research mechanisms exist but aren't unified.** Maturity-2-explored, `type: spike` with template, and `docs/research/` for long-form reports. Stefan's question about bucketing / research / backlog surfaced the missing connective tissue: when does a question warrant spike vs report? How do findings flow back into affected specs? G-18.
- **The gap register can't live in a vacuum.** A list of gaps that has no home in the workflow becomes a graveyard of good intentions. The fix was specifically NOT to invent new ceremony (no dedicated "gap review meeting"), but to hook the register into an existing ritual (cycle-boundary betting) that already attracts attention. Anchor 1 leverages the existing `15-20% tech-debt allocation`; anchors 2 and 3 deferred until anchor 1 proves it bites.
- **Seven of the seventeen gaps are middle-layer gaps.** Strong bookends (vision at top, DoD at bottom), weak middle (refinement rituals, board mechanics, review handoffs, test translation, build hygiene). The pattern reflects heavy investment in strategic scaffolding and lighter investment in tactical scaffolding — acceptable while tacit knowledge fills in, blocking at 50-contributor scale.
- **Closing G-08 exercised the new ritual end-to-end in its first use.** Four housekeeping steps: fix the actual thing → remove from register → update header count → remove chapter callout. Also caught a fifth step not originally named: update SVG text. Worth adding this fifth step to the PROCESS.md §3 Gap review bullet if the SVG-text case recurs.

## For the next session

**Read order:**
1. This bridge
2. `docs/ecosystem/how-we-work/README.md` and the five chapters — to internalize the system
3. `docs/ecosystem/how-we-work/gaps.md` — to see what's flagged
4. `docs/planning/PROCESS.md` §3 — to see the cycle-boundary ritual the gaps register now hooks into

**Locked decisions as of this session close** (do not re-litigate):
- Four-axis structure of how-we-work
- Maturity-and-kanban orthogonality framing
- The gap-review ritual hook in PROCESS.md §3
- Anchor 1 only; anchors 2 and 3 deferred

**Open decisions available to revisit:**
- Anything in the 17 remaining gaps
- Whether to escalate any medium-priority gap to high after subsequent experience

**Current focus:** Ready to pick up either Ferd capability map (the Level 3 work originally queued before this session) or any high-priority gap. Recommended next substantive work = Ferd capability map, because it was the queued item and because doing it will test whether G-03 (vertical specs as scaffolds) bites as hard as predicted.

**Explicit user instructions that carried through this session:**
- Architecture-first, deliberate, one question at a time
- Dry-run-review-apply pattern for substantive edits (used throughout this session via `fringeisland:edit_file` with `dryRun: true`)
- Stefan drops binaries into the repo manually after download (MCP can't write them)

---

## Open items

### Near-term
- [ ] Ferd capability map (Level 3 of ecosystem-decomposition cascade) — the originally queued next-in-sequence work
- [ ] G-07 Ferd DoD population — natural companion to the capability map

### Deferred
- [ ] Evaluate anchor 2 (doc-health-check integration of gap-register consistency) after 2 cycles of anchor-1 experience
- [ ] Evaluate anchor 3 (`type: process` template) if a gap arises that's too large for a cooldown slot
- [ ] Any of the 17 remaining gaps (see `docs/ecosystem/how-we-work/gaps.md` for the full priority-ordered register)
