# Domain Service — World Model (DS-1)

<!-- Valid service slugs: world-model | narrative-engine | experience-engine | content | communication | discovery | intelligence -->

---
slug: world-model
owner: platform/domain/world-model
consumers: [products/hub, products/gimbal, studios/universe-studio/world-studio, studios/universe-studio/arc-studio, studios/universe-studio/journey-studio, platform/domain/narrative-engine, platform/domain/experience-engine, platform/domain/communication, platform/domain/discovery, platform/domain/intelligence]
status: proposed
last_updated: 2026-06-10
tier: Domain Services
tags: [domain-service:world-model]
feature_prefix: PD  # FEAT-PD### for features owned by this service
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-06-10 in the DS-1 descent session, after the Phase 0 PC re-check gate closed (`docs/planning/sessions/2026-06-10_01_-_DS1-DESCENT-PHASE0-DELTA.md`). Authority chain: `docs/ecosystem/VISION.md` v1.2 (L1) + the cosmology core `docs/ecosystem/universe/cosmology/README.md` (**ground truth — every capability below traces to it**) + the roles and beings cores + the Session B conformance register Section 3 DS-1 row + ADR-U023/U025/U026/U027/U028 + the three decisions ratified this session (the S43 home-sharing seam, ball-grant placement, and the Whisp-split decision in `docs/architecture/decisions/PENDING.md`). Code, migrations, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test, same day) and Step 3 (adjudication) are recorded at the foot of §L3: zero empirical DS-1 artifacts exist; the inventory stands unchanged with all rows classified full forward-commitment.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (ADR-U023 as amended by ADR-U025/U026). Revised when the service's boundaries, public contract, or dependencies change.*

### 1. Purpose

DS-1 World Model owns the **state of the created universe** — everything that is true about the world independent of any story being told or journey being walked in it. That is: the worlds topology (the Ordinary World as substrate reference, the Shimmer, the Fringe's two co-located places with their near sides and Beyonds, the Void axis); the Tree with its balls and branches (the crown); the Whisp's **world-presence** (cord state, Void distance, anchoring, severance — per the Whisp-split decision); seeds and portals; the tendable world's grown/receded state; private homes and their share-state; and the world-layer of NPCs (body + culture). The cosmology core is its ground truth.

DS-1 is **not**: stories, seasons, episodes, or NPC characters (DS-2 Narrative — the character layer is the World → Arc seam); journeys, steps, or respawn *delivery* (DS-3 Experience — DS-1 resolves *where* a severed Whisp resumes, DS-3 delivers the experience of resuming); media and 3D assets themselves (DS-4 Content — DS-1 holds world-placement state referencing assets opaquely); conversation or feeds (DS-5 Communication — though DS-5's cord-health visibility consumes DS-1's branch gate); the Whisp's **being** — dialogue, filling, senses, internalisation (DS-7 Intelligence, per the Whisp split); identity states and transcendence itself (PC-2 — DS-1 *responds* to transcendence by granting the ball); groups, roles, and permission resolution (PC-3 — DS-1 *consumes* the audience and gating primitives).

### 2. Concepts

The domain entities this service owns. No DS-1 schema exists on disk at this derivation; persistence entries name the substrate intent, with specific schema deferred to L4 (the platform rules apply from day one: every table RLS, no exceptions).

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Place | A node of the topology: the Ordinary World (substrate reference, never absent), the Shimmer (the membrane — a line, not a band), place 2 (warm, welcoming) and place 3 (hostile, cold, unnamed), each with a near side (coordinate-tied) and a Beyond (untethered). One continuum, two centres of gravity; "positive/negative future" is stake, not coordinate. | DS-1 tables (substrate; schema is L4) |
| Region | A bounded part of a place carrying world-state: a village district, a stretch of near-side ground, a room of a private home. The grain at which tending, recession, and home-sharing operate. Region kinds are data-driven, never a sealed enum (Ferd non-closure). | DS-1 tables |
| Coupling | The near-side correspondence between place 2 and place 3: the same Ordinary-World coordinates seen two ways (the patch eating flowers and the machine drilling are the same wound). Healing in place 2 routes through acting on the cause in place 3. | DS-1 tables |
| Ball | One per FIM, granted at transcendence; permanent root anchor; two-zone gateway (inside → private home, rim → village); always one step away beside the FIM in the Ordinary World. **All balls glow equal — no variable signal ever attaches to a ball** (service-level invariant). | DS-1 tables |
| Branch | A FIM-FIM bond as crown topology — the social graph *is* the Tree. Carries glow (the relationship's aliveness); thins when untended, recoverable when tended; never kills a Whisp (cord vs branch, never collapsed into one). Branches are the routes: following your own branches is how you find your friends among the balls. | DS-1 tables |
| Cord world-presence | Per-Whisp world-state (universal — Shadows have cords too): length (the dial, held by the FIM), Void distance (how far the Whisp has ventured), the **health** luminosity channel (colour/integrity: whole vs frayed, steady vs flickering), and the rendered **salience** channel (maturity-driven; the *value* is DS-7-derived and fed through DS-1's contract — DS-7 consumes DS-1, never the reverse). Stuck/dead outcomes from closing portals are cord states. | DS-1 tables (Shadow cord state inherits PC-2 ephemerality) |
| Seed | Anchor object budded from the FIM's ball; planted along a route into place 3; at once climbing-protection and a patch of place-2 life reclaimed (anchoring and growing the world are the same gesture). Threshold seed = a route's anchor-zero at a danger portal. Alive or destroyed. Seeds need a ball — the Shadow lock on deep place 3 is intrinsic. | DS-1 tables |
| Portal | A crossing: the always-on home portal (the ball absorbs it), field portals into place 3 (seeded), danger portals (seed-to-pass: a seed dropped on the edge is required to cross). A closing portal leaves the cord dead (seed destroyed) or stuck (living seed: length frozen, reopenable, rescuable by a friend along a branch). | DS-1 tables |
| World-state | Per-region grown/receded state of the tendable world. Place 2 is revived place 3 — the same ground alive/glowing (tended) vs dead/black (un-grown or receded). Only each FIM's own ball is inviolable; everything else can recede if untended. Nothing is permanently destroyed (service-level invariant). | DS-1 tables |
| Private home | The FIM's self-chosen representation of where they feel safest; reached via the ball's inside-zone; furnished with the personal-scope slice of World Studio (open to every FIM); evolves as the FIM grows. Default-locked; the FIM holds the only key. | DS-1 tables |
| Home share-grant | Per-region, per-audience, revocable sharing of the private home (S43; ownership ratified at Phase 0): region → audience (a FIM or group, resolved via PC-3's audience primitive), granted/revoked, default-locked. DS-1 enforces at the read path. | DS-1 tables |
| NPC world-layer | The body (Creator-authored) and culture (Anthropologist-authored) layers of an NPC placed in the world. The character layer is DS-2's (Teller; the World → Arc promotion seam; collaboration protocol is an open thread per the beings core). | DS-1 tables |
| Lore entry | A canonical world-fact (names, history of the world as world, not as story). Thin at this derivation; shape is an open question (§8 Q5). | DS-1 tables |

### 3. Public contract (consumed by Surfaces)

Contract surfaces at coarse grain — operation families, not endpoint signatures. Per the framework-provided-contract-mechanisms discipline (A#9), the realized HTTP layer is expected to be PostgREST RPC + RLS-gated reads unless a three-justification case (cross-table transactional mutations, external calls, multi-step composition) warrants a custom route; that resolution is Step 2 / L4 work, not cold-derivable. Auth on every operation resolves the actor via the repo's four-hop actor chain (P-O1: `auth.uid()` → `users` → `personal_group_id`) and the identity-status gate (Shadow/FIM) — status gating is **intrinsic** (no ball → no Beyond), not a permission fence.

- **Topology reads** — resolve the place graph; resolve near-side views from Ordinary-World coordinates (both places; coupling resolution: trace a place-2 wound to its place-3 cause). Open to Shadows and FIMs (near side is anchor-free).
- **Tree reads** — own branches (legible: glow, aliveness, routes to friends' balls); the ambient crown (**no counts, no rankings, no aggregate-comparison surface — ever**); own ball state.
- **Ball gateway** — enter via inside (→ private home) or rim (→ village). FIM-only intrinsically.
- **Cord operations** — set the dial (FIM holds it: pay out / reel in); read own cord state; read a friend's cord health **only along a grown branch** (glanceable not diagnostic, invited not imposed, self first — the branch-gated visibility that DS-5 consumes); salience-channel input (DS-7-fed).
- **Seed and anchoring operations** — bud a seed from the ball; plant along a route; threshold-seed a danger portal (seed-to-pass enforcement); resolve the anchor chain (body → ball → seeds).
- **Severance and respawn resolution** — severance events (two-tier: anchored → last anchor; unanchored overreach → the very beginning); stuck/dead cord outcomes; rescue-by-friend along a branch; respawn-position resolution consumed by DS-3 (which owns delivery).
- **World tending** — tend a region; read grown/receded world-state; seed-planting growth effects.
- **World authoring (World Studio write-path, ADR-U026)** — hard side (terrain, water, sky, portals, placed 3D-asset references) and soft side (peoples, customs, beliefs, countries); NPC body/culture layers. Gated by Dreamineer authority (`has_permission()` against the Creator/Anthropologist templates, PC-3). **Scope tiers:** personal-scope home furnishing is open to every FIM; shared-world authoring is Dreamineer-gated (the gate-by-scope law).
- **Home operations** — furnish (personal-scope write-path); read (share-state-enforced); grant/revoke a region to an audience (PC-3 audience primitive).
- **Ball grant at transcendence** — consumes PC-2's transcendence lifecycle event (placement ratified at Phase 0); creates the ball atomically with the FIM's arrival in the Tree.

Consumers: **World Studio writes → DS-1**; the Hub and Gimbal surfaces read; DS-2 reads NPC world-layers and place state; DS-3 consumes respawn resolution and Void-distance (the growth gradient is Void distance, not bodily distance); DS-5 consumes the branch gate; DS-6 consumes branch-routes for navigation; DS-7 reads/feeds cord channels. Equipment-keying is **feature-grain at the surfaces** (ADR-U025), never on platform capabilities — DS-1 exposes one contract regardless of equipment profile.

### 4. Internal dependencies (consumed *from* this service)

Allowed dependencies per ADR-U023: Platform Core, and other domain services below this one in the dependency rules.

- **Platform Core:**
  - **PC-1 Infrastructure** — RLS substrate; SECURITY DEFINER discipline; migration discipline; trigger-based validation; **scheduled-job substrate (pg_cron)** for world-state recession ticks and branch-glow decay (added to PC-1 at this session's Phase 0); object storage conventions (for placed-asset references); feature-flag substrate.
  - **PC-2 Identity** — identity-status gate (Shadow/FIM); the transcendence lifecycle event (ball grant attaches to it); `user_id` contract; **Shadow ephemerality rules** (a Shadow's cord state is Shadow-generated data and inherits the TTL-erasure obligations of ADR-U027).
  - **PC-3 Organisation** — the audience primitive (personal groups / groups per ADR-U006/U007); `has_permission()` for Dreamineer gating and home share-grants; the Dreamineer role templates (Creator, Anthropologist).
  - **PC-4 Governance** — admin operations and audit-log discipline for world-admin interventions (consumed, not redefined).
- **Other domain services: none.** DS-1 sits at the bottom of the Domain dependency order; the other six services consume it. Placed 3D/media assets are referenced **opaquely by ID** (DS-4 owns the assets; DS-1 never calls DS-4 — the reference direction keeps DS-1 dependency-free within Domain). The cord's salience channel is DS-7-*fed* through DS-1's own contract (DS-7 → DS-1 call direction), not a DS-1 dependency on DS-7.

### 5. Extension points

None exposed at this derivation. The Ferd non-closure discipline applies throughout: place kinds, region kinds, portal kinds, tending-act kinds, and NPC-layer kinds are **data-driven registries, never sealed enums** — a new portal type or region type must be addable without a schema migration to a type column's CHECK list. Formal plugin contracts (e.g., Dreamineer-authored portal behaviours) are Extension System work in a later wave; Ferd architecture leaves them openable.

### 6. Storage & schema

No DS-1 tables exist on disk at this derivation (cold statement; Step 2 confirms). Substrate commitments that bind L4:

- Every DS-1 table has RLS from day one. Shared-world state (topology, world-state, the crown's ambient shape) is **readable by `anon`** — Shadows perceive the real shared near-side world (ADR-U027: the privacy protection is ephemerality, not refusing to serve) — while Beyond-scoped reads gate on FIM status intrinsically.
- Write paths are studio/owner-gated: shared-world writes check Dreamineer authority via `has_permission()`; home writes check self; cord/seed writes check own-Whisp.
- Shadow-generated DS-1 state (a Shadow's cord position) carries the PC-2 TTL-erasure path — the Phase 0 scheduled-job substrate is the sweep mechanism.
- Per-region world-state and share-grants are row-grain (region rows), not JSON blobs, so RLS can enforce the S43 read path at the database layer.
- Ball-grant participates in the transcendence migration's **atomicity** (ADR-U027): a FIM must never exist without their ball, nor a ball without its FIM — composed invariant with PC-2's migration, cascade-spec'd per ADR-U016 before implementation.

### 7. Service-level invariants (the guardrails as architecture)

These are not feature behaviours; they are properties every DS-1 capability and every future FEAT-PD spec must preserve. Violating one is an architecture bug, not a product decision.

1. **Equal-ball.** All balls glow equal. No variable signal — progress, activity, standing, anything — ever attaches to a ball. Variable signals live on cord and branch only. DS-1's contract exposes no per-ball differentiation surface.
2. **No rankings, no counts.** Own branches are legible; the wider crown is ambient. DS-1 exposes no aggregate-comparison, leaderboard, count, or popularity surface, to any consumer, including studios and admin (the anti-leaderboard guardrail, register DS-6 row, enforced at the source).
3. **Inviolable ball and home.** Only each FIM's own ball is inviolable; the home is default-locked and the FIM holds the only key. No admin or Dreamineer write-path overrides this short of PC-4's authority-of-last-resort discipline (auditable, ADR-U019/U028).
4. **Gardening, not guarding.** Nothing in the tendable world is permanently destroyed; the worst case is *not yet grown* or *receded*, recoverable the moment care resumes. Recession mechanics must be gentle, forgiving, approach-motivated — no loss-aversion mechanics (Vision principle 6: growth is delight, not deficiency).
5. **Meta-safety.** The FIM is never the thing at risk. Only the Whisp's world-presence carries stakes; severance recovery is reunion, and the severe tier (start over) exists only for unanchored overreach the FIM opted into (risk = depth × protection, the dial is theirs).
6. **The anchor gate is intrinsic.** Near side: anchor-free, open to Shadows and FIMs. Beyond of place 2: ball required. Deep place 3: seeds required. These are structural facts of the world, never permission fences to be toggled.
7. **Cord and branch never collapse into one.** The inward lifeline and the relational bond are distinct entities with distinct stakes; no capability may model one as a variant of the other.

### 8. Open spec questions

- **Q1 — Ordinary-World coordinate substrate.** The near side is coordinate-tied and the body is a roving vantage (S27): what coordinate grain, what geo-indexing, and — critically — what privacy posture for body-position data, which is among the most sensitive classes the platform will hold. Routes to the Privacy vertical + the Gimbal's sensors equipment; a research spike candidate before any FEAT-PD touches near-side resolution.
- **Q2 — Recession mechanics.** What drives world-state recession (elapsed time, absence of tending acts, a blend), at what cadence (pg_cron tick shape), and how tuned so it never reads as punishment (invariant 4). Design question with Vision-principle stakes; resolves at FEAT-PD maturity for the tendable-world capability.
- **Q3 — Branch formation and decay.** What creates a branch (an explicit mutual gesture, accumulated shared experience via DS-3 signals, both)? Cold lean recorded: a branch is a DS-1 world-entity referencing two FIMs via their personal groups — it is *not* a PC-3 group (a branch has world-properties: glow, crown position, route function; PC-3 supplies only the identity primitives). Formation/decay inputs likely arrive as events from DS-3/DS-5 consumers calling DS-1's contract. Needs ratification when the first branch FEAT-PD is specified.
- **Q4 — The World → Arc NPC promotion seam.** Who may add the character layer to a world-placed NPC, and how the handoff is recorded (the inter-studio collaboration protocol is an open thread per the beings core, S30). Joint question with DS-2's descent.
- **Q5 — Lore's shape.** Registry of world-facts in DS-1 vs narrative content in DS-2/DS-4. Thin row kept in the inventory; shape resolves on first demand.
- **Q6 — Place 3's name.** Deferred in canon (cosmology core); a naming-register item, not a DS-1 blocker.
- **Q7 — Salience-channel input contract.** The exact shape of DS-7's maturity feed onto the cord (push event vs derived read) — settled at DS-7's descent against the Whisp-split decision (PENDING.md).

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision v1.2) and L2 (§L2 above) at this step — Step 1 cold derivation; Step 2 (code-informed stress-test) and Step 3 (adjudication) follow per the standing pattern. L3 does not read existing feature specs or code during derivation.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Places & topology state | Topology | — | PC-1 (schema/RLS substrate) | Observability (topology reads traceable); Privacy (topology itself is shared-world, not FIM data) |
| Near-side coordinate resolution | Topology | Places & topology state | PC-1 (RLS, anon-readable shared world); PC-2 (status: open to Shadow + FIM) | Privacy (body-position data — most sensitive class; §8 Q1); Observability (resolution events) |
| Place-coupling resolution | Topology | Places & topology state; Near-side coordinate resolution | PC-1 | Observability (wound-trace events) |
| Portal registry & crossing | Topology | Places & topology state; Seed lifecycle (danger portals); Ball lifecycle (home portal) | PC-2 (intrinsic status gate: Beyond is FIM-only) | Observability (crossing events); Privacy (crossing history is FIM data) |
| Ball lifecycle | The Tree | Places & topology state (village) | PC-2 (transcendence lifecycle event — grant attaches atomically, Phase 0 ratified placement; `user_id` contract); PC-1 (trigger discipline) | Administration (ball participates in account-lifecycle cascades per ADR-U016 — exit/decommission must specify ball disposition); Privacy (the ball is FIM data); Observability (grant events); Notifications (transcendence/ball-grant trigger) |
| Two-zone gateway resolution | The Tree | Ball lifecycle; Private home structure (inside); Places & topology state (village, rim) | PC-2 (FIM-only) | Observability (gateway events) |
| Branch (crown) state | The Tree | Ball lifecycle | PC-3 (the two parties via personal groups); PC-1 (scheduled-job substrate for glow decay per §8 Q3) | Privacy (relationship data is FIM data — both parties'); Observability (branch lifecycle events); Notifications (tend-invitation triggers — gentle per invariant 4, never guilt mechanics) |
| Branch-gated visibility resolution | The Tree | Branch (crown) state; Cord state & the dial | PC-3 (permission substrate) | Privacy (the consent surface for cord-health sharing: glanceable / invited / self-first); Observability (gate evaluations on denial recorded) |
| Cord state & the dial | Whisp presence | Places & topology state (the Void axis) | PC-2 (universal: Shadow + FIM; Shadow cord state inherits TTL-erasure per ADR-U027); PC-1 (sweep substrate) | Privacy (cord state is FIM/Shadow data; Shadow ephemerality); Observability (dial/venture events) |
| Severance & respawn resolution | Whisp presence | Cord state & the dial; Anchor-chain resolution; Branch (crown) state (rescue-by-friend) | PC-1 | Observability (severance events first-class); Notifications (rescue-possible trigger along a branch — invited, not imposed) |
| Seed lifecycle | Anchoring | Ball lifecycle | PC-2 (FIM-only intrinsically: seeds need a ball) | Observability (bud/plant/destroy events) |
| Anchor-chain resolution | Anchoring | Seed lifecycle; Ball lifecycle; Places & topology state | PC-1 | Observability (anchor-state reads on severance) |
| Tendable world-state | World-state | Places & topology state; Seed lifecycle (planting grows the world) | PC-1 (scheduled-job substrate for recession ticks — §8 Q2) | Observability (tend/recede events); Administration (world-state interventions are admin-auditable via PC-4) |
| World authoring write-path (World Studio) | World-state | Places & topology state; Tendable world-state | PC-3 (`has_permission()` against Creator/Anthropologist templates; scope tiers per ADR-U026); PC-4 (audit discipline); DS-4 reference-only (opaque asset IDs, no call dependency) | Administration (authoring is audited); Observability (write-path events); Privacy (none directly — shared-world content) |
| NPC world-layer registry | World-state | World authoring write-path | PC-3 (Dreamineer gating) | Observability (layer-authoring events) |
| Private home structure | Homes | Ball lifecycle (reached via inside-zone); Places & topology state | PC-3 (personal scope = self, open to every FIM — no Dreamineer gate) | Privacy (the home is intensely personal FIM data; default-locked per invariant 3); Administration (home disposition in account-lifecycle cascades per ADR-U016); Observability (furnish events) |
| Home share-state & enforcement | Homes | Private home structure | PC-3 (audience primitive per ADR-U006/U007); PC-1 (RLS row-grain enforcement) | Privacy (the S43 obligation set: per-region, per-audience, revocable, only-key — DS-1 is the ratified owner, Phase 0 delta §3); Observability (grant/revoke events); Notifications (share-invitation trigger) |
| Lore registry | Lore | — | PC-1 | Observability (edit events). Thin row; shape open per §8 Q5 |

**Transactions vertical:** no DS-1 capability touches Transactions at this derivation — the world holds no entitlements and sells nothing; economy management is Console-scoped (ADR-U028) and entitlement state is platform-tier. Recorded explicitly rather than left blank.

### Dependency chain

Buildable order within DS-1:

1. **Places & topology state** — the foundation; everything references the place graph.
2. **Near-side coordinate resolution** and **Place-coupling resolution** — over the place graph (Q1 gates the first).
3. **Ball lifecycle** — needs PC-2's transcendence event contract; unlocks the Tree and everything FIM-anchored.
4. **Two-zone gateway resolution**, **Branch (crown) state**, **Seed lifecycle** — over balls.
5. **Anchor-chain resolution** — over seeds + balls; **Portal registry & crossing** — over anchor mechanics.
6. **Cord state & the dial** — over the Void axis (buildable from step 1 for Shadows; full anchor semantics need step 5).
7. **Severance & respawn resolution** and **Branch-gated visibility resolution** — over cord + anchors + branches.
8. **Tendable world-state** — over topology + seeds; **World authoring write-path** — over topology + world-state; **NPC world-layer registry** — over the write-path.
9. **Private home structure** — over ball gateway; **Home share-state & enforcement** — over home structure + PC-3 audience primitive.
10. **Lore registry** — independent, on demand.

### External dependencies

| Source | Capability consumed | Consuming DS-1 capability |
|---|---|---|
| PC-1 Infrastructure | RLS substrate; SECURITY DEFINER + `search_path = ''` discipline; migration discipline; trigger-based validation | every DS-1 capability |
| PC-1 Infrastructure | Scheduled-job substrate (pg_cron — added at this session's Phase 0) | Tendable world-state (recession ticks); Branch state (glow decay); Cord state (Shadow TTL sweep participation) |
| PC-1 Infrastructure | Object-storage conventions | World authoring write-path (placed-asset references) |
| PC-2 Identity | Identity-status gate (Shadow/FIM); `user_id` contract; four-hop actor chain | every actor-touching capability |
| PC-2 Identity | Transcendence lifecycle event (atomic migration per ADR-U027) | Ball lifecycle (grant attaches; composed atomicity invariant per §6) |
| PC-2 Identity | Shadow ephemerality (TTL + explicit-erase per ADR-U027) | Cord state & the dial (Shadow cord state) |
| PC-3 Organisation | Audience primitive (personal groups / groups, ADR-U006/U007) | Home share-state & enforcement; Branch state (party identity) |
| PC-3 Organisation | `has_permission()` + Dreamineer role templates (Creator, Anthropologist) | World authoring write-path; NPC world-layer registry |
| PC-4 Governance | Admin-operation + audit-log discipline | World authoring write-path; Tendable world-state (admin interventions) |
| Vertical: Privacy | S43 obligation set; Shadow-data obligations; body-position posture (Q1) | Home share-state; Cord state; Near-side coordinate resolution |
| Vertical: Observability | Event shape (request ID, actor, outcome) | every event-emitting capability |
| Vertical: Administration | Cascade-spec format per ADR-U016 | Ball lifecycle; Private home structure (account-lifecycle disposition) |
| Vertical: Notifications | Notification-trigger shape | Ball lifecycle; Branch state; Severance resolution; Home share-state |

Cross-referenced per the template rule: the scheduled-job substrate row was **added to PC-1's inventory at Phase 0 of this session** (previously a dangling cite). The PC-2 transcendence event and PC-3 audience/Dreamineer entries exist in those inventories (verified at Phase 0). **Consumers, not dependencies** (direction guard): DS-2/DS-3/DS-5/DS-6/DS-7 consume DS-1 contract surfaces; DS-7 feeds the salience channel by calling DS-1 (§8 Q7); DS-4 is referenced opaquely only. DS-1 depends on no Domain Service.

### Sources-status block

- **L1 (`docs/ecosystem/VISION.md` v1.2):** solid — rewritten at Session B G-1; teleology, structural concepts, and principles consumed without gap.
- **Cosmology core (ground truth):** solid — canonical, ratified 2026-06-10; every capability row traces to its sections (statement index at its foot).
- **Roles + beings cores:** solid — scope tiers, Dreamineer gating, Whisp two-faces partition consumed.
- **Session B register Section 3 DS-1 row + Phase 0 delta record:** consumed as the derivation constraint set (S43 seam, ball-grant placement, PC re-check verdicts).
- **Whisp-split decision:** ratified this session; recorded in `decisions/PENDING.md` as an ADR candidate — *promotion pending*; if the DS-7 descent revises the split, the Whisp-presence area here re-derives. Remark recorded per the prerequisite-check mechanic.
- **Vertical specs:** Privacy is substantive (S43/Shadow obligations landed at G-3); Administration/Transactions corrected at G-3; Notifications/Observability remain scaffold-tier — proceeded with remark per G-03 (`docs/ecosystem/how-we-work/gaps.md`).
- **No sibling DS spec exists** (DS-1 is the first Domain Service derivation): boundary claims against DS-2..DS-7 are provisional per the sibling-undefined soft-pause rule — recorded as a remark; each sibling's descent re-checks its DS-1 boundary.
- **No code, migrations, or FEAT-* files read** at Step 1, per the cold-derivation discipline. Step 2 stress-test + forward-commitment classification pending (expectation: most rows full-forward — no DS-1 code is believed to exist; Step 2 verifies rather than assumes).
- **Template staleness noted (cross-entity finding):** `docs/templates/domain-service-spec.md` frontmatter comment still enumerates `{game}` as a consumer and omits `world-studio` — missed by the G-2 template sweep (register §2.4 listed only product/studio/design-system templates). Fixed in the Phase 1 commit of the DS-1 descent session.

### Step 2 — code-informed stress-test findings

*Run 2026-06-10 (same session, after Step 1 commit `cde6ffb`), per the standing pattern. Sweep scope: `supabase/migrations/` (chronological, cumulative-forward per A#8), `lib/`, `app/`, `components/`, type definitions. Term set: the full DS-1 vocabulary (world/place/region/topology/fringe/shimmer/void; ball/branch/crown/tree; cord/whisp/avatar; seed/anchor/portal; home/village; lore/npc; garden/tend/recede) plus the retired-model terms (safe harbour, three worlds).*

- **Zero DS-1 domain artifacts exist on disk.** The end-state schema is 18 tables (`users`, `permissions`, `role_templates`, `group_templates`, `groups`, `group_memberships`, `journeys`, `journey_enrollments`, `role_template_permissions`, `group_template_roles`, `group_roles`, `group_role_permissions`, `user_group_roles`, `notifications`, `forum_posts`, `conversations`, `direct_messages`, `admin_audit_log`) — all PC-2 / PC-3 / PC-4 / DS-3 / DS-5 territory. No table, function, trigger, or RLS policy carries world/spatial/lore/avatar-state semantics.
- **Noise classes excluded (recorded so the next reader doesn't re-litigate):** FringeIsland branding strings; the `Home()` route component and "Go Home" UI (shell, not the private-home concept); database *seeding* migrations (e.g. `20260127_seed_predefined_journeys.sql` — populate journeys/roles, not anchor-seeds); git-branch parsing in dashboard code; `groups.avatar_url` (`20260222131712` — a profile picture column, not avatar world-presence).
- **No stale retired-model terms in code** (safe harbour / three worlds absent) — the CODE correction target carries no DS-1-vocabulary debt on top of its known items.
- **Cross-entity findings: none.** Nothing in code maps to the candidate inventory differently than Step 1 stated, and nothing world-adjacent belongs to another entity's L3.

### Step 3 — adjudication

Zero-delta adjudication: the Step 1 candidate inventory is **committed unchanged** — no row added, removed, reshaped, or re-owned by Step 2 evidence (the architecture-derived inventory met no contradicting empirical analogue).

**Forward-commitment classification (per the three-way discipline):** all eighteen capabilities are **full forward-commitment relative to code** — no capability has any empirical analogue. Whether any DS-1 row falls inside the active wave's scope is a wave-planning determination (horizontal axis), not an L3 output; the classification here records only the empirical floor: nothing is current-commitment, nothing is partially realised.

**Buildable-order implication confirmed:** the §L3 dependency chain stands as the build order from a clean slate; the first FEAT-PD candidates remain Places & topology state and Ball lifecycle (the latter gated on PC-2's transcendence-event contract, which is itself FEAT-PC2-pending per PC-2 §9).

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted.*

### Summary

No FEAT-PD feature specs exist for DS-1 at this derivation.

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| *(all eighteen capabilities)* | — | — | No specs yet; L4 runs follow L3 stabilisation (Step 2/3) and wave-planning pull |

### Capabilities without specs

All §L3 capabilities. First candidates when DS-1 enters build: Places & topology state and Ball lifecycle (the dependency-chain foundations).

### Features without capabilities

None — no FEAT-PD files exist under `features/`.

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
