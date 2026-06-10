# CLAUDE.md — DS-2 Narrative

**Applies to:** anything under `docs/platform/domain/narrative*` and the corresponding code (DS-2's tables, RLS policies, SQL functions, and Platform-API surface).
**Load order:** root [`CLAUDE.md`](../../../../CLAUDE.md) → [`AGENTS.md`](../../../../AGENTS.md) → [`PROCESS.md`](../../../planning/PROCESS.md) → the skill matching the task → [`../../CLAUDE.md`](../../CLAUDE.md) (platform tier) → [`../CLAUDE.md`](../CLAUDE.md) (domain sub-tier) → **this file** → [`../narrative.md`](../narrative.md) (the service spec) → the feature spec.
**Reads as a delta.** Assumes root, platform-tier, and domain sub-tier `CLAUDE.md` are already loaded. Contains only what's specific to DS-2.

---

## What makes this entity different

DS-2 owns the **structure of story** — seasons/episodes, plot, loop structure, the NPC character layer — never its delivery, its position-resolution, or its content. Its ground truth is the narrative core ([`docs/ecosystem/universe/narrative/README.md`](../../../ecosystem/universe/narrative/README.md)); when a DS-2 question feels open, check the core (and cosmology core sections 8 and 10 for anything loop-adjacent) before designing. The service was renamed from "Narrative Engine" at its descent (Engine-suffix decision, [`PENDING.md`](../../../architecture/decisions/PENDING.md)) — older material may still carry the suffixed name.

## Rules that only apply at this entity

- **The six service-level invariants in the spec's §7 are architecture, not features.** Guaranteed reversibility (every loop declaration carries a return shape — home base or episode-repeat; no structure may strand a FIM); respawn stays in-story (no loop exits its containing arc); entertainment-first (no didactic, assessment, or "lesson" surface on the contract — scaffolding stays invisible); the loop is the medium (persistence-across-loop is first-class structure); non-closure of every kind-registry; the character layer adds a someone, never a world. A feature spec or migration that violates one fails review regardless of how it scored elsewhere.
- **The respawn three-way split (ratified 2026-06-10):** DS-1 resolves respawn *position* (anchor chain, severance); DS-2 owns respawn *topologies, loop textures, and return shapes* as narrative structure; DS-3 delivers the respawn *experience*. Don't let position mechanics creep into DS-2 or loop runtime state (the live round of a group loop) accrete here — runtime is DS-3's.
- **The NPC promotion seam (ratified 2026-06-10, resolves DS-1 §8 Q4):** a Teller promotes via PC-3 `has_permission()` against the Teller template; the character layer and promotion record are DS-2-owned rows referencing DS-1's NPC world-layer rows **by ID**; no DS-1 write, ever. DS-1 stays unaware of which NPCs carry character layers.
- **Opaque references in three directions.** DS-1 NPC rows and places, and DS-4 content blocks, are referenced by ID only — DS-2 never joins across another service's schema, never calls DS-4, and never resolves world mechanics.
- **Every kind-vocabulary is a registry table.** Season/episode/arc/beat/topology/texture/persistence/promotion kinds and states are data-driven (ADR-U008/U018). Adding a CHECK-listed enum for any of them is the canonical closure failure at this entity.

## Gotchas

- **Published vs draft is an RLS posture, not a UI filter.** Published narrative structure is anon-readable shared-world state (stories stand alone as entertainment; Shadows experience the near side); draft/unpublished authoring state is Teller/studio-scoped at the row grain via lifecycle state. Conflating the two either leaks drafts or breaks Shadow story access.
- **DS-2 holds no per-FIM or per-Shadow personal state at this derivation** — structure plus Dreamineer authorship attribution only. If a future capability adds per-Shadow state, it inherits ADR-U027 TTL-erasure obligations on arrival; don't add it casually.
- **Calendar rollover is a pg_cron consumer.** Season/episode transitions ride PC-1's scheduled-job substrate and emit notification triggers (episode-goes-current is FIM-visible state change). A rollover without its trigger is an incomplete feature per the platform-tier Notifications obligation.
- **Episode retirement is a lifecycle event.** Cascade spec per ADR-U016 before any retirement mechanics are implemented — beats, arc threading, loop declarations, and character-layer references all hang off episodes.

## Where to go next

- **The service spec:** [`../narrative.md`](../narrative.md) — L2 identity + §7 invariants + §L3 capability inventory (Steps 1-3 complete 2026-06-10; zero-delta stress-test — all twelve capabilities full forward-commitment, nothing exists in code yet).
- **Ground truth:** the narrative core; cosmology core (sections 8 + 10); beings core (NPC three-layer composite); roles core (Teller gating).
- **Relevant decisions:** ADR-U023 (anatomy) · ADR-U025/U026 (entities; Arc Studio writes → DS-2) · ADR-U008/U018 (non-closure) · ADR-U016 (cascade first) · the Engine-suffix outcome and Whisp-split entries in [`PENDING.md`](../../../architecture/decisions/PENDING.md).
