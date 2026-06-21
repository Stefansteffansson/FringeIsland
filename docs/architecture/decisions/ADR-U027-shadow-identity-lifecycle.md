# ADR-U027: Shadow identity lifecycle — anonymous auth, ephemerality, transcendence

**Status:** Superseded by ADR-U031
**Date:** 2026-06-10
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

> **Superseded by [ADR-U031](ADR-U031-mist-identity-lifecycle.md) (2026-06-21):** the anonymous
> entrant — here called the **Shadow** — is renamed the **Mist**, and "Shadow" is reassigned to the
> place-3 / sleep-paralysis menace (discovery Statements 47-48). The lifecycle below is **preserved and
> renamed** by U031, not overturned. This body is retained intact as the record of the 2026-06-10
> decision; do not edit it.

> Extends [ADR-U004](ADR-U004-visitor-anonymous-sign-in.md) (the anonymous sign-in mechanism),
> [ADR-U010](ADR-U010-privacy-dedicated-vertical.md), and
> [ADR-U016](ADR-U016-cascade-specification-first.md). Renames the identity: what ADR-U004 calls
> the **Visitor** is canonically the **Shadow** (roles core; retired-names table). Source of
> truth: universe-discovery Statements 16, 39, 45, 46; ratified in Session B (register batch G-3).

---

## Context and problem statement

ADR-U004 established the mechanism — anonymous sign-in, an `is_temporary` flag, pg_cron cleanup —
but PC-2's identity specification models signed-up Users only: the anonymous entrant has no
specified lifecycle. The discovery locked one: the Shadow is a first-class identity state with
its own Whisp and cord, intrinsically limited access, ephemeral data, and a named, consent-bearing
transition into FIM. *"How does the platform specify the anonymous identity's full lifecycle —
entry, data handling, and transcendence?"*

## Decision drivers

- The discovery locks (S16, S39, S45, S46) are explicit and ratified.
- Privacy by design: data minimisation and storage limitation for unconsented entrants.
- Voluntariness: the Shadow must lose nothing by waiting and nothing by transcending.
- The fiction and the platform must be one system (roles core: one system, two faces).

## Considered options

- **Option A** — Status quo: anonymous auth exists; lifecycle unspecified; "Visitor" naming.
- **Option B** — Specify the full Shadow lifecycle: anonymous auth + ephemerality + atomic
  transcendence (chosen).
- **Option C** — Client-only anonymity (no server-side Shadow state at all).

## Decision outcome

**Chosen option:** Option B.

### The lifecycle

1. **Entry — anonymous authentication.** A Shadow receives a server-issued anonymous identity, no
   PII. Server access is required to perceive the shared near-side world at all, so client-only
   anonymity (Option C) is not viable; the privacy protection is **ephemerality, not refusing to
   store** (S46).
2. **Access — intrinsic, not a fence.** A Shadow has their own Whisp and cord (S39) and full
   near-side access (body-anchored). The Beyond is closed intrinsically: no ball, no anchor —
   the village and deep place 3 are FIM-only (S45). Feature gating follows equipment + status
   (ADR-U025; "Shadow is one status across surfaces, not a product").
3. **Data — ephemeral by rule.** The Shadow's own generated data (Whisp dialogue is the most
   sensitive class) has no durability past session end. It is erased soon after **inactivity** or
   an **explicit close**: a short TTL plus an explicit-erase path. The exact TTL/inactivity
   threshold is a Privacy-vertical / PC-2 Identity configuration (deferred by design). Shared-world
   content merely read is out of scope (S46).
4. **Transcendence — the persistence-and-consent threshold.** Becoming a FIM is the one moment
   data binds durably: consent is captured, the session's experience transfers into the FIM
   account with **continuity** (nothing restarts), and the migration is **atomic** — a
   last-moment joiner must not be erased mid-migration (S16, S46). In the fiction, transcendence
   grants the ball; on the platform, it grants persistence. Same threshold, two faces.

### Consequences

- **Positive:** The unconsented entrant gets the strongest privacy posture (data minimisation,
  storage limitation) while still experiencing the real shared world. Voluntariness is preserved
  structurally.
- **Positive:** PC-2's specification gains a definite scope addition (the Shadow lifecycle), and
  the Privacy vertical gains the ephemerality/TTL obligation — both corrected in batch G-3.
- **Negative:** Migration atomicity and TTL sweep correctness become tested platform invariants
  (the ADR-U004 pg_cron mechanism must honour the explicit-erase path and the mid-migration
  guard).
- **Neutral:** "Visitor" survives only in historical contexts (ADR-U004's title, old migrations);
  active docs say Shadow. Code rename is deferred with the code correction target (set aside
  2026-06-07).

## Pros and cons of each option

### Option A — Status quo
- Pros: No work.
- Cons: The lifecycle the discovery locks has no spec home; PC-2 stays silent; naming stays stale.

### Option B — Full lifecycle (chosen)
- Pros: Matches the locks; privacy-strongest; one threshold carrying both consent and the fiction.
- Cons: Real engineering invariants (atomicity, TTL) to build and test later.

### Option C — Client-only anonymity
- Pros: Nothing stored server-side.
- Cons: A Shadow could not perceive the shared near-side world; contradicts S46's explicit
  reasoning.

## Links

- Extends: [ADR-U004](ADR-U004-visitor-anonymous-sign-in.md) · [ADR-U010](ADR-U010-privacy-dedicated-vertical.md) · [ADR-U016](ADR-U016-cascade-specification-first.md)
- Related: [ADR-U025](ADR-U025-products-as-equipment-profiles.md) (status + equipment gating) · the roles core (`docs/ecosystem/universe/roles/README.md`) · the cosmology core (anchoring gate)
- Source: universe-discovery Statements 16, 39, 45, 46
