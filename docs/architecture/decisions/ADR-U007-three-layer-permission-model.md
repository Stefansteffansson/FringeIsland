# ADR-U007: Three-layer permission model

**Status:** Accepted
**Date:** 2026-01 (original), 2026-03 (confirmed), 2026-04-05 (extracted)
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

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Confirmed from legacy ADR-002, ADR-004
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md)
