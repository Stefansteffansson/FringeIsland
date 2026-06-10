# World Studio

**Entity:** Studio (child of [Universe Studio](../README.md), per [ADR-U026](../../../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md))
**Status:** Entity established 2026-06-10 (reconciliation Session B); features await decomposition
**Feature-ID prefix:** WS

---

## What World Studio is

World Studio is where the FringeIsland world itself is authored — how it looks, how it works, its
places, lores, and peoples. It is one discipline with two faces (universe-discovery Statement 30):

- **The hard side — Creators:** the physical substrate. 3D models, terrain, water, rivers,
  mountains, sky, portals.
- **The soft side — Anthropologists:** the cultural substrate. Cultures, heritage, customs,
  peoples, countries.

Terrain without culture is a stage set; culture without terrain is a history book. The two faces
are interdependent — a river decides where cities grow; a culture decides whether the river is
sacred — and both live here.

World Studio also authors the first two layers of every NPC (body and culture); the character
layer is added in Arc Studio when a story reaches for an inhabitant (see the
[beings core](../../../ecosystem/universe/beings/README.md)).

## Access — gated by scope, not by status

World Studio access tiers by **scope** (Statement 44, ADR-U026):

- **Personal scope — open to every FIM.** Furnishing your own private home (the inviolable ball)
  uses the personal-scope slice of World Studio. This is every FIM's first touch of authoring —
  and a plausible on-ramp toward Dreamineer authority (offered in the discovery, not locked).
- **Shared scope — Dreamineer-gated.** Authoring the commons, the village, the wider world
  requires the Creator or Anthropologist authority (a group/role permission, like every studio
  gate).

## Equipment

Like every studio, World Studio is a role-gated authoring mode inside the one experience — not a
product. Its features key to equipment (ADR-U025):

- **Capture-foot on `sensors`:** scan a real object or place through the Gimbal — the world's raw
  material is gathered out in the world.
- **Deep edit on `comfortable-canvas`:** terrain, culture, and model work happens at the canvas.
  The Gimbal-capture -> Hub-refine pipeline runs through World Studio.

## Relationships

- **Parent:** Universe Studio — the binding frame; coherence across World/Arc/Journey is held there.
- **Siblings:** Arc Studio (stories grown from this world's soil), Journey Studio (paths walked
  through it).
- **Writes to:** DS-1 World Model (the domain service this studio's output lives in).
- **Canonical grounding:** the [cosmology core](../../../ecosystem/universe/cosmology/README.md)
  (what the world IS), the [roles core](../../../ecosystem/universe/roles/README.md) (who may
  author it).

## Features

See [features/](./features/) — to be populated by decomposition (prefix WS). Known seeds: the
personal-scope home-furnishing slice; the sensors capture-foot; shared-world terrain and culture
authoring.
