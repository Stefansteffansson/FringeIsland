# The Hub

The full browser-based FringeIsland experience. The web platform where FIMs explore journeys, manage groups, reflect, and connect. **The active product in the Ferd wave.**

**Stack:** Next.js 16.1 App Router, TypeScript, Tailwind CSS, Supabase
**Feature ID prefix:** `H`

## Structure

- [`DESCRIPTION.md`](./DESCRIPTION.md) — Outward-facing product identity (primary identity document)
- [`SPECIFICATION.md`](./SPECIFICATION.md) — Inward-facing build spec (L2 sections populated; L3/L4 sections pending dedicated authoring sessions)
- `features/` — Feature specifications using `FEAT-H*` IDs (retroactive `6-done` specs being written first to capture already-shipped Hub functionality)
- `ROADMAP.md` — Product slice of NOW/NEXT/LATER _(to be written)_

## Architecture

The Hub consumes Platform Core (Infrastructure, Identity, Organisation, Governance) and Domain Services (World Model, Narrative Engine, Experience Engine, Content, Communication, Discovery, Intelligence) **via the Platform API** — never by talking to the database directly. See `../../platform/README.md` and ADR-U009 (API-first frontend-agnostic) for details.
