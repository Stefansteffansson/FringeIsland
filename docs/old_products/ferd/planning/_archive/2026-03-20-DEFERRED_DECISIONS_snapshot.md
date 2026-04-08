# Deferred Decisions

This document tracks design decisions, features, and questions that have been deferred to later waves of FringeIsland development. Each item includes context, rationale for deferral, and notes for future implementation.

## Format

Each deferred decision includes:
- **Topic**: What question or feature is deferred
- **Context**: Why this came up
- **Decision**: What was decided for now
- **Deferred To**: Which wave to revisit
- **Notes**: Important considerations for future implementation

---

## Permission System

### Permission Inheritance Between Parent/Child Groups — RESOLVED

**Topic**: How should permissions flow between parent and child groups in hierarchical structures?

**Status:** **RESOLVED** by RBAC design decisions D5, D7, D10, D12 (February 2026). See `docs/features/implemented/dynamic-permissions-system.md`.

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

**Context**: During permission list definition, the question arose whether we need fine-grained permissions like:
- Creating journeys from scratch vs. duplicating existing ones
- Editing your own journeys vs. collaborative editing
- Publishing vs. unpublishing journeys

**Decision**: Use simple `create_journey`, `edit_journey`, `publish_journey` permissions for Wave 1 (Ferd).

**Deferred To**: Wave 2 (Hamn) (when user-created journeys are implemented)

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

In Wave 2 (Hamn), user-generated content creates new scenarios:
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

## Group Management

### Managing Group-to-Group Relationships — PARTIALLY RESOLVED

**Topic**: How should users manage complex relationships when groups are members of other groups?

**Status:** **Design RESOLVED** by RBAC decisions D7, D11, D21 (February 2026). **UI still deferred.** See `docs/features/implemented/dynamic-permissions-system.md`.

**What's resolved (design + schema):**
- **D7:** Universal group-to-group membership model. Personal groups and engagement groups use the same joining mechanism.
- **D11:** Circularity prevention via `BEFORE INSERT` trigger with recursive CTE check. **Designed but NOT yet implemented** — must be built before shipping group-joins-group UI.
- **D21:** Joining groups get Member role by default. Host Steward can promote/restrict.
- **D15:** Schema migrated, engagement group as member verified by integration tests, `has_permission()` is type-agnostic.

**What's still deferred (UI, Wave 2 (Hamn)+):**
- Group-joins-group request/acceptance UI (⚠️ **requires D11 circularity trigger first**)
- Hierarchy visualization (tree view, breadcrumbs)
- Attribution display ("Mogwai in 'Alpha'" chain)
- Joining-group role management UI (host Steward configures roles for joining groups)

---

### Subgroups / Groups-Join-Groups — DESIGN RESOLVED, UI DEFERRED

**Topic**: Should Phase 1.3 include the ability for groups to have other groups as members?

**Original Decision (Jan 26, 2026)**: Defer subgroups to Wave 2 (Hamn).

**Status:** **Design RESOLVED** by RBAC decisions D7, D9, D10, D11, D15 (February 2026). **UI still deferred to Wave 2 (Hamn).** See `docs/features/implemented/dynamic-permissions-system.md`.

**What's resolved (design + schema):**
- **D7:** Universal group-to-group membership model (personal groups and engagement groups use same mechanism)
- **D9:** Personal group = user identity (auto-created on signup, bridges user to groups)
- **D10:** Transitive membership with configurable depth (unlimited by default)
- **D11:** Circularity prevention via `BEFORE INSERT` trigger with recursive CTE
- **D15:** Schema migrated to `member_group_id` only (drop `user_id` from memberships)
- **D12:** Multiple paths to same group = union of permissions
- **D21:** Joining groups get Member role by default

**What's implemented (Sub-Sprint 1, v0.2.16):**
- ✅ `group_type` column on `groups` table ('system', 'personal', 'engagement')
- ✅ Personal groups auto-created on signup
- ✅ System groups created (FI Members, Visitor, Deusex)
- ✅ Permission catalog (41 permissions) and template permissions (57 rows)

**What's still deferred (UI, Wave 2 (Hamn)+):**
- Group-joins-group request/acceptance UI
- Hierarchy visualization (tree view, breadcrumbs)
- Attribution display ("Mogwai in 'Alpha'" chain)
- Circularity prevention trigger (D11 — designed, not yet implemented)
- Depth limit configuration

**⚠️ Important: Circularity prevention (D11) MUST be implemented before shipping group-joins-group UI.**
The schema allows any group to join any group — nothing prevents A → B → A circular memberships today. This is safe while only personal groups join engagement groups (personal groups can't form cycles), but the D11 `BEFORE INSERT` trigger with recursive CTE check is a **prerequisite** for enabling the group-joins-group UI. Without it, users could create infinite permission resolution loops.

**What's been completed since original deferral:**
- ✅ `user_id` → `member_group_id` migration (D15, v0.2.29)
- ✅ Schema verified: engagement groups can join other groups at DB level (D15 Hardening, tested in `groups-join-groups.test.ts`)
- ✅ `has_permission()` is type-agnostic — works with any group as actor

**Original rationale still valid for UI deferral:**
- Learn actual user needs before building complex hierarchy UI
- Schema foundation is in place; UI can be added incrementally

---

## Journey System

### Dynamic Journey Path Changes

**Topic**: How should journeys adapt their paths based on user actions during the journey?

**Context**: Wave 3 introduces dynamic/adaptive journeys where the path can change based on what users do. This requires a significant architectural shift from linear journeys.

**Decision**: Wave 1 (Ferd) and Wave 2 (Hamn) use linear (A→B) journey structure. Dynamic journeys are Wave 3.

**Deferred To**: Wave 3 (Dynamic Journeys)

**Notes for Future Implementation**:

**Architecture Changes Needed:**

1. **Journey Structure**
   ```
   Linear (Wave 1–2):
   Step 1 → Step 2 → Step 3 → Complete

   Dynamic (Wave 3):
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

**Context**: Journey creators may want to update content, but users are mid-journey. Do they see old or new version?

**Decision**: Wave 1 (Ferd) doesn't support journey updates. Wave 2 (Hamn)+ handles versioning.

**Deferred To**: Wave 2 (Hamn)

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

**Context**: Wave 1 (Ferd) has basic journey list. Wave 2 (Hamn)+ needs sophisticated discovery.

**Decision**: Simple list/browse for Wave 1 (Ferd). Advanced discovery in Wave 2 (Hamn).

**Deferred To**: Wave 2 (Hamn)

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

**Context**: Platform is web-based (responsive). Native apps could improve experience. High-level platform strategy, device approach, and the relationship between digital products, physical products, events, and the game are addressed in [`docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md`](../../../../old_universe/strategy/PRODUCTS_AND_PLATFORM.md).

**Decision**: Web-first for Wave 1 (Ferd). Consider mobile apps based on demand.

**Deferred To**: Wave 2 (Hamn)+ (if user demand is high)

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

**Wave 2 (Hamn)+ Enhancements:**
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

**Context**: Wave 1 (Ferd) has basic analytics. Users may want deeper insights.

**Decision**: Basic analytics in Wave 1 (Ferd). Advanced dashboard in Wave 2 (Hamn)+.

**Deferred To**: Wave 2 (Hamn)

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

**Context**: Wave 1 (Ferd) focus is product-market fit. Monetization comes later.

**Decision**: Determine monetization strategy after validating product.

**Deferred To**: Wave 2 (Hamn)+ (once product validated)

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

## Journey Designer — Parked from Session 01

*These items were explicitly parked during the Journey Designer Discovery Session 01 (March 20, 2026). Each requires a dedicated specification session before implementation. See `docs/planning/sessions/2026-03-20-JOURNEY_DESIGNER_SESSION.md` for full context.*

### Seasons and Episodes

**Topic**: The temporal narrative structure of the FringeIsland universe — storytelling arcs that drive Type 4 (AI-Generative) journeys and animate The Other Side.

**Context**: Session 01 established that the FringeIsland universe is driven by Immersive Edutainment where "tainment" means character-driven, Hero's Journey-structured narrative. Seasons and Episodes are the temporal structure of that narrative, especially relevant for Type 4 journeys and The Other Side. The concept was raised but deliberately not explored — it is too large and consequential to be a side conversation.

**Decision**: Parked for a dedicated design session. The journey data model accommodates Seasons and Episodes in reserved fields (`narrative_state` JSON on journeys) without requiring them to be specified now.

**Deferred To**: Wave 2 (Hamn) — dedicated specification session before any narrative system implementation.

**Notes for Future Session**:
- How do Seasons structure the passage of time in the FringeIsland world?
- How do Episodes create shared narrative moments across the community?
- How do Seasons interact with Type 4 journey generation?
- What is the relationship between Seasons and the Whisp's accumulation?

---

### NPC Behaviour Authoring

**Topic**: The mechanism by which NPCs are calibrated to serve their developmental function — drawing travelers toward their growth zone without pushing them into the panic zone.

**Context**: Session 01 established that NPCs are not decorative — they are calibrated agents of productive discomfort, targeting the growth zone using a three-zone model (comfort/growth/panic). The developmental *intention* is clear, but the *mechanism* is not. Is it prompt engineering? A behaviour graph? A learning model? Who authors NPC behaviour and at what layer?

**Decision**: Parked. The NPC concept is foundational to the Encounter content family and the Road system, but the authoring and calibration mechanism requires its own design thread.

**Deferred To**: Wave 2 (Hamn) — dedicated specification session. Prerequisite for any NPC implementation.

**Notes for Future Session**:
- Who authors NPC behaviour — journey designers, world architects, or the AI layer?
- How is NPC calibration tested and tuned?
- How do NPCs maintain personality continuity across encounters with the same traveler?
- How do NPC arcs (their own journeys) interact with the traveler's journey?
- What feedback loops exist between NPC interactions and calibration quality?

---

### The Whisp's Practical UI Experience

**Topic**: How a member actually experiences their Whisp on the platform day-to-day — visibility, interaction, growth signals.

**Context**: Session 01 defined the Whisp conceptually (personal future self, dual nature as Encounter and Companion, permanent presence) and architecturally (Traveler + Companionship Record). What remains unspecified is the *felt experience* — what the member sees, hears, or senses. The Whisp begins nearly silent and becomes more coherent over time, but the practical UX of that progression has not been designed.

**Decision**: Parked. The Whisp is the most intimate concept in FringeIsland and its UX deserves focused attention, not a side conversation.

**Deferred To**: Wave 2 (Hamn) — dedicated specification session. Prerequisite for Whisp implementation.

**Notes for Future Session**:
- Is the Whisp visible? Does it have a visual representation?
- How does the member first encounter their Whisp during onboarding?
- What does the Whisp "whispering back" look like in practice — notifications, ambient presence, structured encounters?
- How does the member perceive the Whisp's growth as it fills over time?
- How is the Whisp surfaced without being intrusive — honouring the non-judgment principle?

---

### Three Worlds UI Design

**Topic**: How the Three Worlds (Ordinary World, Safe Harbour, The Other Side) manifest in the platform's user interface — visual language, world transitions, spatial experience.

**Context**: Session 01 established the Three Worlds as the Hero's Journey made spatial — departure, ordeal, return. Each world has distinct character, purpose, and emotional register. The journey designer needs spatial context (where does this journey begin, where does it take the traveler, where does it end?). But the UI/UX design of how world transitions are *felt* by the member has not been explored.

**Decision**: Parked. The Three Worlds structure is foundational to the platform's identity and requires dedicated visual/UX design work.

**Deferred To**: Wave 2 (Hamn) — dedicated design session. Prerequisite for Hamn visual identity.

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

**Document Version**: 1.5
**Last Updated**: March 20, 2026 (Journey Designer Session 01)
**Next Review**: Quarterly or as deferred items are implemented

**Recent Updates**:
- Session 01 (2026-03-20): Added 4 parked items from Journey Designer Discovery Session — Seasons and Episodes, NPC behaviour authoring, Whisp practical UX, Three Worlds UI design. All deferred to Wave 2 (Hamn) specification sessions.
- v0.2.36: Added lifecycle sprint deferrals (D-R1 through D-R5) from `lifecycle-roadmap-decisions.md` — self-service platform exit, configurable timeouts, GDPR content erasure all explicitly deferred.
- v0.2.17: Marked Permission Inheritance as RESOLVED (D5/D7/D10/D12). Marked Subgroups design as RESOLVED (D7/D9/D10/D11/D15). Marked Group-to-Group Relationships design as RESOLVED (D7/D11/D21). Updated Notifications (IMPLEMENTED v0.2.14), Forum (PARTIALLY IMPLEMENTED v0.2.14), DM (IMPLEMENTED v0.2.15).
- v0.2.10: No new deferred decisions (journey enrollment completed as planned)
- v0.2.9: Error handling implemented (was not deferred, added proactively)
- v0.2.8: Journey catalog implemented (no major deferrals)
