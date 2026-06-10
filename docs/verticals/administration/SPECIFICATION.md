# Vertical — V1: Administration & Moderation

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V1
name: Administration
owner: Stefan
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: draft
last_updated: 2026-06-10
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V4.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Administration covers platform-level operator capabilities (user management, group management, content moderation, abuse response). Every domain service and surface must expose the hooks that admins need to inspect, intervene, and remediate. Without administration, the platform is ungovernable. This vertical guarantees that operators always have the tools to keep the platform safe, lawful, and consistent with the cosmological constitution — without requiring database surgery.

Per ADR-U028 (governance by scope, ratified 2026-06-10), administration is not one undifferentiated operator plane — it splits by **scope**. **Community-scoped care** (a Steward moderating their own group, a Guide facilitating their journey) stays **woven in-place** in the FIM experience: the affordance appears where the care happens, with no admin-panel detour. **Universe-scoped administration** (platform operations, portfolio, economy, legal) lives on **the Console** — the back-of-house surface and the home of universe-scoped admin ("the Console" is the working name; the fiction name is deferred). The Console is a surface, not a new permission system: one permission mechanism throughout (the universal group pattern, ADR-U006/U007).

### 2. Scope

Scoped per ADR-U028 — in-place community-care affordances vs Console surfaces:

**In-place community care (woven into the FIM experience):**
- Content reporting and moderation affordances where the care happens (flagging, in-group moderation by Stewards/Guides) — Ferd routing: in-place
- Appeal flows initiated in-experience
- Self-service platform-exit stays in-experience (a member leaving is not an admin act)

**Universe-scoped administration (the Console):**
- Platform admin role assignment (DeusEx system group; enterprise-plane seats — Universeers, the FringeIsland Council, DeusEx — per ADR-U028)
- User account inspection, suspension, deletion
- Group inspection, takeover, dissolution
- Content-moderation operations (review queues, takedown)
- Audit trail of every administrative action; the audit-log viewer is a Console surface — Ferd routing: Console
- Feature flags — Ferd routing: Console

### 3. Tooling and infrastructure

- `is_platform_admin()` SECURITY DEFINER helper (existing)
- DeusEx system group (existing)
- Audit log table (currently partial — to be refined as the tooling matures)
- The Console (working name; planned per ADR-U028) — the back-of-house surface housing universe-scoped admin tooling (audit-log viewer, feature flags per the Ferd routing)

### 4. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

### 5. Open questions

- Appeal workflow: in-app or out-of-band?
- Content moderation: human-only, or AI-assisted with human review?
- Regional moderation: do we need per-jurisdiction moderation rules?

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

*To be filled in as the vertical's obligations are refined from the existing admin implementation. Read the live code and migrations directly for the current state.*

#### Domain Services

Each domain service must expose: list-all (admin scope), force-edit, force-delete, audit-log-emit.

#### Surfaces (Products · Studios · Design System)

Each surface must surface admin actions behind the platform-admin permission gate, never client-side hidden.

Each surface routes admin affordances by scope (ADR-U028): community-scoped care affordances appear in-place in the FIM experience (where the care happens); universe-scoped admin surfaces (audit-log viewer, feature flags, economy/portfolio/legal operations) appear only on the Console, never woven into the member experience.

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New table has an admin list/inspect query
- [ ] New mutation emits an audit-log entry on the admin path
- [ ] New surface respects `is_platform_admin()` for admin affordances
- [ ] Destructive admin actions require a confirm modal (never `window.confirm`)
- [ ] New admin affordance is routed by scope (ADR-U028): community-scoped care in-place; universe-scoped on the Console

### Sources-status block

*No remarks recorded.*

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline is tracked as G-21.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
