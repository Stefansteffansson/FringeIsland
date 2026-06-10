# Journey Studio

**Entity:** Studio (child of [Universe Studio](../README.md), per [ADR-U026](../../../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md))
**Gate:** Wayfinder — entering Journey Studio is a permission check against the Wayfinder authority, a Dreamineer specialisation (see the [roles core](../../../ecosystem/universe/roles/README.md))
**Feature ID prefix:** `JS`
**Writes to:** Journeys (DS-3) — Journey Studio is the authoring + management surface; Journeys is the runtime that delivers journeys to FIMs.

The full lifecycle environment for **journeys** — design, deploy, manage, retire. Wayfinders use
Journey Studio to craft journeys — alone / pairs / group — and to manage published journeys over
time. Journeys declare their required equipment at authoring time (ADR-U025), so each journey
lights up on any device whose equipment matches.

Like every studio, Journey Studio is a role-gated authoring mode inside the one experience, not a
product (ADR-U026). Its surface leans `comfortable-canvas` with light mobile review (ADR-U025).

## Structure

- `features/` — Feature specifications using `FEAT-JS*` IDs (Shape Up pitch + BDD stories)
- `DESCRIPTION.md` — Studio identity _(to be written using `../../../templates/studio-description.md`)_
- `SPECIFICATION.md` — Build spec _(to be written)_
