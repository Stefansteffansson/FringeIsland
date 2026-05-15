# Pipeline status — autonomous L1→L3 runs + amendment sessions

**Purpose:** track every entity slated for autonomous L1→L3 derivation, plus phase landmarks, plus amendment sessions that fold deferred Experiment A + Experiment B findings into canonical specs. Updated at each entity-entry / amendment-entry (mark `In flight`) and entity-close / amendment-close (mark `Done`, link to bridges, record §13 + template revision status where applicable).

**Canonical templates:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) for autonomous L1→L3 runs; [`docs/templates/spec-amendment-session.md`](../../../templates/spec-amendment-session.md) for amendment sessions.

**Procedure:** see [`README.md`](./README.md) for the authoring + execution workflow.

---

## Status values

- **Done** — closing bridge has landed.
- **In flight** — opener instance authored; CC run executing or paused mid-run.
- **Next** — entity is at the head of the queue; opener to author next.
- **Pending** — entity is in the pipeline but upstream isn't done yet.
- **Pending; template applicability TBD** — entity may or may not run autonomous L1→L3 from this template (e.g. obligation-inventory variants).

---

## Platform Core (Phase 2)

| Entity | Type | Status | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| PC-1 Infrastructure | Platform Core area | Done | — | [`2026-05-04_01_-_PC1-L1-L3-COMPLETE.md`](../2026-05-04_01_-_PC1-L1-L3-COMPLETE.md) | n/a (pre-template) | n/a |
| PC-2 Identity | Platform Core area | Done | — | [`2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`](../2026-05-04_02_-_PC2-L1-L3-COMPLETE.md) | n/a (pre-template) | n/a |
| PC-3 Organisation | Platform Core area | Done | [`archive/cc-pc3-step3-manual.md`](./archive/cc-pc3-step3-manual.md) (manual track) | [`2026-05-14_02_-_PC3-STEP3-LANDED.md`](../2026-05-14_02_-_PC3-STEP3-LANDED.md) | n/a (pre-template) | n/a |
| PC-4 Governance | Platform Core area | **Done** | [`cc-pc4-autonomous.md`](./cc-pc4-autonomous.md) | [`2026-05-15_03_-_PC4-LANDED.md`](../2026-05-15_03_-_PC4-LANDED.md) | Yes (first-instance autonomous-template stress-test; 7 template-revision candidates; A#9 + PW-1 promotion FULLY EARNED; A#5 + A#6 + A#8 promotion-ready) | REVISION PROPOSED (7 candidates: §5b cluster cadence text clarification + directory-level mixed-tier-scope discipline naming + A#5 per-phase cadence + 4 lower-priority; routes to DS-1 entry opener authoring or dedicated template revision session) |
| Phase 2 close-out | Phase landmark | **Next** | — | — | — | — |

## Platform Domain (Phase 3)

*Order: numeric DS-1 → DS-7 per [`docs/platform/domain/README.md`](../../../platform/domain/README.md), followed by Extension System. A dependency graph at `docs/planning/reference/DOMAIN_SERVICE_DEPENDENCIES.svg` is named in the Domain README but is not on disk; once authored, it may revise this order.*

| Entity | Type | Status | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| DS-1 World Model | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| DS-2 Narrative Engine | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| DS-3 Experience Engine | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| DS-4 Content | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| DS-5 Communication | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| DS-6 Discovery | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| DS-7 Intelligence | Domain Service | Pending Phase 2 close | — | — | (pending) | (pending) |
| Extension System | Platform Domain — extensions | Pending Phase 2 close | — | — | (pending) | (pending) |
| Phase 3 close-out | Phase landmark | Pending Phase 3 | — | — | — | — |

## Products (provisional phase)

| Entity | Type | Status | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| Hub | Product | Done | — | [`2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md`](../2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md) | n/a (pre-template) | n/a |
| Gimbal | Product | Pending | — | — | (pending) | (pending) |
| Game | Product | Pending (placeholder) | — | — | (pending) | (pending) |

## Studios (provisional phase)

| Entity | Type | Status | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| Journey Studio | Studio | Pending | — | — | (pending) | (pending) |
| Universe Studio | Studio | Pending | — | — | (pending) | (pending) |
| Arc Studio | Studio | Pending | — | — | (pending) | (pending) |

## Design System (provisional phase)

| Entity | Type | Status | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| Design System | Tier-only | Pending | — | — | (pending) | (pending) |

## Verticals (cross-cutting; phase TBD)

*Order from G-03 in gaps.md: Privacy → Observability → Administration → Notifications → Transactions (rationale: feature-touching surface). The vertical-spec template uses the obligation-inventory variant per ecosystem-decomposition skill L3 content-type variants; whether the autonomous L1→L3 template at `docs/templates/autonomous-l1-l3-session-opener.md` applies as-is or needs a variant is TBD.*

| Entity | Type | Status | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| Privacy / GDPR | Vertical (obligation-inventory) | Pending; template applicability TBD | — | — | — | — |
| Observability | Vertical (obligation-inventory) | Pending; template applicability TBD | — | — | — | — |
| Administration | Vertical (obligation-inventory) | Pending; template applicability TBD | — | — | — | — |
| Notifications | Vertical (obligation-inventory) | Pending; template applicability TBD | — | — | — | — |
| Transactions | Vertical (obligation-inventory) | Pending; template applicability TBD | — | — | — | — |

---

## Amendment sessions

*Per-spec amendment sessions fold deferred Experiment A + Experiment B findings into canonical specs per the [`docs/templates/spec-amendment-session.md`](../../../templates/spec-amendment-session.md) template. Distinct work shape from autonomous L1→L3 runs — known scope (the findings to fold are enumerated in advance), one spec file per session, three-phase shape (fold-back → Q-resolution + L3 Step 3 → ADR amendments) mirroring PC-3 Step 3 precedent. Provenance citations are mandatory: each amendment commit names the source bridge (Experiment A bridge `2026-05-04_03_-_…`, Experiment B comparison-phase bridge `2026-05-14_03_-_…`, or PC-3 closing bridge `2026-05-14_02_-_…`) that surfaced the finding.*

| Spec | Status | Pending findings | Sequenced | Opener instance | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|---|
| PC-2 Identity | **Done** | Experiment A Group A (D1+X2, D2, D4) + Group B (C1.6, X4, X5 reframe) + PC-3 Q6 display-name coupling + Experiment B D3 multi-role memberships if PC-2-relevant | Before PC-4 entry | [`cc-pc2-amendment.md`](./cc-pc2-amendment.md) | [`2026-05-15_01_-_PC2-AMENDMENT-LANDED.md`](../2026-05-15_01_-_PC2-AMENDMENT-LANDED.md) | Yes (per closing bridge §Methodology data points) | REVISION LANDED (commit 70cbd15) |
| PC-3 Organisation | **Done** | Experiment B comparison-phase D3 multi-role memberships (autonomous-track surfaced; PC-3 manual-track gap; binary disposition per Experiment B bridge §Dispositions #1: fold into PC-3 spec OR carry as PC-4 / Phase 2 close-out pickup — PC-3 adjudication pending) + P-O1 promotion citation at PC-3 actor-primitive sections (§3 SQL helpers, §6 actor-primitive partition, §L3 capability "Personal-group actor primitive") per Experiment B bridge §Dispositions #3 + SS-11 status update (A-candidate #9 promotion-watch → ratified at Experiment B comparison-phase per disposition #4; awaiting DS-* entry for cross-entity recurrence ratification) | Before PC-4 entry | [`cc-pc3-amendment.md`](./cc-pc3-amendment.md) | [`2026-05-15_02_-_PC3-AMENDMENT-LANDED.md`](../2026-05-15_02_-_PC3-AMENDMENT-LANDED.md) | Yes (per closing bridge §Methodology data points — second-instance-stress-test verdict + 3 template-revision candidates + 1 lower-priority + D3 adjudication rationale + adjacent-finding capture) | REVISION PROPOSED (3 candidates + 1 lower-priority; routes to PC-1 amendment opener authoring or dedicated template revision session) |
| PC-1 Infrastructure | Pending | X5 two-tier centralization reframe per PC-3 §L3 Step 2 C3-2 + Finding #4 Phase-2 close-out adjudication preparation | After PC-4 entry | (to author) | (to author) | (pending) | (pending) |
| OLDFEAT reconciliation | Pending | 18 pre-refactor artifacts in `docs/TMP/OLDFEAT/` — reconcile against current canonical specs; absorb-and-delete per G-22 if applicable | Anytime; not blocking | (to author) | (to author) | (pending) | (pending) |

*Three additional homes for findings already exist and are not tracked here:*
- *Carry-forward priors in the template's §7 (P-O1, D7, X3, X5, Finding #4, multi-role memberships D3 as Step 1 watch) — already absorbed into the template; no separate amendment work needed.*
- *Pickup-list channels from prior closing bridges — already operating; e.g. PC-3 closing bridge routed Q6 to "PC-2 amendment carry-forward (deferred to post-Experiment-B)" which is now firing as the PC-2 amendment session above.*
- *ADR amendments at entity close — already in scope of each entity's autonomous L1→L3 run per template §5c.*

---

## Revision log

| Date | Change |
|---|---|
| 2026-05-14 | Initial authoring. Captures PC-1/PC-2/PC-3 + Hub as Done (pre-template); marks PC-4 as Next. |
| 2026-05-14 | Add Amendment sessions table (PC-2 / PC-1 / OLDFEAT reconciliation). PC-4 status moved from Next to "Pending PC-2 amendment" — PC-2 amendment session is the new Next item. Top-of-file purpose statement broadened to cover both autonomous L1→L3 runs and amendment sessions. |
| 2026-05-15 | Amendment sessions table gains §13 captured + Template revision columns mirroring the autonomous-runs tables; PC-2 / PC-1 / OLDFEAT rows seeded `(pending)` in both. Intro paragraph cites the new [`spec-amendment-session.md`](../../../templates/spec-amendment-session.md) canonical template and the three-phase work shape. Top-of-file Canonical template line broadened to name both templates. |
| 2026-05-15 | Amendment sessions table gains `Opener instance` column (inserted between `Sequenced` and `Closing bridge`, mirroring the position in the autonomous-runs tables relative to `Closing bridge`). PC-1 / OLDFEAT rows seeded `(to author)`. PC-2 Identity row marked **In flight** at session-open and links to [`cc-pc2-amendment.md`](./cc-pc2-amendment.md). |
| 2026-05-15 | PC-2 Identity amendment session **Done** at closing-bridge commit `f715c70`. Row updated: Status → **Done**; Closing bridge → [`2026-05-15_01_-_PC2-AMENDMENT-LANDED.md`](../2026-05-15_01_-_PC2-AMENDMENT-LANDED.md); §13 captured → Yes (4-instance §3/§9 seam + 5 other observations); Template revision → REVISION PROPOSED (7 candidates ordered by template-gap severity; routes to PC-1 amendment opener authoring or dedicated template revision session). Spec amendment commit `53fe0a2` lands the combined Phase 1 + Phase 2 substance. Phase 3 zero ADR amendment commits per §5c provisional-zero stance. |
| 2026-05-15 | Spec-amendment template revision session landed (commit `70cbd15`); PC-2 Identity row's `Template revision` column updated from `REVISION PROPOSED (7 candidates)` to `REVISION LANDED (commit 70cbd15)`. Seven revisions folded into `docs/templates/spec-amendment-session.md` (§3-vs-§9 seam at §3; augment-in-place shape catalog at §5a; altitude-separation disposition at §5a; adjudication-shape findings as §3 sub-class; pre-emit announcement first-class at §9; ratified-additions discipline at §5a Edit cadence plan; §5b (b.i.2) preserve+append as recommended default). |
| 2026-05-15 | **Pipeline correction.** Post-session review surfaced that Experiment B comparison-phase findings ([`2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`](../2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md), landed 2026-05-14 19:49 at `b6575e6`) were never folded into PC-3 Organisation's canonical spec because the bridge post-dates PC-3 close (PC-3 closed 2026-05-14 19:17 at `172ecd9`). PC-2 amendment adjudicated D3 multi-role memberships as no-PC-2-relevant-slice; PC-3 was never adjudicated either way despite the Experiment B disposition #1 binary explicitly naming PC-3 as one of the two valid homes. **PC-3 Organisation row added to Amendment sessions table, marked `Next` with `Sequenced: Before PC-4 entry`.** Pending findings: Experiment B D3 multi-role memberships adjudication; P-O1 promotion citation at PC-3 actor-primitive sections per Experiment B disposition #3; SS-11 status update for A-candidate #9 promotion-watch → ratified at Experiment B comparison-phase per disposition #4. PC-4 Governance row's `Status` updated from `Pending PC-2 amendment` to `Pending PC-3 amendment`. PC-1 Infrastructure row's `Sequenced` column unchanged (`After PC-4 entry`) — PC-3 amendment inserts between PC-2 and PC-4 without re-flowing PC-1's position. |
| 2026-05-15 | PC-3 Organisation amendment session-opener instance authored at commit `4f68400` ([`cc-pc3-amendment.md`](./cc-pc3-amendment.md)). PC-3 Organisation row marked **In flight** at session-open; `Opener instance` column links to the just-authored instance. Second instance of the spec-amendment template post-revision (first instance: [`cc-pc2-amendment.md`](./cc-pc2-amendment.md) at `b2181ed`); §13 post-run capture carries second-instance-stress-test framing against the seven revisions landed at `70cbd15`. |
| 2026-05-15 | PC-3 Organisation amendment session **Done** at closing-bridge commit `af07206`. Row updated: Status → **Done**; Closing bridge → [`2026-05-15_02_-_PC3-AMENDMENT-LANDED.md`](../2026-05-15_02_-_PC3-AMENDMENT-LANDED.md); §13 captured → Yes (second-instance-stress-test verdict on the seven `70cbd15` revisions: 3 held cleanly / 3 did not fire correctly / 1 not tested; 3 template-revision candidates + 1 lower-priority + D3 adjudication rationale + adjacent-finding capture); Template revision → REVISION PROPOSED (3 candidates: §1 Check 4 carry-forward enumeration completeness; §5a Edit cadence plan name frontmatter `last_updated` housekeeping; §13 capture discipline discrete-prompt-surface at §5c-to-closing-bridge transition; routes to PC-1 amendment opener authoring or dedicated template revision session). Spec amendment commit `058d9e5` lands the combined Phase 1 + Phase 2 substance. Phase 3 zero ADR amendment commits per §5c provisional-zero stance. PC-4 Governance row's `Status` updated from `Pending PC-3 amendment` to `Next`. |
| 2026-05-15 | PC-4 Governance autonomous L1→L3 session-opener instance authored at commit `2c47829` ([`cc-pc4-autonomous.md`](./cc-pc4-autonomous.md)). PC-4 Governance row marked **In flight** at session-open; `Opener instance` column links to the just-authored instance. **First instance of the autonomous L1→L3 template** at `docs/templates/autonomous-l1-l3-session-opener.md` (most-recent-touch commit `4646655`; PC-1 / PC-2 / PC-3 all pre-dated the template). §13 post-run capture carries first-instance-stress-test framing with 3–8 template-revision-candidate range expectation per PC-2 amendment first-instance precedent (7 at `70cbd15`) and PC-3 amendment second-instance small-scope precedent (3+1). PC-4 is the final entity in Platform Core (entity 4 of 4); Phase 2 close-out is a separate session after PC-4 lands. |
| 2026-05-15 | PC-4 Governance autonomous L1→L3 session **Done** at closing-bridge commit (this commit; see [`2026-05-15_03_-_PC4-LANDED.md`](../2026-05-15_03_-_PC4-LANDED.md)). Row updated: Status → **Done**; Closing bridge → [`2026-05-15_03_-_PC4-LANDED.md`](../2026-05-15_03_-_PC4-LANDED.md); §13 captured → Yes (first-instance autonomous-template stress-test; 7 template-revision candidates landed at mid-range of 3-8 expectation); Template revision → REVISION PROPOSED (3 highest-priority candidates: §5b cluster cadence text clarification — per-cluster surface as CC self-reflection vs human ratification gate; directory-level mixed-tier-scope discipline naming; A#5 cadence applies per-phase not per-session — plus 4 lower-priority; routes to DS-1 entry opener authoring or dedicated template revision session). Spec commit `096d4e6` lands the combined Step 1 + Step 2 + Step 3 substance (507 lines). Entity CLAUDE.md + sub-tier anticipatory-bullet dispose commit `56fee09` per session-opener §12. Phase 3 zero ADR amendment commits per §5c provisional-zero stance. **Platform Core Phase 2 derivation closes at this commit batch.** PC-4 Governance row's `Status` updated to **Done**; Phase 2 close-out row's `Status` updated from `Pending PC-4` to **Next**. A#9 framework-provided contract mechanisms + PW-1 schema-predates-partition promotion FULLY EARNED at Phase 2 close-out signal; A#5 sub-batch-of-1 multi-Edit cadence + A#6 cold-derivation-with-priors + A#8 cumulative-forward all promotion-ready signals strengthened. PC-1 + PC-3 amendment-list pickups accumulating at Phase 2 close-out (PC-1: Finding #3 reframing + Finding #4 PC-4-scope; PC-3: 5 enumeration-completeness sub-pickups + auto-pickup channel framing). |
