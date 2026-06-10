# Vertical — V2: Privacy, GDPR & AI Consent

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V2
name: Privacy/GDPR
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

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Personal data protection is non-negotiable. This vertical guarantees that every byte of personal data we hold is collected lawfully, used minimally, exported on request, and deleted on request — including data fed to or derived from AI systems. Trust is the precondition for everything else FringeIsland tries to do. Privacy failures don't just cost fines; they break the relationship the platform needs with its users to function at all.

### 2. Scope

- Lawful basis for every category of personal data (GDPR Art. 6)
- Consent capture and consent withdrawal flows
- Data minimisation in collection and storage
- Right of access (export)
- Right to erasure (delete)
- AI training opt-out and AI personalisation opt-out
- Records of processing (GDPR Art. 30)
- Sub-processor list maintained and disclosed
- Cross-border transfer posture
- Shadow (anonymous entrant) data minimisation and ephemerality (ADR-U027)
- Per-region, per-audience, revocable sharing of the FIM's private home (universe-discovery S43)

### 3. Tooling and infrastructure

- Consent store (currently partial — to be refined as the tooling matures)
- Export pipeline (to be designed)
- Erasure cascade (to be designed)

### 4. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

### 5. Open questions

- Do we need a Data Protection Officer (DPO) at our scale?
- How do we handle erasure for data that has been embedded into AI model state?
- Where do we sit on the spectrum from "GDPR-only" to "global highest standard"?

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- Identity service stores consent state per user, per category
- Storage layer respects deletion requests cascading through all owned data
- Shadow data minimisation (ADR-U027): the anonymous entrant (Shadow) receives a server-issued anonymous identity with no PII; no personal data is collected beyond what the Shadow itself generates in-session
- Shadow ephemerality (ADR-U027): the Shadow's own generated data is erased on a short TTL after inactivity and on explicit close (explicit-erase path); the exact TTL/inactivity threshold is a configuration this vertical owns jointly with PC-2 Identity (deferred by design). Shared-world content merely read by the Shadow is out of scope
- Whisp dialogue is treated as potentially personal data regardless of the Shadow's anonymity — it is the most sensitive class of Shadow-generated data and carries full minimisation and erasure obligations
- Transcendence consent-capture (ADR-U027): becoming a FIM is the one moment Shadow data binds durably; consent is captured atomically with the data migration, and a last-moment joiner must not be erased mid-migration (the TTL sweep honours the explicit-erase path and the mid-migration guard)

#### Domain Services

- Each service declares which personal data it stores and the lawful basis
- Each service implements export and erasure for its owned data
- The Intelligence service (DS-7) carries an additional obligation: AI-derived data is also user data
- The service owning the FIM's private home enforces granular sharing (universe-discovery S43; see `../../ecosystem/universe/personal-growth/privacy-model.md`): per-region, per-audience, and revocable — the FIM can open one room to one audience and keep the rest locked, and the FIM holds the only key by default

#### Surfaces (Products · Studios · Design System)

- Every collection point names the lawful basis and links to the privacy policy
- Consent toggles are reachable from account settings, not buried

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New personal data field has a documented lawful basis
- [ ] New personal data field has an export path
- [ ] New personal data field has an erasure path
- [ ] New AI feature has an opt-out
- [ ] New collection point has a privacy notice
- [ ] New Shadow-touching feature preserves ephemerality (TTL after inactivity + explicit-erase path; no durable Shadow data outside the transcendence path)
- [ ] New home-content surface honours per-region, per-audience, revocable sharing (S43)

### Sources-status block

*No remarks recorded.*

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
