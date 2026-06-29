# Features — Platform Core

Feature specifications for Platform Core (Infrastructure, Identity, Organisation, Governance). Each feature uses the Shape Up pitch format with BDD stories embedded as Given/When/Then acceptance criteria.

**Feature ID prefix:** `PC` (e.g., `FEAT-PC001-auth-service.md`)
**Template:** `../../../templates/feature-spec.md`

Retroactive specs (maturity `6-done`) are being written first to capture already-shipped Platform Core functionality. See `../../../planning/waves/FERD-CAPABILITY-MAP.md` for current implementation status.

## Feature index

| ID | Title | Owner area | Wave | Maturity |
|----|-------|-----------|------|----------|
| [FEAT-PC001](./FEAT-PC001-mist-anonymous-substrate.md) | Mist anonymous-identity substrate (arrival) — the platform half of IDN-1 | Identity (PC-2) | Ferd | 6-done |
| [FEAT-PC002](./FEAT-PC002-mist-transcendence-reaper-consent.md) | Mist ephemerality reaper + atomic transcendence + consent substrate — the platform half of IDN-2 | Identity (PC-2) | Ferd | 6-done |
| [FEAT-PC003](./FEAT-PC003-self-service-profile.md) | Self-service profile — own-row read + identity-scope update contract — the platform half of IDN-4 | Identity (PC-2) | Ferd | 6-done |
| [FEAT-PC004](./FEAT-PC004-account-state-read.md) | Account-state read — the caller's own lifecycle state (active / deactivated / decommissioned) — the platform half of IDN-9 | Identity (PC-2) | Ferd | 6-done |
| [FEAT-PC005](./FEAT-PC005-self-service-account-reactivation.md) | Self-service account reactivation — owner-gated, audited deactivated→active transition — the platform half of IDN-12 | Identity (PC-2) | Ferd | 4-ready (parked) |

FEAT-PC001 is the first forward-looking Platform Core feature spec — the substrate provider consumed by Hub [FEAT-H003](../../../products/hub/features/FEAT-H003-mist-identity-on-arrival.md) (IDN-1). FEAT-PC002 continues it with the departure + transcendence slice (§9 stages 3-4), consumed by Hub [FEAT-H004](../../../products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md) (IDN-2); it is gated on [ADR-U033](../../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md) + [ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md). FEAT-PC003 realises the PC-2 §L3 profile-update capability (own-row read + identity-scope update over `public.users`), consumed by Hub [FEAT-H005](../../../products/hub/features/FEAT-H005-member-profile-and-sign-out.md) (IDN-4). **FEAT-PC004 + FEAT-PC005** are the Cycle A account-lifecycle pair (Phase-3 Identity completion, [plan](../../../planning/hub-v2/phase-3-identity-completion-plan.md)): PC004 is the member-facing read of own account state — a `SECURITY DEFINER` read that bypasses the `is_active` visibility filter for the caller's own row (the platform half of IDN-9, consumed by Hub [FEAT-H006](../../../products/hub/features/FEAT-H006-render-account-state.md)); PC005 is the owner-gated, audited self-service reactivation transition (deactivated→active, decommissioned terminal; the platform half of IDN-12, consumed by Hub [FEAT-H007](../../../products/hub/features/FEAT-H007-self-service-account-reactivation.md)). PC004 is now `6-done` (IDN-9, built in Cycle A — the off-but-not-closed state realised as `suspended`, an admin hold); PC005 stays `4-ready` but is **parked** (IDN-12 deferred — self-service reactivation pairs with self-pause and needs a deactivation-origin field; see the [account-lifecycle decision record](../../../planning/hub-v2/account-lifecycle-states-decision.md)). Each carries net-new substrate (a `SECURITY DEFINER` function + an additive account route) landing through the schema gate at build. Retroactive `6-done` specs for already-shipped Platform Core functionality may follow.
