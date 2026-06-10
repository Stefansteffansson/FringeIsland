# {Product name} — Description

---
slug: {hub | gimbal}
owner: products/{slug}
equipment_profile: {canvas | senses}  # The Hub = the canvas surface, The Gimbal = the senses surface (ADR-U025)
status: {concept | active | maintained | sunset}
last_updated: YYYY-MM-DD
tier: Surfaces
tags: [product:{slug}]
feature_prefix: {H | G}  # H=Hub, G=Gimbal — shell features only (ADR-U025); used for FEAT-*.md file naming
---

> The outward-facing identity of a product surface. This document is for someone who has *never heard of* this product. It explains what it is, who it's for, and where its boundaries are. Build details belong in `SPECIFICATION.md`.

---

## What it is

One paragraph. If a stranger reads only this paragraph, they should be able to describe the product correctly to a friend.

## Who it's for

The primary persona, in their own words. What they're trying to do in their life, not what features they want.

## What it isn't

Adjacent things this product is *not*. ("We are not a social network. We are not a course platform. We are not a game.") Sharper boundaries make sharper decisions.

## Why it exists

The conviction. Why this product, and not the dozen alternatives the user could choose? Tie back to `../../ecosystem/VISION.md`.

## How it relates to the ecosystem

- **Domain services it consumes:** {world-model | narrative | journeys | content | communication | discovery | intelligence}
- **Studios it depends on:** {Universe Studio (US, parent/binding frame) | World Studio (WS) | Arc Studio (AS) | Journey Studio (JS)}
- **Sibling product it shares users with:** {Hub (H) | Gimbal (G)} — the two equipment profiles of the one experience (ADR-U025)
- **Where it sits in the wave arc:** {ferd | eid | hamn | heim | brim | urd — and what evolves in each}

## Promises

Three to five things this product commits to its users. Not features — commitments. ("We will never spam you." "Your data is yours and exportable." "You can leave a journey at any step without losing your progress.")

## Anti-promises

Things it explicitly refuses to do, even if users ask. Enables faster prioritisation later.

---

**Companion docs:** `SPECIFICATION.md` (build spec) · `ROADMAP.md` (NOW/NEXT/LATER)
