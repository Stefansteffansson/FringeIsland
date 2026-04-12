# ADR-U018: No hardcoded group types

**Status:** Accepted
**Date:** 2026-01 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

Early design considered whether to have typed groups: Team, Organisation, Cohort etc. as distinct entity types.

## Decision

All groups are simply Groups. They have labels (user-defined) and templates (system-provided starting points) but no type-based code paths.

## Why

Hardcoded group types create a false taxonomy that doesn't match real-world usage. Users create groups that don't fit the predefined types. The label and template system provides all the UX benefit of types without the architectural rigidity.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-002
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
- Related: [ADR-U020 — Pairs are groups](ADR-U020-pairs-are-groups.md)
