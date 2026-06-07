# Session A - the repo-wide map (concept -> where-described; gaps; canonical-description finding)

**Date:** 2026-06-05
**Type:** Session snapshot (generate-on-demand; NOT a maintained state-doc). A point-in-time map.
**Run shape:** CC-run end-to-end (repo tree + term-grep + a 10-cluster per-file conformance sweep
by subagents); Stefan ratifies the judgment calls.
**Input / yardstick:** `docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`
(Statements 1-46 + the 2026-06-05 product/ecosystem design locks).
**Precedence (hard):** the universe-discovery work is the SINGLE SOURCE OF TRUTH. This session
INVENTORIES and CLASSIFIES the repo against it - it does not edit canon or code. Where a file
conflicts with the discovery, the discovery wins and that file is what later gets corrected
(at graduation, in Session B), never the reverse.

**Purpose this map serves (the reframing Stefan set):** the map feeds three downstream judgments -
- **Q-DOC:** does current documentation match the new truth?
- **Q-ARCH:** does the anatomy/architecture have to change? (ARCHITECTURE_ANATOMY_V1, the ADRs,
  the PC/DS entity decomposition)
- **Q-DECOMP:** does the vertical-axis decomposition (Vision -> Entities -> Capabilities ->
  Features) have to change?
Session A does not decide those - that is Session B (the challenge). Session A makes them
answerable. Every gap below is tagged ARCH / DECOMP / DOC accordingly.

---

## 1. Method

1. Full repo tree from the real working tree (`git ls-files`): 642 tracked files; docs/ tree
   (ecosystem, products, platform, studios, design-system, verticals, architecture, planning,
   templates, research) + code (app/, components/, lib/, supabase/, tests/, scripts/).
2. Repo-wide term-grep (distinctive markers Gimbal/Whisp/Dreamineer/DeusEx/affordance/transcend/
   safe-harbo/village/Shadow/Universeer/FIM, plus noisier Hub/Game/studio/console/portal/anchor/
   seed/ball). Outcome: distinctive-fiction terms concentrate in the discovery file and the
   universe/planning docs; in CODE the only hits are `console.log`, `shadow-*` Tailwind classes,
   and "FringeIsland"/"GitHub" substrings - the code carries NO fiction vocabulary.
3. A 10-cluster per-file conformance read (every description-bearing file classified against the
   discovery: status, what it describes, relationship = describes-what / stale / contradicts /
   silent, plus an ARCH/DECOMP/DOC impact tag). Clusters: ecosystem+strategy; universe-fiction;
   products; studios; platform+anatomy; ADRs; verticals; code (subsystem grain); planning
   concept-files + templates; root-context + design-system.
4. A follow-up SVG sweep (the first pass filtered to `*.md` + code and MISSED diagram content -
   caught and corrected on 2026-06-07). The three assertion-bearing diagrams were text-extracted
   and classified; they CORROBORATE the prose findings (see subsection 2.F and the SVG entries in
   Bucket (ii)). The anatomy is carried in diagrams too, so reconciliation must update SVGs, not
   only markdown.

**Scope decisions (ratified at Checkpoints 1-2):**
- **Code is set ASIDE** (Stefan, 2026-06-07): not a correction target for this reconciliation. A
  full code rewrite may follow once all entities are descended - a later decision. The one retained
  finding is that the code is SILENT on the fiction, so it neither blocks nor contradicts the locks.
  The subsystem-grain read is kept in section 2.D for reference but is OUT of the Bucket (ii)
  correction set.
- Planning `waves/studies/` concept files INCLUDED as planning-status homes of locked concepts.
- Research treated as reference-tier (evidence base feeding the discovery), not conformance-classified.
- **Format coverage caveat:** the sweep content-read `.md`, code, and the assertion-bearing `.svg`.
  Process diagrams (`how-we-work/assets/02-05`), `public/*.svg`, and tooling are excluded. The
  `.docx` / `.html` / `.txt` files (how-we-work source/render = process; `docs/research/*.docx` =
  reference; `Waves overview.txt` = planning) were classified by purpose/title, NOT opened (the text
  tools do not parse binary `.docx`). The `Multi-Product-Ecosystem-Management` research `.docx` is
  flagged for Session B to read when settling the products/entity decomposition.

---

## 2. Concept -> where-described map

Status legend: canonical (ecosystem/architecture tree) | thinking | planning | code | template |
root-context. Relationship: =OK (faithful home) | ~stale | !contradicts | (silent).

### A. Universe fiction

| Discovery concept (lock) | Where it lives today | Relationship |
|---|---|---|
| Whisp = "my inner dialogue / the Whisp IS the human"; fills BY growth; graduates the FIM | `universe/beings/README.md` (="future self"); `VISION.md`, `EXPERIENCE_PRINCIPLES.md` (companion/future-self); `planning/.../eid/whisp.md` ("inner dialogue partner", partial); DS-1 lists "Whisp" | !contradicts (beings, VISION); ~stale (planning, partial) |
| Worlds topology: Ordinary -> Shimmer -> Fringe (near-side + Beyond) -> Void/Cord; place 2 (warm) + place 3 (hostile) | `universe/cosmology/README.md` + `universe/README.md` (="Three Worlds: Ordinary/Safe Harbour/Other Side"); `EXPERIENCE_PRINCIPLES.md` (three worlds); `planning/.../heim/fringeisland-world.md` + `brim/void.md` (="real world / Void / FringeIsland", 3-dimension); DS-1 README label "Three Worlds" | !contradicts everywhere |
| The Shimmer (membrane/edge) | nowhere | (silent) - no home |
| Safe harbour / "the village" | `cosmology/README.md`, `hub/DESCRIPTION.md` (="Safe Harbour"); village = nowhere | ~stale; village no home |
| Tree + glowing glass Balls; private Home; two-zone gateway; per-region share | `planning/.../heim/my-garden.md` (="Garden", partial); `universe/personal-growth/privacy-model.md` (per-aspect/per-audience sharing - adjacent) | ~stale; ball/Tree/village no home |
| The Void = axis-of-separation along the Cord; anchoring; seeds | only `planning/.../brim/void.md` - and it uses the SUPERSEDED between-worlds meaning | !contradicts; locked meaning has no home |
| Shadow + transcendence (anon-auth, ephemeral erase, atomic consent migration) | `ADR-U004` (visitor anon-auth + `is_temporary` + pg_cron - mechanism); `privacy-model.md` (adjacent); `identity-specification.md` (silent); code: a `Visitor` system-group placeholder only | mechanism present (ADR-U004); fiction/lifecycle no home |
| Live / Grow / Matter (teleology beneath Who/What/How; Grow=delight) | `VISION.md` (tagline only); `universe/personal-growth/three-questions.md` (Who/What/How only) | (silent on the teleology) - no home |
| NPCs = layered body+culture+character composite | `universe/beings/README.md` ("narrative presence" only) | ~stale/partial; layered model no home |

### B. Roles and governance

| Discovery concept (lock) | Where it lives today | Relationship |
|---|---|---|
| Role ladder Member / Steward / Dreamineer / DeusEx | `community/README.md` (Member/Steward/Dreamineer/**Council**); `PC-3 organisation-specification.md` + `organisation/CLAUDE.md` + CODE seeds (Steward/**Guide**/Member/**Observer**); `beings/README.md` (Makers/Weavers/Skalds) | ~stale + INTERNALLY INCONSISTENT: docs, specs, and code use three different ladders |
| FIM = base identity; roles are MODES not castes | universal-group pattern (`ADR-U006`, org-spec, code `has_permission`) is a good substrate; framing absent | =OK substrate; (silent) on modes |
| Dreamineer = authorial-mode umbrella: Creator->World, Teller->Arc, Wayfinder->Journey, Anthropologist->World | nowhere as a taxonomy; `member-archetypes.md` treats Dreamineer as a persona | no home |
| Universeers + Council = enterprise-stewardship plane | `IP_AND_LICENSING.md` ("Foundation/Council/Community"); Universeers = nowhere | ~stale naming; Universeers no home |
| DeusEx = authority of last resort | `ADR-U019`, `PC-4 governance-specification.md`, `governance/CLAUDE.md`, code `app/admin/deusex/` | =OK (confirmed) |
| Governance splits by SCOPE (universe console vs community in-place) | not framed; `admin/SPECIFICATION.md` + `transactions/SPECIFICATION.md` model one undifferentiated operator plane; `governance/CLAUDE.md` says "do not introduce new admin roles" | (silent) / actively resisted |
| The Console (universe-scoped governance surface) | nowhere | no home |

### C. Products, studios, platform (the architecture/decomposition surface)

| Discovery concept (lock) | Where it lives today | Relationship |
|---|---|---|
| Not clones; one shared core; products are clients over one Platform API | `ADR-U023`, `ADR-U009`, `platform/README.md`, root `CLAUDE.md` | =OK (confirmed - the lock the repo already holds) |
| Hub / Gimbal = affordance PROFILES, not devices; device-independent | `products/**` (all device-entities); `gimbal/ios/`+`gimbal/android/` sub-entities; `AGENTS.md` feature-ID prefixes; root `CLAUDE.md`, `docs/README.md`, `design-system/**`; templates | !contradicts / ~stale (DECOMP) everywhere |
| Feature-grain affordance-keying; required-affordance metadata beside `maturity:` | `templates/feature-spec.md` has `maturity:` but NOT the affordance field | the seed lock has no home |
| The Game is DEPTH, not a product | `products/game/**` (product entity, prefix GM); `PRODUCTS_AND_PLATFORM.md` (="Unreal Engine product, Beyond-Urd") | !contradicts (DECOMP); `ADR-U017` journeys-as-templates is compatible |
| Universe Studio = PARENT umbrella over World+Arc+Journey | `studios/**` model 3 SIBLINGS; `universe-studio/README.md` explicitly EXCLUDES Arc; templates + `planning` studies same | !contradicts |
| World Studio = an entity (Creator hard side + Anthropologist soft side) | no `docs/studios/world-studio/` folder; "world content" folded into Universe Studio; planning calls it "FringeIsland Studio" | MISSING entity |
| Studios = role-gated authoring MODE; World Studio access tiers by scope | `studios/**` frame studios as Dreamineer surfaces tied to one Domain Service | ~stale; scope-tiering absent |
| PC/DS anatomy (ADR-U023); DS-1 World Model / DS-2 Narrative / DS-3 Experience as homes | `platform/README.md`, `platform/domain/README.md` | =OK (anatomy holds; DS-1 label "Three Worlds" is ~stale) |
| Identity (PC-2) home for Shadow lifecycle | `identity-specification.md` models signed-up Users only | (silent) - ARCH gap |

### D. Code (as-built anatomy, subsystem grain) - SET ASIDE as a correction target (Stefan, 2026-06-07); kept for reference only

| Subsystem | Relationship to discovery | Tag |
|---|---|---|
| Identity/auth | ~stale/partial: `Visitor` group placeholder; NO anonymous-auth, ephemeral lifecycle, or transcendence | ARCH (U004 unbuilt) |
| Roles/permissions/groups | =OK substrate (universal group pattern, `has_permission`); ~stale ladder (Steward/Guide/Member/Observer; no Dreamineer/Universeers) | DECOMP |
| Governance/DeusEx | ~stale: flat `platform_admin` group; no scope-split, no console | ARCH/DECOMP |
| Journeys/enrollments | =OK consumption side; (silent) on authoring (no Journey Studio/Wayfinder) | DECOMP |
| Messaging/forum/notifications | (silent) on fiction; functional substrate only | NONE |
| **Whole code** | **carries NO universe-fiction vocabulary; implements only the platform substrate. It does not contradict the affordance/Game-as-depth locks - it predates them.** | - |

### E. Reference tier (evidence base, not conformance-classified)
`docs/research/` (Portal_Fantasy, Parallel_Worlds, What_Fills_a_Life v1/v2, Kegan_ITC, Theory_U)
and the discovery siblings (onboarding-summary, portal-ideas-from-research) - inputs that FEED
the discovery; they inform canon, they do not assert "what FringeIsland is".

### F. Architecture diagrams (SVG) - initially missed, swept on the 2026-06-07 catch

| Diagram | What it asserts | Relationship |
|---|---|---|
| `architecture/ECOSYSTEM_ANATOMY_V4.svg` (label "v2.2, April 2026") | The canonical anatomy: "Products (FIMs)" = The Hub/Web, The Gimbal/iOS+Android, The Game, Studios (Journey, Universe, Arc); DS-1 "Universe, Three Worlds, Whisp, lore"; PC-4 "DeusEx policies"; PC-2 "Auth, profile, sessions" | !contradicts - one of the DENSEST single carriers of the stale model: products-as-devices + Game-as-product + 3-sibling-studios / no World Studio [DECOMP]; Three-Worlds + single-DeusEx + identity-silent-on-Shadow [ARCH] |
| `architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` | "Universe Studio writes -> World model", "Arc Studio writes -> Narrative", "Journey Studio writes -> Experience" | !contradicts (studios-as-siblings / one-studio-one-DS) [DECOMP]; otherwise confirms the DS decomposition |
| `ecosystem/how-we-work/assets/01-decomposition-cascade.svg` | THE vertical-axis decomposition picture (L1 Vision -> L5 Tasks; L2 Entities = Products / Platform Core / Domain Services / Studios / Design System / Verticals). Documents its OWN gaps. | reference - and it already flags **"GAP - Whisp placement (L2): named in Vision, no L2 owner. Intelligence? World Model? Cross?"**, independently corroborating Bucket (i) |

---

## 3. Gap list (three buckets)

### Bucket (i) - locks/statements with NO home anywhere in the repo
These are concepts the discovery locks that no current file describes (or whose only "home" uses
a superseded model). Strongest candidates for new canonical writing in Session B.

1. **The Shimmer** (membrane/edge between Ordinary World and the Fringe). [ARCH]
2. **Near-side vs Beyond split; place 2 (warm) + place 3 (hostile) co-located.** [ARCH]
3. **The Void's LOCKED meaning** (axis-of-separation along the Cord) + the **Cord / anchoring /
   seeds** mechanics. The only "Void" homes use the superseded between-worlds model. [ARCH]
4. **The Tree + glowing glass Balls + the Village + the two-zone private Home gateway.** [DECOMP/DOC]
5. **Live / Grow / Matter** as the teleology beneath Who/What/How. [DECOMP]
6. **Dreamineer authorial sub-modes** as a role taxonomy (Creator/Teller/Wayfinder/Anthropologist).
   [DECOMP]
7. **Universeers** (the enterprise-stewardship plane, distinct from the Council). [ARCH/DECOMP]
8. **The Console** (universe-scoped governance surface; governance-by-scope). [ARCH/DECOMP]
9. **Affordance profiles + feature-grain affordance-keying** + the required-affordance metadata
   field. [DECOMP]
10. **The Game-as-depth** reclassification (only the contradicting product-entity framing exists).
    [DECOMP]
11. **NPC layered depth-on-demand composite** model. [DECOMP]
12. **World Studio** as an entity. [DECOMP]
13. **Shadow + transcendence as a first-class identity lifecycle** (anon-auth + ephemeral erase +
    atomic consent migration + ball-grant). Mechanism partly in ADR-U004; the lifecycle/spec home
    is absent (identity-spec is silent). [ARCH]

### Bucket (ii) - existing files that are STALE or CONTRADICT the discovery
Grouped by the change they force. (Full per-file evidence captured in the sweep; representative
files listed.)

**ARCH (anatomy / architecture / ADR / entity-shape change):**
- `universe/cosmology/README.md`, `universe/README.md` - !contradicts (Three-Worlds topology).
- `architecture/ARCHITECTURE_ANATOMY_V1.md` - ~stale (superseded by U023; visitor model not
  carried forward; old role ladder).
- `architecture/DOMAIN_ENTITIES.md` - ~stale (generic User/Group; no FIM/Shadow/role taxonomy).
- `platform/core/identity-specification.md` - (silent) on Shadow/transcendence - ARCH gap.
- `platform/core/governance-specification.md` + `governance/CLAUDE.md` - ~stale (single DeusEx
  tier; no console / Universeers / scope-split; "do not introduce new admin roles" resists it).
- `platform/core/organisation-specification.md` + `organisation/CLAUDE.md` - ~stale (role ladder
  Steward/Guide/Member/Observer).
- `ADR-U023` - REVISE the Products row (entity identity) while CONFIRMING the shared-core split.
- `ADR-U004 / U010 / U002 / U019 / U012` - ADD-TO (extend for Shadow erasure, the console, the
  Universeers plane, scope as a permission axis) - reconcilable extensions, not contradictions.
- `planning/.../heim/fringeisland-world.md`, `brim/void.md` - !contradicts (topology).
- DIAGRAMS: `architecture/ECOSYSTEM_ANATOMY_V4.svg` (Three-Worlds label, single-DeusEx, identity
  silent on Shadow) + `DOMAIN_SERVICE_DEPENDENCIES.svg` - the stale anatomy is carried in the
  diagrams too, so they correct alongside the prose.
- (CODE set aside as a correction target - see the scope note; the as-built gaps are recorded in
  section 2.D for reference only, not actioned in this reconciliation.)

**DECOMP (Vision -> Entities -> Capabilities -> Features change):**
- `VISION.md`, `EXPERIENCE_PRINCIPLES.md`, `PRODUCTS_AND_PLATFORM.md`, `CONTRIBUTION_ARCHITECTURE.md`
  - ~stale/!contradicts (products-as-devices, Game-as-product, four-group roles, three-worlds).
- `products/**` (README, CLAUDE, hub/DESCRIPTION + SPECIFICATION, gimbal/* incl ios+android,
  game/*) - device-entity + Game-as-product + Gimbal sub-entities; affordance-keying absent.
- `studios/**` (README, CLAUDE, the three studios) - sibling model; World Studio missing;
  `universe-studio/README.md` excludes Arc.
- `templates/**` (feature-spec MISSING affordance field; product/studio/design-system templates
  enumerate hub/gimbal/game as device-entities and studios as siblings).
- `AGENTS.md` (feature-ID prefixes G/GM/US/AS), root `CLAUDE.md`, `docs/README.md`,
  `design-system/README.md` + `CLAUDE.md` - entity enumeration + cascade entity level.
- `verticals/administration/SPECIFICATION.md`, `verticals/transactions/SPECIFICATION.md` -
  ~stale (one undifferentiated operator plane; need scope-split for the console).
- `verticals/privacy/SPECIFICATION.md` - partial (AI-consent present; Shadow ephemerality absent).
- DIAGRAMS: `ECOSYSTEM_ANATOMY_V4.svg` (products-as-devices, Game-as-product, 3-sibling-studios,
  no World Studio) + `DOMAIN_SERVICE_DEPENDENCIES.svg` (studios-as-siblings).
- `planning/.../{fringeisland-studio-v1..v3, journey-studio-v*, arc-studio-v1, android/ios-app}`.

**DOC (wording / naming only):**
- `universe/beings/README.md` (Whisp "future self"; Makers/Weavers/Skalds).
- `hub/DESCRIPTION.md` ("Safe Harbour", "FIM-facing"); `IP_AND_LICENSING.md`
  (Foundation/Council/Community); `kickstarter-vision.md` ("Dreamineer Council");
  root `README.md` (sub-project framing, old role list); `member-archetypes.md`.

**Clean (describes-what / silent, no action):** `MANIFESTO.md`, `BUSINESS_MODEL.md`,
`ecosystem/README.md`, `privacy-model.md` (the strongest existing home for Shadow/consent),
`three-questions.md` + `engagement-spectrum.md` (faithful on Three Perspectives + science-as-
substrate), `platform/README.md` + `platform/CLAUDE.md` + PC-1 infrastructure, the
notifications/observability verticals, most ADR mechanisms (U003/U005/U006/U007/U008/U009/U016/
U017/U018/U020), `CHANGELOG.md` (historical).

### Bucket (iii) - implied-but-missing files the locked model needs
1. A **canonical worlds-topology / cosmology** home reflecting Ordinary -> Shimmer -> Fringe
   (near-side + Beyond) -> Void/Cord (rewrite `cosmology/README.md` or add a new core file).
2. A **`docs/studios/world-studio/`** entity (README + CLAUDE + features).
3. A **console** home (a platform governance surface doc and/or an Admin-vertical section), plus
   a **Universeers / enterprise-stewardship-plane** home.
4. New/amended **ADRs**: affordance-profiles + feature-grain affordance-keying; Game-as-depth
   (amends U023/U017); Shadow + transcendence identity-lifecycle (extends U004/U010/U016).
5. The **required-affordance metadata field** added to `templates/feature-spec.md` (a template
   change that touches every future feature spec).
6. A **Dreamineer authorial-mode role taxonomy** home and an **NPC layered-composite** home
   (in `universe/beings/` or a roles doc).
7. A **Live/Grow/Matter** teleology home (in `VISION.md` or `universe/personal-growth/`).

---

## 3A. Proposed unified role model (for Session B to ratify-and-graduate)

Added at Stefan's request (ratified 2026-06-07) as a sharpening of the role-taxonomy finding -
NOT decided canon. The core insight DISSOLVES the "three different ladders" inconsistency: the old
docs flattened four different things into one linear ladder. They are not a ladder - they are an
identity state plus three layers.

**L0 - Identity state** (what the system knows you as)
- **Shadow** - anonymous entrant; near-side only; ephemeral data. (unifies the stale "Visitor")
- **FIM** - base identity; has a Whisp, and a ball granted at transcendence. ("Member" is the
  platform-technical synonym.)
- Transition: **transcendence** (Shadow -> FIM; the consent + persistence threshold).

**L1 - FIM modes** (stances a FIM occupies toward the universe; permission-gated via the universal
group pattern; a FIM can hold several at once)
- **Experiential** - journeying (the default).
- **Authorial = the Dreamineer umbrella** (each gated to a Studio): **Creator** -> World Studio
  (hard) / **Anthropologist** -> World Studio (soft) / **Teller** -> Arc Studio / **Wayfinder** ->
  Journey Studio.
- **Support / group roles** - a FIM's role WITHIN a given group; these ARE the PC-3 / ADR-U007 role
  templates: **Steward** (leads/cares for a group) / **Guide** (facilitates a joint journey) /
  **Member/Participant** (takes part) / **Observer** (watches).

**L2 - Enterprise-stewardship plane** (sustaining the project, not a stance toward the fiction;
ideally also FIMs)
- **Universeers** - constituency, portfolio, community, economy, legal.
- **The FringeIsland Council** - major decisions, partnerships.
- **DeusEx** - platform authority of last resort (ADR-U019); the surface they act through is the
  **Console** (universe-scoped governance).

**One system, two faces:** every role above is a set of permissions granted via groups
(`has_permission`, the universal group pattern). Fiction names and platform permissions are the same
system seen from two sides.

**Why the old "ladders" looked inconsistent - they span different layers:**
- `Steward/Guide/Member/Observer` (PC-3 + code) = L1 per-group templates, not a global tier -
  implemented correctly, just under-explained.
- `Member/Steward/Dreamineer/DeusEx` (discovery's cited "platform ladder") = one item from EACH
  layer stacked (identity + group-role + mode + platform-authority) - reads like a ladder, isn't one.
- `Member/Steward/Dreamineer/Council` (community/README) = same stack with Council MIS-FILED (it is
  L2, not a tier above Dreamineer).

So there is no single ladder to reconcile - there is a 3-layer model the older docs collapsed.

**Open decisions handed to Session B (not locked here):**
- a. "Member" double-duty: identity-synonym-for-FIM vs the per-group participant role. Lean: FIM is
  the identity; rename the group template to **Participant** (or only ever say "FIM" for identity).
- b. Is DeusEx purely the technical break-glass authority beneath the human Universeers/Council, or
  also a named seat on the enterprise plane? Lean: technical embodiment; Universeers/Council are the
  human governance; the Console is their surface.
- c. Drop stale alt-names: Visitor -> Shadow; Makers/Weavers/Skalds -> Creator/Teller/etc.

---

## 4. The finding - is there a single canonical "what FringeIsland is" description?

**No. It does not exist, and the emergent description is internally inconsistent in three
directions:**

1. **Docs vs the discovery.** The whole canonical universe layer (`cosmology/`, `beings/`,
   `EXPERIENCE_PRINCIPLES.md`, `VISION.md`) encodes the SUPERSEDED model: Three Worlds
   (Ordinary/Safe Harbour/Other Side), Whisp = future self, products = devices, Game = a product,
   studios = siblings.
2. **Docs vs docs.** The role ladder alone appears in three incompatible forms -
   Member/Steward/Dreamineer/**DeusEx** (discovery's cited platform ladder),
   Member/Steward/Dreamineer/**Council** (`community/README.md`), and
   Steward/**Guide**/Member/**Observer** (`PC-3` specs). Studios appear as siblings in some files
   and (almost) as an umbrella in others. (The proposed unified role model in section 3A dissolves
   the ladder half of this: the three "ladders" are different LAYERS, not rival tiers.)
3. **Docs vs code.** The code is a clean platform substrate, silent on all fiction; its role
   ladder (Steward/Guide/Member/Observer) matches the PC-3 spec, not the discovery and not the
   universe docs. (Code is now set aside as a correction target - the inconsistency is recorded,
   not actioned here.)

**Should a single canonical description exist?** A single coherent narrative SHOULD exist, but the
evidence argues for a thin canonical **spine**, not a monolith - the existing two-tree + cascade
structure is sound and worth keeping. The two most-diverged, most-load-bearing layers - the
**worlds topology/cosmology** and the **role taxonomy** - are exactly the places that need ONE
canonical core that every other doc references, because today they diverge from file to file. The
discovery file itself is the closest thing to a coherent whole-picture, but it is a discovery LOG
in `thinking/` status, not a description. Whether the reconciled description lands as one new
description doc or as corrections across the existing set is the explicit decision Session B
inherits; this map's evidence leans toward "correct the existing set, but first establish a single
canonical cosmology core and a single canonical role-taxonomy core."

---

## 5. Rollup against the three judgments

**Q-DOC - does documentation match the new truth?** No. The universe-fiction layer, the product/
studio entity model, and the role taxonomy are systematically stale or contradicting; the privacy/
growth-perspectives layer and most ADR/platform mechanisms are faithful.

**Q-ARCH - does the anatomy have to change?** Mostly HOLDS, with targeted changes - not a teardown
(matches the bridge's expectation). The PC/DS decomposition (ADR-U023) and API-first/shared-core
are CONFIRMED. Targeted ARCH changes: (1) Identity/PC-2 gains the Shadow anonymous-auth + ephemeral
+ transcendence lifecycle; (2) Governance/PC-4 splits by scope and grows a **console** surface +
the **Universeers** plane (the "one admin role" rule must relax); (3) the role ladder is reconciled
(Dreamineer has no home in PC-3); (4) topology labels restated (DS-1 "Three Worlds").

**Q-DECOMP - does the vertical-axis decomposition have to change?** Yes, materially at the Entities
level - this is the largest change. Hub/Gimbal become affordance PROFILES rather than device
entities; the Game is removed as a product entity (becomes depth); a **World Studio** entity is
added and **Universe Studio** becomes the parent of World/Arc/Journey. This ripples through the
feature-ID prefixes (`AGENTS.md`), the agent-context cascade entity level, the templates, the
design-system, and the products/studios trees. At the Feature level: the required-affordance
metadata field is added to every feature spec (template change). The **console** may become a new
capability/entity.

---

## 6. Handoff to Session B (the challenge) - this map is its input

Session B takes this map and runs the statement-driven reconciliation: each of Statements 1-46 +
the product locks -> {reflected / stale / contradicts / missing, proposed resolution, graduate-or-
defer}, producing the ratified reconciled description and the repo-wide conformance register (with
its descent-impact view re-checking PC-1..PC-4 and constraining DS-1..DS-7). The map says the work
splits cleanly: the **architecture mostly holds** (confirm ADR-U023/U009; targeted extensions for
Shadow/Identity, the console/Universeers in Governance, and the role ladder), while the
**decomposition needs a genuine decision first** - the products-as-affordance-profiles + Game-as-
depth + Universe-Studio-as-parent + World-Studio-as-entity restructuring is the single largest and
most rippling change, and it should be settled (likely as one or two ADRs) before the dependent
entity docs, templates, feature-ID prefixes, and the cascade are corrected. Session B should
prioritise establishing the two missing canonical cores - the worlds topology/cosmology and the
role taxonomy - since they are the most-diverged and everything else references them; and it should
treat Bucket (i) (13 homeless locks) as the new-writing backlog and Bucket (iii) as the new-file
backlog. DS-1 (World Model) is next in the descent; the evidence supports pausing it until the
cosmology core and the entity decomposition are reconciled, so DS-1 derives on solid ground.

Three carries for Session B from the later passes: (1) section 3A offers a **proposed unified role
model** (states / FIM-modes / enterprise-plane - not a ladder) to ratify-and-graduate; (2) the stale
model is also carried in the **architecture diagrams** (`ECOSYSTEM_ANATOMY_V4.svg`,
`DOMAIN_SERVICE_DEPENDENCIES.svg`), so graduation must update SVGs alongside the markdown; and (3)
the `Multi-Product-Ecosystem-Management` research `.docx` (reference-tier, not content-read here)
should be read when settling the products-as-affordance-profiles + Game-as-depth entity decision.
Code is explicitly set aside as a correction target for this reconciliation (a possible full rewrite
once all entities are descended is a later decision).
