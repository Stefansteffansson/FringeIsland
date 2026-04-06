# Minimal Design Foundation

**Wave:** Eid
**Category:** Architecture
**Status:** 🟡 Needs study

---

## What Is This

A minimal set of design tokens and core UI primitives that provide a
consistent visual foundation for the platform during development.
This is not the full design system — that comes in Hamn — but it
prevents the costly rework of building Eid's UI without any shared
design language at all.

---

## Why We Are Building This

Building UI across Ferd and Eid without any design foundation creates visual
inconsistency and technical debt that makes the Hamn redesign significantly
more expensive. A minimal foundation now — colours, typography, spacing scale,
core component shells — reduces that cost meaningfully.

---

## How It Is Supposed to Work

- A core token set is defined: colour palette, typography scale, spacing scale, border radii
- A small set of base UI components is established: button, input, card, layout shell
- These tokens and components are used consistently across all Eid UI work
- They are explicitly designed to be extended and replaced by the full design system in Hamn
- No design system documentation, accessibility audit or full component library is required here — that is Hamn's job

---

## Scope Boundary

| In scope for Eid | Out of scope — belongs to Hamn |
|-----------------|-------------------------------|
| Core colour tokens | Full brand identity system |
| Typography scale | Accessibility audit |
| Spacing scale | Full component library |
| 4–6 base components | Design documentation site |
| Dark/light mode tokens | UX/UI redesign |

---

## Open Questions

- [ ] What CSS/styling approach is being used — Tailwind, CSS modules, styled-components?
- [ ] Is there an existing partial design language in the codebase to build on or start fresh?
- [ ] What are the non-negotiable brand colours and typography choices at this stage?
- [ ] How are design tokens stored and shared — CSS variables, Tailwind config, a token file?
- [ ] What is the minimum component set needed to build Journey Studio v.1 and the Whisp concept UI?

---

*Status: 🟡 Needs study*
