# Deferred Decisions

This document tracks design decisions, features, and questions that have been deferred to later waves of FringeIsland development. Each item includes context, rationale for deferral, and notes for future implementation.

For the deferral protocol (two-sided acceptance workflow), see [Deferral Protocol](../../../old_universe/processes/DEFERRAL_PROTOCOL.md).

## Format

Each deferred decision includes:
- **Topic**: What question or feature is deferred
- **Context**: Why this came up
- **Decision**: What was decided for now
- **Deferred To**: Which wave to revisit
- **Status**: Proposed → [receiver] | Accepted by [receiver] | Re-deferred | Resolved
- **Notes**: Important considerations for future implementation

---

## Permission System

### Permission Inheritance Between Parent/Child Groups — RESOLVED

**Topic**: How should permissions flow between parent and child groups in hierarchical structures?

**Status:** **RESOLVED** by RBAC design decisions D5, D7, D10, D12 (February 2026). See `docs/old_products/ferd/development/features/AR-dynamic-permissions-system.md`.

**Resolution:**
- **D5 (Two-Tier Scoping):** System group permissions always active; context group permissions scoped to that group only. No automatic "bleeding" of permissions.
- **D7 (Groups Join Groups):** The host group assigns roles to the joining group. Permissions in the host group are controlled by the host's Steward, NOT inherited from the joining group's internal roles.
- **D10 (Transitive Membership):** Fully transitive (Mogwai → Alpha → Beta means access to Beta), but with Beta's roles assigned to Alpha — not Alpha's internal permissions projected onto Beta.
- **D12 (Multiple Paths = Union):** If a user reaches a group through multiple paths, effective permissions are the additive union.

**Key insight:** There is no "inheritance" in the traditional parent→child sense. The host group always decides what the joining group can do. This replaces all three original options (cascade down, bubble up, isolated) with a single universal model.

**Implementation:** Sub-Sprint 1 (v0.2.16) and Sub-Sprint 2 (v0.2.17) built the schema and `has_permission()` SQL function. Sub-Sprint 3 (UI migration) is next.

---

### Journey Creation Granularity

**Topic**: Should there be separate permissions for different types of journey creation/editing?
**Status:** Accepted by Eid (Wave 2) — bundled with Journey Studio v.1

**Context**: During permission list definition, the question arose whether we need fine-grained permissions like:
- Creating journeys from scratch vs. duplicating existing ones
- Editing your own journeys vs. collaborative editing
- Publishing vs. unpublishing journeys

**Decision**: Use simple `create_journey`, `edit_journey`, `publish_journey` permissions for Wave 1 (Ferd).

**Deferred To**: Wave 2 (Eid) — when user-created journeys are introduced via Journey Studio v.1

**Notes for Future Implementation**:

**Potential Granular Permissions:**

```
Journey Creation:
- create_journey_from_scratch
- duplicate_existing_journey
- import_journey_from_template

Journey Editing:
- edit_own_journeys
- edit_group_journeys (collaborative)
- edit_any_journey (admin only)

Journey Publishing:
- publish_to_marketplace
- unpublish_journeys
- feature_journey (marketplace curation)
- set_journey_pricing

Journey Collaboration:
- invite_journey_collaborators
- approve_journey_changes
- manage_journey_versions
```

**Why This Matters:**

In Wave 2 (Eid), user-generated content creates new scenarios:
- **Quality Control**: Maybe only certain users can publish to public marketplace
- **Collaboration**: Different editing rights for collaborators vs. owners
- **Monetization**: If paid journeys exist, publishing permissions become sensitive
- **IP Protection**: Users may want granular control over who can duplicate/edit

**Before Implementation:**
- Observe how users actually create/edit journeys in Wave 1 (Ferd)
- Identify pain points with coarse permissions
- Survey users on desired granularity
- Design permission UI that doesn't overwhelm users

---

## Journey System

### Dynamic Journey Path Changes

**Topic**: How should journeys adapt their paths based on user actions during the journey?

**Context**: A future wave introduces dynamic/adaptive journeys where the path can change based on what users do. This requires a significant architectural shift from linear journeys.

**Decision**: Wave 1 (Ferd) uses linear (A→B) journey structure. Dynamic journeys are Wave 4 (Heim).

**Deferred To**: Wave 4 (Heim) — Dynamic Journeys

**Notes for Future Implementation**:

**Architecture Changes Needed:**

1. **Journey Structure**
   ```
   Linear (Wave 1):
   Step 1 → Step 2 → Step 3 → Complete

   Dynamic (Wave 4 — Heim):
   Step 1 → [Conditional Logic] → Step 2A or Step 2B
                                  → Step 3
                                  → Complete
   ```

2. **Conditional Logic System**
   - If/then rules
   - User responses
   - Completion status
   - Performance metrics
   - Time constraints

3. **Data Model**
   ```sql
   journey_steps:
   - next_step_id (simple linear)
   
   vs.
   
   journey_step_conditions:
   - condition_type
   - condition_value
   - next_step_if_true
   - next_step_if_false
   ```

**Use Cases:**

- **Skill-based paths**: Different content based on user's current level
- **Choice-based narratives**: User choices affect journey direction
- **Adaptive difficulty**: Content adjusts based on performance
- **Personalized recommendations**: Show relevant next steps

**Before Implementation:**
- Design condition system architecture
- Create condition evaluation engine
- Build journey editor for dynamic paths
- Test with pilot users

---

### Journey Versioning and Updates

**Topic**: How should we handle updates to journeys that users are actively taking?
**Status:** Accepted by Eid (Wave 2) — bundled with Journey Studio v.1

**Context**: Journey creators may want to update content, but users are mid-journey. Do they see old or new version?

**Decision**: Wave 1 (Ferd) doesn't support journey updates. Wave 2 (Eid) handles versioning as part of Journey Studio v.1.

**Deferred To**: Wave 2 (Eid)

**Options to Consider:**

1. **Snapshot on Enrollment**
   - User gets journey version from enrollment date
   - Updates don't affect active journeys
   - Pros: Consistency, no surprises
   - Cons: Users miss improvements

2. **Always Use Latest**
   - Users always see current version
   - Pros: Everyone gets best experience
   - Cons: Can break progress tracking

3. **Opt-in Updates**
   - User chooses to upgrade mid-journey
   - Pros: User control
   - Cons: Complex UX

4. **Smart Merging**
   - Minor updates apply automatically
   - Major changes require opt-in
   - Pros: Balance of both
   - Cons: Complex to implement

**Before Implementation:**
- Survey users on preferences
- Design version numbering system
- Plan data migration strategy
- Test with beta journeys

---

### Journey Discovery and Search

**Topic**: How do users find journeys relevant to their needs?
**Status:** Re-accepted by Eid (Wave 2) — bundled with Journey Studio v.1 (re-deferred from Hamn 2026-04-07)

**Context**: Wave 1 (Ferd) has basic journey list. Wave 2 (Eid) introduces sophisticated discovery alongside Journey Studio v.1.

**Decision**: Simple list/browse for Wave 1 (Ferd). Advanced discovery in Wave 2 (Eid).

**Deferred To**: Wave 2 (Eid)

**Discovery Methods:**

**Browsing:**
- Categories/tags
- Popular journeys
- Recently added
- Recommended for you

**Search:**
- Full-text search
- Filters (duration, difficulty, type)
- Sort options
- Faceted search

**Personalization:**
- Based on completed journeys
- Based on group memberships
- Based on skill level
- Collaborative filtering

**Social Discovery:**
- What friends are taking
- Group leader recommendations
- Trending in your organization

**Before Implementation:**
- Analyze user behavior patterns
- Design recommendation algorithm
- Choose search technology (Algolia, Elasticsearch)
- A/B test different discovery UIs

---

## User Experience

### Notification System — IMPLEMENTED

**Topic**: How should users be notified about platform events?

**Status:** **IMPLEMENTED** in v0.2.14 (February 2026). 7 notification types, Supabase Realtime push, database triggers, bell UI with badge counter.

**What's still deferred:**
- Email notification delivery (currently in-app only)
- Daily/weekly digest summaries
- Per-notification-type preferences
- Quiet hours

---

### Mobile Application

**Topic**: Should FringeIsland have native mobile apps?
**Status:** Re-accepted by Brim (Wave 5) — re-deferred from Hamn 2026-04-07

**Context**: Platform is web-based (responsive). Native apps could improve experience. High-level platform strategy, device approach, and the relationship between digital products, physical products, events, and the game are addressed in [`docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md`](../../../old_universe/strategy/PRODUCTS_AND_PLATFORM.md).

**Decision**: Web-first for Wave 1 (Ferd). Native iOS/Android apps in Wave 5 (Brim).

**Deferred To**: Wave 5 (Brim)

**Options:**

1. **Progressive Web App (PWA)**
   - Web app that works offline
   - Can install to home screen
   - Pros: One codebase, easier
   - Cons: Limited native features

2. **React Native**
   - Cross-platform iOS + Android
   - Pros: Share code with web
   - Cons: Still need separate app

3. **Native Apps**
   - Separate Swift (iOS) + Kotlin (Android)
   - Pros: Best performance, full features
   - Cons: 3x development effort

**Mobile-Specific Features:**
- Push notifications
- Offline access to journeys
- Camera integration for activities
- Location-based features

**Before Implementation:**
- Survey users on mobile usage patterns
- Analyze web traffic (mobile vs. desktop)
- Prototype key mobile features
- Evaluate development cost vs. value

---

### Accessibility (a11y)

**Topic**: How accessible should the platform be to users with disabilities?

**Context**: Accessibility is important but requires significant effort to do well.

**Decision**: Basic accessibility for Wave 1 (Ferd). Enhanced features as needed.

**Deferred To**: Ongoing (continuous improvement)

**Accessibility Standards:**

**WCAG 2.1 Level AA (Target):**
- Screen reader support
- Keyboard navigation
- Color contrast
- Alt text for images
- Captions for videos
- Focus indicators

**Wave 1 (Ferd) Basics:**
- Semantic HTML
- ARIA labels where needed
- Keyboard shortcuts
- Responsive text sizing

**Wave 3 (Hamn) Enhancements:**
- High contrast mode
- Dyslexia-friendly fonts
- Audio descriptions
- Sign language videos
- Simplified language option

**Testing:**
- Automated tools (axe, Lighthouse)
- Manual testing with screen readers
- User testing with disabled users
- Regular audits

**Before Implementation:**
- Conduct accessibility audit
- Prioritize most-needed features
- Train team on a11y best practices
- Budget for ongoing testing

---

## Social Features

### Forum and Community — PARTIALLY IMPLEMENTED

**Topic**: Should the platform include forums or community discussion spaces?

**Status:** **Group Forums IMPLEMENTED** in v0.2.14 (February 2026). Flat threading, moderation tools, RBAC stub, tab UI integrated into group detail page.

**What's still deferred:**
- Journey-specific forums
- Global platform forum
- Reactions (likes, helpful)
- Forum search and filtering
- Rich media in posts (images, videos)
- Pinned/featured posts

---

### Direct Messaging — IMPLEMENTED

**Topic**: Should users be able to send direct messages to each other?

**Status:** **IMPLEMENTED** in v0.2.15 (February 2026). 1:1 conversations, inbox UI, read tracking, Supabase Realtime for live updates.

**What's still deferred:**
- Block/report users
- Message filtering/moderation
- Group DMs (multi-party conversations)
- Message search

---

## Analytics and Reporting

### Advanced Analytics Dashboard

**Topic**: What analytics should the platform provide to different user types?
**Status:** Re-accepted by Urd (Beyond) — re-deferred from Hamn 2026-04-07

**Context**: Wave 1 (Ferd) has basic analytics. Users may want deeper insights.

**Decision**: Basic analytics in Wave 1 (Ferd). Advanced dashboard in Urd (Beyond).

**Deferred To**: Urd (Beyond)

**Analytics by User Type:**

**Individual Users:**
- My journey progress over time
- Completion rates
- Time spent on journeys
- Skill development tracking
- Comparison to peers (opt-in)

**Guides:**
- Member progress overview
- Drop-off points
- Completion rates by journey
- Engagement metrics
- Feedback effectiveness

**Stewards:**
- Group activity trends
- Member engagement
- Journey enrollment patterns
- Most/least popular journeys
- Group health metrics

**Journey Creators:**
- Journey performance
- Enrollment trends
- Completion rates
- User feedback
- Revenue (if monetized)

**Platform Admins:**
- Overall platform health
- User growth
- Journey creation trends
- Popular features
- Technical performance

**Before Implementation:**
- Define key metrics for each user type
- Design analytics data warehouse
- Choose visualization library
- Ensure privacy compliance (GDPR, etc.)

---

## Internationalization

### Multi-Language Support

**Topic**: Should the platform support multiple languages?

**Context**: Initially launching in English. International expansion may require i18n.

**Decision**: English-only for Wave 1 (Ferd). i18n in later waves if expanding internationally.

**Deferred To**: Post-Wave 1 (based on international demand)

**Scope of i18n:**

**UI Translation:**
- Navigation, buttons, labels
- Error messages
- Help text
- Email templates

**Content Translation:**
- Journey content
- Forum posts
- User-generated content
- How to handle?
  - Machine translation (Google Translate)
  - Community translation
  - Professional translation

**Locale Support:**
- Date/time formats
- Number formats
- Currency (if monetization)
- Right-to-left languages

**Implementation Strategy:**
- Use i18n framework from start (even if single language)
- Externalize all strings
- Design database schema to support translations
- Choose: separate records vs. JSONB fields

**Before Implementation:**
- Identify target markets
- Estimate translation cost
- Choose translation management platform
- Plan phased rollout (language by language)

---

## Security and Compliance

### Advanced Security Features

**Topic**: What additional security features are needed?

**Context**: Wave 1 (Ferd) has basic auth + RLS. Additional security for sensitive use cases.

**Decision**: Standard security for Wave 1 (Ferd). Enhanced features as needed.

**Deferred To**: Based on customer requirements

**Potential Features:**

**Authentication:**
- Multi-factor authentication (MFA)
- Single Sign-On (SSO) - SAML, OIDC
- Passwordless authentication
- Session management controls
- IP whitelisting

**Authorization:**
- Audit logs (who did what, when)
- Permission change history
- Access reviews
- Least privilege enforcement

**Data Protection:**
- End-to-end encryption (for sensitive journeys)
- Data retention policies
- Right to be forgotten (GDPR)
- Data export
- Anonymization

**Compliance:**
- SOC 2 Type II
- GDPR compliance
- CCPA compliance
- HIPAA (if health-related journeys)
- Industry-specific certifications

**Before Implementation:**
- Identify target enterprise customers
- Understand compliance requirements
- Budget for security audits
- Plan certification timeline

---

## Platform Scalability

### Performance Optimization

**Topic**: What optimizations are needed for scale?

**Context**: Wave 1 (Ferd) targets hundreds of users. Future waves need thousands+.

**Decision**: Optimize for correctness first, performance second. Scale when needed.

**Deferred To**: Ongoing (as scale increases)

**Optimization Areas:**

**Database:**
- Query optimization
- Additional indexes
- Database sharding (if needed)
- Read replicas
- Connection pooling

**Caching:**
- Redis for session data
- Cache permission lookups
- Cache group hierarchies
- CDN for static assets

**Frontend:**
- Code splitting
- Lazy loading
- Image optimization
- Bundle size reduction

**Backend:**
- API response caching
- Background job processing
- Horizontal scaling (multiple instances)
- Load balancing

**Monitoring:**
- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- User analytics
- Database query monitoring

**Before Implementation:**
- Define performance SLAs
- Benchmark current performance
- Identify bottlenecks through load testing
- Optimize highest-impact areas first

---

## Business Model

### Monetization Strategy

**Topic**: How will FringeIsland generate revenue?
**Status:** Re-accepted by Urd / Beyond Urd — re-deferred from Hamn 2026-04-07 (Ferd = free tier baseline)

**Context**: Wave 1 (Ferd) focus is product-market fit. Monetization comes later.

**Decision**: Determine monetization strategy after validating product.

**Deferred To**: Urd (Beyond) and beyond — once product is validated and Foundation is mature

**Monetization Options:**

**Freemium:**
- Free: Basic features, limited journeys
- Pro: Advanced features, unlimited journeys
- Enterprise: Custom solutions, SSO, support

**Marketplace:**
- Journey creators set prices
- Platform takes commission (e.g., 20%)
- Revenue sharing model

**Organizational Licensing:**
- Per-seat pricing for companies
- Annual contracts
- Volume discounts

**Service Add-ons:**
- Custom journey development
- Facilitation services
- Training and certification
- Consultancy

**Before Implementation:**
- Validate which features users will pay for
- Test pricing with early customers
- Study competitor pricing
- Calculate unit economics

---

## Journey Designer — Parked from Sessions 01-03

*These items were explicitly parked during Journey Designer Discovery Sessions 01-03 (March 2026). Each requires a dedicated specification session before implementation. See session documents in `docs/old_products/ferd/sessions/` for full context.*

### Seasons and Episodes — PARTIALLY RESOLVED

**Topic**: The temporal narrative structure of the FringeIsland universe — storytelling arcs that drive Type 4 (AI-Generative) journeys and animate The Other Side.

**Status**: **PARTIALLY RESOLVED** by Session 02 and Session 03 (March 2026). Conceptual architecture established. Detailed mechanics and Episode delivery deferred.
**Status:** Re-accepted by Urd (Beyond) — re-deferred from Hamn 2026-04-07

**What's resolved (Sessions 02-03):**
- ✅ **Architecture**: 4 Seasons per year (3 months each), 12 Episodes per Season (weekly)
- ✅ **Authorship**: Universal calendar + Adaptive AI (Weaver-AI collaboration)
- ✅ **Nature**: Seasons = serialized storytelling (like Westworld), Episodes = weekly story beats
- ✅ **Design principle**: Stories first, themes underneath — learning emerges implicitly
- ✅ **Accessibility**: Seasons are universal themes (not difficulty levels), experienced differently by each FIM
- ✅ **Persistence**: Seasons remain accessible indefinitely (library model)
- ✅ **Episode-Journey relationship**: Episodes inspire/trigger journeys but are not themselves journeys
- ✅ **Immersive Edutainment**: Immersive (AR + game layer) + Educational (growth themes) + Entertainment (narrative)

**What's still deferred (Session 03):**
- Episode delivery methods (text/video/AR/live events specifics)
- FIM agency in Episodes (fixed/branching/personalized narrative)
- Episode independence (must experience in order vs. can jump in mid-Season)
- Respawning's detailed relationship to Episodes

**What's deferred to Dreamineer/Weaver community:**
- Specific narrative design patterns
- Balance of Episode content types
- Community influence on Episode outcomes

**Deferred To**: Urd (Beyond) — dedicated specification sessions for Episode delivery mechanics and Weaver tooling.

**Notes for Future Sessions**:
- Episodes are narrative containers, not gameplay — they tell stories that trigger journey opportunities
- Each Episode advances the Season's story arc (12-week narrative)
- FIMs experience Episodes participatorily, not passively (immersive, not just watching)
- Some Episodes may change respawn behavior or void dynamics (mechanics TBD)

---

### NPC Behaviour Authoring

**Topic**: The mechanism by which NPCs are calibrated to serve their developmental function — drawing travelers toward their growth zone without pushing them into the panic zone.
**Status:** Re-accepted by Urd (Beyond) — re-deferred from Hamn 2026-04-07

**Context**: Session 01 established that NPCs are not decorative — they are calibrated agents of productive discomfort, targeting the growth zone using a three-zone model (comfort/growth/panic). The developmental *intention* is clear, but the *mechanism* is not. Is it prompt engineering? A behaviour graph? A learning model? Who authors NPC behaviour and at what layer?

**Decision**: Parked. The NPC concept is foundational to the Encounter content family and the Road system, but the authoring and calibration mechanism requires its own design thread.

**Deferred To**: Urd (Beyond) — dedicated specification session. Prerequisite for any NPC implementation.

**Notes for Future Session**:
- Who authors NPC behaviour — journey designers, world architects, or the AI layer?
- How is NPC calibration tested and tuned?
- How do NPCs maintain personality continuity across encounters with the same traveler?
- How do NPC arcs (their own journeys) interact with the traveler's journey?
- What feedback loops exist between NPC interactions and calibration quality?

---

### FringeIsland Universe Design — NEW FROM SESSION 03

**Topic**: Visual/experiential design of the FringeIsland universe (Safe Harbour, regions, architecture, visual language).
**Status:** Accepted by Heim (Wave 4) — split from original combined item 2026-04-07

**Context**: Session 03 established that the void is the gap between who you are and who you know yourself to be, existing across three dimensions (1/1+1/1+community). The *visual language* of FringeIsland itself — what the Safe Harbour looks like, what regions exist, what aesthetic coherence binds the world — needs to be established before void/AR work can be designed.

**Decision**: Universe design (FringeIsland-as-place) is a Heim-wave deliverable. The void visualization and AR overlay portion is split out as a separate item below.

**Deferred To**: Wave 4 (Heim) — dedicated universe design session.

**Notes for Future Session**:
- What does FringeIsland (the Safe Harbour) actually look like? (regions, architecture, elements)
- What is the visual language that makes the FringeIsland world coherent?
- How does the universe design relate to the Three Worlds (Ordinary World / Safe Harbour / The Other Side)?

---

### AR Void Visualization — NEW FROM SESSION 03 (split from FringeIsland Universe Design)

**Topic**: Visual/experiential design of the void and the AR overlay system that renders it.
**Status:** Accepted by Brim (Wave 5) — split from original combined item 2026-04-07

**Context**: Session 03 established the three-dimensional void model (1/1+1/1+community). AR overlays the ordinary world to show void state (vast → shrinking → collapsed). This work depends on FringeIsland Universe Design (Heim) being complete first.

**Decision**: Deferred to a Brim-wave AR specification session, building on Heim universe design.

**Deferred To**: Wave 5 (Brim) — dedicated AR / void visualization session. Depends on Heim universe design being complete.

**Notes for Future Session**:
- What does the void look like as environment/landscape? (abstract vs. literal vs. symbolic)
- How do the three void dimensions (1/1+1/1+community) manifest visually?
- How does AR overlay work? (anywhere vs. geofenced vs. context-triggered)
- How is distance/gap to FringeIsland perceived in AR? (visual metaphors, spatial representation)
- Can FIMs see their own Whisp in AR? (first-person vs. third-person perspective)
- Can FIMs see other Whisps in the void? (solo vs. visible to others)

**Key Established Principles (Session 03)**:
- Vast void: AR shows void itself, FringeIsland obscured
- Shrinking void: Both void and FringeIsland visible, overlapping
- Collapsed void: FringeIsland completely overlays ordinary world
- AR becomes progress indicator (phenomenological, not gamified)

---

### Respawning Mechanics — NEW FROM SESSION 03

**Topic**: The detailed mechanics of Whisp "death" and respawn in the void.
**Status:** Re-accepted by Urd (Beyond) — re-deferred from Hamn 2026-04-07

**Context**: Session 03 established the Edge of Tomorrow model conceptually — Whisp dies → respawns → retains insight from failure → learns → tries again. Respawning is information-rich (not punishment), reveals current limits/immunities/patterns, builds mastery through repetition. But the detailed mechanics are unspecified.

**Decision**: Deferred to dedicated specification session. Edge of Tomorrow framing is locked, mechanics need detailed design.

**Deferred To**: Urd (Beyond) — re-deferred from Hamn 2026-04-07

**Notes for Future Session**:
- What triggers respawn? (What counts as Whisp "death" in the void?)
- Where do you respawn? (Same place? Checkpoint? Safe Harbour?)
- What information is revealed through respawn? (Mechanics of insight delivery)
- How do Episodes change respawn behavior? (Void adaptation, narrative justification)
- What is the visual/experiential moment of respawning? (UI/UX design)
- How does respawning connect to Immunity to Change (Kegan)? (Hidden commitments revealed through failure patterns)
- How does respawn frequency/consequence change with Whisp fullness?
- Is there a cost/consequence to respawning beyond lost progress?

**Key Established Principles (Session 03)**:
- Respawning is the learning mechanism (failure = information)
- Each death reveals something about current limits
- Mastery builds through accumulated attempts
- Fits "failure is information, not punishment" principle

---

### Whisp Encounter Phenomenology — CARRIED FROM SESSION 02

**Topic**: What a Whisp Encounter actually looks and feels like at different stages of Whisp fullness.
**Status:** Re-accepted by Eid (Wave 2) — re-deferred from Hamn 2026-04-07

**Context**: The Whisp is each FIM's personal future self — their instrument in the void. Session 02 established that the Whisp begins nearly empty and fills over time as the FIM gathers self-knowledge. Session 03 established the three-dimensional void model but did not address encounter phenomenology (Goal 2 from Session 03 bridge, carried from Session 02).

**Decision**: Parked from Session 02, remained parked in Session 03. Requires dedicated exploration.

**Deferred To**: Wave 2 (Eid) — dedicated specification session. Will benefit from universe design work (Heim) for fully-realized encounter visuals.

**Notes for Future Session**:
- What does a Whisp Encounter actually look and feel like?
- How does encounter quality change with Whisp fullness (empty/mid/full)?
- What is the texture of a genuine encounter beat? (Present → Ask → Change in Encounter family)
- How does Theory U's "presencing" map to FringeIsland encounters?
- What distinguishes a profound encounter from a superficial one?
- How do encounters differ across the three void dimensions (1 vs. 1+1 vs. 1+community)?
- What role do encounters play in Episode narrative vs. standalone journeys?

---

### The Whisp's Practical UI Experience

**Topic**: How a member actually experiences their Whisp on the platform day-to-day — visibility, interaction, growth signals.
**Status:** Re-accepted by Eid (Wave 2) — re-deferred from Hamn 2026-04-07

**Context**: Session 01 defined the Whisp conceptually (personal future self, dual nature as Encounter and Companion, permanent presence) and architecturally (Traveler + Companionship Record). What remains unspecified is the *felt experience* — what the member sees, hears, or senses. The Whisp begins nearly silent and becomes more coherent over time, but the practical UX of that progression has not been designed.

**Decision**: Parked. The Whisp is the most intimate concept in FringeIsland and its UX deserves focused attention, not a side conversation.

**Deferred To**: Wave 2 (Eid) — dedicated specification session. Prerequisite for Whisp implementation.

**Notes for Future Session**:
- Is the Whisp visible? Does it have a visual representation?
- How does the member first encounter their Whisp during onboarding?
- What does the Whisp "whispering back" look like in practice — notifications, ambient presence, structured encounters?
- How does the member perceive the Whisp's growth as it fills over time?
- How is the Whisp surfaced without being intrusive — honouring the non-judgment principle?

---

### Three Worlds UI Design

**Topic**: How the Three Worlds (Ordinary World, Safe Harbour, The Other Side) manifest in the platform's user interface — visual language, world transitions, spatial experience.
**Status:** Re-accepted by Urd (Beyond) — re-deferred from Hamn 2026-04-07

**Scope clarification (2026-04-07):** Hamn (Wave 3) defines the **generic web app UI / design system / accessibility / UX redesign** — it does NOT define the Three Worlds visual identity. The Three Worlds visual experience is a much later concern, sitting alongside the Heim universe design (Wave 4) and the AR void visualization (Wave 5), and depends on both. It is therefore an Urd-level deliverable.

**Context**: Session 01 established the Three Worlds as the Hero's Journey made spatial — departure, ordeal, return. Each world has distinct character, purpose, and emotional register. The journey designer needs spatial context (where does this journey begin, where does it take the traveler, where does it end?). But the UI/UX design of how world transitions are *felt* by the member has not been explored.

**Decision**: Parked. The Three Worlds structure is foundational to the platform's identity and requires dedicated visual/UX design work — but only after Heim universe design and Brim AR work have established the visual vocabulary.

**Deferred To**: Urd (Beyond) — dedicated design session. Depends on Heim universe design and Brim AR void visualization being complete.

**Notes for Future Session**:
- Does the platform look different in each world? (Colour, typography, ambient elements)
- Is crossing between worlds a felt transition or a transparent one?
- How does the Safe Harbour feel different from The Other Side?
- How does the ordinary world (off-platform) connect back — notifications, prompts, integration moments?
- How do the Three Worlds relate to the existing L0-L7 architecture layers?

---

## Process Notes

### How to Use This Document

When revisiting a deferred decision:

1. **Review Context**: Understand why it was deferred
2. **Gather Data**: User feedback, usage analytics, competitive research
3. **Design Solution**: Create detailed design doc
4. **Validate**: Prototype, user testing, technical spike
5. **Implement**: Add to roadmap, build, test, launch
6. **Update Docs**: Move from "deferred" to "implemented"

### Adding New Deferred Decisions

When deferring a new decision:

1. Use the standard format (Topic, Context, Decision, Deferred To, Notes)
2. Explain rationale for deferral
3. Include enough context for future revisit
4. Reference relevant docs/discussions
5. Update regularly as new info emerges

---

**Document Version**: 1.8
**Last Updated**: April 7, 2026 (Wave redistribution sweep — 6-wave arc assignments)
**Next Review**: Quarterly or as deferred items are implemented

**Recent Updates**:
- v1.8 (2026-04-07): Wave redistribution sweep across the new 6-wave arc (Ferd → Eid → Hamn → Heim → Brim → Urd). All 17 previously "Wave TBD" items assigned. Items pulled into Ferd (Wave 1): Group-to-Group Relationships UI and Subgroups (deleted from this document, moved to SPRINT.md Work Stream 1). Item split: FringeIsland Universe Design (Heim, Wave 4) separated from AR Void Visualization (Brim, Wave 5). Re-deferrals from Hamn: Journey Discovery & Search → Eid; Mobile Application → Brim; Advanced Analytics Dashboard → Urd; Monetization Strategy → Urd+; Seasons and Episodes → Urd; NPC Behaviour Authoring → Urd; Whisp Encounter Phenomenology → Eid; Whisp Practical UI → Eid; Three Worlds UI Design → Urd. Scope clarification: Hamn defines the generic web app UI / design system / accessibility; it does NOT define the Three Worlds visual identity.
- v1.7 (2026-04-05): Hamn deferral acceptance sweep — marked 13 items with acceptance status. Added deferral protocol reference. Added Status field to format section. Respawning Mechanics re-deferred (later resolved in v1.8 → Urd).
- Session 03 (2026-03-27): Marked Seasons and Episodes as PARTIALLY RESOLVED (conceptual architecture established). Added 3 new deferrals: FringeIsland Universe Design & AR Void Visualization, Respawning Mechanics, Whisp Encounter Phenomenology (carried from Session 02). All deferred to Wave TBD — pending work package redistribution (see WAVE_REDISTRIBUTION.md) specification sessions.
- Session 01 (2026-03-20): Added 4 parked items from Journey Designer Discovery Session — Seasons and Episodes, NPC behaviour authoring, Whisp practical UX, Three Worlds UI design. All deferred to Wave TBD — pending work package redistribution (see WAVE_REDISTRIBUTION.md) specification sessions.
- v0.2.36: Added lifecycle sprint deferrals (D-R1 through D-R5) from `lifecycle-roadmap-decisions.md` — self-service platform exit, configurable timeouts, GDPR content erasure all explicitly deferred.
- v0.2.17: Marked Permission Inheritance as RESOLVED (D5/D7/D10/D12). Marked Subgroups design as RESOLVED (D7/D9/D10/D11/D15). Marked Group-to-Group Relationships design as RESOLVED (D7/D11/D21). Updated Notifications (IMPLEMENTED v0.2.14), Forum (PARTIALLY IMPLEMENTED v0.2.14), DM (IMPLEMENTED v0.2.15).
- v0.2.10: No new deferred decisions (journey enrollment completed as planned)
- v0.2.9: Error handling implemented (was not deferred, added proactively)
- v0.2.8: Journey catalog implemented (no major deferrals)