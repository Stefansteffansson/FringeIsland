# Universe Studio

**Entity:** Studio parent ([ADR-U026](../../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md))
**Status:** Restructured as the parent entity 2026-06-10 (reconciliation Session B)
**Feature-ID prefix:** `US` — umbrella-level (binding-frame) features only; the child studios carry their own prefixes

---

## What Universe Studio is

Universe Studio is the overarching authoring entity: the umbrella over the three studios AND the
**binding frame** — the place where coherence across worldbuilding, narrative, and journeys is
held. It is not a fourth sibling, and it excludes none of the three. Rules that keep the set
coherent — canon constraints, cross-studio consistency, shared authoring conventions — live at
this level; everything specific to one studio lives in that child.

## The three children

- **[World Studio](./world-studio/)** — the world itself: physical substrate (Creators) +
  cultural substrate (Anthropologists). Writes to DS-1 World Model. Prefix `WS`.
- **[Arc Studio](./arc-studio/)** — stories: seasons and episodes; the NPC character layer.
  Tellers. Writes to DS-2 Narrative Engine. Prefix `AS`.
- **[Journey Studio](./journey-studio/)** — journeys: alone / pairs / group. Wayfinders. Writes
  to DS-3 Experience Engine. Prefix `JS`.

## Mode, not product

Studios are a role-gated authoring MODE inside the one experience (ADR-U026). Entering a studio
is a permission check against the platform's group/role mechanism (ADR-U006, ADR-U007):
**Creator and Anthropologist -> World Studio; Teller -> Arc Studio; Wayfinder -> Journey
Studio** — the Dreamineer specialisations (see the
[roles core](../../ecosystem/universe/roles/README.md)). The same person moves fluidly between
the immersed and authorial stances. World Studio access additionally tiers by scope: own home is
open to every FIM; the shared world is Dreamineer-gated.

## Equipment

Studio surfaces key to equipment, never devices (ADR-U025): World Studio has a capture-foot on
`sensors` (scan the real world through the Gimbal) and its deep edit on `comfortable-canvas`;
Arc and Journey Studios lean canvas with light mobile review.

## Structure

- `world-studio/`, `arc-studio/`, `journey-studio/` — the three child entities
- `features/` — umbrella-level feature specs using `FEAT-US*` IDs (binding-frame features only)
- `DESCRIPTION.md` — Studio identity _(to be written using `../../templates/studio-description.md`)_
- `SPECIFICATION.md` — Build spec _(to be written)_
