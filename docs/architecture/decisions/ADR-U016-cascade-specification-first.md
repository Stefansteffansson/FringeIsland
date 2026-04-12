# ADR-U016: Cascade specification before implementation

**Status:** Accepted
**Date:** 2026-03 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

The recurring problem in early Ferd development was discovering the cross-layer consequences of lifecycle events mid-implementation. Soft-deleting a user revealed incomplete handling in groups, journeys, forum posts and more — each discovery requiring backtracking and rebuilding.

## Decision

Every significant lifecycle event must have a complete cascade specification before it is implemented. The cascade documents what happens at every architectural layer when the event fires. Database triggers and RLS policies do the heavy lifting — application code does not patch layer-by-layer.

## The cascade pattern

```
Event: [lifecycle event name]
Actor: [who triggers it]

Platform Core:
  Infrastructure: [what happens]
  Identity: [what happens to profiles]
  Organisation: [what happens to memberships]
  Governance: [what happens to permissions]

Domain Services:
  World Model: [what happens]
  Narrative Engine: [what happens to journeys/enrolments]
  Experience Engine: [what happens to active experiences]
  Content: [what happens to authored content]
  Communication: [what happens to messages/forums]
  Discovery: [what happens to visibility/search]
  Intelligence: [what happens to AI context]

Verticals: [privacy implications, notifications triggered, audit recorded, transaction impact]
```

## Why this solves the rebuild problem

The rebuild problem was caused by implementing features without knowing their full cascade. Writing the cascade specification first forces the question: what does this event do to every part of the system? The answer identifies incomplete foundations before implementation begins.

## Amendment — 2026-04-12

The original cascade template used L0-L7 layer references. Updated above to use the current Platform Core / Domain Services decomposition (see ADR-U023). The principle — "specify the full cascade before implementing" — is unchanged.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Related: [ADR-U023 — Platform Core / Domain Services decomposition](ADR-U023-platform-core-domain-services-decomposition.md)
