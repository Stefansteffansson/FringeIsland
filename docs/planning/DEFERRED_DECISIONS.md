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

### Permission Inheritance Between Parent/Child Groups

**Topic**: How should permissions flow between parent and child groups in hierarchical structures?

**Context**: During architectural planning, we recognized that groups can have parent-child relationships (groups containing other groups). The question arose: should a user who is Admin in a parent group automatically have permissions in child groups?

**Decision**: Defer to post-Phase 1. For MVP, groups will have isolated permission scopes.

**Rationale**:
- Permission inheritance adds significant complexity to authorization logic
- Different organizational patterns need different inheritance rules
- Need real user feedback to understand which patterns are most useful
- Can be added later without breaking existing groups

**Deferred To**: Phase 2 (User-Generated Content)

**Notes for Future Implementation**:

**Design Pattern Options:**

1. **Parent → Child (Cascade Down)**
   ```
   Acme Corp (Parent) - Stefan is Admin
   └─> Marketing Team (Child) - Stefan automatically has Admin permissions
   ```
   
   **Use Cases:**
   - Organizational hierarchies where parent admins need control
   - Companies wanting central oversight of all teams
   
   **Implementation:**
   - Stored in `groups.settings`: `{"inheritance": "parent_to_child"}`
   - Authorization checks must traverse up parent chain
   - Performance consideration: Cache parent-child relationships

2. **Child → Parent (Bubble Up)**
   ```
   Marketing Team (Child) - Stefan is Admin
   └─> Acme Corp (Parent) - Stefan automatically has Observer role
   ```
   
   **Use Cases:**
   - Visibility/reporting where child leaders need parent access
   - Bottom-up organizational structures
   
   **Implementation:**
   - Configure which child role maps to which parent role
   - Stored in `groups.settings`: `{"inheritance": "child_to_parent", "role_mappings": {...}}`

3. **Isolated (No Inheritance)**
   ```
   Each group has completely independent permissions
   ```
   
   **Use Cases:**
   - Groups wanting full autonomy
   - Privacy-sensitive scenarios
   
   **Implementation:**
   - Default behavior (already implemented)

**Technical Considerations:**

- **Performance**: Inheritance checks could require multiple database queries
  - Solution: Cache permission sets, precompute inheritance chains
  
- **Security**: Inheritance could create unintended access
  - Solution: Make inheritance opt-in, show clear warnings
  
- **UI/UX**: Users need to understand inherited permissions
  - Solution: Clear visual indication of inherited vs. direct permissions
  
- **Database**: RLS policies become more complex
  - Solution: Create helper functions for permission checks

**Example Configuration Schema:**
```json
{
  "inheritance": "parent_to_child" | "child_to_parent" | "isolated",
  "role_mappings": {
    "child_role_id": "parent_role_id"  // For child→parent inheritance
  },
  "inheritance_depth": 1,  // How many levels to inherit (1 = direct parent only)
  "override_allowed": true  // Can child groups override inherited permissions?
}
```

**Before Implementation:**
- Conduct user research on which patterns are needed
- Test with 3-5 beta organizations with different structures
- Benchmark performance impact
- Create comprehensive test suite for inheritance scenarios

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

### Managing Group-to-Group Relationships

**Topic**: How should users manage complex relationships when groups are members of other groups?

**Context**: Groups can be members of parent groups, but we haven't designed the management interface for creating, viewing, and modifying these relationships.

**Decision**: For Phase 1, implement basic "add group as member" functionality. Defer advanced relationship management.

**Deferred To**: Phase 2

**Notes for Future Implementation**:

**Management Interface Needs:**

1. **Visualizing Hierarchy**
   - Tree view of group relationships
   - Graph view for complex networks
   - Breadcrumb navigation
   - Parent/child group indicators

2. **Creating Relationships**
   - Add existing group as member
   - Create new subgroup directly
   - Bulk operations (add multiple groups)

3. **Modifying Relationships**
   - Remove group from parent
   - Transfer group to different parent
   - Reorder groups (if ordering matters)

4. **Permissions for Relationships**
   - Who can add/remove group relationships?
   - Do both parent and child need to consent?
   - Can groups reject membership in parent?

**Complex Scenarios to Consider:**

```
Scenario 1: Circular Relationships (MUST PREVENT)
Group A → member of → Group B → member of → Group A (BAD!)

Prevention:
- Check for cycles before allowing relationship
- Traverse parent chain to ensure no loops

Scenario 2: Multi-Parent Memberships (ALLOWED)
Group A → member of → Group B
         └→ member of → Group C

UI Challenge:
- Show all parent groups clearly
- Handle conflicting settings from multiple parents

Scenario 3: Deep Hierarchies (PERFORMANCE CONCERN)
Org → Division → Department → Team → Sub-team → Working Group

Performance:
- Limit depth (e.g., max 5 levels)?
- Cache hierarchy for performance
- Lazy load deep branches
```

**UI Mockup Considerations:**

```
Group Settings → Relationships Tab

Parent Groups:
┌───────────────────────────────────┐
│ ▪ Acme Corporation               │
│   Added: 2025-01-15              │
│   [View] [Leave Group]           │
│                                   │
│ ▪ Tech Startups Alliance         │
│   Added: 2025-01-10              │
│   [View] [Leave Group]           │
│                                   │
│ [+ Join Group]                   │
└───────────────────────────────────┘

Subgroups:
┌───────────────────────────────────┐
│ ▪ Marketing Team (12 members)    │
│   Added: 2025-01-16              │
│   [Manage] [Remove]              │
│                                   │
│ ▪ Design Team (5 members)        │
│   Added: 2025-01-17              │
│   [Manage] [Remove]              │
│                                   │
│ [+ Add Existing Group]           │
│ [+ Create New Subgroup]          │
└───────────────────────────────────┘
```

**Before Implementation:**
- Test with real organizations with complex structures
- Decide on depth limits (if any)
- Design cycle prevention algorithm
- Create comprehensive relationship management UI

---

### Subgroups Implementation (Added January 26, 2026)

**Topic**: Should Phase 1.3 include the ability for groups to have other groups as members?

**Context**: During Phase 1.3 Role Assignment UI implementation (January 26, 2026), we reached a decision point: implement basic role management now, or also implement the full subgroups feature. The database schema already supports subgroups via `group_memberships.member_group_id`, but implementing the UI and business logic would add significant complexity.

**Decision**: Defer subgroups to Phase 2. Complete basic role assignment UI first.

**Deferred To**: Phase 2 (Enhanced Features)

**Rationale**:
- **High Complexity**: Requires circular reference prevention, depth limit enforcement, and permission inheritance rules
- **Time Savings**: Deferring saves 3-5 weeks of development time  
- **Faster to MVP**: Basic role management delivers immediate value without subgroup complexity
- **Better Validation**: Learn actual user needs before building complex hierarchy features
- **Database Ready**: `member_group_id` field exists, so adding feature later requires no migration
- **Lower Risk**: Can observe how users actually organize groups before building assumptions into the system

**Current State (v0.2.6.2)**:
- ✅ Database schema fully supports subgroups (`member_group_id` in `group_memberships`)
- ✅ Constraint prevents both `user_id` and `member_group_id` from being set
- ✅ RLS policies don't block group-as-member operations
- ❌ No UI for adding groups as subgroups
- ❌ No circular reference prevention (would allow Group A → B → A)
- ❌ No depth limit enforcement
- ❌ No permission inheritance rules defined
- ❌ No hierarchy visualization

**Notes for Future Implementation**:

**Critical Architecture Decisions:**

1. **Circular Reference Prevention** (REQUIRED)
   ```
   Problem: Without prevention, users could create:
   Group A → member of → Group B → member of → Group A (infinite loop)
   
   Solution: Implement cycle detection before allowing membership
   
   Options:
   a) Database trigger (most reliable)
   b) Application-level check (easier to test)
   c) Both (recommended)
   
   Pseudocode:
   function canAddAsSubgroup(parentId, childId) {
     visited = Set()
     current = childId
     
     while (current has parent) {
       if (current === parentId) return false  // Would create cycle
       if (visited.has(current)) return false  // Already visited
       visited.add(current)
       current = getParent(current)
     }
     
     return true
   }
   ```

2. **Depth Limits** (RECOMMENDED)
   ```
   Question: How deep should hierarchies be allowed to go?
   
   Options:
   a) Unlimited (simple but risky for performance)
   b) Fixed limit like 5 levels (recommended)
   c) Configurable per organization (complex)
   
   Example with 5-level limit:
   Organization → Division → Department → Team → Squad (✅ allowed)
   Organization → ... → Sub-sub-sub-sub-team (❌ blocked at level 6)
   
   Implementation:
   - Add trigger to count hierarchy depth before insert
   - Show warning in UI when approaching limit
   - Make configurable in Phase 3 if needed
   ```

3. **Permission Inheritance** (COMPLEX)
   ```
   Question: Do roles in parent groups apply to child groups?
   
   Options:
   a) Isolated - Each group has independent permissions (simplest)
   b) Parent→Child - Parent admins automatically control children
   c) Child→Parent - Child leaders get observer access to parents  
   d) Configurable per relationship
   
   Recommendation for Phase 2:
   - Start with ISOLATED (option a)
   - Prevents unintended access
   - Simpler to reason about
   - Add inheritance in Phase 3 based on user demand
   
   See also: "Permission Inheritance Between Parent/Child Groups" (above)
   ```

4. **Multiple Parents**
   ```
   Question: Can one group belong to multiple parent groups?
   
   Current schema: YES (no unique constraint on member_group_id)
   
   Example:
   "Marketing Team" → member of → "Product Division"
                   → member of → "Customer Success Org"
   
   Implications:
   - More flexible (can model matrix organizations)
   - More complex (which parent's settings apply?)
   - Harder UI (multiple hierarchy paths)
   
   Recommendation: 
   - Allow it (don't add constraint)
   - Warn users about complexity
   - Show all parent paths in UI
   ```

**UI Design Considerations:**

```
Group Settings Page → New "Subgroups" Tab

┌─────────────────────────────────────────────┐
│ Parent Groups                               │
│ (Groups this group belongs to)              │
│                                             │
│ ▪ Acme Corporation                          │
│   Added: Jan 15, 2026 by Stefan Test        │
│   [View Group] [Leave]                      │
│                                             │
│ [+ Join Existing Group]                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Child Groups                                │
│ (Groups that are members here)              │
│                                             │
│ ▪ Engineering Team (24 members)             │
│   Added: Jan 16, 2026                       │
│   [Manage] [Remove from Group]              │
│                                             │
│ ▪ Design Team (8 members)                   │
│   Added: Jan 17, 2026                       │
│   [Manage] [Remove from Group]              │
│                                             │
│ [+ Add Existing Group]                      │
│ [+ Create New Child Group]                  │
└─────────────────────────────────────────────┘

Hierarchy Tree View:
┌─────────────────────────────────────────────┐
│ Acme Corporation                            │
│ ├─ Product Division                         │
│ │  ├─ Engineering Team ← You are here       │
│ │  │  ├─ Backend Squad                      │
│ │  │  └─ Frontend Squad                     │
│ │  └─ Design Team                           │
│ └─ Sales Division                           │
│    └─ Inside Sales Team                     │
└─────────────────────────────────────────────┘
```

**Implementation Roadmap (Phase 2)**:

Week 1-2: Core Infrastructure
- [ ] Circular reference detection algorithm
- [ ] Depth limit trigger/validation
- [ ] Update RLS policies if needed
- [ ] Add hierarchy helper functions

Week 3-4: Basic UI
- [ ] Add/remove subgroup controls
- [ ] Parent/child relationship display
- [ ] Prevent circular refs in UI
- [ ] Error messages and warnings

Week 5-6: Advanced UI
- [ ] Hierarchy tree visualization
- [ ] Breadcrumb navigation for nested groups
- [ ] Search within hierarchy
- [ ] Drag-and-drop reordering (optional)

Week 7: Testing & Polish
- [ ] Test with 100+ group hierarchy
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation

**Estimated Effort**: 7-8 weeks total

**Technical Challenges**:

1. **Query Performance**: Deep hierarchies require recursive queries
   - Solution: Cache hierarchy paths, use materialized views

2. **UI Complexity**: Hard to visualize complex org structures
   - Solution: Tree view, breadcrumbs, search/filter

3. **Data Integrity**: Must prevent orphaned groups and cycles
   - Solution: Database constraints + triggers + application validation

**Success Metrics (Phase 2)**:
- % of groups using subgroup feature
- Average hierarchy depth (expect 2-3 levels)
- Zero circular reference errors after launch
- User satisfaction with hierarchy navigation
- Query performance under load

**Business Value**:
- **High** for enterprises (500+ users)
- **Medium** for mid-size orgs (50-500 users)
- **Low** for small teams (<50 users)
- **Overall**: Medium-High value for target market

**Risk Level**: 
- **Technical Risk**: Medium (well-understood patterns)
- **UX Risk**: Medium-High (hierarchy complexity)
- **Performance Risk**: Medium (can be optimized)

**Dependencies**:
- Requires Phase 1.3 role management to be complete (✅ done v0.2.6.2)
- Benefits from permission inheritance design (currently deferred)
- May inform future permission inheritance implementation

**Related Decisions**:
- "Permission Inheritance Between Parent/Child Groups" (see above)
- "Managing Group-to-Group Relationships" (see above)
- Phase 2 roadmap and feature prioritization

**User Stories Deferred**:
- "As an org admin, I want to organize teams into departments"
- "As a group leader, I want to create sub-teams under my team"
- "As a member, I want to see my team's place in the org hierarchy"
- "As a facilitator, I want to manage journeys across related groups"

---

**Decision Date**: January 26, 2026  
**Made By**: Stefan (Product Owner) + Claude (Technical Advisor)  
**Saves**: 3-5 weeks development time  
**Next Review**: Phase 2 planning (est. March 2026)

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

### Notification System

**Topic**: How should users be notified about platform events?

**Context**: Users need to know about invitations, journey deadlines, feedback, etc.

**Decision**: Email notifications for Phase 1. In-app notifications in Phase 2.

**Deferred To**: Phase 2 (In-app notifications)

**Notification Types:**

**Immediate (Real-time):**
- Group invitation received
- Direct message received
- Mentioned in forum
- Journey deadline approaching

**Daily Digest:**
- Summary of activity
- New content available
- Friend completed journey
- Achievements unlocked

**Weekly Summary:**
- Group activity recap
- Journey progress
- Upcoming deadlines
- Platform news

**Preferences:**
- Per-notification-type settings
- Email vs. in-app vs. push
- Frequency controls
- Quiet hours

**Before Implementation:**
- Design notification data model
- Choose notification service (Firebase, Pusher)
- Create notification management UI
- Test notification fatigue mitigation

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

### Forum and Community

**Topic**: Should the platform include forums or community discussion spaces?

**Context**: Users may want to discuss journeys, share experiences, ask questions.

**Decision**: Phase 1 has no forums. Consider adding in Phase 2 based on user need.

**Deferred To**: Phase 2+ (if user demand exists)

**Forum Types:**

**Group Forums:**
- Private to group members
- For discussing group journeys
- Travel guide facilitation

**Journey Forums:**
- All users taking a journey
- Share progress and tips
- Ask questions

**Global Forum:**
- All platform users
- General discussions
- Feature requests
- Community building

**Features Needed:**
- Threads and replies
- Reactions (likes, helpful)
- Moderation tools
- Search and filtering
- Notifications

**Alternative:**
- Integrate with Slack/Discord
- Embed chat widget
- Link to external forum

**Before Implementation:**
- Gauge user interest
- Evaluate moderation effort
- Choose forum software
- Design community guidelines

---

### Direct Messaging

**Topic**: Should users be able to send direct messages to each other?

**Context**: Users may want to communicate privately about journeys or group activities.

**Decision**: No DMs in Phase 1. Consider adding based on user requests.

**Deferred To**: Phase 2+ (if requested)

**Considerations:**

**Pros:**
- Enables peer support
- Facilitates collaboration
- Reduces need for external tools

**Cons:**
- Moderation challenges
- Privacy concerns
- Potential for spam/harassment
- Development effort

**Implementation Options:**
1. Build custom messaging
2. Integrate third-party (Stream, SendBird)
3. Link to email/external apps

**Safety Features:**
- Block/report users
- Message filtering
- Read receipts (optional)
- Disappearing messages?

**Before Implementation:**
- Assess demand through user interviews
- Plan moderation strategy
- Consider legal/privacy implications
- Budget for customer support load

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

**Document Version**: 1.2
**Last Updated**: February 4, 2026 (v0.2.10)
**Next Review**: Quarterly or as deferred items are implemented

**Recent Updates**:
- v0.2.10: No new deferred decisions (journey enrollment completed as planned)
- v0.2.9: Error handling implemented (was not deferred, added proactively)
- v0.2.8: Journey catalog implemented (no major deferrals)
