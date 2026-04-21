We are continuing FringeIsland development. The last session produced the `docs/ecosystem/how-we-work/` documentation set and established the Gap Review ritual in PROCESS.md §3.

## Read first (in this order)

1. **`docs/planning/sessions/2026-04-19_-_HOW-WE-WORK-SESSION.md`** — session bridge, primary orientation artifact. Read this first.
2. **`docs/ecosystem/how-we-work/README.md`** and skim the five chapters — to internalize the development system Stefan uses.
3. **`docs/ecosystem/how-we-work/gaps.md`** — 17 flagged gaps, priority-ordered. Now a named input to the cycle-boundary betting ritual.
4. **`docs/planning/PROCESS.md`** §1, §3 — the canonical way of working. §3 was materially updated 2026-04-19 (Gap Review ritual added; WIP framing aligned to review-stage throughout).

## Repo state

All work from the 2026-04-19 session is committed. Start the session with a clean working tree.

If `git status` shows uncommitted changes you didn't make, stop and ask Stefan before doing anything — someone else may be working in the repo or the commit didn't land cleanly.

## Recommended next-in-sequence work

**Ferd capability map (Level 3 of the `ecosystem-decomposition` skill's five-level cascade).** This has been queued since the 2026-04-10 session and was deferred twice — first for the way-of-working refactor, then for the how-we-work documentation detour. It is the natural next substantive work item.

The capability map decomposes the Ferd wave's locked scope (group-in-group, self-service exit, audit log viewer, content moderation, GDPR consent store, data export, feature flags, Journal, forums, DM, journey progress/pause/leave/resume/completion) into named capabilities with dependency chains and owner routing. Output lands at `docs/planning/waves/FERD-CAPABILITY-MAP.md`.

Load the `wave-planning` and `ecosystem-decomposition` skills before starting. Don't load all four skills — progressive context loading per agent-routing chapter of how-we-work.

**Natural companion work:** G-07 Ferd DoD population. The capability map answers "what's in Ferd"; the DoD answers "when is Ferd done." They want to be written in sequence, probably the capability map first so the DoD has something concrete to measure completeness against.

## Alternative work items (if Ferd capability map isn't the right pull)

- **G-03 (high priority)** — populate §3–§6 of the five vertical specs. A full cycle's worth of work. Would address the compounding risk that features currently fill in Vertical Impact sections against stubs.
- **G-05, G-06 (high priority)** — review queue operationalization + multi-agent task locking. Both related to scaling the execution axis toward 50+ contributors.
- **G-12 (high priority)** — Given/When/Then to test translation. Extends `feature-development` skill with the scenarios-to-tests mechanic.

## Key constraints

- Architecture-first, deliberate, one question at a time. Stefan prefers explicit "locked" confirmations before moving forward on substantive decisions.
- Dry-run-review-apply pattern for substantive edits: use `fringeisland:edit_file` with `dryRun: true` first, show the diff, wait for approval.
- Stefan drops binaries (docx, images) into the repo manually after download; MCP can't write binaries.
- The `how-we-work/` documentation set is a living artifact. When its state changes, update all five surfaces: chapter markdown, gaps.md, SVG if the change is structural, index.html, docx (rebuild if needed). The Gap Review ritual in PROCESS.md §3 is the cycle-boundary mechanism that keeps the register honest.

## Cadence as of this file

Current cadence per PROCESS.md §3: 3-week build cycles + 1-week cooldown, WIP 3 at review, daily intention+log, weekly Three Ls, cycle boundary with betting table + Gap Review + doc-health-check + retrospective. Cadence is explicitly mutable — if it stops fitting reality, PROCESS.md §3 is the thing to update.

---

*This prompt supersedes all previous versions. Last rewritten 2026-04-19 during session close.*
