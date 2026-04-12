# ADR-U019: DeusEx as authority of last resort

**Status:** Accepted
**Date:** 2026-01 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

Every group must have at least one Steward. What happens if the last Steward leaves?

## Decision

If the last Steward is removed or leaves, the DeusEx system group becomes the Steward. DeusEx can then reassign Stewardship to restore group autonomy.

## Why

Prevents orphaned groups with no management capability. DeusEx membership provides platform-level recovery without requiring complex automated logic for the general case.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-005
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
- Related: [ADR-U007 — Three-layer permission model](ADR-U007-three-layer-permission-model.md)
