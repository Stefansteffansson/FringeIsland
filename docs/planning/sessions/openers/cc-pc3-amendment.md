# Spec-amendment session-opener — `PC-3 Organisation amendment`

**Template path:** `docs/templates/spec-amendment-session.md`
**Instance landing path:** `docs/planning/sessions/openers/cc-pc3-amendment.md`
**Substituted from template at:** commit `70cbd15` (spec-amendment template revision landing seven revisions from the PC-2 amendment closing bridge).
**Instance authored:** 2026-05-15 (this is the **second instance** of the spec-amendment template post-revision; the first was `cc-pc2-amendment.md`. §13 post-run capture is expected to carry a stress-test framing distinct from PC-2's first-instance §13.)
**Spec under amendment:** `docs/platform/core/organisation-specification.md` (PC-3 Organisation).

> Per-instance session-opener for the PC-3 Organisation amendment session. Folds three enumerated findings (D3 multi-role memberships adjudication; P-O1 promotion citation; SS-11 status update) from the Experiment B comparison-phase bridge into the canonical PC-3 spec. Scope is small relative to PC-2 amendment (3 findings vs 12); estimated 3–8 atomic Edits per finding-shape analysis. Phase 3 provisional-zero (ratified at §5c after Phase 1+2 land).

---

## §1 Pre-flight checks — STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `06c88bc` (STATUS.md pipeline correction adding PC-3 amendment as `Next`, landed 2026-05-15 morning). Hard-fail if tip is earlier.
4. **Working tree state.** Run `git status`. Expected: `CLAUDE.md` modified-unstaged (pre-existing across sessions; outside scope; acceptable). No untracked files in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `docs/platform/core/` (the spec's parent directory). Hard-fail on any other modification or untracked file.
5. **Spec at expected state.** Run `git log --oneline -1 -- docs/platform/core/organisation-specification.md`. Expected: most-recent-touch is commit `1ee9acc` (the §L3 Step 3 spec amendment landing PC-3's adjudication outputs). The two subsequent PC-3-close commits — `3697732` (ADR-U007 amendment) and `dd84a02` (ADR-U018 amendment) — did NOT touch the spec; nor did `b6575e6` (Experiment B comparison-phase bridge) or any of the 2026-05-15 commits (PC-2 amendment + template revision + STATUS.md pipeline correction). Hard-fail if the spec's most-recent-touch commit is anything other than `1ee9acc` — that case requires the human to adjudicate whether the three pending findings still apply as enumerated, or whether some have been folded already.

After all five pass, report each check's outcome and proceed to §2.

---

## §2 State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

**Note on dual-role bridges.** The PC-3 closing bridge (`2026-05-14_02_-_PC3-STEP3-LANDED.md`) plays a dual role for this amendment: (i) work-shape precedent per the template's default frame, AND (ii) substantive predecessor for the spec being amended (PC-3's own closing bridge). The Experiment B comparison-phase bridge (`2026-05-14_03_-_…`) is the load-bearing finding-enumeration source. Read both at Read 1 with that dual role explicit; do not re-read at the template's separate "Read 3" position.

1. **Source bridges** in chronological order, then the Experiment B bridge as the primary finding-enumeration source:
   - `docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md` — chronologically first; PC-3 closing bridge; carries the spec's commit-state baseline at close (`1ee9acc` spec + `edf72d3`/`3697732`/`dd84a02` ADR amendments) AND the work-shape precedent (three-phase amendment shape mirrors PC-3 §L3 Step 3).
   - `docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md` — load-bearing for finding enumeration. §Substance findings #1 (D3 multi-role memberships), §Methodology findings (P-O1 promotion observation), §Dispositions #3 (P-O1 program-level promotion routing) and §Dispositions #4 (A-candidate #9 framework-mechanisms convergent evidence) are the three findings' provenance anchors. The §8 `FINDINGS-ENUMERATION-BLOCK` below transcribes against these specific sections.

2. **`docs/platform/core/organisation-specification.md`** — fresh-read the canonical spec in full. This is the artifact being amended; its current §1–§8 + §L3 (Capabilities + Dependency chain + External dependencies + Sources-status + Step 2 + Step 3) + §L4 content is the baseline against which fold-back amendments compose. The spec is sizable (post-§L3-Step-3 canonical output); full read is non-trivial but the template requires it for fold-back fidelity.

3. **`docs/templates/platform-core-spec.md`** — the template the spec was originally derived against. Load-bearing for cross-section fresh-reads at §6 self-checking discipline: confirms which sections exist in the spec's canonical shape and where each finding's fold-back target lies.

4. **ADRs cited in `{FINDINGS-ENUMERATION-BLOCK}`** — **none.** Provisional Phase 3 scope is zero (see §0 substitution note carried into §5c). Three PC-3-relevant ADRs (U006 / U007 / U018) were all amended at PC-3 close (`edf72d3` / `3697732` / `dd84a02`); none of the three pending findings carry ADR amendment shape on their face. ADR amendment scope re-adjudicated at §5c checkpoint after Phase 1+2 land. Read step skipped at §2; restored on demand if §5c surfaces an ADR-amendment candidate.

5. **`docs/planning/sessions/openers/STATUS.md`** — Amendment sessions table; confirm PC-3 Organisation row's `Status` reads `Next`, `Pending findings` aligns with `{FINDINGS-ENUMERATION-BLOCK}` scope, and PC-2 Identity row shows `Done` (the immediately preceding amendment).

After the state-read pass, surface a structured summary: (i) source-bridge transcription provenance check (does §8 still match the source bridges as currently on disk); (ii) spec baseline state (line count, sections present, last commit touching it — expected `1ee9acc`); (iii) ADR amendment candidates and their current state (expected: zero candidates pending §5c re-adjudication); (iv) any divergence from expected. Wait for ratification before proceeding to §3.

---

## §3 Scope-locked fold-back — direction-of-authority discipline

Amendment sessions run with a **direction-of-authority opposite to derivation sessions**. The load-bearing statement is:

*Amendment sessions fold the enumerated findings from the source bridges + `{FINDINGS-ENUMERATION-BLOCK}` INTO the spec. They do NOT reach for fresh disk evidence outside that enumerated scope.*

**In-scope evidence sources:**

- Every finding enumerated at §8 below.
- The two source bridges named at §2 Read 1 — for finding context, disk-anchor citations, and provenance.
- The canonical spec at `docs/platform/core/organisation-specification.md` — the artifact being amended; fresh-read per Edit per §6 self-checking discipline.
- ADRs named in `{ADR-AMENDMENT-CANDIDATES}` — **none provisional**; if §5c adjudication surfaces a candidate, fresh-read at Phase 3 ADR amendment time.

**Out-of-scope evidence sources:**

- Cold-derivation-style stress-testing of the spec against disk. The Experiment B comparison-phase bridge already did this work autonomously on `experiments/B-pc3-full`; re-doing it inflates session scope without changing the finding set.
- Opening adjacent disk artifacts (`supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, `lib/types/`, the autonomous worktree at `D:/WebDev/FringeIsland-experiment-B/`) "to be sure" about a finding. The bridges already cite disk anchors at the specificity the fold-back needs.
- Re-surfacing findings the bridges already disposed-of or out-of-scoped. The Experiment B bridge's other six substance findings + seven methodology findings either confirm at both tracks (no PC-3 amendment needed) or route to PC-4 / DS-* / Phase 2 close-out per §Dispositions — not in this amendment's scope.

**Adjudication-shape findings — relevance-determination before fold-back substance.**

**Finding D3 (multi-role memberships) is an adjudication-shape finding** per template §3's named sub-class. The Experiment B comparison-phase bridge §Dispositions #1 explicitly framed it as a binary: "either fold into manual PC-3 spec amendment or carry as pickup for PC-4 / Phase 2 close-out if multi-role is governance-relevant." Neither home was selected at the comparison-phase close; this amendment is where the adjudication lands.

Surface relevance-determination at the §5a checkpoint with explicit rationale, then route based on adjudication outcome:

- **Adjudicated *PC-3-relevant slice with substance*** → standard fold-back per Phase 1. Likely section touches: §L3 capability inventory (new capability "Multi-role membership" OR extension of "Group Role lifecycle" capability text) + §2 Concepts (Membership row may need refinement) + §5 storage (mention `user_group_roles` junction table with composite PK if cold-derivation omitted it) + §8 (new Q opening or existing Q amendment).
- **Adjudicated *no PC-3-relevant slice; governance-shape only*** → pickup-list to PC-4 / Phase 2 close-out; record adjudication rationale in §13 prompt #3 and §11 closing-bridge pickup-list. No Phase 1 §1–§8 substance edit for D3.
- **Adjudicated *partial-PC-3 slice*** (the binary as framed at the source bridge may not exhaust the options — e.g. PC-3 carries the schema-level mention only; PC-4 carries the governance shape) → atomic adjudication-record edit in spec (likely Sources-status SS-21) + pickup to PC-4 / Phase 2 close-out.

The PC-2 amendment's D3 adjudication is the canonical instance of this sub-class: PC-2 adjudicated D3 as no-PC-2-relevant-slice and pickup-listed to PC-4 / Phase 2 close-out. The PC-3 adjudication is independent — D3's PC-3-relevance is the unsettled half of the Experiment B binary, and the spec carries every other capability layer (Membership lifecycle, Role Template management, Group Role lifecycle, Permission resolution); the prior gives no presumption either way.

**Findings P-O1 and SS-11 are augment-in-place sentence-level shape per template §5a**, not adjudication-shape. P-O1 augments existing actor-primitive references at §3 / §6 / §L3 with the post-Experiment-B program-level-promotion citation; SS-11 augments the existing Sources-status entry with the post-Experiment-B ratification status. Neither opens a new Q; both preserve PC-3's derivation-time framing verbatim and append amendment-time addenda.

**Mid-fold-back finding surface — record-and-route, do not expand scope.**

If during fold-back a new finding surfaces (e.g. an Experiment B disk anchor citing autonomous-track `user_group_roles` evidence reveals a §6 cross-reference that's stale; a P-O1 fold-back at §6 reveals a paragraph that pre-dates the partition language; a Q-resolution implies a follow-on Q that wasn't enumerated), the discipline is:

1. **Record at §13 post-run methodology capture** (prompt #3 — adjacent findings discovered mid-fold-back).
2. **Route to the closing-bridge pickup-list** per §11.
3. **Do NOT expand current session scope.**

**§3-vs-§9 seam — when an out-of-scope finding is structurally identical to an in-scope finding.**

The PC-2 amendment surfaced this seam four times in one session run with three structural sub-variants (currently-asserted prose; historical-record entry; table-cell parallel anchors). For the PC-3 amendment, the seam is **less likely to fire load-bearingly**: P-O1 is sentence-level augment-in-place at three specific anchors; SS-11 is single-anchor augment-in-place; D3 is adjudication-shape with the substance scope determined at §5a. The narrow Edit envelope reduces the surface area where parallel inconsistencies can surface. But the seam discipline is inherited regardless — if a parallel-anchor pattern fires during fold-back (e.g. a P-O1 fold-back at §3 reveals an analogous PC-2 cross-reference at §L3 that's now stale post-PC-2-amendment), apply the matching disposition per template §3 sub-variants:

- **(i) Currently-asserted prose** → §9 in-commit-consistency applies clearly; fold the stale-text correction into the same commit batch as a parallel atomic Edit, using augment-in-place phrasing.
- **(ii) Historical-record entry** → augment-in-place (option (c)) — preserve original verbatim + append amendment-time addendum with bold-labeled clause.
- **(iii) Table-cell parallel anchors** → §9 fires strongly; multi-row sweep required.

Apply per parallel-anchor pattern when surfaced; report at §13 prompt #1 whether the seam fired this session.

---

## §4 Three-phase work shape

PC-3 §L3 Step 3 is the work-shape precedent — and for this amendment, the spec being amended IS PC-3, so the precedent and the target overlap. Three phases:

- **Phase 1 — fold-back.** §1–§8 amendments per finding category from §8 below. P-O1 sentence-level augment-in-place at §3 SQL helpers, §6 actor-primitive partition, §L3 capability "Personal-group actor primitive". SS-11 sentence-level augment-in-place at the Sources-status block. D3 substance edits (if adjudicated PC-3-relevant) at the sections determined at §5a checkpoint.
- **Phase 2 — Q-resolution + §L3 Step 3.** PC-3 already has a §L3 Step 3 block with Adjudication outputs (Q1-Q10). **Case (a) per template §5b** governs: amend the existing block. Likely shape: append a new sub-section `#### Step 3 amendments (PC-3 amendment, 2026-05-15)` under the existing `### Step 3 — adjudication and pickup` block carrying disposition statement + D3 adjudication outcome + cross-section amendment summary + new SS entries (SS-21+). The pre-existing Q1-Q10 dispositions are not re-opened by this amendment's findings (no enumerated finding settles or re-opens an existing Q), so no Q-amendment slate.
- **Phase 3 — ADR amendments.** Provisional-zero stance ratified at §5c. ADR-U006/U007/U018 amendments at PC-3 close already carry the relevant codifications for in-spec content; none of the three pending findings drive ADR amendment shape on enumeration. §5c checkpoint adjudicates the final scope; possible non-zero outcome if Phase 1 D3 adjudication surfaces ADR-shape content that the bridge didn't anticipate, but the prior is zero.

The phases land sequentially as separate commit batches; each phase has its own checkpoint surface point before authoring (§5a / §5b / §5c respectively). Multi-session run unlikely given small scope.

---

## §5a Phase 1 — fold-back

**Activity.** Author the §1–§8 amendments per finding from §8 below. Three findings, three distinct shapes:

- **P-O1 promotion citation** — augment-in-place sentence-level addenda at three anchors. Each anchor: existing derivation-time framing preserved verbatim; bold-labeled trailing sub-clause appended naming the post-Experiment-B program-level promotion. Pattern: `**Post-Experiment-B note (PC-3 amendment, §9 in-commit-consistency):** P-O1 ... promoted to named program-level pattern at Experiment B comparison-phase per disposition #3 with convergent evidence from both tracks.`
  - **Anchor 1 — §3 SQL helpers.** The line "(P-O1 prior applied — see §6 actor-primitive partition.)" within the `get_current_personal_group_id()` bullet. Append addendum.
  - **Anchor 2 — §6 actor-primitive partition.** The "PC-2 / PC-3 actor-primitive partition" sub-section opens with the canonical framing of `get_current_personal_group_id()` as the actor primitive. Append addendum at the end of the sub-section's prose (NOT at the cross-spec implication paragraph that routes to PC-2 amendment, which is itself now post-PC-2-amendment-close).
  - **Anchor 3 — §L3 capability "Personal-group actor primitive".** The row's existing text in the capability table is single-cell-bounded; the augmentation goes in the capability-table row's existing cell with sentence-level addendum. (Alternative: a new bold-paragraph-header sub-section in the prose under the table. Decide at §5a checkpoint per template "preserve host section's convention" guidance — the capability table uses cell-bound prose, so cell-bound addendum is shape-consistent.)

- **SS-11 status update** — single-anchor augment-in-place sentence-level addendum. Existing SS-11 text reads "A-candidate #9 — promotion-watch. Framework-provided contract mechanisms ... Mitigation: ... Promotion criterion: pattern recurs at DS-* Step 1s where Supabase/PostgREST or analogous mechanisms apply." Append bold-labeled sub-clause: `**Post-Experiment-B status (PC-3 amendment, 2026-05-15):** ratified at Experiment B comparison-phase per disposition #4 — autonomous-track confirms the gap (cold derivation under-weights framework-provided contract mechanisms); convergent evidence from both tracks. Promotion criterion unchanged (awaiting DS-* Step 1 recurrence for cross-entity ratification).`

- **D3 multi-role memberships adjudication** — shape determined at §5a checkpoint per the §3 adjudication-shape discipline. Three possible substance shapes:
  - *(a) PC-3-relevant slice with substance* — likely Edits: (i) §2 Concepts table — refine the Membership / Group Role rows to name `user_group_roles` junction with composite PK supporting multi-role-per-membership; (ii) §5 storage — add the junction table to the schema text; (iii) §L3 capability — either new capability "Multi-role membership" between "Group Role lifecycle" and "Permission resolution", OR extension of "Group Role lifecycle" capability text; (iv) §8 — new Q11 opening (or pickup as Sources-status entry if no open question remains after fold-back).
  - *(b) no PC-3-relevant slice; governance-shape only* — zero substance Edits; record adjudication rationale at the §L3 Step 3 amendment-time block (Phase 2) + pickup to PC-4 / Phase 2 close-out + §13 prompt #3.
  - *(c) partial slice — PC-3 schema mention only* — single atomic Edit at §5 or §L3 Sources-status (SS-21 adjudication-record entry) + pickup to PC-4 / Phase 2 close-out.

**Inline-fold discipline — canonical, not preserved-as-cold.** Per Experiment B comparison-phase disposition #6, canonical runs inline-fold corrections into the final §1–§8 text. This amendment is a canonical run; the preserve-as-cold variant is for experiment runs and does NOT apply.

**Augment-in-place shape — preserve original verbatim + append amendment-time addendum.** Sentence-level pattern is load-bearing for this amendment per the three findings' shape analysis. Use bold-labeled sub-clause as named at the P-O1 and SS-11 anchors above. Pattern recurs at three (or four) anchors; cadence holds for sub-batch-of-1 throughout.

**Altitude-separation disposition — single finding, two altitudes, two paragraphs.** Unlikely to fire at this amendment per the three findings' shape analysis — each finding has a single natural altitude or three parallel anchors at the same altitude (sentence-level cell/prose). Watch flag for D3 if adjudicated (a)-shape: §5 storage altitude (schema text) vs §L3 capability altitude (resolution semantics) may surface as two-altitude question — record at §13 if it fires.

**Carry-forward priors held — by reference to §7.** P-O1 (load-bearing, finding 2 directly) and multi-role memberships D3 (load-bearing, finding 1 directly) are the active priors for this amendment. D7 / X3 / X5 / Finding #4 carry forward informationally per the template's inheritance frame — no enumerated finding touches them in this amendment.

**Single-Write vs split-Edit at Phase 1.** Sub-batch-of-1 multi-Edit cadence is the default. Total Edit count estimated at **3–8 atomic Edits**:
- P-O1: 3 augment-in-place Edits (one per anchor).
- SS-11: 1 augment-in-place Edit.
- D3: 0–4 Edits depending on §5a adjudication outcome.

Well below PC-2 amendment's 27. Sub-batch-of-3 is **not** attempted at Phase 1 even though discipline holds — small scope, augment-in-place pattern, the fresh-read-per-Edit + pre-emit + gate triplet is what catches drift, and sub-batch-of-1 is the safe default per inherited §9 discipline.

**Ratified-additions discipline — surface mid-run additions at the next gate; do not batch for re-checkpoint.** Mid-run additions likely sources for this amendment:
- §3-vs-§9 seam firings (e.g. a P-O1 fold-back at §3 reveals a parallel cross-reference at §L3 that's now stale post-PC-2-amendment — apply matching sub-variant disposition).
- Altitude-separation needs (D3 (a)-shape outcome may decompose into §5 + §L3 altitudes).
- Sub-batch-of-N splits if an augment-in-place anchor decomposes into multiple cells at fresh-read.

Surface each addition at the next gate's pre-emit with explicit Edit-count update; ratify atomically. Do not hold for batched re-checkpoint. Final Edit count for this amendment is small enough that 50% drift means +2-3 Edits, not +9 as for PC-2.

**Phase 1 checkpoint surfacing.** Before the first Edit, surface a structured summary to the human:

- **D3 adjudication outcome** — (a) PC-3-relevant slice with substance / (b) no-relevant-slice + pickup / (c) partial slice. Rationale: name which PC-3 capability layer (Membership lifecycle / Role Template management / Group Role lifecycle / Permission resolution) carries multi-role semantics, OR explicitly that no layer does and governance is the only home. Reference Experiment B bridge §Substance findings #1 disk evidence (autonomous-track `user_group_roles` junction with composite PK) and PC-3 §L3 capabilities + §5 storage to determine PC-3-relevance.
- **Section-touch inventory** — for each section of `docs/platform/core/organisation-specification.md` (§2, §3, §5, §6, §8, §L3 capability table, §L3 Sources-status), which findings fold into it, and which Edits will land. With three findings and augment-in-place + possible adjudication-shape substance, total inventory likely 4–8 rows.
- **Edit cadence plan** — total Edit count; sub-batch-of-1; single combined spec-amendment commit per PC-2 amendment precedent (Phase 1 + Phase 2 in one commit; no partition).
- **Cross-section consistency watches** — sections that cite each other: §3 / §6 / §L3 cross-reference each other on actor-primitive language; §L3 capability table cross-references §L3 Sources-status block (SS-11 sits within that block). P-O1 augment-in-place at §3 + §6 + §L3 must preserve consistency of the trailing addendum phrasing.
- **Carry-forward priors applied** — P-O1 active at all three P-O1 anchors; D3 (multi-role) active at the D3 adjudication.
- **Any divergence from the template's expected fold-back shape** — the dual role of the PC-3 closing bridge (substantive predecessor + work-shape precedent); the small Edit envelope relative to PC-2; the second-instance-stress-test framing for §13.

Wait for ratification before the first Edit.

---

## §5b Phase 2 — Q-resolution and §L3 Step 3

**Activity.** Author the §L3 Step 3 amendment-time block.

**Case disposition — Case (a) per template §5b.** PC-3 already has a §L3 Step 3 block (`### Step 3 — adjudication and pickup` with Adjudication outputs Q1–Q10, Pickup lists, Step 3 closure summary). The amendment session **amends the existing block**, not authors a new one. Sub-disposition variants (b.i.1) replace / (b.i.2) preserve + append / (b.i.3) augment-in-place at section level **do not apply** — those are sub-variants of Case (b), which governs amendments to pre-§L3-Step-3-methodology specs (PC-2, PC-1).

**Block-shape for Case (a) amendments.** Per the template's Case (a) framing: "amend the existing block with new Q-resolutions and append new SS entries to the existing Sources-status block." For this amendment specifically:

- **Q-resolution slate — empty by default.** None of the three pending findings opens or settles an existing §8 Q. P-O1 augment-in-place at §3/§6/§L3 cites the program-level promotion without opening a new Q; SS-11 augment-in-place is Sources-status-only; D3 adjudication may (if (a)-shape) open Q11 or may (if (b)/(c)-shape) record as a Sources-status SS-21 adjudication-record entry without opening a Q. Decide at §5b checkpoint per §5a D3 outcome.
- **§L3 Step 3 amendment-time block — single sub-section appended under the existing `### Step 3 — adjudication and pickup`.** Mirroring PC-2 amendment's §L3 Step 3 amendment-time block shape: `#### Step 3 amendments (PC-3 amendment, 2026-05-15)` carrying disposition statement; cross-section amendment summary table (3 finding rows); D3 adjudication outcome + rationale; pickup list (D3 pickup if (b)/(c)-shape; P-O1 to Phase 2 close-out program-level methodology); new SS entries (SS-21+ per the continuation rule).
- **Sources-status block extensions.** Per the SS-1 through SS-20 existing series in PC-3 spec, new entries continue from SS-21. Expected entries:
  - SS-21 — D3 adjudication-shape record (regardless of outcome (a)/(b)/(c); records adjudication rationale + disposition).
  - SS-22 (optional) — methodology observation if §13 prompt #1 or #2 surfaces a finding worth in-spec capture (e.g. second-instance-stress-test framing observation; augment-in-place cadence observation; whether §3-vs-§9 seam fired this session). May route to closing-bridge methodology data points instead of in-spec SS entry if the observation is bridge-altitude not spec-altitude.

**§8 amendments.** Possibly Q11 added if D3 adjudication outcome (a) opens a multi-role memberships question (e.g. "Q11 — Multi-role-per-membership semantics: at which capability layer does multi-role-per-membership resolve?"). If D3 outcome (b)/(c), no §8 amendment; the adjudication record sits at SS-21 + the amendment-time block alone.

**Phase 2 checkpoint surfacing.** Before authoring the §L3 Step 3 amendment-time block:

- **Disposition decision** — Case (a); appending a `#### Step 3 amendments (PC-3 amendment, 2026-05-15)` sub-section under the existing `### Step 3 — adjudication and pickup` block.
- **Q-resolution slate** — empty by default; Q11 added only if D3 outcome (a) surfaces it.
- **§L3 Step 3 amendment-time block structure** — disposition statement + cross-section amendment summary table + D3 adjudication outcome + pickup list + new SS entries.
- **§8 amendments** — possibly Q11; otherwise none.
- **New SS entry numbers** — SS-21 (D3 adjudication record); SS-22 optional methodology observation.

Wait for ratification before authoring.

---

## §5c Phase 3 — ADR amendments

**Activity.** For each finding requiring ADR amendment per Phase 2's Q-resolution slate, draft an append-only Option A ADR amendment. One commit per ADR.

**Provisional-zero stance.** Phase 3 starts at zero ADR commits per PC-2 amendment's §5c precedent. Three PC-3-relevant ADRs (U006 / U007 / U018) were all amended at PC-3 close; none of the three pending findings drive ADR amendment shape on enumeration. ADR scope re-adjudicated at the §5c checkpoint after Phase 1+2 land.

**Possible non-zero outcomes:**

- **D3 adjudication outcome (a) PC-3-relevant slice with substance** may surface ADR-U006 amendment candidacy IF multi-role-per-membership has ADR-level architectural implication for the Universal Group Pattern (e.g. ADR-U006 currently codifies the single-actor-primitive shape; multi-role is orthogonal to actor-primitive but may have a parallel structural commitment). Likely *not* an ADR amendment — multi-role-per-membership is a schema-level question without ADR-level shape, and ADR-U007 (Three-layer permission model) already accommodates multiple roles per membership at layer 2 (Group Role) without prohibiting per-membership-multi-instances. But adjudicate at §5c.
- **P-O1 program-level promotion** does NOT drive ADR amendment — it's a program-level methodology pattern, not an architectural decision; routes to Phase 2 close-out per Experiment B disposition #3.
- **SS-11 / A-candidate #9 ratification status** does NOT drive ADR amendment — it's a Sources-status promotion-watch update.

**Shape variants — choose by substance if non-zero.** Three append-only Option A shape variants precedented at PC-3: THREE-COMPONENT (U006), FOUR-COMPONENT (U007), THREE-DISTINCTION (U018). If D3 adjudication surfaces ADR-U006-amendment candidacy, the natural shape would be **adds-a-component** to the existing three-component scope (FK direction + immutability + supervised-bypass) — a four-component variant of the THREE-COMPONENT precedent. But likely not warranted; the §5c default is zero.

**Per-ADR ritual** (if non-zero): per template §5c — fresh-read current ADR text → scope decision → draft amendment → structural inventory + Tripwire #4 → print-batch-before-gate → bouncer tightenings absorbed → Edit 1 (Date line) → Edit 2 (section insertion) → single commit with structured body citing spec-amendment commit + source-bridge provenance + disk anchors.

**Phase 3 checkpoint surfacing.** Surface adjudication outcome:

- **Provisional-zero confirmed** (most likely) → skip Phase 3 entirely; proceed to closing bridge.
- **Non-zero, N ADR commits** → for each ADR: scope + shape variant + disk anchors + provenance citations + sub-batch-of-1 order across ADRs.

Wait for ratification.

---

## §6 Self-checking discipline — Tripwire #4 substitute

Inherited from template §6 verbatim — no PC-3-specific adaptations. Hard rules apply identically:

- **Fresh-read before every Edit; never construct `oldText` from memory.** Particularly load-bearing for this amendment given the augment-in-place sentence-level pattern at four (or more) anchors — same Edit shape but different host text per anchor.
- **Structural-inventory-before-defect-assertion.**
- **Enumeration-claim-scoping** — applies particularly when verifying cross-section consistency post-fold-back ("the spec is consistent on actor-primitive language" → state the cross-references searched).
- **Verify-before-asserting on commit-shape claims** — applies to citations of the spec's most-recent-touch commit (`1ee9acc`), the source-bridge commits (PC-3 close `172ecd9`; Experiment B comparison-phase `b6575e6`), and the spec-amendment commit when authoring the closing bridge body.
- **Cross-section fresh-read before second-touch Edits** — P-O1 augment-in-place at §3 + §6 + §L3 visits three cross-referencing sections; fresh-read each before composing its Edit.
- **Listing commands use explicit counts.**

**Methodology-framing space.** Amendment-specific observation surface for this amendment includes: second-instance-stress-test framing for §13 (does the just-revised template behave as expected on its second instance, or do PC-2-revision-cycle artifacts surface that warrant follow-on revision); whether the small-scope amendment shape changes the seam-firing pattern relative to PC-2's larger scope.

---

## §7 Carry-forward priors (named) — by reference

| Prior | Applies when | Status for this amendment |
|---|---|---|
| **P-O1** | Fold-back touches actor-primitive language in §3 / §5 / §6 / §L3. **Load-bearing for this amendment** — finding 2 IS the P-O1 program-level promotion citation. Three anchors enumerated at §5a. | Active. |
| **D7** | Fold-back touches role-name vocabulary in §2 / §5. | Informational — no enumerated finding touches role-name vocabulary; PC-3 §6 already cites D7 prior at the role-template paragraph; no augmentation needed. |
| **X3** | Fold-back touches `has_permission` signature or any ADR-disk signature drift. | Informational — ADR-U007 already amended at `3697732` (PC-3 close) with the four-component scope; no PC-3-amendment-time touch needed. |
| **X5** | Fold-back touches service-role escalation patterns in §3 / §6 / §7. | Informational — PC-3 §7 already carries the three-justification design rule for `app/api/*`; no augmentation needed. |
| **Finding #4** | Fold-back touches secrets/credentials substrate (app-tier, not database-tier). | Informational — no enumerated finding touches secrets/credentials; PC-1 amendment is the natural channel for Finding #4 follow-on work per STATUS.md. |
| **Multi-role memberships (D3)** | Fold-back touches membership-role capability surface. **Load-bearing for this amendment** — finding 1 IS the D3 PC-3-relevance adjudication. PC-3 amendment is the canonical instance for the PC-3-relevant slice (the unsettled half of the Experiment B binary; PC-2 amendment adjudicated the PC-2-half as no-relevant-slice). | Active — adjudication shape at §5a. |
| **A-candidate #9 ratification carry-forward (PC-3-specific)** | Fold-back touches Sources-status SS-11 entry; promotion-watch status update with convergent-evidence anchor. | Active — finding 3 is the SS-11 augment-in-place. |

The "applies when" column is informational — it does not gate the prior; the prior holds throughout the session and applies wherever its pattern fires. Full statement of each shared prior lives in `docs/templates/autonomous-l1-l3-session-opener.md` §7.

---

## §8 Findings enumeration — verbatim from source bridges

*Three findings transcribed from `docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`, preserving the source bridge's section/disposition labels. Findings 1 and 3 originate at Substance / Dispositions framing; finding 2 originates at Methodology / Dispositions framing. Group labels reflect the source bridge's taxonomy, not PC-2 amendment's Experiment-A-derived Group A/B/C.*

### Group A — Substance findings (Experiment B comparison-phase bridge §Substance findings + §Dispositions)

- **D3 (Experiment B multi-role memberships) — PC-3-relevance adjudication.** Autonomous-track Step 2 surfaced disk evidence of a separate `user_group_roles` junction with composite PK supporting multi-role-per-membership; PC-3 manual-track capability inventory does not surface multi-role as an explicit capability or open discipline question. Source-bridge framing (§Dispositions #1): binary — "either fold into manual PC-3 spec amendment or carry as pickup for PC-4 / Phase 2 close-out if multi-role is governance-relevant." PC-2 amendment adjudicated the PC-2-half as no-relevant-slice (pickup to PC-4 / Phase 2 close-out); the PC-3-half is the unsettled half this amendment lands. **Adjudication-shape finding per template §3** — relevance-determination at §5a checkpoint before substance work. Affects §2 (Membership / Group Role concepts) + §5 (storage; possibly `user_group_roles` junction) + §L3 (capability inventory; either new capability or extension of "Group Role lifecycle") + §8 (possibly Q11) + §L3 Sources-status (SS-21 adjudication record regardless of outcome). **ADR amendment candidate:** TBD — provisionally No; re-adjudicated at §5c if Phase 1 surfaces ADR-shape content.

### Group B — Methodology + disposition routings (Experiment B comparison-phase bridge §Methodology findings + §Dispositions)

- **P-O1 promotion citation at PC-3 actor-primitive sections.** Per §Dispositions #3: "Fold P-O1 (cold-derivation drifts Supabase-canonical actor primitive) as named program-level pattern at Phase 2 close-out. Cite both tracks as convergent evidence; autonomous-track framing as catalyst." Manual track (PC-3 derivation) has equivalent observation but did not crystallize the named pattern; autonomous track explicitly promoted P-O1 to "STRONGLY CONFIRMED systematic bias" and routed to PG-3 for program-level pickup. **Augment-in-place sentence-level shape** per template §5a — existing derivation-time P-O1 framings preserved verbatim; bold-labeled trailing sub-clause appended at three anchors:
  - **§3 SQL helpers** — within the `get_current_personal_group_id()` bullet, after the existing "(P-O1 prior applied — see §6 actor-primitive partition.)" parenthetical.
  - **§6 actor-primitive partition** — at the end of the "PC-2 / PC-3 actor-primitive partition" sub-section's prose.
  - **§L3 capability table — "Personal-group actor primitive" row** — cell-bound addendum (host section uses cell-bound prose per "preserve host section's convention" guidance).

  **ADR amendment candidate:** No — program-level methodology pattern, not architectural decision.

- **SS-11 status update — A-candidate #9 promotion-watch ratification status.** Per §Dispositions #4: "Framework-provided contract mechanisms invisible to cold derivation: manual track surfaced; autonomous track confirms gap. Convergent evidence; ratification candidate confirmed for DS-* entry." Existing SS-11 text reads as un-ratified promotion-watch; amendment appends post-Experiment-B convergent-evidence anchor. **Augment-in-place sentence-level shape** per template §5a — single-anchor addendum at SS-11 within the §L3 Sources-status block. **ADR amendment candidate:** No — Sources-status promotion-watch update.

### Additional findings — none

This amendment's pending-findings cell in STATUS.md enumerates exactly three findings; no further additions surfaced from the PC-3 closing bridge or other channels post-bridge-authoring. The Experiment B comparison-phase bridge's other six substance findings + remaining methodology findings either confirm at both tracks (no PC-3 amendment needed) or route to PC-4 / DS-* / Phase 2 close-out per §Dispositions — not in this amendment's scope per §3 scope-locked discipline.

---

## §9 Disciplines in effect — by reference

Inherited from `docs/templates/spec-amendment-session.md` §9 by reference. The disciplines apply equally to this amendment; no PC-3-specific overrides or additions. Full statements at `docs/templates/autonomous-l1-l3-session-opener.md` §9 (template §9 inheritance chain).

Disciplines load-bearing for this amendment (named for emphasis, not exhaustive):

- **Pre-emit announcement before every Edit.** Surface the full diff (`oldText` / `newText`) for review at the gate before the Edit lands. Pair with fresh-read of the spec immediately preceding diff construction. Promoted to first-class §9 discipline at PC-2 amendment close per closing-bridge methodology data point; second-instance application here.
- **Sub-batch-of-1 multi-Edit cadence default.** Small-scope amendment does not earn sub-batch-of-3 even if discipline holds.
- **Augment-in-place sentence-level pattern** (named at §5a) — bold-labeled trailing sub-clause; preserve original verbatim.
- **§3-vs-§9 seam recognition** — three sub-variants from PC-2 amendment available if the seam fires; less likely to fire load-bearingly given small Edit envelope.
- **Append-only Option A for ADR amendments** — applies if §5c surfaces non-zero scope; default zero.
- **In-commit-consistency** — fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit.
- **Forward-only correction** — prior commits carry their own provenance; do not rewrite history. Particularly applies to §L3 Step 2 block references with `255219d`-era Q-numbering per SS-20 lineage; do not re-touch.
- **OLDFEAT blindness invariant** — out of scope per §3 scope-locked discipline regardless of whether the invariant has been formally lifted post-Experiment-B.

---

## §10 Output expectations and commit shape

Amendment session produces **2–4 commits** (smaller than the typical 3–6 range given the small Edit envelope):

1. **Spec amendment commit (1)** — combined Phase 1 + Phase 2 amendments to `docs/platform/core/organisation-specification.md`. Mirroring PC-2 amendment's single-spec-amendment-commit shape; no partition.
2. **N ADR amendment commits** — provisional-zero. If §5c surfaces non-zero, sub-batch-of-1 across ADRs.
3. **Closing bridge commit (1)** — at `docs/planning/sessions/2026-05-15_NN_-_PC3-AMENDMENT-LANDED.md` per §11 below. Filename `NN` per session ordinality within 2026-05-15 (likely `02` — the second 2026-05-15 closing-bridge after PC-2 amendment's `2026-05-15_01_-_…`).
4. **STATUS.md amendment commit (1, separate)** — marks PC-3 amendment `Done`, fills in Closing bridge / §13 captured / Template revision columns. Separate commit per convention.

**No push to origin** at session close. The human dispositions push as a deliberate next step.

---

## §11 Closing bridge — required sections

The closing bridge at `docs/planning/sessions/2026-05-15_NN_-_PC3-AMENDMENT-LANDED.md` follows the standard `docs/templates/session-bridge.md` shape, with these additional sections required for amendment sessions (per template §11):

- **Explicit closure statement:** "*PC-3 Organisation amendment session completes at this commit batch. Pending findings folded; spec at `docs/platform/core/organisation-specification.md` now reflects [list of findings folded by Group, with D3 adjudication outcome named].*"
- **Findings disposition table** — one row per finding from §8. Columns: Finding (D3 / P-O1 / SS-11) | Group | Status (Folded into §N / Adjudicated as pickup / etc.) | Anchor in amended spec (section + paragraph reference, or commit SHA + line range).
- **Pickup lists** for findings that surfaced during fold-back but are out-of-scope per §3 scope-locked discipline. Expected pickups: D3 to PC-4 / Phase 2 close-out (if outcome (b)/(c)); P-O1 program-level promotion to Phase 2 close-out (per Experiment B disposition #3); A-candidate #9 cross-entity ratification to DS-* Step 1.
- **Source-bridge provenance citations** — explicit citation of both source bridges (PC-3 closing bridge `2026-05-14_02_-_…`; Experiment B comparison-phase bridge `2026-05-14_03_-_…`), with the specific sections of each bridge that carried the folded findings (PC-3 close §L3 Step 3 + closing bridge §Pickup lists for the spec-baseline; Experiment B §Substance findings #1 + §Methodology findings + §Dispositions #1/#3/#4 for the findings).
- **Methodology data points** captured this run. **Second-instance stress-test framing required** — does the just-revised spec-amendment template (commit `70cbd15`) hold on its second instance? Specifically: did the §3-vs-§9 seam discussion + three sub-variants help or fire noise; did the augment-in-place shape catalog at §5a hold; did the §5b (b.i.2) default disposition correctly identify Case (a) as the right governing variant; did the pre-emit + fresh-read + gate triplet hold cadence; did the §5a ratified-additions discipline catch mid-run drift; did the adjudication-shape sub-class at §3 work for D3 as it worked for D3-at-PC-2.
- **Template revision disposition** — adjudicates whether the §13 post-run methodology capture surfaced durable findings warranting a `docs/templates/spec-amendment-session.md` follow-on amendment. PC-2 amendment proposed seven revisions (landed at `70cbd15`); PC-3 amendment may propose zero (if template holds on second instance), few (small follow-on refinements), or more (if second-instance-stress-test surfaces new template gaps). Either *no revision proposed* (with one-line rationale) or *N revisions proposed* (with the specific changes ordered by template-gap severity per PC-2 precedent).
- **Carry-forward to next amendment session.** Next amendment in the queue per STATUS.md is PC-1 Infrastructure (sequenced after PC-4 entry; not the immediate next session). Carry-forward likely light: PC-3 amendment's findings disposition is isolated from PC-1 scope per the source bridges' routings. The natural carry-forward channel is the program-level methodology (P-O1 promotion in particular) routing to Phase 2 close-out; PC-1 amendment inherits no PC-3-amendment-specific carry-forward beyond what the source bridges already enumerated.

---

## §12 Scope boundaries

- **The two source bridges (`2026-05-14_02_-_…` PC-3 close + `2026-05-14_03_-_…` Experiment B comparison-phase) are the enumeration scope.** Findings outside the enumerated three (D3 / P-O1 / SS-11) are out-of-scope per §3 scope-locked discipline.
- **Other amendments queued in STATUS.md are NOT touched.** PC-1 amendment (sequenced after PC-4); OLDFEAT reconciliation (anytime; non-blocking) — out of scope at this session. Cross-amendment implications route to the receiving amendment's pickup-list.
- **Cross-spec implications.** If a finding has implications for another spec, route to that spec's pickup-list channel rather than amending here. Particularly: P-O1 program-level promotion's program-wide implications route to Phase 2 close-out, not adjacent specs.
- **OLDFEAT blindness invariant.** Out-of-scope by §3 regardless of formal lift status. The Experiment B comparison-phase analysis closed, which is the formal lift trigger per the bridge's disposition list, but PC-3 amendment evidence scope is the two source bridges + the spec — not OLDFEAT reconciliation.
- **PC-4 Governance work.** PC-4 amendment is sequenced AFTER this PC-3 amendment per STATUS.md ("Pending PC-3 amendment"); PC-4 entry is out-of-scope at this session.
- **Downstream entity work.** Amendment session does NOT touch downstream entity work (FEAT-PC3-* feature specs; code; tests). Fold-back is to the canonical spec only.
- **Doc-hygiene out of scope.** Doc-health-check pickups (G-21, etc.) and any cross-amendment housekeeping (e.g. PC-3 §L3 Step 2 block's `255219d`-era Q-numbering preserved per SS-20 forward-only-correction discipline) are out-of-scope for amendment work; the amendment folds the substantive findings, not doc-hygiene cleanup.

---

## §13 Post-run methodology capture (required, lighter than autonomous)

After Phase 3 lands (or §5c provisional-zero confirmed) and BEFORE the closing bridge is authored, answer the following three prompts. Output flows into the closing bridge's Methodology data points section AND informs the closing bridge's Template revision disposition section.

**Second-instance stress-test framing required.** This is the second instance of the spec-amendment template post-revision (commit `70cbd15`). §13 capture should explicitly contrast against PC-2 amendment's first-instance experience: which sections held cleanly on second instance vs which fired noise; which PC-2-revision-cycle additions to the template were exercised here (the seven landed revisions are: §3-vs-§9 seam at §3 with three sub-variants; augment-in-place shape catalog at §5a; altitude-separation disposition at §5a; adjudication-shape findings as §3 sub-class; pre-emit announcement first-class at §9; ratified-additions discipline at §5a Edit cadence plan; §5b (b.i.2) preserve+append as recommended default); whether any new template gap surfaced that the seven revisions didn't anticipate.

The three prompts:

1. **What worked from this template that the next amendment session should keep, and what got in the way?** Name specific sections, disciplines, or scope items that demonstrably helped — and specific sections, instructions, or scope items that fired noise rather than catch, duplicated other sections, or didn't apply to this amendment. **Second-instance framing:** which of the seven landed revisions held cleanly on second instance; which (if any) surfaced ambiguity or didn't apply to this amendment's small-scope shape; which (if any) over-engineered for a 3-finding amendment scope.
2. **What discipline or scope item did you wish was named that wasn't?** Things that, with hindsight, would have helped at Phase 1 / Phase 2 / Phase 3 had they been in the template. **Second-instance framing:** were there template gaps the PC-2 amendment's seven revisions didn't anticipate that surfaced here; did the small-scope shape surface a class of failure mode the larger PC-2 scope masked.
3. **What new finding surfaced during fold-back that wasn't in the input bridges, and where did it route?** Amendment-specific channel — captures the "adjacent findings discovered mid-fold-back" failure mode per §3's record-and-route discipline. List each such finding, its substance, and its routing disposition (pickup-listed to next amendment / pickup-listed to downstream entity / Phase 2 close-out / doc-health-check / new follow-on amendment proposed). **D3 adjudication outcome** (whichever of (a)/(b)/(c) lands at §5a) is itself a §13 prompt #3 entry — record adjudication rationale here regardless of substance Edit count.

The post-run capture's length scales with run scope. A small-scope amendment with the second-instance-stress-test framing should produce roughly a half-page of bridge-prose: light on prompt #1/#2 substance if the template held cleanly; weighted toward prompt #3 with the D3 adjudication rationale + any mid-fold-back observations + second-instance-stress-test verdict. Brevity is fine when there is genuinely nothing to surface; padding is not.

---

## §14 Start sequence

Begin with §1 Pre-flight checks. If all five pass, proceed to §2 State-read pass. Then §5a Phase 1 fold-back. Surface the §5a checkpoint before the first Edit — D3 adjudication outcome is the first ratification item at §5a.

---

*End of instance.*
