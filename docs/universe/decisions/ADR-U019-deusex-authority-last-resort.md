# ADR-019 — Steward safeguard — DeusEx as authority of last resort

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked (from legacy ADR-005)
**Date:** January 2026

**Context:**
Every group must have at least one Steward. What happens if the last Steward leaves?

**Decision:**
If the last Steward is removed or leaves, the DeusEx system group becomes the Steward. DeusEx can then reassign Stewardship to restore group autonomy.

**Why:**
Prevents orphaned groups with no management capability. DeusEx membership provides platform-level recovery without requiring complex automated logic for the general case.
