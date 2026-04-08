# Session Bridge — Wave Redistribution + Roadmap Coverage Audit

**Date:** 2026-04-07 / 2026-04-08
**Type:** Planning / documentation
**Status:** Closed
**Next session focus:** Multi-product challenge (web / iOS / Android / game) — the missing wave roadmaps depend on this conversation

---

## Summary

Completed triage of `WAVE_REDISTRIBUTION.md` — wave assignments made for all ~25 previously-TBD items across DEFERRED.md, ROADMAP.md, VISION.md, PRODUCTS_AND_PLATFORM.md, and ARCHITECTURE_ANATOMY.md. Applied edits to source files. Archived the triage doc. Ran a roadmap coverage audit to verify nothing was silently dropped.

---

## Key Decisions

### Items pulled back into Ferd 1.6 (surprise decision)

- **Group-to-Group Relationships UI** → Ferd Wave 1 (Step 16 in SPRINT.md)
- **Subgroups / Groups-Join-Groups UI** → Ferd Wave 1 (merged into Step 16)
- **D11 circularity prevention trigger** → Ferd Wave 1 (Step 15, **hard prerequisite** for Step 16)

### Wave assignments for re-deferred items

| Wave | Items |
|---|---|
| **Eid** (Wave 2) | Journey Creation Granularity, Journey Versioning, Journey Discovery & Search, Whisp Encounter Phenomenology, Whisp Practical UI |
| **Heim** (Wave 4) | Dynamic Journey Path Changes, FringeIsland Universe Design |
| **Brim** (Wave 5) | AR Void Visualization, Mobile Apps (iOS/Android) |
| **Urd** (Beyond) | Three Worlds UI, Seasons/Episodes delivery mechanics, NPC Behaviour Authoring, Respawning Mechanics, Advanced Analytics, Monetization |
| **Beyond Urd** | Endowment, Console distribution, VR/AR Headsets, the Game (Unreal) |

### Load-bearing scope clarification: Hamn

**Hamn (Wave 3) = design system + accessibility (WCAG 2.1 AA+) + UX/UI redesign of the generic web app interface.**

Hamn does **NOT** define Three Worlds visual identity — that is Urd-level work. This clarification drove many items out of what was previously assumed to be "Hamn" and into Urd/Heim/Brim. Saved to `memory/hamn_scope.md`.

---

## Files Changed

| File | Change |
|---|---|
| `docs/products/ferd/planning/DEFERRED.md` | v1.7 → v1.8; 17 items updated, 2 deleted (groups-join-groups), 1 split (FringeIsland universe vs AR void) |
| `docs/products/ferd/planning/ROADMAP.md` | Replaced pending-redistribution placeholder with "Waves 2–6: Post-Ferd Wave Arc" section pointing to DEFERRED.md |
| `docs/universe/vision/VISION.md` | Endowment → Beyond-Urd; 5 wave headers given scope summaries; scope boundaries rewritten |
| `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md` | Console + VR/AR → Beyond Urd; 5 wave headers updated; Game "Beyond-Urd ambition" |
| `docs/universe/architecture/ARCHITECTURE_ANATOMY.md` | Frontends table updated (iOS/Android = Brim, Game = Beyond Urd); Hamn glossary entry rewritten; ~14 scattered Hamn references updated |
| `SPRINT.md` | Steps 15+16 added (D11 trigger + groups-join-groups UI); Hamn M3 backlog cleaned; stale WAVE_REDISTRIBUTION pointer replaced with archive path |
| `docs/products/WAVE_REDISTRIBUTION.md` → `docs/products/_archive/2026-04-07-WAVE_REDISTRIBUTION-completed.md` | Archived with Final Decisions Summary table |
| `memory/hamn_scope.md` | NEW — project memory for Hamn scope boundary |
| `memory/MEMORY.md` | Added Hamn scope topic file entry |

---

## Roadmap Coverage Audit — Findings (NOT actioned; next session)

Only Ferd has a `ROADMAP.md`. Post-Ferd waves use `INDEX.md` + `planning/study/*.md` (study questions, not commitments).

**Coverage gaps — deferred items not named in their assigned wave's planning docs:**

- **Eid (5 items):** Journey Creation Granularity, Journey Versioning, Journey Discovery & Search not named in `journey-studio-v1.md`. Whisp Phenomenology + Practical UI only thematic.
- **Heim:** Dynamic Journey Path Changes missing from `journey-studio-v2.md`. FringeIsland Universe Design covered thematically.
- **Brim:** Mobile apps ✅ covered. AR Void Visualization only partial (void.md lacks AR overlay framing).
- **Urd (5 of 6 missing):** Advanced Analytics, Monetization, NPC Authoring, Respawning, Three Worlds UI — none mentioned. Only Seasons/Episodes loosely via `arc-studio-v1.md`.
- **Ferd ROADMAP.md:** Does not explicitly call out Steps 15-16 (groups-join-groups UI) — only generic "see SPRINT.md".

**Recommended fixes (deferred to next session):**
1. Create Urd `DEFERRED.md` or stubs for 5 missing items
2. Extend Eid study files to name deferred items
3. Update Ferd ROADMAP.md to call out Steps 15-16

---

## Next Session Hook

**Topic:** The multi-product challenge — FringeIsland is not one product but a family (web platform, iOS app, Android app, game, physical products, experiences). This is the conversation that will shape:

- How to structure per-wave roadmaps when each wave touches multiple products
- Whether each product needs its own roadmap (per product × per wave matrix?)
- How to reconcile `PRODUCTS_AND_PLATFORM.md` product-family framing with wave-based planning
- The coverage gaps above (Eid, Urd, Brim) are symptoms of this unresolved question

The roadmap coverage audit findings are the concrete entry point.
