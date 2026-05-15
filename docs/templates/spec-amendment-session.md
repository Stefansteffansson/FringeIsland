# Spec-amendment session-opener — `{SPEC-SHORT-NAME} {SPEC-FULL-NAME} amendment`

**Template path:** `docs/templates/spec-amendment-session.md`
**Per-instance landing path:** `docs/planning/sessions/openers/{instance-filename}.md`
**Instance filename convention:** `cc-{spec-short-name}-amendment.md` (e.g. `cc-pc2-amendment.md`)

> Per-instance session-opener for an amendment session that folds a known-scope, pre-enumerated set of findings into an already-derived canonical spec. Distinct work shape from autonomous L1→L3 derivation runs at `docs/templates/autonomous-l1-l3-session-opener.md`: amendment work is **scope-locked fold-back** — findings flow into the spec; the spec does not reach for fresh disk evidence outside the enumerated scope. No cold derivation, no Step 2 stress-test pass. Encodes the three-phase shape (fold-back → Q-resolution + §L3 Step 3 → ADR amendments) precedented by PC-3 §L3 Step 3, scaled to amendment-session scope. Authoring an instance: copy this template to its landing path, substitute every `{CURLY-BRACED}` marker, paste the enumerated findings into `{FINDINGS-ENUMERATION-BLOCK}` per their source-bridge groupings, delete inapplicable sections, then have the CC session read the instance file as its first action.

---

## Revision history

| Revised after | Date | Change summary |
|---|---|---|
| Template authored | 2026-05-15 | Initial template. Substance, scope, and discipline carry-forwards from PC-3 §L3 Step 3 (the work-shape precedent), Experiment A bridge + Experiment B comparison-phase bridge (which surfaced the enumerated findings amendment sessions fold), and the parallel autonomous L1→L3 template at `docs/templates/autonomous-l1-l3-session-opener.md` (shape conventions: frontmatter, §0 substitution markers, §13 post-run capture, closing-bridge Template revision disposition). |
| First instance close (PC-2 Identity amendment) | 2026-05-15 | Seven revisions surfaced from §13 capture and Template revision disposition of the PC-2 amendment closing bridge (`docs/planning/sessions/2026-05-15_01_-_PC2-AMENDMENT-LANDED.md`), ordered by template-gap severity. Headline: §3-vs-§9 seam discussion at §3 with decision-tree + three structural sub-variants (currently-asserted prose; historical-record entry; table-cell parallel anchors). Other revisions: augment-in-place shape catalog at §5a (sentence-level + section-level); altitude-separation as recognized §5a disposition (X5 canonical instance); adjudication-shape findings as §3 sub-class (D3 PC-2-relevance canonical instance); pre-emit announcement promoted to first-class §9 discipline; ratified-additions discipline at §5a Edit cadence plan (cadence-plan drift expected; ratify at next gate); §5b (b.i.2) preserve + append as recommended default for case (b) common case with (b.i.1) replace and (b.i.3) augment-in-place at section level as opt-in variants. |
| Second instance close (PC-3 Organisation amendment) | 2026-05-15 | Four revisions surfaced from §13 capture and Template revision disposition of the PC-3 amendment closing bridge (`docs/planning/sessions/2026-05-15_02_-_PC3-AMENDMENT-LANDED.md`), ordered by template-gap severity. (1) §1 Check 4 carry-forward enumeration completeness — Check 4 augmented with explicit instance-authoring guidance binding opener authors at template-substitution time to enumerate ALL expected carry-forward modifications by name, not just `CLAUDE.md`; PC-3 opener-authoring missed `cc-execute-prompt.md`, causing waived hard-fail at session-open. (2) §5a frontmatter `last_updated` housekeeping Edit named as expected baseline (typically Edit #1 of Phase 1) at Phase 1 checkpoint surfacing list, separate from finding fold-back; reinforces in-commit-consistency framing at both §5a-checkpoint and commit-message-authoring loci. (3) §13 checkpoint surfacing added as bold-labeled sub-section parallel to §5a / §5b / §5c — three prompts answered as discrete units before closing-bridge authoring; closes the compression failure mode where bridge-authoring inlined §13 substance preemptively (PC-3 canonical instance). (4) Lower-priority: augment-in-place anchor containment disambiguation catalog at §5a — within sentence-level augment-in-place, single-paragraph anchor (trailing sub-clause at paragraph end) vs multi-paragraph anchor with cross-spec/divisional paragraph following (trailing sub-clause at substantive paragraph end, before the cross-spec paragraph); PC-3 §6 actor-primitive partition P-O1 Anchor 2 canonical for the multi-paragraph variant. |

*Revision discipline: after each amendment-session close that uses an instance of this template, the closing bridge's "Template revision disposition" section adjudicates whether the run's post-run methodology capture (instance §13 below) surfaced durable findings warranting a template amendment. Amendments commit as small `chore(templates)` deltas citing the amendment-session closing bridge as provenance. The Revision history table above is updated in the same commit.*

---

## §0 Substitution markers used in this template

When authoring an instance, replace every occurrence of the following:

- `{SPEC-SHORT-NAME}` — e.g. `PC-2`, `PC-1`
- `{SPEC-FULL-NAME}` — e.g. `Identity`, `Infrastructure`
- `{SPEC-PATH}` — canonical spec on disk, e.g. `docs/platform/core/identity-specification.md`
- `{ENTITY-CLAUDE-PATH}` — entity-level CLAUDE.md path (read-only check; rarely amended in fold-back), e.g. `docs/platform/core/identity/CLAUDE.md` (note: PC-2 does not yet have an entity-level CLAUDE.md; the sub-tier `docs/platform/core/CLAUDE.md` is the relevant read for that case)
- `{ORIGINAL-SPEC-TEMPLATE-PATH}` — the `docs/templates/*.md` the spec was derived against, e.g. `docs/templates/platform-core-spec.md`
- `{SOURCE-BRIDGE-PATHS}` — comma-separated list of bridges enumerating findings (the load-bearing scope-definition input; typically the Experiment A bridge, the Experiment B comparison-phase bridge, the PC-3 closing bridge, and any spec-specific carry-forward bridge)
- `{PREDECESSOR-TIP-SHA}` — the expected tip commit SHA at session-open (typically the most recent commit at session-author time)
- `{INSTANCE-DATE}` — the date the instance is authored (used in the closing-bridge filename when the amendment lands)
- `{FINDINGS-ENUMERATION-BLOCK}` — verbatim transcription of the enumerated findings from `{SOURCE-BRIDGE-PATHS}`, preserving group/category labels from the source (e.g. Group A / Group B / Group C from the Experiment A bridge). Authored at instance creation, not at template-substitution time, to preserve provenance citations. Lands at §8 of the instance.
- `{ADR-AMENDMENT-CANDIDATES}` — the subset of `{FINDINGS-ENUMERATION-BLOCK}` items that are likely to drive ADR amendments at Phase 3 (e.g. PC-3 Q6 display-name coupling, X3 ADR-U007 signature drift if not already amended at the source spec's close). Provisional at instance authoring; final scope settled at §5c.

Delete this `§0` section from the instance after substitution is complete.

---

## §1 Pre-flight checks — STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `{PREDECESSOR-TIP-SHA}` (the session-author-time tip, or any subsequent commit added by the human between sessions). Hard-fail if tip is earlier.
4. **Working tree state.** Run `git status`. Expected: `CLAUDE.md` modified-unstaged (pre-existing across sessions; outside scope; acceptable) and any other pre-existing carry-forward modifications named in the session-author state-read (e.g. `cc-execute-prompt.md` carry-forward). No untracked files in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `{SPEC-PATH}`'s parent directory. Hard-fail on any other modification or untracked file. **Instance-authoring note.** When substituting this check, run `git status` at instance-authoring time and enumerate **every** modified-unstaged path by name in the "Expected" clause above — not just `CLAUDE.md`. Each pre-existing carry-forward must be named explicitly, or §1 Check 4 hard-fails at session-open on an unnamed-but-known carry-forward and requires human adjudication to waive. Canonical PC-3 precedent: instance authoring missed `cc-execute-prompt.md`; Check 4 hard-failed at session-open and was waived by adjudication. The discipline locus is template-substitution time, not session-runtime.
5. **Spec at expected state.** Run `git log --oneline -1 -- {SPEC-PATH}`. Confirm the spec's most-recent-commit SHA matches the state described in `{SOURCE-BRIDGE-PATHS}` (typically un-amended-since-original-derivation, OR amended-at-known-SHA). Hard-fail if the spec has been amended at an unexpected commit since the source bridges were authored — that case requires the human to adjudicate whether the pending findings still apply as enumerated, or whether some have been folded already.

After all five pass, report each check's outcome and proceed to §2.

---

## §2 State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

1. **`{SOURCE-BRIDGE-PATHS}`** — each in chronological order. Load-bearing for the finding enumeration: every finding folded in this session originates here. The `{FINDINGS-ENUMERATION-BLOCK}` at §8 below is the verbatim transcription; this read is the provenance check that the transcription remains accurate.
2. **`{SPEC-PATH}`** — fresh-read the canonical spec in full. This is the artifact being amended; its current §1–§8 + §L3 + (if present) §L4 content is the baseline against which fold-back amendments compose.
3. **`docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md`** — PC-3 closing bridge. The work-shape precedent. Sections to internalize: the §L3 Step 3 block structure (Q-resolution slate + spec amendments + ADR amendments + pickup lists); the three ADR amendment shape variants (THREE-COMPONENT / FOUR-COMPONENT / THREE-DISTINCTION); the closing-bridge required sections (findings disposition + pickup lists + methodology data points + template revision disposition).
4. **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge. Surfaces the additional fold-back findings beyond the original source bridges (e.g. D3 multi-role memberships) and the methodology dispositions that govern amendment work (ADR amendments at entity close as durable discipline; canonical-vs-experiment-output asymmetry).
5. **`{ORIGINAL-SPEC-TEMPLATE-PATH}`** — the template the spec was originally derived against. Load-bearing for §6 cross-section fresh-reads: confirms which sections exist in the spec's canonical shape and where each finding's fold-back target lies.
6. **Any ADRs cited in `{FINDINGS-ENUMERATION-BLOCK}`** — for each ADR named as an amendment candidate, fresh-read the ADR's current state. Confirm un-amended-since-source-bridge status, or capture the amended state if the ADR has been touched since.
7. **`docs/planning/sessions/openers/STATUS.md`** — Amendment sessions table; confirm this spec's `Status` reads `Next`, `Pending findings` aligns with `{FINDINGS-ENUMERATION-BLOCK}` scope, and no out-of-sequence amendment has been started.

After the state-read pass, surface a structured summary: (i) source-bridge transcription provenance check (does §8 `{FINDINGS-ENUMERATION-BLOCK}` still match the source bridges as currently on disk); (ii) spec baseline state (line count, sections present, last commit touching it); (iii) ADR amendment candidates and their current state; (iv) any divergence from expected. Wait for ratification before proceeding to §3.

---

## §3 Scope-locked fold-back — direction-of-authority discipline

Amendment sessions run with a **direction-of-authority opposite to derivation sessions**. The load-bearing statement is:

*Amendment sessions fold the enumerated findings from `{SOURCE-BRIDGE-PATHS}` + `{FINDINGS-ENUMERATION-BLOCK}` INTO the spec. They do NOT reach for fresh disk evidence outside that enumerated scope.*

This is the equivalent of the autonomous L1→L3 template's §3 "Authority chain for cold derivation" — same shape (a named direction-of-authority discipline that bounds the session's evidence sourcing), opposite direction (amendments fold pre-enumerated findings into an existing spec; derivations source candidate content from upstream authority into a new spec).

**In-scope evidence sources:**

- Every finding enumerated at `{FINDINGS-ENUMERATION-BLOCK}` (§8 below).
- The source bridges named at `{SOURCE-BRIDGE-PATHS}` — for finding context, disk-anchor citations, and provenance.
- The canonical spec at `{SPEC-PATH}` — the artifact being amended; fresh-read per Edit per §6 self-checking discipline.
- ADRs named in `{ADR-AMENDMENT-CANDIDATES}` — fresh-read at Phase 3 ADR amendment time.

**Out-of-scope evidence sources:**

- Cold-derivation-style stress-testing of the spec against disk. The source bridges already did this work; re-doing it inflates session scope without changing the finding set.
- Opening adjacent disk artifacts (`supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, `lib/types/`, etc.) "to be sure" about a finding. The bridges already cite disk anchors at the specificity the fold-back needs; the fold-back consumes those citations.
- Re-surfacing findings the bridges already disposed-of or out-of-scoped. If a bridge says "deferred to post-Experiment-B" and Experiment B has now closed (which is the case for every current amendment in the queue), the deferred finding is in-scope by inheritance; if a bridge says "not folded; pickup for [other entity]," it stays pickup.

**Adjudication-shape findings — relevance-determination before fold-back substance.**

Some `{FINDINGS-ENUMERATION-BLOCK}` entries are in-scope by enumeration but carry an adjudication shape rather than default fold-back substance: "does this slice apply to `{SPEC-SHORT-NAME}`?" rather than "fold these specific edits into these specific sections." The PC-2 amendment is the canonical instance — Experiment B D3 multi-role memberships was enumerated as a fold-back candidate "if PC-2-relevant," requiring §5a-checkpoint adjudication of relevance before any Phase 1 substance work.

The discipline: surface relevance-determination as a standalone adjudication item at the §5a checkpoint with explicit rationale, then route based on adjudication outcome:

- **Adjudicated *no relevant slice*** → pickup-list to receiving entity (PC-4 / Phase 2 close-out / future amendment session); record adjudication rationale in §13 prompt #3 and §11 closing-bridge pickup-list. No Phase 1 §1–§8 substance edit.
- **Adjudicated *relevant slice with substance*** → standard fold-back substance per Phase 1; treat the adjudicated slice as if it had been enumerated with explicit section-touch from the start.

This sub-class is in-scope-but-conditional: distinct from §3 scope-locked's primary case (findings out-of-scope by enumeration) AND from in-scope substance corrections (findings in-scope by enumeration with explicit fold-back targets). The adjudication outcome determines disposition; enumeration membership alone does not.

**Mid-fold-back finding surface — record-and-route, do not expand scope.**

If during fold-back a new finding surfaces (e.g. a cited migration line turns out to be at a different anchor than the bridge cites; a fold-back into §6 reveals an ADR cross-reference that's stale; a Q-resolution implies a follow-on Q that wasn't on the source-bridge enumeration), the discipline is:

1. **Record at §13 post-run methodology capture** (prompt #3 — adjacent findings discovered mid-fold-back).
2. **Route to the closing-bridge pickup-list** per §11 — typically as a follow-on amendment candidate or a pickup for the next downstream entity.
3. **Do NOT expand current session scope.** The amendment session lands the enumerated findings, not the bridges-plus-mid-flight discoveries.

The discipline guards against the standard scope-creep failure mode where "while I was already touching §6, I noticed X" extends a known-scope session into open-ended re-derivation. Amendment sessions are valuable precisely because their scope is closed at session-open; that property is worth preserving.

**§3-vs-§9 seam — when an out-of-scope finding is structurally identical to an in-scope finding.**

§3 (scope-locked fold-back) and §9 (in-commit-consistency — fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit) are separate disciplines that interact ambiguously in one specific case: when a §8-out-of-scope finding has the same closure event, same prior, and same disk evidence (already established at §2 state-read) as an in-scope finding. The PC-2 amendment surfaced this seam four times in one session run; the discipline is to recognize three structural sub-variants and apply the matching disposition.

- **(i) Currently-asserted prose.** A stale claim sits in prose that reads as a present-tense assertion (e.g. "X needs revision" when X has been revised; "Y captures Z" when no Z substrate exists on disk). Disposition: **§9 in-commit-consistency applies clearly** — fold the stale-text correction into the same commit batch as a parallel atomic Edit, using augment-in-place phrasing (see §5a). Canonical PC-2 instances: §5 Role-name canonicalization bullet "needs revision" claim; §6 PC-2/PC-3 partition has_permission paragraph trailing sentence. Both folded in-commit via parallel D7 closure cite-for-traceability.

- **(ii) Historical-record entry.** A stale claim sits in a Step 3 adjudication record, §8 question disposition text, or similar entry that records a past disposition that was correct-at-the-time. The text reads ambiguously: as historical record, the original disposition was true at PC-N derivation time; as current assertion, it is now stale per disk evidence. Disposition: **augment-in-place (option (c)) — preserve original verbatim + append amendment-time addendum** with bold-labeled clause naming the post-amendment state. The original text reads as historical record post-amendment; the addendum carries the current state. Canonical PC-2 instance: §8 Q3 "Post-PC-3-close note (PC-2 amendment, §9 in-commit-consistency):" sub-clause.

- **(iii) Table-cell parallel anchors.** A stale claim sits in sibling table cells where updating one cell would *introduce* contradiction at the other cells (one cell asserts "X latent per Y"; sibling cells still assert "X captured / X evolves / X part of flow"). Disposition: **§9 fires strongly — multi-row sweep required to avoid in-table contradiction.** Each cell uses augment-in-place phrasing to preserve original derivation-time intent + flag substrate-latent. Canonical PC-2 instance: §L3 capabilities table X4 Privacy cells across three rows (Sign-up flow + Profile materialization trigger + Account lifecycle state machine), swept as four atomic Edits.

When a mid-fold-back finding doesn't match any of the three sub-variants (genuinely out of scope, no structural parallel to in-scope findings), §3 record-and-route applies as originally written above. The three sub-variants are §9 sub-shapes within §3's scope-locked frame, not erosions of it — the seam recognizes that §9 is the load-bearing discipline when structural parallelism is present, and §3 remains load-bearing when it is not.

---

## §4 Three-phase work shape

PC-3 §L3 Step 3 is the work-shape precedent. Amendment sessions run as three phases (vs derivation sessions' three steps):

- **Phase 1 — fold-back.** §1–§8 amendments per finding category from `{FINDINGS-ENUMERATION-BLOCK}`. Substance corrections (Group A material; Group B substantive adds), inline-folded into the canonical spec sections.
- **Phase 2 — Q-resolution + §L3 Step 3.** New §8 questions added where findings open them; existing §8 questions updated where findings settle them; §L3 Step 3 block authored (or amended) depending on whether the spec already has one.
- **Phase 3 — ADR amendments.** Append-only Option A per ADR; one commit per ADR; three shape variants precedented (THREE-COMPONENT / FOUR-COMPONENT / THREE-DISTINCTION) per PC-3.

The phases land sequentially as separate commit batches; each phase has its own checkpoint surface point before authoring (§5a / §5b / §5c respectively). Multi-session amendment runs are permissible but typically unwarranted — amendment scope is closed by definition and rarely large enough to split across sessions.

---

## §5a Phase 1 — fold-back

**Activity.** Author the §1–§8 amendments per finding category from `{FINDINGS-ENUMERATION-BLOCK}`. Each finding folds into the section(s) it materially corrects: actor-primitive findings into §3 + §5 + §6; FK-target findings into §3 + §5; attribute-set findings into §2 + §5; account-lifecycle findings into §5 + §8; substantive content adds (consent/GDPR substrate, service-role escalation) into the relevant section per the bridge's framing.

**Inline-fold discipline — canonical, not preserved-as-cold.** Per Experiment B comparison-phase disposition #6, canonical runs inline-fold corrections into the final §1–§8 text. Amendment sessions are canonical runs. After Phase 1, §1–§8 should read as if the spec had been authored with the findings already known — Phase 2's §L3 Step 3 block documents the journey (which findings drove which amendments, with disk-anchor citations); §1–§8 documents the destination.

The "preserve-as-cold with deltas-flagged" shape is a legitimate methodology variant for experiment runs (per Experiment B comparison-phase disposition #6) but does NOT apply to amendment work.

**Augment-in-place shape — preserve original verbatim + append amendment-time addendum.** A distinct sub-shape within inline-fold, used where the text being touched carries derivation-time intent or historically meaningful framing worth preserving (Step 3 disposition records; §8 question disposition text; vertical-impact table cells with design-intent assertions; bullet text recording the original derivation-time finding that drove a removal-from-PC-N). For such text, do not replace in-place; preserve the original verbatim and append the amendment-time addendum, making the amendment-time scope visually distinct for spec readers.

The shape applies at two scales:

- **Sentence-level.** Preserve original sentence verbatim; append a bold-labeled sub-clause naming the post-amendment state. Pattern: `**Post-{event} note ({context}, {discipline cited}):** {addendum}`. Canonical PC-2 instances: §8 Q3 "Post-PC-3-close note (PC-2 amendment, §9 in-commit-consistency):" sub-clause; §L3 capabilities-table Privacy/Administration cells with em-dash-marked "— substrate latent per §8 Q8 / X4" or "— partial implementation on disk per §8 Q7 / C1.6" trailing clauses.
- **Section-level.** Preserve the original §-anchored section verbatim; append a new bold-paragraph-header or `####` sub-section carrying the amendment-time content. Canonical PC-2 instance: the §L3 Step 3 amendment-time block — `#### Step 3 amendments ({SPEC-SHORT-NAME} amendment, {INSTANCE-DATE})` sub-section appended under the existing `### Step 3 — Adjudication outputs` block per §5b case (b.i.2). The original "Step 3 — Adjudication outputs" subsection remains untouched as derivation-time historical record.

**Anchor containment disambiguation (within sentence-level augment-in-place).** When the augment-in-place is sentence-level (per the Sentence-level bullet above), the host paragraph's containment shape determines where the trailing sub-clause attaches:

- **Single-paragraph anchor.** Anchor is a single paragraph (e.g. §3 SQL-helper bullet body; §L3 capability cell). Trailing sub-clause attaches at the end of the paragraph's last sentence. Canonical PC-3 instance: §3 SQL helpers `get_current_personal_group_id()` bullet P-O1 Anchor 1 at commit `058d9e5`.
- **Multi-paragraph anchor with cross-spec / divisional paragraph following.** Anchor spans multiple paragraphs with a final paragraph carrying cross-spec implication or other divisional content. Trailing sub-clause attaches at the end of the substantive paragraph **before** the cross-spec paragraph — not after the cross-spec paragraph. Rationale: the addendum belongs with the substance it amends, not with divisional / cross-spec content that follows. Canonical PC-3 instance: §6 PC-2/PC-3 actor-primitive partition P-O1 Anchor 2 at commit `058d9e5`.

When to use augment-in-place vs inline-fold replacement: augment-in-place when the original carries derivation-time intent worth preserving as historical record (the amendment supplements rather than supersedes); inline-fold replacement when the original is straightforwardly stale and the amendment fully supersedes it (substance corrections like D2 FK-target inversion, where the prior text is wrong rather than historically meaningful).

**Altitude-separation disposition — single finding, two altitudes, two paragraphs.** A distinct §5a disposition for findings whose source-bridge framing carries substantively different questions at different §-altitudes — distinct from the standard one-Edit-per-section-per-finding pattern (which composes the same finding across sections with cross-references) and from the augment-in-place shape above (which preserves derivation-time framing while appending amendment-time addendum). Altitude-separation applies when a single source-bridge finding decomposes naturally into two or more questions, each load-bearing at its own §-altitude and not reducible to the others.

The disposition: write the finding's substance as two atomic paragraphs at different §-anchors, each authored at its receiving section's natural altitude, linked by bidirectional cross-references. Each receiving paragraph preserves its section's existing internal sub-section convention (some sections use `####` sub-section headers; others use bold-paragraph-header sub-sections — preserve the host section's convention, do not impose uniform shape across altitudes). Canonical PC-2 instance: X5 service-role escalation reframe — a single source-bridge finding (Experiment-A Group B item 7 + PC-3 §L3 Step 2 C3-2 reframe) that decomposed into (i) what does escalation **bypass** at the published contract surface (§3 contract-surface altitude — new `####` sub-section) and (ii) what does the bypass **do to the actor-primitive resolution chain** (§6 chain-mechanics altitude — new bold-paragraph-header sub-section per §6 style). Bidirectional cross-references explicitly link the two altitudes.

When to surface at §5a checkpoint: when the section-touch inventory shows the same finding spanning multiple sections with different question framings at each — i.e. the finding's content cannot be authored as the same Edit repeated across sections with cross-references, because each section needs the finding at a different altitude. The disposition surfaces as a named §5a checkpoint item alongside the standard section-touch inventory.

**Carry-forward priors held — by reference to §7.** The priors that bound fold-back (P-O1, D7, X3, X5, Finding #4, multi-role memberships D3, plus any spec-specific priors) are named in §7 below by reference; the full statement of each prior lives in the autonomous template's §7. Active-hold disposition during Phase 1 is the same as during cold derivation: when a fold-back amendment touches actor-primitive language, P-O1 applies; when it touches role-name vocabulary, D7 applies; etc.

**Single-Write vs split-Edit at Phase 1.** Amendment scope is typically larger per-touch than cold derivation (the canonical spec is hundreds of lines; folding 10 findings into it may touch 5+ sections), so **multi-Edit with sub-batch-of-1 cadence is the default Phase 1 shape**. Sub-batch-of-3 is opt-in only after the cadence holds for several Edits in this session; sub-batch-of-1 is the safe default.

**Ratified-additions discipline — surface mid-run additions at the next gate; do not batch for re-checkpoint.** Phase 1 routinely surfaces findings beyond the §5a-ratified Edit cadence plan: parallel inconsistencies firing the §3-vs-§9 seam (see §3); altitude-separation needs surfaced at Edit-time when section-touch inventory drift becomes apparent; sub-batch-of-N split into N atomic Edits when one anchor decomposes into multiple cells; augment-in-place addenda warranted at sibling anchors. The discipline: surface each addition at the next gate's pre-emit with explicit Edit-count update and section-touch inventory adjustment, and ratify atomically alongside the in-progress Edit's gate. Do not hold mid-run findings for a batched re-checkpoint at section-boundary or phase-boundary — re-checkpoint cost is structural overhead that loses momentum and can fragment finding context.

The §5a Edit cadence plan should expect cadence-plan drift across the run. PC-2 amendment is the canonical instance: §5a planned 18 Edits; final landed 27 Edits (+1 Edit 5.5 D7 parallel-fix; +1 Edit 8.1.5 Q3 augment-in-place; +3 from L3.2 split into 4 sub-Edits; +1 Phase 2 single Edit). Each ratified addition surfaced at the next gate's pre-emit and landed atomically; no batched re-checkpoint. Final Edit count typically exceeds §5a plan by 20-50% for substantive amendments; the §5a plan is an initial-best-estimate frame, not a hard cap.

**Phase 1 checkpoint surfacing.** Before the first Edit, surface a structured summary to the human:

- **Frontmatter housekeeping Edit** — expected baseline (typically Edit #1 of Phase 1): bump `last_updated` to the session date. In-commit-consistency housekeeping; surfaced separately from finding fold-back to preserve the distinction at the §5a checkpoint and at commit-message authoring time. Canonical PC-3 instance: Edit #1 frontmatter `2026-05-13 → 2026-05-15` at commit `058d9e5`.
- **Section-touch inventory** — for each section of `{SPEC-PATH}` (§1, §2, §3, ...), which findings fold into it, and which Edits will land. Per PC-3 §L3 Step 3 precedent: a finding may touch multiple sections; one Edit per section per finding is the natural granularity.
- **Edit cadence plan** — total Edit count; sub-batch shape (default sub-batch-of-1); commit shape (typically one combined spec amendment commit per PC-3 precedent, but findings may partition naturally into multiple if the substance-vs-content-add boundary is sharp).
- **Cross-section consistency watches** — sections that cite each other (e.g. §3 contract surface citing §6 auth-and-authz; §5 storage citing §8 questions); fold-back amendments to one side must preserve cross-references on the other side.
- **Carry-forward priors applied** — which §7 priors are active for which Edits.
- **Any divergence from the template's expected fold-back shape** — substance details the canonical spec's structure can't absorb cleanly without a section reshape (rare; flag for human adjudication before Edit).

Wait for ratification before the first Edit.

---

## §5b Phase 2 — Q-resolution and §L3 Step 3

**Activity.** Author or amend the §L3 Step 3 block of `{SPEC-PATH}`. Two cases govern the disposition:

**Case (a) — spec already has a §L3 Step 3 block** (e.g. an amendment to PC-3 or later spec): amend the existing block with new Q-resolutions and append new SS entries to the existing Sources-status block. New §8 questions added where findings open them (per PC-3 §L3 Step 3 Q9 + Q10 precedent of adding §8 entries mid-amendment-cycle).

**Case (b) — spec does NOT have a §L3 Step 3 block** (e.g. amendment to PC-2 or PC-1, which were authored before §L3 Step 3 was named methodology): the amendment session may either:

- **(b.i) Author a §L3 Step 3 block as part of the amendment** — load-bearing where findings carry Q-resolution shape (Q-numbered, with disposition + disk anchors + ADR amendment routing). This is the canonical-output shape and matches PC-3's precedent. Three sub-disposition variants govern how the new §L3 Step 3 block relates to any pre-existing Step 3 content:
  - **(b.i.1) Replace** — the spec has an existing "Step 3 — Adjudication outputs" subsection (e.g. authored at PC-N derivation when methodology was implicit but Q-resolution shape was already present) and amendment-time content fully supersedes it. Rarely appropriate — erases derivation-time provenance.
  - **(b.i.2) Preserve + append** — *recommended default for the common case.* Existing "Step 3 — Adjudication outputs" subsection is preserved verbatim as derivation-time historical record; a new `#### Step 3 amendments ({SPEC-SHORT-NAME} amendment, {INSTANCE-DATE})` sub-section is appended carrying the amendment-time substance (disposition statement; Q-resolution slate cross-reference to §8; cross-section amendment summary table; pickup list; new SS entries). Clean derivation-time vs amendment-time separation; mirrors the augment-in-place shape from §5a at section level. Canonical PC-2 instance: §L3 Step 3 amendment-time block appended at spec-amendment commit `53fe0a2`.
  - **(b.i.3) Augment-in-place at section level** — amendment-time content inlined within the original Step 3 subsection (rather than appended as a separate sub-section). Appropriate only when amendment-time content is small enough to inline without fragmenting the original subsection's narrative; rarely the right call for substantive amendments.
- **(b.ii) Append findings to §8 + amend §3/§5/§6/§7 directly + leave §L3 Step 3 implicit at the closing bridge** — appropriate only where findings are pure substance corrections without Q-shape AND no cross-section amendment-traceability or methodology-observation capture is wanted in-spec (e.g. D2 FK-target correction alone; D4 profile attribute set alone). The closing bridge's findings-disposition table carries the equivalent traceability. Rare for substantive amendments — most carry at least some Q-shape or methodology observations that warrant §L3 Step 3 capture.

The disposition is per-amendment, settled at the §5b checkpoint. The common case for amendments to pre-§L3-Step-3-methodology specs (PC-2, PC-1) is **hybrid + (b.i.2) preserve + append**: substance corrections fold inline at §1–§8 per Phase 1, with a small Phase 2 §L3 Step 3 amendment-time block appended via (b.i.2) carrying Q-resolution cross-references, cross-section summary, pickup list, and SS entries. PC-2 amendment confirmed this shape across 27 atomic Edits (26 Phase 1 + 1 Phase 2) at spec-amendment commit `53fe0a2`. Pure (b.ii) is opt-in only when findings genuinely carry zero Q-shape and zero methodology observations worth in-spec capture; (b.i.1) replace and (b.i.3) augment-in-place at section level are opt-in only with explicit rationale.

**Sources-status block extensions.** Per PC-3 §L3 Step 3 SS-17/SS-18/SS-19/SS-20 precedent, methodology observations surfaced during fold-back (e.g. cross-section drift caught at fresh-read; pattern-variant blindness in a grep; enumeration-claim-scoping near-misses) get appended as numbered SS entries. New SS entries inherit the existing block's numbering — if the spec has SS-1 through SS-N, new entries continue from SS-(N+1).

**Phase 2 checkpoint surfacing.** Before authoring the §L3 Step 3 block (or §8 additions for case b.ii):

- **Disposition decision** — (a) / (b.i) / (b.ii) / hybrid, with one-line rationale.
- **Q-resolution slate** — for each finding that carries Q-shape: which §8 question it opens or settles; disposition (Resolved at amendment / Deferred to follow-on / Routed to ADR amendment / Pickup-listed); disk anchor cited.
- **§L3 Step 3 block structure** (if case (a) or (b.i)) — Q-resolution slate; pickup lists for downstream entities; new SS entries to append.
- **§8 amendments** — new Q numbers added, existing Q statuses updated.

Wait for ratification before authoring.

---

## §5c Phase 3 — ADR amendments

**Activity.** For each finding requiring ADR amendment per Phase 2's Q-resolution slate, draft an append-only Option A ADR amendment. One commit per ADR.

**Shape variants — choose by substance.** Three append-only Option A shape variants are precedented at PC-3:

- **THREE-COMPONENT SCOPE** (ADR-U006 precedent): new Implementation commitments section with three named components of implementation. Used for adds — the ADR gains commitments it didn't carry before.
- **FOUR-COMPONENT SCOPE** (ADR-U007 precedent): same shape, four components. Same disposition: adds.
- **THREE-DISTINCTION SCOPE** (ADR-U018 precedent): clarification-of-intent shape codifying three distinctions that were already implicit. Introduces a framing paragraph between lead and scope block to flag the clarification-vs-contraction semantic. Used for codifying implicit framings — the ADR doesn't gain new commitments, but explicit text now distinguishes what was implicit.

Pick the shape that matches substance; new variants are acceptable when substance-aligned (the precedented three are the durable shapes, not a closed set).

**Per-ADR ritual** (per PC-3 §L3 Step 3 precedent):

1. Fresh-read current ADR text.
2. Scope decision — which shape variant; which components/distinctions; which disk anchors.
3. Draft amendment (Date line update + amendment section).
4. Structural inventory + Tripwire #4 anchor uniqueness verification (per §6 self-checking discipline).
5. Print-batch-before-gate surface to the human; absorb tightenings.
6. Edit 1 (Date line) → Edit 2 (section insertion).
7. Single commit with structured body — body cites the spec-amendment commit + the source-bridge provenance + the disk anchors.

**Phase 3 checkpoint surfacing.** Before drafting each ADR amendment, surface a structured summary:

- **Scope** — which Q-resolution drove this ADR amendment; which shape variant; which components/distinctions/refinements.
- **Disk anchors** — file paths + line anchors cited.
- **Provenance citations** — spec-amendment commit SHA + source-bridge path + Q-resolution reference.
- **Order of ADR amendments** — if multiple ADRs are touched, sub-batch-of-1 commit cadence across them, in a fixed order surfaced and ratified at this checkpoint.

Wait for ratification at each ADR's surface point.

---

## §6 Self-checking discipline — Tripwire #4 substitute

The bouncing-partner cycle in manual-track runs catches a class of errors (oldText stale-context recovery, cross-section anchor confusion, commit-shape under-inspection, OLDFEAT head-truncation) as structural byproduct. Autonomous runs do not have this catch-surface. The Experiment B comparison-phase named this absence as a real risk; the disciplines below substitute structurally for what the bouncing-partner produces ambient. Amendment sessions run under the same disciplines as autonomous derivation runs — by reference, with no amendment-specific sub-shape adaptations.

**Hard rules** (verbatim alignment with autonomous template §6):

- **Fresh-read before every Edit; never construct `oldText` from memory.** Re-read `{SPEC-PATH}` before constructing the `oldText` for each Edit, even when a prior Edit in the same session landed in the same section.
- **Structural-inventory-before-defect-assertion.** Before claiming a real defect in composed content, do a structural inventory of the composed draft (heading count, sentence count, token-occurrence audit).
- **Enumeration-claim-scoping** (SS-16/SS-17 lineage). For any enumeration-based verdict: state the patterns searched + report scope as "no hits within [patterns]" rather than "no hits anywhere." For amendment work, this applies particularly when verifying that a fold-back amendment hasn't introduced an inconsistency elsewhere in the spec — state the cross-references searched, not "the spec is now consistent."
- **Verify-before-asserting on commit-shape claims.** Before claiming a commit's body shape from `git log --oneline`, fresh-read the full commit body with `git log -1 --format=%B <sha>`. Applies particularly to citations of the source-bridge commits + the spec's most-recent-derivation commit.
- **Cross-section fresh-read before second-touch Edits.** When a Phase 2 Edit touches a section that was previously amended in Phase 1 (or a Phase 3 ADR amendment touches an ADR cross-referenced in a Phase 1 spec amendment), fresh-read the section's current disk state before composing the new Edit. The PC-3 §L3 Step 3 SS-20 lineage (Q-numbering drift surfaced via cross-section fresh-read) is the canonical instance of this discipline's value.
- **Listing commands use explicit counts.** State-read pass commands that list directories use `ls dir/ | wc -l` or full `ls dir/`, never `head`-truncated previews.

**Methodology-framing space.** Amendment sessions can surface meta-altitude observations during fold-back (cross-section drift discoveries; pattern-variant blindness near-misses; consistency-check failure modes). The template does not prescribe how to be sharp, but it makes space: surface methodology-framing observations alongside substance fold-back throughout the run, not only at §13 post-run capture.

---

## §7 Carry-forward priors (named) — by reference

Amendment sessions inherit the priors table from the autonomous L1→L3 template by reference. The priors are named here for traceability; the full statement of each prior lives in `docs/templates/autonomous-l1-l3-session-opener.md` §7.

| Prior | Applies when | Source |
|---|---|---|
| **P-O1** | Fold-back touches actor-primitive language in §3 / §5 / §6 / §L3. The PC-2 amendment is the canonical instance — Group A item 1 (D1+X2 actor primitive correction) directly drives multi-section fold-back. | Autonomous template §7; Experiment A bridge Group C item 8; PC-3 promotion. |
| **D7** | Fold-back touches role-name vocabulary in §2 / §5. | Autonomous template §7; Experiment A bridge Group C item 9. |
| **X3** | Fold-back touches `has_permission` signature or any ADR-disk signature drift. If ADR-U007 was already amended at the source spec's close, X3 is informational; if not, ADR amendment is in-scope at Phase 3. | Autonomous template §7; Experiment A bridge Group B item 5. |
| **X5** | Fold-back touches service-role escalation patterns in §3 / §6 / §7. | Autonomous template §7; PC-3 §L3 Step 2 C3-2 + PC-1 Finding #4 channel reframe. |
| **Finding #4** | Fold-back touches secrets/credentials substrate (app-tier, not database-tier). | Autonomous template §7; PC-1 entity bridge Finding #4. |
| **Multi-role memberships (D3)** | Fold-back touches membership-role capability surface. PC-2 amendment is the canonical instance for the PC-2-relevant slice. | Autonomous template §7; Experiment B comparison-phase bridge disposition #1. |
| **{Spec-specific carry-forwards}** | {Per `{FINDINGS-ENUMERATION-BLOCK}` — any priors enumerated in the source bridges specific to this spec.} | {Source bridge citation.} |

The "applies when" column is informational — it does not gate the prior; the prior holds throughout the session and applies wherever its pattern fires.

---

## §8 Findings enumeration — verbatim from source bridges

*This section is `{FINDINGS-ENUMERATION-BLOCK}` — authored at instance creation by transcribing the enumerated findings from `{SOURCE-BRIDGE-PATHS}`. Preserve group/category labels from the source (e.g. Group A / Group B / Group C from the Experiment A bridge). Each finding carries: identifier (e.g. D1+X2, C1.6, D3); one-line statement; source-bridge citation; group/category label from source; ADR amendment candidacy (yes / no / TBD).*

*The transcription is verbatim where the source bridge's wording is the canonical statement of the finding. Light editorial cleanup (consistent identifier formatting; consistent section anchors) is acceptable; substance edits are not.*

### Template shape for each finding

```
- **{Finding identifier} — {one-line statement}.** {Source-bridge citation, e.g. "Experiment A bridge Group A item 1"}. {Section-touch hint, e.g. "Affects §3, §5, §6, §L3"}. **ADR amendment candidate:** {Yes / No / TBD — if yes, which ADR}.
```

### Group A — {label from source bridge, e.g. "Material substance corrections"}

- *(authored at instance creation per template above)*

### Group B — {label from source bridge, e.g. "Substantive content adds"}

- *(authored at instance creation per template above)*

### Group C — {label from source bridge, e.g. "Methodology / pattern observations"}

- *(authored at instance creation per template above. Group C items often route to §13 / pickup-list rather than spec-amendment, since methodology observations don't typically fold into §1–§8 — but each item is adjudicated individually at Phase 1 checkpoint.)*

### Additional findings — {label, e.g. "PC-3 Q6 display-name coupling"} / {label, e.g. "Experiment B D3 multi-role memberships"}

- *(authored at instance creation per template above. These are findings that originated outside the primary source bridge — e.g. PC-3 closing bridge routed Q6 to this amendment; Experiment B comparison-phase bridge added D3 as a fold-back candidate.)*

---

## §9 Disciplines in effect — by reference

Amendment sessions inherit the durable disciplines from the autonomous L1→L3 template's §9 by reference. The disciplines apply equally to amendment work; no amendment-specific overrides or additions.

Inherited disciplines (full statements in `docs/templates/autonomous-l1-l3-session-opener.md` §9):

- State-read at session-open and after permission gates / tool-result clusters.
- Verify-before-asserting — commit-shape claims, enumeration scope, cross-section content, any second-touch Edit.
- No Greek characters as labels. ASCII-only identifiers (numbers, letters, descriptive names). Hard rule.
- Move-and-correct disposition. First-time-right is not the goal; wrong-shaped findings are signal. Surface and correct rather than block.
- Sub-batch-of-1 multi-Edit cadence default. Sub-batch-of-3 is opt-in only if discipline earns it. (For amendment work specifically: sub-batch-of-1 is the *recommended* default at Phase 1 given the multi-section fold-back scope; sub-batch-of-3 should not be attempted at Phase 1 even if discipline holds at earlier phases.)
- **Pre-emit announcement before every Edit.** Surface the full diff (`oldText` / `newText`) for review at the gate before the Edit lands. Pair with fresh-read of `{SPEC-PATH}` immediately preceding diff construction — re-read the target section to prevent stale-line-number errors after multi-Edit drift, especially when prior Edits in the same session shifted line numbers in the working region. The pre-emit + fresh-read + gate triplet is what substitutes structurally for the bouncing-partner cycle's catch-surface at Tripwire #4; both halves are load-bearing. Inherited from PC-2 derivation memory + autonomous template §6's "Fresh-read before every Edit" hard rule; promoted to first-class §9 discipline at PC-2 amendment close per closing-bridge methodology data point.
- Append-only Option A for ADR amendments (three shape variants precedented).
- In-commit-consistency. Fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit; do not defer to doc-health-check.
- Forward-only correction. Prior commits carry their own provenance; do not rewrite history.
- Canonical specs on `main` via deliberate provenance-citing commits. Amendment work is canonical work; experiment branches do not apply.
- OLDFEAT (`docs/TMP/OLDFEAT/`) read disposition: confirm at session-open whether the blindness invariant carries forward to this amendment, or has been disposed-of since by a post-Experiment-B reconciliation. Default: blindness invariant carries forward until explicit disposition. (For amendment sessions specifically, OLDFEAT is typically out-of-scope by §3 scope-locked discipline — the amendment folds enumerated findings, not OLDFEAT reconciliation.)

---

## §10 Output expectations and commit shape

Amendment sessions typically produce **3–6 commits**:

1. **Spec amendment commit (1)** — combined Phase 1 + Phase 2 amendments to `{SPEC-PATH}`. May partition into two commits (substance corrections separate from Q-resolution / §L3 Step 3 additions) if findings split cleanly along that boundary; PC-3 precedent collapsed them into one spec-amendment commit + separate ADR-amendment commits.
2. **N ADR amendment commits** — one per ADR amended at Phase 3. Sub-batch-of-1 across ADRs. PC-3's session-pair produced 3 (U006 / U007 / U018); amendment sessions may produce 0–N depending on the Q-resolution slate.
3. **Closing bridge commit (1)** — at `docs/planning/sessions/{INSTANCE-DATE}_NN_-_{SPEC-SHORT-NAME}-AMENDMENT-LANDED.md` per §11 below.
4. **STATUS.md amendment commit (1, separate)** — marks `{SPEC-SHORT-NAME}` amendment `Done`, fills in Closing bridge column, §13 captured column, Template revision column. Separate commit per the convention established for autonomous L1→L3 entity closes.

**No push to origin** at session close. The human dispositions push as a deliberate next step.

---

## §11 Closing bridge — required sections

The closing bridge at `docs/planning/sessions/{INSTANCE-DATE}_NN_-_{SPEC-SHORT-NAME}-AMENDMENT-LANDED.md` follows the standard `docs/templates/session-bridge.md` shape, with these additional sections required for amendment sessions:

- **Explicit closure statement:** "*{SPEC-SHORT-NAME} {SPEC-FULL-NAME} amendment session completes at this commit batch. Pending findings folded; spec at `{SPEC-PATH}` now reflects [list of source-bridge findings folded, by group].*" Matches PC-3 closing-bridge precedent's "PC-3 Organisation L1→L3 derivation completes at this commit batch" shape.
- **Findings disposition table** — one row per finding from `{FINDINGS-ENUMERATION-BLOCK}`. Columns: Finding (identifier) | Group | Status (Folded into §N / Deferred to follow-on amendment / Out-of-scope per §3 / Pickup-listed to {downstream entity}) | Anchor in amended spec (section + paragraph reference, or commit SHA + line range for ADR amendments).
- **Pickup lists** for findings that surfaced during fold-back but are out-of-scope per §3 scope-locked discipline. Each pickup entry: receiving target (next amendment session / downstream entity / Phase 2 close-out / doc-health-check pickup); substance routed; disk anchors.
- **Source-bridge provenance citations** — explicit citation of every `{SOURCE-BRIDGE-PATH}` consumed, with the specific section of each bridge that carried the folded findings. Required per STATUS.md amendment-table top-of-section provenance discipline.
- **Methodology data points** captured this run — bridge-prose observations distinct from substance findings (e.g. cross-section drift caught at fresh-read; enumeration-claim-scoping near-miss; cadence-discipline observations; per-section fold-back order observations). Same shape as PC-3 closing-bridge Methodology data points section.
- **Template revision disposition** — adjudicates whether the run's §13 post-run methodology capture (instance file, see below) surfaced durable findings warranting a `docs/templates/spec-amendment-session.md` amendment. Either *no revision proposed* (with one-line rationale) or *revision proposed* (with the specific change). The Revision history table at the top of the template is updated in the same commit when a revision lands.
- **Carry-forward to next amendment session** (if any) — what the next amendment session's instance must inherit. Typically light for amendment work: prior amendment closes do not generally carry forward into successor amendment sessions the way derivation entity closes carry forward to successor derivation entities, but cross-amendment findings (e.g. PC-2 amendment surfacing a PC-1 implication) route here.

---

## §12 Scope boundaries

- **`{SOURCE-BRIDGE-PATHS}` is the enumeration scope.** Findings outside the enumerated set are out-of-scope per §3 scope-locked fold-back discipline.
- **Other amendments queued in STATUS.md are NOT touched.** PC-1 amendment after PC-4; OLDFEAT reconciliation; any future amendment — out of scope at this session. Cross-amendment implications route to the receiving amendment's pickup-list.
- **Cross-spec implications.** If a finding has implications for another spec, route to that spec's pickup-list channel rather than amending here. Example: a PC-2 amendment finding that implies a PC-1 amendment routes to the PC-1 amendment's `Pending findings` column in STATUS.md.
- **OLDFEAT blindness invariant.** Confirm at session-open whether it still applies (default: yes until explicit disposition). For amendment sessions specifically, OLDFEAT is typically out-of-scope by §3 even if the blindness invariant has been lifted — the amendment's evidence scope is the source bridges, not OLDFEAT.
- **Downstream entity work.** Amendment sessions do NOT touch downstream entity work (FEAT-{SPEC-SHORT-NAME}-* feature specs; code; tests). Fold-back is to the canonical spec only.
- **Doc-hygiene out of scope.** Doc-health-check pickups (G-21, etc.) are out-of-scope for amendment work; the amendment folds the substantive findings, not doc-hygiene cleanup. Doc-hygiene runs as separate cycle work per PROCESS.md.

---

## §13 Post-run methodology capture (required, lighter than autonomous)

After Phase 3 lands and BEFORE the closing bridge is authored, the amendment run answers the following three prompts. Output flows into the closing bridge's Methodology data points section AND informs the closing bridge's Template revision disposition section.

The three prompts:

1. **What worked from this template that the next amendment session should keep, and what got in the way?** Name specific sections, disciplines, or scope items that demonstrably helped — and specific sections, instructions, or scope items that fired noise rather than catch, duplicated other sections, or didn't apply to this amendment. Be concrete — "§3 scope-locked fold-back kept the session from drifting into adjacent disk reads" is more useful than "the scope sections worked."
2. **What discipline or scope item did you wish was named that wasn't?** Things that, with hindsight, would have helped at Phase 1 / Phase 2 / Phase 3 had they been in the template. Particularly relevant: amendment-specific failure modes the template doesn't yet name (e.g. a cross-amendment dependency that the §12 scope-boundary language didn't catch; a Phase 1 fold-back checkpoint shape that didn't surface a needed adjudication).
3. **What new finding surfaced during fold-back that wasn't in the input bridges, and where did it route?** Amendment-specific channel — captures the "adjacent findings discovered mid-fold-back" failure mode per §3's record-and-route discipline. List each such finding, its substance, and its routing disposition (pickup-listed to next amendment / pickup-listed to downstream entity / Phase 2 close-out / doc-health-check / new follow-on amendment proposed).

**§13 checkpoint surfacing.** Before authoring the closing bridge, surface the three prompts' answers as discrete units to the human for ratification (parallel to §5a / §5b / §5c checkpoints at their phase boundaries):

- **Prompt 1 answer** — what worked / what got in the way. Discrete answer; bullet-form or short prose.
- **Prompt 2 answer** — discipline or scope item wished-for but absent. Discrete answer.
- **Prompt 3 answer** — adjacent findings surfaced mid-fold-back and their routing dispositions. Discrete answer.

Wait for ratification before authoring the closing bridge. The discipline guards against the compression failure mode where bridge-authoring inlines §13 substance preemptively — answers may be substantively correct but lose the structural-reflection shape, and the bridge's Methodology data points / Template revision disposition sections lose the discrete-answer provenance. Ratification at the discrete-answer altitude restores the shape before §13 substance folds into bridge prose. Canonical PC-3 instance: this compression fired at the PC-3 amendment's closing-bridge ratification gate — substance correct, discipline-shape compressed (closing bridge inlined §13 substance into Methodology data points without surfacing discrete-prompt answers first).

The post-run capture is structural reflection, not informal aside. Its length scales with run scope — a tight amendment with few mid-flight findings might produce a quarter-page; a larger amendment that surfaced cross-section drift may produce a half-page or more. Brevity is fine when there is genuinely nothing to surface; padding is not.

---

## §14 Start sequence

Begin with §1 Pre-flight checks. If all five pass, proceed to §2 State-read pass. Then §5a Phase 1 fold-back. Surface the §5a checkpoint before the first Edit.

---

*End of template.*
