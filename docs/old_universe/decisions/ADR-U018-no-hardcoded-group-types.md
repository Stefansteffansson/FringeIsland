# ADR-018 — No hardcoded group types

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked (from legacy ADR-002)
**Date:** January 2026

**Context:**
Early design considered whether to have typed groups: Team, Organisation, Cohort etc. as distinct entity types.

**Decision:**
All groups are simply Groups. They have labels (user-defined) and templates (system-provided starting points) but no type-based code paths.

**Why:**
Hardcoded group types create a false taxonomy that doesn't match real-world usage. Users create groups that don't fit the predefined types. The label and template system provides all the UX benefit of types without the architectural rigidity.
