You are running a full L1→L3 derivation for PC-3 Organisation Platform Core area, autonomously, per the ecosystem-decomposition skill flow. This is Experiment B (restart).

Phase 2 entity 3 of the FringeIsland ecosystem decomposition. Same three-step shape used at PC-1 and PC-2: cold derivation → code-informed stress-test → adjudication.

This file is the autonomous-run session-opener. It assumes the setup sequence in `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` (sections "Required setup sequence" and "Working-directory topology") has already been completed in a plain shell before this CC terminal was opened, including the creation of the experiment worktree at the path specified below.

---

## PRE-FLIGHT CHECKS — REQUIRED FIRST ACTIONS

Before any state-read, before any branch confirmation, before any other command: execute the following pre-flight checks and report the output of each. Do not proceed past this section if any check fails.

### Check 1 — Working directory

Run `pwd` and report the output.

Expected: `D:/WebDev/FringeIsland-experiment-B` (the experiment worktree path, NOT the main repo path).

If the working directory is anything else (especially `D:/WebDev/GitHub/FringeIsland/`): STOP. Report the mismatch. Do not run any further commands. Do not attempt to `cd` to the correct directory. The user must close this terminal and re-open it in the correct working directory before any further work can proceed.

### Check 2 — Current branch

Run `git branch --show-current` and report the output.

Expected: `experiments/B-pc3-full`.

If the branch is anything else (especially `main`): STOP. Report the mismatch. Do not run any further commands. Do not attempt to `git checkout`. The user must investigate why the worktree is on the wrong branch and re-run the setup sequence before any further work can proceed.

### Check 3 — Worktree topology

Run `git worktree list` and report the output.

Expected: exactly two worktrees:
- `D:/WebDev/GitHub/FringeIsland` on `main`
- `D:/WebDev/FringeIsland-experiment-B` on `experiments/B-pc3-full`

(Plus possibly a `prunable` entry from a previous Claude worktree — that is acceptable; it does not affect this session.)

If the worktree list is missing the main repo entry, has different paths, or shows main checked out at the experiment worktree path: STOP. Report the mismatch. Do not run any further commands. The user must re-run the setup sequence from the bridge document before any further work can proceed.

### Check 4 — Working tree state

Run `git status` and report the output.

Expected: clean working tree on `experiments/B-pc3-full`. The experiment worktree was freshly created from main's tip; there should be no modifications and no untracked files at this point.

If there are any modifications or untracked files: STOP. Report what was found. The user must adjudicate whether the unexpected state is acceptable before any further work can proceed.

### Pre-flight gate

Only after all four checks return expected results may this CC terminal proceed to the state-read pass below. If any check failed, this terminal is in an unsafe state and must be closed.

---

## State-read pass against disk

After pre-flight checks pass, read these files in this order:

1. Root `CLAUDE.md`
2. `docs/platform/CLAUDE.md`
3. `docs/platform/core/CLAUDE.md` (note temporary anchor for the four roles + `has_permission()` — slated for migration to PC-3 if your derivation supports that placement)
4. `docs/platform/core/README.md` (PC-3 L2 line: "Groups, memberships, roles, permissions")
5. ADR-U023 (Platform Core / Domain Services decomposition)
6. ADR-U007 (three-layer permission model)
7. ADR-U016 (cascade specification discipline)
8. `docs/templates/platform-core-spec.md` (template)
9. `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` (this session's bridge — explains the worktree topology this terminal is operating inside)
10. `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` (PC-2 entity bridge — read the "PC-3-specific carry-forward" section carefully)
11. `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` (Experiment A program-level bridge — note that PC-2 spec on main is intentionally un-amended; the substance findings the previous experiment surfaced are documented in this bridge but not yet folded in)

---

## Carry-forward from PC-2 (read carefully — these are Step 1 inputs for PC-3)

- `handle_new_user` is a PC-2/PC-3 seam-trigger; PC-3 takes a position: accept-seam / factor per ADR-U016 / ADR-escalate
- `public.users` carries `personal_group_id UUID` (structural inversion of dependency chain)
- The four FringeIsland role names live in PC-3 (TEXT in `role_templates`), not PC-2
- `has_permission()` does not exist on disk; ADR-U007 pattern latent in PC-3
- Two phase-wide watches: PW-1 (schema-predates-partition), PW-2 (speculative as third shape beyond latent/delta)

## From Experiment A bridge

- The actor primitive in this repo is `get_current_personal_group_id()` (a four-hop chain through users/groups), NOT `auth.uid()` directly. Cold derivation may drift toward `auth.uid()` per Supabase-canonical assumption; flag and correct at Step 2.
- Role-name vocabulary canonical artifact is named-constant-table, not PG ENUM.
- ADR-U007 has stale signature on disk (`has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` — not the user_id-shaped ADR text).

---

## Output target

`experiments/B-pc3-full/organisation-specification.md` — literal subdirectory path inside the experiment worktree.

Important: this is a literal directory at the root of the worktree, NOT the canonical `docs/platform/core/organisation-specification.md` path. The canonical path on `main` is where the bouncing-partner manual run writes; this autonomous-run output goes to a deliberately-distinct path to mark its non-canonical status as a comparison artifact.

The `experiments/B-pc3-full/` directory may need to be created with `mkdir -p experiments/B-pc3-full` if it does not already exist inside the worktree.

---

## Three-step methodology

- Step 1 (cold derivation): Read L1, L2 inventory line, sub-tier `CLAUDE.md`, ADR-U023, template, PC-2 carry-forward only. Do NOT read `supabase/migrations/`, `lib/`, `app/`, or any `FEAT-PC*` files. Author §1-§8 + §L3 capabilities/dependencies/external/sources-status.
- Step 2 (code-informed stress-test): State-read against disk: `supabase/migrations/`, `lib/supabase/`, `app/api/`, `docs/platform/core/features/`. Classify findings (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity). Surface phase-wide observations.
- Step 3 (adjudication): Apply Step 2 findings to the spec. Author §L3 Step 3 outputs: pickup lists per receiving entity (PC-4, Domain Services, program-level), items not in pickup, carry-forward to receiving entity authors.

---

## Constraints

- Run autonomously through all three steps. Permission gates only for actual Write/Edit calls.
- Document reasoning visible in chat as you go.
- Do NOT read `docs/platform/core/organisation-specification.md` (canonical path) — that's where the bouncing-partner manual run writes (in the OTHER worktree on `main`); your output goes to the experiment path inside THIS worktree on `experiments/B-pc3-full`. Note: this canonical path does not exist on the experiment branch's working tree; attempting to read it from inside this worktree should return "file not found," which is correct.
- Do NOT read or modify `experiments/A-step2-stress-test/` — that's the previous experiment's artifacts (and lives on a different branch anyway).
- Watch flags: L2-line altitude pre-stress-test; PW-1 promotion-watch; PW-2 promotion-watch; A-candidate #5 promotion-watch (multi-Edit gate emission); Finding #4 carry-forward (secrets/credentials adjacency); `handle_new_user` factoring decision.
- If you produce findings that would route to PC-2 or PC-1, document them as pickup but do NOT modify those entities' specs (those specs live on `main`, not on this branch, and would not be accessible from this worktree anyway).

---

## When complete, summarize

- §L2 framing decision (any altitude-mix concern surfaced?)
- §L3 capability count
- Step 2 findings classified by class
- Step 3 adjudications and dispositions
- Pickup lists per receiving entity (counts)
- Phase-wide observations (PW-1 / PW-2 promotion-watches: confirmed or not?)
- Methodology surfacings during the run
- Top three most consequential findings

---

## Commit and push

After Step 3 lands and the spec file is written, commit the work to `experiments/B-pc3-full` (from within this worktree):

```
git add experiments/B-pc3-full/
git commit -m "experiment(B): autonomous agent PC-3 L1→L3 derivation full run

Full L1→L3 derivation by autonomous CC agent without bouncing-partner.
Output written into experiments/B-pc3-full/organisation-specification.md.

[Add summary of finding counts and top findings here]"
```

Then push:

```
git push -u origin experiments/B-pc3-full
```

---

## Start sequence

Begin with PRE-FLIGHT CHECKS (above). If all pass, proceed to state-read pass. Then Step 1 cold derivation.
