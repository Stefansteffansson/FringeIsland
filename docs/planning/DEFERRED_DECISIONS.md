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

## Journey System

### Dynamic Journey Path Changes

**Topic**: How should journeys adapt their paths based on user actions during the journey?

**Context**: Phase 3 introduces dynamic/adaptive journeys where the path can change based on what users do. This requires a significant architectural shift from linear journeys.

**Decision**: Phase 1 and 2 use linear (A→B) journey structure. Dynamic journeys are Phase 3.

**Deferred To**: Phase 3 (Dynamic Journeys)

**Notes for Future Implementation**:

**Architecture Changes Needed:**

1. **Journey Structure Evolution**

   **Phase 1/2 (Linear):**
   ```json
   {
     "steps": [
       {"id": "step_1", "next": "step_2"},
       {"id": "step_2", "next": "step_3"},
       {"id": "step_3", "next": null}
     ]
   }
   ```

   **Phase 3 (Branching):**
   ```json
   {
     "steps": [
       {
         "id": "step_1",
         "type": "content",
         "next": "step_2"
       },
       {
         "id": "step_2",
         "type": "choice",
         "question": "What's your priority?",
         "branches": [
           {"choice": "Speed", "next": "step_3a"},
           {"choice": "Quality", "next": "step_3b"}
         ]
       },
       {"id": "step_3a", "next": "step_4"},
       {"id": "step_3b", "next": "step_4"}
     ]
   }
   ```

   **Phase 3 (Adaptive):**
   ```json
   {
     "steps": [
       {
         "id": "assessment_1",
         "type": "assessment",
         "next": {
           "type": "conditional",
           "conditions": [
             {"if": "score < 70", "then": "remedial_content"},
             {"if": "score >= 70", "then": "advanced_content"}
           ]
         }
       }
     ]
   }
   ```

2. **State Management**
   - Track user's position in branching paths
   - Store decisions/choices made
   - Handle backtracking (can users go back?)
   - Save state for pause/resume

3. **Analytics**
   - Which paths are most common?
   - Where do users drop off?
   - Which branches lead to better outcomes?
   - A/B test different paths

**Types of Dynamic Behavior:**

1. **User Choice Points**
   - Explicit branching (user chooses path)
   - Multiple endings
   - Exploration vs. guided paths

2. **Performance-Based Adaptation**
   - Assessment scores determine next steps
   - Difficulty adjustment
   - Remedial content injection

3. **Context-Aware Content**
   - Time of day/week affects content
   - User's role in group affects path
   - Previous journey completion affects recommendations

4. **AI-Driven Adaptation** (Phase 4?)
   - ML predicts optimal path for user
   - Personalized content selection
   - Dynamic difficulty scaling

**Technical Challenges:**

- **Journey Builder UI**: How to create branching journeys visually?
  - Flowchart-style editor
  - Visual programming (Scratch-like blocks)
  - Code-based DSL for power users

- **Path Validation**: Ensure all branches lead somewhere
  - No dead ends (unless intentional)
  - All users can complete journey
  - Cycles handled correctly

- **Version Control**: What happens when journey creator updates?
  - Users mid-journey on old version?
  - Migrate users to new version?
  - Allow completing old version?

**Before Implementation:**
- Study existing adaptive learning platforms (Duolingo, Khan Academy)
- Design journey logic DSL (domain-specific language)
- Create prototype with 2-3 sample dynamic journeys
- Test with users to validate comprehension

---

## Authorization

### Temporary and Conditional Permissions

**Topic**: Should the system support time-limited or context-dependent permissions?

**Context**: Some use cases might benefit from temporary role assignments or permissions that only apply in certain contexts.

**Decision**: Not needed for Phase 1. Evaluate for Phase 2+.

**Deferred To**: Phase 2 or later (based on user demand)

**Examples:**

**Temporary Permissions:**
```
- "Guest Speaker" role that expires after 1 week
- "Project Lead" role for duration of project
- "Moderator" role during specific event
```

**Conditional Permissions:**
```
- Can edit content ONLY if it's their own
- Can invite members ONLY if group is under size limit
- Can view analytics ONLY for journeys they facilitate
```

**Implementation Ideas:**

```typescript
interface PermissionGrant {
  permission: Permission;
  granted: boolean;
  
  // Temporal constraints (optional)
  valid_from?: Date;
  valid_until?: Date;
  
  // Conditional constraints (optional)
  conditions?: {
    type: 'ownership' | 'size_limit' | 'status';
    params: Record<string, any>;
  }[];
}
```

**Use Cases to Validate:**
- Guest facilitators for limited time
- Trial memberships that expire
- Context-specific admin rights
- Resource-based permissions (edit own content)

**Before Implementation:**
- Collect concrete user stories requiring this
- Design condition evaluation engine
- Consider performance impact
- Ensure UI can communicate constraints clearly

---

## Collaboration Features

### Advanced Forum Features

**Topic**: What additional forum features are needed beyond basic post/reply?

**Context**: Phase 1 includes basic forum (post, reply, moderate). Many modern forums have rich features.

**Decision**: Start simple. Add features based on user demand.

**Deferred To**: Phase 2+

**Potential Features:**

**Content Features:**
- Rich text formatting (bold, italic, lists)
- Code blocks with syntax highlighting
- File attachments
- Embedded media (YouTube, etc.)
- Polls and surveys
- Reactions (emoji reactions)
- @mentions and notifications
- Threads and nested replies

**Organization Features:**
- Categories and subcategories
- Tags/labels
- Pinned posts
- Featured posts
- Post templates

**Moderation Features:**
- Report posts
- Flag for review
- Automated spam detection
- Moderation queue
- User reputation system
- Post approval workflow

**Discovery Features:**
- Sort by newest/popular/unanswered
- Search within forum
- Saved posts / bookmarks
- Following specific topics
- Email digests

**Before Implementation:**
- Analyze which features users request most
- Study popular forum platforms (Discourse, etc.)
- Consider integration with third-party forum tools
- Evaluate: build vs. integrate existing solution?

---

## User Experience

### Mobile App

**Topic**: Should FringeIsland have native mobile apps (iOS/Android)?

**Context**: Phase 1 is responsive web. Mobile apps could improve engagement.

**Decision**: Start with responsive web. Evaluate mobile apps post-launch.

**Deferred To**: Post-Phase 1 (based on mobile web usage)

**Considerations:**

**Pros of Native Apps:**
- Better performance
- Offline functionality
- Push notifications
- Native mobile UX patterns
- App store visibility

**Cons of Native Apps:**
- Development cost (2x platforms)
- Maintenance burden
- App store approval process
- Additional QA burden

**Alternative: Progressive Web App (PWA)**
- Works on all platforms
- Installable on home screen
- Offline support
- Push notifications (on Android)
- Lower development cost

**Decision Framework:**
1. Launch responsive web
2. Monitor mobile web usage
3. If > 40% mobile traffic, consider PWA
4. If clear ROI, build native apps

**Before Implementation:**
- Analyze mobile web analytics
- Survey users on mobile app interest
- Calculate development cost/ROI
- Choose: PWA vs. native vs. React Native

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

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next Review**: Quarterly or as deferred items are implemented