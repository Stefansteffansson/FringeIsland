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

FEAT-PC001 is the first forward-looking Platform Core feature spec — the substrate provider consumed by Hub [FEAT-H003](../../../products/hub/features/FEAT-H003-mist-identity-on-arrival.md) (IDN-1). FEAT-PC002 continues it with the departure + transcendence slice (§9 stages 3-4), consumed by Hub [FEAT-H004](../../../products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md) (IDN-2); it is gated on [ADR-U033](../../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md) + [ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md). Retroactive `6-done` specs for already-shipped Platform Core functionality may follow.
