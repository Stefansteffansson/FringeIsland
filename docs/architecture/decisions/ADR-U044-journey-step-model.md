# ADR-U044: Journey step model — the Journey Designer grammar as the schema's DNA

**Status:** Accepted (nod 2026-07-07)
**Date:** 2026-07-07
**Deciders:** Stefan + Claude (the Journeys-area kickoff design session — this is the step-type specification session ADR-U008 mandated)
**Tags:** scope:platform-domain (DS-3 Journeys) · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

Three step vocabularies coexisted, unreconciled (DS-3 `journeys.md` §8 Q1 — "triply motivated"):

1. **ADR-U008's Tier-1 step types** — narrative, reflection, assessment, choice, activity, journal, checklist — with the binding constraint: a discriminator on a shared base structure, data-driven, never a table per type.
2. **The six content families** — Witness, Reflect, Decide, Act, Encounter, Rest — named in the narrative core's (unwritten) journeys sub-page line.
3. **The realized model** — a sealed TS union `{content, activity, assessment}` over steps stored as JSONB `content.steps[]` inside the journey row.

ADR-U008 mandated a step-type specification session before significant journey-content implementation. The Journeys area (Hub v2 Phase 3) cannot build its player cycle without it. This ADR is that session's outcome.

**The recovered prior work.** A kickoff dig recovered the **Journey Designer session of 2026-03-20** ([`docs/planning/sessions/2026-03-20-SESSION-01-journey-designer.md`](../../planning/sessions/2026-03-20-SESSION-01-journey-designer.md)) — a full-day design session that had already built and stress-tested the journey vocabulary: the **universal step grammar (Present → Ask → Change)**, the Journey → Node → Beat containment model, the beat record (order, required, repeatable, unlocked_by, content_family, content_type, ask_type, change_type), beat sequencing modes (linear | open | gated), **step-instances as the lived records** (created per engagement; a repeat creates a new instance; a skip is a recorded absence), the four route types, the six content families, and a pacing/duration/completion model. Its session-status table marks all of this Defined/Resolved — but the session was never absorbed into the canon cores, and the DS-3 derivation did not consume it.

The realized legacy model turned out to be trivially simple: 47 seeded steps across 8 journeys, each a flat five-field object (`id`, `title`, `type`, `duration_minutes`, `required`), always required, always linear, with `type` driving only an icon, a label, and a button verb — no structural divergence. Migration into any richer model is mechanical.

## Decision drivers

- ADR-U008 (data-driven step kinds; shared base; the canonical extension surface) and ADR-U018 (no sealed vocabularies) bind.
- The per-traveller progress grain (DS-3 invariants 4 + 8; Hub JRN-9/16/17) needs **step-addressable** progress — a JSONB blob cannot be pointed at cleanly.
- DS-4 Content has zero substrate — full content externalisation is not buildable this area; the forward shape (steps reference DS-4 blocks opaquely by ID) is already decided (DS-3 §8 Q7, resolved 2026-06-10).
- Substantial, stress-tested design work already exists (2026-03-20); inventing a third model would discard it.

## Considered options

- **Option A — full Node/Beat two-level model now** (journeys → nodes → beats), as designed.
- **Option B — flat step rows now, Designer-grammar-compatible**: one step row = a single-beat node; the beat record's fields become the step columns; Node grouping and multi-beat richness arrive later, additively.
- **Option C — keep JSONB steps, registry-validate the `type` values** (minimal change).

## Decision outcome

**Chosen option: B** — ratified by Stefan 2026-07-07.

1. **The Journey Designer session (2026-03-20) enters the authority chain** for all journey-structure work, now and forward: DS-3's spec, the FEAT-PD/FEAT-H specs, and the eventual narrative-core `journeys.md` sub-page reference it as the source design. Scope limit: this ADR adopts its **journey grammar** only — the session's *world* vocabulary predates the 2026-06 canon reconciliations (the Mist lifecycle, the worlds topology, the Whisp as the FIM's inner dialogue voice), so cosmology reads always defer to the canon cores under `docs/ecosystem/universe/`.
2. **Steps become rows.** A `journey steps` table (exact DDL at FEAT-PD time, through the schema gate), one row per step, ordered — each row is a single-beat node in the Designer model. Columns derive from the beat record: order, required, repeatable, unlocked-by, content family, step kind, duration, and an inline **content payload** (JSONB) tagged `pending-DS-4` — the externalisation to opaque DS-4 block references later becomes a payload-column swap, not a remodel (the ADR-U016 tagged-disposition pattern).
3. **Step kinds and content families are registry tables** — data-driven, seed-defined, extensible without schema change (ADR-U008/U018 honored). ADR-U008's Tier-1 types land as seed registry rows: preset bundles of (content family + ask/change semantics) — e.g. *journal* = family Reflect, ask "write an entry"; *choice* = family Decide. The legacy three-value union maps mechanically (content → Witness/read; activity → Act/do; assessment → per-journey Reflect or Decide/respond) and the 47 seeded steps migrate under that mapping. The sealed TS union dies.
4. **Per-traveller progress records ARE the Designer's step-instances.** One row per traveller per step engagement (grain: enrolment × traveller personal group × step), realizing the universal grammar's minimum change — *"this traveler has now had the experience of passing through this step."* A repeat creates a new instance; skips are derivable as recorded absence. RLS: traveller-own rows; Steward/Guide visibility is consent-gated (DS-3 invariants 4 + 8 — never comparative, enforced at the database layer). The per-enrolment `progress_data` JSONB demotes to summary/cache. This is the progress-grain decision (kickoff board J-S2) and the step-model decision converging on one structure.
5. **Recorded as forward shape, deliberately not built now:** the Node/Beat two-level grouping (arrives additively by grouping steps under nodes), Roads as first-class objects, sequencing modes beyond linear (the mode field is data, only `linear` is exercised), the pacing-arc and duration models, completion types beyond last-step, and the `integrated` journey state. Nothing in the chosen schema forecloses them — that is the selection criterion, not an accident.

### Consequences

- The J-B (player) cycle's schema follows this ADR; JRN-18's "every foundational step type" = the seeded registry rows.
- DS-3 `journeys.md` §8 Q1 resolves to this ADR (recorded in that file in the same batch).
- The route-type vocabulary reconciliation (`journey_type` CHECK values vs the four canon route types) stays open — it follows the registry pattern this ADR establishes, at FEAT-PD time (kickoff board J-D1).
- Journey authoring stays out of scope (Journey Studio, ADR-U026); the registries are seed-defined until an authoring surface exists.

## Links

- [Journey Designer session, 2026-03-20](../../planning/sessions/2026-03-20-SESSION-01-journey-designer.md) — the adopted grammar (the authoritative design record)
- ADR-U008 (step-type extensibility — the mandate this session discharges) · ADR-U016 (tagged dispositions) · ADR-U017 (journeys as content templates) · ADR-U018 (no sealed vocabularies)
- DS-3 spec: [`docs/platform/domain/journeys.md`](../../platform/domain/journeys.md) (§2 Step entity, §8 Q1, invariants 4 + 8)
- Kickoff plan: [`docs/planning/hub-v2/phase-3-journeys-completion-plan.md`](../../planning/hub-v2/phase-3-journeys-completion-plan.md) (design sessions J-S1/J-S2)
- Theory U research report ([`docs/research/Theory_U_Research_Report.md`](../../research/Theory_U_Research_Report.md)) — the documented real-world development-journey shape behind the design
