# ADR-U045: The onboarding journey — one designated journey, Mist-scoped access, auto-launch with opt-out

**Status:** Proposed (authored 2026-07-07; awaiting the merge nod)
**Date:** 2026-07-07
**Deciders:** Stefan (kickoff board J-O1/J-O2, ratified in-session 2026-07-07) + Claude
**Tags:** scope:cross-cutting (DS-3 · PC-2 · Hub A-JRN) · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

Three questions arrived at the Journeys-area kickoff entangled:

- **What journey grain is open to Mists?** (DS-3 `journeys.md` §8 Q2 — open, deferred to the first-experience canon work; `first-experience.md` is unwritten and tracked as CQ-010, the canon's named highest-risk gap.)
- **JRN-5** — preserve in-flight journey enrolment across Mist→FIM conversion. Substrate finding at kickoff: `finalise_transcendence` (PC002) preserves `personal_group_id`, and enrolments are personal-group-keyed, so carry-over is continuity-free at the substrate level; the gate was purely the enrolment posture.
- **JRN-15** — detect first-arrival state and auto-launch a *designated* journey. Historical record: "Journey Zero" was defined as "the onboarding journey … walked automatically on arrival … same data model, flagged differently" (Ferd journeys study; Swedish decision log BESLUT 4), later demoted by the Hub §L3 to trigger-only ("Journey Zero is no longer modelled as a special journey").

## Decision outcome

Ratified by Stefan, 2026-07-07:

1. **Exactly one designated onboarding journey exists.** The designation is **data** (a designation flag/registry entry through the schema gate), never code. It is an ordinary journey in the ordinary data model — Journey Zero's "same data model, flagged differently" holds.
2. **Mist journey access is this journey only.** An anonymous entrant (Mist) can enrol in and walk exactly the designated onboarding journey — no other. This resolves DS-3 §8 Q2's grain question for Ferd (a designation gate, not a general opening; the "near-side journeys" framing in DS-3 §2 remains the wider forward posture, unchanged).
3. **Auto-launch on first arrival, for both entry paths:** for a Mist at anonymous arrival, and for a new FIM at first sign-in who never walked it as a Mist. **Opt-out is honored** — the launch is advisable, never mandatory (DS-3 invariant 3, voluntariness: no step advances without the traveller's action). Rationale (Stefan): it sets the scene and jump-starts the FIM's relation with their Whisp and cord. Exact opt-out UX is L4 spec work.
4. **Progress carries at transcendence; forgetting rides the existing machinery.** A Mist's onboarding progress persists through Mist→FIM conversion via the realized personal-group continuity (proven by test at build, not re-implemented). If the Mist drifts away or bails out, the existing ADR-U031 ephemerality machinery (TTL reaper + explicit erase, cascading to enrolments) forgets it — **no new mechanics**, proof-by-test only.
5. **A placeholder onboarding journey is seeded now** — real structure (per ADR-U044's step model), throwaway content — so JRN-5/JRN-15 build and E2E-prove against a real journey. The real content is authored when the first-experience canon work (CQ-010) runs; the mechanics do not wait for the content. A re-authoring hook is planted at that work.

### Consequences

- JRN-5 and JRN-15 build **in-area** — the Journeys area completes 18 of 18 capabilities (kickoff board J-O4).
- The DS-3 enrolment contracts carry an identity-status gate scoped by the designation (Mist → designated journey only; FIM → published journeys), rather than a blanket FIM-only refusal.
- PC-2's first-arrival state feeds the auto-launch trigger for both entry paths; the trigger itself is Hub-side (JRN-15, per the Hub §L3 area note).
- The first-experience canon work later replaces the placeholder content and may refine the launch UX — it does not reopen these mechanics.

## Links

- Kickoff plan + decision board: [`docs/planning/hub-v2/phase-3-journeys-completion-plan.md`](../../planning/hub-v2/phase-3-journeys-completion-plan.md) (J-O1/J-O2/J-O4)
- DS-3 spec: [`docs/platform/domain/journeys.md`](../../platform/domain/journeys.md) (§8 Q2 — resolved to this ADR in the same batch; invariant 3)
- ADR-U031 (Mist lifecycle + ephemerality) · ADR-U034 (transcendence consent) · ADR-U044 (step model — the placeholder journey's structure)
- Historical record: `docs/planning/waves/studies/ferd/journeys.md` (Journey Zero); `docs/ecosystem/thinking/OPEN_QUESTIONS.md` CQ-010 (first-experience gap — content, not mechanics)
