# Platform Core — {Area name} (PC-{N})

<!-- Valid area slugs: infrastructure | identity | organisation | governance -->

---
slug: {infrastructure | identity | organisation | governance}
owner: platform/core/{slug}
consumers: [platform/domain/{any DS}, products/{any}, studios/{any}]
status: {proposed | active | stable | deprecated}
last_updated: YYYY-MM-DD
tier: Platform Core
tags: [platform-core:{slug}]
feature_prefix: PC  # FEAT-PC### for features owned by this area
---

> One file per Platform Core area. Platform Core is the domain-agnostic foundation everything else depends on. Each area (Infrastructure, Identity, Organisation, Governance) has its own SPECIFICATION.md; there is no PC-wide SPECIFICATION.md (locked 2026-04-26). This file is the inward-facing build spec for one area: what it owns, what it exposes, what it depends on, and how stable it is.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Platform Core tier note.** This template is the Platform Core adaptation of the L2/L3/L4 partition skeleton shared with `domain-service-spec.md`, `product-specification.md`, and `studio-specification.md`. Three Platform Core-specific properties earn dedicated treatment in L2 — the strict upward-only PC-1 → PC-4 dependency chain (§4), the contract surface as Internal API consumed by Domain Services rather than the Platform API consumed by Surfaces (§3), and the area's stability posture (§7) per `docs/platform/core/CLAUDE.md` ("Platform Core changes are rare by design") and ADR-U023. L3 uses the **capability inventory** content type, same as products, studios, and domain services. PC-4 Governance is the one area where the capability-inventory shape is worth checking against actual content — its policy-enforcement flavour may want surfacing in the vertical-impact column rather than as a separate L3 variant; see the §L3 framing.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision, the platform-tier `CLAUDE.md`, and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023). Revised when the area's boundaries, contract surface, dependencies, or stability posture change. Changes here are rare by design — see §7.*

### 1. Purpose

What this Platform Core area is responsible for, in one paragraph. Bound it: what *is* this area's job, and what is *not*? Platform Core areas are domain-agnostic — if the description requires FringeIsland-specific concepts (journeys, universes, narrative arcs), the responsibility probably belongs in a Domain Service, not here.

### 2. Concepts

The entities this area owns. Name them, define them, and note where each is persisted. Platform Core concepts are universal primitives (users, sessions, groups, permissions, audit events) — not domain entities.

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| ... | ... | ... |

### 3. Contract surface — what this area exposes and to whom

Platform Core areas expose their contracts via the **Internal API** consumed by Domain Services (and, for some primitives, consumed by every tier). This is *not* the Platform API consumed by Surfaces — Surfaces talk to Domain Services, which in turn consume Platform Core. Document the contract from the consumer's perspective.

#### Surface shape

- **Conventional API endpoints:** {`POST /api/v1/...` operations exposed; consumed by Domain Services. List those that exist.}
- **SQL helpers and primitives:** {`has_permission(...)`, `is_platform_admin()`, RLS helpers, trigger conventions. Especially load-bearing for PC-1 Infrastructure, where the contract is *primitives* rather than endpoints.}
- **Schema-level contracts:** {tables and columns that other tiers may read directly — typically only true for shared identity tables, with RLS as the contract enforcement.}

#### Operations

For each operation: name, inputs, outputs, errors, auth requirements, RLS posture (how the operation behaves under each calling role).

#### Operation: `{name}`
- **Purpose:** ...
- **Inputs:** ...
- **Outputs:** ...
- **Errors:** ...
- **Auth:** ...
- **RLS posture:** ...

#### Note on PC-1 Infrastructure

PC-1 is a special case. Most of what it "exposes" is not a conventional API but a set of platform primitives — RLS helpers, the `has_permission()` family, feature-flag accessors, migration discipline, trigger conventions. These primitives are consumed by every tier (Domain Services *and* Surfaces, via SQL or via Supabase client libraries). Document them as primitives with their consumption pattern, not as endpoints.

### 4. Internal dependencies — strict upward-only chain

**Platform Core dependencies are a strict linear chain — tighter than at any other tier.** This is load-bearing per `docs/platform/CLAUDE.md` ("Dependency direction is strictly one-way") and ADR-U023.

```
PC-1 Infrastructure ──► PC-2 Identity ──► PC-3 Organisation ──► PC-4 Governance
```

- **PC-1 Infrastructure** has *zero* internal Platform Core dependencies. It is the foundation.
- **PC-2 Identity** depends only on PC-1.
- **PC-3 Organisation** depends on PC-1 and PC-2.
- **PC-4 Governance** depends on PC-1, PC-2, and PC-3.

A capability in this area that depends on an area further down the chain is a structural error, not a missing dependency — split the capability, move it to the right area, or surface in §8 Open questions. **The chain never reverses, ever.** Domain Services never appear as a dependency of any Platform Core area; if this area's capability seems to need something from a Domain Service, the design is wrong.

#### What this area depends on (within Platform Core)

For this area specifically, list the upstream PC areas it consumes and what it consumes from them.

| Upstream area | What this area consumes | Used for |
|---|---|---|
| ... | ... | ... |

#### What this area does NOT depend on

Explicitly name areas this area is *not* allowed to depend on under the chain — useful for catching accidental coupling. (For PC-1 Infrastructure, this is "all other areas." For PC-4 Governance, this is "nothing in Platform Core" — only Domain Services consume PC-4, never reverse.)

### 5. Storage & schema

Tables, columns, indexes, RLS posture, trigger discipline. Reference migration files where applicable.

This is especially load-bearing for PC-1 Infrastructure, which owns the platform's foundational schema patterns:

- **RLS posture per table:** every Platform Core table has RLS — without exception (per `platform/CLAUDE.md`). Document the policy shape per table.
- **Trigger-based validation patterns:** when validation requires subqueries (PG CHECK constraints can't), document the trigger pattern used.
- **SECURITY DEFINER functions:** every SECURITY DEFINER function is a privilege-escalation surface — document why it needs the elevation. Always with `search_path = ''`.
- **Migration discipline:** migrations run in timestamp order; never rewrite an applied migration.
- **PG17 RLS gotcha:** complex PLPGSQL inside RLS policies fails silently in PG17. Use `is_platform_admin()` (minimal SECURITY DEFINER body) for admin-level RLS; reserve `has_permission()` for in-group checks.

For non-PC-1 areas, document the area's own tables and how they sit on top of PC-1's primitives.

### 6. Authentication & authorization

How this area participates in the platform's auth and permission model.

- **PC-2 Identity** owns the auth surface itself — how users sign in, how sessions are managed, where the Journal sits.
- **PC-3 Organisation** owns groups, memberships, role templates, and permission resolution. The `has_permission(user_id, group_id, permission_name)` function lives here (per ADR-U007). Never hardcode role names — always resolve via `has_permission()`.
- **PC-4 Governance** owns DeusEx, audit, moderation, and platform-wide rules other services obey.
- **PC-1 Infrastructure** owns the RLS posture itself — the policy primitives, the helper functions, the discipline that every new table has RLS from day one.

For this area specifically, document:
- {How auth applies to this area's operations}
- {Which RLS posture covers this area's tables}
- {Any area-specific permission bits — typically none for PC-1 / PC-2 / PC-3; PC-4 may have governance-specific roles}
- {DeusEx-only operations and the circumstances that authorise them}

### 7. Stability posture

Per `docs/platform/core/CLAUDE.md` ("Platform Core changes are rare by design") and ADR-U023, Platform Core sits at the highest blast-radius layer in the ecosystem. A change here propagates to every tier above. This section names *how rare* "rarely" is for this area, *what triggers* a change, and *what review escalation* looks like.

This is per area, not generic — Infrastructure changes are typically wave-boundary events (foundational schema patterns, RLS conventions); Governance changes typically require an ADR (audit format, moderation rules, platform-wide policies); Identity and Organisation sit somewhere between.

| Aspect | This area's posture |
|---|---|
| **Change cadence** | {wave-boundary only · ADR-required · per-cycle with review · ...} |
| **Triggers a change** | {what kinds of pressures legitimately trigger a change here — e.g., new vertical obligation, scale ceiling hit, ADR superseded, security finding} |
| **Review escalation** | {who reviews · what evidence is required · whether a migration window is needed} |
| **Default answer to "we want to change this"** | {per `platform/core/CLAUDE.md`: typically "model it in a Domain Service or via the Extension System first." State the area-specific version of this.} |
| **Deprecation pathway** | {how a contract is deprecated when it does change — versioning posture, migration window, notification to consumers} |

If a feature spec proposes work in this area, the spec must address the stability posture — what triggered the change, what review the change requires, what the deprecation pathway is for any contract being replaced. Features that don't address it fail DoR.

### 8. Open spec questions

L2-level questions still under design. Each is a candidate research spike or ADR.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the area enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

Each capability is placed under its internal owner within the area, with internal dependencies (other capabilities in this same area), external dependencies (capabilities consumed from upstream PC areas — see §4 for the strict chain), and per-capability vertical impact named.

| Capability | Internal area | Depends on (internal) | Depends on (external, upstream PC only) | Vertical impact |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

The **Vertical impact** column lists which of Administration / Privacy / Notifications / Observability / Transactions this capability touches, with one short phrase per vertical it touches. Verticals it doesn't touch are omitted from the cell. The rules each capability must satisfy per vertical live in the corresponding vertical's `SPECIFICATION.md` (§L3 Obligation inventory).

#### Note on PC-4 Governance

PC-4 Governance has a policy-enforcement flavour that's worth attention at this level: many of its capabilities take the form *"a rule other services must obey"* rather than *"a thing this service does for callers"*. This is still capability-inventory shape — the unit is a capability owned by PC-4 — but the policy flavour is best surfaced in the **Vertical impact** column, where the obligation on Administration / Privacy / Observability becomes explicit per capability. If a future PC-4 walk shows that policy enforcement doesn't fit cleanly inside the capability-inventory shape, surface as an open question against G-26 (which currently locks three L3 variants: capability / obligation / vocabulary). Do not introduce a fourth variant ad-hoc here.

### Dependency chain

Prose or diagram showing the order in which capabilities become buildable. A capability that depends on another must wait for that dependency's capability inventory to be stable (and, eventually, for the dependency's feature spec to reach maturity 4-ready).

For Platform Core areas, the dependency chain has two layers: within-area (capability A in this area depends on capability B in this area) and cross-area (capability A in this area depends on capability X in an *upstream* PC area — never downstream). Cross-area dependencies must respect the §4 chain.

### External dependencies

Capabilities this area consumes from upstream Platform Core areas. Each entry names the source area, the capability consumed, and the consuming internal location. Cross-reference these entries against the source area's own capability inventory; if the capability isn't there, surface as a boundary question.

**Allowed sources for a Platform Core area's external dependencies:**
- **Upstream PC areas only** (per the strict chain in §4). PC-1 has no allowed external dependencies; PC-4 may consume from any of PC-1, PC-2, PC-3.
- **Verticals** — the obligations levied by Administration / Privacy / Notifications / Observability / Transactions that apply to Platform Core capabilities. Note: Platform Core capabilities tend to be the *enabler* for vertical obligations elsewhere (e.g., PC-1's RLS posture is the enabler for Privacy's obligations on every tier), so the dependency framing is sometimes inverted at this tier.

**Disallowed sources:** Domain Services, Products, Studios, Design System. If a capability in this area appears to depend on any of these, the design has an inversion error — surface as an open question.

### Sources-status block

The `ecosystem-decomposition` skill's prerequisite-check pause mechanic produces remarks when upstream thinking is inadequate but the author proceeds anyway. Record those remarks here — one line per remark, with the upstream gap and a cross-reference to `docs/ecosystem/how-we-work/gaps.md` (e.g., G-03 for scaffold vertical specs).

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PC###.md` file under the shared `docs/platform/core/features/` directory that this area owns a capability for is created, advances in maturity, or is deleted. Maintenance discipline is tracked as G-21 — the `doc-health-check` skill verifies this section reflects the current state of `features/`.*

**Note on shared `features/` directory.** The four Platform Core areas share a single `docs/platform/core/features/` directory (locked 2026-04-26: flat layout, single shared features directory). Each `FEAT-PC###.md` is routed to its owning area via the L4 feature-inventory summary in that area's SPECIFICATION.md. A feature may appear in only one area's L4 summary — the owning area. If a feature legitimately spans areas (e.g., a permission-model change touching PC-2 and PC-3), one area is named owner and the other is named in Platform dependencies in the feature spec; do not list the same FEAT-PC### in two areas' L4 summaries.

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| ... | FEAT-PC{NNN} | 0–6 | ... |

One row per feature spec owned by this area. A capability with multiple feature specs has multiple rows. A capability with no spec gets a row with Feature spec = "—" and Maturity = "—".

### Capabilities without specs

Capabilities from §L3 that do not yet have a corresponding `FEAT-PC###.md` file owned by this area. These are candidates for future L4 runs.

- {Capability name} — {short note on why not yet specified, if useful}

### Features without capabilities

If any `FEAT-PC###.md` files exist under `docs/platform/core/features/` that name this area as owner but do not map to a capability in §L3, they're listed here. This should normally be empty; a non-empty list is a signal of drift and surfaces as a reconciliation finding.

- {FEAT-PC###} — {short note}

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle. See `docs/platform/CLAUDE.md` for the platform-tier obligations this template encodes.*
