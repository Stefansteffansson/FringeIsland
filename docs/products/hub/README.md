# The Hub

**The canvas surface** of the one FringeIsland experience — the equipment profile built on screen room, keyboard, precision input, and file system (ADR-U025). It ships today as the web app: where FIMs explore journeys, manage groups, reflect, and connect, with the refinement and depth a desk affords. **The active product in the Ferd wave.**

**Stack:** Next.js 16.1 App Router, TypeScript, Tailwind CSS, Supabase
**Feature ID prefix:** `H`

## Structure

- [`DESCRIPTION.md`](./DESCRIPTION.md) — Outward-facing product identity (primary identity document)
- [`SPECIFICATION.md`](./SPECIFICATION.md) — Inward-facing build spec (L2 and L3 sections populated; L4 section pending)
- [`tours/`](./tours/) — Post-§L3 reader tours: [`HUMAN.md`](./tours/HUMAN.md) (uncredentialed audience) and [`TECHNICAL.md`](./tours/TECHNICAL.md) (contributor prerequisite)
- `features/` — Feature specifications using `FEAT-H*` IDs (retroactive `6-done` specs being written first to capture already-shipped Hub functionality)
- `ROADMAP.md` — Product slice of NOW/NEXT/LATER _(to be written)_

## Architecture

The Hub consumes Platform Core (Infrastructure, Identity, Organisation, Governance) and Domain Services (World Model, Narrative Engine, Experience Engine, Content, Communication, Discovery, Intelligence) **via the Platform API** — never by talking to the database directly. See `../../platform/README.md` and ADR-U009 (API-first frontend-agnostic) for details.
