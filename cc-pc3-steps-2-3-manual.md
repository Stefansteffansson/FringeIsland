# CC session-opener: PC-3 Organisation Steps 2+3 (manual side)

## Pre-flight checks — STOP

Before any state-read or substantive action, run all four checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.

2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.

3. **Tip commit.** Run `git log --oneline -1`. Expected: tip is `02bc9df` (the bridge commit from the prior session) or a later commit if the human has made additional commits between sessions. Hard-fail if tip is earlier than `02bc9df`.

4. **Working tree state.** Run `git status`. Expected: `CLAUDE.md` modified-unstaged (pre-existing across sessions; outside experiment scope; acceptable). No other modifications. No untracked files in `docs/platform/core/` or `docs/planning/sessions/`. Hard-fail on any other modification or untracked file.

After all four pass, report each check's outcome and proceed to state-read.

## State-read pass

Read in order:

1. `docs/planning/sessions/2026-05-13_01_-_PC3-STEP1-LANDED.md` — immediate predecessor bridge; primary read; contains the session-open prompt for this session.
2. `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` — Experiment B restart specification; still in effect.
3. `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` — Experiment A bridge; defines Experiment B's plan and evaluation criteria.
4. `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` — PC-2 entity bridge; primary substantive carry-forward block.
5. `docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md` — PC-1 entity bridge.

Then verify against disk per Tripwire #4:
- Spec at `docs/platform/core/organisation-specification.md` — confirm landed as recorded (commit `8d880d6`); §L3 Step 2 / Step 3 blocks not yet written.
- Entity-level CLAUDE.md at `docs/platform/core/organisation/CLAUDE.md` — confirm present (commit `5592773`).
- Sub-tier `docs/platform/core/CLAUDE.md` — confirm temporary anchor bullet removed (three bullets remain in `## Rules that only apply at this sub-tier`).
- The 2026-05-13_01 bridge file existence and disk-filename.
- **PC-2 spec un-amended on disk** (no Experiment A substance findings folded in; that's post-Experiment-B amendment work). **If this verification fails, Experiment B comparison-phase is compromised — pause and surface.**

## Work scope

PC-3 Organisation Step 2 (code-informed stress-test pass) + Step 3 (adjudication). Same three-step shape as PC-1 / PC-2 — this is PC-3's split-session continuation, the second of two sessions for PC-3's L1→L3 derivation.

Step 2 reads disk (cold-derivation discipline stands down): `supabase/migrations/`, `lib/`, `app/`, `docs/platform/core/features/`. Three-class output:
- Class 1: confirms (cold-derivation positions verified by disk)
- Class 2: entity-internal deltas (PC-3 spec needs adjustment)
- Class 3: cross-entity findings (pickup lists for PC-4, DS-*, possibly PC-1/PC-2)

Phase-wide observations recorded as sources-status entries.

Step 3 adjudicates §8 questions, produces pickup lists, writes the §L3 Step 3 block. PC-2 amendment carry-forward (§8 Q6) remains deferred to post-Experiment-B work.

## Active watches at Step 2

- **PW-1 (schema-predates-partition) promotion-watch.** PC-3's existing schema is the most likely site for recurrence per PC-2 carry-forward. Confirmation expected; promotion to named program-level pattern at Phase 2 close-out.
- **PW-2 (speculative as third shape) promotion-watch.** §7 directional state for the public HTTP API surface is the canonical tagging site.
- **§8 Q1 — `handle_new_user` factoring position.** Step 1 cold position = accept-seam. Step 2 disk-checks for seam-trigger brittleness signals; if found, shift Step 3 adjudication toward factor or escalate.
- **§8 Q2 — ADR-U007 signature staleness.** Confirm disk signature per Experiment A X3.
- **§8 Q3 / Q4 — Personal Group / System groups entity-vs-label.** Step 2 disk evidence settles.
- **§8 Q5 — `has_permission` vs `is_platform_admin` policy-composition.** Step 2 RLS policy reads settle composition pattern (compose-inline expected per cold prediction).
- **§8 Q8 — ADR-U006 amendment for FK-direction commitment.** Carry to Step 3 disposition.
- **PC-1 Finding #4 carry-forward.** Step 2 watches PC-3-owned operations against the five service-role-escalation routes from Experiment A X5.

## Disciplines in effect

All durable disciplines from PC-1 / PC-2 / Experiment A / Experiment B restart remain active:
- Bouncing-partner cycle (Claude.ai chat coordinates)
- Surface-draft + candidate ledger + tripwires armed
- State-read at session-open and after permission gates / tool-result clusters
- Verify-before-asserting against disk (Tripwire #4)
- Move-and-correct disposition
- Print-batch-before-gate at L-level surface drafts
- Sub-batch-of-1 multi-Edit cadence default (sub-batch-of-3 opt-in only if discipline earns it)
- Structural-inventory-before-defect-assertion at rendering-false-positive surfaces (A-candidate #7 mitigation; n=4 successful applications in prior session)
- Experimental artifacts stay on experiment branches; canonical specs on main amended only via deliberate commits with explicit provenance
- **No push to origin** — comparison-phase analysis runs before push

## Blindness boundary

The autonomous-run output on `experiments/B-pc3-full` is OUT OF SCOPE for this session. Do not read autonomous-run files, do not git-checkout into the worktree at `D:/WebDev/FringeIsland-experiment-B/`, do not reference autonomous-run substance. Comparison-phase is a separate future session.

## After Step 3 lands

Author session bridge `docs/planning/sessions/YYYY-MM-DD_NN_-_PC3-STEPS-2-3-LANDED.md` (filename per date convention; NN sequenced per same-day bridge count). Bridge records: Step 2 findings (three-class output); Step 3 adjudication outcomes; PW-1 / PW-2 promotion-watch results; §8 question resolutions; pickup lists for PC-4 and DS-*; updated A-candidate ledger; tripwires status; repo state; discipline posture for next session (PC-4 entry, or Phase 2 close-out work, depending on sequencing).

Commit shape per PC-1 / PC-2 / PC-3-Step-1 precedent: spec amendment commit + any ADR amendment commits (separate, with explicit provenance) + bridge commit. No push.
