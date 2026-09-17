# Universe → spec manifestation map

*First run 2026-06-13; **re-run 2026-09-17** on Stefan's request against the current spec set, after the Hub v2 rebuild (Phase 4 done 2026-08-12) and the Ferd close (2026-09-07) — the record's own re-run trigger. A snapshot analysis: for each part of the universe design in this folder, what it is and how strongly its concepts are realised as named capabilities / obligations in the entity SPECIFICATIONs of the architecture descent — and, new in this run, whether a shipped feature has built them. This is a **design record / analysis snapshot**, not an obligation source — it cites the specs; it does not supersede them. The 2026-06-13 run is in git history; its "Shadow" is this run's Mist (ADR-U031). Re-run when the descent advances again (the Gimbal, the studios, DS-1/DS-2/DS-7 feature work).*

**Spec set traced:** `docs/platform/core/{governance,identity,infrastructure,organisation}-specification.md` · `docs/platform/domain/{world-model,narrative,journeys,content,communication,discovery,intelligence}.md` · `docs/platform/extensions/SPECIFICATION.md` · `docs/verticals/{administration,privacy,notifications,observability,transactions}/SPECIFICATION.md` · `docs/products/hub/{SPECIFICATION,DESCRIPTION}.md` — the same nineteen files as in June. **Build evidence:** the 100 feature specs at `maturity: 6-done` on 2026-09-17 (Platform Core, Platform Domain, the Hub).

**Manifestation scale:**
- **STRONG** — the concept drives named capabilities / obligations / entities in one or more specs.
- **PARTIAL** — referenced or implied, but not built out into capabilities (or named without owning any).
- **ABSENT** — no trace in the specs (a universe idea not yet decomposed).
- **· built** — a `6-done` feature realises the capability (named in the row). Without the marker, the concept is specified but nothing has shipped for it.

---

## Headline

Same shape as June, one layer deeper: the world's **structural / mechanical layer is strongly manifested in the specs, and its identity-and-groups half is now built** — the Mist and the transcendence, the four support roles, governance by scope, consent, the journal, the journey substrate with its steps, progress, completion and response capture, notifications, the admin console. The **world itself is not** — cord, ball, Tree, places, portals, seasons, the Whisp's dialogue and senses are specified in DS-1, DS-2 and DS-7 and no feature has shipped for any of them, because those services are Eid work. The **atmospheric layer and the community-and-business layer are still un-manifested**, as the canon itself still marks them "not yet designed". The one gap that moved: the **first experience** went from ABSENT to PARTIAL — its *mechanics* (the onboarding journey, the Mist-scoped enrolment gate, first-arrival contracts) are built; its *narrative* is still unwritten and CQ-010 is still open.

---

## `canon--*` — the canonical world

### Cosmology — `canon--cosmology--worlds-topology.md` (canonical core, ratified Session B)
The spine of the worlds topology: Ordinary World → Shimmer → Fringe (place 2 / place 3, near side / Beyond), the Void as an *axis* of separation, the cord (FIM–Whisp lifeline), balls / Tree / branches / village, seeds, severance / respawn, and the "gardening-not-guarding" genesis rule.
- Place topology, Region, Ball (one per FIM, granted at transcendence, two-zone gateway), Branch (the social graph *is* the Tree), Cord world-presence (length, Void distance, health), anchor chain, severance tiers, respawn position, portal registry — **STRONG** (each is a named DS-1 `world-model.md` entity or capability; the DS-1 / DS-7 split gives DS-1 the Whisp's world-presence). **Not built:** no DS-1 feature has shipped; the only built touchpoint is the transcendence itself (FEAT-PC002, FEAT-H004: the moment the ball is granted, without the ball).
- Void-as-axis + comfort → growth → panic gradient — **PARTIAL** (a "Void distance" read DS-1 exposes and DS-3 `journeys.md` consumes as "the growth gradient journeys deliver"; not its own capability, not built).
- Gardening-not-guarding / tendable world-state — **STRONG** as a DS-1 invariant (Region is "the grain at which tending, recession, and home-sharing" happen); not built.
- Shimmer — **PARTIAL** (now a named node of the Place topology, "the membrane — a line, not a band"; owns no capability). Tonal / atmospheric spectrum — **ABSENT** (unchanged).

### Roles — `canon--roles--taxonomy.md` (canonical core, ratified Session B)
The role taxonomy: identity state (Mist → FIM via transcendence, ADR-U031) plus three layers — FIM modes incl. Dreamineer specialisations; support roles Steward / Guide / Participant / Observer; enterprise plane Universeers / Council / DeusEx / Console.
- Mist / FIM / transcendence — **STRONG · built** (pervades identity, journeys, intelligence, privacy; ADR-U031 lifecycle; FEAT-PC001 arrival substrate, FEAT-PC002 ephemerality reaper + atomic transcendence + consent substrate, FEAT-H003 "look around, then become", FEAT-H004 the transcendence and the farewell; 68 of the 100 shipped specs name the Mist).
- Steward / Guide / Participant / Observer — **STRONG · built** (PC-3 per-group role templates; the groups family FEAT-PC010–PC028 and FEAT-H013–H016; role-template administration FEAT-PC027 / PC028).
- DeusEx / Console / governance-by-scope — **STRONG · built** (`is_platform_admin()` in PC-4; ADR-U028; ADR-U050 account states; the admin console family FEAT-PC020–PC026 and FEAT-H039 and siblings).
- Dreamineer sub-roles (Creator / Anthropologist / Teller / Wayfinder) → Studios — **STRONG** (each gates a World / Arc / Journey Studio write-path across DS-1 / DS-2 / DS-3; 63 mentions across the domain specs). **Not built** — the studios are Eid.
- Universeers / Council — **PARTIAL** (named as enterprise-plane seats in the governance spec; own no capabilities; "admin-role granularity" is still an open PC-4 question; CQ-004 open). Unchanged.

### Beings — `canon--beings--whisp-and-npcs.md` (canonical core)
The Whisp (inner dialogue; empty → filled by growth; assessment dissolved into dialogue; five senses ↔ Big Five; internalisation endgame; ownership split by face, ADR-U029) and NPCs (layered body / culture / character composites). Two planned pages listed inside the core, both unwritten.
- Whisp being-state, dialogue state, internalisation / graduation ("built to graduate, not retain" is a DS-7 invariant with its own recession endgame), avatar — **STRONG** (DS-7 `intelligence.md` capabilities; the world-presence half in DS-1). **Built only at the edges:** the consent that governs Whisp engagement (FEAT-PC007 / FEAT-H009), the realtime hint layer it will ride (FEAT-PD010), the private journal beside it (FEAT-PD001 / FEAT-H011). The Hub's A-COI rows (COI-1…6) were recast onto the Whisp at the 2026-06-22 reconciliation and build only once DS-7 exists (CQ-012).
- Dissolved instruments / senses model — **STRONG** in spec, up from PARTIAL: DS-7 now names **Sense** as an entity ("the Big-5-mapped metaphorical perception channels, S17-18; sense kinds are a registry") and the drive-balance reading over Live / Grow / Matter (S28). Not built.
- NPCs as layered composites — **STRONG** (DS-1 world-layer + DS-2 character-layer registries; the body / culture / character seam is the World → Arc seam). Not built.

### Narrative — `canon--narrative--how-story-works.md`
How story works: seasons / episodes on the universal calendar, respawn-as-medium (ratified), and three planned pages listed inside the core — seasons and episodes, journeys' route types and content families, the first experience.
- Seasons / episodes / arcs on the universal calendar, respawn topologies, loop textures — **STRONG** (DS-2 registries — "Season: four per year on the universal calendar, kinds data-driven, never a sealed enum"; DS-3 delivers the looping DS-2 declares). **Not built** — no DS-2 feature has shipped.
- Journey route types — **STRONG** (DS-3 Journey entity: "route type — Fixed, Hybrid, Traveler-Initiated, AI-Generative, data-driven registry"). The journey substrate around it is **built** (FEAT-PD002 catalogue & enrolment, FEAT-PD003 step substrate & progress, FEAT-PD004 completion & review, FEAT-PD007 step-response capture per ADR-U046; FEAT-H019–H022 the Hub surfaces), but no shipped feature exercises a route type other than the fixed walk.
- Content families — **PARTIAL** (as June predicted, folded toward DS-3 step *kinds* — the discriminator ADR-U008 keeps open; no capability names a family).
- First experience / first hour — **PARTIAL**, up from ABSENT. The *mechanics* are built: ADR-U045 the onboarding journey, FEAT-PD006 onboarding designation + the Mist-scoped enrolment gate + first-arrival contracts. The *narrative* is not: the canon's planned first-experience page is unwritten, CQ-010 open, DS-3 §8 Q2 (Mist journey grain) deferred to it.

### Personal growth — `canon--growth--how-growth-works.md` + `canon--growth--privacy-model.md`
- Three questions × three perspectives (the 9-cell matrix) — **STRONG** as structure (95 Hub capability rows are tagged with the founding question they serve; DS-3 invariant: journeys are the vehicle of the three questions; PC-2 grounds the journal in them). **PARTIAL** as enforcement (a tagging convention, not a checked coverage obligation). Unchanged.
- Live / Grow / Matter — **STRONG** in spec, new since June: DS-7's **drive-balance reading** ("which drive is currently starved, leaning the journey toward restoring balance — a dance partner"). Not built.
- Private-by-default + granular sharing — **STRONG · built** (V2 Privacy "private-by-default inversion" failure mode; DS-3 Progress private by default, never comparative; consent decisions FEAT-PC007 / FEAT-H009; own-data export FEAT-PC008; pause / delete FEAT-PC017 / FEAT-H029). The three named visibility *tiers* as a single model — **PARTIAL**, unchanged.
- Engagement spectrum (Homebody / Explorer / Beyond) — **STRONG** as a rule ("a Homebody is not behind an Explorer" — DS-3 invariant 8: no comparative progress, no leaderboards). The Homebody pole now has a **built** home: the private journal (FEAT-PD001 / FEAT-H011 cite it as "a complete Homebody engagement mode"). **PARTIAL** as a driver (DS-6 Discovery is affinity-shaped and anti-leaderboard but not segmented by spectrum position; DS-6 not built).
- "Scaffolding stays invisible / entertainment-first" — **STRONG** (DS-3 invariant: no didactic / assessment / "lesson" surface). Unchanged.
- The member archetypes (Homebody / Elena, Explorer / David, Dreamineer / Astrid, Thinking grade) — **ABSENT** (zero spec hits; only the orthogonal *role* taxonomy is built). Unchanged.

### Community — `canon--community--kickstarter-season-zero.md`
Public launch as "Season Zero": backers arrive on the island, rewards are arrival rituals, the founding Dreamineer cohort is the prize. Campaign tiers / funding explicitly "not yet designed."
- Kickstarter / funding / pledges / campaign tiers — **ABSENT** (V5 Transactions still scopes only member enrolment / premium / creator-monetisation for Hamn+; no pledge or crowdfunding concept anywhere). Unchanged.
- Founding Dreamineer cohort / arrival ritual — **PARTIAL** (only insofar as the Dreamineer *role* exists). Unchanged.
- Cold-start / community formation — **ABSENT** as a design (CQ-001, CQ-002, CQ-003 open; one mention in the Hub DESCRIPTION). New since June, the *mechanics* of bringing people in exist: invitations and joining are **built** (FEAT-PC012 / FEAT-H015) and ADR-U040 rules that off-platform invitation is referral-to-the-platform, with the MEM-2 rebuild not yet scoped.

---

## `discovery--*` / `questions--*` — working ideas

### `questions--ecosystem-open-questions.md`
17 cross-cutting questions (CQ-001…CQ-017); the register now carries a Resolved section. The pattern holds: **structural** questions are answered in substance while the **human / business** questions stay open — cold-start (CQ-001), Dreamineer recruitment (CQ-002), content bootstrap (CQ-003), monetisation timing (CQ-005), the first hour (CQ-010), AI feasibility (CQ-011). **Four** CQs are now cited from a spec, up from one: CQ-010 (DS-3 journeys, "canon work — content, not mechanics"), CQ-012 and CQ-009 (the Hub SPECIFICATION's A-COI notes), CQ-015 (the Extension System's strangler default).

### `discovery--the-universe-in-the-making.md` (the one discovery file — status, candidates, the session record)
- **Session 01** has graduated into canon almost completely in substance, and the graduation tracker (Part 1) records the three cores, the ratified respawn section and ADR-U025 / U026 / U027 (superseded) / U028 / U031. The identity half of what it stated is built; the world half is specified.
- The **portal-ideas** candidates (Part 2, Candidate A) landed as a *frame, not features* — "portals are a data-driven registry" is a DS-1 capability (**STRONG**); none of the ten named candidates (Cairn, Shimmer-cut, threshold-by-condition, mirror-overlay…) is adopted (**ABSENT**), consistent with the note's open decision status.
- The **Gimbal's origin and the three altered states** (Candidate B, 2026-07-24, not locked) — **ABSENT** in every spec, as a candidate should be; the Gimbal itself has no DESCRIPTION yet (doc-health §7 registry, wave Eid+). The Hub SPECIFICATION names the Gimbal only as its sibling surface (ADR-U025).

---

## What changed since 2026-06-13

| Concept | June | Now | Why |
|---|---|---|---|
| Mist / FIM / transcendence | STRONG | **STRONG · built** | FEAT-PC001 / PC002 / H003 / H004; ADR-U031 |
| Support roles, governance by scope, consent, journal, notifications, admin | STRONG | **STRONG · built** | The Ferd build: 100 features closed 2026-09-07 |
| First experience / first hour | ABSENT | **PARTIAL** | Mechanics built (ADR-U045, FEAT-PD006); narrative still unwritten (CQ-010) |
| Senses model / dissolved instruments | PARTIAL | **STRONG** (spec) | DS-7 names Sense as a Big-5-mapped registry entity |
| Live / Grow / Matter | not assessed | **STRONG** (spec) | DS-7 drive-balance reading (S28) |
| Journey substrate (steps, progress, completion, responses) | STRONG | **STRONG · built** | FEAT-PD002–PD007, FEAT-H019–H022; ADR-U044 / U046 |
| Engagement spectrum, Homebody pole | STRONG as rule | **STRONG as rule · Homebody built** | The private journal, FEAT-PD001 / FEAT-H011 |
| Cold-start | ABSENT | **ABSENT as design; entry mechanics built** | FEAT-PC012 / FEAT-H015; ADR-U040 referral |
| CQs cited from a spec | 1 (CQ-015) | **4** | CQ-009, CQ-010, CQ-012 joined |
| Cord, ball, Tree, places, portals, seasons, NPCs, the Whisp's dialogue | STRONG | STRONG, **still not built** | DS-1, DS-2, DS-7 are Eid work |
| Tonal spectrum, archetypes, Kickstarter, Universeers / Council | ABSENT / PARTIAL | unchanged | The canon still marks them not yet designed |

---

## Prioritized gaps (rich universe design with little or no spec / build footprint)

1. **The first hour's narrative** — the mechanics now exist (onboarding journey, Mist enrolment gate), so the gap is purely canon: CQ-010, the planned page inside the narrative core, blocked on the universe-mechanics fundamentals per the discovery backlog. Still the universe's own "highest-risk gap".
2. **The world itself, specified but unbuilt** — DS-1 (cord, ball, Tree, places, portals), DS-2 (seasons, episodes, loop declarations) and DS-7 (the Whisp's dialogue, senses, drive balance) all have capability rows and no shipped feature. This is the Eid kickoff's question of which theme goes first; the map says the Whisp and the world are equally specified.
3. **Community formation / cold-start** — no design foothold; only the entry mechanics (invitation, referral) exist.
4. **Funding / Kickstarter** — entirely un-specced; no transaction substrate.
5. **Atmospheric layer** — the Shimmer is a named node and nothing more; the tonal / mood spectrum is absent.
6. **Named-but-hollow concepts** — Universeers / Council (CQ-004), the member archetypes (Thinking grade, no spec trace), the content families (folded toward step kinds, never named).

These are consistent with the source docs' own maturity markers — the gaps reflect deliberate sequencing, not oversight. What the re-run adds is the build line: everything on the identity-and-groups side of the canon is now real, and everything on the world side is a specification waiting for Eid.
