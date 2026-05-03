# Cascade-plan close-out — 2026-05-03

**Arc:** Agent context cascade plan (2026-04-27) → Sessions 1, 2, 3, 4a, 4b, 4c → close-out (this bridge).
**Reader:** retrospective — future cascade-plan-style session, methodology audit, contributor reading current root-CLAUDE shape against its origin.
**Not:** a within-session bridge; not a next-session-opener.
**Anchor commit at close:** `4dcb79f` (S4c bridge), `origin/main` current.

---

## §1. Scope

This bridge tests the 2026-04-27 plan's predictions against what actually executed across six sessions. Cross-session synthesis only — within-session work lives in the six prior bridges. The arc's locked decisions, candidate ledger, working-pattern findings, and tier-CLAUDE end-state are all on the table together for the first and last time.

What the close-out is the deciding venue for: the candidate-ledger split flagged at S4a (§6 below). What it is not: the executing venue for any new migration — those belong to the next cascade-touching session, scoped from current state.

---

## §2. D1–D5 verdict

Three-category vocabulary used below: **held / held-with-refinement / held-with-extension**. Refinement = correction or precedent-doubling pending policy update. Extension = scope honestly grew without rework. D2 sits outside the three categories — its override was anticipated by the cascade itself, and the in-cell description carries the asymmetry (see note after table).

| # | Decision | Verdict | Anchor evidence |
|---|---|---|---|
| D1 | Progressive context loading; each level adds only its own rules | **Held** | Tier-files-as-deltas pattern stable across every CLAUDE.md authored S1–S4c. Verticals-section-omission default emerged consistent with the principle without being separately legislated. |
| D2 | Cascade C: root → tier → sub-tier (platform-only) → entity → sub-entity opt-in by divergence | **Held** (with one principled, pre-anticipated override) | Gimbal sub-entity stubs deferred S2 (D2-over-D4 precedent — no speculative authoring). Cascade vindicated structurally; the override is what D2 itself authorises, not a deviation. |
| D3 | Four-row content policy | **Held with refinement** | Four-row → five-row terminology corrected S1 (Obs 1, locked-decision-incoherence pattern). Verticals-section-conditionality silent twice (S2 F1 / S3 D1) — precedent doubled, *pending* policy-text refinement at next cycle-boundary doc-health-check. |
| D4 | Four-session sequencing; granular commits | **Held with extension** | Order respected S1 → S2 → S3 → S4. S4 split into 4a/4b/4c without violating sequencing. New patterns surfaced extending the granularity rule: asymmetric-two-half migrations (R5), verification-and-delete (R4), hypothesis-verification-via-code (R8). |
| D5 | Skill edits scoped (decomp + doc-health-check) | **Held with extension** | S1 added stress-test-pass methodology section to `ecosystem-decomposition` beyond original scope (G-31 same-session resolution). Section 9 of `doc-health-check` landed as planned. |

D2's "held with anticipated override" is a fourth shape used once. Not elevated to a category — over-formalises for a single instance whose existence the cascade design explicitly accommodates.

---

## §3. Candidate ledger — final arc state

Candidates are organised by status (promoted / first-instance-still-pending / collapsed / adjacent). Recognition tests are stated where they anchor §6's tripwire.

### Promoted

- **Candidate A — Rules↔Gotchas back-reference, scale-agnostic.** Introduced S2; promoted S4a on cross-file evidence (root↔Hub Auth/State trims). S4c adjacency: applies at tier-vs-entity scale (R6 split) as well as root-vs-entity.
- **Candidate B — categorisation-rationale-in-file.** Introduced S2; promoted S4a via the `sb_publishable_*` light-form rationale (C7). S3 had near-evidence (Core R2 rationale), honestly counted as not-yet-second-instance.
- **Candidate E — wide-first sweep / scope-catalog-as-output-not-input.** Introduced S4a; promoted S4b (§Critical-gotchas section's structural mis-shape was invisible to N-rules-locked framing). S4c added accumulation (F1, F2 wide-first findings; R3 stale-framing). Sweep cadence locked: sweep twice, wide first, scope-catalog is the *output* of the first sweep.
- **Candidate F — overlap-naming attaches to tier-file pointer.** Promoted S3.

### First-instance, awaiting second

- **Verification-and-delete (R4 shape, S4c).** Recognition test: *source already covered at destination in equal-or-fuller form; port-down would be redundant; migration is delete-at-source only.* Distinguishes from true-migration (destination empty or covers less in form).
- **Destination-classification-by-readership-via-cascade (F2 shape, S4c).** Recognition test: *wide-first sweep's content-affinity nomination is contradicted by cascade-readership analysis.* (Mechanism — the contradiction surfaces at draft-time rather than sweep-time — is context, not the recognition itself.) Distinguishes from R8-style hypothesis-verification-via-code, which dissolves a multi-option framing rather than reclassifies a destination.
- **Inherited from S3 (still pending second-instance):** rule-opening pattern; standalone-anchoring; structural-parallel-between-siblings. S4a/4b/4c did not supply named tests for these — neither retired nor promoted.

### Collapsed

- **Candidates C and D (S2 originals: cross-file scale; second-sweep-non-redundant).** Collapsed into A and E during S4a's review-cycle.

### Adjacency observations (held without promotion)

- Broader destination-read meta-pattern (super-set of verification-and-delete + destination-classification + R8 — explicitly *not* absorbed into one umbrella candidate; discipline applied).
- Source-read-when-source-is-code (R8 only; one instance).
- Migration-moments-expose-inherited-imprecisions (the .sh/.bat overstatement at platform tier).
- Reconciliation-lifts-tail-claims (S4b Obs 2).

S4b/4c discipline-tightening operated explicitly here: refused absorptions into existing candidates; collapses applied where evidence overlapped; preserved boundaries between named candidates; kept honest movement counts. This discipline is what §6's split decision rests on.

---

## §4. Working-pattern findings

### Bouncing-partner — separated into three components

- **(a) Chat-based ratification cycle — methodology.** Load-bearing structural step: borderline calls surface to chat before commit; chat-Claude rules; CC executes ruling. The cycle itself is the methodology, not the participants.
- **(b) Surface-draft-before-commit discipline — methodology.** Operationalises (a) into commit cadence. Trigger is **consequential-surface-area AND first-visibility-of-proposed-text** (both required, not either). Mechanical follow-ons skip surface-draft even when consequential, because they lack first-visibility — the proposed text is already seen and ratified by precedent. This AND-logic is what keeps the cycle from firing on rote follow-up commits.
- **(c) Role asymmetry (CC executes, chat-Claude bounces) — situational.** Current operational fact, not the methodology. The methodology is the cycle and the discipline; who plays which role is replaceable.

### Other patterns

- **Wide-first sweep / scope-as-output (Candidate E above).** Promoted; sweep cadence locked.
- **Consequence-sweep-as-separate-commit.** Held twice (S4b F2 templates path-update; §Critical-gotchas how-we-work line). When migration's last destination commit lands, stale inbound references move in their own commit with explicit "consequence-sweep of X" framing. Promoted-by-repetition.
- **Sleep-on-it discipline.** Held S4a, S4b, through most of S4c. Drifted at S4c's final commit (push followed bridge commit without a cycle). The 4c bridge's own forward-flag codifies the corrective (push-then-sleep; close-out reads `origin/main`, not local work-in-progress). Honest data point.

---

## §5. What the plan didn't anticipate

- **The 4a/4b/4c split itself.** Plan treated S4 as one session; S4a's wide-first sweep produced more candidates than one plate could hold. Split decision locked at start of S4b.
- **Candidate-ledger emergence.** Plan had no ledger. Candidates A/B (S2), E + S3-trio (S3/S4a), verification-and-delete + destination-classification (S4c) accumulated through execution without a planned vehicle.
- **Verification-and-delete vs true-migration distinction (S4c R4).** Plan implicitly assumed all migrations port-down.
- **Destination-reclassification-from-wide-first-acceptance (S4c F2).** Wide-first got *what* right and *where* wrong; surface-draft caught it pre-commit — the contradiction itself is the recognition test (§3).
- **§Critical-gotchas section as a structural unit (S4b).** Plan saw the section bullet-by-bullet; reality was section-level mis-shape post-cascade requiring as-a-unit migration.
- **Asymmetric-two-half migrations (S4c R5).** Source split where one half is genuine port and the other is verify-only.
- **Hypothesis-verification-via-code (S4c R8).** Reading `package.json` + test-file inline comments dissolved a three-option framing. Documentation lagging the code's own self-categorisation wasn't a category the plan had.

---

## §6. Candidate-ledger split decision

**Decision: defer.** The discipline named load-bearing — strict recognition tests, named second-instance tests, refused absorptions, collapses-during-review, honest movement counts — is what's keeping the ledger workable, per S4b/4c evidence.

**Tripwire (single, substantive):** *a third new first-instance candidate introduced from this close-out forward — the current §3 ledger is baseline, not counted — matching a §3 recognition-test shape lands without a promotion in the same session.* That signals recognition discipline is no longer keeping pace with candidate accrual. Length proxies (page count, candidate count alone) dropped — they don't pull weight beside the substantive trigger.

The tripwire's count is over candidates that match the *shape* of a recognition-test (verification-and-delete shape; destination-classification-by-readership-via-cascade shape; etc.) — bare count of named entries in the ledger is not the metric. The temporal anchor is explicit: future-introduced only; the entries already in §3 (whether promoted, first-instance-pending, or S3-inherited) form the baseline and do not count toward the trigger.

---

## §7. Open follow-ups carried out of the arc

- **Temporary RBAC anchor at `docs/platform/core/CLAUDE.md`.** Carried in pending Identity entity-file authoring. Self-flagged in-bridge at S4c; no action this arc.
- **.sh/.bat overstatement at `docs/platform/CLAUDE.md`.** Migration-exposed inherited imprecision; flagged for correction at next platform-tier touch.
- **Verticals-section-conditionality precedent doubled (S2 F1 / S3 D1) but not refined into D3 policy text.** Cycle-boundary doc-health-check should review whether the precedent now warrants explicit content-policy refinement.
- **B.2 narrative track.** Four uncommitted files at `docs/products/hub/` (HUB-L3-NARRATIVE{,-TECHNICAL}.{md,docx}) carried forward through the cascade-plan track; out of scope for this arc, picked up by next B.2 session.

---

## §8. Pointer to next bridge + push-timing choice

**Next bridge:** B.2 narrative track resumption is the obvious thread. The cascade-plan arc itself does not require a next-session pointer beyond that — the methodology landed, the ledger stands, the cycle-boundary doc-health-check inherits the cascade-consistency Section 9 added in S1.

**Push-timing choice (named explicitly):** sleep-on-it discipline waived deliberately at the arc boundary. Close-out has no next-session reader to protect, and the discipline holds for bridges that gate downstream work — this one gates nothing. Mirroring the 4c-drift named honestly in §4 with explicit precedent rather than silent default. Close-out practices the discipline it names.
