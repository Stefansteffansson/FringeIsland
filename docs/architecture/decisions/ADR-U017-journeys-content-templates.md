# ADR-U017: Journeys as content templates, not organisational nodes

**Status:** Accepted
**Date:** 2026-01 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:domain-service · wave:ferd

---

## Context

Early design considered whether journeys should be organisational units (like groups) or content templates. Groups are containers for people. Journeys are experiences people go through.

## Decision

Journeys are content templates. Groups enrol in journeys. Journeys are not groups.

## Why

Cleaner separation of concerns. Groups handle organisation. Journeys handle experience. The same journey template can be used by many different groups simultaneously. Conflating them would make the data model and permission system significantly more complex.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-001
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
- Related: [ADR-U008 — Step type extensibility](ADR-U008-step-type-extensibility.md)
