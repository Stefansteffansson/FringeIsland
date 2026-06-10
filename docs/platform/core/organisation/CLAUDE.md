# CLAUDE.md — Platform Core / Organisation (PC-3)

**Applies to:** anything under `docs/platform/core/organisation/` and the code that materialises PC-3's contract — the SQL primitive `get_current_personal_group_id()`, the `public.groups` / `public.memberships` / `public.role_templates` / `public.group_roles` / `public.permissions` / `public.role_permissions` schema, and the structural-invariant triggers (`prevent_last_leader_removal()` and siblings).
**Load order:** root [`CLAUDE.md`](../../../../CLAUDE.md) → [`AGENTS.md`](../../../../AGENTS.md) → [`PROCESS.md`](../../../planning/PROCESS.md) → the skill matching the task → [`../../CLAUDE.md`](../../CLAUDE.md) (platform tier) → [`../CLAUDE.md`](../CLAUDE.md) (platform-core sub-tier) → **this file** → [`../organisation-specification.md`](../organisation-specification.md) (the area spec) → the feature spec.
**Reads as a delta.** Assumes root, platform-tier, and platform-core sub-tier `CLAUDE.md` are already loaded. Contains only what's specific to PC-3 Organisation that an agent reading PC-3 tree must know without consulting the spec.

---

## What this entity owns

PC-3 Organisation answers *how is this actor situated relative to other actors and rules right now?* — groups, memberships, role templates, role instances, atomic permissions, the personal-group actor primitive, and the runtime permission-resolution surface. The full identity, boundaries, and technical shape live in [`../organisation-specification.md`](../organisation-specification.md) (§L2 for the area's identity, §L3 for the capability inventory). This file holds only the entity-level anchor rules; substantive partition discussion (the PC-2 / PC-3 actor-primitive partition at §6, the `personal_group_id` FK-direction override at §5, the `has_permission()` signature partition at §6, the open-spec-questions list at §8) lives in the spec.

---

## Rules that only apply at this entity

- **The four FringeIsland role names and `has_permission()` are PC-3's, not anywhere else in Platform Core.** The role-name templates (Steward, Guide, Participant, Observer per ADR-U007 — the per-group role "Member" was renamed **Participant**, ratified 2026-06-10, per the roles core `docs/ecosystem/universe/roles/README.md`; the current schema still seeds 'Member', and the code rename is deferred with the code correction target) live as TEXT values in `public.role_templates` — a named-constant table, not a PG ENUM (the same reasoning ADR-U018 applies to group types). The Dreamineer authority templates (Creator, Anthropologist gating World Studio; Teller gating Arc Studio; Wayfinder gating Journey Studio, per ADR-U026) are additional permission-gated role templates riding the same universal group pattern — see the spec's §6 role-name vocabulary sub-section. The runtime permission-resolution function `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` is PC-3-owned per ADR-U007. Every other tier and service consumes them; nothing else defines them. The platform-tier rule "never hardcode role names; use `has_permission(...)`" (in `docs/platform/CLAUDE.md`) is the consumption discipline — this file is its definition anchor. See [`../organisation-specification.md`](../organisation-specification.md) §5 (`public.role_templates` row and storage shape), §6 (`has_permission()` signature partition), and §8 Q2 (ADR-U007 amendment carry-forward) for the substantive partition discussion.

---

## Where to go next

- **Area specification:** [`../organisation-specification.md`](../organisation-specification.md).
- **Sibling area specs (in this sub-tier):** [`../infrastructure-specification.md`](../infrastructure-specification.md) (PC-1) and [`../identity-specification.md`](../identity-specification.md) (PC-2); PC-4 Governance spec to be written. Entity-level `CLAUDE.md` files for PC-1, PC-2, and PC-4 do not yet exist.
- **Sub-tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — Platform Core sub-tier rules apply here without restatement.
- **Relevant ADRs:** U006 (Universal Group Pattern — the constitutive commitment that "every user belongs to an auto-created personal group" and that individuals and groups are treated identically by the permission system), U007 (Three-layer permission model — the four templates + `has_permission`), U016 (Cascade specification first — `handle_new_user` seam treatment), U018 (No hardcoded group types — analogous reasoning to PC-3's role-template artifact choice), U020 (Pairs are groups — uniform group semantics).
