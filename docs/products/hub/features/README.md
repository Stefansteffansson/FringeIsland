# Features — The Hub

Feature specifications for The Hub, the full browser-based FringeIsland experience. Each feature uses the Shape Up pitch format with BDD stories embedded as Given/When/Then acceptance criteria.

**Feature ID prefix:** `H` (e.g., `FEAT-H001-authentication.md`)
**Template:** `../../../templates/feature-spec.md`

Retroactive specs (maturity `6-done`) are being written first to capture already-shipped Hub functionality. Forward-looking specs follow the Shape Up format (Problem → Appetite → Solution sketch → Rabbit holes → No-gos → Stories → Platform dependencies → Cross-product impact → Vertical impact).

## Feature index

| ID | Title | Wave | Maturity | Equipment |
|----|-------|------|----------|-----------|
| [FEAT-H001](./FEAT-H001-walking-skeleton-sign-in-and-groups.md) | Walking skeleton — sign in and land on your groups | Ferd | 6-done | none |
| [FEAT-H002](./FEAT-H002-credentialed-fim-sign-up.md) | Credentialed FIM sign-up — create your account and personal group | Ferd | 6-done | none |
| [FEAT-H003](./FEAT-H003-mist-identity-on-arrival.md) | Mist identity on arrival — the FringeIsland entry and the lazy Mist actor | Ferd | 6-done | none |
| [FEAT-H004](./FEAT-H004-mist-transcendence-and-farewell.md) | Mist → FIM transcendence + the farewell — become a FIM in place, or say goodbye | Ferd | 6-done | none |
| [FEAT-H005](./FEAT-H005-member-profile-and-sign-out.md) | Member profile + sign-out — view/edit your profile (IDN-4) and the account-menu sign-out (IDN-3 tail) | Ferd | 6-done | none |
| [FEAT-H006](./FEAT-H006-render-account-state.md) | Render account state — show the FIM whether their account is active, deactivated, or decommissioned (IDN-9) | Ferd | 6-done | none |
| [FEAT-H007](./FEAT-H007-self-service-account-reactivation.md) | Self-service account reactivation — the FIM reactivates their own deactivated account (IDN-12) | Ferd | 4-ready (parked) | none |
| [FEAT-H008](./FEAT-H008-render-consent-state.md) | Render consent state — show the FIM their own consent decisions and history (IDN-6) | Ferd | 6-done | none |
| [FEAT-H009](./FEAT-H009-update-consent-decisions.md) | Update consent decisions — grant/withdraw granular consent; sharing controls split out (IDN-7 consent half) | Ferd | 6-done | none |

The walking-skeleton slice (Phase 2 of the [Hub v2 rebuild](../../../planning/hub-v2/README.md)) is the first forward-looking spec, built fresh under `hub/` ([ADR-U032](../../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)). **FEAT-H008 + FEAT-H009** open **Cycle B** (Consent & privacy / GDPR) of the [Phase-3 plan](../../../planning/hub-v2/phase-3-identity-completion-plan.md) — IDN-6 renders the member's own consent state + history, IDN-7 (consent half) grants/withdraws granular decisions; both consume the paired PC-4 Governance halves ([FEAT-PC006](../../../platform/core/features/FEAT-PC006-member-consent-read.md) / [FEAT-PC007](../../../platform/core/features/FEAT-PC007-consent-decision-write.md)) API-first and carry no migration of their own (the substrate lands platform-side). IDN-7's sharing-controls half is split to a later slice (gaps register G-34). Retroactive `6-done` specs for already-shipped functionality (now frozen under `hub-legacy/`) may follow.
