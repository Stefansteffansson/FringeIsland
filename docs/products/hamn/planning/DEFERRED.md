# Hamn — Deferred Decisions

**Last Updated:** April 5, 2026

This document tracks design decisions, features, and questions that have been deferred from Hamn (Wave 2) to later waves. Each item includes context, rationale for deferral, and notes for future implementation.

For the deferral protocol (two-sided acceptance workflow), see [Deferral Protocol](../../../universe/processes/DEFERRAL_PROTOCOL.md).

## Format

Each deferred decision includes:
- **Topic**: What question or feature is deferred
- **Context**: Why this came up
- **Decision**: What was decided for now
- **Status**: Proposed → [receiver] | Accepted by [receiver] | Re-deferred
- **Deferred To**: Which wave to revisit
- **Notes**: Important considerations for future implementation

---

## Experience Engine

### Type 3 & Type 4 Journey Full Operation

**Topic**: Full execution of traveler-initiated (Type 3) and AI-generative (Type 4) journeys.

**Context**: Hamn's Journey Designer supports *authoring* Type 3 and Type 4 journeys, but the full runtime execution engine (traveler-initiated pathfinding, AI-generative content delivery) requires validated AI capabilities and the full L7 Intelligence layer.

**Decision**: Hamn builds authoring support in the Journey Designer. Full operation deferred.

**Status**: Proposed → Wave 3

**Deferred To**: Wave 3

**Notes for Future Implementation**:
- Journey Designer should be designed extensibly for all four types (see RQ-H-006)
- AI feasibility validation (RQ-H-001) determines what's achievable
- Type 3 requires L3 pathfinding engine; Type 4 requires L7 AI-generative pipeline

---

### Dynamic Journey Path Changes

**Topic**: Conditional logic and branching within journeys based on member choices or state.

**Context**: Enables journeys that adapt in real-time based on member decisions, assessment results, or engagement patterns.

**Decision**: Not needed for Hamn's initial journey types (Type 1 Fixed, Type 2 Hybrid). Requires a branching logic engine.

**Status**: Proposed → Wave 3

**Deferred To**: Wave 3

**Notes for Future Implementation**:
- Prerequisite for Type 3 and Type 4 journeys
- Consider: simple branching (if/then) vs full state machine vs AI-driven paths
- Must integrate with Journey Designer UI

---

## Physical & Immersive

### Full AR/Mixed Reality Layer

**Topic**: Complete AR integration with location-based and camera-triggered experiences.

**Context**: Hamn includes basic AR experiments. Full AR layer requires native apps, void visualization, and world-blending mechanics that go beyond experimental scope.

**Decision**: Hamn does basic AR experiments only. Full layer deferred.

**Status**: Proposed → Wave 3

**Deferred To**: Wave 3

**Notes for Future Implementation**:
- Basic experiments in Hamn validate the concept
- Full AR needs: location services, camera pipeline, 3D rendering, void visualization
- Consider: ARKit (iOS), ARCore (Android), or cross-platform framework

---

### Physical Game (Unreal Engine)

**Topic**: Full-fidelity Unreal Engine game across desktop, console, mobile, VR/AR.

**Context**: The most immersive expression of the FringeIsland world. Three worlds rendered in full fidelity.

**Decision**: Well beyond Hamn scope. Requires dedicated game development team.

**Status**: Proposed → Wave 3+

**Deferred To**: Wave 3+

**Notes for Future Implementation**:
- Requires game development expertise outside current team
- Dreamineer game tools needed alongside the game itself
- Consider: Unreal Engine 5+, cross-platform deployment strategy

---

## Analytics & Intelligence

### Advanced Analytics and Recommendation Engine at Scale

**Topic**: Platform-wide analytics, ML-powered recommendations, and data-driven personalization at scale.

**Context**: Hamn includes per-role analytics and basic journey discovery. Full recommendation engine and ML pipeline require larger user base and data volume to be meaningful.

**Decision**: Hamn builds foundational analytics. Scale-grade ML deferred.

**Status**: Proposed → Wave 3

**Deferred To**: Wave 3

**Notes for Future Implementation**:
- Hamn's profile accumulation and usage data create the training set
- Recommendation engine needs: collaborative filtering, content-based filtering, or hybrid
- Consider privacy implications of ML on user data

---

## Organization & Governance

### FringeIsland Foundation Formal Establishment

**Topic**: Legal entity formation for the FringeIsland Foundation.

**Context**: The Foundation is referenced in governance and revenue-sharing descriptions but requires legal establishment as a formal entity.

**Decision**: Not a product feature. Timing depends on Kickstarter and revenue needs.

**Status**: Proposed → Wave 3 (see also CQ-006 in community OPEN_QUESTIONS)

**Deferred To**: Wave 3

**Notes for Future Implementation**:
- Minimum viable legal structure may be needed earlier for Kickstarter (see CQ-006)
- Affects: marketplace revenue handling, IP ownership, contributor agreements
- Jurisdiction and entity type TBD

---

### Annual Summit & Regional Gatherings

**Topic**: Physical events — annual Summit and organic regional meetups.

**Context**: Part of the Wave 3 vision for extending the world beyond the screen.

**Decision**: Beyond Hamn scope. Community must be large enough to sustain physical events.

**Status**: Proposed → Wave 3

**Deferred To**: Wave 3

**Notes for Future Implementation**:
- Requires: event management, ticketing, venue partnerships
- Regional gatherings may emerge organically before formal support
- Summit concept ties into Seasons (could be a season finale event)

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Deferral Protocol](../../../universe/processes/DEFERRAL_PROTOCOL.md) | Two-sided deferral workflow |
| [Ferd Deferred](../../ferd/planning/DEFERRED.md) | Wave 1 deferrals (many accepted by Hamn) |
| [Hamn Research](./RESEARCH.md) | Open investigations |
| [Hamn Product Spec](../specification/PRODUCT_SPEC.md) | What Hamn is building |
| [Cross-wave Open Questions](../../../universe/strategy/OPEN_QUESTIONS.md) | Unowned strategic questions |
