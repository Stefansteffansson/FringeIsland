# ADR-013 — Design system — i18n and a11y as constraints

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland has Swedish roots, a European Foundation, and a global ambition. Members with visual, motor or cognitive differences should be welcomed. Both internationalisation and accessibility are much cheaper to build correctly from the start than to retrofit later.

**Decision:**
i18n and a11y are constraints on how the design system is built — not features to be added later. All user-facing strings are externalised to translation files from day one. Components meet WCAG 2.1 AA as a baseline.

**Why constraints rather than features:**
Retrofitting i18n costs 3-5x more than building it correctly initially. Retrofitting accessibility often requires redesigning components entirely. Treating them as constraints — things that are true of how we build, not things we add — prevents the retrofitting problem.

**Why a11y aligns with the manifesto:**
"Belonging over fitting in" — excluding members with disabilities contradicts this principle directly. Accessibility is not a compliance concern for FringeIsland. It is a values concern.
