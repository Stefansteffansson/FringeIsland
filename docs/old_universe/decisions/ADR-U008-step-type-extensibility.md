# ADR-008 — L3 Experience engine — step type extensibility as core constraint

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
L3 is the architectural linchpin. The step type system defines what can happen inside a journey. If the step type data model is rigid, adding new step types later requires rebuilding the core data model — and everything above L3 that depends on it.

**Decision:**
The step type system must be extensible from day one. New step types are addable without rebuilding the core data model. The step type is a discriminator on a shared base structure — not a separate table per type.

**Why this matters:**
Tier 1 step types (narrative, reflection, assessment, choice, activity, journal, checklist) are the core. Tier 2 (video, file, quiz, mood check-in, external link) follow. Future step types (AR triggers, physical world activations, AI-generated content) will come later. Each new type must slot in without schema redesign.

**Consequences:**
- Step type specification session is required before significant L3 implementation
- The data model must be designed with this extensibility constraint in mind from the first migration
- This is the single most important architectural decision in L3
