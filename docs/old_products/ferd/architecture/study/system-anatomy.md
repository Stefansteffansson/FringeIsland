# System Anatomy (L0–L7)

**Wave:** Ferd
**Category:** Architecture
**Status:** 🟡 Needs study

---

## What Is This

The FringeIsland platform is structured as 8 horizontal layers (L0 through L7).
Each layer has a clearly defined responsibility and strict rules about what it
may and may not depend on. This document defines those layers, their boundaries,
and the rules governing them.

---

## Why We Are Building This

A clearly defined layered anatomy enables:
- Controlled, predictable scaling as the platform grows
- A measuring stick for the conformance audit
- Onboarding of new contributors with a shared mental model
- Clear ownership and separation of concerns

---

## How It Is Supposed to Work

Each layer has:
- A name and number
- A single primary responsibility
- Allowed dependencies (lower layers only)
- Forbidden dependencies
- Examples of what belongs here

*(The detailed layer definitions are to be filled in during the study phase.)*

---

## Open Questions

- [ ] What are the precise names and responsibilities of each layer L0–L7?
- [ ] What are the dependency rules between layers — which layers may call which?
- [ ] Where does the Next.js framework sit in the layer model?
- [ ] Where does Supabase sit in the layer model?
- [ ] How does the API ring relate to the layer model — is it a layer or a separate construct?
- [ ] Are there any layers that are purely conceptual vs those with concrete code artefacts?
- [ ] How are the five verticals positioned relative to the eight layers?

---

*Status: 🟡 Needs study — open questions must be answered before this can be specified*
