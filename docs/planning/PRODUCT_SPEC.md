# FringeIsland - Product Specification

**Version:** 1.0
**Last Updated:** February 9, 2026
**Status:** Living document - v1.0 MVP scope
**Links:** [Vision](../VISION.md) | [Roadmap](ROADMAP.md) | [Features](../features/)

---

## 📋 Document Purpose

This document defines **what we're building** for FringeIsland v1.0 (MVP). It translates the [vision](../VISION.md) into concrete features, user stories, and acceptance criteria.

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

### Secondary Persona: Group Leader (Marcus)
**"I want to develop my team together."**

- Age: 30-50
- Context: Team lead, manager, or informal leader
- Pain: Generic training programs don't fit team needs
- Goal: Guide group through relevant development journeys
- Success: Team completes journeys together, improves cohesion

### Tertiary Persona: Travel Guide (future)
**"I want to facilitate group learning experiences."**

- Age: 25-55
- Context: Coach, facilitator, experienced practitioner
- Pain: Limited tools for guiding group journeys
- Goal: Co-facilitate journeys with group leaders
- Success: Groups complete journeys with guidance (Phase 2)

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
- Leaders: Manage group, invite members, assign roles, enroll group
- Members: Participate, complete content, leave group
- Guides (future): Co-facilitate, mentor, support

### 4. Simplicity Over Features
- Clear navigation, minimal clicks
- Essential features only (v1.0)
- Progressive disclosure of complexity
- Mobile-responsive, clean design

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
- Group enrollment (group leaders only)
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
- Creator automatically becomes Group Leader
- Group settings: visibility, member list display
- Groups visible on "My Groups" page

#### 5. Member Management
**User Story:** As a group leader, I can invite, accept, and remove members so that I can build my group.

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
**User Story:** As a group leader, I can assign roles to members so that I can organize my group effectively.

**Features:**
- Assign "Group Leader" role to members
- Remove roles from members
- Multiple users can have Group Leader role
- Role-based permissions (leaders can edit groups, invite, assign roles)

**Acceptance Criteria:**
- Only leaders can assign/remove roles
- Database trigger prevents removing last leader
- UI hides role removal when last leader
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

### ⏳ Out of Scope - v1.0

**Phase 1.5+ Features:**
- Communication (messaging, forums, notifications)
- Advanced progress tracking
- Journey content delivery (step-by-step player)
- Completion certificates
- Activity feeds

**Phase 2+ Features:**
- User-created journeys
- Journey marketplace
- Travel Guide role
- Advanced group features (subgroups, teams)
- Social features (likes, comments, shares)

**Phase 3+ Features:**
- Dynamic/adaptive journeys
- AI-powered recommendations
- Personalized content paths
- Advanced analytics

**See:** [DEFERRED_DECISIONS.md](DEFERRED_DECISIONS.md) for rationale

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

### Phase 1.4: Journey System (85% Complete)
**Milestone:** Users can browse and enroll in journeys
- ✅ Feature: Journey Catalog & Discovery
- ✅ Feature: Journey Enrollment
- ⏳ Feature: Journey Content Delivery (next)
- ⏳ Feature: Progress Tracking (next)

### Phase 1.5: Communication (Planned)
**Milestone:** Groups can communicate and collaborate
- ⏳ Feature: Basic Messaging
- ⏳ Feature: Group Forums
- ⏳ Feature: Notifications

---

## 📐 Technical Specifications

### Tech Stack
- **Frontend:** Next.js 16.1 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Testing:** Jest + React Testing Library (integration tests)
- **Deployment:** Vercel (frontend), Supabase Cloud (backend)

### Database
- **Tables:** 13 tables with comprehensive RLS policies
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
3. Group created, user becomes Group Leader
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
1. Group Leader browses journey catalog
2. Views journey details
3. Clicks "Enroll in Journey"
4. Selects "Enroll as Group" → picks their group
5. Enrollment created for entire group
6. All group members see journey in "My Journeys" under "Group Journeys" tab

### Flow 5: Managing Group Roles
1. Group Leader views group details page
2. Sees member list with current roles
3. Clicks "Manage Roles" for a member
4. Assigns/removes "Group Leader" role
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
- No news feed (v1.0)
- No likes/comments (v1.0)
- No friend connections (only group memberships)
- No messaging (v1.0 - deferred to Phase 1.5)

### Not a Marketplace (Yet)
- No paid journeys (v1.0)
- No user-created journeys (v1.0 - Phase 2)
- No creator tools (Phase 2)
- No revenue features (v1.0 is free to use)

### Not Fully Adaptive (Yet)
- No AI-powered personalization (Phase 3)
- No dynamic content adjustment (Phase 3)
- No recommendation engine (Phase 3)
- Journeys are predefined, static (v1.0)

---

## 🔄 Iteration Plan

### How We'll Evolve This Spec

**After v1.0 Launch:**
1. Gather user feedback (surveys, interviews, usage data)
2. Validate core assumptions (journey metaphor, group learning)
3. Identify top-requested features
4. Prioritize Phase 1.5 features based on data
5. Update this spec for v1.5 / v2.0

**Key Questions to Answer:**
- Does the journey metaphor resonate with users?
- Do groups complete journeys at higher rates than individuals?
- What's the #1 missing feature users request?
- Are users engaging with content or just browsing?
- Which user persona is most active/successful?

---

## 📚 Related Documents

- **[Vision](../VISION.md)** - Why FringeIsland exists
- **[Roadmap](ROADMAP.md)** - When features are being built
- **[Deferred Decisions](DEFERRED_DECISIONS.md)** - What we're NOT building (and why)
- **[Feature Docs](../features/implemented/)** - Detailed feature specifications
- **[Behavior Specs](../specs/behaviors/)** - Rules that govern features
- **[Architecture](../architecture/ARCHITECTURE.md)** - Technical design

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
- v1.0 (Feb 9, 2026): Initial product spec for v1.0 MVP

---

**Remember:** This spec defines WHAT we're building. The Vision defines WHY. The Roadmap defines WHEN. Features define HOW.

**Questions about this spec?** Open a discussion or propose changes via PR.
