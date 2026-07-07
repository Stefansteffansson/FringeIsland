# Features — Platform Domain Services

Feature specifications for the seven Platform Domain services (DS-1 World Model, DS-2 Narrative, DS-3 Journeys, DS-4 Content, DS-5 Communication, DS-6 Discovery, DS-7 Intelligence). Each feature uses the Shape Up pitch format with BDD stories embedded as Given/When/Then acceptance criteria.

**Feature ID prefix:** `PD` (e.g., `FEAT-PD001-world-model.md`)
**Template:** `../../../templates/feature-spec.md`

Most domain services are not yet built. See `../../../planning/waves/FERD-CAPABILITY-MAP.md` for current implementation status across the ecosystem.

## Feature index

| ID | Title | Service | Wave | Maturity | Equipment |
|----|-------|---------|------|----------|-----------|
| [FEAT-PD001](./FEAT-PD001-personal-journal-primitive.md) | Personal Journal primitive — private own-subject entry store with write/read/erasure/export contracts (IDN-5's platform half) | DS-7 Intelligence | Ferd | 6-done | none |
| [FEAT-PD002](./FEAT-PD002-journey-catalogue-and-enrolment-contracts.md) | Journey catalogue & enrolment contracts — catalog/detail/my-enrolments reads with the viewer block, self- + group-enrolment with withdraw, the group enrolment-summary read (the G-A seam), enrolment-write narrowing (JRN-1/2/3/4's platform half) | DS-3 Journeys | Ferd | 6-done | none |
| [FEAT-PD003](./FEAT-PD003-journey-step-substrate-and-progress-contracts.md) | Journey step substrate & per-traveller progress contracts — ADR-U044 realized: steps become rows, step-kind + content-family registries, step-instances as the progress grain, the legacy JSONB steps migrated, catalog/detail re-pointed, player-boot/engagement/completion contracts, the Q1 withdraw revisit (JRN-6..10 + 18's platform half) | DS-3 Journeys | Ferd | 4-ready | none |

**FEAT-PD001** is the first Domain-tier feature spec, opening **Cycle D** (private Journal) of the [Phase-3 Identity-completion plan](../../../planning/hub-v2/phase-3-identity-completion-plan.md). The Journal primitive was routed to DS-7 Intelligence at the Cycle D decomposition (2026-07-03; PC-2's Step 3 Q1 carry — see `../intelligence.md` §L3 and its Sources-status amendment). It pairs with the Hub surface [FEAT-H011](../../../products/hub/features/FEAT-H011-private-journal.md), API-first (ADR-U009/U038). **FEAT-PD002** (6-done, built Cycle J-A 2026-07-07) is the **first DS-3 Journeys feature spec**, opening **Cycle J-A** of the [Journeys completion plan](../../../planning/hub-v2/phase-3-journeys-completion-plan.md); it pairs with the Hub surface [FEAT-H019](../../../products/hub/features/FEAT-H019-journey-catalogue-and-enrolment.md) and carries the Groups-area seam fill (`get_group_enrollment_summary` — a DS-3 read composed at the Hub BFF, per the one-way rule) plus the [FEAT-PC016](../../core/features/FEAT-PC016-pending-nominations-read-contract.md) rider on its schema-gate migration. **FEAT-PD003** (4-ready, decomposed Cycle J-B 2026-07-07) realizes [ADR-U044](../../../architecture/decisions/ADR-U044-journey-step-model.md) — the step substrate (rows + registries + step-instances), the mechanical migration of the legacy JSONB steps, the same-migration re-point of the catalog/detail contracts, the player contracts (`get_player_state`, `enter_journey_step`, `complete_journey_step`), and the carried FEAT-PD002 Q1 withdraw revisit; it pairs with the Hub player [FEAT-H020](../../../products/hub/features/FEAT-H020-journey-player.md).
