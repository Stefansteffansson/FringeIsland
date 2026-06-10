# Arc Studio

**Entity:** Studio (child of [Universe Studio](../README.md), per [ADR-U026](../../../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md))
**Gate:** Teller — entering Arc Studio is a permission check against the Teller authority, a Dreamineer specialisation (see the [roles core](../../../ecosystem/universe/roles/README.md))
**Feature ID prefix:** `AS`
**Writes to:** Narrative Engine (DS-2)
**Wave:** Urd — Arc Studio is Urd-wave scope and is not in active development before then.

The full lifecycle environment for **stories** — design, deploy, manage, retire. Arc Studio is
where Tellers shape narrative arcs: the season-and-episode structure that gives journeys their
long-form rhythm, and the **character layer of NPCs** — body and culture are authored in
[World Studio](../world-studio/); Arc Studio adds the named character when a story reaches for an
inhabitant.

Like every studio, Arc Studio is a role-gated authoring mode inside the one experience, not a
product (ADR-U026). Its surface leans `comfortable-canvas` with light mobile review (ADR-U025).

## Structure

- `features/` — Feature specifications using `FEAT-AS*` IDs (Shape Up pitch + BDD stories)
- `DESCRIPTION.md` — Studio identity _(to be written using `../../../templates/studio-description.md`)_
- `SPECIFICATION.md` — Build spec _(to be written)_
