# ADR-U028: Governance by scope — the Console, the Universeers plane, and DeusEx as the root-admin group

**Status:** Accepted
**Date:** 2026-06-10
**Deciders:** Stefan
**Tags:** scope:platform-core · scope:vertical · wave:ferd

> Extends [ADR-U019](ADR-U019-deusex-authority-last-resort.md) (DeusEx as authority of last
> resort — confirmed as the permission profile, broadened as a role). Source of truth: the
> universe-discovery 2026-06-05 product locks (the console; governance by scope) and Statement 29
> (the enterprise-stewardship plane), plus the Session B ratified DeusEx formulation (2026-06-10).
> Ratified in Session B (register batch G-3).

---

## Context and problem statement

PC-4 Governance and the Administration/Transactions verticals model one undifferentiated operator
plane, and `governance/CLAUDE.md` rules "do not introduce new admin roles." The discovery locked a
different shape: governance splits by **scope** — community-scoped care stays woven in-place in
the FIM experience, while universe-scoped governance gets its own back-of-house surface — and the
enterprise-stewardship plane has named human seats. *"How is governance structured so community
care and universe operations stop sharing one undifferentiated admin plane?"*

## Decision drivers

- The 2026-06-05 product lock is explicit: governance by scope; the console (dry-run thread #1, LOCKED).
- Gate-by-scope is a recurring system law (it also tiers World Studio access) — structural, not incidental.
- The ratified DeusEx formulation (2026-06-10): a human group, not a mechanism.
- The universal group pattern (ADR-U006/U007) must remain the single permission mechanism.

## Considered options

- **Option A** — Status quo: one operator plane, single flat admin group.
- **Option B** — Governance by scope: in-place community care + the Console for universe scope,
  with the enterprise plane named (chosen).
- **Option C** — A full separate admin product.

## Decision outcome

**Chosen option:** Option B.

### The decision, in full

1. **Governance splits by scope.**
   - **Community scope** — a Steward moderating their own group, a Guide facilitating their
     journey: stays **woven in-place** in the FIM experience. No separate surface; the affordance
     appears where the care happens.
   - **Universe scope** — economy, portfolio, legal, platform operations: happens on **the
     Console**, a distinct back-of-house surface. "The console" is the working name; the fiction
     name is deferred.
2. **The enterprise-stewardship plane (roles core, L2).**
   - **Universeers** — constituency, portfolio, community, economy, legal.
   - **The FringeIsland Council** — major decisions, partnerships.
   - **DeusEx** — the **human root-admin group of the running platform** (ratified 2026-06-10):
     the people who administrate and maintain FringeIsland in the eyes of all users. Their
     permission set includes the authority of last resort (ADR-U019 — confirmed as the permission
     profile; the *role* is broader than break-glass). They act within the platform; they touch
     ecosystem development at releases and as a stakeholder, feeding observations of platform
     life back to the developers — the link between life inside FringeIsland and the development
     of the ecosystem.
3. **The "no new admin roles" rule is relaxed, precisely.** `governance/CLAUDE.md`'s rule becomes:
   admin authority is structured by **scope + the universal group pattern** — community-scoped
   roles are the PC-3 templates; universe-scoped seats are the enterprise plane above. No OTHER
   ad-hoc admin roles are introduced.
4. **Ferd routing (locked in the discovery's dry-run):** content reporting/moderation in-place;
   audit-log viewer and feature flags to the Console; self-service platform-exit stays
   in-experience (a member leaving is not an admin act). **Transactions split likewise:** a
   member buying is in-experience; economy management is on the Console.

### Consequences

- **Positive:** Community care keeps its warmth (no admin-panel detour for a Steward); universe
  operations get a real operational surface; the enterprise plane finally has spec-level homes.
- **Positive:** One permission mechanism throughout — the Console is a surface, not a new
  permission system.
- **Negative:** PC-4, `governance/CLAUDE.md`, and the Administration + Transactions vertical
  specs need corrections (batch G-3); the Console becomes a capability surface to specify and
  eventually build.
- **Neutral:** Whether the Console is a Hub-shell feature bundle or its own thin surface is a
  decomposition decision for when its features are specified (it leans `comfortable-canvas` +
  `precision-input` by equipment).

## Pros and cons of each option

### Option A — One operator plane
- Pros: Simplest; matches current code (flat `platform_admin`).
- Cons: Contradicts the lock; conflates a Steward's care with platform operations; no home for
  Universeers/Council; "no new admin roles" blocks the locked model.

### Option B — Governance by scope (chosen)
- Pros: Matches the locks and the ratified DeusEx formulation; reuses the group pattern; the
  gate-by-scope law applied consistently.
- Cons: Spec corrections now; a Console surface to specify later.

### Option C — Separate admin product
- Pros: Maximal separation.
- Cons: Over-structure; contradicts ADR-U025 (no new product entities; the Console is a surface
  of the one experience's back-of-house, not a third profile).

## Links

- Extends: [ADR-U019](ADR-U019-deusex-authority-last-resort.md)
- Related: [ADR-U006](ADR-U006-universal-group-pattern.md) · [ADR-U007](ADR-U007-three-layer-permission-model.md) · [ADR-U025](ADR-U025-products-as-equipment-profiles.md) · the roles core (`docs/ecosystem/universe/roles/README.md`)
- Source: universe-discovery 2026-06-05 product locks (governance by scope; the console; Ferd routing); Statement 29; Session B DeusEx ratification (2026-06-10)
