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

## DS-3 rename — "Experience Engine" -> journey-named (decide at the DS-3 descent)

**Identified:** 2026-06-10 (DS-1 descent session, anatomy/naming challenge; noted for the DS-3 descent at Stefan's direction — not executed now).
**The problem:** since ADR-U025, *experience* is identity-layer vocabulary ("one experience, one shared core"; products as surfaces of one experience; studios as a mode inside it). DS-3's name collides with the platform's biggest word while owning something much narrower: journeys, steps, progress, enrolments. Fails the vocabulary-vetting bar (newcomer intuition + collision check), and the collision grew as canon matured.
**The candidate:** rename to **Journey Engine** (or plain **Journeys**) — *journey* is the exact canon word for what DS-3 owns, and it makes the studio affinity legible (Journey Studio -> Journey Engine, as World Studio -> World Model).
**Decide alongside:** the "Engine" suffix asymmetry — only DS-2 Narrative Engine and DS-3 carry it; either both keep it or both drop it ("Narrative" / "Journeys").
**Ripple when executed:** domain README service line; `docs/templates/domain-service-spec.md` slug enum (`experience-engine`); domain `CLAUDE.md` enumerations; STATUS.md pipeline row; ECOSYSTEM_ANATOMY_V5 + DOMAIN_SERVICE_DEPENDENCIES SVGs; register-style label sweeps. Cheapest before DS specs multiply — weigh timing at DS-3 entry.
**Related watch-items (no action, recorded 2026-06-10):** DS-1 "World Model" collides mildly with AI-vocabulary "world model"; DS-6 "Discovery" collides with "the universe-discovery" log (decide at DS-6's charter re-derivation); DS-7 "Intelligence" kept deliberately — renaming it "Whisp" would break the cosmology-neutral naming lock platform entities honour.
**Engine-suffix outcome (appended 2026-06-10, DS-2 descent FIRST DECISION, ratified by Stefan):** the suffix **drops on both**. DS-2 landed as **Narrative** (`docs/platform/domain/narrative.md`, slug `narrative`); its rename ripple (template slug enum, domain README line, CLAUDE.md enumerations, STATUS.md row, world-model/infrastructure consumer labels, V5 + dependency SVG labels) executed in the DS-2 descent commits. The "Decide alongside" suffix half of this entry is thereby decided; DS-3's own rename to a journey-named, suffix-free form (candidate: **Journeys**) still executes at the DS-3 descent per this entry's ripple list.

---

*(ADR-U027 and ADR-U028 were promoted on 2026-06-10, batch G-3.)*
