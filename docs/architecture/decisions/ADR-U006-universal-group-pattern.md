# ADR-U006: Universal Group Pattern

**Status:** Accepted
**Date:** 2026-01 (original), 2026-03 (confirmed), 2026-04-05 (extracted), 2026-05-14 (amended — PC-3 Step 3 implementation commitments)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

The permission system needs to handle both individual users and groups uniformly. A user enrolling in a journey and a group enrolling in a journey should be treated the same way by the permission system.

## Decision

Every user belongs to an auto-created personal group. That personal group joins other groups. Individuals and groups are treated identically by the permission system. There are no special cases.

## Why this works

The Universal Group Pattern eliminates a class of special-case code. `has_permission(user_id, group_id, permission)` works the same whether the user is acting as an individual or as a member of a group. Journey enrolments work the same for individuals and groups. The data model is simpler and more consistent.

## Consequences

- `get_current_personal_group_id()` is a key function — returns the personal group for a given user
- Every new user creation must trigger personal group creation

## Implementation commitments (PC-3 Step 3 amendment, 2026-05-14)

The Universal Group Pattern's structural one-to-one between User and Personal Group has three concrete implementation commitments confirmed at PC-3 Step 3 (Q8 resolution; see `docs/platform/core/organisation-specification.md` §L3 Step 3 Q8 + §5 + §6 supervised-bypass discipline + §8 Q8). Each disk-anchored:

**(a) FK direction codified.** `public.users.personal_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL`. Disk anchor: `rebuild_universal_group_pattern.sql` L102 (FK declared post-table-creation to break circular dependency). This FK direction is an **intentional override of the platform-tier upward-only dependency-direction rule** (`docs/platform/CLAUDE.md` "Dependency direction is strictly one-way") — ADR-U006 authorizes the downward reference from PC-2 `users` to PC-3 `groups` because the Universal Group Pattern's commitment that "every user belongs to an auto-created personal group" defines a structural one-to-one relationship; FK direction (column on `public.users`, pointing into `public.groups`) is the natural concrete instantiation of that commitment, preserving O(1) lookup of the actor-primitive directly off the user row. Alternative shapes (a `personal_group_memberships` table on PC-3, or a `user_id` column on `public.groups` for personal groups) would relocate the coupling rather than eliminate it, at the cost of extra index lookup on every actor-primitive resolution.

**(b) Immutability commitment.** `personal_group_id` enforces a NULL → UUID once-only transition post-bootstrap via `enforce_personal_group_id_immutability` trigger on `public.users`. Disk anchor: `protect_personal_group_id.sql` (design intent explicit at the migration's L5-L11 comment: "personal_group_id is the user's identity in the universal group pattern. Once set by handle_new_user(), it must NEVER be changed or NULLed").

**(c) Supervised-bypass discipline.** Admin operations that legitimately need to override the immutability (e.g., hard-delete reassignment to `[Deleted User]`) use the SQL session variable `app.bypass_personal_group_id_immutability`. Disk anchor: `fix_rc7_admin_user_ops.sql` L514 (trigger respects the bypass; complementary SET-side at L601 in `admin_hard_delete_user`). **Scope is SQL-side only** — no `lib/admin/*` or `app/api/*` app-tier bypass equivalent exists or is planned (per PC-3 §6 supervised-bypass sub-section + Step 2 lib-2 finding P6). **Lifecycle is per-transaction** — the bypass variable is set in the same SQL block as the operation requiring it (typically a SECURITY DEFINER admin RPC), and unset/cleared at transaction commit; the trigger inspects the variable on every UPDATE and permits the change when set to a truthy value, otherwise enforcing the NULL → UUID once-only transition.

**Provenance.** PC-3 Step 3 adjudication at commit `1ee9acc` (PC-3 spec amendment, 2026-05-14); Step 2 disk-anchored Class 1 confirm C1-3 (recorded at spec commit `255219d`); PC-3 §L3 Step 3 Q8 resolution; PC-3 §6 supervised-bypass sub-section.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-003
- Related: [ADR-U007 — Three-layer permission model](ADR-U007-three-layer-permission-model.md)
- Related: [ADR-U018 — No hardcoded group types](ADR-U018-no-hardcoded-group-types.md)
- Related: [ADR-U020 — Pairs are groups](ADR-U020-pairs-are-groups.md)
