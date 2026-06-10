# Spec-amendment session-opener — `PC-1 Infrastructure amendment`

**Template path:** `docs/templates/spec-amendment-session.md`
**Instance landing path:** `docs/planning/sessions/openers/cc-pc1-amendment.md`
**Substituted from template at:** commit `70cbd15` (PC-2 amendment's seven revisions) with PC-3 amendment's four revisions landed in template content (carry-forward enumeration completeness at §1 Check 4; frontmatter `last_updated` housekeeping at §5a; §13 checkpoint surfacing as discrete-prompt sub-section; anchor containment disambiguation at §5a — lower-priority).
**Instance authored:** 2026-05-16 (this is the **third instance** of the spec-amendment template post-revision; first was `cc-pc2-amendment.md`, second was `cc-pc3-amendment.md`. §13 post-run capture is expected to carry a third-instance-stress-test framing distinct from PC-2's first-instance and PC-3's second-instance §13.)
**Spec under amendment:** `docs/platform/core/infrastructure-specification.md` (PC-1 Infrastructure).

> Per-instance session-opener for the PC-1 Infrastructure amendment session. Folds three enumerated findings — Finding #3 reframing (audit-write three-pattern codification per PC-4 §L3 Step 2 C2-5) + Finding #4 two-tier centralization PC-4-scope anchor (Gap A substrate + Gap B auth-flow plumbing per PC-4 §L3 Step 2 C3-2; helper-introduction disposition deferred to this amendment) + X5 two-tier centralization reframe (service-role escalation per PC-3 §L3 Step 2 C3-2) — into the canonical PC-1 spec. Scope mid-range: estimated 8–15 atomic Edits across §1–§8 (PC-1 has no §L3 Step 3 block; **Case (b) per template §5b** governs — likely (b.i.2) preserve + append, mirroring PC-2 amendment precedent). Helper-introduction is an adjudication-shape sub-finding within Finding #4 — write-at-amendment vs route-to-FEAT-PC-* feature spec, settled at §5a checkpoint. Phase 3 provisional-zero (ratified at §5c after Phase 1+2 land).

---

## §1 Pre-flight checks — STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `2f33d8e` (STATUS.md amendment marking Phase 2 close-out `Done` and PC-1 amendment `Next`, landed 2026-05-16 morning). Hard-fail if tip is earlier.
4. **Working tree state.** Run `git status`. Expected: `CLAUDE.md` modified-unstaged (pre-existing across sessions; outside scope; acceptable) **and** `docs/planning/sessions/openers/cc-execute-prompt.md` modified-unstaged (pre-existing carry-forward across sessions; outside scope; acceptable). No untracked files in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `docs/platform/core/` (the spec's parent directory). Hard-fail on any other modification or untracked file.
5. **Spec at expected state.** Run `git log --oneline -1 -- docs/platform/core/infrastructure-specification.md`. Expected: most-recent-touch is commit `12897d2` (the initial PC-1 Infrastructure L1→L3 specification authoring at 2026-05-04). PC-1 has not been amended in the intervening 12 days; the spec baseline is its derivation-time state. Hard-fail if the spec's most-recent-touch commit is anything other than `12897d2` — that case requires the human to adjudicate whether the three pending findings still apply as enumerated, or whether some have been folded already.

After all five pass, report each check's outcome and proceed to §2.

---

## §2 State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

**Note on multiple source bridges.** PC-1 amendment has the largest source-bridge enumeration of any spec-amendment to date — four bridges chronologically span twelve days and carry distinct finding origins: PC-1 entity close authored the original Finding #3 + Finding #4 framings; PC-3 closing bridge sharpened Finding #4 into the two-tier framing (Gap A substrate + Gap B auth-flow plumbing) and introduced the X5 reframe; PC-4 closing bridge codified Finding #3 into the audit-write three-pattern + anchored Finding #4 at PC-4 scope; Phase 2 close-out consolidated all routings into the PC-1 amendment-list. Read all four; each carries non-overlapping substance.

1. **Source bridges** in chronological order:
   - `docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md` — PC-1 entity close. Authored Finding #3 (originally "trigger-as-primitive" framing) and Finding #4 (originally "single centralization decision" framing). Both are PC-1-derivation-time findings that subsequent entity work (PC-3 / PC-4) reframed; the original framings carry derivation-time intent worth preserving via augment-in-place per template §5a.
   - `docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md` — PC-3 closing bridge. Sharpened Finding #4 from "single centralization decision" to "two-tier substrate + auth-flow" framing at §L3 Step 2 C3-2. Surfaced X5 anti-pattern reframe at §L3 Step 2 C3-2 (service-role escalation pattern; 5 service-role-using sites / 6 createClient instances at PC-3 scope; routed as "PC-1 amendment candidate at Phase 2 close-out" in the Pickup lists > Deferred PC-1 amendment candidates section).
   - `docs/planning/sessions/2026-05-15_03_-_PC4-LANDED.md` — PC-4 closing bridge. Codified Finding #3 audit-write three-pattern at §L3 Step 2 C2-5 (SECURITY DEFINER direct-INSERT + SECURITY DEFINER trigger-mediated + anon-key client RLS-gated INSERT). Anchored Finding #4 at PC-4 scope at §L3 Step 2 C3-2 (PC-4 contributes 2 of 5 X5 sites: `lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`; concrete centralization opportunity `lib/supabase/server.ts` admin-tier helper introduction would close Gap A + Gap B at PC-4 simultaneously). The Pickup lists > PC-1 Infrastructure amendment-list section is the load-bearing enumeration source.
   - `docs/planning/sessions/2026-05-16_01_-_PC-PHASE-2-CLOSE-OUT-LANDED.md` — Phase 2 close-out. Routed both PC-4 findings + the X5 reframe into the PC-1 amendment-list; framed helper-introduction disposition as deferred to this amendment ("write at amendment OR route to FEAT-PC-* feature spec"); reframed `Sequenced: After PC-4 entry` to `After Phase 2 close-out` in STATUS.md per the close-out's consolidated routing pass.

2. **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge. Read for inherited methodology dispositions and any cross-track convergent evidence that bears on PC-1's three findings. Not the primary finding-enumeration source for this amendment (the four chronological bridges above are), but inherited disciplines apply (canonical-vs-experiment-output asymmetry; ADR amendments at entity close as durable discipline).

3. **`docs/platform/core/infrastructure-specification.md`** — fresh-read the canonical spec in full. This is the artifact being amended; its current §1–§8 + §L3 content (no Step 3 block per pre-template close) is the baseline against which fold-back amendments compose. The spec is the smaller of the PC-N specs (PC-1 was the first entity derived; the spec carries pre-template framing for Findings #3 and #4 that will be augmented-in-place).

4. **`docs/templates/platform-core-spec.md`** — the template the spec was originally derived against. Load-bearing for cross-section fresh-reads at §6 self-checking discipline: confirms which sections exist in the spec's canonical shape and where each finding's fold-back target lies.

5. **ADRs cited in `{FINDINGS-ENUMERATION-BLOCK}`** — **none provisional.** Phase 3 starts at zero per PC-2 / PC-3 amendment precedent. Possible candidates if §5c surfaces ADR-shape content from Finding #3 audit-write three-pattern codification (could touch ADR-U007 Three-layer permission model — already amended at PC-3 close `3697732`; re-amendment unlikely) or Finding #4 two-tier centralization (could touch ADR-U023 Platform Core / Domain Services decomposition if helper introduction becomes architectural — likely not, helper introduction is app-tier plumbing). Read step skipped at §2; restored on demand if §5c surfaces a candidate.

6. **`docs/platform/core/CLAUDE.md`** — sub-tier CLAUDE.md (no entity-level CLAUDE.md exists at `docs/platform/core/infrastructure/CLAUDE.md`; sub-tier is the relevant read). Confirms PC-1 entity-level context: which technical-stack obligations apply at PC-1 (Postgres + RLS + migrations gotchas).

7. **`docs/planning/sessions/openers/STATUS.md`** — Amendment sessions table; confirm PC-1 Infrastructure row's `Status` reads `Next` (or `In flight` if this opener's STATUS.md commit has already landed), `Pending findings` aligns with §8 below, and PC-3 Organisation row + Phase 2 close-out row both show `Done` (immediately preceding entries).

After the state-read pass, surface a structured summary: (i) source-bridge transcription provenance check (does §8 still match the four source bridges as currently on disk); (ii) spec baseline state (line count, sections present, last commit touching it — expected `12897d2`); (iii) ADR amendment candidates and their current state (expected: zero candidates pending §5c re-adjudication); (iv) any divergence from expected. Wait for ratification before proceeding to §3.

---

## §3 Scope-locked fold-back — direction-of-authority discipline

Amendment sessions run with a **direction-of-authority opposite to derivation sessions**. The load-bearing statement is:

*Amendment sessions fold the enumerated findings from the source bridges + §8 below INTO the spec. They do NOT reach for fresh disk evidence outside that enumerated scope.*

**In-scope evidence sources:**

- Every finding enumerated at §8 below.
- The four source bridges named at §2 Read 1 — for finding context, disk-anchor citations, and provenance.
- The canonical spec at `docs/platform/core/infrastructure-specification.md` — the artifact being amended; fresh-read per Edit per §6 self-checking discipline.
- ADRs named in candidate set — **none provisional**; if §5c adjudication surfaces a candidate, fresh-read at Phase 3 ADR amendment time.

**Out-of-scope evidence sources:**

- Cold-derivation-style stress-testing of the PC-1 spec against disk. The PC-3 + PC-4 entity work + Experiment B comparison-phase already did this work; re-doing it inflates session scope without changing the finding set.
- Opening adjacent disk artifacts (`supabase/migrations/`, `lib/`, `app/`, `tests/`, `lib/supabase/server.ts`, `lib/admin/admin-users-query.ts`, `app/api/admin/users/route.ts`) "to be sure" about a finding. The four bridges already cite disk anchors at the specificity the fold-back needs.
  - **Exception — helper-introduction adjudication.** If §5a adjudicates Finding #4 helper-introduction as "write at amendment," authoring the `lib/supabase/server.ts` admin-tier helper itself requires opening that file's current state. Treat this as a scope expansion warranting human ratification at §5a checkpoint, not an automatic in-scope evidence source. The expected default per template §3 + §12 is "route to FEAT-PC-* feature spec" (helper introduction is downstream code work, not spec amendment) — write-at-amendment is opt-in only with explicit rationale.
- Re-surfacing findings the four bridges already disposed-of or out-of-scoped. Phase 2 close-out's other routings (cross-tier write discipline → DS-1 entry session-opener; P11 archeology + P-RC2 → DevOps-tier; substrate-completion-window → PW-1 sub-shape watch) are NOT in this amendment's scope.

**Adjudication-shape findings — relevance-determination before fold-back substance.**

**Finding #4 helper-introduction disposition is an adjudication-shape sub-finding** per template §3's named sub-class. Phase 2 close-out framed it explicitly as a binary: "write at amendment OR route to FEAT-PC-* feature spec." Neither home was selected at close-out; this amendment is where the adjudication lands.

Surface helper-introduction disposition at the §5a checkpoint with explicit rationale, then route based on adjudication outcome:

- **Adjudicated *route to FEAT-PC-* feature spec*** (likely default) → no helper code authored in this amendment session; Finding #4 spec-amendment text records the two-tier framing + names the helper-introduction opportunity + cross-references the receiving FEAT-PC-* spec for the downstream code work. Phase 1 substance: §7 augment-in-place (two-tier reframe) + cross-reference to FEAT-PC-* in §L3 capability inventory.
- **Adjudicated *write at amendment*** (opt-in; explicit rationale needed) → scope expands to include `lib/supabase/server.ts` Edit. The amendment commit pair becomes (i) spec amendment + (ii) lib/supabase/server.ts helper introduction as a separate commit. This is unusual for amendment sessions (amendments do NOT typically touch downstream code per §12) and warrants explicit human ratification at §5a as a deliberate scope expansion.
- **Adjudicated *partial slice — spec records the framing only; FEAT-PC-* picks up substance*** → equivalent to "route to FEAT-PC-*" with explicit framing-only-vs-code-only partition recorded in spec text.

The PC-2 amendment's D3 adjudication and the PC-3 amendment's D3 adjudication are the canonical instances of this sub-class (both adjudicated as no-relevant-slice / pickup-routed); the PC-1 helper-introduction adjudication is independent and may go either way — the default leans "route to FEAT-PC-*" per amendment session scope discipline, but the Phase 2 close-out's explicit deferral to this amendment names "write at amendment" as a legitimate option.

**Mid-fold-back finding surface — record-and-route, do not expand scope.**

If during fold-back a new finding surfaces (e.g. a PC-4 anchor citation reveals a §3 audit-write reference in PC-1 that's now stale; a Finding #3 fold-back at §5 reveals a parallel PC-3 cross-reference that's stale post-PC-3-amendment-close; a Q-resolution implies a follow-on Q that wasn't enumerated), the discipline is:

1. **Record at §13 post-run methodology capture** (prompt #3 — adjacent findings discovered mid-fold-back).
2. **Route to the closing-bridge pickup-list** per §11.
3. **Do NOT expand current session scope.**

**§3-vs-§9 seam — when an out-of-scope finding is structurally identical to an in-scope finding.**

The PC-2 amendment surfaced this seam four times in one session run with three structural sub-variants (currently-asserted prose; historical-record entry; table-cell parallel anchors). The PC-3 amendment surfaced the seam minimally (small-scope amendment). For PC-1 amendment, the seam is **expected to fire moderately**: Finding #3 reframing touches multiple PC-1 spec sections (the original trigger-as-primitive framing likely recurs across §3 / §5 / §L3); Finding #4 two-tier reframe touches §7 (open questions) + potentially §3 (auth-and-authz) + §L3 (capability inventory); X5 reframe touches similar territory to Finding #4. Parallel-anchor patterns are likely.

Apply matching disposition per template §3 sub-variants when fired:

- **(i) Currently-asserted prose** → §9 in-commit-consistency applies clearly; fold the stale-text correction into the same commit batch as a parallel atomic Edit, using augment-in-place phrasing.
- **(ii) Historical-record entry** → augment-in-place — preserve original verbatim + append amendment-time addendum with bold-labeled clause naming the post-amendment state. The PC-1 spec carries derivation-time framings for Findings #3 and #4 that read as historical record post-amendment; this sub-variant is the load-bearing default for PC-1's two reframings.
- **(iii) Table-cell parallel anchors** → §9 fires strongly; multi-row sweep required. Watch for §L3 capability table cells that cite trigger-as-primitive or single-centralization framing.

Apply per parallel-anchor pattern when surfaced; report at §13 prompt #1 whether the seam fired this session.

---

## §4 Three-phase work shape

PC-3 §L3 Step 3 is the work-shape precedent (template default); PC-2 amendment is the precedent for Case (b) amendments to pre-§L3-Step-3-methodology specs (canonical instance of (b.i.2) preserve + append). Three phases:

- **Phase 1 — fold-back.** §1–§8 amendments per finding category from §8 below. Finding #3 reframe at §3 / §5 / §L3 augment-in-place (preserve derivation-time trigger-as-primitive framing; append PC-4-codification three-pattern addendum). Finding #4 two-tier reframe at §7 / §L3 augment-in-place + cross-reference to FEAT-PC-* (or helper introduction if adjudicated write-at-amendment). X5 reframe at §3 / §7 augment-in-place mirroring Finding #4 two-tier framing.
- **Phase 2 — Q-resolution + §L3 Step 3.** PC-1 does **not** have a §L3 Step 3 block (pre-template close per STATUS.md). **Case (b) per template §5b** governs. Author a new §L3 Step 3 block via **(b.i.2) preserve + append** (recommended default): the existing §L3 sub-structure preserved verbatim as derivation-time historical record; a new `#### Step 3 amendments (PC-1 amendment, 2026-05-16)` sub-section appended carrying disposition statement + Q-resolution slate (if findings open Qs) + cross-section amendment summary table + pickup list + new SS entries. PC-2 amendment is the canonical (b.i.2) precedent.
- **Phase 3 — ADR amendments.** Provisional-zero stance ratified at §5c. ADR-U007 (Three-layer permission model) was amended at PC-3 close `3697732` with a four-component scope; Finding #3 audit-write three-pattern may or may not warrant re-amendment per the §5c adjudication. ADR-U023 (Platform Core / Domain Services decomposition) is a candidate if Finding #4 helper introduction takes architectural shape — likely not. §5c re-adjudicates after Phase 1+2 land.

The phases land sequentially as separate commit batches; each phase has its own checkpoint surface point before authoring (§5a / §5b / §5c respectively). Multi-session run unlikely given mid-range scope (8–15 Edits).

---

## §5a Phase 1 — fold-back

**Activity.** Author the §1–§8 amendments per finding from §8 below. Three findings, three distinct shapes:

- **Finding #3 reframing — audit-write three-pattern codification.** Augment-in-place at multiple anchors. The original PC-1 framing (trigger-as-primitive) is preserved verbatim as derivation-time historical record; bold-labeled trailing sub-clauses append the post-PC-4 codification (three coexisting patterns: SECURITY DEFINER direct-INSERT + SECURITY DEFINER trigger-mediated + anon-key client RLS-gated INSERT, with differing integrity properties). Pattern: `**Post-PC-4 codification (PC-1 amendment, §9 in-commit-consistency):** Finding #3 reframes from "trigger-as-primitive" to "audit-write-discipline mechanism-agnostic at substrate; three coexisting patterns at PC-4 (a/b/c) with differing integrity properties" per PC-4 §L3 Step 2 C2-5.`
  - **Anchor 1 — §3 / capability inventory at audit-write.** Augment original Finding #3 framing.
  - **Anchor 2 — §5 storage / migrations area citing trigger-based audit pattern.** If the original §5 prose names trigger-as-primitive, append addendum.
  - **Anchor 3 — §L3 capability "Audit write" (if named as a capability) or §L3 Step 2 if pre-template §L3 has Step 2 content.** Augment original cell text or paragraph.
  - **Anchor 4 — §8 question (Finding #3 originally surfaced as an open question per PC-1 entity bridge).** Augment the Q's original statement with the PC-4 codification addendum.

- **Finding #4 reframing — two-tier centralization PC-4-scope anchor.** Augment-in-place at multiple anchors + helper-introduction adjudication (see §3 adjudication-shape discipline above). Original PC-1 framing ("single centralization decision") preserved verbatim; bold-labeled trailing sub-clauses append the post-PC-3 + post-PC-4 two-tier reframe.
  - **Anchor 1 — §7 / open questions at centralization decision.** Augment original Finding #4 framing with two-tier reframe (Gap A substrate + Gap B auth-flow plumbing) + PC-4-scope concrete anchor (`lib/supabase/server.ts` admin-tier helper would close both Gaps simultaneously).
  - **Anchor 2 — §3 / auth-and-authz surface (if original §3 names a single-centralization approach).** Augment with two-tier framing.
  - **Anchor 3 — §L3 capability inventory or §L3 Step 2 (if pre-template §L3 has Step 2 content) at the auth-flow plumbing layer.** Augment original framing.
  - **Anchor 4 (conditional on adjudication outcome) — `lib/supabase/server.ts` Edit.** Only if §5a adjudicates helper-introduction as "write at amendment." Default: skip.

- **X5 two-tier centralization reframe — service-role escalation pattern.** Augment-in-place at multiple anchors mirroring Finding #4 two-tier framing. PC-3 §L3 Step 2 C3-2 reframed X5 anti-pattern scope from per-route framing to two-tier centralization framing (Gap A substrate + Gap B auth-flow plumbing apply to X5 service-role-using sites equivalently to admin-tier sites; 5 service-role-using sites / 6 createClient instances at PC-3 scope, with three permissions gating the routes: `invite_members`, `enroll_group_in_journey`, `manage_all_groups`). Original X5 framing in PC-1 spec is preserved verbatim; addendum appends post-PC-3 two-tier reframe.
  - **Anchor 1 — §3 / auth-and-authz surface at service-role escalation.** Augment original X5 framing.
  - **Anchor 2 — §7 / open questions at service-role design rule (if X5 anchored at §7 originally).** Augment with two-tier framing.
  - **Anchor 3 — §L3 capability inventory or §L3 Step 2 at service-role-using sites.** Augment original framing.

**Inline-fold discipline — canonical, not preserved-as-cold.** Per Experiment B comparison-phase disposition #6, canonical runs inline-fold corrections into the final §1–§8 text. This amendment is a canonical run; the preserve-as-cold variant is for experiment runs and does NOT apply.

**Augment-in-place shape — preserve original verbatim + append amendment-time addendum.** Sentence-level pattern is load-bearing for this amendment across all three findings. Use bold-labeled sub-clause pattern at each anchor. The (ii) Historical-record entry sub-variant of the §3-vs-§9 seam is the load-bearing default — PC-1's derivation-time framings for Findings #3 and #4 read as historical record post-amendment; the addendum carries the current state.

**Anchor containment disambiguation (within sentence-level augment-in-place).** Per template §5a sub-variants: single-paragraph anchor → trailing sub-clause at end of paragraph's last sentence; multi-paragraph anchor with cross-spec / divisional paragraph following → trailing sub-clause at end of substantive paragraph before the cross-spec paragraph. Apply per anchor at fresh-read time; surface at §5a checkpoint if any anchor's containment shape is ambiguous.

**Altitude-separation disposition — single finding, two altitudes, two paragraphs.** Likely to fire for Finding #4 if helper-introduction is adjudicated "route to FEAT-PC-*": §7 altitude (open-question reframing) vs §L3 capability altitude (cross-reference to receiving FEAT-PC-*) may surface as two-altitude question. Apply altitude-separation per template §5a if the section-touch inventory shows the same finding spanning multiple sections with different question framings at each.

**Carry-forward priors held — by reference to §7.** Finding #4 (load-bearing for this amendment, finding 2 directly) and X5 (load-bearing, finding 3 directly) are the active priors. P-O1 / D7 / X3 / D3 multi-role memberships carry forward informationally per the template's inheritance frame — no enumerated finding touches them in this amendment.

**Single-Write vs split-Edit at Phase 1.** Sub-batch-of-1 multi-Edit cadence is the default. Total Edit count estimated at **8–15 atomic Edits**:
- **Frontmatter housekeeping Edit (expected baseline)** — Edit #1: bump spec frontmatter `last_updated` from `2026-05-04` (or whatever the original derivation date is on disk) to `2026-05-16`. Per PC-3 amendment template revision (2) landed in template at §5a.
- **Finding #3 reframing**: 4 augment-in-place Edits (one per anchor).
- **Finding #4 reframing**: 3 augment-in-place Edits (one per anchor) + 0 or 1 helper-introduction Edit (conditional on adjudication; if "route to FEAT-PC-*", skip).
- **X5 reframe**: 3 augment-in-place Edits (one per anchor).
- **Phase 1 subtotal**: 11 Edits in default-adjudication scenario; 12 if helper-introduction adjudicated write-at-amendment.

Plus 1 Phase 2 Edit (the §L3 Step 3 block append). Total: ~12 Edits default; up to 15 with mid-run additions.

Sub-batch-of-3 is **not** attempted at Phase 1 even though discipline holds — mid-range scope, augment-in-place pattern, the fresh-read-per-Edit + pre-emit + gate triplet is what catches drift, and sub-batch-of-1 is the safe default per inherited §9 discipline.

**Ratified-additions discipline — surface mid-run additions at the next gate; do not batch for re-checkpoint.** Mid-run additions likely sources for this amendment:
- §3-vs-§9 seam firings (e.g. a Finding #3 fold-back at §5 reveals a parallel cross-reference at §L3 that's now stale — apply matching sub-variant disposition).
- Altitude-separation needs (Finding #4 if route-to-FEAT-PC-* may decompose into §7 + §L3 altitudes).
- Sub-batch-of-N splits if an augment-in-place anchor decomposes into multiple cells at fresh-read.

Surface each addition at the next gate's pre-emit with explicit Edit-count update; ratify atomically. Do not hold for batched re-checkpoint. Per PC-2 amendment precedent (planned 18 / landed 27 = +50%), final Edit count for this amendment may end at 12–18.

**Phase 1 checkpoint surfacing.** Before the first Edit, surface a structured summary to the human:

- **Frontmatter housekeeping Edit** (expected Edit #1): bump `last_updated` from disk-current value to `2026-05-16`. In-commit-consistency housekeeping; surfaced separately from finding fold-back to preserve the distinction.
- **Helper-introduction adjudication outcome** — route-to-FEAT-PC-* (default) / write-at-amendment / partial-slice. Rationale: name which receiving target carries the helper-introduction substance, and whether the spec text records the framing only or also the code work.
- **Section-touch inventory** — for each section of `docs/platform/core/infrastructure-specification.md` (§3, §5, §7, §8, §L3 capability inventory, §L3 Step 2 if present, §L3 Sources-status if present), which findings fold into it, and which Edits will land. With three findings and augment-in-place across multiple anchors per finding, total inventory likely 10–15 rows.
- **Edit cadence plan** — total Edit count; sub-batch-of-1; single combined spec-amendment commit per PC-2 amendment precedent (Phase 1 + Phase 2 in one commit; no partition). If helper-introduction adjudicated write-at-amendment, second commit for `lib/supabase/server.ts`.
- **Cross-section consistency watches** — sections that cite each other: §3 / §7 / §L3 cross-reference each other on auth-and-authz framings; Finding #3 audit-write language spans §3 / §5 / §L3 / §8; Finding #4 + X5 two-tier framing spans §3 / §7 / §L3. Augment-in-place at multiple anchors must preserve consistency of trailing addendum phrasing within each finding's three-pattern citation.
- **Carry-forward priors applied** — Finding #4 active at Finding #4 anchors; X5 active at X5 anchors; Finding #3 (PC-1-specific, not in the template's standard priors list) active at Finding #3 anchors.
- **Any divergence from the template's expected fold-back shape** — the largest source-bridge enumeration of any spec-amendment to date; the helper-introduction adjudication-shape sub-finding; the (b.i.2) preserve + append shape governing Phase 2; the third-instance-stress-test framing for §13.

Wait for ratification before the first Edit.

---

## §5b Phase 2 — Q-resolution and §L3 Step 3

**Activity.** Author the §L3 Step 3 amendment-time block.

**Case disposition — Case (b) per template §5b.** PC-1 does **not** have a §L3 Step 3 block (authored pre-template close per STATUS.md). The amendment session **authors a new §L3 Step 3 block** as part of the amendment. Sub-disposition variant **(b.i.2) preserve + append** is the recommended default per template §5b — the existing §L3 sub-structure (whatever derivation-time form it has) is preserved verbatim as derivation-time historical record; a new `#### Step 3 amendments (PC-1 amendment, 2026-05-16)` sub-section is appended carrying the amendment-time substance.

**Block-shape for (b.i.2) preserve + append.** Mirroring PC-2 amendment's §L3 Step 3 amendment-time block shape (canonical (b.i.2) precedent at commit `53fe0a2`): one `#### Step 3 amendments (PC-1 amendment, 2026-05-16)` sub-section appended under the existing §L3 sub-structure, carrying:

- **Disposition statement** — one-paragraph framing of what the amendment folded.
- **Q-resolution slate** — for each finding that carries Q-shape: Finding #3 settles the original PC-1 §8 question on trigger-as-primitive (now disposed by PC-4 audit-write three-pattern codification); Finding #4 settles the original PC-1 §8 question on single-centralization (now disposed by two-tier reframe + helper-introduction routing); X5 reframe may augment existing X5 §8 entry without opening new Q. Slate columns: Q-number | finding | disposition (Resolved / Deferred / Routed to ADR / Pickup-listed) | disk anchor.
- **Cross-section amendment summary table** — one row per Edit Phase 1 landed; columns: Edit # | Section | Finding | Shape (augment-in-place / replacement / new sub-section) | anchor.
- **Pickup list** — Finding #4 helper-introduction substance (if route-to-FEAT-PC-*) routed to receiving FEAT-PC-* feature spec; any mid-fold-back findings discovered per §3 record-and-route routed to next downstream entity (DS-1 entry session-opener / dedicated template revision session / future amendment).
- **New SS entries** — PC-1 spec may or may not have a Sources-status block per pre-template close; if present, new entries continue from SS-(N+1). Expected entries: SS-(N+1) audit-write three-pattern codification record; SS-(N+2) two-tier centralization framing record; SS-(N+3) optional methodology observation if §13 prompt #1 or #2 surfaces a finding worth in-spec capture (e.g. third-instance-stress-test framing observation; the large source-bridge enumeration observation; whether §3-vs-§9 seam fired this session).

**§8 amendments.** Existing §8 questions for Finding #3 (trigger-as-primitive Q) and Finding #4 (single-centralization Q) get amended in-place via augment-in-place sub-class (ii) Historical-record entry per §3-vs-§9 seam discipline — original Q framings preserved verbatim; bold-labeled trailing sub-clauses append the post-PC-4 codification + two-tier reframe + routing dispositions. X5 §8 entry (if present) similarly augmented. No new Q opened (the three findings settle existing Qs; they do not open new ones).

**Phase 2 checkpoint surfacing.** Before authoring the §L3 Step 3 amendment-time block:

- **Disposition decision** — Case (b); (b.i.2) preserve + append; new sub-section `#### Step 3 amendments (PC-1 amendment, 2026-05-16)` appended under existing §L3 sub-structure.
- **Q-resolution slate** — three Q-resolutions (Finding #3 / Finding #4 / X5), each settling an existing §8 question via augment-in-place addendum.
- **§L3 Step 3 amendment-time block structure** — disposition statement + Q-resolution slate + cross-section amendment summary table + pickup list + new SS entries.
- **§8 amendments** — three existing-Q augmentations; no new Q.
- **New SS entry numbers** — SS-(N+1) audit-write three-pattern; SS-(N+2) two-tier centralization; SS-(N+3) optional methodology.

Wait for ratification before authoring.

---

## §5c Phase 3 — ADR amendments

**Activity.** For each finding requiring ADR amendment per Phase 2's Q-resolution slate, draft an append-only Option A ADR amendment. One commit per ADR.

**Provisional-zero stance.** Phase 3 starts at zero ADR commits per PC-2 and PC-3 amendment §5c precedent. PC-1-relevant ADRs (U001 single Postgres database; U007 three-layer permission model — already amended at PC-3 close `3697732`; U023 Platform Core / Domain Services decomposition) carry the relevant codifications for in-spec content; none of the three pending findings drive ADR amendment shape on enumeration. ADR scope re-adjudicated at the §5c checkpoint after Phase 1+2 land.

**Possible non-zero outcomes:**

- **Finding #3 audit-write three-pattern codification** may surface ADR-U007 amendment candidacy IF the three-pattern carries architectural commitment not already captured by the four-component scope ADR-U007 received at PC-3 close. Likely *not* an ADR amendment — the three-pattern is implementation discipline (which pattern to use when), not architectural decision. But adjudicate at §5c.
- **Finding #4 two-tier centralization** does NOT drive ADR amendment — helper-introduction is app-tier plumbing, not architectural decision; the two-tier framing itself is a refactoring opportunity, not a new architectural commitment. Routes to FEAT-PC-* per §5a default adjudication or to in-spec text per write-at-amendment outcome; neither path opens ADR.
- **X5 reframe** does NOT drive ADR amendment — service-role escalation governance is already covered by ADR-U007's three-justification design rule; the two-tier framing is a refactoring opportunity within that rule, not a new commitment.

**Shape variants — choose by substance if non-zero.** Three append-only Option A shape variants precedented at PC-3: THREE-COMPONENT (U006), FOUR-COMPONENT (U007), THREE-DISTINCTION (U018). If Finding #3 surfaces ADR-U007 amendment candidacy, the natural shape would be **adds-a-component** to the existing four-component scope — a five-component variant. But likely not warranted; the §5c default is zero.

**Per-ADR ritual** (if non-zero): per template §5c — fresh-read current ADR text → scope decision → draft amendment → structural inventory + Tripwire #4 → print-batch-before-gate → bouncer tightenings absorbed → Edit 1 (Date line) → Edit 2 (section insertion) → single commit with structured body citing spec-amendment commit + source-bridge provenance + disk anchors.

**Phase 3 checkpoint surfacing.** Surface adjudication outcome:

- **Provisional-zero confirmed** (most likely) → skip Phase 3 entirely; proceed to closing bridge.
- **Non-zero, N ADR commits** → for each ADR: scope + shape variant + disk anchors + provenance citations + sub-batch-of-1 order across ADRs.

Wait for ratification.

---

## §6 Self-checking discipline — Tripwire #4 substitute

Inherited from template §6 verbatim — no PC-1-specific adaptations. Hard rules apply identically:

- **Fresh-read before every Edit; never construct `oldText` from memory.** Particularly load-bearing for this amendment given the augment-in-place sentence-level pattern at 10+ anchors — same Edit shape but different host text per anchor; the pattern-similarity makes oldText-from-memory failure modes especially risky.
- **Structural-inventory-before-defect-assertion.**
- **Enumeration-claim-scoping** — applies particularly when verifying cross-section consistency post-fold-back ("the spec is consistent on audit-write language" / "the spec is consistent on two-tier framing" → state the cross-references searched).
- **Verify-before-asserting on commit-shape claims** — applies to citations of the spec's most-recent-touch commit (`12897d2`), the four source-bridge commits (PC-1 close: see bridge filename for SHA; PC-3 close `172ecd9`; PC-4 close: see bridge filename; Phase 2 close-out `8976646`), and the spec-amendment commit when authoring the closing bridge body.
- **Cross-section fresh-read before second-touch Edits** — Finding #3 augment-in-place at §3 + §5 + §L3 + §8 visits four cross-referencing sections; fresh-read each before composing its Edit. Finding #4 + X5 similar across §3 / §7 / §L3.
- **Listing commands use explicit counts.**

**Methodology-framing space.** Amendment-specific observation surface for this amendment includes: third-instance-stress-test framing for §13 (does the spec-amendment template behave as expected on its third instance after PC-2 first-instance + PC-3 second-instance experience, or do PC-3-revision-cycle artifacts surface that warrant follow-on revision); whether the large source-bridge enumeration (4 chronological bridges) surfaces a class of failure mode the smaller PC-2 (2 bridges) and PC-3 (2 bridges) enumerations masked; whether the helper-introduction adjudication-shape sub-finding works as the §3 adjudication-shape sub-class anticipates.

---

## §7 Carry-forward priors (named) — by reference

| Prior | Applies when | Status for this amendment |
|---|---|---|
| **P-O1** | Fold-back touches actor-primitive language in §3 / §5 / §6 / §L3. | Informational — no enumerated finding touches actor-primitive language; PC-1 spec was authored before P-O1 was named (program-level promotion landed at Phase 2 close-out per PC-3 amendment routing). PC-1 spec may carry pre-promotion language that is bridge-altitude not amendment-scope; out-of-scope per §3. |
| **D7** | Fold-back touches role-name vocabulary in §2 / §5. | Informational — no enumerated finding touches role-name vocabulary. |
| **X3** | Fold-back touches `has_permission` signature or any ADR-disk signature drift. | Informational — ADR-U007 already amended at `3697732` (PC-3 close) with the four-component scope; no PC-1-amendment-time touch needed. |
| **X5** | Fold-back touches service-role escalation patterns in §3 / §6 / §7. **Load-bearing for this amendment** — finding 3 IS the X5 two-tier reframe. | Active — finding 3. |
| **Finding #4** | Fold-back touches secrets/credentials substrate (app-tier, not database-tier). **Load-bearing for this amendment** — finding 2 IS the Finding #4 two-tier reframe + helper-introduction adjudication. | Active — finding 2. |
| **Finding #3 (PC-1-specific)** | Fold-back touches audit-write language in §3 / §5 / §L3 / §8. **Load-bearing for this amendment** — finding 1 IS the Finding #3 audit-write three-pattern reframe. Not in the template's standard priors list (Finding #4 is; Finding #3 was held within PC-1 scope per the original PC-1 entity bridge until PC-4 codified the three-pattern). | Active — finding 1. |
| **Multi-role memberships (D3)** | Fold-back touches membership-role capability surface. | Informational — no enumerated finding touches multi-role memberships; both PC-2 amendment and PC-3 amendment adjudicated D3 (PC-2 as no-relevant-slice; PC-3-relevance settled at PC-3 amendment per the source bridges); PC-1 carries no membership-role surface. |

The "applies when" column is informational — it does not gate the prior; the prior holds throughout the session and applies wherever its pattern fires. Full statement of each shared prior lives in `docs/templates/autonomous-l1-l3-session-opener.md` §7.

---

## §8 Findings enumeration — verbatim from source bridges

*Three findings transcribed from the four source bridges named at §2 Read 1. Finding #3 originates at PC-1 entity close (original framing) + PC-4 close §L3 Step 2 C2-5 (codification). Finding #4 originates at PC-1 entity close (original framing) + PC-3 close §L3 Step 2 C3-2 (two-tier sharpening) + PC-4 close §L3 Step 2 C3-2 (PC-4-scope anchor) + Phase 2 close-out (helper-introduction adjudication deferral). X5 reframe originates at PC-3 close §L3 Step 2 C3-2 (two-tier sharpening) + Phase 2 close-out (routing consolidation). Group labels reflect the substance shape, not a single source bridge's taxonomy.*

### Group A — Substance reframings (compound provenance: PC-1 entity close + PC-3 close + PC-4 close + Phase 2 close-out)

- **Finding #3 reframing — audit-write three-pattern codification.** Original PC-1 framing (trigger-as-primitive) reframed by PC-4 §L3 Step 2 C2-5 to "audit-write-discipline mechanism-agnostic at substrate; three coexisting patterns at PC-4 with differing integrity properties: (a) SECURITY DEFINER direct-INSERT in admin RPC bodies (function-owner-controlled tamper-resistance; 5 disk sites); (b) SECURITY DEFINER trigger-mediated audit with admin-gating (function-owner-controlled tamper-resistance; 2 trigger functions); (c) anon-key-client RLS-gated INSERT at UI tier (RLS-gated but field-content-trusted; 7 disk sites)." Source bridges: PC-1 entity close (original Finding #3 statement); PC-4 close §L3 Step 2 C2-5 (codification); Phase 2 close-out Item 4 (routing to PC-1 amendment-list). **Augment-in-place sub-variant (ii) Historical-record entry** per template §3 — preserve original trigger-as-primitive framing verbatim as derivation-time historical record; append bold-labeled trailing sub-clause naming the post-PC-4 three-pattern codification at each anchor. Affects §3 (audit-write framing) + §5 (storage/migrations area citing audit pattern) + §L3 (capability inventory or Step 2 if present) + §8 (original Q on trigger-as-primitive). **ADR amendment candidate:** TBD — provisionally No (three-pattern is implementation discipline, not architectural decision; re-adjudicated at §5c).

- **Finding #4 reframing — two-tier centralization PC-4-scope anchor.** Original PC-1 framing (single centralization decision) reframed by PC-3 §L3 Step 2 C3-2 to "two-tier substrate + auth-flow" (Gap A: substrate service-role management; Gap B: auth-flow plumbing chain that distributes the substrate to call sites). PC-4 close §L3 Step 2 C3-2 anchored at PC-4 scope: "PC-4 contributes 2 of 5 X5 sites (`lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`); identical Gap A + Gap B patterns. Concrete centralization opportunity: introducing `lib/supabase/server.ts` admin-tier helper would close BOTH Gaps at PC-4 simultaneously. Sub-class refinements: intra-file duplication at lib-tier (2 isAdmin checks per file); single-chain-multi-branch at route-tier (1 Gap B chain serves 2 query paths)." Phase 2 close-out Item 5 routed to PC-1 amendment-list with explicit helper-introduction disposition deferral ("write at amendment OR route to FEAT-PC-* feature spec"). Source bridges: PC-1 entity close (original Finding #4 statement); PC-3 close §L3 Step 2 C3-2 (two-tier sharpening); PC-4 close §L3 Step 2 C3-2 (PC-4-scope anchor); Phase 2 close-out Item 5 (helper-introduction adjudication deferral). **Adjudication-shape sub-finding per template §3** — helper-introduction disposition (write-at-amendment vs route-to-FEAT-PC-*) determined at §5a checkpoint. **Augment-in-place sub-variant (ii) Historical-record entry** for the framing reframe; binary scope expansion if helper-introduction adjudicated write-at-amendment. Affects §3 (auth-and-authz surface) + §7 (open question on centralization) + §L3 (capability inventory; cross-reference to FEAT-PC-* if route-to-FEAT) + §8 (original Q on single-centralization) + conditionally `lib/supabase/server.ts` (if write-at-amendment). **ADR amendment candidate:** TBD — provisionally No (two-tier framing is refactoring opportunity, not new architectural commitment; re-adjudicated at §5c).

- **X5 two-tier centralization reframe — service-role escalation pattern.** Per PC-3 §L3 Step 2 C3-2: "X5 anti-pattern scope (5 service-role-using sites / 6 createClient instances): three permissions gate the X5 routes (`invite_members`, `enroll_group_in_journey`, `manage_all_groups`); PC-1 amendment candidate at Phase 2 close-out." The reframe applies the two-tier centralization framing (Gap A substrate + Gap B auth-flow plumbing) to X5 service-role-using sites equivalently to admin-tier sites — same structural shape, different invocation surface. Source bridges: PC-3 close §L3 Step 2 C3-2 (two-tier reframe + PC-1 amendment candidate routing); Phase 2 close-out (consolidation in PC-1 amendment-list). **Augment-in-place sub-variant (ii) Historical-record entry** per template §3 — preserve original X5 framing verbatim (whatever shape PC-1 carries on disk; may be per-route-anti-pattern or already substrate-anti-pattern); append bold-labeled trailing sub-clause naming the post-PC-3 two-tier reframe. Affects §3 (auth-and-authz surface at service-role escalation) + §7 (open question on service-role design rule if X5 anchored there) + §L3 (capability inventory at service-role-using sites). **ADR amendment candidate:** No — ADR-U007 three-justification design rule already covers service-role governance; two-tier framing is refactoring opportunity within that rule.

### Additional findings — none

This amendment's pending-findings cell in STATUS.md enumerates exactly three findings (Finding #3 reframing + Finding #4 two-tier + X5 two-tier reframe). No further additions surfaced from the four source bridges post-bridge-authoring. Phase 2 close-out's other routings (cross-tier write discipline → DS-1 entry session-opener; P11 archeology + P-RC2 → DevOps-tier; substrate-completion-window → PW-1 sub-shape watch) are routed elsewhere per Phase 2 close-out closing bridge and are NOT in this amendment's scope per §3 scope-locked discipline.

---

## §9 Disciplines in effect — by reference

Inherited from `docs/templates/spec-amendment-session.md` §9 by reference. The disciplines apply equally to this amendment; no PC-1-specific overrides or additions. Full statements at `docs/templates/autonomous-l1-l3-session-opener.md` §9 (template §9 inheritance chain).

Disciplines load-bearing for this amendment (named for emphasis, not exhaustive):

- **Pre-emit announcement before every Edit.** Surface the full diff (`oldText` / `newText`) for review at the gate before the Edit lands. Pair with fresh-read of the spec immediately preceding diff construction. Promoted to first-class §9 discipline at PC-2 amendment close; third-instance application here.
- **Sub-batch-of-1 multi-Edit cadence default.** Mid-range scope; sub-batch-of-3 not attempted at Phase 1 even if discipline holds.
- **Augment-in-place sentence-level pattern (sub-variant (ii) Historical-record entry)** (named at §5a) — bold-labeled trailing sub-clause; preserve original verbatim. Load-bearing across all three findings; pattern recurs at 10+ anchors.
- **§3-vs-§9 seam recognition** — three sub-variants from PC-2 amendment available; expected to fire moderately given multi-section fold-back across §3 / §5 / §7 / §L3.
- **Append-only Option A for ADR amendments** — applies if §5c surfaces non-zero scope; default zero.
- **In-commit-consistency** — fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit.
- **Forward-only correction** — prior commits carry their own provenance; do not rewrite history. Particularly applies to any pre-template §L3 sub-structure preserved verbatim per (b.i.2); do not re-touch.
- **OLDFEAT blindness invariant** — out of scope per §3 scope-locked discipline.
- **§13 checkpoint surfacing as discrete-prompt sub-section** (named at §13) — three prompts answered as discrete units before closing-bridge authoring; closes the compression failure mode where bridge-authoring inlines §13 substance preemptively. PC-3 amendment is the canonical instance of this discipline's value; third-instance application here.

---

## §10 Output expectations and commit shape

Amendment session produces **2–5 commits** (mid-range given the larger Edit envelope than PC-3 amendment):

1. **Spec amendment commit (1)** — combined Phase 1 + Phase 2 amendments to `docs/platform/core/infrastructure-specification.md`. Mirroring PC-2 amendment's single-spec-amendment-commit shape; no partition.
2. **Helper-introduction commit (0 or 1)** — only if §5a adjudicates write-at-amendment. Separate commit for `lib/supabase/server.ts` admin-tier helper introduction. Default: skip; route to FEAT-PC-*.
3. **N ADR amendment commits** — provisional-zero. If §5c surfaces non-zero, sub-batch-of-1 across ADRs.
4. **Closing bridge commit (1)** — at `docs/planning/sessions/2026-05-16_NN_-_PC1-AMENDMENT-LANDED.md` per §11 below. Filename `NN` per session ordinality within 2026-05-16 (likely `02` — the second 2026-05-16 closing-bridge after Phase 2 close-out's `2026-05-16_01_-_…`).
5. **STATUS.md amendment commit (1, separate)** — marks PC-1 amendment `Done`, fills in Closing bridge / §13 captured / Template revision columns. Separate commit per convention.

**No push to origin** at session close. The human dispositions push as a deliberate next step.

---

## §11 Closing bridge — required sections

The closing bridge at `docs/planning/sessions/2026-05-16_NN_-_PC1-AMENDMENT-LANDED.md` follows the standard `docs/templates/session-bridge.md` shape, with these additional sections required for amendment sessions (per template §11):

- **Explicit closure statement:** "*PC-1 Infrastructure amendment session completes at this commit batch. Pending findings folded; spec at `docs/platform/core/infrastructure-specification.md` now reflects Finding #3 audit-write three-pattern codification per PC-4 §L3 Step 2 C2-5, Finding #4 two-tier centralization PC-4-scope anchor per PC-4 §L3 Step 2 C3-2 (helper-introduction adjudicated [outcome]), and X5 two-tier centralization reframe per PC-3 §L3 Step 2 C3-2.*"
- **Findings disposition table** — one row per finding from §8. Columns: Finding (Finding #3 / Finding #4 / X5) | Group | Status (Folded into §N / Adjudicated as pickup / Helper-introduction routed to FEAT-PC-* / etc.) | Anchor in amended spec (section + paragraph reference, or commit SHA + line range).
- **Pickup lists** for findings that surfaced during fold-back but are out-of-scope per §3 scope-locked discipline. Expected pickups: Finding #4 helper-introduction substance (if route-to-FEAT-PC-*) to receiving FEAT-PC-* feature spec; any mid-fold-back findings discovered per §3 record-and-route routed to next downstream entity (DS-1 entry session-opener / dedicated template revision session / future amendment).
- **Source-bridge provenance citations** — explicit citation of all four source bridges with the specific sections of each bridge that carried the folded findings (PC-1 entity close: original Finding #3 + Finding #4 framings; PC-3 close §L3 Step 2 C3-2: two-tier sharpening + X5 reframe + PC-1 amendment candidate routing; PC-4 close §L3 Step 2 C2-5 + C3-2: Finding #3 codification + Finding #4 PC-4-scope anchor; Phase 2 close-out Items 4 + 5: routing consolidation + helper-introduction adjudication deferral).
- **Methodology data points** captured this run. **Third-instance stress-test framing required** — does the spec-amendment template hold on its third instance after PC-2 first-instance (7 proposed revisions, all landed) + PC-3 second-instance (4 proposed revisions, landed in template content per the revision-history table) experience? Specifically: did the §3-vs-§9 seam discussion + three sub-variants help or fire noise across 10+ augment-in-place anchors; did the augment-in-place shape catalog hold at scale; did the (b.i.2) preserve + append default disposition correctly identify Case (b) as the right governing variant for PC-1; did the pre-emit + fresh-read + gate triplet hold cadence at sub-batch-of-1; did the ratified-additions discipline catch mid-run drift; did the adjudication-shape sub-class at §3 work for the helper-introduction sub-finding; did the §13 checkpoint surfacing discipline (PC-3 amendment's revision) restore the structural-reflection shape; did the (1) §1 Check 4 carry-forward enumeration completeness discipline catch the `cc-execute-prompt.md` carry-forward at §1 (it should — PC-3 revision was authored expressly to catch this); did the (2) frontmatter `last_updated` housekeeping Edit (PC-3 revision (2)) name as expected Edit #1.
- **Template revision disposition** — adjudicates whether the §13 post-run methodology capture surfaced durable findings warranting a `docs/templates/spec-amendment-session.md` follow-on amendment. PC-2 amendment proposed seven revisions (landed); PC-3 amendment proposed four revisions (landed in template content); PC-1 amendment may propose zero (if template holds on third instance with the cumulative seven + four revisions), few (small follow-on refinements), or more (if third-instance-stress-test surfaces new template gaps, especially around the large source-bridge enumeration shape or the (b.i.2) preserve + append at-scale shape). Either *no revision proposed* (with one-line rationale) or *N revisions proposed* (with the specific changes ordered by template-gap severity per PC-2 + PC-3 precedent).
- **Carry-forward to next amendment session.** Next amendment in the queue per STATUS.md is OLDFEAT reconciliation (anytime; non-blocking). Carry-forward likely light: PC-1 amendment's findings disposition is isolated from OLDFEAT scope per the source bridges' routings. The natural carry-forward channel is helper-introduction substance routing (if route-to-FEAT-PC-*) to a downstream FEAT-PC-* feature spec — not an amendment session.

---

## §12 Scope boundaries

- **The four source bridges (`2026-05-04_01_-_…` PC-1 close + `2026-05-14_02_-_…` PC-3 close + `2026-05-15_03_-_…` PC-4 close + `2026-05-16_01_-_…` Phase 2 close-out) are the enumeration scope.** Findings outside the enumerated three (Finding #3 / Finding #4 / X5) are out-of-scope per §3 scope-locked discipline.
- **Other amendments queued in STATUS.md are NOT touched.** OLDFEAT reconciliation (anytime; non-blocking) — out of scope at this session. Cross-amendment implications route to the receiving amendment's pickup-list.
- **Cross-spec implications.** If a finding has implications for another spec, route to that spec's pickup-list channel rather than amending here. Particularly: helper-introduction substance (if route-to-FEAT-PC-*) routes to FEAT-PC-* feature spec, not adjacent PC-N specs.
- **OLDFEAT blindness invariant.** Out-of-scope by §3 regardless of formal lift status. The Experiment B comparison-phase analysis closed, which is the formal lift trigger per the bridge's disposition list, but PC-1 amendment evidence scope is the four source bridges + the spec — not OLDFEAT reconciliation.
- **Downstream entity work.** Amendment session does NOT touch downstream entity work (FEAT-PC1-* feature specs; code; tests) by default. **Exception**: helper-introduction at `lib/supabase/server.ts` is an in-scope candidate only if §5a adjudicates write-at-amendment. The default is route-to-FEAT-PC-*, preserving the amendment-no-code discipline.
- **Doc-hygiene out of scope.** Doc-health-check pickups (G-21, etc.) and any cross-amendment housekeeping are out-of-scope for amendment work; the amendment folds the substantive findings, not doc-hygiene cleanup.
- **DS-1 entry session-opener** is NOT authored at this amendment. Phase 2 close-out routed cross-tier write discipline + the post-PC-1-amendment DS-1 entry to a follow-on session; this amendment's scope closes with the closing bridge + STATUS.md commit.

---

## §13 Post-run methodology capture (required, lighter than autonomous)

After Phase 3 lands (or §5c provisional-zero confirmed) and BEFORE the closing bridge is authored, answer the following three prompts. Output flows into the closing bridge's Methodology data points section AND informs the closing bridge's Template revision disposition section.

**Third-instance stress-test framing required.** This is the third instance of the spec-amendment template post-revision. §13 capture should explicitly contrast against PC-2 amendment's first-instance experience and PC-3 amendment's second-instance experience: which sections held cleanly on third instance vs which fired noise; which PC-2-revision-cycle + PC-3-revision-cycle additions to the template were exercised here (cumulative revisions: PC-2 seven [§3-vs-§9 seam + three sub-variants; augment-in-place shape catalog at §5a; altitude-separation disposition; adjudication-shape findings as §3 sub-class; pre-emit announcement first-class at §9; ratified-additions discipline at §5a Edit cadence plan; §5b (b.i.2) preserve+append as recommended default] + PC-3 four [§1 Check 4 carry-forward enumeration completeness; §5a frontmatter `last_updated` housekeeping; §13 checkpoint surfacing as discrete-prompt sub-section; §5a anchor containment disambiguation lower-priority]); whether any new template gap surfaced that the eleven cumulative revisions didn't anticipate.

**§13 checkpoint surfacing.** Before authoring the closing bridge, surface the three prompts' answers as discrete units to the human for ratification (parallel to §5a / §5b / §5c checkpoints at their phase boundaries):

- **Prompt 1 answer** — what worked / what got in the way. Discrete answer; bullet-form or short prose.
- **Prompt 2 answer** — discipline or scope item wished-for but absent. Discrete answer.
- **Prompt 3 answer** — adjacent findings surfaced mid-fold-back and their routing dispositions. Discrete answer.

Wait for ratification before authoring the closing bridge.

The three prompts:

1. **What worked from this template that the next amendment session should keep, and what got in the way?** Name specific sections, disciplines, or scope items that demonstrably helped — and specific sections, instructions, or scope items that fired noise rather than catch, duplicated other sections, or didn't apply to this amendment. **Third-instance framing:** which of the eleven cumulative revisions held cleanly on third instance; which (if any) surfaced ambiguity at the larger source-bridge enumeration scale (four bridges vs PC-2 / PC-3's two each); which (if any) over-engineered for the mid-range Edit envelope (8–15 Edits vs PC-2's 27 vs PC-3's small scope).
2. **What discipline or scope item did you wish was named that wasn't?** Things that, with hindsight, would have helped at Phase 1 / Phase 2 / Phase 3 had they been in the template. **Third-instance framing:** were there template gaps the eleven cumulative revisions didn't anticipate that surfaced here; did the large source-bridge enumeration (4 bridges) surface a class of failure mode the smaller PC-2 / PC-3 enumerations masked; did the helper-introduction adjudication-shape sub-finding (binary scope expansion possibility) surface a class of failure mode the prior D3-style adjudications didn't.
3. **What new finding surfaced during fold-back that wasn't in the input bridges, and where did it route?** Amendment-specific channel — captures the "adjacent findings discovered mid-fold-back" failure mode per §3's record-and-route discipline. List each such finding, its substance, and its routing disposition (pickup-listed to next amendment / pickup-listed to downstream entity / Phase 2 close-out / doc-health-check / new follow-on amendment proposed). **Helper-introduction adjudication outcome** (whichever of route-to-FEAT-PC-* / write-at-amendment / partial-slice lands at §5a) is itself a §13 prompt #3 entry — record adjudication rationale here regardless of substance Edit count.

The post-run capture's length scales with run scope. A mid-range-scope amendment with the third-instance-stress-test framing should produce roughly a half-to-three-quarter-page of bridge-prose: weighted toward prompt #1/#2 if eleven cumulative revisions surface as imperfect at this instance, or weighted toward prompt #3 if the helper-introduction adjudication or mid-fold-back findings carry the substance. Brevity is fine when there is genuinely nothing to surface; padding is not.

---

## §14 Start sequence

Begin with §1 Pre-flight checks. If all five pass, proceed to §2 State-read pass. Then §5a Phase 1 fold-back. Surface the §5a checkpoint before the first Edit — helper-introduction adjudication outcome is one of the first ratification items at §5a alongside the frontmatter housekeeping Edit and section-touch inventory.

---

*End of instance.*
