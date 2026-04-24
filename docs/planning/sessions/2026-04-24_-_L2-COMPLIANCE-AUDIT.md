# L2 Compliance Audit — ecosystem entity coverage

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-24
**Session type:** State audit (read-only snapshot)
**Status:** Complete
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)

---

## Purpose

Snapshot of the current state of L2 artifacts across every named entity in the FringeIsland ecosystem, as of 2026-04-24. Produced as preparation for Commit 3 (template restructure for `product-specification.md` and `domain-service-spec.md`) — the matrix answers the question "does Commit 3 have any migration scope, or is it purely forward-looking?"

The audit is a pure L2-state check against the current repo. It does not verify content correctness against upstream thinking (that's reconciliation, G-20, downstream of derivation) and does not propose remediation per entity.

## Scope

**Entities audited (23):**
- Products (3): Hub, Gimbal, Game
- Platform Core tiers (4): Infrastructure, Identity, Organisation, Governance
- Domain services (7): World Model, Narrative Engine, Experience Engine, Content, Communication, Discovery, Intelligence
- Studios (3): Journey Studio, Universe Studio, Arc Studio
- Design System (1)
- Verticals (5): Administration, Privacy, Notifications, Observability, Transactions

**Files checked per entity:**
`DESCRIPTION.md`, `SPECIFICATION.md`, `ROADMAP.md` — presence and surface-read state.

**Out of scope:**
Content correctness against Vision / Architecture, completeness of capability inventories (L3 concern), feature coverage (L4 concern), and anything outside the three files above.

## Legend

- **Present** — file exists on disk.
- **Absent** — file does not exist.
- **Populated** — substantive content under current authority.
- **Scaffold** — template structure present with stubbed sections.
- **Stub** — file exists but essentially empty.
- **Pre-2026-04-22** — written in pre-ownership-split form, would need migration.
- **N/A** — not applicable (e.g., state of an absent file).
- **SPEC form** — does the file show evidence of the L2/L3/L4 section split from the 2026-04-22 rewrite?

---

## Matrix

### Products (3)

| Entity | DESCRIPTION.md | SPECIFICATION.md | ROADMAP.md | SPEC form |
|---|---|---|---|---|
| Hub | Present — Populated (4.46 KB, 2026-04-10 session) | Absent | Absent | N/A |
| Gimbal | Absent | Absent | Absent | N/A |
| Game | Absent | Absent | Absent | N/A |

Gimbal has `ios/` and `android/` subdirectories each containing only `README.md` — no top-level or subdirectory entity files. Consistent with the "one product, two implementations" pattern.

### Platform Core (4 tiers)

| Entity | DESCRIPTION.md | SPECIFICATION.md | ROADMAP.md | SPEC form |
|---|---|---|---|---|
| Infrastructure | Absent | Absent | Absent | N/A |
| Identity | Absent | Absent | Absent | N/A |
| Organisation | Absent | Absent | Absent | N/A |
| Governance | Absent | Absent | Absent | N/A |

**Structural finding:** `docs/platform/core/` has no subdirectories for the four tiers. The tiers exist in the architecture (ADR-U023) but have no filesystem presence as entities. When L2 eventually runs on any of them, it will need to create the entity folder first.

### Domain Services (7)

| Entity | DESCRIPTION.md | SPECIFICATION.md | ROADMAP.md | SPEC form |
|---|---|---|---|---|
| World Model | Absent | Absent | Absent | N/A |
| Narrative Engine | Absent | Absent | Absent | N/A |
| Experience Engine | Absent | Absent | Absent | N/A |
| Content | Absent | Absent | Absent | N/A |
| Communication | Absent | Absent | Absent | N/A |
| Discovery | Absent | Absent | Absent | N/A |
| Intelligence | Absent | Absent | Absent | N/A |

**Structural finding:** `docs/platform/domain/` has no subdirectories for the seven services. Same observation as Platform Core — entities exist in the architecture but not on disk.

### Studios (3)

| Entity | DESCRIPTION.md | SPECIFICATION.md | ROADMAP.md | SPEC form |
|---|---|---|---|---|
| Journey Studio | Absent | Absent | Absent | N/A |
| Universe Studio | Absent | Absent | Absent | N/A |
| Arc Studio | Absent | Absent | Absent | N/A |

Each studio has only `README.md` and `features/`.

### Design System (1)

| Entity | DESCRIPTION.md | SPECIFICATION.md | ROADMAP.md | SPEC form |
|---|---|---|---|---|
| Design System | Absent | Absent | Absent | N/A |

`docs/design-system/` has only `README.md` and `CLAUDE.md`.

### Verticals (5)

Verticals do not follow the DESCRIPTION / SPECIFICATION / ROADMAP triple — each vertical is a single `.md` file directly in `docs/verticals/`. Listed here for completeness; their shape is different from the product / service / studio / design-system entities.

| Entity | Single vertical-spec file | State |
|---|---|---|
| Administration | Present (2.33 KB) | Scaffold (§1–§2 populated, §3–§6 stubbed) |
| Privacy | Present (2.55 KB) | Scaffold |
| Notifications | Present (2.18 KB) | Scaffold |
| Observability | Present (2.47 KB) | Scaffold |
| Transactions | Present (2.46 KB) | Scaffold |

All five are consistent with the G-03 gap description ("§3–§6 currently partial — to be refined").

---

## Summary

**Total entities audited:** 23
**Entities with any L2 artifact present:** 6 (Hub DESCRIPTION.md + five vertical spec files)
**Entities with `SPECIFICATION.md` present:** 0
**Entities with `ROADMAP.md` present:** 0

### Key facts for Commit 3

1. **Zero existing `SPECIFICATION.md` files exist anywhere in the repo.** Commit 3 has no migration scope — there are no legacy-form specs to update in place. The template restructure is purely forward-looking: it defines the shape for every future `SPECIFICATION.md`, and the first one written will be in the new form from day one.

2. **Zero existing `ROADMAP.md` files exist anywhere in the repo.** Related but not directly Commit-3-relevant.

3. **Hub `DESCRIPTION.md` is the only existing L2 artifact that lives in the product / service / studio shape.** It's populated and current (2026-04-10 session). It is not a `SPECIFICATION.md` and is not in scope for Commit 3. It remains valid.

4. **The five verticals have their own shape** (single file, not the DESCRIPTION / SPECIFICATION / ROADMAP triple). Commit 3 concerns `product-specification.md` and `domain-service-spec.md` templates — neither applies to verticals. Verticals' scaffold state is tracked as G-03, separately.

5. **The four Platform Core tiers and seven domain services have no filesystem entity folders yet.** When L2 eventually runs on any of them, it will need to create the entity folder first (e.g., `docs/platform/domain/world-model/`) before writing `DESCRIPTION.md` and `SPECIFICATION.md`. Write-scope note for future L2 runs, not a Commit-3 concern.

### Implications for Commit 3's scope

Because no `SPECIFICATION.md` files exist, Commit 3 is strictly a template-authoring activity — two template files get their structure revised to express the L2/L3/L4 section split. No migration notes needed. No existing content to preserve. Clean slate.

## Open questions surfaced

**Template coverage across entity types.** The prompt names two templates: `product-specification.md` and `domain-service-spec.md`. These cover products and domain services. They do not cover Platform Core tiers, studios, or design system. If those entities are also expected to use a `SPECIFICATION.md` file (per the memory's statement that SPECIFICATION.md ownership is split across three levels "for any entity"), then either (a) one of these two templates is reused for them, or (b) additional templates are needed. The contents of `docs/templates/` have not yet been checked; this is the natural first read when Commit 3 begins. Flagging it here so the question is visible in the artifact rather than only in the transcript.

---

*Produced as preparation for Commit 3 — template restructure for `product-specification.md` and `domain-service-spec.md` per the 2026-04-22 decomposition skill refactor. See `2026-04-22_-_DECOMPOSITION-SKILL-REFACTOR.md` for the session that locked the L2/L3/L4 ownership split.*
