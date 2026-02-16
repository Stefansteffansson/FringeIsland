# Deferred Decisions

This document tracks design decisions, features, and questions that have been deferred to later phases of FringeIsland development. Each item includes context, rationale for deferral, and notes for future implementation.

## Format

Each deferred decision includes:
- **Topic**: What question or feature is deferred
- **Context**: Why this came up
- **Decision**: What was decided for now
- **Deferred To**: Which phase to revisit
- **Notes**: Important considerations for future implementation

---

## Permission System

### Permission Inheritance Between Parent/Child Groups — RESOLVED

**Topic**: How should permissions flow between parent and child groups in hierarchical structures?

**Status:** **RESOLVED** by RBAC design decisions D5, D7, D10, D12 (February 2026). See `docs/features/planned/dynamic-permissions-system.md`.

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

**Decision**: Use simple `create_journey`, `edit_journey`, `publish_journey` permissions for Phase 1.

**Deferred To**: Phase 2 (when user-created journeys are implemented)

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

In Phase 2, user-generated content creates new scenarios:
- **Quality Control**: Maybe only certain users can publish to public marketplace
- **Collaboration**: Different editing rights for collaborators vs. owners
- **Monetization**: If paid journeys exist, publishing permissions become sensitive
- **IP Protection**: Users may want granular control over who can duplicate/edit

**Before Implementation:**
- Observe how users actually create/edit journeys in Phase 1
- Identify pain points with coarse permissions
- Survey users on desired granularity
- Design permission UI that doesn't overwhelm users

---

## Group Management

### Managing Group-to-Group Relationships — PARTIALLY RESOLVED

**Topic**: How should users manage complex relationships when groups are members of other groups?

**Status:** **Design RESOLVED** by RBAC decisions D7, D11, D21 (February 2026). **UI still deferred.** See `docs/features/planned/dynamic-permissions-system.md`.

**What's resolved (design):**
- **D7:** Universal group-to-group membership model. Personal groups and engagement groups use the same joining mechanism.
- **D11:** Circularity prevention via `BEFORE INSERT` trigger with recursive CTE check.
- **D21:** Joining groups get Member role by default. Host Steward can promote/restrict.

**What's still deferred (UI, Phase 2+):**
- Group-joins-group request/acceptance UI
- Hierarchy visualization (tree view, breadcrumbs)
- Attribution display ("Mogwai in 'Alpha'" chain)
- Joining-group role management UI (host Steward configures roles for joining groups)

---

### Subgroups / Groups-Join-Groups — DESIGN RESOLVED, UI DEFERRED

**Topic**: Should Phase 1.3 include the ability for groups to have other groups as members?

**Original Decision (Jan 26, 2026)**: Defer subgroups to Phase 2.

**Status:** **Design RESOLVED** by RBAC decisions D7, D9, D10, D11, D15 (February 2026). **UI still deferred to Phase 2.** See `docs/features/planned/dynamic-permissions-system.md`.

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

**What's still deferred (UI, Phase 2+):**
- Group-joins-group request/acceptance UI
- Hierarchy visualization (tree view, breadcrumbs)
- Attribution display ("Mogwai in 'Alpha'" chain)
- `user_id` → `member_group_id` migration for existing memberships (D15)
- Circularity prevention trigger (D11 — designed, not yet implemented)
- Depth limit configuration

**Original rationale still valid for UI deferral:**
- Learn actual user needs before building complex hierarchy UI
- Schema foundation is in place; UI can be added incrementally

---

## Journey System

### Dynamic Journey Path Changes

**Topic**: How should journeys adapt their paths based on user actions during the journey?

**Context**: Phase 3 introduces dynamic/adaptive journeys where the path can change based on what users do. This requires a significant architectural shift from linear journeys.

**Decision**: Phase 1 and 2 use linear (A→B) journey structure. Dynamic journeys are Phase 3.

**Deferred To**: Phase 3 (Dynamic Journeys)

**Notes for Future Implementation**:

**Architecture Changes Needed:**

1. **Journey Structure**
   ```
   Linear (Phase 1-2):
   Step 1 → Step 2 → Step 3 → Complete
   
   Dynamic (Phase 3):
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

**Decision**: Phase 1 doesn't support journey updates. Phase 2+ handles versioning.

**Deferred To**: Phase 2

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

**Context**: Phase 1 has basic journey list. Phase 2+ needs sophisticated discovery.

**Decision**: Simple list/browse for Phase 1. Advanced discovery in Phase 2.

**Deferred To**: Phase 2

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

**Context**: Platform is web-based (responsive). Native apps could improve experience.

**Decision**: Web-first for Phase 1. Consider mobile apps based on demand.

**Deferred To**: Phase 2+ (if user demand is high)

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

**Decision**: Basic accessibility for Phase 1. Enhanced features as needed.

**Deferred To**: Ongoing (continuous improvement)

**Accessibility Standards:**

**WCAG 2.1 Level AA (Target):**
- Screen reader support
- Keyboard navigation
- Color contrast
- Alt text for images
- Captions for videos
- Focus indicators

**Phase 1 Basics:**
- Semantic HTML
- ARIA labels where needed
- Keyboard shortcuts
- Responsive text sizing

**Phase 2+ Enhancements:**
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

**Context**: Phase 1 has basic analytics. Users may want deeper insights.

**Decision**: Basic analytics in Phase 1. Advanced dashboard in Phase 2+.

**Deferred To**: Phase 2

**Analytics by User Type:**

**Individual Users:**
- My journey progress over time
- Completion rates
- Time spent on journeys
- Skill development tracking
- Comparison to peers (opt-in)

**Travel Guides:**
- Member progress overview
- Drop-off points
- Completion rates by journey
- Engagement metrics
- Feedback effectiveness

**Group Leaders:**
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

**Decision**: English-only for Phase 1. i18n in later phase if expanding internationally.

**Deferred To**: Post-Phase 1 (based on international demand)

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

**Context**: Phase 1 has basic auth + RLS. Additional security for sensitive use cases.

**Decision**: Standard security for Phase 1. Enhanced features as needed.

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

**Context**: Phase 1 targets hundreds of users. Future phases need thousands+.

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

**Context**: Phase 1 focus is product-market fit. Monetization comes later.

**Decision**: Determine monetization strategy after validating product.

**Deferred To**: Phase 2+ (once product validated)

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

**Document Version**: 1.3
**Last Updated**: February 16, 2026 (v0.2.17)
**Next Review**: Quarterly or as deferred items are implemented

**Recent Updates**:
- v0.2.17: Marked Permission Inheritance as RESOLVED (D5/D7/D10/D12). Marked Subgroups design as RESOLVED (D7/D9/D10/D11/D15). Marked Group-to-Group Relationships design as RESOLVED (D7/D11/D21). Updated Notifications (IMPLEMENTED v0.2.14), Forum (PARTIALLY IMPLEMENTED v0.2.14), DM (IMPLEMENTED v0.2.15).
- v0.2.10: No new deferred decisions (journey enrollment completed as planned)
- v0.2.9: Error handling implemented (was not deferred, added proactively)
- v0.2.8: Journey catalog implemented (no major deferrals)
