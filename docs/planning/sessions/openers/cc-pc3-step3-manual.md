# CC session-opener: PC-3 Organisation Step 3 (manual side)

## Pre-flight checks — STOP

Before any state-read or substantive action, run all four checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.

2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.

3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after the Step 3 session-opener commit (the one that adds this file). The prior session's three commits landed in order: spec amendment `255219d`, bridge `2026-05-13_02_-_PC3-STEP2-LANDED.md` commit, Step 3 session-opener commit (this file). Hard-fail if tip is earlier than spec amendment commit `255219d`.

4. **Working tree state.** Run `git status`. Expected: `CLAUDE.md` modified-unstaged (pre-existing across sessions; outside experiment scope; acceptable). No other modifications. No untracked files in `docs/platform/core/`, `docs/architecture/decisions/`, or `docs/planning/sessions/`. Hard-fail on any other modification or untracked file.

After all four pass, report each check's outcome and proceed to state-read.

## State-read pass

Read in order:

1. `docs/planning/sessions/2026-05-13_02_-_PC3-STEP2-LANDED.md` — immediate predecessor bridge; primary read; contains the session-open prompt for this session in addition to Step 2 carry-forward.
2. `docs/planning/sessions/2026-05-13_01_-_PC3-STEP1-LANDED.md` — PC-3 Step 1 bridge; original cold-derivation + carry-forward priors.
3. `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` — Experiment B restart specification; still in effect.
4. `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` — Experiment A bridge; defines Experiment B's plan and evaluation criteria.
5. `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` — PC-2 entity bridge; primary substantive carry-forward block (still authoritative for cross-entity findings to PC-3 + Q6 deferred-amendment routing).
6. `docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md` — PC-1 entity bridge; PC-1 Finding #4 (now in two-tier centralization framing per Step 2 C3-2) + Finding #3 (`admin_audit_log` → PC-4) still carrying.

Then verify against disk per Tripwire #4:
- Spec at `docs/platform/core/organisation-specification.md` — confirm §L3 Step 2 block landed at commit `255219d` (after the existing §L3 Sources-status block; Sources-status amended with SS-8 through SS-16 entries). §L3 Step 3 block NOT yet written; §3 / §5 / §6 / §7 / §8 / §L4 amendments NOT yet applied (those sections still at cold-derivation state).
- ADRs at `docs/architecture/decisions/` — confirm ADR-U006, ADR-U007, ADR-U018 NOT yet amended (still at pre-Step-3 state).
- **PC-2 spec un-amended on disk** (no Experiment A substance findings folded in; that's post-Experiment-B amendment work). **If this verification fails, Experiment B comparison-phase is compromised — pause and surface.**
- **OLDFEAT integrity check.** Pre-refactor feature archive at `docs/TMP/OLDFEAT/` remains unread on the manual side. If `git log` or `git diff` against that directory indicates accidental reads / modifications since the prior session, pause and surface — the bouncing-partner blindness invariant is at stake.
- This session-opener file existence (`docs/planning/sessions/openers/cc-pc3-step3-manual.md`) and the predecessor bridge file existence (`docs/planning/sessions/2026-05-13_02_-_PC3-STEP2-LANDED.md`).

## Work scope

PC-3 Organisation Step 3 — adjudication + spec amendments + ADR amendments. Same three-step shape as PC-1 / PC-2 (which ran Steps 1+2+3 in single sessions); this is PC-3's third-of-three split-session continuation following Step 1 and Step 2. **PC-3 Organisation L1→L3 derivation completes at Step 3 close** (entity derivation finishes; PC-3 implementation via FEAT-PC-* feature specs + code is downstream and not in scope for Phase 2; Phase 2 remains open until PC-4 lands).

Step 3 reads carry-forward state from disk (§L3 Step 2 block + Sources-status block SS-8 through SS-16 at commit `255219d`); does not re-derive Step 2 findings. Produces:

- **§8 Q1–Q9 adjudication** (Q6 deferred to post-Experiment-B):
  - **Q1** — `handle_new_user` accept-seam permanently (cold position confirmed at Step 2 C1-1); ADR-U016 cascade-spec entry as documentation hygiene.
  - **Q2** — 4-part `has_permission` amendment scope: signature + Tier-1/Tier-2 composition + sentinel-UUID convention + literal-NULL convention (per Step 2 C2-1).
  - **Q3 / Q4 P3** — ADR-U018 disposition: confirm narrowing-to-entity-typing OR adopt stricter reading (two-option from Step 2 C2-2). Confirm ADR-U018 actual text at Step 3.
  - **Q5** — split-by-context confirmed: `is_platform_admin` for RLS; `has_permission` Tier-1-only for RPCs (per Step 2 C2-1).
  - **Q7** — account lifecycle reified (per Step 2 C1-2); route forward to FEAT-PC-* feature spec via §L4 reconciliation work.
  - **Q8** — 3-part ADR-U006 amendment scope: FK direction + immutability + supervised-bypass (per Step 2 C1-3).
  - **Q9** — DeusEx vocabulary layer-bounded; resolution (b) "canonical platform-admin role with stable identity" holds; grandfather (per Step 2 C3-4). Confirm cosmology-neutral-naming-lock date (April 2026) postdates schema (February 2026) when authoring §8 resolution.
  - **Q6** — PC-2 amendment carry-forward; deferred to post-Experiment-B work item (per Experiment A bridge + this session's bridge).

  Adjudication shapes: Q1, Q5, Q7 are pre-resolved at Step 2 (text-write into §6 / §8); Q2, Q3/Q4 P3, Q8 require Step 3 disposition decisions (e.g., adopt narrowing or stricter for ADR-U018; lock one calling convention or accept both for ADR-U007; finalize ADR-U006 amendment scope across three components); Q9 is pre-resolved with one date-verification needed (confirm cosmology-neutral-naming-lock date postdates Feb 2026 schema); Q6 deferred to post-Experiment-B.

- **§L3 Step 3 block authoring** (adjudication outputs + pickup lists per PC-1 / PC-2 precedent). Inserted in §L3 after the §L3 Step 2 block.

- **§3 / §5 / §6 / §7 / §8 / §L4 spec amendments** per Step 2 findings:
  - **§3 (contract surface):** add PostgREST RPC contract category per A-candidate #9 / PW-2 retraction. RPC interface (function name + parameter shape) is a published contract separate from SQL function signature.
  - **§5 (storage):** system-group seeding sites documentation (`[Deleted User]` dedicated; FringeIsland Journeys feature-migration-seeded; FI Members + DeusEx not in active migrations per P9); permission registry growable-by-design framing.
  - **§6 (auth and authz):** `is_platform_admin` + `has_permission` split-by-context discipline; supervised-bypass session-variable discipline; Tier-1-only calling convention documentation (sentinel-UUID + literal-NULL).
  - **§7 (stability posture):** canonical PC-3 HTTP API surface = PostgREST RPC; sharp design rule for custom Next.js routes (three justifications: cross-table mutations / external API calls / multi-step transactions). Use the §7 wording target from Step 2 C3-3.
  - **§8 (open spec questions):** record resolutions for Q1-Q9 (deferred Q6 carries forward; OLDFEAT post-Experiment-B work item added to deferred list).
  - **§L4 (feature inventory summary):** first reconciliation pass between §L3 capabilities and FEAT-PC* artifacts. NULL within canonical scope per Step 2.6; OLDFEAT post-Experiment-B work routed explicitly.

- **ADR amendments** as separate commits with explicit provenance per Experiment A discipline (experimental findings fold into canonical specs / ADRs via deliberate commits with provenance):
  - **ADR-U006 amendment** — FK direction codification (`users.personal_group_id → groups.id`) + immutability commitment (`enforce_personal_group_id_immutability` trigger) + supervised-bypass discipline (`app.bypass_personal_group_id_immutability` session variable).
  - **ADR-U007 amendment** — corrected `has_permission` signature `(p_acting_group_id UUID, p_context_group_id UUID, p_permission_name TEXT)` + two-tier composition documentation (Tier 1 system-group context-free; Tier 2 context-group) + sentinel-UUID + literal-NULL Tier-1-only calling conventions + (potentially) permission-count correction per 44-vs-31 mop-up.
  - **ADR-U018 amendment** — entity-typing-vs-state disposition per Step 3 Q3/Q4 P3 resolution.

- **Pickup lists** for downstream entities:
  - **PC-4 (Governance, next entity in chain):** `admin_audit_log` ownership confirmation (PC-1 Finding #3 fully disk-anchored); service-role escalation surface inheritance + two-tier centralization framing; permission registry baseline-stable framing; session-variable bypass orchestration as PC-4 governance surface.
  - **DS-5 (Communication, Phase 3):** `notifications` + `conversations` + `direct_messages` ownership confirmed at disk-anchor specificity.
  - **DS-* (other Domain Services, Phase 3):** journey-domain entity ownership (TBD); `forum_posts` ownership.
  - **PC-1 / PC-2 amendment-list candidates** (deferred to post-Experiment-B per Q6 routing): PC-1 Finding #4 two-tier centralization framing; PC-2 display-name coupling (PC-2/PC-3 C3-6 cross-entity coupling).

## Active watches at Step 3

- **ADR amendment-shape decisions.** Three separate commits with explicit provenance per Experiment A discipline. Each ADR amendment commit message references the Step 2 finding that drove the amendment + the PC-3 §L3 Step 2 disk-anchor citing the disk evidence (commit `255219d`). No batched ADR commit; sub-batch-of-1 across ADRs.

- **§7 amendment reusability for sibling Platform Core areas.** Does the PostgREST-RPC-canonical design rule generalize to PC-1 (Infrastructure), PC-2 (Identity), PC-4 (Governance), and the Domain Services tier? Or is it PC-3-specific? If general, the §7 design-rule wording should be drafted so downstream PC areas can adopt verbatim. Check at Step 3 §7 authoring.

- **OLDFEAT post-Experiment-B work item routing.** Bridge SS-15 records the deferral; Step 3 may need to add an §8 entry or §L4 sources-status entry routing the OLDFEAT reconciliation work item to a post-Experiment-B-comparison-phase session.

- **Permission-count 44-vs-31 mop-up.** Lib display shows 44 across 6 categories; ADR-U007 cold position cites ~31 across 7 categories. ADR-U007 amendment scope may need count correction alongside the signature correction. Confirm at Step 3 ADR-U007 authoring; targeted count of the actual seeded rows in `archive/20260216140506_rbac_role_management.sql` if needed.

- **C3-2 Gap A + Gap B framing.** Two-tier centralization framing for PC-1 Finding #4 channel is new this session (per Step 2 C3-2 finding). Pickup-list phrasing for PC-1 should adopt this framing rather than the older "single centralization decision" phrasing. PC-1 amendment-list candidate (post-Experiment-B per Q6 routing).

- **A-candidate #9 interaction with §7 amendment.** A-candidate #9 (framework-provided contract mechanisms invisible to cold derivation) is the methodology lesson behind PW-2 retraction + §7 design-rule amendment. §7 text may reference the lesson in commentary (e.g., "PostgREST RPC is the canonical surface — a framework-provided contract mechanism that cold derivation should explicitly check for at Step 1"). Cross-reference design rule + methodology lesson.

## Disciplines in effect

All durable disciplines from PC-1 / PC-2 / Experiment A / Experiment B restart + this session's bridge remain active:

- Bouncing-partner cycle (Claude.ai chat coordinates).
- Surface-draft + candidate ledger + tripwires armed.
- State-read at session-open and after permission gates / tool-result clusters.
- Verify-before-asserting against disk (Tripwire #4).
- Move-and-correct disposition.
- Print-batch-before-gate at L-level surface drafts.
- Sub-batch-of-1 multi-Edit cadence default (sub-batch-of-3 opt-in only if discipline earns it; expected to hold across §3 / §5 / §6 / §7 / §8 / §L4 amendments + 3 ADR amendments).
- Structural-inventory-before-defect-assertion at rendering false-positive surfaces (A-candidate #7 mitigation; held throughout Step 2).
- **Enumeration-claim-scoping** (NEW from SS-16). For any future enumeration-based verdict: state the patterns searched + report scope as "no hits within [patterns]" rather than "no hits anywhere."
- Experimental artifacts stay on experiment branches; canonical specs on `main` amended only via deliberate commits with explicit provenance.
- **No push to origin** — comparison-phase analysis runs before push.

## Blindness boundary

The autonomous-run output on `experiments/B-pc3-full` is OUT OF SCOPE for this session. Do not read autonomous-run files, do not git-checkout into the worktree at `D:/WebDev/FringeIsland-experiment-B/`, do not reference autonomous-run substance. Comparison-phase is a separate future session.

## After Step 3 lands

Author session bridge `docs/planning/sessions/YYYY-MM-DD_NN_-_PC3-STEP3-LANDED.md` (filename per date convention; NN sequenced per same-day bridge count; pattern parallel to STEP1-LANDED + STEP2-LANDED). Bridge body explicitly notes **PC-3 Organisation L1→L3 derivation completes at Step 3 close** (entity derivation finishes; PC-3 implementation via FEAT-PC-* feature specs + code is downstream and not in scope for Phase 2; Phase 2 remains open until PC-4 lands). Matches PC-1 / PC-2 bridge precedent on derivation-completion phrasing.

Bridge records: Step 3 adjudication outcomes; §L3 Step 3 block + §3 / §5 / §6 / §7 / §8 / §L4 amendment substance summary; ADR amendment commits and their provenance citations; pickup lists for PC-4 + DS-* + (deferred) PC-1 / PC-2 amendment-list candidates; updated A-candidate ledger (#1-#9 final status at PC-3 close); tripwires status; repo state; discipline posture for PC-4 entry.

**Commit shape at Step 3 close: 5 commits** expected per PC-2 precedent + Experiment A discipline:
- (i) **Spec amendment commit** — combined §L3 Step 3 block + §3 / §5 / §6 / §7 / §8 / §L4 amendments (single commit per PC-2 precedent of combining L3 derivation + cross-section spec amendments).
- (ii) **ADR-U006 amendment commit** (separate; explicit provenance citing PC-3 §L3 Step 2 disk anchors at commit `255219d`).
- (iii) **ADR-U007 amendment commit** (separate; explicit provenance).
- (iv) **ADR-U018 amendment commit** (separate; explicit provenance).
- (v) **Bridge commit**.

No push.

Phase 2 close-out arrives after PC-4 lands. At that point: (a) revisit P1 four-mode + P11 archeology cluster with PC-4 evidence (DevOps-tier deployability concern with two entities' worth of evidence); (b) revisit PW-1 / A-candidate-#4 promotion to named program-level pattern; (c) decide on A-candidates #8 / #9 named-program-pattern promotion if recurrence at PC-4; (d) revisit X5 two-tier centralization decision with PC-4 admin-surface evidence; (e) fitness-check three-day turnaround at phase level; (f) decide on `ecosystem-decomposition` skill update for stress-test pattern + cumulative-forward read order + framework-provided contract mechanism awareness; (g) comparison-phase analysis of Experiment B (manual vs autonomous run on PC-3) → post-Experiment-B work items including OLDFEAT reconciliation + PC-2 Q6 amendment list.
