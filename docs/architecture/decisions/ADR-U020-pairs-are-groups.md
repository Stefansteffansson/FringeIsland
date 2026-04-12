# ADR-U020: Pairs are groups with two members

**Status:** Accepted
**Date:** 2026-01 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

Should pairs (two-person relationships) be a distinct entity type?

## Decision

No. Pairs are groups with two members.

## Why

Simpler data model. No arbitrary distinction between two-person and three-person groups. All group features work for pairs automatically.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-006
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
- Related: [ADR-U018 — No hardcoded group types](ADR-U018-no-hardcoded-group-types.md)
