# Session bridge: 2026-05-14 (1) — PC-3 Organisation Step 3 spec + ADR-U006 landed; ADR-U007 + ADR-U018 + closing bridge deferred to successor session

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-14 (first bridge of 2026-05-14)
**Session type:** L-level architectural commit batch. Phase 2 entity 3 Step 3 split-session (3 of 5 planned commits landed; 2 ADR amendments + closing bridge deferred to successor session by deliberate disposition).
**Position in PC-3 sequence:** Mid-Step-3 split. Predecessors `2026-05-13_01` (Step 1 landed) + `2026-05-13_02` (Step 2 landed). Successor will close out Step 3 + author the `PC3-STEP3-LANDED` bridge.
**Chronological predecessor:** `2026-05-13_02_-_PC3-STEP2-LANDED.md`.
**Substantive predecessors:** Same chain as Step 1 + 2 sessions (Experiment B restart + Experiment A + PC-2 + PC-1 bridges).

---

## State at break

- Branch `main`, ahead of `origin/main` by 9 commits.
- Tip: `edf72d3` — ADR-U006 amendment.
- Commits this session: `1ee9acc` (PC-3 spec amendment — §L3 Step 3 + §3 / §5 / §6 / §7 / §8 / §L4 + Sources-status SS-17 / SS-18 / SS-19 / SS-20); `edf72d3` (ADR-U006 amendment — Implementation commitments PC-3 Step 3 Q8).
- Working tree: `CLAUDE.md` modified-unstaged (pre-existing context-mode carry-forward; outside experiment scope; carried across sessions).
- No push to origin per Experiment B comparison-phase disposition.

## What's done (Tasks #1 / #2 / #3)

- **Task #1 — §8 Q1-Q9 adjudication.** Q1-Q10 final after Q-numbering corrective batch; Q6 deferred to post-Experiment-B per Experiment A bridge.
- **Task #2 — spec amendment commit `1ee9acc`.** 24 spec Edits across 7 regions + parent Sources-status block. §L3 Step 3 block authored (Q1-Q10 adjudication + 4 pickup lists + closure summary); §3 PostgREST RPC contract category added; §5 ADR-U018 narrowing + permission registry SS-18 framing + system-group seeding sites; §6 signature-partition reframe + split-by-context rename + supervised-bypass sub-section; §7 PW-2 retraction + three-justification design rule; §8 transformed (Status-tags + Q9 + Q10 added); §L4 Step-3-settled reconciliation; §L3 L251 PW-2 framing reframed; SS-17 / SS-18 / SS-19 / SS-20 appended.
- **Task #3 — ADR-U006 amendment commit `edf72d3`.** Append-only Option A; new "Implementation commitments (PC-3 Step 3 amendment, 2026-05-14)" section between Consequences and Links carrying three-component scope (FK direction + immutability + supervised-bypass) + two refinements (intentional-override-of-§4-chain in (a); SQL-only scope + per-transaction lifecycle in (c)). Disk anchors verified pre-emission: rebuild L102, fix_rc7 L514 + L601.

## What remains (Tasks #4 / #5 / #6)

- **Task #4 — ADR-U007 amendment.** Scope: (i) signature correction `has_permission(p_acting_group_id UUID, p_context_group_id UUID, p_permission_name TEXT) → boolean`; (ii) Tier-1 / Tier-2 composition documentation; (iii) sentinel-UUID Tier-1-only calling convention; (iv) literal-NULL Tier-1-only calling convention (both PC-3-canonical idioms with identical semantics; no migration planned); (v) count + category-count corrections per SS-18 three-source hierarchy (cold-position "31 across 7 categories" reframed to point-in-time-from-source-(i); 44 keys / 6 categories at this commit per `lib/constants/permissions.ts`).
- **Task #5 — ADR-U018 amendment.** Scope: three-distinction narrowing codified explicitly: (a) typed group entities vs `group_type` discriminator column; (b) typing vs entity-state; (c) typing vs growth-vocabulary. Disk anchors: rebuild L87; `add_display_name_system` L22; `sprint1_foundation_schema` L24. Framing: clarification-of-intent, not contraction.
- **Task #6 — closing bridge `2026-05-14_NN_-_PC3-STEP3-LANDED.md` (successor session).** Records PC-3 Organisation L1→L3 derivation completes at Step 3 close; pickup lists for PC-4 + DS-* + deferred PC-1 / PC-2 amendment candidates; updated A-candidate ledger (#1-#9 final status at PC-3 close); tripwires status; A#5 promotion-watch ratification status; discipline posture for PC-4 entry; comparison-phase analysis carry-forward.

## Load-bearing context for re-entry

- **Spec at `docs/platform/core/organisation-specification.md` (commit `1ee9acc`)** is the authoritative source for both pending ADR amendments. ADR-U007 amendment scope sourced from §L3 Step 3 Q2 + §6 `has_permission()` sub-section; ADR-U018 amendment scope sourced from §L3 Step 3 Q9 + §5 ADR-U018 narrowing paragraph.
- **Both ADR amendments follow ADR-U006 precedent** (append-only Option A): new "Implementation commitments (PC-3 Step 3 amendment, 2026-05-14)" section before Links; Date meta line gains 2026-05-14 amendment entry.
- **Disk anchors pre-verified at spec commit `1ee9acc`**; ADR amendment text can cite directly without fresh disk-reads.
- **Closing bridge content** synthesizable from spec commit `1ee9acc` + this bridge + the A-candidate ledger snapshot below.

## Disciplines carry-forward

- Bouncing-partner cycle (manual-run side only).
- Surface-draft + candidate ledger + tripwires armed.
- Sub-batch-of-1 multi-Edit cadence (durable; held throughout this session's 26 Edits across 2 commits).
- Print-batch-before-gate at L-level surface drafts (durable).
- Tripwire #4 disk-of-record verification (with two new sub-shape extensions this session — see Methodology data points).
- In-commit-consistency discipline (fix inconsistencies introduced by an Edit in the same commit, not deferred to doc-health-check).
- Forward-only Q-numbering correction discipline (prior commits carry their own provenance).
- Structural-inventory-before-defect-assertion (A#7).
- Enumeration-claim-scoping (SS-16 + SS-17 sub-shapes A / B).
- Experimental artifacts on experiment branches; canonical specs on `main` via deliberate provenance-citing commits.
- No push to origin per Experiment B comparison-phase disposition.

## A-candidate ledger snapshot

- **#1-#4**: carrying from prior bridges (unchanged status).
- **#5 multi-Edit gate emission discipline**: promotion-watch armed; sub-batch-of-1 cadence held throughout 26 Edits this session — no emission failures. Significant stability evidence accumulated; ratification candidate at PC-4 entry.
- **#6 cold-derivation-with-priors as methodology variant**: promotion-watch armed; not exercised this session (post-cold-derivation).
- **#7 tool-payload verification distinction — structural-inventory-before-defect-assertion**: held throughout (multiple structural-inventory checks during draft-time; two recount catches in §L3 Step 3 block draft confirmed mitigation works as intended).
- **#8 single-migration-snapshot vs cumulative-forward read order**: RATIFIED at PC-3 Step 2; carrying forward.
- **#9 framework-provided contract mechanisms invisible to cold derivation**: promotion-watch armed; PW-2 retraction (PostgREST RPC) confirmed at full disk anchor + spec §3 / §7 / §8 amendment this session.

## Methodology data points (Tripwire #4 sub-cases + SS-20)

- **SS-17 sub-shape A** (verdict-scope generalization): Step 2.6 features Glob — verdict text overclaimed beyond patterns searched.
- **SS-17 sub-shape B** (pattern-variant blindness): Step 3 Read 2 — `INSERT INTO public.permissions` grep missed `INSERT INTO permissions` without schema qualifier; retroactive correction at SS-17 + SS-18.
- **SS-20 Q-numbering drift discovery**: §8 disk Q-numbering diverged from §L3 Step 2 block C-refs (committed at `255219d`, drift originated earlier); surfaced at Edit #6 entry via Tripwire #4 cross-section fresh-read; forward-only correction at Edits 6.5.a..d.
- **In-session Tripwire #4 sub-case (Edit 4c)**: cross-section anchor confusion (§3 "One PC-2-side column" heading conflated with §5 `personal_group_id` paragraph header); re-read corrected before emission.
- **In-session Tripwire #4 sub-case (Edit 6.5.a)**: oldText stale-context recovery; in-context memory of prior Edit emission diverged from disk content; second-touch Edits on previously-emitted content now require fresh disk-read before constructing oldText.
- **In-commit-consistency discipline pattern** (Edits 7.a / 7.c.ii / 7.d / 8.a): inconsistencies introduced by an Edit fixed in the same commit batch when detected pre-commit; not deferred to doc-health-check. Distinct from forward-only correction (which applies to drift discovered after the fact).

## Successor session entry plan

- State-read at session-open: this bridge + verification against disk per Tripwire #4. Specifically: branch `main`; tip `edf72d3` (or later); spec at commit `1ee9acc`; ADR-U006 amended; ADR-U007 + ADR-U018 NOT yet amended; `CLAUDE.md` still modified-unstaged.
- Optional re-entry shortcut: read PC-3 spec §L3 Step 3 Q2 + Q9 + §6 + §5 ADR-U018 narrowing paragraph — sufficient to reconstruct Task #4 + Task #5 scope without re-reading session history.
- Tasks #4 + #5 + #6 to land in successor session per stated scope above. Expected commit count: 3 (ADR-U007 + ADR-U018 + closing bridge).
- Discipline posture: same as this session (continued; no changes).
- No open adjudication carried into successor session; entry is clear.
