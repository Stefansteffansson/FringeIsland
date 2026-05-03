# Session Bridge — Reader-tours-as-methodology promotion

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md`
**Date:** 2026-05-03 (second bridge of the day; prior is `2026-05-03_01_-_CASCADE-PLAN-CLOSE-OUT.md`)
**Session type:** Cross-cutting methodology decision + first-instance execution. Vertical-axis work spanning the `ecosystem-decomposition` skill, PROCESS.md §6, the gaps register, and the Hub entity tree.

**Chronological predecessor:** `2026-05-03_01_-_CASCADE-PLAN-CLOSE-OUT.md` (committed `d32afbe`).
**Substantive predecessor:** `2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md` — closing bridge for B.2; its omission of the narrative files is what produced the disposition gap this session resolved.

---

## Session premise vs actual work — frame correction

The opening prompt framed this session as **B.2 resumption** — explicit claim that "authoring of Hub Specification §L3 was deferred at the seed bridge to 'next B.2 session' — this is that session." Reconciliation against git state in the plan-back showed the premise was stale:

- §L3 was authored in **commit `6d57b8d`** ("author §L3 capability inventory, 105 capabilities, eight areas") on 2026-04-30, with all locked B.2 decisions applied (eight-area partition, Founding-question + Dimension columns, forward-commitment markers, G-29 routing).
- B.2 closed in **commit `5ab32dd`** on 2026-04-30 with closing bridge `2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md`.
- The cascade-plan arc (May 1–3, six commits) ran after B.2 closed, not before it.

The actually-outstanding work was the disposition of four uncommitted Hub narrative files (`HUB-L3-NARRATIVE.md/.docx`, `HUB-L3-NARRATIVE-TECHNICAL.md/.docx`) which had no provenance in any committed bridge — Stefan had authored them post-B.2 to make the architecture human-legible, but they were never formalised. Session pivoted from "author §L3" to "decide what to do with these orphaned narratives."

---

## Decision locked: reader tours as post-§L3 maturity gate

Two reader tours per entity, ecosystem-wide:

- **HUMAN.md** — admits an uncredentialed audience (no contributor prerequisite).
- **TECHNICAL.md** — admits a contributor prerequisite.
- Live in `{entity}/tours/` at the entity root.
- Markdown is source of truth; `.docx` exports are distribution artefacts and are not committed.
- DESCRIPTION.md remains a derivation source — tours are a separate exposition artefact, not folded into DESCRIPTION.
- Internal structure (chapter organisation, scorecards, heatmaps, reading guides) is determined per-entity based on legibility needs. Hub is n=1.

---

## Commits landed

- **`e3b71a0` — methodology registration.**
  - `ecosystem-decomposition` skill: new "Reader tours — post-§L3 maturity gate" subsection at end of Level 3, naming load-bearing constraints only and holding internal shape loose pending n=2.
  - `PROCESS.md` §6: new row in the trigger → artifact table, plus follow-on paragraph naming the gate.
  - `gaps.md`: G-32 registered under "Decomposition cascade — chapter 01" with methodology connection to n=2 tour-shape convergence as a separate paragraph.

- **`7c14223` — Hub disposition (first-instance execution).**
  - `docs/products/hub/tours/HUMAN.md` and `tours/TECHNICAL.md` placed in repo (208 + 586 lines). Source files were untracked drafts; `mv` not `git mv` (no prior history to preserve).
  - In-file title edit: HUMAN.md "A Reader's Tour" → "A Human's Tour" (frontmatter + h1, both occurrences). TECHNICAL.md unchanged.
  - Two `.docx` exports in `docs/products/hub/` deleted from working tree.
  - `.gitignore`: scoped patterns for `docs/{products,platform,studios,design-system,verticals}/**/*.docx`. `docs/research/` and `docs/ecosystem/how-we-work/` exempted (intentional `.docx` homes per find audit and G-25).
  - `docs/products/README.md`: tours/ registered in Hub structure tree.
  - `docs/products/hub/README.md`: tours/ entry added; SPECIFICATION line drift-fixed (was "L2 sections populated; L3/L4 sections pending"; now "L2 and L3 sections populated; L4 section pending").
  - `docs/products/hub/CLAUDE.md` "Where to go next": Reader-tours bullet added immediately after Identity bullet.

---

## First-instance execution complete: Hub

`docs/products/hub/tours/HUMAN.md` and `TECHNICAL.md` now live in repo. The narratives Stefan authored post-B.2 to make the Hub's L3 shape legible to non-technical readers (HUMAN) and contributor-scanners (TECHNICAL) are formalised as the canonical reader-tour pair. Their internal structure (chapter-per-area, plus epilogue scorecard/heatmap in TECHNICAL) is the Hub's instance — not a template-by-precedent.

---

## G-32 registered

**Backfill obligation for entities with shipped §L3 lacking reader tours.** Hub: resolved in same-session execution. Forward marker for remaining entities — when the second entity ships §L3, this gap surfaces the backfill obligation; if a future entity ships §L3 without producing tours, this gap surfaces the regression.

Methodology connection: the second-entity instance that triggers G-32's first non-Hub resolution is also the n=2 instance for tour internal-shape convergence. Both questions resolve together when this gap fires for the second time.

---

## Methodology framing held loose

Hub is n=1. Internal-shape convergence (or non-convergence) of the tour pattern is determined by the second instance, not by promoting Hub's instance to a template. Same n=2 discipline that gated the stress-test pass's promotion (B.2 → cascade-plan Session 4 second instance) elsewhere in the methodology canon.

Likely n=2 surfaces: Platform's first §L3 landing (Platform Core area or a Domain Service). **Open question for n=2:** whether chapter-per-area organisation transfers to Platform, given Platform reads as service contracts rather than member-facing rooms. The answer is empirical — Platform's first tour-pair will tell us.

---

## Bouncing-partner cycle behaviour

Surface-draft fired on five items before mechanical apply: skill diff, PROCESS.md diff, G-32 wording, .gitignore scoping (with find audit surfaced), README cascade. A sixth item — `hub/CLAUDE.md` "Where to go next" inclusion — was raised mid-bounce as a discovered fourth target during draft surfacing and accepted with a wording refinement.

Mechanical follow-ons (file moves, .docx strip, in-file title edit) went apply-then-commit per locked discipline.

Tripwire stayed at 1 throughout: single first-instance candidate (reader-tours-as-methodology) promoted in-session. No secondary candidates surfaced, no candidate-ledger split needed.

---

## Working-pattern observations

Two session-frame errors on Claude.ai's side were caught by Claude Code's verification-first behaviour:

**Error 1 — Opening-prompt premise stale.** Claude.ai asserted in the opening prompt that B.2 deferred §L3 authoring to this session. Actual state: §L3 authored in `6d57b8d`, B.2 closed in `5ab32dd`, both prior to the cascade-plan arc. The prompt was constructed from a model of the session frame that didn't account for B.2's close. Caught at plan-back (git log + SPECIFICATION.md inspection) before any writing happened.

**Error 2 — Mid-session false-positive on edits-applied.** After four Edit calls were rejected at the permission gate (errors visible in CC's tool results), Claude.ai asserted (in a message Stefan paste-forwarded to CC) "Commit A edits applied. Verify and commit." This assertion projected past a permission gate that hadn't actually closed. Caught by `git status` + `git diff --stat` returning empty for the three target files; CC stopped and surfaced the discrepancy rather than committing nothing.

**Fix:** at session-open and after every permission gate or tool-result cluster, Claude.ai produces an explicit state-read before acting. State-reads consist of: `git log --oneline` (recent commits), `git status` (working tree), and the most recent closing bridge if session-frame is in question. The state-read is a tool call requested of CC, not an internal model update — the verification is observable to Stefan as part of the conversation.

Both errors trace to the same generative source: a working model of disk state that's slightly behind actual disk state.

Both errors were caught by the same mechanism: CC's first move on receiving a non-trivial prompt is to read disk (git log, target files). Until the structural fix lands on Claude.ai's side, CC's verification-first behaviour is the load-bearing catcher for state-projection errors. The bouncing-partner cycle's resilience to Claude.ai-side stale-state errors is currently CC-dependent, not symmetric.

---

## What's next

No specific commitment. Possible next moves:

- **Platform-tier work toward §L3** (Platform Core area or a Domain Service). Would deliver the n=2 instance that triggers G-32's first non-Hub fire and the tour-shape convergence question simultaneously.
- **Other entity progression** (Studios, Design System, Verticals).
- **G-29 resolution session** (lateral-routing mechanism for cross-entity findings) — still deferred, awaiting cascade-plan Session 4's second instance.
- **ROADMAP.md for the Hub** — still deferred from B.2 (per `2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md` §"What this session did NOT do" line 198, and surfaced as Candidate 3 in that bridge's next-session orientation).

Defer choice to next session-open.

---

## Status at session close

- [x] Frame correction executed (B.2 already closed, pivot to narrative disposition)
- [x] Methodology decision locked (reader tours as post-§L3 maturity gate)
- [x] Methodology registered: skill, PROCESS.md, gaps.md G-32 (`e3b71a0`)
- [x] Hub first-instance execution: tours/, .gitignore, README cascade, CLAUDE.md (`7c14223`)
- [x] Working tree clean
- [x] Closing bridge written

---

*Two commits ahead of `d32afbe`. Push happens at Stefan's discretion.*
