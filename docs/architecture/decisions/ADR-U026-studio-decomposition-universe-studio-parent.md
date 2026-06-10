# ADR-U026: Studio decomposition — Universe Studio as parent; World Studio as entity; studios as a role-gated authoring mode

**Status:** Accepted
**Date:** 2026-06-10
**Deciders:** Stefan
**Tags:** scope:studio · wave:ferd

> Source of truth: universe-discovery Statements 13-14 (Universe Studio as overarching, binding
> frame), 29-30 (Dreamineer specialisations gate studios; World Studio's hard/soft faces), 44
> (World Studio access tiers by scope), and the 2026-06-05 product/ecosystem design locks
> (`docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`).
> Ratified in reconciliation Session B (2026-06-10). Sibling decision: ADR-U025.

---

## Context and problem statement

The repo modelled the studios as three sibling entities — Journey Studio, Universe Studio, Arc
Studio — with `universe-studio/README.md` explicitly excluding Arc, and each studio tied to one
Domain Service. The discovery locked a different shape: **Universe Studio is the overarching
parent** that encapsulates **World Studio, Arc Studio, and Journey Studio** and *keeps the set
coherent* (it is the binding frame, not a fourth sibling); **World Studio** — missing from the
repo entirely — is the worldbuilding entity with a hard and a soft face; and studios are not
products but a **role-gated authoring mode** inside the one experience. *"How should the studio
tier be decomposed so the authoring surfaces match the locked creative frame?"*

## Decision drivers

- The discovery is the single source of truth; Statements 13-14 are explicit and were confirmed
  twice (the 2026-06-05 locks restate them).
- The agent-context cascade rule: the tree mirrors the decomposition.
- The role taxonomy (Statement 29-30): each Dreamineer specialisation gates exactly one studio;
  the entity model should make that mapping legible.
- Studios must be reachable from both equipment profiles per feature keying (ADR-U025), so they
  cannot be modelled as standalone products.

## Considered options

- **Option A** — Keep three sibling studios (status quo); add World Studio as a fourth sibling.
- **Option B** — Universe Studio as parent entity over World/Arc/Journey; studios as a role-gated
  authoring mode; tree nested to match.
- **Option C** — Option B's entity model, but keep the folders flat and express parentage only in
  READMEs.

## Decision outcome

**Chosen option:** Option B, because it is what Statements 13-14 lock, and the cascade rule says
the tree mirrors the decomposition — a flat tree under a parent-entity model would contradict the
very structure it documents.

### The decision, in full

1. **Universe Studio is the parent entity.** It encapsulates three sub-studios — World Studio,
   Arc Studio, Journey Studio — and is both the umbrella label and the **binding frame**:
   coherence across worldbuilding, narrative, and journeys is held at the Universe Studio level.
   It is not a fourth sibling, and it does not exclude Arc.

2. **World Studio is added as an entity, with two faces of one discipline:**
   - **Hard side — Creator:** the physical substrate (3D models, terrain, water, rivers,
     mountains, sky, portals).
   - **Soft side — Anthropologist:** the cultural substrate (cultures, heritage, customs, peoples,
     countries).
   Terrain without culture is a stage set; culture without terrain is a history book — both live
   in World Studio.

3. **Studios are a role-gated authoring MODE inside the one experience, not products.** Entering
   a studio is a permission check against the platform's own group/role mechanism (ADR-U006,
   ADR-U007): **Creator and Anthropologist -> World Studio; Teller -> Arc Studio; Wayfinder ->
   Journey Studio** — the Dreamineer specialisations. The same person moves fluidly between the
   immersed (experiential) and authorial stances; roles are modes, not castes.

4. **Studios surface on both equipment profiles per feature keying (ADR-U025).** World Studio has
   a capture-foot on `sensors` (scan the real world) and its deep edit on `comfortable-canvas`;
   Arc and Journey Studios lean canvas with light mobile review. No studio is bound to a device.

5. **World Studio access tiers by SCOPE (the gate-by-scope law).** Furnishing your own private
   home — the personal-scope slice of World Studio — is open to **every FIM**; authoring the
   shared world is Dreamineer/Creator-gated. The same law that splits governance by scope (the
   community-vs-universe split) splits authoring by scope.

6. **The tree mirrors the decomposition.** The studios tree becomes:
   `docs/studios/universe-studio/{world-studio/, arc-studio/, journey-studio/}`.
   Feature-ID prefixes: **WS** is added for World Studio; **US** is retained for umbrella-level
   (binding-frame) features; JS and AS are unchanged.

### Consequences

- **Positive:** The entity model, the role taxonomy, and the studio surfaces finally agree: one
  studio per Dreamineer specialisation, one parent holding coherence. The Statement-29 gap
  (Anthropologist had no studio) stays closed.
- **Positive:** The personal-scope slice gives every FIM a legitimate first touch of authoring
  (home-creation as a plausible Dreamineer on-ramp — offered in Statement 44, not locked).
- **Negative:** One-time correction ripple (tracked by the Session B conformance register):
  folder moves under `docs/studios/universe-studio/`; a new `world-studio/` entity (README,
  CLAUDE.md, features/); `universe-studio/README.md` rewritten as the parent/binding doc (it
  currently excludes Arc); `docs/studios/README.md` + `CLAUDE.md`, the studio templates, AGENTS.md
  prefixes, `ECOSYSTEM_ANATOMY_V4.svg`, and `DOMAIN_SERVICE_DEPENDENCIES.svg` corrected at
  graduation — the dependency diagram's "Universe Studio writes -> World Model" becomes "World
  Studio writes -> World Model" (the per-DS write arrows otherwise stand).
- **Negative:** Planning study files (`fringeisland-studio-v*`, `journey-studio-v*`,
  `arc-studio-v1`) carry the old sibling model; flagged stale, corrected or annotated at
  graduation. "FringeIsland Studio" as a planning name for world authoring is retired in favour
  of World Studio.
- **Neutral:** Each sub-studio still leans on one Domain Service (World Studio -> DS-1 World
  Model; Arc -> DS-2 Narrative; Journey -> DS-3 Experience); what changes is parentage and
  mode-framing, not those affinities.

## Pros and cons of each option

### Option A — Four flat siblings
- Pros: Smallest structural change; adds the missing World Studio.
- Cons: Contradicts Statements 13-14 twice over — Universe Studio stays a sibling and the binding
  frame has no home; leaves "what keeps the studios coherent?" unanswered.

### Option B — Parent entity + nested tree (chosen)
- Pros: Matches the locks; tree mirrors decomposition (cascade rule); the binding frame is a real
  place where coherence rules live; role-to-studio mapping is legible in the structure itself.
- Cons: git mv churn on the studios tree; deeper paths.

### Option C — Parent entity, flat folders
- Pros: No path churn.
- Cons: The tree silently contradicts the entity model it documents; every reader must hold the
  correction in their head — exactly the drift class the doc-health skill exists to catch.

## Links

- Related: [ADR-U025 — Products as equipment profiles](ADR-U025-products-as-equipment-profiles.md) (sibling decision; equipment-keying of studio surfaces)
- Related: [ADR-U023 — Platform Core / Domain Services decomposition](ADR-U023-platform-core-domain-services-decomposition.md) (Studios row reads through this ADR)
- Related: [ADR-U006 — Universal Group Pattern](ADR-U006-universal-group-pattern.md) / [ADR-U007 — Three-layer permission model](ADR-U007-three-layer-permission-model.md) (the gating mechanism)
- Source: `docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md` (Statements 13-14, 29-30, 44; 2026-06-05 product locks)
- Session record: `docs/planning/sessions/2026-06-05_02_-_SESSION-A-REPO-MAP.md`
