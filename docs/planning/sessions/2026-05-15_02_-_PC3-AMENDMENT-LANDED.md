# Session bridge: 2026-05-15 (2) — PC-3 Organisation amendment complete; D3 + P-O1 + SS-11 fold-in; Phase 3 zero ADR commits

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-15 (second bridge of 2026-05-15)
**Session type:** Spec-amendment session close. PC-3 Organisation amendment (canonical spec amended; §L3 Step 3 amendment-time block appended; zero ADR amendment commits per §5c provisional-zero stance). Follows `docs/templates/spec-amendment-session.md` template (post-PC-2-revision at commit `70cbd15`) + opener instance `docs/planning/sessions/openers/cc-pc3-amendment.md` (authored at commit `4f68400`). **Second instance** of the spec-amendment template post-revision.
**Chronological predecessor:** `2026-05-15_01_-_PC2-AMENDMENT-LANDED.md` (PC-2 amendment closing bridge).
**Substantive predecessors:** two source bridges per opener §2 Read 1 (PC-3 closing bridge `2026-05-14_02_-_PC3-STEP3-LANDED.md`; Experiment B comparison-phase bridge `2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`); PC-2 amendment closing bridge (chronological predecessor + template precedent).

---

## Session arc

State-read at session-open verified four of five pre-flight checks cleanly; check 4 (working tree state) hard-failed on an unnamed carry-forward modification (`docs/planning/sessions/openers/cc-execute-prompt.md`), waived by adjudication as an opener-authoring miss (the PC-2 amendment opener named this carry-forward; the PC-3 opener-authoring dropped it). State-read pass otherwise confirmed source-bridge provenance with no drift from opener §8 enumeration. Phase 1 ran **8 atomic Edits across frontmatter + §2/§3/§5/§6 + §L3** under sub-batch-of-1 multi-Edit cadence with pre-emit + fresh-read + gate per Edit. Phase 2 ran **2 Edits** appending the §L3 Step 3 amendment-time block + SS-21 per **Case (a)** disposition (existing Step 3 block; amendment-time sub-section appended under). Phase 3 zero ADR amendment commits per **§5c provisional-zero stance** ratified after per-finding re-adjudication. Single combined Phase 1+2 spec amendment commit landed at **`058d9e5`**.

---

## PC-3 Organisation amendment session completes at this commit batch

Explicit closure statement per opener §11. Pending findings folded; spec at `docs/platform/core/organisation-specification.md` now reflects: **D3 multi-role memberships adjudication outcome (a)** — PC-3-relevant slice with substance folded at §2 Concepts Group Role row + §5 Storage new junction paragraph naming `public.user_group_roles` + §L3 capability Group Role lifecycle row; **P-O1 program-level promotion citation** augment-in-place at three actor-primitive anchors (§3 SQL helpers, §6 actor-primitive partition, §L3 capability "Personal-group actor primitive" row); **SS-11 A-candidate #9 ratification status** augment-in-place at the Sources-status block.

---

## Load-bearing output

**Single combined spec amendment commit `058d9e5`** lands the full Phase 1 + Phase 2 substance per PC-2 amendment commit `53fe0a2` precedent. Substance:

- **Phase 1 (8 Edits):** frontmatter `last_updated` 2026-05-13 → 2026-05-15 (in-commit-consistency housekeeping; separated from finding fold-back per commit-message tightening); §3 SQL helpers `get_current_personal_group_id()` bullet P-O1 Anchor 1 (augment-in-place sentence-level addendum); §6 PC-2/PC-3 actor-primitive partition P-O1 Anchor 2 (augment-in-place at end of partition prose, before cross-spec implication paragraph); §L3 capability "Personal-group actor primitive" row P-O1 Anchor 3 (cell-bound addendum at end of Capability cell per host-convention guidance); §L3 Sources-status SS-11 augment-in-place (A-candidate #9 ratification status); §2 Concepts "Group Role" row D3 substance (Definition cell refinement naming multi-role-per-membership via `user_group_roles` composite-PK junction + Persisted-in cell addition); §5 Storage new "Multi-role-per-membership junction — `public.user_group_roles`" paragraph between `public.role_permissions` bullet and System-group seeding paragraph (junction framed as peer to `public.role_permissions`; "Six anchor tables" lead-in preserved); §L3 capability "Group Role lifecycle" row D3 substance (cell-bound refinement naming the junction and cross-referencing §5 multi-role paragraph).

- **Phase 2 (2 Edits):** `#### Step 3 amendments (PC-3 amendment, 2026-05-15)` sub-section appended under existing `### Step 3 — adjudication and pickup` block per **Case (a)** disposition (existing Step 3 block; amendment-time sub-section appended). Block carries: Disposition statement; Cross-section amendment summary table (3 finding rows); D3 adjudication outcome (a) rationale; Pickup list (cold-vs-disk naming drift; P-O1 program-level methodology; A-candidate #9 cross-entity ratification); new SS-21 cross-reference. SS-21 appended to Sources-status block as D3 adjudication record. No SS-22 added — methodology observations route here at bridge altitude per opener §5b guidance.

- **Phase 3 (0 commits):** Per §5c provisional-zero stance ratification. ADR-U006 / ADR-U007 / ADR-U018 already post-PC-3-close (`edf72d3` / `3697732` / `dd84a02`). Three findings re-adjudicated at §5c: D3 outcome (a) lands as schema-level fold-back (ADR-U007's three-layer permission model already accommodates multi-role at layer 2; no architectural shift); P-O1 is program-level methodology, not architecture; SS-11 is promotion-watch status update. No PC-3-amendment-time ADR commitment warranted.

Spec line count 439 → 464 (+25 net; 32 insertions / 7 deletions).

---

## Findings disposition table

| Finding | Group | Status | Anchor in amended spec |
|---|---|---|---|
| **D3** multi-role memberships PC-3 adjudication | Substance (Experiment B §Substance findings #1) | Adjudicated outcome (a) — PC-3-relevant slice with substance; fold-in landed at §2 + §5 + §L3 | §2 Edit #6 + §5 Edit #7 + §L3 Edit #8; commit `058d9e5`; SS-21 carries the adjudication record |
| **P-O1** program-level promotion citation | Methodology (Experiment B §Methodology findings + §Dispositions #3) | Augment-in-place at three anchors | §3 Edit #2 + §6 Edit #3 + §L3 Edit #4; commit `058d9e5` |
| **SS-11** A-candidate #9 ratification status | Methodology (Experiment B §Dispositions #4) | Augment-in-place at Sources-status block | §L3 Edit #5; commit `058d9e5` |

---

## Pickup lists

### PC-4 entry pickup
- **Cold-derived `role_permissions` vs disk-canonical `group_role_permissions` naming drift at §5.** Surfaced mid-fold-back at §5a checkpoint while planning Edit #7's junction-paragraph anchor. The spec's six-anchor-tables list at §5 names `role_permissions`; C3-5 in §L3 Step 2 names `group_role_permissions` as the actual disk table. Pre-existing cold-vs-disk drift, not introduced by this amendment. Out of scope per §3 scope-locked discipline. Route to PC-4 entry pickup or doc-health-check pickup.

### Program-level methodology (Phase 2 close-out)
- **P-O1 strongly-confirmed-systematic-bias promotion** — already in PC-2 amendment closing bridge §Pickup lists / Program-level methodology. PC-3 amendment re-cited P-O1 at three actor-primitive anchors in spec; full named-pattern crystallization remains at Phase 2 close-out per Experiment B disposition #3.

### DS-* Step 1 cross-entity ratification
- **A-candidate #9 framework-provided contract mechanisms** — promotion-watch armed; ratification awaits DS-* Step 1 recurrence. SS-11 amendment captures the convergent-evidence ratification at Experiment B comparison-phase; cross-entity recurrence is the next promotion gate.

### doc-health-check pickups
- **`role_permissions` / `group_role_permissions` naming drift** — alternative receiving channel for the PC-4 entry pickup above; either channel acceptable.
- **§L3 cold-derived inventory completeness against full rebuild migration table list** — adjacent observation: PC-3 §L3 Step 2 C3-5 enumerates 11 PC-3 universal-group tables (`groups`, `group_memberships`, `group_roles`, `user_group_roles`, `group_role_permissions`, `role_templates`, `role_template_permissions`, `group_templates`, `group_template_roles`, `permissions`, plus `users` from PC-2); §5 names six anchor tables + (post-amendment) one junction. Other tables (`group_templates`, `group_template_roles`, `role_template_permissions`) are not in §5; expected per cold-derivation methodology, but worth a doc-health-check review at next cycle boundary.

---

## Source-bridge provenance citations

Per opener §11 mandatory provenance discipline:

- **`docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md`** — PC-3 closing bridge (dual role: work-shape precedent + substantive predecessor). Sections consumed: §Pickup lists (PC-3 deferred-amendment-candidate framing); §L3 Step 3 closure summary (baseline state at spec commit `1ee9acc`); §Methodology data points (three ADR amendment shape variants — append-only Option A precedent informing §5c provisional-zero).
- **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge (load-bearing for finding enumeration). Sections consumed: §Substance findings #1 (D3 multi-role memberships disk evidence; autonomous-track `user_group_roles` junction with composite PK); §Methodology findings (P-O1 promotion observation; autonomous-track framing as catalyst); §Dispositions #1 / #3 / #4 (the three findings' routing decisions).
- **`docs/planning/sessions/2026-05-15_01_-_PC2-AMENDMENT-LANDED.md`** — PC-2 amendment closing bridge. Chronological predecessor + template-precedent. Sections consumed: §Methodology data points (four-instance §3/§9 seam framing inherited as watch flag); §Template revision disposition (seven revisions landed at `70cbd15` — second-instance applicability tested this session).
- **Spec-amendment template revision** at `docs/templates/spec-amendment-session.md` commit `70cbd15`. Second-instance application of the seven landed revisions.

---

## Methodology data points

§13 post-run methodology capture; bridge-prose framing for program-level retrospection. Substance also captured in commit `058d9e5`'s §L3 Step 3 amendment-time block (pickup list) and SS-21 (adjudication record); the bridge-prose here adds the second-instance-stress-test framing and methodology framing the spec does not carry.

**Second-instance-stress-test verdict — the seven landed template revisions held cleanly.** Per-revision audit:

| Revision (landed at `70cbd15`) | PC-3 second-instance outcome |
|---|---|
| (1) §3-vs-§9 seam at §3 with three sub-variants | **DID NOT FIRE.** Opener anticipated: small Edit envelope reduces seam-firing surface. Watch flag held; no parallel-anchor pattern surfaced this session. Revision is armed correctly for larger-scope amendments; small-scope PC-3 didn't exercise. |
| (2) Augment-in-place shape catalog at §5a | **HELD cleanly.** Used at four anchors (P-O1 ×3 + SS-11 ×1). Bold-labeled trailing sub-clause pattern was load-bearing; cell-bound shape disposition at §L3 capability row was the right call per host-convention guidance. Pattern naming gave a shared vocabulary at the §5a checkpoint. |
| (3) Altitude-separation disposition at §5a | **DID NOT FIRE.** Each finding had a single natural altitude or three parallel anchors at the same altitude. As anticipated by the opener. |
| (4) Adjudication-shape findings as §3 sub-class | **HELD cleanly.** D3's relevance-determination at §5a was the canonical instance; outcome (a) ratified before substance work. The PC-2 amendment precedent of D3 (PC-2-half adjudicated as no-relevant-slice) gave anchoring context but did NOT presume the PC-3 outcome — prior held correctly. |
| (5) Pre-emit announcement first-class at §9 | **HELD cleanly.** All 10 Edits pre-emitted at §5a (Phase 1) and §5b (Phase 2) checkpoints. Three tightenings caught at pre-emit gate (Edit #6 backticks + Persisted-in cell phrasing; Edit #9 "(commit forthcoming)" drop; commit-message housekeeping-bullet separation + template-revision provenance bullet) — caught at checkpoint boundary without entering Edit-author cycle. |
| (6) Ratified-additions discipline at §5a Edit cadence plan | **DID NOT FIRE.** Edit count stayed at 8 Phase 1 + 2 Phase 2 as planned at §5a; no mid-run additions. Discipline was armed but small scope didn't exercise. |
| (7) §5b (b.i.2) preserve+append as recommended default | **NOT TESTED.** PC-3 invoked **Case (a)** disposition (existing §L3 Step 3 block; amendment-time sub-section appended); Case (b) sub-variant (b.i.2) is for amendments to pre-§L3-Step-3-methodology specs (PC-1, PC-2). Case (a) framing was tested cleanly: recommended sub-section name `#### Step 3 amendments (PC-3 amendment, 2026-05-15)` landed without ambiguity. The (b.i.2) revision's applicability awaits PC-1 amendment. |

**D3 adjudication outcome (a) rationale (§13 prompt #3 required entry).** Multi-role-per-membership semantics live entirely within PC-3 schema territory (group/membership/role/permission model); no PC-4 governance shape on close read. PC-3's own §L3 Step 2 C3-5 already enumerates `user_group_roles` and `group_role_permissions` as PC-3 universal-group tables, but cold-derived §2 / §5 / §L3 did not crystallize the multi-role-per-membership semantic. "Group Role lifecycle" capability is the natural semantic home; multi-role is a refinement of that capability's surface, not a separate primary entity. Experiment B bridge's "PC-3 OR PC-4 governance" binary at §Dispositions #1 was a hedge; close read settles it clearly as PC-3 schema territory. PC-2 amendment adjudicated the PC-2-half of D3 as no-relevant-slice (pickup to PC-4 / Phase 2 close-out per `2026-05-15_01_-_PC2-AMENDMENT-LANDED.md`); the PC-3 adjudication independently lands the PC-3-half as in-spec fold-in. SS-21 carries the adjudication record without faking a §8 entry — no new §8 Q opened.

**Adjacent finding surfaced mid-fold-back (§13 prompt #3).** Cold-derived `role_permissions` (spec §5) vs disk-canonical `group_role_permissions` (C3-5 in §L3 Step 2) naming drift — surfaced at §5a checkpoint while planning Edit #7's junction-paragraph anchor. Pre-existing drift, not introduced by this amendment. Recorded at §L3 Step 3 amendment-time block pickup list (in spec); routed here to PC-4 entry pickup / doc-health-check pickup channels. The discipline held: §3 scope-locked discipline prevailed (do not expand current session scope to address pre-existing drift); the adjacent finding got record-and-routed.

**Template-revision candidates for hypothetical N+1 revision (§13 prompt #2).** Three surfaced this run:

1. **Opener §1 Check 4 carry-forward enumeration completeness.** PC-3 opener named `CLAUDE.md` but did not name `cc-execute-prompt.md` as an expected pre-existing carry-forward. PC-2 opener named both. The drop caused a hard-fail at §1 Check 4 at session-open, waived by adjudication. Future template revision: have §1 Check 4 instruct opener authors to enumerate ALL expected carry-forward modifications by name (not just `CLAUDE.md`). Avoids a hard-fail at every future amendment session-open until the carry-forward set changes.
2. **§5a Edit cadence plan — name frontmatter `last_updated` housekeeping as an expected baseline Edit.** §5a instructed enumerate every section the findings touch; it did not name "frontmatter last_updated housekeeping" as a separate expected baseline Edit. Edit #1 (frontmatter timestamp 2026-05-13 → 2026-05-15) was surfaced alongside finding folds at §5a and ratified, but the framing was ad-hoc; a template-named slot would avoid the disambiguation. Stefan's commit-message housekeeping-bullet separation reinforced the framing: frontmatter Edits are in-commit-consistency housekeeping, not finding fold-in. Naming the slot at §5a Edit cadence plan keeps the housekeeping/fold distinction explicit from §5a forward, not just at commit-message authoring.

**Augment-in-place anchor disambiguation gap (§13 prompt #1 — anchor-disambiguation gap).** Edit #3 (§6 actor-primitive partition P-O1 Anchor 2) had a minor ambiguity between "trailing sub-clause within paragraph 2" and "new paragraph between paragraphs 2 and 3" — both could be read as "end of sub-section's prose." Resolved at §5a checkpoint by recommending trailing-sub-clause for consistency with §3 Anchor 1's bullet-internal pattern. Template-revision candidate: augment-in-place catalog could pre-disambiguate which formal containment goes where (single-paragraph anchor = trailing sub-clause; multi-paragraph anchor with cross-spec/divisional paragraph following = trailing sub-clause at the end of the substantive paragraph before the cross-spec paragraph). Low priority; small scope; would have saved a few seconds of checkpoint adjudication.

**§13 capture discipline compression (§13 prompt #1 — discipline-shape gap).** Opener §13 specifies the three prompts are answered before the closing bridge is authored, then flow into the bridge. This session compressed the discipline: the bridge was authored with §13 substance integrated, rather than the three prompts being surfaced as discrete answers first. The substance is correct (prompt #1 augment-in-place gap + this entry; prompt #2 three template-revision candidates; prompt #3 D3 rationale + adjacent finding all captured in this Methodology data points section), but the discipline-shape was compressed. Caught by Stefan at closing-bridge-ratification gate; this entry retroactively-discretizes prompt #1's "what got in the way" answer. Routes to a third template-revision candidate below.

**Pre-emit + fresh-read + gate discipline held throughout 10 atomic Edits.** Sub-batch-of-1 multi-Edit cadence preserved at all gates; pre-emit caught three tightenings at the checkpoint boundary without entering Edit-author cycle. Stefan ratified each checkpoint with one or zero tightenings; the cadence absorbed bouncer adjustments efficiently. Second-instance application of the pre-emit discipline (revision #5) validated its first-class-at-§9 standing.

**Edit envelope held at 10 Edits (3-8 Phase 1 estimate from opener; 8 actual + 2 Phase 2).** Plan was 8 Phase 1 Edits at §5a (top of opener estimate); landed exactly 8. Phase 2 was 2 (within §5b range). No drift; ratified-additions discipline (revision #6) did not fire because no additions were needed. Small-scope amendment exercised the cadence cleanly without testing the drift-handling discipline.

---

## Tripwires

| # | Description | Status |
|---|---|---|
| 4 | Disk-of-record verification before asserting | ACTIVE — held throughout. Fresh-read-before-every-Edit held across all 10 atomic Edits; each Edit's anchor freshly verified despite ~25-line shifts during Phase 1 + 2. Three tightenings caught at pre-emit gate (not at Edit-author time) — pre-emit discipline functioning as designed. |
| 6 | Discipline-as-deferral | NOT FIRING — discipline-stack altitude held throughout 10 atomic Edits. Sub-batch-of-1 cadence preserved at all gates; no compounding errors. |

Tripwires #1, #2, #3, #5 — closed in prior bridges; not re-engaged this session.

---

## Repo state at session close

- Branch `main`. Tip at `058d9e5` (PC-3 amendment spec commit). After this bridge lands as the second commit of the session, branch will be at +2 commits from `origin/main` (was +0 at session-open — origin/main was already at `2da0b8e`; +1 spec amendment `058d9e5`; +1 this bridge pending). STATUS.md amendment commit lands as the third commit of the session (separate per opener §10), bringing the branch to +3.
- Working tree: `CLAUDE.md` modified-unstaged (pre-existing carry-forward across sessions; outside amendment scope); `docs/planning/sessions/openers/cc-execute-prompt.md` modified-unstaged (pre-existing carry-forward; §1 Check 4 enumeration miss per opener-authoring observation; not amendment scope).
- **No push to origin** at session close per opener §10 path convention.

---

## Template revision disposition

**REVISION PROPOSED (3 candidates + 1 lower-priority; SMALL scope vs PC-2 amendment's 7).** Second-instance application of the seven landed revisions at `70cbd15` validated five revisions cleanly (held / did not fire correctly); one was not tested (Case (b) sub-variants applicability awaits PC-1 amendment); none over-engineered for small-scope amendment. Three new template-gap candidates surfaced this run, ordered by template-gap severity:

1. **Opener §1 Check 4 carry-forward enumeration completeness.** Have §1 Check 4 instruct opener authors to enumerate ALL expected carry-forward modifications by name (not just `CLAUDE.md`). The PC-3 opener-authoring miss caused a hard-fail at session-open; future amendments would surface the same hard-fail until the carry-forward set changes. Routes to `docs/templates/spec-amendment-session.md` §1 Check 4 amendment (or, equivalently, to opener-author guidance in PROCESS.md / a skill).
2. **§5a Edit cadence plan — name frontmatter `last_updated` housekeeping as expected baseline Edit.** Add to template §5a Edit cadence plan section so frontmatter housekeeping is named explicitly (not surfaced ad-hoc alongside finding folds). Reinforces in-commit-consistency framing.
3. **§13 capture discipline — make discrete-prompt-answer-before-bridge-authoring shape explicit at §5c-to-closing-bridge transition.** Opener §13 names "After Phase 3 lands (or §5c provisional-zero confirmed) and BEFORE the closing bridge is authored, answer the following three prompts." The discrete-unit requirement is implicit in the prose but not enforced as a checkpoint surface analogous to §5a / §5b / §5c. PC-3 amendment surfaced this gap: §13 substance was correct but discipline-shape was compressed (bridge authored with prompts embedded rather than prompts surfaced as discrete answers first). Future revision: add explicit §13 checkpoint surface (parallel to §5a / §5b / §5c) at the §5c-to-closing-bridge boundary. Routes §13 answers to a structured surface for ratification before bridge-authoring; closes the discipline-compression failure mode.

**Lower-priority candidate (single instance; low template-gap severity):**

- Augment-in-place catalog at §5a could pre-disambiguate single-paragraph-anchor vs multi-paragraph-anchor formal containment. Surfaced once at Edit #3 (§6 anchor); resolved at §5a checkpoint without friction. Optional revision; would save seconds at future amendments.

**Routing:** spec-amendment-session template revision proposal at the next opportunity — either next amendment opener authoring (PC-1 amendment, sequenced after PC-4 entry), or a dedicated template revision session. The Revision history table at the top of `docs/templates/spec-amendment-session.md` should record this proposal when (and if) the revision lands. No revision authored in this session; this is the proposal record.

---

## Carry-forward to next amendment session (PC-1)

Light. Next amendment in queue per STATUS.md is PC-1 Infrastructure (sequenced after PC-4 entry; not the immediate next session). PC-3 amendment's findings disposition is isolated from PC-1 scope per the source bridges' routings.

- **Template revision proposal** (above) — to surface when PC-1 amendment opener instance is authored, or earlier if dedicated template revision session is scheduled before PC-1 amendment opens. Two candidates this run; PC-2 amendment's seven landed at `70cbd15` suggest dedicated template-revision sessions are the right shape rather than amending the template inline at each amendment-opener authoring.
- **`role_permissions` / `group_role_permissions` naming drift** — pickup channel per above; PC-4 entry or doc-health-check at next cycle boundary. Not specific to PC-1 amendment scope; either channel acceptable.
- **P-O1 program-level methodology crystallization** — Phase 2 close-out (after PC-4 lands), per Experiment B disposition #3. Already in PC-2 amendment carry-forward; PC-3 amendment re-cited at three anchors. Not PC-1-amendment-scope.
- **A-candidate #9 cross-entity ratification** — DS-* Step 1 recurrence (Phase 3 entry). Not PC-1-amendment-scope.

PC-1 amendment inherits no PC-3-amendment-specific carry-forward beyond the template revision proposal and the standard pickup-list channels.

---

*End of bridge.*
