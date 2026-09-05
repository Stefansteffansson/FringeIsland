# Platform Core

Domain-agnostic foundation that all of FringeIsland is built on. Rarely changed, heavily reviewed.

**Feature ID prefix:** `PC`

## The four areas

- **Infrastructure (PC-1)** — Supabase, PostgreSQL, RLS, Storage, the telemetry sink (ADR-U052); feature flags chartered but deferred with zero substrate (ADM-15)
- **Identity (PC-2)** — Authentication, sessions, profiles, user_id contract
- **Organisation (PC-3)** — Groups, memberships, roles, permissions
- **Governance (PC-4)** — DeusEx, audit, moderation, platform rules

## Files

- `features/` — shared `FEAT-PC*` feature specs across all four areas. Each feature is owned by exactly one area; ownership is recorded in the owning area's SPECIFICATION.md L4 feature-inventory summary (locked 2026-04-26).
- `infrastructure-specification.md` — PC-1 area spec
- `identity-specification.md` — PC-2 area spec
- `organisation-specification.md` — PC-3 area spec
- `governance-specification.md` — PC-4 area spec
- `CHANGELOG.md` — the Core substrate changelog, one of the three (`AGENTS.md` Always-do; register: substrate, not member-facing)
- `ROADMAP.md` — PC-wide NOW/NEXT/LATER view across all four areas _(to be written)_

Use the [`platform-core-spec.md`](../../templates/platform-core-spec.md) template when authoring an area specification.
