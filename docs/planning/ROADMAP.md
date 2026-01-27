# FringeIsland Roadmap

This document outlines the implementation phases, milestones, and development priorities for FringeIsland.

## Overview

FringeIsland development is organized into four major phases, each building on the previous:

- **Phase 1: Foundation** - Core platform with predefined journeys ⏳ **IN PROGRESS (75%)**
- **Phase 2: User-Generated Content** - Journey marketplace and customization
- **Phase 3: Dynamic Journeys** - Adaptive learning paths
- **Phase 4: Developer Platform** - API and integrations

## Development Principles

1. **Ship Early, Ship Often**: Release Phase 1 as MVP, iterate based on feedback
2. **User-Centric**: Validate features with real users before building
3. **Technical Excellence**: Clean architecture, comprehensive tests, good documentation
4. **Flexible Foundation**: Build systems that can evolve (avoid rigid assumptions)
5. **Performance Matters**: Optimize for scale from the start

---

## Phase 1: Foundation (MVP) ⏳ IN PROGRESS - 75% Complete

**Goal**: Launch a working platform where groups can embark on predefined journeys together.

**Timeline**: 3-4 months

**Current Status** (as of v0.2.8 - Jan 27, 2026):
- ✅ Core infrastructure complete
- ✅ User management complete
- ✅ Group management complete (v0.2.7)
- 🔄 Journey system - browsing complete, enrollment in progress (v0.2.8)
- ⏳ Communication (not started)
- ⏳ Polish and launch (not started)

**Success Criteria**:
- ✅ Users can create accounts and profiles
- ✅ Users can create and manage groups
- 🔄 Groups can enroll in predefined journeys (browsing complete, enrollment next)
- ⏳ Basic forum and messaging for collaboration
- ✅ Role-based permissions working (complete)
- ✅ 8 high-quality predefined journeys available (v0.2.8)

### Phase 1.1: Core Infrastructure (Weeks 1-3) ✅ COMPLETE

**Status**: ✅ **COMPLETE** (v0.1.0 - v0.1.2)

**Deliverables**:

1. **Project Setup** ✅
   - ✅ Next.js 16.1 with App Router
   - ✅ TypeScript configuration
   - ✅ Supabase project setup
   - ✅ Development environment
   - ⏳ CI/CD pipeline (GitHub Actions) - Deferred

2. **Database Schema** ✅
   - ✅ Implement complete schema from DATABASE_SCHEMA.md
   - ✅ Create migration scripts
   - ✅ Seed initial data (permissions, role templates, group templates)
   - ✅ Set up Row Level Security policies

3. **Authentication** ✅
   - ✅ Supabase Auth integration
   - ✅ Email/password authentication
   - ⏳ OAuth providers (Google, GitHub) - Deferred
   - ✅ Session management
   - ✅ Protected routes

**Acceptance Criteria**: ✅ ALL MET
- ✅ Database schema deployed to Supabase
- ✅ User registration and login working
- ✅ All RLS policies enforced

**Completed**: January 24-25, 2026 (v0.1.0 - v0.2.1)

---

### Phase 1.2: User Management (Weeks 4-5) ✅ COMPLETE

**Status**: ✅ **COMPLETE** (v0.2.2)

**Deliverables**:

1. **User Profiles** ✅
   - ✅ Profile creation/editing
   - ✅ Avatar upload
   - ✅ Bio and settings
   - ⏳ Account activation/deactivation - Deferred

2. **User Dashboard** 🔄
   - 🔄 Overview of user's groups (partial - groups page exists)
   - ⏳ Active journeys
   - ⏳ Recent activity
   - ⏳ Quick actions

**Acceptance Criteria**: ✅ CORE MET
- ✅ Users can create and edit profiles
- ✅ Profile data persists correctly
- 🔄 Dashboard shows accurate user data (groups only)

**Completed**: January 25, 2026 (v0.2.2)

---

### Phase 1.3: Group Management (Weeks 6-8) ✅ COMPLETE

**Status**: ✅ **COMPLETE** (v0.2.3 - v0.2.7)

**Deliverables**:

1. **Group Creation** ✅
   - ✅ Create group from templates
   - ✅ Group settings (name, description, visibility)
   - ✅ Initial role setup from templates

2. **Group Editing** ✅ (v0.2.7)
   - ✅ Edit group name, description, label
   - ✅ Toggle public/private visibility
   - ✅ Toggle show member list setting
   - ✅ Authorization checks (Group Leaders only)

3. **Group Membership** ✅
   - ✅ Invite members via email (v0.2.5, UI connected v0.2.7)
   - ✅ Accept/decline invitations (v0.2.5)
   - ✅ View member list
   - ✅ Remove members (v0.2.5)
   - ✅ Leave groups (v0.2.5)
   - ⏳ Pause/activate members - Deferred

4. **Group Roles** ✅ (v0.2.6.2)
   - ✅ Assign roles to members
   - ✅ Promote to Group Leader
   - ✅ Remove roles with last leader protection
   - ✅ View role permissions
   - ✅ Group Leader safeguards (last leader protection)
   - ⏳ Customize role permissions - Deferred to Phase 2

5. **Subgroups (Basic)** ⏳
   - ⏳ Add group as member of parent group - Deferred to Phase 2
   - ⏳ View group hierarchy - Deferred to Phase 2
   - ⏳ Basic navigation - Deferred to Phase 2

**Acceptance Criteria**: ✅ ALL CORE CRITERIA MET
- ✅ Users can create groups and invite members
- ✅ Role assignment working completely
- ✅ Group Leader can manage group settings
- ✅ Group Leader can edit group details
- ✅ Cannot remove last Group Leader (safeguard works)

**Progress**:
- v0.2.3: Group creation
- v0.2.4: Group detail page
- v0.2.5: Member management (invite, accept, leave, remove)
- v0.2.6.2: Role assignment UI (promote, assign, remove)
- v0.2.7: Edit group page + invite modal integration

**Completed**: January 26, 2026 (v0.2.7)

**Next**: Phase 1.4 - Journey System

---

### Phase 1.4: Journey System (Weeks 9-11) 🔄 IN PROGRESS - 50% Complete

**Status**: 🔄 **IN PROGRESS** (v0.2.8)

**Deliverables**:

1. **Journey Catalog** ✅ COMPLETE (v0.2.8)
   - ✅ Browse predefined journeys at `/journeys`
   - ✅ Filter by tags, difficulty, duration
   - ✅ View journey details at `/journeys/[id]`
   - ✅ Search functionality
   - ✅ Responsive grid layout
   - ✅ Beautiful detail page with tabs

2. **Journey Enrollment** ⏳ NEXT UP
   - Individual enrollment
   - Group enrollment (by Group Leader)
   - Enrollment confirmation
   - View enrolled journeys

3. **Journey Content Delivery** ⏳
   - Linear journey progression (A→B)
   - Step-by-step navigation
   - Content display (text, images, videos)
   - Activity completion tracking

4. **Journey Progress** ⏳
   - Individual progress tracking
   - Group progress overview
   - Completion status
   - Travel Guide view of member progress

5. **Initial Predefined Journeys** ✅ COMPLETE (v0.2.8)
   - ✅ Created 8 high-quality journeys
   - ✅ Cover different topics (leadership, communication, team building, personal development, decision making, emotional intelligence, agile, resilience)
   - ✅ Different difficulty levels (3 beginner, 3 intermediate, 2 advanced)
   - ✅ Varied durations (150-300 minutes)

**Acceptance Criteria**:
- ✅ Users can browse journeys (COMPLETE)
- 🔄 Users can enroll in journeys (IN PROGRESS)
- ⏳ Journey content displays correctly (NOT STARTED)
- ⏳ Progress tracking accurate (NOT STARTED)
- ⏳ Travel Guides can view member progress (NOT STARTED)

**Progress**:
- v0.2.8: Journey catalog and browsing complete (50%)
- Next: Journey enrollment (individual + group)

**Completed**: January 27, 2026 (v0.2.8 - Part 1)

**Next**: Journey enrollment functionality

---

### Phase 1.5: Communication (Weeks 12-13) ⏳ NOT STARTED

**Status**: ⏳ **NOT STARTED**

**Deliverables**:

1. **Forum System** ⏳
   - Group forums
   - Post messages
   - Reply to messages
   - Basic moderation (delete/edit)
   - Forum visibility settings

2. **Messaging** ⏳
   - Direct messages between users
   - Message notifications
   - Message history
   - Read/unread status

**Acceptance Criteria**:
- Users can post and reply in forums
- Direct messaging working
- Notifications delivered correctly

**Priority**: MEDIUM - After journey system basics

---

### Phase 1.6: Polish and Launch (Weeks 14-16) ⏳ NOT STARTED

**Status**: ⏳ **NOT STARTED**

**Deliverables**:

1. **UI/UX Refinement** 🔄
   - 🔄 Responsive design (partial - desktop done)
   - ⏳ Accessibility improvements (WCAG 2.1 AA)
   - ✅ Loading states and error handling (mostly done)
   - ⏳ User onboarding flow

2. **Testing** ⏳
   - Unit tests (80%+ coverage for critical paths)
   - Integration tests (key user flows)
   - E2E tests (Playwright/Cypress)
   - Performance testing
   - Security audit

3. **Documentation** 🔄
   - ⏳ User guide
   - ⏳ Help center articles
   - ⏳ Video tutorials
   - 🔄 Admin documentation (technical docs exist)

4. **Beta Testing** ⏳
   - Invite 10-20 beta users
   - Collect feedback
   - Fix critical bugs
   - Iterate on UX

5. **Launch** ⏳
   - Public launch announcement
   - Monitor performance and errors
   - Rapid bug fixing
   - User support

**Acceptance Criteria**:
- All critical bugs fixed
- Performance acceptable (< 2s page loads)
- Beta users satisfied
- Public launch successful

---

## ✅ What We've Completed (v0.1.0 - v0.2.5)

### v0.2.5 (Jan 26, 2026) - Member Management & Navigation
- ✅ **Member invitation system** (email-based)
- ✅ **Accept/decline invitations** (dedicated page)
- ✅ **Leave groups** (with last leader protection)
- ✅ **Remove members** (leaders only)
- ✅ **Global navigation bar** (real-time updates)
- ✅ **Confirmation modal system** (replaced all alerts)
- ✅ **Database trigger** for last leader protection
- ✅ **6 new RLS policies** for member management

### v0.2.4 (Jan 25, 2026) - Group Detail Page
- ✅ Dynamic group detail view at `/groups/[id]`
- ✅ Member list with avatars and roles
- ✅ Role badges display
- ✅ Public/private status indicators
- ✅ Access control and error handling

### v0.2.3 (Jan 25, 2026) - Group Creation
- ✅ Group creation form
- ✅ Group settings (name, description, label)
- ✅ Public/private visibility
- ✅ Member list visibility toggle
- ✅ Automatic leader assignment

### v0.2.2 (Jan 25, 2026) - Profile Management
- ✅ View profile page
- ✅ Edit profile (name, bio)
- ✅ Avatar upload with optimization
- ✅ Supabase Storage integration

### v0.2.0-0.2.1 (Jan 24-25, 2026) - Auth & Groups List
- ✅ Authentication system overhaul
- ✅ AuthContext implementation
- ✅ Groups list page
- ✅ Session management

### v0.1.0-0.1.2 (Jan 24, 2026) - Foundation
- ✅ Project initialization (Next.js 16.1)
- ✅ Database schema (13 tables)
- ✅ RLS policies
- ✅ Seed data
- ✅ Basic authentication

---

## 🎯 Next Up (Immediate Priorities)

### Priority 1: Role Assignment UI (Step 4)
**Goal**: Complete group management with role assignment interface

**Deliverables**:
- Promote member to leader
- Assign/remove roles
- Role management UI
- Visual role indicators

**Timeline**: 1-2 weeks
**Impact**: Completes core group management (~75% Phase 1)

---

### Priority 2: Journey System Basics (Step 5)
**Goal**: Enable groups to browse and enroll in journeys

**Deliverables**:
- Journey catalog/browse page
- Journey detail page
- Enrollment system
- Journey-group connections

**Timeline**: 2-3 weeks
**Impact**: Major milestone (~85% Phase 1)

---

### Priority 3: Journey Content Delivery (Step 6)
**Goal**: Users can progress through journey content

**Deliverables**:
- Journey step navigation
- Content display
- Progress tracking
- Completion status

**Timeline**: 2-3 weeks
**Impact**: Core journey functionality (~95% Phase 1)

---

## Phase 2: User-Generated Content

**Goal**: Enable users to create, customize, and share journeys in a marketplace.

**Timeline**: 2-3 months (after Phase 1 launch)

**Status**: ⏳ **NOT STARTED**

**Success Criteria**:
- Users can create their own journeys
- Journey marketplace functional
- Journey rating/review system working
- Journey versioning implemented
- 100+ user-created journeys published

### Phase 2.1: Journey Creation Tools (Weeks 1-3)

**Deliverables**:

1. **Journey Builder**
   - Visual journey editor
   - Add/edit/delete steps
   - Drag-and-drop step ordering
   - Step types (content, activity, assessment)
   - Rich text editor for content
   - Media upload (images, videos)

2. **Journey Templates**
   - Duplicate existing journeys
   - Pre-built journey structures
   - Journey import/export (JSON)

**Acceptance Criteria**:
- Users can create journeys from scratch
- Journey builder intuitive and bug-free
- Media uploads working

---

### Phase 2.2: Journey Marketplace (Weeks 4-6)

**Deliverables**:

1. **Publishing Workflow**
   - Publish journey to marketplace
   - Unpublish journeys
   - Journey visibility settings (public/private/unlisted)
   - Journey categories/tags

2. **Marketplace Features**
   - Browse published journeys
   - Search and filter
   - Journey preview
   - Creator profiles

3. **Ratings and Reviews**
   - Rate journeys (1-5 stars)
   - Write text reviews
   - View average ratings
   - Sort by rating, popularity, recency

4. **Journey Analytics (Basic)**
   - View count
   - Enrollment count
   - Completion rate
   - Average rating

**Acceptance Criteria**:
- Users can publish journeys to marketplace
- Marketplace browsing smooth
- Ratings and reviews working

---

### Phase 2.3: Enhanced Collaboration (Weeks 7-8)

**Deliverables**:

1. **Journey Co-Creation**
   - Invite collaborators to journey
   - Collaborative editing
   - Version control (basic)
   - Change tracking

2. **Group Customization**
   - Custom group roles beyond templates
   - Advanced permission customization
   - Group branding (logo, colors)

3. **Enhanced Forums**
   - Journey-specific forums
   - Rich media in posts (images, videos)
   - Polls and surveys
   - Pinned/featured posts
   - Forum search

**Acceptance Criteria**:
- Journey co-creation working
- Custom roles fully functional
- Enhanced forums smooth and feature-rich

---

## Phase 3: Dynamic Journeys

**Goal**: Enable adaptive journey paths that respond to user actions and progress.

**Timeline**: 3-4 months (after Phase 2)

**Status**: ⏳ **NOT STARTED**

**Success Criteria**:
- Journeys can branch based on user choices
- Content adapts to user performance
- Context-aware recommendations working
- 10+ dynamic journeys published

### Phase 3.1: Journey Logic Engine (Weeks 1-4)

**Deliverables**:

1. **Branching Logic**
   - Conditional steps (if/then/else)
   - User choice points
   - Dynamic path calculation
   - State machine implementation

2. **User Action Tracking**
   - Capture user actions/decisions
   - Store action history
   - Context data collection

3. **Adaptation Rules**
   - Performance-based branching
   - Difficulty adjustment
   - Content recommendations
   - Personalized feedback

**Acceptance Criteria**:
- Journeys can branch based on conditions
- User actions tracked correctly
- Paths adapt as expected

---

### Phase 3.2: Dynamic Content Delivery (Weeks 5-7)

**Deliverables**:

1. **Context-Aware Content**
   - Personalized content selection
   - Dynamic resource recommendations
   - Adaptive pacing

2. **Smart Checkpoints**
   - Automated assessment
   - Skill gap identification
   - Remedial content injection

3. **Journey Analytics (Advanced)**
   - Path visualization
   - Drop-off analysis
   - Effectiveness metrics
   - A/B testing framework

**Acceptance Criteria**:
- Content adapts to user needs
- Assessments working correctly
- Analytics provide actionable insights

---

### Phase 3.3: AI Integration (Weeks 8-10)

**Deliverables**:

1. **AI-Powered Recommendations**
   - Journey recommendations
   - Content suggestions
   - Peer matching (for collaborative journeys)

2. **Automated Feedback**
   - AI-generated feedback on activities
   - Progress insights
   - Encouragement messages

3. **Content Generation (Experimental)**
   - AI-assisted journey creation
   - Content suggestions
   - Auto-tagging

**Acceptance Criteria**:
- Recommendations accurate and helpful
- AI feedback useful to users
- Content generation works (if implemented)

---

## Phase 4: Developer Platform

**Goal**: Provide API and SDK for advanced users to build custom journey components and integrations.

**Timeline**: 2-3 months (after Phase 3)

**Status**: ⏳ **NOT STARTED**

**Success Criteria**:
- REST API documented and stable
- SDK released (JavaScript/TypeScript)
- 5+ third-party integrations built
- Developer documentation comprehensive

### Phase 4.1: REST API (Weeks 1-3)

**Deliverables**:

1. **Public API**
   - RESTful API endpoints
   - Authentication (API keys)
   - Rate limiting
   - API versioning

2. **API Documentation**
   - OpenAPI/Swagger spec
   - Interactive API explorer
   - Code examples (multiple languages)
   - Authentication guide

3. **Developer Portal**
   - API key management
   - Usage analytics
   - API playground
   - Support resources

**Acceptance Criteria**:
- API endpoints functional and documented
- Authentication working
- Rate limiting enforced

---

### Phase 4.2: SDK and Integrations (Weeks 4-6)

**Deliverables**:

1. **JavaScript/TypeScript SDK**
   - Client library
   - TypeScript types
   - NPM package
   - Code examples

2. **Webhook System**
   - Event notifications
   - Webhook registration
   - Retry logic
   - Event types documentation

3. **Integration Examples**
   - Slack integration
   - Google Calendar sync
   - Notion integration
   - Zapier integration

**Acceptance Criteria**:
- SDK published to NPM
- Webhooks delivering events correctly
- At least 2 integrations working

---

### Phase 4.3: Advanced Developer Features (Weeks 7-8)

**Deliverables**:

1. **Custom Journey Components**
   - Component SDK
   - Component marketplace
   - Installation/activation system
   - Security sandboxing

2. **Data Export**
   - Bulk data export API
   - Analytics data access
   - User data portability

3. **Developer Community**
   - Developer forum
   - Code samples repository
   - Office hours/support
   - Developer newsletter

**Acceptance Criteria**:
- Custom components can be built and installed
- Data export working
- Developer community active

---

## Ongoing Activities (All Phases)

### Throughout Development

**User Research**
- Monthly user interviews
- Quarterly surveys
- Usage analytics monitoring
- A/B testing

**Performance Optimization**
- Database query optimization
- Caching implementation
- CDN setup for assets
- Load testing

**Security**
- Regular security audits
- Dependency updates
- Penetration testing (quarterly)
- Security training

**Content**
- Create new predefined journeys
- Curate user-created journeys
- Blog posts and tutorials
- Case studies

**Community**
- User forum moderation
- Email newsletter
- Social media presence
- User events/webinars

---

## Success Metrics

### Phase 1 Metrics
- 100+ registered users (first month)
- 10+ active groups
- 50+ journey enrollments
- 70%+ user retention (week 2)
- < 5% error rate

### Phase 2 Metrics
- 50+ user-created journeys published
- 500+ marketplace enrollments
- 4.0+ average journey rating
- 20%+ creator adoption rate

### Phase 3 Metrics
- 10+ dynamic journeys created
- 30%+ improvement in completion rates
- 4.5+ user satisfaction with adaptive content

### Phase 4 Metrics
- 100+ registered API developers
- 10+ third-party integrations
- 1000+ API calls/day
- 4.5+ developer satisfaction

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Supabase limitations | Have migration plan to self-hosted PostgreSQL |
| Performance issues | Implement caching early, monitor closely |
| Complex authorization logic | Comprehensive tests, code reviews |
| RLS policy bugs | Test RLS policies thoroughly with different user contexts |

### Product Risks

| Risk | Mitigation |
|------|------------|
| Users don't create journeys | Provide excellent templates and examples |
| Low engagement | Build strong community features early |
| Feature creep | Strict scope discipline, validate before building |
| Poor journey quality | Curation and quality guidelines |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Slow adoption | Focus on early evangelists, iterate quickly |
| Monetization challenges | Multiple revenue streams (not just paid journeys) |
| Competition | Differentiate on flexibility and collaboration |

---

## Post-Launch Priorities (Phase 1)

**First 30 Days:**
1. Monitor errors and performance
2. Rapid bug fixes
3. User onboarding improvements
4. Community building

**First 90 Days:**
1. Feature refinements based on feedback
2. Create 5+ new predefined journeys
3. Build case studies
4. Plan Phase 2 based on learning

**First Year:**
1. Complete Phase 2
2. Begin Phase 3
3. 1000+ active users
4. Sustainable business model

---

## Decision Log

**2026-01-27**: Implemented journey catalog with search/filter functionality (v0.2.8)  
**2026-01-27**: Seeded 8 predefined journeys covering various topics and difficulty levels (v0.2.8)  
### Key Architectural Decisions

**2026-01-26**: Implemented member management with last leader protection (v0.2.5)  
**2026-01-26**: Created global navigation with real-time updates (v0.2.5)  
**2026-01-26**: Replaced browser alerts with modal system (v0.2.5)  
**2026-01-25**: Built group detail page with role display (v0.2.4)  
**2026-01-25**: Implemented group creation (v0.2.3)  
**2026-01-25**: Added avatar upload with Supabase Storage (v0.2.2)  
**2026-01-18**: Chose flexible group model over hard-coded types  
**2026-01-18**: Decided journeys are content, not organizational nodes  
**2026-01-18**: Implemented two-tier role system (templates + instances)  
**2026-01-18**: Deferred permission inheritance to post-MVP  
**2026-01-18**: Moved user-created journeys to Phase 2 (before dynamic)  

---

## Current Development Focus (January 2026)

### Active Work (v0.2.8)
- ✅ Journey catalog and browsing complete
- 🔄 Journey enrollment in progress

### Next Sprint
**Priority 1**: Journey Enrollment
- Individual enrollment functionality
- Group enrollment (Group Leaders)
- Enrollment confirmation modal
- View enrolled journeys page
- Check for existing enrollments

**Priority 2**: Journey Content Delivery
- Step-by-step navigation
- Content display
- Progress tracking
- Completion status

### Blockers & Dependencies
- None currently

### Technical Debt
- Add unit tests for critical paths
- Improve mobile responsiveness
- Add loading skeletons
- Implement error tracking (Sentry)

---

**Document Version**: 1.2  
**Last Updated**: January 27, 2026 (v0.2.8)  
**Next Review**: February 2026 or after journey enrollment complete
