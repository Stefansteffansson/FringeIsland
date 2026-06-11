# Domain Service — Intelligence (DS-7)

<!-- Valid service slugs: world-model | narrative | journeys | content | communication | discovery | intelligence -->

---
slug: intelligence
owner: platform/domain/intelligence
consumers: [products/hub, products/gimbal]
status: proposed
last_updated: 2026-06-11
tier: Domain Services
tags: [domain-service:intelligence]
feature_prefix: PD
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-06-11 in the DS-7 descent session (opener: `docs/planning/sessions/openers/ds7-intelligence-descent-opener.md`; NO FIRST DECISION — the DS-7 name is dispositioned in place in `decisions/PENDING.md`: "Intelligence" kept deliberately, the cosmology-neutral naming lock). Authority chain: root + platform + domain `CLAUDE.md` cascade (L1) + the domain README L2 inventory line + the **beings core** (the primary core: the Whisp being-face — S1/S2/S17-18/S22/S6-7) + the **personal-growth core** (starved-drive sensing, S28; the privacy model; the engagement spectrum) + the cosmology core (boundary input — the cord/Void/severance are DS-1's face) + the roles core (Shadow-Whisp posture) + **`docs/ecosystem/PRINCIPLES-AI.md` (constitutional — the guard-railing law; first entity to carry it in the authority chain)** + the Session B conformance register Section 3 DS-7 row + **the Whisp-split decision (`decisions/PENDING.md`, ratified at DS-1; consumed as settled architecture throughout; promoted to a numbered ADR at this descent's close)** + ADR-U023/U005/U016/U027/U010/U008/U018/U002/U025/U026/U028/U007/U006/U003 + the carry-forward priors from the DS-6 closing bridge. Five routed seam questions (world-model.md §8 Q7, content.md §8 Q8 + journeys.md §8 Q3 joint, communication.md §8 Q5, discovery.md §8 Q2) are resolved from the owned side at this descent; the sanctioned sibling amendments land at Step 3. Code, migrations, seeds, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test) and Step 3 (adjudication) are recorded at the foot of §L3.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023). Revised when the service's boundaries, public contract, or dependencies change.*

### 1. Purpose

DS-7 Intelligence owns the **Whisp as a being** — per the Whisp-split decision: the dialogue runtime (each FIM's own inner dialogue, unique, private, one per person — S1; universal, Shadow or FIM — S39); the **empty-fills-by-growth state** (the Whisp starts empty of being *you* and fills only as the FIM grows, two parallel completions mutually driven — S2; the growth is the mechanism, the filling is the registry of it — S17); the **dissolved-assessment senses model** (validated instruments never delivered as questionnaires — their structure preserved beneath the Whisp's curious dialogue, the form transformed — S17; the Big-5-to-five-senses mapping with intrinsic, never-coerced disclosure motivation — S18); the **maturity/internalisation arc** (the relationship arcs from awkward to friendship to self-love — S5; the platform is built to graduate, not retain — S6-7), from which DS-7 **derives the cord's salience channel** (rendered through DS-1's cord, fed through DS-1's own contract); and **guard-railing enforcement** (the constitutional law: rails are bidirectional and always human-authored — DS-7 enforces them, in both directions, and never authors them — PRINCIPLES-AI). Alongside the being-face, DS-7 owns **profile accumulation**: the consent-gated store of what the platform learns — assessment results from journeys, reflections from content, insights from Intelligence, self-defined intentions — in the bucket/source shape ADR-U005 locks ("buckets are data, not schema"). DS-7 is the platform's intelligence layer and sits at the **top of the Domain dependency order**: it consumes sibling context and feeds shaping inputs back through the *target service's own contract* (salience → DS-1, personalisation → DS-3, generation → DS-4's write-path); **nothing depends on DS-7** — the intelligence acts in the world; the world never depends on the intelligence.

DS-7 is **not**: the Whisp's world-presence (DS-1 World Model — cord position and state, the dial, anchor chain, severance tiers, respawn position; the split is decided and DS-1 owns that face); journey structure, delivery, or applied personalisation state (DS-3 Journeys — DS-7 feeds signature-shaping *input* through DS-3's contract; DS-3 owns the applied state); content substance or the content write-path (DS-4 Content — AI-generated content writes through DS-4's role-gated path under the audit posture resolved at §8 Q4; DS-7 never owns a parallel content store); conversation, feeds, or message transport (DS-5 Communication — Whisp dialogue is the being-face, never conversational state, and the Whisp never carries FIM-to-FIM messages; the branch is the FIM-FIM channel — S36, §8 Q6); search, recommendation, or any ranking surface (DS-6 Discovery — DS-7 supplies consented profile *signals* at most, per §8 Q5; it owns no recommendation surface); identity, consent substrate, or the user-profile record (PC-2 — DS-7 consumes the consent surface and accumulates *developmental data*, never identity furniture; profile/avatar *media* is PC-2/PC-3 substrate, settled at DS-4); authoring guard rails (humans author rails — Dreamineers and the enterprise plane; DS-7 enforces); and the AI model substrate itself (provider credentials and model-call plumbing are app-tier concerns — PC-1 Finding #4's channel; §8 Q1).

### 2. Concepts

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Whisp being-state | The filled-ness of one Whisp: the accumulated personality registry (what of *this* human the Whisp now carries — S2/S17), senses development state, and maturity/internalisation stage. One per person, Shadow or FIM, from first encounter (S1/S39); empty at first. | DS-7 tables (none realized; see §6) |
| Dialogue state | The Whisp's curious-dialogue runtime state and history: threads, context, and the dissolved-instrument structure running beneath (S17). Private to its FIM (privacy model: internal state private unless the FIM chooses otherwise). | DS-7 tables |
| Profile bucket | One bucket/source row of accumulated developmental data per ADR-U005: assessment results, reflections, insights, self-defined intentions. Bucket kinds are a registry, never a sealed enum (U005 "buckets are data, not schema"; U018). | `profile_data` per ADR-U005 (the locked shape; unrealized — see §6) |
| Sense | One of the five senses — the Big-5-mapped metaphorical perception channels (S17-18). A sense's development state reflects the FIM's disclosure breadth; sense kinds are a registry. | DS-7 tables |
| Drive-balance reading | The starved-drive sensing output over Live/Grow/Matter (S28): which drive is currently starved, leaning the journey toward restoring balance — a dance partner, never a staircase. An internal shaping signal; **never a surfaced score**. | Computed; persisted readings in DS-7 tables |
| Salience derivation | The DS-7-derived maturity signal the cord renders — the cord's visibility receding as the relationship matures (S6-7). Fed to DS-1 through DS-1's own contract (§8 Q3). | Computed; rendered in DS-1 |
| Guard rail | A human-authored rail definition DS-7 enforces, pointing both directions: constraining the AI and protecting the human driver (PRINCIPLES-AI). Rail kinds are a registry. | DS-7 tables (definitions authored by humans; write-gated per U007/U028) |
| Insight | A DS-7-generated observation offered to the FIM, and — only with consent — accumulated as a profile bucket entry ("insights from Intelligence", U005). | `profile_data` (insights bucket) |

### 3. Public contract (consumed by Surfaces)

Six contract families. Operation grain is L4 work; the families and their boundaries are L2-stable.

- **Whisp dialogue** — the FIM's conversation with their own Whisp: open/continue dialogue, the Whisp's curious questions, tough-love disagreement with compassion (S3), everything voluntary (S5). One Whisp per person; Shadows included from the start (S39, U027 posture). The dissolved-instrument structure runs beneath this family invisibly (S17).
- **Own being-state reads** — a FIM reads their own Whisp's state: filling, senses development, maturity stage. Self-first privacy: internal state is private unless the FIM chooses otherwise; a friend's view of cord *health* is DS-1's branch-gated surface, not this family.
- **Profile accumulation** — consent-gated bucket writes and reads per the U005 shape: sources write assessment results (journeys), reflections (content), insights (DS-7 itself), self-defined intentions (the FIM). Bucket-level consent per PC-2's surface; disclosure-anchored (S17-18); the FIM reads and controls their own accumulation.
- **Shaping feeds (outbound — DS-7 calls the target's contract)** — salience → DS-1 (§8 Q3); personalisation input → DS-3 (signature-shaping, deepening only with voluntary disclosure breadth — DS-3's no-coercion line honoured from the feeding side); recommendation signals → DS-6 (only per the §8 Q5 consent posture). These are *consumed contracts*, listed here because the call direction is DS-7's defining shape: the feed is always through the target service's own contract, never a DS-7 surface the sibling reads.
- **Generation orchestration** — AI-generation for AI-Generative journeys (DS-3 §8 Q3) and DS-7-authored content, writing **through DS-4's role-gated write-path with a distinct audit posture** (§8 Q4): generation acts under a human's authority (the last say is authorship — PRINCIPLES-AI), is attributable as AI-generated, and never ships unreviewed.
- **Guard-railing** — rail-enforcement checks both directions (AI kept in its lane; the human driver's own drift flagged against their own stated values — PRINCIPLES-AI examples), rail-registry reads. Rails are always human-authored; this family exposes enforcement and inspection, never rail authorship by the AI.

Consumers: the Hub and Gimbal surface the dialogue, own-state, accumulation-control, and rail surfaces (equipment-keying stays feature-grain at the surfaces, ADR-U025). **No studio writes to DS-7** (ADR-U026 — the three sub-studios write to DS-1/DS-2/DS-3). **No sibling Domain Service consumes DS-7** — the world never depends on the intelligence; every DS-7-to-sibling flow goes through the sibling's own contract.

### 4. Internal dependencies (consumed *from* this service)

- Platform Core: **PC-1** Infrastructure (schema/RLS substrate; pg_cron scheduled jobs for Shadow TTL erasure; app-tier secrets posture for model credentials — Finding #4 channel); **PC-2** Identity (identity status; the consent surface that gates accumulation; Shadow ephemerality and atomic transcendence, U027/S46); **PC-3** Organisation (`has_permission()` gating; group scoping; the personal-group actor primitive `get_current_personal_group_id()`); **PC-4** Governance (audit discipline — the generation audit posture and rail-enforcement events land in it).
- Other domain services (DS-7 sits at the top of the dependency order and is the maximal consumer): **DS-1** World Model (world/cord state reads; the salience intake contract DS-7 calls); **DS-2** Narrative (character and story context reads where the Whisp speaks inside a story — consume-only); **DS-3** Journeys (journey context reads; the personalisation input contract DS-7 calls); **DS-4** Content (content context reads; the role-gated write-path generation writes through); **DS-5** Communication (communication context reads under the §8 Q7-adjacent posture: only the FIM's own contributions, consent-gated, for that FIM's own accumulation); **DS-6** Discovery (declared-interest facet reads as profile context).

### 5. Extension points

Plugin contracts registered with the Extension System (ratified from the owned side at the Extension System descent, 2026-06-11 — the four registries below are kind-registry instances under its contract families; see [`../extensions/SPECIFICATION.md`](../extensions/SPECIFICATION.md)):

| Extension point | Interface | Lifecycle |
|----------------|-----------|-----------|
| Bucket kinds | New profile-data bucket types as registry rows (U005/U018 — no migration to add a bucket) | Registry insert; Ferd non-closure |
| Sense kinds | The senses model's channel registry (five at canon; the registry, not a sealed enum, is the shape — U018) | Registry insert |
| Rail kinds | Guard-rail definition types (both directions) | Registry insert; rails themselves always human-authored |
| Dialogue-context providers | Context intake shapes for the dialogue runtime (which sibling contexts the Whisp may draw on) | Ratified as an extension-point declaration at the Extension System descent (2026-06-11) |

### 6. Storage & schema

**No DS-7 schema is realized.** The locked accumulation shape is ADR-U005's `profile_data` table (bucket/source model; JSONB content per bucket; "buckets are data, not schema") — **an unrealized lock**: nothing on disk creates it (verified dual-method at this descent; the DS-5 ADR-U021 law-stands-unrealized handling applies — the lock binds the forward shape, the code is the correction target). Being-state, dialogue-state, sense-state, drive-balance readings, and rail definitions are DS-7 tables to be designed at L4 within these postures: RLS self-only by default (the privacy model: the platform never surfaces private data without explicit FIM action; Stewards cannot see members' private developmental data; no aggregate from private journeys is visible to other FIMs; anonymised aggregate exploration only under explicit informed consent and enterprise stewardship); actor resolution via `get_current_personal_group_id()` (P-O1 — never bare `auth.uid()`); role names as TEXT-keyed `role_templates` rows (D7); Shadow rows TTL-erased per U027 with transcendence carrying them over atomically (S46); every registry TEXT-keyed and open (U018).

### 7. Service-level invariants

1. **One Whisp per person, from the start.** Shadow or FIM, everyone has one (S1/S39); DS-7 never instantiates a second, never pools, never transfers.
2. **Filling derives only from the FIM's own growth and disclosure** (S2/S17). The Whisp is never pre-filled, bought, copied, or seeded from another person's data.
3. **Everything is voluntary; no coercion surface exists** (S5/S18). Disclosure motivation is intrinsic and sensory; personalisation deepens only with voluntary disclosure breadth (DS-3's line, honoured from the feeding side).
4. **Instruments never surface as questionnaires.** The structure of validated assessments is preserved beneath dialogue; the form is transformed (S17). The validity question this raises stays open at canon level (§8 Q2).
5. **The Whisp's internal state is private to its FIM** unless the FIM chooses otherwise; Stewards never see private developmental data; no aggregate derived from private journeys is visible to other FIMs (privacy model).
6. **The anti-leaderboard guardrail binds DS-7's outputs.** Drive-balance readings, senses states, filling, and accumulated signals are never comparative across people — no ranking, scoring, counting, or popularity surface, ever (register; world-model invariant 2; journeys invariant 8).
7. **Guard rails are always human-authored; DS-7 enforces them, bidirectionally, and never authors them** (PRINCIPLES-AI — constitutional; if AI defined its own rails, authorship of the constraints would be handed to the thing being constrained).
8. **Nothing depends on DS-7.** Every outbound shaping flow goes through the target service's own contract (salience → DS-1; personalisation → DS-3; generation → DS-4); the world never depends on the intelligence.
9. **Built to graduate, not retain** (S6-7). The internalisation arc's endgame is DS-7's own recession: the cord's visibility recedes, dialogue cadence softens, and the destination is a human carrying their own wiser voice without the medium.
10. **The Whisp never carries FIM-to-FIM communication.** The branch is the FIM-FIM channel (S36); Whisp dialogue is the being-face, not a transport (§8 Q6).

### 8. Open questions

- **Q1 — Dialogue-runtime substrate** *(speculative-third-shape)*. Where does the model-call orchestration live (Edge Functions vs app-tier service), what is session-state's persistence grain, and which provider abstraction applies? Provider credentials are app-tier secrets per PC-1 Finding #4's channel. Settles toward implementation (FEAT-PD time); the contract families above are substrate-agnostic.
- **Q2 — The validity question** *(canon-level, open by design)*. Do validated instruments dissolved into dialogue retain psychometric validity — and what must DS-7 store to preserve the instrument structure beneath the transformed form (S17)? The register row carries it open; resolution belongs to the canon work (the unwritten `whisp.md` sub-page), not to code.
- **Q3 — Salience-channel shape** *(resolves at this descent; world-model.md §8 Q7 joint)*. Cold lean: **push event** — DS-7 calls DS-1's contract with derived salience; a derived-read shape would have DS-1 reading DS-7, inverting the settled dependency direction.
- **Q4 — Generation posture** *(resolves at this descent; content.md §8 Q8 + journeys.md §8 Q3 joint)*. Cold lean: **the same role-gated write-path with a distinct audit posture** — generation acts under a human's authority and is attributable as AI-generated; a dedicated ungated generation seam would let AI ship unreviewed work, violating the rails law.
- **Q5 — Recommendation-signal supply** *(resolves at this descent; discovery.md §8 Q2 joint)*. Cold lean: **declared interests only at Ferd**; DS-7-accumulated profile signals may feed DS-6's affinity shaping later **only under explicit bucket-level PC-2 consent**, never silently.
- **Q6 — Whisp-carried messages** *(resolves at this descent; communication.md §8 Q5 joint)*. Cold lean inherited and confirmed from the owned side: **no** — the branch is the FIM-FIM channel; Whisp dialogue is DS-7's being-face, never a transport.
- **Q7 — Portability and retention.** The right-to-portability shape over `profile_data` buckets and the retention posture for accumulated developmental data (FIM: retained until deletion request? Shadow: U027 TTL). U010 names AI data handling as a distinct Privacy concern; the obligation detail routes to the Privacy vertical's inventory.
- **Q8 — The loop-persistence DS-7 slice** *(clarification-grade; narrative.md's "DS-3/DS-7 territory")*. Cold lean: DS-3 owns persisted loop-runtime state (delivery); DS-7 receives loop-borne growth (relational insight, emotional clarity) only as consented accumulation through its own profile-accumulation family — there is no direct DS-2/DS-3 → DS-7 write.
- **Q9 — Graduation data disposition** *(speculative-third-shape)*. What does DS-7 retire as the Whisp internalises — does the FIM export their accumulated profile at graduation, does dialogue state archive or erase, and what does "the cord's visibility recedes" mean for stored salience? Joint with the `whisp.md` canon sub-page (awaiting specification).

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the service enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Whisp dialogue runtime | Dialogue & being-state | Being-state store; Dissolved-instrument engine; Guard-rail enforcement | PC-2 (identity, Shadow posture); PC-3 (gating); DS-1/DS-2/DS-3/DS-4 context reads | Privacy (dialogue is private FIM data); Observability (dialogue events, content-free) |
| Whisp being-state store | Dialogue & being-state | — | PC-1 (schema/RLS); PC-2 (Shadow TTL / transcendence) | Privacy (internal state private; Shadow ephemerality); Observability (state-transition events) |
| Dissolved-instrument engine | Dialogue & being-state | Being-state store; Profile bucket store | — | Privacy (instrument data is developmental data); Administration (instrument registry, Console-scoped per U028) |
| Profile bucket store | Profile accumulation | Consent & disclosure gating | PC-1 (schema/RLS); the U005 `profile_data` shape | Privacy (the AI-data-handling core, U010 — portability, retention); Observability (accumulation events) |
| Consent & disclosure gating | Profile accumulation | — | PC-2 (consent surface) | Privacy (bucket-level consent; disclosure anchoring); Administration (consent-posture administration) |
| Shadow ephemerality & transcendence handling | Profile accumulation | Profile bucket store; Being-state store | PC-1 (pg_cron sweep); PC-2 (U027 lifecycle, atomic transcendence S46) | Privacy (TTL erasure; carry-over consent); Observability (lifecycle events) |
| Starved-drive sensing | Sensing & shaping feeds | Profile bucket store; Being-state store | — | Privacy (readings are private, never comparative); Observability (sensing events, content-free) |
| Personalisation input feed | Sensing & shaping feeds | Starved-drive sensing; Consent & disclosure gating | DS-3 (its personalisation input contract — DS-7 calls) | Privacy (feed mirrors disclosure breadth); Observability (feed events) |
| Salience derivation & feed | Sensing & shaping feeds | Being-state store (maturity arc) | DS-1 (its salience intake contract — DS-7 calls; §8 Q3) | Privacy (salience is FIM/Shadow data rendered on the cord); Observability (feed events) |
| Recommendation-signal supply | Sensing & shaping feeds | Consent & disclosure gating; Profile bucket store | DS-6 (its signal posture, §8 Q5); PC-2 (consent) | Privacy (explicit consent; never silent); Observability (supply events) |
| AI-generation orchestration | Generation | Guard-rail enforcement | DS-4 (role-gated write-path, §8 Q4); DS-3 (AI-Generative route context); PC-4 (audit posture) | Privacy (no private data in generation context without consent); Administration (generation authority Console-visible); Observability (generation events, attributable) |
| Guard-rail enforcement | Guard railing & lifecycle | Rail registry (within) | PC-4 (enforcement events to audit) | Administration (rails human-authored, administered by scope U028); Observability (enforcement events first-class); Privacy (driver-protection flags reference the human's own stated values only) |
| AI-context lifecycle cascades | Guard railing & lifecycle | Profile bucket store; Being-state store; Dialogue runtime | U016's Intelligence cascade slot (retirement/deletion/transcendence effects on AI context) | Privacy (deletion cascades); Observability (cascade events) |
| Internalisation / graduation lifecycle | Guard railing & lifecycle | Salience derivation; Being-state store; Profile bucket store | PC-2 (account lifecycle) | Privacy (graduation data disposition, §8 Q9); Observability (arc milestones, private) |

*Transactions: explicitly none — DS-7 has no monetisable surface; the marketplace is DS-6's surface and the rails are the Transactions vertical's (settled at DS-6). Notifications: none originated — the Whisp speaks in-experience through its own dialogue family; any notification a surface raises about Whisp activity is the settled vertical/DS-5/products shape, consumed not originated.*

### Dependency chain

Registries and the **being-state store** come first (everything reads or writes a Whisp's state). **Consent & disclosure gating** precedes the **profile bucket store** (no accumulation without the gate). The **dialogue runtime** needs being-state + the **dissolved-instrument engine** (which needs the bucket store for results). **Starved-drive sensing** reads accumulation; the three **shaping feeds** need sensing/maturity plus their target contracts stable (DS-1, DS-3, DS-6 — all landed). **Guard-rail enforcement** is a peer prerequisite to the dialogue runtime and generation (nothing AI-facing ships unrailed). **AI-generation orchestration** needs rails + DS-4's write-path. **Lifecycle cascades** need all stores; the **graduation lifecycle** lands last (it retires what the others build).

### External dependencies

| Source entity | Capability consumed | Consuming internal area |
|---|---|---|
| PC-1 Infrastructure | Schema/RLS substrate; pg_cron scheduled jobs (Shadow TTL); app-tier secrets posture (model credentials — Finding #4 channel) | All; Profile accumulation; Generation |
| PC-2 Identity | Identity status; consent surface; Shadow ephemerality + atomic transcendence (U027/S46) | Profile accumulation; Dialogue & being-state |
| PC-3 Organisation | `has_permission()`; group scoping; personal-group actor primitive (P-O1) | All (gating) |
| PC-4 Governance | Audit discipline (generation attributability; rail-enforcement events) | Generation; Guard railing & lifecycle |
| DS-1 World Model | World/cord state reads; the salience intake contract (DS-7 calls — §8 Q3) | Sensing & shaping feeds |
| DS-2 Narrative | Character and story context reads (consume-only) | Dialogue & being-state |
| DS-3 Journeys | Journey context reads; the personalisation input contract (DS-7 calls) | Sensing & shaping feeds; Dialogue & being-state |
| DS-4 Content | Content context reads; the role-gated write-path (generation writes through it — §8 Q4) | Generation |
| DS-5 Communication | Communication context reads (the FIM's own contributions, consent-gated, for that FIM's accumulation) | Profile accumulation |
| DS-6 Discovery | Declared-interest facet reads as profile context | Sensing & shaping feeds |
| Extension System | Plugin-contract registration (provisional — its derivation is next in the queue) | All (registries) |

Cross-referenced per the template rule: DS-1's salience-channel input line exists (`world-model.md` §3 cord operations — "salience-channel input (DS-7-fed)"; §8 Q7 resolves at this descent); DS-3's personalisation seam exists (`journeys.md` §3 — "DS-7 feeds signature-shaping input through this contract"); DS-4's context-read/write line exists (`content.md` §3, provisional posture resolved at §8 Q4); DS-5's context-read line exists (`communication.md` §3, posture owned here); DS-6's facet line exists (`discovery.md` §3, §8 Q2 joint). PC-1 pg_cron + secrets posture, PC-2 consent/ephemerality, PC-3 `has_permission()`/actor primitive, PC-4 audit discipline all exist in those inventories (verified across the PC chain at prior descents). **Consumers, not dependencies** (direction guard): the Hub and Gimbal read the dialogue/own-state/accumulation/rail families; **no studio writes to DS-7; no sibling consumes DS-7** — every DS-7-to-sibling flow is DS-7 calling the sibling's own contract.

### Sources-status block

- **Canon-sub-page gap (proceed-with-remark, DS-3 precedent):** the beings core's planned `whisp.md` sub-page — encounter phenomenology, dialogue mechanics, the senses model, internalisation arc — is *"Awaiting specification ... prerequisite to DS-7 Intelligence implementation"*. The gap bounds implementation, not this derivation; §8 Q2 and Q9 hold the canon-level remainders.
- **The Whisp split** consumed from `decisions/PENDING.md` (ratified at DS-1); promoted to a numbered ADR in this descent's close batch — the first PENDING-to-ADR promotion of the descent series. Nothing in this derivation contradicted the split. `world-model.md`'s "promotion pending" Sources-status remark updates when the ADR lands.
- **ADR-U005 is an unrealized lock** (corrected inheritance): the DS-6 bridge described `profile_data` as realized substrate; dual-method verification at this descent's opener authoring found zero realizations anywhere (live migrations, archive, seeds, lib, app). Law-stands-unrealized handling per the DS-5 ADR-U021 precedent.
- **PRINCIPLES-AI.md enters a Domain Service authority chain for the first time** (constitutional; the guard-railing law and the staged human-first sequence are derivation input — the register row's "guard railing" foot traces to it, not to any ADR).
- **Sibling-provisional rule (resolved 2026-06-11):** the Extension System's derivation landed ([`../extensions/SPECIFICATION.md`](../extensions/SPECIFICATION.md)); §5's plugin contracts were re-checked from the owned side and ratified — the provisional tag is lifted. The six landed-sibling consumer lines against DS-7 were re-checked at the DS-7 descent: all six confirmed (world-model salience; narrative context reads; journeys personalisation seam; content context/write line; communication context reads — with the owned posture stated; discovery facet reads).
- **Register row consumed in full:** "Whisp dialogue; assessments dissolved (validity question open); starved-drive sensing (S28); guard railing" — each foot maps to a capability area; the validity question stays open at §8 Q2 by design.

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| (all fourteen) | — | — | No FEAT-PD specs exist for DS-7 yet |

### Capabilities without specs

All fourteen capabilities above. DS-7 is specification-first; no realized substrate exists (see §6 and §L3 Step 2).

### Features without capabilities

None.

---

## §L3 Step 2 — code-informed stress-test (2026-06-11, ratified)

**Expectation verified: NEAR-ZERO-CODE with named exceptions, with the corrected inheritance confirmed.** Zero cold retractions; zero Class 2 deltas — **retraction-rate point: DS-7 = 0** (the seven-DS series completes: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0; DS-6 0; DS-7 0). Run as sandboxed cluster sweeps; every zero-hit claim dual-method verified.

**Class 1 confirms:**
- **Zero DS-7 substrate.** The 19-table baseline re-verified by two methods (CREATE TABLE enumeration + RLS-enable count, both exactly 19); none DS-7-attributed. No `lib/ai/` or `lib/intelligence/`; no `supabase/functions/` (Edge Functions) directory; no AI-provider dependency in `package.json`; zero whisp/salience/dialogue-runtime code anywhere (grep + find method pairs).
- **ADR-U005 unrealized lock re-confirmed.** `profile_data` exact-pattern zero across `supabase/`, `lib/`, `app/`, `components/` — consistent with the opener-authoring calibration that corrected the DS-6 bridge's "realized substrate" claim.
- **A#9: no realized contract object.** The entire realized RPC surface is `admin_*` / `has_permission` / notification handlers; Realtime channels serve messaging/notifications/auth only. Nothing exists to mistake for a DS-7 contract (the DS-6 PW-1 "no object" shape).
- **PW-1: no object** (no DS-7 schema exists to predate the partition — second consecutive entity). **PW-MARCH1: clean** — the migration archive carries only assessment step content in the retired journey seeds (lineage adjudicated at DS-3) plus generic "guard" code comments (false positives); nothing AI/profile-accumulation-shaped was lost at D15. **PW-T1: no fire** — the `lib/types/user.ts` `ProfileData` collision is name-only (the interface is PC-2 identity furniture: full_name/bio/avatar_url; verified).
- **The named exceptions held exactly as calibrated:** the assessment step-type cluster (`lib/types/journey.ts` `StepType` union; three render surfaces; seeded steps in sprint1 + `seeds/05` + archive); the seeded "Emotional Intelligence at Work" journey (content vocabulary); `ProfileData` (above).

**Class 2 entity-internal deltas: none.** The corrected calibration happened at opener authoring, pre-Step-1; the candidate was composed against the corrected baseline.

**Class 3 cross-entity findings:**
1. **The assessment step-type cluster classified OUT as DS-3/U008 substrate in canon-tension with S17.** Realized questionnaire-form assessment steps ("Self-Assessment: Your Leadership Style", `type: "assessment"`) are exactly the form the canon transforms away (instruments dissolve into dialogue). DS-3 evolution-debt / FEAT-time anchor; not DS-7 substrate; the dissolved-instrument engine (§L3) is the forward shape.
2. **Canonical permission text carries pre-canon assessment vocabulary** — `seeds/01_permissions.sql` line 39, `complete_journey_activities`: "Complete journey activities and assessments". Wording-grade canon-tension in the canonical permission catalog; routes to the doc-health / PC-3 channel (the DS-6 stale-pointer family).

**Phase-wide observations:** empty-result verification was again the workhorse (near-zero entity; most claims are zeros) and its method-contrast rule caught a **tooling artifact** — the sandbox grep's `-o` flag silently returns empty; the file-level and `-n` methods disagreed with it, blocking false-zero detail claims. The seeds-directory rule (DS-6 n=1 rider, applied as instance rule) held at n=2: the canonical permission catalog and seeded-journey vocabulary live in `supabase/seeds/`, invisible to migrations-only sweeps. #4 migration-name-as-shorthand: NO FIRE (sprint1/sprint4 names describe their bodies adequately at sprint grain) — n=7 opportunities, 1 firing total; the verdict feeds the Phase 3 close-out landing adjudication.

---

## §L3 Step 3 — adjudication (2026-06-11, ratified)

**Q-resolution slate.** Q3 (salience-channel shape), Q4 (generation posture), Q5 (recommendation-signal supply), Q6 (Whisp-carried messages) — **resolved at this descent** as the cold leans stated in §8, ratified by Stefan; the sanctioned sibling amendments landed in this commit batch (`world-model.md` §8 Q7; `content.md` §8 Q8; `journeys.md` §8 Q3; `communication.md` §8 Q5; `discovery.md` §8 Q2). Q8 (loop-persistence slice) resolved as the stated cold lean — clarification-grade; `narrative.md`'s "DS-3/DS-7 territory" wording tolerates the resolution without amendment (confirm-no-edit). Q1 (dialogue-runtime substrate), Q9 (graduation disposition) — deferred by design (speculative-third-shape; FEAT-PD time / the `whisp.md` canon work). Q2 (the validity question) — **stays open at canon level by design** (the register row carries it open; resolution belongs to the canon work, not code). Q7 (portability/retention) — routed to the Privacy vertical's obligation inventory with the U010 anchor.

**Forward-commitment classification: ALL FOURTEEN capabilities FULL-FORWARD.** Zero DS-7 substrate exists; every zero dual-method verified. The only realized adjacencies (the assessment step-type cluster; `ProfileData`; seeded content vocabulary) classified out as other entities' substrate — the purest near-zero entity of the descent series (DS-6 had adjacent `browse_*` permission rows; DS-7's adjacency is another service's vocabulary entirely).

**Six sibling consumer-line re-checks: all six confirmed without edit** (world-model salience-input line; narrative context-read line; journeys personalisation seam; content context-read/write line; communication context-read line — its "privacy posture per its own descent" now resolved by §3's stated posture: only the FIM's own contributions, consent-gated, for that FIM's own accumulation; discovery declared-interest facet line).

**The Whisp-split ADR promotion** (the first PENDING-to-ADR promotion of the descent series) lands as its own commit in this close batch per the ratified scope; nothing in the derivation contradicted the split. The domain README L2 line gained the shaping-feeds foot (altitude finding, ratified); the domain CLAUDE.md existing-specs enumeration updated.

**Pickups:** recorded in the closing bridge (`2026-06-11_02_-_DS7-LANDED.md`) — Extension System (next in queue); Phase 3 close-out (the #4 verdict; the completed retraction series; the seeds-rule adjudication); Privacy vertical (U010 AI-data-handling; Q7; Shadow-Whisp ephemerality); doc-health / PC-3 (the permission-text vocabulary); Hub/Gimbal (Whisp surfaces at FEAT time; the assessment-cluster evolution anchor).
