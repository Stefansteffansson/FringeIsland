# Session bridge: 2026-05-12 (1) — Experiment B aborted; restart plan with worktree isolation

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-12 (first bridge of 2026-05-12)
**Session type:** Program-level methodology bridge. Captures Experiment B abort, root cause, recovery state, and restart specification.
**Chronological predecessor:** `2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` (Experiment A bridge — defines Experiment B's plan).

---

## What this bridge is

This bridge documents an aborted experiment run and specifies the corrected restart setup. It is **required reading** at session-open for the Experiment B restart, in addition to the bridges listed in the original Experiment B plan.

This bridge does **not** record methodology observations or substance findings that surfaced during the aborted run. The restart is from cold derivation; carrying observations forward would contaminate the cold starting state. Today's observations (if any are worth preserving) live separately as retrospective input and must not be read by the restart session.

---

## Experiment B abort — root cause

**Experiment B plan (from Experiment A bridge):** Parallel runs of PC-3 Organisation L1→L3 derivation. Bouncing-partner manual run on `main`; autonomous agent run on `experiments/B-pc3-full`. Two CC terminals running simultaneously. Neither sees the other's output until both complete.

**Failure mode:** The two CC terminals were both opened in the same working directory (`D:/WebDev/GitHub/FringeIsland/`). Git branches isolate commit history, not working tree state. When the autonomous CC ran `git checkout -b experiments/B-pc3-full`, the shared working tree switched to the experiment branch. The manual-run CC, sitting in the same directory, inherited the branch switch silently.

**Consequence:**
- Both terminals ended up on the same branch.
- The bouncing-partner blindness invariant (manual-run side does not see autonomous output) was broken when the autonomous CC's Write permission prompt displayed its full spec content in the manual-side bouncing-partner's view.
- The parallel-run topology that Experiment B's plan assumed could not actually exist with this terminal setup.

**Root cause:** The Experiment B setup specified branch isolation but did not specify working-directory isolation. Two CC terminals running in the same repo directory cannot occupy different branches in parallel — they share one git working tree.

**Single-line lesson:** `git worktree` is the required mechanism for parallel runs across branches. Without it, branch-based isolation is illusory.

---

## What was lost; what was preserved

**Lost (intentionally discarded for the cold restart):**
- The manual-run CC's bouncing-partner Step 1 cold-derivation work (good work, but the bouncing partner is contaminated from having seen the autonomous output; carrying it forward would compound contamination)
- The autonomous-run CC's full Steps 1+2+3 chat output (never written to disk; was shown in a permission prompt that was rejected)

**Preserved:**
- All commits on `main` up through `4dac386` (no Experiment B work was ever committed; tip is unchanged from session-open)
- Experiment A's artifacts on `experiments/agent-comparison` branch (untouched)
- Both PC-1 and PC-2 specifications on `main` (untouched)

**State at end of recovery:**
- Branch: `main`, tip `4dac386`, up to date with `origin/main`
- Working tree clean except for `CLAUDE.md` modified-unstaged (pre-existing across sessions, outside experiment scope)
- `experiments/B-pc3-full` local branch deleted; remote ref never existed
- `experiments/B-pc3-full/` literal directory removed from working tree
- `D:/pc3-step1-manual-backup.md` exists as a courtesy backup; **must be deleted before the restart** to prevent contamination

---

## Restart specification

The restart runs Experiment B with the same plan and same evaluation criteria as the original Experiment B (per Experiment A bridge), with one structural change: **the autonomous agent runs in a separate git worktree at a separate physical path**, not in the same working directory as the bouncing-partner manual run.

### Working-directory topology

| Role | Physical path | Branch |
|---|---|---|
| Bouncing-partner manual run | `D:/WebDev/GitHub/FringeIsland/` | `main` |
| Autonomous agent run | `D:/WebDev/FringeIsland-experiment-B/` | `experiments/B-pc3-full` |

The autonomous-run worktree is created with `git worktree add` from the main repo. It is a separate physical directory linked to the same `.git` database. Changes in one working tree do not affect the other. The two CC terminals operate in different directories and cannot share working-tree state.

### Output paths

| Run | Output target |
|---|---|
| Bouncing-partner manual | `docs/platform/core/organisation-specification.md` (canonical path on `main`) |
| Autonomous agent | `experiments/B-pc3-full/organisation-specification.md` (literal path inside the worktree, on `experiments/B-pc3-full` branch) |

The canonical-vs-literal-directory asymmetry is preserved from the original Experiment B design (per Experiment A bridge): manual = canonical-spec-in-progress; autonomous = comparison artifact. Branch + worktree provide the isolation; directory naming makes the autonomous run's non-canonical status visually unambiguous.

### Required setup sequence (before opening any CC terminal)

The following must happen in a plain shell (not a CC terminal), in order, before any CC session is started:

1. Verify clean state in main working directory:
   - `cd D:/WebDev/GitHub/FringeIsland/`
   - `git status` reports clean working tree (CLAUDE.md may be modified-unstaged; that is acceptable)
   - `git branch --show-current` reports `main`
   - `git log --oneline -1` reports tip `4dac386` or later

2. Delete the courtesy backup file to prevent contamination:
   - `Remove-Item D:/pc3-step1-manual-backup.md`
   - Verify with `Get-Item D:/pc3-step1-manual-backup.md` — must report not found

3. Create the experiment branch and worktree in one operation:
   - `git worktree add D:/WebDev/FringeIsland-experiment-B/ -b experiments/B-pc3-full`
   - This creates the branch from current `main` tip AND creates a separate working directory at the specified path

4. Verify the worktree was created correctly:
   - `git worktree list` reports two entries: main at `D:/WebDev/GitHub/FringeIsland/` on `main`; new worktree at `D:/WebDev/FringeIsland-experiment-B/` on `experiments/B-pc3-full`
   - In the new worktree path: `cd D:/WebDev/FringeIsland-experiment-B/` then `git status` reports clean; `git branch --show-current` reports `experiments/B-pc3-full`
   - Return to main: `cd D:/WebDev/GitHub/FringeIsland/` then `git branch --show-current` reports `main`
   - Switching between the two directories does not change either's branch state

5. Only after Steps 1-4 succeed: open two CC terminals.
   - Manual-run CC terminal: opened in `D:/WebDev/GitHub/FringeIsland/`
   - Autonomous-run CC terminal: opened in `D:/WebDev/FringeIsland-experiment-B/`

### Hardening — required session-opener behaviour for both CC terminals

Both `cc-experiment-b-manual.md` and `cc-experiment-b-agent.md` must, as their **first action** (before any state-read, before any branch confirmation):

1. Run `pwd` and report the working directory
2. Hard-fail if the working directory does not match the expected path for that role (manual = main repo path; autonomous = worktree path)
3. Run `git branch --show-current` and report
4. Hard-fail if the branch does not match the expected branch for that role (manual = `main`; autonomous = `experiments/B-pc3-full`)
5. Run `git worktree list` and report
6. Hard-fail if the worktree topology does not match the expected two-worktree layout

Only after all four checks pass may the CC terminal proceed to its normal state-read sequence. The session-opener .md files for both terminals must encode these checks at the top of the file in a clearly-labelled "Pre-flight checks" section that cannot be skipped.

### Bouncing-partner session integrity

The bouncing-partner Claude.ai chat for the restart **must be a fresh chat session** with no prior exposure to today's aborted-run output. This bridge document is safe for the bouncing-partner session to read (it does not contain substance findings or methodology observations from the aborted run). The Experiment A bridge and PC-2 entity bridge are safe to read (their content is older than the aborted run). The retrospective notes file from today's aborted run (if one exists) must **not** be read by the restart's bouncing-partner session.

### What evaluation criteria carry from the original Experiment B plan

Unchanged from the Experiment A bridge:
- Did the agent surface schema-predates-partition pattern at PC-3? (PW-1 promotion-watch)
- Did the agent surface speculative-shape findings? (PW-2 promotion-watch)
- Did the agent reach meta-altitude observations comparable to A-candidate methodology refinements?
- Did the agent's cold derivation in Step 1 drift toward Supabase-canonical patterns? (P-O1 prediction)

These criteria are evaluated at comparison phase, after both runs complete.

### What carry-forwards apply to the restart

Per the original Experiment B plan, the PC-3 manual run's cold derivation reads the PC-2 entity bridge's PC-3-specific carry-forward block:
1. `handle_new_user` is a PC-2/PC-3 seam-trigger — PC-3 decides accept-seam vs factor vs ADR-escalate
2. `public.users` carries `personal_group_id UUID` — structural inversion of §4 chain
3. The four FringeIsland role names live in PC-3, not PC-2 — TEXT in `role_templates`, no PG ENUM
4. `has_permission()` does not exist on disk; ADR-U007 pattern latent in PC-3

And the Experiment A bridge priors:
- P-O1: actor primitive is `get_current_personal_group_id()`, not `auth.uid()` directly
- D7: role-name vocabulary canonical artifact is named-constant-table, not PG ENUM
- ADR-U007 has stale signature on disk (X3 from Experiment A)

### What does NOT carry from the aborted run

Nothing. The aborted run produced no committed work. The bouncing-partner Step 1 spec from the aborted run is intentionally not preserved. Any methodology observations or substance findings the aborted run produced live in a separate retrospective notes file that the restart session must not read.

---

## Discipline carry-forwards

All durable disciplines from PC-1 / PC-2 / Experiment A remain in effect for the restart:
- Bouncing-partner cycle (manual-run side only)
- Surface-draft + candidate ledger + tripwire-at-1
- State-read at session-open and after permission gates / tool-result clusters
- Verify-before-asserting
- No Greek characters as labels
- Discipline-stack altitude-aware
- Move-and-correct disposition
- Three-day fitness function for ecosystem
- Print-batch-before-gate at L-level surface drafts
- Sub-batch-of-1 multi-Edit cadence default
- Experimental artifacts stay on experiment branches; canonical specs on main amended only via deliberate commits with explicit provenance
- **NEW** (durable): two CC terminals running in parallel must occupy separate git worktrees at separate physical paths. Branch-only isolation is insufficient.
- **NEW** (durable): bouncing-partner Claude.ai chat sessions must remain blind to autonomous-run output until comparison phase. If contamination occurs, the bouncing-partner session is burned and the restart requires a fresh chat.

---

## Decisions still open

None for the restart itself. The restart specification above is complete.

For future Phase-2 work after Experiment B succeeds: the methodology observations from today's aborted run (held in a separate retrospective notes file) become input to the post-experiment retrospective alongside the actual Experiment B comparison results.

---

## State at end of this session

- Branch `main` unchanged at `4dac386` (no commits this session)
- Branch `experiments/B-pc3-full` deleted locally; never pushed to origin
- Directory `experiments/B-pc3-full/` removed from working tree
- File `D:/pc3-step1-manual-backup.md` exists; **delete before restart**
- File `CLAUDE.md` remains modified-unstaged (pre-existing across sessions)
- This bridge to-be-committed
- `cc-experiment-b-manual.md` and `cc-experiment-b-agent.md` to-be-updated with pre-flight check hardening (next work items in this session)
- The retrospective notes file (if produced) is held outside this bridge and out of scope for the restart session's read-list

---

## What the restart session should know

The restart bouncing-partner Claude.ai chat session is opened fresh, with no prior conversation history. At session-open it reads (in order):
1. This bridge (`2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md`)
2. The Experiment A bridge (`2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md`)
3. The PC-2 entity bridge (`2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`)
4. The PC-1 entity bridge (`2026-05-04_01_-_PC1-L1-L3-COMPLETE.md`)

It does **not** read any retrospective notes from the aborted run.

It coordinates the bouncing-partner manual run only. The autonomous-run CC terminal in the separate worktree operates without bouncing-partner intervention.

It expects the manual-run CC terminal's first response to include the pre-flight check output (pwd, branch, worktree list) demonstrating that the working-directory topology is correct.
