# ADR-U034: Consent substrate — append-only consent records captured at transcendence

**Status:** Accepted
**Date:** 2026-06-26
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

> Architecture Decision Record (MADR-style). **Operationalizes** [ADR-U031](ADR-U031-mist-identity-lifecycle.md)'s
> locked rule that consent is captured atomically at the single transcendence event, and **resolves**
> identity-spec §8 **Q8 / X4** (the latent consent substrate). ADR-U031 decided *that* consent is
> captured and *when*; this ADR decides the **substrate** — shape, ownership, extensibility. Pairs with
> **FEAT-PC002** (substrate) ↔ **FEAT-H004** (Hub), the IDN-2 increment. Decided alongside
> [ADR-U033](ADR-U033-mist-ephemerality-reaper.md) (reaper).

---

## Context and problem statement

ADR-U031 locks the consent semantics: transcendence "fires **only when both conditions hold: all
founding questions answered AND consent given**," and transcendence is "the one moment data binds
durably: consent is captured." The *capture point* and *meaning* are settled. What is **not** settled —
and is flagged latent in identity-spec §8 (Q8 / X4) and deferred by FEAT-PC001 — is the **substrate**:
where consent-state is stored, in what shape, owned by which Platform Core entity, and how it extends
beyond the single transcendence-consent purpose.

*"What durable substrate records consent — captured atomically with the Mist→FIM migration — so that it
is GDPR-auditable, extensible to future consent purposes, and owned by the right entity?"*

## Decision drivers

- **Stefan's steer:** robust, industry-standard; not a throwaway flag.
- **GDPR-auditable proof-of-consent (ADR-U010):** consent must be provable after the fact — *who*
  consented, to *what purpose*, at *what version*, *when*. That argues for an append-only record, not a
  mutable flag.
- **Extensibility (decomposition checklist — no sealed enums):** transcendence consent is the first
  purpose, not the only one (future: marketing, research, data-sharing, re-consent on policy change).
  The purpose space must be **open**.
- **Atomicity (ADR-U031):** the consent record is written in the **same transaction** as the
  transcendence migration — consent and persistence bind together or not at all.
- **Repo actor primitive (P-O1):** the consent subject keys to the FIM via the repo's actor chain
  (`users.id` / `personal_group_id`, ADR-U006/U007), **not** `auth.uid()` directly.
- **Verticals are obligations, not services (ADR-U002):** Privacy does not own a table; an owning entity
  holds the substrate and the Privacy vertical levies obligations on it.

## Considered options

- **Option A — Append-only consent-record table, transcendence-scoped, extensible (chosen).** A
  dedicated table; one row per consent event (purpose, version, timestamp, subject, capture path);
  insert-only; designed so new purposes are data, not schema changes.
- **Option B — Columns on `users`** (`consent_at`, `consent_version`). Simplest, but a single mutable
  flag: not append-only, not auditable across multiple purposes, and a refactor-to-table debt the moment
  a second consent purpose appears. Fails the "robust" steer.
- **Option C — Full consent-management subsystem now** (capture + withdrawal + re-consent + purpose
  registry + UI). Most complete, but a large Privacy-vertical build that exceeds the IDN-2 appetite and
  should be its own feature once the substrate exists.

## Decision outcome

**Chosen option:** Option A — an append-only consent-record substrate, scoped to transcendence consent
for IDN-2, shaped so future purposes slot in without schema change.

Decision-level commitments (exact DDL, RLS, and column names are FEAT-PC002 detail):

1. **Shape.** One row per consent event: **subject** (FIM, per the repo actor primitive), **purpose**
   (open identifier — text/lookup, **never a sealed enum**), **policy version**, **timestamp**, and
   **capture context** (which path/surface captured it). Insert-only.
2. **Append-only, not mutable.** Consent is never updated in place. A change of state (e.g. withdrawal)
   is a **new appended record**, preserving the full history as GDPR proof. Enforced by RLS/trigger
   (no UPDATE/DELETE on the consent table outside the controlled erasure path).
3. **Atomic with transcendence.** The first consent record is written in the **same transaction** as the
   Mist→FIM migration (ADR-U031). No consent row without persistence; no persistence without consent.
4. **Scope for IDN-2.** Only the **transcendence-consent** purpose is captured now. Withdrawal,
   re-consent, multi-purpose capture, and any consent UI beyond the transcendence gate are **out of
   scope** (a later Privacy-vertical feature built *on* this substrate).
5. **Erasure interaction (with ADR-U033).** Consent records exist **only post-transcendence**, so the
   Mist reaper never touches them (it reaps only un-transcended Mists). Account-level erasure
   (right-to-erasure of a FIM) is a **distinct path** from the reaper and must reconcile erasure against
   the legal duty to retain proof-of-consent — resolved as a FEAT-PC002 / Privacy-vertical detail
   (typically: anonymise the subject link, retain the consent event), not in this ADR.
6. **Ownership — FOR RATIFICATION (recommended: PC-2 Identity).** The consent substrate is **bound to
   the Identity lifecycle**: it is created atomically at the Identity transcendence event, and
   identity-spec §L3 already attributes "atomic consent capture at transcendence" to PC-2. Recommended:
   **PC-2 (Identity) owns the substrate table; the Privacy vertical (ADR-U010) levies the obligations
   (what must be consented, retention, auditability); PC-4 (Governance, ADR-U028) is a consumer** for
   scope-governance decisions. The alternative — PC-4 owning the substrate as a governance/rights
   artifact — is documented below. **Stefan ratifies the owner; the ADR flips to Accepted on that call.**

### Consequences

- **Positive:** consent is provable, versioned, and multi-purpose-ready from day one; the IDN-2 build
  stays small (one purpose) while the substrate is future-proof.
- **Positive:** the append-only + atomic-with-transcendence design makes the GDPR story clean and the
  reaper/consent boundary collision-free.
- **Negative:** an append-only table needs an explicit erasure/anonymisation policy for FIM account
  deletion (proof-retention vs. right-to-erasure) — named here, resolved in FEAT-PC002.
- **Neutral:** ownership PC-2-vs-PC-4 is a placement call, not a capability call; the substrate's shape
  is identical either way.

## Pros and cons of the options

### Option A — Append-only consent-record table (chosen)
- Pros: GDPR-auditable; multi-purpose-extensible without schema change; append-only history; atomic with
  transcendence; small IDN-2 footprint.
- Cons: needs an erasure/anonymisation policy for account deletion; slightly more than a flag.

### Option B — Columns on `users`
- Pros: trivial to add.
- Cons: mutable single flag; no audit history; no multi-purpose; guaranteed refactor debt; fails the
  robust steer.

### Option C — Full consent-management subsystem now
- Pros: complete.
- Cons: exceeds IDN-2 appetite; should be a later feature built on this substrate.

## Links

- **Operationalizes / resolves:** [ADR-U031](ADR-U031-mist-identity-lifecycle.md) (consent captured at
  transcendence) and identity-spec §8 Q8 / X4 (the latent substrate).
- **Decided with:** [ADR-U033](ADR-U033-mist-ephemerality-reaper.md) (reaper — the pre-transcendence
  half).
- **Related:** [ADR-U010](ADR-U010-privacy-dedicated-vertical.md) (Privacy vertical / GDPR obligations) ·
  [ADR-U028](ADR-U028-governance-by-scope.md) (Governance / PC-4) · [ADR-U006](ADR-U006-universal-group-pattern.md)
  / [ADR-U007](ADR-U007-three-layer-permission-model.md) (actor primitive) ·
  [ADR-U016](ADR-U016-cascade-specification-first.md) (cascade discipline).
- **Implemented by:** FEAT-PC002 (substrate) ↔ FEAT-H004 (Hub) — the IDN-2 increment.
