# Session Bridge — Doc Restructure Phases 1–3 + Product Naming

**Date:** 2026-04-08/09
**Session type:** Documentation restructuring + ecosystem architecture
**Status:** Phases 1–3 complete. Phase 4 (content migration) pending.
**Participants:** Stefan (Product Owner) + Claude (Architectural Advisor)

---

## Session summary

This session executed the first three phases of a four-phase documentation restructure, transforming FringeIsland's docs from a single-product layout into a multi-product ecosystem structure. The session also included an ecosystem architecture design session that produced the Anatomy v2 proposal, and locked the product naming taxonomy.

The restructure preserves all existing documentation in `docs/old_*/` (322 files with full git history) while building a new ecosystem layout alongside it. Phase 4 (content migration) will move material from `old_*/` into the new structure.

---

## What was decided

- **Park, don't delete** — all existing docs renamed to `docs/old_*/` via `git mv`, preserving history. *Locked.*
- **Ecosystem layout** — `docs/{ecosystem,products,studios,platform,architecture,planning,research,design-system,templates,verticals}/`. *Locked.*
- **Product names** — The Hub (web), The Gimbal (mobile, one product, iOS + Android), The Game (placeholder). Folder/tag short forms: `hub`, `gimbal`, `game`. Gimbal sub-tags: `gimbal:ios`, `gimbal:android`. *Locked.*
- **Waves are thematic focus buckets** — full overlap permitted. Earlier waves prioritised but not gated. WIP limits constrain total active work. Revoked earlier "hard cut on Build" rule. *Locked.*
- **PROCESS.md is canonical** — the single reference for how work flows (maturity pipeline, cadence, DoR, DoD, backlog tagging). *Locked.*
- **13 templates** — all referenced from PROCESS.md §6, living in `docs/templates/`. *Locked.*
- **5 vertical scaffolds** — V1 Administration, V2 Privacy, V3 Notifications, V4 Observability, V5 Transactions. Phase 3 scaffolds; real content in Phase 4. *Locked.*

---

## What was produced

### Commits (12 total, `aff1f33..8b89f73`)

- `a3b5704` — rename products/implementation/universe/INDEX.md to `old_*`
- `e4d405f` — rewrite all 1092 references repo-wide
- `a84c338` — Phase 1: scaffold new ecosystem structure
- `5bcd13b` — Phase 2: write PROCESS.md
- `05caa18` — fix wave-name leakage (ferd/hamn as product names)
- `2bf130b` — PROCESS.md patch: wave overlap rule + wave tags + wave-completion trigger
- `1196bef` — Phase 3: 13 templates + 5 vertical scaffolds
- `04b1013` — commit parked session bridges + SVGs
- `521597c` — save pre-Phase-4 status report
- `b36d2ab` — revoke wave hard-cut; waves as thematic focus buckets
- `49cda3e` — lock product names (The Hub, The Gimbal, The Game)
- `8b89f73` — Phase 4 handoff: migration inventory + final state snapshot

### Key files created/modified

- `docs/planning/PROCESS.md` — canonical way of working (256 lines)
- `docs/templates/` — 13 templates + README index
- `docs/verticals/` — 5 vertical scaffolds + README
- `docs/products/README.md` — product descriptions (Hub, Gimbal, Game)
- `docs/architecture/decisions/PENDING.md` — queued ADR: wave model
- `docs/TMP/2026-04-08-PHASE-4-PRECHECK.md` — pre-Phase-4 status snapshot
- `docs/TMP/2026-04-09-PHASE4-HANDOFF.md` — 322-file migration inventory
- `CLAUDE.md` — restructure phase tracker (Phases 1–3 checked off)
- `docs/old_products/ferd/sessions/2026-04-08-ECOSYSTEM-ARCHITECTURE-SESSION-BRIDGE.md` — ecosystem anatomy v2 proposal

---

## What is still open

- **Phase 4: content migration** — move material from 322 parked `old_*/` files into the new structure. Needs a fresh mapping pass using the handoff inventory.
- **`docs/TMP/` triage** — 11 untracked planning/research files need decisions (promote, archive, or delete)
- **Stale path** in `templates/domain-service-spec.md:38` — references `../../old_products/ferd/sessions/...`, will update when that file migrates
- **36 broken links** in live docs — all expected (template placeholders + not-yet-created Phase 4 files)
- **Pending ADR** — "Wave model: thematic focus buckets" queued in `docs/architecture/decisions/PENDING.md`
- **`SPRINT.md` and `PROJECT_STATUS.md`** — planned to move to `docs/old_planning/` in Phase 4
- **`folders_and_files.md`** at repo root — unclear purpose, review in Phase 4

---

## For the next session

1. Read `docs/TMP/2026-04-09-PHASE4-HANDOFF.md` — the complete migration inventory
2. Read `docs/TMP/2026-04-08-PHASE-4-PRECHECK.md` — the pre-Phase-4 health check
3. Phases 1–3 are LOCKED — the scaffold, PROCESS.md, templates, and verticals are done
4. Product names are LOCKED — The Hub (hub), The Gimbal (gimbal), The Game (game)
5. Wave model is LOCKED — thematic focus buckets, full overlap, WIP limits constrain
6. Phase 4 is the big migration — build a fresh `old_*` → new mapping before moving anything
7. Stefan's standing instruction: "do not take decisions just to make life easy now but it might hinder us later" — design for 50+ contributors

---

*Session complete. Doc restructure Phases 1–3 done. Phase 4 handoff prepared.*
