# Features — The Hub

Feature specifications for The Hub, the full browser-based FringeIsland experience. Each feature uses the Shape Up pitch format with BDD stories embedded as Given/When/Then acceptance criteria.

**Feature ID prefix:** `H` (e.g., `FEAT-H001-authentication.md`)
**Template:** `../../../templates/feature-spec.md`

Retroactive specs (maturity `6-done`) are being written first to capture already-shipped Hub functionality. Forward-looking specs follow the Shape Up format (Problem → Appetite → Solution sketch → Rabbit holes → No-gos → Stories → Platform dependencies → Cross-product impact → Vertical impact).

## Feature index

| ID | Title | Wave | Maturity | Equipment |
|----|-------|------|----------|-----------|
| [FEAT-H001](./FEAT-H001-walking-skeleton-sign-in-and-groups.md) | Walking skeleton — sign in and land on your groups | Ferd | 4-ready | none |

The walking-skeleton slice (Phase 2 of the [Hub v2 rebuild](../../../planning/hub-v2/README.md)) is the first forward-looking spec, built fresh under `hub/` ([ADR-U032](../../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)). Retroactive `6-done` specs for already-shipped functionality (now frozen under `hub-legacy/`) may follow.
