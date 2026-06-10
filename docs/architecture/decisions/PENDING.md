# Pending ADRs

ADR topics identified but not yet written. Promote using `../../templates/adr.md`.

---

## Whisp L2 ownership — split by face (DS-1 world-presence / DS-7 being)

**Identified:** 2026-06-10 (DS-1 descent session, Phase 1 Decision 1; ratified by Stefan).
**Resolves:** the long-flagged cascade gap (named in `how-we-work/assets/01-decomposition-cascade.svg`; deliberately absent from DS-1's box in `ECOSYSTEM_ANATOMY_V5.svg`).
**The decision:** the Whisp has no single L2 owner; ownership splits along the two faces the beings core itself names ("two framings, one entity"):

- **DS-1 World Model** owns the Whisp's **world-presence state**: position on the cord (Void distance), cord state (length/dial, stuck/dead outcomes, health/integrity channel), anchor chain, severance tier, respawn position.
- **DS-7 Intelligence** owns the Whisp **as a being**: dialogue, the empty-fills-by-growth mechanism, the senses/Big-5 model, the maturity/internalisation arc (the cord's *salience* channel is DS-7-derived, rendered through DS-1's cord), guard railing.
- **Dependency direction:** DS-7 consumes DS-1 (the intelligence acts in the world; the world never depends on the intelligence). The entity stays canonical in the beings core; neither service owns "the Whisp" outright.

**Why ADR-grade:** draws a Domain-Service boundary (ADR-U023 territory). An eighth Whisp service was considered and rejected: it would own almost no data of its own — a thin orchestrator over DS-1 + DS-7 state. Promote when the DS-7 descent runs (the second consumer of the boundary), using `../../templates/adr.md`.

---

*(ADR-U027 and ADR-U028 were promoted on 2026-06-10, batch G-3.)*
