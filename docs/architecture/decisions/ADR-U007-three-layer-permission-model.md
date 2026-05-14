# ADR-U007: Three-layer permission model

**Status:** Accepted
**Date:** 2026-01 (original), 2026-03 (confirmed), 2026-04-05 (extracted), 2026-05-14 (amended — PC-3 Step 3 implementation commitments)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

FringeIsland needs a flexible permission system that can handle different roles in different groups, customisable permissions per group, and platform-level administration — without becoming a maintenance nightmare.

## Decision

Three layers: atomic Permissions → Role Templates → Group Roles (instances). Runtime enforcement via `has_permission(user_id, group_id, permission_name)`.

## Why three layers

- Permissions are atomic and system-defined — they grow only when developers add new features
- Role Templates provide sensible defaults without forcing groups to start from scratch
- Group Roles are per-group instances — customisable, so "Steward" in one group can have different permissions than "Steward" in another

**Never hardcode role names in application code.** Always use `has_permission()`. This ensures that role customisation by groups doesn't break application logic.

## Consequences

- 31 atomic permissions across 7 categories (at time of writing)
- 4 role templates: Steward, Guide, Member, Observer
- Every permission check must go through `has_permission()` — no shortcuts

## Implementation commitments (PC-3 Step 3 amendment, 2026-05-14)

The three-layer permission model's enforcement primitive `has_permission()` has four concrete implementation commitments confirmed at PC-3 Step 3 (Q2 resolution; see `docs/platform/core/organisation-specification.md` §L3 Step 3 Q2 + §6 `has_permission()` sub-section). Each disk-anchored:

**(a) Disk signature.** The function signature on disk is `has_permission(p_acting_group_id UUID, p_context_group_id UUID, p_permission_name TEXT) → boolean`. Disk anchor: `rebuild_universal_group_pattern.sql` L419-L475. The original Decision-section signature `has_permission(user_id, group_id, permission_name)` is preserved above for provenance.

**(b) Tier-1 / split-by-context composition with `is_platform_admin()`.** `has_permission()` is **Tier-1-only** — application-tier permission checks (admin RPC orchestration, route-handler authorization) and PostgREST RPC clients call it directly. RLS-side admin bypass uses a **separate function** `is_platform_admin()` (disk anchor: `fix_rc7_admin_user_ops.sql` L514+), per the split-by-context partition documented at PC-3 spec §6; the two functions compose via `is_platform_admin() OR <policy logic involving has_permission()>` at RLS policy sites where platform-admin bypass is appropriate. This split-by-context partition was confirmed at PC-3 Step 2 (Cluster B retraction of the Cluster A "no `is_platform_admin` on disk" verdict via cumulative-forward read order; see PC-3 spec §L3 Step 2 §8 Q5 + spec commit `255219d`).

**(c) Server-side Tier-1 calling conventions (sentinel-UUID and literal-NULL).** Server-side admin code that invokes `has_permission()` without a specific acting-group context uses one of two calling conventions, both Tier-1-only and **both PC-3-canonical idioms with identical semantics at this commit**: (i) **sentinel-UUID** — pass a designated UUID constant in the `p_acting_group_id` slot; (ii) **literal-NULL** — pass `NULL` in the `p_acting_group_id` slot. Both live simultaneously on disk at the server-side admin-tier (`lib/admin/*` + `app/api/admin/*`; specific call sites per PC-3 spec §6 + Step 2 Cluster lib-2 / Cluster api-1, spec commit `255219d`); **no migration to a single canonical idiom is planned**. RLS-side and ordinary user-facing call sites are out of scope for this convention.

**(d) Permission count baseline (SS-18 three-source hierarchy).** The original Consequences bullet *"31 atomic permissions across 7 categories (at time of writing)"* is a **point-in-time snapshot from source (i) at the time of original authoring**. The canonical source hierarchy is three-layered: **(i)** application-tier registry at `lib/constants/permissions.ts` — the growable-by-design point of definition; currently 44 keys across 6 categories at this commit, baseline-stable since the D15 schema rebuild; **(ii)** `public.permissions` table on disk — currently un-seeded by active migrations (the seeding INSERT lives only in archive migration `archive/20260216140506_rbac_role_management.sql`; recovery routing at DevOps-tier Phase 2 close-out per PC-3 §L3 Step 2 P11 cluster); **(iii)** ADR-U007 cited counts — point-in-time snapshots from source (i), expected to drift as the registry grows. **Architectural commitment:** the registry is growable-by-design; future amendments should not chase counts on every drift.

**Provenance.** PC-3 Step 3 adjudication at commit `1ee9acc` (PC-3 spec amendment, 2026-05-14); Step 2 disk-anchored findings at spec commit `255219d` (Cluster api-1 + Cluster lib-1 + Cluster lib-2; §8 Q5 split-by-context retraction); PC-3 §L3 Step 3 Q2 resolution; PC-3 §6 `has_permission()` sub-section; Sources-status SS-18 three-source-hierarchy framing.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-002, ADR-004
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
