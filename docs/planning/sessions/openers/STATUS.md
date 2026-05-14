# Pipeline status — autonomous L1→L3 runs

**Purpose:** track every entity slated for autonomous L1→L3 derivation plus phase landmarks. Updated at each entity-entry (mark `In flight`) and entity-close (mark `Done`, link to bridges, record §13 + template revision status).

**Canonical template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md).

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
| PC-4 Governance | Platform Core area | **Next** | (to author) | (to author) | (pending) | (pending) |
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

## Revision log

| Date | Change |
|---|---|
| 2026-05-14 | Initial authoring. Captures PC-1/PC-2/PC-3 + Hub as Done (pre-template); marks PC-4 as Next. |
