# Vertical — V2: Privacy, GDPR & AI Consent

**Status:** Draft (scaffold — Ferd)
**Owner:** Stefan
**Last updated:** 2026-04-08
**Tier:** Cross-cutting

> Personal data protection is non-negotiable. This vertical guarantees that every byte of personal data we hold is collected lawfully, used minimally, exported on request, and deleted on request — including data fed to or derived from AI systems.

---

## 1. Purpose

Trust is the precondition for everything else FringeIsland tries to do. Privacy failures don't just cost fines; they break the relationship the platform needs with its users to function at all.

## 2. Scope

- Lawful basis for every category of personal data (GDPR Art. 6)
- Consent capture and consent withdrawal flows
- Data minimisation in collection and storage
- Right of access (export)
- Right to erasure (delete)
- AI training opt-out and AI personalisation opt-out
- Records of processing (GDPR Art. 30)
- Sub-processor list maintained and disclosed
- Cross-border transfer posture

## 3. Obligations on each tier

### Platform Core
- Identity service stores consent state per user, per category
- Storage layer respects deletion requests cascading through all owned data

### Domain Services
- Each service declares which personal data it stores and the lawful basis
- Each service implements export and erasure for its owned data
- The Intelligence service (DS-7) carries an additional obligation: AI-derived data is also user data

### Surfaces
- Every collection point names the lawful basis and links to the privacy policy
- Consent toggles are reachable from account settings, not buried

## 4. Cross-cutting checklists

- [ ] New personal data field has a documented lawful basis
- [ ] New personal data field has an export path
- [ ] New personal data field has an erasure path
- [ ] New AI feature has an opt-out
- [ ] New collection point has a privacy notice

## 5. Tooling and infrastructure

- Consent store (currently partial — to be refined as the tooling matures)
- Export pipeline (to be designed)
- Erasure cascade (to be designed)

## 6. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

## 7. Open questions

- Do we need a Data Protection Officer (DPO) at our scale?
- How do we handle erasure for data that has been embedded into AI model state?
- Where do we sit on the spectrum from "GDPR-only" to "global highest standard"?

---

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
