PC-3 Organisation L1→L3 derivation, bouncing-partner manual run. This is the manual side of Experiment B (restart); the autonomous agent runs in a separate CC terminal in a separate git worktree at a separate physical path.

This file is the manual-run session-opener. It assumes the setup sequence in `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` (sections "Required setup sequence" and "Working-directory topology") has already been completed in a plain shell before this CC terminal was opened.

---

## PRE-FLIGHT CHECKS — REQUIRED FIRST ACTIONS

Before any state-read, before any branch confirmation, before any other command: execute the following pre-flight checks and report the output of each. Do not proceed past this section if any check fails.

### Check 1 — Working directory

Run `pwd` and report the output.

Expected: `D:/WebDev/GitHub/FringeIsland` (or the equivalent path on whichever shell is in use — the main repo path, NOT the experiment worktree path).

If the working directory is anything else (especially `D:/WebDev/FringeIsland-experiment-B/`): STOP. Report the mismatch. Do not run any further commands. Do not attempt to `cd` to the correct directory. The user must close this terminal and re-open it in the correct working directory before any further work can proceed.

### Check 2 — Current branch

Run `git branch --show-current` and report the output.

Expected: `main`.

If the branch is anything else (especially `experiments/B-pc3-full`): STOP. Report the mismatch. Do not run any further commands. Do not attempt to `git checkout main`. The user must investigate why the working tree is on the wrong branch and re-run the setup sequence before any further work can proceed.

### Check 3 — Worktree topology

Run `git worktree list` and report the output.

Expected: exactly two worktrees:
- `D:/WebDev/GitHub/FringeIsland` on `main`
- `D:/WebDev/FringeIsland-experiment-B` on `experiments/B-pc3-full`

(Plus possibly a `prunable` entry from a previous Claude worktree — that is acceptable; it does not affect this session.)

If the worktree list is missing the experiment worktree, has different paths, or shows the experiment branch checked out at the main repo path: STOP. Report the mismatch. Do not run any further commands. The user must re-run the setup sequence from the bridge document before any further work can proceed.

### Check 4 — Working tree state

Run `git status` and report the output.

Expected: clean working tree, except possibly `CLAUDE.md` modified-unstaged (pre-existing across sessions, outside experiment scope).

If there are any untracked files in `docs/platform/core/` or any modifications beyond `CLAUDE.md`: STOP. Report what was found. The user must adjudicate whether the unexpected state is acceptable before any further work can proceed.

### Pre-flight gate

Only after all four checks return expected results may this CC terminal proceed to the state-read pass below. If any check failed, this terminal is in an unsafe state and must be closed.

---

## State-read pass against disk

After pre-flight checks pass, read these files in this order:

1. `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` (this session's bridge — required reading; explains the worktree topology and why the previous Experiment B attempt was aborted)
2. `docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md` (PC-1 bridge)
3. `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` (PC-2 bridge — primary read for PC-3 priors)
4. `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` (Experiment A bridge)
5. `docs/platform/core/identity-specification.md` (PC-2 canonical spec — un-amended; the actor primitive on disk is `get_current_personal_group_id()` per Experiment A finding, but PC-2 spec still says `auth.uid()`)

---

## Authority chain for PC-3 cold derivation

- L1: root `CLAUDE.md` + `docs/platform/CLAUDE.md`
- Sub-tier: `docs/platform/core/CLAUDE.md`
- L2 inventory: `docs/platform/core/README.md` ("PC-3 Organisation — Groups, memberships, roles, permissions")
- ADR-U023, ADR-U007, ADR-U016
- Template: `docs/templates/platform-core-spec.md`
- PC-2 carry-forward block (PC-2 entity bridge → "PC-3-specific carry-forward" section)
- Experiment A findings (P-O1 actor-primitive prior, D7 named-constant-table pin, X3 ADR-U007 staleness)

Cold-derivation discipline: do NOT read `supabase/migrations/`, `lib/`, `app/`, or any `FEAT-PC*` files during Step 1. Step 2 stress-test runs after cold draft lands.

---

## Output target

`docs/platform/core/organisation-specification.md` (canonical path on `main`).

---

## Three-step methodology, bouncing-partner cycle

- Step 1 (cold derivation): cold-derive the spec, print surface-draft for review BEFORE first Write gate. Bouncing-partner work via Claude.ai chat.
- Step 2 (code-informed stress-test): state-read disk after Step 1 commits. Classify findings. Bouncing-partner reviews findings before §L3 Step 2 block writes.
- Step 3 (adjudication): apply findings to spec, author §L3 Step 3 outputs (pickup lists, items not in pickup, carry-forward). Bouncing-partner cycle on plan-back, sharpenings, gate cadence.

---

## Discipline carry-forwards

- Print-batch-before-gate at L-level surface drafts (durable from PC-2)
- Sub-batch-of-1 multi-Edit cadence default
- Verify-before-asserting; state-read at session-open and after permission gates / tool-result clusters
- No Greek characters as labels

---

## Watch flags for PC-3

- L2-line altitude pre-stress-test ("Groups, memberships, roles, permissions" — does any item read as domain-scope?)
- PW-1 promotion-watch (schema-predates-partition; PC-3 schema highly likely to recur the pattern)
- PW-2 promotion-watch (speculative as third shape)
- A-candidate #5 promotion-watch (multi-Edit gate emission)
- Finding #4 carry-forward (secrets/credentials adjacency — and by extension X5 service-role escalation pattern from Experiment A)
- handle_new_user factoring decision: §6 / §5 take a position
- P-O1 prior (actor primitive is `get_current_personal_group_id`, not `auth.uid()`)
- ADR-U007 staleness (X3) at §6
- handle_new_user is a known PC-2/PC-3 seam-trigger; PC-3 §5 documents what PC-2 said + adds PC-3 perspective

---

## Completion criteria

After Step 3 lands and all three commits are landed (spec, README revision if needed, bridge), this completes the manual side of Experiment B. The autonomous agent's run on `experiments/B-pc3-full` (in the separate worktree) will be compared against this canonical PC-3 spec at Phase 3 of Experiment B.

---

## Start sequence

Begin with PRE-FLIGHT CHECKS (above). If all pass, proceed to state-read pass. Then Step 1 cold derivation. Print the cold-derivation surface-draft for bouncing-partner review BEFORE the first Write gate.
