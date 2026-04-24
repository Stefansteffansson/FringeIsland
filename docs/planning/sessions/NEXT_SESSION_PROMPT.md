We are continuing FringeIsland development. The last session landed a substantial
refactor of the ecosystem-decomposition skill, separating the vertical decomposition
axis from horizontal wave-planning. This session continues strictly on the vertical
axis.

## Read first (in this order)

1. **`docs/planning/sessions/2026-04-22_-_DECOMPOSITION-SKILL-REFACTOR.md`** — session
   bridge, primary orientation artifact. Read this first.
2. **`.claude/skills/ecosystem-decomposition/SKILL.md`** — the rewritten skill. This
   is the canonical reference for all decomposition work going forward.
3. **`docs/ecosystem/how-we-work/gaps.md`** — 21 flagged gaps, priority-ordered.
   G-19 through G-22 were added this session.
4. **`docs/planning/PROCESS.md`** §6 and §6.5 — the axis-separation wording and the
   pointer to the skill's per-level source map.

## Repo state

All work from the 2026-04-22 session is committed. Start with a clean working tree.

If `git status` shows uncommitted changes you didn't make, stop and ask before doing
anything.

## Recommended next-in-sequence work (strictly vertical axis)

**Commit 3: template restructure.** The session identified that
`docs/templates/product-specification.md` and `docs/templates/domain-service-spec.md`
need explicit section boundaries for L2, L3, and L4 authorship (per the locked
"SPECIFICATION.md ownership is shared" decision). This is scoped, small, and required
by any future L3 run on any entity. Load the ecosystem-decomposition skill before
starting.

**Companion work — L2 compliance audit.** For every named entity (all products, four
Platform Core tiers, seven domain services, three studios, design system, five
verticals), check which of DESCRIPTION.md / SPECIFICATION.md / ROADMAP.md exist and
in what state. This is a pure L2-state check against the current repo. Useful context
for any subsequent decomposition work.

## Alternative vertical-axis work items

- **G-21** — feature-inventory summary in SPECIFICATION.md has no maintenance
  discipline. Operationalize it in the `feature-development` skill and
  `doc-health-check`.
- **G-22** — legacy pre-refactor FEAT-*.md files need the absorb-and-delete
  discipline made an explicit substep in the skill's L3 section, plus a
  `doc-health-check` verification.
- **G-03** — populate the five vertical specs beyond their current scaffold state.
  Every L3 run currently surfaces these as soft-pause remarks; populating them
  would close the feedback loop.

## Out of scope this session

Do NOT work on horizontal-axis items. The following are explicitly deferred and
should not be picked up without a separate explicit decision:

- Wave scoping, wave progress, wave DoD, any wave-specific capability mapping
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

If any vertical-axis work surfaces a question that could only be answered by a
horizontal-axis decision, pause and flag it rather than reaching for a
horizontal-axis artifact to resolve it.

## Key constraints

- Architecture-first, deliberate, one question at a time. Explicit "locked"
  confirmations before moving forward on substantive decisions.
- Dry-run-review-apply pattern for substantive edits: use `fringeisland:edit_file`
  with `dryRun: true` first, show the diff, wait for approval.
- The 2026-04-22 session caught four horizontal-axis contaminations in the
  vertical-axis work. The pattern: reaching backward to existing artifacts
  (existing features, existing code, existing wave scopes) instead of deriving
  fresh from upstream authority. If you're about to read or reference something
  from below the level you're writing at, stop. If you're about to reach across
  to a horizontal-axis artifact, stop harder.

---

*This prompt supersedes all previous versions. Last rewritten 2026-04-22 during session close.*