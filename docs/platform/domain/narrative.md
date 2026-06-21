# Domain Service — Narrative (DS-2)

<!-- Valid service slugs: world-model | narrative | journeys | content | communication | discovery | intelligence -->

---
slug: narrative
owner: platform/domain/narrative
consumers: [products/hub, products/gimbal, studios/universe-studio/arc-studio, studios/universe-studio/journey-studio, platform/domain/journeys, platform/domain/discovery, platform/domain/intelligence]
status: proposed
last_updated: 2026-06-10
tier: Domain Services
tags: [domain-service:narrative]
feature_prefix: PD  # FEAT-PD### for features owned by this service
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another.

**Naming note.** This service was inventoried as "DS-2 Narrative Engine" (`narrative-engine`). The Engine-suffix question parked in `docs/architecture/decisions/PENDING.md` (the DS-3 rename entry's "Decide alongside" clause) was ratified by Stefan at this session's FIRST DECISION: **the suffix drops on both DS-2 and DS-3**. DS-2 is **Narrative** (`narrative`); DS-3's own rename to a journey-named, suffix-free form executes at the DS-3 descent per PENDING.md. The rename ripple (template slug enum, domain README line, domain CLAUDE.md enumerations, STATUS.md row, world-model.md label sweep) lands in this session's commits.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-06-10 in the DS-2 descent session (opener: `docs/planning/sessions/openers/ds2-narrative-engine-descent-opener.md`). Authority chain: root + platform + domain `CLAUDE.md` cascade (L1) + the domain README L2 inventory line + the **narrative core** `docs/ecosystem/universe/narrative/README.md` (**ground truth — every capability below traces to it**) + the cosmology core (sections 8 and 10 especially) + the beings core (NPCs) + the roles core (Teller gating) + the Session B conformance register Section 3 DS-2 row + ADR-U023/U025/U026/U031/U028 + ADR-U008/U018 (Ferd non-closure) + the carry-forward priors from the PC-4 and DS-1 closing bridges. Two DS-1 boundary seams were re-checked and ratified this session (the NPC character-layer promotion seam, resolving DS-1 §8 Q4, and the respawn three-way split — see §1 and §L3 Sources-status). Code, migrations, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test) and Step 3 (adjudication) are recorded at the foot of §L3.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (ADR-U023 as amended by ADR-U025/U026). Revised when the service's boundaries, public contract, or dependencies change.*

### 1. Purpose

DS-2 Narrative owns the **structure of story** — how narrative is organised, paced, and held safe, independent of any particular FIM's journey through it. That is: seasons and episodes on the universal calendar (four seasons per year, twelve episodes per season, per the narrative core); plot structure (the A-plot, B-stories, sub-plots, and the story beats that compose an episode); **respawn topologies and loop textures** as narrative structure (which loop unit a story uses — event-local, round-bounded, day-bounded, episode-bounded — what nests inside what, what a home base is within an arc, and what persists across a loop: the loop is the medium); and the **NPC character layer** (the Teller-authored *someone* — name, history, wound, desire, arc — added to a world-placed NPC via the World Studio → Arc Studio promotion seam). The narrative core is its ground truth; the meta-safety frame (real felt stakes inside guaranteed reversibility) and the entertainment-first principle (stories stand alone; developmental themes invisible in the foundation layer) are carried as service-level invariants (§7).

DS-2 is **not**: journeys, steps, progress, enrolments, or respawn *delivery* (DS-3 — DS-2 declares a story's loop structure; DS-3 delivers the experience of looping, composing DS-2's declaration with DS-1's position resolution); respawn *position* resolution, severance mechanics, places, world-state, or the NPC body and culture layers (DS-1 World Model — the cord's two-tier severance recovery is DS-1 mechanics; the narrative core's "same system given a cause and a currency" names the kinship, not shared ownership); media, assets, or the narrative content blocks themselves (DS-4 Content — beats reference content opaquely by ID); conversation or feeds (DS-5); the Whisp in any face (the split is decided: DS-1 world-presence / DS-7 being — DS-2 owns no Whisp face and consumes the split as an external boundary where stories touch the Whisp); and Arc Studio itself (a role-gated authoring mode per ADR-U026 — DS-2 is the service Arc Studio writes to, not the surface).

### 2. Concepts

The domain entities this service owns. No DS-2 schema exists on disk at this derivation; persistence entries name the substrate intent, with specific schema deferred to L4 (the platform rules apply from day one: every table RLS, no exceptions).

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Season | The largest narrative time unit: four per year on the universal calendar. Season kinds are data-driven, never a sealed enum (Ferd non-closure). | DS-2 tables (substrate; schema is L4) |
| Episode | The unit of story delivery: twelve per season. Carries a lifecycle (authored → scheduled → current → past; states data-driven); is the largest loop unit (episode-bounded respawn; episode-repeat as a return shape). Episode retirement is a lifecycle event requiring a cascade spec (ADR-U016). | DS-2 tables |
| Story arc | A plot thread: the A-plot (season-spanning), B-stories, sub-plots. Arc kinds are data-driven — A/B/sub are kinds in a registry, not columns of distinct types (§8 Q7). | DS-2 tables |
| Story beat | The atomic narrative unit within an episode, sequenced, belonging to one or more arcs. Beats reference DS-4 content blocks **opaquely by ID** (structure here, content there — §8 Q8). Beat kinds data-driven. | DS-2 tables |
| Respawn-topology declaration | The loop-unit declaration a narrative unit carries: event-local (solo), round-bounded (group), day-bounded, episode-bounded — plural, coexisting, nested and scaled (small failures, small respawn). Topology kinds data-driven. | DS-2 tables |
| Return-shape designation | Where a loop returns to, always **inside the story**: home base (a safe return point within the arc — its world location, if any, references DS-1 places opaquely) or episode-repeat (the whole episode replays). The containing arc keeps holding the FIM. | DS-2 tables |
| Loop texture | A Teller craft-palette entry shaping what a loop is *for*: combat practice, mystery-puzzle, constrained inquiry, reflective grief. A data-driven registry, never a sealed enum. | DS-2 tables |
| Loop-persistence class | The declaration of what persists across a loop — tactical knowledge, relational insight, emotional clarity. The loop is the medium: what survives the rewind is part of what the story is about. Declaration grain is open (§8 Q4); the persisted runtime data itself is DS-3/DS-7 territory. | DS-2 tables |
| NPC character layer | The Teller-authored third layer of an NPC: name, history, wound, desire, arc — the *someone*. References DS-1's NPC world-layer row (body + culture) **by ID**; never duplicates or overrides it. | DS-2 tables |
| Character-layer promotion record | The recorded World Studio → Arc Studio handoff: which world NPC gained a character layer, by which Teller, when. Promotion states data-driven. The wider inter-studio collaboration protocol stays an open thread (S30, §8 Q6). | DS-2 tables |

### 3. Public contract (consumed by Surfaces)

Contract surfaces at coarse grain — operation families, not endpoint signatures. Per the framework-provided-contract-mechanisms discipline (A#9), the realized HTTP layer is expected to be PostgREST RPC + RLS-gated reads unless a three-justification case warrants a custom route; that resolution is Step 2 / L4 work, not cold-derivable. Auth on every operation resolves the actor via the repo's four-hop actor chain (P-O1: `auth.uid()` → `users` → `personal_group_id`); Teller gating rides `has_permission()` against the Teller role template (a TEXT-keyed `role_templates` row per D7, never a hardcoded role name).

- **Calendar reads** — current season and episode on the universal calendar; the schedule ahead; the unfolding so far (what has aired). Published narrative structure is shared-world state, open to Mists and FIMs (stories stand alone as entertainment; the near side is anchor-free).
- **Plot reads** — an episode's beats in sequence; arcs and their threading across episodes and seasons. Consumed by DS-3 for delivery and by the surfaces directly.
- **Loop-structure reads** — a narrative unit's topology declaration, return-shape designation, textures, and persistence classes. The primary DS-3 consumption seam: DS-3 composes these declarations with DS-1's respawn-position resolution to deliver the respawn experience.
- **Character reads** — the character layer for a world NPC (joined opaquely to DS-1's world-layer by reference).
- **Narrative authoring write-path (Arc Studio, ADR-U026)** — create and revise seasons, episodes, arcs, beats, topology declarations, return shapes, textures, persistence classes, and character layers. Teller-gated; draft/unpublished state is studio-scoped, not shared-world-readable; all authoring audited per PC-4 discipline.
- **Character-layer promotion** — promote a world-placed NPC by adding the character layer (ratified seam, this session: a Teller promotes; the promotion is a DS-2-owned record referencing DS-1's NPC world-layer row by ID; no DS-1 write, no DS-1 schema change; DS-1 stays unaware of which NPCs carry character layers).

Consumers: **Arc Studio writes → DS-2**; Journey Studio reads the season/episode frame its journeys attach into; the Hub and Gimbal surfaces read; DS-3 consumes plot and loop structure for delivery; DS-6 consumes published structure for discovery; DS-7 reads character and story context where the Whisp speaks inside a story (consume-only; the Whisp split is DS-1/DS-7 territory). Equipment-keying is **feature-grain at the surfaces** (ADR-U025), never on platform capabilities — DS-2 exposes one contract regardless of equipment profile.

### 4. Internal dependencies (consumed *from* this service)

Allowed dependencies per ADR-U023: Platform Core, and other domain services below this one in the dependency rules.

- **Platform Core:**
  - **PC-1 Infrastructure** — RLS substrate; SECURITY DEFINER discipline; migration discipline; **scheduled-job substrate (pg_cron)** for universal-calendar rollover ticks (season and episode transitions); feature-flag substrate.
  - **PC-2 Identity** — identity-status gate (Mist/FIM) for read-posture only: published narrative structure is anon-readable shared-world state; DS-2 holds **no per-Mist or per-FIM personal state** at this derivation (structure plus Dreamineer authorship attribution only), so ADR-U031 ephemerality obligations attach only if a future capability adds per-Mist state.
  - **PC-3 Organisation** — `has_permission()` and the Teller role template (D7: TEXT-keyed lookup, no enum); the four-hop actor chain (P-O1).
  - **PC-4 Governance** — admin operations and audit-log discipline for narrative-admin interventions and all authoring writes (consumed, not redefined).
- **Other domain services:**
  - **DS-1 World Model** — NPC world-layer rows (the character layer references them by ID); place references for return-shape world locations (**opaque by ID** — DS-2 never resolves world mechanics). DS-2 consumes DS-1; never the reverse.
  - **DS-4 Content is referenced opaquely only** (beats → content-block IDs; DS-4 owns the content; DS-2 never calls DS-4 — same reference-direction pattern as DS-1's asset references).

### 5. Extension points

None exposed at this derivation. The Ferd non-closure discipline applies throughout: season kinds, episode kinds and lifecycle states, arc kinds, beat kinds, topology kinds, texture kinds, persistence classes, and promotion states are **data-driven registries, never sealed enums** — a new loop texture or beat kind must be addable without a schema migration to a type column's CHECK list. Formal plugin contracts (e.g., Teller-authored topology behaviours) are Extension System work in a later wave; Ferd architecture leaves them openable.

### 6. Storage & schema

No DS-2 tables exist on disk at this derivation (cold statement; Step 2 confirms). Substrate commitments that bind L4:

- Every DS-2 table has RLS from day one. **Published** narrative structure (current/past seasons, episodes, arcs, beats, loop declarations, character layers) is readable by `anon` — stories stand alone as entertainment and Mists experience the near-side world. **Draft/unpublished** authoring state is Teller/studio-scoped, enforced at the row grain via lifecycle state.
- Write paths are Teller-gated via `has_permission()` against the Teller template; promotion writes additionally require the referenced DS-1 NPC world-layer row to exist (reference validation, not a DS-1 write).
- Character-layer rows and promotion records reference DS-1 rows **by ID only**; return-shape world locations reference DS-1 places by ID only; beats reference DS-4 content blocks by ID only. No foreign service's schema is redefined or written here.
- All kind/state vocabularies (season, episode, arc, beat, topology, texture, persistence, promotion) are registry tables, not CHECK-listed enums (§5).
- Episode retirement participates in the ADR-U016 cascade discipline: a cascade spec exists before any retirement mechanics are implemented.

### 7. Service-level invariants (the guardrails as architecture)

These are not feature behaviours; they are properties every DS-2 capability and every future FEAT-PD spec must preserve. Violating one is an architecture bug, not a product decision.

1. **Meta-safety: guaranteed reversibility.** Every loop declaration guarantees a return shape — home base or episode-repeat. No narrative structure may strand a FIM without a return; real felt stakes live inside a frame that guarantees the rewind. The FIM is never the thing at risk.
2. **Respawn stays in-story.** No loop exits the containing arc; the containing arc keeps holding the FIM. Topology nesting is scaled (small failures, small respawn; large failures, large respawn) and never crosses out of its containing narrative unit.
3. **Entertainment-first; scaffolding invisible.** Stories stand alone as entertainment; developmental themes remain invisible in the foundation layer. DS-2's contract exposes no didactic, assessment, or "lesson" surface — a member could engage purely for the story and still have a valuable experience.
4. **The loop is the medium.** What persists across a loop is first-class narrative structure (persistence classes), never an implementation afterthought. A loop is not a safety net bolted onto a story; it is part of what the story is about.
5. **Non-closure.** Every kind- and state-vocabulary in this service is a data-driven registry (ADR-U008/U018). Sealing any of them is an architecture bug.
6. **The character layer adds a someone, never a world.** Character rows reference DS-1's body and culture layers and never duplicate, override, or write them. DS-2 never mutates DS-1 state.

### 8. Open spec questions

- **Q1 — Adaptive-calendar personalisation ownership** *(speculative-third-shape)*. The narrative core's seasons-and-episodes line names "universal calendar plus adaptive AI personalisation." The universal calendar is DS-2's; who owns the adaptive per-FIM pacing — DS-3 (delivery pacing, alongside its signature-vs-charter personalisation per the register DS-3 row), DS-7 (intelligence feeding DS-3), or a DS-2 calendar-variant surface? Cold lean: DS-2 stays universal; personalisation is delivery-side. Resolves at the DS-3 descent. **Resolved 2026-06-10 (DS-3 descent, ratified by Stefan): the cold lean confirmed — the universal calendar stays DS-2's; adaptive per-FIM pacing is DS-3's (Adaptive per-FIM pacing capability in `journeys.md` §L3, composing this service's universal-calendar reads), with the shaping intelligence DS-7-fed through DS-3's own contract. See `journeys.md` §2 (Personalisation state row), §L3 Sources-status.**
- **Q2 — Loop runtime state ownership.** A running loop's live state (the current round of a round-bounded group loop; who is mid-rewind) — cold lean: DS-3 runtime consuming DS-2 declarations, consistent with the resolution-vs-structure-vs-delivery three-way split. Confirm at the DS-3 descent. The three-perspectives dimension (alone / pair / group) folds in here: topology kinds carry their perspective affinity as data, delivery composes. **Resolved 2026-06-10 (DS-3 descent, ratified by Stefan): the cold lean confirmed — loop runtime state is DS-3's (Loop runtime state capability in `journeys.md` §L3), consuming this service's declarations; the personal-data weight and the ADR-U031 Mist-loop ephemerality obligations land in DS-3, and DS-2 stays free of per-FIM/per-Mist personal state. See `journeys.md` §2 (Loop runtime state row), §7 invariant 1, §L3 Sources-status.**
- **Q3 — Mythology and the unfolding vs DS-1 lore vs DS-4 content.** The world "has a mythology, a mystery, an unfolding" (narrative core). Where world-fact ends (DS-1 lore registry, its §8 Q5) and story-canon begins (DS-2), and where both end and content blocks begin (DS-4), is a three-way boundary. Joint question with DS-1 Q5; firms at the DS-4 descent. **Resolved 2026-06-10 (DS-4 descent, ratified by Stefan): the three-way rule — world-fact stays DS-1 (lore as a fact registry; its renderable presentation, where one exists, is an opaque DS-4 block reference); story-canon stays DS-2 (the unfolding mythology as narrative structure: which mysteries have aired, the beat membership of revelations); everything renderable is DS-4. Joint with DS-1 §8 Q5, resolved the same session. See `content.md` §1, `world-model.md` §8 Q5, §L3 Sources-status.**
- **Q4 — Loop-persistence declaration grain** *(speculative-third-shape)*. Are persistence classes declared per texture, per topology declaration, per episode, or per beat? Cold lean: per topology declaration with texture defaults. Resolves at FEAT-PD maturity for the loop-structure area.
- **Q5 — Character-layer data shape detail.** The ratified seam fixes the direction (DS-2 rows referencing DS-1 NPC world-layer IDs); the row shape (one row per layered NPC vs versioned layers as an NPC deepens across episodes) is L4 work.
- **Q6 — The inter-studio collaboration protocol (S30).** Beyond the promotion record itself: who *may* deepen which NPC and when, whether World Studio authors are notified or consulted, contention rules. Open thread per the beings core; refines at studio decomposition (Arc Studio / World Studio rows of the pipeline).
- **Q7 — B-story and sub-plot grain.** Cold lean recorded: arcs are one registry with data-driven kinds (a-plot / b-story / sub-plot), not three entity types. Ratify when the first plot-structure FEAT-PD is specified.
- **Q8 — The beat-vs-content-block boundary (DS-4).** A beat is structure (position, sequence, arc membership, loop role); a block is content (the media/text the beat presents). Cold lean: beats reference blocks opaquely by ID and DS-4 owns everything renderable. Confirm at the DS-4 descent. **Resolved 2026-06-10 (DS-4 descent, ratified by Stefan): the cold lean confirmed — beats are structure; blocks are renderable content; beats reference DS-4 blocks opaquely by ID, and DS-4 owns everything renderable. DS-4 is the owned side of the standing reference-direction pattern: it serves ID-resolution to any referrer and never calls one. See `content.md` §1, §7 invariant 1, §L3 Sources-status.**

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 and L2 (§L2 above) at this step — Step 1 cold derivation; Step 2 (code-informed stress-test) and Step 3 (adjudication) follow per the standing pattern. L3 does not read existing feature specs or code during derivation.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Season registry & kinds | Seasons & episodes | — | PC-1 (schema/RLS substrate) | Observability (authoring/rollover events traceable) |
| Episode registry & lifecycle | Seasons & episodes | Season registry & kinds | PC-1; PC-4 (admin interventions audited) | Administration (episode retirement requires a cascade spec per ADR-U016); Observability (lifecycle events) |
| Universal-calendar resolution | Seasons & episodes | Season registry & kinds; Episode registry & lifecycle | PC-1 (scheduled-job substrate: pg_cron rollover ticks) | Observability (rollover events first-class); Notifications (episode-goes-current trigger — FIM-visible state change emits a trigger) |
| Story-arc registry | Plot structure | Episode registry & lifecycle (arcs thread episodes); Season registry & kinds (the A-plot spans a season) | PC-1 | Observability (authoring events) |
| Story-beat registry & sequencing | Plot structure | Episode registry & lifecycle; Story-arc registry | PC-1; DS-4 reference-only (opaque content-block IDs, no call dependency) | Observability (authoring/sequencing events) |
| Respawn-topology registry & declarations | Loop structure | Episode registry & lifecycle; Story-arc registry (declarations attach to narrative units) | PC-1 | Observability (declaration events). Invariants 1-2 bind every row |
| Return-shape designation | Loop structure | Respawn-topology registry & declarations; Story-arc registry (home base lives within the arc) | DS-1 (place references, opaque by ID) | Observability (designation events). Invariant 1: every declaration carries a return shape |
| Loop-texture registry | Loop structure | — | PC-1 | Observability (registry-edit events). Non-closure: registry, never enum |
| Loop-persistence classes | Loop structure | Loop-texture registry; Respawn-topology registry & declarations | PC-1 | Observability (declaration events); Privacy (declarations only — the persisted runtime data lives in DS-3/DS-7, never here) |
| NPC character-layer registry | Characters | — | DS-1 (NPC world-layer rows, referenced by ID); PC-3 (Teller gating) | Observability (authoring events); Privacy (none directly — Dreamineer-attributed shared narrative content) |
| Character-layer promotion | Characters | NPC character-layer registry | DS-1 (world-layer row existence); PC-3 (`has_permission()` against the Teller template); PC-4 (promotion audited) | Administration (promotion is audited); Observability (promotion events first-class — the recorded World → Arc handoff) |
| Narrative authoring write-path (Arc Studio) | Authoring | every authored-entity capability above | PC-3 (`has_permission()` against the Teller template, D7; four-hop actor chain, P-O1); PC-4 (audit discipline) | Administration (authoring is audited); Observability (write-path events); Privacy (none directly — shared narrative content; draft state is studio-scoped, not personal data) |

**Transactions vertical:** no DS-2 capability touches Transactions at this derivation — narrative structure holds no entitlements and sells nothing; economy management is Console-scoped (ADR-U028) and entitlement state is platform-tier. Recorded explicitly rather than left blank.

### Dependency chain

Buildable order within DS-2:

1. **Season registry & kinds** — the calendar foundation.
2. **Episode registry & lifecycle** — over seasons.
3. **Universal-calendar resolution** — over seasons + episodes; needs PC-1's pg_cron substrate for rollover ticks.
4. **Story-arc registry** — over episodes + seasons (threading).
5. **Story-beat registry & sequencing** — over episodes + arcs; DS-4 opaque references.
6. **Loop-texture registry** — independent registry; buildable early.
7. **Respawn-topology registry & declarations** — over the narrative units (episodes, arcs) declarations attach to.
8. **Return-shape designation** — over topology declarations + arcs; opaque DS-1 place references.
9. **Loop-persistence classes** — over textures + topology declarations.
10. **NPC character-layer registry** — needs DS-1's NPC world-layer contract (the first hard sibling dependency).
11. **Character-layer promotion** — over the character registry + DS-1 row existence + PC-3 Teller gating.
12. **Narrative authoring write-path** — co-evolves with every authored entity; listed last as the integrating surface (PC-3 gating + PC-4 audit bind it end-to-end).

### External dependencies

| Source | Capability consumed | Consuming DS-2 capability |
|---|---|---|
| PC-1 Infrastructure | RLS substrate; SECURITY DEFINER + `search_path = ''` discipline; migration discipline | every DS-2 capability |
| PC-1 Infrastructure | Scheduled-job substrate (pg_cron) | Universal-calendar resolution (season/episode rollover ticks) |
| PC-1 Infrastructure | Feature-flag substrate | Narrative authoring write-path (staged rollout of authoring surfaces) |
| PC-2 Identity | Identity-status gate (Mist/FIM); four-hop actor chain | read-posture on published structure (anon-readable); every actor-touching write |
| PC-3 Organisation | `has_permission()` + the Teller role template (D7) | Narrative authoring write-path; Character-layer promotion; NPC character-layer registry |
| PC-4 Governance | Admin-operation + audit-log discipline | Narrative authoring write-path; Character-layer promotion; Episode registry & lifecycle (admin interventions) |
| DS-1 World Model | NPC world-layer rows (body + culture), referenced by ID | NPC character-layer registry; Character-layer promotion |
| DS-1 World Model | Place references (opaque by ID) | Return-shape designation (home-base world locations) |
| Vertical: Privacy | Obligation set for Dreamineer-attributed content; the no-personal-data posture check | NPC character-layer registry; Loop-persistence classes (declaration-only boundary) |
| Vertical: Observability | Event shape (request ID, actor, outcome) | every event-emitting capability |
| Vertical: Administration | Cascade-spec format per ADR-U016 | Episode registry & lifecycle (retirement) |
| Vertical: Notifications | Notification-trigger shape | Universal-calendar resolution (episode-goes-current trigger) |

Cross-referenced per the template rule: the PC-1 pg_cron row exists in PC-1's inventory (added at the DS-1 session's Phase 0); the PC-3 `has_permission()`/role-template rows and PC-4 audit discipline exist in those inventories (verified across the PC chain). The DS-1 NPC world-layer registry and place/topology rows exist in `world-model.md` §L3 (verified this session). **Consumers, not dependencies** (direction guard): DS-3 consumes plot and loop structure; DS-6 consumes published structure; DS-7 reads character/story context; Arc Studio writes through the write-path; Journey Studio reads the calendar frame. DS-2 depends on DS-1 only within Domain.

### Sources-status block

- **Narrative core (ground truth):** solid — rewritten at Session B G-1, ratified 2026-06-10; the respawn section (S19-21, S12) and the design principles consumed without gap. The `seasons-and-episodes.md` sub-page is **unwritten**: the four-seasons / twelve-episodes / universal-calendar structure is canon from the core's planned sub-page line; proceeded with remark — Q1 carries the personalisation half of that line.
- **Cosmology core (sections 8 + 10):** solid — the loop framing here stays consistent with the two-tier severance recovery and the Void-distance growth gradient; DS-2 never restates either.
- **Beings core (NPCs):** solid — the three-layer composite and the World → Arc handoff seam consumed; the S30 collaboration protocol carried as §8 Q6.
- **Roles core:** solid — Teller gating (Arc Studio, ADR-U026) consumed via PC-3 primitives per D7.
- **Session B register Section 3 DS-2 row:** consumed as the derivation constraint set (seasons/episodes; respawn topologies plural-nested-in-story; loop textures; NPC character-layer promotion).
- **Whisp split (decided — consumed, not reopened):** DS-2 owns no Whisp face; where stories touch the Whisp, DS-2 consumes the DS-1/DS-7 split as an external boundary (`decisions/PENDING.md`).
- **FIRST DECISION (this session):** the Engine suffix drops on both DS-2 and DS-3 (ratified by Stefan, 2026-06-10); this spec lands as `narrative.md`, slug `narrative`; PENDING.md's DS-3-rename entry carries the appended outcome; DS-3's own rename executes at its descent.
- **Seam re-checks (this session, ratified):** (1) the NPC character-layer promotion seam — Teller promotes via PC-3 gating; DS-2-owned record referencing DS-1 rows by ID; no DS-1 write — **resolves DS-1 §8 Q4** (the sanctioned cross-entity amendment lands in this session's commits); (2) the **respawn three-way split confirmed**: DS-1 position resolution / DS-2 topologies, textures, return shapes / DS-3 delivery — DS-1's text stands unrevised.
- **L2-line altitude:** the domain README line "Seasons, episodes, story beats" predates the Session B canon rewrite — it omits respawn topologies, loop textures, return shapes, and the character layer. Revised at Step 3 of this run (folds into the rename edit).
- **Sibling specs:** DS-1 exists and was consulted **only** for the two named seams (boundary input, not capability source). DS-3..DS-7 remain undefined: boundary claims against them (Q1, Q2, Q3, Q8; the DS-3 consumption seam) are provisional per the sibling-undefined soft-pause rule — each sibling's descent re-checks its DS-2 boundary.
- **Vertical specs:** Privacy substantive; Administration/Transactions corrected at G-3; Notifications/Observability remain scaffold-tier — proceeded with remark per G-03 (`docs/ecosystem/how-we-work/gaps.md`).
- **No code, migrations, or FEAT-* files read** at Step 1, per the cold-derivation discipline. Step 2 stress-test + forward-commitment classification follow (expectation per the DS-1 baseline: near-zero DS-2 artifacts on disk; Step 2 verifies rather than assumes).

### Step 2 — code-informed stress-test findings

*Run 2026-06-10 (same session, after the Step 1 checkpoint ratification), per the standing pattern. Sweep scope: `supabase/migrations/` in cumulative-forward order (A#8) including the 71-file `archive/`, `lib/` (hooks, types, full recursive sweep), `app/`, `components/`, `tests/`. Term set: {season, episode, beat, respawn, narrative, npc, home-base, loop-texture, a-plot, b-story/stories, teller, mythology-stem, story/stories, arc, plot, scene, chapter, quest} case-insensitive with word boundaries, plus {loop, character(s)} classified by context. Enumeration claim is scoped to these patterns and paths, not "anywhere."*

- **Zero DS-2 domain artifacts exist on disk.** The end-state schema is **19 tables** (the 18 enumerated at DS-1's Step 2 plus `pending_email_invitations`, created `20260223140126`, never dropped) — all PC-2 / PC-3 / PC-4 / DS-3 / DS-5 territory. No table, function, trigger, RLS policy, type, or hook carries narrative semantics.
- **Migration archeology clean:** zero narrative vocabulary across all 71 archived migrations — no narrative substrate was lost in the D15 monolithic rebuild (no P11-class asymmetric recovery; the substrate-completion-window watch did not fire).
- **A#9 check:** no framework-provided narrative contract surfaces exist (no narrative `*_rpc` functions, hooks, or routes); the §3 PostgREST-RPC posture stands as cold-stated, resolution deferred to L4.
- **Type drift (PW-T1):** `lib/types/` holds admin/group/journey/messaging/user only — type-vs-runtime coverage symmetric at zero for DS-2.
- **Noise classes excluded (recorded so the next reader doesn't re-litigate):** PL/pgSQL `LOOP` keyword syntax (66 of 73 supabase hits; the rest array-iteration loops); a "300 characters" comment in `lib/dashboard/roadmap-parser.ts`.
- **Cross-entity findings (2):** (1) DS-1's Step 2 record under-enumerates the end-state schema — 19 tables on disk vs the recorded 18 (`pending_email_invitations` missing; PW-5 enumeration-completeness class, second-entity recurrence) — routed to the pickup channel, not folded here; (2) the DS-2 opener's Section 5b names `lib/utils/supabase/` which does not exist (`lib/supabase/` is the real path) — routed to opener-authoring lifecycle.
- **Cold-position retraction rate: zero** (the cross-DS tracking series: PC-4: 7 across 9 clusters; DS-1: zero; DS-2: zero).

### Step 3 — adjudication

Zero-delta adjudication: the Step 1 candidate inventory is **committed unchanged** — no row added, removed, reshaped, or re-owned by Step 2 evidence.

**Forward-commitment classification (per the three-way discipline):** all twelve capabilities are **full forward-commitment relative to code** — no capability has any empirical analogue. Whether any DS-2 row falls inside the active wave's scope is a wave-planning determination (horizontal axis), not an L3 output; the classification here records only the empirical floor: nothing is current-commitment, nothing is partially realised.

**Q-resolution slate:** all eight §8 questions are deferred-routed as written in each entry (Q1/Q2 → DS-3 descent; Q8 → DS-4 descent; Q3 → joint with DS-1 Q5, firms at DS-4; Q6 → studio decomposition; Q4/Q5/Q7 → L4/FEAT-PD time). The two seam questions this descent owned were ratified at Step 1 (Sources-status above): the NPC character-layer promotion seam (resolving DS-1 §8 Q4 — the amendment lands in this session's commits) and the respawn three-way split (confirmed; DS-1's text stands).

**Buildable-order implication confirmed:** the §L3 dependency chain stands as the build order from a clean slate; the first FEAT-PD candidates remain Season registry & kinds and Episode registry & lifecycle (the calendar foundation), with the character-layer pair gated on DS-1's NPC world-layer contract.

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

### Summary

No FEAT-PD feature specs exist for DS-2 at this derivation.

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| *(all twelve capabilities)* | — | — | No specs yet; L4 runs follow L3 stabilisation (Step 2/3) and wave-planning pull |

### Capabilities without specs

All §L3 capabilities. First candidates when DS-2 enters build: Season registry & kinds and Episode registry & lifecycle (the calendar foundation of the dependency chain).

### Features without capabilities

None — no FEAT-PD files exist under `features/`.

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
