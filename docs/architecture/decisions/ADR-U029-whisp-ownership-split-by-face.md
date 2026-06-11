# ADR-U029: Whisp L2 ownership — split by face (DS-1 world-presence / DS-7 being)

**Status:** Accepted
**Date:** 2026-06-10 (ratified at the DS-1 World Model descent, Phase 1 Decision 1; promoted from `PENDING.md` at the DS-7 Intelligence descent, 2026-06-11 — the second consumer of the boundary, per the parked candidate's own promotion trigger)
**Deciders:** Stefan
**Tags:** scope:domain-service · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

The Whisp is the highest-consequence concept in the roadmap — each FIM's inner dialogue AND their avatar in the parallel world ("two framings, one entity", the beings core). As a single being it spans two architecturally distinct concerns: world-presence (position on the cord, severance, respawn — world-state mechanics) and being (dialogue, growth-driven filling, the senses model, maturity — intelligence mechanics). The decomposition cascade had a long-flagged gap here: the Whisp appeared in `how-we-work/assets/01-decomposition-cascade.svg` with no L2 owner, and was deliberately absent from DS-1's box in `ECOSYSTEM_ANATOMY_V5.svg`. *How should L2 ownership of the Whisp be assigned across the Domain Services?*

## Decision drivers

- The beings core itself names two framings of one entity — the inner dialogue and the avatar — and both must stay true to one canonical being.
- ADR-U023's Domain Service boundaries: each service owns its own data; dependency direction within Domain must stay acyclic and explicit.
- The world-state mechanics (cord, severance, respawn) are inseparable from DS-1's topology and place model.
- The intelligence mechanics (dialogue, filling, senses, maturity) are inseparable from DS-7's accumulation and AI posture.
- A service owning "almost no data of its own" is an anatomy smell (ADR-U023 territory).

## Considered options

- **Option A** — Split ownership by face: DS-1 owns world-presence; DS-7 owns the being.
- **Option B** — Single owner: assign the whole Whisp to DS-1 (or to DS-7).
- **Option C** — An eighth dedicated Whisp service owning the entity outright.

## Decision outcome

**Chosen option:** Option A — split by face, because the split follows the two framings the beings core itself names, gives each face to the service whose mechanics it is inseparable from, and keeps the dependency direction clean.

- **DS-1 World Model** owns the Whisp's **world-presence state**: position on the cord (Void distance), cord state (length/dial, stuck/dead outcomes, health/integrity channel), anchor chain, severance tier, respawn position.
- **DS-7 Intelligence** owns the Whisp **as a being**: dialogue, the empty-fills-by-growth mechanism, the senses/Big-5 model, the maturity/internalisation arc (the cord's *salience* channel is DS-7-derived, rendered through DS-1's cord), guard railing.
- **Dependency direction:** DS-7 consumes DS-1 (the intelligence acts in the world; the world never depends on the intelligence). The salience feed is a **push** through DS-1's own contract (DS-7 → DS-1 call direction; resolved at the DS-7 descent, `world-model.md` §8 Q7 / `intelligence.md` §8 Q3).
- **The entity stays canonical in the beings core**; neither service owns "the Whisp" outright.

### Consequences

- **Positive:** each face lives with the mechanics it is inseparable from; the Domain dependency order stays acyclic (DS-1 at the bottom, DS-7 at the top); the cascade gap closes with no new service.
- **Negative:** the Whisp's full behaviour is specified across two service specs plus the beings core — readers must hold the split (both specs name it explicitly in their §1 boundaries).
- **Neutral:** the planned `whisp.md` canon sub-page (beings core) remains the single canonical statement of what the Whisp IS; both services derive from it.

## Pros and cons of each option

### Option A — split by face
- Pros: mirrors the canon's own two-framings structure; clean dependency direction; each service owns real data.
- Cons: two-spec readership burden.

### Option B — single owner
- Pros: one place to look.
- Cons: either burdens DS-1 with AI/accumulation mechanics foreign to world-state, or burdens DS-7 with topology mechanics foreign to intelligence; both violate inseparability.

### Option C — eighth Whisp service
- Pros: one entity, one owner, nominally clean.
- Cons: **rejected as a thin orchestrator** — it would own almost no data of its own, merely coordinating DS-1 + DS-7 state; an anatomy smell under ADR-U023.

## Links

- Related ADRs: ADR-U023 (Platform Core / Domain Services decomposition — the boundary law this decision operates within); ADR-U005 (profile_data — DS-7's accumulation shape); ADR-U027 (Shadow lifecycle — Shadows carry their own Whisp from the start).
- Provenance: ratified at the DS-1 descent (bridge `docs/planning/sessions/2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`); parked in `decisions/PENDING.md` 2026-06-10; promoted at the DS-7 descent (spec commit `255daad`, closing bridge `2026-06-11_02_-_DS7-LANDED.md`) — the DS-7 derivation surfaced nothing contradicting the split.
- Spec anchors: `docs/platform/domain/world-model.md` (Whisp-presence area; salience channel; §8 Q7) · `docs/platform/domain/intelligence.md` (§1 being-face; §7 invariants; §8 Q3) · the beings core `docs/ecosystem/universe/beings/README.md` ("two framings, one entity").
