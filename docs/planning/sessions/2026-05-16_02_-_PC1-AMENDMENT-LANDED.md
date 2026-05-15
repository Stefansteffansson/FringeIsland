# Session bridge: 2026-05-16 (2) — PC-1 Infrastructure amendment complete

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-16 (second bridge of 2026-05-16)
**Session type:** Spec-amendment session. Third instance of the spec-amendment template post-revision (first: PC-2 amendment closing bridge `2026-05-15_01`; second: PC-3 amendment closing bridge `2026-05-15_02`). Third spec-amendment-template instance + third spec-amendment session overall in the Platform Core amendment cycle (PC-2 + PC-3 + PC-1).
**Chronological predecessor:** `2026-05-16_01_-_PC-PHASE-2-CLOSE-OUT-LANDED.md` (commit `8976646`) — Platform Core Phase 2 close-out adjudication landed; routed PC-1 amendment-list pickups (Item 4 Finding #3 reframing + Item 5 Finding #4 two-tier centralization with helper-introduction disposition deferred) to this session.
**Substantive predecessors:** four chronological source bridges spanning twelve days — `2026-05-04_01` (PC-1 entity close, original Finding #3 + Finding #4 framings) + `2026-05-14_02` (PC-3 close, Finding #4 two-tier sharpening + X5 reframe) + `2026-05-15_03` (PC-4 close, Finding #3 codification + Finding #4 PC-4-scope anchor) + `2026-05-16_01` (Phase 2 close-out, routings consolidation + helper-introduction adjudication deferral). Also `2026-05-14_03` (Experiment B comparison-phase) for inherited methodology dispositions.
**Session-opener instance:** `docs/planning/sessions/openers/cc-pc1-amendment.md` (authored at commit `74f8bff`; third instance of `docs/templates/spec-amendment-session.md` post-revision).

---

## Session arc

Single-session execution against per-instance opener `cc-pc1-amendment.md`. All five §1 pre-flight checks passed cleanly at session-open. §2 state-read pass consumed the four chronological source bridges + Experiment B comparison-phase bridge + canonical PC-1 spec at `12897d2` + spec template + sub-tier `docs/platform/core/CLAUDE.md` (entity-level CLAUDE.md does not exist for PC-1; sub-tier is the relevant read) + `docs/planning/sessions/openers/STATUS.md` (PC-1 row confirmed `In flight`). §5a Phase 1 checkpoint surfaced helper-introduction adjudication outcome (route-to-FEAT-PC-*) + 12-row section-touch inventory + Edit cadence plan (sub-batch-of-1; planned 13 Edits). Pattern 2 light-touch posture executed: structured summaries surfaced at §5a / §5b / §5c / §13 checkpoints; proceeded past each without waiting for explicit ratification.

Phase 1 fold-back ran twelve atomic Edits at sub-batch-of-1 cadence: Edit #1 frontmatter housekeeping + Edits #2-#5 Finding #3 audit-write three-pattern codification (4 anchors) + Edits #6-#8 Finding #4 two-tier centralization (3 anchors) + Edits #9-#12 X5 reframe (4 anchors). All twelve via augment-in-place sub-variant (ii) Historical-record entry pattern: original PC-1 derivation-time framings preserved verbatim; bold-labeled trailing sub-clauses appended at each anchor.

Phase 2 ran Edit #13 — `#### Step 3 amendments (PC-1 amendment, 2026-05-16)` sub-section appended under existing pre-template §L3 Step 3 — Adjudication outputs block per (b.i.2) preserve + append disposition. Sub-section carries disposition statement + Q-resolution slate (3 Qs resolved; no new Q opened) + cross-section amendment summary table (13 rows) + pickup list + 3 new Sources-status bullet entries.

Phase 3 confirmed provisional-zero at §5c re-adjudication: Finding #3 three-pattern is implementation discipline not architectural decision (ADR-U007 already amended at PC-3 close `3697732` with four-component scope); Finding #4 two-tier framing is refactoring opportunity within ADR-U023's existing tier shape; X5 reframe sits within ADR-U007's pre-existing three-justification design rule. Zero ADR amendment commits.

Spec amendment commit landed at `96a895c` (1 file changed, 57 insertions, 5 deletions; 13 atomic Edits in single combined Phase 1 + Phase 2 commit per PC-2 amendment precedent). This bridge + STATUS.md row update commits pending.

---

## PC-1 Infrastructure amendment session completes at this commit batch

Explicit closure statement per spec-amendment template §11. Pending findings folded; spec at `docs/platform/core/infrastructure-specification.md` now reflects Finding #3 audit-write three-pattern codification per PC-4 §L3 Step 2 C2-5, Finding #4 two-tier centralization PC-4-scope anchor per PC-4 §L3 Step 2 C3-2 (helper-introduction adjudicated as route-to-FEAT-PC-* feature spec per amendment-no-code default discipline), and X5 two-tier centralization reframe per PC-3 §L3 Step 2 C3-2.

PC-1 + PC-2 + PC-3 amendment trio complete at this commit batch. PC-4 was not amended (provisional-zero at PC-4 close per opener §10). Platform Core spec-amendment cycle closes.

---

## Findings disposition

| Finding | Group | Status | Anchor in amended spec |
|---|---|---|---|
| Finding #3 — Audit-write three-pattern codification | A — Substance reframing (PC-1 entity close + PC-4 close) | **Folded into §3 Trigger conventions + §8 Q3 status + §L3 Step 2 Finding 3 + §L3 Step 3 PC-4 pickup row Finding #3** (4 anchors); §L3 Step 3 amendment-time sub-section Q-resolution slate row Q3; new SS bullet "Audit-write three-pattern codification record" | spec commit `96a895c` lines covering §3 Trigger conventions bullet + §8 Q3 + §L3 Step 2 Finding 3 + §L3 Step 3 PC-4 Governance pickup row Finding #3 |
| Finding #4 — Two-tier centralization within ADR-U023 tier shape | A — Substance reframing (PC-1 entity close + PC-3 close + PC-4 close + Phase 2 close-out) | **Folded into §8 Q4(b) status + §L3 Step 2 Finding 4 + §L3 Step 3 "Items not in any pickup list" Finding #4** (3 anchors); §L3 Step 3 amendment-time sub-section Q-resolution slate row Q4(b); new SS bullet "Two-tier centralization framing record". Helper-introduction substance routed to FEAT-PC-* feature spec (specific ID TBD when authored). | spec commit `96a895c` lines covering §8 Q4 + §L3 Step 2 Finding 4 + §L3 Step 3 "Items not in any pickup list" |
| X5 — Two-tier centralization reframe (service-role escalation pattern) | A — Substance reframing (PC-3 close + Phase 2 close-out) | **Folded into §6 Connection-role conventions + §8 Q5 status + §L3 Step 2 Finding 5 + §L3 Step 3 PC-4 pickup row Finding #5 carry** (4 anchors); §L3 Step 3 amendment-time sub-section Q-resolution slate row Q5 (X5 routed via Finding #4) | spec commit `96a895c` lines covering §6 Connection-role conventions + §8 Q5 + §L3 Step 2 Finding 5 + §L3 Step 3 PC-4 Governance pickup row Finding #5 carry |

All three findings adjudicated as Folded; zero adjudicated as Routed-to-pickup-list (helper-introduction sub-finding routed separately to FEAT-PC-* per amendment-no-code default discipline).

---

## Pickup lists

### To FEAT-PC-* feature spec (specific feature ID TBD when authored)

- **Helper-introduction substance** — `lib/supabase/server.ts` admin-tier helper that would close both Gap A (substrate: service-role client construction) + Gap B (auth-flow plumbing: JWT-verify + profile-resolve chains) at PC-4 simultaneously per Finding #4 PC-4-scope anchor. Touches 5 service-role-using sites for X5 (`lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts` + 3 PC-3-scope sites) + 2 admin-tier sites for Finding #4 (same 2 PC-4-scope sites). Cross-references PC-4 §L3 Step 2 C3-2 + PC-3 §L3 Step 2 C3-2. Receiving FEAT-PC-* spec authoring deferred until product-cycle work prioritises it. Not blocking DS-1 entry.

### Mid-fold-back findings discovered this session

**None.** No new finding surfaced during the twelve Phase 1 augment-in-place Edits or the Phase 2 sub-section append. The three findings + helper-introduction adjudication formed a complete enumeration matching the §8 enumeration's three-finding scope.

### Doc-health-check / opener-authoring lifecycle pickup

- **Opener-disk-state-verify-before-asserting discipline (low priority).** The opener's "PC-1 has no §L3 Step 3 block" wording vs disk reality (the spec DOES have §L3 Step 3 — Adjudication outputs in pre-template form). Disposition (b.i.2) preserve + append still applied correctly, but wording would read more accurately as "no post-template §L3 Step 3 block." Routes to opener-authoring lifecycle (not template revision). Future opener-instance authoring should disk-verify section-presence claims about the spec under amendment.

---

## Source-bridge provenance citations

Four chronological source bridges (the largest source-bridge enumeration of any spec-amendment to date):

- **`2026-05-04_01_-_PC1-L1-L3-COMPLETE.md`** (PC-1 entity close, commit per bridge filename) — original Finding #3 framing ("trigger-as-primitive for audit-log writes" at §8 Q3 + §L3 Step 2 Finding 3); original Finding #4 framing ("Secrets/credentials substrate is app-tier, not database-tier" at §L3 Step 2 Finding 4 with three-destination escalation path: Phase 2 close-out adjudication / candidate ADR / possible tier-shape revision). Both framings preserved verbatim in amendment per augment-in-place sub-variant (ii) Historical-record entry.
- **`2026-05-14_02_-_PC3-STEP3-LANDED.md`** (PC-3 close, commit `172ecd9`) — §L3 Step 2 C3-2 sharpened Finding #4 from "single tier-shape question" to "two-tier substrate + auth-flow plumbing" framing; surfaced X5 anti-pattern at §L3 Step 2 C3-2 (5 service-role-using sites / 6 createClient instances; 3 gating permissions: `invite_members`, `enroll_group_in_journey`, `manage_all_groups`); Pickup lists > Deferred PC-1 amendment candidates section routed both findings as PC-1 amendment candidates at Phase 2 close-out.
- **`2026-05-15_03_-_PC4-LANDED.md`** (PC-4 close) — §L3 Step 2 C2-5 codified Finding #3 audit-write three-pattern (SECURITY DEFINER direct-INSERT × 5 + SECURITY DEFINER trigger-mediated × 2 + anon-key client RLS-gated INSERT × 7 with differing integrity properties; pre-D15 historical evidence at archive `20260220082112`); §L3 Step 2 C3-2 anchored Finding #4 at PC-4 scope (PC-4 contributes 2 of 5 X5 sites: `lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`; concrete centralization opportunity `lib/supabase/server.ts` admin-tier helper would close both Gaps A + B at PC-4 simultaneously).
- **`2026-05-16_01_-_PC-PHASE-2-CLOSE-OUT-LANDED.md`** (Phase 2 close-out, commit `8976646`) — Items 4 + 5 routed both PC-4 findings + the X5 reframe to PC-1 amendment-list with explicit helper-introduction disposition deferral ("write at amendment OR route to FEAT-PC-* feature spec"); reframed `Sequenced: After PC-4 entry` to `After Phase 2 close-out` in STATUS.md per consolidated routing pass.

---

## Methodology data points (third-instance stress-test framing)

**Third-instance verdict: ALL eleven cumulative spec-amendment-template revisions held cleanly.** First instance was PC-2 amendment (7 revisions landed at `70cbd15`); second instance was PC-3 amendment (4 revisions landed in template content per the revision-history table); third instance is this PC-1 amendment session.

### Eleven cumulative revisions exercised cleanly

PC-2 amendment seven revisions:
1. **§3-vs-§9 seam + three sub-variants** — sub-variant (ii) Historical-record entry was load-bearing default for ALL 12 Phase 1 augment-in-place Edits. Bold-labeled trailing sub-clause pattern composed identically across host text shapes as different as a §3 contract bullet, a §6 prose paragraph, an §8 bullet status entry, an §L3 Step 2 finding entry, and an §L3 Step 3 pickup-list table cell. Three-sub-variant catalog earned its place fully.
2. **Augment-in-place shape catalog at §5a** — held at scale across 12 anchors; sentence-level pattern composed mechanically.
3. **Altitude-separation disposition at §5a** — did not fire; no anchor decomposed into multiple altitudes (Finding #4 helper-introduction route-to-FEAT-PC-* adjudication kept the §7-altitude / §L3-altitude separation collapsed into single anchors per finding).
4. **Adjudication-shape findings as §3 sub-class** — Finding #4 helper-introduction adjudication settled cleanly at §5a checkpoint as route-to-FEAT-PC-* per default discipline; pre-named binary made adjudication legible.
5. **Pre-emit announcement first-class at §9** — honored throughout via §5a/§5b/§5c structured surfaces (Pattern 2 light-touch).
6. **Ratified-additions discipline at §5a Edit cadence plan** — final Edit count (13) hit planned 8-15 envelope without mid-run additions; discipline did not need to fire.
7. **§5b (b.i.2) preserve + append as recommended default** — load-bearing for PC-1's pre-template §L3 Step 3 — Adjudication outputs block; existing block preserved verbatim, new sub-section appended cleanly.

PC-3 amendment four revisions:
1. **§1 Check 4 carry-forward enumeration completeness** — caught `cc-execute-prompt.md` carry-forward at §1 alongside `CLAUDE.md`.
2. **§5a frontmatter `last_updated` housekeeping** — Edit #1 landed cleanly as expected; named separation from finding fold-back preserved Edit-count clarity.
3. **§13 checkpoint surfacing as discrete-prompt sub-section** — third-instance application; structural-reflection shape held; closes the compression failure mode where bridge-authoring inlines §13 substance preemptively.
4. **§5a anchor containment disambiguation (lower-priority)** — exercised at 12 anchors; single-paragraph anchor → trailing sub-clause held uniformly; no multi-paragraph cross-spec edge cases fired.

### Third-instance verdict on the four-bridge enumeration concern

Opener concern that "the large source-bridge enumeration (4 chronological bridges) may surface a class of failure mode the smaller PC-2 / PC-3 two-bridge enumerations masked" was **UNREALIZED**. Eleven cumulative revisions handled the four-bridge scale cleanly; no template gap surfaced from enumeration scale. The four bridges were read sequentially per §2 state-read pass, with the temporal ordering (PC-1 close 2026-05-04 → PC-3 close 2026-05-14 → PC-4 close 2026-05-15 → Phase 2 close-out 2026-05-16) framing the substance reframing trajectory legibly. Methodology note for future amendments: source-bridge enumeration may scale further without surfacing class-of-failure.

### Minor friction surfaced (low priority)

- **Opener's "PC-1 has no §L3 Step 3 block" wording vs disk reality.** The spec DOES have §L3 Step 3 — Adjudication outputs in pre-template form (Pickup lists + Items not in any pickup list + Carry-forward to receiving entity authors). Disposition (b.i.2) preserve + append still applied correctly, but wording would read more accurately as "no post-template §L3 Step 3 block." Routes to opener-authoring lifecycle (not template revision). See Pickup lists > Doc-health-check / opener-authoring lifecycle pickup above.

### Third-instance methodology summary

At 11 cumulative revisions + 4 source bridges + 13 atomic Edits, the spec-amendment template's **planning-vs-execution alignment is high**. No template gap surfaced this session. The eleven cumulative revisions appear sufficient through n=3 instances. The minor friction surfaced (opener-instance authoring discipline, not template gap) does not warrant template revision.

---

## Template revision disposition

**NO REVISION PROPOSED.** The eleven cumulative spec-amendment-template revisions held cleanly across this third-instance application. The four-bridge enumeration scale did not surface class-of-failure. The helper-introduction adjudication-shape sub-finding worked as PC-2/PC-3 D3-style adjudications anticipated. The mid-range Edit envelope (13 Edits) sat within planned 8-15 range without ratified-additions discipline needing to fire.

The minor friction surfaced (opener's "PC-1 has no §L3 Step 3 block" wording vs disk reality) is opener-instance authoring discipline, not template discipline; routes to opener-authoring lifecycle rather than template revision.

Brevity rationale: third-instance verdict that template holds cleanly is itself the disposition. Padding with speculative revisions for the sake of writing would dilute the signal.

---

## Carry-forward to next session

Next item per STATUS.md is OLDFEAT reconciliation (anytime; non-blocking) OR DS-1 World Model entry (sequencing decision routes to next session-open per Phase 2 close-out closing bridge).

Carry-forward light:
- **PC-1 amendment-list closes** — three findings folded; helper-introduction routed to FEAT-PC-*; no mid-fold-back findings discovered. PC-1 spec at `96a895c` carries the full amendment-time substance.
- **DS-1 entry inheritance** — DS-1 entry session-opener should NOT carry PC-1 amendment substance as carry-forward priors; the amendment text is in-spec (DS-1 reads the amended PC-1 spec by skill-load). The five Phase 2 close-out skill rules (A#5 + A#8 + A#9 + PW-1 + P-O1) are skill-resident per `e9c8a54` and inherit by skill-load.
- **Helper-introduction substance** — receiving FEAT-PC-* spec authoring deferred until product-cycle work prioritises it; not blocking DS-1 entry. The helper would close X5 + Finding #4 substrate at PC-4 + PC-3 simultaneously when the FEAT-PC-* spec lands.
- **Opener-disk-state-verify-before-asserting discipline (low priority)** — routes to opener-authoring lifecycle; future opener-instance authoring should disk-verify section-presence claims about the spec under amendment.

---

## Tripwires

| # | Description | Status |
|---|---|---|
| 4 | Disk-of-record verification before asserting | ACTIVE — held cleanly throughout. State-read at session-open verified all four source bridges + Experiment B comparison-phase + canonical PC-1 spec + spec template + sub-tier CLAUDE.md + STATUS.md against disk; fresh-read-per-Edit applied at Phase 1 work via in-context spec text from §2 read; no false-positive defect assertions; no oldString-mismatch failures across 13 Edits. |
| 6 | Discipline-as-deferral | NOT FIRING — discipline-stack altitude held throughout. Sub-batch-of-1 cadence preserved at all 13 Edits; no compounding errors. Pattern 2 light-touch posture (surface structured summaries at §5a / §5b / §5c / §13 checkpoints AND proceed past each without waiting for ratification unless hard-fail) held cleanly; no checkpoint required ratification escalation. |

Tripwires #1, #2, #3, #5 — closed in prior bridges; not re-engaged this session.

---

## Repo state at session close

- Branch `main`. Three commits land this session at this bridge authoring point: `96a895c` (spec amendment) + this bridge + STATUS.md update pending. After this bridge + STATUS.md update commits land, branch will be 5 commits ahead of `origin/main` (was 2 at session-open per opener-instance authoring commit `74f8bff` + STATUS.md In-flight commit `97a697a`; +3 this session).
- Pre-existing modified-unstaged carry-forwards: `CLAUDE.md` (context-mode plugin injection; outside scope) and `docs/planning/sessions/openers/cc-execute-prompt.md` (outside scope per opener §1 Check 4 enumeration). Both carried across sessions; not committed this session.
- **No push to origin** per session-opener §10. The user dispositions push as a deliberate next step.

---

## Discipline posture for next session

All durable disciplines remain in effect:

- State-read at session-open per Tripwire #4 disk-of-record verification.
- Verify-before-asserting on commit-shape claims, enumeration scope, cross-section content, and any second-touch Edit.
- No Greek characters as labels (ASCII-only identifiers; hard rule).
- Move-and-correct disposition; first-time-right is not the goal.
- Sub-batch-of-1 multi-Edit cadence default (skill-resident per Phase 2 close-out A#5 promotion at `e9c8a54`).
- Augment-in-place sub-variant (ii) Historical-record entry as durable amendment shape (third-instance ratified at PC-1 amendment).
- (b.i.2) preserve + append as recommended default for amendments to pre-§L3-Step-3-methodology specs (third-instance ratified at PC-1 amendment).
- §13 checkpoint surfacing as discrete-prompt sub-section (third-instance ratified at PC-1 amendment).
- Append-only Option A for ADR amendments (three shape variants precedented at PC-3 amendment).
- In-commit-consistency and forward-only correction.
- Canonical specs on `main` via deliberate provenance-citing commits.
- OLDFEAT blindness invariant carries forward (STATUS.md OLDFEAT reconciliation row still Pending; not adjudicated at PC-1 amendment).
- Iterative way of working — develop what is used in the near future; revise as we go.

---

*End of bridge.*
