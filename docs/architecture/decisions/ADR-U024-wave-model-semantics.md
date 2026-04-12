# ADR-U024: Wave model semantics

**Status:** Accepted
**Date:** 2026-04-12
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

> Extends [ADR-U022 — Named waves](ADR-U022-named-waves.md) with operational semantics.

---

## Context and problem statement

ADR-U022 established six named waves (Ferd → Eid → Hamn → Heim → Brim → Urd) as the platform's evolutionary arc. That ADR captures the names, narrative meaning, and wave-vs-phase distinction. However, it does not formalise how waves interact with the development process — whether work can span waves, how concurrency is controlled, and what triggers a wave transition. Without these rules, waves risk becoming implicit sequential gates that block exploration of future-wave work. *"How do waves govern the flow of work across the ecosystem?"*

## Decision drivers

- Must not create artificial gates that prevent early exploration of later-wave concepts
- Must provide clear prioritisation guidance without rigid sequencing
- Must integrate with Shape Up cycles and the maturity pipeline (PROCESS.md)
- Must scale to 50+ contributors who need unambiguous rules about what they can work on

## Considered options

- **Option A** — Waves as sequential gates (complete one before starting the next)
- **Option B** — Waves as thematic focus buckets with WIP-limited review
- **Option C** — No wave-level constraints (waves are labels only, all control is per-cycle)

## Decision outcome

**Chosen option:** Option B — Waves as thematic focus buckets with WIP-limited review, because it preserves strategic focus while allowing natural overlap and early exploration.

### The operational rules

**1. Waves are not sequential gates.**
Work from any wave can be in any maturity state (0-raw through 4-ready) at any time. A contributor can explore a Hamn concept while Ferd features are being built. Waves overlap naturally — one winds down as the next builds up, and items from different waves may coexist in the same build cycle.

**2. Waves communicate strategic priority, not permissions.**
Earlier waves are generally prioritised over later waves when competing for cycle capacity. This is a guideline, not a rule — a small, high-value later-wave item may be prioritised over a large, low-urgency earlier-wave item. Wave tags (`ferd`, `eid`, `hamn`, etc.) are used for filtering and prioritisation, not for gating access.

**3. Generation is unconstrained; review is WIP-limited.**
Contributors can freely generate and explore work at any maturity stage across any wave. The concurrency bottleneck is at the review stage — only a limited number of items can be in review at once, regardless of which wave they belong to. This prevents review overload while keeping creative and exploratory work unblocked.

**4. Wave transition triggers.**
When a wave's core work is substantially complete, it triggers:
- A wave retrospective (scoped to the entire wave, not just the last cycle)
- An ecosystem roadmap update reflecting the shift in strategic focus

**5. Waves reference features; they don't contain them.**
Products are fixed (The Hub, The Gimbal, The Game). Studios are fixed (Journey Studio, Universe Studio, Arc Studio). Waves are evolutionary stages that these products and studios pass through — a wave is not a container for features but a lens on what the ecosystem prioritises during a period.

### Consequences

- **Positive:** Early exploration of later-wave concepts is explicitly permitted, preventing the "can't think about Eid until Ferd is done" trap.
- **Positive:** Review-stage WIP limits provide real concurrency control without blocking creative work.
- **Positive:** Clear prioritisation guidance (earlier waves generally first) without rigid gating.
- **Negative:** Requires discipline to avoid spreading review capacity too thin across waves. The WIP limit at review is the mechanism that enforces this.
- **Neutral:** Wave assignments for specific features may still shift as the ecosystem matures. This is expected, not a problem.

## Pros and cons of each option

### Option A — Sequential gates
- Pros: Simple to understand. Clear boundaries.
- Cons: Blocks early exploration. Creates artificial waiting. Doesn't match how creative work actually flows — ideas for later waves emerge while building earlier ones. Wastes insight.

### Option B — Thematic focus with WIP-limited review (chosen)
- Pros: Preserves strategic focus. Allows natural overlap. Review-stage WIP limits prevent overload without blocking generation. Matches how software actually develops.
- Cons: Requires understanding the generation/review distinction. Slightly more complex than pure sequential gates.

### Option C — Labels only, no wave constraints
- Pros: Maximum flexibility.
- Cons: No strategic focus signal. "Everything is equally important" means nothing is prioritised. Doesn't help contributors decide what to work on.

## Links

- Extends: [ADR-U022 — Named waves](ADR-U022-named-waves.md)
- Operationalised in: [PROCESS.md](../../planning/PROCESS.md) Section 3 ("Waves as thematic focus")
