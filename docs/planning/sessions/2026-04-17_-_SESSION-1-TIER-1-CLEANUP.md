# Session — Tier 1 cleanup + Tier 2 structural additions (Session 1 of the way-of-working refactor)

**Date:** 2026-04-17
**Participants:** Stefan + Claude
**Status:** In-session execution complete — follow-up doc-health pass and root `CLAUDE.md` rewrite required before commit (see "What was not touched" and "Open items" sections below)
**Session type:** Execution — Tier 1 cleanup + Tier 2 structural additions from the 2026-04-17 way-of-working review

**Input document:** `sessions/2026-04-17_-_WAY-OF-WORKING-REVIEW.md` (the review session that produced the 11 locked decisions and the four-tier action list)

---

## How to use this bridge (read this first if you're a new session)

This document is both a **historical record** of Session 1 and the **starting point for the next session**. If you (Claude) are being opened fresh with this file uploaded, here is how to proceed:

1. **Read the whole bridge top-to-bottom.** The historical sections give you the context you need to act correctly in the next session — what was decided, what was done, what was deliberately left undone.
2. **Check the "Open items → Before commit" section** near the bottom. That's the concrete to-do list.
3. **Execute the instruction in the "Next-session instructions" section** at the very bottom of this document. That section is written in second-person imperative — it is a direct instruction to you, not a description of an instruction.
4. **Do not relitigate decisions.** The 11 locked decisions from the 2026-04-17 review session are binding. If something seems wrong, surface it as a question rather than silently overriding.
5. **Pause and check in** after each major step before moving to the next. The instructions below are sequenced deliberately with checkpoints — don't collapse them.

> If Stefan has uploaded this file without additional context, he almost certainly wants you to proceed with the next-session instructions at the bottom. Confirm briefly (one line) and start.

---

## Purpose

Execute Session 1 of the action list from the 2026-04-17 way-of-working review: all of Tier 1 cleanup (T1.1–T1.13) plus Tier 2 structural additions T2.1 and T2.2. After this session, PROCESS.md and the skills are internally consistent under Model A, the `doc-health-check` skill exists, the four stale workflow files are gone, and the documentation tree is ready for Tier 3 strategic reflection work.

---

## What was accomplished

### Tier 1 cleanup (all 13 items complete)

**T1.1 — PROCESS.md §2 rewritten for Model A**
- Replaced PRD + user-story template references with `feature-spec.md` for feature, nfr, and tech-debt types.
- Added a one-paragraph explanation of why the single template covers three work item types.

**T1.2 — PROCESS.md §1 maturity-location table rewritten for Model A**
- New intro paragraph: feature-shaped items live as `FEAT-*.md` files in the ecosystem tree under their owner, with maturity in YAML frontmatter.
- Visual flow updated: removed `backlog/discovery.md`, `backlog/product.md`, `cycles/cycle-current.md` location markers; replaced with "all levels 0–4 live in `docs/{owner}/features/FEAT-*.md` with YAML `maturity:`" and the same-file-through-6-done truth.
- Maturity table now points every level at `docs/{owner}/features/FEAT-*.md` with the appropriate YAML `maturity:` value.
- New subsection "Parking work (the icebox mechanism)" documents `parked: true` + `parked_reason` per DECISION-11. Explicit orthogonality of maturity and parked; required `parked_reason`; single-grep property.
- Added "The ecosystem tree is the catalogue, not the backlog" clarification.

**T1.3 — PROCESS.md §6 trigger-artifact map rewritten**
- Removed "Major feature reaches maturity 3 → PRD → `prds/prd-{slug}.md`" row.
- Added "Feature enters the pipeline (maturity 0-raw or higher) → Feature spec (stories embedded) → `../{owner}/features/FEAT-*.md`" row.
- Corrected stale `cycles/retro-*.md` paths to `retrospectives/retro-*.md` (matching the actual directory).
- Added two explanatory paragraphs: one confirming a single feature spec covers maturity 0 through 6 (no separate PRD artifact), and a forward-reference to the new "Skills as the execution layer" section.

**T1.4 — PROCESS.md Quick Reference rewritten**
- All seven bullets updated. New-idea bullet points to feature spec at maturity 0-raw under the owner; fallback to `../ecosystem/thinking/OPEN_QUESTIONS.md` when ownership is unclear.
- Park-something bullet now documents the `parked` YAML flag instead of pointing at the (non-existent) `backlog/icebox.md`.
- New bullet added: "How does a feature actually get built day-to-day?" pointing at the `feature-development` skill.
- All Model B references removed (no more `prds/prd-{slug}.md`, no `backlog/discovery.md`, no `backlog/icebox.md`).

**T1.5 — PROCESS.md header link fixed**
- `../architecture/ARCHITECTURE_ANATOMY.md` → `../architecture/ARCHITECTURE_ANATOMY_V1.md` (the file that actually exists on disk).

**T1.6 — PROCESS.md §3 cycle-boundary checklist updated**
- Added `doc-health-check` skill invocation with an inline summary of what it checks (stale paths, terminology drift, README sync, missing DESCRIPTIONs, unfilled Implementation notes, parked-review).
- Satisfies DECISION-10 (doc-health fires at cycle boundaries).

**T1.7 — PROCESS.md §8 quarterly audit location specified**
- Pointed at `retrospectives/audit-YYYY-Q#.md` using the retrospective template per DECISION-09.
- Added explanatory note that the audit is the same shape as a cycle retro, wider scope, no separate template.

**T1.8 — PROCESS.md §3 tech-debt allocation guideline added**
- New bullet in the cycle-boundary checklist: at least one bet per cycle should be tech-debt / NFR / process unless the backlog genuinely contains none.
- Includes a "don't invent debt to meet a quota" caveat to prevent cargo-culting.

**T1.9 — `docs/templates/user-story.md` deleted**
- Verified no active file referenced it (grep clean).
- Templates README updated: removed both the directory-structure entry and the Index table row for `user-story.md`. Updated the `feature-spec.md` row to note "Stories are embedded inline."
- Templates count now 15 (was 16).

**T1.10 — `docs/templates/feature-spec.md` updated for parked fields**
- Added two optional frontmatter fields (`parked: true`, `parked_reason`) as commented-out entries in the template, with inline comments explaining the orthogonality of maturity and parked, and the requirement that both fields be set together when parking.

**T1.11 — `docs/planning/retrospectives/README.md` updated**
- Full rewrite documenting all four retro scales per DECISION-04 and DECISION-09: weekly Three Ls (`weekly-YYYY-MM-DD.md`), cycle retro (`retro-YYYY-MM-DD.md`), wave retro (`retro-wave-{name}.md`), quarterly audit (`audit-YYYY-Q#.md`).
- Includes the rationale for using one template across all scales, plus a naming-pattern quick reference block.

**T1.12 — `docs/planning/README.md` updated**
- Phantom `DEFERRAL_PROTOCOL.md` + `PLANNING_PROTOCOL.md` references removed from the directory tree diagram (cross-check: neither file ever actually existed on disk).
- Explanatory paragraph added noting that deferral is covered in PROCESS.md §3 (wave tags + parked YAML + betting table + OPEN_QUESTIONS.md) and research-first is covered in §1 ("Why the pipeline matters"), so there are no separate protocol files.
- Session file example updated to `2026-04-17_-_WAY-OF-WORKING-REVIEW.md` (most recent).
- Backlog description corrected: "ephemeral TASK-*.md files for the active cycle" instead of "work items and ephemeral task files."
- Retrospectives description expanded to include all four scales.

**T1.13 — Four stale workflow files deleted**
- Executed only after T2.1 was complete and verified in place (dependency chain preserved per action list).
- Deleted: `docs/planning/workflows/BOOT_UP.md`, `CLOSE_DOWN.md`, `DOC_HEALTH_CHECK.md`, `WORKFLOW.md`.
- Cross-check: no active file references any of the four filenames or the `planning/workflows/` directory path.
- **Minor follow-up:** the `docs/planning/workflows/` directory is now empty. Left in place pending Stefan's call on whether to remove the empty directory.

### Tier 2 structural additions (both items complete)

**T2.1 — `doc-health-check` skill created**
- Location: `.claude/skills/doc-health-check/SKILL.md`.
- Frontmatter follows the house style of the other three skills (frontmatter with `name` + `description`; description contains trigger phrases for fire-matching).
- Six sections by concern: terminology drift, schema drift, path + README sync, parked items review, maturity consistency, entity coverage. Each has a question, a procedure, and a "skip if" clause.
- Trigger per DECISION-10: cycle boundaries (baseline) plus on-demand after cross-cutting changes.
- Defined output format suitable for pasting into the cycle retrospective.
- Explicit "fix in-place vs create a backlog item" decision rule to prevent the skill from turning into a rabbit hole.
- Mined structural content from the old `docs/planning/workflows/DOC_HEALTH_CHECK.md` where it applied (the six-section organisation, the "question → procedure → skip if" shape, the output summary format). All stale path references and Model B assumptions were discarded.

**T2.2 — "Skills as the execution layer" section added to PROCESS.md**
- New Section 6.5, placed between §6 and §7, resolves the two forward-references already planted in §6 and the Quick Reference.
- Opens with the DECISION-02 rationale (separation of strategic from operational; don't merge the two into a 1500-line monolith).
- One paragraph per skill (`ecosystem-decomposition`, `feature-development`, `wave-planning`, `doc-health-check`): when it fires, what it produces, what it owns.
- Visual diagram mapping the four skills to the feature lifecycle.
- Short "Adding a new skill" subsection with guidance on scope discipline.

### Additional cleanup caught during PROCESS.md scans (not in the original action list)

While working through T1.1–T1.8 I noticed three Model B remnants elsewhere in PROCESS.md that weren't in the session document's action list but clearly needed to be folded in to keep PROCESS.md internally consistent. Handled inline:

- **§3 "Deferred and cross-wave work"** — still referenced `backlog/icebox.md` and "backlog entry or PRD." Rewrote to reference the `parked` YAML flag and feature specs. (Implicit consequence of DECISION-01 + DECISION-11.)
- **§7 "Tag format"** — said tags are written in `backlog/discovery.md` and `backlog/product.md`. Rewrote to describe YAML frontmatter as the primary mechanism, with the free-form tag line reserved for TASK-*.md files and session notes.
- **§7 Maturity tag values** — only listed `0-raw` through `4-ready`. Extended to include `5-in-cycle` and `6-done`, matching the canonical seven-value set used in the feature-spec.md template.

---

## Files touched

| Path | Action |
|------|--------|
| `docs/planning/PROCESS.md` | Rewritten in §1, §2, §3, §6, §7, §8; new §6.5 added; Quick Reference rewritten; header link fixed |
| `docs/templates/feature-spec.md` | Optional `parked: true` + `parked_reason` frontmatter fields documented |
| `docs/templates/README.md` | Removed `user-story.md` entries (2 places); updated `feature-spec.md` row |
| `docs/templates/user-story.md` | **Deleted** |
| `docs/planning/README.md` | Phantom protocol files removed; explanatory paragraph added; descriptions corrected |
| `docs/planning/retrospectives/README.md` | Full rewrite for four retro scales |
| `.claude/skills/doc-health-check/SKILL.md` | **Created** |
| `docs/planning/workflows/BOOT_UP.md` | **Deleted** |
| `docs/planning/workflows/CLOSE_DOWN.md` | **Deleted** |
| `docs/planning/workflows/DOC_HEALTH_CHECK.md` | **Deleted** |
| `docs/planning/workflows/WORKFLOW.md` | **Deleted** |

---

## What was NOT touched (follow-up needed before commit)

**This section captures work the session did not do but probably should have.** Surfaced when Stefan asked whether the refactor included README / CLAUDE.md / AGENTS.md / CHANGELOG.md updates — and the honest answer was "only some of them." Recording this explicitly so it doesn't get forgotten.

The in-session scope was the Tier 1 + Tier 2 action list as literally written. That list did not name the files below, but the work done ripples through them. The `doc-health-check` skill created in T2.1 is specifically designed to systematically find this kind of drift — so the cleanest next step is to run that skill on this session's output before committing.

### Files confirmed not checked / not updated

| File / path | Why it might have drifted | Confidence it drifted |
|---|---|---|
| **Root `CLAUDE.md`** | Not opened during the session. May point at deleted workflow files, reference PROCESS.md sections by section number (and §6.5 is new), describe the old Model B pipeline, or list stale skill names. | High — this is the project's entry point; stale references here have downstream impact on every agent that reads it. |
| **Root `AGENTS.md`** | Read early in the session to extract the cross-check rule; not re-read afterwards. May need minor updates if it references workflow files or Model B concepts. | Low-to-medium — it's a short, stable file, but I only scanned it once. |
| **Root `CHANGELOG.md`** | Updated after the session when Stefan asked; now reflects the refactor. | Already addressed. |
| **`docs/README.md`** (if it exists) | Top-level ecosystem map. Not checked. May reference deleted workflow files or describe the old pipeline. | Medium. |
| **`docs/planning/backlog/README.md`** | PROCESS.md §1's rewrite changed the backlog's role (ephemeral TASK-*.md files only, no `discovery.md`/`product.md`). The backlog README almost certainly describes the old model. | High. |
| **`docs/planning/cycles/README.md`** | May reference the old workflow files or stale cycle-adjacent paths. Not checked. | Medium. |
| **Per-tier `CLAUDE.md` files** — `docs/products/CLAUDE.md`, `docs/platform/CLAUDE.md`, etc. | Each describes tier-specific conventions. May reference PROCESS.md sections, skills, or workflow files that have moved. Not checked. | Medium — these are tier-local and may have been stable for a while. |
| **Per-product READMEs** — `docs/products/hub/README.md`, etc. | May reference any of the above. Not checked. | Low-to-medium. |
| **The three pre-existing skills** — `ecosystem-decomposition`, `feature-development`, `wave-planning` | May reference PROCESS.md sections that changed structure (e.g., pointing at §6 for something now in §6.5). The skills predate this session and weren't opened during it. | Medium — the skills are heavily cross-linked to PROCESS.md. |
| **Templates not touched** — `cycle-plan.md`, `retrospective.md`, `wave-spec.md`, etc. | May reference Model B concepts in their placeholder text or comments. Only `feature-spec.md` and the templates README were updated. | Low-to-medium. |

### The empty `docs/planning/workflows/` directory

**Resolved 2026-04-17 (later in session):** Stefan deleted the four files AND the directory itself. The `workflows/` listing was also removed from `docs/planning/README.md` and `docs/README.md` (both had the listing re-added during the first doc-health-check run, which was correct given the directory still existed at that point). The skill's Section 1.5 and 3.6 tables were updated to record the directory deletion alongside the file deletions. No residual cleanup remains for the directory itself.

### Recommended next step: run the `doc-health-check` skill in CC

The new skill created in T2.1 is purpose-built for exactly this situation. Running it against the current state of the tree — after this session's changes but before they're committed — will systematically surface every file that drifted from the refactor. This is also the first real invocation of the skill, which has a useful side effect: if the skill misses obvious drift that Stefan sees by eye, that's a signal to update the skill itself before relying on it at cycle boundaries.

**How to run it** (from the follow-up conversation, captured here so it's not lost):

- Run in **Claude Code (CC)**, not in claude.ai. CC has the tool access and context budget for a sweep across the tree.
- Priming prompt for CC:

> Load the skill at `.claude/skills/doc-health-check/SKILL.md` and run a full check. I just completed a way-of-working refactor (Session 1, see `docs/planning/sessions/2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md`) — PROCESS.md was restructured for Model A, the `user-story.md` template was deleted, the four files under `docs/planning/workflows/` (BOOT_UP.md, CLOSE_DOWN.md, DOC_HEALTH_CHECK.md, WORKFLOW.md) were deleted, and a new `doc-health-check` skill was created. Focus on Section 1 (terminology drift: Model B → Model A, PRD → feature-spec), Section 3 (path + README sync), and Section 6 (entity coverage). Produce the standard output summary at the end, and apply in-place fixes where safe. Flag anything bigger than a 5-minute fix as a backlog item rather than fixing inline.

- **Sequencing:**
  1. Stash or commit the current working state first, so the skill runs against a clean baseline and its findings are attributable.
  2. Run the skill in CC with the priming prompt above.
  3. Review its summary output — especially "backlog items created" section for anything that needs a strategic decision.
  4. Let CC apply the in-place fixes (stale paths, broken links, README entries out of sync) directly.
  5. Come back here (or stay in CC) for anything that needs judgement calls.
  6. Then commit the full refactor as one logical unit — this session's changes + the doc-health fixes — so the CHANGELOG entry describes a coherent, settled state rather than a mid-flight one.

---

## What was decided

All substantive decisions were locked in the 2026-04-17 review session (DECISION-01 through DECISION-11) and were respected as binding in this execution session — no relitigation. This session's only decisions were small execution-level calls:

- **Extra PROCESS.md cleanup inline** — when I found §3 and §7 still had Model B remnants not in the action list, I folded the cleanup into the relevant T1.x edits rather than flagging them as separate follow-ups. Rationale: they were obvious symptoms of DECISION-01 + DECISION-11 and leaving them in would have made PROCESS.md self-contradictory. *Locked.*
- **Left the empty `docs/planning/workflows/` directory in place** — after deleting the four files, the directory itself was empty. The action list asked to delete the four files, not the directory. Flagged as a minor follow-up rather than removed unilaterally. *Resolved later in session: Stefan deleted the directory; the two README listings that were re-added during the first doc-health run were subsequently removed.*

---

## What is still open

All items here are inherited from the 2026-04-17 review session; nothing new was opened by this execution session.

### Minor follow-ups from this session

*(All resolved during the session.)*

- ~~**Empty `docs/planning/workflows/` directory** — remove the directory, or keep it?~~ **Resolved:** directory deleted by Stefan; README listings removed; skill tables updated.

### Inherited from 2026-04-17 review (unchanged)

- **FERD-CAPABILITY-MAP.md's role under Model A** — absorb into `ferd.md`, move to `reference/`, or keep in place. Resolve during the T3.2 session.
- **Maturity 0–1 feature-spec heaviness** — is a one-sentence raw idea genuinely a feature-spec file, or does it need a lighter container? Not addressed; separate concern.
- **Potential need for an intermediate grouping between wave and feature** — the research reports mention "epics" at this level. Address explicitly if the need arises.

---

## Non-obvious insights

- **The Model B remnants in §3 and §7 were invisible until §1, §2, and §6 had been rewritten.** Once the headline sections agreed on Model A, the phrases in the secondary sections stuck out. The lesson: when refactoring a document, doing the core sections first makes the peripheral drift legible. Doing them all at once would have been harder.

- **The doc-health-check skill's existence reframes PROCESS.md §3's cycle-boundary ritual.** Before: "run retro, update roadmaps, move on." Now: run retro, update roadmaps, run the skill, which catches the drift that would otherwise only surface through session-level trial-and-error. The skill turns an implicit practice into an explicit one, and in doing so changes what kind of work counts as "done" at cycle boundaries. Worth keeping an eye on whether the skill stays cheap enough to invoke reliably — if it starts feeling expensive, the cadence needs to adjust before the practice gets skipped.

- **The phantom-file problem (DEFERRAL_PROTOCOL.md + PLANNING_PROTOCOL.md) was quieter than Model B.** Those phantoms sat in `planning/README.md` for weeks flagged as "under review" without anyone checking whether the files actually existed on disk. The cross-check rule (added to AGENTS.md on 2026-04-17) would have caught them. This is a concrete success case for the rule — it proved its worth on its first execution.

- **PROCESS.md is now almost pure strategic content.** Every execution mechanic has been pushed to a skill or a template. The only "how-to" content remaining in PROCESS.md is the DoR/DoD checklists (which are lists of invariants, not workflows). This is a good sign: the division of labour between PROCESS.md and the skills is now clean.

---

## For the next session

### Session 2 target

**T3.2 — Create Ferd-scope feature spec stubs from FERD-CAPABILITY-MAP.md** is the highest-priority Tier 3 item. It's the biggest single piece of work in the remaining plan (110 capabilities) and it unblocks T3.1 (Ferd wave file), T3.3 (Hub SPECIFICATION.md), and T3.4 (Hub ROADMAP.md). The 2026-04-17 bridge recommended this as the next session.

### What the next agent needs to know

- **Read both session files first:** `sessions/2026-04-17_-_WAY-OF-WORKING-REVIEW.md` (the 11 locked decisions and the four-tier action list) and this file (execution log for Session 1). The locked decisions remain binding.
- **Model A is canonical.** Feature specs with embedded stories in the ecosystem tree under each owner. No PRDs. Use `docs/templates/feature-spec.md`.
- **PROCESS.md now points to the four skills.** When the next agent does Level-4 decomposition work, they should load the `ecosystem-decomposition` skill. PROCESS.md §6.5 names the skill explicitly.
- **The `doc-health-check` skill is available.** If Session 2 creates 110 new feature spec stubs, running `doc-health-check` at the end — specifically Sections 3 (README sync) and 5 (maturity consistency) — is worth the 15 minutes to make sure the new files are wired in cleanly.
- **Task lifecycle under Model A:** The `planning/backlog/tasks/` directory holds ephemeral TASK-*.md files for the current cycle. Feature spec stubs do NOT go there — they go under their owner's `features/` directory in the ecosystem tree.

### Critical context carried forward

- **AGENTS.md rule:** When a search or lookup returns a negative result, cross-check with a direct listing before logging it as missing. This rule was used four times this session (confirming phantom protocol files, confirming no active references to `user-story.md`, confirming no active references to any of the four workflow files) and caught no false negatives. It works.
- **The ecosystem tree is the catalogue, not the backlog.** This phrasing was added to PROCESS.md §1 explicitly during T1.2 because it's the crux of Model A. If the next agent feels tempted to create a duplicate feature registry in the planning tree, re-read §1.
- **Four stale workflow files are gone.** If a future reference to `BOOT_UP.md`, `CLOSE_DOWN.md`, `DOC_HEALTH_CHECK.md` (the old one), or `WORKFLOW.md` appears in a prompt or plan, it's based on outdated context — point to the four skills under `.claude/skills/` instead.

---

## Open items

### Before commit (introduced by this session)

- [ ] **Rewrite root `CLAUDE.md`** — the manual double-check (after the first doc-health skill run reported clean) surfaced ~9 drift items in root `CLAUDE.md` that the skill had missed: four directive references to deleted workflow files, the entire boot-up/close-down ritual section, the Sprint Agent handoff, Document Map rows listing `old_products/` as "still authoritative," stale `SPRINT.md` references, an incomplete Skills section, and a pre-refactor version pin. Not in-place-fixable — needs a focused rewrite pass with the session context loaded. See the Open-items section of this bridge for the priority ranking.
- [ ] **Re-run `doc-health-check` skill in CC** against the updated tree after the skill was recalibrated (Sections 1.5, 3.5, 3.6 added; skill-self-exclusion added to all detection greps; CHANGELOG.md excluded from detection greps). This second invocation is the proper validation run — it should now catch the 9 drift items in root `CLAUDE.md` that the first invocation missed, plus sweep the per-tier `CLAUDE.md` files and pre-existing skills for similar drift.
- [ ] **Root `CHANGELOG.md`** — already updated (added three entries at top of `[Unreleased]`: Added / Changed / Removed) after session close per Stefan's request. Verify the CHANGELOG entry still makes sense once the doc-health re-run + CLAUDE.md rewrite complete — may want a follow-up `### Fixed` subsection if the re-run finds additional drift worth noting.
- [x] ~~**Decide:** remove the empty `docs/planning/workflows/` directory, or keep it?~~ **Resolved:** directory deleted; README listings removed; skill tables updated.

### Immediate (after the doc-health pass)

- [ ] Commit the full refactor as one logical unit. Suggested message: `docs(process): refactor PROCESS.md + templates for Model A; create doc-health-check skill; retire stale workflow files` — optionally split into logical commits (PROCESS.md rewrite, template changes, skill creation, workflow deletions, doc-health fixes).

### Near-term

- [ ] **T3.2** — Create Ferd-scope feature spec stubs from FERD-CAPABILITY-MAP.md (largest remaining item; unblocks most of Tier 3).
- [ ] **T3.1** — Populate the Ferd wave file using the `wave-spec.md` template, linking to the new feature spec stubs (blocked on T3.2).
- [ ] **T3.3 + T3.4** — Hub SPECIFICATION.md and ROADMAP.md (blocked on T3.2).

### Deferred (unchanged from 2026-04-17 review)

- [ ] T3.5 — Ecosystem roadmap.
- [ ] T3.6 — Platform roadmap.
- [ ] T3.7 — Seed future wave files.
- [ ] T2.3 — Document the "no project" design choice (low priority).
- [ ] T4.1–T4.3 — Trigger-activated items (DEPENDENCIES.md, post-launch feedback, code quality dashboards). No action until triggers fire.

---

## Files carried forward to the next session

**Must read:**
- `docs/planning/sessions/2026-04-17_-_WAY-OF-WORKING-REVIEW.md` — the 11 locked decisions (binding)
- `docs/planning/sessions/2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md` — this file
- `docs/planning/PROCESS.md` — now internally consistent under Model A; skim the new §1, §6, and §6.5 for the mental model

**Likely relevant for T3.2:**
- `docs/planning/waves/FERD-CAPABILITY-MAP.md` — the 110 capabilities that become feature spec stubs
- `docs/templates/feature-spec.md` — the template every stub will use (now includes optional `parked` fields)
- `.claude/skills/ecosystem-decomposition/SKILL.md` — the skill that covers Level 4 decomposition (feature-level)

### Next-session instructions

**These are direct instructions to you (Claude), not descriptions of instructions. If this bridge has just been uploaded to you as a fresh session, act on them.**

#### Session A — Doc-health re-run + root `CLAUDE.md` rewrite

*Use this if the refactor has not yet been committed.*

You are continuing the FringeIsland way-of-working refactor. Session 1 (this bridge) is complete. Two things remain before the refactor can be committed as one logical unit. Do them in order.

**Step 1 — Re-run the `doc-health-check` skill.**

Load `.claude/skills/doc-health-check/SKILL.md` and run a full check against the current state of the tree. Pay particular attention to Sections 1.5 (architectural drift / obsoleted concepts), 3.5 (references into archived trees), and 3.6 (references to deleted files) — these were added to the skill after the first invocation missed drift in root `CLAUDE.md`. The skill should now catch approximately 9 drift items in root `CLAUDE.md` (four directive references to deleted workflow files, the boot-up/close-down ritual section, the Sprint Agent handoff, `old_products/` paths flagged as authoritative in the Document Map, stale `SPRINT.md` references, an incomplete Skills section, and a pre-refactor version pin).

Also sweep: the per-tier `CLAUDE.md` files (under `docs/products/`, `docs/platform/`, `docs/studios/`, etc.), the three pre-existing skills (`ecosystem-decomposition`, `feature-development`, `wave-planning`), and untouched templates.

Produce the skill's standard output summary. Apply in-place fixes where the rule-of-thumb in the skill says so. For anything that requires a rewrite rather than a patch (especially in root `CLAUDE.md`), flag rather than fix — the rewrite is Step 2.

**Checkpoint:** share the summary with Stefan before moving to Step 2. If the skill missed obvious drift that is visible by eye, the skill itself needs another calibration pass before trusting it further. Update the skill's "Known gaps / skill calibration" section to record any new blind spots, then fix them.

**Step 2 — Rewrite root `CLAUDE.md`.**

Using the skill's findings as the detection layer, rewrite root `CLAUDE.md` to:

- Remove the boot-up / close-down ritual section (that ritual is retired under DECISION-02; skills replace it).
- Retire the Sprint Agent handoff (replaced by the `feature-development` skill).
- Clean up the Document Map table — remove or mark-as-archived any rows listing `old_products/` paths as authoritative.
- Remove or clearly archive any `SPRINT.md` and `PROJECT_STATUS.md` references (both files are retired).
- Expand the Skills section to name all four skills (`ecosystem-decomposition`, `feature-development`, `wave-planning`, `doc-health-check`) and link to PROCESS.md §6.5 which contains the canonical description of skills-as-the-execution-layer.
- Promote PROCESS.md in the Document Map — it's the entry point for the way of working, not a mid-file row.
- Update the version pin line at the top of the file to reflect the 2026-04-17 refactor.

This is a focused rewrite, not a patch. Do not attempt in-place partial fixes to the Session Management section — the whole section needs to go and its replacement is "load the appropriate skill for what you're trying to do."

**Checkpoint:** show Stefan the rewritten `CLAUDE.md` before committing.

**Step 3 — Commit.**

Once Steps 1 and 2 are accepted, commit the full refactor as one logical unit. Suggested message: `docs(process): refactor PROCESS.md + templates for Model A; create doc-health-check skill; retire stale workflow files`. Split into logical commits if cleaner.

#### Session B — T3.2 Ferd feature spec stubs

*Use this only after Session A is fully committed. Do not start this if Session A is still open.*

You are continuing the FringeIsland way-of-working refactor. Session 1 (Tier 1 + T2.1 + T2.2) is complete and committed. Session A (doc-health re-run + root `CLAUDE.md` rewrite) is also complete and committed. PROCESS.md is internally consistent under Model A. Now you move to T3.2.

Create Ferd-scope feature spec stubs in the ecosystem tree from `docs/planning/waves/FERD-CAPABILITY-MAP.md`, using `docs/templates/feature-spec.md`. Load the `ecosystem-decomposition` skill at `.claude/skills/ecosystem-decomposition/SKILL.md` — that's the canonical Level 4 decomposition methodology.

Expect this to span multiple sessions given the 110-capability scope. Aim for a clean first pass with frontmatter + Problem section for each stub, leaving deeper content (Solution sketch, stories, acceptance criteria) for later maturity progression. Do not try to bring stubs to maturity 2+ in the first pass — the goal is coverage at maturity 0-raw / 1-concept, not completeness.

At session close, resolve the FERD-CAPABILITY-MAP.md role question: absorb it into `ferd.md`, move it to `reference/`, or keep it in place. Surface the trade-offs and let Stefan decide.
