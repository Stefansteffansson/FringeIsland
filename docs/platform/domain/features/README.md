# Features — Platform Domain Services

Feature specifications for the seven Platform Domain services (DS-1 World Model, DS-2 Narrative, DS-3 Journeys, DS-4 Content, DS-5 Communication, DS-6 Discovery, DS-7 Intelligence). Each feature uses the Shape Up pitch format with BDD stories embedded as Given/When/Then acceptance criteria.

**Feature ID prefix:** `PD` (e.g., `FEAT-PD001-world-model.md`)
**Template:** `../../../templates/feature-spec.md`

Most domain services are not yet built. See `../../../planning/waves/FERD-CAPABILITY-MAP.md` for current implementation status across the ecosystem.

## Feature index

| ID | Title | Service | Wave | Maturity | Equipment |
|----|-------|---------|------|----------|-----------|
| [FEAT-PD001](./FEAT-PD001-personal-journal-primitive.md) | Personal Journal primitive — private own-subject entry store with write/read/erasure/export contracts (IDN-5's platform half) | DS-7 Intelligence | Ferd | 6-done | none |

**FEAT-PD001** is the first Domain-tier feature spec, opening **Cycle D** (private Journal) of the [Phase-3 Identity-completion plan](../../../planning/hub-v2/phase-3-identity-completion-plan.md). The Journal primitive was routed to DS-7 Intelligence at the Cycle D decomposition (2026-07-03; PC-2's Step 3 Q1 carry — see `../intelligence.md` §L3 and its Sources-status amendment). It pairs with the Hub surface [FEAT-H011](../../../products/hub/features/FEAT-H011-private-journal.md), API-first (ADR-U009/U038).
