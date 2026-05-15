# Session bridge: 2026-05-15 (1) — PC-2 Identity amendment complete; Phase 1 + Phase 2 fold-back; Phase 3 zero ADR commits

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-15 (first bridge of 2026-05-15)
**Session type:** Spec-amendment session close. PC-2 Identity amendment (canonical spec amended; §L3 Step 3 amendment-time block appended; zero ADR amendment commits per §5c provisional-zero stance). Follows `docs/templates/spec-amendment-session.md` template + opener instance `docs/planning/sessions/openers/cc-pc2-amendment.md`.
**Chronological predecessor:** `2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md` (Experiment B comparison-phase bridge).
**Substantive predecessors:** four source bridges named in opener §2 step 1 (PC-2 entity bridge `2026-05-04_02`; Experiment A close `2026-05-04_03`; PC-3 closing bridge `2026-05-14_02`; Experiment B comparison-phase bridge `2026-05-14_03`).

---

## Session arc

State-read at session-open verified all five pre-flight checks (working directory; branch `main`; tip commit `8545204` at-or-after `fb5c20b`; working tree state with named carry-forwards only; spec at expected commit `0565d65`). State-read pass confirmed source-bridge provenance with no drift from opener §8 enumeration. Phase 1 ran **26 atomic Edits across §2/§3/§5/§6/§8/§L3** under sub-batch-of-1 multi-Edit cadence with pre-emit + fresh-read + gate per Edit. Phase 2 ran **1 Edit** appending the §L3 Step 3 amendment-time block per **(b.i.2) preserve + append** disposition ratified at §5b checkpoint. Phase 3 zero ADR amendment commits per **§5c provisional-zero stance** ratified after per-finding re-adjudication. Single combined Phase 1+2 spec amendment commit landed at **`53fe0a2`**. The §3-scope-locked / §9-in-commit-consistency seam fired four times during the run — three structural sub-variants (currently-asserted prose, historical-record entry, table-cell parallel anchors) captured as §L3 Step 3 amendment-time block SS-1 and routed to template revision proposal at this closing.

---

## PC-2 Identity amendment session completes at this commit batch

Explicit closure statement per opener §11. Pending findings folded; spec at `docs/platform/core/identity-specification.md` now reflects: **Group A material substance corrections** (D1+X2 actor primitive, D2 FK target inversion, D4 attribute set); **Group B substantive content adds** (C1.6 account lifecycle, X3 has_permission signature closed-pre-amendment cite, X4 consent/GDPR substrate latent, X5 service-role escalation reframe at two altitudes); **Group C methodology observations** (P-O1 canonical instance, D7 closure cite-for-traceability, P-O4 closing-bridge methodology); **additional findings** from PC-3 closing-bridge §Pickup-lists (PC-3 §8 Q6 display-name coupling routed to §2/§3/§5/§8 Q9) + Experiment B comparison-phase divergence (D3 multi-role memberships — no PC-2-relevant slice, pickup-listed to PC-4 / Phase 2 close-out).

---

## Load-bearing output

**Single combined spec amendment commit `53fe0a2`** lands the full Phase 1 + Phase 2 substance per PC-3 spec-amendment commit precedent. Substance:

- **Phase 1 (26 Edits):** §2 (4 Edits — Profile attribute set + display-name attributes + Authenticated context actor-primitive + user_id contract surface FK target); §3 (4 Edits — Surface shape actor-primitive bullets + Schema-level contracts FK target + Operation `updateProfile` Column scope + new `#### Service-role escalation and the contract surface` sub-section); §5 (5 Edits — `public.users` resolution-hub framing + `auth.users` substrate inversion + Account-lifecycle admin artifacts bullet + Display-name sync bullet + Role-name canonicalization D7 cite-for-traceability); §6 (4 Edits — PC-1/PC-2 partition actor-primitive reframe + PC-2/PC-3 partition has_permission paragraph + sub-tier CLAUDE.md migration note + new `**Service-role escalation and the actor-primitive resolution chain.**` sub-section); §8 (4 Edits — Q7 status update + Q3 augment-in-place + new Q8 X4 consent + new Q9 PC-3 Q6 sync-trigger); §L3 (5 Edits — Authenticated-context publication actor-primitive cell + 3 Privacy cells X4 sweep + Administration cell C1.6 cite).

- **Phase 2 (1 Edit):** `#### Step 3 amendments (PC-2 amendment, 2026-05-15)` sub-section appended under the existing `### Step 3 — Adjudication outputs` block. Block contains: Disposition statement; Q-resolution slate cross-reference to §8; Cross-section amendment summary table (12 finding rows); Pickup list; Sources-status block with SS-1 through SS-5 seeded fresh.

- **Phase 3 (0 commits):** Per §5c provisional-zero stance ratification. ADR-U006 / ADR-U007 / ADR-U018 already post-PC-3-close. Two TBD findings re-adjudicated: X4 consent/GDPR routes to Privacy vertical spec; PC-3 Q6 sync-trigger routes to PC-2 FEAT-level work post-sync-trigger disposition. Neither warrants a PC-2 amendment-time ADR commitment.

---

## Findings disposition table

| Finding | Group | Status | Anchor in amended spec |
|---|---|---|---|
| **D1+X2** actor primitive | A (material substance correction) | Folded into §2 + §3 + §5 + §6 + §L3 | §2 (Edit 2.3) + §3 (Edit 3.1) + §5 (Edit 5.1) + §6 (Edit 6.1) + §L3 (Edit L3.1); commit `53fe0a2` |
| **D2** FK target | A | Folded into §2 + §3 + §5 | §2 (Edit 2.4) + §3 (Edit 3.2) + §5 (Edit 5.2); commit `53fe0a2` |
| **D4** attribute set | A | Folded into §2 | §2 (Edit 2.1); commit `53fe0a2` |
| **C1.6** account lifecycle | B (substantive content add) | Folded into §5 + §8 Q7 + §L3 | §5 (Edit 5.3) + §8 Q7 (Edit 8.1) + §L3 (Edit L3.2d); commit `53fe0a2` |
| **X3** has_permission signature | B | Closed-pre-amendment; cite-for-traceability | §6 (Edit 6.2); commit `53fe0a2`; upstream-closure citation: ADR-U007 §(a) post-amendment commit `3697732` |
| **X4** consent/GDPR substrate | B | Folded into §8 Q8 + §L3 Privacy cells ×3 | §8 Q8 new (Edit 8.2) + §L3 (Edits L3.2a/b/c); commit `53fe0a2` |
| **X5 reframe** service-role escalation | B | Folded into §3 + §6 (disposition (c) two altitudes) | §3 (Edit 3.4 contract-surface altitude) + §6 (Edit 6.4 chain-mechanics altitude); commit `53fe0a2` |
| **P-O1** Supabase-canonical drift | C (methodology) | Informational-active prior recorded at §L3 SS-5; inline cited at actor-primitive Edits | Inline at §3 (Edit 3.1) + §5 (Edit 5.1) + §6 (Edit 6.1) + §L3 (Edit L3.1) + §L3 SS-5; commit `53fe0a2` |
| **D7** role-name vocabulary | C | Closed-pre-amendment; cite-for-traceability | §5 (Edit 5.5) + §6 (Edit 6.3) + §8 Q3 augment-in-place (Edit 8.1.5); commit `53fe0a2`; upstream-closure citation: PC-3 close vocabulary migration |
| **P-O4** convergent-derivation methodology | C | Informational-active prior; closing-bridge methodology data point only | This bridge §Methodology data points |
| **PC-3 §8 Q6** display-name coupling | Additional | Folded into §2 + §3 + §5 + §8 Q9 | §2 (Edit 2.2) + §3 (Edit 3.3) + §5 (Edit 5.4) + §8 Q9 new (Edit 8.3); commit `53fe0a2` |
| **Experiment B D3** multi-role | Additional | Pickup-listed to PC-4 / Phase 2 close-out (no PC-2-relevant slice per §5a adjudication) | §L3 Step 3 amendment-time block pickup list; this bridge §Pickup lists |

---

## Pickup lists

### PC-4 Governance / Phase 2 close-out

- **Experiment B D3 multi-role memberships.** Autonomous-track Step 2 evidence (`user_group_roles` junction with composite PK supporting multi-role-per-membership). PC-2 contract surface (`user_id` + authenticated-context handoff + actor-primitive resolution chain) is independent of multi-role-per-membership per §5a adjudication. Route to PC-4 / Phase 2 close-out for cross-entity contract clarification per opener §8 D3 default disposition + Experiment B comparison-phase disposition #1.

### PC-1 amendment housekeeping

- **§L3 capabilities table "Role-name vocabulary canonicalization" row pre-existing inconsistency.** Row exists in capability table though removed from §2/§5/§6 substance via D7 closure at PC-3 close. Disk anchor: §L3 capabilities table row at the post-Phase-1 line where it sits. Out of §8 enumeration scope; surfaced as discovered-mid-fold-back finding at §5a checkpoint; routed for PC-1 amendment housekeeping or doc-health-check pickup.

### doc-health-check pickups

- **§L3 capabilities table "Role-name vocabulary canonicalization" row** (alternative receiving channel for the PC-1 housekeeping item above).
- **Sub-tier `docs/platform/core/CLAUDE.md` "Where to go next" anticipatory language stale-bullet** — already in doc-health-check pickup queue per PC-3 closing bridge Gate-2 stale-bullet disposition. Continuing forward; not blocking.

### Program-level methodology

- **P-O1 strongly-confirmed-systematic-bias promotion at Phase 2 close-out** — captured at §L3 SS-5 in spec; ratified as named program-level pattern at Phase 2 close-out (after PC-4 lands) per Experiment B comparison-phase disposition #3.
- **P-O4 convergent-derivation methodology** — Group C methodology observation per §13 capture; routes to program-level methodology notes; no spec touch.

---

## Source-bridge provenance citations

Per opener §11 mandatory provenance discipline. Every source bridge consumed during this amendment + the section of each bridge that carried the folded findings:

- **`docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`** — PC-2 entity bridge; the spec's original derivation close at commit `0565d65`. Sections consumed: §L3 Step 3 carry-forwards (baseline context for amendment scope); §Tripwires (held throughout).
- **`docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md`** — Experiment A close bridge. Sections consumed: §Group A material substance corrections (D1+X2, D2, D4 — items 1–3); §Group B substantive content adds (C1.6, X3, X4, X5 — items 4–7); §Group C methodology / pattern observations (P-O1, D7, P-O4 — items 8–10). Load-bearing for §8 enumeration in opener instance.
- **`docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md`** — PC-3 closing bridge. Sections consumed: §Pickup-lists "Deferred PC-2 amendment candidates → Q6 PC-2 amendment carry-forward" (PC-3 §8 Q6 routing); §Pickup-lists "Deferred PC-1 amendment candidates → Finding #4 two-tier centralization / X5 anti-pattern scope" (X5 reframe routing to PC-1 amendment). Plus ADR-U006 amendment commit `edf72d3` cited at §3 / §5 / §6 / §L3 fold-back substance; ADR-U007 amendment commit `3697732` cited at §6 X3 closed-pre-amendment cite-for-traceability + §6 sentinel-UUID/literal-NULL calling conventions; ADR-U018 amendment commit `dd84a02` cited at §5 system-group flavor framing.
- **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge. Sections consumed: §Substance findings — divergence item 1 + disposition #1 (D3 multi-role memberships PC-2-relevance adjudication); §Methodology findings — disposition #3 (P-O1 STRONGLY CONFIRMED systematic bias promotion).

---

## Methodology data points

Bridge-prose observations from §13 post-run methodology capture, at closing-bridge altitude. The substance is also captured in spec §L3 Step 3 amendment-time block as SS-1 through SS-5; the bridge-prose framing here is for program-level retrospection.

**Four-instance §3-scope-locked / §9-in-commit-consistency seam (most consequential template gap).** The spec-amendment template's §3 scope-locked discipline (fold only enumerated findings; do not reach for fresh disk evidence outside scope) and §9 in-commit-consistency discipline (fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit) have an underspecified seam: when a §8-out-of-scope finding is structurally identical to a §8-in-scope finding (same closure event, same prior, disk evidence already at §2 state-read), the discipline is ambiguous between "out-of-scope per §3" and "fix-in-batch per §9." Three structural sub-variants surfaced at PC-2 amendment:
- **(i) currently-asserted prose** — §5 Role-name canonicalization bullet "needs revision" claim (Edit 5.5) + §6 PC-2/PC-3 partition has_permission paragraph trailing sentence (Edit 6.3) — clear §9 application.
- **(ii) historical-record entry** — §8 Q3 disposition text "needs revision" within a Step 3 adjudication record (Edit 8.1.5 augment-in-place) — ambiguous between current-assertion and historical-record reading; resolved via augment-in-place.
- **(iii) table-cell parallel anchors** — §L3 X4 Privacy cells across three rows (Edits L3.2a/b/c) — one cell update *introduces* contradiction at sibling cells, firing §9 strongly.

**Augment-in-place shape (preserve original + append amendment-time addendum).** Phase 1 surfaced a discipline shape: where an amendment touches text whose original form was load-bearing or historically meaningful (Step 3 disposition records, vertical impact cells with design-intent assertions), preserve the original verbatim and append a bold-labeled or em-dash-marked amendment-time addendum rather than replacing in-place. Used at sentence-level (Edits 8.1.5, L3.2a/b/c/d) and section-level (Edit P2.1 — the §L3 Step 3 amendment-time block itself preserving the existing Step 3 — Adjudication outputs as historical record). Avoids erasing derivation-time intent + makes amendment-time scope visually distinct for spec readers.

**X5 disposition (c) two-altitude separation.** Service-role escalation surfaced as a single source-bridge finding (X5 + PC-3 §L3 Step 2 C3-2 reframe), but two structurally different questions emerged at fold-back: (i) what does escalation **bypass** at PC-2's published contract surface, and (ii) what does the bypass **do to the actor-primitive resolution chain**. Disposition (c) split into two paragraphs at different altitudes (§3 contract-surface + §6 chain-mechanics); style asymmetry preserves each section's existing internal convention (§3 `####` sub-sections; §6 bold-paragraph-header sub-sections). Bidirectional cross-refs link the two altitudes. Precedent for future amendment-fold-backs where a single finding has multiple distinct §-relevant questions.

**D3 PC-2-relevance adjudication shape (adjudicate-then-route at §5a checkpoint).** Experiment B D3 multi-role memberships surfaced as a substance finding requiring adjudication of "does this slice apply to PC-2?" — distinct from substance corrections that fold automatically. §5a adjudicated *no PC-2-relevant slice* with explicit rationale; routed to PC-4 / Phase 2 close-out pickup. Discipline shape: adjudicate-then-route at the §5a checkpoint for findings carrying relevance-determination shape, rather than treating them as default fold-back substance.

**P-O1 strongly-confirmed-systematic-bias instance at PC-2.** Group C P-O1 promoted to "STRONGLY CONFIRMED systematic bias" per Experiment B comparison-phase disposition #3. PC-2 amendment is the canonical instance — P-O1 fired at every actor-primitive Edit. All four actor-primitive-touching Edits preserved the substrate-identifier-vs-actor-primitive distinction explicitly. Program-level pattern promotion candidate at Phase 2 close-out (after PC-4 lands).

**Pre-emit + fresh-read + gate discipline held throughout 27 atomic Edits.** Sub-batch-of-1 multi-Edit cadence was the only viable cadence given line-shift volatility (Phase 1 added ~25 lines across the run; line numbers shifted multiple times). Worth promoting pre-emit (currently cross-referenced to PC-2 derivation memory) to first-class template §9 item.

**Edit count drift handled at gates without re-checkpoint.** Plan was 18 Edits at §5a; final was 27 (+1 Edit 5.5 D7 parallel; +1 Edit 8.1.5 Q3 augment; +3 L3.2 split into 4 sub-Edits). All additions ratified at the next gate after detection. Template's §5a Edit cadence plan section doesn't have an explicit slot for ratified additions surfaced mid-run; worth naming as discipline ("ratified additions surface at the next gate after detection, not held for batched re-checkpoint").

---

## Tripwires

| # | Description | Status |
|---|---|---|
| 4 | Disk-of-record verification before asserting | ACTIVE — held throughout. Fired at the C2-1 anchor convention misframe (Edit 2.1 gate): draft asserted PC-2 used F-Q-only anchors; disk evidence showed C-style + F-Q both in use; correction landed before Edit. Fresh-read-before-every-Edit held across all 27 atomic Edits; each Edit's anchor freshly verified despite ~25-line shifts across Phase 1. |
| 6 | Discipline-as-deferral | NOT FIRING — discipline-stack altitude held throughout 27 atomic Edits. Sub-batch-of-1 cadence preserved at all gates; no compounding errors. |

Tripwires #1, #2, #3, #5 — closed in prior bridges; not re-engaged this session.

---

## Repo state at session close

- Branch `main`. After this bridge lands as the second commit of the session, branch will be at +6 commits from `origin/main` (was +4 at session-open per §1 check 1; +1 spec amendment `53fe0a2`; +1 this bridge pending). STATUS.md amendment commit will land as the third commit of the session (separate per opener §10), bringing the branch to +7.
- Working tree: `CLAUDE.md` modified-unstaged (pre-existing carry-forward across sessions; outside amendment scope per opener §10); `docs/planning/sessions/openers/cc-execute-prompt.md` modified-unstaged (named carry-forward per opener §1 check 4).
- **No push to origin** at session close per opener §10 path convention.

---

## Template revision disposition

**REVISION PROPOSED.** Seven revision candidates surfaced from §13 capture, ordered by template-gap severity:

1. **§3 / §9 seam discussion + decision-tree + shape variant catalog.** The most consequential template gap. Template should add explicit discussion of when an out-of-scope-per-§3 finding is structurally identical to an in-scope finding, with a decision-tree and the three structural sub-variants (currently-asserted prose / historical-record entry / table-cell parallel anchors). Routes to `docs/templates/spec-amendment-session.md` §3 and §9 amendments.
2. **Augment-in-place shape catalog in §5a.** Template's §5a names "inline-fold canonical, not preserved-as-cold" but doesn't name the augment-in-place sub-shape (preserve original verbatim + append amendment-time addendum). Add as named shape alongside inline-fold.
3. **Disposition (c) altitude-separation as a recognized disposition in §5a section-touch inventory.** Template should explicitly name "altitude-separation for findings with multiple §-relevant questions" alongside the standard one-Edit-per-section-per-finding pattern.
4. **Adjudication-shape findings as a sub-class of §3 scope-locked.** Template §3 names "findings outside enumerated scope" but doesn't name the adjudication-shape sub-class (findings requiring relevance-determination before fold-back substance — adjudicate-then-route at §5a).
5. **Pre-emit discipline named first-class in §9.** Currently cross-referenced to PC-2 derivation memory; promote to first-class.
6. **Ratified-additions discipline in §5a Edit cadence plan section.** Surface mid-run additions at next gate; do not batch for re-checkpoint.
7. **§5b sub-disposition #2 default (b.i.2 preserve + append) — smallest scope; eliminates ad-hoc §5b adjudication for the common case.**

**Routing:** spec-amendment-session template revision proposal at the next opportunity — either next amendment opener authoring (PC-1 amendment), or a dedicated template revision session. The Revision history table at the top of `docs/templates/spec-amendment-session.md` should record this proposal when the revision lands. No revision authored in this session; this is the proposal record.

---

## Carry-forward to next amendment session (PC-1)

Light. PC-1 amendment inherits the standard template + the template revision proposal above; cross-amendment findings routed at this PC-2 close:

- **X5 anti-pattern scope** — PC-1 amendment STATUS.md `Pending findings` column already names this from PC-3 closing-bridge §Pickup-lists "Deferred PC-1 amendment candidates". PC-2 amendment's §3 (Edit 3.4) + §6 (Edit 6.4) added the identity-boundary slice with explicit forward-reference to PC-1 amendment for primary remediation (substrate factoring + auth-flow centralization). No new PC-1 carry-forward beyond what STATUS.md already names.
- **§L3 Role-name vocabulary canonicalization row pre-existing inconsistency** (item #4 in §13 prompt #3) — PC-1 amendment housekeeping candidate, or doc-health-check pickup. Either channel acceptable.
- **Template revision proposal** (above) — to surface when PC-1 amendment opener instance is authored, or earlier if dedicated template revision session is scheduled before PC-1 amendment opens.

---

*End of bridge.*
