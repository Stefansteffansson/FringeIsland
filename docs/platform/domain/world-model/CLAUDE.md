# CLAUDE.md — DS-1 World Model

**Applies to:** anything under `docs/platform/domain/world-model*` and the corresponding code (DS-1's tables, RLS policies, SQL functions, and Platform-API surface).
**Load order:** root [`CLAUDE.md`](../../../../CLAUDE.md) → [`AGENTS.md`](../../../../AGENTS.md) → [`PROCESS.md`](../../../planning/PROCESS.md) → the skill matching the task → [`../../CLAUDE.md`](../../CLAUDE.md) (platform tier) → [`../CLAUDE.md`](../CLAUDE.md) (domain sub-tier) → **this file** → [`../world-model.md`](../world-model.md) (the service spec) → the feature spec.
**Reads as a delta.** Assumes root, platform-tier, and domain sub-tier `CLAUDE.md` are already loaded. Contains only what's specific to DS-1.

---

## What makes this entity different

DS-1 owns the **state of the created universe** and sits at the **bottom of the Domain dependency order**: it depends on no other Domain Service, and the other six all consume it. Its ground truth is not a product decision or an API contract — it is the cosmology core ([`docs/ecosystem/universe/cosmology/README.md`](../../../ecosystem/universe/cosmology/README.md)). When a DS-1 question feels open, the answer is usually already in that core; check it before designing.

## Rules that only apply at this entity

- **The seven service-level invariants in the spec's §7 are architecture, not features.** Equal-ball (no variable signal ever attaches to a ball); no rankings/counts/aggregate-comparison surfaces — to any consumer, including studios and admin; inviolable ball and default-locked home (FIM holds the only key); gardening-not-guarding (nothing permanently destroyed; recession is gentle and recoverable); meta-safety (the FIM is never at risk — only the Whisp's world-presence carries stakes); the anchor gate is intrinsic (never a toggleable permission fence); cord and branch never collapse into one entity. A feature spec or migration that violates one of these fails review regardless of how it scored elsewhere.
- **The Whisp split (decisions/PENDING.md, 2026-06-10):** DS-1 owns the Whisp's *world-presence* (cord state, Void distance, anchoring, severance, respawn position); DS-7 owns the Whisp *as a being* (dialogue, filling, senses, internalisation). DS-7 calls DS-1, never the reverse. Don't let dialogue-adjacent state creep into DS-1 or cord mechanics creep into DS-7.
- **The S43 home-sharing seam (Phase 0 delta record, 2026-06-10):** DS-1 owns home structure, share-state, and read-path enforcement; PC-3 supplies the audience primitive; PC-2 supplies identity status only; the Privacy vertical levies the obligations. Home-sharing work that adds state to PC-2/PC-3 is crossing the ratified seam.
- **Keep DS-1 dependency-free within Domain.** Placed media/3D assets are referenced opaquely by ID (DS-4 owns the assets; DS-1 never calls DS-4). Branch formation/decay signals and the cord's salience channel arrive as *consumers calling DS-1's contract* (DS-3/DS-5/DS-7 → DS-1), not as DS-1 dependencies.

## Gotchas

- **Shadow-generated DS-1 state is ephemeral.** A Shadow has a Whisp and cord (universal, S39), so DS-1 holds Shadow data — cord position at minimum. It inherits ADR-U027's TTL-erasure and explicit-erase obligations and joins the PC-1 scheduled-job sweep path. Forgetting this turns DS-1 into a Shadow-data durability leak.
- **Shared-world reads must work for `anon`.** Shadows perceive the real shared near-side world (ADR-U027: ephemerality, not refusal to serve). RLS posture: shared-world state anon-readable; Beyond-scoped state FIM-gated intrinsically; per-FIM state own-row.
- **Ball-grant is inside the transcendence atomicity boundary.** A FIM must never exist without their ball, nor a ball without its FIM — composed invariant with PC-2's atomic migration (ADR-U027), cascade-spec'd per ADR-U016 before implementation.

## Where to go next

- **The service spec:** [`../world-model.md`](../world-model.md) — L2 identity + §7 invariants + §L3 capability inventory (Step 1 cold derivation 2026-06-10; Step 2 stress-test pending).
- **Ground truth:** the cosmology core; roles core (scope tiers, Dreamineer gating); beings core (the Whisp's two faces, NPC layers).
- **Relevant decisions:** ADR-U023 (anatomy) · ADR-U025/U026 (entities; World Studio writes → DS-1) · ADR-U027 (Shadow lifecycle) · ADR-U028 (governance by scope) · the Whisp-split ADR candidate in [`PENDING.md`](../../../architecture/decisions/PENDING.md).
