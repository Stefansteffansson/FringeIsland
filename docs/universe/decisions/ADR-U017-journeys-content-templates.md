# ADR-017 — Journeys as content templates, not organisational nodes

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked (from legacy ADR-001)
**Date:** January 2026

**Context:**
Early design considered whether journeys should be organisational units (like groups) or content templates. Groups are containers for people. Journeys are experiences people go through.

**Decision:**
Journeys are content templates. Groups enrol in journeys. Journeys are not groups.

**Why:**
Cleaner separation of concerns. Groups handle organisation. Journeys handle experience. The same journey template can be used by many different groups simultaneously. Conflating them would make the data model and permission system significantly more complex.
