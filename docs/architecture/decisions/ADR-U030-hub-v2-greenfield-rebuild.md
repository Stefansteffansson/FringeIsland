# ADR-U030: Hub v2 — greenfield rebuild on a curated substrate

**Status:** Accepted
**Date:** 2026-06-15
**Deciders:** Stefan (Founder)
**Tags:** scope:product · wave:Ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

Today's Hub is a working Ferd-era MVP (schema Feb 2026, last code change Mar 2026) that *validated the platform substrate* but pervasively predates the reconciled architecture: ~165 direct database call-sites from the app/component tier versus 19 RPCs and 6 API-route fetches — an ~8:1 inversion of the API-first rule (ADR-U009) — plus pre-canon journey vocabulary, inline step content (vs DS-4 blocks), questionnaire assessment steps, a client-side catalog filter (vs DS-6), no equipment-keying (ADR-U025), and no extracted design system. Since then, Platform Core, the seven Domain Services, the Extension System, and the five verticals have all been specified. **How should the Hub be brought in line with the architecture the specs now describe?**

This decision resolves the open question **CQ-015** (Hub Rebuild-vs-Evolve), previously parked pending realised Platform API contracts.

## Decision drivers

- The violations are pervasive and concentrated in the app/frontend tier, not the database substrate.
- Robustness and fidelity to the anatomy matter more than time-to-working-version (Founder's explicit priority).
- Pre-launch: there are no real users, so no live system must be kept running and no production data migrated.
- The database substrate (schema, functions, RLS) represents substantial sound work and is the layer the specs anchor to.
- A fresh surface needs Domain-Service contracts to build against; those are specified but not yet realised in code.

## Considered options

- **Option A — Evolve in place:** untangle the ~165 direct-call sites in the existing code.
- **Option B — Per-slice strangler:** keep the old Hub live, replace it slice by slice, shifting over gradually.
- **Option C — Greenfield rebuild on a curated substrate:** build a new Hub (app + API + frontend) clean and true to the anatomy, reusing/adapting the database substrate, keeping the old MVP frozen as a reference/oracle, built area by area in dependency order.

## Decision outcome

**Chosen option: C — greenfield rebuild on a curated substrate**, because the architecture violations are too pervasive to fix cleanly in place, and (being pre-launch) the strangler's only real benefit — never going dark — is worth nothing here, leaving only its downside of coupling new work to the old shape.

Specifics:
- **New app/API/frontend, written fresh** and API-first (DB → API → frontend), with the five verticals satisfied from line one and the design system extracted.
- **The database substrate is curated forward** — conformant tables/functions/RLS are reused, divergent ones adapted, obsolete ones dropped (per the Phase-1 substrate audit).
- **The old Hub MVP is frozen as a read-only reference and behavioural oracle** (its ~69 tests are the specification for what v2 must still do); copy-with-correction only, never import-and-patch. It is retired once superseded.
- **Built area by area in dependency order**, each area realising the Domain-Service/Platform API contract beneath it — which is also how the first real FEAT-PD contracts get realised (the sequencing condition CQ-015 was waiting on).
- Not a big-bang: a runnable, tested core is maintained throughout (walking skeleton).

Full plan: [`docs/planning/hub-v2/README.md`](../../planning/hub-v2/README.md).

### Consequences

- **Positive:** v2 is clean and architecture-true from the start; the is-vs-should gap becomes a concrete build backlog; the Domain Services and verticals get exercised against a real consumer for the first time; no dual-maintenance burden (old Hub frozen).
- **Negative:** more upfront effort than patching; a greenfield stretch with risk of losing edge cases (mitigated by the behaviour inventory and dependency-order build).
- **Neutral:** the database largely persists across the rebuild; the Hub spec is re-derived as a living document and will evolve via the build-informed spec-evolution loop (PROCESS.md §9).

## Pros and cons of each option

### Option A — Evolve in place
- Pros: keeps existing code; smallest conceptual leap.
- Cons: ~165 violation sites to untangle; high risk of half-migrated inconsistency; fights the pre-canon structure throughout.

### Option B — Per-slice strangler
- Pros: never go dark; incremental.
- Cons: its core benefit (staying live) is moot pre-launch; couples new work to the old Hub's slicing and shape.

### Option C — Greenfield on curated substrate (chosen)
- Pros: clean, robust, architecture-true; reuses the sound substrate and the proven behaviours; clear on-ramp from design back to build.
- Cons: more upfront work; greenfield "long dark" risk — mitigated by dependency-order, always-runnable core, and the behaviour inventory.

## Links

- Plan: [`docs/planning/hub-v2/README.md`](../../planning/hub-v2/README.md)
- Closes: CQ-015 (Hub Rebuild-vs-Evolve) in [`docs/ecosystem/thinking/OPEN_QUESTIONS.md`](../../ecosystem/thinking/OPEN_QUESTIONS.md)
- Related ADRs: U009 (API-first), U012 (observability), U023 (Platform Core / Domain Services decomposition), U025 (products as equipment profiles)
- Process: the build-informed spec-evolution loop, [`docs/planning/PROCESS.md`](../../planning/PROCESS.md) §9
