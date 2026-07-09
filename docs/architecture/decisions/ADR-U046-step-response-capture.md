# ADR-U046: Step-response capture and review substance — the lived record realizes the Ask

**Status:** Accepted (nod 2026-07-09)
**Date:** 2026-07-09
**Deciders:** Stefan + Claude (the J-O6 design session at the J-D→J-E boundary — the slot chosen at the J-C retro)
**Tags:** scope:platform-domain (DS-3 Journeys) · scope:product (Hub A-JRN) · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

J-C shipped review mode honest but thin, and Stefan's live walk located the root in the substrate, not the UI: the step grammar's **Ask collects nothing**. A Reflect step shows its prompt and a completion button; the traveller's actual reflection lives nowhere, so review can only re-show journey content plus timestamps. Routed as **J-O6** (J-C retro §3) with a never-silently-dropped line on the area-gate exit checklist; the design session slot chosen was the J-D→J-E boundary — the onboarding journey's content being the natural first carrier of authored takeaways.

Three candidate substance sources were named at routing, not mutually exclusive: **(a)** the traveller's own responses, **(b)** authored conclusions, **(c)** DS-7 synthesis. The questions the session had to settle: where captured responses live, how the asking behaves, who may ever read a response, how much authored-conclusion shape to build now, what happens to synthesis, and where the work builds relative to J-E and the J-O3 area gate.

## Decision drivers

- **ADR-U044 §4** already names per-traveller step-instances "the lived records" — *"this traveler has now had the experience of passing through this step"* — and the rows exist since J-B with traveller-own RLS.
- **DS-3 invariants 3, 4, 8** bind: voluntariness (no step advances without the traveller's action), developmental privacy (reflections private by default; Steward/Guide non-visibility), no comparative surface. Responses are the most personal data in the system.
- **The onboarding walker is a Mist** (ADR-U045): any capture home must work for an anonymous entrant. FEAT-PD001's `create_journal_entry` is **FIM-only** (a Mist receives 42501) — the Journal cannot be the capture home for the one journey a Mist can walk.
- **DS-4 has zero substrate**; ADR-U044's inline content payload (tagged `pending-DS-4`) is the established pattern for authored content until externalisation.
- The privacy canon's sharing model: *"you can share your garden without sharing your journal."* J-D's `journey_progress_visibility` consent was framed over progress facts.

## Considered options

Capture home (Q1): **A** — response payload on the per-traveller step-instance; **B** — Journal entries linked to step-instances (PD001/DS-7); **C** — a new dedicated responses table.
Build placement (Q6): **fold into J-E** · **a dedicated J-F cycle before the area gate** · **post-area with a named owner**.

## Decision outcome

Ratified by Stefan, 2026-07-09 (all six board recommendations accepted):

1. **Responses live on the step-instance — the ADR-U044 §4 lived record realized (option A).** A response payload on the per-traveller step-instance row (exact DDL at FEAT-PD time, through the schema gate). Everything the lived record already has comes free: traveller-own RLS, transcendence carry-over (personal-group-keyed), and forgetting via the ADR-U031 ephemerality cascade. The Journal is **rejected as the home** — `create_journal_entry` is FIM-only while the onboarding walker is a Mist, and it would put the capture across the DS-3/DS-7 service boundary. A "copy to Journal" affordance may come later; it is not the home. A new table (option C) duplicates a grain that already exists.
2. **Responding is always optional.** Capture-if-given, never a completion gate — a step completes with or without a response (invariant 3, voluntariness; a mandatory answer turns reflection into a toll gate and buys junk text). Responses are editable while the enrolment is active; a frozen enrolment's responses are read-only (JRN-14's semantics extend, no new rule). A per-step "response required" flag is possible future *data* — deliberately not built now.
3. **Responses are private-only in Ferd.** Response content is readable by exactly one principal: the traveller who wrote it. J-D's `journey_progress_visibility` consent covers **progress facts, never response content** — an opted-in traveller shares "step 4 completed", never what they wrote at step 4. No Steward, Guide, group member, or admin read exists. Any future response-sharing surface is its own design decision with its own consent surface — never a rider on the progress toggle. Export rides FEAT-H010's already-flagged step-instances section.
4. **Authored conclusions build minimal.** A journey-level takeaway plus an optional per-step takeaway land as **fields in the existing inline content JSONB** (the ADR-U044 `pending-DS-4` pattern — they migrate with everything else when DS-4 externalises). Seed-defined, no authoring UI (Journey Studio out of scope, ADR-U026). **The placeholder onboarding journey seeds them at J-E** — the natural first carrier, as the J-C retro anticipated. Review renders them.
5. **DS-7 synthesis is deferred** — recorded as a forward seam; it needs (1) built and populated first. No build, no contract.
6. **Build placement: the takeaway seed fields (4) land at J-E; the capture substrate and review rendering build as J-F** — a dedicated small cycle after J-E, before the J-O3 area gate (platform half: response payload + RPC extension through the schema gate; Hub half: Ask capture UI in the player + review substance rendering). J-E stays honest-sized (it already carries the L4 Journal-retrofit rider), and **the area closes with review substance real**.

### Consequences

- **Positive:** review gains real substance from both directions (the traveller's words + the author's takeaways); the richer review entry removed at J-C returns at J-F; the ADR-U044 forward shape (ask semantics) starts being exercised; privacy posture is decided before the first response is ever stored.
- **Negative:** the Journeys area grows by one cycle (J-F) before its gate; FEAT-H010 (Download my data) owes response rows in its step-instances section (already flagged at the J-C retro).
- **Neutral:** the interim completion-panel posture (summary, not menu) stands until J-F; the J-O3 area gate moves to after J-F.

## Links

- Routing: J-C retro ([`retro-2026-07-08-j-c.md`](../../planning/retrospectives/retro-2026-07-08-j-c.md) §1 Lacked, §3) · completion plan J-O6 ([`phase-3-journeys-completion-plan.md`](../../planning/hub-v2/phase-3-journeys-completion-plan.md))
- ADR-U044 (step model; §4 step-instances as lived records) · ADR-U045 (onboarding journey — the Mist constraint) · ADR-U031 (ephemerality) · ADR-U026 (studios — authoring out of scope)
- FEAT-PD001 (Journal primitive — FIM-only create; the rejected home) · FEAT-H010 (export seam) · FEAT-H011 (Journal surface)
- DS-3 spec: [`docs/platform/domain/journeys.md`](../../platform/domain/journeys.md) (invariants 3, 4, 8)
- Privacy canon: `docs/ecosystem/universe/personal-growth/privacy-model.md` (sharing model — garden vs journal)
