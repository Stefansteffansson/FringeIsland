# Vision-to-Spec Mapping: Ferd (Wave 1) vs Hamn (Wave 2)
*Generated: April 5, 2026*
*Sources: VISION.md, PRODUCTS_AND_PLATFORM.md, CONTRIBUTION_ARCHITECTURE.md, MANIFESTO.md, DEFERRED.md, ARCHITECTURE_ANATOMY.md*

---

## A. VISION/STRATEGY PROMISES ALREADY IN FERD'S SPEC

| Vision/Strategy Concept | Ferd Feature That Covers It |
|---|---|
| Group-based learning journeys | Journey Catalog + Journey Enrollment + Group Management |
| Role-based experiences (Steward, Guide, Member, Observer) | Role Management + RBAC (31 permissions, `has_permission()`) |
| Predefined journeys (Type 1-2) | Journey Catalog (browsable, predefined content) |
| Auth and member identity (L1) | Auth & Profiles |
| Groups as organisational units (L2) | Group Management + Member Management |
| Universal group pattern (personal groups join engagement groups) | RBAC schema (D7, D9, D15 — `member_group_id`) |
| DeusEx platform administration | Admin (delivered beyond scope) |
| Direct messaging (1:1 connection) | Communication — DM (delivered beyond scope) |
| Group forums (peer belonging) | Communication — Forums (delivered beyond scope) |
| Notifications (in-app) | Communication — Notifications (delivered beyond scope) |
| Lifecycle management (soft-delete, stewardship transfer, reactivation) | Lifecycle flows (delivered beyond scope) |
| Display names | Profiles — Display Names (delivered beyond scope) |
| API-first architecture (Platform API ring) | All features built as `/api/...` routes |
| RLS on all tables | Security baseline — 19 tables with RLS |
| Discord as temporary community scaffold | External community (temporary) |
| Web-first for primary platform | Next.js web platform |
| "The builder can build" proof | 95% complete, 659 tests, working platform |
| "The journey metaphor is real" proof | Groups traveling together, roles functioning |
| Under-18 exclusion | Not in spec but implicit in auth design |
| Basic accessibility (semantic HTML, ARIA) | Partial — basic a11y in Ferd |
| English-only launch | Current state |

---

## B. VISION/STRATEGY PROMISES THAT BELONG IN HAMN'S SPEC

### B1. The Whisp System
- **Whisp as instrument** — member's agency projected into the world, begins empty, fills with self-knowledge
- **Whisp dual nature** — Encounter (meeting future self) + Companion (permanent presence)
- **Whisp fullness model** — fidelity of response determined by engagement depth
- **Whisp practical UI** — visibility, interaction, growth signals, ambient presence vs structured encounters
- **Whisp encounter phenomenology** — what encounters look/feel like at different fullness stages
- **Whisp representation** — compelling browser expression (no AR yet in Hamn web)
- *Source: VISION.md Parts Two/Three, DEFERRED.md Whisp sections*

### B2. The Three Worlds & Narrative Layer
- **Three realms UI** — Ordinary World, Safe Harbour (Fringe Island), The Other Side
- **World transitions** — felt transitions between realms (color, typography, ambient elements)
- **Seasons and Episodes** — 4 seasons/year, 12 episodes/season, universal calendar + adaptive AI
- **Narrative as primary experience** — A-plot, B-stories, sub-plots, mythology, mystery
- **Episode delivery** — text/video/AR/live events (methods TBD)
- **Season persistence** — library model, remain accessible indefinitely
- **Stories first, themes underneath** — learning emerges implicitly from narrative
- *Source: VISION.md Part Two, DEFERRED.md Seasons/Episodes + Three Worlds UI*

### B3. The Three-Dimensional Void
- **Individual void (1)** — gap between who I am and who I know myself to be
- **Relational void (1+1)** — gap between how I relate and how I could relate
- **Communal void (1+community)** — gap between how I belong and how I could belong
- **Void-responsive content delivery** — content adapts based on void state
- **Void visualization** — AR overlay showing void state (basic AR experiments in Hamn)
- *Source: VISION.md Part Two, DEFERRED.md AR Void Visualization*

### B4. The Engagement Spectrum
- **Homebody path** — tend inner garden, reflect quietly, solo journeys, deep individual work
- **Explorer path** — narrative arcs, seasonal episodes, quests, group dynamics, community contribution
- **The garden** — member's personal digital home/space on the island
- **Garden door principle** — visitors glimpse it; opens on registration; everything carried forward
- *Source: VISION.md Part Two, CONTRIBUTION_ARCHITECTURE.md Garden Door section*

### B5. Journey Designer & User-Created Content
- **Journey Designer tool** — Dreamineer-facing creation/editing interface
- **Journey Zero** — onboarding journey, first experience every new member walks
- **Type 3 journeys** — user-created journeys (authoring in Hamn, full operation Wave 3)
- **Step type extensibility** — new step types addable without schema changes
- **Journey versioning** — handling updates to journeys users are actively taking
- **Journey discovery & search** — categories, tags, personalization, social discovery, full-text search
- **Granular journey permissions** — create/duplicate/edit/publish/collaborate permissions
- *Source: ARCHITECTURE_ANATOMY.md L3, DEFERRED.md Journey System sections*

### B6. Dreamineer Ecosystem
- **Dreamineer community formation** — Makers (content creators) + Weavers (experience architects)
- **Dreamineer studio tools** — web/desktop content creation suite
- **Weaver tooling** — how Weavers stitch content into coherent journeys, collaborate with AI
- **Meritocratic advancement** — member-to-Dreamineer path through demonstrated contribution
- **Content moderation workflow** — review, approve, reject, remove Dreamineer-created content
- **Quality standards** — Council-defined standards for published content
- *Source: VISION.md Part Three, PRODUCTS_AND_PLATFORM.md Wave 2, CONTRIBUTION_ARCHITECTURE.md*

### B7. Marketplace
- **Dreamineer marketplace** — journeys, experiences, content, physical products
- **Revenue sharing** — Foundation platform %, creators keep rest (Blender Market model)
- **Marketplace browsing** — L6 Discovery layer
- **Physical products in marketplace** — world artefacts, printed materials
- **Stripe Connect integration** — automated payment splitting
- *Source: VISION.md Part Six, PRODUCTS_AND_PLATFORM.md Wave 2, ARCHITECTURE_ANATOMY.md Transactions vertical*

### B8. Native Mobile Apps
- **iOS native app** — primary mobile experience for 18-29 demographic
- **Android native app** — primary mobile experience
- **Push notifications** — APNS + FCM
- **Quick engagement** — episode notifications, journey activities, garden check-ins, community moments
- **Non-negotiable for primary audience** — "no friction or they leave"
- *Source: PRODUCTS_AND_PLATFORM.md Parts One/Six, VISION.md Part Seven*

### B9. AI & Intelligence Layer (L7 Full Expression)
- **AI Mentor full expression** — parallel self mechanic, warm/curious/non-prescriptive
- **Adaptive season personalization** — AI personalizes episode experience per member
- **NPC system** — calibrated agents of productive discomfort (growth zone targeting)
- **NPC behaviour authoring** — mechanism TBD (prompt engineering? behaviour graphs? learning models?)
- **Profile accumulation** — coherent member portrait from journey engagement
- **Insights** — patterns surfaced from engagement and reflection over time
- *Source: VISION.md Part Eight, ARCHITECTURE_ANATOMY.md L7, DEFERRED.md NPC sections*

### B10. Communication & Community Expansion
- **Discord retirement** — community lives fully on own platform
- **Activity feed** — ambient awareness of living platform
- **Announcements system** — one-to-many, role-controlled
- **Online seasonal events** — digital events tied to narrative seasons
- **Group DMs** — multi-party conversations
- **Forum enhancements** — journey-specific forums, global forum, reactions, search, rich media, pinned posts
- **Block/report users** — safety features
- *Source: PRODUCTS_AND_PLATFORM.md Wave 2, DEFERRED.md Social Features*

### B11. Basic AR Experiments
- **Location-based AR** — world moments triggered in real world
- **Camera-triggered AR** — island bleeding into physical reality
- **AR as progress indicator** — void shrinking/expanding shown phenomenologically
- *Source: VISION.md Part Seven, PRODUCTS_AND_PLATFORM.md Wave 2, DEFERRED.md AR section*

### B12. Monetization & Subscriptions
- **Free tier** — genuinely free, real home, not crippled demo
- **Premium tiers** — deeper experience, richer journeys, expanded tools
- **Voluntary donations** — support Foundation + support individual Dreamineers
- **Stripe integration** — subscription management, marketplace payments
- *Source: VISION.md Part Six, DEFERRED.md Monetization*

### B13. Advanced Analytics
- **Individual analytics** — journey progress, completion rates, time spent, skill tracking
- **Guide analytics** — member progress overview, drop-off points, feedback effectiveness
- **Steward analytics** — group activity trends, engagement, health metrics
- **Journey creator analytics** — performance, enrollment trends, revenue
- **Platform admin analytics** — overall health, growth, technical performance
- *Source: DEFERRED.md Analytics section*

### B14. Accessibility Enhancements
- **WCAG 2.1 AA full compliance** — high contrast mode, dyslexia-friendly fonts, audio descriptions
- **Sign language videos** — for key content
- **Simplified language option**
- *Source: DEFERRED.md Accessibility section*

### B15. Security Enhancements
- **MFA** — multi-factor authentication
- **SSO** — SAML, OIDC for organizational use
- **Audit logs** — who did what, when (Observability vertical)
- **Data export / right to erasure** — GDPR compliance
- **Data retention policies**
- *Source: DEFERRED.md Security section, ARCHITECTURE_ANATOMY.md Privacy vertical*

### B16. Internationalization
- **Multi-language UI** — navigation, buttons, labels, error messages
- **Content translation strategy** — machine/community/professional
- **Locale support** — date/time, numbers, currency, RTL languages
- *Source: DEFERRED.md i18n section, ARCHITECTURE_ANATOMY.md i18n constraint*

---

## C. ITEMS EXPLICITLY DEFERRED TO HAMN (from DEFERRED.md)

1. **Journey creation granularity** — fine-grained permissions for create/duplicate/edit/publish/collaborate
2. **Group-joins-group UI** — request/acceptance flow, hierarchy visualization, attribution display (schema done, UI deferred; D11 circularity trigger prerequisite)
3. **Dynamic journey path changes** — conditional logic, branching journeys (deferred to Wave 3, not Hamn)
4. **Journey versioning** — handling updates to active journeys (snapshot vs latest vs opt-in)
5. **Journey discovery & search** — categories, personalization, social discovery, faceted search
6. **Notification enhancements** — email delivery, daily/weekly digests, per-type preferences, quiet hours
7. **Native mobile apps** — iOS/Android (web-first for Ferd)
8. **Accessibility enhancements** — WCAG 2.1 AA full compliance
9. **Forum enhancements** — journey-specific forums, global forum, reactions, search, rich media, pinned posts
10. **DM enhancements** — block/report, message filtering, group DMs, message search
11. **Advanced analytics dashboard** — per-role analytics for individuals, guides, stewards, creators, admins
12. **Multi-language support** — i18n framework, content translation, locale support
13. **Advanced security** — MFA, SSO, audit logs, data protection, compliance certifications
14. **Performance optimization** — caching, CDN, read replicas, horizontal scaling (ongoing)
15. **Monetization strategy** — freemium tiers, marketplace commission, organizational licensing
16. **Seasons and Episodes** — partially resolved (architecture set), episode delivery mechanics deferred
17. **NPC behaviour authoring** — mechanism entirely unspecified, prerequisite for any NPC
18. **FringeIsland universe design & AR void visualization** — visual language, void representation, AR overlay
19. **Respawning mechanics** — Whisp death/respawn triggers, locations, information revelation
20. **Whisp encounter phenomenology** — what encounters look/feel like at different fullness stages
21. **Whisp practical UI** — day-to-day visibility, interaction, growth signals
22. **Three Worlds UI design** — visual language, world transitions, spatial experience

---

## D. GAPS -- THINGS THE VISION/STRATEGY MENTIONS BUT NEITHER SPEC COVERS

1. **The First Experience / "Journey Zero"** — VISION.md calls this "the single highest-risk gap." How does the first hour work? What does a new member actually do when they arrive? Neither Ferd nor Hamn spec has designed this. Blocks: Ferd onboarding, Hamn onboarding journey, Kickstarter campaign.

2. **AI Feasibility validation** — The vision assumes load-bearing AI: adaptive personalization, NPC calibration, AI-generative journeys, void-responsive delivery. None validated against current/near-future AI capability. No spec assigns this validation to a wave.

3. **Cold-start problem** — Relational (1+1) and communal (1+community) void dimensions require real human relationships. In early months with small member base, these are structurally unsolvable. No strategy document addresses the bootstrap solution.

4. **Visitor/shadow experience** — CONTRIBUTION_ARCHITECTURE.md and ARCHITECTURE_ANATOMY.md (L1) describe visitors extensively (anonymous session, temporary profile, garden glimpse, taster journeys). Ferd spec doesn't include it. Hamn spec doesn't exist. Which wave builds this?

5. **The Kickstarter campaign** — VISION.md describes it as "Season Zero," the founding moment. No spec covers its design, tiers, video, or pre-launch strategy. It is its own product/event.

6. **Three Perspectives naming** — The 1 / 1+1 / 1+community framework is established but its FringeIsland-native naming is "explicitly unresolved and not to be forced."

7. **Void cosmology implementation wave** — The three-dimensional void is foundational to Whisp, AR, Seasons, and The Other Side, but no document assigns its implementation to a specific wave.

8. **Dreamineer Council governance mechanics** — How does the Council actually operate? Voting? Consensus? Rotating seats? The vision describes the *principle* but no spec covers the *practice*.

9. **Foundation formal establishment** — Listed as Wave 3 but referenced as if it exists in governance descriptions. When does the legal entity actually form?

10. **Experimentation layer** — PRODUCTS_AND_PLATFORM.md describes a permanent lightweight experimentation layer for cheap validation. No spec covers how this works practically (feature flags? separate environment? A/B testing?).

11. **profile_data table** — ARCHITECTURE_ANATOMY.md specifies this as L1 infrastructure (flexible buckets for assessments, reflections, insights, intentions). Ferd spec doesn't mention it. Is it built? If not, it is prerequisite for L3+ and should be in a spec.

12. **Content licensing model** — VISION.md describes CC BY-SA with CLA for community content, MIT/Apache for platform code. No product spec covers how this is surfaced to users or enforced in the marketplace.

13. **Physical products strategy** — PRODUCTS_AND_PLATFORM.md describes 3D artefacts, printed materials, merchandise, physical game expressions. Listed under Hamn marketplace but no specification exists.

14. **50+ demographic as mentors/wisdom-sharers** — VISION.md highlights this as "a particularly important role." No spec addresses how the platform specifically serves or surfaces this.

---

## E. ARCHITECTURE LAYERS -- FERD vs HAMN COVERAGE

| Layer/Vertical | Ferd (Wave 1) Status | Hamn (Wave 2) Needs |
|---|---|---|
| **L0 Infrastructure** | Complete — Supabase, PostgreSQL, Auth, RLS, Storage | Add: pg_cron (visitor cleanup), feature flags, i18n config, email service, AI provider, backup strategy, Stripe |
| **L1 Identity** | Mostly complete — auth, profiles, sessions | Add: visitor/shadow experience, temporary profiles, profile_data table (dynamic buckets), Whisp identity |
| **L2 Organisation** | Complete — groups, memberships, roles, permissions, DeusEx | Add: group-joins-group UI, circularity trigger (D11), Dreamineer/Council group types, depth limits |
| **L3 Experience Engine** | Partial — journey catalog, enrollment, basic progress | Add: Journey Designer, Journey Zero, all Tier 1+2 step types, step extensibility, Seasons/Episodes integration. **This is the linchpin.** |
| **L4 Content** | Minimal — predefined journey content | Add: narrative layer, Dreamineer-created content, assessments (Big 5, VIA, Culture Map), media pipeline, i18n strings, content moderation |
| **L5 Communication** | Partial — DM, forums, notifications (in-app) | Add: announcements, activity feed, email notifications, push (mobile), forum enhancements, Discord retirement |
| **L6 Discovery** | Minimal — basic journey list | Add: full-text search, recommendations, marketplace browsing, personalization, social discovery |
| **L7 Intelligence** | Not built | Add: AI Mentor (full), profile accumulation, insights engine, NPC system, adaptive personalization |
| **V1 Administration** | Partial — lifecycle events, DeusEx operations | Add: content moderation workflow, full cascade specs for all lifecycle events |
| **V2 Privacy/GDPR** | Basic — RLS, data isolation | Add: right to access/erasure/portability, consent management, AI data handling, privacy preferences, data map |
| **V3 Notifications/Email** | Partial — in-app only | Add: email delivery, push notifications (APNS/FCM), notification preferences |
| **V4 Observability/Audit** | Not built | Add: structured logs, metrics, audit trail, error tracking (Sentry) |
| **V5 Transactions/Stripe** | Placeholder | Add: Stripe Connect, subscription management, marketplace payments, entitlement system |
| **Platform API Ring** | Built (API-first pattern) | Add: rate limiting, API versioning (v1/v2), extension surface for plugins |
| **Design System** | Basic (Tailwind components) | Add: world aesthetic, component library, world-specific elements (garden, avatar, journey steps), i18n/a11y compliance |
| **Frontends** | Web only (Next.js) | Add: Hamn web evolution, iOS native, Android native |

---

## F. POTENTIAL CHALLENGES/QUESTIONS

### Contradictions & Ambiguities

1. **L3 is the linchpin but partially built** — Architecture Anatomy says "building features above L3 before L3 is correctly specced means rebuilding those features." Ferd has already built L5 Communication (DM, forums) above a partially-specced L3. Will these need rebuilding for Hamn?

2. **Ferd = departure vs Hamn = transformation, not replacement** — PRODUCTS_AND_PLATFORM.md says "Hamn is not a replacement for Ferd -- it is Ferd grown into something larger." But the scope delta is enormous. Is this an incremental evolution or effectively a new product wearing the same codebase?

3. **Seasons & Episodes wave assignment** — VISION.md scope boundaries note: "Specification deferred to Hamn sessions, but not explicitly listed as a Hamn deliverable. Implementation wave unclear." The DEFERRED.md says Wave 2 for spec sessions. But is the *implementation* Wave 2 or Wave 3?

4. **Type 3-4 journey ambiguity** — Does the Hamn Journey Designer support authoring Type 3-4 journeys even if they don't run until Wave 3? This affects the scope of the Designer tool.

5. **AI Mentor: Ferd foundation vs Hamn expression** — Architecture Anatomy says "For Ferd, the AI Mentor foundation is built: privacy controls, consent model, context storage." But Ferd's product spec doesn't mention AI Mentor at all. Is the foundation actually built, or is this aspirational architecture?

6. **Visitor experience: which wave?** — Contribution Architecture describes visitors in detail. Architecture Anatomy places them in L1. PRODUCTS_AND_PLATFORM.md lists "visitor/shadow experience" under Wave 1 Ferd. But Ferd's product spec doesn't include it. Is this a Ferd gap or a Hamn feature?

7. **i18n as "day one constraint" vs English-only launch** — Architecture Anatomy insists all strings must be externalized from day one. Ferd launched English-only. Is the i18n infrastructure actually in place, or is this technical debt?

8. **Free tier definition** — Vision says "genuinely free, not a crippled demo." No spec defines what the free tier includes vs what premium unlocks. This is a critical product decision that affects every feature scope.

9. **Dreamineer recruitment in Wave 1** — PRODUCTS_AND_PLATFORM.md lists "First Dreamineers recruited" under Wave 1 Ferd. But Ferd has no Dreamineer-facing tools. How are they recruited and what do they do before Hamn ships?

10. **NPC as prerequisite cascade** — NPCs are central to the world (VISION.md) and prerequisite for multiple Hamn features (Encounter content family, Road system, seasonal content). But NPC authoring mechanism is entirely unspecified. This is a long-lead design problem that blocks significant Hamn scope.

### Strategic Questions for Spec Review

11. **What is Hamn's MVP?** — The full Hamn vision (Whisp + narrative + marketplace + mobile apps + AR + AI + Dreamineer tools + monetization) is massive. What is the minimum viable Hamn that proves "the island comes alive"?

12. **Build order within Hamn** — L3 Experience Engine must be specced first (architecture says so). But the Whisp, narrative layer, and AI Mentor all have long design lead times. What gets specced in parallel vs sequentially?

13. **Codebase evolution strategy** — Is Hamn the same Next.js codebase with new features, or does the native app requirement push toward a different architecture (e.g., shared API + separate frontends)?

14. **When does monetization need to work?** — The Kickstarter funds initial development, but subscriptions and marketplace revenue need to sustain the Foundation. At what point in Hamn must revenue flow?

15. **Content chicken-and-egg** — Hamn needs Dreamineer-created content to be alive, but Dreamineers need tools and a community to create content. What is the bootstrap strategy?

---

*This mapping is a working document for the Hamn product specification session. Each section B item is a candidate for a Hamn spec section. Each section D item needs a decision about which wave owns it.*
