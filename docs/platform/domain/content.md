# Domain Service — Content (DS-4)

<!-- Valid service slugs: world-model | narrative | journeys | content | communication | discovery | intelligence -->

---
slug: content
owner: platform/domain/content
consumers: [products/hub, products/gimbal, studios/universe-studio/world-studio, studios/universe-studio/arc-studio, studios/universe-studio/journey-studio, platform/domain/discovery, platform/domain/intelligence]
status: proposed
last_updated: 2026-06-10
tier: Domain Services
tags: [domain-service:content]
feature_prefix: PD  # FEAT-PD### for features owned by this service
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-06-10 in the DS-4 descent session (opener: `docs/planning/sessions/openers/ds4-content-descent-opener.md`; no FIRST DECISION — DS-4's name is unchallenged). Authority chain: root + platform + domain `CLAUDE.md` cascade (L1) + the domain README L2 inventory line + the **narrative core** (beats present content; the planned `journeys.md` sub-page line carries the content families — Witness, Reflect, Decide, Act, Encounter, Rest) + the cosmology core (the world the assets depict — boundary input) + the beings core (the NPC body layer: Creator-authored 3D presence) + **the 2026-06-05 universe-discovery product locks and ADR-U025 (the load-bearing authority: the Gimbal-capture → Hub-refine pipeline as the proof of complementary surfaces; feature-grain equipment-keying)** + the Session B conformance register Section 3 DS-4 row + ADR-U023/U026/U027/U028 + ADR-U017 (journeys as content templates — templates are made OF content) + ADR-U008/U018 (non-closure; the step-type session) + ADR-U016 (retirement cascades) + ADR-U003 (Supabase as storage substrate) + ADR-U013 (i18n/a11y, as boundary inference — see Sources-status) + ADR-U005 (profile_data, boundary input for the profile-media classification) + the carry-forward priors from the DS-1/DS-2/DS-3 closing bridges. **DS-4 is the first Domain Service whose register row traces primarily to the product locks (ADR-U025) rather than to a dedicated canonical core** — recorded as a remark per the DS-3 canon-sub-page-gap precedent. Four routed seam questions (the content-boundary cluster: DS-2 §8 Q8 + Q3, DS-3 §8 Q7, DS-1 §8 Q5) were resolved at this descent's Step 1 checkpoint (ratified by Stefan, 2026-06-10); the sanctioned sibling amendments land at Step 3. Code, migrations, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test) and Step 3 (adjudication) are recorded at the foot of §L3.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (ADR-U023 as amended by ADR-U025/U026). Revised when the service's boundaries, public contract, or dependencies change.*

### 1. Purpose

DS-4 Content owns the **renderable substance of the universe** — everything the experience presents that is neither world-state, story structure, nor journey structure. That is: **media and assets** (3D models, images, audio, captured scans — kinds data-driven from day one); **narrative content blocks** (the renderable units that DS-2 beats and DS-3 steps reference opaquely by ID — structure there, substance here); the **capture → refine pipeline state** (ADR-U025's proof case: a real object scanned on the Gimbal's sensors foot enters as a raw capture and progresses through refinement on the Hub's canvas to a published asset — DS-4 owns the pipeline's state; the surfaces own the experience of operating it); **renditions and variants** (an asset exists in multiple renditions — resolution tiers, formats, depth-appropriate forms — and delivery serves the variant matching the requesting context's declared equipment and depth, resolving the register row's "equipment-keyed delivery" *within* ADR-U025's law: features key on equipment at surfaces, platform capabilities never key); **rendering contracts** (the kind-registry shape renderers consume — DS-4's canonical extension surface per the Extension System charter); **content retirement** under the ADR-U016 cascade discipline; and **Shadow-capture ephemerality** (ADR-U027). DS-4 is the **owned side of the standing opaque-reference pattern**: DS-1 places assets by ID, DS-2 beats and DS-3 steps reference blocks by ID — DS-4 serves ID-resolution to every referrer and never calls one.

DS-4 is **not**: world placement, topology, or world-state (DS-1 World Model — DS-1 holds *where* an asset is placed; DS-4 holds the asset); story structure — seasons, episodes, arcs, beats (DS-2 Narrative — a beat is position and sequence; the block it presents is DS-4's); journey structure, steps, progress, or delivery composition (DS-3 Journeys — DS-3 composes references at delivery; the referenced substance is DS-4's); profile and avatar media (PC-2/PC-3 identity-presentation substrate, per the §8 Q2 cold lean — DS-4 owns *experience* content, not identity furniture); conversation or feed attachments (DS-5's seam — §8 Q7 routes it); search, recommendation, or the marketplace over published content (DS-6 Discovery reads the published registry); the generation *intelligence* for AI-authored content and the Whisp in any face (DS-7 Intelligence — the Whisp split is decided and DS-4 owns no face; the generation seam routes per §8 Q8); the studios (role-gated authoring modes per ADR-U026 — DS-4 is a service studios write to from within their own modes, never a fourth studio); and the renderers themselves (surfaces and the design system render; DS-4 owns the contract shape they consume).

### 2. Concepts

The domain entities this service owns. No DS-4 schema is believed to exist on disk at this derivation (carry-forward prior: the 19-table baseline holds no DS-4 tables; Step 2 verifies rather than assumes — with two boundary-shaped artifacts to classify). Persistence entries name the substrate intent; specific schema is L4 work (the platform rules apply from day one: every table RLS, no exceptions).

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Asset | A registered unit of media: 3D model, image, audio, captured scan — **kinds data-driven** (Ferd non-closure; new media kinds addable without schema change). Carries authoring provenance, draft/published lifecycle, and a storage-object pointer. The NPC body layer (beings core), placed world objects (DS-1 references), and block-embedded media all resolve to asset rows. | DS-4 tables (substrate; schema is L4) |
| Rendition | A per-asset variant: resolution tier, format, depth-appropriate form. **Rendition kinds data-driven.** Delivery selects the rendition matching the requesting context's declared equipment/depth — renditions are *data served by variant*, never capability gating (ADR-U025 law, §7 invariant 2). | DS-4 tables |
| Storage object | The record binding an asset (or rendition) to its blob in the object-storage substrate (PC-1 object-storage conventions; ADR-U003 Supabase Storage). Bucket/path discipline, integrity, and orphan-garbage lifecycle live at this grain. | DS-4 tables + storage substrate |
| Content block | The renderable unit beats (DS-2) and steps (DS-3) reference **opaquely by ID** — the substance a moment of story or journey presents. Composes text and embedded asset references; **block kinds data-driven** (the kind-vs-content-family vocabulary joins the ADR-U008 step-type specification session, §8 Q1). Block shapes carry locale variants and accessibility alternatives from day one (§7 invariant 8). | DS-4 tables |
| Capture record | The intake record of a raw capture from the sensors foot (Gimbal): provenance (who, when, what equipment), rights posture (§8 Q3), and the capture's personal-by-default privacy state. **A Shadow's captures inherit ADR-U027 ephemerality.** | DS-4 tables (Shadow captures inherit PC-2 ephemerality) |
| Pipeline state | The refinement lifecycle position of an asset born from capture (or upload): captured → refining → refined → published — **states data-driven**. DS-4 owns the state; the Gimbal's capture surfaces and the Hub's canvas deep-edit operate it (ADR-U025: two ends of one workflow). | DS-4 tables |
| Authoring provenance | Per-asset/per-block attribution: which actor, standing in which authoring context (studio mode or personal scope), created or revised it. The audit substance PC-4 discipline rides on; also the anchor for capture rights (§8 Q3). | DS-4 tables |

### 3. Public contract (consumed by Surfaces)

Contract surfaces at coarse grain — operation families, not endpoint signatures. Per the framework-provided-contract-mechanisms discipline (A#9), the realized HTTP layer is expected to be PostgREST RPC + RLS-gated reads — **with Supabase Storage as a framework-provided content surface whose buckets/policies Step 2 checks as A#9's named site for this entity** — unless a three-justification case warrants a custom route; resolution is Step 2 / L4 work. Auth on every operation resolves the actor via the repo's four-hop actor chain (P-O1: `auth.uid()` → `users` → `personal_group_id`); all role gating rides `has_permission()` against TEXT-keyed `role_templates` rows (D7 — Creator, Anthropologist, Teller, Wayfinder per the authoring context), never hardcoded role names.

- **ID-resolution & delivery reads** — resolve an asset or block by ID into its renderable form: metadata, the rendition matching the caller's declared equipment/depth context, locale variant, accessibility alternatives. The owned side of the three opaque-reference seams: any holder of an ID resolves it here (surfaces resolve at render time; DS-1/DS-2/DS-3 never call). Published shared-world content is broadly readable — anon-readable where it presents near-side experience (Shadows perceive the real world; ADR-U027's protection is ephemerality, not refusal to serve). Unpublished content is never served broadly (§7 invariant 6).
- **Capture intake (sensors foot)** — submit a raw capture from the Gimbal: creates the capture record + storage object + asset in `captured` pipeline state, personal-by-default. Open to Shadows and FIMs on the near side (a Shadow's captures carry the TTL-erasure path); personal-scope self-gated.
- **Refinement operations (canvas deep-edit)** — progress an asset through pipeline states on the Hub's canvas: edit, transform, derive renditions, publish. Operating on one's own captures is self-gated; refining toward shared-world publication is gated by the authoring context's Dreamineer template (the gate-by-scope law).
- **Content authoring write-path (studio modes + personal scope, ADR-U026)** — create and revise assets and blocks **from within each studio's own mode**: Creator/Anthropologist authoring world assets from World Studio (its capture-foot on `sensors`, deep edit on `comfortable-canvas` — the product locks), Teller authoring blocks beats present from Arc Studio, Wayfinder authoring step content from Journey Studio. The gate is **the role template of the mode the author is standing in** plus scope (personal-scope capture and home-grade content open to every FIM — the same gate-by-scope law as World Studio furnishing). DS-4 is a shared authoring substrate, not a fourth studio (ADR-U026's entity set is locked; the one-studio-one-service law governs structure ownership — each studio's *structural* write target stays DS-1/DS-2/DS-3; renderable payloads land here). Draft state is authoring-context-scoped; all authoring audited per PC-4 discipline.
- **Rendering-contract reads** — the kind registries (asset kinds, block kinds, rendition kinds) and the per-kind content shape renderers consume. The registry is DS-4's canonical extension surface (Extension System charter: "content types" addable without modifying Platform Core; ADR-U018 non-closure).
- **Retirement & lifecycle operations** — retire an asset or block under a pre-existing ADR-U016 cascade spec. Because references are opaque (DS-4 cannot enumerate its referrers — §7 invariant 1), retirement semantics are defined referrer-blind: tombstone discipline, never silent deletion (§7 invariant 5).

Consumers: **all three sub-studios write → DS-4 from within their modes** (renderable payloads; structure goes to their own services); the Hub and Gimbal surfaces read, render, and operate the capture→refine pipeline ends; DS-6 reads the published registry for discovery (provisional — its descent re-checks; no counts/rankings leak from here); DS-7 reads content context and, for AI-generated content, writes through the same write-path under a posture its descent owns (§8 Q8, provisional). DS-1/DS-2/DS-3 are **referrers, not callers**: they hold DS-4 IDs and never invoke this contract. Equipment-keying is **feature-grain at the surfaces** (ADR-U025) — DS-4 exposes one contract regardless of equipment profile; rendition selection is data the contract serves, not a key on the contract.

### 4. Internal dependencies (consumed *from* this service)

Allowed dependencies per ADR-U023: Platform Core, and other domain services below this one in the dependency rules.

- **Platform Core:**
  - **PC-1 Infrastructure** — RLS substrate; SECURITY DEFINER discipline; migration discipline; **object-storage conventions** (the substrate row DS-1's placed-asset references already cite; ADR-U003 Supabase Storage); **scheduled-job substrate (pg_cron)** for Shadow-capture TTL sweep participation; feature-flag substrate (staged rollout of capture/refine and authoring surfaces).
  - **PC-2 Identity** — identity-status gate (Shadow/FIM) and the four-hop actor chain on every actor-touching operation; **Shadow ephemerality rules** (a Shadow's captures and authored content inherit the TTL-erasure obligations of ADR-U027); the **transcendence lifecycle event with atomic migration** (a transcending Shadow's captures migrate with continuity — composed invariant with PC-2's migration, cascade-spec'd per ADR-U016).
  - **PC-3 Organisation** — `has_permission()` with the Creator, Anthropologist, Teller, and Wayfinder templates per authoring context (all TEXT-keyed per D7); the personal-group actor primitive for personal-scope capture.
  - **PC-4 Governance** — admin operations and audit-log discipline for content-admin interventions and all authoring writes (consumed, not redefined).
- **Other domain services: none.** DS-4 sits at the bottom of the Domain dependency order alongside DS-1: every sibling references it opaquely by ID and DS-4 calls none of them. The reference direction (DS-1 assets, DS-2 blocks, DS-3 blocks — three precedents) keeps DS-4 dependency-free within Domain; resolution of those references happens at the surfaces against DS-4's own contract.

### 5. Extension points

The **content-kind registry system is this service's canonical extension surface**: new asset kinds, block kinds, and rendition kinds — and the renderer-consumable shape contract per kind — must slot in without rebuilding the core data model (the Extension System charter names "content types" as an extension category; ADR-U018 binds non-closure; the per-kind discriminator-on-shared-base shape mirrors ADR-U008's step-kind pattern). Formal plugin contracts (Dreamineer-authored content kinds, custom renderers) are Extension System work in a later wave; Ferd architecture leaves them openable. The Ferd non-closure discipline applies throughout: asset kinds, block kinds, rendition kinds, pipeline states, and capture provenance kinds are **data-driven registries, never sealed enums**.

### 6. Storage & schema

No DS-4 tables are believed to exist on disk at this derivation (carry-forward prior, not a Step 1 read; Step 2 verifies — stated expectation: near-zero DS-4 artifacts, zero storage buckets, with two boundary-shaped artifacts to classify rather than skip). Substrate commitments that bind L4:

- Every DS-4 table has RLS from day one. **Published** shared-world content (assets and blocks the experience presents) is broadly readable — anon-readable where it serves near-side experience. **Captures and unpublished content are personal data**: row-grain RLS on the author's/capturer's own rows; draft authoring state is authoring-context-scoped at the row grain.
- **Storage buckets and policies follow PC-1 object-storage conventions and mirror the row-grain RLS posture** — a blob is never more readable than its owning asset row (private capture blobs in private buckets/paths; published rendition blobs broadly servable).
- Shadow-generated DS-4 state (a Shadow's captures and anything authored from them) carries the PC-2 TTL-erasure path; pg_cron is the sweep mechanism; the transcendence migration is atomic with a mid-migration guard (ADR-U027), cascade-spec'd per ADR-U016 jointly with PC-2 before implementation — blob erasure in the storage substrate is part of the sweep's obligation, not just row deletion.
- Blocks embed asset references internally by ID; **no DS-4 row references DS-1/DS-2/DS-3 rows** — the reference direction is strictly inbound, and DS-4's schema carries no knowledge of where its content is referenced.
- All kind/state vocabularies (asset kind, block kind, rendition kind, pipeline state, provenance kind) are registry tables, not CHECK-listed enums (§5; ADR-U018).
- Content retirement participates in the ADR-U016 cascade discipline: a cascade spec exists before any retirement mechanics are implemented, and because referrers are unknown to DS-4, the cascade specifies tombstone semantics (resolution of a retired ID yields a defined tombstone shape, never an error surface that strands a renderer).

### 7. Service-level invariants (the guardrails as architecture)

These are not feature behaviours; they are properties every DS-4 capability and every future FEAT-PD spec must preserve. Violating one is an architecture bug, not a product decision.

1. **Opaque-reference service, owned side.** DS-4 serves ID-resolution to any referrer and never calls one; no DS-4 capability, schema element, or contract may require knowledge of where content is referenced. The three-precedent direction pattern (DS-1 assets, DS-2 blocks, DS-3 blocks) is preserved from this side.
2. **The equipment-keying law holds.** No DS-4 capability keys on equipment (ADR-U025: features key at surfaces, platform capabilities never). Renditions and variants are data served on request; serving by declared context is not gating by equipment.
3. **Non-closure.** Every kind- and state-vocabulary in this service is a data-driven registry (ADR-U018; Extension System charter). Sealing any vocabulary — asset kinds, block kinds, rendition kinds, pipeline states — is an architecture bug.
4. **Shadow-capture ephemerality.** Shadow-generated content state inherits TTL-erasure and the atomic transcendence migration (ADR-U027) — including the storage blobs, not only the rows. A last-moment transcender's captures are never erased mid-migration.
5. **Retirement is cascade-spec'd and tombstoned.** No content retires without an ADR-U016 cascade spec; retired IDs resolve to a defined tombstone shape. DS-4 never silently breaks a referrer it cannot see.
6. **Capture is personal-by-default; publication is an explicit act.** A capture of the real world is its capturer's personal data from the moment of intake; nothing becomes shared-world content except through the gated, audited publication path.
7. **Content, never structure.** DS-4 holds renderable substance and never absorbs world placement, story structure, or journey structure — the anti-absorption guard on the three inbound seams.
8. **i18n/a11y-capable shapes.** Block and asset shapes carry locale variants and accessibility alternatives from day one (ADR-U013 read as a boundary obligation: the design system renders what DS-4 serves; shapes that preclude translation or alternatives force a retrofit the ADR exists to prevent).

### 8. Open spec questions

- **Q1 — Block-kind vs content-family vocabulary** *(speculative-third-shape)*. The narrative core's journeys line names content families (Witness, Reflect, Decide, Act, Encounter, Rest); DS-3 §8 Q1 already carries step-kind vocabulary reconciliation across three vocabularies. Where does the content-family vocabulary live — block kinds, a classification dimension on block kinds, or step-side only? Joins the **ADR-U008 step-type specification session** (the named venue, now carrying the block-kind axis too).
- **Q2 — The profile-media boundary.** Is profile/avatar media (a FIM's or group's presentation imagery) DS-4 territory or PC-2/PC-3 identity-presentation substrate? Cold lean: **PC-substrate** — DS-4 owns experience content, not identity furniture (ADR-U005's profile_data already accumulates identity-adjacent material platform-side). Step 2 classifies the realized artifacts (`groups.avatar_url`, upload surfaces) against this lean; the boundary call routes per architecture, not per code.
- **Q3 — Capture provenance and real-world rights.** A scan of a real object or place can carry bystanders, private interiors, location traces. What rights/consent posture binds capture intake and — more sharply — publication of refined captures? Routes to the Privacy vertical; a research-spike candidate before any FEAT-PD touches the capture foot (sibling shape: DS-1 §8 Q1 body-position data).
- **Q4 — Reference-stability semantics.** When a beat or step references block ID X and X is revised, does the referrer see the revision (mutable block), or are blocks immutable-with-new-IDs (revision = new reference)? Contract-level because referrers are blind: the answer defines what an ID *promises*. Cold lean: published blocks are revisable-in-place with the pipeline state guarding drafts; versioning grain is L4 work after the lean is ratified at first FEAT-PD.
- **Q5 — Storage substrate shape** *(A#9's named site)*. Whether DS-4 content rides Supabase Storage buckets + policies, DB-resident rows, or a split by size/kind — and whether any realized buckets/policies already constitute a framework-provided contract. Step 2 checks; resolution is L4 work bound by the §6 commitments.
- **Q6 — Rendition generation** *(speculative-third-shape)*. Who produces renditions: pipeline-internal derivation at publish time, on-demand transformation at delivery, or Dreamineer-authored variants? Plausibly all three as data-driven generation kinds; firms at FEAT-PD time for the rendition capability.
- **Q7 — The DS-5 attachment seam. RESOLVED at the DS-5 descent (2026-06-10, ratified):** forum/DM attachments are **DS-4 assets referenced opaquely by ID** — DS-5 owns the attach/detach act as message/post metadata, never the artifact; one content substrate holds. The opaque-reference direction pattern extends to n=4 (DS-1 assets, DS-2 beats, DS-3 steps, DS-5 attachments — `communication.md` §7 invariant 8). Zero attachment substrate exists in code (dual-method verified at the DS-5 Step 2), so the resolution is forward-only; Shadow attachments inherit ADR-U027 ephemerality through DS-4's existing capture posture.
- **Q8 — AI-generated content posture.** For AI-Generative journeys (DS-3 §8 Q3, joint) and any DS-7-authored content: does generation write through the same role-gated write-path with a distinct audit posture, or through a dedicated generation seam? Routes to the DS-7 descent (which also owns the Whisp-split ADR promotion). **Resolved 2026-06-11 (DS-7 descent, ratified by Stefan, joint with DS-3 §8 Q3): the same role-gated write-path with a distinct audit posture — generation acts under a human's authority, is attributable as AI-generated, and never ships unreviewed (PRINCIPLES-AI: the last say is authorship; rails human-authored). No dedicated generation seam exists. See `intelligence.md` §8 Q4 and §L3 (AI-generation orchestration).**

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 and L2 (§L2 above) at this step — Step 1 cold derivation; Step 2 (code-informed stress-test) and Step 3 (adjudication) follow per the standing pattern. L3 does not read existing feature specs or code during derivation.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Asset registry & kinds | Asset registry | — | PC-1 (schema/RLS substrate) | Observability (authoring/lifecycle events) |
| Rendition & variant registry | Asset registry | Asset registry & kinds | PC-1 | Observability (rendition events). Invariant 2 binds: renditions are data, keying stays at surfaces |
| Storage-object lifecycle | Asset registry | Asset registry & kinds | PC-1 (object-storage conventions, ADR-U003) | Privacy (blob readability mirrors row RLS — never broader); Observability (storage events); Administration (orphan/garbage discipline rides retirement cascades) |
| Content-block registry & kinds | Content blocks | — | PC-1 | Observability (authoring events). §8 Q1 carries the kind-vs-family vocabulary |
| Block composition & asset embedding | Content blocks | Content-block registry & kinds; Asset registry & kinds | PC-1 | Observability (composition events); Privacy (locale/a11y variants are content, not personal data) |
| Capture intake | Capture → refine pipeline | Asset registry & kinds; Storage-object lifecycle | PC-2 (identity-status gate; ADR-U027 ephemerality on Shadow captures); PC-1 | Privacy (captures personal-by-default, invariant 6; real-world rights posture §8 Q3); Observability (intake events) |
| Refinement pipeline state | Capture → refine pipeline | Capture intake | PC-1 | Observability (pipeline-state transitions first-class); Privacy (pre-publication state stays private) |
| Content authoring write-path (studio modes + personal scope) | Authoring | Asset registry & kinds; Content-block registry & kinds; Refinement pipeline state | PC-3 (`has_permission()` against Creator/Anthropologist/Teller/Wayfinder templates per authoring context, D7; four-hop actor chain, P-O1); PC-4 (audit discipline) | Administration (all authoring audited); Observability (write-path events); Privacy (drafts authoring-context-scoped; personal-scope captures are personal data) |
| ID-resolution & delivery | Delivery & rendering | Asset registry & kinds; Rendition & variant registry; Content-block registry & kinds | PC-1; PC-2 (read posture: published shared-world content anon-readable) | Observability (resolution events); Privacy (unpublished never served broadly, invariant 6) |
| Rendering contracts | Delivery & rendering | Content-block registry & kinds; Asset registry & kinds | PC-1 | Observability (registry edits). Non-closure: renderer-consumable shapes per kind, registry never sealed (Extension System charter; ADR-U013 shapes per invariant 8) |
| Content retirement cascades | Lifecycle | Asset registry & kinds; Content-block registry & kinds; ID-resolution & delivery | PC-4 (admin operations audited); ADR-U016 (cascade spec precedes mechanics) | Administration (cascade-spec'd, tombstone semantics per invariant 5); Observability (retirement events); Notifications (publication/retirement triggers where FIM-visible state changes) |
| Shadow-capture ephemerality | Lifecycle | Capture intake | PC-2 (ADR-U027 TTL-erasure + atomic transcendence migration); PC-1 (pg_cron sweep; blob erasure in the storage substrate) | Privacy (ephemerality obligations incl. blobs, invariant 4); Administration (atomicity cascade-spec'd jointly with PC-2 per ADR-U016) |

**Transactions vertical:** no DS-4 capability touches Transactions at this derivation — content holds no entitlements and sells nothing; the marketplace over published content is DS-6's surface, a member buying is in-experience platform-tier work, and economy management is Console-scoped (ADR-U028). Recorded explicitly rather than left blank.

### Dependency chain

Buildable order within DS-4:

1. **Asset registry & kinds** — the foundation; everything renderable resolves to it.
2. **Storage-object lifecycle** — over assets; needs PC-1's object-storage conventions.
3. **Rendition & variant registry** — over assets.
4. **Content-block registry & kinds** — parallel foundation (blocks need only the kind registry to exist; gated on §8 Q1's vocabulary session before significant build, the DS-3 step-kind precedent).
5. **Block composition & asset embedding** — over blocks + assets.
6. **Capture intake** — over assets + storage; needs PC-2's identity gate and ephemerality contract.
7. **Refinement pipeline state** — over intake.
8. **Content authoring write-path** — integrates assets, blocks, and the pipeline; PC-3 mode-gating + PC-4 audit bind it end-to-end.
9. **ID-resolution & delivery** — over the registries + renditions; the contract the three inbound seams rely on.
10. **Rendering contracts** — over the kind registries; co-evolves with the design system's renderer side.
11. **Shadow-capture ephemerality** — over intake; needs PC-2's transcendence-event contract (cascade-spec'd before build).
12. **Content retirement cascades** — last; over the registries + delivery; cascade-spec'd per ADR-U016 before any mechanics.

### External dependencies

| Source | Capability consumed | Consuming DS-4 capability |
|---|---|---|
| PC-1 Infrastructure | RLS substrate; SECURITY DEFINER + `search_path = ''` discipline; migration discipline | every DS-4 capability |
| PC-1 Infrastructure | Object-storage conventions (ADR-U003 Supabase Storage) | Storage-object lifecycle; Capture intake; Shadow-capture ephemerality (blob erasure) |
| PC-1 Infrastructure | Scheduled-job substrate (pg_cron) | Shadow-capture ephemerality (TTL sweep participation) |
| PC-1 Infrastructure | Feature-flag substrate | Content authoring write-path; Capture intake (staged rollout of pipeline surfaces) |
| PC-2 Identity | Identity-status gate (Shadow/FIM); four-hop actor chain | every actor-touching capability |
| PC-2 Identity | Shadow ephemerality (TTL + explicit-erase per ADR-U027) | Capture intake; Shadow-capture ephemerality |
| PC-2 Identity | Transcendence lifecycle event (atomic migration per ADR-U027) | Shadow-capture ephemerality (composed atomicity invariant per §6) |
| PC-3 Organisation | `has_permission()` + role templates (Creator, Anthropologist, Teller, Wayfinder — D7); personal-group actor primitive (P-O1) | Content authoring write-path; Refinement pipeline state (publication gating); Capture intake (personal-scope self-gating) |
| PC-4 Governance | Admin-operation + audit-log discipline | Content authoring write-path; Content retirement cascades |
| Vertical: Privacy | Capture/personal-data obligations; Shadow-data obligations; publication-consent posture (§8 Q3) | Capture intake; Refinement pipeline state; Content authoring write-path; Shadow-capture ephemerality |
| Vertical: Observability | Event shape (request ID, actor, outcome) | every event-emitting capability |
| Vertical: Administration | Cascade-spec format per ADR-U016 | Content retirement cascades; Shadow-capture ephemerality (transcendence atomicity) |
| Vertical: Notifications | Notification-trigger shape | Content authoring write-path (publication triggers); Content retirement cascades |

Cross-referenced per the template rule: PC-1's object-storage conventions row exists in `world-model.md`'s external-dependencies table (DS-1's placed-asset references already consume it — verified this session) and traces to PC-1's inventory; the PC-2 transcendence/ephemerality rows, PC-3 `has_permission()`/role-template rows, and PC-4 audit discipline exist in those inventories (verified across the PC chain at prior descents). **Consumers, not dependencies** (direction guard): the three sub-studios write through the write-path from their own modes; the Hub and Gimbal read, render, and operate the pipeline ends; DS-6 reads the published registry (provisional); DS-7 reads context and prospectively writes through the gated path (provisional, §8 Q8). **DS-1, DS-2, and DS-3 are referrers, not callers** — they hold DS-4 IDs and never invoke this contract; DS-4 depends on no Domain Service.

### Sources-status block

- **ADR-U025 + the 2026-06-05 product locks (load-bearing authority):** solid — the capture→refine pipeline ("scan a real object on the phone, refine it on the canvas — two ends of one workflow"), the equipment-profile model, and World Studio's capture-foot/deep-edit split consumed directly. **DS-4 is the first Domain Service deriving primarily from the product locks rather than a dedicated canonical core** — the canon-sub-page-gap remark per the DS-3 precedent: no `content.md`-shaped core exists; the narrative core's planned `journeys.md` sub-page (content families) is unwritten. Proceeded with remark; §8 Q1 carries the vocabulary half.
- **Register Section 3 DS-4 row ("Gimbal-capture → Hub-refine pipeline; equipment-keyed delivery"):** consumed as the derivation constraint set, with the equipment-keying tension resolved *within* ADR-U025's law (renditions/variants as served data; keying stays feature-grain at surfaces) — ratified at the Step 1 checkpoint.
- **Narrative core:** solid for the boundary (beats present content; structure/substance split); the content families are canon from the unwritten sub-page line — proceeded with remark, §8 Q1.
- **Cosmology core:** consumed as boundary input only (the world the assets depict; nothing DS-4-owned found — correct by design).
- **Beings core:** solid — the NPC body layer (Creator-authored 3D presence) consumed as an asset class; the body/culture/character layering stays DS-1/DS-2 structure referencing DS-4 substance.
- **ADR citation corrections (state-read findings, this session):** ADR-U008's text carries step-type extensibility only — the "content types" extension category lives in the **Extension System charter** (domain README) and binds with ADR-U018; this spec cites accordingly (§5). ADR-U013 carries no content-specific text — invariant 8 is a boundary *inference* (shapes must not preclude i18n/a11y), recorded as such. **ADR-U005 joined as boundary input** (profile_data's identity-adjacent accumulation supports the §8 Q2 cold lean).
- **Whisp split (decided — consumed, not reopened):** DS-4 owns no Whisp face (`decisions/PENDING.md`).
- **No FIRST DECISION at this descent:** DS-4's name is unchallenged (vocabulary-vetted: no collision); the first ratification gate was the Step 1 checkpoint (ratified by Stefan, 2026-06-10).
- **Seam resolutions (this session, ratified at the Step 1 checkpoint; sibling amendments land at Step 3):** (1) **DS-2 §8 Q8 confirmed** — beats are structure, blocks are renderable content, references opaque by ID, DS-4 owns everything renderable; (2) **DS-3 §8 Q7 confirmed** — steps reference DS-4 blocks opaquely; narrative integration composes at delivery; no step→beat references; (3) **DS-2 §8 Q3 + DS-1 §8 Q5 (joint) resolved as the three-way rule** — world-fact stays DS-1 (lore = fact registry, thin-with-shape-named: rows whose renderable presentation, where one exists, is an opaque DS-4 block reference), story-canon stays DS-2, everything renderable is DS-4; (4) **DS-1 placed-asset boundary confirmed from the owned side** — DS-4 serves ID-resolution and never calls a referrer.
- **L2-line altitude:** the domain README line "Media, assets, narrative blocks" predates ADR-U025 — it omits the capture→refine pipeline, renditions/variant delivery, pipeline state, Shadow-capture ephemerality, the authoring write-path, and rendering contracts. Revision proposed at Step 3 of this run.
- **Sibling specs:** DS-1/DS-2/DS-3 exist and were consulted **only** for the four routed seam questions (boundary input, not capability source). DS-5/DS-6/DS-7 remain undefined: boundary claims against them (Q7, Q8; the DS-6/DS-7 consumer lines) are provisional per the sibling-undefined rule — each sibling's descent re-checks its DS-4 boundary.
- **Vertical specs:** Privacy substantive; Administration/Transactions corrected at G-3; Notifications/Observability remain scaffold-tier — proceeded with remark per G-03 (`docs/ecosystem/how-we-work/gaps.md`).
- **No code, migrations, or FEAT-* files read** at Step 1, per the cold-derivation discipline. The Step 2 expectation is **stated in advance for Step 2 to verify rather than assume**: near-zero DS-4 artifacts (the 19-table baseline holds no DS-4 tables; zero `asset`/`content_block`/`attachment` vocabulary; no storage buckets in migrations) — **with two boundary-shaped realized artifacts that must be classified rather than skipped**: the `journeys.content` JSONB embedding renderable step content inline (expected classification: Class 3 routed to DS-3's evolution — the realized inline shape predates the partition, PW-1 reading; not a DS-4 capability sourced from code), and profile/avatar media (`groups.avatar_url`, upload surfaces — classified against the §8 Q2 cold lean). **The expectation held exactly — see the Step 2 block below: zero Class 2 deltas, zero retractions, both boundary artifacts classified as predicted.**

### Step 2 — code-informed stress-test findings

*Run 2026-06-10 (same session, after the Step 1 checkpoint ratification), per the standing pattern. Sweep scope: `supabase/migrations/` in cumulative-forward order (A#8) — 19 current + 71 archived files — plus `supabase/seeds/`, `lib/` (types, hooks — directory scope-surveys first), `app/`, `components/`, and `tests/`, run as sandboxed sweeps (the DS-3 context-economy precedent). Term set: {asset, content_block, attachment, media, rendition, bucket, capture, upload, storage} word-boundary case-insensitive, plus casing variants (contentBlock / ContentBlock / content-block; Asset / asset_ / _asset — the dual-reading discipline) and framework-mechanism patterns (supabase.storage, .storage.from, createBucket, getPublicUrl, storage-schema references). **Every zero-hit claim was verified by a second, differently-shaped method** (the binding empty-result instance rule). Enumeration claims are scoped to these patterns and paths, not "anywhere."*

- **Zero DS-4 domain artifacts exist on disk** — the stated near-zero expectation held exactly. The end-state schema is 19 tables (PW-5 baseline re-verified), all PC-2/PC-3/PC-4/DS-3/DS-5 territory; no table, function, RLS policy, type, or hook carries asset/block/media semantics. The calibrated "`media` 1 hit" matched precisely: the loose-method hit is "inter**media**te" in `DifficultyLevel` (`lib/types/journey.ts`) — a false positive the word-boundary method excluded.
- **Migration archeology clean (PW-MARCH1 did not fire):** zero DS-4 vocabulary across all 71 archived migrations — no content/media substrate was lost in the D15 rebuild.
- **A#9 check (Supabase Storage, the named site for this entity):** the framework-provided storage surface IS realized — but solely for profile avatars: `components/profile/AvatarUpload.tsx` (`supabase.storage.from('avatars')`, the codebase's only storage usage). **No bucket provisioning exists anywhere in the repo** (migrations, seeds, scripts — dual-method verified): the `avatars` bucket is dashboard-created, un-migrated infrastructure — routed to the PC-1 channel as an infrastructure-discipline note. No realized DS-4 content contract exists; §8 Q5 stays open with the precedent noted.
- **Boundary classification 1 — `journeys.content` JSONB (pre-named):** verified (D15 rebuild L127; sprint1 seeds embed renderable step content inline with the three-value `type` union). Classified as expected: **Class 3 routed to DS-3's evolution** — the realized inline shape predates the partition (PW-1 reading) and is already recorded in `journeys.md` §2/§6/§8 Q1; under the ratified Q7/Q8 boundary the forward shape is steps referencing DS-4 blocks by ID. Not a DS-4 capability sourced from code; no new pickup needed.
- **Boundary classification 2 — profile/avatar media (pre-named):** verified (`groups.avatar_url`; AvatarUpload; uploads confined to profile surfaces). Classified per the ratified §8 Q2 cold lean: **PC-2/PC-3 identity-presentation substrate, not DS-4** — and the realized substrate documents the same reading (`20260227110556`: "Personal groups are the single source of truth for display names ... and avatars").
- **Noise classes excluded (recorded so the next reader doesn't re-litigate):** `capture` in trigger comments ("capture members before CASCADE" — one hit per migration tree); "intermediate" containing `media`; React rendering vocabulary (no renderer-registry semantics anywhere).
- **Cold-position retraction rate: zero; Class 2 delta count: zero** (the cross-DS series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; **DS-4 0**) — at rich priors and near-zero code, both deltas and retractions are zero, consistent with the retraction-tracks-prior-coverage refinement.

### Step 3 — adjudication

Zero-delta adjudication: the Step 1 candidate inventory is **committed unchanged** — no row added, removed, reshaped, or re-owned by Step 2 evidence (the program's third zero-delta at a Domain Service, and the first whose Step 2 carried pre-named boundary artifacts classified rather than skipped).

**Forward-commitment classification (per the three-way discipline):** all twelve capabilities are **full forward-commitment relative to code** — no capability has any empirical analogue (the avatars storage surface is PC-substrate per the Q2 classification, not a DS-4 partial realization). Whether any DS-4 row falls inside the active wave's scope is a wave-planning determination (horizontal axis), not an L3 output; the classification records only the empirical floor.

**Q-resolution slate:** the four routed seam questions this descent owned were resolved at the Step 1 checkpoint (ratified by Stefan, 2026-06-10) and their sanctioned sibling amendments land in this session's commits (DS-2 §8 Q8 confirmed; DS-3 §8 Q7 confirmed; DS-2 §8 Q3 + DS-1 §8 Q5 resolved as the three-way rule). This spec's eight §8 questions are deferred-routed as written in each entry (Q1 → the ADR-U008 step-type specification session; Q3 → Privacy vertical, research-spike candidate; Q7 → DS-5 descent; Q8 → DS-7 descent; Q2 classified at Step 2 with the boundary call recorded; Q4/Q5/Q6 → FEAT-PD/L4 time).

**Buildable-order implication confirmed:** the §L3 dependency chain stands as the build order from a clean slate; the first FEAT-PD candidates remain Asset registry & kinds and Storage-object lifecycle, with the block-kind system gated on the ADR-U008 session (§8 Q1) and the capture foot gated on the §8 Q3 privacy posture.

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

### Summary

No FEAT-PD feature specs exist for DS-4 at this derivation.

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| *(all twelve capabilities)* | — | — | No specs yet; L4 runs follow L3 stabilisation (Step 2/3) and wave-planning pull |

### Capabilities without specs

All §L3 capabilities. First candidates when DS-4 enters build: Asset registry & kinds and Storage-object lifecycle (the dependency-chain foundations) — with the block-kind system gated on the ADR-U008 step-type specification session (§8 Q1) and the capture foot gated on the §8 Q3 privacy posture.

### Features without capabilities

None — no FEAT-PD files exist under `features/`.

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
