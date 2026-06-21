# Domain Service — Discovery (DS-6)

<!-- Valid service slugs: world-model | narrative | journeys | content | communication | discovery | intelligence -->

---
slug: discovery
owner: platform/domain/discovery
consumers: [products/hub, products/gimbal]
status: proposed
last_updated: 2026-06-11
tier: Domain Services
tags: [domain-service:discovery]
feature_prefix: PD
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023). Revised when the service's boundaries, public contract, or dependencies change.*

**Derivation note (this draft).** Steps 1–3 authored 2026-06-10/11 in the DS-6 descent session (opener: `docs/planning/sessions/openers/ds6-discovery-descent-opener.md`; session crossed midnight). **FIRST DECISION ratified at this descent (Stefan, 2026-06-10):** (1) the charter re-derivation the DS-1 anatomy-challenge verdict ordered — DS-6 is the published world's **find-layer**: catalog search + guardrail-constrained recommendation + the marketplace surface; the "possibly shrink" fired — **people-finding is outside DS-6** (branch-routed in the crown, cosmology S38; DS-1's substrate); (2) the name **stays "Discovery"** — the PENDING.md collision watch-item (vs the universe-discovery log) dispositioned resolved-by-keeping (the log is a hyphen-qualified thinking-tree artifact; every rename candidate vetted worse under the vocabulary-vetting discipline and the cosmology-neutral naming lock). Authority chain: root + platform + domain `CLAUDE.md` cascade (L1) + the domain README L2 inventory line (held as partly contradicted; revised at this descent) + the **cosmology core** (S38 own-branches-legible / ambient-crown; the anti-leaderboard ground truth) + the roles core (Dreamineers as the marketplace's selling stance, ADR-U011) + the Session B conformance register Section 3 DS-6 row (*navigation by own branches; no counts/rankings — anti-leaderboard guardrails*) + ADR-U023 + **ADR-U011 (the marketplace lock — Hamn+, Stripe Connect rails; enters the binding chain at this descent)** + **ADR-U016 (the "Discovery: [what happens to visibility/search]" cascade slot)** + ADR-U018 (registry non-closure) + ADR-U002 (verticals law — the marketplace boundary resolves within it) + ADR-U025/U026/U031/U028 + ADR-U007/U006/U003 + the DS-5 and DS-4 closing-bridge pickup blocks. Code, migrations, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test) and Step 3 (adjudication) are recorded at the foot of §L3.

### 1. Purpose

DS-6 Discovery owns **how travellers find things in the published shared world**: searching the published catalog (journeys, narrative structure, published content; communication content scope-gated), receiving **affinity-shaped recommendations** that honour the anti-leaderboard guardrails (never popularity, never comparative, never people), and browsing the **marketplace surface** over published content (Hamn-wave, ADR-U011). Discovery indexes *things*, not FIMs.

DS-6 is **not**: people-finding or social navigation (branch-routed — following your own branches is how you find your friends among the balls, cosmology S38; DS-1 owns the crown and enforces no-counts/no-rankings at the source); feed composition (DS-5 — chronology + scope filters; anything beyond that boundary is DS-6's, reached through DS-6's own contract, per communication.md invariant 2); content, journey, or narrative storage (DS-2/DS-3/DS-4 own their substance — DS-6 reads their published registries and never holds the substance); the payment rails, splits, or entitlements behind the marketplace (Transactions vertical, ADR-U011/U002); in-experience buying flows (platform-tier work at the surfaces); economy management (Console-scoped, ADR-U028); or the gates themselves (enrolment, equipment, FIM-status gating evaluate at the source contracts — the catalog admits what is published; what a traveller can *do* with a found thing is the source's law).

### 2. Concepts

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Facet | A declared, kind-registered dimension things are found by (route type, perspective affinity, equipment requirement, depth, content kind, …) — sourced from the publishing service's published attributes, never computed from behaviour | DS-6 registry tables (forward) |
| Discoverable entry | A published thing's presence in the find-layer: an opaque reference (source service + ID) plus its published facets and searchable text. Visibility mirrors the source; never broader | DS-6 index substrate (forward; architecture per §8 Q1) |
| Search query | A traveller's search/browse request: text + facet filters + scope. Personal data where retained (§8 Q5) | Not persisted by default (forward) |
| Recommendation | An affinity-shaped suggestion derived from declared facets and explicit interests — never popularity, counts, or comparative signals | Computed; signal posture per §8 Q2 |
| Marketplace listing | A Dreamineer's offer of a published thing (journey, content, experience — ADR-U011), referencing it **opaquely by ID** (the n=5 direction pattern); the listing is DS-6's, the thing stays the source's, the sale is the Transactions vertical's | DS-6 listing tables (forward; Hamn-wave) |
| Kind registries | Facet kinds, result kinds, listing kinds — data-driven registries, never sealed enums (ADR-U018) | DS-6 registry tables (forward) |

### 3. Public contract (consumed by Surfaces)

Contract families rather than fully-specified operations at this maturity (DS-1..DS-5 precedent); each becomes concrete operations at FEAT time.

- **Catalog search reads** — text + facet queries over the published surface (journeys per DS-3's catalog reads; narrative published structure per DS-2; published content per DS-4's registry; communication content scope-gated per §8 Q3; public groups per §8 Q6). Results carry opaque source references; surfaces resolve substance through the source's own contract.
- **Browse/facet reads** — the kind registries and facet vocabularies surfaces build browse UIs from (ADR-U018 non-closure).
- **Recommendation reads** — affinity-shaped suggestion sets, scoped to the requesting traveller's declared facets/interests. Invariant 2 binds absolutely: nothing ranked by popularity, nothing comparative, no people.
- **Marketplace browse reads** (Hamn+) — listing search/browse over the listing registry; everything transactional is reached through the Transactions vertical's rails, never through this contract.
- **Marketplace listing writes** (Hamn+) — Dreamineer-gated listing create/retire (PC-3 `has_permission()` per D7 role templates; PC-4 audited).
- **Visibility lifecycle (internal/source-facing)** — publish/retire/unpublish events from source services entering and leaving the discoverable surface (the ADR-U016 "Discovery: [what happens to visibility/search]" slot, honoured from the receiving side).

Consumers: the Hub and Gimbal surface all families (equipment-keying stays feature-grain at the surfaces, ADR-U025); **studio modes may consume catalog search at authoring time** (finding published things to reference — provisional; the studio descents re-check); **provisional sibling consumer line** (sibling-undefined rule): DS-7 Intelligence may consume declared-interest facets as profile context (privacy posture per its own descent). No studio writes to DS-6 (ADR-U026); no sibling Domain Service consumes DS-6 (DS-6 sits at the top of the published-read chain).

### 4. Internal dependencies (consumed *from* this service)

- **Platform Core:** PC-1 Infrastructure — schema/RLS substrate; object-storage conventions not needed (DS-6 stores no blobs); the scheduled-job substrate (pg_cron) is the candidate freshness mechanism per §8 Q1. PC-2 Identity — identity-status read posture (published shared-world discoverability is anon-readable, mirroring the sources' ADR-U031 posture; Mist-generated traces inherit TTL-erasure). PC-3 Organisation — `has_permission()` gating (P-O1 four-hop actor chain; D7 TEXT-keyed role templates) for any DS-6 write surface; group scoping for scope-filtered search; the public-group substrate (§8 Q6). **Realized anchor:** the browse gating already exists in PC-3's permission catalog — `browse_journey_catalog` and `browse_public_groups` rows in `supabase/seeds/01_permissions.sql`, granted to Member-tier templates, the Observer template, the FI-Members curated subset, and the Visitor "Guest" role (`seeds/02_role_templates.sql`, `seeds/04_system_groups.sql`) — the anon-parity posture (invariant 8) is already the realized grant shape. PC-4 Governance — audit discipline on listing writes and registry maintenance.
- **Other domain services (read-only, published state):** DS-2 Narrative — published structure. DS-3 Journeys — catalog reads (route type, perspective affinity, equipment requirements, depth, narrative attachment). DS-4 Content — the published registry. DS-5 Communication — forum/feed content for search indexing (scope-gated; §8 Q3). **DS-6 holds no DS-1 dependency**: people/social navigation is branch-routed in DS-1's crown and outside this charter (FIRST DECISION); world structure is presence-based, not searched, at this derivation (§8 Q7).

### 5. Extension points

| Extension point | Interface | Lifecycle |
|----------------|-----------|-----------|
| Facet kinds | Registry row + per-kind facet shape consumed by search/browse contracts | Add without modifying Platform Core (ADR-U018; Extension System charter) |
| Result kinds | Registry row + renderer-consumable result shape per kind | Same non-closure law |
| Listing kinds (Hamn+) | Registry row + per-kind listing shape (journeys, content, experiences — ADR-U011's three) | Same non-closure law |

### 6. Storage & schema

**Zero DS-6 tables exist** (verified at Step 2 — the realized baseline carries no search/recommendation/marketplace substrate; no full-text-search infrastructure of any kind — `tsvector`/`tsquery`/`pg_trgm` zero, dual-method). The realized journey-browse surface (`app/journeys/page.tsx` client-side filtering over a PostgREST published-only read; `lib/types/journey.ts` `JourneyFilters`) is **product-tier evolution debt against this service's forward contract, not DS-6 substrate** (classified at Step 2; the DS-4 `journeys.content` precedent). "Marketplace" vocabulary was deliberately retired at the D15 rebuild (the archived initial schema's permission descriptions said "to marketplace"; the live seeds do not) — the substrate deliberately awaits Hamn, consistent with ADR-U011. Forward posture: registry tables (facet/result/listing kinds — ADR-U018), the discoverable-entry index substrate (architecture per §8 Q1 — a dedicated index is the speculative shape; PostgREST live queries over source tables is the framework-provided alternative, A#9), and listing tables at Hamn. Every DS-6 table has RLS from day one. **Visibility law:** a row in DS-6's substrate is never readable more broadly than the source thing it references (Privacy vertical: never return over-broad results and expect the product to filter). **No popularity/aggregate columns, ever** — the schema itself must be incapable of carrying a leaderboard (invariant 2). Search traces, if retained, are personal data with TTL posture (§8 Q5; ADR-U031 for Mist traces).

### 7. Service-level invariants

*(Additive section per the DS-1..DS-5 precedent.)*

1. **Published-only surface.** Nothing unpublished, draft, or private is ever discoverable. Visibility in discovery mirrors source visibility exactly — never broader; lag in *appearing* is tolerable, lag in *disappearing* is a defect (ADR-U016 cascade compliance).
2. **No counts, no rankings, no popularity — anywhere.** Recommendations are affinity-shaped (declared facets, explicit interests); never popularity-based, never comparative, never "trending". The anti-leaderboard guardrail is enforced at the sources (world-model.md invariant 2; journeys.md invariant 8) and honoured at every DS-6 surface; DS-6 neither re-implements nor weakens it (register DS-6 row).
3. **People are not discoverable.** DS-6 indexes things, not FIMs: no people search, no people recommendations, no member directories. People-finding is branch-routed in the crown (cosmology S38) — DS-1's territory, reached through DS-1's contract by the surfaces.
4. **Action gates stay at the source.** The catalog admits what is published (journeys.md: gating decides what a traveller can *enrol in*, not what the catalog admits exists); enrolment, equipment, depth, and FIM-status gates evaluate at the source contracts. DS-6 never pre-filters by what the traveller could do — only by what they may *see*.
5. **Read-only over its sources.** DS-6 writes nothing into sibling or Platform Core state; its own writes are index/registry/listing maintenance only.
6. **Eventual freshness, exact visibility.** Discovery is eventually-consistent by design for additions; removals (retirement, unpublish, scope loss) are cascade obligations, not best-effort (ADR-U016's Discovery slot).
7. **The marketplace surface sells nothing.** Listing, browse, and search live here; payment rails, revenue splits, refunds, and entitlements are the Transactions vertical's (ADR-U011 Stripe Connect); in-experience buying is platform-tier surface work; economy management is Console-scoped (ADR-U028).
8. **Mist ephemerality and anon parity.** Mists perceive the real published shared world (ADR-U031: the privacy protection is ephemerality, not refusing to serve) — anon-readable discovery mirrors the sources' anon-read posture; FIM-only reaches (the village, deep place 3 — S45) never enter Mist-visible surfaces because their sources never publish them anon-readably. Mist-generated discovery traces inherit TTL-erasure.
9. **Non-closure.** Facet kinds, result kinds, and listing kinds are data-driven registries (ADR-U018); sealing any of them is an architecture bug.

### 8. Open questions

- **Q1 — Index-vs-live-query architecture.** Does DS-6 maintain a dedicated index substrate (denormalized discoverable-entries, freshness via events + pg_cron) or serve search as live PostgREST queries over source tables (the framework-provided shape, A#9)? Cold lean: tagged **speculative-third-shape** — the dedicated index is speculative until the framework surface proves insufficient. Resolve at the first FEAT-PD discovery feature.
- **Q2 — Recommendation-signal sourcing.** What feeds affinity beyond declared facets — explicit interests only at Ferd, or DS-7-accumulated profile signals later? Tagged **speculative-third-shape**; joint with the DS-7 descent (privacy posture per its own derivation; PC-2 consent surface binds). Provisional against DS-7; re-checks at its descent. **Resolved 2026-06-11 (DS-7 descent, ratified by Stefan): declared interests only at Ferd; DS-7-accumulated profile signals may feed affinity shaping later only under explicit bucket-level PC-2 consent, never silently. The DS-7 consumer line is confirmed from the owned side. See `intelligence.md` §8 Q5 and §L3 (Recommendation-signal supply).**
- **Q3 — Communication-content indexing posture.** DS-5's consumer line (forum/feed content for search indexing) is confirmed in principle from the owned side; the posture is open: scope (own-groups only, mirroring membership-gated visibility — the cold lean), and whether result attribution honours ADR-U021's display law ("Former Member" by current membership — cold lean: yes, results render attribution through the same display logic, never the stored field). Resolve at FEAT time with DS-5's contract.
- **Q4 — Marketplace listing model detail.** What exactly a listing carries (pricing reference, availability, seller identity via Dreamineer stance) — Hamn-deferred (ADR-U011); the boundary (surface here, rails Transactions, economy Console) is settled at this derivation and is not reopened by the detail work.
- **Q5 — Search history and saved searches.** Are traveller search traces retained at all? If yes: personal data, TTL posture, Mist-trace ephemerality (ADR-U031), Privacy-vertical consent surface. Cold lean: not retained at Ferd.
- **Q6 — Public-group discovery home.** Is group-finding a DS-6 catalog surface over PC-3's public-group substrate (cold lean), or PC-3-tier entirely? **Realized anchor (Step 2):** the `browse_public_groups` permission row exists in `seeds/01_permissions.sql` under category `group_management` (PC-3 idiom) — mild evidence for the PC-3-tier reading; the cold lean stands until the first group-discovery FEAT adjudicates.
- **Q7 — World structure in the searchable surface.** Does DS-1's published world state (places, the tendable world) ever join the catalog? Cold lean: no at Ferd — world navigation is presence-based and branch-routed, not searched; revisit if a wayfinding FEAT ever wants it (would add a DS-1 read dependency that does not exist today).

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the service enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Facet & kind registries | Facet & kind registries | — | PC-1 (schema/RLS) | Administration (registry maintenance audited); Observability (registry edits) |
| Published-journey catalog search | Catalog search | Facet & kind registries; Visibility ingestion & index maintenance | DS-3 (catalog reads); PC-3 (scope filters) | Privacy (published-only; no personal progress in results — journeys.md invariant 8 honoured); Observability (query events) |
| Published-structure search | Catalog search | Facet & kind registries; Visibility ingestion & index maintenance | DS-2 (published structure) | Privacy (published-only); Observability (query events) |
| Published-content search | Catalog search | Facet & kind registries; Visibility ingestion & index maintenance | DS-4 (published registry) | Privacy (unpublished never surfaced — content.md invariant 6 mirrored); Observability (query events) |
| Communication-content search indexing | Catalog search | Facet & kind registries; Visibility ingestion & index maintenance | DS-5 (forum/feed reads, scope-gated); PC-3 (membership scoping) | Privacy (scope mirrors membership; §8 Q3 attribution law); Observability (index + query events) |
| Public-group discovery | Catalog search | Facet & kind registries | PC-3 (public-group substrate; `browse_public_groups` gating — §8 Q6) | Privacy (public-only); Observability (query events) |
| Affinity-shaped recommendation | Recommendations | Published-journey catalog search; Published-content search; Facet & kind registries | DS-2/DS-3/DS-4 published facets | Privacy (declared interests are personal data); Observability (suggestion events). Invariant 2 binds: never popularity, never comparative, never people |
| Recommendation-signal intake posture | Recommendations | Affinity-shaped recommendation | DS-7 (prospective, provisional — §8 Q2); PC-2 (consent surface) | Privacy (signal consent; TTL posture) |
| Marketplace listing registry | Marketplace surface (Hamn+) | Facet & kind registries | DS-3/DS-4 published things by opaque ID; PC-3 (Dreamineer-gated writes, D7/P-O1); PC-4 (audit) | Transactions (the surface seam — rails are the vertical's, ADR-U011); Administration (listing ops audited); Observability (listing lifecycle events) |
| Marketplace browse & search | Marketplace surface (Hamn+) | Marketplace listing registry; Published-content search | — | Transactions (browse precedes buying; entitlement checks are the vertical's); Observability (query events) |
| Visibility ingestion & index maintenance | Index & visibility lifecycle | Facet & kind registries | DS-2/DS-3/DS-4/DS-5 publish/retire events; PC-1 (scheduled-job substrate candidate, §8 Q1) | Observability (index events); Administration (rebuild operations) |
| Retirement/unpublish cascade compliance | Index & visibility lifecycle | Visibility ingestion & index maintenance | ADR-U016 cascade specs at the sources | Administration (cascade-spec'd; the ADR-U016 Discovery slot honoured); Privacy (visibility never outlives the source); Observability (removal events) |
| Mist/anon read posture & personal-trace ephemerality | Index & visibility lifecycle | — | PC-2 (identity status; ADR-U031 TTL-erasure) | Privacy (anon parity with sources; traces TTL-erased); Observability (posture evaluations on denial) |

**Notifications vertical:** no DS-6 capability touches Notifications at this derivation — discovery surfaces emit no triggers (listing lifecycle events at Hamn may revisit through the settled boundary: the vertical owns the obligation, DS-5 routes, products surface). Recorded explicitly rather than left blank (DS-4 precedent).

**Transactions vertical:** DS-6 is the **first Domain Service with substantive Transactions impact** — the two marketplace capabilities sit on the surface side of the ADR-U011 seam (listing/browse here; rails, splits, entitlements, refunds in the vertical; economy management Console-scoped per ADR-U028). The Transactions vertical spec is scaffold-tier — proceeded with remark per G-03 (see Sources-status).

### Dependency chain

1. **Facet & kind registries** — the foundation; every search, recommendation, and listing resolves kinds against it.
2. **Visibility ingestion & index maintenance** — over the registries; the discoverable surface exists once things can enter it.
3. **The four catalog-search feet** (journeys, structure, content, communication) + **public-group discovery** — over ingestion + registries, each consuming its source's published read contract.
4. **Affinity-shaped recommendation** — over the catalog feet (suggestions select from the searchable surface).
5. **Recommendation-signal intake posture** — gated on §8 Q2 / the DS-7 descent.
6. **Retirement/unpublish cascade compliance** — binds as soon as ingestion exists (removal is not deferrable behind features).
7. **Mist/anon read posture & personal-trace ephemerality** — cross-cutting posture, binds from the first read surface.
8. **Marketplace listing registry → marketplace browse & search** — Hamn-wave (ADR-U011); specified now, built last.

### External dependencies

Cross-referenced per the template rule: DS-3's catalog reads exist (`journeys.md` §3 Catalog reads — route type, perspective affinity, equipment requirements, depth, narrative attachment); DS-2's published-structure consumer line exists (`narrative.md` §3); DS-4's published-registry consumer line exists (`content.md` §3 — "no counts/rankings leak from here", honoured); DS-5's search-indexing consumer line exists (`communication.md` §3, provisional — **confirmed in principle from the owned side at this descent**, posture per §8 Q3). PC-1 schema/RLS + scheduled-job substrate, PC-2 identity-status/ephemerality, PC-3 `has_permission()`/group scoping/public-group substrate, PC-4 audit discipline all exist in those inventories (verified across the PC chain at prior descents). **Consumers, not dependencies** (direction guard): the Hub and Gimbal read all families; studio modes prospectively read catalog search at authoring time (provisional — studio descents re-check); DS-7 prospectively reads declared-interest facets (provisional — §8 Q2). **DS-6 depends on no DS-1 contract** — the world-model consumer line is revised at this descent (people/social navigation is branch-routed, product-tier consumption of DS-1 directly; FIRST DECISION).

### Sources-status block

- **Transactions vertical spec is scaffold-tier** (G-03, `docs/ecosystem/how-we-work/gaps.md`) — DS-6 is the first Domain Service to substantively touch Transactions; proceeded with remark; the marketplace capabilities' obligations firm up when the vertical's obligation inventory is derived.
- **No dedicated canonical-core sub-page for discovery** — the charter traces to the cosmology core (S38, ambient crown) + the register row + ADR-U011/U016 rather than to a discovery-named core (canon-sub-page-gap remark per the DS-3 precedent; proceeded).
- **The naming collision is dispositioned** — FIRST DECISION kept "Discovery"; the PENDING.md watch-item resolves in this descent's close batch.
- **Sibling-provisional rule:** DS-7 remains undefined — the recommendation-signal seam (§8 Q2) and the DS-7 consumer line are provisional; DS-7's descent re-checks. The five landed-sibling consumer lines against DS-6 were re-checked at this descent: four confirmed (journeys catalog; narrative structure; content registry; communication indexing-in-principle), one revised (world-model branch-routes — DS-6 does not consume; sanctioned edit at Step 3).
- **L2-line revision** — the domain README's DS-6 line ("Search, recommendations, marketplace") predates the charter re-derivation; revised at Step 3 per the ratified charter.
- **"Catalog" carries two senses on disk** (naming-drift dual-reading, Step 2): the rebuild's "Catalog tables" comment means reference/template tables (surface-idiomatic platform-technical sense); canon's catalog (journeys.md, this spec) means the published-journey catalog. Both readings recorded; no action — context disambiguates, and the reference-table sense lives only in migration comments.

### §L3 Step 2 — code-informed stress-test (recorded 2026-06-11)

**Zero cold retractions; 4 Class 2 deltas (folded inline above); 3 Class 3 findings (routed to pickups via the closing bridge).** Retraction series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0; **DS-6 0**. All thirteen capabilities classify **full-forward** — the only realized adjacency (the client-side journey filter) classified out as product-tier evolution debt.

- **Class 1 confirms:** zero DS-6 substrate (19-table baseline re-verified, RLS-enable second method: 18 rebuild tables + `pending_email_invitations`; none discovery-shaped); no FTS infrastructure (dual-method); no `lib/discovery/`; zero discovery-vocabulary API routes (grep + find). **A#9 fired at its named site — fourth confirming entity** (PC-3, DS-4-classified-out, DS-5, DS-6): the realized catalog read is the framework surface (PostgREST `.from('journeys').select().eq('is_published', true).eq('is_public', true)`, ordering by `created_at` only; filtering client-side). Published-only gating realized at the source (invariant 1's shape on disk). Anon-parity realized (the Visitor "Guest" role holds both `browse_*` permissions — invariant 8's direction). No popularity/aggregate substrate anywhere (invariant 2 unviolated on disk).
- **Class 2 deltas (folded):** the product-tier classification of the realized filter (§6); the realized `browse_*` permission anchor (§4); the marketplace-vocabulary retirement at D15 (§6); the catalog dual-sense remark (above).
- **Class 3 (routed):** DS-3 — realized journey facet vocabulary is pre-canon (`difficulty_level`/`tags`/`estimated_duration` vs route type/perspective affinity/equipment/depth); PC-3 + doc-health — permission canonical definitions live in `supabase/seeds/01_permissions.sql` (relocated from migrations at D15), and `lib/constants/permissions.ts`'s header still says "@see supabase/migrations/ for the canonical permission definitions" (stale pointer); Hub — the client-side catalog filter is FEAT-time evolution debt against this service's contract families.
- **Watch outcomes:** PW-MARCH1 **clean** — the empty-result second method caught a near-miss asymmetric-loss claim (the permission catalog moved migrations→seeds at D15; nothing lost; "marketplace" vocabulary deliberately retired). PW-5 held (19). PW-T1 fired **inverted**: `JourneyFilters` is type-ahead-of-runtime (a forward-leaning type with no DS-6 contract behind it). #4 migration-name-as-shorthand did NOT fire (the archived catalog-tables migration's name accurately describes its body). PW-1: nothing to attach — no DS-6 schema exists to predate the partition.

### §L3 Step 3 — adjudication (recorded 2026-06-11)

- **FIRST DECISION (ratified by Stefan, 2026-06-10, pre-Step-1):** charter re-derived per the DS-1 anatomy-challenge watch — DS-6 is the published world's find-layer; the "possibly shrink" fired (people-finding/social navigation OUT, branch-routed in DS-1's crown; no DS-1 dependency remains). Name **stays "Discovery"** — the PENDING.md collision watch-item dispositioned resolved-by-keeping (rename candidates each vetted worse: Search/Catalog/Marketplace name one foot of three; Wayfinding collides with the Wayfinder role and strains the cosmology-neutral naming lock; Navigation names the removed foot).
- **Q-resolutions:** the routed seam (communication.md §8 Q4) resolved from the owned side — any selection beyond chronology + scope filters is DS-6's; a "relevant to you" surface is never DS-5's, even embedded in feed UI; sanctioned amendment landed at communication.md §8 Q4. All seven DS-6 §8 questions remain open by design (forward-commitment questions for FEAT time / sibling descents), each with its cold lean and realized anchors recorded.
- **Sibling re-checks:** four confirmed without edit (journeys.md catalog reads; narrative.md published structure; content.md published registry; communication.md search-indexing-in-principle); one revised — world-model.md's "DS-6 consumes branch-routes for navigation" consumer clause removed per the ratified charter (sanctioned edit, same commit batch).
- **ADR amendments: zero.** ADR-U011 and ADR-U016 are realized-consistent (marketplace deliberately deferred; cascade slot honoured from the receiving side); nothing contradicted.
- **L2-line revision** landed in the domain README per the ratified charter text.

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| (all §L3 capabilities) | — | — | No FEAT-PD specs exist for DS-6 yet |

### Capabilities without specs

All §L3 capabilities. First candidates when DS-6 enters build: **Facet & kind registries** and **Visibility ingestion & index maintenance** (the dependency-chain foundations), with the architecture question (§8 Q1 index-vs-live-query) resolved at the first feature spec, and the marketplace capabilities gated on the Hamn wave (ADR-U011).

### Features without capabilities

None — no `FEAT-PD###.md` files exist under this service's `features/` directory.

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
