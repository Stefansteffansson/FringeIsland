# Platform Domain — Extension System

<!-- Entity-shape note: NOT a numbered Domain Service. This file uses the domain-service-spec
     section architecture as a structural variant (ratified at the Extension System descent,
     2026-06-11): the domain-service-spec slug enum is deliberately NOT extended; the artifact
     lands at the path extensions/README.md names (SPECIFICATION.md); deviations from the DS
     template are named in the derivation note below. -->

---
owner: platform/extensions
consumers: [platform/domain/* (extension-point registration), future extensions community (out-of-tree, open category per ADR-U023/U008)]
status: proposed
last_updated: 2026-06-11
tier: Domain Services (Platform Domain — extensions)
tags: [extension-system]
feature_prefix: PD  # FEAT-PD### for features owned by this entity, future wave
---

> The Extension System is Platform Domain's contract layer for community extension: plugin contracts, registry, lifecycle, sandboxing — *"the social contract between core and community"* (`README.md`). **Wave-deferred:** future-wave scope, not Ferd; the Extension System will not be built in the Ferd wave. This specification defines the contracts and patterns, and the Ferd non-closure obligations that are binding NOW; the build defers.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-06-11 in the Extension System descent session (opener: `docs/planning/sessions/openers/extension-system-descent-opener.md`; NO FIRST DECISION — no parked naming or charter item existed; the first ratification gate was the **entity-shape adjudication**: this entity is "Platform Domain — extensions", not DS-8 — the spec lands here as SPECIFICATION.md per `README.md`, on the domain-service-spec section skeleton, with the slug enum untouched). Authority chain: root + platform + domain `CLAUDE.md` cascade (L1; the domain sub-tier file carries real Extension System law — the Ferd non-closure authoring discipline, the closure-recognition rule, the Platform API open-consumer posture) + the domain README L2 inventory lines + the extensions README charter + **`docs/ecosystem/MANIFESTO.md` (constitutional — "Community ownership over corporate control" anchors the social-contract charter line; second entity to carry a constitutional doc in the chain)** + the roles core at the Dreamineer edge only (this entity is otherwise cosmology-neutral platform machinery) + ADR-U008 + ADR-U018 (THE locks) + ADR-U023/U007/U016/U015/U002/U025/U026/U028/U006/U003 + the carry-forward priors from the DS-7 closing bridge. **The sibling-provisional rule INVERTS at this entity:** all seven DS specs exist; their §5 extension-point claims are re-checked from the owned side at this descent (dispositions at §L3 Step 3). Named vocabulary collision kept straight throughout: PRINCIPLES-AI's *"AI is an extension, not an autonomous worker"* uses "extension" as AI-as-extension-of-human-capability — NOT this entity. Code, migrations, seeds, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test) and Step 3 (adjudication) are recorded at the foot of §L3.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023). Revised when the entity's boundaries, public contract, or dependencies change.*

### 1. Purpose

The Extension System owns the platform's **openability**: the contracts that let new kinds of things — step kinds, group types, role types, content types, and every other kind-vocabulary the Domain Services expose (`README.md`; domain README) — be added **without modifying Platform Core** (ADR-U023: *"Must accommodate the Extension System for Dreamineer plugins"*). Its four charter nouns are the entity's anatomy: **plugin contracts** (what an extension declares and what it may plug into — the kind-registry contract pattern that all seven Domain Services already practice in their §5 blocks, codified here as THE canonical pattern: a registry row plus a per-kind shape contract on a discriminator-over-shared-base structure, per ADR-U008's shape); a **registry** (extensions themselves are data rows, never code enums — ADR-U018's law applied reflexively); **lifecycle** (data-driven states from submission through review, publication, installation, and retirement, each significant transition cascade-specified per ADR-U016); and **sandboxing** (extensions consume the **Platform API only** — public-facing, versioned, *lower trust*, ADR-U023's named boundary — never the Internal API, never the database directly, with permissions requested and granted as data, never assumed). The social contract between core and community grounds constitutionally in the MANIFESTO's *"Community ownership over corporate control"*: the platform's extensibility is how the community comes to own the platform's growth, and the review/publication gate is how the core keeps that ownership trustworthy. At Ferd the Extension System's only ACTIVE area is the **non-closure obligation set**: the binding constraint that Ferd architecture must not close extensibility off (no hardcoded enums for extensible concepts, no sealed type systems, no closed permission sets — `README.md`; the domain sub-tier CLAUDE.md carries the closure-recognition authoring discipline), plus the closure-debt register anchoring the recorded violations to their correction targets.

The Extension System is **not**: any Domain Service's own extension points (each service OWNS its §5 registries — step kinds are DS-3's, content kinds DS-4's, bucket kinds DS-7's; the Extension System owns the contract LAYER those registries plug into, not the registries themselves); the marketplace surface (extension discoverability is DS-6's find-layer — listing kinds, Hamn+ — per the settled three-way split: surface DS-6 / rails Transactions vertical / economy Console); the extension economy (paid extensions are Transactions/ADR-U011 territory, future wave); a fourth studio (ADR-U026 locks three sub-studios; where Dreamineer extension *authoring* happens is §8 Q4, and it must respect that lock); the permission system itself (PC-3 owns `has_permission()` and the growable permission registry — the Extension System defines how extensions REQUEST and are GRANTED capability access through it); and the build (the wave-deferred lock binds: this specification defines contracts and obligations; nothing here authorizes Ferd implementation).

### 2. Concepts

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Extension point | A declared surface a service exposes for extension: owning service, interface shape (the per-kind contract), lifecycle class. The seven DS §5 blocks are the realized declarations-in-prose. | Extension System tables (none realized; future wave — see §6) |
| Kind registry | A data-driven vocabulary table owned by a service (step kinds, content kinds, conversation kinds, facet kinds, bucket kinds, ...): rows addable without schema migration (U008/U018). The Extension System codifies the pattern; each service owns its instances. | The owning service's tables |
| Extension (plugin) | A community-authored unit that plugs into one or more extension points. An extension is a REGISTRY ROW plus its contract artifacts — never a code enum case, never a fork of core. | Extension System tables (future wave) |
| Manifest | What an extension declares: identity, version, extension points consumed, permissions requested, Platform API version pinned, FIM-data touchpoints. Grain is §8 Q5. | Extension System tables (future wave) |
| Lifecycle state | One of the data-driven extension lifecycle states (submission → review → publication → installation → enabled/disabled → retirement; exact vocabulary is L4 work and is itself a registry, never a sealed enum). | Extension System tables (future wave) |
| Permission grant | A granted-as-data capability access: which permissions an installed extension actually holds (requested in the manifest, granted at install/review — never assumed, never a closed set). | Extension System tables (future wave); pattern per U007(d) |
| Sandbox boundary | The trust contract: extensions reach the platform through the Platform API only (U023 lower-trust boundary) — never Internal API, never direct DB. Enforcement mechanism is §8 Q1. | Contract (enforcement substrate is §8 Q1/Q2) |
| Closure debt | A recorded violation of the non-closure constraint in realized substrate, anchored to its owning service's correction target (the DS-3 recorded correction cluster: sealed TS unions `StepType`/`JourneyType`/`DifficultyLevel`, the matching CHECK lists, switch-on-type render surfaces). | The owning service's spec + this file's §L3 |

### 3. Public contract (consumed by Surfaces and the extensions community)

Six contract families. Operation grain is L4 work; the families and their boundaries are L2-stable. **Deviation from the DS template, named:** this entity's contract faces TWO directions — *inward* (services registering extension points; Internal-API trust) and *outward* (extensions consuming contracts; Platform-API trust, the open consumer category). Each family is marked.

- **Extension-point registration** *(inward — services)* — a Domain Service declares its extension points: name, interface shape, lifecycle class. The seven §5 blocks are the current declarations-in-prose; this family is their future formalization. Services own their points; the Extension System owns the declaration contract.
- **Kind-registry contract pattern** *(both directions — THE foundational family)* — the codified pattern every kind-vocabulary follows: registry row + per-kind shape contract + discriminator-on-shared-base (U008's shape). Inward, services implement it (all seven already do); outward, extensions add kinds through it without Platform Core changes.
- **Extension manifest & registration** *(outward — community)* — declare an extension: identity, version, points consumed, permissions requested, API version pinned. Dreamineer-gated per U023's naming (role gates via PC-3; publisher identity via PC-2).
- **Lifecycle operations** *(outward + administrative)* — submit, review, publish, install, enable, disable, retire. Review precedes publication, always (invariant 4); every significant transition is cascade-specified (U016; §8 Q3 carries the missing-cascade-slot question).
- **Permission request & grant** *(outward + administrative)* — extensions request permissions in the manifest; grants are data, Console-visible, revocable. The realized pattern is PC-3's growable permission registry (U007(d)); closed permission sets are prohibited (the Ferd constraint's third clause).
- **Compatibility & versioning** *(outward)* — extensions pin Platform API versions; the sub-tier's deprecation discipline binds (v2 coexists with v1 until every consumer migrates — extensions are exactly the open consumer category that makes ADR-U015's weight real).

Consumers: future extensions (out-of-tree, open category); the seven Domain Services (registration side); the Hub and Gimbal surface extension management at FEAT time, future wave (equipment-keying stays feature-grain at the surfaces, U025). **No service depends on the Extension System to function** — the dependency direction is invariant 2.

### 4. Internal dependencies (consumed *from* this entity)

- Platform Core: **PC-1** Infrastructure (schema/RLS substrate, future wave); **PC-2** Identity (publisher identity; the consent surface wherever an extension touches FIM data); **PC-3** Organisation (`has_permission()` gating; the Dreamineer role template; the growable permission registry the grant model rides — U007(d); the personal-group actor primitive `get_current_personal_group_id()`); **PC-4** Governance (audit discipline — review outcomes, publication events, grant changes, sandbox violations all land in it).
- Other domain services: **all seven** — their published extension points (the §5 blocks) are what the contract layer registers and the kind-registry pattern formalizes. Reads of their published contracts only; the Extension System never reaches into service internals (it is bound by the same Platform-API discipline it enforces on extensions).

### 5. Extension points

Reflexive by nature — the Extension System's own vocabularies follow its own law. Every vocabulary below is a data-driven registry, never a sealed enum (U018 applied to the entity that codifies U018):

| Extension point | Interface | Lifecycle |
|----------------|-----------|-----------|
| Extension-point kinds | New classes of extensible surface as registry rows (registry-backed kinds, renderer contracts, behaviour hooks, ...) | Registry insert; future wave |
| Lifecycle-state kinds | The extension lifecycle vocabulary itself (new states addable — e.g., a future staged-rollout state) | Registry insert; future wave |
| Permission-scope kinds | Grant-scope vocabulary (per-group, per-equipment-context, platform-wide, ...) | Registry insert; future wave |
| Review-outcome kinds | Review-gate verdict vocabulary | Registry insert; future wave |

### 6. Storage & schema

**No Extension System schema is realized, by design** — the wave-deferred lock means none should exist at Ferd (verified dual-method at this descent: zero extension/plugin substrate anywhere). Extension registry, manifests, lifecycle states, and grants are tables to be designed at the entity's build wave within these postures: RLS on every table (platform tier law); every registry TEXT-keyed and open (U018); actor resolution via `get_current_personal_group_id()` (P-O1 — never bare `auth.uid()`); role names as TEXT-keyed `role_templates` rows (D7); audit-bearing events to PC-4's discipline. **The Ferd-realized substrate this entity binds is OTHER entities':** the non-closure-COMPLIANT pattern exists (the D15 rebuild's six registry tables — `permissions`, `role_templates`, `group_templates`, `role_template_permissions`, `group_template_roles`, `group_role_permissions` — plus the 44-row permission catalog seeded at `supabase/seeds/01_permissions.sql` — the realized point of definition, with `lib/constants/permissions.ts` as its display-order map; U007(d)'s three-source hierarchy, re-verified at this descent at exactly 44 rows by two counting methods); the non-closure VIOLATIONS are recorded closure debt — the DS-3 correction cluster (sealed TS unions `StepType`/`JourneyType`/`DifficultyLevel` in `lib/types/journey.ts`, the matching CHECK-listed vocabularies, and the switch-on-type render surfaces in `components/journeys/StepContent.tsx`; journeys.md §1 records the cluster) — anchored at §L3, not re-adjudicated here. The permitted shapes stay permitted: entity-state CHECKs like `EnrollmentStatus` are U018(b) law, and `JourneySortOption` is presentation furniture, not a domain vocabulary.

### 7. Service-level invariants

1. **Non-closure is law platform-wide.** Every extensible-concept vocabulary in every Domain Service is a data-driven registry, never a sealed enum, never a closed permission set (U008/U018; the Ferd constraint). Sealing any of them is an architecture bug — and the iteration-speed argument is never an acceptable rejection (sub-tier closure-recognition discipline).
2. **Extensions consume the Platform API only.** Never the Internal API, never the database directly (U023's lower-trust boundary). Services never depend on extensions; extensions depend on services' *published* contracts — the platform never depends on its extensions.
3. **Extensions are data.** An extension is a registry row plus contract artifacts; adding one never modifies Platform Core, never adds a code enum case, never forks core (U018 applied reflexively).
4. **Nothing publishes unreviewed.** The review gate precedes publication, always — the social contract's trust mechanism (MANIFESTO anchor; PC-4 audit posture). This binds AI-built extensions identically, under a human's authority with attributable provenance (PRINCIPLES-AI's last-say-is-authorship; the DS-7 generation-posture mirror — §8 Q7).
5. **Permissions are granted, never assumed.** Requested in the manifest, granted as data, Console-visible, revocable; no closed permission sets (the Ferd constraint's third clause; U007(d)'s growable-registry pattern).
6. **Every significant lifecycle transition is cascade-specified before implementation** (U016). Retirement and uninstallation cascade through every layer an extension touched — including FIM data an extension accumulated under consent (§8 Q3).
7. **The anti-leaderboard guardrail binds extension-facing surfaces.** No extension-popularity rankings, install counts as comparative surfaces, or chart furniture as platform surfaces (register; enforced at sources; the marketplace surface, when it lands at DS-6 in Hamn+, inherits the same guardrail).
8. **At Ferd, this entity specifies and obliges — it does not build.** The wave-deferred lock is scope law; the non-closure obligation set and the closure-debt register are the only Ferd-active capabilities.

### 8. Open questions

- **Q1 — Sandbox enforcement mechanism** *(speculative-third-shape)*. How is "Platform API only" ENFORCED — API-gateway mediation, process/runtime isolation, DB-level enforcement (extensions hold no DB credentials at all), or a combination? **No sandbox ADR exists** (verified dual-method — the charter noun has no architectural decision behind it yet); the posture derives from U023's trust boundary; the mechanism settles toward the build wave, likely via a dedicated ADR.
- **Q2 — Extension execution substrate** *(speculative-third-shape)*. Where does extension code RUN — Supabase Edge Functions, an app-tier extension host, or pure-data extensions (registry rows + declarative contracts, no arbitrary code) as the first tier? Credentials and secrets are app-tier per PC-1 Finding #4's channel. The pure-data tier may cover most of the charter's categories (new kinds are rows + shape contracts) — whether an arbitrary-code tier is needed AT ALL is part of this question.
- **Q3 — The U016 Extension cascade slot.** ADR-U016's cascade template slots end at Intelligence — no Extension System slot exists. Should lifecycle cascades carry an "Extension System: [what happens to extension state]" slot, and does extension retirement itself get a named cascade class? Routes to a U016 Option-A amendment at the entity's build wave (or earlier at the Phase 3 close-out if adjudicated worth pre-landing); not silently amended at this descent.
- **Q4 — The Dreamineer authoring surface.** U023 names Dreamineer as THE plugin author; U026 locks three sub-studios and no fourth. Where does extension authoring happen — a mode within an existing studio, a Hub developer surface, or out-of-band tooling with registry-only platform contact? Must respect the no-fourth-studio lock; settles toward the build wave.
- **Q5 — Manifest grain.** Declarative artifact (a manifest file/document) vs pure registry rows vs both (rows generated from a declared artifact)? L4-grade; the manifest CONTENT list in §2 is L2-stable regardless of grain.
- **Q6 — Review-gate governance.** Who reviews, under which scope (U028's governance-by-scope law — platform Console? delegated review roles?), and what are the review-outcome kinds? The gate's EXISTENCE is invariant 4; its governance shape settles with U028's Console work.
- **Q7 — AI-built extensions posture.** Cold lean: the SAME review gate with a distinct audit posture — attributable as AI-generated, under a human's authority, never publishing unreviewed (PRINCIPLES-AI; the exact mirror of the DS-7 generation resolution at content.md §8 Q8). Stated as lean rather than resolved because the publication context (community artifacts, not platform content) may want additional provenance obligations.
- **Q8 — The step-type specification session's relationship to this entity.** U008 mandates a step-type specification session before significant DS-3 implementation (triply motivated per journeys.md §8 Q1). That session will produce the first REAL instance of the kind-registry contract pattern at its most load-bearing site. Does it also ratify the pattern's general shape (this entity's family 2), making it the Extension System's first partial realization — and should it therefore carry an Extension System reviewer hat? Routes to that session's scoping.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the entity enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Kind-registry contract pattern | Plugin contracts | — | ADR-U008's shape (discriminator on shared base); the seven services' §5 practice | Observability (pattern-conformance is reviewable) |
| Extension-point registry | Plugin contracts | Kind-registry contract pattern | All seven DSs (their published §5 extension points) | Administration (registry administration, Console-scoped U028); Observability (registration events) |
| Plugin manifest contract | Plugin contracts | Extension-point registry | PC-2 (publisher identity) | Privacy (manifests declare FIM-data touchpoints); Observability (declaration events) |
| Contract versioning & compatibility | Plugin contracts | Plugin manifest contract | ADR-U015 + the sub-tier deprecation discipline | Observability (compatibility events; deprecation-window tracking) |
| Extension registry | Registry | Plugin manifest contract | PC-1 (schema/RLS substrate, future wave) | Administration (registry is Console-administered); Observability (registry events) |
| Registration & provenance | Registry | Extension registry | PC-2 (identity); PC-3 (Dreamineer gating); PC-4 (audit) | Administration (provenance audited); Privacy (publisher data is FIM data); Observability (provenance events) |
| Extension lifecycle states | Lifecycle | Extension registry | — | Administration (state transitions Console-visible); Observability (lifecycle events first-class); Notifications (publish/retire triggers to affected parties) |
| Lifecycle cascades | Lifecycle | Extension lifecycle states | ADR-U016 (the missing Extension slot — §8 Q3) | Administration (cascade specs precede implementation); Privacy (uninstall disposition of extension-accumulated FIM data); Observability (cascade events) |
| Review & publication gate | Lifecycle | Registration & provenance; Extension lifecycle states | PC-3 (reviewer gating); PC-4 (audit posture); §8 Q6/Q7 | Administration (review audited, never skipped); Observability (review events); Notifications (outcome triggers to publishers) |
| Sandbox boundary contract | Sandboxing & permissions | Plugin manifest contract | ADR-U023 (Platform API lower-trust boundary); §8 Q1/Q2 | Privacy (extensions never bypass RLS/consent); Observability (boundary violations recorded first-class, never silent) |
| Extension permission model | Sandboxing & permissions | Sandbox boundary contract; Plugin manifest contract | PC-3 (the growable permission registry, U007(d)); PC-2 (consent where FIM data is touched) | Privacy (granted-never-assumed; consent binds FIM-data access); Administration (grants Console-visible, revocable); Observability (grant-change events) |
| Non-closure obligation set *(Ferd-ACTIVE)* | Ferd non-closure obligations | — | ADR-U008 + ADR-U018 (THE locks); the sub-tier closure-recognition discipline | None directly — an authoring-discipline capability; its obligations bind every Domain feature spec's vertical-impact substance |
| Closure-debt register *(Ferd-ACTIVE)* | Ferd non-closure obligations | Non-closure obligation set | DS-3 (the recorded correction cluster: sealed unions, CHECK lists, switch-on-type renders) | None directly — anchors recorded debt to the owning service's correction target |

*Transactions: explicitly none at Ferd — the extension economy (paid extensions, revenue) is Hamn+ Transactions/ADR-U011 territory, and the marketplace surface is DS-6's, per the settled three-way split (surface DS-6 / rails vertical / economy Console). The first Transactions-bearing capability arrives with the marketplace wave, not this inventory.*

### Dependency chain

The **kind-registry contract pattern** is the foundation (everything else formalizes, registers, or guards instances of it). The **extension-point registry** needs the pattern; the **manifest contract** needs the points (an extension declares what it plugs into); **versioning & compatibility** rides the manifest. The **extension registry** persists manifests; **registration & provenance** gates entry to it. **Lifecycle states** govern registry entries; **cascades** specify state-transition consequences; the **review & publication gate** sits across registration + lifecycle (nothing publishes unreviewed). The **sandbox boundary contract** and **permission model** ride the manifest (what may this extension touch) and bind everything outward-facing. The two **Ferd non-closure capabilities are active NOW and depend on nothing in the build chain** — they are obligations on sibling authoring, not built artifacts; they precede everything else in time exactly because the rest defers.

### External dependencies

| Source entity | Capability consumed | Consuming internal area |
|---|---|---|
| PC-1 Infrastructure | Schema/RLS substrate (future wave) | Registry; Lifecycle |
| PC-2 Identity | Publisher identity; consent surface (extension FIM-data touchpoints) | Registry; Sandboxing & permissions |
| PC-3 Organisation | `has_permission()` + Dreamineer role template; the growable permission registry (U007(d)); actor primitive (P-O1) | Registry; Sandboxing & permissions; Lifecycle (reviewer gating) |
| PC-4 Governance | Audit discipline (review, publication, grants, violations) | Lifecycle; Sandboxing & permissions |
| DS-1 World Model | Published extension points (place/region/portal/tending-act/NPC-layer kinds — §5: none formally exposed; non-closure registries named) | Plugin contracts |
| DS-2 Narrative | Published extension points (season/episode/arc/beat/topology/texture/persistence/promotion kinds — §5: none formally exposed) | Plugin contracts |
| DS-3 Journeys | Published extension points (THE canonical extension surface: the step-kind system, U008; route/depth/attachment/state kinds) | Plugin contracts |
| DS-4 Content | Published extension points (the content-kind registry system: asset/block/rendition kinds + renderer contracts) | Plugin contracts |
| DS-5 Communication | Published extension points (conversation/feed-event/notification-event/delivery-channel kinds — tabular §5) | Plugin contracts |
| DS-6 Discovery | Published extension points (facet/result/listing kinds — tabular §5; listing kinds are the Hamn+ marketplace adjacency) | Plugin contracts |
| DS-7 Intelligence | Published extension points (bucket/sense/rail kinds + dialogue-context providers — tabular §5, provisional pending this derivation's Step 3) | Plugin contracts |

Cross-referenced per the template rule: all seven services' §5 blocks exist and were re-checked from the owned side at this descent (the inverted sibling-provisional rule; dispositions at §L3 Step 3). PC-2 consent surface, PC-3 permission registry + role templates, PC-4 audit discipline all exist in those inventories (verified across the PC chain at prior descents). **Consumers, not dependencies** (direction guard): future extensions consume this entity's contracts; the seven services REGISTER with it but never depend on it to function; no studio writes to it; the Hub/Gimbal extension-management surfaces are future-wave FEAT work.

### Sources-status block

- **The entity-shape adjudication (ratified 2026-06-11, this descent):** this entity is "Platform Domain — extensions", not DS-8. The spec lands at `SPECIFICATION.md` per the README's naming, on the domain-service-spec section skeleton as a structural variant, with the slug enum untouched. The adjudication is direct precedent evidence for the verticals' template-applicability question (Phase 3 close-out agenda).
- **The wave-deferred lock consumed throughout:** future-wave scope, not Ferd (`README.md`). All build-chain capabilities are full-forward by construction; only the non-closure obligation set and closure-debt register are Ferd-active.
- **The inverted sibling rule:** all seven DS specs exist; their §5 extension-point claims re-checked from the owned side (dispositions at Step 3; the named candidate edit is lifting `intelligence.md` §5's provisional remark).
- **No sandbox ADR exists** (dual-method verified): the sandboxing charter noun has no architectural decision behind it; the posture here derives from U023's trust boundary, and §8 Q1 expects a dedicated ADR at the build wave.
- **The U016 Extension-slot gap:** the cascade template's slots end at Intelligence; §8 Q3 routes the amendment question rather than silently amending.
- **Constitutional anchor:** the MANIFESTO's "Community ownership over corporate control" grounds the social-contract charter line — the second constitutional-doc entry in a descent authority chain (PRINCIPLES-AI at DS-7 was the first). The "AI is an extension" sense (PRINCIPLES-AI / register S24) is a NAMED COLLISION, not this entity.
- **L2-line altitude finding:** the domain README's Extension System line enumerates four type-nouns (step/group/role/content types) that predate the seven §5 blocks' realized registry-family breadth; revision candidate (mark the four as examples of the general kind-registry pattern) gated at Step 3.

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this entity's `features/` directory is created, advances in maturity, or is deleted.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| (all thirteen) | — | — | No FEAT-PD specs exist for the Extension System; the build is future-wave by lock |

### Capabilities without specs

All thirteen capabilities above. The eleven build-chain capabilities defer to the entity's build wave; the two Ferd-active capabilities (non-closure obligation set; closure-debt register) are discipline capabilities that bind sibling authoring rather than produce FEAT specs of their own.

### Features without capabilities

None.

---

## §L3 Step 2 — code-informed stress-test (2026-06-11, ratified)

**Expectation verified: NEAR-ZERO-CODE with named substrate of BOTH polarities, exactly as calibrated.** Zero cold retractions; two Class 2 deltas (both citation-precision fold-backs, folded inline above) — **retraction-rate point: Extension System = 0** (extending the completed seven-DS series: PC-4 7/9; DS-1 through DS-7 all 0; the full Platform Domain series closes at zero-since-PC-4). Run as sandboxed cluster sweeps; every zero-hit claim dual-method verified.

**Class 1 confirms:**
- **The wave-deferred posture is real on disk.** Zero extension/plugin/manifest/sandbox/registry substrate anywhere (`lib/`, `app/`, `components/`, `supabase/`, `tests/` — word-grep + stem-grep method pairs, all empty). No `supabase/functions/` directory (listing + explicit-path test). "plugin" zero hits; "extension" exactly two false positives, both comment senses (`components/profile/AvatarUpload.tsx` L63 file-extension; `supabase/migrations/20260228125730_sprint3_smart_notifications.sql` L3 schema-extension).
- **A#9: no realized contract object.** The realized RPC surface is `has_permission` / `admin_*` / `handle_notification_action`; Realtime channels serve force-logout/messaging/notifications only; no Edge Functions. Nothing exists to mistake for an extension contract (the DS-6/DS-7 "no object" shape — sixth data point).
- **PW-5 held:** 19-table baseline re-verified by two methods (CREATE TABLE enumeration = 19; RLS-enable count = 19); none extension-attributed. **PW-1: no object** (no extension schema exists to predate the partition). **PW-MARCH1: clean** — zero extension/plugin vocabulary across the 71 archived migrations; the registry tables were *created* at the D15 rebuild, not lost there (the compliance substrate has no loss lineage).
- **Both polarities held exactly as calibrated:** the six D15 registry tables (compliance) and the DS-3 closure cluster (violation), with the U018-amendment distinctions applied as classification law — no permitted state-CHECK was misclassified as a violation.

**Class 2 entity-internal deltas (2, folded inline):**
1. **Permission-registry citation precision** (§6): the 44-row catalog's realized point of definition is `supabase/seeds/01_permissions.sql` (44 rows, two counting methods); `lib/constants/permissions.ts` is the display-order map (its own header routes definitions to migrations/seeds). The cold draft's "application-tier registry" phrasing followed U007(d)'s wording over disk reality.
2. **Closure-debt cluster enrichment** (§2/§6/§L3): the realized violation is a *cluster*, not two items — five sealed unions in `lib/types/journey.ts` of which three are extensible-concept closures (`StepType`, `JourneyType`, `DifficultyLevel` — journeys.md §1's recorded set), plus the switch-on-type render surfaces (`StepContent.tsx` label/icon switches and conditional renders — the sub-tier law's named pattern). `EnrollmentStatus` is permitted entity-state (U018(b)); `JourneySortOption` is presentation furniture.

**Class 3 cross-entity findings: none new.** The permission-catalog vocabulary family is already in the doc-health/PC-3 channel (recorded at DS-7); the closure cluster is DS-3's recorded debt, anchored not re-routed.

**Phase-wide observations:** empty-result verification was again the workhorse discipline — and the **tool-level catch class fired a second in-run instance**: the first RPC survey used the sandbox grep's `-o` flag and silently returned empty against known PC-3 reality; the method-contrast rule caught it and the `-n` method recovered the full surface. The seeds-directory rule fired productively a third time (the canonical permission catalog lives in `supabase/seeds/`, invisible to migrations-only sweeps). #4 migration-name-as-shorthand: NO FIRE (both touched migrations classified by content; sprint3's "schema extension" comment is the notification-schema sense and its name describes its body) — **n-final: 8 opportunities, 1 firing**; the Phase 3 close-out adjudicates the landing.

---

## §L3 Step 3 — adjudication (2026-06-11, ratified)

**Q-resolution slate: all eight §8 questions stay open by design** — the consistent posture for a wave-deferred entity. Q1 (sandbox enforcement) and Q2 (execution substrate) are speculative-third-shape, settling toward the build wave (Q1 expects a dedicated ADR — no sandbox ADR exists today, verified dual-method). Q3 (the U016 Extension cascade slot) is ROUTED — to a U016 Option-A amendment at the build wave, with the Phase 3 close-out free to pre-land it if adjudicated worthwhile; not silently amended here. Q4 (Dreamineer authoring surface), Q5 (manifest grain), Q6 (review-gate governance) settle toward the build wave / U028's Console work. Q7 (AI-built extensions) stands as the stated lean (same review gate, distinct audit posture — the DS-7 generation-posture mirror). Q8 routes to the step-type specification session's scoping (U008 mandates that session; it will produce the kind-registry pattern's first load-bearing realization).

**The seven §5 re-checks (the inverted sibling-provisional rule): ALL SEVEN CONFIRMED.** Each landed service's extension-point claims verified from the owned side — every §5 block already practices registry-pattern non-closure and correctly defers plugin contracts to this entity's wave; content.md's "the Extension System charter names 'content types'" attribution verified accurate against the charter. **One sanctioned cross-entity edit landed in this commit batch:** `intelligence.md` §5's provisional remark lifted (its four registries — bucket kinds, sense kinds, rail kinds, dialogue-context providers — ratify as kind-registry instances under family 2), with the matching Sources-status sibling-provisional line updated in the same edit.

**Forward-commitment classification: ALL THIRTEEN capabilities FULL-FORWARD** — structural, not just empirical: the wave-deferred lock makes the eleven build-chain capabilities future-wave by law, and Step 2 confirmed zero substrate exists. The two Ferd-ACTIVE capabilities (non-closure obligation set; closure-debt register) are discipline obligations binding sibling authoring, not built artifacts — they are "active" in the sense that the constraint binds every Ferd Domain feature spec today.

**Consequential edits landed in this batch (each ratified):** the domain README Extension System line gained the kind-vocabulary generalisation (the L2-line altitude finding — the four type-nouns now read as examples); the domain CLAUDE.md Where-to-go-next enumeration retired its "derivation is next in the pipeline queue" clause; the extensions README's "(to be written when work begins)" parenthetical retired with a link to this file.

**Pickups:** recorded in the closing bridge (`2026-06-11_03_-_EXTENSION-SYSTEM-LANDED.md`) — **headlined by the assembled Phase 3 close-out agenda** (the four-rider adjudication slate with n-finals; the completed retraction-rate series; the vertical-template question with this descent's entity-shape adjudication as direct precedent; CQ-015; PC-1 Finding #4 + the avatars-bucket routing; the cross-tier-write channel); DS-3 (the closure-debt cluster anchor confirmation); Hub/Gimbal (extension-management surfaces at FEAT time, future wave); doc-health (cascade additions this session).
