# ADR-020 — Pairs are groups with two members

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked (from legacy ADR-006)
**Date:** January 2026

**Context:**
Should pairs (two-person relationships) be a distinct entity type?

**Decision:**
No. Pairs are groups with two members.

**Why:**
Simpler data model. No arbitrary distinction between two-person and three-person groups. All group features work for pairs automatically.
