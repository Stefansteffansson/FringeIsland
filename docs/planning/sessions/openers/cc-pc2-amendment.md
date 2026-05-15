# Spec-amendment session-opener — `PC-2 Identity amendment`

**Template path:** `docs/templates/spec-amendment-session.md`
**Per-instance landing path:** `docs/planning/sessions/openers/cc-pc2-amendment.md`
**Instance filename convention:** `cc-{spec-short-name}-amendment.md` (this instance: `cc-pc2-amendment.md`)

> Per-instance session-opener for the PC-2 Identity amendment session — folds the enumerated set of Experiment A + Experiment B + PC-3 closing-bridge findings into the canonical PC-2 spec at `docs/platform/core/identity-specification.md`. Scope-locked fold-back; three-phase shape (fold-back → Q-resolution + §L3 Step 3 → ADR amendments) per PC-3 §L3 Step 3 precedent. Section §0 from the canonical template has been deleted post-substitution per template convention.

---

## §1 Pre-flight checks — STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `fb5c20b` (the session-author-time tip, or any subsequent commit added by the human between sessions — including the `cc-pc2-amendment.md` authoring commit + the STATUS.md In-flight-mark commit, which both land between authoring and session-execution). Hard-fail if tip is earlier than `fb5c20b`.
4. **Working tree state.** Run `git status`. Expected: `CLAUDE.md` modified-unstaged (pre-existing across sessions; outside scope; acceptable) and any other pre-existing carry-forward modifications named in the session-author state-read (e.g. `cc-execute-prompt.md` carry-forward). No untracked files in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `docs/platform/core/`. Hard-fail on any other modification or untracked file.
5. **Spec at expected state.** Run `git log --oneline -1 -- docs/platform/core/identity-specification.md`. Expected (empirically verified at instance authoring): `0565d65 docs(platform-core): PC-2 Identity L1→L3 specification (Steps 1–3)` — the spec's single derivation commit, un-amended since. This matches the Experiment B comparison-phase bridge's load-bearing integrity check. Hard-fail if the spec has been amended at an unexpected commit since this instance was authored — that case requires the human to adjudicate whether the pending findings still apply as enumerated, or whether some have been folded already.

After all five pass, report each check's outcome and proceed to §2.

---

## §2 State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

1. **The four source bridges**, in chronological order:
   - `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` — PC-2 entity-bridge (the spec's original derivation close).
   - `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` — Experiment A close; load-bearing for Group A / Group B / Group C enumeration at §8 below.
   - `docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md` — PC-3 closing bridge; routes Q6 display-name coupling to the PC-2 amendment list; ADR-U007 amended at this close (commit `3697732`); ADR-U006 amended at split-bridge session (commit `edf72d3`); ADR-U018 amended at this close (commit `dd84a02`).
   - `docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md` — Experiment B comparison-phase bridge; D3 multi-role memberships divergence; PC-2 amendment unblocked per disposition #7.
2. **`docs/platform/core/identity-specification.md`** — fresh-read the canonical spec in full. This is the artifact being amended; its current §1–§8 + §L3 + (if present) §L4 content is the baseline against which fold-back amendments compose.
3. **`docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md`** — PC-3 closing bridge (already read in step 1). The work-shape precedent. Sections to internalize: the §L3 Step 3 block structure (Q-resolution slate + spec amendments + ADR amendments + pickup lists); the three ADR amendment shape variants (THREE-COMPONENT / FOUR-COMPONENT / THREE-DISTINCTION); the closing-bridge required sections (findings disposition + pickup lists + methodology data points + template revision disposition).
4. **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge (already read in step 1). Surfaces the additional fold-back findings beyond the original source bridges (D3 multi-role memberships) and the methodology dispositions that govern amendment work (ADR amendments at entity close as durable discipline; canonical-vs-experiment-output asymmetry; PC-2 amendment unblocked).
5. **`docs/templates/platform-core-spec.md`** — the template the spec was originally derived against. Load-bearing for §6 cross-section fresh-reads: confirms which sections exist in the spec's canonical shape and where each finding's fold-back target lies.
6. **ADRs named in §8 closed-pre-amendment + adjacency-checked list** — for each ADR, fresh-read the ADR's current state. **ADR-U007** was amended at PC-3 close (commit `3697732`); fresh-read both the original Decision text AND the Implementation commitments (PC-3 Step 3 amendment) section; this PC-2 amendment session treats X3 as closed-pre-amendment. **ADR-U006** was amended at split-bridge session (commit `edf72d3`) with three-component scope (FK direction (a) + immutability (b) + supervised-bypass (c)); its Consequences section names `get_current_personal_group_id()` as a key function. Fresh-read confirms PC-2's D1+X2 fold-back is **consumer-side use** of an already-codified primitive — no further ADR-U006 amendment warranted (provisional-zero stance ratified at instance authoring; re-checkable at §5c).
7. **`docs/platform/core/CLAUDE.md`** — sub-tier CLAUDE.md (PC-2 does not yet have an entity-level CLAUDE.md; the sub-tier CLAUDE.md is the relevant read). Read-only check; rarely amended in fold-back, but the temporary anchor naming PC-2 as the home of the four roles + `has_permission()` was migrated to PC-3 at PC-3 close — verify the migration landed cleanly and the sub-tier file's current state.
8. **`docs/planning/sessions/openers/STATUS.md`** — Amendment sessions table; confirm PC-2 Identity row reads `In flight` (the human marks `In flight` at session-open; if reads `Next`, the human's STATUS.md flip did not land — surface), `Opener instance` column links to this instance file, `Pending findings` aligns with §8 enumeration scope, and no out-of-sequence amendment has been started.

After the state-read pass, surface a structured summary: (i) source-bridge transcription provenance check (does §8 below still match the source bridges as currently on disk); (ii) spec baseline state (line count, sections present, last commit touching it — expected `0565d65`); (iii) ADR amendment-relevance state — ADR-U007 closed-pre-amendment at `3697732`; ADR-U006 adjacency-checked at `edf72d3` and no further amendment warranted; ADR-U018 closed-pre-amendment at `dd84a02` (no PC-2-relevant amendment scope); (iv) any divergence from expected. Wait for ratification before proceeding to §3.

---

## §3 Scope-locked fold-back — direction-of-authority discipline

Amendment sessions run with a **direction-of-authority opposite to derivation sessions**. The load-bearing statement is:

*Amendment sessions fold the enumerated findings from the four source bridges + §8 below INTO the PC-2 spec. They do NOT reach for fresh disk evidence outside that enumerated scope.*

This is the equivalent of the autonomous L1→L3 template's §3 "Authority chain for cold derivation" — same shape (a named direction-of-authority discipline that bounds the session's evidence sourcing), opposite direction (amendments fold pre-enumerated findings into an existing spec; derivations source candidate content from upstream authority into a new spec).

**In-scope evidence sources:**

- Every finding enumerated at §8 below.
- The four source bridges named in §2 step 1 — for finding context, disk-anchor citations, and provenance.
- The canonical spec at `docs/platform/core/identity-specification.md` — the artifact being amended; fresh-read per Edit per §6 self-checking discipline.
- ADRs named in §5c — fresh-read at Phase 3 ADR amendment time.

**Out-of-scope evidence sources:**

- Cold-derivation-style stress-testing of the spec against disk. The source bridges already did this work; re-doing it inflates session scope without changing the finding set.
- Opening adjacent disk artifacts (`supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, `lib/types/`, etc.) "to be sure" about a finding. The bridges already cite disk anchors at the specificity the fold-back needs; the fold-back consumes those citations.
- Re-surfacing findings the bridges already disposed-of or out-of-scoped. The Experiment B comparison-phase bridge disposition #7 explicitly unblocks PC-2 amendment; the deferred findings are now in-scope by inheritance.

**Mid-fold-back finding surface — record-and-route, do not expand scope.**

If during fold-back a new finding surfaces (e.g. a cited migration line turns out to be at a different anchor than the bridge cites; a fold-back into §6 reveals an ADR cross-reference that's stale; a Q-resolution implies a follow-on Q that wasn't on the source-bridge enumeration), the discipline is:

1. **Record at §13 post-run methodology capture** (prompt #3 — adjacent findings discovered mid-fold-back).
2. **Route to the closing-bridge pickup-list** per §11 — typically as a follow-on amendment candidate or a pickup for the next downstream entity (e.g. PC-1 amendment / PC-4 / Phase 2 close-out).
3. **Do NOT expand current session scope.** The amendment session lands the enumerated findings, not the bridges-plus-mid-flight discoveries.

The discipline guards against the standard scope-creep failure mode where "while I was already touching §6, I noticed X" extends a known-scope session into open-ended re-derivation. Amendment sessions are valuable precisely because their scope is closed at session-open; that property is worth preserving.

---

## §4 Three-phase work shape

PC-3 §L3 Step 3 is the work-shape precedent. This amendment session runs as three phases (vs derivation sessions' three steps):

- **Phase 1 — fold-back.** §1–§8 amendments per finding category from §8 below. Substance corrections (Group A material; Group B substantive adds), inline-folded into the canonical spec sections.
- **Phase 2 — Q-resolution + §L3 Step 3.** New §8 questions added where findings open them; existing §8 questions updated where findings settle them; §L3 Step 3 block authored (since PC-2 spec was authored before §L3 Step 3 was named methodology — case (b) per template §5b).
- **Phase 3 — ADR amendments.** Append-only Option A per ADR; one commit per ADR. **Provisional scope at instance authoring: zero commits.** X3 ADR-U007 is closed-pre-amendment at PC-3 close (`3697732`); ADR-U006 adjacency-check confirms PC-2 acts as consumer of the already-codified primitive (`edf72d3` three-component scope is sufficient); ADR-U018 carries no PC-2-relevant amendment scope. No firmly-identified Phase 3 commits at authoring time. Re-adjudicated at §5c if Phase 1 / Phase 2 surface new ADR implications.

The phases land sequentially as separate commit batches; each phase has its own checkpoint surface point before authoring (§5a / §5b / §5c respectively). Multi-session amendment runs are permissible but typically unwarranted — amendment scope is closed by definition and rarely large enough to split across sessions.

---

## §5a Phase 1 — fold-back

**Activity.** Author the §1–§8 amendments per finding category from §8 below. Each finding folds into the section(s) it materially corrects: actor-primitive findings (D1+X2) into §3 + §5 + §6; FK-target findings (D2) into §3 + §5; attribute-set findings (D4) into §2 + §5; account-lifecycle findings (C1.6) into §5 + §8; substantive content adds (consent/GDPR substrate at X4; service-role escalation at X5 reframe) into the relevant section per the bridge's framing.

**Inline-fold discipline — canonical, not preserved-as-cold.** Per Experiment B comparison-phase disposition #6, canonical runs inline-fold corrections into the final §1–§8 text. Amendment sessions are canonical runs. After Phase 1, §1–§8 should read as if the spec had been authored with the findings already known — Phase 2's §L3 Step 3 block documents the journey (which findings drove which amendments, with disk-anchor citations); §1–§8 documents the destination.

The "preserve-as-cold with deltas-flagged" shape is a legitimate methodology variant for experiment runs (per Experiment B comparison-phase disposition #6) but does NOT apply to amendment work.

**Carry-forward priors held — by reference to §7.** The priors that bound fold-back (P-O1, D7-closed, X3-closed, X5, Finding #4, multi-role memberships D3, PC-3 Q6 display-name coupling) are named in §7 below by reference; the full statement of each prior lives in the autonomous template's §7. Active-hold disposition during Phase 1 is the same as during cold derivation: when a fold-back amendment touches actor-primitive language, P-O1 applies; when it touches service-role escalation, X5 applies; etc. **Closed-pre-amendment priors (D7, X3) hold as cite-for-traceability discipline only** — they do not drive fold-back content, but their resolution must be cited when fold-back content references their substance.

**Single-Write vs split-Edit at Phase 1.** Amendment scope is typically larger per-touch than cold derivation (the canonical PC-2 spec is hundreds of lines; folding ~10 findings into it may touch 5+ sections), so **multi-Edit with sub-batch-of-1 cadence is the default Phase 1 shape**. Sub-batch-of-3 is opt-in only after the cadence holds for several Edits in this session; sub-batch-of-1 is the safe default.

**Phase 1 checkpoint surfacing.** Before the first Edit, surface a structured summary to the human:

- **Section-touch inventory** — for each section of `identity-specification.md` (§1, §2, §3, ...), which findings fold into it, and which Edits will land. Per PC-3 §L3 Step 3 precedent: a finding may touch multiple sections; one Edit per section per finding is the natural granularity.
- **Edit cadence plan** — total Edit count; sub-batch shape (default sub-batch-of-1); commit shape (typically one combined spec amendment commit per PC-3 precedent, but findings may partition naturally into multiple if the substance-vs-content-add boundary is sharp — e.g. Group A material corrections separate from Group B substantive adds).
- **Cross-section consistency watches** — sections that cite each other (e.g. §3 contract surface citing §6 auth-and-authz; §5 storage citing §8 questions); fold-back amendments to one side must preserve cross-references on the other side.
- **Carry-forward priors applied** — which §7 priors are active for which Edits; which closed-pre-amendment priors are cited.
- **Any divergence from the template's expected fold-back shape** — substance details the canonical spec's structure can't absorb cleanly without a section reshape (rare; flag for human adjudication before Edit).

Wait for ratification before the first Edit.

---

## §5b Phase 2 — Q-resolution and §L3 Step 3

**Activity.** Author the §L3 Step 3 block of `identity-specification.md` — PC-2 spec does NOT currently have a §L3 Step 3 block (case (b) per template; it was authored before §L3 Step 3 was named methodology at PC-3).

Two sub-cases govern the disposition:

- **(b.i) Author a full §L3 Step 3 block as part of the amendment** — load-bearing where findings carry Q-resolution shape (Q-numbered, with disposition + disk anchors + ADR amendment routing). This is the canonical-output shape and matches PC-3's precedent. Candidate findings for (b.i): P-O1 promotion (Group C item 8 + Experiment B disposition #3); PC-3 Q6 display-name coupling; Experiment B D3 multi-role memberships.
- **(b.ii) Append findings to §8 + amend §3/§5/§6/§7 directly + leave §L3 Step 3 implicit at the closing bridge** — appropriate where findings are pure substance corrections without Q-shape (D1+X2 actor primitive; D2 FK target; D4 profile attribute set; C1.6 account lifecycle). The closing bridge's findings-disposition table carries the equivalent traceability.

A **hybrid** is the most likely disposition for PC-2: (b.ii) for substance corrections (Group A + parts of Group B) + a smaller §L3 Step 3 block carrying the Q-shaped subset (Group C P-O1, PC-3 Q6, Experiment B D3). Final disposition settled at the §5b checkpoint.

**Sources-status block extensions.** PC-2 spec does not currently have an SS-numbered Sources-status block (PC-3's SS-17/SS-18/SS-19/SS-20 are the first numbered entries in any spec). If the §L3 Step 3 block is authored (case b.i / hybrid), seed SS-numbering fresh for PC-2 starting at SS-1; cite the source-bridge methodology observations that pertain to PC-2 fold-back. If pure (b.ii), no SS block; methodology observations land at the closing bridge.

**Phase 2 checkpoint surfacing.** Before authoring the §L3 Step 3 block (or §8 additions for case b.ii):

- **Disposition decision** — (b.i) / (b.ii) / hybrid, with one-line rationale.
- **Q-resolution slate** — for each finding that carries Q-shape: which §8 question it opens or settles; disposition (Resolved at amendment / Deferred to follow-on / Routed to ADR amendment / Pickup-listed); disk anchor cited.
- **§L3 Step 3 block structure** (if hybrid or b.i) — Q-resolution slate; pickup lists for downstream entities; SS entries to seed (if any).
- **§8 amendments** — new Q numbers added, existing Q statuses updated (e.g. Q7 account-lifecycle from "latent" to "partially-implemented" per C1.6).

Wait for ratification before authoring.

---

## §5c Phase 3 — ADR amendments

**Activity.** For each finding requiring ADR amendment per Phase 2's Q-resolution slate, draft an append-only Option A ADR amendment. One commit per ADR.

**Provisional scope at instance authoring: zero Phase 3 commits.**

- **ADR-U007** (X3 signature drift) — closed-pre-amendment at PC-3 close commit `3697732` (FOUR-COMPONENT SCOPE: disk signature + Tier-1/split-by-context composition + server-side Tier-1 calling conventions + permission count baseline). Cite for traceability only.
- **ADR-U006** (Universal Group Pattern, including the actor-primitive `get_current_personal_group_id()` D1+X2 touches) — adjacency-checked at instance authoring against the post-amendment state at commit `edf72d3` (THREE-COMPONENT SCOPE: FK direction codified (a) + immutability commitment (b) + supervised-bypass discipline (c); Consequences section names `get_current_personal_group_id()` as a key function). **PC-2's D1+X2 fold-back is consumer-side use of an already-codified primitive** — PC-2 §3 / §5 / §6 will document that PC-2 publishes `get_current_personal_group_id()` as the actor primitive (consuming what ADR-U006 authorises), not that ADR-U006 needs new commitments. Provisional-zero stance ratified at instance authoring.
- **ADR-U018** (no hardcoded group types) — closed-pre-amendment at PC-3 close commit `dd84a02` (THREE-DISTINCTION SCOPE); no PC-2-relevant amendment scope identified.

**Re-adjudication at the §5c checkpoint.** During Phase 1 fold-back, additional ADR-amendment implications may surface (e.g. an X4 consent/GDPR fold-back into §8 reveals an ADR commitment that doesn't yet exist; a PC-3 Q6 sync-trigger semantic implies a new cross-entity contract). At the §5c checkpoint, surface the final scope decision:

- **Zero Phase 3 commits** — if no ADR amendment is warranted, surface the rationale (re-confirming the provisional-zero stance plus any Phase 1 / Phase 2 checks against the same ADRs and any others) and proceed to closing-bridge authoring.
- **N Phase 3 commits** — if any ADR amendment surfaces during Phase 1 / Phase 2, list per-ADR scope at the §5c checkpoint surface.

**Shape variants — choose by substance.** Three append-only Option A shape variants are precedented at PC-3:

- **THREE-COMPONENT SCOPE** (ADR-U006 precedent): new Implementation commitments section with three named components of implementation. Used for adds — the ADR gains commitments it didn't carry before.
- **FOUR-COMPONENT SCOPE** (ADR-U007 precedent): same shape, four components. Same disposition: adds.
- **THREE-DISTINCTION SCOPE** (ADR-U018 precedent): clarification-of-intent shape codifying three distinctions that were already implicit. Introduces a framing paragraph between lead and scope block to flag the clarification-vs-contraction semantic. Used for codifying implicit framings — the ADR doesn't gain new commitments, but explicit text now distinguishes what was implicit.

Pick the shape that matches substance; new variants are acceptable when substance-aligned (the precedented three are the durable shapes, not a closed set).

**Per-ADR ritual** (per PC-3 §L3 Step 3 precedent), applied only if Phase 3 has commits:

1. Fresh-read current ADR text.
2. Scope decision — which shape variant; which components/distinctions; which disk anchors.
3. Draft amendment (Date line update + amendment section).
4. Structural inventory + Tripwire #4 anchor uniqueness verification (per §6 self-checking discipline).
5. Print-batch-before-gate surface to the human; absorb tightenings.
6. Edit 1 (Date line) → Edit 2 (section insertion).
7. Single commit with structured body — body cites the spec-amendment commit + the source-bridge provenance + the disk anchors.

**Phase 3 checkpoint surfacing.** Before drafting each ADR amendment (if any), surface a structured summary:

- **Scope** — which Q-resolution drove this ADR amendment; which shape variant; which components/distinctions/refinements.
- **Disk anchors** — file paths + line anchors cited.
- **Provenance citations** — spec-amendment commit SHA + source-bridge path + Q-resolution reference.
- **Order of ADR amendments** — if multiple ADRs are touched, sub-batch-of-1 commit cadence across them, in a fixed order surfaced and ratified at this checkpoint.

Wait for ratification at each ADR's surface point.

---

## §6 Self-checking discipline — Tripwire #4 substitute

The bouncing-partner cycle in manual-track runs catches a class of errors (oldText stale-context recovery, cross-section anchor confusion, commit-shape under-inspection, OLDFEAT head-truncation) as structural byproduct. Autonomous runs do not have this catch-surface. The Experiment B comparison-phase named this absence as a real risk; the disciplines below substitute structurally for what the bouncing-partner produces ambient. Amendment sessions run under the same disciplines as autonomous derivation runs — by reference, with no amendment-specific sub-shape adaptations.

**Hard rules** (verbatim alignment with autonomous template §6):

- **Fresh-read before every Edit; never construct `oldText` from memory.** Re-read `docs/platform/core/identity-specification.md` before constructing the `oldText` for each Edit, even when a prior Edit in the same session landed in the same section.
- **Structural-inventory-before-defect-assertion.** Before claiming a real defect in composed content, do a structural inventory of the composed draft (heading count, sentence count, token-occurrence audit).
- **Enumeration-claim-scoping** (SS-16/SS-17 lineage). For any enumeration-based verdict: state the patterns searched + report scope as "no hits within [patterns]" rather than "no hits anywhere." For amendment work, this applies particularly when verifying that a fold-back amendment hasn't introduced an inconsistency elsewhere in the spec — state the cross-references searched, not "the spec is now consistent."
- **Verify-before-asserting on commit-shape claims.** Before claiming a commit's body shape from `git log --oneline`, fresh-read the full commit body with `git log -1 --format=%B <sha>`. Applies particularly to citations of the source-bridge commits + the spec's most-recent-derivation commit (`0565d65`) + the closed-pre-amendment ADR commits (`3697732` for U007, `edf72d3` for U006, `dd84a02` for U018).
- **Cross-section fresh-read before second-touch Edits.** When a Phase 2 Edit touches a section that was previously amended in Phase 1 (or a Phase 3 ADR amendment touches an ADR cross-referenced in a Phase 1 spec amendment), fresh-read the section's current disk state before composing the new Edit. The PC-3 §L3 Step 3 SS-20 lineage (Q-numbering drift surfaced via cross-section fresh-read) is the canonical instance of this discipline's value.
- **Listing commands use explicit counts.** State-read pass commands that list directories use `ls dir/ | wc -l` or full `ls dir/`, never `head`-truncated previews.

**Methodology-framing space.** Amendment sessions can surface meta-altitude observations during fold-back (cross-section drift discoveries; pattern-variant blindness near-misses; consistency-check failure modes). The template does not prescribe how to be sharp, but it makes space: surface methodology-framing observations alongside substance fold-back throughout the run, not only at §13 post-run capture.

---

## §7 Carry-forward priors (named) — by reference

Amendment sessions inherit the priors table from the autonomous L1→L3 template by reference. The priors are named here for traceability; the full statement of each prior lives in `docs/templates/autonomous-l1-l3-session-opener.md` §7.

**Two prior classes hold at this amendment:**
- **Informational-active priors** — drive fold-back content; fire whenever their pattern surfaces during Phase 1 / Phase 2.
- **Closed-pre-amendment priors** — already resolved by upstream PC-3 work; cite-for-traceability discipline only. They do not drive fold-back content, but their resolution must be cited when fold-back content references their substance.

| Prior | Class | Applies when | Source |
|---|---|---|---|
| **P-O1** | Informational-active | Fold-back touches actor-primitive language in §3 / §5 / §6 / §L3. The PC-2 amendment is the canonical instance — Group A item 1 (D1+X2 actor primitive correction) directly drives multi-section fold-back. | Autonomous template §7; Experiment A bridge Group C item 8; PC-3 promotion. |
| **D7** | **Closed-pre-amendment** | Cite-for-traceability only — role-name vocabulary closed by PC-3 §3 / §5 vocabulary migration at PC-3 close (named-constant table over PG ENUM; Steward/Guide/Member/Observer landed at PC-3). Fold-back into PC-2 §2 / §5 should reference the closure rather than re-litigate. | Autonomous template §7; Experiment A bridge Group C item 9 + C3-3 migration. |
| **X3** | **Closed-pre-amendment** | Cite-for-traceability only — `has_permission` signature closed by ADR-U007 amendment at PC-3 close commit `3697732` (FOUR-COMPONENT SCOPE: disk signature + Tier-1/split-by-context composition + server-side Tier-1 calling conventions + permission count baseline). Fold-back into PC-2 §6 should reference the closure rather than re-litigate. | Autonomous template §7; Experiment A bridge Group B item 5; PC-3 closing bridge. |
| **X5** | Informational-active | Fold-back touches service-role escalation patterns in §3 / §6 / §7. PC-2's scope: identity / session / authenticated-context handoff implications of service-role escalation. The two-tier centralization reframe per PC-3 §L3 Step 2 C3-2 routes primarily to the PC-1 amendment; PC-2 holds the slice that touches identity-boundary semantics. | Autonomous template §7; PC-3 §L3 Step 2 C3-2 + PC-1 Finding #4 channel reframe. |
| **Finding #4** | Informational-active | Fold-back touches secrets/credentials substrate (app-tier, not database-tier). For PC-2: any identity-side substrate adjacent to auth-flow plumbing. | Autonomous template §7; PC-1 entity bridge Finding #4. |
| **Multi-role memberships (D3)** | Informational-active | Fold-back touches membership-role capability surface. PC-2 amendment is the canonical instance for the PC-2-relevant slice — clarifying whether multi-role-per-membership impacts PC-2's identity / authenticated-context handoff or routes entirely to PC-3 / PC-4. | Autonomous template §7; Experiment B comparison-phase bridge disposition #1 + divergence finding #1. |
| **PC-3 Q6 display-name coupling (PC-2-specific carry-forward)** | Informational-active | Fold-back touches profile attributes (`nickname` / `display_preference` / `show_real_name`) AND any sync-trigger semantics to PC-3 personal-group name. Routes the PC-3 §8 Q6 finding into PC-2's §2 / §5 / §8 territory. | PC-3 closing bridge §Pickup lists → Deferred PC-2 amendment candidates. |

The "applies when" column is informational — it does not gate the prior; the prior holds throughout the session and applies wherever its pattern fires.

---

## §8 Findings enumeration — verbatim from source bridges

*This section is the enumerated findings for the PC-2 amendment — authored at instance creation by transcribing the enumerated findings from the four source bridges named in §2 step 1. Group/category labels preserved verbatim from the Experiment A bridge. Each finding carries: identifier; one-line statement; source-bridge citation; group/category label from source; status class (active fold-back / closed-pre-amendment cite-for-traceability / informational-active prior); ADR amendment candidacy (yes / no / TBD).*

**Status-class legend:**
- **Active fold-back** — substance drives Phase 1 / Phase 2 spec amendments.
- **Closed-pre-amendment; cite for traceability** — closed by upstream PC-3 work; substance referenced in fold-back where relevant but not re-litigated.
- **Informational-active prior** — methodology observation or program-level pattern; routes to §L3 Step 3 / closing bridge methodology notes rather than §1–§8 substance.

### Group A — Material substance corrections (PC-2 §3, §5, §6, §L3 wrong as currently written)

- **D1 + X2 — Actor primitive is `get_current_personal_group_id()`, not `auth.uid()`.** RLS policies resolve through a four-hop chain: `auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`. PC-2 spec currently names `auth.uid()` as canonical SQL-side projection; this is *correct as a Supabase primitive* but *incomplete as a description of how this repo identifies actors*. Affects §3, §5, §6, §L3 capabilities + dependency chain. *Source: Experiment A bridge Group A item 1.* **Status:** Active fold-back. **ADR amendment candidate:** No — consumer-side use of ADR-U006's already-codified primitive (post-amendment at `edf72d3`); PC-2 publishes the primitive that ADR-U006 authorises, no further ADR-U006 amendment warranted.

- **D2 — FK target across codebase is `public.users.id`, not `auth.users.id`.** PC-2 §3 says "every other tier reads `user_id` via FK to `auth.users(id)`"; disk-dominant FK target is `public.users.id`. Single `REFERENCES auth.users(id)` use is the bridge column `users.auth_user_id`. Affects §3 schema-level contracts + downstream consumers' contract-surface understanding. *Source: Experiment A bridge Group A item 2.* **Status:** Active fold-back. **ADR amendment candidate:** No.

- **D4 — Profile attribute set differs from cold partition.** Disk has `bio` (not in cold list), `nickname` as derivation (not free attribute), no `locale`, no `handle/slug`, no typed `account_status` enum. Affects §2 Concepts + §5 Storage column list. *Source: Experiment A bridge Group A item 3.* **Status:** Active fold-back. **ADR amendment candidate:** No.

### Group B — Substantive content adds

- **C1.6 — Account lifecycle reified on disk.** `admin_decommission_user` and `admin_hard_delete_user` RPCs; `[Deleted User]` system group as `COALESCE` reassignment target. PC-2 §8 Q7 should move from "latent" to "partially-implemented; cascade-spec-template-fill at FEAT-PC2 maturity." Affects §5 + §8. *Source: Experiment A bridge Group B item 4.* **Status:** Active fold-back. **ADR amendment candidate:** No.

- **X3 — ADR-U007 has stale signature.** Documentation said `has_permission(user_id, group_id, permission_name)`; disk has `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)`. *Source: Experiment A bridge Group B item 5.* **Status: Closed-pre-amendment; cite for traceability.** Closed by ADR-U007 amendment at PC-3 close commit `3697732` (FOUR-COMPONENT SCOPE: disk signature + Tier-1/split-by-context composition + server-side Tier-1 calling conventions + permission count baseline). PC-2 fold-back into §6 should reference the closed signature rather than re-litigate. **ADR amendment candidate:** No.

- **X4 — No consent/GDPR substrate.** Cold spec assumes; disk has nothing. Adds new question to PC-2 §8, plus FEAT-PC2 candidate, plus Privacy-vertical adjudication routing. *Source: Experiment A bridge Group B item 6.* **Status:** Active fold-back. **ADR amendment candidate:** TBD — if the §8 addition implies a consent/GDPR commitment that doesn't yet exist in any ADR, surface at §5c.

- **X5 reframe — Service-role escalation open-coded across business-domain routes.** Five sites instantiate their own service-role client with raw `process.env.SUPABASE_SERVICE_ROLE_KEY`. Per PC-3 §L3 Step 2 C3-2, the framing sharpens from "single centralization decision" to "two-tier substrate + auth-flow." PC-2's slice: identity-boundary implications of service-role escalation (how escalation interacts with `auth.uid()` / `get_current_personal_group_id()` / authenticated-context handoff). The primary remediation (centralization, anti-pattern scope) routes to the PC-1 amendment; PC-2 holds the identity-boundary-semantic slice. Affects §3 / §6 / §7. *Source: Experiment A bridge Group B item 7 + PC-3 §L3 Step 2 C3-2 reframe + PC-3 closing bridge §Pickup lists → Deferred PC-1 amendment candidates.* **Status:** Active fold-back (PC-2 identity-boundary slice only). **ADR amendment candidate:** No (routes to PC-1 amendment for any ADR scope; PC-2 holds informational identity-boundary slice).

### Group C — Methodology / pattern observations

*Group C items route to §L3 Step 3 / closing-bridge methodology notes rather than §1–§8 substance amendments, since methodology observations don't typically fold into §1–§8. P-O1 and P-O4 are informational-active priors; D7 is closed-pre-amendment (distinct class). Each item is adjudicated individually at Phase 1 checkpoint.*

- **Item 8 — P-O1 — Cold derivation drifts toward Supabase-canonical actor primitive where this repo overrides.** Build a carry-forward prior into PC-3 / PC-4 Step 1: "the actor primitive in this repo is the personal group, not `auth.uid()`." **STRONGLY CONFIRMED systematic bias** per Experiment B autonomous-track promotion + comparison-phase disposition #3. Routes to: §7 prior table at this amendment (already named); §L3 Step 3 block as Q-shape if (b.i) / hybrid disposition chosen; Phase 2 close-out as named program-level pattern promotion. *Source: Experiment A bridge Group C item 8; Experiment B comparison-phase bridge disposition #3.* **Status:** Informational-active prior. **ADR amendment candidate:** No (program-level pattern, not ADR-shaped).

- **Item 9 — D7 — ENUM vs named-constant-table disambiguation for role names.** Pin "named-constant table over ENUM." *Source: Experiment A bridge Group C item 9.* **Status: Closed-pre-amendment; cite for traceability.** Closed by PC-3 §3 / §5 / role-name vocabulary migration at PC-3 close (Steward / Guide / Member / Observer landed as PC-3-owned named-constant table per C3-3 migration). PC-2 fold-back should reference the closure rather than re-litigate. **ADR amendment candidate:** No.

- **Item 10 — P-O4 — Independent cold derivations converged on the PC-1/PC-2 seam.** Methodology-validating observation. Worth recording in program-level methodology notes (closing-bridge methodology data points section). *Source: Experiment A bridge Group C item 10.* **Status:** Informational-active prior. **ADR amendment candidate:** No.

### Additional findings — PC-3 Q6 display-name coupling + Experiment B D3 multi-role memberships

- **PC-3 Q6 display-name coupling.** PC-3 §8 Q6 carries PC-2 display-name coupling (`nickname` / `display_preference` / `show_real_name` on PC-2 territory; sync trigger to PC-3 personal-group name) to the PC-2 amendment list. The PC-2 fold-back must adjudicate whether display-name vocabulary lives in PC-2 §2 (Concepts) / §5 (Storage) / §8 (Open questions), and how the sync-trigger semantic (PC-2 attribute change → PC-3 personal-group name update) is documented at the cross-entity boundary. *Source: PC-3 closing bridge §Pickup lists → Deferred PC-2 amendment candidates → "Q6 PC-2 amendment carry-forward".* **Status:** Active fold-back. **ADR amendment candidate:** TBD — if the sync-trigger semantic implies a new cross-entity contract commitment, surface at §5c.

- **Experiment B D3 multi-role memberships.** Autonomous-track Step 2 surfaced disk evidence of a separate `user_group_roles` junction with composite PK supporting multi-role-per-membership. Manual-track (PC-3) capability inventory did not surface multi-role as an explicit capability or open discipline question. The PC-2-relevant slice: whether multi-role-per-membership affects PC-2's `user_id` contract surface or authenticated-context handoff (the slice where multiple-roles-on-one-membership would interact with how PC-2 publishes "who the actor is" to downstream tiers). Default disposition per Experiment B comparison-phase bridge disposition #1: not blocking PC-2 amendment work; the PC-2 fold-back may conclude "no PC-2-relevant slice — carry forward to PC-4 / Phase 2 close-out" OR may identify a PC-2-side contract clarification needed. Adjudicated at Phase 1 §5a checkpoint. *Source: Experiment B comparison-phase bridge §Substance findings — divergence item 1 + disposition #1.* **Status:** Active fold-back (adjudication-shape; PC-2-relevant-slice determination is the work). **ADR amendment candidate:** TBD — likely No at PC-2 (routes to PC-4 / Phase 2 close-out); surface at §5c if Phase 1 adjudication finds otherwise.

---

## §9 Disciplines in effect — by reference

Amendment sessions inherit the durable disciplines from the autonomous L1→L3 template's §9 by reference. The disciplines apply equally to amendment work; no amendment-specific overrides or additions.

Inherited disciplines (full statements in `docs/templates/autonomous-l1-l3-session-opener.md` §9):

- State-read at session-open and after permission gates / tool-result clusters.
- Verify-before-asserting — commit-shape claims, enumeration scope, cross-section content, any second-touch Edit.
- No Greek characters as labels. ASCII-only identifiers (numbers, letters, descriptive names). Hard rule.
- Move-and-correct disposition. First-time-right is not the goal; wrong-shaped findings are signal. Surface and correct rather than block.
- Sub-batch-of-1 multi-Edit cadence default. Sub-batch-of-3 is opt-in only if discipline earns it. (For PC-2 amendment work specifically: sub-batch-of-1 is the *recommended* default at Phase 1 given the multi-section fold-back scope; sub-batch-of-3 should not be attempted at Phase 1 even if discipline holds at earlier phases.)
- Append-only Option A for ADR amendments (three shape variants precedented).
- In-commit-consistency. Fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit; do not defer to doc-health-check.
- Forward-only correction. Prior commits carry their own provenance; do not rewrite history.
- Canonical specs on `main` via deliberate provenance-citing commits. Amendment work is canonical work; experiment branches do not apply.
- OLDFEAT (`docs/TMP/OLDFEAT/`) read disposition: confirm at session-open whether the blindness invariant carries forward to this amendment, or has been disposed-of since by a post-Experiment-B reconciliation. Default: blindness invariant carries forward until explicit disposition. (For amendment sessions specifically, OLDFEAT is typically out-of-scope by §3 scope-locked discipline — the amendment folds enumerated findings, not OLDFEAT reconciliation.)

---

## §10 Output expectations and commit shape

This amendment session is expected to produce **2–4 commits**:

1. **Spec amendment commit (1)** — combined Phase 1 + Phase 2 amendments to `docs/platform/core/identity-specification.md`. May partition into two commits (substance corrections separate from Q-resolution / §L3 Step 3 additions) if findings split cleanly along that boundary; PC-3 precedent collapsed them into one spec-amendment commit + separate ADR-amendment commits.
2. **0–N ADR amendment commits** — provisional at instance authoring: zero (per §5c provisional-zero stance, ADR-U007 + ADR-U006 + ADR-U018 adjacency-checks completed). Re-adjudicated at §5c. Sub-batch-of-1 across ADRs if any.
3. **Closing bridge commit (1)** — at `docs/planning/sessions/2026-05-15_NN_-_PC2-AMENDMENT-LANDED.md` per §11 below.
4. **STATUS.md amendment commit (1, separate)** — marks PC-2 Identity amendment `Done`, fills in Closing bridge column, §13 captured column, Template revision column. Separate commit per the convention established for autonomous L1→L3 entity closes.

**No push to origin** at session close. The human dispositions push as a deliberate next step.

---

## §11 Closing bridge — required sections

The closing bridge at `docs/planning/sessions/2026-05-15_NN_-_PC2-AMENDMENT-LANDED.md` follows the standard `docs/templates/session-bridge.md` shape, with these additional sections required for amendment sessions:

- **Explicit closure statement:** "*PC-2 Identity amendment session completes at this commit batch. Pending findings folded; spec at `docs/platform/core/identity-specification.md` now reflects [list of source-bridge findings folded, by group].*" Matches PC-3 closing-bridge precedent's "PC-3 Organisation L1→L3 derivation completes at this commit batch" shape.
- **Findings disposition table** — one row per finding from §8 above. Columns: Finding (identifier) | Group | Status (Folded into §N / Closed-pre-amendment cite-for-traceability / Informational-active prior recorded at §L3 / Pickup-listed to {downstream entity} / Out-of-scope per §3) | Anchor in amended spec (section + paragraph reference, or commit SHA + line range for ADR amendments). **Closed-pre-amendment items (X3, D7) appear in this table** with their upstream-closure citation as the anchor (commit `3697732` for X3; PC-3 vocabulary migration for D7) — traceability is the point.
- **Pickup lists** for findings that surfaced during fold-back but are out-of-scope per §3 scope-locked discipline. Each pickup entry: receiving target (next amendment session / downstream entity / Phase 2 close-out / doc-health-check pickup); substance routed; disk anchors. Expected categories at PC-2 close: PC-1 amendment (X5 two-tier remediation if not already in PC-1 scope); PC-4 / Phase 2 close-out (multi-role memberships D3 if PC-2 fold-back concludes no PC-2-relevant slice); program-level methodology (P-O4 convergence; P-O1 promotion).
- **Source-bridge provenance citations** — explicit citation of every source bridge consumed (the four named at §2 step 1), with the specific section of each bridge that carried the folded findings. Required per STATUS.md amendment-table top-of-section provenance discipline.
- **Methodology data points** captured this run — bridge-prose observations distinct from substance findings (e.g. cross-section drift caught at fresh-read; enumeration-claim-scoping near-miss; cadence-discipline observations; per-section fold-back order observations). Same shape as PC-3 closing-bridge Methodology data points section.
- **Template revision disposition** — adjudicates whether the run's §13 post-run methodology capture (instance file, see below) surfaced durable findings warranting a `docs/templates/spec-amendment-session.md` amendment. Either *no revision proposed* (with one-line rationale) or *revision proposed* (with the specific change). The Revision history table at the top of the template is updated in the same commit when a revision lands.
- **Carry-forward to next amendment session** (PC-1 amendment) — what the PC-1 amendment session's instance must inherit. Typically light for amendment work: prior amendment closes do not generally carry forward into successor amendment sessions the way derivation entity closes carry forward to successor derivation entities, but cross-amendment findings (e.g. PC-2 amendment surfacing a PC-1 implication beyond X5) route here.

---

## §12 Scope boundaries

- **The four source bridges + §8 above are the enumeration scope.** Findings outside the enumerated set are out-of-scope per §3 scope-locked fold-back discipline.
- **Other amendments queued in STATUS.md are NOT touched.** PC-1 amendment after PC-4; OLDFEAT reconciliation; any future amendment — out of scope at this session. Cross-amendment implications route to the receiving amendment's pickup-list.
- **Cross-spec implications.** If a finding has implications for another spec, route to that spec's pickup-list channel rather than amending here. Example: a PC-2 amendment finding that implies a deeper PC-1 amendment routes to the PC-1 amendment's `Pending findings` column in STATUS.md.
- **OLDFEAT blindness invariant.** Confirm at session-open whether it still applies (default: yes until explicit disposition). For amendment sessions specifically, OLDFEAT is typically out-of-scope by §3 even if the blindness invariant has been lifted — the amendment's evidence scope is the source bridges, not OLDFEAT.
- **Downstream entity work.** Amendment sessions do NOT touch downstream entity work (FEAT-PC2-* feature specs; code; tests). Fold-back is to the canonical spec only.
- **Doc-hygiene out of scope.** Doc-health-check pickups (G-21, etc.) are out-of-scope for amendment work; the amendment folds the substantive findings, not doc-hygiene cleanup. Doc-hygiene runs as separate cycle work per PROCESS.md.

---

## §13 Post-run methodology capture (required, lighter than autonomous)

After Phase 3 lands (or after the no-ADR-amendment determination at §5c) and BEFORE the closing bridge is authored, the amendment run answers the following three prompts. Output flows into the closing bridge's Methodology data points section AND informs the closing bridge's Template revision disposition section.

The three prompts:

1. **What worked from this template that the next amendment session should keep, and what got in the way?** Name specific sections, disciplines, or scope items that demonstrably helped — and specific sections, instructions, or scope items that fired noise rather than catch, duplicated other sections, or didn't apply to this amendment. Be concrete — "§3 scope-locked fold-back kept the session from drifting into adjacent disk reads" is more useful than "the scope sections worked."
2. **What discipline or scope item did you wish was named that wasn't?** Things that, with hindsight, would have helped at Phase 1 / Phase 2 / Phase 3 had they been in the template. Particularly relevant: amendment-specific failure modes the template doesn't yet name (e.g. a cross-amendment dependency that the §12 scope-boundary language didn't catch; a Phase 1 fold-back checkpoint shape that didn't surface a needed adjudication; a closed-pre-amendment-vs-active-fold-back disambiguation that would have helped earlier).
3. **What new finding surfaced during fold-back that wasn't in the input bridges, and where did it route?** Amendment-specific channel — captures the "adjacent findings discovered mid-fold-back" failure mode per §3's record-and-route discipline. List each such finding, its substance, and its routing disposition (pickup-listed to next amendment / pickup-listed to downstream entity / Phase 2 close-out / doc-health-check / new follow-on amendment proposed).

The post-run capture is structural reflection, not informal aside. Its length scales with run scope — a tight amendment with few mid-flight findings might produce a quarter-page; a larger amendment that surfaced cross-section drift may produce a half-page or more. Brevity is fine when there is genuinely nothing to surface; padding is not.

---

## §14 Start sequence

Begin with §1 Pre-flight checks. If all five pass, proceed to §2 State-read pass. Then §5a Phase 1 fold-back. Surface the §5a checkpoint before the first Edit.

---

*End of instance.*
