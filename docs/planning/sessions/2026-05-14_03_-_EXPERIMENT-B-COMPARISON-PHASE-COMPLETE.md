# Session bridge: 2026-05-14 (3) — Experiment B comparison phase complete; PC-3 derivation findings reconciled

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-14 (third bridge of 2026-05-14)
**Session type:** Program-level reconciliation bridge. Experiment B comparison-phase analysis closes; substantive + methodology findings folded into program record.
**Position in PC-3 sequence:** Post-PC-3-close; pre-PC-4-entry. Predecessor `2026-05-14_02_-_PC3-STEP3-LANDED.md` closed PC-3 manual-side derivation. This bridge runs the comparison-phase analysis the Experiment B disposition deferred.
**Chronological predecessor:** `2026-05-14_02_-_PC3-STEP3-LANDED.md`.
**Substantive predecessors:** `2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` (Experiment A close); `2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` (Experiment B specification); PC-3 manual-side chain (Step 1 / Step 2 / Step 3 split / Step 3 close).

---

## What ran this session

Experiment B comparison-phase analysis. The bouncing-partner side (Claude.ai) dropped the blindness invariant per session-open disposition and read the autonomous-track outputs at `experiments/B-pc3-full` against the manual-track outputs on `main`.

Autonomous-track inventory extracted via a fresh CC session in the experiment worktree (output pasted into Claude.ai). Comparison run as substance-first / methodology-second per session disposition. No spec or ADR modifications this session; this bridge is the comparison-phase artifact.

## State at session-open

- Manual track: PC-3 L1→L3 derivation complete at commit `172ecd9` (closing bridge); 13 commits ahead of origin/main.
- Autonomous track: PC-3 cold derivation + Step 2 stress-test + Step 3 adjudication on `experiments/B-pc3-full`; single commit `da2a466` adding `experiments/B-pc3-full/organisation-specification.md` (539 lines). No bridges, no ADR amendments, no L4.
- Divergence point: `f894b33` (Experiment B abort-restart commit on main).
- PC-2 spec un-amended on disk (single commit `0565d65`); Experiment A's 10 findings deferred pending this comparison.

## Headline result

**The two tracks ran fundamentally different experiments — not different answers to the same question, but different scopes of work.**

Substantive entity decomposition converged heavily; depth-of-evidence-gathering and artifact-production discipline diverged structurally. Autonomous side delivered a denser cold-derivation snapshot with preserve-as-cold discipline for comparison clarity; manual side delivered an iteratively-corrected canonical spec with deeper code-informed evidence and ADR amendments as load-bearing program output. Neither output dominates the other; they answer different questions.

## Substance findings — where the two tracks agree

Both tracks converged on:
- `has_permission()` disk signature `(p_acting_group_id, p_context_group_id, p_permission_name)`; ADR-U007 signature staleness; amendment direction.
- `personal_group_id` stays on `public.users`; bilaterally documented; ADR-U006 authorizes §4-chain override.
- Universal group pattern: single `groups` table with `group_type` discriminator (`system | personal | engagement`).
- PW-1 (schema-predates-partition): confirmed at PC-3; program-level promotion warranted.
- PW-2 (speculative-as-third-shape): confirmed; promotion warranted.
- Role-name vocabulary: TEXT-keyed lookup table (per Experiment A D7 prior), not PG ENUM.
- `handle_new_user` factoring: accept-seam permanently; ADR-U016 cascade-spec entry.

## Substance findings — where the two tracks diverge

**1. Multi-role memberships (autonomous D3 — manual gap).** Autonomous-track Step 2 surfaced disk evidence of a separate `user_group_roles` junction with composite PK supporting multi-role-per-membership. Manual-track capability inventory does not surface multi-role as an explicit capability or open discipline question. **Real substance gap on manual side.** Disposition: investigate further; either fold into manual PC-3 spec amendment or carry as pickup for PC-4 / Phase 2 close-out if multi-role is governance-relevant.

**2. PostgREST RPC PW-2 retraction (manual finding — autonomous gap).** Manual track surfaced PostgREST RPC as the canonical realized HTTP API surface at Step 2 (via `lib/hooks/usePermissions.ts` evidence); PW-2 retracted; A-candidate #9 (framework-provided contract mechanisms invisible to cold derivation) armed. Autonomous track did not read framework-mechanism code at Step 2; missed the retraction. **Substantive divergence; manual side reached the finding autonomous did not.** Root cause: Step 2 disk-evidence scope differed.

**3. X5 anti-pattern / two-tier centralization (manual finding — autonomous gap).** Manual track surfaced 5 service-role sites / 6 createClient instances at Step 2; framed two-tier centralization (Gap A substrate + Gap B auth-flow). Autonomous track did not surface. Same root cause as #2: scope-of-disk-reading.

**4. P1 four-mode fresh-DB deployability + P11 D15 archeology cluster (manual findings — autonomous gap).** Manual track surfaced both as DevOps-tier Phase 2 close-out pickups; deep migration-archeology reading. Autonomous track did not surface. Same root cause.

**5. ADR-U018 three-distinction narrowing (manual finding — autonomous bypass).** Manual track produced explicit Q9 clarification-of-intent codification (typed entities vs discriminator vs entity-state vs growth-vocabulary). Autonomous track addressed disk reality at Q4 but did not frame as ADR clarification-of-intent. Whether this is over-engineering or load-bearing clarification depends on future-reader value; manual side judged load-bearing; comparison preserves the manual judgment as canonical.

**6. DeusEx vocabulary cosmology-neutral-naming question (manual Q10 — autonomous gap).** Manual track surfaced as separate question with grandfathering disposition. Autonomous track did not surface. Manual side caught a cosmology-naming-lock issue across schema-vs-current-conventions; autonomous side did not flag it as a separate question.

**7. SS-18 permission count source-of-truth hierarchy (manual framing — autonomous gap).** Manual track surfaced as three-source hierarchy with ADR-implications. Autonomous track has equivalent disk evidence (X7 sprint permission additions) but did not crystallize the framing.

**8. C2 group-hierarchy speculative third-shape (autonomous PW-2 instance — manual non-surface).** Autonomous track cold-derived a hierarchy hypothesis; Step 2 disconfirmed; clean PW-2 instance. Manual track did not reach for the hierarchy hypothesis (prior-loaded context pruned it). Methodology data point: prior-loading reduces speculative-third-shape generation; trade-off between hypothesis coverage and noise.

## Methodology findings

**Session shape:** manual = 6 sessions / 13 commits / sub-batch-of-1 / bouncer-gated. Autonomous = 1 session / 1 commit / single Write. Different products; neither wrong; downstream serves different needs (regeneration speed vs decision-trace legibility).

**Class-2 fold-back vs preserve-as-cold:** manual inline-folded 6 deltas into final §1-§8 text; autonomous preserved 17 deltas as-cold in §1-§8 with deltas surfaced only in Step 2/3 blocks. Experiment-design choice on autonomous side, explicitly named; canonical-spec discipline on manual side. Worth naming as program-level pattern: **experiment-output vs canonical-output asymmetry** is a legitimate methodology variant for experiment runs.

**ADR amendments — separate commits vs pickup-list-only:** manual treated ADR amendments as in-scope at entity close (three append-only Option A amendments, three shape variants precedented: THREE-COMPONENT / FOUR-COMPONENT / THREE-DISTINCTION). Autonomous treated as pickup. Manual judgment is sounder for canonical-spec maintenance — pickup-only accumulates drift across entity closes. **New durable discipline candidate: ADR amendments at entity close, not pickup.**

**Bridge cadence:** manual produced 6 bridges; autonomous produced zero. Single-session work makes bridges optional; multi-session requires them. Manual side could not have run cleanly without the bridge chain (especially the split-bridge `300daa1` for Tasks #4/#5/#6 handoff). **Discipline: bridges are session-shape-dependent.**

**Tripwire #4 catch-surface:** manual side recorded multiple visible Tripwire #4 firings (Edit 4c cross-section anchor confusion; Edit 6.5.a oldText stale-context recovery; SS-20 Q-numbering drift; OLDFEAT head-truncation; commit-shape verify-before-asserting). Autonomous side had no visible firings. **Important: sub-batch-of-1 + bouncing-partner is a coupled discipline.** Bouncing-partner cycle generates Tripwire #4 catches as a structural byproduct; autonomous-only runs miss this catch-surface.

**P-O1 promotion (cold-derivation drifts Supabase-canonical):** autonomous track explicitly promoted to "STRONGLY CONFIRMED systematic bias" and routed to PG-3 for program-level pickup. Manual track has equivalent observation but did not crystallize the named pattern. **Autonomous side did sharper methodology framing here.** Disposition: fold P-O1 as named program-level pattern at Phase-2 close-out, citing autonomous-track framing.

**Cold-derivation discipline vocabulary:** manual side names "cold-derivation-with-priors" as A-candidate #6 methodology variant; autonomous side applied equivalent discipline without naming. Manual side's methodological vocabulary is more developed; autonomous side's discipline-application is equivalent but less self-documenting.

## Where each side outperforms

**Manual side outperforms on:** depth of code-informed evidence (PostgREST RPC, X5, P1, P11, SS-18); ADR amendment as load-bearing program output; sub-shape decomposition of failure modes (SS-17 A/B, SS-20); bridge-as-methodology-capture-surface; bouncing-partner cycle's Tripwire #4 firing structure; in-commit-consistency discipline.

**Autonomous side outperforms on:** compression (full PC-3 in one commit); preserve-as-cold discipline (explicit experiment-output framing); P-O1 promotion crispness; multi-role memberships catch (D3); cold-position-visibility for trajectory analysis.

## Dispositions

**1. Multi-role memberships (autonomous D3).** Carry as pickup item for PC-4 / Phase 2 close-out: clarify whether multi-role-per-membership is a PC-3 capability surface that needs explicit documentation, or governance discipline that belongs at PC-4. Not blocking PC-2 amendment work; not blocking PC-4 entry.

**2. PostgREST RPC retraction methodology lesson.** PC-4 Step 2 disk-evidence scope must explicitly include framework-mechanism code (`lib/hooks/`, `lib/utils/supabase/`, `lib/admin/`) + code-pattern surveys (createClient instances, service-role escalations) + migration archeology. **New durable Step 2 scope item; carry forward to PC-4 + DS-* + Phase 2 close-out.**

**3. P-O1 promotion.** Fold P-O1 (cold-derivation drifts Supabase-canonical actor primitive) as named program-level pattern at Phase 2 close-out. Cite both tracks as convergent evidence; autonomous-track framing as catalyst.

**4. A-candidate #9 ratification.** Framework-provided contract mechanisms invisible to cold derivation: manual track surfaced; autonomous track confirms gap. Convergent evidence; ratification candidate confirmed for DS-* entry.

**5. ADR amendments at entity close.** Establish as durable discipline. Manual side's three append-only Option A amendments (U006 / U007 / U018) are the precedent shape. Future entity closes require ADR amendment as in-scope work, not pickup.

**6. Experiment-output vs canonical-output asymmetry.** Establish as named methodology variant. Experiment runs may preserve-as-cold for comparison clarity; canonical runs must inline-fold corrections.

**7. PC-2 amendment unblocked.** Both tracks confirm Experiment A direction. PC-2 amendment work can proceed when scheduled; not blocking on comparison phase further.

**8. Push to origin unblocked.** Comparison-phase analysis complete. Push gate per Experiment B disposition is satisfied.

## Methodology data points captured this session (bridge-prose; no spec touched)

- **Experiment-output vs canonical-output asymmetry as named methodology variant.** Both shapes legitimate; choose per session purpose.
- **Sub-batch-of-1 + bouncing-partner coupling.** Tripwire #4 firing structure depends on both halves; autonomous-only runs lose the catch-surface.
- **Step 2 disk-evidence scope expansion.** Framework-mechanism code + code-pattern surveys + migration archeology must be explicit scope items; cold-derivation Step 1 reads cannot substitute.
- **Cold-derivation hypothesis pruning trade-off.** Prior-loaded context reduces speculative-third-shape generation; manual side's prior-loading missed the C2 hierarchy hypothesis that autonomous side surfaced and cleanly disconfirmed. Trade-off between hypothesis coverage and noise; both legitimate.
- **ADR amendments as load-bearing program output.** Discipline candidate for future entity closes.

## Carry-forward to PC-4 entry

- Step 2 disk-evidence scope expansion (framework-mechanism code; code-pattern surveys; migration archeology) — explicit pre-flight item.
- P-O1 carry-forward prior at Step 1 cold derivation.
- A-candidate #9 (framework-provided contract mechanisms invisible to cold derivation) — promotion-watch ratification candidate at DS-* Step 1.
- A-candidate #5 (sub-batch-of-1 cadence) — still ratification candidate at PC-4 entry per manual-side closing bridge.
- Multi-role memberships question — carry as pickup for clarification at PC-4 or DS-*.
- ADR amendments at entity close — durable discipline.
- All prior PC-3 closing-bridge carry-forwards unchanged.

## Repo state at session close

- Branch `main`, 13 commits ahead of origin/main; this bridge will land as commit 14.
- Working tree: `CLAUDE.md` modified-unstaged carry-forward only.
- Autonomous worktree at `D:/WebDev/FringeIsland-experiment-B/` on `experiments/B-pc3-full`: unchanged.
- No push to origin yet — push gate is now satisfied per disposition (8) but actual push left as a deliberate next step.

## Session-open prompt for CC (PC-4 entry — added items)

Successor session for PC-4 Governance L1→L3 entry should incorporate the following additions to the standard session-opener shape:

- Read this bridge first (chronological predecessor); the manual-side PC-3 closing bridge `2026-05-14_02_-_PC3-STEP3-LANDED.md` second.
- Step 2 disk-evidence scope: must explicitly include `lib/hooks/`, `lib/utils/supabase/`, `lib/admin/`, `app/api/*` createClient survey, `supabase/migrations/archive/` archeology, in addition to canonical-table reads.
- Carry-forward priors: P-O1 (cold-derivation drifts Supabase-canonical); D7 (role-name vocabulary); X3 (signature drift); X5 (service-role anti-pattern); Finding #4 (two-tier centralization).
- ADR amendments at entity close are in-scope work, not pickup.
- A-candidate #5 ratification: still expected at PC-4 entry; sub-batch-of-1 cadence on fresh entity is the cross-entity-replication step.

---

End of bridge.