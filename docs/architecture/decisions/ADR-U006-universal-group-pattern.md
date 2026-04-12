# ADR-U006: Universal Group Pattern

**Status:** Accepted
**Date:** 2026-01 (original), 2026-03 (confirmed), 2026-04-05 (extracted)
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

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-003
- Related: [ADR-U007 — Three-layer permission model](ADR-U007-three-layer-permission-model.md)
- Related: [ADR-U018 — No hardcoded group types](ADR-U018-no-hardcoded-group-types.md)
- Related: [ADR-U020 — Pairs are groups](ADR-U020-pairs-are-groups.md)
