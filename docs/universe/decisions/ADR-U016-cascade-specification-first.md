# ADR-016 — Administration vertical — cascade specification before implementation

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
The recurring problem in early Ferd development was discovering the cross-layer consequences of lifecycle events mid-implementation. Soft-deleting a user revealed incomplete handling in groups, journeys, forum posts and more — each discovery requiring backtracking and rebuilding.

**Decision:**
Every significant lifecycle event must have a complete cascade specification before it is implemented. The cascade documents what happens at every layer when the event fires. Database triggers and RLS policies do the heavy lifting — application code does not patch layer-by-layer.

**The cascade pattern:**
```
Event: [lifecycle event name]
Actor: [who triggers it]
L0: [what happens at infrastructure level]
L1: [what happens to identity/profile]
L2: [what happens to organisation/memberships]
L3: [what happens to journeys/enrolments]
L4: [what happens to content]
L5: [what happens to communication]
L6: [what happens to discovery/visibility]
L7: [what happens to intelligence/AI context]
Verticals: [privacy implications, notifications triggered, audit recorded]
```

**Why this solves the rebuild problem:**
The rebuild problem was caused by implementing features without knowing their full cascade. Writing the cascade specification first forces the question: what does this event do to every layer? The answer identifies incomplete foundations before implementation begins.
