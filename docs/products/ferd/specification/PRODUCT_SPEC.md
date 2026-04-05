# FringeIsland - Product Specification

**Version:** 1.2
**Last Updated:** April 5, 2026
**Status:** Living document - v1.0 MVP scope (Wave 1 / Ferd: 95% complete, spec expanded with visitor experience, i18n, safety features)
**Links:** [Vision](../../../universe/vision/VISION.md) | [Roadmap](../planning/ROADMAP.md) | [Features](../development/features/)

---

## 📋 Document Purpose

This document defines **what we're building** for FringeIsland v1.0 (MVP). It translates the [vision](../../../universe/vision/VISION.md) into concrete features, user stories, and acceptance criteria.

**Hierarchy:**
```
Vision (Why) → Product Spec (What) → Roadmap (When) → Features (How) → Behaviors (Rules)
```

---

## 🎯 Product Overview

**FringeIsland v1.0** is an edutainment platform for group-based personal development through structured learning journeys.

### Core Value Proposition

**"Travel alone or together with guides on structured learning journeys - where education meets entertainment."**

### What Makes This Different

- **Journey metaphor** - Learning feels like adventure, not work
- **Group-first design** - Solo is supported, but groups are the default
- **Role-based experiences** - Leaders, Guides, Members have different capabilities
- **Edutainment focus** - Engaging, fun, and educational simultaneously

---

## 👥 User Personas

### Primary Persona: Individual Learner (Sarah)
**"I want to grow, but I need structure and accountability."**

- Age: 28-45
- Context: Professional seeking personal development
- Pain: Scattered learning, no clear path, lacks accountability
- Goal: Follow structured journeys with group support
- Success: Completes journeys, feels growth, stays engaged

### Secondary Persona: Steward (Marcus)
**"I want to develop my team together."**

- Age: 30-50
- Context: Team lead, manager, or informal leader
- Pain: Generic training programs don't fit team needs
- Goal: Guide group through relevant development journeys
- Success: Team completes journeys together, improves cohesion

### Tertiary Persona: Guide (future)
**"I want to facilitate group learning experiences."**

- Age: 25-55
- Context: Coach, facilitator, experienced practitioner
- Pain: Limited tools for guiding group journeys
- Goal: Co-facilitate journeys with Stewards
- Success: Groups complete journeys with guidance (Wave 2 / Hamn)

---

## 🎨 User Experience Principles

### 1. Journey Metaphor Throughout
- Language: "journeys" not "courses", "travelers" not "students"
- Navigation: Maps, paths, exploration themes
- Progress: Milestones, not percentages
- Completion: Arrival, not grades

### 2. Group-First, Solo-Supported
- Default UX assumes group context
- Solo enrollment available but not primary
- Group features visible and accessible
- Social elements integrated, not tacked on

### 3. Roles Drive Capabilities
- Stewards: Manage group, invite members, assign roles, enroll group
- Members: Participate, complete content, leave group
- Guides: Co-facilitate, mentor, support
- Observers: View content without participating

### 4. Simplicity Over Features
- Clear navigation, minimal clicks
- Essential features only (v1.0)
- Progressive disclosure of complexity
- Mobile-responsive, clean design

### 5. Three Void Dimensions as Design Lens
- Individual void (1): gap between who I am and who I know myself to be — served by solo journeys, reflections, travel log
- Relational void (1+1): gap between how I relate and how I could relate — served by DMs, pair activities, group journeys
- Communal void (1+community): gap between how I belong and how I could belong — served by group membership, forums, announcements
- Every feature should be evaluated against all three dimensions

---

## 📦 v1.0 Feature Scope (MVP)

### ✅ In Scope - Must Have

#### 1. Authentication & Profiles
**User Story:** As a user, I can create an account and manage my profile so that I can access the platform and personalize my experience.

**Features:**
- Email/password signup and login
- Profile creation with name, bio, avatar
- Profile editing
- Session management
- Logout

**Acceptance Criteria:**
- Secure authentication via Supabase Auth
- Profile data stored separately from auth credentials
- Avatar upload with image optimization
- Protected routes require authentication

#### 2. Journey Catalog & Discovery
**User Story:** As a learner, I can browse available journeys and view details so that I can choose journeys that interest me.

**Features:**
- Journey catalog page (`/journeys`)
- Search by title/description
- Filter by difficulty level
- Filter by topic/tags
- Journey detail pages with:
  - Overview (description, objectives, prerequisites)
  - Curriculum (step-by-step breakdown)
  - Enrollment options

**Acceptance Criteria:**
- 8+ predefined journeys available
- Responsive grid layout
- Clear difficulty badges
- Estimated duration visible
- Curriculum expandable/collapsible

#### 3. Journey Enrollment
**User Story:** As a learner, I can enroll in journeys individually or with my group so that I can start learning.

**Features:**
- Individual enrollment (solo learning)
- Group enrollment (Stewards only)
- Enrollment status tracking
- "My Journeys" page showing enrolled journeys
- Separate tabs for individual vs. group journeys

**Acceptance Criteria:**
- Cannot enroll twice in same journey (validation)
- Group leaders can select which group to enroll
- Enrollment status visible on journey detail page
- Journey cards show progress status

#### 4. Group Management
**User Story:** As a user, I can create and manage groups so that I can learn together with others.

**Features:**
- Create groups with name, description, settings
- Edit group settings (leaders only)
- View group details and member list
- Public/private group visibility
- Group labels for categorization

**Acceptance Criteria:**
- Any authenticated user can create groups
- Creator automatically becomes Steward
- Group settings: visibility, member list display
- Groups visible on "My Groups" page

#### 5. Member Management
**User Story:** As a Steward, I can invite, accept, and remove members so that I can build my group.

**Features:**
- Invite members by email (leaders only)
- Accept/decline invitations
- View pending invitations
- Remove members (leaders only)
- Leave groups (all members)
- Real-time member count

**Acceptance Criteria:**
- Email-based invitations with validation
- Invitation status: invited → active
- Members cannot see pending invitations of others
- Last leader protection (cannot remove last leader)

#### 6. Role Management
**User Story:** As a Steward, I can assign roles to members so that I can organize my group effectively.

**Features:**
- Assign roles (Steward, Guide, Member, Observer) to members
- Remove roles from members
- Multiple users can have Steward role
- RBAC: 4 roles, 31 permissions, `has_permission()` SQL function

**Acceptance Criteria:**
- Only Stewards can assign/remove roles
- Database trigger prevents removing last Steward
- UI hides role removal when last Steward
- Immediate UI updates after role changes

#### 7. Navigation & Layout
**User Story:** As a user, I can navigate the platform easily and see my current context.

**Features:**
- Global navigation bar
- Links: My Groups, Journeys, My Journeys, Invitations, Profile
- Invitation count badge (real-time)
- Responsive mobile navigation
- Active route highlighting

**Acceptance Criteria:**
- Navigation persists across all pages
- Mobile-friendly (hamburger menu or compact)
- Real-time invitation count updates
- Current page visually distinct

#### 8. Visitor/Shadow Experience
**User Story:** As a potential member, I can browse the platform and try taster journeys without creating an account, so I can experience FringeIsland before committing.

**Features:**
- Anonymous browsing of journey catalog
- Temporary session/profile for visitors
- Taster journeys (curated subset playable without account)
- Garden door glimpse (preview of what awaits on registration)
- Seamless conversion to full account with all progress carried forward

**Acceptance Criteria:**
- Visitors can browse journeys and try tasters without signup
- Temporary profile data persists across session
- On registration, all visitor data carries forward (no data loss)
- RLS policies handle anonymous/temporary sessions securely
- Clear conversion prompts at natural engagement points

#### 9. profile_data Table (Dynamic Profile Data)
**User Story:** As the platform, I store flexible member data (journey engagement, reflections, assessments) in a structured way that supports current features and future expansion.

**Features:**
- Flexible data buckets per ADR-U005
- Journey engagement data storage
- Integration with admin lifecycle (decommission/delete cascades)
- RLS policies for profile_data access

**Acceptance Criteria:**
- Schema implemented per ADR-U005
- RLS policies tested
- Admin actions (decommission, hard delete) cascade correctly
- Basic data population from journey engagement validated

#### 10. Travel Log / Journal
**User Story:** As a member, I can view my journey history and personal reflections so I can track my growth over time.

**Features:**
- Personal record of journey progress and completions
- Reflection entries tied to journey steps
- Private by default
- Chronological and journey-grouped views

**Acceptance Criteria:**
- Members can view their complete journey history
- Reflections stored in profile_data
- Travel log accessible from profile
- Privacy: viewable only by the member (unless explicitly shared)

#### 11. Internationalization Framework
**User Story:** As the platform, all user-facing strings are externalized to locale files so the platform can support multiple languages in the future.

**Features:**
- i18n library integration with Next.js 16 App Router
- All user-facing strings extracted to locale files
- English as default locale
- Infrastructure ready for additional languages (added in Hamn)

**Acceptance Criteria:**
- No hardcoded user-facing strings in components
- Locale file structure established
- English locale complete
- Language switching infrastructure in place (even if only English available)

#### 12. Block/Report Users
**User Story:** As a member, I can block or report other users for safety so I feel secure on the platform.

**Features:**
- Block a user (hides their content from you)
- Report a user (flags for admin review)
- Report categories (harassment, spam, inappropriate content)
- Admin queue for reviewing reports

**Acceptance Criteria:**
- Blocked users cannot send DMs or appear in member lists for the blocker
- Reports reach admin dashboard
- Report includes context (where the interaction happened)
- No notification to the reported user

#### 13. Group DMs
**User Story:** As a member, I can have multi-party direct message conversations so I can communicate with several people at once.

**Features:**
- Create group DM with 2+ members
- Add/remove participants
- Same features as 1:1 DM (read tracking, Realtime)

**Acceptance Criteria:**
- Group DMs appear in inbox alongside 1:1 conversations
- All participants see messages in real-time
- Members can leave group DMs
- Maximum participant limit defined

#### 14. Basic Announcements
**User Story:** As a Steward, I can send announcements to my group so important information reaches all members.

**Features:**
- One-to-many messaging within a group
- Role-controlled (Stewards only)
- Announcements visible in group view
- Notification generated for all group members

**Acceptance Criteria:**
- Only Stewards can create announcements
- All group members receive notification
- Announcements persist and are browsable
- Distinguished visually from regular forum posts

### Delivered Beyond Original v1.0 Scope

The following features were originally out of scope for v1.0 but have been implemented:

- ✅ **Communication** — Forums (v0.2.14), DM (v0.2.15), Notifications (v0.2.14), Smart Notifications (v0.2.35)
- ✅ **Journey content delivery** — Step-by-step JourneyPlayer (v0.2.11)
- ✅ **Progress tracking** — Per-enrollment progress with resume (v0.2.11)
- ✅ **RBAC system** — 4 roles, 31 permissions, has_permission() (v0.2.16–v0.2.20)
- ✅ **Admin panel** — DeusEx dashboard, 10 admin actions (v0.2.21–v0.2.25)
- ✅ **Lifecycle flows** — Leave group, steward nomination, platform exit (v0.2.32–v0.2.36)
- ✅ **Display names** — Nickname system with privacy controls (v0.2.30)

### Still Out of Scope

**Wave 2 (Hamn)+ Features:**
- User-created journeys and journey marketplace
- Guide role (full implementation)
- Advanced group features (subgroups/groups-join-groups UI)
- Completion certificates
- Activity feeds

**Wave 3+ Features:**
- Dynamic/adaptive journeys
- AI-powered recommendations
- Personalized content paths
- Advanced analytics

**See:** [DEFERRED.md](../planning/DEFERRED.md) for rationale

---

## 🗂️ Feature → Milestone → Roadmap Mapping

### Phase 1.1: Foundation (Complete)
**Milestone:** Infrastructure ready
- ✅ Next.js setup
- ✅ Supabase integration
- ✅ Database schema

### Phase 1.2: Authentication (Complete)
**Milestone:** Users can sign up and manage profiles
- ✅ Feature: Authentication & Profiles

### Phase 1.3: Group Management (Complete)
**Milestone:** Users can create and manage groups
- ✅ Feature: Group Management
- ✅ Feature: Member Management
- ✅ Feature: Role Management

### Phase 1.4: Journey System (Complete)
**Milestone:** Users can browse, enroll, and complete journeys
- ✅ Feature: Journey Catalog & Discovery (v0.2.8)
- ✅ Feature: Journey Enrollment (v0.2.10)
- ✅ Feature: Journey Content Delivery (v0.2.11)
- ✅ Feature: Progress Tracking (v0.2.11)

### Phase 1.5: Communication (Complete)
**Milestone:** Groups can communicate and collaborate
- ✅ Feature: Group Forums (v0.2.14)
- ✅ Feature: Direct Messaging (v0.2.15)
- ✅ Feature: Notifications (v0.2.14, extended v0.2.35)

### Phase 1.5b–e: Platform Hardening (Complete)
- ✅ RBAC System — 4 roles, 31 permissions (v0.2.16–v0.2.20)
- ✅ Admin Foundation — DeusEx panel, 10 actions (v0.2.21–v0.2.25)
- ✅ Performance — 8-tier optimization (v0.2.26–v0.2.28)
- ✅ Lifecycle — Leave group, nomination, platform exit (v0.2.32–v0.2.36)

---

## 📐 Technical Specifications

### Tech Stack
- **Frontend:** Next.js 16.1 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Testing:** Jest (659 tests: integration + unit) + Playwright (7 E2E tests)
- **Deployment:** Vercel (frontend), Supabase Cloud (backend)

### Database
- **Tables:** 19 tables with comprehensive RLS policies
- **Security:** Row Level Security (RLS) on all tables
- **Triggers:** Business logic enforcement (e.g., last leader protection)
- **Migrations:** Supabase CLI for version-controlled migrations

### Architecture Patterns
- **Authentication:** Client-side via AuthContext + useAuth() hook
- **Authorization:** RLS policies + UI-level role checks
- **State Management:** React Context for auth, local state for components
- **Component Structure:** Feature-based organization
- **API:** Supabase client (browser + server components)

---

## 🎯 User Flows

### Flow 1: New User Onboarding
1. User visits homepage → prompted to sign up
2. User signs up with email + password + name
3. Profile created automatically (trigger)
4. Redirected to "My Groups" page
5. Empty state encourages: "Create a group" or "Browse journeys"

### Flow 2: Creating and Building a Group
1. User clicks "Create Group"
2. Fills form: name, description, visibility settings
3. Group created, user becomes Steward
4. Invited to add members via email
5. Members receive invitations, accept/decline
6. Group is ready for journey enrollment

### Flow 3: Enrolling in a Journey (Individual)
1. User browses journey catalog
2. Filters by difficulty/topic (optional)
3. Views journey details (overview + curriculum)
4. Clicks "Enroll in Journey"
5. Selects "Enroll Individually"
6. Enrollment created, journey appears in "My Journeys"

### Flow 4: Enrolling a Group in a Journey
1. Steward browses journey catalog
2. Views journey details
3. Clicks "Enroll in Journey"
4. Selects "Enroll as Group" → picks their group
5. Enrollment created for entire group
6. All group members see journey in "My Journeys" under "Group Journeys" tab

### Flow 5: Managing Group Roles
1. Steward views group details page
2. Sees member list with current roles
3. Clicks "Manage Roles" for a member
4. Assigns/removes roles
5. UI updates immediately
6. Member gains/loses leader capabilities

---

## ✅ Acceptance Criteria (Overall Product)

### Usability
- [ ] New users can sign up and create profile in < 2 minutes
- [ ] Users can find and enroll in a journey in < 3 minutes
- [ ] Group leaders can create group and invite members in < 5 minutes
- [ ] Mobile responsive (works on phones and tablets)
- [ ] No browser alerts (use modals for confirmations)

### Performance
- [ ] Pages load in < 2 seconds (on good connection)
- [ ] Navigation feels instant (< 200ms)
- [ ] Search results appear instantly (< 500ms)
- [ ] No noticeable lag in UI interactions

### Security
- [ ] RLS enabled on all database tables
- [ ] Users cannot access data they don't own
- [ ] Protected routes require authentication
- [ ] Last leader protection enforced (database trigger)
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### Quality
- [ ] 100% test coverage on critical behaviors
- [ ] All integration tests passing
- [ ] No console errors in production
- [ ] Error boundaries catch component errors
- [ ] User-friendly error messages (no technical jargon)

### Documentation
- [ ] README up-to-date
- [ ] Feature documentation complete
- [ ] Behavior specifications documented
- [ ] Tests reference behavior specs
- [ ] Architecture documented

---

## 📊 Success Metrics (v1.0)

### Adoption Metrics
- **Target:** 100+ registered users within 3 months
- **Target:** 10+ active groups created
- **Target:** 50+ journey enrollments
- **Target:** 30% of users create or join a group
- **Target:** 50% of enrollments are group-based (vs. individual)

### Engagement Metrics
- **Target:** 40%+ weekly active users (WAU)
- **Target:** 3+ sessions per user per week
- **Target:** 10+ minutes average session time
- **Target:** 20%+ journey completion rate

### Quality Metrics
- **Target:** < 5% error rate (user-facing errors)
- **Target:** 4+ star average satisfaction rating
- **Target:** < 10 bug reports per month
- **Target:** < 24 hour response time for critical bugs

### Validation Metrics (Learning Goals)
- **Question:** Do users prefer the journey metaphor? (Qualitative feedback)
- **Question:** Is group learning more effective than solo? (Completion rates comparison)
- **Question:** Do groups stay together? (Group retention rates)
- **Question:** Is edutainment resonating? (Engagement + satisfaction scores)

---

## 🚫 Non-Goals (What We're NOT Building)

### Not a Traditional LMS
- No grade tracking
- No certificates (v1.0)
- No instructor dashboards
- No advanced analytics (v1.0)

### Not a Social Network
- No news feed
- No likes/reactions on posts (v1.0)
- No friend connections (only group memberships)
- ✅ Group forums and direct messaging implemented (v0.2.14–v0.2.15)

### Not a Marketplace (Yet)
- No paid journeys (v1.0)
- No user-created journeys (v1.0 - Wave 2 / Hamn)
- No creator tools (Wave 2 / Hamn)
- No revenue features (v1.0 is free to use)

### Not Fully Adaptive (Yet)
- No AI-powered personalization (Wave 3)
- No dynamic content adjustment (Wave 3)
- No recommendation engine (Wave 3)
- Journeys are predefined, static (v1.0)

---

## 🔄 Iteration Plan

### How We'll Evolve This Spec

**After v1.0 Launch:**
1. Gather user feedback (surveys, interviews, usage data)
2. Validate core assumptions (journey metaphor, group learning)
3. Identify top-requested features
4. Prioritize Wave 2 (Hamn) features based on data
5. Update this spec for v2.0

**Key Questions to Answer:**
- Does the journey metaphor resonate with users?
- Do groups complete journeys at higher rates than individuals?
- What's the #1 missing feature users request?
- Are users engaging with content or just browsing?
- Which user persona is most active/successful?

---

## 📚 Related Documents

- **[Vision](../../../universe/vision/VISION.md)** - Why FringeIsland exists
- **[Roadmap](../planning/ROADMAP.md)** - When features are being built
- **[Deferred Decisions](../planning/DEFERRED.md)** - What we're NOT building (and why)
- **[Feature Docs](../development/features/)** - Detailed feature specifications
- **[Behavior Specs](../development/specs/)** - Rules that govern features
- **[Architecture Anatomy](../../../universe/architecture/ARCHITECTURE_ANATOMY.md)** - Layered platform anatomy (L0-L7)
- **[Architecture Decisions](../../../universe/decisions/INDEX.md)** - ADRs with full reasoning
- **[Research](../planning/RESEARCH.md)** - Open investigations for Ferd
- **[Processes](../../../universe/processes/)** - Cross-product workflows (deferral, planning)

---

## ✏️ Document Maintenance

**Update this spec when:**
- Major features added/removed from scope
- User personas evolve based on data
- Success metrics need adjustment
- Technical constraints change scope
- Vision shifts direction

**Owner:** Product team (currently: Stefan + AI assistant)
**Review Cadence:** After each major phase completion
**Version History:**
- v1.2 (Apr 5, 2026): Expanded scope — visitor experience, profile_data, travel log, i18n, block/report, group DMs, announcements; added three void dimensions UX principle
- v1.1 (Feb 28, 2026): Updated status — Wave 1 phases 1.4–1.5e all complete, technical specs updated
- v1.0 (Feb 9, 2026): Initial product spec for v1.0 MVP

---

**Remember:** This spec defines WHAT we're building. The Vision defines WHY. The Roadmap defines WHEN. Features define HOW.

**Questions about this spec?** Open a discussion or propose changes via PR.
