# ADR-U008: Step type extensibility as core constraint

**Status:** Accepted
**Date:** 2026-03 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:domain-service · wave:ferd

---

## Context

The experience/narrative engine is the architectural linchpin. The step type system defines what can happen inside a journey. If the step type data model is rigid, adding new step types later requires rebuilding the core data model — and everything above it that depends on it.

## Decision

The step type system must be extensible from day one. New step types are addable without rebuilding the core data model. The step type is a discriminator on a shared base structure — not a separate table per type.

## Why this matters

Tier 1 step types (narrative, reflection, assessment, choice, activity, journal, checklist) are the core. Tier 2 (video, file, quiz, mood check-in, external link) follow. Future step types (AR triggers, physical world activations, AI-generated content) will come later. Each new type must slot in without schema redesign.

## Consequences

- Step type specification session is required before significant implementation of the Narrative Engine / Experience Engine
- The data model must be designed with this extensibility constraint in mind from the first migration
- This is the single most important architectural decision for journey content

## Amendment — 2026-04-12

The original ADR referenced "L3 Experience engine" as the architectural linchpin. The L0-L7 layer model has been superseded by the Platform Core / Domain Services decomposition (see ADR-U023). The relevant domain services are now the **Narrative Engine** and **Experience Engine**. The extensibility constraint itself is unchanged and remains the single most critical architectural decision for journey content.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Related: [ADR-U023 — Platform Core / Domain Services decomposition](ADR-U023-platform-core-domain-services-decomposition.md)
- Related: [ADR-U017 — Journeys as content templates](ADR-U017-journeys-content-templates.md)
