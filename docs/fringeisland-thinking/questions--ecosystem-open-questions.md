# Ecosystem — Open Questions

**Last Updated:** 2026-09-26 (the universe questions now carried in the Universe Bible)

---

## Status Legend

- **Open** — Not yet investigated
- **In Progress** — Active investigation
- **Resolved** — Answer found (see resolution)
- **Parked** — Deprioritized, revisit later

---

## Open — Blocking

### CQ-001: Cold-Start — Community Bootstrapping
**Status:** Open
**Scope:** Ferd, Hamn
**Raised:** 2026-04-05
**Blocks:** Ferd beta evaluation criteria, Hamn community features
**Context:** How do we seed enough human relationships for relational (1+1) and communal (1+community) dimensions to work? With 3 founding members we can pilot both, but scaling strategy needs thought. Minimum viable community size for communal features to feel meaningful?

### CQ-002: Dreamineer Recruitment Before Hamn
**Status:** Open
**Scope:** Ferd, Hamn
**Raised:** 2026-04-05
**Blocks:** Hamn content pipeline, marketplace viability
**Context:** PRODUCTS_AND_PLATFORM.md lists "First Dreamineers recruited" under Ferd. But Ferd has no Dreamineer-facing tools. How are they recruited and what do they do before Hamn ships?

### CQ-003: Content Chicken-and-Egg
**Status:** Open
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Marketplace viability, Dreamineer ecosystem
**Context:** Hamn needs Dreamineer-created content to be alive, but Dreamineers need tools and a community to create content. What is the bootstrap strategy?

### CQ-010: The First Experience — What Happens in the First Hour?
**Status:** Open — deferred (premature until universe-mechanics fundamentals are firm; see note)
**Scope:** Ferd, Hamn
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**In the bible:** the first hour is Open box S-14 in the story chapter; the fundamentals it waits for are W-05.
**Blocks:** Ferd user onboarding flow, Hamn "Journey Zero" onboarding journey, Kickstarter campaign design
**Blocked by:** the universe-mechanics fundamentals (how the near and far ends of place 2 and place 3 actually look and function) — tracked in the [discovery backlog](discovery--the-universe-in-the-making.md#discovery-backlog-open-topics-awaiting-sessions).
**Context:** Four deep design sessions have explored what FringeIsland *is* — none have designed what a new member actually *does* when they arrive. The founding narrative, the story that members first enter, the mystery, the conflict, the world that comes to life for the first time. This is the single highest-risk gap: everything else is irrelevant if the first experience does not work.
**Sequencing note (2026-06-14, Stefan):** a dedicated discovery session for the first hour was scaffolded and then withdrawn the same day as premature. The opening is too consequential to choreograph before the universe's own mechanics are firm. It returns to active design only after those fundamentals are on paper — fundamentals first, experience after.

### CQ-011: AI Feasibility — What Does the AI Actually Need to Do?
**Status:** Open
**Scope:** Heim, Urd
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**Blocks:** Heim dynamic journey paths, Type 4 (AI-generative) journeys, NPC implementation (Urd), Weaver-AI collaboration tools
**Context:** The vision assumes load-bearing AI capabilities: adaptive season personalisation per member, NPC calibration to growth zones, AI-generative Type 4 journeys, void-responsive content delivery. None of this has been validated against what current or near-future AI can deliver at the quality required. DS-3 Journeys (formerly "Journeys") is the architectural linchpin and remains unbuilt.

---

## Open — Active

### CQ-004: Dreamineer Council Governance Mechanics
**Status:** Open
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Council tooling in Hamn spec
**Context:** How does the Council actually operate? Voting? Consensus? Rotating seats? The vision describes the principle but no spec covers the practice. What platform tools does it need?

### CQ-005: When Must Monetization Work?
**Status:** Open
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Hamn roadmap sequencing
**Context:** Kickstarter funds initial development, but subscriptions and marketplace revenue need to sustain the Foundation. At what point in Hamn must revenue flow?

---

### CQ-018: Who Holds the Mythology? Knowledge Tiers for the Backdrop
**Status:** Open — Active
**Scope:** Universe / governance (Arc Studio, Universe Studio, Dreamineer Council)
**Raised:** 2026-09-24 (universe-discovery Session 03, S75–S76)
**In the bible:** the knowledge tiers, fixed points, mythology arcs and the canon function are settled in the story chapter (5.9); who keeps the canon after the founder is Open box S-12.
**Blocks:** the story bible for Tellers and Wayfinders; any season or episode that carries the backdrop ("mythology" arcs); the breadcrumb register
**Context:** Session 03 gave the universe a backdrop (S66–S74: the Whisp as the FIM's own future self reaching back; AI forks the future; growth into higher orders of mind as the lever). S76 ruled that the in-world myth is never told but discovered, kept for a while and not forever, while the founders' conviction is public in the MANIFESTO. S75 proposed three knowledge tiers modelled on television practice: a **deep bible** (the full backdrop, held by the canon keepers), a **story bible** for authors (rules, fixed points, what may be hinted but not what it means), and **breadcrumbs** for FIMs, plus a breadcrumb register. Open: who belongs to the canon keepers after the founder (a role, the Council, a scope under ADR-U028 governance by scope); how an author moves from the story bible to the deep bible (by growing into it, as FIMs do, or by appointment); which seasons count as mythology arcs and pass through the canon keepers; and where the deep bible lives, given that the discovery log already records the backdrop in the repository.
**Wider frame:** this question is the sharp end of a larger one — how FringeIsland governs the authoring of seasons and episodes at scale (the writers'-room model: canon keeper in the showrunner role, mythology arcs versus free episodes, story bible, breadcrumb register). That larger topic is carried as a discovery-backlog row ("Narrative governance at scale") in Part 1 of `discovery--the-universe-in-the-making.md`; the TV practice it draws on is summarised under S75.
**Recommendation (Claude, recorded on Stefan's instruction 2026-09-24 — principles now, mechanics later):**
1. *Who keeps canon.* A **function inside Universe Studio**, not a new role: ADR-U026 already makes Universe Studio the binding frame where canon constraints and cross-studio consistency live, and ADR-U028 rules out ad-hoc admin roles. The founder is the first showrunner and holds it alone until Dreamineers exist; later the Council *seats* the canon group and arbitrates disputes, but does not author. DeusEx (platform administration) is not the canon keeper. **Decide now:** the principle. **Hold off:** how members are chosen, rotated and replaced — depends on CQ-004 and on Dreamineers existing.
2. *How an author gets the deep bible.* **By commission, not by rank or developmental level.** All Tellers and Wayfinders get the story bible; the canon group shares the deep bible, need-to-know, with authors commissioned to write a mythology arc; authors who are FIMs can also discover it by growing into it. Never gate authoring access on a developmental level — the platform never labels a FIM's order (S58). **Decide now:** the principle. **Hold off:** the mechanics.
3. *Which arcs are mythology arcs.* **A rule, not a list:** an arc is a mythology arc if it touches a **fixed point** or places a **breadcrumb**. Candidate fixed points: the Whisp's origin as the FIM's future self; the future at stake; what Marath's beyond really is; the source of the Whisp's wisdom. The canon group keeps the fixed-point list; everything else is free, bound only by canon. **Decide now:** the rule. **Hold off:** the actual list and the ratio — seasons and episodes are narrative design, which waits on the fundamentals (2026-06-14 rule).
4. *Where the deep bible lives.* The repository is **private** (Stefan, 2026-09-24). Do not make the repository the vault: the secret is kept from the *experience* and the *story bible*, not from someone reading design files, and S76 already makes a leak survivable (lived, not informational; kept for a while). In practice the story bible omits deep-bible content and the studios never surface the discovery or canon files. **Hold off:** any repository restructuring — carried as CQ-019.

---

### CQ-019: Repository Set-up for Sensitive Material Before Outside Contributors Arrive
**Status:** Open — Active (not urgent while the repository is private and solo)
**Scope:** All waves; must be settled before the first outside contributor is given access, and at the latest before any repository is made public (Kickstarter / Hamn)
**Raised:** 2026-09-24 (universe-discovery Session 03, from CQ-018 part 4)
**In the bible:** the deep-bible notice at its head cites this question; the bible is deep-bible tier.
**Blocks:** opening the repository to Dreamineers or other contributors; any public or open-source release of code or documentation
**Context:** Today one private repository holds everything: code, public-facing documents (VISION, MANIFESTO), the deep backdrop (the discovery log, S66–S77), security and breach-response records, and strategy. That is fine while the founder works alone. It stops being fine when others join, for three reasons. (1) **Git history is permanent:** a file that was ever committed stays in the history, so if a repository is later made public or widely shared, everything it ever contained goes with it unless the history is rewritten or a fresh repository is started. The split has to be made *before* opening, not after. (2) **Access is per repository:** GitHub grants access by repository (and by team), not per folder, so "contributors may see the code but not the deep bible" needs separate repositories. (3) **Different audiences:** community authors need the story bible and code; canon keepers need the deep bible; only a few need security, legal and financial material.
**Recommendation (Claude, not decided):** plan for **tiered repositories** when outside contributors are near: a contributor/public repository (code, public docs, the story bible); a private canon repository for the canon keepers (discovery log, deep bible, breadcrumb register); and a private operations repository for security, legal and financial material. Keep secrets (keys, credentials) out of git entirely, as now. Standard hygiene at that point: two-factor authentication required, least-privilege teams, branch protection and CODEOWNERS on canon files. Until then, no action is needed beyond keeping the repository private — and noting that everything written today will travel with whichever repository it lives in.

---

### CQ-020: Nalome — Trademark, Bolagsverket and Domain Checks Before Public Use
**Status:** Open — Active (owed before the name is used publicly; the founding campaign at the latest)
**Scope:** Business / legal; all waves
**Raised:** 2026-09-25 (universe-discovery Session 05, S111–S112)
**In the bible:** the name is settled (Nalome, na-LOME, from the unalome) and carried in the glossary; only the checks are open, and they are business items, so they live here.

The warm world was named Nalome in Session 05. A web search on 2026-09-25 found the name only as a personal name and surname, and no company or brand; the Bolagsverket, trademark (EUIPO, USPTO) and domain checks are still owed before the name appears publicly. The unalome is sacred in Thai Buddhist practice: the name borrows the idea, and the symbol itself is not used as a logo, ornament or in-world decoration unless a person from the tradition is consulted.

## Open — Parked

### CQ-006: Foundation Formal Establishment
**Status:** Parked
**Scope:** All waves
**Raised:** 2026-04-05
**Blocks:** Kickstarter (legal entity to receive funds), marketplace (payment handling)
**Context:** Listed as Wave 3 in roadmap but referenced as if it exists in governance descriptions. What's the minimum viable legal structure needed before Kickstarter?

### CQ-007: Content Licensing Model
**Status:** Parked
**Scope:** Hamn
**Raised:** 2026-04-05
**Blocks:** Dreamineer marketplace terms
**Context:** VISION.md describes CC BY-SA with CLA for community content. No product spec covers how this is surfaced to users or enforced in the marketplace.

### CQ-008: Physical Products Strategy
**Status:** Parked
**Scope:** Hamn, Wave 3
**Raised:** 2026-04-05
**Blocks:** Marketplace product types
**Context:** 3D artefacts, printed materials, merchandise described in PRODUCTS_AND_PLATFORM.md. Who produces them? Fulfillment strategy?

### CQ-009: 50+ Demographic as Mentors
**Status:** Parked
**Scope:** All waves
**Raised:** 2026-04-05
**Blocks:** Nothing immediate
**Context:** VISION.md highlights 50+ as "a particularly important role" for wisdom-sharing. How do we attract and empower them? Is the Guide role sufficient or do we need a Mentor/Elder concept?
**Note (2026-06-22, F-04):** "Mentor/Elder" here denotes a *human* wisdom-sharing role — distinct from the FIM's AI companion, which is canonically the **Whisp** (the inner dialogue voice that mentors through warm challenge; ADR-U029, the bible's beings chapter), not a separate "Mentor." The Hub's Whisp representation in Ferd/Eid without AR is tracked separately as CQ-012.

### CQ-012: Whisp Representation in Ferd/Eid — Without AR
**Status:** Parked
**Scope:** Ferd, Eid
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**In the bible:** the Whisp's appearance without augmented reality is part of Open box B-07 in the beings chapter.
**Blocks:** Ferd Whisp representation (if attempted before Eid), Eid Whisp MVP design
**Context:** The Whisp's most vivid expressions — AR overlay (Brim), void visualisation (Brim), fullness-as-fidelity — all depend on technology slated for later waves. Ferd is a web platform; Eid will introduce the first Whisp encounter phenomenology and practical UI specifications. If the Whisp is the emotional core of FringeIsland, its Wave 1/Wave 2 expressions must be compelling even in a browser. That design problem is entirely untouched.

### CQ-013: NPC Behaviour Authoring Mechanism
**Status:** Parked
**Scope:** Hamn, Urd
**Raised:** 2026-04-12 (extracted from OLD_VISION.md)
**In the bible:** how NPCs are driven is Open box B-17 in the beings chapter; the mechanism stays here.
**Blocks:** Hamn NPC system, AI-driven seasonal content
**Context:** NPCs are central to the world, but the authoring mechanism is unspecified. Prompt engineering? Behaviour graphs? Learning models? This is prerequisite for any NPC implementation.

### CQ-015: Hub Rebuild-vs-Evolve — Today's Hub Is Pre-Canon Scaffolding
**Status:** RESOLVED (2026-06-15, ADR-U030) — greenfield rebuild on a curated substrate (new app/API/frontend true to the anatomy; DB substrate reused/adapted; old MVP frozen as reference/oracle; built area by area). Plan: [`docs/planning/hub-v2/`](../planning/hub-v2/README.md). Option (c)'s per-slice framing was reshaped to greenfield-per-area once pre-launch (no users → strangler's keep-live benefit is moot).
**Scope:** Ferd, Eid
**Raised:** 2026-06-11 (post-DS-7 descent; all seven Domain Service specs now exist)
**Blocks:** Nothing immediate; shapes how every FEAT-PD feature's Hub surface gets built
**Context:** Today's Hub pervasively predates the reconciled canon and the U023 partition: measured 2026-06-11, product code holds **165 direct table call sites** via the Supabase client (`app/` 93, `components/` 60, `lib/` 12) versus 19 RPC calls and 6 API-route fetches — an ~8:1 inversion of the U009 API-first posture — plus the recorded canon debts (pre-canon journey vocabulary, inline step content vs DS-4 blocks, questionnaire assessment steps vs S17, the client-side catalog filter vs DS-6, no U025 equipment-keying, design system not extracted). The Hub is therefore best understood as a **working Ferd-era prototype that validated the substrate and serves as its test harness** — scaffolding, not the product the specs describe. Rebuilding it *now* has a sequencing problem: the Domain Service contracts it should consume are specified but not realized, so a fresh Hub would have nothing to build against. Decision deferred until the first FEAT-PD contracts exist, when three options become concrete: (a) evolve in place (untangle the 165 sites), (b) fresh thin shell over real contracts (the Hub is small — ~26 pages, 33 components; the engineering value lives in the substrate underneath, which survives either way), (c) **per-slice strangler — the default candidate**: as each Domain Service contract lands, rebuild the corresponding Hub slice against it and delete the old code. Related: the Platform API reference question (operation-grain docs accumulate per FEAT spec; consolidate at latest before Gimbal entry).

### CQ-014: Visitor Experience — What Can Visitors Do?
**Status:** Open — narrowed
**Scope:** Ferd
**Raised:** 2026-04-14 (extracted from hamn VISION_TO_SPEC_MAPPING.md)
**Blocks:** Ferd visitor implementation, onboarding funnel design
**Note (2026-06-10; updated 2026-06-21):** "Visitor" is canonically the **Mist** (the bible's roles and governance chapter, ADR-U031; the anonymous entrant renamed from "Shadow" per discovery S47-48). The question is now substantially narrowed by the reconciliation: access is intrinsic (near side open, the Beyond closed — no ball, S39/S45), data is ephemeral and unlinkable with transcendence (metamorphosis) as the consent threshold (S46/ADR-U031). What remains open is the product-level surface: which pages/content, the taster journey, the garden glimpse.
**Context:** ADR-U004 locks the technical approach (anonymous sign-in, temporary profiles, pg_cron cleanup). But the product-level visitor experience is unspecified: what pages/content are visible to non-authenticated visitors? What constitutes a "taster journey"? What is the garden glimpse? What carries forward on registration? This needs a feature spec before implementation.

### CQ-016: Hub Experiential Trajectory Across Waves — and Does the DESCRIPTION Convey the Ambition?
**Status:** Open
**Scope:** All waves (the experiential mechanisms land Eid+; the framing question is now)
**Raised:** 2026-06-23 (Hub Phase-1 spec review, finding F-07)
**Blocks:** Nothing in Ferd directly. Bears on the Hub DESCRIPTION's ambition framing and the wave-staging of the Hub's experiential scope.
**Resolved part (Stefan, 2026-06-23):** The first Hub build (Ferd, ADR-U030) is deliberately the **platform fundamentals**; the higher-purpose experiential mechanisms are added on top in later waves. This is sequencing by design, not an omission — the DESCRIPTION already defers World Model, Narrative, Discovery, and Intelligence under "Does not consume (yet)."
**Open part:** (1) What is the Hub's intended **experiential trajectory across waves** — how and when do the deferred mechanisms layer onto the fundamentals? (2) Does the Hub **DESCRIPTION** convey the full ambition, or does it under-sell the Hub as a utility ("just a platform") rather than a doorway into the world?
**Gap map (canon establishes -> where the Hub scope stops today; discovery-session input):** (1) entering a world vs using a tool — World Model deferred (CQ-012); (2) the Whisp as dialogue + avatar — post-Ferd (ADR-U029); (3) collective transformation — groups are containers, not developmental units (VISION principle 3, developmental interdependence); (4) narrative seasons/episodes — journeys are linear (Narrative DS deferred); (5) the commons (village, Tree, glowing glass balls) — no persistent collective-presence surface (VISION § Structural concepts, ADR-U031); (6) graduation as an exit mechanic — no mastery->graduation/carry-away path (VISION § Purpose, principle 7).
**Resolution path:** a **discovery session** (the mechanism that produced the universe canon — see [`universe-discovery/`](discovery--the-universe-in-the-making.md)) to set the intended Hub experiential trajectory and its wave-staging, then reconcile the DESCRIPTION / §L3 / ROADMAP. Honors fundamentals-before-experience-design. Source: finding F-07 in [`../planning/hub-v2/phase-1-review-findings.md`](../planning/hub-v2/phase-1-review-findings.md). Related: CQ-010 (first hour), CQ-012 (Whisp representation), CQ-014 (visitor experience), CQ-015 (Hub greenfield rebuild).
**Run-now split (Stefan + Claude, 2026-06-24):** CQ-016 separates into two sessions of very different size. **(A) Framing slice — runnable now:** open-part-(2) plus a rough trajectory *sketch* — does the DESCRIPTION convey the ambition (a doorway into a world) or undersell the Hub as a utility? Bounded to one focused session; output = a reframed DESCRIPTION ambition + a trajectory outline. It is framing, not experience-mechanics design, so it does **not** wait on the universe-mechanics fundamentals. **(B) Full trajectory design — deferred, not completable now:** open-part-(1), the wave-by-wave staging of the six gap-map mechanisms; multi-session and partly blocked on its inputs (the World Model, Narrative DS, and Whisp specs the gap map names) and the related open questions (CQ-010, CQ-012, CQ-014). Runs **parallel** to the Hub v2 build (blocks nothing in Ferd; the mechanisms land Eid+); the DESCRIPTION / §L3 / ROADMAP reconcile must land before Phase 3 reaches the experiential areas (Companion/Insight, Discovery).

---

### CQ-017: Off-Platform Invitation — Referral to the Platform vs. Email-as-Membership
**Status:** Resolved (2026-07-05) — [ADR-U040](../architecture/decisions/ADR-U040-referral-not-email-membership.md) ratified (Accepted): the email-as-membership path is retired in favour of the referral model. Implementation (the MEM-2 rebuild) is downstream decomposition/feature work.
**Scope:** Ferd
**Raised:** 2026-07-05 (invitation-model design conversation, while diagnosing a duplicate-invite bug in FEAT-PC012 `invite_by_email`)
**Blocks:** the fate of the MEM-2 "invite by email" capability (FEAT-PC012 / FEAT-H015); the successor to the Cycle G-E leadership/closure Hub work only insofar as invitation UI is reshaped; a follow-on referral feature spec
**Context:** The G-C invitation model lets a FIM invite "by email" — which either pre-commits a group membership for a stranger (claimed at sign-up) or converts an existing account into a membership invitation. Stefan surfaced that this models a *group membership for a person who has not transcended from Mist and not accepted consent*, inverting the consent-before-membership ordering the identity model depends on (ADR-U031: group access is FIM-only by status; transcendence is the consent gate). Two framings were weighed: drop the outward path entirely (closed FIM-to-FIM graph), or re-found it as an honest **referral to the platform** — a FIM-shared invite link/code carrying a group as destination, where the recipient arrives, transcends + consents to become a FIM, and only then receives a pending group invitation to accept. The latter preserves the friend-brings-a-friend growth loop (on-theme with the product's group-journey soul) while keeping the consent gate structurally unbypassable and removing platform-sent email to non-consented third parties.
**Recommendation (in ADR-U040):** Option C — the referral model; retire `invite_by_email`; keep name-based FIM invitation; membership never precedes transcendence-and-consent. Downstream-unsettled: referral-token mechanics, whether the platform ever dispatches email at all (the V3 seam), and the group-to-group invite (MEM-10 / G-F). Related: CQ-014 (Mist/visitor experience — the referral arrival is a new onboarding entry), CQ-010 (the first hour).
**Note:** the immediate duplicate-invite bug (raw Postgres unique-constraint text leaking to the UI on a re-invite) is a *separate, still-wanted* fix — it applies to the name-based FIM invite regardless of this decision. **Update 2026-09-02 (Ferd leftovers pass):** found already fixed platform-side — `invite_member` pre-checks and raises a human, state-specific message under 23505 (FEAT-PC012 STORY-2b, pinned red-first in `hub/tests/integration/groups/invitation-contracts.test.ts`); the BFF now also guards so a raw constraint message can never become copy. Closed.

---

## Resolved

_No resolved items yet._
