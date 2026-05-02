# CLAUDE.md — Platform Core

**Applies to:** anything under `docs/platform/core/` and the corresponding code (Platform Core spans Infrastructure, Identity, Organisation, and Governance — the foundational capabilities all other tiers depend on).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (platform tier) → **this file** → [`README.md`](./README.md) → the area's specification when it exists → the feature spec.
**Reads as a delta.** Assumes root and platform-tier `CLAUDE.md` are already loaded. Contains only what's specific to Platform Core sub-tier work.

---

## What makes this sub-tier different

Platform Core is the **stability zone** of the platform. ADR-U023 splits the platform into two stability zones — Core (Infrastructure, Identity, Organisation, Governance) and Domain Services (the seven services plus Extension System) — and Core is the half that changes rarely by design. Every Domain Service depends on Core; nothing in Core depends upward on Domain. The blast radius of a Core change is the entire platform, the entire product surface, every contributor's working tree. The stability zone isn't a tooling fact about how often Core deploys; it's a structural fact about how much breaks if Core is wrong. Working at this sub-tier means treating that asymmetry as constitutive of the work, not as a deployment cadence to be optimised against. The four areas — Infrastructure (PC-1), Identity (PC-2), Organisation (PC-3), Governance (PC-4) — share this posture rather than carrying independent posture-of-their-own; rules applying to all four areas live at this sub-tier file, rules specific to one area live at that area's eventual entity-level CLAUDE.md when its L2 specification is authored.

Core's upward boundary is the **Internal API** — the contract Core exposes to Domain Services (ADR-U023's named boundary between the two stability zones). The Internal API is structurally different from the Platform API that Domain exposes upward to Products and Studios. Internal API consumers are entirely in-tree (every Domain Service is developed in the same repository as Core), which makes coordinated changes theoretically possible — but the practical stability discipline still demands versioning. PostgreSQL functions reference each other by signature, and PG17's RLS layer silently miscompiles complex policies when a referenced function's signature changes. The Internal API isn't a public-facing trust boundary the way Platform API is; it's an internal-but-still-load-bearing trust boundary, and authoring against it requires acknowledging both properties — coordinable yet still requiring the same versioning rigor.

---

## Rules that only apply at this sub-tier

- **Platform Core changes are rare by design.** If a product feature wants a change to Platform Core, the default answer is "model it in a Domain Service or via the Extension System first." Core changes require the strongest justification.
- **Authoring discipline for proposing a Core change: the bar is "this cannot be modelled in Domain or via Extensions," not "this would be cleaner in Core."** The rule above states the conclusion ("default answer is no; Core changes require the strongest justification"). This bullet spells out how to meet that bar: before writing a Core feature spec, name explicitly what was considered in Domain and why it was rejected. The rejection has to ground in capability ("Domain Services can't access this without breaking the one-way dependency rule") or in cross-service coupling ("multiple Domain Services need this and modelling it in any one of them creates cross-service dependencies"), not in convenience ("it would be easier"). When a Core change is proposed without a documented Domain consideration, that's a smell: the proposal hasn't met the bar yet, regardless of how compelling the Core form is.
- **Internal API signature changes coordinate via ADR + version bump, even when consumers are in-tree.** The platform tier file carries "Contract changes trigger ADRs" generically. The sub-tier specific is: the Internal API counts as a contract for this rule's purposes, and "in-tree consumers" doesn't reduce the ADR requirement. The two reasons the discipline holds even for fully-coordinable consumers: (1) the ADR is the audit trail for why the signature changed, which future contributors and Session-N's reading need to find; (2) the version bump catches the silent-miscompile failure mode the PG17 RLS layer surfaces only at runtime. When adding to Core, the test is "does this change the surface Domain calls?" — if yes, ADR + version bump; if no, internal refactor.
- **The four FringeIsland roles and `has_permission()` live in Platform Core's Identity area (PC-2).** The role names — Steward, Guide, Member, Observer — and the `has_permission(user_id, group_id, permission_name)` SQL function are defined and authored there, per the three-layer permission model (ADR-U007). Every other tier and service consumes them; nothing else defines them. The platform-tier rule "never hardcode role names; use `has_permission(...)`" is the consumption discipline — this bullet is its anchor, naming where the canonical definitions live and which area owns evolution. This rule sits at sub-tier as a temporary anchor; when Identity's L2 specification is authored and `docs/platform/core/identity/CLAUDE.md` is created, the rule's natural home is that entity file.

---

## Gotchas

- **Don't classify Internal API signature changes as internal refactors.** The signature is the contract surface; changing it without an ADR breaks Domain consumers at runtime even though the change compiles in Core. Common shape of the recognition failure: a Core implementer renames a SQL function parameter, adds a default value, or changes a return type, and treats it as an internal cleanup because the Core test suite passes. The Domain Services that call the function compile fine against the old signature in their own modules, then fail at runtime when PG17's RLS layer encounters the changed function in a policy. The rule of thumb is mechanical: if Domain code calls it, it's not internal. The compile-time silence is the trap; the runtime break is the consequence.

---

## Where to go next

- **Feature ID prefix at this sub-tier:** `PC` (Platform Core). See [`README.md`](./README.md) and [`features/`](./features/).
- **The four areas:** Infrastructure (PC-1), Identity (PC-2), Organisation (PC-3), Governance (PC-4). Each area's specification is to-be-written per the README; entity-level CLAUDE.md files for each area become imminently expected when the area's L2 specification is authored.
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every platform-tier rule applies here without restatement, including the verticals obligations, the "new tables require RLS" rule, the schema-changes-set-status-to-review discipline, the cascade-spec-first rule (ADR-U016), the one-way dependency rule, and API versioning (ADR-U015).
- **Sibling sub-tier:** [`../domain/CLAUDE.md`](../domain/CLAUDE.md) — Platform Domain Services. The two sub-tiers share the platform tier's rules but differ on stability-zone posture and contract-boundary semantics.
- **Relevant ADRs:** U023 (Platform Core / Domain Services decomposition — the load-bearing decision for this sub-tier) · U015 (API versioning, applies to Internal API as well as Platform API) · U016 (cascade specification first).
