# Session B - repo-wide conformance register (statement-driven reconciliation)

**Date:** 2026-06-10
**Type:** Session artifact (the Session B deliverable; a point-in-time register, not a maintained state-doc).
**Inputs:** the Session A map (`2026-06-05_02_-_SESSION-A-REPO-MAP.md`, commit b90baf1); the
universe-discovery file (Statements 1-46 + the 2026-06-05 product locks) as the SINGLE SOURCE OF
TRUTH; the bridge (`2026-06-05_01_...-BRIDGE.md`).
**Already graduated this session (commit a6101ad):** ADR-U025 (products as equipment profiles;
Game as depth), ADR-U026 (Universe Studio parent; World Studio entity; studios as mode), the
cosmology core (`universe/cosmology/README.md`, rewritten), the roles core
(`universe/roles/README.md`, new), the universe README index. Ratified calls: "equipment" replaces
"affordance" in canon; Participant renames the per-group Member role; DeusEx is the human
root-admin group (platform operations + last-resort permission profile; the link between platform
life and ecosystem development); stale names fully retired.
**Discipline:** corrections flow discovery -> repo, never the reverse. Graduate-marked items are
edited only after Stefan ratifies the batch they sit in (Section 4).

---

## 1. Statement-driven spine (Statements 1-46 + product locks)

Status legend: **REFLECTED** (faithful home exists - named) / **STALE** (partial or outdated home)
/ **CONTRADICTS** (a file asserts the superseded model) / **MISSING** (no home).
Mark: **DONE** (graduated this session) / **G-n** (graduate, in batch n of Section 4) /
**DEFER** (no canon action; stays in the discovery log) / **ASK** (Stefan's call, Section 5).

| St | Lock (short) | Status after steps 1-2 | Resolution | Mark |
|---|---|---|---|---|
| open | The Ordinary World frame | REFLECTED - cosmology core sec 1 | - | DONE |
| 1-5 | Whisp = inner dialogue; empty-fills; tough love; IS the human; voluntary coach -> self-love | CONTRADICTS `beings/README.md` ("future self") | rewrite beings/ Whisp section from S1-5, 17-18, 22, 39 | G-1 |
| 6-7 | Built to graduate; Whisp internalises | STALE - `VISION.md` partial | make the graduation arc explicit in VISION | G-1 |
| 8-9 | Flourishing research anchors; Three Perspectives + Immunity to Change | STALE/partial - personal-growth faithful on perspectives; ITC uncited | beings rewrite cites the anchors; no new file | G-1 |
| 10-11 | Parallel reality via Whisp + Gimbal; the beyond | REFLECTED - cosmology core secs 1-4 + ADR-U025 | - | DONE |
| 12 | Full tonal range as backdrop | REFLECTED - cosmology core sec 3; `EXPERIENCE_PRINCIPLES.md` still carries three-worlds | correct EXPERIENCE_PRINCIPLES | G-1 |
| 13-14 | Dreamineers/Creators; AI-first-human-first; Universe Studio parent (Arc not Arch) | REFLECTED - ADR-U026 + roles core; AI principle not yet constitutional | see S24 | G-1 / ASK |
| 15 | NPCs are agents (superseded by S30's composite) | STALE - beings "narrative presence" only | beings rewrite carries the S30 layered model | G-1 |
| 16 | Shadows; seamless transcendence | REFLECTED - roles core; PC-2 spec silent (ARCH gap) | extend identity-specification; ADR-U027 | G-3 |
| 17-18 | Whisp fills BY growth; assessments dissolved into dialogue; Big5-senses | MISSING canonical home | beings rewrite; DS-Intelligence descent constraint | G-1 |
| 19-21 | Growth zone; meta-safety; respawn (plural, nested, in-story) | MISSING (meta-safety itself now in cosmology core sec 10) | correct `narrative/README.md` (respawn topologies, loop textures, home base) | G-1 |
| 22 | Jake/Avatar structure | REFLECTED - cosmology core secs 5, 10; beings dual-nature wording stale | beings rewrite | G-1 |
| 23 | ARG / Alternative Reality reference set | reference-tier | no canon action | DEFER |
| 24 | AI as extension; dreaming sessions; guard railing (bidirectional, human-authored) | MISSING constitutional home (discovery flags it as candidate-constitutional) | graduate into MANIFESTO or a principles doc | ASK |
| 25 | Akerman / Stalenhag worldbuilder references | reference-tier | no canon action | DEFER |
| 26-27 | Worlds topology lock; the Void/cord/anchoring | REFLECTED - cosmology core | - | DONE |
| 28 | Live / Grow / Matter teleology (balance, not sequence; Grow = delight - guard it) | MISSING | VISION carries the teleology beneath Who/What/How; `three-questions.md` gains the layer | G-1 |
| 29-30 | Role taxonomy; World Studio hard/soft; NPC layered composites; three human scales | REFLECTED - roles core + ADR-U026; PC-3 spec still says Member | PC-3 correction (Participant; Dreamineer authorities) G-3; beings NPC detail G-1 | G-1/G-3 |
| 31-36 | Two places; coupling; village placement; inviolable ball / tendable commons; world-genesis; cord vs branch | REFLECTED - cosmology core | - | DONE |
| 37-40 | Equal balls; crown = branches; universal Whisp; seeds/portals/dial | REFLECTED - cosmology core | - | DONE |
| 41-46 | Village name; ball two-zone UI; private home; home = personal-scope World Studio; anchoring gate; Shadow data | REFLECTED - cosmology + roles cores; PC-2/Privacy spec gaps remain (S46); per-region home permissions (S43) span PC-2/PC-3/DS-1/Privacy | specs in G-3; descent constraints in Section 3 | G-3 |
| locks | Equipment profiles; feature-grain keying; Game as depth; studios as mode; console; placement rule | REFLECTED - ADR-U025/U026 + roles core (console named) | template field + trees + AGENTS in G-2; console spec home (PC-4 + Admin vertical) in G-3 | G-2/G-3 |

**Spine summary:** 24 of the 46 statements + the topology/product locks are now REFLECTED in the
two cores and two ADRs. The remainder resolve into the per-file corrections below; only S24
needs a placement decision, and S23/S25 stay reference-tier by design.

---

## 2. Per-file conformance register

Columns: status vs the discovery (after steps 1-2) -> correction -> batch mark.

### 2.1 Ecosystem identity surface (DOC/DECOMP)

| File | Status | Correction | Mark |
|---|---|---|---|
| `ecosystem/VISION.md` | STALE (three-worlds echoes; device products; role list; no teleology; graduation arc implicit) | reference cosmology + roles cores; products per ADR-U025; add Live/Grow/Matter beneath Who/What/How; make graduate-not-retain explicit | G-1 |
| `ecosystem/EXPERIENCE_PRINCIPLES.md` | CONTRADICTS (three worlds; Whisp companion/future-self) | restate against the cores | G-1 |
| `ecosystem/strategy/PRODUCTS_AND_PLATFORM.md` | CONTRADICTS (Game = Unreal product, Beyond-Urd; device products) | equipment profiles + Game-as-depth with revisit trigger (per ADR-U025) | G-1 |
| `ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md` | STALE (four-group roles) | role language per roles core | G-1 |
| `ecosystem/strategy/IP_AND_LICENSING.md` | STALE ("Foundation/Council/Community") | align to L2 plane (Universeers/Council/DeusEx) | G-1 |
| `ecosystem/universe/beings/README.md` | CONTRADICTS (Whisp = future self; Makers/Weavers/Skalds) | full rewrite: Whisp per S1-5/17-18/22/39 (inner dialogue + avatar, two views both true); NPC layered composite (S30); retired names out; roles -> pointer to roles core | G-1 |
| `ecosystem/universe/community/README.md` | CONTRADICTS (Member/Steward/Dreamineer/Council ladder) | replace ladder with pointer to roles core; keep community-dynamics content | G-1 |
| `ecosystem/universe/narrative/README.md` | STALE/placeholder (no respawn model) | seasons/episodes + respawn topologies, loop textures, home base (S19-21, 12) | G-1 |
| `ecosystem/universe/personal-growth/three-questions.md` | faithful, thin | add the Live/Grow/Matter layer beneath the questions (S28, kinship-not-equivalence discipline) | G-1 |
| `ecosystem/universe/personal-growth/privacy-model.md` | faithful (strongest Shadow/consent home) | cross-link S43/S46 (per-region home sharing; ephemerality) | G-1 |
| `ecosystem/community/member-archetypes.md` | STALE (Dreamineer as persona) | align to modes-not-castes | G-1 |
| `ecosystem/kickstarter/kickstarter-vision.md` | STALE ("Dreamineer Council") | naming fix per roles core | G-1 |
| root `README.md` | STALE (sub-project framing; old role list) | refresh entity + role language | G-1 |

### 2.2 Products tree (DECOMP - executes ADR-U025)

| File | Status | Correction | Mark |
|---|---|---|---|
| `products/README.md` + `products/CLAUDE.md` | CONTRADICTS (device entities; Game) | rewrite per ADR-U025 (profiles, shell-ownership, placement rule) | G-2 |
| `products/hub/DESCRIPTION.md` + `SPECIFICATION.md` + `README.md` + `CLAUDE.md` | STALE ("Safe Harbour"; "FIM-facing"; old ladder; device identity) | Hub = canvas surface; roles per roles core; "Safe Harbour" -> the village (cosmology core) | G-2 |
| `products/gimbal/**` (incl. `ios/`, `android/`) | CONTRADICTS (device + sub-entities) | Gimbal = senses surface; DELETE `ios/` + `android/` sub-entity folders | G-2 |
| `products/game/**` | CONTRADICTS (product entity) | DELETE folder (ratified); lock lives in ADR-U025 + PRODUCTS_AND_PLATFORM | G-2 |

### 2.3 Studios tree (DECOMP - executes ADR-U026)

| File | Status | Correction | Mark |
|---|---|---|---|
| `studios/README.md` + `studios/CLAUDE.md` | CONTRADICTS (three siblings) | parent model; tier rules updated | G-2 |
| `studios/universe-studio/README.md` (+ CLAUDE, features) | CONTRADICTS (excludes Arc) | rewrite as the parent/binding-frame entity | G-2 |
| `studios/arc-studio/**`, `studios/journey-studio/**` | STALE (sibling framing) | git mv under `universe-studio/`; READMEs note parentage + mode framing | G-2 |
| `studios/world-studio/` | MISSING | CREATE entity (README + CLAUDE.md + features/) under `universe-studio/`: hard/soft faces, scope tiers, capture-foot/deep-edit equipment | G-2 |

### 2.4 Templates + agent context (DECOMP)

| File | Status | Correction | Mark |
|---|---|---|---|
| `templates/feature-spec.md` | MISSING the keying field | add `requires-equipment:` beside `maturity:` (values: sensors / comfortable-canvas / precision-input / none; chosen restriction named by equipment) | G-2 |
| `templates/product-*.md`, `studio-*.md`, `design-system-specification.md` | STALE (device/sibling enumerations) | enumerations per ADR-U025/U026 | G-2 |
| `AGENTS.md` | STALE (prefix line: G/GM/US/AS; entity enumeration) | prefixes: H/G = shell features only; GM retired; WS added; US = umbrella level | G-2 |
| root `CLAUDE.md`, `docs/README.md` | STALE (entity enumeration, cascade entity level) | enumerations + cascade rows per the ADRs | G-2 |
| `design-system/README.md` + `CLAUDE.md` | STALE (per-device framing) | per-profile (equipment) framing | G-2 |

### 2.5 Architecture tree (ARCH)

| File | Status | Correction | Mark |
|---|---|---|---|
| `architecture/ARCHITECTURE_ANATOMY_V1.md` | STALE (historical v1; old roles, visitor) | header note: historical reference, superseded by U023/U025/U026 - no rewrite | G-3 |
| `architecture/DOMAIN_ENTITIES.md` | STALE (generic User/Group; no FIM/Shadow) | align entity names to roles core (FIM, Shadow, Participant) | G-3 |
| `ADR-U004` (visitor anon sign-in) | mechanism OK; naming + lifecycle stale | NEW **ADR-U027 - Shadow identity lifecycle** (anon auth + ephemeral erase TTL + atomic consent migration + ball-grant; extends U004/U010/U016; renames Visitor -> Shadow) | G-3 |
| `ADR-U019` (DeusEx last resort) | OK but narrower than the ratified role | NEW **ADR-U028 - Governance by scope** (the Console; the Universeers plane; DeusEx as root-admin group whose set includes last-resort; community care in-place) | G-3 |
| `architecture/ECOSYSTEM_ANATOMY_V4.svg` | CONTRADICTS (devices, Game, 3 siblings, Three Worlds label, single-DeusEx) | regenerate as V5 per U025/U026 + cores | G-4 |
| `architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` | CONTRADICTS (studio sibling arrows) | re-label: World Studio writes -> World Model; nest studios under Universe Studio | G-4 |
| `how-we-work/assets/01-decomposition-cascade.svg` | self-flagged gap (Whisp L2 owner) | update entity level + resolve the Whisp-placement note when cascade docs correct | G-4 |

### 2.6 Platform specs + verticals (ARCH)

| File | Status | Correction | Mark |
|---|---|---|---|
| `platform/core/identity-specification.md` (PC-2) | SILENT on Shadow lifecycle | add Shadow anon-auth + ephemerality (TTL config) + atomic transcendence migration + ball linkage (with ADR-U027) | G-3 |
| `platform/core/organisation-specification.md` + `organisation/CLAUDE.md` (PC-3) | STALE (Member role name; no Dreamineer authorities) | Participant rename; Dreamineer specialisations as permission-gated role templates | G-3 |
| `platform/core/governance-specification.md` + `governance/CLAUDE.md` (PC-4) | STALE + resists ("do not introduce new admin roles") | governance by scope; the Console; Universeers; DeusEx per ratified formulation (with ADR-U028); relax the admin-roles rule accordingly | G-3 |
| `verticals/administration/SPECIFICATION.md` | STALE (one operator plane) | scope split: in-place community care vs Console surfaces (audit log, feature flags per Ferd routing) | G-3 |
| `verticals/transactions/SPECIFICATION.md` | STALE (one plane) | Member buying in-experience; economy management on the Console | G-3 |
| `verticals/privacy/SPECIFICATION.md` | partial (AI consent yes; Shadow no) | Shadow ephemerality + erase-on-inactivity/close; home per-region sharing | G-3 |
| `platform/domain/world-model/` (DS-1 README label) | STALE ("Three Worlds" label) | re-label per cosmology core | G-3 |

### 2.7 Planning tree (temporal - annotate, do not rewrite)

`waves/studies/` concept files carrying superseded models - `heim/fringeisland-world.md`,
`brim/void.md`, `eid/whisp.md` (partial), `heim/my-garden.md`, `fringeisland-studio-v1..v3`,
`journey-studio-v*`, `arc-studio-v1`, `android-app`/`ios-app`: add a superseded-by banner
pointing at the cosmology/roles cores and ADR-U025/U026. Planning files are temporal records;
they are annotated, not rewritten. | G-4

### 2.8 Clean - no action

`MANIFESTO.md` (unless S24 lands there), `BUSINESS_MODEL.md`, `ecosystem/README.md`,
`personal-growth/engagement-spectrum.md`, `platform/README.md` + `platform/CLAUDE.md`, PC-1
infrastructure, notifications + observability verticals, ADR mechanisms
U003/U005/U006/U007/U008/U009/U016/U017/U018/U020/U021/U022/U024, `CHANGELOG.md`,
`docs/research/**` (reference tier), the discovery file itself (append-only source of truth).
CODE: set aside as a correction target (ratified 2026-06-07); silent on the fiction, contradicts
nothing.

---

## 3. Descent-impact view (feeds the L1->L3 validation)

| Capability area | Verdict | Items |
|---|---|---|
| PC-1 Infrastructure | CONFIRMS | - |
| PC-2 Identity | ADDS-TO | Shadow anon-auth lifecycle; ephemeral erase (TTL config); atomic consent migration; ball-grant at transcendence; per-region home sharing (with PC-3/DS-1/Privacy) |
| PC-3 Organisation | REVISES | Participant rename; Dreamineer authorities as role templates; support family extensible; branch/bond semantics ride the group pattern |
| PC-4 Governance | ADDS-TO / REVISES | governance by scope; the Console surface; Universeers plane; DeusEx role broadened (ops + last resort); "no new admin roles" rule relaxed |
| DS-1 World Model | CONSTRAINED (next to derive) | the cosmology core is its ground truth: places/topology, balls + branches + crown, seeds/anchors, tendable-world state (grown/receded), per-region home permissions, World Studio scope tiers, equal-ball rule |
| DS-2 Narrative | CONSTRAINED | seasons/episodes; respawn topologies (plural, nested, in-story); loop textures; NPC character layer promotion (World -> Arc seam) |
| DS-3 Experience | CONSTRAINED | journeys declare required equipment at authoring; growth gradient = Void distance; signature-vs-charter personalisation; respawn delivery |
| DS-4 Content | CONSTRAINED | Gimbal-capture -> Hub-refine pipeline; equipment-keyed delivery |
| DS-5 Communication | CONSTRAINED | branch-gated cord-health visibility (glanceable/invited/self-first); village social surfaces FIM-only |
| DS-6 Discovery | CONSTRAINED | navigation by own branches; no counts/rankings (anti-leaderboard guardrails) |
| DS-7 Intelligence | CONSTRAINED | Whisp dialogue; assessments dissolved (validity question open); starved-drive sensing (S28); guard railing |
| Verticals | per 2.6 | Admin + Transactions scope-split; Privacy Shadow/home items; Notifications/Observability unaffected |
| Products layer | REVISED (done) | ADR-U025; template field + prefixes in G-2 |

**Sequencing recommendation:** keep DS-1 PAUSED until batches G-2 and G-3 are ratified-and-applied
(the cosmology core already exists, but DS-1 derives against the corrected specs and trees), then
UNPAUSE - it derives from the cosmology core + this register's DS-1 row.

---

## 4. Proposed correction batches (ratify per batch; graduate on ratification)

1. **G-1 - Ecosystem identity surface** (Section 2.1): the description humans read first.
2. **G-2 - Structure** (2.2-2.4): products tree (game deletion, sub-entity dissolve), studios
   restructure + World Studio creation, templates (the `requires-equipment:` field), AGENTS.md,
   root CLAUDE.md, docs/README, design-system.
3. **G-3 - Architecture + platform specs** (2.5-2.6): ADR-U027 + ADR-U028; PC-2/PC-3/PC-4;
   the three vertical specs; DOMAIN_ENTITIES; anatomy-v1 header; DS-1 label.
4. **G-4 - Diagrams + planning annotations** (2.5 SVGs + 2.7): ECOSYSTEM_ANATOMY_V5,
   DOMAIN_SERVICE_DEPENDENCIES, cascade SVG, superseded-by banners.

Then: unpause DS-1.

## 5. Ratification outcomes (all four confirmed by Stefan, 2026-06-10)

1. **S24 home:** a new `docs/ecosystem/PRINCIPLES-AI.md` (dedicated constitutional principles
   doc: extension-not-worker, dreaming sessions, the three-stage model, bidirectional
   human-authored guard railing), referenced from MANIFESTO and VISION. Lands in G-1.
2. **ADR-U027 and ADR-U028** scopes confirmed as named in `decisions/PENDING.md`. Land in G-3.
3. **Planning-tree treatment:** annotate-supersede banners (no rewrites of temporal records).
4. **Batch order** G-1 -> G-2 -> G-3 -> G-4 confirmed; DS-1 unpauses after G-2 + G-3.

---

## 6. Execution record and handoff (appended at session close, 2026-06-10)

All four batches were executed and committed the same day:

| What | Commit | Size |
|---|---|---|
| Steps 1-2: ADR-U025/U026 + the cosmology and roles cores | a6101ad | 6 files |
| Register ratified (Sections 1-5) | 814cefc | 2 files |
| G-1 ecosystem identity surface | 1708057 | 18 files |
| G-2 structure (trees, templates, agent context) | 50a5dae | 44 files |
| G-3 architecture + platform specs (incl. ADR-U027/U028) | 0bda3ef | 15 files |
| G-4 diagrams (ECOSYSTEM_ANATOMY_V5) + planning banners | 12dfea0 | 35 files |

Each batch was verified by term-sweep before commit (retired names, superseded cosmology, GM/Game,
ios-android sub-entities, visitor-as-identity); stragglers found by the sweeps were fixed in-batch.

**Handoff / open items:**

1. **Root `CLAUDE.md` is uncommitted by design.** It carries ratified G-2 edits (doc-map rows,
   cascade sub-entity canonical case, API-first wording, Participants) mixed with pre-existing
   unrelated working-tree changes from before this session - Stefan splits or commits it whole.
2. **DS-1 (World Model) descent: UNPAUSE condition met.** G-2 and G-3 are applied; DS-1 derives
   from the cosmology core plus this register's Section 3 DS-1 row.
3. **CODE stays set aside** (ratified 2026-06-07). Code-side items when that target opens:
   Visitor -> Shadow rename, the `Member` role-template seed -> Participant, the flat
   `platform_admin` -> scope-split, the ADR-U027 lifecycle build (TTL sweep, atomic migration).
4. **Flagged residue (process tier, outside this register's scope):**
   `docs/ecosystem/how-we-work/index.html` (rendered copy) and
   `assets/01-decomposition-cascade.svg` still quote the old VISION Whisp wording; the cascade
   SVG's Whisp-placement (L2 owner) gap is genuinely still open. The four skills under
   `.claude/skills/` may want equipment-model content beyond the V5-reference fix - that is
   way-of-working maintenance, not reconciliation.
5. **A `doc-health-check` run is recommended** - this session fired every one of that skill's
   on-demand triggers (renames, deletions, schema-adjacent spec changes, folder restructure,
   CLAUDE.md restructuring).
