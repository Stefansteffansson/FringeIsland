# Universe → spec manifestation map

*Authored 2026-06-13. A snapshot analysis: for each doc under `docs/ecosystem/universe/` and `docs/ecosystem/thinking/`, what it is and how strongly its concepts are realized as named capabilities/obligations in the entity SPECIFICATIONs produced during the architecture descent (Platform Core, the seven Domain Services, the Extension System, the five verticals, and the Hub). This is a **design record / analysis snapshot**, not an obligation source — it cites the specs; it does not supersede them. Re-run when the descent advances (Gimbal, the studios, or a Hub re-derivation) since manifestation will change.*

**Spec set traced:** `docs/platform/core/{governance,identity,infrastructure,organisation}-specification.md` · `docs/platform/domain/{world-model,narrative,journeys,content,communication,discovery,intelligence}.md` · `docs/platform/extensions/SPECIFICATION.md` · `docs/verticals/{administration,privacy,notifications,observability,transactions}/SPECIFICATION.md` · `docs/products/hub/{SPECIFICATION,DESCRIPTION}.md`.

**Manifestation scale:**
- **STRONG** — the concept drives named capabilities / obligations / entities in one or more specs.
- **PARTIAL** — referenced or implied, but not built out into capabilities (or named without owning any).
- **ABSENT** — no trace in the specs (a universe idea not yet decomposed).

---

## Headline

The world's **structural / mechanical layer is strongly manifested**; the **atmospheric / experiential layer and the entire community-and-business layer are largely un-manifested** — and that split is intentional and self-documented. The descent decomposed exactly the parts the universe docs had crystallized, and correctly left the parts those same docs mark "not yet designed." So the gaps are *known*, not missed.

---

## `docs/ecosystem/universe/` — the canonical world

### Cosmology — `cosmology/README.md` (canonical core, ratified Session B)
The spine of the worlds topology: Ordinary World → Shimmer → Fringe (place 2 / place 3, near side / Beyond), the Void as an *axis* of separation, the cord (FIM–Whisp lifeline), balls/Tree/branches/village, seeds, severance/respawn, and the "gardening-not-guarding" genesis rule.
- Cord, ball, branch/crown, seed, anchor-chain, severance/respawn, portal registry, two-zone gateway, places topology, near-side coordinates — **STRONG** (each is a named DS-1 `world-model.md` capability; cord/branch separation is a service invariant).
- Void-as-axis + comfort→growth→panic gradient — **PARTIAL** (exists as a "Void distance" read DS-1 exposes and `journeys.md` consumes; not its own capability).
- Gardening-not-guarding / tendable world-state — **PARTIAL** (a DS-1 invariant + "Tendable world-state" capability; recession mechanics still an open DS-1 question).
- Shimmer (perceived edge) — **PARTIAL** (thinly built). Tonal/atmospheric spectrum — **ABSENT**.

### Roles — `roles/README.md` (canonical core, ratified Session B)
The role taxonomy: identity state (Shadow → FIM via transcendence) plus three layers — FIM modes incl. Dreamineer specialisations; support roles Steward/Guide/Participant/Observer; enterprise plane Universeers/Council/DeusEx/Console.
- Shadow / FIM / transcendence — **STRONG** (pervades identity, journeys, intelligence, privacy; ADR-U027 lifecycle).
- Steward / Guide / Participant / Observer — **STRONG** (PC-3 per-group role templates; governance & organisation).
- DeusEx / Console / governance-by-scope — **STRONG** (DeusEx realizes `is_platform_admin()` in PC-4 governance; Console is the universe-scoped surface; ADR-U028).
- Dreamineer sub-roles (Creator/Anthropologist/Teller/Wayfinder) → Studios — **STRONG** (each gates a World/Arc/Journey Studio write-path across DS-1/2/3).
- Universeers / Council — **PARTIAL** (named, but own no capabilities; internal mechanics open — CQ-004).

### Beings — `beings/README.md`
The Whisp (your inner dialogue; empty → filled by growth; assessment dissolved into dialogue; five senses ↔ Big Five; internalisation endgame) and NPCs (layered body/culture/character composites).
- Whisp dialogue, being-state, internalisation/graduation, avatar — **STRONG** (DS-7 `intelligence.md` capabilities; avatar/cord in DS-1).
- NPCs as layered composites — **STRONG** (DS-1 world-layer + DS-2 character-layer registries; the body/culture/character seam is built).
- Dissolved instruments / senses model — **PARTIAL** (DS-7 has a sense-kinds registry, but the Big-Five ↔ senses mapping and "self-disclosure" vocabulary are not named).

### Narrative — `narrative/README.md`
How story works: seasons/episodes, A-plot/B-stories, journey route types (Fixed/Hybrid/Traveler-Initiated/AI-Generative), content families (Witness/Reflect/Decide/Act/Encounter/Rest), respawn-as-medium, the first experience.
- Seasons/episodes/arcs, respawn topologies, loop textures — **STRONG** (DS-2 registries; DS-3 runtime).
- Journey route types — **STRONG** (DS-3 "Journey registry & route types").
- Content families — **PARTIAL** (scattered references; no single owning capability; likely folded into DS-3 step-kinds).
- First experience / first hour — **ABSENT** (undecomposed; the universe doc itself flags it as the single highest-risk gap; DS-3 open question; CQ-010).

### Personal growth — `personal-growth/` (README, three-questions, privacy-model, engagement-spectrum)
- Three questions × three perspectives (the 9-cell matrix) — **STRONG** as structure (every Hub capability row is tagged with the founding question + dimension it serves; `journeys.md` invariant: journeys are the vehicle of the three questions). **PARTIAL** as enforcement (a tagging convention, not a checked coverage obligation).
- Private-by-default + granular sharing — **STRONG** (V2 Privacy "private-by-default inversion" failure mode; journeys tags Progress private-by-default; Hub IDN-7 granular consent; "Stewards can't see private dev data" honored as a journeys invariant). The three named visibility *tiers* as a single model — **PARTIAL**.
- Engagement spectrum (Homebody/Explorer/Beyond) — **STRONG** as a rule ("a Homebody is not behind an Explorer" cited verbatim as a journeys invariant); **PARTIAL** as a driver (discovery is affinity-shaped/anti-leaderboard but not segmented by spectrum position). Cold-start — **ABSENT** (lives only as CQ-001).
- "Scaffolding stays invisible / entertainment-first" — **STRONG** (journeys invariant: no didactic/assessment/"lesson" surface).

### Community — `community/README.md` + `member-archetypes.md`
Community dynamics + three provisional archetypes (Homebody/Elena, Explorer/David, Dreamineer/Astrid), explicitly "not marketing segments."
- Member archetypes — **ABSENT** (zero spec hits; only the orthogonal *role* taxonomy is built).
- Cold-start / founding-cohort dynamics — **ABSENT** (open questions only).

### Kickstarter — `kickstarter/README.md` + `kickstarter-vision.md`
Public launch as "Season Zero": backers arrive on the island, rewards are arrival rituals, the founding Dreamineer cohort is the prize. Campaign tiers/funding explicitly "not yet designed."
- Kickstarter / funding / pledges / campaign tiers — **ABSENT** (V5 Transactions confirms zero transaction substrate: no Stripe, no checkout, no pledge/crowdfunding concept anywhere; V5 scopes only member enrolment/premium/creator-monetisation for Hamn+).
- Founding Dreamineer cohort / arrival ritual — **PARTIAL** (only insofar as the Dreamineer *role* exists; the cohort/ritual concepts are absent).

---

## `docs/ecosystem/thinking/` — working ideas

### `OPEN_QUESTIONS.md`
15 cross-cutting questions (CQ-001…CQ-015); none formally marked resolved. The pattern: **structural** questions are answered in substance (Shadow/visitor access via ADR-U027; governance roles named), while the **human/business** questions stay open — cold-start (CQ-001), Dreamineer recruitment (CQ-002), content bootstrap (CQ-003), monetization timing (CQ-005), the first-hour experience (CQ-010), AI feasibility (CQ-011, contracts specced but capability unvalidated). CQ-015 (Hub rebuild-vs-evolve) is the **only** CQ cited in a spec (`extensions/SPECIFICATION.md`, per-slice strangler as the default candidate).

### `universe-discovery/` (session-01, onboarding-summary, portal-ideas, README)
- The foundational discovery **Session 01** has graduated into canon almost completely in substance: the Shimmer/Fringe/Void topology, Tree/cord/seed/portal/anchor mechanics, Shadow-transcendence, Dreamineer roles, respawn, and the signature-journey / Immunity-to-Change framing all manifest **STRONG** in DS-1/DS-3/PC-2. (The graduation tracker in the discovery README — which read "none yet" — was corrected on 2026-06-13 to record the cosmology- and roles-core promotions.)
- The **portal-ideas** sounding-board landed as a *frame, not features*: the "portals are a data-driven registry" abstraction is in `world-model.md` (**STRONG**), but none of the ten named candidates (Cairn, Shimmer-cut, …) were adopted (**ABSENT**) — consistent with the note's `decision_status: open`.

---

## Prioritized gaps (rich universe design with little/no spec footprint)

1. **First-hour / first experience** — the universe's own "highest-risk gap"; near-zero spec footprint (DS-3 open Q / CQ-010).
2. **Community formation / cold-start** — no spec foothold; open questions only.
3. **Funding / Kickstarter** — entirely un-specced; no transaction substrate exists yet.
4. **Atmospheric layer** — the Shimmer is thin; the tonal/mood spectrum is absent.
5. **Named-but-hollow concepts** — Universeers/Council and the Big-Five↔senses mapping are referenced without owning capabilities yet.

These are consistent with the source docs' own maturity markers — the gaps reflect deliberate sequencing, not oversight.
