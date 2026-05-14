# ADR-U018: No hardcoded group types

**Status:** Accepted
**Date:** 2026-01 (original), 2026-04-05 (extracted), 2026-05-14 (amended — PC-3 Step 3 implementation commitments)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

Early design considered whether to have typed groups: Team, Organisation, Cohort etc. as distinct entity types.

## Decision

All groups are simply Groups. They have labels (user-defined) and templates (system-provided starting points) but no type-based code paths.

## Why

Hardcoded group types create a false taxonomy that doesn't match real-world usage. Users create groups that don't fit the predefined types. The label and template system provides all the UX benefit of types without the architectural rigidity.

## Implementation commitments (PC-3 Step 3 amendment, 2026-05-14)

The "no hardcoded group types" decision is **clarification-of-intent, not contraction**: the original prohibition targets *typed group entities* (separate tables and distinct code paths for Team / Organisation / Cohort / etc.) and does not extend to discriminator columns, entity-state enumerations, or growth-vocabulary lookup tables that legitimately coexist in the schema. Three distinctions are codified explicitly at PC-3 Step 3 (Q9 resolution; see `docs/platform/core/organisation-specification.md` §L3 Step 3 Q9 + §5 ADR-U018 narrowing paragraph). Each disk-anchored:

**(a) Typed group entities vs `group_type` discriminator column.** The prohibition targets **typed group entities** — separate tables (hypothetical `public.teams`, `public.organisations`, `public.cohorts`) carrying distinct code paths and policies. A single `public.groups` table with a `group_type` discriminator column **is permitted** and is the realized shape on disk: one entity, one set of policies, with a string-typed discriminator slot. Disk anchor: `rebuild_universal_group_pattern.sql` L87 (`group_type` column on `public.groups`).

**(b) Typing vs entity-state.** The prohibition addresses Group **typing**, not entity-**state**. Enum-via-CHECK constraints on state-attribute columns (`display_preference`, `status`) define the permitted values for that column, not a separate entity type, and **are permitted**. Disk anchors: `add_display_name_system.sql` L22 (`display_preference` CHECK enumeration); `sprint1_foundation_schema.sql` L24 (`status` CHECK enumeration).

**(c) Typing vs growth-vocabulary.** The prohibition addresses Group typing, not **growth-vocabulary** lookup tables. Tables whose rows name role conventions (`role_templates.name`) or permission keys (`public.permissions.name`) are growable-by-design vocabulary registries, not typed group entities, and **are permitted**. Disk anchors: `rebuild_universal_group_pattern.sql` L48 (`public.permissions` CREATE TABLE) + L57 (`public.role_templates` CREATE TABLE).

**Provenance.** PC-3 Step 3 §L3 Q9 resolution (PC-3 spec commit `1ee9acc`, 2026-05-14); Step 2 §8 Q3/Q4 P3 disk-anchored finding at spec commit `255219d` (three hardcoded enum-via-CHECK with two-option ADR-U018 disposition lean, settled at Step 3 as the narrowing option); PC-3 §5 ADR-U018 narrowing paragraph (this session-pair's spec amendment); Shape: append-only Option A per ADR-U023 + ADR-U006 / ADR-U007 amendment precedent (commits `edf72d3` + `3697732`, 2026-05-14).

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-002
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
- Related: [ADR-U020 — Pairs are groups](ADR-U020-pairs-are-groups.md)
