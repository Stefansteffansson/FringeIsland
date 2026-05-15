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
| PC-4 Governance | Platform Core area | Pending PC-2 amendment | (to author) | (to author) | (pending) | (pending) |
| Phase 2 close-out | Phase landmark | Pending PC-4 | — | — | — | — |

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

| Spec | Status | Pending findings | Sequenced | Closing bridge | §13 captured | Template revision |
|---|---|---|---|---|---|---|
| PC-2 Identity | **Next** | Experiment A Group A (D1+X2, D2, D4) + Group B (C1.6, X4, X5 reframe) + PC-3 Q6 display-name coupling + Experiment B D3 multi-role memberships if PC-2-relevant | Before PC-4 entry | (to author) | (pending) | (pending) |
| PC-1 Infrastructure | Pending | X5 two-tier centralization reframe per PC-3 §L3 Step 2 C3-2 + Finding #4 Phase-2 close-out adjudication preparation | After PC-4 entry | (to author) | (pending) | (pending) |
| OLDFEAT reconciliation | Pending | 18 pre-refactor artifacts in `docs/TMP/OLDFEAT/` — reconcile against current canonical specs; absorb-and-delete per G-22 if applicable | Anytime; not blocking | (to author) | (pending) | (pending) |

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
